// 建物・建造物を部品から組み立てる土台。three に頼らない純粋な JS なので、ゲームとノードの試験の両方から使える。
//
// 形は「部品」の集まりとして持つ。部品ごとに頂点の範囲・中心・大きさ・細かさ（距離で省く段）を記録し、
// 壊れ方（damage.js）と距離による面数の切り替え（build.js）はこの記録の上で行う。
// 頂点は面ごとに持つ（共有しない）。硬い表面は面の向きがそのまま光を返すほうが本物らしいため。
//
// 頂点の属性（材質 material.js が読む）：
//   position・normal・uv（面の上の位置。メートル。縦の面は v が高さ＝汚れが下へ垂れる向き）
//   aMat = 役割（ROLE）・縁（面取りの面＝1）・部品ごとの乱数・根元の暗さの強さ
//   aExt = 熱（新しい割れ口）・焦げ・p1・p2（役割ごとの寸法：板の大きさ、窓の間隔と階の高さ など）

export const ROLE = {
  PAINT: 0, PAINT2: 1, DARK: 2, BARE: 3, RED: 4, HAZARD: 5, FACADE: 6, GLASS: 7, LAMP: 8, BEACON: 9, STRIP: 10,
  INNER: 11, CONCRETE: 12, CORRUGATED: 13, RUST: 14, GRILLE: 15, DECK: 16, HONEY: 17, CABLE: 18, GROUND: 19, GLOW: 20,
};
export const ROLE_COUNT = 21;
// 灯りの役割（壊れた所では消える）
export const LIT_ROLES = new Set([ROLE.LAMP, ROLE.BEACON, ROLE.STRIP]);
// 距離で省く段：MASS＝どの距離でも描く塊、MID＝中くらいまで、FINE＝寄ったときだけ
export const DETAIL = { MASS: 0, MID: 1, FINE: 2 };

// ---- 乱数（種が同じなら同じ並び） ----
export function rng(seed) {
  let a = (Math.floor(seed * 1013904223) ^ 0x9e3779b9) >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.chance = (p) => f() < p;
  // 合計が total になる、ばらつきのある区切り（板・窓・区画の幅）
  f.splits = (total, target, jitter = 0.45) => {
    const n = Math.max(1, Math.round(total / target));
    const w = [];
    for (let i = 0; i < n; i++) w.push(1 + (f() * 2 - 1) * jitter);
    const s = w.reduce((x, y) => x + y, 0);
    return w.map((x) => x * total / s);
  };
  return f;
}

// ---- 位置から決まる雑音（乱数の並びを消費しない。割れ目のぎざぎざ・色のばらつきに使う） ----
const fr = (x) => x - Math.floor(x);
export function hash3(x, y, z) { return fr(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453); }
// 整数の格子点の hash（雑音の中で何度も呼ぶので、sin を使わない速い式）
function ih(x, y, z) {
  let h = (Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function noise3(x, y, z) {
  const ix = Math.floor(x); const iy = Math.floor(y); const iz = Math.floor(z);
  const fx = x - ix; const fy = y - iy; const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx); const uy = fy * fy * (3 - 2 * fy); const uz = fz * fz * (3 - 2 * fz);
  const a = ih(ix, iy, iz); const b = ih(ix + 1, iy, iz); const c = ih(ix, iy + 1, iz); const d = ih(ix + 1, iy + 1, iz);
  const e = ih(ix, iy, iz + 1); const f = ih(ix + 1, iy, iz + 1); const g = ih(ix, iy + 1, iz + 1); const h = ih(ix + 1, iy + 1, iz + 1);
  const x0 = a + (b - a) * ux; const x1 = c + (d - c) * ux; const x2 = e + (f - e) * ux; const x3 = g + (h - g) * ux;
  const y0 = x0 + (x1 - x0) * uy; const y1 = x2 + (x3 - x2) * uy;
  return y0 + (y1 - y0) * uz;
}
export function fbm3(x, y, z) { return noise3(x, y, z) * 0.62 + noise3(x * 2.03 + 17, y * 2.03, z * 2.03) * 0.38; }

// 伸びる Float32Array（頂点の配列。普通の配列へ何十万回も足すと遅い）
class Buf {
  constructor(n = 4096) { this.a = new Float32Array(n); this.n = 0; }
  need(k) { if (this.n + k > this.a.length) { const b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } }
  view() { return this.a.subarray(0, this.n); }
}
class IBuf {
  constructor(n = 8192) { this.a = new Uint32Array(n); this.n = 0; }
  need(k) { if (this.n + k > this.a.length) { const b = new Uint32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a.subarray(0, this.n)); this.a = b; } }
  view() { return this.a.subarray(0, this.n); }
}

