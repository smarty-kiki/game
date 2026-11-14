// 建物の胴（大きな箱）と、その表面の作り込み。
// - 無傷：面取りした箱＋重ね張りの装甲板（寄ったときだけ）＋細かい部品
// - 壊れた所に掛かる胴：板を並べた殻にし、穴の縁の板はぎざぎざに破ってめくり、割れ目の板は割れ目で切る。
//   中には床（切り口に蜂の巣の芯）・骨組み・機械・配管・灯りを、壊れた所の近くだけ作る
// 板の並びは位置から決まる乱数で作る（形を作る乱数の並びを消費しない＝無傷と壊れた形で同じ建物になる）

import { ROLE, DETAIL, V, M4, rng, hash3, fbm3 } from './core.js';

// 面の枠：原点・u 軸・v 軸（縦の面は上向き）・外向きの法線・幅・高さ（局所の座標）
function faceFrames(cx, cy, cz, sx, sy, sz) {
  const hx = sx / 2; const hy = sy / 2; const hz = sz / 2;
  return [
    { fi: 0, o: [cx - hx, cy - hy, cz + hz], u: [0, 0, -1], v: [0, 1, 0], n: [-1, 0, 0], W: sz, H: sy },
    { fi: 1, o: [cx + hx, cy - hy, cz - hz], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0], W: sz, H: sy },
    { fi: 2, o: [cx - hx, cy - hy, cz + hz], u: [1, 0, 0], v: [0, 0, -1], n: [0, -1, 0], W: sx, H: sz },
    { fi: 3, o: [cx - hx, cy + hy, cz - hz], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], W: sx, H: sz },
    { fi: 4, o: [cx + hx, cy - hy, cz - hz], u: [-1, 0, 0], v: [0, 1, 0], n: [0, 0, -1], W: sx, H: sy },
    { fi: 5, o: [cx - hx, cy - hy, cz + hz], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], W: sx, H: sy },
  ];
}
const at2 = (f, x, y, z = 0) => V.add(f.o, V.add(V.mul(f.u, x), V.add(V.mul(f.v, y), V.mul(f.n, z))));

// 凸の多角形を半平面 dot(q, n2) >= c で切る（2D）。切り口の辺の番号も返す
function clipHalf(poly, n2, c) {
  const out = []; const cut = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]; const q = poly[(i + 1) % poly.length];
    const dp = p[0] * n2[0] + p[1] * n2[1] - c; const dq = q[0] * n2[0] + q[1] * n2[1] - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      cut.push(out.length - 1);
    }
  }
  return { poly: out, cut };
}
// 切り口の2点のあいだに、ぎざぎざの点を足す（jag(点) は切り口の法線の向きのずれ）。n2 は残す側の向き
function jagCut(poly, cut, n2, jag, step = 0.35) {
  if (cut.length !== 2 || poly.length < 3) return { poly, cutEdge: new Set() };
  // 切り口の辺は cut[0]→cut[1] か cut[1]→cut[0] の並びのどちらか（2点が隣り合う所）
  let [i0, i1] = cut;
  if ((i0 + 1) % poly.length !== i1) [i0, i1] = [i1, i0];
  if ((i0 + 1) % poly.length !== i1) return { poly, cutEdge: new Set() };
  const a = poly[i0]; const b = poly[i1];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.floor(L / step));
  const mid = [];
  for (let k = 1; k < n; k++) {
    const t = k / n; const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const j = jag(p);
    mid.push([p[0] + n2[0] * j, p[1] + n2[1] * j]);
  }
  const out = [...poly.slice(0, i0 + 1), ...mid, ...poly.slice(i0 + 1)];
  // 切り口の辺：i0 から i0+mid.length+1 まで
  const cutEdge = new Set();
  for (let k = i0; k <= i0 + mid.length; k++) cutEdge.add(k);
  return { poly: out, cutEdge };
}

// 2D の多角形を厚み t の板にして出す（外の面は z=0、内の面は z=-t）。rot は板に掛ける回転（組み立ての局所座標）
function prism(B, f, poly, t, o, cutEdge = new Set(), rot = null, uvOrigin = [0, 0], detail = DETAIL.MASS) {
  const P = (q, z) => { let p = at2(f, q[0], q[1], z); if (rot) p = M4.apply(rot, p); return B.toW(p); };
  const top = poly.map((q) => P(q, 0)); const bot = poly.map((q) => P(q, -t));
  let c = [0, 0]; for (const q of poly) { c[0] += q[0]; c[1] += q[1]; } c = [c[0] / poly.length, c[1] / poly.length];
  const inside = P(c, -t * 0.5);
  const uv = poly.map((q) => [q[0] - uvOrigin[0], q[1] - uvOrigin[1]]);
  const base = { rnd: o.rnd ?? 0.5, p1: o.p1 ?? 0, p2: o.p2 ?? 0 };
  const star = poly.length > 4;
  const lower = (d) => Math.min(DETAIL.FINE, Math.max(detail, d));
  B.part('tile', detail, () => B.poly(top, uv, { ...base, role: o.role ?? ROLE.PAINT }, inside, star));
  // 裏の面は中くらいまで（穴の奥の壁の裏が見えるため。寄りだけにすると、中くらいの距離で穴の奥が抜けて格子に見えた）
  B.part('tile', lower(DETAIL.MID), () => B.poly(bot, uv, { ...base, role: o.innerRole ?? ROLE.INNER }, inside, star));
  const edges = (cut) => {
    for (let i = 0; i < poly.length; i++) {
      if (cutEdge.has(i) !== cut) continue;
      const j = (i + 1) % poly.length;
      const L = Math.hypot(poly[j][0] - poly[i][0], poly[j][1] - poly[i][1]);
      B.poly([top[i], top[j], bot[j], bot[i]], [[0, t], [L, t], [L, 0], [0, 0]], { rnd: base.rnd, role: cut ? (o.cutRole ?? ROLE.BARE) : (o.edgeRole ?? ROLE.DARK), edge: 1, heat: cut ? o.cutHeat ?? 0 : 0 }, inside);
    }
  };
  if (cutEdge.size) B.part('tile', lower(DETAIL.MID), () => edges(true));
  B.part('tile', lower(DETAIL.FINE), () => edges(false));
}

