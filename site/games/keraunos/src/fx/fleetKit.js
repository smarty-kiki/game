import * as THREE from 'three';
import {
  Fn, If, uniform, attribute, property, texture3D, select, vec2, vec3, vec4, float, floor, fract, abs, max, mix, smoothstep, step, clamp, pow,
  dot, length, sin, fwidth, positionGeometry, normalGeometry, positionView, positionViewDirection, normalView, output,
  materialColor, materialRoughness, materialMetalness, materialNormal, materialEmissive,
} from 'three/tsl';
import { applySurface, SURF_ON } from './surface.js';
import { noise3D } from './skyNoise.js';
import { uniformOf, bumpNormal } from './hardsurface.js';
import { smoothstepR } from './soft.js';

// 大型艦・残骸・施設の形を、コードで組み立てる部品箱。画像の UV を使わず、面の模様は hullMaterial が物の座標から描く。
// 面の向きがそのまま光を返すように、頂点は共有しない（三角形ごとに法線を持つ）。
// aK：x=明るさのばらつきの種、y=窓を出す度合い、z=焦げ・暗い部品（0=地の鋼板、1=暗い奥）

const hash = (n) => { const v = Math.sin(n * 91.3458) * 47453.5453; return v - Math.floor(v); };
export function rng(seed) { let s = Math.floor(seed * 7919) + 13; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

const _v = new THREE.Vector3();
const _a = new THREE.Vector3(); const _b = new THREE.Vector3(); const _c = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);

