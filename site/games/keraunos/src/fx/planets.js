import * as THREE from 'three';
import {
  Fn, uniform, texture, texture3D, vec2, vec3, vec4, float, positionGeometry, positionWorld, cameraPosition, cameraViewMatrix,
  cameraProjectionMatrix, cameraWorldMatrix, modelWorldMatrix, modelPosition, modelScale, varying, atan, asin, clamp, fract, abs,
  dFdx, dFdy, fwidth, select, length, sqrt, max, min, dot, exp, pow, mix, smoothstep, normalize, cross, sin, Loop, If, Discard,
} from 'three/tsl';
import { noise3D, queueTexture } from './skyNoise.js';
import { nodeUniforms, smoothstepR } from './soft.js';

// 惑星と恒星。球の網は使わず、板に「視線と球の交点」を計算して描く（輪郭がどこまでも滑らかで、三角形は2枚で済む）。
// 大気は視線に沿って数点を足し合わせる（縁の青・明暗境界の赤・夜側へ回り込む光が一つの計算から出る）。
// 地表の画像（assets/sky/planets）は NASA のデータを元にした Solar System Scope のもの。動きは実行時に足す。

const PI = 3.14159265;
const n3 = (N, p) => texture3D(N, p);
// 経度・緯度（0..1）
const lonLat = (p) => vec2(atan(p.z, p.x).div(2.0 * PI).add(0.5), asin(clamp(p.y, -1.0, 1.0)).div(PI).add(0.5));
// 経度の継ぎ目で縮小の段が飛ばないよう、傾きは継ぎ目のない方の座標から取る
function sampleEq(tex, uvIn) {
  const uv = vec2(uvIn).toVar();
  const uvB = vec2(fract(uv.x.add(0.5)).sub(0.5), uv.y);
  const dx = dFdx(uv); const dy = dFdy(uv); const dxB = dFdx(uvB); const dyB = dFdy(uvB);
  const useB = abs(dxB.x).add(abs(dyB.x)).lessThan(abs(dx.x).add(abs(dy.x)));
  return tex.sample(uv).grad(vec2(select(useB, dxB.x, dx.x), dx.y), vec2(select(useB, dyB.x, dy.x), dy.y));
}

// 板の頂点：球が画面で占める範囲を覆う大きさ（視線から外れた所は楕円になるので少し余らせる）
function planetVertex(U) {
  const right = cameraWorldMatrix.element(0).xyz;
  const up = cameraWorldMatrix.element(1).xyz;
  const d = length(U.uC.sub(cameraPosition));
  const ro = U.uR.mul(U.uOut);
  const k = ro.mul(d).div(sqrt(max(d.mul(d).sub(ro.mul(ro)), 1.0))).mul(1.3);
  const w = U.uC.add(right.mul(positionGeometry.x).add(up.mul(positionGeometry.y)).mul(k));
  return { vertexNode: cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(w, 1.0))), vW: varying(w, 'vW') };
}

// 視線と大気：足した光の色と、手前の透け具合（a）を返す。tEnd は地表までの距離。
// 大気に当たらない視線は区間の長さが 0 になり、光 0・透け具合 1 になる
function atmosphere(U, oc, rd, tEnd) {
  const ra = U.uAtmH.mul(3.0).add(1.0);
  const b = dot(oc, rd);
  const h = b.mul(b).sub(dot(oc, oc).sub(ra.mul(ra)));
  const s = sqrt(max(h, 0.0));
  const t0 = max(0.0, b.negate().sub(s));
  const t1 = min(b.negate().add(s), tEnd);
  const dt = select(h.greaterThan(0.0), max(t1.sub(t0), 0.0).div(6.0), 0.0).toVar();
  const sum = vec3(0.0).toVar();
  const od = float(0.0).toVar();
  Loop(6, ({ i }) => {
    const p = oc.add(rd.mul(t0.add(dt.mul(float(i).add(0.5)))));
    const r = length(p);
    const dens = exp(r.sub(1.0).negate().div(U.uAtmH));
    const nl = dot(p.div(r), U.uSun);
    // 日の当たる高さ：夜側へ少し回り込み、境目は太陽の光が大気を長く通って赤くなる
    const day = smoothstep(-0.20, 0.16, nl);
    const c = mix(U.uTerm, U.uAtm, smoothstep(-0.02, 0.34, nl));
    sum.addAssign(c.mul(dens.mul(day).mul(exp(od.mul(-6.0))).mul(dt)));
    od.addAssign(dens.mul(dt));
  });
  const mu = dot(rd, U.uSun);
  const phase = mu.mul(mu).add(1.0).mul(0.75).add(pow(max(mu, 0.0), 10.0).mul(0.45));
  return vec4(sum.mul(phase).mul(U.uAtmK), exp(od.mul(-3.0).mul(U.uAtmK)));
}