// 1枚の板（面の上の長方形 [u0,u1]×[v0,v1]）を、壊れ方に従って出す
function tile(B, f, u0, u1, v0, v1, t, o) {
  const D = B.dmg;
  const rect = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  const cw = B.toW(at2(f, (u0 + u1) / 2, (v0 + v1) / 2, -t / 2));
  const nW = V.norm(V.sub(B.toW(at2(f, 0, 0, 1)), B.toW(at2(f, 0, 0, 0))));
  const tsize = Math.max(u1 - u0, v1 - v0) * B.s;
  // 面の素材が板の境目で途切れないよう、面全体で続く uv にする（板ごとの継ぎ目は p1・p2 の大きさで描く）
  const uvo = [0, 0];
  // 大きな板は、細かい板と同じ間隔の継ぎ目を材質で描く（p1・p2 を板の中の区切りにする）
  const sub = o.sub ?? 0;
  const pu = (u1 - u0) * B.s; const pv = (v1 - v0) * B.s;
  const po = o.globalUV ? o : { ...o, p1: sub ? pu / Math.max(1, Math.round(pu / sub)) : pu, p2: sub ? pv / Math.max(1, Math.round(pv / (sub * 0.75))) : pv };
  // 壊れた所の近くの細かい板（5m 未満）は中くらいまで描く。遠くでは穴の縁が少し広く見えるだけで、面数を大きく減らせる
  const tileDetail = o.detail ?? (tsize >= 5 ? DETAIL.MASS : DETAIL.MID);
  const emit = (poly, cut, rot, chunk = -1, heatK = 0, det = tileDetail) => {
    B.chunkHint = chunk;
    prism(B, f, poly, t, { ...po, cutHeat: heatK }, cut, rot, uvo, det);
    B.chunkHint = -1;
  };
  if (!D) { emit(rect, new Set(), null); return; }
  // 穴
  const cornersW = rect.map((q) => B.toW(at2(f, q[0], q[1], 0)));
  let worst = null;
  for (const b of D.breaches) {
    const ins = cornersW.map((p) => V.dist(p, b.c) < D.breachR(b, p));
    const k = ins.filter(Boolean).length;
    if (k === 4) { D.debris.push({ kind: 'plate', p: cw, s: tsize, n: nW }); return; }
    if (k > 0 && (!worst || V.dist(cw, b.c) < V.dist(cw, worst.c))) worst = b;
    // 板より穴が小さく、板の真ん中に穴があくとき（角は外）：板を消して破片に
    if (k === 0 && V.dist(cw, b.c) < D.breachR(b, cw) * 0.9) { D.debris.push({ kind: 'plate', p: cw, s: tsize, n: nW }); return; }
  }
  if (worst) {
    // 穴の中心を面の 2D へ。面の平面での穴の半径
    const rel = V.sub(worst.c, B.toW(f.o));
    const ux = V.norm(V.sub(B.toW(at2(f, 1, 0)), B.toW(f.o))); const vy = V.norm(V.sub(B.toW(at2(f, 0, 1)), B.toW(f.o)));
    const bc = [V.dot(rel, ux) / B.s, V.dot(rel, vy) / B.s];
    const dz = V.dot(rel, nW) / B.s;
    const rj = D.breachR(worst, cw) / B.s;
    const r2 = Math.sqrt(Math.max(0, rj * rj - dz * dz));
    const tc = [(u0 + u1) / 2, (v0 + v1) / 2];
    let dir = [tc[0] - bc[0], tc[1] - bc[1]]; const dl = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / dl, dir[1] / dl];
    const c = bc[0] * dir[0] + bc[1] * dir[1] + r2;
    const { poly, cut } = clipHalf(rect, dir, c);
    if (poly.length < 3) return;
    const jag = (q) => { const p = at2(f, q[0], q[1]); return (fbm3(p[0] * 0.9 + 5, p[1] * 0.9, p[2] * 0.9) - 0.45) * 0.9 * Math.min(1, (u1 - u0 + v1 - v0) * 0.2); };
    const { poly: jp, cutEdge } = jagCut(poly, cut, dir, jag);
    // めくる：穴から遠い辺を蝶番に、穴側の縁を外へ持ち上げる
    let far = -Infinity; for (const q of jp) far = Math.max(far, q[0] * dir[0] + q[1] * dir[1]);
    const hingeQ = [tc[0] + dir[0] * (far - (tc[0] * dir[0] + tc[1] * dir[1])), tc[1] + dir[1] * (far - (tc[0] * dir[0] + tc[1] * dir[1]))];
    const hinge = at2(f, hingeQ[0], hingeQ[1], 0);
    const dir3 = V.norm(V.add(V.mul(f.u, dir[0]), V.mul(f.v, dir[1])));
    const axis = V.norm(V.cross(f.n, dir3));
    const hh = hash3(cw[0] * 0.21, cw[1] * 0.21, cw[2] * 0.21);
    const near = Math.max(0, 1 - (dl - r2) / Math.max(1, (u1 - u0 + v1 - v0)));
    const ang = (0.15 + 1.05 * hh) * near * Math.min(1, 0.3 + D.d);
    emit(jp, cutEdge, ang > 0.02 ? M4.rotAround(hinge, axis, ang) : null, -1, D.heat * (0.35 + 0.65 * hh));
    return;
  }
  // 割れ目（塊の境い目）を横切る板は、二等分面で切って左右へ分ける
  if (D.seeds.length > 1) {
    const chs = cornersW.map((p) => D.chunkOf(p).i);
    if (chs.some((x) => x !== chs[0])) {
      const cc = D.chunkOf(cw);
      const n = cc.n; const m = cc.m;
      const ux = V.sub(B.toW(at2(f, 1, 0)), B.toW(f.o)); const vy = V.sub(B.toW(at2(f, 0, 1)), B.toW(f.o));
      const n2 = [V.dot(ux, n), V.dot(vy, n)];
      const l2 = Math.hypot(n2[0], n2[1]);
      if (l2 > 1e-3) {
        const c = -V.dot(V.sub(B.toW(f.o), m), n);
        const nn = [n2[0] / l2, n2[1] / l2];
        const jag = (q) => { const p = at2(f, q[0], q[1]); return (fbm3(p[0] * 0.8 + 9, p[1] * 0.8, p[2] * 0.8) - 0.45) * 1.1; };
        // 種 j の側（dot >= c）と種 i の側
        const A = clipHalf(rect, nn, c / l2 * 1);
        const Bq = clipHalf(rect, [-nn[0], -nn[1]], -c / l2);
        const ja = jagCut(A.poly, A.cut, nn, jag); const jb = jagCut(Bq.poly, Bq.cut, [-nn[0], -nn[1]], (q) => -jag(q));
        const hk = D.heat * (0.3 + 0.6 * hash3(cw[0] * 0.3, cw[1] * 0.3, cw[2] * 0.3));
        if (ja.poly.length >= 3) emit(ja.poly, ja.cutEdge, null, cc.j, hk);
        if (jb.poly.length >= 3) emit(jb.poly, jb.cutEdge, null, cc.i, hk);
        return;
      }
    }
  }
  // 穴にも割れ目にも掛からない板：表の面はどの距離でも描く（四角1枚＝三角形2枚。細かい板を中くらいの段だけにすると、
  // 壊れた面が遠くの段で丸ごと抜け、遠くの残骸が骨だけに見えた。遠くでは穴の縁が少し広く見えるだけ）
  emit(rect, new Set(), null, -1, 0, DETAIL.MASS);
}