export class Kit {
  constructor() { this.pos = []; this.nor = []; this.k = []; this.m = new THREE.Matrix4(); this.key = [0.5, 0, 0]; this.stack = []; }
  // 以降の部品に掛ける変形（入れ子にできる）
  push(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    this.stack.push(this.m.clone());
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
    this.m.multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)));
    return this;
  }
  pop() { this.m = this.stack.pop(); return this; }
  tone(seed, win = 0, dark = 0) { this.key = [seed, win, dark]; return this; }
  tri(a, b, c) {
    _a.set(...a).applyMatrix4(this.m); _b.set(...b).applyMatrix4(this.m); _c.set(...c).applyMatrix4(this.m);
    _v.copy(_b).sub(_a).cross(_c.clone().sub(_a));
    const l = _v.length();
    if (l < 1e-8) return;
    _v.multiplyScalar(1 / l);
    this.pos.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
    for (let i = 0; i < 3; i++) { this.nor.push(_v.x, _v.y, _v.z); this.k.push(...this.key); }
  }
  quad(a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); }
  // 箱。tx・ty は +z 側の面の幅と高さの倍率（先細り）
  box(x, y, z, sx, sy, sz, tx = 1, ty = 1, sh = 0) {
    const hx = sx / 2; const hy = sy / 2; const hz = sz / 2;
    const f = [x + 0, y + sh, z + hz]; const fx = hx * tx; const fy = hy * ty;
    const A = [x - hx, y - hy, z - hz]; const B = [x + hx, y - hy, z - hz]; const C = [x + hx, y + hy, z - hz]; const D = [x - hx, y + hy, z - hz];
    const E = [f[0] - fx, f[1] - fy, f[2]]; const F = [f[0] + fx, f[1] - fy, f[2]]; const G = [f[0] + fx, f[1] + fy, f[2]]; const H = [f[0] - fx, f[1] + fy, f[2]];
    this.quad(E, F, G, H); this.quad(B, A, D, C); this.quad(F, B, C, G); this.quad(A, E, H, D); this.quad(H, G, C, D); this.quad(A, B, F, E);
    return this;
  }
  // 2点を結ぶ角柱
  beam(a, b, w = 1, h = w) {
    const pa = new THREE.Vector3(...a); const pb = new THREE.Vector3(...b);
    const d = pb.clone().sub(pa); const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(_z, d.clone().normalize());
    this.stack.push(this.m.clone());
    this.m.multiply(new THREE.Matrix4().compose(pa.clone().add(pb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    this.box(0, 0, 0, w, h, len);
    this.m = this.stack.pop();
    return this;
  }
  // 円筒（軸は +z）。r2 で先細り。cap=false で端を開ける
  cyl(x, y, z, r, len, seg = 10, r2 = r, cap = true) {
    const h = len / 2;
    const P = (i, zz, rr) => { const a = i / seg * Math.PI * 2; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr, z + zz]; };
    for (let i = 0; i < seg; i++) {
      this.quad(P(i, -h, r), P(i + 1, -h, r), P(i + 1, h, r2), P(i, h, r2));
      if (cap) { this.tri([x, y, z - h], P(i + 1, -h, r), P(i, -h, r)); this.tri([x, y, z + h], P(i, h, r2), P(i + 1, h, r2)); }
    }
    return this;
  }
  // 球（上下に潰せる）
  ball(x, y, z, r, seg = 10, ring = 6, squash = 1) {
    const P = (i, j) => { const t = j / ring * Math.PI; const a = i / seg * Math.PI * 2; return [x + Math.cos(a) * Math.sin(t) * r, y + Math.cos(t) * r * squash, z + Math.sin(a) * Math.sin(t) * r]; };
    for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) this.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
    return this;
  }
  // 八角の断面を z に沿って繋ぐ。sections：[{z, w, h, y, c}]（c は角の落とし量 0〜1）。skip(i,j) が真の面は張らない（穴）
  loft(sections, { capA = true, capB = true, skip = null, jag = null } = {}) {
    const ring = (s, si) => {
      const c = s.c ?? 0.32; const w = s.w / 2; const h = s.h / 2; const y = s.y || 0; const x0 = s.x || 0;
      const pts = [[-w * (1 - c), h], [w * (1 - c), h], [w, h * (1 - c)], [w, -h * (1 - c)], [w * (1 - c), -h], [-w * (1 - c), -h], [-w, -h * (1 - c)], [-w, h * (1 - c)]];
      return pts.map((p, j) => [x0 + p[0], y + p[1], s.z + (jag ? jag(si, j) : 0)]);
    };
    const R = sections.map(ring);
    for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < 8; j++) {
      if (skip && skip(i, j)) continue;
      const k = (j + 1) % 8;
      this.quad(R[i][j], R[i + 1][j], R[i + 1][k], R[i][k]);
    }
    const cap = (r, flip) => { const c = r.reduce((a, p) => [a[0] + p[0] / 8, a[1] + p[1] / 8, a[2] + p[2] / 8], [0, 0, 0]); for (let j = 0; j < 8; j++) { const k = (j + 1) % 8; if (flip) this.tri(c, r[k], r[j]); else this.tri(c, r[j], r[k]); } };
    if (capA) cap(R[0], false);
    if (capB) cap(R[R.length - 1], true);
    return this;
  }
  // 大きな平らな面に、面の向きに合わせて細かい出っ張り（配管・箱・排気口・アンテナ・装甲の継ぎ板）を散らす。
  // 平らな箱の組み合わせに見えないよう、形そのものに細部を足す（模様では大きな平面を隠せない）
  surfaceGreebles(seed = 1, { density = 0.0035, minArea = 40, maxCount = 1100 } = {}) {
    const R = rng(seed);
    const P = this.pos.slice(0); const N = this.nor.slice(0); const KK = this.k.slice(0);
    const nTri = P.length / 9;
    const saveM = this.m; const saveKey = this.key;
    const pa = new THREE.Vector3(); const pb = new THREE.Vector3(); const pc = new THREE.Vector3();
    const u = new THREE.Vector3(); const n = new THREE.Vector3(); const w = new THREE.Vector3(); const p = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    let made = 0;
    let ext = 0; for (let i = 0; i < P.length; i += 3) ext = Math.max(ext, Math.abs(P[i]), Math.abs(P[i + 1]), Math.abs(P[i + 2]));
    const szCap = Math.max(2.2, ext * 0.005);
    for (let t = 0; t < nTri && made < maxCount; t++) {
      pa.fromArray(P, t * 9); pb.fromArray(P, t * 9 + 3); pc.fromArray(P, t * 9 + 6);
      const area = u.subVectors(pb, pa).cross(w.subVectors(pc, pa)).length() / 2;
      if (area < minArea) continue;
      const cnt = Math.min(36, Math.floor(area * density + R()));
      if (!cnt) continue;
      n.fromArray(N, t * 9);
      u.subVectors(pb, pa).normalize();
      w.crossVectors(u, n).normalize();
      // 面の長さに合わせた大きさ（大きな面ほど大きな部品も置く）
      const L = Math.sqrt(area);
      for (let i = 0; i < cnt && made < maxCount; i++, made++) {
        let r1 = R(); let r2 = R(); if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
        p.copy(pa).addScaledVector(pb.clone().sub(pa), r1).addScaledVector(pc.clone().sub(pa), r2);
        basis.makeBasis(u, n, w).setPosition(p);
        this.m = basis.clone();
        const sz = Math.min(L * 0.08, szCap) * (0.5 + R());
        const kind = R();
        this.key = [KK[t * 9] * 0.6 + R() * 0.4, 0, kind < 0.3 ? 0.55 : 0];
        if (kind < 0.42) this.box(0, sz * 0.22, 0, sz * (0.6 + R() * 1.4), sz * (0.25 + R() * 0.5), sz * (0.6 + R() * 2.5));
        else if (kind < 0.62) { this.push(0, sz * 0.25, 0, 0, R() < 0.5 ? 0 : Math.PI / 2, 0).cyl(0, 0, 0, sz * (0.12 + R() * 0.18), sz * (2 + R() * 7), 6).pop(); }
        else if (kind < 0.78) { const g = sz * 0.9; this.box(0, sz * 0.08, 0, g * 1.6, sz * 0.16, g); for (let k = -1; k <= 1; k++) this.box(k * g * 0.45, sz * 0.2, 0, g * 0.12, sz * 0.12, g * 0.85); }
        else if (kind < 0.9) this.box(0, sz * 0.05, 0, sz * (2 + R() * 3), sz * 0.1, sz * (1.5 + R() * 3));
        else { this.box(0, sz * 1.1, 0, sz * 0.08, sz * 2.2, sz * 0.08); this.box(0, sz * 2.2, 0, sz * 0.5, sz * 0.06, sz * 0.06); }
      }
    }
    this.m = saveM; this.key = saveKey;
    return this;
  }
  geometry() {
    if (SURF_ON && !this.noGreebles && !this.greebled) { this.greebled = true; this.surfaceGreebles(this.pos.length % 997 + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(this.k, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// 小物：砲塔・細かな突起
function turret(K, x, y, z, s, up = 1, barrels = 2) {
  K.push(x, y, z, up < 0 ? Math.PI : 0);
  K.tone(0.2, 0, 0).cyl(0, s * 0.25, 0, s, 0.0001, 8, s, false);
  K.push(0, s * 0.3, 0, -Math.PI / 2).cyl(0, 0, 0, s * 0.95, s * 0.6, 8, s * 0.72).pop();
  K.box(0, s * 0.8, s * 0.1, s * 1.1, s * 0.62, s * 1.5, 0.82, 0.7);
  for (let b = 0; b < barrels; b++) { const bx = (b - (barrels - 1) / 2) * s * 0.44; K.box(bx, s * 0.82, s * 1.95, s * 0.14, s * 0.14, s * 2.4); }
  K.pop();
}
function greeble(K, R, x0, x1, y, z0, z1, n, s) {
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0); const z = z0 + R() * (z1 - z0); const a = R();
    K.tone(R(), 0, a < 0.25 ? 0.6 : 0);
    if (a < 0.55) K.box(x, y + s * 0.25, z, s * (0.4 + R()), s * (0.3 + R() * 0.8), s * (0.6 + R() * 3));
    else if (a < 0.8) K.push(x, y + s * 0.3, z).cyl(0, 0, 0, s * (0.2 + R() * 0.3), s * (2 + R() * 6), 6).pop();
    else K.box(x, y + s, z, s * 0.12, s * 2, s * 0.12);
  }
  K.tone(0.5, 0, 0);
}

// 船体を一周する帯（外板の継ぎ目の厚い枠）。形の刻みが遠くでも読める
function hullBands(K, sections, n, grow = 1.03, len = 0.012) {
  const zs = sections.map((a) => a.z);
  const z0 = zs[0]; const z1 = zs[zs.length - 1];
  const at = (z) => { for (let i = 0; i < sections.length - 1; i++) { const a = sections[i]; const b = sections[i + 1]; if (z >= a.z && z <= b.z) { const t = (z - a.z) / (b.z - a.z || 1); const m = (k, d = 0) => (a[k] ?? d) + ((b[k] ?? d) - (a[k] ?? d)) * t; return { w: m('w'), h: m('h'), y: m('y'), x: m('x') }; } } return sections[0]; };
  const dl = (z1 - z0) * len;
  for (let i = 1; i < n; i++) {
    const z = z0 + (z1 - z0) * (i + 0.5) / n;
    const s = at(z);
    K.loft([{ ...s, z: z - dl, w: s.w * grow, h: s.h * grow }, { ...s, z: z + dl, w: s.w * grow, h: s.h * grow }]);
  }
}

// 甲板の上に重ねる厚板と溝。遠くでも形の起伏として読める
function deckPlates(K, R, x0, x1, y, z0, z1, n, s) {
  for (let i = 0; i < n; i++) {
    const sx = s * (0.6 + R() * 1.8); const sz = s * (1.2 + R() * 4); const sy = s * (0.06 + R() * 0.14);
    const x = x0 + R() * (x1 - x0); const z = z0 + R() * (z1 - z0);
    K.tone(0.35 + R() * 0.25, R() < 0.25 ? 0.9 : 0, R() < 0.10 ? 0.55 : 0).box(x, y + sy * 0.5, z, sx, sy, sz);
  }
  K.tone(0.5, 0, 0);
}

// 戦う大型艦。+z が艦首。戻り値：形・エンジンの位置・砲の位置
// style：'allied'（長い甲板と艦橋の塔）、'enemy'（刃のように尖り、背が低く、翼のような張り出し）
export function buildCapital({ seed = 1, L = 900, style = 'allied', tier = 2, lo = false }) {
  const K = new Kit(); K.noGreebles = lo;
  // lo：遠景用。帯・厚板・小物・砲塔を省く（形の輪郭とエンジンは同じ）
  const fine = !lo;
  const R = rng(seed);
  const W = L * (style === 'enemy' ? 0.17 : 0.135);
  const H = L * (style === 'enemy' ? 0.07 : 0.095);
  const guns = []; const engines = []; const beacons = [];
  const secs = (arr) => arr.map(([u, w, h, y = 0]) => ({ z: (u - 0.5) * L, w: w * W, h: h * H, y: y * H }));
  // 主船体
  if (style === 'allied') {
    K.tone(0.4, 0.6, 0).loft(secs([[0, 0.72, 0.9, 0.08], [0.06, 0.92, 1, 0.05], [0.28, 1, 1, 0], [0.58, 0.96, 0.95, -0.02], [0.78, 0.72, 0.68, -0.08], [0.92, 0.36, 0.34, -0.1], [1, 0.05, 0.05, -0.12]]));
    if (fine) K.tone(0.3, 0, 0.12), hullBands(K, secs([[0, 0.72, 0.9, 0.08], [0.06, 0.92, 1, 0.05], [0.28, 1, 1, 0], [0.58, 0.96, 0.95, -0.02], [0.78, 0.72, 0.68, -0.08], [0.92, 0.36, 0.34, -0.1]]), tier > 1 ? 13 : 8);
    // 艦首の上の張り出し（階段状に下る甲板）
    K.tone(0.6, 0.7, 0).loft(secs([[0.05, 0.6, 0.5, 0.62], [0.24, 0.66, 0.6, 0.66], [0.52, 0.58, 0.46, 0.6], [0.66, 0.36, 0.25, 0.52], [0.72, 0.12, 0.05, 0.44]]));
    K.tone(0.3, 0.4, 0).loft(secs([[0.08, 0.38, 0.44, 1.02], [0.26, 0.42, 0.5, 1.06], [0.40, 0.3, 0.36, 1.0], [0.44, 0.16, 0.1, 0.9]]));
    // 艦橋の塔
    const bz = (0.17 - 0.5) * L;
    K.tone(0.75, 1, 0).box(0, H * 1.56, bz, W * 0.17, H * 0.72, L * 0.07, 0.8, 0.82);
    K.box(0, H * 2.0, bz + L * 0.008, W * 0.34, H * 0.2, L * 0.05, 0.8, 0.7);
    K.tone(0.2, 0, 0).box(0, H * 2.32, bz - L * 0.005, W * 0.012, H * 0.6, W * 0.012);
    K.box(W * 0.08, H * 2.2, bz - L * 0.015, W * 0.01, H * 0.36, W * 0.01);
    beacons.push([0, H * 2.62, bz - L * 0.005, 1]);
    // 底のキール
    K.tone(0.55, 0, 0.25).loft(secs([[0.06, 0.32, 0.5, -0.66], [0.4, 0.42, 0.6, -0.68], [0.76, 0.14, 0.2, -0.56], [0.86, 0.02, 0.02, -0.46]]));
    // 舷側の張り出しと格納庫
    for (const s of [-1, 1]) {
      K.tone(0.45, 0.8, 0).loft([0.10, 0.2, 0.38, 0.54, 0.64].map((u, i) => ({ z: (u - 0.5) * L, x: s * W * [0.56, 0.62, 0.64, 0.58, 0.5][i], w: W * [0.18, 0.26, 0.3, 0.2, 0.04][i], h: H * [0.3, 0.46, 0.5, 0.36, 0.06][i], y: -H * 0.1 })));
      K.tone(0.5, 0, 1).box(s * W * 0.72, -H * 0.1, -L * 0.17, W * 0.05, H * 0.28, L * 0.12);
      // 舷の砲座
      for (let i = 0; i < 4; i++) guns.push([s * W * 0.62, H * 0.1, (0.18 + i * 0.1 - 0.5) * L, s]);
      // 放熱板
      K.tone(0.25, 0, 0.1).push(s * W * 0.72, H * 0.2, -L * 0.33, 0, 0, -s * 0.5).box(s * W * 0.2, 0, 0, W * 0.4, W * 0.018, L * 0.1).pop();
    }
    // 甲板の砲塔
    const ts = L * 0.0145;
    for (const u of [0.32, 0.42, 0.52, 0.62, 0.70]) { const y = u < 0.54 ? H * 0.92 : H * 0.72; if (fine) turret(K, 0, y, (u - 0.5) * L, ts * (u < 0.6 ? 1.2 : 1), 1, 3); guns.push([0, y + ts, (u - 0.5) * L, 0]); }
    if (fine) for (const s of [-1, 1]) for (const u of [0.28, 0.46]) { turret(K, s * W * 0.27, H * 0.86, (u - 0.5) * L, ts * 0.7); }
    if (fine) deckPlates(K, R, -W * 0.27, W * 0.27, H * 0.9, -L * 0.42, L * 0.0, tier > 1 ? 70 : 34, L * 0.009);
    if (fine) deckPlates(K, R, -W * 0.15, W * 0.15, H * 1.22, -L * 0.40, -L * 0.1, tier > 1 ? 30 : 14, L * 0.007);
    if (fine) deckPlates(K, R, -W * 0.32, W * 0.32, H * 0.46, L * 0.04, L * 0.24, tier > 1 ? 34 : 16, L * 0.008);
    if (fine && tier > 1) for (const s of [-1, 1]) greeble(K, R, s * W * 0.06, s * W * 0.3, H * 0.84, -L * 0.34, L * 0.1, 26, L * 0.0065);
    if (fine) greeble(K, R, -W * 0.14, W * 0.14, H * 1.28, -L * 0.36, -L * 0.12, 16, L * 0.0055);
  } else {
    // 敵：鋭い刃の船体と、後ろへ流れる翼
    K.tone(0.35, 0.3, 0).loft(secs([[0, 0.66, 0.9, 0], [0.12, 0.95, 1.05, 0.05], [0.35, 0.92, 1, 0.04], [0.65, 0.6, 0.7, 0], [0.86, 0.26, 0.34, -0.05], [1, 0.015, 0.03, -0.08]]));
    if (fine) K.tone(0.2, 0, 0.2), hullBands(K, secs([[0, 0.66, 0.9, 0], [0.12, 0.95, 1.05, 0.05], [0.35, 0.92, 1, 0.04], [0.65, 0.6, 0.7, 0], [0.86, 0.26, 0.34, -0.05]]), tier > 1 ? 11 : 7);
    K.tone(0.2, 0.25, 0.15).loft(secs([[0.05, 0.3, 0.8, 0.8], [0.22, 0.34, 1.05, 0.86], [0.44, 0.22, 0.7, 0.72], [0.64, 0.08, 0.2, 0.42]]));
    for (const s of [-1, 1]) {
      K.tone(0.3, 0.2, 0.1).loft([0.04, 0.2, 0.36, 0.5, 0.56].map((u, i) => ({ z: (u - 0.5) * L, x: s * W * [0.98, 1.0, 0.82, 0.64, 0.56][i], w: W * [0.5, 0.74, 0.64, 0.3, 0.05][i], h: H * [0.14, 0.2, 0.18, 0.12, 0.02][i], y: -H * 0.06 })));
      // 前へ突き出す角
      K.tone(0.15, 0, 0.2).box(s * W * 1.05, -H * 0.05, L * 0.02, W * 0.1, H * 0.12, L * 0.24, 0.1, 0.2);
      for (const u of [0.1, 0.22, 0.34]) { if (fine) turret(K, s * W * 0.92, H * 0.06, (u - 0.5) * L, L * 0.011, 1, 2); guns.push([s * W * 0.92, H * 0.1, (u - 0.5) * L, s]); }
      for (let i = 0; i < 5; i++) K.tone(0.5, 0, 1).box(s * W * 0.5, H * 0.1, (0.18 + i * 0.09 - 0.5) * L, W * 0.018, H * 0.5, L * 0.03);
    }
    K.tone(0.12, 1, 0.3).box(0, H * 1.62, -L * 0.22, W * 0.09, H * 0.5, L * 0.08, 0.5, 0.5);
    K.tone(0.2, 0, 0).box(0, H * 2.0, -L * 0.25, W * 0.01, H * 0.5, W * 0.01);
    beacons.push([0, H * 2.28, -L * 0.25, 2]);
    guns.push([0, H * 1.2, -L * 0.1, 0], [0, H * 0.8, L * 0.1, 0]);
    if (fine) turret(K, 0, H * 0.54, L * 0.18, L * 0.014, 1, 3);
    if (fine) deckPlates(K, R, -W * 0.36, W * 0.36, H * 0.5, -L * 0.42, L * 0.08, tier > 1 ? 80 : 36, L * 0.009);
    if (fine) for (const s of [-1, 1]) deckPlates(K, R, s * W * 0.66, s * W * 1.16, H * 0.03, -L * 0.42, L * 0.0, tier > 1 ? 40 : 18, L * 0.008);
    if (fine && tier > 1) greeble(K, R, -W * 0.3, W * 0.3, H * 0.5, -L * 0.3, L * 0.1, 26, L * 0.006);
  }
  // 艦尾：エンジンの束
  const n = tier > 1 ? 5 : 3;
  const eseg = fine ? 10 : 6;
  const er = W * (tier > 1 ? 0.13 : 0.2);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + 0.3;
    const ex = n === 3 ? (i - 1) * er * 2.3 : Math.cos(ang) * W * 0.27; const ey = n === 3 ? 0 : Math.sin(ang) * H * 0.3;
    const ez = -L * 0.5 - er * 0.5;
    K.tone(0.15, 0, 0.1).push(ex, ey, ez).cyl(0, 0, 0, er * 0.92, er * 1.6, eseg, er * 1.05, false).pop();
    K.tone(0.5, 0, 1).push(ex, ey, ez - er * 0.25).cyl(0, 0, 0, er * 0.78, er * 0.2, eseg, er * 0.78).pop();
    engines.push([ex, ey, ez - er * 0.9, er]);
  }
  K.tone(0.5, 0, 0);
  return { geo: K.geometry(), engines, guns, beacons, L };
}

// ---- 残骸 ----
const jagFn = (R, amp) => { const memo = {}; return (i, j) => { const k = `${i}_${j}`; if (!(k in memo)) memo[k] = (R() - 0.5) * amp; return memo[k]; }; };

// 肋骨の輪（内側の骨組み）
function rib(K, z, w, h, y, t, R, broken = 0.25) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([Math.cos(a) * w / 2, y + Math.sin(a) * h / 2, z]); }
  K.tone(0.1, 0, 0.2);
  for (let i = 0; i < 12; i++) if (R() > broken) K.beam(pts[i], pts[i + 1], t, t * 1.6);
}

