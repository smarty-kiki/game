// 建物の種類ごとの組み立て（形の文法）。どれも足元を y=0、中心を x=z=0 に置き、S（大きさ、m）に合わせて作る。
// 乱数 R は形を決めるためだけに使う（壊れ方の判断では使わない）。同じ種なら、無傷でも壊れていても同じ建物になる。
//
// 作りの決まり（品質の定義の観点1・2・6）：
// - 大（胴の塊）→中（階・柱・窓の帯・扉・屋根・砲身）→小（手すり・配管・通気口・灯り）の3段以上
// - 種で幅・高さ・段の数・部品の有無と位置を揺らし、左右をそろえない
// - 人の大きさの物（手すり 1.1m・扉・窓 3〜4m 間隔）を必ず置いて大きさの物差しにする

import { ROLE, DETAIL, V, hash3 } from './core.js';
import { hull, hullCyl, greebleFace, wallKit } from './hull.js';

const H = ROLE;

// ---- 共通の小物 ----
function roofGear(B, R, x0, x1, z0, z1, y, n) {
  // 屋根が大きいほど機械も大きく（基地全体の大きな屋根でも、遠くから形が読める大きさにする）
  const k = Math.min(4, Math.max(1, Math.min(x1 - x0, z1 - z0) / 30));
  for (let i = 0; i < n; i++) {
    const w = (1.2 + R() * 3.5) * k; const d = (1.2 + R() * 3) * k; const h = (0.8 + R() * 2) * k;
    const x = x0 + R() * Math.max(0.1, x1 - x0 - w) + w / 2; const z = z0 + R() * Math.max(0.1, z1 - z0 - d) + d / 2;
    const kk = R(); const dt = Math.max(w, d) * B.s >= 4 ? DETAIL.MID : DETAIL.FINE;
    // 小さな屋根の機械は小物で描く（空調の箱・通風口・小さなタンク）
    if (B.useProps && dt === DETAIL.FINE) {
      if (kk < 0.4) B.prop('vent', x, y, z, R.int(0, 3) * Math.PI / 2, w, h, d);
      else if (kk < 0.75) B.prop('acUnit', x, y, z, R.int(0, 3) * Math.PI / 2, w, h, d);
      else B.prop('tankS', x, y, z, 0, Math.min(w, d) * 0.7, h * 1.4, Math.min(w, d) * 0.7);
      continue;
    }
    if (kk < 0.4) B.box(x, y + h / 2, z, w, h, d, { role: H.GRILLE, top: H.GRILLE, c: 0.08 * k, rnd: R(), p1: w, p2: h }, 'detail', dt);
    else if (kk < 0.75) B.box(x, y + h / 2, z, w, h, d, { role: R() < 0.3 ? H.PAINT2 : H.DARK, c: 0.1 * k, rnd: R(), base: 1 }, 'detail', dt);
    else B.cyl([x, y, z], [x, y + h * 1.4, z], Math.min(w, d) * 0.35, Math.min(w, d) * 0.35, 10, { role: H.BARE, c: 0.05 * k, rnd: R(), up: [1, 0, 0] }, 'detail', dt);
  }
}
function railBox(B, x0, x1, z0, z1, y) {
  B.railing([x0, y, z0], [x1, y, z0]); B.railing([x1, y, z0], [x1, y, z1]); B.railing([x1, y, z1], [x0, y, z1]); B.railing([x0, y, z1], [x0, y, z0]);
}
// アンテナの塔（細いトラスを先細りに重ね、先に赤い灯り）
function mast(B, R, x, y, z, h, w) {
  const n = 2 + Math.floor(R() * 2);
  let y0 = y; let ww = w;
  for (let i = 0; i < n; i++) {
    const hh = h / n * (i === n - 1 ? 1.2 : 1);
    B.truss([x, y0, z], [x, y0 + hh, z], ww, ww, { up: [0, 0, 1], bay: ww * 1.4, t: Math.max(0.08, ww * 0.06), role: H.PAINT2 });
    y0 += hh; ww *= 0.62;
  }
  B.beam([x, y0, z], [x, y0 + h * 0.18, z], 0.12, 0.12, { role: H.BARE });
  B.lamp([x, y0 + h * 0.18, z], 0.45, H.BEACON, [0, 1, 0]);
  B.lamp([x + w * 0.5, y + h * 0.5, z], 0.35, H.BEACON, [1, 0, 0]);
}
// 尖塔：先細りの細い柱を段々に重ね、途中に輪と小さな張り出し、先に赤い灯り（遠くからも輪郭に出るよう中くらいの段まで描く）
function spire(B, R, x, y, z, h, r) {
  let y0 = y; let rr = r;
  const n = R.int(2, 3);
  for (let i = 0; i < n; i++) {
    const hh = h * (i === 0 ? 0.45 : 0.55 / (n - 1));
    B.cyl([x, y0, z], [x, y0 + hh, z], rr, rr * 0.7, 8, { role: i ? H.BARE : H.PAINT2, c: rr * 0.1, up: [1, 0, 0] }, 'spire', DETAIL.MID);
    B.cyl([x, y0 + hh - rr * 0.6, z], [x, y0 + hh, z], rr * 1.6, rr * 1.6, 8, { role: H.DARK, c: rr * 0.1, up: [1, 0, 0] }, 'spire', DETAIL.MID);
    if (R() < 0.6) B.box(x + rr * 2, y0 + hh * 0.6, z, rr * 3, rr * 0.8, rr * 0.8, { role: H.DARK, c: 0.05 }, 'detail', DETAIL.FINE);
    y0 += hh; rr *= 0.62;
  }
  B.lamp([x, y0, z], Math.max(0.4, r * 0.5), H.BEACON, [0, 1, 0]);
}

// 皿のアンテナ（放物面を表裏で張る。給電の角と支柱）
function dish(B, R, p, dir, r) {
  const prof = []; const n = 7;
  for (let i = 0; i <= n; i++) { const t = i / n; prof.push([t * r, t * t * r * 0.32]); }
  const [u] = V.perp(dir, [0, 1, 0]);
  // y 軸を dir へ向ける変形
  const yA = V.norm(dir); const xA = V.norm(V.cross(yA, u)); const zA = V.cross(xA, yA);
  B.pushMatrix([xA[0], xA[1], xA[2], 0, yA[0], yA[1], yA[2], 0, zA[0], zA[1], zA[2], 0, p[0], p[1], p[2], 1]);
  B.lathe(0, 0, 0, prof, 18, { role: H.PAINT2, both: true, innerRole: H.DARK, rnd: R() }, 'dish');
  B.cyl([0, r * 0.06, 0], [0, r * 0.75, 0], r * 0.05, r * 0.03, 8, { role: H.DARK, up: [1, 0, 0] }, 'detail', DETAIL.FINE);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; B.beam([Math.cos(a) * r * 0.85, r * 0.24, Math.sin(a) * r * 0.85], [0, r * 0.75, 0], r * 0.025, r * 0.025, { role: H.DARK }, DETAIL.FINE); }
  B.cyl([0, -r * 0.4, 0], [0, 0.02, 0], r * 0.12, r * 0.16, 10, { role: H.DARK, up: [1, 0, 0] });
  B.pop();
}
// 窓の帯（ガラスの細い箱を壁から少し出す）。sides：[+x, -x, +z, -z]
function windowBand(B, cx, cy, cz, sx, sz, h, sides = [1, 1, 1, 1], col = 2.6) {
  const t = 0.35;
  if (sides[0]) B.box(cx + sx / 2 + t / 2 - 0.1, cy, cz, t, h, sz * 0.92, { role: H.GLASS, facade: [col, h], c: 0.06 }, 'band', DETAIL.MID);
  if (sides[1]) B.box(cx - sx / 2 - t / 2 + 0.1, cy, cz, t, h, sz * 0.92, { role: H.GLASS, facade: [col, h], c: 0.06 }, 'band', DETAIL.MID);
  if (sides[2]) B.box(cx, cy, cz + sz / 2 + t / 2 - 0.1, sx * 0.92, h, t, { role: H.GLASS, facade: [col, h], c: 0.06 }, 'band', DETAIL.MID);
  if (sides[3]) B.box(cx, cy, cz - sz / 2 - t / 2 + 0.1, sx * 0.92, h, t, { role: H.GLASS, facade: [col, h], c: 0.06 }, 'band', DETAIL.MID);
}
// 足元の傾いた控え壁（塔・格納庫の脚）
function buttress(B, R, x, z, dirX, dirZ, h, w, d) {
  const lean = d * 0.7;
  B.box(x + dirX * d / 2, h / 2, z + dirZ * d / 2, dirX ? d : w, h, dirZ ? d : w, { tx: dirX ? 0.3 : 1, tz: dirZ ? 0.3 : 1, shx: -dirX * lean / 2, shz: -dirZ * lean / 2, role: H.PAINT, c: 0.25, base: 1, rnd: R(), panel: 2.5 }, 'box', DETAIL.MID);
  B.box(x + dirX * d * 0.9, 0.6, z + dirZ * d * 0.9, dirX ? 0.4 : w * 0.9, 1.2, dirZ ? 0.4 : w * 0.9, { role: H.HAZARD, c: 0.05, p1: 0, p2: 0 }, 'detail', DETAIL.FINE);
}