// 面を板で埋める（壊れた胴の殻・床）。行の高さと列の幅をばらつかせ、行ごとに継ぎ目をずらす
function tileFace(B, f, ts, t, o, filter = null) {
  const R = rng(hash3(f.o[0] * 0.13 + f.fi, f.o[1] * 0.17, f.o[2] * 0.19) * 1e5 + 7);
  const D = B.dmg;
  const big = Math.min(12, Math.max(ts * 2.2, Math.max(f.W, f.H) / 4));
  const rows = R.splits(f.H, big * 0.75, 0.3);
  let v0 = 0;
  for (const h of rows) {
    const cols = R.splits(f.W, big, 0.35);
    let u0 = 0;
    for (const w of cols) {
      const cq = [u0 + w / 2, v0 + h / 2];
      const cw = B.toW(at2(f, cq[0], cq[1]));
      if (!filter || filter(cw)) {
        if (D && D.nearDamage(cw, Math.max(w, h) * B.s * 0.75)) {
          // 壊れた所の近く：細かい板に割る（穴の縁をぎざぎざにするため）
          const rr = R.splits(h, ts * 0.75, 0.35);
          let vv = v0;
          for (const hh of rr) {
            const cc = R.splits(w, ts, 0.45);
            let uu = u0;
            for (const ww of cc) {
              if (!filter || filter(B.toW(at2(f, uu + ww / 2, vv + hh / 2)))) tile(B, f, uu + 0.03, uu + ww - 0.03, vv + 0.03, vv + hh - 0.03, t, o);
              uu += ww;
            }
            vv += hh;
          }
        } else tile(B, f, u0 + 0.03, u0 + w - 0.03, v0 + 0.03, v0 + h - 0.03, t, { ...o, sub: ts });
      }
      u0 += w;
    }
    v0 += h;
  }
}