// 地球：深い藍の海、風で流れて渦を巻く雲、雲の影、海の照り返し、夜の街の灯り
function earthSurface(U, N, p, rd) {
  const t = U.uTime;
  const nl = dot(N, U.uSun);
  const ll = lonLat(p);
  const uv = vec2(fract(ll.x.add(U.uLon0).add(t.mul(U.uSpin))), ll.y).toVar();
  const day = sampleEq(U.uDay, uv).rgb;
  const ocean = smoothstep(0.03, 0.12, day.b.sub(day.r));
  // 平たい海の色を、深い藍へ置き換える
  const swell = n3(U.uN, p.mul(3.1)).r;
  const sea = mix(vec3(0.004, 0.018, 0.055), vec3(0.008, 0.040, 0.095), swell);
  const ground = mix(pow(day, vec3(1.25)).mul(0.85), sea, ocean);
  // 雲：風で流し、渦を巻かせる。2つの位相を重ねて伸びきらないようにする
  const wp = p.mul(2.2).add(vec3(0.0, 0.0, t.mul(0.01)));
  const flow = n3(U.uN, wp).rg.sub(0.5).mul(0.026);
  const ph = fract(t.mul(0.035)); const ph2 = fract(ph.add(0.5)); const wa = float(1.0).sub(abs(ph.mul(2.0).sub(1.0)));
  const cu = vec2(uv.x.add(t.mul(0.0016)), uv.y);
  const c0 = sampleEq(U.uCloud, cu.add(flow.mul(ph.sub(0.5).mul(2.0)))).r;
  const c1 = sampleEq(U.uCloud, cu.add(flow.mul(ph2.sub(0.5).mul(2.0)))).r;
  const cl = mix(c1, c0, wa);
  // 地表へ落ちる雲の影：太陽の向きへ少しずらして読む
  const ps = normalize(p.add(U.uRot.mul(U.uSun).mul(0.012)));
  const sl = lonLat(ps);
  const su = vec2(fract(sl.x.add(U.uLon0).add(t.mul(U.uSpin)).add(t.mul(0.0016))), sl.y);
  const shadow = U.uCloud.sample(su).level(3.0).r;
  const lit = smoothstep(-0.06, 0.20, nl).mul(pow(max(nl, 0.0).mul(0.94).add(0.06), 0.75));
  // 雲の盛り上がり：太陽の側が明るく、反対が暗い（雲の影の読みを流用して軽く）
  const ct0 = cl.sub(shadow);
  const sunTint = mix(vec3(1.0, 0.45, 0.22), vec3(1.0, 0.98, 0.94), smoothstep(0.0, 0.32, nl));
  const col = ground.mul(float(1.0).sub(shadow.mul(0.62))).mul(lit).mul(sunTint).mul(1.25).toVar();
  // 海の太陽の照り返し
  const H = normalize(U.uSun.sub(rd));
  const nh = max(dot(N, H), 0.0);
  col.addAssign(vec3(1.0, 0.86, 0.66).mul(ocean.mul(cl.oneMinus())).mul(pow(nh, 400.0).mul(0.9).add(pow(nh, 60.0).mul(0.07))).mul(smoothstep(0.0, 0.2, nl)));
  // 雲の明るさ：厚い所ほど白く、夜との境は赤い
  const clk = smoothstep(0.08, 0.86, cl);
  col.assign(mix(col, vec3(0.92, 0.95, 1.0).mul(lit).mul(sunTint).mul(0.95).mul(clamp(ct0.mul(1.6).add(1.0), 0.62, 1.25)), clk));
  // 夜の灯り：雲に遮られ、街ごとにごくわずかに瞬く
  const lights = pow(sampleEq(U.uNight, uv).rgb, vec3(1.7));
  const tw = sin(t.mul(2.3).add(uv.x.mul(900.0)).add(uv.y.mul(700.0))).mul(0.12).add(0.88);
  col.addAssign(lights.mul(vec3(2.4, 1.55, 0.8)).mul(3.6).mul(tw).mul(smoothstepR(0.10, -0.12, nl)).mul(clk.mul(-0.8).add(1.0)));
  return col;
}

