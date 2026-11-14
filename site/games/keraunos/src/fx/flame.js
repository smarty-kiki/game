import * as THREE from 'three';
import {
  Fn, attribute, vec3, vec4, pow, mix, sin, cos, smoothstep, length, max, normalize, cross, select, modelViewMatrix, positionGeometry,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, viewVertex, softFade } from './soft.js';
import { createTube, tubeGeometry } from './tube.js';

// 噴射口から -Z へ伸びる細長い炎の帯と、軸に並ぶ明るい節（ショックダイヤモンド）。
// 帯は円錐ではなく、軸に沿った板を毎コマのカメラの向きへ回して見せる。
// 翼端からは、ブースト中だけ細い飛行機雲が伸びる。

// 視点空間で、物の原点と、物の -Z の軸（炎の向き）。板は軸に直交しカメラを向く向きへ開く
function axisFrame(limit) {
  const originV = modelViewMatrix.mul(vec4(0.0, 0.0, 0.0, 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(0.0, 0.0, -1.0, 0.0)).xyz);
  const c = cross(axisV, normalize(originV.xyz.negate()));
  const sideV = select(length(c).greaterThan(limit), normalize(c), normalize(cross(axisV, vec3(0.0, 1.0, 0.0))));
  return { originV, axisV, sideV };
}

// 層ごとの値（0 が外、1 が中、2 が芯）
const byLayer = (layer, a, b, c) => select(layer.lessThan(0.5), a, select(layer.lessThan(1.5), b, c));