// 重ね張りの装甲板（無傷の面の上に、寄ったときだけ見える層）
function platesOnFace(B, f, o) {
  const R = rng(hash3(f.o[0] * 0.31 + f.fi * 3, f.o[1] * 0.29, f.o[2] * 0.37) * 1e5 + 1);
  // 板の大きさは面の大きさに合わせる（大きな面ほど大きな板。1面あたりの枚数を抑える）
  const ps = o.plateSize ?? Math.min(6, Math.max(2.4, Math.max(f.W, f.H) / 7));
  const margin = Math.min(0.4, f.W * 0.04);
  const rows = R.splits(f.H - margin * 2, ps * 0.7, 0.4);
  let v0 = margin;
  for (const h of rows) {
    const cols = R.splits(f.W - margin * 2, ps, 0.5);
    let u0 = margin;
    for (const w of cols) {
      const r = R();
      if (r > 0.1) {
        const thick = r > 0.82 ? 0.38 + R() * 0.2 : 0.14 + R() * 0.1;
        const g = 0.07;
        const a = [u0 + g, v0 + g]; const b = [u0 + w - g, v0 + h - g];
        const role = o.plateRoles ? o.plateRoles(R, f) : (R() < (f.fi === 3 ? 0.0 : 0.06) ? ROLE.PAINT2 : (o.role ?? ROLE.PAINT));
        const c8 = [];
        // 厚い板は外の面を少し小さくして斜めの縁にする（目標の絵3の重ね張り）
        const sl = thick > 0.3 ? Math.min(0.35, thick * 0.8) : 0;
        for (let i = 0; i < 8; i++) { const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1; c8.push(at2(f, (ix ? b[0] - (iz ? sl : 0) : a[0] + (iz ? sl : 0)), (iy ? b[1] - (iz ? sl * 0.6 : 0) : a[1] + (iz ? sl * 0.6 : 0)), iz ? thick : 0)); }
        const small = Math.min(b[0] - a[0], b[1] - a[1]) * B.s < 1.4;
        const pw = b[0] - a[0]; const ph = b[1] - a[1];
        if (!small && R() < 0.4) {
          // 角を斜めに落とした板（目標の絵3の、角の欠けた装甲の形）。落とす角と大きさは板ごと
          const k = Math.min(pw, ph) * R.range(0.18, 0.4);
          const cut = [R() < 0.6, R() < 0.3, R() < 0.5, R() < 0.25];
          const poly = [];
          const corner = (x, y, dx, dy, on) => { if (on) { poly.push([x + dx * k, y]); poly.push([x, y + dy * k]); } else poly.push([x, y]); };
          // 反時計回り：左下→右下→右上→左上（切る角は2点に分ける）
          if (cut[0]) { poly.push([a[0], a[1] + k]); poly.push([a[0] + k, a[1]]); } else poly.push([a[0], a[1]]);
          if (cut[1]) { poly.push([b[0] - k, a[1]]); poly.push([b[0], a[1] + k]); } else poly.push([b[0], a[1]]);
          if (cut[2]) { poly.push([b[0], b[1] - k]); poly.push([b[0] - k, b[1]]); } else poly.push([b[0], b[1]]);
          if (cut[3]) { poly.push([a[0] + k, b[1]]); poly.push([a[0], b[1] - k]); } else poly.push([a[0], b[1]]);
          const fo = { ...f, o: at2(f, 0, 0, thick), n: f.n };
          B.part('plate', DETAIL.FINE, () => prism(B, fo, poly, thick, { role, rnd: R(), p1: pw * B.s, p2: ph * B.s, innerRole: ROLE.DARK, edgeRole: role }, new Set(), null, a, DETAIL.FINE));
        } else B.hexa(c8, { role, c: small ? 0.02 : Math.min(0.1, thick * 0.35), rnd: R(), p1: pw * B.s, p2: ph * B.s, uvOrigin: null }, 'plate', DETAIL.FINE);
      }
      u0 += w;
    }
    v0 += h;
  }
}

// 細かい部品：通気口・配電箱・短い配管・小さな灯り（面の上、窓の帯は避ける）
export function greebleFace(B, f, o = {}) {
  const R = rng(hash3(f.o[0] * 0.53 + f.fi * 7, f.o[1] * 0.47, f.o[2] * 0.41) * 1e5 + 3);
  const area = f.W * f.H;
  const n = Math.min(o.max ?? 40, Math.floor(area * (o.density ?? 0.012) + R()));
  for (let i = 0; i < n; i++) {
    const w = 0.6 + R() * Math.min(4, f.W * 0.15); const h = 0.5 + R() * Math.min(3, f.H * 0.15);
    const u = R() * (f.W - w); const v = (o.vmin ?? 0) + R() * Math.max(0.1, f.H - h - (o.vmin ?? 0));
    if (o.avoid && o.avoid(v, h)) continue;
    const k = R();
    const d = 0.25 + R() * 0.7;
    const c8 = [];
    for (let j = 0; j < 8; j++) { const ix = j & 1; const iy = (j >> 1) & 1; const iz = (j >> 2) & 1; c8.push(at2(f, u + (ix ? w : 0), v + (iy ? h : 0), iz ? d : 0)); }
    if (B.useProps) {
      // 面に付く小物：通風口・配電箱・短い配管（向きは面の外向き）
      // 小物の形は足元の中心が原点（奥行きの向きにも中心）なので、面から外へ奥行きの半分だけ出す（出さないと壁に半分埋まる）
      const ry = Math.atan2(f.n[0], f.n[2]);
      const rr = R();
      if (k < 0.7) { const cU = at2(f, u + w / 2, v, d / 2); B.prop(k < 0.32 ? 'vent' : 'junction', cU[0], cU[1], cU[2], ry, w, h, d); }
      else { const pr = 0.25 + rr * 0.4; const cU = at2(f, u, v + h * 0.5, pr / 2 + 0.08); B.prop('pipeRun', cU[0], cU[1], cU[2], Math.atan2(f.u[0], f.u[2]), pr, pr, w * 2.2); }
      continue;
    }
    if (k < 0.32) B.hexa(c8, { role: ROLE.GRILLE, c: 0.05, rnd: R(), p1: w, p2: h }, 'detail', DETAIL.FINE);
    else if (k < 0.7) {
      B.hexa(c8, { role: R() < 0.2 ? ROLE.PAINT2 : ROLE.DARK, c: 0.06, rnd: R() }, 'detail', DETAIL.FINE);
      if (R() < 0.25) B.lamp(at2(f, u + w * 0.5, v + h + 0.25, d * 0.5), 0.3, ROLE.LAMP, f.n);
    } else {
      // 面に沿う短い配管（留め具つき）
      const y = v + h * 0.5; const z = 0.3 + R() * 0.4; const r = 0.1 + R() * 0.18;
      B.pipe([at2(f, u, y, z), at2(f, u + w * 2.2, y, z)], r, { role: R() < 0.5 ? ROLE.BARE : ROLE.DARK, rnd: R() });
    }
  }
}