// 船体の中ほどの区画：外板がはがれ、肋骨と甲板がのぞく
export function wreckSection({ seed = 2, L = 240, W = 74, H = 54, bowCut = true, sternCut = true }) {
  const K = new Kit();
  const R = rng(seed);
  const n = 6;
  const sec = [];
  for (let i = 0; i <= n; i++) sec.push({ z: (i / n - 0.5) * L, w: W * (0.92 + R() * 0.12), h: H * (0.92 + R() * 0.12), y: (R() - 0.5) * H * 0.05 });
  const holes = {};
  K.tone(0.35, 0.25, 0).loft(sec, { capA: false, capB: false, jag: jagFn(R, L * 0.11), skip: (i, j) => { const k = `${i}_${j}`; if (!(k in holes)) { const edge = (bowCut && i === n - 1) || (sternCut && i === 0); holes[k] = R() < (edge ? 0.7 : 0.42); } return holes[k]; } });
  K.tone(0.25, 0, 0.3); hullBands(K, sec, 9, 1.035, 0.014);
  deckPlates(K, R, -W * 0.3, W * 0.3, H * 0.47, -L * 0.42, L * 0.42, 24, W * 0.06);
  // 内側（暗い面を背にして、穴から奥が暗く見える）
  K.tone(0.5, 0, 1).loft(sec.map((s) => ({ ...s, w: s.w * 0.9, h: s.h * 0.9 })), { capA: false, capB: false, skip: (i, j) => hash(i * 7 + j * 13 + seed) < 0.25 });
  for (let i = 0; i <= 9; i++) rib(K, (i / 9 - 0.5) * L * 0.96, W * 0.88, H * 0.88, 0, W * 0.022, R);
  // 崩れた甲板
  for (const y of [-H * 0.16, H * 0.14]) K.tone(0.6, 0, 0.3).push(0, y, (R() - 0.5) * L * 0.1, (R() - 0.5) * 0.08, 0, (R() - 0.5) * 0.08).box(0, 0, 0, W * 0.8, W * 0.012, L * (0.6 + R() * 0.2)).pop();
  // 背の構造物の名残
  K.tone(0.3, 0.5, 0).box(W * 0.12, H * 0.6, -L * 0.14, W * 0.36, H * 0.26, L * 0.3, 0.8, 0.7);
  K.tone(0.2, 0, 0.2).box(-W * 0.2, H * 0.58, L * 0.2, W * 0.16, H * 0.14, L * 0.12);
  greeble(K, R, -W * 0.3, W * 0.3, H * 0.47, -L * 0.3, L * 0.3, 18, W * 0.05);
  // 垂れ下がる配管
  K.tone(0.15, 0, 0.3);
  for (let i = 0; i < 7; i++) { const x = (R() - 0.5) * W * 0.6; const z = (bowCut ? 0.5 : -0.5) * L * (0.8 + R() * 0.2) * (R() < 0.5 ? 1 : -1); K.beam([x, (R() - 0.5) * H * 0.5, z], [x + (R() - 0.5) * W * 0.2, (R() - 0.5) * H * 0.6, z + Math.sign(z) * L * (0.05 + R() * 0.12)], W * 0.012); }
  return K.geometry();
}

