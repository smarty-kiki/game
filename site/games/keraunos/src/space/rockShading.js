import * as THREE from 'three';
import {
  Fn, uniform, texture, texture3D, vec2, vec3, vec4, float, abs, max, min, floor, fract, dot, mix, clamp, length, normalize, pow,
  smoothstep, select, sin, log2, dFdx, dFdy, fwidth, reflect, cameraViewMatrix, cameraPosition, positionWorld, positionView, output,
  Loop, If, Break, saturate, exp, cross,
} from 'three/tsl';
import { hash31, hash33, qrot, qrotInv, basisR } from './shapeMath.js';
import { BOUND } from './shapes.js';

// 宇宙の岩の質感（近くの立体と遠くの板で同じ式を使う。板から立体へ切り替わっても見た目が変わらない）。
// 入力は「物の座標の地表の点 P（半径 1 前後）」「大きさ（世界の長さ／物の長さ）」「種類」「材質」「個体の種」「回転」。
//   1. 焼いた形の地図から法線・隙間の暗がり・凸凹・クレーターの底・割れ面を読む（面の数に関係なく細部が立つ）
//   2. 表面の細部は写真の素材（画像生成：玄武岩・砂礫・地層・氷・鉄。assets/space/）を3方向から貼る。
//      岩は玄武岩の地肌に、割れ面と崖は個体ごとに傾いた層の向きで地層を、窪みには砂礫を、素材の高さで混ぜる
//   3. 砂（レゴリス）は窪み・クレーターの底に溜まり、割れ面と角には付かない。角は欠けて明るい
//   4. 岩：暗い灰〜茶、鉱物の粒がきらりと光る。氷：霜の白と透明な割れ面、中のひびと泡、薄い所は青く透ける。
//      金属：酸化した暗い地肌、窪みの錆、割れ面は鈍い鋼の灰
//   5. 自分の影：太陽へ向かって半径の地図を探り、クレーターの縁や隣の出っ張りが落とす影を付ける
// 光は場面の光（太陽・縁の光・半球光・映り込み）をそのまま受ける（MeshPhysicalNodeMaterial）。
// テカらせない：岩は照り返しをほぼ無くし、粉をかぶった地表の光り方（荒い拡散。Oren-Nayar 系の EON）にする。
// 輪郭に足す光は使わない。照り返すのは氷の割れ面と、金属の磨かれた割れ面だけ

// 場面ごとに変える値（ゲームは setSun・setHaze で書き換える）
export const SPACE_U = {
  sunDir: uniform(new THREE.Vector3(-0.5, 0.6, -0.6).normalize()),
  sunColor: uniform(new THREE.Color(1.0, 0.93, 0.84)),
  sunPower: uniform(5.0),
  rimColor: uniform(new THREE.Color(0.35, 0.45, 0.75)),
  haze: uniform(new THREE.Color(0.03, 0.035, 0.06)),
  hazeNear: uniform(400),
  hazeFar: uniform(5200),
  hazeMax: uniform(0.85),
  detail: uniform(1.0),   // 細かい凹凸の強さ
  dust: uniform(1.0),     // 砂の量
  sparkle: uniform(1.0),  // 鉱物・氷のきらめき
  selfShadow: uniform(1.0),
  debugSS: uniform(0.0),   // 確認用：1 で自分の影の濃さだけを白黒で出す
  debugView: uniform(0.0), // 確認用：1 色・2 焼いた法線・3 質感を足した法線・4 隙間の暗がり・5 印（R クレーター・G 割れ面・B 凸凹）
  rockTint: uniform(new THREE.Color(1, 1, 1)), // 岩の色に掛ける（場面ごとの岩の色。ゲームの setRegion から）
  sunRim: uniform(1.0),    // 太陽側の輪郭の光の強さ
  heat: uniform(1.0),      // 赤熱の明るさ
  albedo: uniform(1.0),    // 全体の明るさ（色に掛ける）
};

// 組み立ての選択（重さの比べ用）
export const OPTS = { selfShadow: true, roughDiffuse: true };

