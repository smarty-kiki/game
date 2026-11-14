// 壊れ方。無傷の形（1回目の組み立て）から、穴の位置と大きさ・割れて分かれる塊（ボロノイ分割）を決め、
// 2回目の組み立てのあいだ、部品ごとに「消す・ぎざぎざに破る・めくる・折って曲げる・焦がす」を判断する。
// 割れ口の位置は座標から決まる雑音で揺らすので、割れた板の左右・梁の折れ目・焦げと熱の場が同じ線にそろう。

import { M4, V, rng, hash3, fbm3, noise3, DETAIL } from './core.js';

// d：壊れ具合 0〜1、heat：割れ口の熱さ 0〜1（壊れたばかり＝1、古い残骸＝0）、ground：地上（塊は倒れて地面に落ちる）
export function makeDamage(B1, { damage: d = 0.5, heat = 0.6, ground = false, seed = 1 } = {}) {
  const R = rng(seed * 7.31 + 3.7);
  let mn = [Infinity, Infinity, Infinity]; let mx = [-Infinity, -Infinity, -Infinity];
  for (const p of B1.parts) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p.min[k]); mx[k] = Math.max(mx[k], p.max[k]); }
  const ext = V.sub(mx, mn);
  const S = Math.max(ext[0], ext[1], ext[2]);
  const cen = V.mul(V.add(mn, mx), 0.5);

  // ---- 穴 ----
  // 大きな部品の表面に置く（形の中の空中に置かない）。大きい部品ほど選ばれやすい
  const big = B1.parts.filter((p) => p.detail === DETAIL.MASS && p.size > S * 0.05);
  const pool = big.length ? big : B1.parts;
  const wsum = pool.reduce((s, p) => s + p.size, 0);
  const pickPart = () => { let r = R() * wsum; for (const p of pool) { r -= p.size; if (r <= 0) return p; } return pool[pool.length - 1]; };
  const nb = d < 0.04 ? 0 : 1 + Math.floor(d * 3.2 + R() * 1.3);
  const breaches = [];
  for (let i = 0; i < nb; i++) {
    const p = pickPart();
    // 部品の箱の表面の点（形の中心から外へ向かう面）
    const dir = V.norm(V.add(V.sub(p.c, cen), [R() - 0.5, (R() - 0.5) * 0.6, R() - 0.5].map((x) => x * S * 0.3)));
    const half = V.mul(V.sub(p.max, p.min), 0.5);
    let tmax = Infinity;
    for (let k = 0; k < 3; k++) if (Math.abs(dir[k]) > 1e-4) tmax = Math.min(tmax, half[k] / Math.abs(dir[k]));
    const c = V.add(p.c, V.mul(dir, tmax * (0.75 + R() * 0.3)));
    const r = Math.max(2.5, S * (0.05 + 0.13 * d) * (0.6 + R() * 0.8) * (i === 0 ? 1.25 : 1));
    breaches.push({ c, r, k: 0.12 + R() * 0.1, seed: R() * 100 });
  }

  // ---- 割れて分かれる塊（ボロノイ分割） ----
  const seeds = [];
  if (d >= 0.35) {
    const nc = 2 + Math.floor((d - 0.35) / 0.65 * 3.5 + R() * 1.2);
    let tries = 0;
    while (seeds.length < nc && tries++ < 200) {
      const p = [0, 1, 2].map((k) => mn[k] + ext[k] * (0.12 + 0.76 * R()));
      if (ground) p[1] = mn[1] + ext[1] * (0.15 + 0.7 * R());
      if (seeds.every((q) => V.dist(p, q) > S * 0.28)) seeds.push(p);
    }
  }
  // 塊ごとの動き：中心から離れて少し回る。地上は倒れて地面へ（いちばん低い塊は立ったまま残る）
  const xf = seeds.map((s, i) => {
    if (ground) {
      const low = seeds.reduce((a, q, j) => (q[1] < seeds[a][1] ? j : a), 0);
      if (i === low) return M4.ident();
      const hd = V.norm([s[0] - cen[0] + (R() - 0.5) * S * 0.2, 0, s[2] - cen[2] + (R() - 0.5) * S * 0.2]);
      const axis = V.norm(V.cross([0, 1, 0], hd));
      const ang = d * (0.015 + R() * 0.06);
      const pivot = [s[0] + hd[0] * ext[0] * 0.2, mn[1], s[2] + hd[2] * ext[2] * 0.2];
      return M4.mul(M4.compose(hd[0] * S * d * 0.02, -(s[1] - mn[1]) * d * 0.35, hd[2] * S * d * 0.02), M4.rotAround(pivot, axis, ang));
    }
    const dir = V.norm(V.add(V.sub(s, cen), [R() - 0.5, R() - 0.5, R() - 0.5].map((x) => x * S * 0.25)));
    const dist = S * d * (0.05 + 0.08 * R());
    const axis = V.norm([R() - 0.5, R() - 0.5, R() - 0.5]);
    const ang = d * (0.03 + R() * 0.12) * (R() < 0.5 ? -1 : 1);
    return M4.mul(M4.compose(dir[0] * dist, dir[1] * dist, dir[2] * dist), M4.rotAround(s, axis, ang));
  });

  const D = {
    d, heat, ground, S, min: mn, max: mx, center: cen, breaches, seeds, xf, debris: [],
    // 穴 i の、点 p の方向での半径（雑音で揺らしてぎざぎざにする）
    breachR(b, p) { return b.r * (1 + (fbm3(p[0] * b.k + b.seed, p[1] * b.k, p[2] * b.k) - 0.5) * 0.55); },
    // いちばん近い塊と2番目、その差（小さいほど割れ目に近い）
    chunkOf(p) {
      if (seeds.length < 2) return { i: 0, j: 0, gap: Infinity };
      let i = -1; let j = -1; let di = Infinity; let dj = Infinity;
      for (let k = 0; k < seeds.length; k++) {
        const dd = V.dist(p, seeds[k]);
        if (dd < di) { dj = di; j = i; di = dd; i = k; } else if (dd < dj) { dj = dd; j = k; }
      }
      // 2つの種の垂直二等分面からの距離
      const n = V.norm(V.sub(seeds[j], seeds[i]));
      const m = V.mul(V.add(seeds[i], seeds[j]), 0.5);
      return { i, j, gap: Math.abs(V.dot(V.sub(p, m), n)), n, m };
    },
    // 点がどれだけ穴の中か（<1 で中）。最も深い穴を返す
    inBreach(p) {
      let best = { t: Infinity, b: null };
      // 穴の半径の揺れは ±3割以内なので、遠い点は揺れを計算せずに測る
      for (const b of breaches) { const dd = V.dist(p, b.c); const t = dd > b.r * 1.3 ? dd / b.r : dd / D.breachR(b, p); if (t < best.t) best = { t, b }; }
      return best;
    },
    // 熱と焦げの場（頂点ごと）
    field(p) {
      let heatF = 0; let soot = 0;
      for (const b of breaches) {
        const dist = V.dist(p, b.c);
        if (dist > b.r * 2.6) continue;
        const rj = D.breachR(b, p);
        const t = dist / rj;
        soot = Math.max(soot, Math.pow(Math.max(0, Math.min(1, (1.7 - t) / 0.9)), 1.6) * (0.5 + 0.5 * noise3(p[0] * 0.4, p[1] * 0.4, p[2] * 0.4)));
        heatF = Math.max(heatF, Math.exp(-Math.abs(dist - rj) / 0.6) * 0.45);
      }
      if (seeds.length > 1) {
        const c = D.chunkOf(p);
        soot = Math.max(soot, Math.exp(-c.gap / 2.2) * 0.55);
        heatF = Math.max(heatF, Math.exp(-c.gap / 0.6) * 0.4);
      }
      return { heat: heatF * heat, soot: Math.min(1, soot * Math.min(1, 0.4 + d)) };
    },
    // 灯りが生きているか：0＝消えた、1＝点いている、0.5＝またたく
    lightAlive(p) {
      const { t } = D.inBreach(p);
      const g = seeds.length > 1 ? D.chunkOf(p).gap : Infinity;
      if (t < 1.5 || g < 5) return 0;
      const h = hash3(p[0] * 0.37, p[1] * 0.37, p[2] * 0.37);
      if (h < d * 0.45) return 0;
      if (t < 2.6 || g < 14) return h < 0.6 ? 0.5 : 0;
      return 1;
    },
    // 箱（組み立て座標の最小・最大）が壊れた所に掛かるか
    touchesBox(a, b) {
      for (const br of breaches) {
        let dd = 0;
        for (let k = 0; k < 3; k++) { const v = Math.max(a[k] - br.c[k], 0, br.c[k] - b[k]); dd += v * v; }
        if (Math.sqrt(dd) < br.r * 1.4) return true;
      }
      if (seeds.length > 1) {
        const first = D.chunkOf(V.mul(V.add(a, b), 0.5)).i;
        for (let i = 0; i < 8; i++) {
          const p = [i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]];
          if (D.chunkOf(p).i !== first) return true;
        }
      }
      return false;
    },
    // 壊れた所の近くか（中の床・骨組みを作る範囲）
    nearDamage(p, margin = 6) {
      for (const b of breaches) if (V.dist(p, b.c) < b.r * 1.35 + margin) return true;
      return seeds.length > 1 && D.chunkOf(p).gap < margin;
    },
    // 梁：穴の中を消し、割れ目で折る。残った端は曲げて細くする（ちぎれた鉄骨）
    beam(B, a, b, w, h, o, dt) {
      const aw = B.toW(a); const bw = B.toW(b);
      const L = V.dist(a, b);
      const n = Math.max(2, Math.ceil(L * B.s / 0.6));
      // 区間の各点：穴の中か、どの塊か
      const st = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n; const p = V.lerp(aw, bw, t);
        st.push({ t, out: D.inBreach(p).t >= 1, ch: seeds.length > 1 ? D.chunkOf(p).i : 0 });
      }
      // 残す区間 [t0, t1] と、端が折れ目か
      const keep = [];
      let cur = null;
      for (let i = 0; i <= n; i++) {
        const s = st[i];
        if (s.out && cur && st[i - 1].ch !== s.ch) { cur.t1 = (st[i - 1].t + s.t) / 2 - 0.25 / L; cur.e1 = true; keep.push(cur); cur = { t0: (st[i - 1].t + s.t) / 2 + 0.25 / L, s0: true }; continue; }
        if (s.out && !cur) cur = { t0: s.t, s0: i > 0 };
        if (!s.out && cur) { cur.t1 = st[i - 1].t; cur.e1 = true; keep.push(cur); cur = null; }
      }
      if (cur) { cur.t1 = 1; cur.e1 = false; keep.push(cur); }
      if (keep.length === 1 && !keep[0].s0 && !keep[0].e1) { B._beamSeg(a, b, w, h, o, dt); return; }
      // 消えた区間は破片の元
      let prev = 0;
      for (const k of keep) { if (k.t0 - prev > 0.15) D.debris.push({ kind: 'girder', p: V.lerp(aw, bw, (prev + k.t0) / 2), s: (k.t0 - prev) * L * B.s, w: w * B.s, dir: V.norm(V.sub(bw, aw)) }); prev = k.t1; }
      const dir = V.norm(V.sub(b, a));
      for (const k of keep) {
        const len = (k.t1 - k.t0) * L;
        if (len < Math.max(w, h) * 0.8) continue;
        const pa = V.lerp(a, b, k.t0); const pb = V.lerp(a, b, k.t1);
        const bend = (P, sgn) => {
          // 折れた端：長さ lb を角度 ang だけ曲げ、先を細く
          const lb = Math.min(len * 0.38, Math.max(w, h) * 6, 3 / B.s);
          const hh = hash3(P[0] * 1.7 + 3, P[1] * 1.7, P[2] * 1.7);
          const [u, v] = V.perp(dir, [0, 1, 0]);
          const ax = V.norm(V.add(V.mul(u, Math.cos(hh * 6.28)), V.mul(v, Math.sin(hh * 6.28))));
          const ang = (0.25 + 0.85 * hh) * Math.min(1, 0.35 + d) * sgn;
          const start = V.add(P, V.mul(dir, -lb * sgn));
          const m = M4.rotAround(start, ax, ang);
          return { start, tip: M4.apply(m, P), lb };
        };
        let a2 = pa; let b2 = pb;
        if (k.s0) { const r = bend(pa, -1); B._beamSeg(r.tip, r.start, w, h, o, dt, 0.5, 1); a2 = r.start; }
        if (k.e1) { const r = bend(pb, 1); B._beamSeg(r.start, r.tip, w, h, o, dt, 1, 0.5); b2 = r.start; }
        if (V.dist(a2, b2) > 0.05) B._beamSeg(a2, b2, w, h, o, dt);
      }
    },
  };
  return D;
}