// 折れた艦首：先の尖った船体。根元は裂け、砲塔が残る
export function wreckBow({ seed = 3, L = 260, W = 80, H = 56 }) {
  const K = new Kit();
  const R = rng(seed);
  const us = [[0, 1, 1, 0], [0.16, 1, 1, 0], [0.4, 0.92, 0.9, -0.02], [0.66, 0.66, 0.62, -0.06], [0.86, 0.32, 0.3, -0.1], [1, 0.03, 0.05, -0.14]];
  const sec = us.map(([u, w, h, y]) => ({ z: (u - 0.5) * L, w: w * W, h: h * H, y: y * H }));
  K.tone(0.4, 0.3, 0).loft(sec, { capA: false, capB: true, jag: (i, j) => (i === 0 ? (hash(j * 3.1 + seed) - 0.5) * L * 0.2 : 0), skip: (i, j) => (i === 0 ? hash(j + seed) < 0.4 : hash(i * 9 + j * 5 + seed) < 0.1) });
  K.tone(0.25, 0, 0.3); hullBands(K, sec.slice(0, 5), 8, 1.035, 0.012);
  deckPlates(K, R, -W * 0.34, W * 0.34, H * 0.46, -L * 0.42, L * 0.1, 20, W * 0.06);
  K.tone(0.5, 0, 1).loft(sec.slice(0, 3).map((s) => ({ ...s, w: s.w * 0.9, h: s.h * 0.9 })), { capA: false, capB: true });
  for (let i = 0; i < 4; i++) rib(K, (-0.46 + i * 0.09) * L, W * 0.86, H * 0.86, 0, W * 0.024, R, 0.35);
  K.tone(0.6, 0.5, 0).loft([{ z: -L * 0.3, w: W * 0.56, h: H * 0.3, y: H * 0.56 }, { z: L * 0.02, w: W * 0.5, h: H * 0.3, y: H * 0.5 }, { z: L * 0.14, w: W * 0.1, h: H * 0.03, y: H * 0.38 }], {});
  turret(K, 0, H * 0.7, -L * 0.08, W * 0.09, 1, 3);
  turret(K, W * 0.28, H * 0.42, L * 0.16, W * 0.06, 1, 2);
  greeble(K, R, -W * 0.2, W * 0.2, H * 0.68, -L * 0.28, 0, 12, W * 0.05);
  return K.geometry();
}

// 艦尾：エンジンの束と、ちぎれた後部の船体
export function wreckStern({ seed = 4, L = 180, W = 90, H = 62 }) {
  const K = new Kit();
  const R = rng(seed);
  const sec = [[0, 0.9, 0.9], [0.12, 1, 1], [0.6, 0.98, 0.96], [1, 0.9, 0.9]].map(([u, w, h]) => ({ z: (u - 0.5) * L, w: w * W, h: h * H }));
  K.tone(0.35, 0.2, 0.1).loft(sec, { capA: true, capB: false, jag: (i, j) => (i === 3 ? (hash(j * 2.3 + seed) - 0.5) * L * 0.3 : 0), skip: (i, j) => hash(i * 11 + j * 3 + seed) < (i === 2 ? 0.4 : 0.08) });
  K.tone(0.25, 0, 0.3); hullBands(K, sec, 6, 1.035, 0.016);
  deckPlates(K, R, -W * 0.3, W * 0.3, H * 0.46, -L * 0.42, L * 0.3, 16, W * 0.06);
  K.tone(0.5, 0, 1).loft(sec.map((s) => ({ ...s, w: s.w * 0.9, h: s.h * 0.9 })), { capA: true, capB: false });
  for (let i = 0; i < 4; i++) rib(K, (0.04 + i * 0.13) * L, W * 0.86, H * 0.86, 0, W * 0.02, R, 0.3);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.5; const ex = Math.cos(a) * W * 0.27; const ey = Math.sin(a) * H * 0.27; const er = W * 0.13;
    if (i === 2) continue; // 1基は失われている
    K.tone(0.15, 0, 0.1).push(ex, ey, -L * 0.5 - er).cyl(0, 0, 0, er * 0.8, er * 2.2, 12, er * 1.1, false).pop();
    K.tone(0.5, 0, 1).push(ex, ey, -L * 0.5 - er * 0.3).cyl(0, 0, 0, er * 0.72, er * 0.3, 12, er * 0.72).pop();
  }
  for (const s of [-1, 1]) K.tone(0.25, 0, 0.2).push(s * W * 0.5, H * 0.1, -L * 0.2, 0, 0, s * 0.4).box(s * W * 0.2, 0, 0, W * 0.42, W * 0.02, L * 0.3, 0.6, 1).pop();
  greeble(K, R, -W * 0.3, W * 0.3, H * 0.48, -L * 0.3, L * 0.3, 14, W * 0.05);
  return K.geometry();
}