// ---- 4x4 行列（列優先、three と同じ並び） ----
export const M4 = {
  ident: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  },
  // 移動・回転（XYZ の順のオイラー角、three の既定と同じ）・一様な拡大
  compose(x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
    const a = Math.cos(rx); const b = Math.sin(rx); const c = Math.cos(ry); const d = Math.sin(ry); const e = Math.cos(rz); const f = Math.sin(rz);
    const ae = a * e; const af = a * f; const be = b * e; const bf = b * f;
    return [c * e * s, (af + be * d) * s, (bf - ae * d) * s, 0, -c * f * s, (ae - bf * d) * s, (be + af * d) * s, 0, d * s, -b * c * s, a * c * s, 0, x, y, z, 1];
  },
  // 軸ベクトル u・v・w と原点 o から
  basis(u, v, w, o) { return [u[0], u[1], u[2], 0, v[0], v[1], v[2], 0, w[0], w[1], w[2], 0, o[0], o[1], o[2], 1]; },
  // 軸 axis（単位）のまわりに角 ang、点 p を中心に回す
  rotAround(p, axis, ang) {
    const [x, y, z] = axis; const c = Math.cos(ang); const s = Math.sin(ang); const t = 1 - c;
    const R = [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0, t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0, t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0, 0, 0, 0, 1];
    const T1 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p[0], p[1], p[2], 1];
    const T0 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1];
    return M4.mul(T1, M4.mul(R, T0));
  },
  apply(m, p) { const [x, y, z] = p; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  applyDir(m, p) { const [x, y, z] = p; return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]; },
};

// ---- ベクトル ----
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  // a に垂直な単位ベクトル2本（hint に近い向きを優先）
  perp(a, hint = [0, 1, 0]) {
    let u = V.cross(hint, a);
    if (V.len(u) < 1e-4) u = V.cross([1, 0, 0], a);
    u = V.norm(u);
    return [u, V.norm(V.cross(a, u))];
  },
};

// 8つの角（i = x + 2y + 4z の並び）で決まる六面体の面：[軸, 向き(0/1), 4つの角]
const HEX_FACES = [];
for (let a = 0; a < 3; a++) {
  const b = (a + 1) % 3; const d = (a + 2) % 3;
  for (let s = 0; s < 2; s++) {
    const ids = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([pb, pd]) => (s << a) | (pb << b) | (pd << d));
    HEX_FACES.push([a, s, ids]);
  }
}

// 小物の一式（props.js）で描くか。true にすると、手すり・小箱・空調の箱・荷物の箱などの細かい部品を形にせず、
// 置き場所だけを記録する（場面全体で種類ごとに1回の描画になり、遠い物は描かれない）。props.js を使う場面で setPropsMode(true)
let PROPS_MODE = false;
export function setPropsMode(on) { PROPS_MODE = !!on; }
export function propsMode() { return PROPS_MODE; }

export class Builder {
  // dmg：壊れ方（damage.js の makeDamage の戻り値）。無ければ無傷の形を作る
  constructor({ dmg = null } = {}) {
    this.bP = new Buf(); this.bN = new Buf(); this.bUV = new Buf(); this.bA = new Buf(); this.bE = new Buf(); this.bI = new IBuf();
    this.parts = [];
    this.m = M4.ident(); this.stack = []; this.s = 1;
    this.group = null;
    this.dmg = dmg;
    this.forceDetail = null;
    this.lights = []; // 灯りの点（遠くでも見える点光の板に使う）
    this.chunkHint = -1; // 次の部品の塊を決めて置く（割れ目で切った半分など）
    this.propList = []; // 小物の置き場所（props.js が種類ごとにインスタンス描画する。PROP_TYPES）
    this.useProps = PROPS_MODE;
  }

  // 以降の部品に掛ける変形（入れ子にできる）
  push(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    this.stack.push([this.m, this.s]);
    this.m = M4.mul(this.m, M4.compose(x, y, z, rx, ry, rz, s));
    this.s *= s;
    return this;
  }
  pushMatrix(mat) { this.stack.push([this.m, this.s]); this.m = M4.mul(this.m, mat); return this; }
  pop() { [this.m, this.s] = this.stack.pop(); return this; }
  // 配列（読むときは今までに出した分だけ）
  get P() { return this.bP.view(); }
  get N() { return this.bN.view(); }
  get UV() { return this.bUV.view(); }
  get A() { return this.bA.view(); }
  get E() { return this.bE.view(); }
  get I() { return this.bI.view(); }
  get nVerts() { return this.bP.n / 3; }
  // 局所の点を組み立て中の形の座標へ
  toW(p) { return M4.apply(this.m, p); }

