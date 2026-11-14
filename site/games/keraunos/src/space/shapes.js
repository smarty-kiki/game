import * as THREE from 'three';
import {
  Fn, uv, uniformArray, vec2, vec3, vec4, float, int, abs, max, min, floor, fract, dot, mix, clamp, length, normalize, sqrt,
  smoothstep, select, sin, cross, Loop, If, texture, pow, saturate,
} from 'three/tsl';
import { hash31, hash33, fbm3, ridged3, vnoise3, octDecode, octEncode, octWrap, smin, smax } from './shapeMath.js';

// 宇宙の岩の「形の地図」を起動時に GPU で焼く（WebGPU・WebGL2 の両方で動くよう、全面の板を描く方法で焼く）。
// 形は中心から見た向きごとの半径。24種の形を1枚の大きな画像（6×4 のます）に並べ、どの岩も種類の番号でますを選ぶ。
//   半径と印の地図（16ビットの浮動小数。半径・クレーターの底・割れた面・凸凹の度合い）：頂点を押し出す・自分の影を探る・
//     遠くの板（インポスター）を焼く・砂が溜まる所と角と割れ口の材質を分ける
//   法線の地図（法線＋隙間の暗がり）：焼いた解像度の細かさで陰影を付ける（面の数に関係なく、クレーターの縁や割れ口が立つ）
// 形の作り：楕円体（二つ玉もある）→ ゆがめた雑音 → 尾根 → 地層の段 → 4段のクレーター（縁が盛り上がり、大きいものは内壁に段）
//           → 角ばった石 → 大きな平らな割れ面

export const TX = 6;
export const TY = 4;
export const BOUND = 1.45; // 形が収まる半径（物の座標）。これより外は焼かない

// 形の元になる8種（手で決めた型）。kind は既定の材質（0=岩・1=氷・2=金属）
const TEMPLATES = [
  { name: '岩・細長い', kind: 0, lobes: [[0, 0, 0, 1.22, 0.78, 0.7]], noise: [0.1, 1.35], crater: [0.85, 0.9], ridge: 0.03, boulder: 0.6, planes: 10, cut: [0.68, 0.92], terrace: 0.8, strata: [0.07, 7] },
  { name: '岩・二つ玉', kind: 0, lobes: [[-0.42, 0.04, 0, 0.72, 0.62, 0.6], [0.5, -0.06, 0.05, 0.56, 0.5, 0.52]], noise: [0.09, 1.6], crater: [0.8, 0.8], ridge: 0.02, boulder: 0.55, planes: 9, cut: [0.7, 0.93], terrace: 0.6, strata: [0.065, 7] },
  { name: '岩・角ばった', kind: 0, lobes: [[0, 0, 0, 1.0, 0.86, 0.8]], noise: [0.07, 1.8], crater: [0.55, 0.7], ridge: 0.04, boulder: 0.9, planes: 14, cut: [0.6, 0.88], terrace: 0.3, strata: [0.04, 9] },
  { name: '岩・平たい', kind: 0, lobes: [[0, 0, 0, 1.12, 0.56, 0.96]], noise: [0.09, 1.3], crater: [1.0, 1.0], ridge: 0.02, boulder: 0.45, planes: 10, cut: [0.7, 0.92], terrace: 1, strata: [0.08, 5] },
  { name: '氷・破片', kind: 1, lobes: [[0, 0, 0, 1.25, 0.72, 0.66]], noise: [0.04, 1.6], crater: [0.2, 0.3], ridge: 0.01, boulder: 0.1, planes: 15, cut: [0.55, 0.86], terrace: 0, strata: [0, 1] },
  { name: '氷・塊', kind: 1, lobes: [[0, 0, 0, 0.98, 0.86, 0.8]], noise: [0.06, 1.5], crater: [0.35, 0.4], ridge: 0.015, boulder: 0.2, planes: 13, cut: [0.62, 0.9], terrace: 0, strata: [0, 1] },
  { name: '金属・塊', kind: 2, lobes: [[0, 0, 0, 1.02, 0.82, 0.76]], noise: [0.07, 1.25], crater: [1.2, 0.5], ridge: 0.0, boulder: 0.15, planes: 6, cut: [0.66, 0.9], terrace: 0, strata: [0, 1] },
  { name: '金属・板', kind: 2, lobes: [[0, 0, 0, 1.2, 0.52, 0.82]], noise: [0.05, 1.4], crater: [0.8, 0.5], ridge: 0.0, boulder: 0.1, planes: 7, cut: [0.66, 0.9], terrace: 0, strata: [0, 1] },
];
// 焼く形は 24 種：型の8種と、型から数値をばらして作った16種（岩10・氷3・金属3）。
// さらに描く時に、岩ごとの種から縦・横・奥行きの比と回転と大きさを変えるので、同じ見た目の塊は出ない
function makeShapes() {
  let sd = 48611;
  const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const j = (v, a) => v * (1 - a + 2 * a * r());
  const out = TEMPLATES.map((t) => ({ ...t }));
  const plan = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2];
  plan.forEach((kind, vi) => {
    const pool = TEMPLATES.filter((t) => t.kind === kind);
    const t = pool[Math.floor(r() * pool.length)];
    const lobes = t.lobes.map((l) => [l[0] * j(1, 0.3), l[1] * j(1, 0.3), l[2], j(l[3], 0.22), j(l[4], 0.22), j(l[5], 0.22)]);
    // 岩は時々、別の塊がくっついた形にする
    if (kind === 0 && lobes.length === 1 && r() < 0.35) lobes.push([0.35 + r() * 0.3, (r() - 0.5) * 0.4, (r() - 0.5) * 0.4, 0.4 + r() * 0.25, 0.35 + r() * 0.2, 0.35 + r() * 0.2]);
    const planes = Math.max(4, Math.min(16, Math.round(j(t.planes, 0.35))));
    out.push({
      ...t, name: `${t.name}・${vi + 1}`, lobes, planes,
      noise: [j(t.noise[0], 0.3), j(t.noise[1], 0.25)], crater: [j(t.crater[0], 0.35), j(t.crater[1], 0.25)],
      ridge: j(t.ridge, 0.4), boulder: j(t.boulder, 0.4), cut: [j(t.cut[0], 0.08), Math.min(0.96, j(t.cut[1], 0.04))],
      terrace: j(t.terrace, 0.3), strata: [j(t.strata[0], 0.35), Math.max(1, Math.round(j(t.strata[1], 0.3)))],
    });
  });
  return out;
}
export const SHAPES = makeShapes();
// 材質ごとに使える形の番号
export const SHAPES_BY_KIND = [0, 1, 2].map((k) => SHAPES.map((sh, i) => (sh.kind === k ? i : -1)).filter((i) => i >= 0));
// 材質と 0〜1 の値から形の番号を選ぶ
export const pickShape = (kind, u) => { const l = SHAPES_BY_KIND[kind]; return l[Math.min(l.length - 1, Math.floor(u * l.length))]; };
const MAX_PLANES = 16;

