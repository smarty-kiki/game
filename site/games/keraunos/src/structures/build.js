// 建物1つを作る手順（three に頼らない）。
//   1回目：無傷で組み立て、大きさと部品の位置を知る
//   壊れ方を決める（穴・割れて分かれる塊）
//   2回目：同じ種で組み立て直し、壊れた所の板を破る・梁を折る・中身を作る
//   穴の中の小物を消し、塊を動かし、距離で省く段ごとに三角形を並べ、隅の暗さの格子を焼き、破片を並べる
// 戻り値はそのまま GPU の頂点の配列にできる形（mesh.js が three の形にする）。

import { Builder, rng, DETAIL, V, LIT_ROLES, ROLE, setPropsMode, propsMode } from './core.js';
import { makeDamage, applyChunks, makeDebris } from './damage.js';
import { KINDS } from './kinds.js';

export { KINDS };

// 並べ方の種類（基地全体・街区）：建物ごとに作り、置き場所と向きを添えて返す。
// 壊れ具合は建物ごとにばらつかせる（全部が同じだけ壊れていると作り物に見える）
export function generateAny(params) {
  const K = KINDS[params.kind];
  if (!K || !K.layout) return generate(params);
  const S = params.size ?? K.size;
  const seed = params.seed ?? 1;
  const R = rng(seed * 1.37 + 0.5);
  const items = K.layout(R, S);
  const dmg = params.damage ?? 0;
  const out = [];
  for (const it of items) {
    const k = it.dmgK ?? (0.3 + R() * 1.3);
    // ramp：x の向きに壊れ具合を増やす（左は無傷、右は崩れた街区。目標の絵6の構図）
    const ramp = params.ramp ? Math.min(1, Math.max(0, (it.pos[0] / S + 0.15) * 2.2)) : 1;
    const d = Math.min(1, dmg * k * ramp * (R() < 0.2 && !params.ramp ? 0 : 1) * (params.ramp ? 1.4 : 1));
    out.push({ g: generate({ ...params, kind: it.kind, size: it.S, seed: it.seed, damage: d, opts: it.opts }), pos: it.pos, ry: it.ry });
  }
  return { layout: true, kind: params.kind, S, items: out, ground: !!K.ground };
}

// params：{ kind, size, damage 0〜1, heat 0〜1, seed, debris（破片の量の倍率）, aoRes（格子の細かさ） }
export function generate(params) {
  // params.props：小物の一式で描くか（Worker の中では場面の設定が見えないので、引数で渡す）
  if (params.props === undefined) return generateInner(params);
  const prev = propsMode();
  setPropsMode(params.props);
  try { return generateInner(params); } finally { setPropsMode(prev); }
}