  // 部品のまとまり：中で作った面を1つの部品として記録する（手すり1本・通気口1つなど）
  part(kind, detail, fn, extra = null) {
    if (this.group) { fn(); return; }
    this._begin(kind, detail, extra);
    fn();
    this._end();
  }
  _begin(kind, detail, extra) {
    this.group = { kind, detail: this.forceDetail ?? detail, v0: this.nVerts, i0: this.bI.n, extra, chunk: this.chunkHint };
  }
  _end() {
    const g = this.group; this.group = null;
    g.v1 = this.nVerts; g.i1 = this.bI.n;
    if (g.v1 === g.v0) return null;
    let mn = [Infinity, Infinity, Infinity]; let mx = [-Infinity, -Infinity, -Infinity];
    const PA = this.bP.a;
    for (let v = g.v0; v < g.v1; v++) for (let k = 0; k < 3; k++) { const x = PA[v * 3 + k]; if (x < mn[k]) mn[k] = x; if (x > mx[k]) mx[k] = x; }
    g.min = mn; g.max = mx; g.c = V.mul(V.add(mn, mx), 0.5); g.size = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    g.removed = false;
    this.parts.push(g);
    return g;
  }
  _auto(kind, detail, fn, extra) {
    if (this.group) { fn(); return null; }
    this._begin(kind, detail, extra); fn(); return this._end();
  }