// ===================== 塔（管制塔） =====================
function tower(B, R, { S }) {
  const w = S * R.range(0.3, 0.38); const d = w * R.range(0.8, 1.1);
  const h0 = S * R.range(0.07, 0.1);
  hull(B, 0, h0 / 2, 0, w * 1.75, h0, d * 1.6, { role: H.PAINT, panel: 3, skip: [2], plateSize: 3 });
  railBox(B, -w * 0.875 + 0.3, w * 0.875 - 0.3, -d * 0.8 + 0.3, d * 0.8 - 0.3, h0);
  // 足元の荷物の箱（1.2〜2.4m）と、地面を這う配管
  for (let k = 0; k < R.int(4, 9); k++) {
    const a = R() * 6.283; const rr = Math.max(w, d) * R.range(0.95, 1.4); const cs = R.range(1.2, 2.4);
    const x = Math.cos(a) * rr; const z = Math.sin(a) * rr;
    const cw = cs * R.range(1, 1.6); const role = R() < 0.3 ? H.PAINT2 : R() < 0.5 ? H.RUST : H.CORRUGATED; const rc = R();
    if (B.useProps) B.prop('crate', x, 0, z, R() * 6.28, cw, cs, cs);
    else B.box(x, cs / 2, z, cw, cs, cs, { role, c: 0.05, rnd: rc, base: 1 }, 'detail', DETAIL.FINE);
    if (R() < 0.4) { const rr2 = R(); if (B.useProps) B.prop('crate', x + 0.3, cs, z, R() * 6.28, cs * 0.8); else B.box(x + 0.3, cs + cs * 0.4, z, cs * 0.8, cs * 0.8, cs * 0.8, { role: H.CORRUGATED, c: 0.05, rnd: rr2 }, 'detail', DETAIL.FINE); }
  }
  for (let k = 0; k < 2; k++) B.pipe([[-w * 0.9, 0.4 + k * 0.6, d * 0.85], [w * 1.3, 0.4 + k * 0.6, d * 0.85], [w * 1.3, 0.4 + k * 0.6, d * 2.2]], 0.3 - k * 0.08, { rnd: R(), detail: DETAIL.MID });
  const nT = R.int(2, 4);
  let y = h0; let tw = w; let td = d;
  const tops = [];
  for (let i = 0; i < nT; i++) {
    const th = S * R.range(0.13, 0.2) * (i === 0 ? 1.2 : 1);
    const off = [(R() - 0.5) * w * 0.12, (R() - 0.5) * d * 0.12];
    hull(B, off[0], y + th / 2, off[1], tw, th, td, { role: H.PAINT, panel: 3.2, skip: [2], plateSize: 2.8, greeble: 0.006 });
    // 段の角に縦の配管の束（同じ箱の積み重ねに見せない）
    const cs = R() < 0.5 ? 1 : -1;
    for (let k = 0; k < 2; k++) B.pipe([[off[0] + cs * (tw / 2 + 0.5 + k * 0.6), y + 0.5, off[1] + td / 2 - 1.5], [off[0] + cs * (tw / 2 + 0.5 + k * 0.6), y + th - 0.5, off[1] + td / 2 - 1.5]], 0.25 + 0.1 * k, { rnd: R(), detail: DETAIL.MID });
    // 段ごとに違う張り出し（片側の箱）
    if (R() < 0.7) { const sx = R() < 0.5 ? 1 : -1; const bw = tw * R.range(0.15, 0.25); B.box(off[0] + sx * (tw / 2 + bw / 2), y + th * R.range(0.3, 0.7), off[1] + (R() - 0.5) * td * 0.4, bw, th * R.range(0.3, 0.5), td * R.range(0.3, 0.6), { role: H.PAINT, c: 0.3, panel: 2.4, rnd: R(), base: 1 }, 'box', DETAIL.MID); }
    // 窓の帯（1〜2本、向きは種で選ぶ）
    const nb = R.int(2, 3);
    for (let k = 0; k < nb; k++) windowBand(B, off[0], y + th * (0.25 + 0.6 * k / Math.max(1, nb - 1)), off[1], tw, td, R.range(1.0, 1.4), [R() < 0.8, R() < 0.8, 1, R() < 0.6].map(Number), R.range(2.2, 3.2));
    // 段の縁の張り出しと手すり
    if (i < nT - 1) {
      const nw = tw * R.range(0.72, 0.88); const nd = td * R.range(0.72, 0.9);
      B.box(off[0], y + th + 0.25, off[1], tw + 1.2, 0.5, td + 1.2, { role: H.DARK, c: 0.12 }, 'box', DETAIL.MID);
      railBox(B, off[0] - tw / 2 - 0.3, off[0] + tw / 2 + 0.3, off[1] - td / 2 - 0.3, off[1] + td / 2 + 0.3, y + th + 0.5);
      for (const sx of [-1, 1]) B.lamp([off[0] + sx * (tw / 2 + 0.6), y + th + 0.5, off[1] + td / 2 + 0.6], 0.35, H.LAMP, [0, 0, 1]);
      tops.push([off, y + th]);
      tw = nw; td = nd;
    }
    y += th;
  }
  // 控え壁（足元の傾いた脚）
  const by = h0;
  B.push(0, by, 0);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (R() < 0.85) buttress(B, R, dx * w / 2, dz * d / 2, dx, dz, S * R.range(0.12, 0.18), (dx ? d : w) * 0.32, (dx ? w : d) * 0.22);
  B.pop();
  // 昇降の縦の箱と配管
  const side = R() < 0.5 ? 1 : -1;
  const shH = y - h0;
  B.box(side * (w / 2 + 1.6), h0 + shH * 0.48, d * 0.15, 3.2, shH * 0.96, 3.6, { role: H.PAINT2, c: 0.2, panel: 2.4, rnd: R() }, 'box', DETAIL.MID);
  for (let k = 0; k < 3; k++) B.pipe([[side * (w / 2 + 0.5), h0, -d * 0.3 + k * 0.7], [side * (w / 2 + 0.5), y - 2, -d * 0.3 + k * 0.7]], 0.22 - k * 0.04, { rnd: R() });
  // 管制室：上の段より広い、ガラスの帯が外へ傾く
  const cw = tw * R.range(1.25, 1.5); const cd = td * R.range(1.25, 1.5); const ch = S * R.range(0.055, 0.075);
  B.box(0, y + 0.6, 0, cw * 0.9, 1.2, cd * 0.9, { role: H.DARK, c: 0.2 }, 'box', DETAIL.MASS);
  B.box(0, y + 1.2 + ch / 2, 0, cw, ch, cd, { role: H.GLASS, top: H.PAINT, bottom: H.DARK, tx: 1.12, tz: 1.12, facade: [1.5, ch / 2], c: 0.15 }, 'cab', DETAIL.MASS);
  const ry = y + 1.2 + ch;
  hull(B, 0, ry + 0.9, 0, cw * 1.16, 1.8, cd * 1.16, { role: H.PAINT, panel: 2.6, plates: false, greeble: false });
  roofGear(B, R, -cw * 0.5, cw * 0.5, -cd * 0.5, cd * 0.5, ry + 1.8, R.int(3, 6));
  railBox(B, -cw * 0.56, cw * 0.56, -cd * 0.56, cd * 0.56, ry + 1.8);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.lamp([sx * cw * 0.58, ry + 1.9, sz * cd * 0.58], 0.4, H.BEACON, [0, 1, 0]);
  mast(B, R, (R() - 0.5) * cw * 0.3, ry + 1.8, (R() - 0.5) * cd * 0.3, S * R.range(0.14, 0.24), Math.max(1.2, cw * 0.1));
  // 頂の尖塔（1〜3本、高さを変える）
  for (let k = 0; k < R.int(1, 3); k++) spire(B, R, (R() - 0.5) * cw * 0.8, ry + 1.8, (R() - 0.5) * cd * 0.8, S * R.range(0.15, 0.35), Math.max(0.5, S * 0.009));
  if (R() < 0.8) dish(B, R, [cw * 0.35 * (R() < 0.5 ? 1 : -1), ry + 4.5, cd * 0.2], V.norm([R() - 0.5, 0.8, R() - 0.5]), S * R.range(0.04, 0.06));
  // 塔と砲台の赤い印（このゲームの決まり：赤は塔・砲台・敵の印だけ）
  B.box(0, y - 2.2, td / 2 + 0.12, tw * 0.4, 1.2, 0.24, { role: H.RED, c: 0.04 }, 'detail', DETAIL.FINE);
}