function rng(seed) {
  let s = Math.floor(seed * 7919) % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// 形ごとの数値を GPU へ渡す配列に詰める
function packShapes() {
  const A = []; const B = []; const C = []; const D = []; const L = []; const P = [];
  SHAPES.forEach((s, k) => {
    const r = rng(k * 13.7 + 3.1);
    A.push(new THREE.Vector4(s.noise[0], s.noise[1], s.crater[0], s.crater[1]));
    B.push(new THREE.Vector4(s.ridge, 0, s.boulder, k * 7.31 + 1.7));
    C.push(new THREE.Vector4(s.planes, 0, s.terrace, s.kind));
    D.push(new THREE.Vector4(s.strata[0], s.strata[1], 0, 0));
    for (let j = 0; j < 2; j++) {
      const l = s.lobes[j];
      if (l) { L.push(new THREE.Vector4(l[0], l[1], l[2], 1), new THREE.Vector4(l[3], l[4], l[5], 0)); } else { L.push(new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(1, 1, 1, 0)); }
    }
    for (let i = 0; i < MAX_PLANES; i++) {
      if (i >= s.planes) { P.push(new THREE.Vector4(0, 1, 0, 99)); continue; }
      // 割れ面の向きはばらす。楕円体の張り出し（その向きの最大の半径）の何割かで切る
      const z = r() * 2 - 1; const t = r() * Math.PI * 2; const c = Math.sqrt(1 - z * z);
      const n = [c * Math.cos(t), z, c * Math.sin(t)];
      let sup = 0;
      for (const l of s.lobes) sup = Math.max(sup, Math.hypot(l[3] * n[0], l[4] * n[1], l[5] * n[2]) + l[0] * n[0] + l[1] * n[1] + l[2] * n[2]);
      P.push(new THREE.Vector4(n[0], n[1], n[2], sup * (s.cut[0] + r() * (s.cut[1] - s.cut[0]))));
    }
  });
  return { A, B, C, D, L, P };
}

// 向き dir・種類 k（float の節）→ 地図の画像の位置。PAD は余白（縮小した段で隣のますが混ざらない）
export function makeAtlasUV(RES, PAD) {
  const W = TX * RES; const H = TY * RES;
  return (dir, k) => {
    const o = octEncode(dir);
    const kx = k.sub(floor(k.div(TX)).mul(TX));
    const ky = floor(k.div(TX));
    const texel = vec2(kx, ky).mul(RES).add(PAD).add(o.mul(RES - 2 * PAD));
    return texel.div(vec2(W, H));
  };
}

// 焼く板：uv → ます（種類）と、そのますの中の向き（余白は折り目の向こうの向き）
function texelDir(RES, PAD) {
  const W = TX * RES; const H = TY * RES;
  const t = uv().mul(vec2(W, H));
  const tile = floor(t.div(RES));
  const local = t.sub(tile.mul(RES));
  const o = local.sub(PAD).div(RES - 2 * PAD);
  const f = octWrap(o.mul(2.0).sub(1.0));
  const d = octDecode(f.mul(0.5).add(0.5));
  const k = tile.x.add(tile.y.mul(TX));
  return { d, k };
}

// クレーターの形（Sebastian Lague の式：凹み・縁の盛り上がり・平らな底を滑らかにつなぐ）
const craterProfile = (x, terrace) => {
  const cav = x.mul(x).sub(1.0).add(sin(x.mul(19.0)).mul(0.025).mul(terrace).mul(smoothstep(0.25, 0.9, x)).mul(select(x.lessThan(1.0), float(1.0), float(0.0))));
  const rimX = min(x.sub(1.0).sub(0.42), 0.0);
  const rim = rimX.mul(rimX).mul(0.85);
  return smax(smin(cav, rim, float(0.3)), float(-0.82), float(0.3));
};

// 1回目の地図（上位・下位に分けた半径と印）から、法線と隙間の暗がり（matN）、半径−1と印と凸凹の度合い（matR）を作る材質。
// 形の地図（24種）と、近い岩ごとの細かい地図（detailAtlas.js）で共通に使う。
//   srcTex：1回目の地図、uvOf(dir, k)：向き→その地図の位置、dirOf()：焼く画素の { d, k }、ang：隣を読む角度（1画素ほど）、
//   aoRad：隙間の暗がりを調べる3つの距離（角度）
export function makeDerivedMaterials({ srcTex, uvOf, dirOf, ang, aoRad = [0.018, 0.05, 0.13] }) {
  const radiusAt = (dir, k) => { const t = texture(srcTex, uvOf(dir, k)).level(0); return t.x.add(t.y.div(1024.0)); };
  const posAt = (dir, k) => dir.mul(radiusAt(dir, k));
  const deriv = (write) => {
    const m = new THREE.MeshBasicNodeMaterial({ fog: false, toneMapped: false });
    m.fragmentNode = Fn(() => {
      const { d, k } = dirOf();
      const T = normalize(cross(select(abs(d.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0)), d));
      const Bt = cross(d, T);
      const p0 = posAt(d, k);
      return write({ d, k, T, Bt, p0 });
    })();
    return m;
  };
  const matN = deriv(({ d, k, T, Bt, p0 }) => {
    const px = posAt(normalize(d.add(T.mul(ang))), k).sub(posAt(normalize(d.sub(T.mul(ang))), k));
    const py = posAt(normalize(d.add(Bt.mul(ang))), k).sub(posAt(normalize(d.sub(Bt.mul(ang))), k));
    const n0 = normalize(cross(px, py));
    const n = select(dot(n0, d).lessThan(0.0), n0.negate(), n0);
    // 隙間の暗がり：まわり 12 方向 × 3 の距離の地表が、接する面からどれだけ持ち上がっているか
    const occ = float(0.0).toVar();
    Loop(12, ({ i }) => {
      const a = float(i).mul(0.5236).add(0.26);
      const tv = T.mul(a.cos()).add(Bt.mul(a.sin()));
      aoRad.forEach((rad, ri) => {
        const ps = posAt(normalize(d.add(tv.mul(rad))), k);
        const v = ps.sub(p0);
        const e = dot(v, n).div(max(length(v), 1e-5));
        occ.addAssign(max(e, 0.0).mul([1.0, 0.8, 0.55][ri]));
      });
    });
    const ao = clamp(float(1.0).sub(occ.div(12.0 * 2.35).mul(2.2)), 0.0, 1.0);
    return vec4(n.mul(0.5).add(0.5), ao);
  });
  const matR = deriv(({ d, k, T, Bt }) => {
    // 凸凹の度合い：まわりの半径の平均との差（凸＝角、凹＝溝）。細かい輪と粗い輪
    const r0 = radiusAt(d, k);
    const ring = (rad) => {
      const sm = float(0.0).toVar();
      Loop(8, ({ i }) => {
        const a = float(i).mul(0.7854);
        sm.addAssign(radiusAt(normalize(d.add(T.mul(a.cos()).add(Bt.mul(a.sin())).mul(rad))), k));
      });
      return sm.div(8.0);
    };
    const c1 = r0.sub(ring(ang * 2.5)).div(ang * 2.5);
    const c2 = r0.sub(ring(ang * 9.0)).div(ang * 9.0);
    const curv = clamp(c1.mul(0.35).add(c2.mul(0.65)).mul(0.3).add(0.5), 0.0, 1.0);
    const hs = texture(srcTex, uvOf(d, k)).level(0);
    // 半径は 1 を引いて書く（16ビットの浮動小数は 0 に近いほど刻みが細かい。1 前後のままより 2〜4 倍細かい）
    return vec4(r0.sub(1.0), hs.z, hs.w, curv);
  });
  return { matN, matR };
}

// 焼くのは描画の命令を出すだけで待たないので、同期で返す（ゲームの createWorld の中からも呼べる）
export function createShapeAtlas(renderer, { res = 640, pad = 10 } = {}) {
  const RES = res; const PAD = pad;
  const W = TX * RES; const H = TY * RES;
  const atlasUV = makeAtlasUV(RES, PAD);
  const pk = packShapes();
  const uA = uniformArray(pk.A, 'vec4');
  const uB = uniformArray(pk.B, 'vec4');
  const uC = uniformArray(pk.C, 'vec4');
  const uD = uniformArray(pk.D, 'vec4');
  const uL = uniformArray(pk.L, 'vec4');
  const uP = uniformArray(pk.P, 'vec4');

  // ---- 1回目：半径と印 ----
  const rtH = new THREE.RenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const matH = new THREE.MeshBasicNodeMaterial({ fog: false, toneMapped: false });
  // 形の式（向き d・種類 k → 半径・クレーターの底・割れ面）。Fn の中で呼ぶ。
  // extraH(p, d)：割れ面で切る前に足す高さ（物の座標。近い岩の細かい地図が、細かい層や石を足すのに使う）
  // boulderK：転がる石の数の倍率（近い岩の細かい地図では減らす。低い太陽で四角い影の点々に見えるため）
  const shapeCore = (d, k, { extraH = null, boulderK = 1.0 } = {}) => {
    const ki = int(k);
    const pa = uA.element(ki); const pb = uB.element(ki); const pc = uC.element(ki); const pd = uD.element(ki);
    const seed = vec3(pb.w, pb.w.mul(1.37), pb.w.mul(0.71));
    // 楕円体（2つまで）を中心から見た向き d の半径。二つ玉は滑らかにつなぐ
    const lobe = (j) => {
      const c = uL.element(ki.mul(4).add(j * 2)); const a = uL.element(ki.mul(4).add(j * 2 + 1));
      const D = d.div(a.xyz); const Cc = c.xyz.div(a.xyz);
      const dd = dot(D, D); const dc = dot(D, Cc); const cc = dot(Cc, Cc);
      const disc = dc.mul(dc).sub(dd.mul(cc.sub(1.0)));
      const t = dc.add(sqrt(max(disc, 0.0))).div(dd);
      return select(disc.greaterThan(0.0).and(c.w.greaterThan(0.5)), t, float(0.0));
    };
    const r0 = smax(lobe(0), lobe(1), float(0.18)).toVar();
    // ゆがめた雑音で大きな凸凹（丸い芋に見せない）
    const warp = vec3(fbm3(d.mul(1.7).add(seed)), fbm3(d.mul(1.7).add(seed).add(4.1)), fbm3(d.mul(1.7).add(seed).add(8.3)));
    r0.mulAssign(float(1.0).add(fbm3(d.mul(pa.y).add(seed).add(warp.mul(0.9))).mul(pa.x).mul(1.5)));
    const p = d.mul(r0);
    const h = float(0.0).toVar();
    // 尾根と溝
    h.subAssign(ridged3(p.mul(2.6).add(seed)).mul(pb.x));
    // 地層の段：個体ごとに傾いた層の向き。層ごとに外の面が少しずつ奥へ下がり、層の境で段（崖の棚）になる。
    // 横を向いた面ほど強く、まだらに出す（全面の縞にしない）
    const sAx = normalize(hash33(seed.add(5.3)).sub(0.5).add(vec3(0.0, 0.7, 0.0)));
    const tL = dot(p, sAx).mul(pd.y).add(fbm3(p.mul(0.6).add(seed.add(2.2))).mul(0.12)); // 層はほぼ平ら（雑音で曲げると波打つ等高線に見える）
    const fL = fract(tL);
    const sideF = sqrt(saturate(float(1.0).sub(abs(dot(d, sAx)))));
    const patchF = smoothstep(0.22, 0.55, fbm3(p.mul(1.05).add(seed.add(9.7))).add(0.5));
    const layerAmp = hash31(floor(tL).add(seed.x)).mul(0.8).add(0.5);
    // 階段：層の境から層の 2 割で切り立ち、残りはゆるく戻る（smoothstep − f は層の両端で 0 になるので、層の境で途切れない。
    // 途切れると半径が飛び、どの解像度でも縁が画素の並びの点線になる）
    h.subAssign(smoothstep(0.0, 0.2, fL).sub(fL).mul(1.25).mul(pd.x).mul(sideF).mul(patchF).mul(layerAmp));
    // クレーター：4段の大きさ。3次元の格子の点を中心にした球で地表をえぐる（中心の深さで見かけの大きさがばらける）
    const craterMask = float(0.0).toVar();
    const scales = [0.5, 0.23, 0.105, 0.048];
    const dens = [0.7, 0.5, 0.3, 0.18];
    const depthK = [1.25, 0.95, 0.6, 0.38];
    scales.forEach((s, si) => {
      const q = p.div(s);
      const cell = floor(q);
      Loop(27, ({ i }) => {
        const fi = float(i);
        const oz = floor(fi.div(9.0)); const oy = floor(fi.sub(oz.mul(9.0)).div(3.0)); const ox = fi.sub(oz.mul(9.0)).sub(oy.mul(3.0));
        const cc = cell.add(vec3(ox, oy, oz).sub(1.0));
        const hh = hash33(cc.add(seed.mul(3.0)).add(si * 17.0));
        If(hh.z.lessThan(dens[si] * 1.0).and(pa.z.mul(hh.y.add(0.35)).greaterThan(0.45)), () => {
          const ctr = cc.add(hash33(cc.add(31.7 + si)).mul(0.8).add(0.1)).mul(s);
          const R = hash31(cc.add(seed).add(71.3)).mul(0.35).add(0.32).mul(s);
          const x = length(p.sub(ctr)).div(R);
          If(x.lessThan(1.7), () => {
            h.addAssign(craterProfile(x, pc.z.mul(si < 1 ? 1.0 : 0.0)).mul(R).mul(pa.w).mul(0.8 * depthK[si]));
            craterMask.assign(max(craterMask, float(1.0).sub(smoothstep(0.35, 1.0, x)).mul(si < 3 ? 1.0 : 0.6)));
          });
        });
      });
    });
    // 転がる石（半球の盛り上がり）
    const bh = float(0.0).toVar();
    [0.07, 0.034, 0.016].forEach((s, si) => {
      const q = p.div(s);
      const cell = floor(q);
      Loop(27, ({ i }) => {
        const fi = float(i);
        const oz = floor(fi.div(9.0)); const oy = floor(fi.sub(oz.mul(9.0)).div(3.0)); const ox = fi.sub(oz.mul(9.0)).sub(oy.mul(3.0));
        const cc = cell.add(vec3(ox, oy, oz).sub(1.0));
        const hh = hash33(cc.add(seed.mul(5.0)).add(101.0 + si));
        If(hh.x.lessThan(pb.z.mul(si === 0 ? 0.12 : 0.34).mul(boulderK)), () => {
          const ctr = cc.add(hash33(cc.add(57.1 + si)).mul(0.8).add(0.1)).mul(s);
          const R = hh.y.mul(0.3).add(0.18).mul(s);
          // 角ばった石：面に沿って傾けた八角形（四角の角を落とす。四角のままだと低い太陽で四角い影の記号に見える）。
          // 縦横の比と角の落とし方を石ごとに変える
          const v = p.sub(ctr);
          const Tq = normalize(cross(select(abs(d.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0)), d));
          const Bq = cross(d, Tq);
          const th = hh.z.mul(6.283);
          const u1 = Tq.mul(th.cos()).add(Bq.mul(th.sin())); const u2 = cross(d, u1);
          const a1 = abs(dot(v, u1)); const a2 = abs(dot(v, u2)).mul(hh.y.mul(0.6).add(0.8));
          const linf = max(max(a1, a2), a1.add(a2).mul(hh.x.mul(2.0).add(0.68)));
          If(linf.lessThan(R), () => {
            bh.assign(max(bh, smoothstep(R, R.mul(0.72), linf).mul(R).mul(0.62)));
          });
        });
      });
    });
    h.addAssign(bh);
    // 細かいざらつき（焼いた地図の解像度の範囲）
    h.addAssign(fbm3(p.mul(22.0).add(seed)).mul(0.005));
    if (extraH) h.addAssign(extraH({ p, d, seed, crater: craterMask, sAx, tL, sideF, patchF }));
    const rr = r0.add(h).toVar();
    // 大きな割れ面：平らで縁が鋭い
    const frac = float(0.0).toVar();
    Loop(MAX_PLANES, ({ i }) => {
      const pl = uP.element(ki.mul(MAX_PLANES).add(i));
      const dn = dot(d, pl.xyz);
      If(dn.greaterThan(0.03).and(pl.w.lessThan(50.0)), () => {
        const X = d.mul(rr);
        // 割れ面は完全な平面（面の向きが一定でないと、面にまっすぐ貼る質感の向きが揺れて模様が流れる）。凹凸は質感の画像に任せる
        const rp = pl.w.div(dn);
        If(rp.lessThan(rr), () => {
          frac.assign(max(frac, smoothstep(0.0, 0.004, rr.sub(rp))));
          rr.assign(rp);
        });
      });
    });
    // 半径は 16 ビットの浮動小数では刻みが粗く（1 前後で 1/2048）、隣との差で求める法線がばらつくので、
    // 上位（1/1024 の刻み）と下位（その余り×1024）の2つに分けて書く。線形の補間は足し戻しても正しい
    return { rr, crater: craterMask.mul(float(1.0).sub(frac)), frac };
  };
  matH.fragmentNode = Fn(() => {
    const { d, k } = texelDir(RES, PAD);
    const { rr, crater, frac } = shapeCore(d, k);
    const rc = clamp(rr, 0.22, BOUND - 0.03);
    const rHi = floor(rc.mul(1024.0)).div(1024.0);
    return vec4(rHi, rc.sub(rHi).mul(1024.0), crater, frac);
  })();
  const quad = new THREE.QuadMesh(matH);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rtH);
  quad.render(renderer);

  // ---- 2回目：法線と隙間の暗がり（半径の地図の隣を読んで求める）----
  const tH = rtH.texture;
  const { matN, matR } = makeDerivedMaterials({ srcTex: tH, uvOf: atlasUV, dirOf: () => texelDir(RES, PAD), ang: 2.4 / RES });
  const rtN = new THREE.RenderTarget(W, H, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  // 半径と印の地図（16ビット・4チャンネル：半径−1・クレーターの底・割れ面・凸凹の度合い）。
  // 1枚にまとめるのは、1つのシェーダーで使える画像の数（16枚）に収めるため
  const rtR = new THREE.RenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  for (const [rt, m] of [[rtN, matN], [rtR, matR]]) {
    quad.material = m;
    renderer.setRenderTarget(rt);
    quad.render(renderer);
  }
  renderer.setRenderTarget(prev);
  rtH.dispose();
  for (const m of [matH, matN, matR]) m.dispose();

  const radiusTex = rtR.texture; const normalTex = rtN.texture; const maskTex = rtR.texture;
  return {
    RES, PAD, W, H, atlasUV, radiusTex, normalTex, maskTex, shapes: SHAPES, shapeCore,
    // 描くときに使う読み出し（dir は物の座標の単位の向き、k は種類の float）
    radius: (dir, k) => texture(radiusTex, atlasUV(dir, k)).level(0).x.add(1.0),
    dispose() { rtR.dispose(); rtN.dispose(); },
  };
}
