import { BALANCE, POWER } from '../weaponBalance.js';

// 撃った時・当たった時・動いた時の手応えをまとめて持つ。three.js に依存しない。
// 重さは FEEL の表だけで決め、武器の側は名前を呼ぶだけにする（秒や揺れを武器ごとに書き足さない）。
//   trauma : 画面の揺れの元（2乗して揺らす。小さい値はほとんど揺れない）
//   stop   : 当たった時に時間を止める秒数（実時間）。slow はその間の時間の進む割合
//   z / y / roll : 機体の反動（後ろへ・上へ・傾き。ばねで戻る）
//   fov    : 視野の押し出し（度）。bloom は光のにじみの一瞬の増し
export const FEEL = {
  twinShot: { z: 0.016, roll: 0.008, fov: 0.05 },
  twinHit: { trauma: 0.03 },
  spreadShot: { trauma: 0.13, z: 0.07, y: 0.02, fov: 0.6 },
  beamFull: { trauma: 0.10, fov: -0.5 },
  beamStart: { trauma: 0.42, stop: 0.05, slow: 0.15, z: 0.34, y: 0.05, fov: 3.2, bloom: 0.16 },
  beamHit: { trauma: 0.10 },
  lanceShot: { trauma: 0.18, z: 0.10, y: -0.09, fov: 0.8 },
  lanceHit: { trauma: 0.16, stop: 0.02, slow: 0.25 },
  salvoShot: { trauma: 0.07, z: 0.05, y: -0.04, roll: 0.012, fov: 0.25 },
  salvoHit: { trauma: 0.13, stop: 0.018, slow: 0.25 },
  rockBreak: { trauma: 0.16 },
  kill: { trauma: 0.27, stop: 0.055, slow: 0.08, bloom: 0.05 },
  killBig: { trauma: 0.75, stop: 0.15, slow: 0.05, fov: 1.5, bloom: 0.2 },
  bomb: { trauma: 0.8, stop: 0.2, slow: 0.22, z: 0.22, fov: 7, bloom: 0.12 },
  hurt: { trauma: 0.55, stop: 0.05, slow: 0.2, y: -0.07 },
  deflect: { trauma: 0.12, stop: 0.03, slow: 0.2 },
  dodge: { trauma: 0.08, fov: 1.2 },
  loop: { trauma: 0.08, fov: 1.5 },
  boost: { trauma: 0.22, z: -0.28, fov: 3.6 },
  brake: { trauma: 0.14, z: 0.28, fov: -1.6 },
  pickup: { trauma: 0.07, fov: 0.7, bloom: 0.08 },
};

const STOP_GAP = 0.14; // 止まる間の直後は次を止めない（連続の撃破で動きが詰まらないように）
const Z_W = 15; const Z_D = 0.8;
const Y_W = 10; const Y_D = 0.8;
const R_W = 11; const R_D = 0.8;

function springStep(s, w, d, dt) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    s.v += (-w * w * s.x - 2 * d * w * s.v) * h;
    s.x += s.v * h;
  }
}

