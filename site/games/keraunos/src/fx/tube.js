import * as THREE from 'three';
import {
  Fn, If, attribute, modelViewMatrix, transformNormalToView, varying, vec2, vec3, vec4,
  pow, max, mix, cos, sin, abs, dot, normalize, smoothstep, select,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, viewVertex, softFade, fbm2 } from './soft.js';

// 噴射と光線に共通の、光る立体の筒。視線が筒の中心を通るほど明るくなるので、横からでも真後ろからでも太さが出る。
// 板と違って形が潰れず、粒と違ってとぎれない。
//   uPower 0..1 太さの倍率、uBulge 節のふくらみ、uWobble 表面のうねり、uTaper 1 で先へ細る・0 で太さを保つ、
//   uNeck 根元が細い長さ、uLenPow 長い筒の分割を根元へ寄せる、uNeckMin 根元の太さの割合、
//   uSharp 大きいほど中心へ細く集まる、uFlowAmount 流れる筋の強さ、uEndFade 先の消え方、uNearFade カメラのすぐ前を薄くする距離（0 で使わない）
function tubeMaterial(U) {
  // 筒の形は頂点で作る（形の頂点はすべて原点。aT は根元 0〜先 1、aA は筒のまわりの角度）
  const aT = attribute('aT', 'float');
  const aA = attribute('aA', 'float');
  const d = pow(aT, U.uLenPow).mul(U.uLen);
  const along = aT;
  const k = cos(along.mul(U.uBulgeFreq)).mul(0.5).add(0.5);
  const bulge = U.uBulge.mul(k.mul(k)).mul(along.mul(0.6).oneMinus()).add(1.0);
  const wob = U.uWobble.mul(
    sin(d.mul(2.1).sub(U.uTime.mul(U.uFlowSpeed).mul(0.5)).add(aA.mul(3.0))).mul(0.6)
      .add(sin(d.mul(5.3).sub(U.uTime.mul(U.uFlowSpeed).mul(0.8)).sub(aA.mul(5.0))).mul(0.4)),
  ).add(1.0);
  const neck = select(U.uNeck.greaterThan(0.0), smoothstep(0.0, U.uNeck, d), 1.0);
  const taper = mix(1.0, pow(max(0.0, along.oneMinus()), 0.7), U.uTaper);
  const r = U.uRadius.mul(U.uPower).mul(bulge).mul(wob).mul(taper).mul(U.uNeckMin.add(U.uNeckMin.oneMinus().mul(neck)));
  const radial = vec3(cos(aA), sin(aA), 0.0);
  const mv = modelViewMatrix.mul(vec4(radial.mul(r).add(vec3(0.0, 0.0, d)), 1.0));
  const view = viewVertex(mv);
  // 法線は視点の座標で持つ（vV と内積を取るため。modelNormalMatrix だけだと世界の座標になる）
  const vN = varying(normalize(transformNormalToView(radial)), 'vN');
  const vV = varying(normalize(mv.xyz.negate()), 'vV');
  const vD = varying(d, 'vD');
  const vT = varying(aT, 'vT');
  const vA = varying(aA, 'vA');
  const vZ = view.viewDist;

  const fragmentNode = Fn(() => {
    const facing = abs(dot(normalize(vN), normalize(vV)));
    const prof = pow(facing, U.uSharp);
    // 流れる筋：角度は円でつながる座標で取る
    const q = vec2(cos(vA).mul(1.6).add(sin(vA).mul(0.7)).add(U.uSeed), vD.mul(U.uFlowScale).sub(U.uTime.mul(U.uFlowSpeed)));
    const n = fbm2(q).mul(1.15).add(fbm2(vec2(sin(vA).mul(3.1).sub(U.uSeed), vD.mul(U.uFlowScale).mul(2.3).sub(U.uTime.mul(U.uFlowSpeed).mul(1.6)))).mul(0.35));
    const flow = mix(1.0, smoothstep(0.18, 0.95, n).mul(1.9), U.uFlowAmount).toVar();
    If(U.uFibers.greaterThan(0.0), () => {
      // 筒に沿ってまっすぐ走る光の筋（奥の一点へ集まって見える）
      const f = fbm2(vec2(cos(vA).mul(9.0).add(sin(vA).mul(4.0)).add(U.uSeed), sin(vA).mul(9.0).add(vD.mul(0.012)).sub(U.uTime.mul(3.0))));
      flow.mulAssign(mix(1.0, smoothstep(0.32, 0.82, f).mul(2.4), U.uFibers));
    });
    // 節の明るさ
    const knots = U.uBulge.mul(2.2).mul(pow(max(0.0, cos(vT.mul(U.uBulgeFreq)).mul(0.5).add(0.5)), 6.0)).mul(vT.mul(0.5).oneMinus()).add(1.0);
    // 先の消え方が 0 のときに 0 の 0 乗（WGSL では答えが決まらない）を作らないよう、底をわずかに浮かせる
    const ends = smoothstep(0.0, U.uStartFade, vT).mul(pow(max(1e-6, vT.oneMinus()), U.uEndFade));
    const a = prof.mul(flow).mul(knots).mul(ends);
    const col = mix(U.uColorNear, U.uColorFar, smoothstep(0.0, 0.75, vT));
    const nf = select(U.uNearFade.greaterThan(0.0), smoothstep(U.uNearFade.mul(0.25), U.uNearFade, vZ), 1.0);
    return vec4(col.mul(U.uIntensity).mul(softFade(0.07, vZ)).mul(nf), a.mul(nf));
  })();
  return glowNodeMaterial(U, { vertexNode: view.vertexNode, fragmentNode });
}

export function tubeGeometry(rows, segs) {
  const pos = []; const aT = []; const aA = []; const idx = [];
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (let s = 0; s <= segs; s++) {
      pos.push(0, 0, 0);
      aT.push(t);
      aA.push((s / segs) * Math.PI * 2);
    }
  }
  const w = segs + 1;
  for (let r = 0; r < rows - 1; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * w + s;
      idx.push(a, a + w, a + 1, a + 1, a + w, a + w + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1));
  g.setIndex(idx);
  return g;
}

export function createTube(geometry, opts) {
  const o = {
    len: 1, radius: 0.1, near: [1, 1, 1], far: [0, 0, 1], intensity: 1, sharp: 2, flowAmount: 0.5, flowSpeed: 20, flowScale: 2,
    bulge: 0, bulgeFreq: 30, wobble: 0, endFade: 1, startFade: 0.02, taper: 1, neck: 0, lenPow: 1, seed: 0, fibers: 0, neckMin: 0.22, ...opts,
  };
  const mat = tubeMaterial(nodeUniforms({
    uLen: o.len, uRadius: o.radius, uTime: 0, uPower: 1,
    uBulge: o.bulge, uBulgeFreq: o.bulgeFreq, uWobble: o.wobble, uTaper: o.taper, uNeck: o.neck, uLenPow: o.lenPow, uNeckMin: o.neckMin, uNearFade: o.nearFade || 0,
    uColorNear: new THREE.Color(...o.near), uColorFar: new THREE.Color(...o.far), uIntensity: o.intensity,
    uSharp: o.sharp, uFlowAmount: o.flowAmount, uFlowSpeed: o.flowSpeed, uFlowScale: o.flowScale,
    uEndFade: o.endFade, uStartFade: o.startFade, uSeed: o.seed, uFibers: o.fibers,
  }));
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.frustumCulled = false;
  return { mesh, mat, u: mat.uniforms };
}