// ===================== 砲台 =====================
function turret(B, R, { S, yaw, pitch }) {
  const pw = S * R.range(0.95, 1.15);
  hull(B, 0, S * 0.04, 0, pw, S * 0.08, pw * R.range(0.9, 1.05), { role: H.PAINT, panel: 2.6, skip: [2], plateSize: 2.4, greeble: 0.004 });
  const y0 = S * 0.08;
  const rb = S * R.range(0.33, 0.4);
  B.cyl([0, y0, 0], [0, y0 + S * 0.035, 0], rb * 1.12, rb * 1.12, 28, { role: H.HAZARD, c: 0.12, up: [1, 0, 0] }, 'ring', DETAIL.MID);
  B.cyl([0, y0 + S * 0.035, 0], [0, y0 + S * 0.16, 0], rb, rb * 0.95, 28, { role: H.PAINT, c: 0.25, panel: 2.2, up: [1, 0, 0] }, 'ring', DETAIL.MASS);
  // 台の段と、まわりの点検口
  B.cyl([0, y0 + S * 0.16, 0], [0, y0 + S * 0.175, 0], rb * 0.9, rb * 0.9, 28, { role: H.DARK, c: 0.05, up: [1, 0, 0] }, 'ring', DETAIL.MID);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.2; B.box(Math.cos(a) * rb * 0.98, y0 + S * 0.09, Math.sin(a) * rb * 0.98, S * 0.06, S * 0.08, S * 0.04, { role: H.DARK, c: 0.05 }, 'detail', DETAIL.FINE); }
  railBox(B, -pw / 2 + 0.4, pw / 2 - 0.4, -pw / 2 + 0.4, pw / 2 - 0.4, y0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.lamp([sx * (pw / 2 - 0.5), y0 + 0.1, sz * (pw / 2 - 0.5)], 0.32, H.LAMP, [0, 1, 0]);
  // 回る砲塔（前が傾いた角ばった胴）
  const yA = yaw ?? R.range(-0.9, 0.9);
  B.push(0, y0 + S * 0.175, 0, 0, yA, 0);
  const wb = rb * 1.28; const db = rb * 1.7; const hh = S * R.range(0.3, 0.36);
  const c8 = [];
  for (let i = 0; i < 8; i++) {
    const ix = i & 1; const iy = (i >> 1) & 1; const iz = (i >> 2) & 1;
    const x = (ix ? 0.5 : -0.5) * wb * (iy ? 0.82 : 1);
    const z = iz ? (iy ? db * 0.12 : db * 0.48) : (iy ? -db * 0.4 : -db * 0.52);
    c8.push([x, iy ? hh : 0, z]);
  }
  B.hexa(c8, { role: H.PAINT, c: S * 0.012, panel: 2.4, base: 0.6, rnd: R() }, 'housing', DETAIL.MASS);
  // 頬の箱と後ろの張り出し
  for (const sx of [-1, 1]) {
    B.box(sx * wb * 0.52, hh * 0.42, -db * 0.08, wb * 0.16, hh * 0.62, db * 0.62, { role: R() < 0.3 ? H.PAINT2 : H.PAINT, c: 0.18, panel: 1.8, rnd: R(), tx: 0.85 }, 'box', DETAIL.MID);
    B.box(sx * wb * 0.6, hh * 0.62, -db * 0.08, 0.12, hh * 0.06, db * 0.3, { role: H.RED, c: 0.02 }, 'detail', DETAIL.FINE);
    for (let k = 0; k < 3; k++) B.box(sx * wb * 0.6, hh * 0.18, -db * 0.3 + k * db * 0.18, 0.5, 0.5, db * 0.12, { role: H.GRILLE, c: 0.04, p1: db * 0.12, p2: 0.5 }, 'detail', DETAIL.FINE);
  }
  B.box(0, hh * 0.45, -db * 0.62, wb * 0.7, hh * 0.6, db * 0.25, { role: H.PAINT, c: 0.2, panel: 1.8, rnd: R() }, 'box', DETAIL.MID);
  B.box(0, hh * 0.55, -db * 0.76, wb * 0.5, hh * 0.3, 0.3, { role: H.GRILLE, c: 0.05, p1: wb * 0.5, p2: hh * 0.3 }, 'detail', DETAIL.FINE);
  // 照準の箱とレンズ、ひげのアンテナ
  B.box(-wb * 0.22, hh + 0.7, db * 0.02, wb * 0.24, 1.4, wb * 0.3, { role: H.DARK, c: 0.1 }, 'box', DETAIL.MID);
  B.box(-wb * 0.22, hh + 0.75, db * 0.02 + wb * 0.155, wb * 0.14, 0.6, 0.12, { role: H.GLASS, facade: [0.5, 0.6] }, 'detail', DETAIL.FINE);
  B.beam([wb * 0.3, hh, -db * 0.3], [wb * 0.3, hh + S * 0.16, -db * 0.3], 0.06, 0.06, { role: H.BARE }, DETAIL.FINE);
  B.lamp([wb * 0.3, hh + S * 0.16, -db * 0.3], 0.25, H.BEACON, [0, 1, 0]);
  // 砲身（1〜3本）。基部の防盾から先へ、段々に細く。先に制退器
  const nB = R.pick([2, 2, 2, 3]);
  const pA = pitch ?? R.range(0.12, 0.35);
  const bl = S * R.range(0.75, 0.95); const br = S * R.range(0.022, 0.028);
  B.push(0, hh * 0.52, db * 0.36, -pA, 0, 0);
  B.box(0, 0, 0, wb * 0.55, hh * 0.55, db * 0.18, { role: H.DARK, c: 0.15, rnd: R() }, 'box', DETAIL.MID);
  for (let k = 0; k < nB; k++) {
    const x = (k - (nB - 1) / 2) * Math.max(wb * 0.16, br * 3.2);
    let z = db * 0.05; let r = br;
    for (let s = 0; s < 3; s++) {
      const L = bl * [0.22, 0.38, 0.4][s];
      B.cyl([x, 0, z], [x, 0, z + L], r, r * 0.97, 12, { role: s === 0 ? H.DARK : H.BARE, c: r * 0.15, up: [0, 1, 0] }, 'barrel', DETAIL.MID);
      z += L; r *= 0.82;
    }
    B.box(x, 0, z + br * 1.2, br * 2.6, br * 2.6, br * 2.4, { role: H.DARK, c: br * 0.2 }, 'detail', DETAIL.MID);
    B.box(x, 0, z + br * 1.2, br * 2.7, br * 0.9, br * 1.2, { role: H.GRILLE, c: 0.02, p1: br, p2: br }, 'detail', DETAIL.FINE);
  }
  B.pop();
  B.pop();
}

// ===================== 格納庫 =====================
function hangar(B, R, { S }) {
  const L = S; const W = S * R.range(0.5, 0.65); const Ht = S * R.range(0.26, 0.34);
  hull(B, 0, Ht / 2, 0, W, Ht, L, { role: H.PAINT, panel: 3.6, skip: [2], plateSize: 3.6, greeble: 0.004 });
  // 正面の扉の枠（柱と梁、警告の縞）と、半分開いた扉の板、奥の暗がり
  const fz = L / 2;
  const ow = W * R.range(0.62, 0.78); const oh = Ht * R.range(0.68, 0.8);
  B.box(0, oh / 2, fz + 0.4, ow, oh, 0.8, { role: H.INNER, side: H.GLOW, c: 0.05 }, 'box', DETAIL.MASS);
  // 口の奥行き：天井と側壁を前へ張り出し、床に灯りの列（中が見える奥の部屋に見せる）
  const pd = Math.min(ow * 0.25, 9);
  B.box(0, oh + 0.6, fz + pd / 2, ow, 1.2, pd, { role: H.INNER, top: H.PAINT, c: 0.1 }, 'box', DETAIL.MID);
  for (let k = 0; k < 3; k++) B.lamp([(k - 1) * ow * 0.3, oh, fz + pd * 0.5], 0.5, H.LAMP, [0, -1, 0]);
  for (let k = 0; k < 4; k++) B.box((R() - 0.5) * ow * 0.7, 1.2, fz + 1.5 + R() * pd * 0.6, 2.4, 2.4, 2.4 + R() * 3, { role: R() < 0.5 ? H.DARK : H.CORRUGATED, c: 0.06, rnd: R(), base: 1 }, 'detail', DETAIL.FINE);
  for (const sx of [-1, 1]) {
    B.box(sx * (ow / 2 + 1.2), Ht * 0.5, fz + 1.2, 2.4, Ht, 2.4, { role: H.PAINT, c: 0.25, panel: 2.2, rnd: R() }, 'box', DETAIL.MASS);
    B.box(sx * (ow / 2 + 0.05), oh / 2, fz + 1.3, 0.35, oh, 0.6, { role: H.HAZARD, c: 0.04 }, 'detail', DETAIL.MID);
  }
  B.box(0, oh + (Ht - oh) / 2, fz + 1.2, ow + 4.8, Ht - oh, 2.4, { role: H.PAINT, c: 0.25, panel: 2.6 }, 'box', DETAIL.MASS);
  B.box(0, oh + 0.25, fz + 1.35, ow, 0.5, 0.4, { role: H.HAZARD, c: 0.04 }, 'detail', DETAIL.MID);
  const open = R.range(0.25, 0.6);
  const nd = R.int(2, 3); const dw = ow / nd;
  for (let k = 0; k < nd; k++) {
    if (k === Math.floor(nd / 2) && open > 0.4) continue;
    const x = -ow / 2 + dw * (k + 0.5) + (k < nd / 2 ? -1 : 1) * dw * open * 0.6;
    B.box(x, oh / 2, fz + 0.9 + k * 0.05, dw * 0.98, oh, 0.5, { role: H.PAINT2, c: 0.1, panel: 2.2, rnd: R(), panelAspect: 0.5 }, 'door', DETAIL.MID);
    B.box(x, 0.7, fz + 1.18 + k * 0.05, dw * 0.96, 1.4, 0.08, { role: H.HAZARD }, 'detail', DETAIL.FINE);
  }
  for (let k = 0; k < 4; k++) B.lamp([(k - 1.5) * ow * 0.22, oh - 1.2, fz + 0.85], 0.5, H.LAMP, [0, 0, 1]);
  for (const sx of [-1, 1]) B.lamp([sx * (ow / 2 + 1.2), oh + 1.5, fz + 2.5], 0.45, H.LAMP, [0, 0, 1]);
  // 側面の肋（一定でない間隔の控え）
  const nr = Math.max(2, Math.round(L / R.range(7, 10)));
  for (let k = 0; k < nr; k++) {
    const z = -L / 2 + (k + 0.5) * L / nr + (R() - 0.5) * 1.5;
    for (const sx of [-1, 1]) B.box(sx * (W / 2 + 0.6), Ht * 0.45, z, 1.2, Ht * 0.9, 1.4, { role: H.PAINT, c: 0.2, tx: 0.6, rnd: R(), base: 1 }, 'box', DETAIL.MID);
  }
  // 屋根：棟の箱・換気の箱・天窓の帯・アンテナ
  B.box(0, Ht + 1.2, 0, W * 0.3, 2.4, L * 0.85, { role: H.PAINT, c: 0.3, panel: 3, tx: 0.7 }, 'box', DETAIL.MID);
  for (let k = 0; k < 2; k++) B.box((k ? 1 : -1) * W * 0.28, Ht + 0.2, 0, 0.8, 0.4, L * 0.8, { role: H.STRIP, c: 0.05 }, 'detail', DETAIL.FINE);
  roofGear(B, R, -W * 0.45, W * 0.45, -L * 0.45, L * 0.45, Ht, R.int(5, 10));
  railBox(B, -W / 2 + 0.4, W / 2 - 0.4, -L / 2 + 0.4, L / 2 - 0.4, Ht);
  if (R() < 0.7) mast(B, R, W * 0.3, Ht, -L * 0.35, S * 0.18, 1.3);
  // 脇の事務棟（窓の並ぶ壁）
  const na = R.int(1, 2);
  for (let k = 0; k < na; k++) {
    const sx = k ? -1 : (R() < 0.5 ? 1 : -1);
    const aw = W * R.range(0.22, 0.32); const ah = Ht * R.range(0.4, 0.7); const al = L * R.range(0.25, 0.45);
    const az = (R() - 0.5) * (L - al) * 0.8;
    hull(B, sx * (W / 2 + aw / 2), ah / 2, az, aw, ah, al, { role: H.PAINT, side: H.FACADE, facade: [R.range(2.6, 3.4), 3.6], skip: [2], greeble: 0.003, plates: false });
    railBox(B, sx * (W / 2) - aw / 2 + sx * aw / 2 + 0.3, sx * (W / 2) + aw / 2 + sx * aw / 2 - 0.3, az - al / 2 + 0.3, az + al / 2 - 0.3, ah);
  }
  // 壁沿いの配管
  const py = Ht * R.range(0.2, 0.5);
  for (let k = 0; k < 2; k++) B.pipe([[-W / 2 - 0.5 - k * 0.5, py + k * 0.6, -L / 2 + 2], [-W / 2 - 0.5 - k * 0.5, py + k * 0.6, L / 2 - 4], [-W / 2 - 0.5 - k * 0.5, Ht + 0.6, L / 2 - 4]], 0.28 - k * 0.06, { rnd: R() });
}