// 面の上の箱（u・v・z の範囲。z は面から外へ）。topIn：上の面を壁側へ寄せる量（斜めの上面）
function boxF(B, f, u0, u1, v0, v1, z0, z1, o, kind = 'detail', detail = DETAIL.FINE, topIn = 0) {
  const c8 = [];
  for (let i = 0; i < 8; i++) {
    const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1;
    const z = iz ? z1 - (iy ? topIn : 0) : z0;
    c8.push(at2(f, ix ? u1 : u0, iy ? v1 : v0, z));
  }
  return B.hexa(c8, o, kind, detail);
}

// 壁の作り込み（形の文法）：柱の並びで壁を区画に分け、区画ごとに 通気口・配管の束・扉・配電箱・無地 を選ぶ。
// 張り出しの帯と、足元の配管を足す。扉と手すりは人の大きさの物差し（品質の定義の観点1・6）
export function wallKit(B, f, o = {}) {
  const W = f.W; const H = f.H;
  if (W < 6 || H < 3.5) return;
  const R = rng(hash3(f.o[0] * 0.71 + f.fi * 11, f.o[1] * 0.67, f.o[2] * 0.61) * 1e5 + 9);
  const z0 = o.off ?? 0.15;
  const big = Math.max(1, Math.min(2.4, Math.max(W, H) / 55));
  const n = Math.max(1, Math.round(W / (R.range(6, 11) * big)));
  const bw = W / n;
  // 柱の太さと出っ張りも建物の大きさに合わせる（大きな壁で細い線にしか見えないのを防ぐ）
  const pw = Math.min(2.2 * big, bw * 0.12) * R.range(0.8, 1.25);
  const pd = Math.min(1.6 * big, pw * R.range(0.5, 0.9));
  const fullH = R() < 0.6;
  const role = o.role ?? ROLE.PAINT;
  // 柱（上を斜めに落とす）
  for (let i = 1; i < n; i++) {
    const u = i * bw; const h = fullH ? H : H * R.range(0.45, 0.85);
    boxF(B, f, u - pw / 2, u + pw / 2, 0, h, z0, z0 + pd, { role, c: Math.min(0.2, pw * 0.12), rnd: R(), panel: 2.4, base: 1 }, 'box', DETAIL.MID, fullH ? 0 : pd * 0.7);
  }
  // 張り出しの帯（手すりつき）
  if (H > 9 && R() < 0.65) {
    const v = H * R.range(0.5, 0.82); const d = R.range(0.8, 1.8);
    boxF(B, f, 0.2, W - 0.2, v - 0.35, v, z0, z0 + d, { role: ROLE.DARK, c: 0.1, rnd: R() }, 'box', DETAIL.MID);
    if (d > 1.1) B.railing(at2(f, 0.3, v, z0 + d - 0.1), at2(f, W - 0.3, v, z0 + d - 0.1));
    for (let k = 0; k < Math.floor(W / 9); k++) B.lamp(at2(f, 4 + k * 9, v - 0.5, z0 + 0.3), 0.3, ROLE.LAMP, f.n);
  }
  // 区画ごと
  for (let i = 0; i < n; i++) {
    const u0 = i * bw + pw / 2 + 0.4; const u1 = (i + 1) * bw - pw / 2 - 0.4;
    const w = u1 - u0;
    if (w < 1.5) continue;
    const k = R();
    if (k < 0.2) {
      // 通気口（枠つき）
      const vw = w * R.range(0.4, 0.75); const vh = Math.min(4.5, H * R.range(0.15, 0.3)); const uc = u0 + R() * (w - vw); const vc = Math.min(H - vh - 0.5, R.range(0.15, 0.7) * H);
      boxF(B, f, uc, uc + vw, vc, vc + vh, z0, z0 + 0.25, { role: ROLE.GRILLE, c: 0.03, p1: vw, p2: vh }, 'detail', vw > 3 ? DETAIL.MID : DETAIL.FINE);
      const t = 0.18;
      for (const [a, b, c, d] of [[uc - t, uc + vw + t, vc - t, vc], [uc - t, uc + vw + t, vc + vh, vc + vh + t], [uc - t, uc, vc, vc + vh], [uc + vw, uc + vw + t, vc, vc + vh]]) boxF(B, f, a, b, c, d, z0, z0 + 0.4, { role: ROLE.DARK, c: 0.04 }, 'detail', DETAIL.FINE);
    } else if (k < 0.42) {
      // 配管の束（縦）。留め具が 2m ごと
      const np = R.int(2, 4); const r = R.range(0.14, 0.32) * Math.min(1.6, big); const uc = u0 + R() * Math.max(0.1, w - np * r * 3);
      const top = H * R.range(0.5, 1.0);
      for (let j = 0; j < np; j++) {
        const u = uc + j * r * 2.8; const z = z0 + r * 1.3;
        B.pipe([at2(f, u, 0.2, z), at2(f, u, top, z), at2(f, u, top, z0 + 0.05)], r * (1 - j * 0.12), { role: R() < 0.5 ? ROLE.BARE : ROLE.DARK, rnd: R(), detail: r > 0.28 ? DETAIL.MID : DETAIL.FINE });
      }
      for (let v = 1.5; v < top; v += 2.2) boxF(B, f, uc - r, uc + np * r * 2.8, v, v + 0.25, z0, z0 + r * 2.4, { role: ROLE.DARK, c: 0.03 });
    } else if (k < 0.56 && o.doors !== false) {
      // 扉：人の扉（1.4×2.4m）か、区画が広ければ荷物の扉。警告の縞の枠、上に灯り
      const cargo = w > 7 && H > 8 && R() < 0.5;
      const dw = cargo ? Math.min(w * 0.7, 6) : 1.4; const dh = cargo ? Math.min(H * 0.6, 5.5) : 2.4;
      const uc = u0 + (w - dw) * R.range(0.2, 0.8);
      boxF(B, f, uc, uc + dw, 0, dh, z0 - 0.1, z0 + 0.05, { role: ROLE.INNER, c: 0.02, p1: dw, p2: cargo ? 0.6 : dh }, 'detail', cargo ? DETAIL.MID : DETAIL.FINE);
      const t = cargo ? 0.35 : 0.18;
      boxF(B, f, uc - t, uc, 0, dh + t, z0, z0 + 0.3, { role: ROLE.HAZARD, c: 0.03 }, 'detail', DETAIL.FINE);
      boxF(B, f, uc + dw, uc + dw + t, 0, dh + t, z0, z0 + 0.3, { role: ROLE.HAZARD, c: 0.03 }, 'detail', DETAIL.FINE);
      boxF(B, f, uc - t, uc + dw + t, dh, dh + t, z0, z0 + 0.3, { role: ROLE.DARK, c: 0.03 }, 'detail', DETAIL.FINE);
      B.lamp(at2(f, uc + dw / 2, dh + t + 0.3, z0 + 0.2), cargo ? 0.5 : 0.28, ROLE.LAMP, f.n);
    } else if (k < 0.72) {
      // 配電箱の集まりと電線管
      const nb = R.int(2, 4); let u = u0 + R() * w * 0.3; const v0 = R.range(0.8, Math.max(1, H * 0.5));
      for (let j = 0; j < nb && u < u1 - 1; j++) {
        const bw2 = R.range(0.8, 2.2); const bh = R.range(0.9, 2.2); const bd = R.range(0.35, 0.8);
        boxF(B, f, u, u + bw2, v0, v0 + bh, z0, z0 + bd, { role: R() < 0.25 ? ROLE.PAINT2 : ROLE.DARK, c: 0.06, rnd: R(), p1: bw2, p2: bh }, 'detail', DETAIL.FINE);
        B.pipe([at2(f, u + bw2 / 2, v0, z0 + 0.15), at2(f, u + bw2 / 2, 0.3, z0 + 0.15)], 0.07, { role: ROLE.DARK });
        u += bw2 + R.range(0.2, 0.8);
      }
    }
  }
  // 壁の中ほどを横に走る配管の束（2〜4本、留め具つき、端で上へ曲がる）
  if (H > 6 && R() < 0.75) {
    const np = R.int(2, 4); const r0 = R.range(0.18, 0.35) * Math.min(1.6, big); const y0 = H * R.range(0.3, 0.55);
    const u0 = R() * W * 0.2; const u1 = W - R() * W * 0.2; const z = z0 + pd + r0 * 1.4;
    for (let j = 0; j < np; j++) {
      const rr = r0 * (1 - j * 0.15); const y = y0 + j * r0 * 2.6;
      B.pipe([at2(f, u0, y, z), at2(f, u1, y, z), at2(f, u1, Math.min(H - 0.5, y + H * 0.25), z)], rr, { role: j % 2 ? ROLE.DARK : ROLE.BARE, rnd: R(), flange: 5, detail: rr > 0.28 ? DETAIL.MID : DETAIL.FINE });
    }
    for (let u = u0 + 1.5; u < u1; u += R.range(2.2, 3.5)) boxF(B, f, u, u + 0.3, y0 - r0 * 1.5, y0 + np * r0 * 2.6, z0, z + r0 * 1.3, { role: ROLE.DARK, c: 0.04 });
  }
  // 足元の横の配管
  if (R() < 0.5) { const r = R.range(0.2, 0.4) * Math.min(1.5, big); for (let j = 0; j < 2; j++) B.pipe([at2(f, 0.5, 0.6 + j * r * 2.6, z0 + r * 1.4), at2(f, W - 0.5, 0.6 + j * r * 2.6, z0 + r * 1.4)], r, { role: j ? ROLE.DARK : ROLE.BARE, flange: 7, detail: DETAIL.MID }); }
}