// 中をくぐれる艦の骨格：1本の背骨と、欠けながら並ぶ肋骨。+y に背骨、下は開いている
export function ribCage({ seed = 5, L = 620, RX = 86, RY = 78 }) {
  const K = new Kit();
  const R = rng(seed);
  const n = 13;
  const sp = RX * 0.1;
  K.tone(0.3, 0, 0.1);
  // 背骨（途中で折れ曲がる）
  let py = RY; let px = 0;
  for (let i = 0; i < 8; i++) { const nx = px + (R() - 0.5) * 8; const ny = RY + (R() - 0.5) * 7; K.box(0, 0, 0, 0, 0, 0); K.beam([px, py, (i / 8 - 0.5) * L], [nx, ny, ((i + 1) / 8 - 0.5) * L], sp, sp * 0.9); K.beam([px + sp * 0.8, py + sp, (i / 8 - 0.5) * L], [nx + sp * 0.8, ny + sp, ((i + 0.9) / 8 - 0.5) * L], sp * 0.3); px = nx; py = ny; }
  for (let i = 0; i < n; i++) {
    const z = (i / (n - 1) - 0.5) * L;
    const twist = (R() - 0.5) * 0.14;
    for (const s of [-1, 1]) {
      // 片側は途中で折れていることが多い
      const keep = R() < 0.25 ? 3 : R() < 0.5 ? 6 : 10;
      let prev = null;
      for (let k = 0; k <= keep; k++) {
        const a = Math.PI / 2 + s * (k / 10) * Math.PI * 0.86 + twist;
        const rr = 1 + (k === keep ? (R() - 0.5) * 0.1 : 0);
        const p = [Math.cos(a) * RX * rr, Math.sin(a) * RY * rr, z + (k * k) * 0.14 * (R() - 0.2)];
        if (prev) {
          K.tone(0.2 + R() * 0.3, 0, 0.15).beam(prev, p, sp * 0.58, sp * 0.9);
          // 肋骨の内側の補強材
          if (k % 3 === 1) K.tone(0.15, 0, 0.3).beam([prev[0] * 0.9, prev[1] * 0.9, prev[2]], [p[0] * 0.92, p[1] * 0.92, p[2]], sp * 0.16);
        }
        prev = p;
      }
      // 肋骨に残った外板
      if (i % 2 === 0 && R() < 0.6) {
        const a0 = Math.PI / 2 + s * (0.16 + R() * 0.2) * Math.PI;
        const a1 = a0 + s * (0.16 + R() * 0.1) * Math.PI;
        const zz = z + 16; const l = L / (n - 1) * (0.6 + R() * 0.35);
        const P = (a, zv, m = 1.05) => [Math.cos(a) * RX * m, Math.sin(a) * RY * m, zv];
        const am = (a0 + a1) / 2;
        K.tone(0.5 + R() * 0.3, 0.1, 0);
        K.quad(P(a0, zz), P(am, zz), P(am, zz + l), P(a0, zz + l * 0.7));
        K.quad(P(am, zz), P(a1, zz + l * 0.2), P(a1, zz + l * 0.7), P(am, zz + l));
        K.quad(P(a0, zz + l * 0.7, 1.0), P(am, zz + l, 1.0), P(am, zz, 1.0), P(a0, zz, 1.0));
      }
    }
  }
  return K.geometry();
}

// ちぎれた外板（裏に補強の桁）
export function hullPlate({ seed = 6, S = 40 }) {
  const K = new Kit();
  const R = rng(seed);
  const n = 6; const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const m = S * (0.55 + R() * 0.6); pts.push([Math.cos(a) * m, (R() - 0.5) * S * 0.14, Math.sin(a) * m * 0.72]); }
  const c = [0, S * 0.05, 0];
  K.tone(0.4 + R() * 0.3, 0.15, 0);
  for (let i = 0; i < n; i++) { const a = pts[i]; const b = pts[(i + 1) % n]; K.tri(c, b, a); K.tri(c, a, b); }
  K.tone(0.15, 0, 0.3);
  for (let i = 0; i < 3; i++) { const z = (i - 1) * S * 0.28; K.beam([-S * 0.5, -S * 0.04, z], [S * 0.5, -S * 0.02, z + S * 0.04], S * 0.03, S * 0.07); }
  K.beam([0, -S * 0.05, -S * 0.42], [S * 0.1, -S * 0.04, S * 0.42], S * 0.03, S * 0.07);
  return K.geometry();
}

// 外れた砲塔
export function gunWreck({ S = 16 }) {
  const K = new Kit();
  turret(K, 0, 0, 0, S, 1, 3);
  K.tone(0.3, 0, 0.2).push(0, -S * 0.35, 0, Math.PI / 2).cyl(0, 0, 0, S * 0.7, S * 0.7, 10, S * 0.8).pop();
  K.tone(0.15, 0, 0.4).push(0, -S * 0.9, 0, Math.PI / 2).cyl(0, 0, 0, S * 0.38, S * 0.8, 8, S * 0.3).pop();
  return K.geometry();
}

// ---- 施設 ----
// 球形タンクの群れ（配管と櫓）
export function tankFarm({ seed = 7, S = 30 }) {
  const K = new Kit();
  const R = rng(seed);
  const spots = [[-1.1, 0, -1.1], [1.1, 0, -1.1], [-1.1, 0, 1.1], [1.1, 0, 1.1], [0, 1.25, 0], [0, -1.2, 0]];
  K.tone(0.2, 0, 0.15).box(0, 0, 0, S * 3.6, S * 0.1, S * 3.6);
  for (const [x, y, z] of spots) {
    K.tone(0.7 + R() * 0.2, 0, 0).ball(x * S, y * S * 0.9, z * S, S * 0.72, 12, 7);
    K.tone(0.2, 0, 0.3).beam([x * S, y * S * 0.9, z * S], [0, 0, 0], S * 0.09);
    K.tone(0.3, 0, 0.2).cyl(x * S, y * S * 0.9, z * S, S * 0.75, S * 0.06, 12, S * 0.75);
  }
  for (const s of [-1, 1]) K.tone(0.2, 0, 0.2).box(s * S * 1.9, 0, 0, S * 0.14, S * 2.4, S * 3.8);
  K.tone(0.5, 0, 0);
  return K.geometry();
}

// 通信の大きな皿
export function dishArray({ S = 34 }) {
  const K = new Kit();
  const seg = 16; const rings = 4;
  const P = (i, j) => { const a = i / seg * Math.PI * 2; const r = j / rings * S; const z = (j / rings) * (j / rings) * S * 0.5; return [Math.cos(a) * r, Math.sin(a) * r, z]; };
  K.push(0, S * 0.75, 0, -0.6, 0.35, 0);
  K.tone(0.8, 0, 0);
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { K.quad(P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)); K.quad(P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), P(i, j)); }
  K.tone(0.2, 0, 0.2);
  for (let i = 0; i < 8; i++) { K.beam(P(i * 2, rings), [0, 0, -S * 0.1], S * 0.03); K.beam(P(i * 2, rings), [0, 0, S * 1.05], S * 0.012); }
  K.ball(0, 0, S * 1.05, S * 0.07, 8, 4);
  K.cyl(0, 0, -S * 0.2, S * 0.2, S * 0.5, 8, S * 0.14);
  K.pop();
  K.tone(0.25, 0, 0.1).box(0, -S * 0.1, 0, S * 0.6, S * 1.1, S * 0.6, 0.6, 0.6);
  K.tone(0.4, 0.6, 0).box(0, -S * 0.7, 0, S * 1.1, S * 0.32, S * 1.1);
  return K.geometry();
}

