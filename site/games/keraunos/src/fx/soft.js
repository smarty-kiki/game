import * as THREE from 'three';
import {
  Fn, uniform, texture, screenUV, perspectiveDepthToViewZ, clamp, smoothstep, max, abs, length,
  vec2, vec3, vec4, float, fract, dot, floor, mix, modelViewMatrix, cameraProjectionMatrix,
  positionGeometry, cos, sin, varying,
} from 'three/tsl';

// 光の効果が機体に刺さったところで、境目をまっすぐ出さずにぼかすための共通の部品（WebGPU・TSL 版）。
// main.js が毎コマ機体だけの奥行きを shipDepth へ描き、その奥行きと効果の奥行きの差で薄くする。

// 機体だけの奥行き。main.js が描画の大きさに合わせて setSize し、毎コマ描く
export const shipDepth = new THREE.RenderTarget(1, 1, { depthBuffer: true });
shipDepth.depthTexture = new THREE.DepthTexture(1, 1);
shipDepth.depthTexture.type = THREE.UnsignedIntType;

// 古い書き方（material.uniforms.uX.value = ...）のまま値を変えられるよう、TSL の uniform を同じ名前で持つ
export const softUniforms = {
  uSceneDepth: texture(shipDepth.depthTexture),
  uRes: uniform(new THREE.Vector2(1, 1)),
  uNear: uniform(0.05),
  uFar: uniform(500),
};

// smoothstep(e0, e1, x) で e0 > e1 のとき（逆向き）。WGSL で定数の逆向きを避けるために使う
export const smoothstepR = (e0, e1, x) => float(1).sub(smoothstep(e1, e0, x));

// 板の縁で必ず 0 になる（四角い縁を出さない）。c は板の中心から -1..1
export const edgeMask = /*@__PURE__*/ Fn(([c]) => {
  const m = max(abs(c.x), abs(c.y));
  return smoothstepR(1.0, 0.72, m).mul(smoothstepR(1.0, 0.8, length(c)));
}).setLayout({ name: 'edgeMask', type: 'float', inputs: [{ name: 'c', type: 'vec2' }] });

// 効果の奥行き（カメラからの距離、正の数）と機体の奥行きの差で薄くする。range は薄くなる幅
// 画像と画面の座標を読むので、setLayout で関数にしない（WGSL の関数の中からは uniform の画像や fragCoord が見えない）
export function softFade(range, fragDist) {
  const sd = float(softUniforms.uSceneDepth.sample(screenUV));
  const sceneZ = perspectiveDepthToViewZ(sd, softUniforms.uNear, softUniforms.uFar).negate();
  return clamp(sceneZ.sub(fragDist).div(range), 0.0, 1.0);
}

// 雑音（効果の揺らぎに使う）
export const hash12 = /*@__PURE__*/ Fn(([p]) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031)).toVar();
  p3.addAssign(dot(p3, p3.yzx.add(33.33)));
  return fract(p3.x.add(p3.y).mul(p3.z));
}).setLayout({ name: 'hash12', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

export const vnoise = /*@__PURE__*/ Fn(([p]) => {
  const i = floor(p);
  const f0 = fract(p);
  const f = f0.mul(f0).mul(float(3.0).sub(f0.mul(2.0)));
  return mix(
    mix(hash12(i), hash12(i.add(vec2(1.0, 0.0))), f.x),
    mix(hash12(i.add(vec2(0.0, 1.0))), hash12(i.add(vec2(1.0, 1.0))), f.x),
    f.y,
  );
}).setLayout({ name: 'vnoise', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

export const fbm2 = /*@__PURE__*/ Fn(([p]) => {
  return vnoise(p).mul(0.55).add(vnoise(p.mul(2.07).add(5.3)).mul(0.28)).add(vnoise(p.mul(4.3).add(1.7)).mul(0.17));
}).setLayout({ name: 'fbm2', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

// { uX: 値 } か { uX: { value: 値 } } から、同じ名前の TSL の uniform（画像は texture）を作る
export function nodeUniforms(obj) {
  const out = {};
  for (const [k, raw] of Object.entries(obj)) {
    if (raw && raw.isNode) { out[k] = raw; continue; }
    const v = raw && typeof raw === 'object' && 'value' in raw && !raw.isVector2 && !raw.isVector3 && !raw.isVector4 && !raw.isColor ? raw.value : raw;
    out[k] = v && v.isTexture ? texture(v) : uniform(v);
  }
  return out;
}

// 視点の座標の位置 mv（vec4）から、画面の位置と、柔らかく薄くするための奥行き（varying）を作る
export function viewVertex(mv) {
  return { vertexNode: cameraProjectionMatrix.mul(mv), viewDist: varying(mv.z.negate(), 'vViewDist') };
}

// カメラへ向く四角。板の頂点 position.xy（-0.5..0.5）から、中心から -1..1 の座標 vC を作る
// U は uSize・uAspect・uRot を持つ（TSL の uniform）
export function billboard(U) {
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const centre = modelViewMatrix.mul(vec4(0.0, 0.0, 0.0, 1.0));
  const c = cos(U.uRot);
  const s = sin(U.uRot);
  const q = vec2(positionGeometry.x.mul(U.uAspect), positionGeometry.y).mul(2.0);
  const qr = vec2(c.mul(q.x).sub(s.mul(q.y)), s.mul(q.x).add(c.mul(q.y)));
  const mv = vec4(centre.xy.add(qr.mul(U.uSize)), centre.z, centre.w);
  return { ...viewVertex(mv), vC };
}

// 加算で光る材質の共通設定（TSL 版）。nodes は vertexNode・fragmentNode など
// uniforms は TSL の uniform の表。material.uniforms として持たせ、古い書き方で値を変えられるようにする
export function glowNodeMaterial(uniforms, nodes, extra = {}) {
  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    // 今の版の ShaderMaterial と同じく、両面の半透明を裏・表の2回に分けず1回で描く（三角形の数を倍にしない）
    forceSinglePass: true,
    ...extra,
  });
  Object.assign(mat, nodes);
  mat.uniforms = { ...softUniforms, ...uniforms };
  return mat;
}

// 軸に沿って伸び、軸のまわりでカメラへ向く板。aT は 0..1、aSide は -1..1。
export function stripGeometry(rows) {
  const positions = [];
  const aT = [];
  const aSide = [];
  const index = [];
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const side of [-1, 1]) {
      positions.push(side, 0, t);
      aT.push(t);
      aSide.push(side);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    const a = r * 2;
    index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setIndex(index);
  return g;
}