// 塊ごとの動きを頂点へ掛ける（部品の塊は中心で決める。割れ目で切った半分は作るときに決めた塊）
export function applyChunks(B, D) {
  if (!D || D.seeds.length < 2) { for (const p of B.parts) p.chunk = 0; return; }
  const P = B.P; const N = B.N;
  for (const part of B.parts) {
    if (part.chunk < 0) part.chunk = D.chunkOf(part.c).i;
    const m = D.xf[part.chunk];
    for (let v = part.v0; v < part.v1; v++) {
      const p = M4.apply(m, [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]);
      const n = M4.applyDir(m, [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]]);
      P[v * 3] = p[0]; P[v * 3 + 1] = p[1]; P[v * 3 + 2] = p[2];
      N[v * 3] = n[0]; N[v * 3 + 1] = n[1]; N[v * 3 + 2] = n[2];
    }
    part.c = M4.apply(m, part.c);
  }
  for (const db of D.debris) { const c = D.chunkOf(db.p).i; db.p = M4.apply(D.xf[c], db.p); }
  // 地上：倒れた塊が地面にめり込まないように持ち上げる
  if (D.ground) {
    const low = new Array(D.seeds.length).fill(Infinity);
    for (const part of B.parts) for (let v = part.v0; v < part.v1; v++) low[part.chunk] = Math.min(low[part.chunk], P[v * 3 + 1]);
    for (const part of B.parts) {
      const lift = Math.max(0, D.min[1] - 0.3 - low[part.chunk]);
      if (lift > 0) for (let v = part.v0; v < part.v1; v++) P[v * 3 + 1] += lift;
    }
  }
}