// 放熱板の列
export function radiatorWing({ S = 44, hot = true }) {
  const K = new Kit();
  K.tone(0.25, 0, 0.1).box(0, 0, 0, S * 0.14, S * 0.14, S * 2.4);
  for (let i = 0; i < 9; i++) {
    const z = (i / 8 - 0.5) * S * 2.1;
    for (const s of [-1, 1]) {
      K.tone(0.75, 0, 0).box(s * S * 0.62, 0, z, S * 1.1, S * 0.012, S * 0.2);
      if (hot) K.tone(0.5, 3, 0).box(s * S * 1.17, 0, z, S * 0.02, S * 0.02, S * 0.2);
    }
  }
  return K.geometry();
}

// 格納庫の塊：開いた口の奥が明るい
export function hangarBlock({ seed = 8, S = 60 }) {
  const K = new Kit();
  const R = rng(seed);
  K.tone(0.4, 0.7, 0).box(0, 0, 0, S * 1.5, S * 0.8, S * 1.5, 0.92, 0.8);
  K.tone(0.5, 0, 1).box(0, -S * 0.05, S * 0.76, S * 1.0, S * 0.42, S * 0.03);
  K.tone(0.5, 2, 0).box(0, -S * 0.05, S * 0.72, S * 0.88, S * 0.34, S * 0.02);
  for (const s of [-1, 1]) {
    K.tone(0.3, 0, 0.1).box(s * S * 0.86, 0, 0, S * 0.22, S * 0.96, S * 1.7, 0.8, 0.86);
    K.box(s * S * 0.52, S * 0.48, -S * 0.2, S * 0.3, S * 0.2, S * 0.5);
    K.tone(0.6, 0.8, 0).box(s * S * 0.3, S * 0.5, S * 0.34, S * 0.34, S * 0.14, S * 0.4);
  }
  K.tone(0.2, 0, 0.15).box(0, S * 0.56, -S * 0.1, S * 0.03, S * 0.4, S * 0.03);
  greeble(K, R, -S * 0.5, S * 0.5, S * 0.4, -S * 0.6, S * 0.3, 20, S * 0.03);
  return K.geometry();
}

// 作業用の腕（格子の腕の先に吊った箱）
export function craneArm({ S = 70 }) {
  const K = new Kit();
  const seg = 8; const w = S * 0.09;
  K.tone(0.7, 0, 0.05);
  const P = (i, a, b) => [i / seg * S * 1.5 * 1 + a * w, b * w + i / seg * S * 0.25, 0];
  for (let i = 0; i < seg; i++) {
    for (const [a, b] of [[0, -1], [0, 1]]) for (const zs of [-1, 1]) K.beam([...P(i, a, b).slice(0, 2), zs * w], [...P(i + 1, a, b).slice(0, 2), zs * w], w * 0.2);
    for (const zs of [-1, 1]) K.beam([...P(i, 0, -1).slice(0, 2), zs * w], [...P(i + 1, 0, 1).slice(0, 2), zs * w], w * 0.12);
    K.beam([...P(i, 0, 1).slice(0, 2), -w], [...P(i, 0, 1).slice(0, 2), w], w * 0.12);
  }
  K.tone(0.2, 0, 0.1).box(0, 0, 0, S * 0.2, S * 0.3, S * 0.2);
  const tip = P(seg, 0, -1);
  K.tone(0.15, 0, 0.2).beam([tip[0], tip[1], 0], [tip[0], tip[1] - S * 0.42, 0], w * 0.08);
  K.tone(0.8, 0.2, 0).box(tip[0], tip[1] - S * 0.52, 0, S * 0.22, S * 0.18, S * 0.42);
  return K.geometry();
}

// 円筒を束ねた製錬の櫓。煙突の口が赤く光る
export function refineryStack({ seed = 9, S = 60 }) {
  const K = new Kit();
  const R = rng(seed);
  K.tone(0.3, 0.5, 0.1).box(0, -S * 0.5, 0, S * 1.2, S * 0.2, S * 1.2);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2; const r = S * 0.34; const h = S * (0.7 + R() * 0.6); const rr = S * (0.1 + R() * 0.07);
    K.push(Math.cos(a) * r, -S * 0.4 + h / 2, Math.sin(a) * r, Math.PI / 2);
    K.tone(0.6 + R() * 0.2, 0, 0).cyl(0, 0, 0, rr, h, 10);
    K.tone(0.5, 3, 0).cyl(0, 0, -h / 2 - 0.1, rr * 0.72, 0.1, 10);
    K.pop();
    for (let k = 0; k < 3; k++) K.tone(0.2, 0, 0.2).box(Math.cos(a) * r, -S * 0.3 + k * S * 0.28, Math.sin(a) * r, rr * 2.5, S * 0.016, rr * 2.5);
  }
  for (let k = 0; k < 4; k++) K.tone(0.2, 0, 0.2).beam([-S * 0.5, -S * 0.3 + k * S * 0.25, -S * 0.5], [S * 0.5, -S * 0.2 + k * S * 0.25, S * 0.5], S * 0.025);
  return K.geometry();
}

// 太い骨組みの柱（倒れてくる柱・横切る残骸。長さは +z）
export function heavyGirder({ L = 52, W = 7 }) {
  const K = new Kit();
  K.tone(0.4, 0, 0);
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.box(x * W * 0.42, y * W * 0.42, 0, W * 0.2, W * 0.2, L);
  const n = 7;
  K.tone(0.25, 0, 0.1);
  for (let i = 0; i < n; i++) {
    const z0 = (i / n - 0.5) * L; const z1 = ((i + 1) / n - 0.5) * L;
    for (const s of [-1, 1]) { K.beam([s * W * 0.42, -W * 0.42, z0], [s * W * 0.42, W * 0.42, z1], W * 0.08); K.beam([-W * 0.42, s * W * 0.42, z0], [W * 0.42, s * W * 0.42, z1], W * 0.08); }
  }
  K.tone(0.6, 0, 0.05);
  for (const z of [-0.5, 0, 0.5]) K.box(0, 0, z * L, W * 1.2, W * 1.2, W * 0.22);
  K.tone(0.5, 3, 0).box(0, W * 0.62, 0, W * 0.3, W * 0.03, W * 0.3);
  return K.geometry();
}

// 閉まる隔壁：分厚い鋼板に補強と警告灯。幅 130・高さ 70・厚さ 8（中心が原点）
export function blastDoor() {
  const K = new Kit();
  const W = 130; const H = 70; const T = 8;
  K.tone(0.42, 0, 0).box(0, 0, 0, W, H, T);
  K.tone(0.25, 0, 0.1);
  for (let i = -3; i <= 3; i++) { K.box(i * 18, 0, T * 0.55, 3, H * 0.92, 2.5); K.box(i * 18, 0, -T * 0.55, 3, H * 0.92, 2.5); }
  for (const y of [-0.3, 0, 0.3]) { K.box(0, y * H, T * 0.62, W * 0.96, 2.4, 2); K.box(0, y * H, -T * 0.62, W * 0.96, 2.4, 2); }
  K.tone(0.5, 4, 0);
  for (let i = -6; i <= 6; i++) { K.box(i * 9.4, H * 0.47, T * 0.7, 6.6, 3.2, 0.6); K.box(i * 9.4, -H * 0.47, T * 0.7, 6.6, 3.2, 0.6); K.box(i * 9.4, H * 0.47, -T * 0.7, 6.6, 3.2, 0.6); K.box(i * 9.4, -H * 0.47, -T * 0.7, 6.6, 3.2, 0.6); }
  return K.geometry();
}

