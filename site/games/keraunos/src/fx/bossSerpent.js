import * as THREE from 'three';
import { KIND } from './puffs.js';
import { loadSerpent, createSerpent } from '../boss/serpent.js';
import { createSerpentBeam } from './serpentBeam.js';
import { ORBIT } from '../flightState.js';
import { BALANCE } from '../weaponBalance.js';

// 1面のボス「機械の大蛇」の戦い（防衛コアと同じ受け口。stage1.js が ?boss=core のときだけ防衛コアを使う）。
// 形と動きは src/boss/serpent.js、光線とぶつかり合いの見た目は ./serpentBeam.js。
// 自機は大蛇のまわりを回る（防衛コアと同じ回る飛び方。360度の自由飛行は操作が難しすぎるので使わない）。
// 回る輪の中心は大蛇に付いて動く（頭と胴の間。口の光線の間は口）。大蛇が輪の外へ出て手が出せなくなることがない。
// 上下は輪の中心の高さから ±ORBIT_OPTS.height。左右・上下を離すと、照準は中心（大蛇）へ戻る。
//   泳ぐ：場の中を泳ぎ、その間、背の砲台が撃つ
//   口の光線：口を開けて2秒溜め、狙いを固めて太い光線を撃つ。自機の主砲を口へ撃ち返すと、光線どうしがぶつかって押し合う
//             押し切れば口に叩き込んで大きく削る。主砲が切れる・狙いが外れると、大蛇の光線が押し寄せる
//   薙ぎ払い：咆哮してから、口の光線で自機のまわりを横に払う
//   突進：首を引いて溜め、自機へ噛みつきに来る（回避の回転でかわせる）
//   背の砲台：節ごとに1基。自機の方へ回り、壊せる（壊すと弾幕が減る）。とぐろを巻く間は残った全部が一斉に撃つ
//   体のぶつかり：頭・節・尾のどれに触れても、自機は弾き飛ばされて削られ、大蛇も削れる
// 位置は世界の座標で持ち、毎コマ自機からの相対にして置く（他の敵と同じ）。

const S = 200;            // 模型（長さ約2.1）→ 世界の大きさ。全長 約420
const RANGE = 0.75;       // 頭が泳ぐ範囲（模型の座標。世界で約150。輪の中心が付いて動くので、場の中心から離れても手が届く）
const Y_RANGE = 0.25;
const HP = 1900;          // 防衛コアの合計（1860）と同じくらい
const FOCUS_BOX = [200, 70]; // 輪の中心が動ける範囲（場の中心から水平・上下。外は小惑星がある）。口の光線の間は上下を FOCUS_BEAM_Y まで広げ、機首が口へ届くようにする
const FOCUS_BEAM_Y = 170;
const FOCUS_SPEED = 70;      // 輪の中心が動く速さの上限（毎秒。カメラが振り回されない）
// 回り方：上下の幅と速さ・狙いの幅を広げ、中心が動いたら自機も運び、離すと照準が戻る
export const ORBIT_OPTS = { ...ORBIT, vertical: 44, height: 130, aimX: 170, aimY: 110, carry: true, recenter: 150 };
const TURRET_HP = 70;
const BEAM_FULL = 1100;   // 口の光線の長さ
const BEAM_R = 9;         // 口の光線の当たりの太さ（見た目の中の層）
const CANNON_LEN = 395;   // 自機の主砲が届く長さ（weaponBalance の CANNON.len 400 の少し手前）
const CLASH_R = 18;       // ぶつかり合いの点に置く、主砲を止める的の半径（CANNON.stop 16 以上）
const CLASH_PUSH = { 1: 0.28, 2: 0.34, 3: 0.42 }; // 大蛇が押す速さ（毎秒、自機から口までを1として）。自機の主砲は 0.8×(0.55+0.45×溜め)
const D2R = Math.PI / 180;
const COS_AIM = Math.cos(26 * D2R);   // ぶつかり合いを始める：主砲の向きと口の向きの差（機首は口より BEAM_DROP だけ下を向くので、その分広い）
const COS_KEEP = Math.cos(36 * D2R);  // 続ける
// 口の光線の間、機首は口より約12°下を向く（tan12°≒0.21）。2本の光線が一直線に重なると、後ろのカメラからは大蛇の光線を端から見ることになり、
// 画面から消える。口を照準より上に置くと、大蛇の光線は口から斜め下へ降り、自機の光線は下から上がって、画面の中ほどでぶつかる。
// 押し込むほど機首は口へ上がり（押し切りで口へ入る）、押し負けるほど大蛇の光線が長く見える
const BEAM_DROP = 0.21;
const COS_BEAM = Math.cos(22 * D2R);  // 大蛇の光線が自機の方へ向いている
const PHASE = { NONE: -1, ENTRY: 0, P1: 1, P2: 2, P3: 3, DYING: 4 };
const PLAN = { 1: ['swim', 'beam', 'swim', 'ram', 'coil', 'beam'], 2: ['swim', 'beam', 'ram', 'sweep', 'coil', 'beam'], 3: ['beam', 'ram', 'sweep', 'swim', 'beam', 'coil'] };
const MULT = { head: 1.6, seg: 1.0, tail: 1.3 };
const EVADE_MARGIN = 8; // 光線の芯からこの距離（光線の太さの外側）まで迫った時に回避すれば、見切りになる（spec REQ-018）
const AUDIO_ATK = { beam: 'beam', ram: 'ram', sweep: 'sweep', coil: 'ring' }; // 音の名前（audio/index.js の ATK）
// 口の光線の間のカメラ：少し引いて注視点を上げ、大蛇を見上げる構図にする（口が画面の上から2割、ぶつかる点が中ほど、自機が下から2割）。
// 画面の縦の角度（視野52°）：自機 −atan(上げ/引き)≒−15°、照準の消える点 +pitch、口はその BEAM_DROP（約14°）上。注視点は look で水平近くまで上げる
const VIEW_BEAM = { pitch: 0.047, up: 0.15, back: 1.4, look: 1.67 };