// ===================== 橋 =====================
function bridge(B, R, { S, w, legs = 0 }) {
  const L = S; const bw = w ?? Math.max(5, S * R.range(0.06, 0.09)); const bh = bw * R.range(0.8, 1.1);
  const a = [0, bh / 2, -L / 2]; const b = [0, bh / 2, L / 2];
  B.truss(a, b, bw, bh, { up: [0, 1, 0], bay: bh * 1.1, open: true, role: H.PAINT });
  // 歩く床と手すり
  B.box(0, 0.25, 0, bw * 0.92, 0.5, L, { role: H.DARK, top: H.DECK, c: 0.06, p1: 1.2, p2: 1.2 }, 'deck', DETAIL.MASS);
  B.railing([-bw * 0.42, 0.5, -L / 2], [-bw * 0.42, 0.5, L / 2]);
  B.railing([bw * 0.42, 0.5, -L / 2], [bw * 0.42, 0.5, L / 2]);
  // 床の下の配管と、間隔の灯り
  for (let k = 0; k < 3; k++) B.pipe([[(k - 1) * bw * 0.25, -0.6 - k * 0.15, -L / 2], [(k - 1) * bw * 0.25, -0.6 - k * 0.15, L / 2]], 0.25 - k * 0.04, { rnd: R(), flange: 8 });
  const nl = Math.max(2, Math.round(L / 14));
  for (let k = 0; k <= nl; k++) for (const sx of [-1, 1]) B.lamp([sx * bw * 0.5, bh * 0.9, -L / 2 + k * L / nl], 0.3, H.LAMP, [sx, 0, 0]);
  // 脚（甲板まで下ろす）
  if (legs > 0) for (const sz of [-1, 1]) for (const sx of [-1, 1]) B.truss([sx * bw * 0.45, 0, sz * L * 0.42], [sx * bw * 0.45, -legs, sz * L * 0.42], 1.2, 1.2, { up: [0, 0, 1], bay: 2.4, role: H.PAINT });
  // 両端の門（太い枠と警告の縞）
  for (const sz of [-1, 1]) {
    B.box(0, bh / 2, sz * L / 2, bw * 1.25, bh * 1.15, 1.6, { role: H.PAINT, c: 0.2, panel: 2 }, 'box', DETAIL.MASS);
    B.box(0, bh * 0.5, sz * (L / 2 + 0.85), bw * 0.8, bh * 0.75, 0.1, { role: H.INNER }, 'detail', DETAIL.MID);
    B.box(0, bh * 1.05, sz * (L / 2 + 0.85), bw * 1.1, 0.4, 0.12, { role: H.HAZARD }, 'detail', DETAIL.FINE);
  }
}

// ===================== ステーションの区画（円筒か八角の胴） =====================
function module(B, R, { S, onDeck }) {
  const L = S; const r = S * R.range(0.13, 0.19);
  const cy = r * 1.05;
  hullCyl(B, 0, cy, 0, r, L, { role: H.PAINT, seg: 18, panel: 3.4 });
  // 輪の補強
  const nr = R.int(2, 4);
  for (let k = 0; k < nr; k++) {
    const z = -L / 2 + (k + 0.5 + (R() - 0.5) * 0.3) * L / nr;
    B.cyl([0, cy, z - 0.9], [0, cy, z + 0.9], r * 1.07, r * 1.07, 24, { role: H.DARK, c: 0.2, up: [1, 0, 0], capA: false, capB: false }, 'ring', DETAIL.MID);
    if (R() < 0.5) B.cyl([0, cy, z - 0.25], [0, cy, z + 0.25], r * 1.08, r * 1.08, 24, { role: H.HAZARD, up: [1, 0, 0], capA: false, capB: false }, 'ring', DETAIL.FINE);
  }
  // 両端：円錐の肩と、警告の縞のついたドッキングの口
  for (const sz of [-1, 1]) {
    const z0 = sz * L / 2; const z1 = sz * (L / 2 + r * 0.45);
    B.cyl([0, cy, z0], [0, cy, z1], r, r * 0.55, 18, { role: H.PAINT, c: 0.2, panel: 3, capA: false, capB: true, up: [1, 0, 0] }, 'hull', DETAIL.MASS);
    B.cyl([0, cy, z1], [0, cy, z1 + sz * 2.2], r * 0.42, r * 0.42, 18, { role: H.DARK, c: 0.2, up: [1, 0, 0] }, 'port', DETAIL.MID);
    B.cyl([0, cy, z1 + sz * 2.2], [0, cy, z1 + sz * 2.8], r * 0.46, r * 0.46, 18, { role: H.HAZARD, c: 0.12, capRole: H.INNER, up: [1, 0, 0] }, 'port', DETAIL.MID);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; B.lamp([Math.cos(a) * r * 0.48, cy + Math.sin(a) * r * 0.48, z1 + sz * 2.85], 0.35, H.LAMP, [0, 0, sz]); }
  }
  // 窓の帯（区画の横に1本）
  const wa = R.range(0.2, 0.6);
  B.push(0, cy, 0, 0, 0, wa);
  B.box(r + 0.15, 0, 0, 0.5, 1.4, L * 0.7, { role: H.GLASS, facade: [2.2, 1.4], c: 0.06 }, 'band', DETAIL.MID);
  B.pop();
  // 放熱板の翼（トラスの腕の先に、溝のある暗い板）
  if (R() < 0.85) {
    const side = R() < 0.5 ? 1 : -1;
    const rl = L * R.range(0.35, 0.55); const rw = r * R.range(1.6, 2.6);
    B.truss([side * r, cy, -rl * 0.3], [side * (r + rw * 0.5), cy, -rl * 0.3], 1.4, 1.4, { up: [0, 1, 0], bay: 2, role: H.DARK });
    for (let k = 0; k < 3; k++) B.box(side * (r + rw * 0.55 + k * rw * 0.36), cy, -rl * 0.3, rw * 0.34, 0.35, rl, { role: H.GRILLE, top: H.GRILLE, bottom: H.GRILLE, c: 0.05, p1: 0.8, p2: rl, rnd: R() }, 'radiator', DETAIL.MID);
  }
  // 上のアンテナと箱
  for (let k = 0; k < R.int(2, 5); k++) {
    const z = (R() - 0.5) * L * 0.8; const a = Math.PI / 2 + (R() - 0.5) * 1.2;
    const p = [Math.cos(a) * r, cy + Math.sin(a) * r, z];
    if (R() < 0.6) B.box(p[0], p[1] + 0.8, z, 2 + R() * 3, 1.6, 2 + R() * 4, { role: R() < 0.3 ? H.PAINT2 : H.DARK, c: 0.12, rnd: R() }, 'detail', DETAIL.FINE);
    else B.beam(p, [p[0], p[1] + 4 + R() * 6, z], 0.12, 0.12, { role: H.BARE }, DETAIL.FINE);
  }
  // 支える台（基地の上に置くとき）
  if (onDeck) for (const sz of [-1, 1]) B.box(0, cy * 0.3, sz * L * 0.3, r * 1.2, cy * 0.6, 2.4, { role: H.DARK, c: 0.2, tx: 1.3 }, 'box', DETAIL.MID);
}