export function createFeel({ shake = 1 } = {}) {
  const f = {
    t: 0, trauma: 0, stopLeft: 0, slow: 1, gap: 0, fov: 0, bloom: 0, shots: 0,
    z: { x: 0, v: 0 }, y: { x: 0, v: 0 }, r: { x: 0, v: 0 },
    sx: 0, sy: 0, sr: 0, stops: 0, log: {}, lastStop: 0,
  };
  return {
    state: f,
    get timeScale() { return f.stopLeft > 0 ? f.slow : 1; },
    get z() { return f.z.x; },
    get y() { return f.y.x; },
    get roll() { return f.r.x; },
    get fov() { return f.fov; },
    get bloom() { return f.bloom; },
    get sx() { return f.sx; },
    get sy() { return f.sy; },
    get sr() { return f.sr; },
    get trauma() { return f.trauma; },
    // 名前で呼ぶ。k は強さの倍率（溜めの量など）、side は左右の反動の向き
    fire(name, k = 1, side = 1) {
      const e = FEEL[name];
      if (!e) return;
      f.log[name] = (f.log[name] || 0) + 1;
      if (e.trauma) f.trauma = Math.min(1, f.trauma + e.trauma * k);
      if (e.fov) f.fov += e.fov * k;
      if (e.bloom) f.bloom = Math.min(0.7, f.bloom + e.bloom * k);
      // 反動は速さで与える（ばねの強さに合わせて、おおよそ値の分だけ動く）
      if (e.z) f.z.v -= e.z * k * Z_W;
      if (e.y) f.y.v += e.y * k * Y_W;
      if (e.roll) f.r.v += e.roll * k * side * R_W;
      if (e.stop && (f.gap <= 0 || e.stop > f.lastStop * 1.5)) {
        f.lastStop = e.stop;
        f.stopLeft = Math.max(f.stopLeft, e.stop);
        f.slow = e.slow ?? 0.1;
        f.gap = e.stop + STOP_GAP;
        f.stops += 1;
      }
    },
    // 毎コマ、実時間で進める（止まる間も揺れと反動は動く）
    update(dt) {
      f.t += dt;
      f.stopLeft = Math.max(0, f.stopLeft - dt);
      f.gap = Math.max(0, f.gap - dt);
      f.trauma = Math.max(0, f.trauma - dt * 1.9);
      f.fov *= Math.exp(-dt * 9);
      f.bloom *= Math.exp(-dt * 7);
      springStep(f.z, Z_W, Z_D, dt);
      springStep(f.y, Y_W, Y_D, dt);
      springStep(f.r, R_W, R_D, dt);
      // 周期の違う波を足した揺れ。規則正しい振動に見えないようにする
      const a = f.trauma * f.trauma * shake;
      const t = f.t;
      f.sx = a * 0.13 * (Math.sin(t * 37.1) + 0.6 * Math.sin(t * 61.7 + 1.3));
      f.sy = a * 0.11 * (Math.sin(t * 43.3 + 0.7) + 0.6 * Math.sin(t * 71.9 + 2.1));
      f.sr = a * 0.022 * (Math.sin(t * 29.3 + 1.9) + 0.5 * Math.sin(t * 53.1));
    },
    reset() {
      Object.assign(f, { t: 0, trauma: 0, stopLeft: 0, slow: 1, gap: 0, fov: 0, bloom: 0, sx: 0, sy: 0, sr: 0, stops: 0, log: {}, lastStop: 0 });
      f.z.x = f.z.v = f.y.x = f.y.v = f.r.x = f.r.v = 0;
    },
  };
}

// ---- 機体の動き（宙返り・急減速・急加速）。姿勢は見た目だけで、操作の感度と照準には触らない ----
export const MOVES = {
  loopT: 1.9, // 宙返りにかかる秒数（前の 1.25 秒は速すぎた。REQ-018）
  loopCool: 3.0, // 次までの待ち
  loopR: 1.7, // 画面の中で描く円の半径
  loopBack: 2.4, // 頂点で後ろへ下がる量（最後に追いつく）
  safeFrom: 0.06, safeTo: 0.95, // この間は弾が当たらない（1周の 6%〜95%）
  brakeScale: 0.35, // 減速の間の進む速さの割合
  boostKick: 55, // ブーストの踏み込みで一瞬足す速さ
  releaseKick: 26, // 減速を離した時に足す速さ
};

// 回避の数値：t＝横へずれる動きの秒、d＝横へずれる距離、grace＝動きが終わった後も当たらない秒（REQ-018）
export const DODGE = { t: 0.5, d: 5.0, grace: 0.2 };

const smooth = (u) => u * u * (3 - 2 * u);