// 帯の惑星：緯度ごとに違う速さで流し、雑音で帯の縁を歪ませて渦を立てる
function gasSurface(U, N, p, rd) {
  const t = U.uTime;
  const nl = dot(N, U.uSun);
  const uv = lonLat(p).toVar();
  const lat = uv.y;
  const wind = sin(lat.mul(41.0)).mul(0.5).add(sin(lat.mul(17.0).add(1.0)).mul(0.5));
  const wq = vec3(p.x.mul(2.0), p.y.mul(7.0), p.z.mul(2.0));
  const flow = n3(U.uN, wq.add(vec3(t.mul(0.012), 0.0, 0.0))).rg.sub(0.5);
  const ph = fract(t.mul(0.03)); const ph2 = fract(ph.add(0.5)); const wa = float(1.0).sub(abs(ph.mul(2.0).sub(1.0)));
  const d = vec2(flow.x.mul(0.045).add(wind.mul(0.016)), flow.y.mul(0.0075));
  const ub = vec2(fract(uv.x.add(U.uLon0).add(t.mul(U.uSpin))), uv.y);
  const u0 = ub.add(d.mul(ph.sub(0.5).mul(2.0)));
  const u1 = ub.add(d.mul(ph2.sub(0.5).mul(2.0)));
  const c = mix(sampleEq(U.uMap, u1).rgb, sampleEq(U.uMap, u0).rgb, wa).toVar();
  // 細かな筋を足す
  const fine = n3(U.uN, vec3(p.x.mul(6.0), p.y.mul(26.0), p.z.mul(6.0)).add(vec3(t.mul(0.006).mul(wind), 0.0, 0.0))).b;
  c.mulAssign(fine.mul(0.28).add(0.86));
  c.assign(pow(max(c, 0.0), vec3(1.35)).mul(U.uTint));
  const lit0 = smoothstep(-0.08, 0.42, nl);
  const lit = lit0.mul(lit0).mul(float(3.0).sub(lit0.mul(2.0))).mul(0.3).add(lit0.mul(0.7));
  const limb = mix(0.40, 1.0, pow(max(0.0, dot(N, rd.negate())), 0.6));
  const sunset = mix(U.uTerm, vec3(1.0), smoothstep(0.0, 0.40, nl));
  // 輪の影：太陽の向きへ伸ばした線が輪の面を横切る所の濃さ
  const dn = dot(U.uSun, U.uRingN);
  const okDn = abs(dn).greaterThan(1e-3);
  const tr = dot(N, U.uRingN).negate().div(select(okDn, dn, 1.0));
  const rr = length(N.add(U.uSun.mul(tr)));
  const ring = U.uRingTex.sample(vec2(rr.sub(1.20).div(1.14), 0.5)).bias(4.0).r;
  const rs = select(U.uRing.greaterThan(0.5).and(okDn).and(tr.greaterThan(0.0)), float(1.0).sub(ring.mul(0.72)), 1.0);
  return c.mul(1.25).mul(lit).mul(limb).mul(rs).mul(sunset);
}