// ===================== ドッキングリング =====================
function ring(B, R, { S }) {
  const Rr = S / 2; const n = R.int(14, 22);
  const thick = S * R.range(0.06, 0.085); const depth = S * R.range(0.05, 0.08);
  const cy = Rr + thick;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const big = i % 2 === 0 || R() < 0.2;
    // すき間を空けない（つながった輪に見せる）。大きな区画は少し重ねる
    const segL = 2 * Math.PI * Rr / n * (big ? 1.04 : 1.0);
    B.push(Math.cos(a) * Rr, cy + Math.sin(a) * Rr, 0, 0, 0, a);
    // 区画の箱は局所で x＝外向き、y＝輪に沿う向き
    if (big) hull(B, 0, 0, 0, thick * 1.25, segL, depth * 1.2, { role: H.PAINT, panel: 2.6, plateSize: Math.max(3, thick * 0.4), greeble: 0.004, interior: false, wall: false });
    else B.box(0, 0, 0, thick, segL, depth, { role: R() < 0.3 ? H.PAINT2 : H.PAINT, c: 0.3, panel: 2.4, rnd: R() }, 'box', DETAIL.MASS);
    if (big && R() < 0.5) B.box(thick * 0.66, 0, 0, 0.12, segL * 0.5, depth * 0.6, { role: H.HAZARD }, 'detail', DETAIL.FINE);
    if (big) B.lamp([thick * 0.66, segL * 0.3, depth * 0.62], 0.4, R() < 0.25 ? H.BEACON : H.LAMP, [0, 0, 1]);
    // 内側のトラス
    B.beam([-thick * 0.6, -segL / 2, depth * 0.3], [-thick * 0.6, segL / 2, depth * 0.3], 0.6, 0.6, { role: H.DARK, up: [1, 0, 0] });
    B.beam([-thick * 0.6, -segL / 2, -depth * 0.3], [-thick * 0.6, segL / 2, -depth * 0.3], 0.6, 0.6, { role: H.DARK, up: [1, 0, 0] });
    B.beam([-thick * 0.6, -segL / 2, depth * 0.3], [-thick * 0.6, segL / 2, -depth * 0.3], 0.35, 0.35, { role: H.DARK, up: [1, 0, 0] });
    B.pop();
  }
  // 支柱（下の台へ）
  B.box(0, thick * 0.5, 0, S * 0.18, thick, depth * 2.2, { role: H.PAINT, c: 0.3, panel: 2.6 }, 'box', DETAIL.MASS);
}

// ===================== タンク群 =====================
function tanks(B, R, { S }) {
  const n = R.int(3, 6); const r = S * R.range(0.08, 0.11); const h = S * R.range(0.35, 0.5);
  const gap = r * 2.5;
  const fx = (n - 1) * gap / 2;
  B.truss([-fx - r * 1.5, h + r * 1.2, 0], [fx + r * 1.5, h + r * 1.2, 0], r * 0.5, r * 0.5, { up: [0, 0, 1], role: H.PAINT });
  B.box(0, 0.4, 0, n * gap + r, 0.8, r * 3.2, { role: H.DARK, top: H.DECK, c: 0.1, p1: 1, p2: 1 }, 'box', DETAIL.MASS);
  for (let i = 0; i < n; i++) {
    const x = -fx + i * gap; const hh = h * R.range(0.85, 1.05);
    const prof = [[0, 0.8], [r * 0.8, 0.8], [r, 0.8 + r * 0.25], [r, 0.8 + hh], [r * 0.85, 0.8 + hh + r * 0.4], [r * 0.45, 0.8 + hh + r * 0.62], [0, 0.8 + hh + r * 0.68]];
    B.lathe(x, 0, 0, prof, 18, { role: R() < 0.25 ? H.PAINT2 : H.PAINT, panel: 3, rnd: R(), edgeRows: [1, 3] }, 'tank', DETAIL.MASS);
    B.cyl([x, 0.8 + hh * 0.3, 0], [x, 0.8 + hh * 0.3 + 0.5, 0], r * 1.02, r * 1.02, 18, { role: H.DARK, up: [1, 0, 0], capA: false, capB: false }, 'ring', DETAIL.FINE);
    B.pipe([[x, 1.6, r * 0.95], [x, 1.6, r * 1.6], [x + gap, 1.6, r * 1.6]], r * 0.12, { rnd: R() });
    B.lamp([x, 0.8 + hh + r * 0.7, 0], 0.3, H.BEACON, [0, 1, 0]);
  }
}

// ===================== 地上：工場 =====================
function factory(B, R, { S }) {
  const nh = R.int(1, 3);
  let x0 = -S * 0.45;
  for (let i = 0; i < nh; i++) {
    const w = S * R.range(0.22, 0.34); const l = S * R.range(0.4, 0.7); const h = S * R.range(0.08, 0.13);
    const z = (R() - 0.5) * S * 0.2;
    hull(B, x0 + w / 2, h / 2, z, w, h, l, { role: H.CORRUGATED, top: H.CONCRETE, side: H.CORRUGATED, skip: [2], plates: false, greeble: 0.003, panel: 0 });
    // のこぎり屋根（片側が窓の三角の棟を並べる）
    const nt = Math.max(2, Math.round(l / (h * 0.9)));
    for (let k = 0; k < nt; k++) {
      const zz = z - l / 2 + (k + 0.5) * l / nt; const tl = l / nt;
      const c8 = [];
      for (let j = 0; j < 8; j++) {
        const ix = j & 1; const iy = (j >> 1) & 1; const iz = (j >> 2) & 1;
        c8.push([x0 + (ix ? w : 0), h + (iy && iz ? h * 0.32 : 0), zz + (iz ? tl / 2 : -tl / 2)]);
      }
      B.hexa(c8, { role: H.CORRUGATED, side: H.CORRUGATED, c: 0.05 }, 'roof', DETAIL.MID);
      B.box(x0 + w / 2, h + h * 0.16, zz + tl / 2 - 0.05, w * 0.96, h * 0.28, 0.12, { role: H.GLASS, facade: [2.2, h * 0.28] }, 'band', DETAIL.FINE);
    }
    // 壁の窓の帯
    windowBand(B, x0 + w / 2, h * 0.7, z, w, l, h * 0.18, [1, 1, 0, 0], 2.5);
    x0 += w + S * R.range(0.03, 0.08);
  }
  // 煙突（1〜3本、帯つき）
  const nc = R.int(1, 3);
  for (let k = 0; k < nc; k++) {
    const x = S * R.range(-0.4, 0.4); const z = S * R.range(0.25, 0.42) * (R() < 0.5 ? 1 : -1);
    const ch = S * R.range(0.35, 0.6); const cr = S * R.range(0.025, 0.04);
    B.lathe(x, 0, z, [[cr * 1.6, 0], [cr * 1.3, ch * 0.08], [cr, ch * 0.5], [cr * 0.85, ch], [cr * 0.7, ch], [cr * 0.7, ch * 0.98]], 16, { role: H.CONCRETE, rnd: R(), both: true, innerRole: H.DARK }, 'chimney', DETAIL.MASS);
    for (let b = 0; b < 3; b++) { const y = ch * (0.7 + b * 0.1); B.cyl([x, y, z], [x, y + ch * 0.03, z], cr * (0.95 - b * 0.05), cr * (0.95 - b * 0.05), 16, { role: b % 2 ? H.PAINT2 : H.RED, up: [1, 0, 0] }, 'ring', DETAIL.MID); }
    B.lamp([x + cr, ch * 0.97, z], 0.6, H.BEACON, [1, 0, 0]);
  }
  // 冷却塔（双曲面、内外を張る）
  if (R() < 0.6) {
    const x = S * R.range(-0.3, 0.3); const z = -S * R.range(0.3, 0.42); const tr = S * R.range(0.08, 0.12); const th = tr * R.range(2.2, 2.8);
    const prof = []; for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push([tr * (0.62 + 0.38 * Math.pow(Math.abs(t - 0.72) / 0.72, 2) * (t < 0.72 ? 1 : 0.5)), t * th]); }
    B.lathe(x, 0, z, prof, 28, { role: H.CONCRETE, both: true, innerRole: H.DARK, rnd: R(), panel: 0 }, 'cooling', DETAIL.MASS);
  }
  // 配管の架台（柱と梁と管）
  const pz = S * R.range(0.1, 0.2);
  const ph = S * R.range(0.05, 0.08);
  for (let k = 0; k < 8; k++) { const x = -S * 0.45 + k * S * 0.12; B.beam([x, 0, pz - 1.5], [x, ph, pz - 1.5], 0.4, 0.4, { role: H.RUST }); B.beam([x, 0, pz + 1.5], [x, ph, pz + 1.5], 0.4, 0.4, { role: H.RUST }); B.beam([x, ph, pz - 1.5], [x, ph, pz + 1.5], 0.35, 0.35, { role: H.RUST }); }
  for (let k = 0; k < 3; k++) B.pipe([[-S * 0.45, ph + 0.5 + k * 0.1, pz - 1 + k], [S * 0.4, ph + 0.5 + k * 0.1, pz - 1 + k]], 0.35 - k * 0.07, { role: H.RUST, rnd: R(), flange: 9 });
  // 門形のクレーン
  if (R() < 0.7) {
    const cx = S * R.range(-0.2, 0.2); const cz = S * R.range(0.32, 0.45); const cw = S * R.range(0.18, 0.28); const chh = S * R.range(0.1, 0.16);
    for (const sx of [-1, 1]) B.truss([cx + sx * cw / 2, 0, cz], [cx + sx * cw / 2, chh, cz], 1.4, 1.4, { up: [0, 0, 1], role: H.HAZARD, bay: 2 });
    B.truss([cx - cw / 2 - 2, chh + 0.8, cz], [cx + cw / 2 + 2, chh + 0.8, cz], 1.6, 1.6, { up: [0, 1, 0], role: H.HAZARD, bay: 2 });
    B.box(cx + (R() - 0.5) * cw * 0.6, chh - 0.4, cz, 2.4, 1.6, 2.4, { role: H.DARK, c: 0.1 }, 'detail', DETAIL.FINE);
  }
  // 円筒のタンク
  for (let k = 0; k < R.int(1, 4); k++) {
    const x = S * R.range(-0.45, 0.45); const z = S * R.range(-0.45, -0.25); const tr = S * R.range(0.03, 0.05);
    B.lathe(x, 0, z, [[tr, 0], [tr, tr * 2], [tr * 0.9, tr * 2.2], [0, tr * 2.3]], 18, { role: H.PAINT2, rnd: R(), panel: 2.4 }, 'tank', DETAIL.MASS);
  }
}