function generateInner(params) {
  const t0 = nowMs();
  const kind = params.kind || 'tower';
  const K = KINDS[kind];
  if (!K || !K.build) throw new Error(`建物の種類がない: ${kind}`);
  const S = params.size ?? K.size;
  const seed = params.seed ?? 1;
  const damage = Math.max(0, Math.min(1, params.damage ?? 0));
  const heat = params.heat ?? 0.6;
  const opts = { S, ...(params.opts || {}) };

  const B1 = new Builder();
  K.build(B1, rng(seed), opts);
  let B = B1; let D = null;
  if (damage > 0.02) {
    D = makeDamage(B1, { damage, heat, ground: !!K.ground, seed });
    B = new Builder({ dmg: D });
    K.build(B, rng(seed), opts);
    // 穴の中の小物（板の殻以外）を消して破片の元にする
    for (const p of B.parts) {
      if (p.kind === 'tile' || p.kind === 'hull') continue;
      const { t } = D.inBreach(p.c);
      if (t < 1) { p.removed = true; if (p.size > 0.8) D.debris.push({ kind: p.kind === 'beam' ? 'girder' : 'chunk', p: p.c, s: p.size }); }
    }
  }
  applyChunks(B, D);
  // 小物：穴の中の物は消し、割れて動いた塊に付いた物はその塊と一緒に動かす
  const props = [];
  for (const pr of B.propList) {
    const p = [pr.m[12], pr.m[13], pr.m[14]];
    if (D && D.inBreach(p).t < 1) continue;
    let m = pr.m;
    if (D && D.seeds.length > 1) { const c = pr.chunk >= 0 ? pr.chunk : D.chunkOf(p).i; m = mul4(D.xf[c], m); }
    props.push({ type: pr.type, m, rnd: pr.rnd });
  }
  const tGen = nowMs() - t0;

  // ---- 区画（大きな建物だけ）と、距離で省く段ごとに三角形を並べる ----
  // 段の切り替えを建物の中心までの距離で決めると、大きな建物（甲板 900m など）では 1km 先でも細かい部品まで描いてしまう。
  // 大きな建物は区画に分け、区画ごとに [塊→中→細] の順に並べる（区画の先頭からの数で段を描き分ける）。画面外の区画も描かない
  const CELL = params.cell ?? 180;
  const live = B.parts.filter((p) => !p.removed);
  let pmn = [Infinity, Infinity, Infinity]; let pmx = [-Infinity, -Infinity, -Infinity];
  for (const p of live) for (let a = 0; a < 3; a++) { pmn[a] = Math.min(pmn[a], p.min[a]); pmx[a] = Math.max(pmx[a], p.max[a]); }
  const big = Math.max(pmx[0] - pmn[0], pmx[2] - pmn[2]) > CELL * 1.6;
  const cellMap = new Map();
  for (const p of live) {
    const key = big ? `${Math.floor((p.c[0] - pmn[0]) / CELL)}_${Math.floor((p.c[2] - pmn[2]) / CELL)}` : '0';
    if (!cellMap.has(key)) cellMap.set(key, [[], [], []]);
    cellMap.get(key)[p.detail].push(p);
  }
  const nIdx = live.reduce((s, p) => s + (p.i1 - p.i0), 0);
  const index = new Uint32Array(nIdx);
  let k = 0;
  const cells = [];
  const totals = [0, 0, 0];
  for (const tiers of cellMap.values()) {
    const start = k; const counts = [];
    let cmn = [Infinity, Infinity, Infinity]; let cmx = [-Infinity, -Infinity, -Infinity];
    for (let d = 0; d < 3; d++) {
      for (const p of tiers[d]) {
        for (let i = p.i0; i < p.i1; i++) index[k++] = B.I[i];
        for (let a = 0; a < 3; a++) { cmn[a] = Math.min(cmn[a], p.min[a]); cmx[a] = Math.max(cmx[a], p.max[a]); }
      }
      counts.push(k - start);
    }
    // 段0（寄り）＝全部、段1（中くらい）＝塊と中、段2（遠く）＝塊だけ
    const lod = [counts[2], counts[1], counts[0]];
    for (let d = 0; d < 3; d++) totals[d] += lod[d];
    cells.push({ start, lod, min: cmn, max: cmx });
  }
  const lodCounts = totals;

  // ---- 大きさ ----
  let mn = [Infinity, Infinity, Infinity]; let mx = [-Infinity, -Infinity, -Infinity];
  const P = B.P;
  for (const p of B.parts) {
    if (p.removed) continue;
    for (let v = p.v0; v < p.v1; v++) for (let a = 0; a < 3; a++) { const x = P[v * 3 + a]; if (x < mn[a]) mn[a] = x; if (x > mx[a]) mx[a] = x; }
  }

  const ao = bakeAO(B, mn, mx, params.aoRes ?? 56);
  const debris = makeDebris(D, seed, params.debris ?? 1);
  // 灯りの点（遠くでも見える点の板）。壊れた塊に付いた灯りは、塊の動きに合わせる
  const lights = B.lights.map((l) => ({ ...l }));
  if (D && D.seeds.length > 1) for (const l of lights) { const c = D.chunkOf(l.p).i; l.p = applyM(D.xf[c], l.p); }

  return {
    kind, S, seed, damage, heat, ground: !!K.ground,
    position: new Float32Array(B.P), normal: new Float32Array(B.N), uv: new Float32Array(B.UV),
    aMat: new Float32Array(B.A), aExt: new Float32Array(B.E), index, lodCounts,
    min: mn, max: mx, ao, debris, lights, props, cells,
    damageInfo: D ? { breaches: D.breaches.map((b) => ({ c: b.c, r: b.r })), chunks: D.seeds.length } : null,
    // 確認用：params.debugParts のとき、部品ごとの種類・段・三角形の数を出す（重い部品を探す）
    parts: params.debugParts ? live.map((p) => ({ kind: p.kind, detail: p.detail, tris: (p.i1 - p.i0) / 3 })) : undefined,
    stats: { props: props.length, tris: lodCounts.map((c) => c / 3), verts: B.P.length / 3, parts: B.parts.length, removed: B.parts.filter((p) => p.removed).length, debris: debris.length, lights: lights.length, ms: nowMs() - t0, genMs: tGen },
  };
}