// 岩の惑星：地図の陰影から凹凸を起こす。uLava>0 なら裂け目が夜側で赤く光る（死にかけた惑星）
function rockSurface(U, N, p, rd) {
  const t = U.uTime;
  const ll = lonLat(p);
  const uv = vec2(fract(ll.x.add(U.uLon0).add(t.mul(U.uSpin))), ll.y).toVar();
  const alb = sampleEq(U.uMap, uv).rgb;
  // 面の傾きを画像の明暗の差から作り、光を乱す
  const gy = vec2(0.0, fwidth(uv.y).mul(2.0).add(0.0008)).toVar();
  const gx = gy.yx.mul(2.0);
  const rockH = (q) => dot(U.uMap.sample(q).grad(gx, gy).rgb, vec3(0.33));
  const h0 = rockH(uv);
  const hx = rockH(uv.add(gx)).sub(h0);
  const hy = rockH(uv.add(gy)).sub(h0);
  const bk = U.uBump.mul(0.0016).div(max(gy.y, 0.0016));
  const east = normalize(cross(vec3(0.0, 1.0, 0.0), N).add(vec3(1e-4)));
  const north = cross(N, east);
  const Nb = normalize(N.sub(east.mul(hx).add(north.mul(hy)).mul(bk)));
  const nl = dot(Nb, U.uSun);
  // 大気のない星の明暗境界は硬く、日の当たる所は影が長い
  const lit = smoothstep(-0.01, 0.10, dot(N, U.uSun)).mul(pow(max(nl, 0.0), 0.85));
  const col = pow(max(alb, 0.0), vec3(1.15)).mul(U.uTint).mul(lit).mul(1.5).toVar();
  If(U.uLava.greaterThan(0.0), () => {
    // 裂け目：稜線の雑音を細く削り、脈打たせる
    const nA = n3(U.uN, p.mul(1.3).add(vec3(0.0, 0.0, t.mul(0.0015)))).toVar();
    const nB = n3(U.uN, p.mul(3.9).add(nA.rgb.mul(0.12)));
    const ridge = float(1.0).sub(abs(nB.g.mul(2.0).sub(1.0)));
    const crack = smoothstep(0.945, 0.998, ridge).mul(smoothstep(0.50, 0.72, nA.r));
    const pool = smoothstep(0.70, 0.86, nA.a).mul(smoothstep(0.4, 0.7, nB.b));
    const beat = sin(t.mul(0.7).add(nA.b.mul(30.0))).mul(0.28).add(0.72);
    const night = smoothstepR(0.30, -0.15, dot(N, U.uSun));
    const hot = mix(vec3(1.5, 0.22, 0.03), vec3(3.2, 1.25, 0.3), crack.mul(pool));
    col.addAssign(hot.mul(crack.mul(0.8).add(pool.mul(0.35))).mul(beat).mul(night.mul(0.75).add(0.25)).mul(U.uLava));
    // 地表を焼け焦がす
    col.mulAssign(float(1.0).sub(smoothstep(0.4, 0.8, nA.g).mul(0.45)));
  });
  return col;
}

// 共通の入口：交点を計算して surface(...) を呼び、大気を重ねる
function planetFragment(U, vW, surface) {
  return Fn(() => {
    const rd = normalize(vW.sub(cameraPosition)).toVar();
    const oc = cameraPosition.sub(U.uC).div(U.uR).toVar();
    const b = dot(oc, rd);
    const h = b.mul(b).sub(dot(oc, oc).sub(1.0)).toVar();
    const aa = max(fwidth(h), 1e-5);
    const cover = smoothstep(0.0, aa.mul(1.5), h);
    const tS = float(1e9).toVar();
    const col = vec3(0.0).toVar();
    If(h.greaterThan(0.0), () => {
      tS.assign(b.negate().sub(sqrt(h)));
      const N = normalize(oc.add(rd.mul(tS))).toVar();
      col.assign(surface(U, N, U.uRot.mul(N), rd));
    });
    const at = atmosphere(U, oc, rd, tS);
    const c = col.mul(mix(1.0, at.a, cover)).mul(cover).add(at.rgb);
    return vec4(c.mul(U.uFade), cover.mul(U.uFade));
  })();
}

