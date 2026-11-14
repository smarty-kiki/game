import * as THREE from 'three';
import {
  Fn, If, uniformArray, varying, select, positionGeometry, normalGeometry, modelViewMatrix, transformNormalToView,
  vec2, vec3, vec4, float, exp, pow, max, clamp, smoothstep, normalize, dot, abs, floor, fract, sin, acos,
} from 'three/tsl';

// 自機のシールド：当たった所から六角の網目が光って波紋が広がる。普段は見えない。
// 回避ではじいた時は青白く、シールドが少ない時は赤く光る。

// GLSL の mod と同じ（負の数でも 0..y）。WGSL の % は負で答えが違うので使わない
const gmod = (x, y) => x.sub(y.mul(floor(x.div(y))));

// 六角の網目：球を立方体の6面へ写して敷く（緯度経度と違い、極で伸びない）。
// x=線の濃さ、y=その六角ごとの乱数
const hexCell = /*@__PURE__*/ Fn(([p]) => {
  const q = abs(p);
  const uv0 = select(q.x.greaterThan(q.y).and(q.x.greaterThan(q.z)), p.yz.div(q.x), select(q.y.greaterThan(q.z), p.xz.div(q.y), p.xy.div(q.z)));
  const uv = uv0.mul(4.0);
  const r = vec2(1.0, 1.732);
  const h = r.mul(0.5);
  const a = gmod(uv, r).sub(h);
  const b = gmod(uv.sub(h), r).sub(h);
  const g = select(dot(a, a).lessThan(dot(b, b)), a, b);
  const id = uv.sub(g);
  const ab = abs(g);
  const d = max(dot(ab, normalize(vec2(1.0, 1.732))), ab.x);
  return vec2(smoothstep(0.43, 0.49, d), fract(sin(dot(id, vec2(127.1, 311.7))).mul(43758.5453)));
}).setLayout({ name: 'hexCell', type: 'vec2', inputs: [{ name: 'p', type: 'vec3' }] });

function shieldMaterial(u) {
  // 当たりは3つまで。中身の配列を書き換えれば毎コマ届く
  const U = {
    uHit: uniformArray(u.uHit.value, 'vec3'),
    uAge: uniformArray(u.uAge.value, 'float'),
    uColor: uniformArray(u.uColor.value, 'color'),
  };
  const vP = varying(normalize(positionGeometry), 'vP');
  const mv = modelViewMatrix.mul(vec4(positionGeometry, 1.0));
  const vN = varying(normalize(transformNormalToView(normalGeometry)), 'vN');
  const vV = varying(normalize(mv.xyz.negate()), 'vV');
  const fragmentNode = Fn(() => {
    const fres = pow(float(1.0).sub(abs(dot(normalize(vN), normalize(vV)))), 2.2);
    const hc = hexCell(vP);
    const hex = hc.x;
    const col = vec3(0.0).toVar();
    const a = float(0.0).toVar();
    for (let i = 0; i < 3; i++) {
      const t = U.uAge.element(i);
      If(t.greaterThanEqual(0.0).and(t.lessThanEqual(0.65)), () => {
        const d = acos(clamp(dot(vP, U.uHit.element(i)), -1.0, 1.0));
        const fade = pow(max(float(1.0).sub(t.div(0.65)), 0.0), 1.4);
        // 波は当たった所のまわりだけを細く走る。通った六角が1枚ずつまたたき、機体全体は光らせない
        const x = d.sub(t.mul(3.4)).mul(6.0);
        const wave = exp(x.mul(x).negate()).mul(float(1.0).sub(smoothstep(0.5, 1.7, d)));
        const spot = exp(d.mul(d).mul(-16.0)).mul(float(1.0).sub(smoothstep(0.0, 0.14, t)));
        const k = wave.mul(float(0.05).add(hex.mul(0.85)).add(hc.y.mul(0.22)))
          .add(spot.mul(0.75))
          .add(fres.mul(0.06).mul(hex).mul(float(1.0).sub(smoothstep(0.5, 1.6, d))))
          .mul(fade);
        col.addAssign(U.uColor.element(i).mul(k));
        a.addAssign(k);
      });
    }
    return vec4(col.mul(1.7), clamp(a.mul(2.2), 0.0, 1.0));
  })();
  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    forceSinglePass: true, // 今の版の ShaderMaterial と同じく1回で描く
  });
  mat.fragmentNode = fragmentNode;
  mat.uniforms = U;
  return mat;
}

export function createShieldFx(parent) {
  const u = {
    uHit: { value: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1)] },
    uAge: { value: [-1, -1, -1] },
    uColor: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color()] },
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), shieldMaterial(u));
  // 機体を包む楕円（横に広く、前後に長い）
  mesh.scale.set(0.66, 0.3, 0.62);
  mesh.position.set(0, 0.05, 0);
  mesh.renderOrder = 8;
  mesh.visible = false;
  parent.add(mesh);
  let slot = 0;
  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  return {
    mesh,
    // rel：当たった所（自機からの相対・世界の向き）。kind：'hit' | 'deflect'。low：シールドが少ない
    hit(rel, kind = 'hit', low = false) {
      mesh.updateMatrixWorld(true);
      _v.set(rel[0], rel[1], rel[2]);
      // 世界の向きを、楕円を球へ戻した座標の向きにする
      mesh.getWorldQuaternion(_q).invert();
      _v.applyQuaternion(_q).divide(mesh.scale).normalize();
      u.uHit.value[slot].copy(_v);
      u.uAge.value[slot] = 0;
      u.uColor.value[slot].set(kind === 'deflect' ? 0x9fe4ff : low ? 0xff4a2a : 0x46b4ff);
      slot = (slot + 1) % 3;
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < 3; i++) {
        if (u.uAge.value[i] >= 0) { u.uAge.value[i] += dt; if (u.uAge.value[i] > 0.65) u.uAge.value[i] = -1; else any = true; }
      }
      mesh.visible = any;
    },
  };
}