// 炎の帯
function bandMaterial(seed) {
  const U = nodeUniforms({
    uTime: 0, uSeed: seed, uLength: CRUISE_LENGTH, uWidth: 0.0115,
    uCore: new THREE.Color(0.50, 0.92, 1.0), uMid: new THREE.Color(0.04, 0.62, 1.0), uEdge: new THREE.Color(0.02, 0.26, 1.0),
    uOpacity: 0.5,
  });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const aLayer = attribute('aLayer', 'float');
  const { originV, axisV, sideV } = axisFrame(0.06);
  const upV = normalize(cross(sideV, axisV));
  const len = U.uLength.mul(aLayer.mul(0.06).add(1.0));
  const wob = sin(aT.mul(8.0).sub(U.uTime.mul(18.0)).add(U.uSeed.mul(6.28))).mul(0.0022).mul(aT);
  const wob2 = cos(aT.mul(6.0).sub(U.uTime.mul(13.0)).add(U.uSeed.mul(3.1))).mul(0.0018).mul(aT);
  // カメラに近づくほど大きく映るので、後ろへ急に細くして見た目の太さをそろえる（下の bandWidthAt と同じ形）
  const w = U.uWidth.mul(byLayer(aLayer, 1.0, 0.62, 0.34)).mul(max(0.0, aT.oneMinus()));
  const p = originV.xyz.add(axisV.mul(aT.mul(len))).add(sideV.mul(aSide.mul(w).add(wob))).add(upV.mul(wob2));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    // 幅の端でかならず 0 になる（輪郭の線を出さない）
    const band = pow(max(0.0, aSide.mul(aSide).oneMinus()), 1.8);
    const fade = pow(max(0.0, aT.oneMinus()), 0.8);
    const flick = sin(aT.mul(30.0).sub(U.uTime.mul(26.0)).add(U.uSeed.mul(5.0))).mul(0.12).add(0.88);
    // 外側は青、中ほどは水色、芯は白
    const c0 = mix(U.uEdge, U.uMid, smoothstep(0.0, 0.62, aLayer));
    const c1 = mix(c0, U.uCore, smoothstep(0.55, 1.0, aLayer).mul(0.95));
    // 噴射口のすぐ先だけ白く寄せる
    const c = mix(c1, U.uCore, pow(max(0.0, aT.mul(5.0).oneMinus()), 2.0).mul(0.22));
    const a = band.mul(fade).mul(flick).mul(U.uOpacity).mul(byLayer(aLayer, 0.22, 0.42, 0.95))
      .mul(smoothstep(0.0, 0.05, aT)).mul(softFade(0.05, vv.viewDist));
    return vec4(c.mul(1.7), a);
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 軸に並ぶ明るい節（ショックダイヤモンド）。物の向きに沿った小さな四角
function knotMaterial() {
  const U = nodeUniforms({ uLength: CRUISE_LENGTH, uTime: 0, uOpacity: 0, uColor: new THREE.Color(0.32, 0.80, 1.0) });
  const aT = attribute('aT', 'float');
  const aCorner = attribute('aCorner', 'vec2');
  const centreV = modelViewMatrix.mul(vec4(0.0, 0.0, aT.mul(U.uLength).negate(), 1.0));
  const rightV = normalize(modelViewMatrix.mul(vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  const upV = normalize(modelViewMatrix.mul(vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  const p = centreV.xyz.add(rightV.mul(aCorner.x).add(upV.mul(aCorner.y)).mul(attribute('aSize', 'float')));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const body = pow(max(0.0, length(aCorner).oneMinus()), 1.6);
    const a = body.mul(U.uOpacity).mul(sin(U.uTime.mul(30.0).add(aT.mul(12.0))).mul(0.08).add(0.92));
    return vec4(U.uColor.mul(body.mul(1.2).add(2.2)), a.mul(softFade(0.03, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 噴射口の丸い光。物の向きに沿った四角
function nozzleGlowMaterial() {
  const U = nodeUniforms({ uSize: 0.025, uColor: new THREE.Color(0.62, 0.88, 1.0), uOpacity: 0.5 });
  const centreV = modelViewMatrix.mul(vec4(0.0, 0.0, 0.0, 1.0));
  const rightV = normalize(modelViewMatrix.mul(vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  const upV = normalize(modelViewMatrix.mul(vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  const p = centreV.xyz.add(rightV.mul(positionGeometry.x).add(upV.mul(positionGeometry.y)).mul(U.uSize).mul(2.0));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const r = length(positionGeometry.xy.mul(2.0));
    const a = pow(max(0.0, r.oneMinus()), 2.6).mul(U.uOpacity);
    return vec4(U.uColor, a.mul(softFade(0.04, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 翼端の飛行機雲
function trailMaterial() {
  const U = nodeUniforms({ uTime: 0, uLength: 1.2, uWidth: 0.0045, uColor: new THREE.Color(0.86, 0.94, 1.0), uOpacity: 0 });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const { originV, axisV, sideV } = axisFrame(0.06);
  const w = U.uWidth.mul(pow(max(0.0, aT.oneMinus()), 0.75));
  const drift = sin(aT.mul(4.0).add(U.uTime.mul(2.0))).mul(0.006).mul(aT);
  const p = originV.xyz.add(axisV.mul(aT.mul(U.uLength))).add(sideV.mul(aSide.mul(w).add(drift)));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const band = pow(max(0.0, aSide.mul(aSide).oneMinus()), 1.6);
    const fade = pow(max(0.0, aT.oneMinus()), 1.7);
    return vec4(U.uColor, band.mul(fade).mul(U.uOpacity));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// t 方向に数段に割った板（幅の先細りをなめらかにする）
function ribbonGeometry(rows, layers = 2) {
  const positions = [];
  const aT = [];
  const aSide = [];
  const aLayer = [];
  const index = [];
  let v = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      for (const side of [-1, 1]) {
        positions.push(side, 0, -t);
        aT.push(t);
        aSide.push(side);
        aLayer.push(layer);
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      const a = v + r * 2;
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    v += rows * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setAttribute('aLayer', new THREE.Float32BufferAttribute(aLayer, 1));
  g.setIndex(index);
  return g;
}

// 帯の幅（bandMaterial の頂点の幅と同じ形）
function bandWidthAt(t) {
  return Math.pow(Math.max(0.0, 1.0 - t), 1.0);
}

// 節の板を1つの形にまとめる（5枚で1回の描画）
function knotGeometry(count) {
  const positions = [];
  const aT = [];
  const aSize = [];
  const aCorner = [];
  const index = [];
  for (let i = 0; i < count; i++) {
    const t = 0.16 + (i / (count - 1)) * 0.68;
    const size = 0.055 * (1.0 - 0.75 * t);
    const base = i * 4;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [cx, cy] of corners) {
      positions.push(0, 0, 0);
      aT.push(t);
      aSize.push(size);
      aCorner.push(cx, cy);
    }
    index.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(aSize, 1));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(aCorner, 2));
  g.setIndex(index);
  return g;
}

const CRUISE_LENGTH = 0.10;
const BOOST_LENGTH = 2.6;

export function createFlame({ anchors }) {
  const group = new THREE.Group();
  const ribbon = ribbonGeometry(7, 3);
  const knotCount = 5;
  const knots = knotGeometry(knotCount);
  const glowQuad = new THREE.PlaneGeometry(1, 1);
  const trail = ribbonGeometry(5, 1);

  const bands = [];
  const knotMeshes = [];
  const glows = [];
  const trails = [];

  for (const side of [anchors.nozzleR, anchors.nozzleL]) {
    const material = bandMaterial(side.x > 0 ? 0.37 : 2.11);
    const mesh = new THREE.Mesh(ribbon, material);
    mesh.position.copy(side);
    const toe = side.x > 0 ? 0.10 : -0.10;
    mesh.rotation.set(-0.10, toe, 0);
    mesh.renderOrder = 3;
    mesh.frustumCulled = false;
    group.add(mesh);
    bands.push({ mesh, material });

    const knotMat = knotMaterial();
    const knotMesh = new THREE.Mesh(knots, knotMat);
    knotMesh.position.copy(side);
    knotMesh.rotation.set(-0.10, toe, 0);
    knotMesh.renderOrder = 4;
    knotMesh.frustumCulled = false;
    group.add(knotMesh);
    knotMeshes.push({ mesh: knotMesh, material: knotMat });

    const glowMat = nozzleGlowMaterial();
    const glow = new THREE.Mesh(glowQuad, glowMat);
    glow.position.copy(side);
    glow.renderOrder = 4;
    glow.frustumCulled = false;
    group.add(glow);
    glows.push({ mesh: glow, material: glowMat });

  }

  // 噴射の筒：外の青い層と、節のある白い芯。向きは -Z
  const jetGeom = tubeGeometry(56, 28);
  const jets = [];
  [anchors.nozzleR, anchors.nozzleL].forEach((side, i) => {
    const toe = side.x > 0 ? 0.08 : -0.08;
    const outer = createTube(jetGeom, { radius: 0.105, near: [0.08, 0.50, 1.0], far: [0.01, 0.10, 1.0], intensity: 1.5, sharp: 2.0, flowAmount: 0.65, flowSpeed: 34, flowScale: 2.6, bulge: 0.12, bulgeFreq: 30, wobble: 0.05, endFade: 1.2, seed: i * 3.3 });
    const inner = createTube(jetGeom, { radius: 0.044, near: [0.85, 0.97, 1.0], far: [0.18, 0.72, 1.0], intensity: 3.0, sharp: 1.8, flowAmount: 0.3, flowSpeed: 46, flowScale: 3.4, bulge: 0.42, bulgeFreq: 30, wobble: 0.02, endFade: 1.8, seed: i * 1.7 + 5.0 });
    for (const t of [outer, inner]) {
      t.mesh.position.set(side.x, side.y, side.z + 0.02);
      t.mesh.rotation.set(-0.06, Math.PI + toe, 0); // +Z の筒を後ろへ向ける
      t.mesh.renderOrder = 3;
      group.add(t.mesh);
    }
    // 噴射口のまわりの装甲を照らす光
    const light = new THREE.PointLight(0x6fd0ff, 0, 0.9, 2);
    light.position.set(side.x, side.y, side.z - 0.12);
    group.add(light);
    jets.push({ outer, inner, light });
  });
  let prevBoost = 0;
  let surge = 0;

  for (const side of [anchors.wingR, anchors.wingL]) {
    const material = trailMaterial();
    const mesh = new THREE.Mesh(trail, material);
    mesh.position.copy(side);
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    group.add(mesh);
    trails.push({ mesh, material });
  }

  let time = 0;

  function update(state, dt) {
    time = state.time;
    const boost = state.boostAmount;
    const length = CRUISE_LENGTH + (BOOST_LENGTH - CRUISE_LENGTH) * boost;
    // 踏み込んだ瞬間は一度大きく伸びる
    if (dt > 0) {
      const rise = Math.max(0, (boost - prevBoost) / dt);
      surge += (Math.min(1, rise / 2.2) - surge) * Math.min(1, dt * 10);
      prevBoost = boost;
    }
    const flick = 0.96 + 0.04 * Math.sin(time * 71) + 0.03 * Math.sin(time * 113);
    for (const j of jets) {
      const len = (0.34 + (BOOST_LENGTH - 0.34) * boost) * (1 + 0.35 * surge) * flick;
      const pw = (0.55 + 0.45 * boost) * (1 + 0.25 * surge);
      for (const t of [j.outer, j.inner]) {
        t.u.uTime.value = time;
        t.u.uLen.value = len;
        t.u.uPower.value = pw;
      }
      j.outer.u.uIntensity.value = 0.7 + 0.8 * boost;
      j.inner.u.uIntensity.value = 1.2 + 0.9 * boost + 1.6 * surge;
      j.light.intensity = (0.012 + 0.07 * boost + 0.08 * surge) * flick;
    }
    const knotOn = Math.min(1, Math.max(0, (boost - 0.12) / 0.55));

    for (const b of bands) {
      b.mesh.visible = false;
      b.material.uniforms.uTime.value = time;
      b.material.uniforms.uLength.value = length;
      b.material.uniforms.uWidth.value = 0.03 + 0.06 * boost;
      b.material.uniforms.uOpacity.value = 0.5 + 0.18 * boost;
    }
    for (const k of knotMeshes) {
      k.material.uniforms.uTime.value = time;
      k.material.uniforms.uLength.value = length;
      k.material.uniforms.uOpacity.value = knotOn * 0.75;
      k.mesh.visible = false;
    }
    for (const g of glows) {
      const size = 0.05 + 0.06 * boost + 0.05 * surge;
      g.material.uniforms.uSize.value = size;
      g.material.uniforms.uOpacity.value = (0.42 + 0.3 * boost) * (0.92 + 0.08 * Math.sin(time * 24.0));
    }
    for (const t of trails) {
      t.material.uniforms.uTime.value = time;
      t.material.uniforms.uLength.value = 0.25 + 2.6 * boost;
      t.material.uniforms.uOpacity.value = Math.max(0, boost - 0.05) * 0.42;
      t.mesh.visible = false;
    }
  }

  return { group, update, sideMeshes: [0, 1].map((i) => [bands[i].mesh, knotMeshes[i].mesh, glows[i].mesh, jets[i].outer.mesh, jets[i].inner.mesh, jets[i].light]) };
}
