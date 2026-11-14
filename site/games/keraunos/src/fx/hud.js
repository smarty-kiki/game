import * as THREE from 'three';
import { tr, UI_FONT } from '../i18n.js'; // 画面の文字を端末の言語にする（spec REQ-016）
import { rotate } from '../flightState.js';
import { TOUCH, safeInsets } from '../touch.js';
import { aimAssist } from './aim.js';

// 戦闘の画面表示：機首の先の照準、敵を囲む枠、画面外の敵を指す矢印、右下のレーダー。
// WebGL の上に重ねた 2D の canvas に毎コマ描く。

// 字体：数字と英字は計器の細い書体、日本語はヒラギノ
const NUM = '"DIN Condensed", "DIN Alternate", "Avenir Next Condensed", "Helvetica Neue", sans-serif';
const JP = UI_FONT; // 言語に合わせた書体（spec REQ-016）
const INK = '232, 236, 239';

export const AIM_ASSIST = 0.05; // ツインが敵へ寄せる角度（ラジアン）。照準の色もこの角度で変える
const FAR_D = 60;
const RADAR_RANGE = 320;
const RADAR_R = 74;

const COL = {
  aim: 'rgba(232, 236, 239, 0.92)',
  aimDim: 'rgba(232, 236, 239, 0.4)',
  lock: 'rgba(255, 74, 54, 1)',
  ship: 'rgba(255, 96, 60, 1)',
  missile: 'rgba(255, 60, 40, 1)',
  frame: 'rgba(232, 236, 239, 0.42)',
};