// 恒星：粒が湧いては沈み、大きな流れが表面を運ぶ。縁は暗く、外へ紅炎とコロナが立つ
function starSurface(U, N, p, rd) {
  const t = U.uTime;
  const granule = (q) => {
    const w = n3(U.uN, q.mul(0.5).add(vec3(t.mul(0.012), t.mul(-0.008), t.mul(0.010)))).rgb.sub(0.5).mul(0.7).toVar();
    const a = n3(U.uN, q.mul(1.3).add(w).add(vec3(0.0, 0.0, t.mul(0.024)))).a;
    const b = n3(U.uN, q.mul(3.4).add(w.mul(1.6)).sub(vec3(t.mul(0.05), 0.0, 0.0))).a;
    return a.mul(0.62).add(b.mul(0.38));
  };
  const mu = max(0.0, dot(N, rd.negate()));
  const g = granule(p.mul(1.1));
  const big = n3(U.uN, p.mul(0.45).add(vec3(0.0, t.mul(0.004), 0.0))).r.toVar();
  const spot = smoothstep(0.70, 0.84, big);
  const v = smoothstep(0.30, 0.86, g).mul(float(1.0).sub(spot.mul(0.86))).toVar();
  const col = mix(vec3(0.42, 0.030, 0.006), vec3(2.3, 0.72, 0.13), v).toVar();
  col.addAssign(vec3(3.5, 1.6, 0.42).mul(pow(v, 5.0)).mul(0.6));
  // 明るい筋（磁気の活動域）がゆっくり脈打つ
  const fac = pow(float(1.0).sub(abs(n3(U.uN, p.mul(2.0).add(vec3(t.mul(0.01), 0.0, 0.0))).b.mul(2.0).sub(1.0))), 8.0).mul(smoothstep(0.45, 0.65, big));
  col.addAssign(vec3(3.0, 1.15, 0.25).mul(fac).mul(sin(t.mul(0.6).add(big.mul(40.0))).mul(0.5).add(0.5)));
  // 周縁減光
  col.mulAssign(mix(0.30, 1.0, pow(mu, 0.55)));
  return col.mul(U.uTint);
}
function starFragment(U, vW) {
  return Fn(() => {
    const t = U.uTime;
    const rd = normalize(vW.sub(cameraPosition)).toVar();
    const oc = cameraPosition.sub(U.uC).div(U.uR).toVar();
    const b = dot(oc, rd).toVar();
    const r2 = dot(oc, oc).sub(b.mul(b));
    const r = sqrt(max(r2, 0.0));
    const h = float(1.0).sub(r2).toVar();
    const aa = max(fwidth(h), 1e-5);
    const cover = smoothstep(0.0, aa.mul(1.5), h).toVar();
    const col = vec3(0.0).toVar();
    If(h.greaterThan(0.0), () => {
      const N = normalize(oc.add(rd.mul(b.negate().sub(sqrt(h))))).toVar();
      col.assign(starSurface(U, N, U.uRot.mul(N), rd));
    });
    // 円盤の外：視線がいちばん近づく点の向きと高さで、炎の模様を読む
    const cp = normalize(oc.add(rd.mul(b.negate())));
    const alt = max(r.sub(1.0), 0.0).toVar();
    const q = U.uRot.mul(cp).toVar();
    const c0 = n3(U.uN, q.mul(1.25).add(vec3(0.0, t.mul(0.012), t.mul(0.008)))).toVar();
    const c1 = n3(U.uN, q.mul(3.3).add(vec3(alt.mul(1.9).sub(t.mul(0.03)), 0.0, t.mul(0.014))).add(c0.rgb.mul(0.3)));
    const streak = c1.r.mul(c0.g).mul(0.9).add(0.55);
    const corona = exp(alt.mul(-5.2)).mul(streak).mul(0.95).add(exp(alt.mul(-1.8)).mul(0.13));
    // 紅炎：縁から立ち上がる細い弧。下から順に現れて、上でちぎれる
    const loopN = float(1.0).sub(abs(n3(U.uN, q.mul(2.1).add(vec3(alt.mul(3.2).sub(t.mul(0.022)), 0.0, 0.0)).add(c0.rgb.mul(0.4))).g.mul(2.0).sub(1.0)));
    const prom = smoothstep(0.86, 0.985, loopN).mul(exp(alt.mul(-13.0))).mul(smoothstep(0.42, 0.66, c0.b));
    const glow = vec3(1.9, 0.46, 0.08).mul(corona).add(vec3(4.2, 1.15, 0.2).mul(prom)).toVar();
    const outer = smoothstepR(U.uOut.sub(1.0), U.uOut.sub(1.0).mul(0.45), alt);
    const c = col.mul(cover).add(glow.mul(cover.oneMinus()).mul(outer)).add(glow.mul(0.18).mul(cover));
    return vec4(c.mul(U.uFade), cover.mul(U.uFade));
  })();
}

