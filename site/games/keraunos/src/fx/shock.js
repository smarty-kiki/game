import * as THREE from 'three';
import {
  Fn, vec3, vec4, floor, fract, mix, exp, abs, dot, clamp, smoothstep, normalize, uv, positionGeometry, positionView,
  normalGeometry, normalViewGeometry, modelWorldMatrix,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, softFade } from './soft.js';
// 音速を越えた瞬間の空気の波。線は描かず、画面の歪みだけで見せる（描くのは shipfx.js の蒸気の粒）。
// 状態の半径は遠くまで飛ぶので、絵の半径を別に持つ。

export function ringVisualRadius(w, life = 1.6) {
  const a = Math.min(1, w.age / life);
  return 0.3 + 5.0 * (1 - Math.pow(1 - a, 2.4));
}


// 音速を越えた瞬間に機体を包む蒸気の釣鐘。前の縁（衝撃の面）はくっきり、後ろへ行くほど薄くほどける。
// 薄い雲の殻なので、視線が殻を斜めに通る所ほど濃く見える（真後ろからは機体のまわりの白い輪になる）。
// 立体の雑音（引数だけで計算するので関数にしてよい）
const h3 = /*@__PURE__*/ Fn(([p0]) => {
  const p = fract(p0.mul(0.3183099).add(vec3(0.11, 0.17, 0.13))).mul(17.0);
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
}).setLayout({ name: 'bellH3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

const n3 = /*@__PURE__*/ Fn(([x]) => {
  const i = floor(x);
  const f0 = fract(x);
  const f = f0.mul(f0).mul(f0.mul(-2.0).add(3.0));
  return mix(
    mix(mix(h3(i), h3(i.add(vec3(1, 0, 0))), f.x), mix(h3(i.add(vec3(0, 1, 0))), h3(i.add(vec3(1, 1, 0))), f.x), f.y),
    mix(mix(h3(i.add(vec3(0, 0, 1))), h3(i.add(vec3(1, 0, 1))), f.x), mix(h3(i.add(vec3(0, 1, 1))), h3(i.add(vec3(1, 1, 1))), f.x), f.y),
    f.z,
  );
}).setLayout({ name: 'bellN3', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });

const fbm3 = /*@__PURE__*/ Fn(([p]) => {
  return n3(p).mul(0.5).add(n3(p.mul(2.1).add(3.7)).mul(0.3)).add(n3(p.mul(4.3).add(9.1)).mul(0.2));
}).setLayout({ name: 'bellFbm3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

// 釣鐘の材質。光の当たり方は太陽の向き uSun（世界の座標）で決める
function bellMaterial(sunDir) {
  const U = nodeUniforms({ uAge: 0, uOpacity: 0, uTime: 0, uSun: sunDir.clone() });
  // 今の書き方に合わせ、法線は回転・拡大を掛けたまま（世界の向きは物の行列の回転と拡大だけ掛ける）
  const worldN = modelWorldMatrix.mul(vec4(normalGeometry, 0.0)).xyz.toVarying('vWN');
  const fragmentNode = Fn(() => {
    const t = uv().y; // 0 = 前の縁、1 = 後ろ
    const vP = positionGeometry;
    // 雲の模様：後ろへ流れる柔らかい雲
    const q = vec3(vP.x.mul(7.0), vP.y.mul(7.0), vP.z.mul(4.0).add(U.uTime.mul(3.0)));
    const n = fbm3(q);
    const fine = fbm3(q.mul(3.1).add(5.0));
    // 前の縁：ほぼ一直線のくっきりした境目。わずかに揺らす
    const edge = smoothstep(0.0, fine.mul(0.06).add(0.09), t);
    const rim = exp(t.mul(-8.0)).mul(fine.mul(0.7).add(0.45)).mul(0.9);
    // 後ろへ行くほど薄い
    const clump = smoothstep(0.22, 0.80, n.mul(0.8).add(fine.mul(0.35)));
    const body = exp(t.mul(-2.8)).mul(clump).mul(fine.mul(0.6).add(0.6));
    // 時間がたつと後ろからほどけて消える
    const thr = U.uAge.mul(1.35).sub(t.oneMinus().mul(0.55));
    const erode = smoothstep(thr, thr.add(0.28), n.mul(0.75).add(fine.mul(0.25)));
    // 殻を斜めに通る所ほど厚い
    const facing = abs(dot(normalViewGeometry, normalize(positionView.negate())));
    const thick = clamp(facing.add(0.22).reciprocal(), 1.0, 3.6).mul(smoothstep(0.02, 0.32, facing));
    const a = body.add(rim).mul(edge).mul(erode).mul(thick).mul(0.42).mul(U.uOpacity);
    const lit = clamp(dot(normalize(worldN), U.uSun).mul(0.5).add(0.62), 0.35, 1.0);
    const col = mix(vec3(0.62, 0.68, 0.80), vec3(1.0, 0.99, 0.97), lit).mul(rim.mul(0.3).add(0.85));
    return vec4(col, clamp(a, 0.0, 0.85).mul(softFade(0.06, positionView.z.negate())));
  })();
  return glowNodeMaterial(U, { fragmentNode }, { blending: THREE.NormalBlending });
}

export function createVaporCone({ sunDir }) {
  // 前の縁は操縦席のあたり、後ろはエンジンの先まで開く
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = 0.30 + 0.34 * Math.pow(t, 0.7);
    pts.push(new THREE.Vector2(r, 0.16 - t * 0.95));
  }
  const geom = new THREE.LatheGeometry(pts, 120);
  // 回転体は Y 軸まわりなので、機体の前（+Z）へ向け直す
  geom.rotateX(Math.PI / 2);
  // uv.y は点の順番どおりで、前の縁が 0、後ろが 1
  const mat = bellMaterial(sunDir);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(0, 0.2, 0);
  mesh.scale.set(1.0, 0.62, 1.0);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh,
    update(state) {
      const v = state.vaporCone;
      mesh.visible = v > 0.01;
      if (!mesh.visible) return;
      const age = 1 - v;
      mat.uniforms.uAge.value = age;
      mat.uniforms.uOpacity.value = Math.min(1, age / 0.05);
      mat.uniforms.uTime.value = state.time;
      // 生まれた瞬間に少し膨らみ、すぐ機体に寄る
      const pop = 1 + 0.12 * Math.exp(-age * 14);
      mesh.scale.set(pop, 0.62 * pop, 1.0);
    },
  };
}
