import * as THREE from 'three';
import {
  Fn, uniform, uniformArray, screenUV, vec2, vec3, vec4, float, int, Loop, If, length, normalize, exp, abs, dot,
  sin, cos, clamp, smoothstep, max, min, select,
} from 'three/tsl';

// 衝撃波の輪のすぐ内側で画面を屈折させ、ブースト中は色をずらす（WebGPU・TSL 版。描画の後の段で使う）。
// 輪・熱・弾の位置は、今までどおり左下が原点の画面の座標（0..1）で受け取る。

// 飛んでいる敵の弾のまわりの熱の揺らぎ。enemies.js が毎コマ、画面上の弾の頭と尾を入れる
// a = (頭のx, 頭のy, 半径, 強さ)、b = (尾のx, 尾のy)
export const boltHeat = {
  a: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()],
  b: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
};


// NaN・無限大の画素を 0 にし、明るすぎる値を抑える（発光のぼかしで黒い四角が広がるのを防ぐ）
export const nanGuard = /*@__PURE__*/ Fn(([c]) => {
  const ok = c.r.greaterThanEqual(0.0).and(c.g.greaterThanEqual(0.0)).and(c.b.greaterThanEqual(0.0));
  return select(ok, min(c, vec3(40.0)), vec3(0.0));
}).setLayout({ name: 'nanGuard', type: 'vec3', inputs: [{ name: 'c', type: 'vec3' }] });

const BOLT_HEAT = typeof location !== 'undefined' && new URLSearchParams(location.search).get('boltheat') === '1';

export function createDistortionPass() {
  const rings = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
  const heat = [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()];
  const U = {
    uRings: uniformArray(rings, 'vec4'),
    uAspect: uniform(1),
    uChroma: uniform(0),
    uFlash: uniform(0),
    uTime: uniform(0),
    uBlur: uniform(0),
    uHeat: uniformArray(heat, 'vec4'),
    // 弾のまわりの熱の揺らぎは、今の版（WebGL）では ShaderPass が値を写しにして持つため一度も画面に出ていなかった。
    // 見た目を今の版と揃えるため既定では出さない。確認用: ?boltheat=1 で出す
    uBoltA: uniformArray(BOLT_HEAT ? boltHeat.a : [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()], 'vec4'),
    uBoltB: uniformArray(BOLT_HEAT ? boltHeat.b : [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()], 'vec2'),
  };
  // 古い書き方（uniforms.uRings.value[i].set(...)）のまま値を入れられる表。配列は中身を直接書き換える
  const uniforms = { ...U, uRings: { value: rings }, uHeat: { value: heat }, uBoltA: { value: boltHeat.a }, uBoltB: { value: boltHeat.b } };

  // tex は描いた場面の色（pass の texture）。返すのは歪めた色（vec4）
  const build = (tex) => Fn(() => {
    // 左下が原点の座標で計算し、読むときに上下を戻す
    const uv = vec2(screenUV.x, float(1.0).sub(screenUV.y)).toVar();
    const offset = vec2(0.0).toVar();
    const ringLight = float(0.0).toVar();
    Loop(4, ({ i }) => {
      const ring = U.uRings.element(i);
      If(ring.w.greaterThan(0.001), () => {
        const d = vec2(uv.x.sub(ring.x).mul(U.uAspect), uv.y.sub(ring.y));
        const dist = length(d);
        const width = float(0.05).add(ring.z.mul(0.22));
        const x = dist.sub(ring.z).div(width);
        // 波の前は押し、後ろは引く（1本の線に見せない）
        const band = x.negate().mul(exp(x.mul(x).negate())).mul(1.65);
        const dir = normalize(d.add(vec2(1e-5)));
        offset.addAssign(dir.mul(band).mul(ring.w).mul(0.016).mul(vec2(float(1.0).div(U.uAspect), 1.0)));
        ringLight.addAssign(abs(band).mul(ring.w));
      });
    });

    // 熱のゆらぎ：噴射と光線のまわりの空気
    Loop(3, ({ i }) => {
      const h = U.uHeat.element(i);
      If(h.w.greaterThan(0.001), () => {
        const dh = vec2(uv.x.sub(h.x).mul(U.uAspect), uv.y.sub(h.y));
        const m = exp(dot(dh, dh).negate().div(h.z.mul(h.z)));
        offset.addAssign(vec2(
          sin(uv.y.mul(90.0).add(U.uTime.mul(37.0)).add(uv.x.mul(40.0))),
          cos(uv.x.mul(80.0).sub(U.uTime.mul(41.0)).add(uv.y.mul(60.0))),
        ).mul(m).mul(h.w).mul(0.0011));
      });
    });

    // 弾のまわりの揺らぎ：頭から尾への線分のまわり。尾へ向かって弱まる
    Loop(4, ({ i }) => {
      const h = U.uBoltA.element(i);
      const tb = U.uBoltB.element(i);
      If(h.w.greaterThan(0.001), () => {
        const pa = vec2(uv.x.sub(h.x).mul(U.uAspect), uv.y.sub(h.y));
        const ba = vec2(tb.x.sub(h.x).mul(U.uAspect), tb.y.sub(h.y));
        const k = clamp(dot(pa, ba).div(max(dot(ba, ba), 1e-6)), 0.0, 1.0);
        const dd = pa.sub(ba.mul(k));
        const m = exp(dot(dd, dd).negate().div(h.z.mul(h.z))).mul(float(1.0).sub(k.mul(0.7)));
        If(m.greaterThanEqual(0.01), () => {
          offset.addAssign(vec2(
            sin(uv.y.mul(210.0).add(U.uTime.mul(53.0)).add(uv.x.mul(70.0))),
            cos(uv.x.mul(190.0).sub(U.uTime.mul(61.0)).add(uv.y.mul(90.0))),
          ).mul(m).mul(h.w).mul(0.0026));
        });
      });
    });

    const centre = uv.sub(0.5);
    const dirC = normalize(centre.add(vec2(1e-5)));
    const ca = U.uChroma.mul(0.0035).mul(length(centre)).mul(2.0).add(ringLight.mul(0.0008));

    // ブースト中は外側ほど放射状に流す
    const col = vec3(0.0).toVar();
    const blur = U.uBlur.mul(smoothstep(0.15, 0.7, length(centre)));
    const read = (p) => nanGuard(tex.sample(vec2(p.x, float(1.0).sub(p.y))).rgb);
    Loop(5, ({ i }) => {
      const b = centre.negate().mul(blur).mul(float(i)).mul(0.25);
      const base = uv.add(b).add(offset);
      col.addAssign(vec3(read(base.add(dirC.mul(ca))).r, read(base).g, read(base.sub(dirC.mul(ca))).b));
    });
    return vec4(col.mul(0.2).add(vec3(U.uFlash)), 1.0);
  })();

  return { uniforms, build };
}
