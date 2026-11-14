// The conductor. Owns the puzzle state, the queue of visual actions and the level transitions, and is the only
// module that emits bus events. Rules change instantly on input; the visuals then play the queued actions and
// speed up when the queue grows, so fast typing and held keys never feel laggy and nothing is dropped.
//
// Phases:  build -> play -> (win) -> teardown -> build ...
// The tear-down of one garden and the build-in of the next overlap: `teardown` only lasts until the next garden
// starts to rise; the leaving garden goes on sinking by itself (see Garden.ghost in render/world.js).
import { LEVELS } from './levels-data.js';
import { parseLevel, Puzzle, DIRS, DX, DY } from './rules.js';
import { TIME, VIEW, CAM } from './config.js';
import { G } from './render/materials.js';
import { SENSE } from './render/sense.js';
import { findPath } from './path.js';
import { clamp, clamp01, ease, damp, mod, lerp } from './util.js';

const SQUISH = 0.13;                      // how far the moth leans into a lantern before it moves
const yawOf = (d) => Math.atan2(DX[d], DY[d]);
const RAD = Math.PI / 180;

export function createGame({ bus, store, stage, rig, garden, lanterns, moth, fx, hud, params }) {
  const parsed = new Map();
  const getLevel = (n) => { if (!parsed.has(n)) parsed.set(n, parseLevel(LEVELS[n - 1])); return parsed.get(n); };

  let phase = 'none', clock = 0, phaseDur = 1;
  let n = 0, level = null, puzzle = null, pending = 0, firstLoad = true;
  let queue = [], cur = null, vel = 0, chained = false, carry = 0;
  let won = false, winReal = true, vDone = 0, lastBox = null;
  let flyFrom = { x: 0, y: 5, z: 0 }, landed = false, litOnLanding = null, gestured = false;
  let followX = 0, followZ = 0, winInfo = null, mx = 0, mz = 0;       // moth cell position in world units
  // Sequence state: the celebration (W), lights still to be sent out during a build (seeds), move keys kept while
  // a garden builds (buffer), the tear-down clock marks, the glory level and the room the win banner needs.
  let W = null, seeds = [], buffer = [], swapAt = 0, askedAt = 0, framed = 0, glory = 0;
  let liftOn = false, liftPx = 0, liftObj = null, baseInsets = null;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  garden.calm = calm; fx.calm = calm;

  const total = () => (puzzle ? puzzle.boxes.length : 0);
  const stats = () => hud.stats({ moves: puzzle.moves, pushes: puzzle.pushes, done: vDone, total: total() });
  const gesture = () => { if (!gestured) { gestured = true; bus.emit('gesture', {}); } };

  // ---- motion wiring: the moth's reactions reach the garden through these, and a lantern reports when it catches light
  const docking = new Set(); let winWait = 0;       // lanterns pushed onto a plinth that have not caught light yet
  moth.fx = fx; moth.garden = garden; moth.lanterns = lanterns; lanterns.fx = fx;
  moth.onPlant = () => { const a = cur; if (a && a.kind === 'step' && !a.said) { a.said = true; bus.emit('move:step', a.msg); } };
  // What the moth can know while it waits: is it free, where the player looks from, a lantern beside it, a lit one near.
  const sense = () => {
    const idle = phase === 'play' && !cur && !queue.length && !won;
    SENSE.idle = idle; SENSE.camYaw = rig.yawNow; SENSE.pushable = null; SENSE.nearLit = null;
    if (!idle || !puzzle) return;
    let bd = 3.2, pd = 9;
    for (const it of lanterns.items) {
      const d = Math.hypot(it.x - moth.x, it.z - moth.z);
      if (it.litTarget && d < bd) { bd = d; SENSE.nearLit = it; }
      if (d < 1.05 && d < pd && it.mode === 'free') { pd = d; SENSE.pushable = it; }
    }
  };
  const turnOf = (yaw) => { let d = (yaw - moth.heading) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d) / Math.PI; };
  // A lantern lights a moment after the push ends: it has to settle on its plinth first. That moment is the dock.
  lanterns.onCatch = (id) => {
    if (!docking.delete(id) || !puzzle || !lanterns.items[id]) return;
    const it = lanterns.items[id];
    vDone = Math.min(total(), vDone + 1);
    garden.press(it.cx, it.cy, 1.1);
    fx.sparks(it.x, 0.36, it.z, 12);
    bus.emit('box:dock', { goalsDone: vDone, goalsTotal: total() });
    if (phase === 'play') moth.rejoice(it.x, it.z);
    stats();
  };
  // A lantern that leaves its plinth: goes dark, and counts down only if it had been counted.
  const undock = (id, undo = false) => {
    lanterns.setLit(id, false);
    if (docking.delete(id)) return;
    vDone = Math.max(0, vDone - 1);
    bus.emit('box:undock', undo ? { goalsDone: vDone, goalsTotal: total(), undo: true } : { goalsDone: vDone, goalsTotal: total() });
  };
  const litCount = () => lanterns.items.reduce((s, it) => s + (it.litTarget ? 1 : 0), 0) - docking.size;

  // ---------------------------------------------------------------- level transitions
  // The hand-over between two gardens is one overlapping sequence about light.
  //   Tear-down: the lights (lantern flames and waiting wisps) leave for the moth, far ones first, and the garden
  //   sinks into the mist behind them in a ripple that closes on the moth's cell.
  //   Build-in: half-way through, the next garden starts to rise in a ripple from the moth's new cell. The moth
  //   flies over with the lights around it and they fly out to every plinth: one becomes the plinth's wisp, one
  //   lights a lantern that already stands there (in turn, before input unlocks).
  // The camera reframes when the tear-down starts, so it is calm by the time a big garden assembles.
  // Durations scale with the size of the garden (TIME.sink, TIME.ripple).
  const sizeOf = () => clamp01((garden.maxD - 4) / 14);              // 0 small garden .. 1 huge garden
  const swapOf = (lv) => lerp(TIME.swap[0], TIME.swap[1], clamp01((Math.max(lv.w, lv.h) - 12) / 14));

  // Extra room at the bottom of the screen (the win banner), given to the camera as one of its fixed insets.
  // The camera glides to the new framing by itself.
  function applyLift(px) {
    if (!rig.bands) return;
    if (!liftObj || rig.bands !== liftObj) baseInsets = rig.bands;           // main.js laid the screen out again
    else if (px === liftPx) return;
    liftObj = px ? { ...baseInsets, b: baseInsets.b + px } : baseInsets; liftPx = px;
    rig.setViewport(rig.vw, rig.vh, liftObj, undefined, CAM.liftTime);
  }

  // Aims the camera at a level: size, orientation and starting zoom in one move (the rig picks the orientation
  // that uses the screen best and the default zoom, unless the URL asked for one on the first load).
  function frame(lv, first) {
    if (liftPx) applyLift(0);
    // The player's own turn of the level that was open when the page closed comes back with it (store.turn).
    const rot = !first ? null : params.rot != null ? params.rot : store.turn(lv.n);
    // During a hand-over the camera move (with any quarter turn) is timed to land as the next garden rises.
    const dur = phase === 'teardown' ? clamp(Math.max(0, swapAt - clock) + 0.35, 0.55, CAM.levelTime) : CAM.levelTime;
    rig.openLevel(lv.w, lv.h, { rot, zoom: first && params.zoom != null ? params.zoom : null, instant: first, dur });
    framed = lv.n;
  }

  // The HUD shows where we are going as soon as it is asked for.
  function announce(k) {
    const lv = getLevel(k);
    hud.level({ n: k, title: lv.title, total: LEVELS.length, best: store.best(k), solved: store.isSolved(k) });
    hud.stats({ moves: 0, pushes: 0, done: 0, total: lv.boxes.length });
  }

  function loadLevel(num, { instant = false } = {}) {
    pending = clamp(Math.round(num) || 1, 1, LEVELS.length);
    route = null;
    if (phase === 'none') return beginBuild(pending, instant);
    announce(pending);
    // Asked again while the old garden is still leaving (] pressed several times): only the destination changes.
    if (phase === 'teardown') { askedAt = clock; swapAt = phaseDur * swapOf(getLevel(pending)); if (framed !== pending) frame(getLevel(pending), false); return; }
    beginTeardown();
  }

  function beginTeardown() {
    const cut = phase === 'build';
    if (phase === 'win') endWin();
    phase = 'teardown'; clock = 0; askedAt = 0; queue.length = 0; cur = null; vel = 0; buffer.length = 0; seeds.length = 0;
    moth.speed = 0; moth.pushing = 0; moth.airTarget = 1; moth.wake();
    fx.recall();
    const w = level.w, h = level.h, cx = clamp(Math.round(moth.x + (w - 1) / 2), 0, w - 1), cy = clamp(Math.round(moth.z + (h - 1) / 2), 0, h - 1);
    const sink = calm ? 0.36 : cut ? 0.4 : lerp(TIME.sink[0], TIME.sink[1], sizeOf());
    phaseDur = sink; swapAt = sink * swapOf(getLevel(pending));
    // The lights leave first, the far ones before the near ones.
    let far = 1; for (const g of lanterns.goals) far = Math.max(far, Math.hypot(g.x - cx, g.y - cy));
    const wait = (x, y) => Math.max(0, 1 - Math.hypot(x - cx, y - cy) / far) * swapAt * 0.9;
    for (const it of lanterns.items) if (it.litTarget && it.scale > 0.5 && it.mode !== 'sky') { fx.gather(it.x, it.y + it.lift + 0.36, it.z, 1, wait(it.cx, it.cy), 0.4); lanterns.take(it.id); }
    for (const g of lanterns.goals) if (!g.away && g.wisp > 0.5 && g.show > 0.5) { fx.gather(g.wx, garden.yAt(g.x, g.y) + 0.3, g.wz, 0, wait(g.x, g.y), 0.4); g.away = true; g.wisp = 0; }
    fx.auraWarm = fx.carried ? fx.motes.reduce((s, m) => s + m.warm, 0) / fx.motes.length : 0;
    lanterns.retire();                                  // before the garden goes to its ghost: needs the cell heights
    garden.startTeardown(sink, cx, cy);
    fx.embers(false);
    bus.emit('level:teardown', { n, duration: sink });
    frame(getLevel(pending), false);
    rig.extra.target = 0.96;
  }

  function updateTeardown(dt) {
    moth.y = damp(moth.y, 1.25, 0.14, dt);
    followX = moth.x; followZ = moth.z;
    if (clock >= Math.max(swapAt, askedAt + 0.13)) beginBuild(pending);
  }

  function beginBuild(num, instant = false) {
    const first = firstLoad;
    n = num; level = getLevel(n); puzzle = new Puzzle(level);
    phase = 'build'; clock = 0; won = false; queue.length = 0; cur = null; landed = false; buffer.length = 0; lastBox = null;
    docking.clear(); winWait = 0;
    store.setLast(n);
    if (first || framed !== n) frame(level, first);
    stage.setLevel(level); garden.setLevel(level);
    rig.extra.set(first ? 0.86 : rig.extra.v); rig.extra.target = 1;
    garden.setView(rig.targetYaw, VIEW[rig.mode].elev * RAD, true);
    const span = instant ? 0.02 : calm ? 0.06 : lerp(TIME.ripple[0], TIME.ripple[1], sizeOf());
    garden.startBuild(0, span);
    lanterns.setLevel(level, puzzle.boxes);
    for (const b of puzzle.boxes) lanterns.arrive(b.id);        // lanterns come up standing on their tiles
    vDone = 0;
    // The moth faces the viewer when it lands.
    puzzle.facing = mod(2 - rig.rot, 4);
    mx = garden.wx(level.start.x); mz = garden.wz(level.start.y);
    if (first) {
      // First arrival: from the lower left of the screen, clear of the title card.
      const sn = Math.sin(rig.targetYaw), cs = Math.cos(rig.targetYaw);
      moth.x = mx - cs * 4.6 + sn * 3.2; moth.z = mz + sn * 4.6 + cs * 3.2; moth.y = 2.4; moth.face(Math.atan2(mx - moth.x, mz - moth.z), true);
    }
    flyFrom = { x: moth.x, y: moth.y, z: moth.z };
    moth.airTarget = 1; moth.visible = true; moth.scale = 1;
    followX = mx; followZ = mz;
    // One light for every plinth rides in the swarm around the moth. Each leaves in time to land as its tile settles.
    fx.anchor(moth.x, moth.y, moth.z);
    const goals = lanterns.goals, have = fx.carried;
    if (have < goals.length) fx.spawn(goals.length - have, 0); else fx.keep(goals.length);
    seeds.length = 0;
    let lit = 0, lastLit = 0;
    for (const g of goals) {
      const box = puzzle.boxAt[g.y * level.w + g.x], at = Math.max(0.2, garden.riseEnd(g.x, g.y) - 0.1);
      g.away = true; g.wisp = 0;
      seeds.push({ g, box, at, sent: false, done: false, lv: level });
      if (box >= 0) { lit++; lastLit = Math.max(lastLit, at); }
    }
    seeds.sort((a, b) => a.at - b.at);
    // Input unlocks when the ripple is nearly through, the moth has landed and every lantern that starts on a plinth is lit.
    phaseDur = instant ? 0.01 : calm ? Math.max(0.5, lastLit + 0.1) : Math.max(0.74, span + TIME.ready, lastLit + 0.1);
    bus.emit('level:build', { n, w: level.w, h: level.h, boxes: total(), duration: phaseDur, goalsDone: lit, goalsTotal: total(), rot: rig.rot });
    hud.level({ n, title: level.title, total: LEVELS.length, best: store.best(n), solved: store.isSolved(n) });
    stats();
    firstLoad = false;
    if (instant) skipBuild();
  }

  // Sends the lights out of the swarm on time. Runs every frame; the last ones may land just after input unlocks.
  function runSeeds() {
    if (!seeds.length) return;
    const t = garden.clock; let all = true;
    for (const sd of seeds) {
      if (sd.sent) continue;
      if (t < sd.at - 0.42) { all = false; continue; }
      sd.sent = true;
      fx.send(sd.g.wx, sd.box >= 0 ? 0.42 : 0.3, sd.g.wz, sd.box >= 0 ? 1 : 0, 0, Math.max(0.16, sd.at - t), () => landSeed(sd));
    }
    if (all) seeds.length = 0;
  }

  // A light arrives: it lights the lantern that stands on the plinth, or stays as the plinth's waiting wisp.
  function landSeed(sd) {
    if (sd.done || sd.lv !== level) return;
    sd.done = true;
    const g = sd.g, b = sd.box >= 0 ? puzzle.boxes[sd.box] : null;
    g.away = false;
    if (b && b.x === g.x && b.y === g.y) {
      if (lanterns.isLit(sd.box)) return;
      lanterns.kindle(sd.box); vDone++;
      fx.sparks(g.wx, 0.36, g.wz, 6); fx.ring(g.wx, garden.yAt(g.x, g.y) + 0.1, g.wz, 1.3, 0.5);
      garden.press(g.x, g.y, 0.7);
      bus.emit('box:dock', { goalsDone: vDone, goalsTotal: total(), initial: true });
      stats();
    } else if (!g.held) { g.wisp = 1; fx.ring(g.wx, garden.yAt(g.x, g.y) + 0.1, g.wz, 0.8, 0.4, 0); }
  }

  function updateBuild(dt) {
    const T = phaseDur, flyEnd = Math.max(0.01, T - 0.3), t = clock;
    if (t < flyEnd) {
      const p = ease.inOutCubic(clamp01(t / flyEnd));
      moth.x = lerp(flyFrom.x, mx, p); moth.z = lerp(flyFrom.z, mz, p);
      moth.y = lerp(flyFrom.y, 1.15, ease.outCubic(clamp01(t / (flyEnd * 0.7)))) + Math.sin(p * Math.PI) * 0.3;
      const dx = mx - flyFrom.x, dz = mz - flyFrom.z;
      if (Math.hypot(dx, dz) > 0.3 && p < 0.8) moth.face(Math.atan2(dx, dz)); else moth.face(yawOf(puzzle.facing));
    } else {
      const q = clamp01((t - flyEnd) / 0.26);
      moth.x = mx; moth.z = mz; moth.y = 1.15 * (1 - ease.inOutQuad(q)); moth.face(yawOf(puzzle.facing));
      if (q > 0.6) moth.airTarget = 0;
      if (q >= 1 && !landed) { landed = true; moth.y = 0; moth.land(); garden.press(level.start.x, level.start.y, 1.3); fx.puff(mx, 0.05, mz, 7); }
    }
    if (t >= T) finishBuild();
  }

  function finishBuild() {
    if (!landed) { landed = true; moth.x = mx; moth.z = mz; moth.y = 0; moth.airTarget = 0; }
    phase = 'play'; clock = 0;
    bus.emit('level:ready', { n });
    hud.ready();
    for (const d of buffer.splice(0)) input(d);                 // moves pressed while the garden was building
  }

  // Ends the build at once (test hook, instant load): everything is in place and lit.
  function skipBuild() {
    garden.clock = 99; garden.update(0.001); lanterns.showAll();
    fx.flush(); for (const sd of seeds) landSeed(sd); seeds.length = 0;
    moth.x = mx; moth.z = mz; moth.y = 0; moth.airTarget = 0; landed = true;
    finishBuild();
  }

  // A move asked for while a garden builds is kept (the last few) once the moth's cell is up, and played when
  // input unlocks. Earlier presses are dropped, so mashing through a celebration does not walk the next garden.
  // A press that is ignored (during the celebration, the hand-over or the first moments of the build) marks the
  // player as mashing: nothing is kept until the keys have been quiet for a moment, so a run of presses that
  // began before the build-in never reaches the new garden.
  let mashAt = -1e9;
  const mash = () => { mashAt = performance.now(); };
  function holdMove(dir) {
    if (phase !== 'build') return;
    if (clock < 0.42 || performance.now() - mashAt < TIME.mashQuiet * 1000) return mash();
    buffer.push(dir); if (buffer.length > TIME.moveBuffer) buffer.shift();
  }

  // ---------------------------------------------------------------- celebration
  // The last lantern lands. A held breath: every flame dips. Then each lantern answers in turn, outward from the
  // last one, so twelve lanterns play longer than two: it flares, lifts off its plinth and throws a ring of light,
  // while one wide ring of warm light crosses the whole garden and the warmth spills over walls and mist. About a
  // second in the garden is at its brightest, and it stays lit, the moth visiting its lanterns, for as long as the
  // player likes. Any key goes on: the lights fly to the moth and travel with it to the next garden (tear-down).
  // A key pressed early is remembered and the rest plays at double speed. Z takes the winning move back.
  // The last garden lets its lanterns go into the night instead.
  function startWin(real) {
    phase = 'win'; clock = 0; winReal = real;
    const first = !store.isSolved(n), newBest = real ? store.recordSolve(n, puzzle.moves) : false, last = n === LEVELS.length;
    const items = lanterns.items, N = items.length;
    const ox = lastBox ? garden.wx(lastBox.x) : moth.x, oz = lastBox ? garden.wz(lastBox.y) : moth.z;
    const far = (id) => Math.hypot(items[id].tx - ox, items[id].tz - oz);
    const order = items.map((it) => it.id).sort((a, b) => far(a) - far(b));
    const light = (real && !first) || calm;                      // a garden that was solved before celebrates more lightly
    const gap = N > 1 ? clamp(TIME.answerSpan / (N - 1), TIME.answer[0], TIME.answer[1]) * (light ? 0.7 : 1) : 0;
    const breath = light ? 0.18 : TIME.breath, settle = 0.3;
    let reach = 1; for (const a of [-1, 1]) for (const b of [-1, 1]) reach = Math.max(reach, Math.hypot(a * level.w / 2 - ox, b * level.h / 2 - oz));
    W = { st: 'breath', order, k: 0, gap, breath, settle, next: 0, lastAt: 0, t0: 0, skip: false, ox, oz, last, light, reach, speed: Math.max(9, reach / 1.5), visit: 0, visitT: 0, ang: 0 };
    winInfo = { n, moves: puzzle.moves, pushes: puzzle.pushes, best: store.best(n), newBest, first, last, lit: store.solvedCount(), total: LEVELS.length };
    bus.emit('win', { n, moves: puzzle.moves, pushes: puzzle.pushes, duration: breath + gap * Math.max(0, N - 1) + settle, goalsTotal: N });
    hud.win(winInfo, proceed);
    moth.rejoice();
  }

  function updateWin(dt) {
    const t = clock, items = lanterns.items, N = W.order.length;
    if (W.st === 'breath') {
      lanterns.breath = damp(lanterns.breath, 1, 0.08, dt);
      if (t >= W.breath || (W.skip && t >= 0.1)) {
        W.st = 'answer'; W.t0 = W.next = t;
        const cx = Math.round(W.ox + (level.w - 1) / 2), cy = Math.round(W.oz + (level.h - 1) / 2);
        garden.wave(cx, cy, W.speed); garden.bloom(cx, cy);
        G.uPulse.value.set(W.ox, W.oz, 0, 1);
        if (!calm) fx.embers(true);
        // A garden that is larger than the screen is shown whole while the ring of light crosses it.
        rig.extra.target = rig.zoom.target > 1.25 ? (W.last ? Math.max(0.2, 1.02 / rig.zoom.target) : 0.82) : 1;
        liftOn = true;
      }
    } else {
      lanterns.breath = damp(lanterns.breath, 0, 0.1, dt);
      const P = G.uPulse.value, u = t - W.t0; P.z = u * W.speed; P.w = Math.max(0, 1 - u / (W.reach / W.speed + 0.5)) * 1.1;
    }
    if (W.st === 'answer') {
      while (W.k < N && t >= W.next) {
        const it = items[W.order[W.k]];
        lanterns.answer(it.id); if (calm) lanterns.settle(it.id);
        fx.sparks(it.x, 0.45, it.z, W.light ? 4 : 8); fx.ring(it.x, garden.yAt(it.cx, it.cy) + 0.1, it.z, 1.8, 0.62);
        garden.press(it.cx, it.cy, 0.8);
        bus.emit('win:lantern', { index: W.k, total: N });
        W.k++; W.lastAt = t; W.next += W.gap * (W.skip ? 0.5 : 1);
      }
      if (W.k >= N && t >= W.lastAt + (W.skip ? 0.14 : W.settle)) {
        W.st = 'hold';
        if (W.last && !calm) { for (let i = 0; i < N; i++) lanterns.release(W.order[i], 0.2 + i * 0.16); fx.embers(true, { hx: level.w / 2, hz: level.h / 2 }); }
        // Seen from straight above, lights that rise into the sky do not move: the camera leans back to watch them go.
        if (W.last && !calm && rig.targetElev > 80 * RAD) { rig.tilt(CAM.skyTilt, CAM.skyTiltTime); garden.setView(rig.targetYaw, rig.targetElev); }
      }
    }
    if (W.st === 'hold') {
      if (W.skip && !hud.panel()) return advance();
      if (!calm) {
        // The moth visits its lanterns, one after the other; over the last garden it circles among the risen ones.
        moth.airTarget = 1; W.visitT += dt;
        let tx, tz, ty;
        if (W.last) { W.ang += dt * 0.8; const R = Math.min(level.w, level.h) * 0.25 + 1.2; tx = Math.sin(W.ang) * R; tz = Math.cos(W.ang) * R; ty = 2.4 + 0.3 * Math.sin(t * 1.3); }
        else {
          if (W.visitT > 2.7 && N > 1) { W.visitT = 0; W.visit = (W.visit + 1) % N; }
          const it = items[W.order[W.visit]]; W.ang += dt * 2.2;
          tx = it.x + Math.sin(W.ang) * 0.8; tz = it.z + Math.cos(W.ang) * 0.8; ty = 1.2 + 0.14 * Math.sin(t * 2.3);
        }
        const px = moth.x, pz = moth.z;
        moth.x = damp(moth.x, tx, 0.3, dt); moth.z = damp(moth.z, tz, 0.3, dt); moth.y = damp(moth.y, ty, 0.3, dt);
        if (Math.hypot(moth.x - px, moth.z - pz) > 1e-4) moth.face(Math.atan2(moth.x - px, moth.z - pz));
      }
    }
    followX = damp(followX, 0, 0.5, dt); followZ = damp(followZ, 0, 0.5, dt);
  }

  // The player goes on from the celebration (any key, a tap). Remembered if the celebration is not there yet.
  function proceed() { if (phase === 'win' && W) W.skip = true; }

  function advance() {
    if (n < LEVELS.length) return loadLevel(n + 1);
    // After the last garden: on to the first one that is still dark, else back to the beginning.
    let k = 1; for (let i = 1; i < LEVELS.length; i++) if (!store.isSolved(i)) { k = i; break; }
    loadLevel(k);
  }

  function endWin() {
    W = null; liftOn = false;
    if (rig.tilted) { rig.tilt(null, CAM.viewTime); garden.setView(rig.targetYaw, rig.targetElev); }
    hud.winHide(); lanterns.celebrate(false); lanterns.breath = 0; fx.embers(false);
  }

  // Undo or reset during the celebration: the garden stops celebrating and play goes on from where it stood.
  function resumePlay(home) {
    for (const it of lanterns.items) if (it.mode === 'sky') { lanterns.setCell(it.id, it.cx, it.cy); lanterns.tween(it.id, 0.5); }
    endWin(); garden.wilt(); won = false; phase = 'play'; clock = 0; rig.extra.target = 1;
    queue.length = 0; cur = null; docking.clear(); winWait = 0;
    if (home && (moth.y > 0.02 || Math.hypot(moth.x - mx, moth.z - mz) > 0.02)) queue.push({ kind: 'home' });
    bus.emit('win:cancel', {});
  }

  // Per-frame staging that outlives a phase: lights on their way, the fading ring, the glory, the banner's room.
  function stageLight(dt) {
    fx.anchor(moth.x, moth.y, moth.z);
    if (phase !== 'teardown') runSeeds();
    if (phase !== 'win' || !W || W.st === 'breath') { const P = G.uPulse.value; P.w = Math.max(0, P.w - dt * 2); }
    // The moth's travelling glow: up while the old garden leaves, down again as the moth lands in the new one.
    const aura = calm ? 0 : phase === 'teardown' ? 1 : phase === 'build' ? 1 - clamp01((clock - phaseDur * 0.55) / (phaseDur * 0.6)) : 0;
    fx.aura = damp(fx.aura, aura, aura > fx.aura ? 0.12 : 0.1, dt);
    let want = 0;
    if (phase === 'win' && W && W.st !== 'breath') want = W.k < W.order.length ? 0.9 * W.k / W.order.length : clock - W.lastAt < 0.4 ? 1.35 : 0.85;
    glory = damp(glory, want, want > glory ? 0.12 : 0.3, dt);
    fx.glory = glory * (calm ? 0.6 : 1);
    if (glory > 0.01 && level) {
      const f = rig.fwd, R = Math.hypot(level.w, level.h) / 2, d = R + 6;
      fx.gloryAt(0, 0, Math.min(level.w, level.h) / 2 + 4.6, -f.x * d, 0.5 - f.y * d, -f.z * d, R * 1.5 + 4);
    }
    // The camera makes room for the win banner, so the text never sits on the garden.
    if (rig.bands && hud.winRoom) {
      const base = liftObj && rig.bands === liftObj ? baseInsets : rig.bands;
      const room = liftOn ? Math.max(0, Math.round(hud.winRoom() - base.b - CAM.marginFrac * Math.min(rig.vw, rig.vh) * 0.5)) : 0;
      if (room !== liftPx || (room && rig.bands !== liftObj)) applyLift(room);
    }
  }

  // ---------------------------------------------------------------- input -> rules -> action queue
  const canAct = () => (phase === 'play' && !won) || (phase === 'build' && clock > phaseDur - 0.4);

  // `walk` marks a step the game adds by itself (a walk that goes on under a held finger, a tap-walk): it never
  // pushes, never bumps, and can be taken back while it has not started (dropAuto). `grid` means the direction
  // is already a grid direction.
  function input(screenDir, { repeat = false, api = false, walk = false, grid = false } = {}) {
    gesture();
    if (!walk) cancelWalk();                                    // any move of the player's own ends a tap-walk
    if (phase === 'win') { if (!repeat && !walk) { proceed(); mash(); } return false; }
    if (phase === 'build') { if (!repeat && !walk) holdMove(screenDir); return false; }
    if (!canAct()) { if (phase === 'teardown' && !repeat && !walk) mash(); return false; }
    const sd = typeof screenDir === 'number' ? screenDir : DIRS.indexOf(screenDir);
    if (sd < 0) return false;
    if (!api && queue.length >= TIME.maxQueue) return false;
    const d = grid ? sd : mod(sd - rig.rot, 4);
    if (walk) { const tx = puzzle.player.x + DX[d], ty = puzzle.player.y + DY[d]; if (puzzle.isWall(tx, ty) || puzzle.boxAt[ty * level.w + tx] >= 0) return false; }
    if (rig.panned) rig.panHome();                              // the view comes back to the moth when it moves
    const before = puzzle.facing;
    const rec = puzzle.move(d);
    if (rec.type === 'bump') {
      // Walking into a wall with a held key should not hammer; only a fresh press bumps.
      if (repeat || queue.some((a) => a.kind === 'bump') || (cur && cur.kind === 'bump' && cur.p < 0.6)) { puzzle.facing = before; return false; }
      queue.push({ kind: 'bump', rec });
      return false;
    }
    queue.push({ kind: rec.type, rec, auto: walk });
    if (puzzle.solved) won = true;
    return true;
  }

  // ---- tap-to-walk: the shortest walk to a floor cell that pushes nothing. The steps are ordinary moves, fed
  // one at a time just ahead of the moth, so each can be undone by itself and the walk stops at once.
  let route = null;
  function walkTo(x, y) {
    gesture();
    if (phase !== 'play' || won || !puzzle) return -1;
    route = null; dropAuto();
    const path = findPath(puzzle, x, y);
    if (!path) return -1;
    route = path.length ? path : null;
    if (rig.panned) rig.panHome();
    return path.length;
  }
  // Takes back the automatic steps that have not started yet: the moth stops on the cell it is walking to.
  function dropAuto() {
    let k = 0;
    while (queue.length && queue[queue.length - 1].auto) { queue.pop(); puzzle.undo(); k++; }
    if (k) stats();
    return k;
  }
  function cancelWalk() { if (!route) return false; route = null; dropAuto(); return true; }
  function runRoute() {
    if (!route) return;
    if (phase !== 'play' || won) { route = null; return; }
    // A long walk keeps one more step in hand, which makes the moth hurry a little.
    const room = route.length > 5 ? 2 : 1, stepping = !cur || cur.kind === 'step' || cur.kind === 'push';
    while (route && route.length && stepping && queue.length < room && (queue.length > 0 || !cur || cur.p >= 0.58 || room > 1)) {
      if (!input(route[0], { walk: true, grid: true, api: true })) { route = null; break; }
      route.shift();
    }
    if (route && !route.length) route = null;
  }

  function undo({ repeat = false } = {}) {
    gesture(); cancelWalk();
    if (rig.panned) rig.panHome();
    if (phase === 'win') { if (repeat) return false; resumePlay(true); }      // takes the winning move back
    if (!canAct()) return false;
    const rec = puzzle.undo();
    if (!rec) { if (!repeat) { bus.emit('undo:empty', {}); moth.bump(0, 0); hud.nudge('undo'); } return false; }
    queue.push({ kind: rec.type, rec });
    return true;
  }

  function reset() {
    gesture(); cancelWalk();
    if (rig.panned) rig.panHome();
    if (phase === 'win') resumePlay(false);
    if (!canAct()) return false;
    const rec = puzzle.reset();
    if (!rec) return false;
    queue.push({ kind: 'reset', rec });
    return true;
  }

  function debugWin() {
    if (phase === 'build') skipBuild();
    if (phase !== 'play' || won) return false;
    queue.length = 0; puzzle.forceSolve(); won = true;
    queue.push({ kind: 'solve' });
    return true;
  }

  // ---------------------------------------------------------------- action playback
  function begin(a) {
    cur = a; a.p = 0; a.t = 0;
    const r = a.rec;
    if (a.kind === 'step' || a.kind === 'push') {
      const d = r.dir; a.dx = DX[d]; a.dz = DY[d];
      a.fx = garden.wx(r.from.x); a.fz = garden.wz(r.from.y);
      // From rest the moth turns first and gathers itself: the bigger the turn, the softer the first frames.
      a.turn = chained ? 0 : turnOf(yawOf(d));
      moth.face(yawOf(d));
      if (!chained) vel = (a.kind === 'push' ? TIME.pushSpeed : TIME.stepSpeed) * (0.3 - 0.18 * a.turn);
      a.p = chained ? carry : 0;
      // A push sounds when the moth leans in; a step sounds when the first foot of that step comes down (moth.onPlant).
      a.msg = { dir: DIRS[d], x: r.to.x, y: r.to.y }; a.said = a.kind === 'push';
      if (a.said) bus.emit('move:push', a.msg);
      if (a.kind === 'push') {
        lanterns.setCell(r.box, r.boxTo.x, r.boxTo.y);
        if (!a.chainedPush) moth.pushStart();
        if (r.wasOn) undock(r.box);
      }
      stats();
    } else if (a.kind === 'bump') {
      const d = r.dir; moth.face(yawOf(d)); a.dur = TIME.bump; a.hit = false; a.dx = DX[d]; a.dz = DY[d];
      moth.bump(DX[d], DY[d], r.kind);
      bus.emit('move:bump', { dir: DIRS[d], kind: r.kind });
    } else if (a.kind === 'undo') {
      a.dur = TIME.undoStep / (1 + 0.6 * queue.length);
      a.fx = garden.wx(r.from.x); a.fz = garden.wz(r.from.y); a.tx = garden.wx(r.to.x); a.tz = garden.wz(r.to.y);
      // Undo walks backwards with the same speed model as a step, so a run of undos (held Z) flows.
      if (!chained) vel = (1.3 / TIME.undoStep) * 0.5;
      a.p = chained ? carry : 0;
      moth.face(yawOf(r.dir));
      if (r.wasPush) {
        lanterns.setCell(r.box, r.boxTo.x, r.boxTo.y);
        if (r.wasOn && !r.nowOn) undock(r.box, true);
      }
      bus.emit('undo', { wasPush: r.wasPush, goalsDone: r.goalsDone, goalsTotal: total() });
      stats();
    } else if (a.kind === 'home') {
      // Back to its cell from wherever the celebration left it.
      a.dur = 0.34; a.fx = moth.x; a.fz = moth.z; a.fy = moth.y; a.tx = mx; a.tz = mz; a.far = true; a.arc = 0;
      if (Math.hypot(a.tx - a.fx, a.tz - a.fz) > 0.05) moth.face(Math.atan2(a.tx - a.fx, a.tz - a.fz));
    } else if (a.kind === 'reset' || a.kind === 'unreset' || a.kind === 'solve') {
      a.dur = a.kind === 'reset' ? TIME.reset : 0.46;
      a.fx = moth.x; a.fz = moth.z; a.fy = moth.y; a.tx = garden.wx(puzzle.player.x); a.tz = garden.wz(puzzle.player.y);
      a.far = Math.hypot(a.tx - a.fx, a.tz - a.fz) > 0.01 || a.fy > 0.01;
      let k = 0;
      for (const b of puzzle.boxes) {
        const it = lanterns.items[b.id];
        if (it.cx === b.x && it.cy === b.y) continue;
        lanterns.setCell(b.id, b.x, b.y); lanterns.tween(b.id, a.dur - 0.1, 0.55, Math.min(0.1, k++ * 0.025));
        if (!puzzle.isGoal(b.x, b.y) && lanterns.isLit(b.id)) { if (a.kind === 'solve') lanterns.setLit(b.id, false); else undock(b.id, true); }
      }
      if (a.far) { moth.airTarget = 1; moth.face(Math.atan2(a.tx - a.fx, a.tz - a.fz)); }
      if (a.kind === 'reset') bus.emit('reset', { goalsDone: r.goalsDone, goalsTotal: total() });
      if (a.kind === 'unreset') bus.emit('undo', { wasPush: true, goalsDone: r.goalsDone, goalsTotal: total() });
      stats();
    }
  }

  function finish(a) {
    const r = a.rec;
    cur = null; chained = false; carry = 0;
    if (a.kind === 'step' || a.kind === 'push') {
      mx = garden.wx(r.to.x); mz = garden.wz(r.to.y);
      if (!a.said) { a.said = true; bus.emit('move:step', a.msg); }
      const next = queue[0];
      chained = !!next && (next.kind === 'step' || next.kind === 'push');
      carry = chained ? Math.max(0, a.p - 1) : 0;
      if (chained && next.kind === 'push' && a.kind === 'push' && next.rec.box === r.box) next.chainedPush = true;
      if (!chained) { moth.x = mx; moth.z = mz; vel = 0; }
      garden.press(r.to.x, r.to.y, a.kind === 'push' ? 0.6 : 0.9);
      if (a.kind === 'push') {
        lastBox = r.boxTo;
        if (r.nowOn) { docking.add(r.box); lanterns.setLit(r.box, true); }
      }
    } else if (a.kind === 'undo') {
      mx = a.tx; mz = a.tz; moth.face(yawOf(r.facing));
      const next = queue[0];
      chained = !!next && next.kind === 'undo'; carry = chained ? Math.max(0, a.p - 1) : 0;
      if (!chained) { moth.x = mx; moth.z = mz; vel = 0; }
      if (r.wasPush && r.nowOn && !r.wasOn) { lanterns.setLit(r.box, true, false); vDone++; bus.emit('box:dock', { goalsDone: vDone, goalsTotal: total(), undo: true }); stats(); }
    } else if (a.kind === 'home') {
      moth.x = mx; moth.z = mz; moth.y = 0; moth.airTarget = 0; moth.land();
    } else if (a.kind === 'reset' || a.kind === 'unreset' || a.kind === 'solve') {
      mx = a.tx; mz = a.tz; moth.x = mx; moth.z = mz; moth.y = 0;
      if (a.far) { moth.airTarget = 0; moth.land(); }
      moth.face(yawOf(puzzle.facing));
      const before = vDone;
      for (const b of puzzle.boxes) if (puzzle.isGoal(b.x, b.y) && !lanterns.isLit(b.id)) {
        lanterns.setLit(b.id, true, false);
        if (a.kind !== 'solve') { vDone++; bus.emit('box:dock', { goalsDone: vDone, goalsTotal: total(), undo: true }); }
      }
      vDone = litCount(); stats();
      if (a.kind === 'solve') {
        // The test solve has no last push: the lantern nearest to the moth plays that part.
        let best = null, bd = 1e9;
        for (const b of puzzle.boxes) { const d = Math.hypot(b.x - puzzle.player.x, b.y - puzzle.player.y); if (d < bd) { bd = d; best = b; } }
        if (best) { lastBox = { x: best.x, y: best.y }; lanterns.kindle(best.id); fx.sparks(garden.wx(best.x), 0.36, garden.wz(best.y), 10); }
        if (vDone !== before) bus.emit('box:dock', { goalsDone: vDone, goalsTotal: total() });
      }
    }
    // The celebration waits the instant it takes the last lantern to catch light.
    if (won && queue.length === 0 && phase === 'play') { if (docking.size) winWait = 0.6; else startWin(a.kind !== 'solve'); }
  }

  function updateActions(dt) {
    // The frame's time is spent once: an action that ends inside the frame hands the rest to the next one
    // (`carry`), so the moth crosses a tile edge at the same speed it had before it.
    let guard = 0, spent = false;
    while (guard++ < 4) {
      if (!cur) { if (!queue.length) break; begin(queue.shift()); }
      const a = cur;
      if (a.kind === 'step' || a.kind === 'push') {
        const push = a.kind === 'push', back = queue.length;
        const V = (push ? TIME.pushSpeed : TIME.stepSpeed) * Math.min(3, 1 + 0.55 * Math.max(0, back - 1));
        const next = queue[0], chainOut = !!next && (next.kind === 'step' || next.kind === 'push');
        const tv = (chainOut ? V : V * clamp((1 - a.p) / 0.36, 0.2, 1)) * (1 - 0.55 * a.turn * Math.exp(-a.t / 0.04));
        if (!spent) { spent = true; a.t += dt; vel = damp(vel, tv, 0.032, dt); a.p += vel * dt; }
        const p = Math.min(1, a.p);
        moth.x = a.fx + a.dx * p; moth.z = a.fz + a.dz * p;
        moth.speed = vel; moth.pushing = push ? 1 : 0;
        if (push) lanterns.contact(a.rec.box, moth.x + a.dx * (1 - SQUISH), moth.z + a.dz * (1 - SQUISH), a.dx, a.dz);
        if (a.p >= 1) { finish(a); if (chained) continue; }
        break;
      }
      if (a.kind === 'undo') {
        // Backwards at a steady speed that rises with the backlog; only the last undo of a run eases to a stop.
        const nx = queue[0], out = !!nx && nx.kind === 'undo', V = (1.3 / TIME.undoStep) * Math.min(3.4, 1 + 0.6 * queue.length);
        const tv = out ? V : V * clamp((1 - a.p) / 0.4, 0.22, 1);
        if (!spent) { spent = true; a.t += dt; vel = damp(vel, tv, 0.028, dt); a.p += vel * dt; }
        const p = Math.min(1, a.p);
        moth.x = lerp(a.fx, a.tx, p); moth.z = lerp(a.fz, a.tz, p); moth.speed = -vel;
        if (a.rec.wasPush) lanterns.drag(a.rec.box, moth.x + DX[a.rec.dir], moth.z + DY[a.rec.dir]);
        if (a.p >= 1) { finish(a); if (chained) continue; }
        break;
      }
      if (!spent) { spent = true; a.t += dt; }
      a.p = clamp01(a.t / a.dur);
      if (a.kind === 'bump') {
        // The moth lunges and hits at TIME.bumpHit: that is when the wall or the lantern answers.
        if (!a.hit && a.t >= TIME.bumpHit) {
          a.hit = true; rig.kick(a.dx, a.dz, 0.7);
          const box = a.rec.kind === 'box', reach = box ? 0.7 : 0.43;
          if (box) lanterns.bump(a.rec.box, a.dx, a.dz, 1.6);
          else { garden.knock?.(puzzle.player.x + a.dx, puzzle.player.y + a.dz, a.dx, a.dz); fx.leaves?.(moth.x + a.dx * 0.56, 0.3, moth.z + a.dz * 0.56, 5, -a.dx, -a.dz); }
          fx.puff(moth.x + a.dx * reach, 0.08, moth.z + a.dz * reach, box ? 6 : 7, -a.dx * 0.8, -a.dz * 0.8);
        }
        if (a.p >= 1 || (a.p > 0.55 && queue.length)) finish(a);
      } else {
        const e = ease.inOutCubic(a.p);
        moth.x = lerp(a.fx, a.tx, e); moth.z = lerp(a.fz, a.tz, e);
        if (a.far) moth.y = (a.fy || 0) * (1 - e) + Math.sin(Math.PI * a.p) * (a.arc ?? 0.75);
        if (a.p >= 1) finish(a);
      }
      break;
    }
    if (!cur) { moth.speed = 0; moth.pushing = 0; }
    if (winWait > 0 && !cur && !queue.length) { winWait -= dt; if (!docking.size || winWait <= 0) { winWait = 0; docking.clear(); if (won && phase === 'play') startWin(true); } }
  }

  // ---------------------------------------------------------------- camera controls
  function rotate(dir) {
    gesture(); rig.rotate(dir); garden.setView(rig.targetYaw, VIEW[rig.mode].elev * RAD);
    store.setTurn(phase === 'teardown' ? pending : n, rig.rot);       // the player's own turn outlives a reload
    bus.emit('cam:rotate', { dir });
  }
  // The rig re-orients a level the player has not turned when the screen changes shape (phone turned over).
  rig.onTurn = () => garden.setView(rig.targetYaw, VIEW[rig.mode].elev * RAD);
  function setView(mode, instant = false) {
    if (!VIEW[mode]) return;
    rig.setMode(mode, instant); garden.setView(rig.targetYaw, VIEW[mode].elev * RAD, instant);
    store.setSetting('view', mode);
    if (!instant) { bus.emit('cam:view', { mode }); hud.toast(VIEW.names[mode]); }
  }
  function cycleView() { gesture(); const i = VIEW.order.indexOf(rig.mode); setView(VIEW.order[(i + 1) % VIEW.order.length]); }
  function setZoom(z, { quiet = false, fast = false } = {}) {
    const before = rig.zoom.target; rig.setZoom(z, false, fast ? CAM.pinchTime : CAM.zoomTime);
    if (rig.zoom.target === before) { if (!quiet) hud.nudge(z > before ? 'zoomIn' : 'zoomOut'); return; }
    bus.emit('cam:zoom', { zoom: rig.zoom.target }); if (!quiet) hud.toast(Math.round(rig.zoom.target * 100) + '%');
  }
  function zoomBy(steps) { gesture(); setZoom(Math.round((rig.zoom.target + steps * rig.zoomStep) * 20) / 20); }

  // ---------------------------------------------------------------- frame
  function update(dt) {
    clock += dt;
    if (phase === 'build') updateBuild(dt);
    else if (phase === 'teardown') updateTeardown(dt);
    else if (phase === 'win') updateWin(dt);
    if (phase === 'play') { runRoute(); updateActions(dt); followX = moth.x; followZ = moth.z; }
    else if (phase === 'build') { followX = mx; followZ = mz; }
    sense();
    stageLight(dt);
  }

  return {
    update, loadLevel, input, undo, reset, debugWin, rotate, setView, cycleView, setZoom, zoomBy, gesture,
    // Touch and mouse: walk to a cell (returns the number of steps, -1 when it cannot be reached), stop a walk,
    // and take back the automatic steps that have not started (a finger lifted during a held walk).
    walkTo, cancelWalk, dropAuto,
    get walking() { return !!route; },
    // Next and previous wrap around: after the last garden comes the first, before the first the last.
    next() { gesture(); const k = phase === 'teardown' ? pending : n; loadLevel(k >= LEVELS.length ? 1 : k + 1); },
    prev() { gesture(); const k = phase === 'teardown' ? pending : n; loadLevel(k <= 1 ? LEVELS.length : k - 1); },
    get followX() { return followX; }, get followZ() { return followZ; },
    get phase() { return phase; }, get n() { return n; }, get level() { return level; }, get puzzle() { return puzzle; },
    get queueLength() { return queue.length + (cur ? 1 : 0); },
    get idle() { return phase === 'play' && !cur && !queue.length; },
    // True when a held key may add its next step: nothing waiting, and the current step is nearly done.
    get repeatReady() { return phase === 'play' && !won && queue.length === 0 && (!cur || ((cur.kind === 'step' || cur.kind === 'push') && cur.p >= 0.58)); },
    // Enter, space or a tap: skips ahead in the celebration.
    confirm() { gesture(); proceed(); },
    // The moth's heading target near a lit lantern, for idle gazing.
    nearLit() {
      let best = null, bd = 3.2;
      for (const it of lanterns.items) { if (!it.litTarget) continue; const d = Math.hypot(it.x - moth.x, it.z - moth.z); if (d < bd) { bd = d; best = it; } }
      return best;
    },
    screenDirOf(gridDir) { const g = typeof gridDir === 'number' ? gridDir : DIRS.indexOf(gridDir); return g < 0 ? null : DIRS[mod(g + rig.rot, 4)]; },
    state() {
      return {
        level: n, w: level ? level.w : 0, h: level ? level.h : 0, moves: puzzle ? puzzle.moves : 0, pushes: puzzle ? puzzle.pushes : 0,
        solved: puzzle ? puzzle.solved : false, view: rig.mode, rot: rig.rot, zoom: Math.round(rig.zoom.target * 100) / 100,
        zoomNow: Math.round(rig.zoom.v * 1000) / 1000, zoomMax: rig.zoomMax, cellPx: Math.round(rig.pxPerUnit * 10) / 10, walking: !!route,
        busy: !canAct(), panel: hud.panel(), player: puzzle ? { x: puzzle.player.x, y: puzzle.player.y } : null,
        boxes: puzzle ? puzzle.boxes.map((b) => ({ x: b.x, y: b.y, onGoal: puzzle.isGoal(b.x, b.y) })) : [], undoDepth: puzzle ? puzzle.history.length : 0,
        phase, goalsDone: vDone, goalsTotal: total(),
      };
    },
  };
}