export function createMoves() {
  const m = {
    loopT: -1, loopCool: 0, brake: 0, impulse: 0, prevLoop: false, prevBoost: false, prevBrake: false,
    tiltX: { x: 0, v: 0 }, loops: 0,
  };
  const pose = { pitch: 0, y: 0, z: 0, view: 0 };
  return {
    state: m,
    pose,
    get looping() { return m.loopT >= 0; },
    get invuln() { const u = m.loopT / MOVES.loopT; return m.loopT >= 0 && u > MOVES.safeFrom && u < MOVES.safeTo; },
    get cool() { return m.loopCool / MOVES.loopCool; },
    get brake() { return m.brake; },
    get speedScale() { return 1 - (1 - MOVES.brakeScale) * m.brake; },
    get impulse() { return m.impulse; },
    get tiltSlide() { return m.tiltX.x; },
    // 戻り値は、起きた出来事の名前の並び（手応えの表へ渡す）
    step(dt, inp, canLoop, tilt = 0) {
      const ev = [];
      m.loopCool = Math.max(0, m.loopCool - dt);
      if (inp.loop && !m.prevLoop && m.loopT < 0 && m.loopCool <= 0 && canLoop) {
        m.loopT = 0;
        m.loopCool = MOVES.loopCool + MOVES.loopT;
        m.loops += 1;
        ev.push('loop');
      }
      m.prevLoop = !!inp.loop;
      if (m.loopT >= 0) {
        m.loopT += dt;
        if (m.loopT >= MOVES.loopT) m.loopT = -1;
      }
      if (m.loopT >= 0) {
        const u = m.loopT / MOVES.loopT;
        const a = Math.PI * 2 * smooth(u);
        const hump = Math.sin(Math.PI * u) ** 2;
        pose.pitch = -a; // 機首上げの向き
        pose.y = MOVES.loopR * (1 - Math.cos(a));
        pose.z = MOVES.loopR * Math.sin(a) - MOVES.loopBack * hump;
        pose.view = hump;
      } else {
        pose.pitch = 0; pose.y = 0; pose.z = 0; pose.view = 0;
      }
      if (inp.boost && !m.prevBoost) { m.impulse = Math.max(m.impulse, MOVES.boostKick); ev.push('boost'); }
      m.prevBoost = !!inp.boost;
      if (inp.brake && !m.prevBrake) ev.push('brake');
      if (!inp.brake && m.prevBrake) { m.impulse = Math.max(m.impulse, MOVES.releaseKick); ev.push('boost'); }
      m.prevBrake = !!inp.brake;
      m.brake += ((inp.brake ? 1 : 0) - m.brake) * (1 - Math.exp(-dt * 7));
      m.impulse *= Math.exp(-dt * 3.5);
      // 機体を傾けると、その向きへ画面の上で少し流れ、戻す時に行き過ぎる
      const s = m.tiltX;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        s.v += (10 * 10 * (-tilt * 0.34 - s.x) - 2 * 0.42 * 10 * s.v) * h;
        s.x += s.v * h;
      }
      return ev;
    },
    reset() {
      Object.assign(m, { loopT: -1, loopCool: 0, brake: 0, impulse: 0, prevLoop: false, prevBoost: false, prevBrake: false, loops: 0 });
      m.tiltX.x = 0; m.tiltX.v = 0;
      pose.pitch = 0; pose.y = 0; pose.z = 0; pose.view = 0;
    },
  };
}

// ---- 狙いを付ける順番（多重誘導）。three.js に依存しない ----
export const SALVO = BALANCE.sub.salvo;

// list の中から、前方の円錐の内にあって、まだ狙いの数が足りない物を1つ返す。近い順・中心に近い順
export function pickLock(list, locks, forward) {
  let best = null; let bestScore = Infinity;
  for (const t of list) {
    if (!t || !(t.radius > 0.5)) continue;
    const r = t.rel;
    const d = Math.hypot(r.x, r.y, r.z) || 1;
    if (d > SALVO.range) continue;
    const c = (r.x * forward[0] + r.y * forward[1] + r.z * forward[2]) / d;
    if (c <= 0) continue;
    const ang = Math.acos(Math.min(1, c)) - Math.atan(t.radius / d);
    if (ang > SALVO.cone) continue;
    let n = 0;
    for (const l of locks) if (l.target === t) n += 1;
    const cap = t.radius >= 6 ? SALVO.bigShare : 1;
    if (n >= cap) continue;
    // まず狙っていない物を埋める。大きな敵の2発目以降は後回し
    const score = (d / SALVO.range + Math.max(0, ang) * 1.5) + n * 10;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  return best;
}

// ---- ツインの段階 ----
export { POWER };
// 撃破が何機目で何を落とすか。4つを回し、間隔は広がる
// 撃破で落とす物：8機目に強化、その後30機ごとに爆雷と強化を交互（11/10 spec REQ-022。前は 2・6・11・17機目とその後8機ごとで多すぎた）
export function dropAtKill(n) {
  const FIRST = 8; const EVERY = 30;
  if (n === FIRST) return 'P';
  if (n > FIRST && (n - FIRST) % EVERY === 0) return ((n - FIRST) / EVERY) % 2 ? 'B' : 'P';
  return null;
}