// 輪：内側ほど速く回る濃さのむら、惑星の影、太陽へ向かって見たときの透け
function ringFragment(U) {
  const vPos = varying(positionGeometry.xy, 'vRingPos');
  // 世界の座標での向き。輪は四角1枚なので、頂点で正規化せず（角の向きを混ぜると狂う）、画素ごとに正規化する
  const vDir = varying(modelWorldMatrix.mul(vec4(positionGeometry.xy, 0.0, 0.0)).xyz, 'vRingDir');
  return Fn(() => {
    const r = length(vPos).toVar();
    // 輪は内側ほど速く回る。濃さのむらだけをずらして、ゆっくりした動きを見せる
    const rt = U.uRingTex.sample(vec2(r.sub(1.20).div(1.14), 0.5)).rg.toVar();
    const d = rt.r;
    If(d.lessThan(0.004), () => { Discard(); });
    const ang = atan(vPos.y, vPos.x).add(U.uTime.mul(0.05).div(r.mul(r)));
    const clump = sin(ang.mul(23.0).add(r.mul(40.0))).mul(sin(ang.mul(7.0).sub(r.mul(19.0)))).mul(0.10).add(0.90).toVar();
    // 惑星の向こう側（球に隠れる所）は描かない
    const toP = positionWorld.sub(cameraPosition);
    const dist = length(toP);
    const rd = toP.div(dist).toVar();
    const oc = cameraPosition.sub(modelPosition);
    const b = dot(oc, rd);
    const h = b.mul(b).sub(dot(oc, oc).sub(modelScale.x.mul(modelScale.x)));
    const t0 = b.negate().sub(sqrt(max(h, 0.0)));
    If(h.greaterThan(0.0).and(t0.greaterThan(0.0)).and(t0.lessThan(dist)), () => { Discard(); });
    const wr = normalize(vDir).mul(r);
    const along = dot(wr, U.uSun);
    const perp = wr.sub(U.uSun.mul(along));
    const shadow = select(along.lessThan(0.0), smoothstep(0.97, 1.03, length(perp)), 1.0);
    const c = mix(vec3(0.34, 0.27, 0.20), vec3(0.86, 0.76, 0.60), rt.g.mul(0.5).add(d.mul(0.5))).mul(clump).toVar();
    // 太陽へ向かって見ると、薄い所ほど光を通して明るい
    const mu = max(dot(rd, U.uSun), 0.0);
    c.mulAssign(pow(mu, 6.0).mul(1.6).mul(d.oneMinus()).add(1.0));
    c.mulAssign(shadow.mul(0.988).add(0.012).mul(0.72));
    const a = clamp(d.mul(0.92).mul(clump), 0.0, 0.92);
    return vec4(c, a.mul(U.uFade));
  })();
}