// ===================== 地上：集合住宅 =====================
function apartment(B, R, { S, w: w0, d: d0 }) {
  const w = w0 ?? S * R.range(0.5, 0.9); const d = d0 ?? Math.max(11, S * R.range(0.25, 0.35)); const h = S;
  const fh = 3.0;
  const floors = Math.max(3, Math.round(h / fh));
  const hh = floors * fh;
  hull(B, 0, hh / 2, 0, w, hh, d, { role: H.CONCRETE, side: H.FACADE, top: H.CONCRETE, facade: [R.range(3.0, 3.8), fh], skip: [2], plates: false, greeble: 0.002, deck: fh });
  // 片側の段違いの棟
  if (R() < 0.6) {
    const w2 = w * R.range(0.3, 0.5); const h2 = hh * R.range(0.5, 0.8); const sx = R() < 0.5 ? 1 : -1;
    const f2 = Math.round(h2 / fh) * fh;
    hull(B, sx * (w / 2 + w2 / 2 - 0.2), f2 / 2, d * R.range(-0.2, 0.3), w2, f2, d * R.range(0.9, 1.3), { role: H.CONCRETE, side: H.FACADE, top: H.CONCRETE, facade: [3.3, fh], skip: [2], plates: false, greeble: 0.002, deck: fh });
  }
  // 階ごとのバルコニーの帯（片面）
  const bal = R() < 0.7;
  if (bal) for (let k = 1; k < floors; k++) B.box(0, k * fh - 0.15, d / 2 + 0.6, w * 0.96, 0.3, 1.2, { role: H.CONCRETE, c: 0.04, rnd: R() }, 'detail', DETAIL.FINE);
  // 屋上：階段室・給水塔・アンテナ
  B.box(w * R.range(-0.3, 0.3), hh + 1.5, 0, 4, 3, 4, { role: H.CONCRETE, c: 0.08 }, 'box', DETAIL.MID);
  if (R() < 0.6) B.lathe(w * R.range(-0.35, 0.35), hh, d * 0.1, [[0.3, 0], [0.3, 2.5], [1.6, 2.5], [1.6, 5.5], [0, 5.8]], 12, { role: H.RUST, rnd: R() }, 'tank', DETAIL.FINE);
  for (let k = 0; k < R.int(1, 4); k++) B.beam([w * R.range(-0.45, 0.45), hh, d * R.range(-0.4, 0.4)], [w * R.range(-0.45, 0.45), hh + 3 + R() * 4, d * R.range(-0.4, 0.4)], 0.08, 0.08, { role: H.BARE }, DETAIL.FINE);
  roofGear(B, R, -w * 0.45, w * 0.45, -d * 0.4, d * 0.4, hh, R.int(2, 5));
}

// ===================== 基地の甲板（基地全体の土台） =====================
function deck(B, R, { S, W, len, bays = 0, side = 1 }) {
  const L = len ? len / 0.62 : S; const Wd = W ?? S * 0.36; const dh = Math.min(S * 0.05, 48);
  hull(B, 0, -dh / 2, 0, Wd, dh, L * 0.62, { role: H.PAINT, top: H.DECK, panel: 4, plateSize: 6, greeble: 0.0015 });
  // 脇の大きな格納の口（目標の絵1の、下の胴に並ぶ口）。奥行きのある張り出し（床・天井・側壁）と、奥のほのかな灯り。side の側の面に付ける
  if (side < 0 && bays) B.push(0, 0, 0, 0, Math.PI, 0);
  for (let k = 0; k < bays; k++) {
    const bl = L * 0.62 / bays * R.range(0.55, 0.8); const bh = dh * R.range(0.5, 0.72); const z = -L * 0.31 + (k + 0.5) * L * 0.62 / bays + (R() - 0.5) * L * 0.02;
    const dep = Math.min(bl * 0.3, dh * 0.7); const y0 = -dh * 0.5; const x0 = Wd / 2;
    B.box(x0 + 0.3, y0, z, 0.6, bh, bl, { role: H.INNER, side: H.GLOW, c: 0.05 }, 'box', DETAIL.MID);
    B.box(x0 + dep / 2, y0 - bh / 2 - 1, z, dep, 2, bl + 4, { role: H.DARK, top: H.DECK, c: 0.2 }, 'box', DETAIL.MID);
    B.box(x0 + dep / 2, y0 + bh / 2 + 2, z, dep, 4, bl + 4, { role: H.PAINT, bottom: H.INNER, c: 0.3, panel: 2.6 }, 'box', DETAIL.MID);
    for (const sz of [-1, 1]) B.box(x0 + dep / 2, y0, z + sz * (bl / 2 + 1), dep, bh, 2, { role: H.PAINT, c: 0.3, panel: 2.2 }, 'box', DETAIL.MID);
    B.box(x0 + dep - 0.3, y0 - bh / 2 + 0.6, z, 0.6, 1.2, bl, { role: H.HAZARD, c: 0.03 }, 'detail', DETAIL.MID);
    for (let j = 0; j < 5; j++) B.lamp([x0 + dep * 0.5, y0 + bh / 2 - 0.4, z - bl * 0.4 + j * bl * 0.2], 0.8, H.LAMP, [0, -1, 0]);
    for (let j = 0; j < 3; j++) B.box(x0 + 2 + j * dep * 0.2, y0 - bh / 2 + 1.5, z + (j - 1) * bl * 0.25, 3, 3, 6, { role: H.DARK, c: 0.1 }, 'detail', DETAIL.FINE);
    // 口の中の柱（2〜3本）と、奥の天井の梁
    const np = R.int(2, 3);
    for (let j = 1; j <= np; j++) B.box(x0 + dep * 0.55, y0, z - bl / 2 + j * bl / (np + 1), Math.max(1.5, dep * 0.15), bh, Math.max(1.5, bl * 0.04), { role: H.PAINT, c: 0.2, panel: 2.4, rnd: R() }, 'box', DETAIL.MID);
    B.box(x0 + dep * 0.3, y0 + bh / 2 - 1.2, z, dep * 0.5, 1.2, bl, { role: H.DARK, c: 0.1 }, 'box', DETAIL.MID);
  }
  if (side < 0 && bays) B.pop();
  // 甲板の下の構造（吊り下がる箱と柱、先に赤い灯り）
  for (let k = 0; k < R.int(6, 12); k++) {
    const x = (R() - 0.5) * Wd * 0.85; const z = (R() - 0.5) * L * 0.58; const hh = S * R.range(0.05, 0.14); const r = Math.max(0.6, S * R.range(0.002, 0.005));
    B.cyl([x, -dh, z], [x, -dh - hh, z], r * 2, r * 0.6, 8, { role: H.PAINT2, c: r * 0.1, up: [1, 0, 0] }, 'spire', DETAIL.MID);
    if (R() < 0.5) B.box(x, -dh - hh * 0.55, z, r * 6, r * 4, r * 6, { role: H.PAINT, c: 0.2, rnd: R() }, 'box', DETAIL.MID);
    B.lamp([x, -dh - hh, z], Math.max(0.6, r), H.BEACON, [0, -1, 0]);
  }
  for (let k = 0; k < R.int(7, 12); k++) {
    const x = (R() - 0.5) * Wd * 0.8; const z = (R() - 0.5) * L * 0.55; const hh = S * R.range(0.04, 0.16);
    hull(B, x, -dh - hh / 2, z, S * R.range(0.04, 0.08), hh, S * R.range(0.04, 0.1), { role: H.PAINT, panel: 3, greeble: 0.004, plates: false });
    B.beam([x, -dh - hh, z], [x, -dh - hh - S * 0.05, z], 0.8, 0.8, { role: H.DARK });
    B.lamp([x, -dh - hh - S * 0.05, z], 0.8, H.BEACON, [0, -1, 0]);
  }
  // 下へ伸びるアンテナ
  for (let k = 0; k < R.int(2, 5); k++) { const x = (R() - 0.5) * Wd * 0.7; const z = (R() - 0.5) * L * 0.5; B.beam([x, -dh, z], [x, -dh - S * R.range(0.05, 0.12), z], 0.5, 0.5, { role: H.PAINT2 }); B.lamp([x, -dh - S * 0.1, z], 0.7, H.BEACON, [0, -1, 0]); }
  // 甲板の縁に沿って尖塔とアンテナの柱を並べる（目標の絵1の、上辺に並ぶ尖塔の輪郭）
  for (let k = 0; k < R.int(5, 9); k++) {
    const sx = R() < 0.5 ? -1 : 1; const z = (R() - 0.5) * L * 0.58;
    spire(B, R, sx * Wd * R.range(0.36, 0.47), 0, z, S * R.range(0.06, 0.16), Math.max(0.8, S * R.range(0.0025, 0.004)));
  }
  // 側面の窓の帯（2〜3段。口のない区間だけに付くよう、帯の長さと位置を揺らす）
  for (const sx of [-1, 1]) for (let r = 0; r < R.int(2, 3); r++) {
    const y = -dh * (0.18 + r * 0.25); const len = L * 0.62 * R.range(0.25, 0.6); const z = (R() - 0.5) * (L * 0.62 - len);
    B.box(sx * (Wd / 2 + 0.2), y, z, 0.6, 1.4, len, { role: H.GLASS, facade: [R.range(1.4, 2.2), 1.4], c: 0.05 }, 'band', DETAIL.MID);
  }
  // 側面の灯りの列（遠くから見える小さな橙の点の並び）
  for (const sx of [-1, 1]) for (let k = 0; k < 24; k++) { const z = -L * 0.3 + (k + 0.5) * L * 0.6 / 24; B.lamp([sx * (Wd / 2 + 0.05), -dh * (0.15 + 0.7 * ((k * 7) % 3) / 3), z], 0.9, H.LAMP, [sx, 0, 0]); }
  // 縁の灯りの列と、甲板の縁の手すり・低い壁
  for (let k = 0; k < 14; k++) for (const sx of [-1, 1]) B.lamp([sx * Wd / 2, 0.1, -L * 0.3 + k * L * 0.6 / 13], 0.8, k % 4 ? H.LAMP : H.BEACON, [sx, 0, 0]);
  for (const sx of [-1, 1]) { B.box(sx * (Wd / 2 - 0.6), 0.6, 0, 1.2, 1.2, L * 0.6, { role: H.DARK, c: 0.15 }, 'box', DETAIL.MID); B.railing([sx * (Wd / 2 - 0.6), 1.2, -L * 0.3], [sx * (Wd / 2 - 0.6), 1.2, L * 0.3]); }
  // 床の印（着艦の帯と、警告の縞の通路）
  for (let k = 0; k < 6; k++) B.box(0, 0.05, -L * 0.28 + k * 6, Wd * 0.3, 0.1, 1.2, { role: H.HAZARD, c: 0 }, 'detail', DETAIL.MID);
  for (const sx of [-1, 1]) B.box(sx * Wd * 0.18, 0.04, 0, 0.6, 0.08, L * 0.55, { role: H.HAZARD, c: 0 }, 'detail', DETAIL.MID);
  // 荷物の箱の山（人の大きさの物差し）
  for (let c = 0; c < R.int(3, 6); c++) {
    const cx = (R() - 0.5) * Wd * 0.7; const cz = (R() - 0.5) * L * 0.5;
    for (let k = 0; k < R.int(3, 9); k++) {
      const lx = Math.floor(k / 3); const lz = k % 3;
      const h = 2.6; const stack = R() < 0.35 ? 2 : 1;
      for (let st = 0; st < stack; st++) {
        const role = R() < 0.2 ? H.RUST : R() < 0.5 ? H.PAINT2 : H.CORRUGATED; const rr = R();
        if (B.useProps) B.prop('container', cx + lx * 2.6, st * h, cz + lz * 6.3, 0, 2.44, h, 6.06);
        else B.box(cx + lx * 2.6, h / 2 + st * h, cz + lz * 6.3, 2.44, h, 6.06, { role, side: H.CORRUGATED, c: 0.05, rnd: rr, base: st ? 0 : 1 }, 'detail', DETAIL.FINE);
      }
    }
  }
}