export function createSerpentFight({ scene, loader, world, puffs, enemies, R, center, say, addScore, setBar }) {
  const params = new URLSearchParams(location.search);
  const TEST = params.has('test');
  const EVADE_ON = params.get('evade') !== '0'; // 見切り（spec REQ-018）。?evade=0 で前の作りに戻す
  const FORCE_ATK = params.get('bossatk'); // 確認用：同じ攻撃だけを繰り返す（beam / ram / sweep / coil / swim）
  const FORCE_PHASE = Number(params.get('bossphase')) || 0;
  const AUTO_CLASH = params.has('autoclash'); // 確認用：口の光線の発射の直前に、主砲を最大まで溜めた状態にして撃たせる（ぶつかり合いを実時間で見る）
  const HOME = new THREE.Vector3(...center);
  const b = { sp: null, phase: PHASE.NONE, t: 0, hp: HP, atk: null, idx: 0, gap: 1.5, stun: 0, dying: 0, done: false, shake: 0, flash: 0, danger: 0, cool: 0, wounds: [], wreck: [], pendingStart: null,
    focus: new THREE.Vector3(...center), focusVel: new THREE.Vector3(), turretsDown: 0, clashes: 0, clashWins: 0, viewHold: 0, dring: null, heatPt: null, winT: 9 };
  const dringObj = { p: new THREE.Vector3(), r: 0, k: 0 }; const heatObj = { p: new THREE.Vector3(), r: 0.05, k: 0 };
  const focusArr = [center[0], center[1], center[2]]; // stage1.js の arena へ渡す輪の中心（世界の座標）
  const sb = createSerpentBeam({ scene, puffs, R });
  const OPTS = { ...ORBIT_OPTS, aimDX: 0, aimDY: 0, aimDZ: 0 }; // 回り方の値（機首を向ける点のずれだけ毎コマ変える）
  const VIEW = { ...VIEW_BEAM }; // 口の光線の間のカメラ（口が想定より高い時だけ毎コマ直す）
  const _vm = new THREE.Vector3(); const _vf = new THREE.Vector3(); const _vu = new THREE.Vector3();

  // ---- 画面の表示：警告と攻撃の知らせ（防衛コアと同じ見た目） ----
  const warnEl = document.createElement('div');
  warnEl.className = 'ui'; warnEl.id = 'uiWarn';
  warnEl.innerHTML = '<b>WARNING</b><span>巨大な機影が接近　機械の大蛇</span>';
  const vignette = document.createElement('div');
  vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at center,rgba(255,30,0,0) 62%,rgba(255,30,0,.28) 100%)';
  const alertEl = document.createElement('div');
  alertEl.className = 'ui'; alertEl.id = 'uiAlert';
  const flashEl = document.createElement('div');
  flashEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:#f4ffe0';
  // 周りの沈み：ぶつかり合いの間、画面の外側を暗くして当たりを浮かせる（光を足して目立たせない）
  const dimEl = document.createElement('div');
  dimEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse 36% 50% at 50% 47%,rgba(4,4,10,0) 0%,rgba(4,4,10,.5) 72%,rgba(4,4,10,.8) 100%)';
  document.body.append(warnEl, vignette, alertEl, flashEl, dimEl);
  let warnT = 0; let alertT = 0;
  function alert(text, sec = 1.6) { alertEl.textContent = text; alertT = sec; }
  function updateScreen(state, dt) {
    warnT = Math.max(0, warnT - dt);
    const blink = 0.72 + 0.28 * Math.sign(Math.sin(state.time * 7));
    warnEl.style.opacity = warnT > 0 ? String(Math.min(1, warnT * 2) * blink) : '0';
    b.danger = Math.max(0, b.danger - dt);
    vignette.style.opacity = warnT > 0 ? String(Math.min(1, warnT * 2) * (0.5 + 0.5 * Math.sin(state.time * 9))) : (b.danger > 0 ? String(0.55 + 0.45 * Math.sin(state.time * 16)) : '0');
    alertT = Math.max(0, alertT - dt);
    alertEl.style.opacity = alertT > 0 ? String(0.8 + 0.2 * Math.sign(Math.sin(state.time * 7))) : '0';
    b.flash = Math.max(0, b.flash - dt * 1.6);
    flashEl.style.opacity = String(Math.min(0.6, b.flash));
    dimEl.style.opacity = String(Math.min(1, sb.dim * 1.6));
    b.shake = Math.max(0, b.shake - dt * 1.4);
    const cv = document.querySelector('canvas');
    if (cv) {
      if (b.shake > 0.01) {
        const s = b.shake * b.shake * 16;
        cv.style.transform = `translate(${(Math.sin(state.time * 67) * s).toFixed(1)}px,${(Math.sin(state.time * 83) * s).toFixed(1)}px) scale(1.02)`;
      } else if (cv.style.transform) cv.style.transform = '';
    }
  }
  function jolt(v) { b.shake = Math.max(b.shake, v); }

  // ---- 読み込みと当たりの的 ----
  const targets = { head: null, segs: [], tail: null, turrets: [] };
  const mkTarget = (part, size) => {
    const t = { rel: new THREE.Vector3(), radius: 0, size, aim: true, part };
    t.onDamage = (n) => { damage(n * MULT[part], part, t.rel); return false; };
    world.targets.push(t);
    return t;
  };
  const mkTurret = (k) => {
    const t = { rel: new THREE.Vector3(), radius: 0, size: 3, aim: true, part: 'turret', k, hp: TURRET_HP, dead: false };
    t.onDamage = (n) => { hitTurret(t, n); return false; };
    world.targets.push(t);
    return t;
  };
  // 光線どうしのぶつかり合いの点：自機の主砲はここで止まる（狙いの対象にはしない）
  const clashT = { rel: new THREE.Vector3(), radius: 0, size: 6, aim: false, part: 'clash', noImpact: true, onDamage: () => false };
  const ready = loadSerpent(loader).then(({ g, data, maps }) => {
    // 映り込みは場の物（scene.environment は区間ごとに替わる）をそのまま使う
    b.sp = createSerpent({ g, data, maps, envMap: null, range: RANGE, yRange: Y_RANGE });
    b.sp.setAuto(false);
    b.sp.object.visible = false;
    b.sp.object.scale.setScalar(S);
    // 影は落とさない（約18万面をもう一度描くと、ボス戦の描画が防衛コアの倍を超える）。受ける影はそのまま
    b.sp.object.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    scene.add(b.sp.object);
    targets.head = mkTarget('head', 6);
    // レールガンの弾が頭に当たった時刻を残す（溜めている口を撃ち抜くと光線が止まる。spec REQ-015）
    const headHit = targets.head.onDamage;
    targets.head.onDamage = (n, st) => { if (st && st.railFiring) b.railHitT = st.time; return headHit(n, st); };
    for (let k = 0; k < b.sp.nseg; k++) targets.segs.push(mkTarget('seg', 4));
    targets.tail = mkTarget('tail', 3);
    for (let k = 0; k < b.sp.nseg; k++) targets.turrets.push(mkTurret(k));
    world.targets.push(clashT);
    if (b.pendingStart) start(...b.pendingStart);
  }).catch((e) => console.error('serpent load', e));

  // ---- 模型の座標と自機からの相対 ----
  const _a = new THREE.Vector3(); const _b = new THREE.Vector3(); const _c = new THREE.Vector3(); const _d = new THREE.Vector3();
  const _e = new THREE.Vector3(); const _f = new THREE.Vector3(); const _g = new THREE.Vector3(); const _h = new THREE.Vector3(); const _i = new THREE.Vector3();
  const _m = new THREE.Matrix4(); const Z = new THREE.Vector3(0, 0, 1); const UPV = new THREE.Vector3(0, 1, 0);
  // 確認用（?test=1 か ?trace=1）：毎コマの口の位置・頭の向き・自機の位置・光線と頭の向きの角度を残す（動きの飛びと、向いていない光線を測る）。
  // ?trace=1 は実機の Chrome 用：集計（技ごとの最大の速さ・加速度・自機から見た角速度、飛びの数、光線と頭の向きの角度）を html の data-serpent-stats に書く
  const TRACING = TEST || params.has('trace');
  const TRACE = []; const _tm = new THREE.Vector3(); const _tf = new THREE.Vector3(); b.beamDir = new THREE.Vector3(); b.beamOn = '';
  const _hf = new THREE.Vector3(); const _ta = new THREE.Vector3(); // 頭の向き（世界）と、口から狙う先への向き
  const _j = new THREE.Vector3(); b.clashE = new THREE.Vector3(); b.clashS = new THREE.Vector3(); b.clashGapDeg = 0; // ぶつかり合い：大蛇の光線の先、2本の光線の先の離れ（自機から見た角度）
  const TS = { acts: {}, beam: {}, jumps: 0, jumpList: [], spikes: 0, spikeList: [], pvMax: 0, pvList: [], frames: 0, cancelInfo: [] }; let tPrev = null; const mvHist = [];
  function traceFrame(t, atk, act, mx, my, mz, px, py, pz, ang, beam) {
    if (TEST) { TRACE.push([+t.toFixed(3), atk, act, +mx.toFixed(1), +my.toFixed(1), +mz.toFixed(1), +px.toFixed(1), +py.toFixed(1), +pz.toFixed(1), ang, beam]); if (TRACE.length > 8000) TRACE.shift(); }
    const p = tPrev; tPrev = { t, mx, my, mz, px, py, pz, mv: p ? p.mv : 0 };
    TS.frames++;
    if (!p) return;
    const dt = t - p.t; if (dt <= 0 || dt > 0.1) return;
    const mv = Math.hypot(mx - p.mx, my - p.my, mz - p.mz) / dt; tPrev.mv = mv;
    const pv = Math.hypot(px - p.px, py - p.py, pz - p.pz) / dt; TS.pvMax = Math.max(TS.pvMax, Math.round(pv));
    if (pv > 250 && TS.pvList.length < 12) TS.pvList.push([+t.toFixed(2), act, atk, Math.round(pv), Math.round((px - p.px) / dt), Math.round((py - p.py) / dt), Math.round((pz - p.pz) / dt), Math.round(b.focusVel.length()), +dt.toFixed(4)]);
    const avg = mvHist.length ? mvHist.reduce((x, y) => x + y, 0) / mvHist.length : mv;
    if (mvHist.length >= 5 && mv > avg * 2.5 + 100) { TS.spikes++; if (TS.spikeList.length < 12) TS.spikeList.push([+t.toFixed(2), act, atk, Math.round(mv), Math.round(avg)]); }
    mvHist.push(mv); if (mvHist.length > 5) mvHist.shift();
    const rx = mx - px, ry = my - py, rz = mz - pz, qx = p.mx - p.px, qy = p.my - p.py, qz = p.mz - p.pz;
    const c = (rx * qx + ry * qy + rz * qz) / ((Math.hypot(rx, ry, rz) || 1) * (Math.hypot(qx, qy, qz) || 1));
    const angv = Math.acos(Math.max(-1, Math.min(1, c))) * 57.3 / dt;
    const acc = Math.abs(mv - p.mv) / dt;
    const s = TS.acts[act] || (TS.acts[act] = { n: 0, mvMax: 0, accMax: 0, angvMax: 0 });
    s.n++; s.mvMax = Math.max(s.mvMax, Math.round(mv)); s.accMax = Math.max(s.accMax, Math.round(acc)); s.angvMax = Math.max(s.angvMax, Math.round(angv));
    if (acc > 3000 || angv > 120) { TS.jumps++; if (TS.jumpList.length < 20) TS.jumpList.push([+t.toFixed(2), act, atk, Math.round(mv), Math.round(acc), Math.round(angv)]); }
    if (beam) { const bs = TS.beam[beam] || (TS.beam[beam] = { n: 0, over15: 0, over30: 0, max: 0 }); bs.n++; if (ang > 15) bs.over15++; if (ang > 30) bs.over30++; bs.max = Math.max(bs.max, ang); }
    if (beam === 'clash') { const g = TS.gap || (TS.gap = { n: 0, over1: 0, over3: 0, max: 0 }); const d = b.clashGapDeg; g.n++; if (d > 1) g.over1++; if (d > 3) g.over3++; g.max = Math.max(g.max, +d.toFixed(1)); }
    TS.cancels = b.cancels || 0; TS.clashes = b.clashes; TS.wins = b.clashWins; TS.snipes = b.snipes || 0;
    if (TS.frames % 30 === 0) document.documentElement.dataset.serpentStats = JSON.stringify(TS);
  }
  const ctx = { player: new THREE.Vector3() };
  const toModel = (wx, wy, wz, out) => out.set((wx - HOME.x) / S, (wy - HOME.y - (b.yOff || 0)) / S, (wz - HOME.z) / S);
  const relOf = (localPoint, mat, out) => out.copy(localPoint).applyMatrix4(mat).applyMatrix4(b.sp.object.matrixWorld);
  const HEAD_C = new THREE.Vector3(0, 0, 0.2); const TAIL_C = new THREE.Vector3(0, 0, -0.12);
  // 体の当たりの球（相対の位置と半径）。毎コマ作り直す
  const spheres = [];
  function updateBody() {
    const sp = b.sp; spheres.length = 0;
    relOf(HEAD_C, sp.headMatrix(), targets.head.rel); targets.head.radius = 0.17 * S;
    spheres.push({ part: 'head', rel: targets.head.rel, r: 0.17 * S });
    for (let k = 0; k < sp.nseg; k++) {
      const t = targets.segs[k];
      sp.segMatrix(k, _m);
      t.rel.setFromMatrixPosition(_m).applyMatrix4(sp.object.matrixWorld);
      // 胴の球は殻の内側に収める（背の砲台は球の外へ出て、撃てば砲台に当たる）
      t.radius = 0.088 * sp.scaleOf(k) * S;
      spheres.push({ part: 'seg', k, rel: t.rel, r: t.radius });
      const tt = targets.turrets[k];
      if (!tt.dead && sp.turretAlive(k)) { sp.turretCenter(k, tt.rel); tt.radius = 0.034 * sp.scaleOf(k) * S; } else tt.radius = 0;
    }
    relOf(TAIL_C, sp.tailMatrix(), targets.tail.rel); targets.tail.radius = 0.06 * S;
    spheres.push({ part: 'tail', rel: targets.tail.rel, r: targets.tail.radius });
  }
  function hideTargets() {
    if (!b.sp) return;
    targets.head.radius = 0; targets.tail.radius = 0; clashT.radius = 0;
    for (const t of targets.segs) t.radius = 0;
    for (const t of targets.turrets) t.radius = 0;
  }

  // ---- 被弾 ----
  function damage(n, part, rel, noFlash = false) {
    if (b.phase < PHASE.P1 || b.phase >= PHASE.DYING) return;
    b.hp -= n;
    // 当たりの光は削った量に比べる（主砲は毎コマ少しずつ削るので、決まった下限を足すと全身が白く光り続ける）
    if (!noFlash) b.sp.flash(Math.min(1, n / 30));
    addScore(Math.max(1, Math.round(n * 0.5)));
    if (n >= 20 && rel) for (let i = 0; i < 8; i++) { const sp = 10 + R() * 25; puffs.spark(rel.toArray(), [(R() - 0.5) * sp, (R() - 0.5) * sp, (R() - 0.5) * sp], 0.25 + R() * 0.3, 0.06, 0.03, 1, 3, 1); }
    if (b.hp <= 0) { startDying(); return; }
    const want = b.hp < HP * 0.33 ? PHASE.P3 : b.hp < HP * 0.66 ? PHASE.P2 : PHASE.P1;
    if (want > b.phase) {
      b.phase = want; b.idx = 0; jolt(0.8);
      // 傷から煙と火を吹かせる
      for (let i = 0; i < 3; i++) b.wounds.push({ k: Math.floor(R() * b.sp.nseg), acc: 0 });
      if (want === PHASE.P2) { say('大蛇の装甲が割れた！ 薙ぎ払いが来る、光線の線を見て横へ'); alert('怒り　第2段階', 1.6); }
      if (want === PHASE.P3) { say(b.rail ? 'あと少し！ 頭を狙え。光線はレールガンで撃ち抜いて止めろ' : 'あと少し！ 頭を狙え。光線は主砲で押し返せ'); alert('暴走　最終段階', 1.6); }
    }
  }
  // 背の砲台：撃たれると火花。体力が尽きると爆ぜて消え、大蛇も削れる。根元から煙
  let fxRef = null;
  function hitTurret(t, n) {
    if (t.dead || b.phase < PHASE.P1 || b.phase >= PHASE.DYING) return;
    t.hp -= n;
    if (R() < 0.6) puffs.spark(t.rel.toArray(), [(R() - 0.5) * 24, 8 + R() * 16, (R() - 0.5) * 24], 0.3, 0.05, 0.02, 1, 3, 1);
    damage(n * 0.5, 'seg', null);
    if (t.hp > 0 || t.dead) return;
    t.dead = true; t.radius = 0;
    b.sp.killTurret(t.k); b.turretsDown += 1;
    const p = t.rel.toArray();
    if (fxRef) { fxRef.explode(p, 4.5); fxRef.explode([p[0] + (R() - 0.5) * 6, p[1] + 4, p[2] + (R() - 0.5) * 6], 2.5); }
    for (let i = 0; i < 30; i++) {
      const sp = 15 + R() * 40;
      puffs.spark(p, [(R() - 0.5) * sp, R() * sp, (R() - 0.5) * sp], 0.3 + R() * 0.5, 0.07, 0.03, R() < 0.6 ? 1 : 0, 3, 1);
    }
    jolt(0.35);
    addScore(600);
    b.wreck.push({ k: t.k, acc: 0 });
    damage(35, 'seg', t.rel);
    const left = b.sp.nseg - b.turretsDown;
    alert(left ? `砲台撃破　残り ${left}` : '砲台 全滅', 1.3);
    if (!left) say('背中の砲台を全部潰した！ もう弾幕は来ない');
    else if (b.turretsDown === 1) say('砲台を潰した！ 背中の砲台は壊せる、潰せば弾幕が減る');
  }
  function startDying() {
    clearAttack();
    b.phase = PHASE.DYING; b.dying = 0; b.hp = 0;
    hideTargets();
    addScore(8000);
    jolt(1);
    say('大蛇の動きが止まった！ 離れて！');
  }

  // ---- 開始 ----
  function start(radarDown, allies = 0) {
    if (!b.sp) { b.pendingStart = [radarDown, allies]; return; }
    // 僚機を2機とも救っていれば、援護で体力が減った状態から
    if (allies >= 2) b.hp = HP * 0.85;
    b.sp.object.visible = true;
    // 中心の向こう（自機から見て奥）から泳いで来る
    b.sp.place(new THREE.Vector3(0, -0.35, 6.5), new THREE.Vector3(0, 0.06, -1));
    b.sp.act('enter', ctx, false);
    b.t = 0; b.focus.copy(HOME); focusArr[0] = HOME.x; focusArr[1] = HOME.y; focusArr[2] = HOME.z;
    if (FORCE_PHASE) { b.phase = Math.min(3, FORCE_PHASE); b.hp = HP * (1 - 0.34 * (b.phase - 1)) - 1; b.gap = 1; return; }
    b.phase = PHASE.ENTRY;
    warnT = 3.4;
    say('前方に巨大な機影！ 機械の大蛇だ。体当たりに気をつけろ');
  }

  // ---- 攻撃 ----
  function clearAttack() {
    sb.hide(); sb.endClash(); clashT.radius = 0;
    if (b.sp) { b.sp.setJaw(null); b.sp.st.aimTight = false; b.sp.st.aimHold = false; }
    b.atk = null;
  }
  function nextAttack() {
    const plan = PLAN[b.phase] || PLAN[1];
    const name = FORCE_ATK || plan[b.idx % plan.length];
    b.idx += 1;
    b.atk = { name, t: 0, tick: 0, vol: 0.6 };
  }
  // 光線が自機に当たるか。当たれば盾の手前で止める長さを返し、火花を散らして削る（回避の回転中はすり抜ける）
  // 光線の近くで回避したら、その攻撃の残りはすり抜ける（見切り。spec REQ-018。早すぎる回避では効かない）
  function beamHit(A, dir, len, radius, state, player, fx, dmg, a) {
    const along = -(A.x * dir.x + A.y * dir.y + A.z * dir.z);
    if (along <= 0 || along > len) return null;
    const miss = Math.sqrt(Math.max(0, A.lengthSq() - along * along));
    if (player.dodging) { if (EVADE_ON && miss < radius + EVADE_MARGIN) a.evaded = true; return null; }
    if (a.evaded || miss > radius + 1.5) return null;
    const stop = Math.max(5, radius * 1.1);
    const L = along - stop;
    const end = [A.x + dir.x * L, A.y + dir.y * L, A.z + dir.z * L];
    for (let i = 0; i < 8; i++) {
      const sp = 10 + R() * 30;
      puffs.spark(end, [(-dir.x + (R() - 0.5) * 1.8) * sp, (-dir.y + (R() - 0.5) * 1.8) * sp, (-dir.z + (R() - 0.5) * 1.8) * sp], 0.2 + R() * 0.3, 0.06, 0.02, R() < 0.5 ? 1 : 0, 3, 1);
    }
    b.danger = 0.15;
    if (!player.invuln && a.tick <= 0) {
      a.tick = 0.25;
      enemies.hurtPlayer(dmg, state, [-dir.x, -dir.y, -dir.z], fx);
    }
    return L;
  }
  // 自機の今の動きを続けた時の、t 秒後の相対の位置
  // 自機の速さから、輪の中心が自機を運んだ分（carry）を引く。運ばれた分まで先読みすると、狙いが大きく外れる
  const ahead = (player, t, out) => { const v = player.vel || [0, 0, 0]; const f = b.focusVel; return out.set((v[0] - f.x) * t, (v[1] - f.y) * t, (v[2] - f.z) * t); };

  // 光線どうしのぶつかり合い。始まり・押し合い・押し切り・押し負けを見て、ぶつかる点（相対）を返す。押し切ったら 'won'
  function stepClash(a, A, dir, state, player, fx, dt, grow) {
    const firing = !!(state.charge && state.charge.firing);
    const L = A.length();
    const fw = _g.fromArray(player.forward);
    const cosAim = fw.dot(A) / L;
    const cosBeam = -dir.dot(A) / L;
    b.aimDeg = Math.round(Math.acos(Math.min(1, cosAim)) * 57.3); b.beamDeg = Math.round(Math.acos(Math.min(1, cosBeam)) * 57.3);
    if (!a.clash) {
      if (!firing || cosAim < COS_AIM || cosBeam < COS_BEAM || L > 720 || grow < 0.3) return null;
      a.clash = 1; a.cT = 0;
      // 大蛇の光線の先がまだ途中なら、そこで受け止める。届いた後なら自機の近くから押し返す
      a.s = THREE.MathUtils.clamp(1 - a.front / L, 0.3, 0.62);
      b.clashes += 1;
      alert('ビーム衝突！', 1.4);
      if (b.clashes === 1) say('ぶつかった！ 押し返せ！');
      sb.burst(_h.copy(fw).multiplyScalar(Math.min(a.s * L, CANNON_LEN)), _i.copy(dir), 0.6, player.pos, state.time);
      jolt(1); b.flash = Math.max(b.flash, 0.15);
    }
    if (!firing || cosAim < COS_KEEP) return endClash(a, L);
    a.cT += dt;
    const power = 0.55 + 0.45 * Math.min(1, state.charge.level || 0);
    const surge = 0.85 + 0.3 * Math.sin(state.time * 13) * Math.sin(state.time * 5.3);
    a.s += (0.8 * power * surge - CLASH_PUSH[b.phase]) * dt;
    const maxS = CANNON_LEN / L;
    if (a.s >= 0.96 && maxS >= 0.96) return winClash(a, A, dir, state, fx, player);
    a.s = Math.min(a.s, 0.97, maxS);
    if (a.s <= 0.04) return endClash(a, L);
    // 押し合いの値 s で決まる点（自機の機首の線の上）。大蛇の頭はここを見る（押すほど、頭の向く先が口の方へ寄る）
    b.clashS.copy(fw).multiplyScalar(a.s * L);
    // 実際にぶつかる点は、自機の機首の線と大蛇の頭の向きの線がいちばん近づく所（2本の光線の先が離れない）。
    // 2本がほぼ平行（向かい合っている）時は s の点を使う。自機の線の上では 0.15L〜0.97L、大蛇の線の上では口から4以上
    const bb = fw.dot(dir); const den = 1 - bb * bb;
    let u = a.s * L;
    if (den > 0.02) { const d0 = -fw.dot(A); const e0 = -dir.dot(A); u = (bb * e0 - d0) / den; }
    u = THREE.MathUtils.clamp(u, 0.15 * L, 0.97 * L);
    const C = _h.copy(fw).multiplyScalar(u);
    clashT.rel.copy(C).addScaledVector(fw, CLASH_R * 0.95); clashT.radius = CLASH_R;
    b.clashE.copy(A).addScaledVector(dir, Math.max(4, _j.subVectors(C, A).dot(dir)));
    // 見た目のぶつかる点 V は、大蛇の光線の先と自機の光線の先（C）の真ん中。塊・火花・輪はそこに出す
    const V = _j.copy(b.clashE).add(C).multiplyScalar(0.5);
    b.clashGapDeg = Math.atan2(b.clashE.distanceTo(C), C.length() + 1) * 57.3;
    // ぶつかる点の熱の揺らぎと、繰り返し広がる薄い屈折の輪。押し込むほど大蛇の顎が熱で赤くなる
    heatObj.p.copy(V); heatObj.r = 0.045; heatObj.k = 0.9; b.heatPt = heatObj;
    // 押し合いの脈動（約0.38秒ごと）：火花が噴き、屈折の輪が広がり、画面が小さく揺れる
    a.pT = (a.pT ?? 0) - dt; a.ringT = (a.ringT ?? 9) + dt;
    const axis = _i.subVectors(V, A).normalize();
    if (a.pT <= 0) { a.pT = 0.32 + 0.12 * R(); a.ringT = 0; sb.pulse(V, axis, 0.7 + 0.5 * power, player.pos, state.time); jolt(0.3); }
    // 屈折の輪は目で見える強さにする（distortion.js の押しの量は 強さ×0.016×約0.7 画面。0.24 では3画素、0.85 でも7画素ほどで、
    // 止めた絵ではほとんど分からなかった）。1.3 で1080pの画面の約15画素。硬い縁の輪は描かず、背景と大蛇の体が曲がって見える歪みだけで見せる。
    // 広がりは目標の絵と同じく画面の高さの約3割まで。脈動ごとに 0.55 秒で広がって消える
    const ru = Math.min(1, a.ringT / 0.55);
    dringObj.p.copy(V); dringObj.r = (V.length() + 6) * (0.03 + 0.26 * ru); dringObj.k = 1.3 * Math.pow(1 - ru, 1.5); b.dring = dringObj;
    if (a.s > 0.7) b.sp.heat((a.s - 0.7) / 0.27);
    sb.clash(V, axis, power, state.time, dt, player.pos, a.s);
    b.shake = Math.max(b.shake, 0.55);
    state.cameraShake = Math.max(state.cameraShake || 0, 0.35);
    if (maxS < 0.96 && a.cT > 0.6 && !a.farHint) { a.farHint = 1; say('遠すぎて押し切れない！ 近づいて撃ち返せ！'); }
    return C;
  }
  // 押し負け：主砲が切れた・狙いが外れた。大蛇の光線の先は、ぶつかっていた所から自機へ押し寄せる
  function endClash(a, L) {
    a.clash = 0; clashT.radius = 0; sb.endClash();
    a.front = Math.max(0, (1 - a.s) * L);
    a.surge = 0.8; // 押し負けた直後は、光線が自機へ振り向く
    return null;
  }
  // 押し切り：口に叩き込んで大きく削り、大蛇はひるんで咆哮する
  function winClash(a, A, dir, state, fx, player) {
    a.clash = 0; clashT.radius = 0; sb.endClash();
    b.clashWins += 1;
    sb.burst(_h.copy(A), _i.copy(dir), 1.4, player.pos, state.time);
    sb.splash(A, _i.copy(dir), player.pos, state.time);
    b.sp.heat(1); b.winT = 0; b.winP = A.clone(); b.winPP = player.pos.slice(); b.winK = 1.0; b.winS = 1; b.viewHold = 1.6;
    // 爆発は小さめにする（大きな爆発の光は大蛇の全身を白く飛ばす）。代わりに頭が熱で赤く光り、緑の光が飛び散り返る
    // 爆発（強い点光源つき）は使わない。光が頭を白く飛ばすため、粒・飛び散り返り・屈折の輪・頭の縁の熱で見せる
    for (let i = 0; i < 60; i++) {
      const sp = 30 + R() * 90;
      puffs.spark(A.toArray(), [(R() - 0.5) * sp, (R() - 0.5) * sp, (R() - 0.5) * sp], 0.3 + R() * 0.6, 0.09, 0.03, R() < 0.5 ? 1 : 0, 3, 1);
    }
    b.flash = 0.12; jolt(1.4);
    state.cameraShake = Math.max(state.cameraShake || 0, 1);
    alert('押し切った！', 2.0);
    say('押し切った！ 大蛇の口に叩き込んだぞ！');
    addScore(3000);
    damage(170, 'head', A, true);
    if (b.phase < PHASE.DYING) { clearAttack(); b.sp.act('roar', ctx); b.stun = 2.6; }
    return 'won';
  }

  // レールガンで溜めている口を撃ち抜いた：光線を撃たせずに止め、ひるませて削る（spec REQ-015）
  function snipeBeam(A, dir, state, player) {
    b.snipes = (b.snipes || 0) + 1; b.railHitT = null;
    sb.burst(_h.copy(A), _i.copy(dir), 1.1, player.pos, state.time);
    sb.splash(A, _i.copy(dir), player.pos, state.time);
    b.sp.heat(1); b.flash = Math.max(b.flash, 0.1); jolt(1.1);
    state.cameraShake = Math.max(state.cameraShake || 0, 0.7);
    for (let i = 0; i < 40; i++) { const sp = 30 + R() * 80; puffs.spark(A.toArray(), [(R() - 0.5) * sp, (R() - 0.5) * sp, (R() - 0.5) * sp], 0.3 + R() * 0.5, 0.08, 0.03, R() < 0.5 ? 1 : 0, 3, 1); }
    alert('撃ち抜いた！', 1.8);
    say('撃ち抜いた！ 光線が止まったぞ！');
    addScore(2000);
    damage(BALANCE.heavy.rail.snipe, 'head', A, true);
    if (b.phase < PHASE.DYING) { clearAttack(); b.sp.act('roar', ctx); b.stun = 2.0; }
  }

  // 口の光線：2秒溜め（狙いは自機の行き先を追い、撃つ0.5秒前に固まる）→ 2.6秒撃つ（ごくゆっくり追う）。
  // 光線の先は口から秒速2600で伸びる。ぶつかり合いの間は、撃つ時間が止まる（最大3秒）
  function stepBeam(a, state, player, fx, dt, P) {
    const WARN = 2.0; const FIRE = 2.6;
    const sp = b.sp;
    if (!a.c) { a.c = new THREE.Vector3(P[0], P[1], P[2]); a.tick = 0; a.front = 0; a.hold = 0; a.clash = 0; a.s = 0.5; a.wait = 0; a.t0 = state.time; alert('口の光線', 1.8); }
    if (sp.st.act !== 'aim') sp.act('aim', ctx);
    // 狙う先 a.c：撃つまでは自機の今の位置（0.25秒先読み）を追い続ける。頭が向いたら狙いを固め（0.4秒）、それから撃つ。
    // 固めた後に動けば避けられる。待つ間に狙いを固めたままにすると、何秒も前に自機がいた所へ撃っていた
    if (!a.fired && !a.locked) {
      ahead(player, 0.25, _b);
      _a.set(P[0] + _b.x - a.c.x, P[1] + _b.y - a.c.y, P[2] + _b.z - a.c.z);
      const dist = _a.length();
      if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, 150 * dt / dist));
    } else if (a.fired) {
      // ぶつかり合いの間も狙いは自機を追う（見た目の光線は口→ぶつかる点。押し負けた時に、押し寄せる光線がそのまま自機へ届く）
      a.surge = Math.max(0, (a.surge || 0) - dt);
      _a.set(P[0] - a.c.x, P[1] - a.c.y, P[2] - a.c.z);
      const dist = _a.length();
      if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, (a.clash || a.surge > 0 ? 60 : 7) * dt / dist));
    }
    // 光線は頭の向き（口の前）からだけ出す。頭と体は狙う先 a.c へ向きを変える（大蛇の 'aim' の技が ctx.player を見る）
    toModel(a.c.x, a.c.y, a.c.z, ctx.player);
    const A = sp.mouth(_d, _hf);
    const dir = _b.copy(_hf);
    const aligned = _hf.dot(_ta.set(a.c.x - P[0], a.c.y - P[1], a.c.z - P[2]).sub(A).normalize()) >= Math.cos(10 * D2R);
    // 溜めの終わり（WARN の0.4秒前）以降に頭が狙う先から10°以内へ向いたら狙いを固め、0.4秒後に撃つ。
    // 溜めが終わって2.5秒たっても向けなければ、口を閉じて撃たずに終える（こっちを向いていないのに撃たない。何も無い所へも撃たない）
    if (!a.fired) {
      if (!a.locked && a.t >= WARN - 0.4 && aligned) { a.locked = true; a.lockT = 0; }
      if (a.locked) a.lockT += dt;
      if (!a.locked && a.t >= WARN + 2.5) { b.cancels = (b.cancels || 0) + 1; if (TS.cancelInfo.length < 8) TS.cancelInfo.push([+state.time.toFixed(1), Math.round(Math.acos(Math.max(-1, Math.min(1, _hf.dot(_ta)))) * 57.3), Math.round(_ta.set(a.c.x - P[0], a.c.y - P[1], a.c.z - P[2]).sub(A).length())]); return true; }
    }
    const ready = a.fired || (a.locked && a.lockT >= 0.4);
    if (ready && !a.fired) a.fireAt = a.t;
    sp.st.aimHold = !!(a.locked || a.fired); // 狙いを固めたら踏ん張って撃つ
    if (AUTO_CLASH && !a.autoFired && a.locked && a.lockT > 0.34 && state.charge && !state.charge.firing) { a.autoFired = 1; state.charge.level = 1; }
    b.beamOn = ready ? 'fire' : 'charge'; b.beamDir.copy(A).negate().normalize(); // 確認用：頭の向きと、口から自機への向きの角度を測る
    if (!ready) {
      // 溜めている間にレールガンで頭を撃ち抜かれたら、撃たずに止まってひるむ（spec REQ-015）
      if (b.railHitT != null && b.railHitT >= a.t0) { snipeBeam(A, dir, state, player); return true; }
      if (b.rail && !a.hinted && !b.snipes && a.t > 0.3) { a.hinted = 1; say('口が光ってる！ 撃たれる前にレールガンで撃ち抜け！'); }
      const u = Math.min(1, a.t / WARN);
      sp.setJaw(0.1 + 0.45 * u);
      sb.charge(A, u, state.time, dir, BEAM_FULL);
      if (a.locked) b.danger = 0.1; // 狙いが固まった。今が向きを変える時
      if (!b.rail && a.t > WARN - 0.9 && !a.hinted && b.clashes === 0) { a.hinted = 1; say('主砲を溜めて、撃つ瞬間に口へ撃ち返せ！ 光線を押し返せる'); }
      return false;
    }
    const tf = a.t - a.fireAt;
    if (tf >= FIRE + a.hold) { clearAttack(); return true; }
    if (!a.fired) {
      a.fired = 1; jolt(0.8); b.flash = Math.max(b.flash, 0.04);
      sb.fireWave(A, dir, P, state.time);
      b.winT = 0; b.winP = A.clone(); b.winPP = P.slice(); b.winK = 0.28; b.winS = 0.5;
    }
    sp.setJaw(0.6);
    const grow = Math.min(1, tf * 8) * Math.min(1, (FIRE + a.hold - tf) * 5) * (1 + 0.45 * Math.exp(-tf * 7)) * (b.phase >= PHASE.P3 ? 1.2 : 1);
    b.shake = Math.max(b.shake, 0.3);
    const C = stepClash(a, A, dir, state, player, fx, dt, grow);
    sp.st.aimTight = !!(C && C !== 'won');
    if (C === 'won') return true;
    if (C) {
      // ぶつかり合いの間、頭は押し合いの値 s の点を見る。光線は頭の向きのまま、自機の光線といちばん近づく所まで（stepClash の clashE）
      toModel(b.clashS.x + P[0], b.clashS.y + P[1], b.clashS.z + P[2], ctx.player);
      b.beamOn = 'clash'; b.beamDir.subVectors(b.clashS, A).normalize();
      sb.fire(A, dir, A.distanceTo(b.clashE), grow, state.time, null, true);
      a.hold = Math.min(3.0, a.hold + dt);
      return false;
    }
    a.front = Math.min(BEAM_FULL, a.front + 2600 * dt);
    const hl = beamHit(A, dir, a.front, BEAM_R * Math.min(1, grow), state, player, fx, 9, a);
    sb.fire(A, dir, hl ?? a.front, grow, state.time, hl != null ? _f.copy(A).addScaledVector(dir, hl) : null);
    return false;
  }
  // 薙ぎ払い：咆哮で吠えてから、口の光線で自機の行き先のまわりを横に払う
  function stepSweep(a, state, player, fx, dt, P) {
    const ROAR = 1.2; const WARN = 0.6; const FIRE = 2.2;
    const sp = b.sp;
    if (a.t < dt * 1.5 && !a.started) { a.started = true; sp.act('roar', ctx); alert('咆哮　薙ぎ払い', 1.8); a.tick = 0; }
    if (a.t < ROAR) { b.danger = 0.1; return false; }
    if (!a.c) {
      // 払う中心＝自機の行き先。払う向き＝自機から見た横
      ahead(player, 1.0, _a);
      a.c = new THREE.Vector3(P[0] + _a.x, P[1] + _a.y, P[2] + _a.z);
      const A = sp.mouth(_d);
      _b.copy(A).negate().normalize();                        // 口 → 自機
      a.side = new THREE.Vector3().crossVectors(_b, UPV).normalize();
      a.amp = 80 + (b.phase >= PHASE.P3 ? 40 : 0);
      a.s = R() < 0.5 ? 1 : -1;
    }
    a.wait = a.wait || 0;
    const tt = a.t - ROAR - a.wait;
    const ph = Math.max(-1, Math.min(1, (tt - WARN) / FIRE * 2 - 1)) * a.s;
    const aim = _c.copy(a.c).addScaledVector(a.side, a.amp * (tt < WARN ? -a.s : ph));
    // 頭も体も払う先を向き、光線は頭の向き（口の前）からだけ出す
    toModel(aim.x, aim.y, aim.z, ctx.player);
    if (sp.st.act !== 'aim') sp.act('aim', ctx);
    const A = sp.mouth(_d, _hf);
    const dir = _b.copy(_hf);
    const aligned = _hf.dot(_ta.set(aim.x - P[0], aim.y - P[1], aim.z - P[2]).sub(A).normalize()) >= Math.cos(15 * D2R);
    if (!a.fired && tt >= WARN && !aligned) {
      if (a.wait >= 1.0) { b.cancels = (b.cancels || 0) + 1; return true; } // 払う先へ頭を向けられなければ、撃たずに終える
      a.wait += dt; sb.charge(A, 1, state.time, dir, BEAM_FULL); b.beamOn = 'charge'; b.beamDir.subVectors(aim, _f.set(P[0], P[1], P[2])).sub(A).normalize(); return false;
    }
    b.beamOn = tt < WARN ? 'charge' : (tt < WARN + FIRE ? 'fire' : ''); b.beamDir.subVectors(aim, _f.set(P[0], P[1], P[2])).sub(A).normalize(); // 確認用：払う先への向き
    if (tt < WARN) {
      sp.setJaw(0.62);
      sb.charge(A, 0.5 + 0.5 * tt / WARN, state.time, dir, BEAM_FULL);
    } else if (tt < WARN + FIRE) {
      if (!a.fired) {
        a.fired = 1; jolt(0.7); b.flash = Math.max(b.flash, 0.04);
        sb.fireWave(A, dir, P, state.time);
        b.winT = 0; b.winP = A.clone(); b.winPP = P.slice(); b.winK = 0.25; b.winS = 0.5;
      }
      sp.setJaw(0.62);
      const u = (tt - WARN) / FIRE;
      const grow = Math.min(1, u * 10) * Math.min(1, (1 - u) * 8) * 0.85;
      const hl = beamHit(A, dir, BEAM_FULL, BEAM_R * 0.85 * Math.min(1, grow / 0.85), state, player, fx, 8, a);
      sb.fire(A, dir, hl ?? BEAM_FULL, grow, state.time, hl != null ? _f.copy(A).addScaledVector(dir, hl) : null);
      b.shake = Math.max(b.shake, 0.25);
    } else { clearAttack(); return true; }
    return false;
  }
  // 突進：首を引いて1秒溜める（口が開き光る）→ 自機の居た所へ噛みつく。当たりは体のぶつかりで見る
  function stepRam(a, state, player, fx, dt, P) {
    const TELE = 1.0;
    const sp = b.sp;
    if (!a.started) { a.started = true; sp.act('aim', ctx); alert('突進', 1.6); }
    if (a.t < TELE) {
      sp.setJaw(0.25 + 0.2 * (a.t / TELE));
      sb.charge(sp.mouth(_d), a.t / TELE * 0.6, state.time);
      b.danger = 0.1;
      return false;
    }
    if (!a.lunged) { a.lunged = true; sb.hide(); sp.setJaw(null); sp.act('lunge', ctx); jolt(0.4); }
    // 噛みつきの勢いの間は、頭の後ろに噴射の尾
    if (sp.st.act === 'lunge' && sp.st.t > 0.55 && sp.st.t < 1.05) {
      sp.mouth(_d); sp.headWorld(_c); _b.subVectors(_d, _c);
      for (let i = 0; i < 3; i++) puffs.puff([_c.x - _b.x * 2 + (R() - 0.5) * 20, _c.y - _b.y * 2 + (R() - 0.5) * 20, _c.z - _b.z * 2 + (R() - 0.5) * 20], [0, 0, 0], 0.5 + R() * 0.4, 3, 10, R() < 0.5 ? KIND.FIRE : KIND.SMOKE, 1, 1);
    }
    return a.t > TELE + 2.3;
  }
  // 背の砲台から撃つ。残っている砲台から n 基を選び、自機の行き先へ（ばらつき spread）
  function volley(state, player, P, n, speed, kind, spread, scale) {
    const sp = b.sp;
    const ks = [];
    for (let k = 0; k < sp.nseg; k++) if (sp.turretAlive(k)) ks.push(k);
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    for (const k of ks.slice(0, n)) {
      const from = sp.turretMuzzle(k, _a);
      const t = from.length() / speed;
      ahead(player, t, _b);
      const dir = _b.sub(from);
      dir.x += (R() - 0.5) * spread * dir.length(); dir.y += (R() - 0.5) * spread * dir.length(); dir.z += (R() - 0.5) * spread * dir.length();
      dir.normalize();
      enemies.fireBolt(from.toArray(), P, dir.toArray(), speed, kind, 0.4, scale);
      puffs.puff(from.toArray(), [0, 0, 0], 0.12, 1.5, 3, KIND.MUZZLE ?? KIND.FLASH, 0, 1);
    }
  }
  function stepSwim(a, state, player, dt, P) {
    if (!a.started) { a.started = true; b.sp.act('swim', ctx); }
    const every = b.phase >= PHASE.P3 ? 0.8 : b.phase >= PHASE.P2 ? 1.1 : 1.4;
    a.vol -= dt;
    if (a.vol <= 0) { a.vol = every; volley(state, player, P, b.phase >= PHASE.P2 ? 4 : 3, 160, 0, 0.05, 1.4); }
    return a.t > (b.phase >= PHASE.P3 ? 3.5 : 5.0);
  }
  function stepCoil(a, state, player, dt, P) {
    if (!a.started) { a.started = true; b.sp.act('coil', ctx); alert(b.turretsDown < b.sp.nseg ? '砲台　一斉射撃' : 'とぐろ', 1.6); }
    a.vol -= dt;
    if (a.t > 1.0 && a.vol <= 0) { a.vol = b.phase >= PHASE.P3 ? 0.6 : 0.9; volley(state, player, P, b.sp.nseg, 130, 1, 0.22, 1.6); }
    return a.t > 7.0;
  }
  function stepAttack(state, player, fx, dt, P) {
    const a = b.atk;
    a.t += dt; a.tick -= dt;
    let end = true;
    if (a.name === 'beam') end = stepBeam(a, state, player, fx, dt, P);
    else if (a.name === 'sweep') end = stepSweep(a, state, player, fx, dt, P);
    else if (a.name === 'ram') end = stepRam(a, state, player, fx, dt, P);
    else if (a.name === 'coil') end = stepCoil(a, state, player, dt, P);
    else end = stepSwim(a, state, player, dt, P);
    if (end) {
      const big = a.name === 'beam' || a.name === 'sweep' || a.name === 'ram';
      clearAttack();
      // 大きな攻撃の後は戻りの動き（頭を下げ、口を閉じ、ゆっくり泳ぐ）と少し長い間。押し切られて咆哮している時はそのまま
      if (big && b.sp.st.act !== 'roar') b.sp.act('recover', ctx);
      b.gap = Math.max(b.stun, big ? (b.phase >= PHASE.P3 ? 0.7 : 1.1) : (b.phase >= PHASE.P3 ? 0.3 : 0.7)); b.stun = 0;
    }
  }

  // ---- 回る輪の中心：大蛇に付いて動かす（頭と胴の間。口の光線・薙ぎ払いの溜めの間は口へ寄せ、照準が口へ向くようにする） ----
  function updateFocus(dt, P) {
    const sp = b.sp;
    if (b.phase >= PHASE.P1) {
      const a = b.atk;
      // 口へ寄せる量は約0.7秒かけて切り替える（一気に切り替えると、輪の中心に運ばれる自機ごと画面が毎秒300〜400で滑った）
      const mouthWant = a && (a.name === 'beam' || (a.name === 'sweep' && a.t < 1.8)) ? 1 : 0.55;
      b.toMouth = (b.toMouth ?? 0.55) + THREE.MathUtils.clamp(mouthWant - (b.toMouth ?? 0.55), -0.65 * dt, 0.65 * dt);
      const toMouth = b.toMouth;
      sp.mouth(_a); sp.segMatrix(3, _m); _b.setFromMatrixPosition(_m).applyMatrix4(sp.object.matrixWorld);
      _c.copy(_b).lerp(_a, toMouth);
      _c.x += P[0]; _c.y += P[1]; _c.z += P[2];
      _c.x = HOME.x + THREE.MathUtils.clamp(_c.x - HOME.x, -FOCUS_BOX[0], FOCUS_BOX[0]);
      const fy = THREE.MathUtils.lerp(FOCUS_BOX[1], FOCUS_BEAM_Y, THREE.MathUtils.clamp((toMouth - 0.55) / 0.45, 0, 1));
      _c.y = HOME.y + THREE.MathUtils.clamp(_c.y - HOME.y, -fy, fy);
      _c.z = HOME.z + THREE.MathUtils.clamp(_c.z - HOME.z, -FOCUS_BOX[0], FOCUS_BOX[0]);
    } else _c.copy(HOME);
    _d.copy(_c).sub(b.focus).multiplyScalar(1 - Math.exp(-(b.atk && b.atk.name === 'beam' ? 2.5 : 1.2) * dt));
    const lim = FOCUS_SPEED * dt * (b.atk && b.atk.name === 'beam' ? 1.2 : 1); // 光線の間も毎秒84まで（自機が運ばれる速さの上限）
    if (_d.length() > lim) _d.setLength(lim);
    b.focus.add(_d);
    b.focusVel.lerp(_d.multiplyScalar(1 / Math.max(dt, 1e-3)), 1 - Math.exp(-dt * 10));
    focusArr[0] = b.focus.x; focusArr[1] = b.focus.y; focusArr[2] = b.focus.z;
  }

  // ---- 体のぶつかり：触れた所から自機を弾き出し、互いに削る ----
  const PLAYER_R = 3;
  const _push = new THREE.Vector3();
  // 体に触れた自機を押し出す。押し出したら true（呼ぶ側が大蛇の置き場所を新しい自機の位置で置き直す）
  function bodyContact(state, player, fx, P, dt) {
    b.cool -= dt;
    const lunging = b.sp.st.act === 'lunge' && b.sp.st.t > 0.5 && b.sp.st.t < 1.3;
    // 突っ込んでくる間に回避したら、その体当たりは見切りで当たらない（spec REQ-018。突っ込む前の早すぎる回避は効かない）
    if (EVADE_ON && player.dodging && b.atk && b.atk.name === 'ram' && b.sp.st.act === 'lunge' && b.sp.st.t > 0.25 && b.sp.st.t < 1.3) b.atk.evaded = true;
    // 弾き出す（回避の回転中はすり抜ける）。重なった球の分を足し合わせ、1コマにまとめて押す。速さの上限は毎秒450
    // （体が突っ込んでくる速さ＝突進で約400/秒より少し速く）。前は重なった球の数だけ1コマに何度も押し、1コマで約25動いて瞬間移動に見えた
    _push.set(0, 0, 0);
    for (const s of spheres) {
      const d = s.rel.length(); const lim = s.r + PLAYER_R;
      if (d >= lim || d < 1e-3) continue;
      if (!player.dodging) _push.addScaledVector(_a.copy(s.rel).multiplyScalar(-1 / d), lim - d + 4);
    }
    const pl = _push.length();
    if (pl > 1e-6) { _push.multiplyScalar(Math.min(1, 450 * dt / pl)); P[0] += _push.x; P[1] += _push.y; P[2] += _push.z; }
    for (const s of spheres) {
      const d = s.rel.length();
      const lim = s.r + PLAYER_R;
      if (d >= lim || d < 1e-3) continue;
      const n = _a.copy(s.rel).multiplyScalar(-1 / d); // 球の中心 → 自機
      // 体に触れている間に回避したら、その攻撃の残りは当たらない（見切り。spec REQ-018）
      if (player.dodging) { if (EVADE_ON && b.atk) b.atk.evaded = true; continue; }
      if (b.cool > 0 || (b.atk && b.atk.evaded)) continue;
      b.cool = 0.6; b.bumps = (b.bumps || 0) + 1; b.lastBump = s.part + (lunging ? ':lunge' : '');
      const hitPt = [s.rel.x + n.x * s.r, s.rel.y + n.y * s.r, s.rel.z + n.z * s.r];
      const dmgP = s.part === 'head' ? (lunging ? 28 : 16) : 11;
      if (!player.invuln) enemies.hurtPlayer(dmgP, state, [-n.x, -n.y, -n.z], fx);
      damage(s.part === 'head' ? 30 : 22, s.part, s.rel); // 体当たりは大蛇も削れる
      for (let i = 0; i < 40; i++) {
        const sp = 15 + R() * 45;
        puffs.spark(hitPt, [(n.x + (R() - 0.5) * 1.8) * sp, (n.y + (R() - 0.5) * 1.8) * sp, (n.z + (R() - 0.5) * 1.8) * sp], 0.2 + R() * 0.4, 0.06, 0.03, R() < 0.6 ? 1 : 0, 3, 1);
      }
      fx.explode(hitPt, lunging ? 5 : 3);
      jolt(lunging ? 1.2 : 0.9);
      b.flash = Math.max(b.flash, lunging ? 0.25 : 0.12);
      state.cameraShake = Math.max(state.cameraShake || 0, lunging ? 1 : 0.7);
      if (lunging) say('噛みつかれた！ 突進は回避の回転でかわせ');
      break;
    }
    return pl > 1e-6;
  }

  // ---- 毎コマ ----
  function update(state, player, fx, dt, P) {
    fxRef = fx;
    updateScreen(state, dt);
    clashT.radius = 0; // ぶつかり合いの間だけ、毎コマ置き直す
    b.dring = null; b.heatPt = null;
    if (b.sp && b.phase !== PHASE.NONE) fight(state, player, fx, dt, P);
    // 押し切った瞬間の大きな屈折の輪（口から広がる）と、撃つ瞬間の小さな輪。
    // 画面の輪の口は1つなので、ぶつかり合いの脈動の輪が出ている間は、撃つ瞬間の弱い輪（強さ0.9未満）で上書きしない
    if (b.winT < 0.7) b.winT += dt;
    if (b.winT < 0.7 && (!b.dring || (b.winK || 0) >= 0.9)) {
      const u = b.winT / 0.7;
      dringObj.p.copy(b.winP).sub(_e.set(P[0] - (b.winPP ? b.winPP[0] : P[0]), P[1] - (b.winPP ? b.winPP[1] : P[1]), P[2] - (b.winPP ? b.winPP[2] : P[2])));
      dringObj.r = (b.winP.length() + 6) * (0.1 + 0.8 * u) * (b.winS || 1); dringObj.k = (b.winK || 0.45) * (1 - u) * (1 - u); b.dring = dringObj;
    }
    // カメラ：口の光線の溜めと発射の間、押し切った直後
    b.viewHold = Math.max(0, b.viewHold - dt);
    const beamOn = b.atk && b.atk.name === 'beam' && b.phase >= PHASE.P1 && b.phase < PHASE.DYING;
    b.view = beamOn || b.viewHold > 0 ? VIEW : null;
    // 口が照準より BEAM_DROP の角度を超えて高い時（狙いがまだ追いつかない・頭が上がった）は、照準の消える点を下げ、画面全体も少し下げて口を画面に残す
    let extra = 0;
    if (beamOn && b.sp && player.forward) {
      b.sp.mouth(_vm); _vf.fromArray(player.forward);
      _vu.set(0, 1, 0).addScaledVector(_vf, -_vf.y).normalize();
      const elev = Math.atan2(_vm.dot(_vu), Math.max(1e-3, _vm.dot(_vf)));
      extra = THREE.MathUtils.clamp(elev - Math.atan(BEAM_DROP), 0, 0.25);
    }
    const vk = 1 - Math.exp(-dt * 4);
    VIEW.pitch += (VIEW_BEAM.pitch - extra * 0.85 - VIEW.pitch) * vk;
    VIEW.look += (VIEW_BEAM.look + 9.4 * extra * 0.3 - VIEW.look) * vk;
    sb.update(state.time, dt, P);
    if (TRACING && b.sp && b.phase !== PHASE.NONE) {
      b.sp.mouth(_tm, _tf);
      const ang = b.beamOn ? Math.round(Math.acos(THREE.MathUtils.clamp(_tf.dot(b.beamDir), -1, 1)) * 57.3) : -1;
      traceFrame(state.time, b.atk ? b.atk.name : '', b.sp.st.act, _tm.x + P[0], _tm.y + P[1], _tm.z + P[2], P[0], P[1], P[2], ang, b.beamOn);
    }
    b.beamOn = '';
  }
  function fight(state, player, fx, dt, P) {
    const sp = b.sp;
    b.t += dt;
    b.rail = !!state.railMode; // レールガンを積んでいる（主砲が無く押し合えない。台詞と照準を替える）
    const root = sp.object;
    // 高さは場の高さのまま（自機の上下の範囲は、大蛇に付いて動く輪の中心から決まる）
    b.yOff = 0;
    root.position.set(HOME.x - P[0], HOME.y + b.yOff - P[1], HOME.z - P[2]);
    root.updateMatrixWorld(true);
    if (b.phase === PHASE.DYING) { toModel(P[0], P[1], P[2], ctx.player); stepDying(state, fx, dt, P); return; }
    toModel(P[0], P[1], P[2], ctx.player);
    if (b.phase === PHASE.ENTRY) {
      if (b.t > 4.6) { b.phase = PHASE.P1; b.gap = 0.8; say(b.rail ? '背中の砲台は壊せる。口の光線は、溜めている口をレールガンで撃ち抜けば止められる' : '背中の砲台は壊せる。口の光線は、主砲を溜めて口へ撃ち返せば押し返せる'); }
    } else if (b.atk) stepAttack(state, player, fx, dt, P);
    else { b.gap -= dt; if (b.gap <= 0) nextAttack(); }
    // 口の光線の間は、機首を口の真下の、口より BEAM_DROP だけ下へ向け、自機の高さをその照準の少し下へゆっくり寄せる（左右は動かせる）。
    // 輪の中心は口から遅れて動き、場の範囲で止まるので、そのずれも機首を向ける点で埋める（押し切った時に主砲が口へ入る）
    let dxWant = 0; let dyWant = 0; let dzWant = 0;
    if (b.atk && b.atk.name === 'beam' && b.phase >= PHASE.P1) {
      sp.mouth(_a);
      const a = b.atk;
      // レールガンを積んでいる時の溜めの間は、照準を口そのものへ寄せる（撃ち抜けるように。押し合いの構図は要らない）
      const drop = b.rail && !a.fired ? 0 : BEAM_DROP * Math.hypot(_a.x, _a.z) * (a.clash ? 1 - THREE.MathUtils.smoothstep(a.s, 0.55, 0.96) : 1);
      const aimY = _a.y + P[1] - drop;
      dxWant = _a.x + P[0] - b.focus.x; dyWant = aimY - b.focus.y; dzWant = _a.z + P[2] - b.focus.z;
      const want = aimY - 10;
      // 寄せる速さは毎秒40まで（輪の中心に運ばれる分と重なっても、画面が急に上下へ滑らないように）
      P[1] += THREE.MathUtils.clamp((want - P[1]) * (1 - Math.exp(-dt * 1.6)), -40 * dt, 40 * dt);
    }
    const ak = 1 - Math.exp(-dt * (b.atk && b.atk.clash ? 6 : 3)); // ぶつかり合いの間は速く追いつく（押し込むほど機首が口へ上がる）
    OPTS.aimDX += (dxWant - OPTS.aimDX) * ak; OPTS.aimDY += (dyWant - OPTS.aimDY) * ak; OPTS.aimDZ += (dzWant - OPTS.aimDZ) * ak;
    root.position.set(HOME.x - P[0], HOME.y + b.yOff - P[1], HOME.z - P[2]); // 自機の高さを寄せた分も、このコマの置き場所に入れる
    sp.aimTurrets(ctx.player);
    const ev = sp.update(dt, ctx);
    root.updateMatrixWorld(true);
    updateBody();
    updateFocus(dt, P);
    if (b.phase >= PHASE.P1) {
      // 押し出した時は、大蛇の置き場所（自機からの相対）を新しい自機の位置で置き直す（1コマだけ大蛇がずれて見えないように）
      if (bodyContact(state, player, fx, P, dt)) { root.position.set(HOME.x - P[0], HOME.y + b.yOff - P[1], HOME.z - P[2]); root.updateMatrixWorld(true); updateBody(); }
      for (const e of ev) if (e.type === 'roar') { jolt(0.6); b.flash = Math.max(b.flash, 0.08); }
    }
    // 傷の煙と火、壊れた砲台の根元の煙
    for (const w of b.wounds) {
      w.acc += dt * 8;
      if (w.acc > 1) {
        w.acc -= 1;
        const s = spheres.find((x) => x.k === w.k);
        if (s) puffs.puff([s.rel.x + (R() - 0.5) * 8, s.rel.y + s.r * 0.6, s.rel.z + (R() - 0.5) * 8], [(R() - 0.5) * 3, 4 + R() * 3, (R() - 0.5) * 3], 1.4 + R(), 3, 12, R() < 0.25 ? KIND.FIRE : KIND.SMOKE, 0.5, 1);
      }
    }
    for (const w of b.wreck) {
      w.acc += dt * 6;
      if (w.acc > 1) {
        w.acc -= 1;
        sp.turretCenter(w.k, _a);
        puffs.puff([_a.x + (R() - 0.5) * 3, _a.y, _a.z + (R() - 0.5) * 3], [(R() - 0.5) * 2, 5 + R() * 3, (R() - 0.5) * 2], 1.0 + R() * 0.8, 2, 10, R() < 0.35 ? KIND.FIRE : KIND.SMOKE, 0.5, 1);
      }
    }
    setBar(b.phase === PHASE.ENTRY ? Math.min(1, b.t / 3.2) : Math.max(0, b.hp) / HP);
  }
  // 撃破：尾から頭へ、節が順に爆ぜる → 頭で大爆発
  function stepDying(state, fx, dt, P) {
    const sp = b.sp;
    const before = b.dying; b.dying += dt;
    sp.update(dt * Math.max(0, 1 - b.dying / 1.5), ctx); // 動きが止まっていく
    sp.object.updateMatrixWorld(true);
    updateBody(); hideTargets();
    const STEP = 0.32;
    for (let i = Math.floor(before / STEP); i < Math.floor(b.dying / STEP); i++) {
      const k = sp.nseg - 1 - i;
      if (k < 0) break;
      const s = spheres.find((x) => x.k === k);
      if (s) { fx.explode(s.rel.toArray(), 5 + R() * 4); jolt(0.5); }
    }
    if (before < 3.8 && b.dying >= 3.8) {
      fx.explode(targets.head.rel.toArray(), 24);
      fx.explode([targets.head.rel.x + 25, targets.head.rel.y + 8, targets.head.rel.z - 15], 10);
      sb.burst(targets.head.rel, Z, 1.2, P, state.time);
      b.flash = 0.35; jolt(1.2);
      sp.object.visible = false;
      b.wounds.length = 0; b.wreck.length = 0;
      setBar(-1);
    }
    if (b.dying > 6.5) b.done = true;
  }

  function contacts(out) {
    if (!b.sp || b.phase < PHASE.P1 || b.phase >= PHASE.DYING) return;
    out.push({ kind: 'ship', rel: targets.head.rel, radius: targets.head.radius, aim: targets.head });
    for (const t of targets.segs) out.push({ kind: 'ship', rel: t.rel, radius: t.radius, aim: t });
    out.push({ kind: 'ship', rel: targets.tail.rel, radius: targets.tail.radius, aim: targets.tail });
  }

  if (TEST) window.__serpentFight = { b, sb, targets, clashT, trace: TRACE };
  return {
    ready,
    build() {}, start, update, contacts,
    // 回る輪の中心（世界の座標。大蛇に付いて動く）と回り方の値。stage1.js の arena・orbitOpts が返す
    get orbitCenter() { return focusArr; },
    orbitOpts: OPTS,
    // カメラの向き・画面の屈折の輪・熱の揺らぎ（stage1.js 経由で main.js が読む）
    get viewHint() { return b.view || null; },
    get distortRing() { return b.dring; },
    get heatPoint() { return b.heatPt; },
    get phase() { return b.phase; },
    get fighting() { return b.phase >= PHASE.ENTRY && !b.done; },
    get done() { return b.done; },
    get info() {
      const a = b.atk;
      return { boss: 'serpent', phase: b.phase, coreHp: Math.round(b.hp), atk: a ? (AUDIO_ATK[a.name] || '') : '', atkName: a ? a.name : '', atkT: a ? Number(a.t.toFixed(2)) : 0, act: b.sp ? b.sp.st.act : '', bumps: b.bumps || 0, lastBump: b.lastBump || '', bossD: b.sp ? Math.round(b.sp.object.position.length()) : -1,
        focus: focusArr.map((v) => Math.round(v)), aimDeg: b.aimDeg ?? -1, beamDeg: b.beamDeg ?? -1, turretsDown: b.turretsDown, clashes: b.clashes, clashWins: b.clashWins, clash: !!(a && a.clash), clashS: a && a.clash ? Number(a.s.toFixed(2)) : 0 };
    },
    // 確認用：体力を削る
    debugHit(what, n) { damage(n, 'seg', null); },
  };
}