function ringTexture() {
  const W = 4096;
  const data = new Uint8Array(W * 4);
  let seed = 7713;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const layer = (n) => { const a = new Float32Array(n + 1); for (let i = 0; i <= n; i++) a[i] = rnd(); return (u) => { const x = u * n; const i = Math.floor(x); let f = x - i; f = f * f * (3 - 2 * f); return a[i] + (a[Math.min(n, i + 1)] - a[i]) * f; }; };
  const n1 = layer(24); const n2 = layer(90); const n3 = layer(340); const n4 = layer(1300);
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < W; i++) {
    const u = i / (W - 1);
    const r = 1.20 + u * 1.14;
    let d = 0;
    d += ss(1.235, 1.27, r) * (1 - ss(1.50, 1.525, r)) * (0.10 + 0.10 * ss(1.3, 1.5, r));
    d += ss(1.52, 1.545, r) * (1 - ss(1.935, 1.95, r)) * 0.84;
    d += ss(1.955, 2.03, r) * (1 - ss(2.03, 2.035, r)) * 0.05;
    d += ss(2.03, 2.045, r) * (1 - ss(2.262, 2.27, r)) * 0.48;
    d *= 1 - (ss(2.205, 2.209, r) - ss(2.216, 2.22, r)) * 0.92;
    d += ss(2.316, 2.32, r) * (1 - ss(2.325, 2.33, r)) * 0.16;
    const fine = n1(u) * 0.3 + n2(u) * 0.3 + n3(u) * 0.25 + n4(u) * 0.15;
    d *= 0.42 + 1.12 * fine;
    const hue = n1(u + 0.13 > 1 ? u : u + 0.13) * 0.6 + n3(u) * 0.4;
    data[i * 4] = Math.round(255 * Math.min(1, d));
    data[i * 4 + 1] = Math.round(255 * hue);
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, W, 1, THREE.RGBAFormat);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const FAR_DRAW = 380;
// 種類ごとの作り：外周の倍率、大気の高さ・濃さ・色、既定の地図
const KINDS = {
  earth: { surface: earthSurface, out: 1.10, atmH: 0.024, atmK: 1.7, atm: [0.16, 0.36, 0.95], term: [1.0, 0.36, 0.12], spin: 0.00035 },
  gas: { surface: gasSurface, out: 1.05, atmH: 0.012, atmK: 1.0, atm: [0.75, 0.62, 0.48], term: [1.0, 0.5, 0.25], map: './assets/sky/gas_giant.jpg', tint: [1.0, 0.95, 0.86], spin: 0.0006 },
  ice: { surface: gasSurface, out: 1.08, atmH: 0.022, atmK: 1.4, atm: [0.30, 0.62, 1.0], term: [0.45, 0.60, 1.0], map: './assets/sky/ice_giant.jpg', tint: [0.86, 1.0, 1.10], spin: 0.0005 },
  rocky: { surface: rockSurface, out: 1.04, atmH: 0.010, atmK: 0.8, atm: [0.75, 0.55, 0.38], term: [1.0, 0.42, 0.2], map: './assets/sky/planets/mars.jpg', tint: [0.86, 0.80, 0.76], spin: 0.0003, bump: 8, lava: 0 },
  dead: { surface: rockSurface, out: 1.07, atmH: 0.018, atmK: 1.0, atm: [0.95, 0.42, 0.14], term: [1.0, 0.20, 0.05], map: './assets/sky/planets/mars.jpg', tint: [0.42, 0.36, 0.34], spin: 0.0004, bump: 9, lava: 1 },
  moon: { surface: rockSurface, out: 1.0, atmH: 0.001, atmK: 0.0, atm: [0, 0, 0], term: [0, 0, 0], map: './assets/sky/planets/moon.jpg', tint: [0.72, 0.71, 0.70], spin: 0.0002, bump: 12, lava: 0 },
  star: { surface: starSurface, out: 1.85, atmH: 0.01, atmK: 0, atm: [0, 0, 0], term: [0, 0, 0], tint: [1, 1, 1], spin: 0 },
};