// ===================== 区画（基地の本体の箱。脇に大きな格納の口、上に段と機械） =====================
function block(B, R, { S, w, h, bays = 0, windows = true, side = 1, plates = false }) {
  const L = S; const W = w ?? S * R.range(0.35, 0.6); const Ht = h ?? S * R.range(0.2, 0.32);
  hull(B, 0, Ht / 2, 0, W, Ht, L, { role: H.PAINT, panel: 3.6, skip: [2], greeble: 0.003, plates });
  // 脇の格納の口（暗い奥、上に灯り、下に警告の縞）。side の側の面に付ける
  if (side < 0) B.push(0, 0, 0, 0, Math.PI, 0);
  for (let k = 0; k < bays; k++) {
    const bw = L / bays * 0.72; const bh = Ht * R.range(0.5, 0.7); const z = -L / 2 + (k + 0.5) * L / bays;
    const dep = Math.min(bw * 0.35, Ht * 0.5); const x0 = W / 2;
    B.box(x0 + 0.3, bh / 2, z, 0.6, bh, bw, { role: H.INNER, side: H.GLOW, c: 0.05 }, 'box', DETAIL.MID);
    B.box(x0 + dep / 2, bh + 1.2, z, dep, 2.4, bw + 3.2, { role: H.PAINT, bottom: H.INNER, c: 0.25, panel: 2 }, 'box', DETAIL.MID);
    for (const sz of [-1, 1]) B.box(x0 + dep / 2, bh / 2, z + sz * (bw / 2 + 0.8), dep, bh, 1.6, { role: H.PAINT, c: 0.2, panel: 2 }, 'box', DETAIL.MID);
    B.box(x0 + dep - 0.3, 0.4, z, 0.6, 0.8, bw, { role: H.HAZARD, c: 0.03 }, 'detail', DETAIL.FINE);
    for (let j = 0; j < 4; j++) B.lamp([x0 + dep * 0.5, bh - 0.3, z - bw * 0.36 + j * bw * 0.24], 0.45, H.LAMP, [0, -1, 0]);
  }
  if (side < 0) B.pop();
  if (windows && R() < 0.7) windowBand(B, 0, Ht * R.range(0.6, 0.85), 0, W, L, R.range(1.2, 1.8), [0, 1, 1, 1], R.range(2.4, 3.4));
  // 上の段（後ろへずらした小さな箱）と屋根の機械
  if (R() < 0.75) {
    const w2 = W * R.range(0.4, 0.7); const h2 = Ht * R.range(0.25, 0.5); const l2 = L * R.range(0.3, 0.6); const z2 = (R() - 0.5) * (L - l2) * 0.8; const x2 = (R() - 0.5) * (W - w2) * 0.6;
    hull(B, x2, Ht + h2 / 2, z2, w2, h2, l2, { role: H.PAINT, panel: 3, skip: [2], greeble: 0.004 });
    roofGear(B, R, x2 - w2 * 0.45, x2 + w2 * 0.45, z2 - l2 * 0.45, z2 + l2 * 0.45, Ht + h2, R.int(2, 5));
    railBox(B, x2 - w2 / 2 + 0.3, x2 + w2 / 2 - 0.3, z2 - l2 / 2 + 0.3, z2 + l2 / 2 - 0.3, Ht + h2);
  }
  // 3段目（さらに小さな箱）と、壁に張り出す箱（遠くからも輪郭がでこぼこに見える）
  if (R() < 0.6) { const w3 = W * R.range(0.18, 0.3); const h3 = Ht * R.range(0.2, 0.4); const z3 = (R() - 0.5) * L * 0.5; hull(B, (R() - 0.5) * W * 0.4, Ht + Ht * 0.35 + h3 / 2, z3, w3, h3, w3 * R.range(1, 1.8), { role: H.PAINT, panel: 2.6, skip: [2], greeble: 0.004, plates: false }); }
  for (let k = 0; k < R.int(2, 5); k++) {
    const sx = (R() < 0.5 ? -1 : 1) * (side < 0 ? 1 : 1); const pw = Ht * R.range(0.2, 0.45); const ph = Ht * R.range(0.25, 0.6); const pl = L * R.range(0.08, 0.2);
    const z = (R() - 0.5) * (L - pl); const y = R() * (Ht - ph);
    if (bays && sx * side > 0) continue; // 口のある面には付けない
    B.box(sx * (W / 2 + pw / 2), y + ph / 2, z, pw, ph, pl, { role: H.PAINT, c: 0.3, panel: 2.4, rnd: R(), base: 1 }, 'box', DETAIL.MID);
  }
  roofGear(B, R, -W * 0.45, W * 0.45, -L * 0.45, L * 0.45, Ht, R.int(4, 9));
  railBox(B, -W / 2 + 0.4, W / 2 - 0.4, -L / 2 + 0.4, L / 2 - 0.4, Ht);
  for (let k = 0; k < R.int(2, 5); k++) mast(B, R, (R() - 0.5) * W * 0.8, Ht, (R() - 0.5) * L * 0.8, Ht * R.range(0.5, 1.3), Math.max(1, W * 0.035));
  for (let k = 0; k < R.int(1, 4); k++) spire(B, R, (R() - 0.5) * W * 0.85, Ht, (R() - 0.5) * L * 0.85, Ht * R.range(0.8, 2.0), Math.max(0.5, Ht * 0.022));
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.lamp([sx * W * 0.5, Ht + 0.2, sz * L * 0.5], 0.5, H.BEACON, [0, 1, 0]);
}

// ===================== 放熱板の列（トラスの腕に、溝のある暗い板） =====================
function radiator(B, R, { S }) {
  const n = R.int(3, 6); const pw = S / n * 0.86; const pl = S * R.range(0.35, 0.55);
  B.truss([0, 0, 0], [S, 0, 0], Math.max(1.2, S * 0.025), Math.max(1.2, S * 0.025), { up: [0, 1, 0], role: H.PAINT, bay: Math.max(2, S * 0.03) });
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * S / n;
    B.box(x, 0, pl * 0.5 + 1, pw, 0.4, pl, { role: H.GRILLE, top: H.GRILLE, bottom: H.GRILLE, c: 0.08, p1: 0.9, p2: pl, rnd: R() }, 'radiator', DETAIL.MASS);
    B.box(x, 0, pl * 0.5 + 1, pw + 0.4, 0.6, 0.6, { role: H.DARK, c: 0.1 }, 'box', DETAIL.MID);
    B.beam([x, 0, 0], [x, 0, pl + 1], 0.5, 0.7, { role: H.DARK });
  }
  B.lamp([S, 0.8, 0], 0.5, H.BEACON, [1, 0, 0]);
}