const mul4 = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const applyM = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// ---- 隅の暗さの格子 ----
// 面の上に点を撒いて、部品が占める格子の升を数え、2つの広さでぼかす。
// 材質は「面から法線の向きに少し離れた所」の詰まり具合を読む（隅・根元・奥・建物のあいだほど詰まっている）。
// R＝狭い範囲（約3升）、G＝広い範囲（約9升）。ゲームの後処理に隅を暗くする処理がないので、材質の中で持つ
function bakeAO(B, mn, mx, res) {
  const ext = V.sub(mx, mn);
  const big = Math.max(ext[0], ext[1], ext[2], 1);
  const cell = Math.max(0.5, big / res);
  const pad = 3;
  const dims = ext.map((e) => Math.min(128, Math.max(4, Math.ceil(e / cell) + pad * 2)));
  const [nx, ny, nz] = dims;
  const o = V.sub(mn, [pad * cell, pad * cell, pad * cell]);
  const occ = new Float32Array(nx * ny * nz);
  const P = B.P; const I = B.I;
  const step = cell * 0.5;
  for (const part of B.parts) {
    if (part.removed) continue;
    for (let i = part.i0; i < part.i1; i += 3) {
      const a = I[i] * 3; const b = I[i + 1] * 3; const c = I[i + 2] * 3;
      const A = [P[a], P[a + 1], P[a + 2]]; const Bv = [P[b], P[b + 1], P[b + 2]]; const C = [P[c], P[c + 1], P[c + 2]];
      const e1 = V.sub(Bv, A); const e2 = V.sub(C, A);
      const l1 = V.len(e1); const l2 = V.len(e2);
      const n1 = Math.max(1, Math.ceil(l1 / step)); const n2 = Math.max(1, Math.ceil(l2 / step));
      for (let u = 0; u <= n1; u++) for (let w = 0; w <= n2 - Math.floor(u * n2 / n1); w++) {
        const s = u / n1; const t = w / n2;
        if (s + t > 1.0001) continue;
        const x = Math.floor((A[0] + e1[0] * s + e2[0] * t - o[0]) / cell);
        const y = Math.floor((A[1] + e1[1] * s + e2[1] * t - o[1]) / cell);
        const z = Math.floor((A[2] + e1[2] * s + e2[2] * t - o[2]) / cell);
        if (x < 0 || y < 0 || z < 0 || x >= nx || y >= ny || z >= nz) continue;
        occ[x + nx * (y + ny * z)] = 1;
      }
    }
  }
  const blur = (src, r) => {
    let a = src; let tmp = new Float32Array(a.length);
    const axes = [[1, nx], [nx, ny], [nx * ny, nz]];
    for (const [stride, n] of axes) {
      tmp = new Float32Array(a.length);
      for (let idx = 0; idx < a.length; idx++) {
        const coord = Math.floor(idx / stride) % n;
        let s = 0; let cnt = 0;
        for (let d = -r; d <= r; d++) { const q = coord + d; if (q < 0 || q >= n) { cnt++; continue; } s += a[idx + d * stride]; cnt++; }
        tmp[idx] = s / cnt;
      }
      a = tmp;
    }
    return a;
  };
  const near = blur(occ, 1);
  const wide = blur(blur(occ, 2), 2);
  // RGBA（R＝狭い範囲、G＝広い範囲）。RG の2つだけの3D画像は WebGPU で読めない環境があったため4つにする
  const data = new Uint8Array(nx * ny * nz * 4);
  for (let i = 0; i < occ.length; i++) { data[i * 4] = Math.min(255, Math.round(near[i] * 255)); data[i * 4 + 1] = Math.min(255, Math.round(wide[i] * 255)); data[i * 4 + 3] = 255; }
  return { data, dims, origin: o, size: [nx * cell, ny * cell, nz * cell], cell };
}

// 確認用：役割ごとの三角形の数
export function roleStats(g) {
  const out = {};
  for (let v = 0; v < g.aMat.length / 4; v++) { const r = g.aMat[v * 4]; out[r] = (out[r] || 0) + 1; }
  return out;
}
export { ROLE, DETAIL, LIT_ROLES };