// 胴：無傷なら面取りした箱と作り込み、壊れた所に掛かれば板の殻と中身
// o：{ role, side, top, bottom, c, panel, facade, plates, greeble, skip:[面], deck(床の間隔), interior }
export function hull(B, cx, cy, cz, sx, sy, sz, o = {}) {
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(B.toW([cx + (i & 1 ? 1 : -1) * sx / 2, cy + (i & 2 ? 1 : -1) * sy / 2, cz + (i & 4 ? 1 : -1) * sz / 2]));
  const mn = [0, 1, 2].map((k) => Math.min(...corners.map((p) => p[k])));
  const mx = [0, 1, 2].map((k) => Math.max(...corners.map((p) => p[k])));
  const frames = faceFrames(cx, cy, cz, sx, sy, sz);
  const skip = o.skip || [];
  const sideRole = o.side ?? o.role ?? ROLE.PAINT;
  const damaged = B.dmg && B.dmg.touchesBox(mn, mx);
  if (!damaged) {
    B.box(cx, cy, cz, sx, sy, sz, { ...o, c: o.c ?? Math.min(2.5, Math.max(0.25, Math.min(sx, sy, sz) * 0.035)) }, 'hull', DETAIL.MASS);
    for (const f of frames) {
      if (skip.includes(f.fi) || f.fi === 2) continue;
      const role = f.fi === 3 ? (o.top ?? o.role ?? ROLE.PAINT) : sideRole;
      const armor = role !== ROLE.FACADE && role !== ROLE.GLASS && role !== ROLE.CORRUGATED && role !== ROLE.CONCRETE;
      // 上の面（屋根・甲板）は板を浮かせない（敷石のように見えるため）。継ぎ目は材質で描く
      // 重ね張りの板は寄りで見せる建物だけ（plates: true）。ふだんは面の素材がパネルを描くので、板を重ねると細かすぎてうるさい
      if (o.plates === true && armor && f.fi !== 3 && f.W > 3 && f.H > 2.5) platesOnFace(B, f, { role, plateSize: o.plateSize });
      if (o.wall !== false && f.fi !== 3 && f.W > 6 && f.H > 3.5 && (armor || o.wall)) wallKit(B, f, { role, off: o.plates === true ? 0.2 : 0, doors: o.doors });
      if (o.greeble !== false && f.W > 4) greebleFace(B, { ...f, o: at2(f, 0, 0, role === ROLE.FACADE || o.plates === false ? 0 : 0.12) }, { density: o.greeble ?? 0.01, avoid: o.avoid });
    }
    return false;
  }
  // ---- 壊れた胴：板の殻 ----
  const t = Math.min(0.45, Math.max(0.2, Math.min(sx, sy, sz) * 0.02));
  const ts = o.tile ?? Math.min(4.2, Math.max(2.2, Math.max(sx, sy, sz) / 9));
  for (const f of frames) {
    if (skip.includes(f.fi)) continue;
    const role = f.fi === 3 ? (o.top ?? o.role ?? ROLE.PAINT) : f.fi === 2 ? (o.bottom ?? o.role ?? ROLE.PAINT) : sideRole;
    const glob = role === ROLE.FACADE || role === ROLE.GLASS;
    const fo = glob ? { role, globalUV: true, p1: (o.facade || [3.2, 3.6])[0], p2: (o.facade || [3.2, 3.6])[1] } : { role };
    tileFace(B, f, ts, t, fo);
  }
  // 角の縦・横の骨（板の継ぎ目を覆う）
  const hx = sx / 2; const hy = sy / 2; const hz = sz / 2; const bt = t * 2.2;
  for (const [ax, ay] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    B.beam([cx + ax * (hx - bt / 2), cy - hy, cz + ay * (hz - bt / 2)], [cx + ax * (hx - bt / 2), cy + hy, cz + ay * (hz - bt / 2)], bt, bt, { role: ROLE.DARK });
    B.beam([cx - hx, cy + ax * (hy - bt / 2), cz + ay * (hz - bt / 2)], [cx + hx, cy + ax * (hy - bt / 2), cz + ay * (hz - bt / 2)], bt, bt, { role: ROLE.DARK, up: [0, 0, 1] });
    B.beam([cx + ax * (hx - bt / 2), cy + ay * (hy - bt / 2), cz - hz], [cx + ax * (hx - bt / 2), cy + ay * (hy - bt / 2), cz + hz], bt, bt, { role: ROLE.DARK });
  }
  if (o.interior === false) return true;
  // ---- 中身（壊れた所の近くだけ） ----
  const D = B.dmg;
  const near = (p) => D.nearDamage(p, 3.5);
  const R = rng(hash3(cx * 0.11, cy * 0.13, cz * 0.17) * 1e5 + 5);
  let dh = o.deck ?? (o.facade ? o.facade[1] : 4.2);
  if (sy / dh > 6) dh *= 2;
  const nd = Math.floor(sy / dh);
  for (let k = 1; k <= nd; k++) {
    const y = cy - hy + k * dh;
    if (y > cy + hy - 1.2) break;
    const f = { fi: 9 + k, o: [cx - hx + t, y, cz - hz + t], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], W: sx - t * 2, H: sz - t * 2 };
    tileFace(B, f, 5.5, 0.38, { role: ROLE.DECK, innerRole: ROLE.INNER, edgeRole: ROLE.HONEY, cutRole: ROLE.HONEY }, near);
    // 床の上の機械と、天井の配管・灯り
    for (let i = 0; i < Math.min(40, Math.floor(sx * sz / 160)); i++) {
      const p = [cx - hx + 1 + R() * (sx - 2), y, cz - hz + 1 + R() * (sz - 2)];
      const w = 0.8 + R() * 2.4; const h = Math.min(dh - 0.6, 0.6 + R() * 2.2); const dd = 0.8 + R() * 2;
      if (!near(B.toW(p))) continue;
      const kind = R();
      if (kind < 0.5) B.box(p[0], y + h / 2, p[2], w, h, dd, { role: R() < 0.7 ? ROLE.DARK : ROLE.INNER, c: 0.06, rnd: R() }, 'detail', DETAIL.FINE);
      else if (kind < 0.8) B.pipe([[p[0], y + dh - 0.5, cz - hz + t], [p[0], y + dh - 0.5, cz + hz - t]], 0.12 + R() * 0.12, { rnd: R() });
      else B.lamp([p[0], y + dh - 0.4, p[2]], 0.35, ROLE.LAMP, [0, -1, 0]);
    }
  }
  // 骨組み（長い向きに沿って一定の間隔の枠）
  const alongX = sx >= sz;
  const L = alongX ? sx : sz;
  const nf = Math.floor(L / 4.5);
  for (let k = 1; k < nf; k++) {
    const s0 = -L / 2 + k * (L / nf);
    const pc = alongX ? [cx + s0, cy, cz] : [cx, cy, cz + s0];
    if (!D.nearDamage(B.toW(pc), Math.max(sy, alongX ? sz : sx) * 0.6)) continue;
    const q = (a, b) => (alongX ? [cx + s0, cy + b, cz + a] : [cx + a, cy + b, cz + s0]);
    const W2 = (alongX ? sz : sx) / 2 - t * 1.6; const H2 = hy - t * 1.6;
    const ft = Math.min(0.5, t * 1.4);
    B.beam(q(-W2, -H2), q(W2, -H2), ft, ft * 1.6, { role: ROLE.INNER });
    B.beam(q(W2, -H2), q(W2, H2), ft, ft * 1.6, { role: ROLE.INNER });
    B.beam(q(W2, H2), q(-W2, H2), ft, ft * 1.6, { role: ROLE.INNER });
    B.beam(q(-W2, H2), q(-W2, -H2), ft, ft * 1.6, { role: ROLE.INNER });
  }
  return true;
}