// 基地全体の並べ方：甲板の上に、塔・格納庫・砲台・タンク・区画・リング・橋を置く。
// 建物ごとに別に作って距離で面数を切り替える（1つにまとめると、近くの1棟のために全体が細かい段で描かれる）
function stationLayout(R, S) {
  // 横に長く連なる形（目標の絵1）：長い本体の甲板の上に区画・塔・砲台、脇にタンクと放熱板、後ろに短い腕とリング
  const Wd = S * R.range(0.19, 0.23);
  const items = [];
  const it = (kind, size, pos, ry = 0, opts) => items.push({ kind, S: size, pos, ry, opts });
  const lenA = S * 0.66; const zA = -S * 0.2;
  items.push({ kind: 'deck', S, opts: { W: Wd, len: lenA, bays: 5, side: -1 }, pos: [0, 0, zA], ry: 0, dmgK: 0.6 });
  const z0 = zA - lenA / 2; const z1 = zA + lenA / 2;
  // 本体の区画（前寄りに大きく、後ろへ低く小さく）
  const b1 = { w: Wd * 0.72, h: S * R.range(0.08, 0.1), l: lenA * 0.36 };
  it('block', b1.l, [-Wd * 0.08, 0, z0 + b1.l / 2 + lenA * 0.04], 0, { w: b1.w, h: b1.h, bays: 3, side: -1 });
  it('block', lenA * 0.22, [Wd * 0.1, 0, z0 + lenA * 0.52], 0, { w: Wd * 0.55, h: S * R.range(0.045, 0.06), bays: 2, side: -1 });
  it('block', lenA * 0.16, [-Wd * 0.15, 0, z0 + lenA * 0.75], 0, { w: Wd * 0.5, h: S * R.range(0.03, 0.045), bays: 0 });
  // 塔（前の区画の上の大きな管制塔と、甲板の後ろの小さな塔）
  // 本体に比べて大きく（目標の絵では塔が本体の長さの4分の1ほど、砲台も遠くから形が読める大きさ）
  it('tower', S * R.range(0.2, 0.24), [-Wd * 0.2, b1.h, z0 + lenA * 0.14], R() * 0.4);
  it('tower', S * R.range(0.1, 0.12), [Wd * 0.22, b1.h, z0 + lenA * 0.3], R() * 6.28);
  it('tower', S * R.range(0.08, 0.1), [Wd * 0.3, 0, z0 + lenA * 0.88], R() * 6.28);
  // 砲台（前の区画の屋根の角と、甲板の縁に沿って）
  it('turret', S * R.range(0.06, 0.07), [Wd * 0.2, b1.h, z0 + lenA * 0.05], R() * 6.28);
  it('turret', S * R.range(0.055, 0.065), [-Wd * 0.3, b1.h, z0 + lenA * 0.33], R() * 6.28);
  for (let k = 0; k < 3; k++) it('turret', S * R.range(0.04, 0.05), [(k % 2 ? 1 : -1) * Wd * 0.36, 0, z0 + lenA * (0.45 + k * 0.17)], R() * 6.28);
  // タンク（甲板の上の後ろ寄り）と、脇へ張り出す放熱板
  it('tanks', S * R.range(0.15, 0.18), [Wd * 0.1, 0, z0 + lenA * 0.68], Math.PI / 2);
  it('radiator', S * R.range(0.24, 0.28), [Wd * 0.5, -S * 0.02, z0 + lenA * 0.55], 0.25);
  it('radiator', S * R.range(0.2, 0.25), [-Wd * 0.5, -S * 0.02, z0 + lenA * 0.62], Math.PI - 0.25);
  // 後ろ：短い腕（太いトラスの橋）と区画、リング
  it('bridge', S * 0.24, [0, -S * 0.01, z1 + S * 0.12], 0, { w: S * 0.04 });
  it('module', S * R.range(0.11, 0.13), [S * 0.06, -S * 0.04, z1 + S * 0.1], (R() - 0.5) * 0.15);
  it('module', S * R.range(0.08, 0.1), [-S * 0.05, -S * 0.06, z1 + S * 0.14], (R() - 0.5) * 0.15);
  it('ring', S * R.range(0.24, 0.28), [0, -S * 0.13, z1 + S * 0.28], 0);
  for (const x of items) x.seed = R() * 1000;
  return items;
}

// ===================== 地上：小さな建物（倉庫・店） =====================
function shed(B, R, { S }) {
  const w = S * R.range(0.6, 1); const d = S * R.range(0.5, 0.9); const h = S * R.range(0.25, 0.5);
  const fac = R() < 0.5;
  hull(B, 0, h / 2, 0, w, h, d, { role: H.CONCRETE, side: fac ? H.FACADE : H.CORRUGATED, top: H.CONCRETE, facade: [3.2, 3], skip: [2], plates: false, greeble: 0.004 });
  roofGear(B, R, -w * 0.4, w * 0.4, -d * 0.4, d * 0.4, h, R.int(1, 3));
}
// 道と地面（街区の区切りに合わせる）
function streets(B, R, { S, rows, cols, road = 10 }) {
  B.box(0, -0.25, 0, S * 1.05, 0.5, S * 1.05, { role: H.GROUND, c: 0 }, 'ground', DETAIL.MASS);
  let z = -S / 2;
  for (const bz of rows) { z += bz; B.box(0, 0.03, z - bz - 0 + 0.01, S, 0.06, road, { role: H.CONCRETE, c: 0 }, 'road', DETAIL.MASS); }
  let x = -S / 2;
  for (const bx of cols) { x += bx; B.box(x - bx, 0.04, 0, road, 0.06, S, { role: H.CONCRETE, c: 0 }, 'road', DETAIL.MASS); }
}
// 街区の並べ方：道で区切った区画に、集合住宅・工場・小さな建物を、大きさを強くばらつかせて置く
function cityLayout(R, S) {
  const cols = R.splits(S, S / R.int(3, 5), 0.5);
  const rows = R.splits(S, S / R.int(3, 4), 0.5);
  const road = 12;
  const items = [{ kind: 'streets', S, opts: { rows, cols, road }, pos: [0, 0, 0], ry: 0, dmgK: 0 }];
  let z0 = -S / 2;
  for (const bz of rows) {
    let x0 = -S / 2;
    for (const bx of cols) {
      const cx = x0 + bx / 2 + road / 4; const cz = z0 + bz / 2 + road / 4; const w = bx - road; const d = bz - road;
      if (w > 12 && d > 12) {
        const k = R();
        if (k < 0.45) {
          // 低く長い集合住宅（4〜9階）を区画に沿って並べる。ときどき高い棟
          const n = Math.max(1, Math.floor(d / 24));
          for (let i = 0; i < n; i++) {
            const tall = R() < 0.1;
            const fl = tall ? R.int(12, 18) : R.int(4, 9);
            items.push({ kind: 'apartment', S: fl * 3, opts: { w: Math.min(w * 0.9, tall ? 22 : R.range(30, 70)), d: tall ? 18 : R.range(11, 15) }, pos: [cx + (R() - 0.5) * w * 0.1, 0, cz - d / 2 + (i + 0.5) * d / n], ry: 0 });
          }
        } else if (k < 0.78) items.push({ kind: 'factory', S: Math.min(w, d) * 1.05, pos: [cx, 0, cz], ry: R.pick([0, Math.PI / 2, Math.PI]) });
        else for (let i = 0; i < R.int(2, 5); i++) items.push({ kind: 'shed', S: 8 + R() * 16, pos: [cx + (R() - 0.5) * w * 0.6, 0, cz + (R() - 0.5) * d * 0.6], ry: R.pick([0, Math.PI / 2]) });
      }
      x0 += bx;
    }
    z0 += bz;
  }
  for (const it of items) it.seed = R() * 1000;
  return items;
}

// 種類の一覧：名前・既定の大きさ（m）・大きさの範囲・地上か
export const KINDS = {
  tower: { name: '塔（管制塔）', build: tower, size: 110, range: [50, 220] },
  turret: { name: '砲台', build: turret, size: 32, range: [14, 70] },
  hangar: { name: '格納庫', build: hangar, size: 95, range: [45, 200] },
  bridge: { name: '橋', build: bridge, size: 90, range: [30, 260] },
  module: { name: 'ステーションの区画', build: module, size: 120, range: [50, 300] },
  ring: { name: 'ドッキングリング', build: ring, size: 140, range: [60, 400] },
  tanks: { name: 'タンク群', build: tanks, size: 70, range: [30, 160] },
  station: { name: '基地全体', layout: stationLayout, size: 900, range: [500, 2000] },
  deck: { name: '基地の甲板', build: deck, size: 900, range: [300, 2000], hidden: true },
  block: { name: '区画（本体の箱）', build: block, size: 160, range: [40, 400] },
  radiator: { name: '放熱板の列', build: radiator, size: 120, range: [40, 300] },
  factory: { name: '工場（地上）', build: factory, size: 180, range: [90, 400], ground: true },
  apartment: { name: '集合住宅（地上）', build: apartment, size: 45, range: [15, 120], ground: true },
  shed: { name: '小さな建物（地上）', build: shed, size: 18, range: [8, 40], ground: true },
  city: { name: '街区（地上）', layout: cityLayout, size: 420, range: [200, 900], ground: true },
  streets: { name: '道と地面', build: streets, size: 420, range: [200, 900], ground: true, hidden: true },
};