// ---- 面の模様 ----
// 物の座標から鋼板の継ぎ目・色むら・窓を描く。aK.y：1=窓の列、2=開口の奥の灯り、3=赤熱、4=警告の帯
// WebGPU 版：標準の材質の node 版。模様の計算は colorNode の中で1回だけ行い、粗さ・金属度・凹凸・発光・遮蔽へ渡す値は
// 材質の中の変数（property）に入れて、ほかの node から読む（同じ計算を何度もしない）。

// 遠景の溶ける色（{ value: Vector3 }）を TSL の uniform として読む。同じ hazeU には同じ uniform を返す
export const hazeNode = (hazeU) => uniformOf(hazeU);

// ライトランプ：明るさで色を変える。影は周りの空の色へ寄り、光の中は少し暖かく、面が横を向く縁に空の光が回る。
// 最後の色（rgb、vec3）に掛ける。haze は TSL の node か { value: Vector3 }。法線は凹凸を付けた後の normalView を読む
export function lightRamp(rgb, haze) {
  const uHaze = haze.isNode ? haze : uniformOf(haze);
  const rampL = dot(rgb, vec3(0.3, 0.55, 0.15));
  const rampSky = uHaze.div(max(max(uHaze.r, max(uHaze.g, uHaze.b)), 1e-3));
  const rampLo = mix(vec3(1.0), rampSky.mul(1.2), 0.35);
  const lit = rgb.mul(mix(rampLo, vec3(1.07, 1.0, 0.93), smoothstep(0.012, 0.42, rampL)));
  const rampNV = clamp(dot(normalView, positionViewDirection), 0.0, 1.0);
  return lit.add(uHaze.mul(pow(float(1.0).sub(rampNV), 4.0)).mul(0.9));
}