// 写真の素材（画像生成で作り、継ぎ目なく直した物。assets/space/）。_a は色、_n は凹凸の向き（RG）と高さ（B）
let TXC = null;
function spaceTextures() {
  if (TXC) return TXC;
  const ld = new THREE.TextureLoader();
  const one = (name, srgb) => {
    const t = ld.load(`./assets/space/${name}.png`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  TXC = {};
  for (const n of ['basalt', 'regolith', 'strata', 'ice', 'iron']) TXC[n] = { a: one(`${n}_a`, true), n: one(`${n}_n`, false) };
  return TXC;
}
// 2方向から貼る（法線に近い2つの軸だけを読む。3方向より画像を読む回数が 2/3 で、見た目はほぼ同じ）。
// 軸が切り替わる所で縮小の段が飛ばないよう、傾き（grad）は連続な位置から求めて渡す
const triW = (n) => {
  const a = abs(n);
  const ma = select(a.x.greaterThan(a.y).and(a.x.greaterThan(a.z)), float(0.0), select(a.y.greaterThan(a.z), float(1.0), float(2.0)));
  const mi = select(a.x.lessThan(a.y).and(a.x.lessThanEqual(a.z)), float(0.0), select(a.y.lessThanEqual(a.z), float(1.0), float(2.0)));
  const me = float(3.0).sub(ma).sub(mi);
  const comp = (v, i) => select(i.lessThan(0.5), v.x, select(i.lessThan(1.5), v.y, v.z));
  const w0 = pow(saturate(vec2(comp(a, ma), comp(a, me)).sub(0.5773).div(0.4227)), vec2(4.0));
  return { ma, me, w: w0.div(w0.x.add(w0.y).add(1e-5)) };
};
const uvOf = (p, i) => select(i.lessThan(0.5), p.yz, select(i.lessThan(1.5), p.zx, p.xy));
const smp = (tex, p, i) => texture(tex, uvOf(p, i)).grad(uvOf(dFdx(p), i), uvOf(dFdy(p), i));
const tri = (tex, p, w) => smp(tex, p, w.ma).mul(w.w.x).add(smp(tex, p, w.me).mul(w.w.y));
// 凹凸の向き（物の座標の、面に沿った傾き）と高さ
const pertOf = (t, i) => select(i.lessThan(0.5), vec3(0.0, t.x, t.y), select(i.lessThan(1.5), vec3(t.y, 0.0, t.x), vec3(t.x, t.y, 0.0)));
const triN = (tex, p, w) => {
  const s0 = smp(tex, p, w.ma); const s1 = smp(tex, p, w.me);
  return {
    pert: pertOf(s0.xy.mul(2.0).sub(1.0), w.ma).mul(w.w.x).add(pertOf(s1.xy.mul(2.0).sub(1.0), w.me).mul(w.w.y)),
    h: s0.z.mul(w.w.x).add(s1.z.mul(w.w.y)),
  };
};

export function createRockShading(atlas, detail = null) {
  const TX = spaceTextures();
  const { normalTex, maskTex, radiusTex, atlasUV, W, H } = atlas;
  const radiusAt = (dir, k) => texture(radiusTex, atlasUV(dir, k)).level(0).x.add(1.0); // 地図には半径−1 が入っている

  // 自分の影：太陽の向き L（物の座標）へ、地表から少しずつ遠くを調べる。地図の半径より内側に入ったら影
  // steps・grow：質感の段で変える（近いほど細かく調べる）
  function selfShadow(P, k, L, steps = 15, grow = 1.42, n0 = null, rf = null, soft = 0.045) {
    if (!OPTS.selfShadow) return float(1.0);
    const radius = rf || ((dir) => radiusAt(dir, k));
    return Fn(() => {
      const d = normalize(P);
      const p0 = d.mul(radius(d).add(0.004));
      // 太陽に背を向けた面は光が当たらないので探らない（画素の半分ほどを省ける）
      const s = float(1.0).toVar();
      if (n0) s.assign(select(dot(n0, L).lessThan(-0.05), float(0.0), float(1.0)));
      const t = float(0.006 * (grow > 1.5 ? 1.6 : 1.0)).toVar();
      Loop(steps, () => {
        const q = p0.add(L.mul(t));
        const rq = length(q);
        If(rq.greaterThan(BOUND).or(s.lessThan(0.02)), () => { Break(); });
        const hgt = rq.sub(radius(q.div(rq)));
        // 地図の刻み（半径の誤差）の分だけ余裕を持たせる（平らな面に等高線のような影の縞が出ない）。
        // soft：影の縁のぼけ。細かい地図の岩は広めにする（細い段の縁の、画素の並びの段差が影の点線にならない）
        s.assign(min(s, saturate(hgt.add(0.0008).div(t.mul(soft)))));
        t.mulAssign(grow);
      });
      return s;
    })();
  }

  // inp: { P, st, scale, tile, kind, kindConst?, seed, quat, Vobj (物の座標の、地表からカメラへの向き), Lobj (物の座標の太陽の向き) }
  // 質感の段 tier：0＝全部（近くの細かい立体）、1＝中（粗い立体・近くの板）、2＝遠く（遠くの板。焼いた地図だけ）
  function surface(inp) {
    const { P, scale, tile, kind, seed, quat } = inp;
    const tier = inp.tier ?? 0;
    // 地図を読む向き：頂点の向きを別に補間した物があればそれを使う。押し出した位置を補間して向きに直すと、
    // 半径の違う頂点の間で向きがずれ、地図の細い線（層の縁）が三角形の大きさで波打つ
    const d = normalize(inp.D ?? P);
    const auv = atlasUV(d, tile);
    // 縮小の段（ますの余白を越えて隣が混ざらないよう 4 段まで）
    const tx = auv.mul(vec2(W, H));
    const lod = clamp(log2(max(length(dFdx(tx)), length(dFdy(tx)))), 0.0, 4.0);
    let nm = texture(normalTex, auv).level(lod);
    let rm = texture(radiusTex, auv).level(0); // 半径の地図の yzw に印（クレーターの底・割れ面・凸凹の度合い）
    // 大きく寄った岩：その岩だけの細かい形の地図を、近さ（amp）で混ぜる（遠い間は共通の地図だけ。切り替えで飛ばない）
    const D = detail && inp.detail ? inp.detail : null;
    let radiusFn = null;
    if (D) {
      const auvD = detail.atlasUV(d, D.slot);
      const txD = auvD.mul(vec2(detail.W, detail.H));
      const lodD = clamp(log2(max(length(dFdx(txD)), length(dFdy(txD)))), 0.0, 4.0);
      const nmD = texture(detail.normalTex, auvD).level(lodD);
      const rmD = texture(detail.radiusTex, auvD).level(0);
      nm = vec4(normalize(mix(nm.xyz.mul(2.0).sub(1.0), nmD.xyz.mul(2.0).sub(1.0), D.amp)).mul(0.5).add(0.5), mix(nm.w, nmD.w, D.amp));
      rm = mix(rm, rmD, D.amp);
      radiusFn = (dir) => mix(radiusAt(dir, tile), detail.radius(dir, D.slot), D.amp);
    }
    const mk = vec4(rm.w, rm.y, rm.z, 0.0);
    const n0 = normalize(nm.xyz.mul(2.0).sub(1.0));
    // 岩ごとの縦・横・奥行きの比 st：形の地図は伸ばす前の形（元の座標 P）で読み、光と質感は伸ばした後の座標で計算する。
    // 面の向きは比の逆数で伸ばす（伸ばした面の法線）。質感の画像は伸ばした後の位置で貼る（画像が引き伸ばされない）
    const st = inp.st ?? vec3(1.0);
    // 質感の画像を貼る位置：頂点の位置から、素材の高さの押し出しだけを除いた地表（Pt）。
    // 押し出しを含めると、層と平行に近い面で押し出しの高さが地層の縞の位置に入り、等高線が出る。
    // 地図の半径（向きだけで決まる位置）にすると、切り立った段の壁で画像が縦に引き伸ばされて筋になる
    const Ps = (inp.Pt ?? P).mul(st);
    const n0s = normalize(n0.div(st));
    const aoMap = nm.w;
    const convex = saturate(mk.x.sub(0.5).mul(2.4));
    const concave = saturate(float(0.5).sub(mk.x).mul(2.4));
    const crater = mk.y; const frac = mk.z;

    // 材質：kindConst（0=岩・1=氷・2=金属）が決まっている材質は、その材質の計算だけを組む（他の2つの画像を読まない）。
    // 決まっていない材質（遠くの板）は3つを組んで種類で選ぶ
    const kc = inp.kindConst;
    const has = (k) => kc === undefined || kc === k;
    const wOf = (k) => (kc === undefined ? select(k === 0 ? kind.lessThan(0.5) : k === 1 ? kind.greaterThan(0.5).and(kind.lessThan(1.5)) : kind.greaterThan(1.5), float(1.0), float(0.0)) : float(kc === k ? 1.0 : 0.0));
    const wR = wOf(0); const wI = wOf(1); const wM = wOf(2);
    const sv = hash33(vec3(seed, seed.mul(1.7), seed.mul(2.3)));

    // ---- 写真の素材（画像生成）を3方向から貼る。世界の長さで貼るので、大きい岩ほど模様が細かく多い ----
    const Pw = Ps.mul(scale).add(sv.mul(37.0));
    const fp = length(fwidth(Pw)).add(1e-5);
    const wT = triW(n0s);
    const PwL = Ps.mul(scale); // 面にまっすぐ貼る時の位置（個体のずらしは画像の位置の側で足す。3次元で足すと向きの揺れが拡大される）
    // 大きなむら：素材の画像をとても大きく貼った明るさ（3次元の雑音の画像を使わず、画像の数を16枚に収める）
    const lowA = tri(TX.basalt.n, P.mul(0.33).add(sv), wT);
    const lowN = saturate(lowA.z.mul(1.2).sub(0.1));
    const pFrac = smoothstep(0.35, 0.8, frac);
    const sAxis = normalize(sv.sub(0.5).add(vec3(0.0, 0.35, 0.0)));
    // 砂（レゴリス）が溜まる所：窪み・クレーターの底・凹んだ所。割れ面と角には付かない
    const dust0 = saturate(
      float(1.0).sub(aoMap).mul(1.7).add(crater.mul(0.55)).add(concave.mul(0.9))
        .sub(pFrac.mul(1.3)).sub(convex.mul(1.1)).add(lowN.sub(0.5).mul(0.9)).sub(0.3),
    ).mul(SPACE_U.dust).mul(mix(1.0, 0.45, wM));
    // 砂礫（岩の窪みと氷の汚れで使う）
    let reg = null;
    const regolith = () => { if (!reg) reg = { a: tri(TX.regolith.a, Pw.div(3.4), wT), n: triN(TX.regolith.n, Pw.div(3.4), wT) }; return reg; };

    let rock = null; let ice = null; let met = null;
    if (has(0)) {
      // 岩：玄武岩（地肌）＋地層（割れ面と崖）＋砂礫（窪み）を、高さで混ぜる（境目が素材の凹凸に沿う）
      const bA = tri(TX.basalt.a, Pw.div(7.0), wT);
      const bN = triN(TX.basalt.n, Pw.div(7.0), wT);
      const { a: rA, n: rN } = regolith();
      // 地層：層の縞の位置は、個体ごとに傾いた層の向き sAxis に沿った距離だけで決める（どの面でも縞がそろい、面の向きの揺れで流れない）。
      // 縞に沿った向きは、面が向いている側に合わせて2つの横の軸から選んで混ぜる（混ざっても縞に沿ってぼけるだけ）
      const sT = basisR(sAxis); const sB = cross(sAxis, sT);
      const crL = length(cross(sAxis, n0s));
      const vL = dot(PwL, sAxis).div(9.0).add(sv.x.mul(5.0));
      const ax = pow(abs(dot(n0s, sT)), 4.0); const az = pow(abs(dot(n0s, sB)), 4.0);
      const wxS = ax.div(ax.add(az).add(1e-4)); const wzS = float(1.0).sub(wxS);
      const uvX = vec2(dot(PwL, sB).div(9.0).add(sv.y.mul(5.0)), vL);
      const uvZ = vec2(dot(PwL, sT).div(9.0).add(sv.z.mul(5.0)), vL);
      const fAx = texture(TX.strata.a, uvX); const fAz = texture(TX.strata.a, uvZ);
      const fNx = texture(TX.strata.n, uvX); const fNz = texture(TX.strata.n, uvZ);
      const stMean = texture(TX.strata.a, vec2(0.5)).level(12).rgb;
      const stA = mix(stMean, fAx.rgb.mul(wxS).add(fAz.rgb.mul(wzS)), 0.6);
      const stH = fNx.z.mul(wxS).add(fNz.z.mul(wzS));
      const stP = sB.mul(fNx.x.mul(2.0).sub(1.0)).add(sAxis.mul(fNx.y.mul(2.0).sub(1.0))).mul(wxS)
        .add(sT.mul(fNz.x.mul(2.0).sub(1.0)).add(sAxis.mul(fNz.y.mul(2.0).sub(1.0))).mul(wzS));
      const sW0 = pFrac.mul(smoothstep(0.25, 0.6, crL));
      const sW = saturate(sW0.sub(0.5).mul(4.0).add(stH.sub(bN.h).mul(3.0)).add(0.5)).mul(select(sW0.greaterThan(0.02), float(1.0), float(0.0)));
      const baseH = mix(bN.h, stH, sW);
      const rW = saturate(dust0.sub(0.45).mul(3.5).add(rN.h.sub(baseH).mul(3.0)).add(0.5)).mul(select(dust0.greaterThan(0.02), float(1.0), float(0.0)));
      // 近くだけ：玄武岩の細かい段（輪郭のすぐ手前まで凹凸がつぶれない）
      const bD = tier === 0 ? triN(TX.basalt.n, Pw.div(1.7).add(13.1), wT) : null;
      const rockA = mix(mix(bA.rgb, stA, sW), rA.rgb, rW);
      const rockH = mix(baseH, rN.h, rW);
      rock = {
        P: mix(mix(bN.pert, stP, sW), rN.pert.mul(0.75), rW).add(bD ? bD.pert.mul(float(0.55).mul(float(1.0).sub(rW))) : vec3(0.0)),
        H: rockH,
        // 大きなむら（繰り返しを崩す）と、窪みの暗がり、角の明るさ
        C: rockA.mul(mix(0.78, 1.18, lowN)).mul(mix(0.55, 1.05, rockH)).mul(float(1.0).add(convex.mul(0.6))).mul(mix(0.5, 1.0, aoMap)).mul(SPACE_U.rockTint),
        R: float(0.96), M: float(0.0), spec: float(0.08), dR: float(1.0), dust: rW,
      };
    }
    if (has(1)) {
      // 氷：霜と割れた氷の写真。割れ面は透明で暗く、つやがある。窪みには砂礫の汚れ
      // 氷の写真も、灰の筋がまだらに見えないよう平均の色へ寄せる。割れ面は面の向きにまっすぐ貼る
      const { a: rA, n: rN } = regolith();
      const Ti = basisR(n0s); const Bi = cross(n0s, Ti);
      const uvI = vec2(dot(PwL, Ti), dot(PwL, Bi)).div(6.0).add(sv.yz.mul(5.0));
      const iFa = texture(TX.ice.a, uvI); const iFn = texture(TX.ice.n, uvI);
      const iT = triN(TX.ice.n, Pw.div(6.0), wT);
      const iA = mix(texture(TX.ice.a, vec2(0.5)).level(12), mix(tri(TX.ice.a, Pw.div(6.0), wT), iFa, pFrac), 0.6);
      const iP = mix(iT.pert, Ti.mul(iFn.x.mul(2.0).sub(1.0)).add(Bi.mul(iFn.y.mul(2.0).sub(1.0))), pFrac);
      const iH = mix(iT.h, iFn.z, pFrac);
      // 透明な割れ面は面ごとに決める（平らな割れ面は向きが一定なので、向きを丸めた値で面ごとにそろう。まだらにしない）
      const facetH = hash31(floor(n0.mul(2.5).add(sv.mul(5.0))));
      const clear = pFrac.mul(select(facetH.greaterThan(0.45), float(0.9), float(0.12))).mul(float(1.0).sub(smoothstep(0.6, 0.9, crater)));
      const iceDirt = saturate(dust0.sub(0.62).mul(3.0).add(rN.h.sub(iH).mul(1.5)).add(0.2)).mul(0.55).mul(float(1.0).sub(clear));
      ice = {
        C: mix(mix(iA.rgb.mul(vec3(0.54, 0.56, 0.58)), iA.rgb.mul(vec3(0.26, 0.29, 0.33)), clear), rA.rgb.mul(0.75), iceDirt),
        R: mix(mix(0.62, 0.3, clear), 0.95, iceDirt), M: float(0.0),
        P: mix(iP.mul(mix(1.0, 0.25, clear)), rN.pert, iceDirt), H: iH,
        spec: mix(0.35, 1.0, clear), dR: float(0.45), dust: iceDirt, clear,
      };
    }
    if (has(2)) {
      // 金属：鉄隕石の地肌の写真（窪み・錆）。割れ面だけ鈍い鋼の金属
      const mA = tri(TX.iron.a, Pw.div(4.0), wT);
      const mN = triN(TX.iron.n, Pw.div(4.0), wT);
      const polish = saturate(pFrac.add(convex.mul(0.3)).sub(dust0));
      // 割れ面の鉄の地肌：写真の明暗だけを残した鈍い鋼の灰（模様は描き足さない。磨いて酸で出す結晶の筋は、宇宙の生の塊には出ない）
      const steel = vec3(dot(mA.rgb, vec3(0.3, 0.59, 0.11))).mul(0.55).add(0.28);
      met = {
        C: mix(mA.rgb.mul(mix(0.85, 1.15, lowN)), steel.mul(vec3(1.0, 0.99, 0.97)), polish),
        R: mix(mix(0.78, 0.66, mN.h), mix(0.38, 0.55, mN.h), polish), M: mix(0.5, 1.0, polish),
        P: mN.pert.mul(float(1.0).sub(polish.mul(0.8))), H: mN.h, spec: float(0.3), dR: float(0.6), dust: float(0.0),
      };
    }
    // 種類で選ぶ（決まった材質は1つだけをそのまま使う）
    const mats = [[rock, wR], [ice, wI], [met, wM]].filter(([m]) => m);
    const sel = (f) => (mats.length === 1 ? f(mats[0][0]) : mats.reduce((acc, [m, w]) => acc.add(f(m).mul(w)), f(mats[0][0]).mul(0.0)));
    const clear = ice ? ice.clear.mul(wI) : float(0.0);
    const iceDirt = ice ? ice.dust.mul(wI) : float(0.0);

    // 法線：焼いた地図の向きに、素材の凹凸を足す
    const pert = sel((m) => m.P).mul(SPACE_U.detail);
    const pertT = pert.sub(n0s.mul(dot(pert, n0s)));
    const nObj = normalize(n0s.add(pertT));
    const Hsurf = sel((m) => m.H);
    const dustMask = sel((m) => m.dust);

    const color = sel((m) => m.C).mul(SPACE_U.albedo);
    // 遠く・小さく見える物ほどつやを落とす（細かい面の向きが1画素に混ざるので。照り返しが白い光の玉にならない）
    const roughMin = saturate(fp.div(scale).mul(30.0)).max(tier === 2 ? 0.42 : tier === 1 ? 0.2 : 0.0);
    const rough = max(sel((m) => m.R), roughMin);
    const metal = sel((m) => m.M);
    // 照り返しの強さ（誘電体の分）：岩は粉と穴の多い地表なのでほぼ無し。氷は霜で弱く、透明な割れ面だけ普通
    const spec = sel((m) => m.spec);
    // 拡散の荒さ：岩は最大（縁まで暗くならない、粉の地表の見え方）。氷と金属は中くらい
    const dRough = sel((m) => m.dR);
    const ao = saturate(aoMap.mul(mix(0.6, 1.05, Hsurf)));

    // ---- 光に頼らない分（きらめき・氷の透け・縁の光）----
    const nW = qrot(quat, nObj);
    const nView = normalize(cameraViewMatrix.mul(vec4(nW, 0.0)).xyz);
    const L = inp.Lobj; const V = inp.Vobj;
    // 自分の影は元の座標で探る（伸ばした座標の光の向きを、比の逆数で元の座標へ戻す）
    const Lb = normalize(L.div(st));
    const sh = mix(float(1.0), tier === 0 ? selfShadow(P, tile, Lb, D ? 14 : 10, D ? 1.45 : 1.55, n0, radiusFn, D ? 0.09 : 0.045) : tier === 1 ? selfShadow(P, tile, Lb, 9, 1.65, n0) : selfShadow(P, tile, Lb, 6, 2.1, n0), SPACE_U.selfShadow);
    const ndl = saturate(dot(nObj, L));
    const sunI = SPACE_U.sunColor.mul(SPACE_U.sunPower);
    // 鉱物・氷の粒のきらめき：粒ごとに向きの違う小さな面が、太陽を目へ返した時だけ光る（控えめ）
    const useGlint = tier < 2 && (has(1) || has(2));
    const gc = floor(Pw.mul(7.0));
    const gh = hash33(gc);
    const nf = normalize(nObj.add(gh.sub(0.5).mul(1.4)));
    const glint = pow(saturate(dot(reflect(L.negate(), nf), V)), 260.0)
      .mul(select(gh.x.greaterThan(mix(0.985, 0.95, wI)), float(1.0), float(0.0)))
      .mul(saturate(float(1.0).sub(fp.mul(7.0).sub(0.4))))
      .mul(float(1.0).sub(dustMask)).mul(wI.mul(1.0).add(wM.mul(0.35)));
    const emiGlint = !useGlint ? vec3(0.0) : sunI.mul(glint).mul(sh).mul(select(ndl.greaterThan(0.0), float(1.0), float(0.0))).mul(SPACE_U.sparkle).mul(0.25);
    let iceGlow = vec3(0.0);
    if (has(1)) {
      // 氷：中のひびと泡が奥にあるように見える（見る向きでずれる）。薄い縁だけがわずかに冷たく透ける
      const Vr = normalize(mix(V, nObj, 0.45));
      const Pin1 = Ps.sub(Vr.mul(0.035)).mul(scale);
      const Pin2 = Ps.sub(Vr.mul(0.09)).mul(scale);
      const crackPlane = (Pin, n, f, off) => {
        const w = abs(fract(dot(Pin, normalize(n)).mul(f).add(off).add(lowN.mul(0.35))).sub(0.5));
        return float(1.0).sub(smoothstep(0.0, 0.012, w)).mul(smoothstep(0.4, 0.6, texture(TX.ice.n, Pin.xz.mul(0.07).add(off)).z));
      };
      const cr1 = tier === 2 ? float(0.0) : max(crackPlane(Pin1, sv.sub(0.5).add(vec3(0.3, 0.8, 0.1)), 0.21, 0.13), crackPlane(Pin1, sv.zxy.sub(0.5).add(vec3(0.9, -0.2, 0.4)), 0.17, 0.57));
      const cr2 = tier === 2 ? float(0.0) : crackPlane(Pin2, sv.yzx.sub(0.5).add(vec3(-0.4, 0.3, 0.9)), 0.13, 0.31);
      const bub = tier === 2 ? float(0.0) : smoothstep(0.994, 0.999, hash31(floor(Pin2.mul(4.0))));
      const back = pow(saturate(dot(V, L.negate())), 3.0);
      const thin = saturate(convex.mul(0.8).add(clear.mul(0.6)));
      const wrap = saturate(dot(nObj, L).add(0.7).div(1.7));
      iceGlow = vec3(0.45, 0.62, 0.8).mul(sunI).mul(back.mul(thin).mul(0.18).add(thin.mul(wrap).mul(0.012)))
        .add(vec3(0.8, 0.86, 0.92).mul(sunI).mul(cr1.mul(0.05).add(cr2.mul(0.035)).add(bub.mul(0.06)).mul(clear).mul(wrap.mul(0.7).add(0.3))))
        .mul(sh.mul(0.6).add(0.4)).mul(float(1.0).sub(iceDirt));
    }
    // 撃たれた所と砕けた破片の熱：割れ目（低い所）だけが細く赤熱し、熱（0〜1）で白黄→橙→暗い赤へ冷える。
    // 面全体を光らせない（光の玉にしない）。明るさに上限をつける
    let heatEmi = vec3(0.0);
    if (inp.fx) {
      const fx = inp.fx;
      const hl = length(fx.xyz);
      const hdir = fx.xyz.div(max(hl, 1e-4));
      const spot = select(hl.greaterThan(0.5), float(1.0).sub(smoothstep(0.03, 0.32, length(normalize(Ps).sub(hdir)))), pFrac.mul(0.85).add(convex.mul(0.35)).add(0.05));
      const g = saturate(fx.w.mul(spot));
      const cracks = float(1.0).sub(smoothstep(0.08, 0.3, Hsurf.add(float(1.0).sub(g).mul(0.25))));
      const bb = mix(mix(vec3(0.45, 0.03, 0.006), vec3(1.0, 0.28, 0.04), smoothstep(0.2, 0.6, g)), vec3(1.0, 0.75, 0.4), smoothstep(0.7, 0.98, g));
      heatEmi = bb.mul(cracks.mul(g).mul(5.0).add(g.mul(g).mul(0.08))).mul(SPACE_U.heat);
    }
    const emi = emiGlint.add(iceGlow.mul(wI)).add(heatEmi);

    // 確認用の白黒表示は掛け算で混ぜる（select にすると条件分岐の中で色の計算が組まれ、他の欄が同じ計算をやり直す）
    const dv = SPACE_U.debugView;
    const dvOn = select(dv.greaterThan(0.5), float(1.0), float(0.0));
    const dvCol = select(dv.lessThan(1.5), color, select(dv.lessThan(2.5), n0s.mul(0.5).add(0.5), select(dv.lessThan(3.5), nObj.mul(0.5).add(0.5), select(dv.lessThan(4.5), vec3(aoMap), vec3(crater, frac, mk.x)))));
    const dbg = max(SPACE_U.debugSS, dvOn);
    const emiD = mix(mix(emi, vec3(sh).mul(0.6), SPACE_U.debugSS), dvCol.mul(0.5), dvOn);
    return { color: color.mul(float(1.0).sub(dbg)), rough, metal, spec, dRough, ao, nView, emi: emiD, selfShadow: sh };
  }

  // 材質を組む。geomNodes() は { P, scale, tile, kind, seed, quat } を返す（頂点の値の varying を作る）
  // shadowMap=false：場面の影の地図を読まない（遠くの板）。自分の影は色へ畳み込む
  function applyTo(mat, inp, { haze = true, shadowMap = true } = {}) {
    const s = surface(inp);
    mat.colorNode = shadowMap ? s.color : s.color.mul(s.selfShadow.mul(0.75).add(0.25));
    mat.roughnessNode = s.rough;
    mat.metalnessNode = s.metal;
    if (mat.isMeshPhysicalNodeMaterial) { mat.specularIntensityNode = s.spec; if (OPTS.roughDiffuse) mat.diffuseRoughnessNode = s.dRough; }
    mat.normalNode = s.nView;
    // 自分の影の中は、周りから回る光も一部さえぎられる（宇宙の陰は深い）
    mat.aoNode = s.ao.mul(s.selfShadow.mul(0.5).add(0.5)).mul(0.85);
    mat.emissiveNode = s.emi;
    // 場面の影（太陽の影の地図）に、自分の影を掛ける
    if (shadowMap) mat.receivedShadowNode = Fn(([shadow]) => shadow.mul(s.selfShadow));
    if (haze) {
      // 遠い物ほど宙の霞へ溶ける（小惑星帯の塵の層）
      mat.outputNode = Fn(() => {
        const dist = length(positionView);
        const k = smoothstep(SPACE_U.hazeNear, SPACE_U.hazeFar, dist).mul(SPACE_U.hazeMax);
        return vec4(mix(output.rgb, SPACE_U.haze, k), output.a);
      })();
    }
    return s;
  }

  // 近くの立体の頂点を、細かいクレーターと小石の分だけ本当に押し出す（世界の長さの高さを返す）。
  // 質感の式と同じ雑音・同じ段なので、陰影と形が合う。distW はカメラまでの距離（遠いほど省く）
  function microDisp(P, scale, seed, kind, distW, pxPerUnitAt1, st = vec3(1.0)) {
    // 玄武岩の素材の高さを、近い時だけ本当に押し出す（輪郭に割れ目と欠けが出る）。質感と同じ、伸ばした後の位置で読む
    const sv = hash33(vec3(seed, seed.mul(1.7), seed.mul(2.3)));
    const Pw = P.mul(st).mul(scale).add(sv.mul(37.0));
    const w = pow(abs(normalize(P)), vec3(6.0)); const wn = w.div(w.x.add(w.y).add(w.z));
    const q = Pw.div(7.0);
    const h = texture(TX.basalt.n, q.yz).level(0).z.mul(wn.x).add(texture(TX.basalt.n, q.zx).level(0).z.mul(wn.y)).add(texture(TX.basalt.n, q.xy).level(0).z.mul(wn.z));
    const fpv = distW.div(pxPerUnitAt1);
    const near = saturate(float(1.0).sub(fpv.mul(30.0).sub(0.3)));
    const wI = select(kind.greaterThan(0.5).and(kind.lessThan(1.5)), float(0.4), float(1.0));
    return h.sub(0.5).mul(0.45).mul(near).mul(wI).mul(SPACE_U.detail);
  }

  return { surface, applyTo, selfShadow, radiusAt, microDisp };
}

// 物の座標の、カメラへの向きと太陽の向き（頂点で一度だけ求めて渡すと安い）
export function objectDirs(quat, worldPos) {
  const Vobj = normalize(qrotInv(quat, cameraPosition.sub(worldPos)));
  const Lobj = normalize(qrotInv(quat, SPACE_U.sunDir));
  return { Vobj, Lobj };
}
export { positionWorld };