  // ---- 面を1枚出す（pts は組み立て座標の点、凸か中心から見て星形） ----
  // a：{ role, edge, rnd, base, heat, soot, p1, p2 }。inside を渡すと、その点から外へ向くように並びを直す
  // poly(pts, …, inside) が向きを反転するか（表を inside から外へ向けるため）
  _flips(pts, inside) {
    const n = pts.length; let nx = 0; let ny = 0; let nz = 0; let cx = 0; let cy = 0; let cz = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i]; const q = pts[(i + 1) % n];
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
      cx += p[0] / n; cy += p[1] / n; cz += p[2] / n;
    }
    return nx * (cx - inside[0]) + ny * (cy - inside[1]) + nz * (cz - inside[2]) < 0;
  }

  poly(pts, uvs, a, inside = null, star = false) {
    const n = pts.length;
    if (n < 3) return;
    // 面の向き（ニューウェルの方法）
    let nx = 0; let ny = 0; let nz = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i]; const q = pts[(i + 1) % n];
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    if (inside) {
      let cx = 0; let cy = 0; let cz = 0;
      for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
      cx /= n; cy /= n; cz /= n;
      if (nx * (cx - inside[0]) + ny * (cy - inside[1]) + nz * (cz - inside[2]) < 0) {
        pts = pts.slice().reverse(); uvs = uvs.slice().reverse(); nx = -nx; ny = -ny; nz = -nz;
      }
    }
    const base = this.nVerts;
    const dm = this.dmg;
    const nv = star ? n + 1 : n;
    const { bP, bN, bUV, bA, bE, bI } = this;
    bP.need(nv * 3); bN.need(nv * 3); bUV.need(nv * 2); bA.need(nv * 4); bE.need(nv * 4); bI.need(star ? n * 3 : (n - 2) * 3);
    const role = a.role ?? 0; const edge = a.edge ?? 0; const rnd = a.rnd ?? 0.5; const bse = a.base ?? 0;
    const h0 = a.heat ?? 0; const s0 = a.soot ?? 0; const p1 = a.p1 ?? 0; const p2 = a.p2 ?? 0;
    const push = (p, uv) => {
      let i = bP.n; bP.a[i] = p[0]; bP.a[i + 1] = p[1]; bP.a[i + 2] = p[2]; bP.n += 3;
      i = bN.n; bN.a[i] = nx; bN.a[i + 1] = ny; bN.a[i + 2] = nz; bN.n += 3;
      i = bUV.n; bUV.a[i] = uv[0]; bUV.a[i + 1] = uv[1]; bUV.n += 2;
      i = bA.n; bA.a[i] = role; bA.a[i + 1] = edge; bA.a[i + 2] = rnd; bA.a[i + 3] = bse; bA.n += 4;
      let heat = h0; let soot = s0;
      if (dm) { const f = dm.field(p); if (f.heat > heat) heat = f.heat; if (f.soot > soot) soot = f.soot; }
      i = bE.n; bE.a[i] = heat; bE.a[i + 1] = soot; bE.a[i + 2] = p1; bE.a[i + 3] = p2; bE.n += 4;
    };
    const tri = (x, y, z) => { const i = bI.n; bI.a[i] = x; bI.a[i + 1] = y; bI.a[i + 2] = z; bI.n += 3; };
    if (star) {
      let c = [0, 0, 0]; let cu = [0, 0];
      for (let i = 0; i < n; i++) { c = V.add(c, pts[i]); cu = [cu[0] + uvs[i][0], cu[1] + uvs[i][1]]; }
      push(V.mul(c, 1 / n), [cu[0] / n, cu[1] / n]);
      for (let i = 0; i < n; i++) push(pts[i], uvs[i]);
      for (let i = 0; i < n; i++) tri(base, base + 1 + i, base + 1 + ((i + 1) % n));
    } else {
      for (let i = 0; i < n; i++) push(pts[i], uvs[i]);
      for (let i = 1; i < n - 1; i++) tri(base, base + i, base + i + 1);
    }
  }

  // ---- 六面体（箱・先細りの箱・ゆがんだ箱）。c8 は局所の8つの角、c は面取りの幅 ----
  // o：{ role, top, bottom, side, c, panel, facade:[列の間隔, 階の高さ], rnd, base, skip:[面の番号], heat, soot, uvOrigin }
  // 面の番号：0=-X 1=+X 2=-Y 3=+Y 4=-Z 5=+Z
  hexa(c8, o = {}, kind = 'box', detail = DETAIL.MID) {
    return this._auto(kind, detail, () => this._hexa(c8, o), o.extra);
  }
  _hexa(c8, o) {
    // 面取りは、その幅が画面で読める大きさのときだけ（細い棒や小さな箱の面取りは見えないのに三角形が4倍になる）
    let c = o.c ?? 0;
    if (c > 0) {
      let mnE = Infinity;
      for (let a = 0; a < 3; a++) { const e = V.dist(c8[0], c8[1 << a]); if (e < mnE) mnE = e; }
      if (mnE * this.s < 0.35 || c * this.s < 0.03) c = 0;
    }
    const W = c8.map((p) => this.toW(p));
    const cen = V.mul(W.reduce((s, p) => V.add(s, p), [0, 0, 0]), 1 / 8);
    // 局所の大きさ（uv の原点と板の寸法に使う）
    let mn = [Infinity, Infinity, Infinity]; let mx = [-Infinity, -Infinity, -Infinity];
    for (const p of c8) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
    const ext = V.sub(mx, mn);
    const sc = this.s;
    const uvOf = (lp, ax) => {
      // 面の主な向きで投影する。縦の面は v を高さ（y）にする
      const q = V.sub(lp, o.uvOrigin ?? mn);
      if (ax === 1) return [q[0] * sc, q[2] * sc];
      if (ax === 0) return [q[2] * sc, q[1] * sc];
      return [q[0] * sc, q[1] * sc];
    };
    const roleFor = (ax, side) => {
      if (ax === 1) return side ? (o.top ?? o.role ?? 0) : (o.bottom ?? o.role ?? 0);
      return o.side ?? o.role ?? 0;
    };
    const panelFor = (ax, role) => {
      if (role === ROLE.FACADE || role === ROLE.GLASS) {
        const f = o.facade || [3.2, 3.6];
        const eu = ax === 0 ? ext[2] : ext[0];
        return [eu * sc / Math.max(1, Math.round(eu * sc / f[0])), f[1]];
      }
      const p = o.panel ?? 0;
      if (!p) return [o.p1 ?? 0, o.p2 ?? 0];
      const eu = (ax === 0 ? ext[2] : ext[0]) * sc; const ev = (ax === 1 ? ext[2] : ext[1]) * sc;
      return [eu / Math.max(1, Math.round(eu / p)), ev / Math.max(1, Math.round(ev / (p * (o.panelAspect ?? 0.7))))];
    };
    // 面の向きは「角の並び」ではなく、局所の座標での実際の法線で決める（面の上に組んだ箱は角の並びと軸がずれるため）
    const geoAxis = (lp) => {
      let nx = 0; let ny = 0; let nz = 0;
      for (let i = 0; i < lp.length; i++) { const p = lp[i]; const q = lp[(i + 1) % lp.length]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); }
      // 外向きにそろえる（六面体の中心から面の中心へ）
      let cx = 0; let cy = 0; let cz = 0; for (const p of lp) { cx += p[0]; cy += p[1]; cz += p[2]; }
      const n = lp.length; const lc = [cx / n - lcen[0], cy / n - lcen[1], cz / n - lcen[2]];
      if (nx * lc[0] + ny * lc[1] + nz * lc[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const ax = Math.abs(ny) >= Math.abs(nx) && Math.abs(ny) >= Math.abs(nz) ? 1 : Math.abs(nx) >= Math.abs(nz) ? 0 : 2;
      return { ax, side: (ax === 0 ? nx : ax === 1 ? ny : nz) > 0 ? 1 : 0 };
    };
    const attr = (ax, side, edge) => {
      const role = edge && !o.edgeKeepsRole && (roleFor(ax, side) === ROLE.FACADE || roleFor(ax, side) === ROLE.GLASS) ? (o.role === ROLE.FACADE ? ROLE.PAINT : (o.role ?? 0)) : roleFor(ax, side);
      const [p1, p2] = edge ? [0, 0] : panelFor(ax, role);
      return { role, edge: edge ? 1 : 0, rnd: o.rnd ?? 0.5, base: o.base ?? 0, heat: o.heat, soot: o.soot, p1, p2 };
    };
    const lcen = V.mul(c8.reduce((s2, p) => V.add(s2, p), [0, 0, 0]), 1 / 8);
    const face = (lp, edge) => {
      const { ax, side } = geoAxis(lp);
      this.poly(lp.map((p) => this.toW(p)), lp.map((p) => uvOf(p, ax)), attr(ax, side, edge), cen);
    };
    const skip = o.skip || [];
    if (c <= 0) {
      HEX_FACES.forEach(([ax, side, ids], fi) => { if (!skip.includes(fi)) face(ids.map((i) => c8[i]), false); });
      return;
    }
    // 角ごとに、3つの面それぞれの上の点（隣の角へ向かう2本の辺に沿って c ずつ寄せる）
    const Pf = [];
    for (let i = 0; i < 8; i++) {
      Pf.push([0, 1, 2].map((a) => {
        let p = c8[i].slice();
        for (const b of [0, 1, 2]) {
          if (b === a) continue;
          const j = i ^ (1 << b);
          const e = V.sub(c8[j], c8[i]); const el = V.len(e);
          p = V.add(p, V.mul(e, Math.min(c, el * 0.45) / (el || 1)));
        }
        return p;
      }));
    }
    HEX_FACES.forEach(([ax, side, ids], fi) => { if (!skip.includes(fi)) face(ids.map((i) => Pf[i][ax]), false); });
    // 12 本の辺の面取り
    for (let d = 0; d < 3; d++) {
      const a = (d + 1) % 3; const b = (d + 2) % 3;
      for (let sa = 0; sa < 2; sa++) for (let sb = 0; sb < 2; sb++) {
        const i0 = (sa << a) | (sb << b); const i1 = i0 | (1 << d);
        face([Pf[i0][a], Pf[i1][a], Pf[i1][b], Pf[i0][b]], true);
      }
    }
    // 8つの角
    for (let i = 0; i < 8; i++) face([Pf[i][0], Pf[i][1], Pf[i][2]], true);
  }

  // 軸にそろった箱（中心と大きさ）。tx・tz は上の面の幅の倍率（先細り）、shx・shz は上の面のずれ
  box(cx, cy, cz, sx, sy, sz, o = {}, kind = 'box', detail = null) {
    const hx = sx / 2; const hy = sy / 2; const hz = sz / 2;
    const tx = o.tx ?? 1; const tz = o.tz ?? 1; const shx = o.shx ?? 0; const shz = o.shz ?? 0;
    const c8 = [];
    for (let i = 0; i < 8; i++) {
      const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1;
      const kx = iy ? tx : 1; const kz = iy ? tz : 1;
      c8.push([cx + (ix ? hx : -hx) * kx + (iy ? shx : 0), cy + (iy ? hy : -hy), cz + (iz ? hz : -hz) * kz + (iy ? shz : 0)]);
    }
    const dt = detail ?? autoDetail(Math.max(sx, sy, sz) * this.s);
    return this.hexa(c8, o, kind, dt);
  }

  // 2点を結ぶ角柱（梁）。up は断面の上の向きの手がかり。壊れ方があれば、割れ目で折って曲げる
  beam(a, b, w, h = w, o = {}, detail = null) {
    const len = V.dist(a, b);
    if (len < 1e-4) return;
    // 細い梁（太さ 1.2m 未満）は長くても中くらいの段まで（どの距離でも描く段に入れると、壊れた建物の骨組みで遠くの段が重くなる）
    const th = Math.max(w, h) * this.s;
    const dt = detail ?? (th < 0.35 ? DETAIL.FINE : Math.max(th < 1.2 ? DETAIL.MID : DETAIL.MASS, autoDetail(len * this.s * 0.5)));
    if (this.dmg && !o.noDamage) { this.dmg.beam(this, a, b, w, h, o, dt); return; }
    this._beamSeg(a, b, w, h, o, dt, 1, 1);
  }
  // 梁の1区間（端の太さの倍率 ka・kb：折れた端を細くする）
  _beamSeg(a, b, w, h, o, dt, ka = 1, kb = 1, kind = 'beam', extra = null) {
    const d = V.norm(V.sub(b, a));
    const [u, v] = V.perp(d, o.up || [0, 1, 0]);
    const c8 = [];
    for (let i = 0; i < 8; i++) {
      const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1;
      const k = iz ? kb : ka; const base = iz ? b : a;
      c8.push(V.add(base, V.add(V.mul(u, (ix ? 0.5 : -0.5) * w * k), V.mul(v, (iy ? 0.5 : -0.5) * h * k))));
    }
    return this.hexa(c8, { c: o.c ?? Math.min(w, h) * 0.12, role: o.role ?? ROLE.DARK, rnd: o.rnd, edgeKeepsRole: true, extra, ...o.attr }, kind, dt);
  }

  // 円筒（a から b、半径 r0→r1）。面取り c、端のふた cap
  cyl(a, b, r0, r1 = r0, seg = 12, o = {}, kind = 'cyl', detail = null) {
    const len = V.dist(a, b);
    if (len < 1e-4) return null;
    const dt = detail ?? autoDetail(Math.max(len, r0 * 2) * this.s);
    return this._auto(kind, dt, () => {
      const d = V.norm(V.sub(b, a));
      const [u, v] = V.perp(d, o.up || [0, 0, 1]);
      const c = Math.min(o.c ?? 0, r0 * 0.3, len * 0.2);
      const rings = [];
      const capA = o.capA ?? true; const capB = o.capB ?? true;
      // 断面の並び：[軸の位置 t(m), 半径, 縁か]
      const prof = [];
      if (c > 0 && capA) prof.push([0, r0 - c, 1], [c, r0, 1]); else prof.push([0, r0, 0]);
      if (c > 0 && capB) prof.push([len - c, r1, 0], [len, r1 - c, 1]); else prof.push([len, r1, 0]);
      const sc = this.s;
      const circ = 2 * Math.PI * (r0 + r1) * 0.5 * sc;
      for (const [t, r] of prof) {
        const ring = [];
        for (let i = 0; i <= seg; i++) {
          const ang = (i / seg) * Math.PI * 2;
          const p = V.add(V.add(a, V.mul(d, t)), V.add(V.mul(u, Math.cos(ang) * r), V.mul(v, Math.sin(ang) * r)));
          ring.push({ w: this.toW(p), uv: [(i / seg) * circ, t * sc] });
        }
        rings.push(ring);
      }
      const at = (edge) => ({ role: o.role ?? ROLE.PAINT, edge, rnd: o.rnd ?? 0.5, base: o.base ?? 0, p1: edge ? 0 : (o.panel ? circ / Math.max(1, Math.round(circ / o.panel)) : 0), p2: edge ? 0 : (o.panel ? Math.max(1, len * sc / Math.max(1, Math.round(len * sc / o.panel))) : 0) });
      for (let k = 0; k < rings.length - 1; k++) {
        const edge = prof[k][2] && prof[k + 1][2] ? 1 : (k === 0 && c > 0 && capA) || (k === rings.length - 2 && c > 0 && capB) ? 1 : 0;
        const axisMid = this.toW(V.add(a, V.mul(d, (prof[k][0] + prof[k + 1][0]) / 2)));
        for (let i = 0; i < seg; i++) {
          const A0 = rings[k][i]; const A1 = rings[k][i + 1]; const B0 = rings[k + 1][i]; const B1 = rings[k + 1][i + 1];
          this.poly([A0.w, A1.w, B1.w, B0.w], [A0.uv, A1.uv, B1.uv, B0.uv], at(edge), axisMid);
        }
      }
      const cap = (ring, center, out) => {
        const cw = this.toW(center);
        const inside = this.toW(V.sub(center, V.mul(d, out)));
        const pts = ring.slice(0, seg).map((q) => q.w);
        const uvs = ring.slice(0, seg).map((q, i) => { const ang = (i / seg) * Math.PI * 2; return [Math.cos(ang) * r0 * sc, Math.sin(ang) * r0 * sc]; });
        this.poly(pts, uvs, { ...at(0), role: o.capRole ?? o.role ?? ROLE.PAINT, p1: 0, p2: 0 }, inside, true);
        return cw;
      };
      if (capA) cap(rings[0], a, -1);
      if (capB) cap(rings[rings.length - 1], b, 1);
    }, o.extra);
  }

  // 回転体（輪郭 [[半径, 高さ]...] を y 軸のまわりに回す）。冷却塔・タンクの頭・ドーム。both で内側の面も張る
  lathe(cx, cy, cz, prof, seg = 16, o = {}, kind = 'lathe', detail = null) {
    let hmax = 0; for (const [r, y] of prof) hmax = Math.max(hmax, r * 2, y);
    const dt = detail ?? autoDetail(hmax * this.s);
    return this._auto(kind, dt, () => {
      const sc = this.s;
      let acc = 0; const vs = [0];
      for (let k = 1; k < prof.length; k++) { acc += Math.hypot(prof[k][0] - prof[k - 1][0], prof[k][1] - prof[k - 1][1]) * sc; vs.push(acc); }
      const rmax = Math.max(...prof.map((p) => p[0]));
      const circ = 2 * Math.PI * rmax * sc;
      const P = (k, i) => { const ang = (i / seg) * Math.PI * 2; const [r, y] = prof[k]; return this.toW([cx + Math.cos(ang) * r, cy + y, cz + Math.sin(ang) * r]); };
      for (let k = 0; k < prof.length - 1; k++) {
        const mid = this.toW([cx, cy + (prof[k][1] + prof[k + 1][1]) / 2, cz]);
        for (let i = 0; i < seg; i++) {
          const pts = [P(k, i), P(k, i + 1), P(k + 1, i + 1), P(k + 1, i)];
          const uvs = [[i / seg * circ, vs[k]], [(i + 1) / seg * circ, vs[k]], [(i + 1) / seg * circ, vs[k + 1]], [i / seg * circ, vs[k + 1]]];
          const a = { role: o.role ?? ROLE.PAINT, edge: o.edgeRows?.includes(k) ? 1 : 0, rnd: o.rnd ?? 0.5, base: o.base ?? 0, p1: o.panel ? circ / Math.max(1, Math.round(circ / o.panel)) : 0, p2: o.panel ? o.panel * 0.7 : 0 };
          if (prof[k][0] < 1e-4 && prof[k + 1][0] < 1e-4) continue;
          // 裏も張るとき：表は poly が外向きへ反転することがあるので、反転した後の表の逆向きを裏にする
          // （反転前の並びを逆にすると、表と同じ向きの面が重なってちらつく）
          const flip = o.both && this._flips(pts, mid);
          this.poly(pts, uvs, a, mid);
          if (o.both) {
            const fp = flip ? pts.slice().reverse() : pts; const fu = flip ? uvs.slice().reverse() : uvs;
            this.poly(fp.slice().reverse(), fu.slice().reverse(), { ...a, role: o.innerRole ?? ROLE.INNER }, null);
          }
        }
      }
    }, o.extra);
  }

  // 配管（折れ線）。曲がり角に継ぎ手、ところどころにフランジ
  pipe(pts, r, o = {}) {
    const dt = o.detail ?? (r * this.s < 0.5 ? DETAIL.FINE : DETAIL.MID);
    const rs = r * this.s;
    const seg = o.seg ?? (rs < 0.25 ? 5 : rs < 0.6 ? 7 : 10);
    // 継ぎ手と継ぎ目の輪は寄ったときだけ（中くらいの段では筒だけにして三角形を減らす）。分割数も筒より少なく
    const segR = Math.max(5, seg - 2);
    this.part('pipe', dt, () => {
      for (let i = 0; i < pts.length - 1; i++) this.cyl(pts[i], pts[i + 1], r, r, seg, { role: o.role ?? ROLE.BARE, capA: i === 0, capB: i === pts.length - 2, rnd: o.rnd });
    });
    if (rs < 0.12) return;
    this.part('pipe', DETAIL.FINE, () => {
      for (let i = 0; i < pts.length - 1; i++) {
        const d = V.norm(V.sub(pts[i + 1], pts[i]));
        if (i > 0) this.cyl(V.add(pts[i], V.mul(d, -r * 1.3)), V.add(pts[i], V.mul(d, r * 1.3)), r * 1.25, r * 1.25, segR, { role: ROLE.DARK, rnd: o.rnd, capA: false, capB: false });
        const L = V.dist(pts[i], pts[i + 1]); const step = o.flange ?? 6;
        if (L > step * 1.2 && rs > 0.15) {
          for (let t = step; t < L - step * 0.5; t += step) { const c = V.add(pts[i], V.mul(d, t)); this.cyl(V.add(c, V.mul(d, -r * 0.25)), V.add(c, V.mul(d, r * 0.25)), r * 1.35, r * 1.35, segR, { role: ROLE.DARK, rnd: o.rnd, capA: false, capB: false }); }
        }
      }
    });
  }

  // 手すり（支柱と2本の横棒）。a・b は床の上の2点
  railing(a, b, h = 1.1, o = {}) {
    const L = V.dist(a, b);
    if (L < 0.5) return;
    if (this.useProps) {
      // 手すりの小物：+z の向きに長さ 1m の形を、a から b へ伸ばす
      const d = V.sub(b, a); const ry = Math.atan2(d[0], d[2]);
      this.prop('railing', a[0], a[1], a[2], ry, 1, h / 1.1, L);
      return;
    }
    const t = 0.06 * (o.k ?? 1);
    this.part('rail', DETAIL.FINE, () => {
      const n = Math.max(1, Math.round(L / 1.8));
      for (let i = 0; i <= n; i++) { const p = V.lerp(a, b, i / n); this._beamSeg(p, V.add(p, [0, h, 0]), t, t, { role: o.role ?? ROLE.PAINT2 }, DETAIL.FINE); }
      for (const y of [h, h * 0.5]) this._beamSeg(V.add(a, [0, y, 0]), V.add(b, [0, y, 0]), t * 0.9, t * 0.9, { role: o.role ?? ROLE.PAINT2 }, DETAIL.FINE);
    });
  }

  // 箱型のトラス（4本の弦材＋縦材＋斜材）。a→b の向き、幅 w・高さ h、柱の間隔 bay
  truss(a, b, w, h, o = {}) {
    const L = V.dist(a, b);
    const d = V.norm(V.sub(b, a));
    const [u, v] = V.perp(d, o.up || [0, 1, 0]);
    const n = Math.max(1, Math.round(L / (o.bay ?? Math.max(w, h))));
    const t = o.t ?? Math.max(0.25, Math.min(w, h) * 0.08);
    const corner = (i, sx, sy) => V.add(V.add(a, V.mul(d, L * i / n)), V.add(V.mul(u, sx * w / 2), V.mul(v, sy * h / 2)));
    const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const role = o.role ?? ROLE.PAINT;
    const big = Math.max(w, h) * this.s;
    const dChord = big >= 2.2 ? DETAIL.MID : null; const dWeb = big >= 5 ? DETAIL.MID : null;
    // 弦材は区間ごとの部品（壊れたときに区間で折れる）
    for (const [sx, sy] of C) for (let i = 0; i < n; i++) this.beam(corner(i, sx, sy), corner(i + 1, sx, sy), t * 1.3, t * 1.3, { role, up: v }, dChord);
    for (let i = 0; i <= n; i++) {
      for (let k = 0; k < 4; k++) { const [ax, ay] = C[k]; const [bx, by] = C[(k + 1) % 4]; this.beam(corner(i, ax, ay), corner(i, bx, by), t, t, { role, up: d }, dWeb); }
      if (i < n) {
        for (let k = 0; k < 4; k++) {
          if (o.open && k === 2) continue; // 上の面を空ける（歩く橋）
          const [ax, ay] = C[k]; const [bx, by] = C[(k + 1) % 4];
          const flip = (i + k) % 2;
          this.beam(corner(i + flip, ax, ay), corner(i + 1 - flip, bx, by), t * 0.8, t * 0.8, { role, up: d }, dWeb);
        }
      }
    }
  }

  // 小物を置く（形は作らず、置き場所だけを記録する。描くのは props.js で、同じ種類は場面全体で1回の描画）。
  // type は PROP_TYPES のどれか。x,y,z は今の変形の中の局所の位置（小物の足元の中心）、rx・ry・rz は向き、
  // sx・sy・sz は大きさ（m。小物の形は足元 1m 四方・高さ 1m を基準に作る）
  prop(type, x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
    let m = M4.mul(this.m, M4.compose(x, y, z, rx, ry, rz, 1));
    m = M4.mul(m, [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]);
    this.propList.push({ type, m, chunk: this.chunkHint, rnd: hash3(x * 0.37 + sx, y * 0.41 + sy, z * 0.43 + sz) });
    return this;
  }

  // 灯り（小さな発光の箱と、背の暗い台）。role：LAMP（橙）・BEACON（赤、またたく）・STRIP（白い帯）
  lamp(p, s, role = ROLE.LAMP, n = [0, 0, 1], o = {}) {
    const lit = this.dmg ? this.dmg.lightAlive(this.toW(p)) : 1;
    if (!lit) return;
    const [u, v] = V.perp(n, [0, 1, 0]);
    const rnd = o.rnd ?? hash3(p[0], p[1], p[2]);
    this.part('light', s * this.s > 1.2 ? DETAIL.MID : DETAIL.FINE, () => {
      const q = V.add(p, V.mul(n, s * 0.25));
      const c8 = [];
      for (let i = 0; i < 8; i++) {
        const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1;
        c8.push(V.add(V.add(p, V.mul(n, iz ? s * 0.5 : 0)), V.add(V.mul(u, (ix ? 0.5 : -0.5) * s * (o.w ?? 1)), V.mul(v, (iy ? 0.5 : -0.5) * s))));
      }
      // base=2 の灯りは不規則にまたたく（壊れた所の近くで生き残った灯り）
      this._hexa(c8, { role, rnd, base: lit < 1 ? 2 : 0, c: s * 0.12 });
      this.lights.push({ p: this.toW(q), role, size: s * this.s, flicker: lit < 1 });
    });
  }
}

// 小物の種類（props.js との約束。足元の中心が原点、+y が上、足元 1m 四方・高さ 1m を基準に作る。
// 長さで伸ばす物（pipeRun・railing・girder）は +z の向きに長さ 1m）
export const PROP_TYPES = [
  'crate', 'container', 'barrel', 'tankS', 'acUnit', 'vent', 'antenna', 'dishS', 'lampPost', 'pipeRun', 'pipeBundle',
  'railing', 'ladder', 'hatch', 'junction', 'cableSpool', 'rubble', 'slab', 'girder',
];

// 部品の大きさ（m）から、距離で省く段を決める
export function autoDetail(sz) { return sz >= 7 ? DETAIL.MASS : sz >= 1.6 ? DETAIL.MID : DETAIL.FINE; }