const panelHash = /*@__PURE__*/ Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)))
  .setLayout({ name: 'panelHash', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

export function hullMaterial({ color = 0xffffff, hazeU, panel = 9, burn = 0, windowK = 1, tile = 1 }) {
  const uBurnV = { value: burn };
  const uTimeV = { value: 0 };
  const m = new THREE.MeshStandardNodeMaterial({ color, roughness: 0.68, metalness: 0.22, envMapIntensity: 0.22, fog: false });
  const uHaze = uniformOf(hazeU);
  const uBurn = uniformOf(uBurnV);
  const uHullT = uniformOf(uTimeV);
  const uPanel = uniform(panel);
  const uWinK = uniform(windowK);
  const N3 = noise3D();
  // 3次元の雑音は縮小の段（mipmap）を持たないので、段0を読んでも同じ値。条件の中で読めるよう段0で読む
  const noise = (p) => texture3D(N3, p).level(0);
  const vHP = positionGeometry.toVarying('vHP');
  const vHN = normalGeometry.toVarying('vHN');
  const vHK = attribute('aK', 'vec3').toVarying('vHK');
  // 粗さ・金属度・遮蔽・凹凸の高さ・発光（模様の計算から、ほかの node へ渡す）
  const gHEmis = property('vec3', 'gHEmis');
  const gHH = property('float', 'gHH');
  const gHRough = property('float', 'gHRough');
  const gHMetal = property('float', 'gHMetal');
  const gHAO = property('float', 'gHAO');

  m.colorNode = Fn(() => {
    gHEmis.assign(vec3(0.0));
    const an = abs(vHN);
    const uvp = select(an.x.greaterThan(an.y).and(an.x.greaterThan(an.z)), vHP.zy, select(an.y.greaterThan(an.z), vHP.zx, vHP.xy)).toVar();
    const S = uPanel;
    // 大きな板と小さな板の2段
    const g0a = uvp.div(S.mul(vec2(4.0, 1.6)));
    const g0 = vec2(g0a.x.add(step(0.5, panelHash(vec2(floor(g0a.y), 3.0))).mul(0.5)), g0a.y).toVar();
    const id0 = floor(g0); const f0 = fract(g0);
    const fw0 = fwidth(g0);
    const e0 = smoothstep(vec2(0.0), fw0.add(0.006), f0).mul(smoothstep(vec2(0.0), fw0.add(0.006), vec2(1.0).sub(f0)));
    const far0 = clamp(float(1.0).sub(max(fw0.x, fw0.y).mul(5.0)), 0.0, 1.0).toVar();
    const seam0 = mix(1.0, e0.x.mul(e0.y).mul(0.38).add(0.62), SURF_ON ? max(far0, 0.55) : far0).toVar();
    const g1 = uvp.div(S.mul(vec2(0.75, 0.33))).add(id0.mul(0.71));
    const id1 = floor(g1); const f1 = fract(g1); const fw1 = fwidth(g1);
    const far1 = clamp(float(1.0).sub(max(fw1.x, fw1.y).mul(4.0)), 0.0, 1.0).toVar();
    const e1 = smoothstep(vec2(0.0), fw1.mul(1.2).add(0.02), f1).mul(smoothstep(vec2(0.0), fw1.mul(1.2).add(0.02), vec2(1.0).sub(f1))).toVar();
    const h0 = panelHash(id0.add(vHK.x)); const h1 = panelHash(id1);
    // 新しい質感：遠くでも板1枚ずつの明るさの差を残す（板が見えないと、大きさの分からない張りぼてに見える）
    const toneFarMin = SURF_ON ? 0.7 : 0.12;
    const tone = mix(1.0, mix(SURF_ON ? 0.72 : 0.80, SURF_ON ? 1.16 : 1.10, h0), clamp(float(1.0).sub(max(fw0.x, fw0.y).mul(3.0)), toneFarMin, 1.0)).mul(mix(1.0, mix(0.90, 1.05, h1), far1)).toVar();
    // 遠くから見ても読める、区画ごとの色の差
    const id2 = floor(uvp.div(S.mul(vec2(13.0, 6.0))).add(vHK.x.mul(3.0)));
    tone.mulAssign(mix(SURF_ON ? 0.8 : 0.93, SURF_ON ? 1.12 : 1.05, panelHash(id2.add(7.0))));
    // 大きな色むらと、上から流れた汚れ
    const nA = noise(vHP.mul(0.0031).div(max(uPanel.div(9.0), 0.3)).add(vHK.x)).toVar();
    const nB = noise(vHP.mul(vec3(0.02, 0.003, 0.02)).div(max(uPanel.div(9.0), 0.3))).toVar();
    tone.mulAssign(nA.r.mul(0.56).add(0.72));
    tone.mulAssign(mix(1.0, SURF_ON ? 0.86 : 0.70, smoothstep(0.52, 0.8, nB.g)));
    const seam = seam0.mul(mix(1.0, e1.x.mul(e1.y).mul(0.10).add(0.90), far1));
    const steel0 = mix(vec3(0.125, 0.13, 0.14), vec3(0.235, 0.23, 0.22), vHK.x);
    // 所々の塗り分け（色のある板）
    const steel = mix(steel0, steel0.mul(vec3(1.12, 0.92, 0.82)), step(0.93, panelHash(id0.mul(1.7))));
    const col = materialColor.rgb.mul(steel).mul(tone).mul(seam).mul(float(1.0).sub(vHK.z.mul(0.92))).toVar();
    // 近くの細部：鋲・擦り傷・角の摩耗・粗い地肌。遠くでは消えて、ちらつかない
    const rv = uvp.div(S.mul(0.095));
    const rf = fract(rv).sub(0.5);
    const rvOn = step(0.45, panelHash(id1.mul(2.3))).mul(float(1.0).sub(e1.x.mul(e1.y)));
    const frv = fwidth(rv);
    const rivet = smoothstepR(0.30, 0.14, length(rf)).mul(rvOn).mul(clamp(float(1.0).sub(max(frv.x, frv.y).mul(1.6)), 0.0, 1.0)).toVar();
    const nearK = far1;
    // 近い所だけ細かな雑音を読む（遠くの艦や施設では読まずに軽くする）
    const pit = float(0.5).toVar(); const scratch = float(0.0).toVar();
    If(nearK.greaterThan(0.02), () => {
      const sk = max(S.div(9.0), 0.25);
      pit.assign(noise(vHP.mul(0.31).div(sk)).r);
      scratch.assign(smoothstep(0.985, 1.0, float(1.0).sub(abs(noise(vHP.mul(vec3(0.012, 0.09, 0.012)).div(sk)).g.mul(2.0).sub(1.0)))).mul(nearK));
    });
    const wear = smoothstepR(0.92, 0.55, e0.x.mul(e0.y)).mul(smoothstep(0.42, 0.70, nA.b.mul(0.5).add(pit.mul(0.5)))).mul(far0);
    col.assign(mix(col, vec3(0.30, 0.30, 0.31), clamp(wear.mul(0.75).add(scratch.mul(0.55)), 0.0, 1.0)));
    col.mulAssign(rivet.mul(0.5).add(1.0));
    gHMetal.assign(clamp(wear.mul(0.75).add(scratch.mul(0.7)), 0.0, 1.0));
    gHAO.assign(mix(1.0, seam0.mul(0.58).add(0.42), far0).mul(float(1.0).sub(vHK.z.mul(0.4))));
    gHH.assign(seam.add(rivet.mul(0.5)).add(pit.sub(0.5).mul(0.35).mul(nearK)));
    gHRough.assign(h1.sub(0.5).mul(0.25).add(float(0.5).sub(nB.g).mul(0.2)));
    // 焦げと錆：残骸ほど濃い
    const scorch = smoothstep(0.42, 0.72, nA.g.mul(0.6).add(nB.r.mul(0.4)).add(uBurn.mul(0.12)));
    col.assign(mix(col, col.mul(vec3(0.42, 0.35, 0.31)), scorch.mul(uBurn).mul(0.8)));
    // 窓：板の列ごとに並び、ところどころ消えている（画面の傾きを読むので、条件で分けずに重みで掛ける）
    const winOn = select(vHK.y.greaterThan(0.0).and(vHK.y.lessThan(2.0)), 1.0, 0.0);
    const wg = uvp.div(S.mul(vec2(0.34, 0.5)));
    const wid = floor(wg); const wf = fract(wg);
    const row = step(0.60, panelHash(vec2(wid.y.mul(1.3), floor(wid.x.div(8.0)))));
    const on = step(float(1.0).sub(vHK.y.mul(0.58)), panelHash(wid.add(3.0))).mul(row);
    const wfw = fwidth(wg);
    const mk = smoothstepR(0.26, float(0.26).sub(wfw.x).sub(0.02), abs(wf.x.sub(0.5))).mul(smoothstepR(0.16, float(0.16).sub(wfw.y).sub(0.02), abs(wf.y.sub(0.5))));
    const cool = step(0.72, panelHash(wid.mul(0.21)));
    // 遠くでは窓が1画素より小さくなるので、面積の分だけ薄く光らせる
    const dist = clamp(max(wfw.x, wfw.y).sub(0.6), 0.0, 1.0);
    const ph = panelHash(wid);
    const life = select(uBurn.greaterThan(0.5), step(0.86, panelHash(wid.mul(0.7))).mul(sin(uHullT.mul(ph.mul(6.0).add(2.0)).add(ph.mul(30.0))).mul(0.5).add(0.5)), 1.0);
    const wc = mix(vec3(1.0, 0.62, 0.28), vec3(0.62, 0.82, 1.0), cool);
    gHEmis.addAssign(wc.mul(mix(mk.mul(on), vHK.y.mul(0.34 * 0.58 * 0.5).mul(row), dist)).mul(2.4).mul(uWinK).mul(life).mul(winOn));
    // 開口の奥の灯り：区画ごとに消えている・暗い・明るいを分け、全部が同じ明るさで光る作り物らしさを崩す
    const litK = SURF_ON ? mix(0.08, 1.15, step(0.32, panelHash(id2.add(11.0)))).mul(mix(0.55, 1.0, panelHash(id2.add(23.0)))) : float(1.0);
    gHEmis.addAssign(vec3(1.0, 0.82, 0.55).mul(1.8).mul(litK).mul(select(vHK.y.greaterThanEqual(1.5).and(vHK.y.lessThan(2.5)), 1.0, 0.0)));
    gHEmis.addAssign(vec3(1.0, 0.28, 0.06).mul(2.0).mul(sin(uHullT.mul(1.1).add(vHP.z.mul(0.3))).mul(0.25).add(0.75)).mul(select(vHK.y.greaterThanEqual(2.5).and(vHK.y.lessThan(3.5)), 1.0, 0.0)));
    const stripe = step(0.5, fract(uvp.x.add(uvp.y).mul(0.11)));
    if (SURF_ON) {
      // 警告の帯：色あせ・煤・剥げて下の鋼が見える所を、場所ごとに変える（同じ黄黒が並ぶと玩具に見える）
      const yel = vec3(0.75, 0.55, 0.08).mul(mix(0.55, 1.0, panelHash(id2.add(5.0)))).mul(nA.r.mul(0.35).add(0.75));
      const sCol = mix(vec3(0.05), yel, stripe).toVar();
      const soot = smoothstep(0.45, 0.8, nB.g.mul(0.6).add(nA.g.mul(0.4)));
      sCol.assign(mix(sCol, sCol.mul(0.35), soot.mul(0.8)));
      const chip = smoothstep(0.55, 0.75, pit.mul(0.6).add(nA.b.mul(0.4))).mul(smoothstep(0.3, 0.7, nA.a));
      sCol.assign(mix(sCol, steel0.mul(1.6), chip.mul(0.85)));
      col.assign(select(vHK.y.greaterThanEqual(3.5), sCol.mul(seam), col));
    } else {
      col.assign(select(vHK.y.greaterThanEqual(3.5), mix(vec3(0.05), vec3(0.75, 0.55, 0.08), stripe), col));
    }
    // 裂け目の赤熱（残骸）
    If(uBurn.greaterThan(0.0).and(far0.greaterThan(0.05)), () => {
      const crack0 = float(1.0).sub(abs(noise(vHP.mul(0.011).add(vHK.x.mul(3.0))).b.mul(2.0).sub(1.0)));
      const crack = smoothstep(0.975, 0.998, crack0).mul(smoothstep(0.62, 0.82, nA.a)).mul(smoothstep(0.55, 0.75, nB.b));
      gHEmis.addAssign(vec3(1.0, 0.24, 0.04).mul(crack).mul(1.3).mul(uBurn).mul(sin(uHullT.mul(0.9).add(nA.b.mul(18.0))).mul(0.45).add(0.55)));
    });
    return col;
  })();
  m.roughnessNode = clamp(materialRoughness.add(gHRough).sub(gHMetal.mul(0.3)), 0.22, 1.0);
  m.metalnessNode = clamp(materialMetalness.add(gHMetal.mul(0.7)), 0.0, 1.0);
  // 継ぎ目を溝として光らせる（物の座標の模様の傾きを面の法線へ足す）
  m.normalNode = bumpNormal(materialNormal, gHH, 0.55);
  m.emissiveNode = vec3(materialEmissive).add(gHEmis);
  // 共通の質感の層（粒・つやのむら・汚れ・剥げ・彩度・接する所の暗がり）。板と鋲はここで描いているので板は足さない
  applySurface(m, { scale: Math.max(1.5, panel * 0.3), paint: true, wear: 0.6, bumpK: 0.8 });
  // 遮蔽を最後の色へ掛け、ライトランプ、遠くは空の色へ溶かす
  const lit = lightRamp(output.rgb.mul(gHAO), uHaze);
  m.outputNode = vec4(mix(lit, uHaze, smoothstep(320.0, 1500.0, length(positionView)).mul(0.62)), output.a);
  m.userData.uBurn = uBurnV;
  m.userData.uTime = uTimeV;
  return m;
}