// 機首の向き a から目標の向き b へ、割合 k だけ寄せた単位ベクトル
function normalizeDir(a, b, k) {
  const x = a[0] + (b[0] - a[0]) * k; const y = a[1] + (b[1] - a[1]) * k; const z = a[2] + (b[2] - a[2]) * k;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

export function createHud({ camera, world, enabled = true }) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
  if (enabled) document.body.append(canvas);
  const g = canvas.getContext('2d');
  let W = 1; let H = 1; let dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const v = new THREE.Vector3();
  const cs = new THREE.Vector3();
  let lockK = 0;
  // 当たりの印（世界の座標で覚える）と、上に出す短い知らせ
  const marks = [];
  let hitTick = -9; let killTick = -9; let clock = 0;
  const toasts = [];

  // 自機からの相対位置を画面の座標へ。画面の外・カメラの後ろなら on=false
  function toScreen(rel) {
    v.set(rel[0], rel[1], rel[2]);
    cs.copy(v).applyMatrix4(camera.matrixWorldInverse);
    v.project(camera);
    const on = cs.z < 0 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
    return { x: (v.x * 0.5 + 0.5) * W, y: (0.5 - v.y * 0.5) * H, on, cx: cs.x, cy: cs.y, depth: -cs.z };
  }

  function ring(x, y, r, gaps, col, width) {
    g.strokeStyle = col; g.lineWidth = width;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + gaps;
      const a1 = ((i + 1) / n) * Math.PI * 2 - gaps;
      g.beginPath(); g.arc(x, y, r, a0 + Math.PI / 4, a1 + Math.PI / 4); g.stroke();
    }
  }

  // 照準：機首の先 FAR_D の所に、切れ目のある輪・外へ伸びる4本の刻み・中心の点を描く。
  // 手前にもう一つ置くと、カメラが機体のすぐ後ろなので2つがほぼ重なって読めない
  function drawReticle(ship, locked, extra = {}) {
    const fw = extra.aim || ship.forward;
    const p = toScreen([fw[0] * FAR_D, fw[1] * FAR_D, fw[2] * FAR_D]);
    const col = locked ? COL.lock : COL.aim;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.7)';
    g.shadowBlur = 2;
    // 撃つたびに輪が一瞬開く
    const r1 = 17 - 5 * lockK + 6 * (extra.kick || 0);
    ring(p.x, p.y, r1, 0.3, col, 1.2);
    g.strokeStyle = col; g.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.beginPath();
      g.moveTo(p.x + Math.cos(a) * (r1 + 3), p.y + Math.sin(a) * (r1 + 3));
      g.lineTo(p.x + Math.cos(a) * (r1 + 10), p.y + Math.sin(a) * (r1 + 10));
      g.stroke();
    }
    g.fillStyle = col;
    g.beginPath(); g.arc(p.x, p.y, 1.4, 0, Math.PI * 2); g.fill();
    // 主砲の溜め：輪の外を回る弧。溜まりきると一瞬白く光る
    const ch = extra.charge || 0;
    if (ch > 0.01) {
      const full = ch >= 1;
      g.strokeStyle = full ? 'rgba(235, 225, 255, 1)' : 'rgba(170, 140, 255, 0.95)';
      g.shadowColor = 'rgba(150, 110, 255, 0.9)'; g.shadowBlur = full ? 14 : 6;
      g.lineWidth = full ? 3 : 2.2;
      g.beginPath(); g.arc(p.x, p.y, r1 + 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ch)); g.stroke();
      if (full) { g.lineWidth = 1; g.beginPath(); g.arc(p.x, p.y, r1 + 21 + 3 * Math.sin(clock * 18), 0, Math.PI * 2); g.stroke(); }
    }
    // 当たった時の印：中心の斜めの4本。撃破は大きく赤い
    const hk = Math.max(0, 1 - (clock - hitTick) / 0.14);
    const kk = Math.max(0, 1 - (clock - killTick) / 0.3);
    if (hk > 0 || kk > 0) {
      const big = kk > 0;
      const a = big ? kk : hk;
      g.strokeStyle = big ? `rgba(255, 120, 80, ${a})` : `rgba(255, 255, 255, ${a})`;
      g.shadowColor = big ? 'rgba(255,60,20,0.9)' : 'rgba(255,255,255,0.8)'; g.shadowBlur = 8;
      g.lineWidth = big ? 2.6 : 2;
      const r0 = big ? 9 + 8 * (1 - a) : 6;
      const r2 = r0 + (big ? 11 : 7);
      for (let i = 0; i < 4; i++) {
        const an = Math.PI / 4 + i * Math.PI / 2;
        g.beginPath(); g.moveTo(p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0); g.lineTo(p.x + Math.cos(an) * r2, p.y + Math.sin(an) * r2); g.stroke();
      }
    }
    // 多重誘導の狙いを付ける円（押している間）
    if (extra.salvoHold) {
      const fovR = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const R = Math.tan(0.5) * fovR;
      g.strokeStyle = 'rgba(120, 200, 255, 0.55)'; g.lineWidth = 1.2; g.shadowBlur = 4;
      g.setLineDash([6, 8]); g.lineDashOffset = -clock * 40;
      g.beginPath(); g.arc(p.x, p.y, R, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
    }
    g.restore();
    return p;
  }

  // 狙いを付けた敵：回りながら締まる菱形と、重ねた数
  function drawLocks(locks, max) {
    const seen = new Map();
    for (const l of locks) seen.set(l.target, (seen.get(l.target) || 0) + 1);
    g.save();
    for (const [t, n] of seen) {
      const p = toScreen([t.rel.x, t.rel.y, t.rel.z]);
      if (!p.on) continue;
      const first = locks.find((l) => l.target === t);
      const age = clock - (first.clock ?? clock);
      const k = Math.min(1, age / 0.16);
      const r = 30 - 16 * k;
      g.translate(p.x, p.y); g.rotate(Math.PI / 4 + (1 - k) * 1.6);
      g.strokeStyle = COL.lock; g.lineWidth = 1.4;
      g.shadowBlur = 0;
      g.strokeRect(-r, -r, r * 2, r * 2);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = `rgba(${INK}, 1)`; g.font = `400 14px ${NUM}`; g.textAlign = 'left';
      g.fillText(n > 1 ? `LOCK ×${n}` : 'LOCK', p.x + r * 1.4 + 4, p.y - r * 1.1);
    }
    g.restore();
    void max;
  }

  // 当たった所の印（敵の位置に短い十字。撃破は輪が広がる）
  function drawMarks(P, dt) {
    g.save();
    for (let i = marks.length - 1; i >= 0; i--) {
      const m = marks[i];
      m.age += dt;
      const life = m.kill ? 0.55 : 0.18;
      if (m.age > life) { marks.splice(i, 1); continue; }
      const p = toScreen([m.far[0] - P[0], m.far[1] - P[1], m.far[2] - P[2]]);
      if (!p.on) continue;
      const a = 1 - m.age / life;
      if (m.kill) {
        g.strokeStyle = `rgba(${INK}, ${a * 0.8})`; g.lineWidth = 1.2;
        g.shadowBlur = 0;
        g.beginPath(); g.arc(p.x, p.y, 10 + 46 * (1 - a * a), 0, Math.PI * 2); g.stroke();
      } else {
        const r = 5 + 5 * (1 - a);
        g.strokeStyle = `rgba(255, 255, 255, ${a})`; g.lineWidth = 1.6; g.shadowBlur = 0;
        g.beginPath(); g.moveTo(p.x - r, p.y - r); g.lineTo(p.x - r * 0.4, p.y - r * 0.4); g.moveTo(p.x + r, p.y - r); g.lineTo(p.x + r * 0.4, p.y - r * 0.4);
        g.moveTo(p.x - r, p.y + r); g.lineTo(p.x - r * 0.4, p.y + r * 0.4); g.moveTo(p.x + r, p.y + r); g.lineTo(p.x + r * 0.4, p.y + r * 0.4); g.stroke();
      }
    }
    g.restore();
  }

  // 取る物の札：細い線で引き出した名前
  function drawItems(items) {
    g.save();
    g.textAlign = 'left';
    for (const it of items) {
      if (!it.on) continue;
      const p = toScreen([it.rel.x, it.rel.y, it.rel.z]);
      if (!p.on) continue;
      const P = it.kind === 'P';
      const x = p.x + 20; const y = p.y - 20;
      g.strokeStyle = `rgba(${INK}, 0.6)`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(p.x + 7, p.y - 7); g.lineTo(x, y); g.lineTo(x + 52, y); g.stroke();
      g.fillStyle = `rgba(${INK}, 1)`; g.font = `500 12px ${JP}`;
      g.fillText(tr(P ? 'ツイン強化' : '補給'), x + 2, y - 5);
    }
    g.restore();
  }

  // 画面の下の武装の列：キー・名前・残り。使える物は明るく、下の線が残りを示す
  // 武装の並び：左のシールドの右端と、右下のレーダーの左端の間に収める（段階的に詰める）。
  // 並びの実際の位置は window.__hudLayout で読める（並びの上に案内を出す担当が使う）
  // 枠と枠の間は gap 以上あける（残りの数字と次のキーが続いて「Lv.1X」と読めないように）。間には細い区切りを引く。
  // gap は最低 10px（CLEAR_MIN）。段を落としても gap は詰めない。
  const CLEAR_MIN = 10;
  const WEAPON_STEPS = [
    { sw: 112, gap: 12, key: 14, name: 12, note: 16 },
    { sw: 100, gap: 12, key: 13, name: 11, note: 15 },
    { sw: 88, gap: 11, key: 12, name: 11, note: 14 },
    { sw: 78, gap: 10, key: 11, name: 10, note: 13 },
    { sw: 70, gap: 10, key: 10, name: 10, note: 12 },
  ];
  // 確認用の段：わざと詰めた版（gap 2）。.work/sol の試験が、隣との間の検出を確かめるために使う。通常の表示では使わない
  const FORCE_STEPS = [...WEAPON_STEPS, { sw: 112, gap: 2, key: 14, name: 12, note: 16 }];
  const LAYOUT_FORCE = null; // 確認用：FORCE_STEPS の番号で幅を固定する（5 が詰めた版）
  let shieldRight = 0; let shieldKey = ''; let shieldAt = -9;
  let wLayoutKey = ''; let wLayout = null;
  // 左のシールドの右端（DOM）。大きさが変わるたびに測り直す（0.5秒ごとにも測る）
  function shieldEdge() {
    const key = `${W}x${H}`;
    if (key === shieldKey && clock - shieldAt < 0.5) return shieldRight;
    shieldKey = key; shieldAt = clock;
    const el = document.getElementById('uiShield');
    const rects = el ? el.getClientRects() : [];
    shieldRight = rects.length ? rects[0].right : 0;
    return shieldRight;
  }
  // 名前と残りの字の幅（字の大きさの段ごと）。枠の中に収まるかを見る
  function weaponTextW(slot, st) {
    const [, name, note] = slot;
    g.font = `500 ${st.name}px ${JP}`;
    const nameW = g.measureText(tr(name)).width;
    let noteW = 0;
    if (note) { g.font = `400 ${st.note}px ${NUM}`; noteW = g.measureText(note === 'EMPTY' ? 'EMPTY' : tr(note)).width; }
    return { nameW, noteW };
  }
  function weaponTextFits(slot, st) {
    const t = weaponTextW(slot, st);
    return 13 + t.nameW + 6 + t.noteW <= st.sw;
  }
  function weaponLayout(slots) {
    const left = shieldEdge() + 16;
    const right = W - 22 - 2 * RADAR_R - 14;
    const avail = Math.max(0, right - left);
    const sig = `${W}|${H}|${left}|${right}|${slots.map((s) => `${s[0]}${tr(s[1])}${s[2] || ''}`).join(',')}`;
    if (sig === wLayoutKey) return wLayout;
    wLayoutKey = sig;
    let idx = WEAPON_STEPS.length - 1; let fits = false;
    for (let si = 0; si < WEAPON_STEPS.length; si++) {
      const st = WEAPON_STEPS[si];
      const total = slots.length * st.sw + (slots.length - 1) * st.gap;
      if (total <= avail && slots.every((sl) => weaponTextFits(sl, st))) { idx = si; fits = true; break; }
    }
    if (LAYOUT_FORCE !== null) idx = LAYOUT_FORCE;
    const st = FORCE_STEPS[idx];
    const total = slots.length * st.sw + (slots.length - 1) * st.gap;
    // 画面の中央に置き、はみ出すときは左右の間へ寄せる
    const x0 = Math.max(left, Math.min(W / 2 - total / 2, right - total));
    const y = H - 62;
    const boxes = slots.map((sl, i) => ({ key: sl[0], x: x0 + i * (st.sw + st.gap), y, w: st.sw, h: 24 }));
    wLayout = {
      step: idx, fits, sw: st.sw, gap: st.gap, clear: CLEAR_MIN, x0, top: y, bottom: y + 24, right: x0 + total,
      avail, left, rightBound: right,
      shieldRight, radar: { left: W - 22 - 2 * RADAR_R, top: H - 48 - 2 * RADAR_R, right: W - 22, bottom: H - 48 },
      slots: boxes, fontKey: st.key, fontName: st.name, fontNote: st.note,
      text: slots.map((sl) => weaponTextW(sl, st)),
    };
    window.__hudLayout = wLayout;
    return wLayout;
  }

  function drawWeapons(w) {
    if (TOUCH) return; // タッチのときは右のボタンに名前と輪を出す（spec REQ-014）
    const slots = w.slots;
    const L = weaponLayout(slots);
    const sw = L.sw; const gap = L.gap; const y = L.top;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 2;
    slots.forEach(([key, name, note, k, ready, cells], i) => {
      const x = L.slots[i].x;
      const flashEmpty = note === 'EMPTY' && Math.sin(clock * 30) > 0;
      const a = ready ? 1 : 0.42;
      g.textAlign = 'left';
      g.font = `400 ${L.fontKey}px ${NUM}`; g.fillStyle = `rgba(233, 184, 114, ${a})`;
      g.fillText(key, x, y + 13);
      g.font = `500 ${L.fontName}px ${JP}`; g.fillStyle = `rgba(${INK}, ${a})`;
      g.fillText(tr(name), x + 13, y + 13);
      if (note === 'EMPTY') {
        g.textAlign = 'right'; g.font = `400 ${L.fontNote}px ${NUM}`; g.fillStyle = flashEmpty ? `rgba(${INK}, 1)` : 'rgba(255, 74, 54, 1)';
        g.fillText('EMPTY', x + sw, y + 13);
      } else if (note) {
        g.textAlign = 'right'; g.font = `400 ${L.fontNote}px ${NUM}`; g.fillStyle = `rgba(${INK}, ${a})`;
        g.fillText(tr(note), x + sw, y + 13);
      }
      // 次の枠との間に細い区切り（最初の枠の前には引かない）
      if (i > 0) { g.shadowBlur = 0; g.fillStyle = `rgba(${INK}, 0.22)`; g.fillRect(x - gap / 2 - 0.5, y + 2, 1, 18); g.shadowBlur = 2; }
      // 残りの線（段のある物は区切る）
      const gy = y + 21;
      g.shadowBlur = 0;
      g.fillStyle = `rgba(${INK}, 0.14)`; g.fillRect(x, gy, sw, 3);
      const kk = Math.max(0, Math.min(1, k));
      g.fillStyle = key === 'X' && note === '最大' ? 'rgba(233, 184, 114, 1)' : `rgba(${INK}, ${ready ? 0.95 : 0.55})`;
      if (cells) {
        const cw = (sw - (cells - 1) * 3) / cells;
        const on = Math.round(kk * cells);
        for (let c = 0; c < on; c++) g.fillRect(x + c * (cw + 3), gy, cw, 3);
        g.fillStyle = 'rgba(0,0,0,0.75)';
        for (let c = 1; c < cells; c++) g.fillRect(x + c * (cw + 3) - 3, gy, 3, 3);
      } else g.fillRect(x, gy, sw * kk, 3);
      g.shadowBlur = 2;
    });
    g.restore();
  }

  // 上に出す短い知らせ：文字の左右へ細い線が伸びる
  function drawToasts(dt) {
    g.save();
    g.textAlign = 'center';
    for (let i = toasts.length - 1; i >= 0; i--) {
      const t = toasts[i];
      t.age += dt;
      if (t.age > 2.2) { toasts.splice(i, 1); continue; }
      const a = Math.min(1, t.age / 0.12) * Math.min(1, (2.2 - t.age) / 0.5);
      const y = H * 0.27 - i * 30;
      g.globalAlpha = a;
      g.font = `500 16px ${JP}`;
      g.fillStyle = `rgba(${INK}, 1)`; g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 3;
      if ('letterSpacing' in g) g.letterSpacing = '3px';
      g.fillText(t.text, W / 2, y);
      const tw = g.measureText(t.text).width / 2 + 16;
      const len = 90 * Math.min(1, t.age / 0.3);
      g.strokeStyle = t.col; g.lineWidth = 1;
      g.beginPath(); g.moveTo(W / 2 - tw, y - 6); g.lineTo(W / 2 - tw - len, y - 6); g.moveTo(W / 2 + tw, y - 6); g.lineTo(W / 2 + tw + len, y - 6); g.stroke();
      if ('letterSpacing' in g) g.letterSpacing = '0px';
    }
    g.restore();
  }

  // 敵を囲む角の枠。狙いが合うと赤く、距離を添える
  function drawTargetFrame(c, p, locked) {
    const size = Math.max(14, Math.min(120, (c.radius * 1.6 / Math.max(1, p.depth)) * (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    const s = size * (locked ? 1 - 0.12 * lockK : 1);
    const L = Math.max(5, s * 0.35);
    g.strokeStyle = locked ? COL.lock : COL.frame;
    g.lineWidth = locked ? 1.5 : 1;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = p.x + sx * s; const y = p.y + sy * s;
      g.beginPath(); g.moveTo(x - sx * L, y); g.lineTo(x, y); g.lineTo(x, y - sy * L); g.stroke();
    }
    if (locked) {
      g.fillStyle = COL.lock;
      g.font = `400 15px ${NUM}`;
      g.textAlign = 'left';
      g.fillText(`${Math.round(p.depth)}`, p.x + s + 5, p.y + s);
    }
  }

  // 画面外の敵：画面の縁に、その方向を指す三角
  function drawEdgeArrow(c, p, t) {
    let dx = p.cx; let dy = -p.cy;
    const l = Math.hypot(dx, dy);
    if (l < 1e-4) { dx = 0; dy = 1; } else { dx /= l; dy /= l; }
    const ex = W * 0.5 - 46; const ey = H * 0.5 - 46;
    const k = 1 / Math.max(Math.abs(dx) / ex, Math.abs(dy) / ey);
    const x = W * 0.5 + dx * k; const y = H * 0.5 + dy * k;
    const isM = c.kind === 'missile';
    const near = Math.hypot(c.rel[0] ?? c.rel.x, c.rel[1] ?? c.rel.y, c.rel[2] ?? c.rel.z);
    if (isM && near > 140) return;
    const blink = isM ? (Math.sin(t * 22) > 0 ? 1 : 0.35) : 1;
    const sz = isM ? 9 : 13;
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(dy, dx));
    g.globalAlpha = blink;
    g.fillStyle = isM ? COL.missile : COL.ship;
    g.shadowColor = 'rgba(255,60,30,0.9)'; g.shadowBlur = 8;
    g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * 0.7, sz * 0.75); g.lineTo(-sz * 0.35, 0); g.lineTo(-sz * 0.7, -sz * 0.75); g.closePath(); g.fill();
    g.restore();
    if (!isM) {
      g.fillStyle = COL.ship; g.font = `400 14px ${NUM}`; g.textAlign = 'center';
      g.fillText(`${Math.round(near)}`, x - dx * 24, y - dy * 24 + 4);
    }
  }

  function drawRadar(ship, contacts, t) {
    // タッチのときは指の下を空けるため、小さくしてスコアの左（右上）に置く（spec REQ-014）
    const R = TOUCH ? 34 : RADAR_R;
    const cx = TOUCH ? W - safeInsets().r - 96 - R : W - 22 - R; const cy = TOUCH ? 10 + R : H - 48 - R;
    const qc = [-ship.q[0], -ship.q[1], -ship.q[2], ship.q[3]];
    g.save();
    g.fillStyle = 'rgba(4, 7, 11, 0.5)';
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    // 前方の見える範囲
    const half = THREE.MathUtils.degToRad(camera.fov * camera.aspect * 0.5);
    g.fillStyle = `rgba(${INK}, 0.07)`;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 - half, -Math.PI / 2 + half); g.closePath(); g.fill();
    g.strokeStyle = `rgba(${INK}, 0.4)`; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = `rgba(${INK}, 0.13)`; g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, R * 0.5, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    // 自機
    g.fillStyle = COL.aim;
    g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx + 4.5, cy + 4); g.lineTo(cx - 4.5, cy + 4); g.closePath(); g.fill();
    for (const c of contacts) {
      const rel = [c.rel.x, c.rel.y, c.rel.z];
      const L = rotate(qc, rel);
      const sx = -L[0]; const sf = L[2]; const up = L[1];
      const dh = Math.hypot(sx, sf);
      const d = Math.hypot(dh, up);
      const k = (R * Math.sqrt(Math.min(1, d / RADAR_RANGE))) / Math.max(d, 1e-3);
      const px = cx + sx * k; const py = cy - sf * k;
      const by = py - THREE.MathUtils.clamp(up * k, -R * 0.6, R * 0.6);
      const isM = c.kind === 'missile';
      if (isM && d < 80 && Math.sin(t * 22) < 0) continue;
      const col = isM ? COL.missile : COL.ship;
      // 平面の位置から上下の高さへ伸ばす線
      g.strokeStyle = col; g.globalAlpha = 0.7; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px, by); g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = col;
      g.beginPath(); g.arc(px, py, 1.4, 0, Math.PI * 2); g.fill();
      if (d > RADAR_RANGE) {
        g.strokeStyle = col; g.lineWidth = 1.5;
        g.beginPath(); g.arc(px, by, isM ? 2 : 3.5, 0, Math.PI * 2); g.stroke();
      } else if (isM) {
        g.beginPath(); g.arc(px, by, 2.2, 0, Math.PI * 2); g.fill();
      } else if (c.kind === 'fighter') {
        g.fillRect(px - 2.5, by - 2.5, 5, 5);
      } else {
        g.fillRect(px - 4, by - 4, 8, 8);
      }
    }
    g.restore();
  }

  // 回避の待ち時間：シールドの下の細い線
  function drawDodge(k) {
    // タッチのときはシールドの下（左上）に置く
    const x = TOUCH ? safeInsets().l + 14 : 28; const w = TOUCH ? 160 : 280; const y = TOUCH ? 52 : H - 24;
    const ready = k >= 1;
    g.save();
    g.fillStyle = `rgba(${INK}, 0.14)`; g.fillRect(x, y, w, 2);
    g.fillStyle = ready ? `rgba(${INK}, 0.9)` : `rgba(${INK}, 0.45)`;
    g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), 2);
    g.font = `400 12px ${NUM}`; g.textAlign = 'left';
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.fillStyle = ready ? `rgba(${INK}, 0.7)` : `rgba(${INK}, 0.35)`;
    g.fillText('DODGE', x, y + 13);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.restore();
  }

  // 撃墜：画面の中央に文字と、再出撃までの線
  function drawDown(downT, total) {
    g.save();
    g.globalAlpha = Math.min(1, downT / 0.3);
    g.textAlign = 'center';
    g.font = `400 64px ${NUM}`;
    g.fillStyle = 'rgba(255, 74, 54, 1)';
    if ('letterSpacing' in g) g.letterSpacing = '14px';
    g.fillText('SHOT DOWN', W / 2, H * 0.42);
    if ('letterSpacing' in g) g.letterSpacing = '4px';
    g.font = `500 13px ${JP}`;
    g.fillStyle = `rgba(${INK}, 0.85)`;
    g.fillText(tr('まもなく再出撃'), W / 2, H * 0.42 + 28);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    const w = 220; const x = W / 2 - w / 2; const y = H * 0.42 + 40;
    g.fillStyle = `rgba(${INK}, 0.14)`; g.fillRect(x, y, w, 2);
    g.fillStyle = `rgba(${INK}, 0.9)`; g.fillRect(x, y, w * Math.min(1, downT / total), 2);
    g.restore();
  }

  function draw(state, ship, contacts, dt, extra = {}) {
    if (!enabled) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    camera.updateMatrixWorld();
    const fw = ship.forward;
    const assist = aimAssist(world, 0, 0, 0, fw, AIM_ASSIST);
    const locked = !!assist;
    lockK += ((locked ? 1 : 0) - lockK) * (1 - Math.exp(-dt * 14));
    // 照準の位置：ロックした敵の方へ寄る（寄せる量は中心からの角度で決まる。寄せ切らず、7割まで）
    const aimDir = assist ? normalizeDir(fw, assist.dir, lockK * 0.7) : fw;
    const t = state.time;
    for (const c of contacts) {
      const rel = [c.rel.x, c.rel.y, c.rel.z];
      const p = toScreen(rel);
      if (p.on) {
        if (c.kind === 'ship' || c.kind === 'fighter') drawTargetFrame(c, p, locked && assist.target === c.aim);
      } else if (c.kind !== 'fighter') {
        drawEdgeArrow({ ...c, rel }, p, t);
      }
    }
    clock += dt;
    if (extra.items) drawItems(extra.items);
    if (extra.locks && extra.locks.length) drawLocks(extra.locks, extra.lockMax);
    drawMarks(ship.pos, dt);
    if (!(extra.downT >= 0)) drawReticle(ship, locked, { ...extra, aim: aimDir });
    drawRadar(ship, contacts, t);
    if (extra.dodge !== undefined) drawDodge(extra.dodge);
    if (extra.weapons) drawWeapons(extra.weapons);
    drawToasts(dt);
    if (extra.downT >= 0) drawDown(extra.downT, extra.downTotal || 3);
  }

  return {
    draw,
    // 当たりの印。rel は自機からの相対、P は自機の世界の位置
    mark(rel, P, kill = false, big = false) {
      if (kill) killTick = clock; else hitTick = clock;
      if (marks.length > 24) marks.shift();
      marks.push({ far: [rel[0] + P[0], rel[1] + P[1], rel[2] + P[2]], age: 0, kill, big });
    },
    lockClock(l) { if (l.clock === undefined) l.clock = clock; },
    toast(text, col = 'rgba(233, 184, 114, 1)') { toasts.unshift({ text: tr(text), col, age: 0 }); if (toasts.length > 3) toasts.pop(); },
    reset() { marks.length = 0; toasts.length = 0; hitTick = -9; killTick = -9; },
  };
}