// 破片の一覧：消えた部品からと、穴・割れ目のまわりに散らす小さな破片
// 戻り値：[{ shape, p, q:[x,y,z,w], s, spin:[ax,ay,az,速さ], vel:[...], heat }]
export function makeDebris(D, seed = 1, count = 1) {
  if (!D) return [];
  const R = rng(seed * 3.17 + 11);
  const out = [];
  const randQ = () => { const u1 = R(); const u2 = R() * 6.2832; const u3 = R() * 6.2832; const a = Math.sqrt(1 - u1); const b = Math.sqrt(u1); return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)]; };
  const SHAPES = ['plate', 'plate', 'girder', 'chunk', 'pipe', 'shard', 'shard'];
  const add = (p, s, shape, out0, heat) => {
    const ax = V.norm([R() - 0.5, R() - 0.5, R() - 0.5]);
    out.push({ shape, p, q: randQ(), s, spin: D.ground ? [0, 1, 0, 0] : [...ax, (0.05 + R() * 0.5) / Math.max(0.6, Math.sqrt(s))], vel: D.ground ? [0, 0, 0] : V.mul(out0, 0.15 + R() * 0.9), heat });
  };
  // 消えた部品の一部を、元の大きさで残す（大きい破片は少ない）
  for (const db of D.debris) {
    if (R() > 0.3 * count) continue;
    const away = V.norm(V.sub(db.p, D.center));
    const p = D.ground ? [db.p[0] + (R() - 0.5) * 4, D.min[1], db.p[2] + (R() - 0.5) * 4] : V.add(db.p, V.mul(away, 1 + db.s * R() * 1.5));
    const shape = db.kind === 'girder' ? 'girder' : R() < 0.75 ? 'plate' : 'shard';
    add(p, Math.max(0.4, Math.min(db.s, shape === 'girder' ? 6 : 3.2)) * (0.45 + R() * 0.4), shape, away, R() < 0.2 ? D.heat * R() * 0.6 : 0);
  }
  // 穴のまわり：小さいほど多い（大きさは対数で一様）。穴に近いほど密
  for (const b of D.breaches) {
    const n = Math.floor((24 + b.r * 1.6) * count * (0.5 + D.d));
    const out0 = V.norm(V.sub(b.c, D.center));
    for (let i = 0; i < n; i++) {
      const dir = V.norm(V.add(V.mul(out0, 1.2), [R() - 0.5, R() - 0.5, R() - 0.5].map((x) => x * 2)));
      const dist = b.r * (0.7 + Math.pow(R(), 1.8) * (D.ground ? 1.4 : 2.4));
      let p = V.add(b.c, V.mul(dir, dist));
      if (D.ground) p = [p[0], D.min[1] + R() * 0.3, p[2]];
      // 大きさは対数で一様（小さいほど多い）。いちばん大きくても 2.5m
      const s = Math.exp(Math.log(0.12) + Math.pow(R(), 1.4) * Math.log(Math.min(2.5, Math.max(1.2, b.r * 0.12)) / 0.12));
      add(p, s, R() < 0.15 ? 'girder' : SHAPES[Math.floor(R() * SHAPES.length)], dir, dist < b.r * 1.1 && R() < 0.25 ? D.heat * R() * 0.7 : 0);
    }
  }
  // 割れ目の間：塊のあいだに漂う破片
  if (D.seeds.length > 1) {
    for (let a = 0; a < D.seeds.length; a++) for (let c = a + 1; c < D.seeds.length; c++) {
      const m = V.mul(V.add(D.seeds[a], D.seeds[c]), 0.5);
      const n = Math.floor(14 * count * D.d);
      for (let i = 0; i < n; i++) {
        const p = V.add(m, [R() - 0.5, R() - 0.5, R() - 0.5].map((x) => x * D.S * 0.25));
        if (D.ground) p[1] = D.min[1] + R() * 0.4;
        const s = Math.exp(Math.log(0.15) + Math.pow(R(), 1.4) * Math.log(2.2 / 0.15));
        add(p, s, SHAPES[Math.floor(R() * SHAPES.length)], V.norm(V.sub(p, D.center)), 0);
      }
    }
  }
  return out;
}