export function createPlanets(group, sun, time) {
  const noise = noise3D();
  const ringTex = texture(ringTexture());
  // 時刻はどの惑星も同じ uniform を読む（update で time.value から写す）
  const timeU = uniform(0);
  const quad = new THREE.BufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const ringQuad = new THREE.PlaneGeometry(2.34 * 2, 2.34 * 2);
  // 画像は1度だけ読む
  const maps = new Map();
  const loadMap = (url) => {
    if (maps.has(url)) return maps.get(url);
    const t = new THREE.TextureLoader().load(url, (tx) => queueTexture(tx));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    maps.set(url, t);
    return t;
  };
  const list = [];
  const addPlanet = (o) => {
    const K = KINDS[o.type === 'gas' && o.map === 'ice' ? 'ice' : o.type] || KINDS.moon;
    const fade = uniform(1);
    const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.tilt || 0, 0, (o.tilt || 0) * 0.7)).invert());
    const u = {
      ...nodeUniforms({
        uC: new THREE.Vector3(), uR: 1, uOut: K.out,
        uSun: new THREE.Vector3(1, 0, 0), uRot: rot,
        uLon0: o.lon0 || 0, uSpin: o.spin ?? K.spin,
        uAtm: new THREE.Vector3(...(o.atm || K.atm)), uTerm: new THREE.Vector3(...(o.term || K.term)),
        uAtmH: K.atmH, uAtmK: K.atmK,
        uTint: new THREE.Vector3(...(o.tint || K.tint || [1, 1, 1])),
        uRingN: new THREE.Vector3(0, 1, 0), uRing: 0,
        uLava: o.lava ?? K.lava ?? 0, uBump: K.bump || 20,
      }),
      uTime: timeU, uFade: fade, uN: noise, uRingTex: ringTex,
    };
    if (K.surface === earthSurface) {
      u.uDay = texture(loadMap('./assets/sky/planets/earth_day.jpg'));
      u.uNight = texture(loadMap('./assets/sky/planets/earth_night.jpg'));
      u.uCloud = texture(loadMap('./assets/sky/planets/earth_clouds.jpg'));
    } else if (K.map) {
      u.uMap = texture(loadMap(K.map));
    }
    const pv = planetVertex(u);
    const mat = new THREE.MeshBasicNodeMaterial({
      depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false,
      // 大気は足し算、地表は上書き（色は透け具合を掛け終えて出す）。空の一部として不透明の一覧で先に描く
      transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    });
    mat.vertexNode = pv.vertexNode;
    mat.fragmentNode = K.surface === starSurface ? starFragment(u, pv.vW) : planetFragment(u, pv.vW, K.surface);
    const mesh = new THREE.Mesh(quad, mat);
    mesh.renderOrder = o.order ?? -8;
    mesh.frustumCulled = false;
    group.add(mesh);
    let ringMesh = null;
    if (o.ring) {
      const ringMat = new THREE.MeshBasicNodeMaterial({ transparent: false, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false });
      ringMat.fragmentNode = ringFragment(u);
      // 輪は1枚の四角に描く（輪の外と内は濃さ 0 で描かない。細かく分けた輪の形と同じ見た目で、三角形は2枚）
      ringMesh = new THREE.Mesh(ringQuad, ringMat);
      ringMesh.rotation.set(Math.PI / 2 + (o.tilt || 0), 0.32, 0);
      ringMesh.updateMatrixWorld(true);
      u.uRingN.value.set(0, 0, 1).transformDirection(ringMesh.matrixWorld);
      u.uRing.value = 1;
      ringMesh.renderOrder = (o.order ?? -8) + 1;
      ringMesh.frustumCulled = false;
      group.add(ringMesh);
    }
    list.push({ mesh, ringMesh, u, pos: new THREE.Vector3(...o.pos), radius: o.radius, fade, range: o.range || null, light: o.light ? new THREE.Vector3(...o.light).normalize() : null, orbit: o.orbit || null, out: K.out });
  };
  const v = new THREE.Vector3();
  return {
    set(items) {
      for (const p of list) {
        group.remove(p.mesh); p.mesh.material.dispose();
        if (p.ringMesh) { group.remove(p.ringMesh); p.ringMesh.material.dispose(); }
      }
      list.length = 0;
      for (const o of items) addPlanet(o);
    },
    update(P) {
      const t = time.value;
      timeU.value = t;
      for (const p of list) {
        if (p.range) {
          const [i0, i1, o0, o1] = p.range;
          const z = P[2];
          const f = Math.min(i1 > i0 ? Math.min(1, Math.max(0, (z - i0) / (i1 - i0))) : 1, o1 > o0 ? Math.min(1, Math.max(0, (o1 - z) / (o1 - o0))) : 1);
          p.fade.value = f;
          p.mesh.visible = f > 0.002;
          if (p.ringMesh) p.ringMesh.visible = p.mesh.visible;
          if (!p.mesh.visible) continue;
        }
        v.set(p.pos.x - P[0], p.pos.y - P[1], p.pos.z - P[2]);
        // 月などはゆっくり公転させ、視差のほかに自分でも動く
        if (p.orbit) { v.x += Math.cos(t * p.orbit[2] + p.orbit[3]) * p.orbit[0]; v.y += Math.sin(t * p.orbit[2] + p.orbit[3]) * p.orbit[1]; }
        const dist = Math.max(v.length(), p.radius * (p.out + 0.08));
        v.normalize();
        const s = (p.radius / dist) * FAR_DRAW;
        p.mesh.position.copy(v).multiplyScalar(FAR_DRAW);
        p.u.uC.value.copy(p.mesh.position);
        p.u.uR.value = s;
        p.u.uSun.value.copy(p.light || sun.value);
        if (p.ringMesh) {
          p.ringMesh.position.copy(p.mesh.position);
          p.ringMesh.scale.setScalar(s);
        }
      }
    },
  };
}
