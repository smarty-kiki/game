import { Fn, vec2, vec3, float, abs, max, min, floor, fract, dot, mix, select, normalize, sin, cross, pow } from 'three/tsl';

// 宇宙の岩の形と質感で共有する数式（引数だけで計算する純粋な関数なので、WGSL の関数にしてよい）。
// 形は「中心から見た向きごとの半径」で持つ（星形の立体）。向きは八面体の地図（正方形1枚に全天を広げる）で画像の位置へ直す。

// ---- 雑音 ----
export const hash31 = /*@__PURE__*/ Fn(([p0]) => {
  const p = fract(p0.mul(vec3(0.1031, 0.1030, 0.0973))).toVar();
  p.addAssign(dot(p, p.yzx.add(33.33)));
  return fract(p.x.add(p.y).mul(p.z));
}).setLayout({ name: 'spHash31', type: 'float', inputs: [{ name: 'p0', type: 'vec3' }] });

export const hash33 = /*@__PURE__*/ Fn(([p0]) => {
  const p = fract(p0.mul(vec3(0.1031, 0.1030, 0.0973))).toVar();
  p.addAssign(dot(p, p.yxz.add(33.33)));
  return fract(p.xxy.add(p.yxx).mul(p.zyx));
}).setLayout({ name: 'spHash33', type: 'vec3', inputs: [{ name: 'p0', type: 'vec3' }] });

// 値の雑音（0〜1）
export const vnoise3 = /*@__PURE__*/ Fn(([x]) => {
  const i = floor(x);
  const f0 = fract(x);
  const f = f0.mul(f0).mul(float(3.0).sub(f0.mul(2.0)));
  const n = (a, b, c) => hash31(i.add(vec3(a, b, c)));
  return mix(
    mix(mix(n(0, 0, 0), n(1, 0, 0), f.x), mix(n(0, 1, 0), n(1, 1, 0), f.x), f.y),
    mix(mix(n(0, 0, 1), n(1, 0, 1), f.x), mix(n(0, 1, 1), n(1, 1, 1), f.x), f.y),
    f.z,
  );
}).setLayout({ name: 'spVnoise3', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });

// 5段の重ね（-0.5〜0.5 付近）
export const fbm3 = /*@__PURE__*/ Fn(([p]) => {
  const a = vnoise3(p).sub(0.5);
  const b = vnoise3(p.mul(2.03).add(vec3(5.1, 1.3, 7.7))).sub(0.5).mul(0.5);
  const c = vnoise3(p.mul(4.11).add(vec3(2.9, 8.4, 3.3))).sub(0.5).mul(0.25);
  const d = vnoise3(p.mul(8.17).add(vec3(9.2, 4.6, 1.8))).sub(0.5).mul(0.125);
  const e = vnoise3(p.mul(16.3).add(vec3(3.7, 6.1, 5.5))).sub(0.5).mul(0.0625);
  return a.add(b).add(c).add(d).add(e);
}).setLayout({ name: 'spFbm3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

// 尾根の雑音（尖った稜線。0〜1）
export const ridged3 = /*@__PURE__*/ Fn(([p]) => {
  const r1 = float(1.0).sub(abs(vnoise3(p).mul(2.0).sub(1.0)));
  const r2 = float(1.0).sub(abs(vnoise3(p.mul(2.1).add(vec3(3.3, 7.1, 1.9))).mul(2.0).sub(1.0)));
  return r1.mul(r1).mul(0.65).add(r2.mul(r2).mul(r1).mul(0.35));
}).setLayout({ name: 'spRidged3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

// ---- 八面体の地図 ----
const sgn = (x) => select(x.greaterThanEqual(0.0), float(1.0), float(-1.0));

// 単位の向き → 0〜1 の正方形
export const octEncode = /*@__PURE__*/ Fn(([n]) => {
  const a = n.div(abs(n.x).add(abs(n.y)).add(abs(n.z)));
  const fold = vec2(float(1.0).sub(abs(a.y)).mul(sgn(a.x)), float(1.0).sub(abs(a.x)).mul(sgn(a.y)));
  return select(a.z.lessThan(0.0), fold, a.xy).mul(0.5).add(0.5);
}).setLayout({ name: 'spOctEncode', type: 'vec2', inputs: [{ name: 'n', type: 'vec3' }] });

// 0〜1 の正方形 → 単位の向き
export const octDecode = /*@__PURE__*/ Fn(([uv]) => {
  const f = uv.mul(2.0).sub(1.0);
  const z = float(1.0).sub(abs(f.x)).sub(abs(f.y));
  const t = max(z.negate(), 0.0);
  const x = f.x.add(select(f.x.greaterThanEqual(0.0), t.negate(), t));
  const y = f.y.add(select(f.y.greaterThanEqual(0.0), t.negate(), t));
  return normalize(vec3(x, y, z));
}).setLayout({ name: 'spOctDecode', type: 'vec3', inputs: [{ name: 'uv', type: 'vec2' }] });

// 正方形の外（-1〜1 の外）を、折り目の向こうの同じ向きへ戻す。余白の画素を正しい向きで焼き、継ぎ目を消す
export const octWrap = /*@__PURE__*/ Fn(([f0]) => {
  const f = f0.toVar();
  const ox = abs(f.x).greaterThan(1.0);
  f.assign(select(ox, vec2(sgn(f.x).mul(float(2.0).sub(abs(f.x))), f.y.negate()), f));
  const oy = abs(f.y).greaterThan(1.0);
  f.assign(select(oy, vec2(f.x.negate(), sgn(f.y).mul(float(2.0).sub(abs(f.y)))), f));
  return f;
}).setLayout({ name: 'spOctWrap', type: 'vec2', inputs: [{ name: 'f0', type: 'vec2' }] });

// 四元数で回す（q は xyz・w）
export const qrot = /*@__PURE__*/ Fn(([q, v]) => {
  const t = cross(q.xyz, v).mul(2.0);
  return v.add(t.mul(q.w)).add(cross(q.xyz, t));
}).setLayout({ name: 'spQrot', type: 'vec3', inputs: [{ name: 'q', type: 'vec4' }, { name: 'v', type: 'vec3' }] });

export const qrotInv = /*@__PURE__*/ Fn(([q, v]) => {
  const qi = q.xyz.negate();
  const t = cross(qi, v).mul(2.0);
  return v.add(t.mul(q.w)).add(cross(qi, t));
}).setLayout({ name: 'spQrotInv', type: 'vec3', inputs: [{ name: 'q', type: 'vec4' }, { name: 'v', type: 'vec3' }] });

// 向き d に直交する2本（焼くときと描くときで同じ向きを使う）
export const basisR = /*@__PURE__*/ Fn(([d]) => {
  const up = select(abs(d.y).lessThan(0.999), vec3(0, 1, 0), vec3(1, 0, 0));
  return normalize(cross(up, d));
}).setLayout({ name: 'spBasisR', type: 'vec3', inputs: [{ name: 'd', type: 'vec3' }] });

export const smin = (a, b, k) => {
  const h = max(k.sub(abs(a.sub(b))), 0.0).div(k);
  return min(a, b).sub(h.mul(h).mul(k).mul(0.25));
};
export const smax = (a, b, k) => smin(a.negate(), b.negate(), k).negate();
// 岩ごとの縦・横・奥行きの比（種から決める。体積はほぼ変えない）。近くの立体・板・影で同じ値を使う
export const stretchOf = /*@__PURE__*/ Fn(([seed]) => {
  const h = hash33(vec3(seed.mul(0.731), seed.mul(1.913).add(4.1), seed.mul(2.377).add(9.3)));
  const s = h.mul(0.72).add(0.66);
  return s.div(pow(s.x.mul(s.y).mul(s.z), 1.0 / 3.0));
}).setLayout({ name: 'spStretch', type: 'vec3', inputs: [{ name: 'seed', type: 'float' }] });
export const STRETCH_MAX = 1.65; // 比の最大（見えるかの判定の余裕に使う）
export { sin };