// 円筒の胴（ステーションの区画）。軸は z。壊れた所に掛かれば、板の殻と輪の骨組みにする
export function hullCyl(B, cx, cy, cz, r, len, o = {}) {
  const seg = o.seg ?? 16;
  const mn = B.toW([cx - r, cy - r, cz - len / 2]); const mx = B.toW([cx + r, cy + r, cz + len / 2]);
  const a = [0, 1, 2].map((k) => Math.min(mn[k], mx[k])); const b = [0, 1, 2].map((k) => Math.max(mn[k], mx[k]));
  const damaged = B.dmg && B.dmg.touchesBox(V.sub(a, [r, r, r]), V.add(b, [r, r, r]));
  const role = o.role ?? ROLE.PAINT;
  if (!damaged) {
    B.cyl([cx, cy, cz - len / 2], [cx, cy, cz + len / 2], r, r, seg, { role, c: r * 0.04, panel: o.panel ?? 3.5, capA: o.capA ?? true, capB: o.capB ?? true }, 'hull', DETAIL.MASS);
    // 帯の装甲板（寄ったときだけ）：縦に並ぶ帯を少し浮かせる
    const nb = Math.max(2, Math.round(len / 5.5));
    for (let k = 0; k < nb; k++) {
      const z0 = cz - len / 2 + (k + 0.08) * len / nb; const z1 = cz - len / 2 + (k + 0.92) * len / nb;
      const R = rng(hash3(cx, cy + k, cz) * 1e5);
      const segs = R.splits(Math.PI * 2, 3.2 / r, 0.4);
      let a0 = R() * 0.3;
      for (const da of segs) {
        if (R() < 0.12) { a0 += da; continue; }
        const th = R() < 0.15 ? 0.32 : 0.12;
        const pr = r + th; const g = 0.05 / r;
        const pts = [];
        const sub = Math.max(1, Math.round(da / 0.4));
        for (let s = 0; s <= sub; s++) { const ang = a0 + g + (da - 2 * g) * s / sub; pts.push([Math.cos(ang), Math.sin(ang)]); }
        B.part('plate', DETAIL.FINE, () => {
          for (let s = 0; s < sub; s++) {
            const p0 = pts[s]; const p1 = pts[s + 1];
            const c8 = [];
            for (let i = 0; i < 8; i++) { const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1; const pp = ix ? p1 : p0; const rr = iy ? pr : r; c8.push([cx + pp[0] * rr, cy + pp[1] * rr, iz ? z1 : z0]); }
            B._hexa(c8, { role: R() < 0.12 ? ROLE.PAINT2 : role, c: 0.04, rnd: R(), p1: da * r * B.s, p2: (z1 - z0) * B.s });
          }
        });
        a0 += da;
      }
    }
    return false;
  }
  // 壊れた円筒：多角形の面ごとに板の帯で殻を作る
  const t = 0.35;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2; const a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cz - len / 2]; const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cz - len / 2];
    const u = V.norm(V.sub(p1, p0)); const w = V.dist(p0, p1);
    const nrm = V.norm([Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]);
    const f = { fi: 20 + i, o: p0, u, v: [0, 0, 1], n: nrm, W: w, H: len };
    tileFace(B, f, 3.4, t, { role });
  }
  // 輪の骨組みと、軸に沿う縦の骨
  const nf = Math.max(2, Math.round(len / 4.5));
  for (let k = 0; k <= nf; k++) {
    const z = cz - len / 2 + k * len / nf;
    if (!B.dmg.nearDamage(B.toW([cx, cy, z]), r * 1.2)) continue;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2; const a1 = ((i + 1) / seg) * Math.PI * 2; const rr = r - t * 1.5;
      B.beam([cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, z], [cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, z], 0.35, 0.6, { role: ROLE.INNER, up: [0, 0, 1] });
    }
  }
  for (let i = 0; i < seg; i += 2) {
    const ang = (i / seg) * Math.PI * 2; const rr = r - t * 1.2;
    B.beam([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, cz - len / 2], [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, cz + len / 2], 0.4, 0.4, { role: ROLE.DARK, up: [Math.cos(ang), Math.sin(ang), 0] });
  }
  // 中の床（区画を横切る2枚）
  for (const y of [-r * 0.35, r * 0.3]) {
    const hw = Math.sqrt(Math.max(0, r * r - y * y)) - t * 1.5;
    const f = { fi: 60 + Math.round(y), o: [cx - hw, cy + y, cz - len / 2 + 0.3], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], W: hw * 2, H: len - 0.6 };
    tileFace(B, f, 3.6, 0.35, { role: ROLE.DECK, edgeRole: ROLE.HONEY, cutRole: ROLE.HONEY }, (p) => B.dmg.nearDamage(p, 6));
  }
  return true;
}
