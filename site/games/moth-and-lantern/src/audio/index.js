// Moth & Lantern audio engine: music, ambience and sound effects, all synthesised with the Web Audio API.
//
//   import { initAudio } from './audio/index.js';
//   const audio = initAudio(bus, options);      // call once; the engine listens to the bus from then on
//   audio.setMusic(on); audio.setSfx(on); audio.setAmbience(on); audio.getEnergy();   // getEnergy(): music level, 0..1
//
// options:
//   context    an AudioContext or OfflineAudioContext to use (otherwise one is created on the first user gesture)
//   music, sfx initial switches (default true)
//   ambience   true / false: its own switch. Left out: the night garden follows the music switch (it is part of
//              the score; the sfx switch only covers the feedback sounds).
//   level, goalsDone, goalsTotal   what the game shows right now, if the engine is created after the first
//              `level:build` (events sent before initAudio() are lost)
//   mute       true: create no sound at all (also when the page URL has ?mute=1)
//   seed       number; fixes the random choices (offline renders use it to be reproducible)
//
// What the engine reads from the bus is listed in gauntlet/BRIEF.md ("Event contract"). In short: the level number
// from `level:build` / `level:ready`, the lit lanterns from every event that carries goalsDone / goalsTotal (it never
// assumes zero), `duration` of build, tear-down and win, `x`, `y`, `dir` of moves (stereo placement) and `kind`.
//
// Extra members, used by the lab and the offline renderer: at(t, fn), now(), context, output, info, renderOffline().
import { createClock, OFFLINE_STEP_FRAMES } from './clock.js';
import { createAssets } from './assets.js';
import { createMix } from './mix.js';
import { createSynth } from './synth.js';
import { createMusic, songNeeds, winShape } from './music.js';
import { createSfx } from './sfx.js';
import { createAmbience } from './ambience.js';
import { clamp, mod, makeRng } from './util.js';

// The event contract (gauntlet/BRIEF.md).
const EVENTS = [
  'gesture', 'level:build', 'level:ready', 'level:teardown', 'move:step', 'move:push', 'move:bump', 'box:dock', 'box:undock',
  'undo', 'undo:empty', 'reset', 'win', 'win:lantern', 'win:cancel', 'cam:rotate', 'cam:view', 'cam:zoom', 'ui:open', 'ui:close', 'ui:hover', 'ui:select',
  'idle', 'settings',
];
// DOM events that count as a user activation. iOS Safari only lets a context start inside one of them, and a touch
// `pointerdown` (where the game emits `gesture`) is not one, so the engine also listens itself.
const ACTIVATIONS = ['pointerup', 'touchend', 'click', 'keydown', 'mousedown'];
const fin = Number.isFinite;

export function initAudio(bus, options = {}) {
  const urlMute = typeof location !== 'undefined' && /[?&]mute=1(&|$)/.test(location.search || '');
  const muted = !!options.mute || urlMute;
  const want = { music: options.music !== false, sfx: options.sfx !== false, ambience: typeof options.ambience === 'boolean' ? options.ambience : null };
  const ambOn = () => (want.ambience == null ? want.music : want.ambience);
  // What the game told us so far. Kept even while the context is not running yet.
  const game = {
    level: clamp(options.level | 0 || 1, 1, 400), known: fin(options.level), goalsDone: options.goalsDone | 0, goalsTotal: options.goalsTotal | 0,
    panel: false, zoom: 1, won: false, phase: 'play', w: 0, h: 0, rot: 0, undoT: -9, pushT: -8,
  };
  let E = null;            // the engine, once a context exists
  let gestured = false;
  let energy = 0, energyAt = 0;
  let prepared = null;     // noise, reverb and instrument data, computed in the background before the first gesture
  let held = null;         // the dock of the last lantern, waiting a moment for its `win`

  function boot(ctx) {
    const offline = typeof ctx.startRendering === 'function';
    const seed = options.seed ?? (offline ? 20260711 : (Date.now() & 0x7fffffff));
    const clock = createClock(ctx, offline);
    const rng = makeRng(seed);
    const assets = prepared || createAssets(seed);
    const mix = createMix(ctx, assets, offline);
    const S = createSynth(ctx, rng, assets);
    const music = createMusic(ctx, clock, mix, S);
    const sfx = createSfx(ctx, clock, mix, S, music);
    const ambience = createAmbience(ctx, clock, mix, S, music, seed + 7);
    E = { ctx, offline, clock, mix, S, music, sfx, ambience, started: false, buf: new Float32Array(mix.analyser.fftSize) };
    if (Array.isArray(options.debugMute)) for (const r of options.debugMute) music.muted.add(r);
    mix.music.set(want.music, 0); music.setEnabled(want.music, 0);
    mix.sfx.set(want.sfx, 0); mix.amb.set(ambOn(), 0); ambience.setEnabled(ambOn());
    if (offline) {
      // The offline context stops every STEP frames so the scheduler can run, exactly like the live timer.
      const steps = Math.floor(ctx.length / OFFLINE_STEP_FRAMES);
      for (let k = 1; k < steps; k++) {
        ctx.suspend(k * OFFLINE_STEP_FRAMES / ctx.sampleRate).then(() => { clock.tick(); ctx.resume(); });
      }
    } else {
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', power);
      // The browser may stop the context on its own (screen lock, phone call, another app taking the audio
      // session). When it runs again the timer is restarted; while it is stopped the next gesture resumes it.
      ctx.addEventListener?.('statechange', () => {
        if (ctx.state === 'closed') { E.dead = true; E.clock.stop(); }       // somebody closed the context: stay silent
        else if (ctx.state === 'running' && awake()) E.clock.start();
      });
    }
    return E;
  }

  // The context runs only when it is useful: after a gesture, tab visible, something switched on.
  const awake = () => gestured && !(typeof document !== 'undefined' && document.hidden) && (want.music || want.sfx || ambOn());
  let wasAwake = false;
  function power() {
    if (!E || E.offline || E.dead) return;
    if (awake()) {
      if (E.ctx.state !== 'running') { try { const p = E.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* not allowed yet */ } }
      E.clock.start();
      if (!wasAwake && E.started) resync();
      wasAwake = true;
    } else {
      wasAwake = false;
      E.clock.stop();
      if (E.ctx.state === 'running') E.ctx.suspend().catch(() => {});
    }
  }

  // Events are dropped while the engine sleeps (hidden tab, everything switched off). When it wakes up,
  // the music catches up with what the game did in the meantime.
  function resync() {
    const t = E.clock.now();
    const m = E.music;
    if (game.won) { if (m.mode !== 'coda') { if (m.mode === 'rest' || m.song.n !== game.level) m.start(game.level, t); m.win(t + 0.02, winShape(2)); } }
    else if (m.mode !== 'play' || m.song.n !== game.level) m.start(game.level, t);
    m.setProgress(game.goalsDone, game.goalsTotal, t);
    m.setPanel(game.panel, t);
    E.sfx.setZoom(game.zoom);
    held = null;
  }

  // The game creates the engine after its first level is on screen, so the first `level:build` may be missed.
  // Then the level comes from `level:ready`, from the options, or (last resort) from the game's state hook.
  function probe() {
    if (game.known) return;
    try {
      const s = globalThis.__game && globalThis.__game.state && globalThis.__game.state();
      if (s && fin(s.level)) {
        game.level = s.level; game.known = true; game.won = s.phase === 'win';
        if (fin(s.goalsTotal)) game.goalsTotal = s.goalsTotal | 0;
        if (fin(s.goalsDone)) game.goalsDone = s.goalsDone | 0;
        if (fin(s.w)) { game.w = s.w; game.h = s.h; }
        if (fin(s.rot)) game.rot = mod(s.rot, 4);
      }
    } catch (err) { /* no hook */ }
  }
  const prewarm = () => { const a = E ? null : prepared; if (a) for (const [inst, lo, hi] of songNeeds(game.level)) a.want(inst, lo, hi); };

  function begin() {
    if (!E || E.started) return;
    E.started = true;
    probe();
    const t = E.clock.now();
    E.ambience.start(t);
    E.music.start(game.level, t + 0.05);
    E.music.setProgress(game.goalsDone, game.goalsTotal, t);
    if (game.won) E.music.win(t + 0.06, winShape(2));
    E.music.setPanel(game.panel, t);
    E.sfx.setZoom(game.zoom);
  }

  function onGesture() {
    gestured = true;
    if (!E) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return;
      try { boot(new AC({ latencyHint: 'interactive' })); } catch (err) { console.warn('audio unavailable', err); return; }
    }
    power();
    begin();
  }
  // Runs inside every user activation: creates the context on the first one (if the game's `gesture` did not
  // come through), and resumes a context that the browser has stopped.
  function activation(e) {
    if (e && e.type === 'keydown' && (e.ctrlKey || e.metaKey || e.altKey || ['Control', 'Shift', 'Alt', 'Meta', 'Tab'].includes(e.key))) return;
    if (!E || !gestured) { onGesture(); if (!E) return; }
    if (E.offline || E.dead) return;
    if (!E.unlocked && E.ctx.state === 'running') {
      // a silent sample inside the gesture: old iOS versions need it before they route any sound
      E.unlocked = true;
      try { const s = E.ctx.createBufferSource(); s.buffer = E.ctx.createBuffer(1, 1, 22050); s.connect(E.ctx.destination); s.start(0); } catch (err) { /* fine */ }
    }
    if (E.ctx.state !== 'running' && awake()) power();
  }

  const live = () => E && E.started && !E.dead && (E.offline || awake());

  // Stereo placement: where the moth is across the screen, -1 .. 1, from its cell, the level size and the
  // quarter turns of the view. Kept small in the mix (sfx.setPan scales it).
  const GRID = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  let lastPlace = 0;
  function place(type, d) {
    if (fin(d.pan)) return (lastPlace = clamp(d.pan, -1, 1));
    if (type === 'move:bump' && GRID[d.dir]) {
      // no cell given: the bump sounds a little to the side the moth ran into
      const [gx, gy] = GRID[d.dir];
      return clamp(lastPlace + 0.45 * [gx, -gy, -gx, gy][game.rot], -1, 1);
    }
    if (!fin(d.x) || game.w < 2 || game.h < 2) return null;
    const u = clamp(d.x / (game.w - 1), 0, 1) * 2 - 1, v = fin(d.y) ? clamp(d.y / (game.h - 1), 0, 1) * 2 - 1 : 0;
    return (lastPlace = [u, -v, -u, v][game.rot]);
  }

  // Game state is tracked even while there is no sound. Returns false when the event needs no sound.
  function track(type, d) {
    // Lit lanterns: from every event that carries the counts. Lanterns that start on a plinth are lit one by one
    // while the garden builds (`box:dock` with `initial`); `level:build` already carries their number, so those
    // events do not count again.
    if (fin(d.goalsTotal)) game.goalsTotal = Math.max(0, d.goalsTotal | 0);
    if (fin(d.goalsDone) && !d.initial) game.goalsDone = Math.max(0, d.goalsDone | 0);
    switch (type) {
      case 'level:build':
        if (fin(d.n)) { game.level = d.n; game.known = true; }
        game.won = false; game.phase = 'build';
        if (!fin(d.goalsTotal) && fin(d.boxes)) game.goalsTotal = d.boxes | 0;      // one plinth per lantern
        game.goalsDone = Math.min(game.goalsDone, game.goalsTotal);                // no count given: keep the last known one
        if (fin(d.w)) { game.w = d.w; game.h = fin(d.h) ? d.h : d.w; }
        if (fin(d.rot)) game.rot = mod(d.rot, 4);
        prewarm();
        break;
      case 'level:ready': if (fin(d.n) && d.n !== game.level) { game.level = d.n; prewarm(); } game.known = true; game.phase = 'play'; break;
      case 'level:teardown': game.phase = 'teardown'; break;
      case 'reset': case 'win:cancel': game.won = false; break;
      case 'win': game.won = true; if (game.goalsTotal) game.goalsDone = game.goalsTotal; break;
      case 'ui:open': game.panel = true; break;
      case 'ui:close': game.panel = false; break;
      case 'cam:zoom': game.zoom = d.zoom ?? game.zoom; break;
      case 'cam:rotate': game.rot = mod(game.rot + (d.dir < 0 ? -1 : 1), 4); break;
      case 'settings':
        if ('music' in d) api.setMusic(d.music);
        if ('sfx' in d) api.setSfx(d.sfx);
        if ('ambience' in d) api.setAmbience(d.ambience);
        return false;
      case 'gesture': onGesture(); return false;
      default:
    }
    return true;
  }

  // The dock of the last lantern is held for a moment: if `win` follows, both become one gesture.
  function flushHeld(t) {
    if (!held) return;
    const h = held; held = null;
    E.music.setProgress(h.d.goalsDone, h.d.goalsTotal, t);
    if (want.sfx && running()) E.sfx.dock(t, h.d, { kind: 'normal' });
  }
  const running = () => E.offline || E.ctx.state === 'running';

  function handle(type, d) {
    d = d || {};
    if (!track(type, d)) return;
    if (!live()) return;
    // Game events come from user input, so this is also a moment to wake a context that the browser put to sleep.
    if (!E.offline && E.ctx.state !== 'running') power();
    const { music, clock, sfx } = E;
    const t = clock.now();
    const sound = want.sfx && running();       // one-shot effects are skipped while the context cannot play them
    const p = place(type, d);
    if (p != null) sfx.setPan(p);
    switch (type) {       // the music first, so that pitched effects use the key and chord of this instant
      case 'level:build':
        held = null;
        music.build(game.level, t, d.duration ?? 1.75);
        music.setProgress(game.goalsDone, game.goalsTotal, t);
        lastPlace = 0; sfx.setPan(0);
        if (sound) sfx.build(t, d);
        break;
      case 'level:ready':
        if (music.song.n !== game.level) music.build(game.level, t, 1);         // the build was missed
        music.setProgress(game.goalsDone, game.goalsTotal, t);
        if (sound) sfx.ready(t, d);
        break;
      case 'level:teardown': if (held) flushHeld(t); music.teardown(t, d.duration ?? 1); if (sound) sfx.teardown(t, d); break;
      case 'move:step': if (sound) sfx.step(t, d); break;
      case 'move:push': game.pushT = t; if (sound) sfx.push(t, d); break;
      case 'move:bump': if (sound) sfx.bump(t, d); sfx.setPan(lastPlace); break;
      case 'box:dock': {
        const byUndo = d.undo === true || d.byUndo === true || (game.undoT > game.pushT && t - game.undoT < 1.2);
        const kind = d.initial === true || game.phase === 'build' ? 'ignite' : byUndo ? 'undo' : 'normal';
        if (kind === 'normal' && game.goalsTotal > 0 && game.goalsDone >= game.goalsTotal) {
          if (held) flushHeld(t);
          held = { t, d: { goalsDone: game.goalsDone, goalsTotal: game.goalsTotal } };
          clock.at(t + 0.1, (tt) => { if (held && held.t === t) flushHeld(tt); });
          break;
        }
        music.setProgress(game.goalsDone, game.goalsTotal, t);
        if (sound) sfx.dock(t, { goalsDone: game.goalsDone, goalsTotal: game.goalsTotal }, { kind });
        break;
      }
      case 'box:undock':
        if (held) flushHeld(t);
        music.setProgress(game.goalsDone, game.goalsTotal, t);
        if (sound) sfx.undock(t, { goalsDone: game.goalsDone, goalsTotal: game.goalsTotal }, { undo: d.undo === true });
        break;
      case 'undo': game.undoT = t; music.setProgress(game.goalsDone, game.goalsTotal, t); if (sound) sfx.undo(t, d); break;
      case 'undo:empty': if (sound) sfx.undoEmpty(t); break;
      case 'reset': game.undoT = t; music.reset(t); music.setProgress(game.goalsDone, game.goalsTotal, t); if (sound) sfx.reset(t, d); break;
      case 'win': {
        const shape = winShape(d.duration);
        const withDock = !!held || t - sfx.lastDock < 0.14;       // the last lantern lit in this instant
        const fresh = !!held;
        held = null;
        music.win(t, shape);
        if (sound) sfx.win(t, d, { shape, withDock, playDock: fresh, lanterns: game.goalsTotal });
        break;
      }
      case 'win:lantern': if (sound) sfx.winLantern(t, d); break;
      case 'win:cancel': music.resume(t); music.setProgress(game.goalsDone, game.goalsTotal, t); sfx.winCancel(t); break;
      case 'cam:rotate': if (sound) sfx.rotate(t, d); break;
      case 'cam:view': if (sound) sfx.view(t, d); break;
      case 'cam:zoom': if (sound) sfx.zoom(t, d); break;
      case 'ui:open': music.setPanel(true, t); if (sound) sfx.uiOpen(t, d); break;
      case 'ui:close': music.setPanel(false, t); if (sound) sfx.uiClose(t, d); break;
      case 'ui:hover': if (sound) sfx.uiHover(t); break;
      case 'ui:select': if (sound) sfx.uiSelect(t); break;
      case 'idle': if (sound) sfx.idle(t, d); break;
      default:
    }
  }

  const api = {
    setMusic(on) {
      want.music = !!on;
      if (E) { const t = E.clock.now(); E.mix.music.set(want.music, t); E.music.setEnabled(want.music, t); E.mix.amb.set(ambOn(), t); E.ambience.setEnabled(ambOn()); power(); }
    },
    setSfx(on) {
      want.sfx = !!on;
      if (E) { E.mix.sfx.set(want.sfx, E.clock.now()); power(); }
    },
    // The night garden. true / false: its own switch from now on; null: follow the music switch again.
    setAmbience(on) {
      want.ambience = on == null ? null : !!on;
      if (E) { E.mix.amb.set(ambOn(), E.clock.now()); E.ambience.setEnabled(ambOn()); power(); }
    },
    // Smoothed loudness of the music bus, 0..1, for visuals. Cheap enough to call every frame.
    getEnergy() {
      if (!E || !E.started || E.offline) return 0;
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const dt = clamp((nowMs - energyAt) / 1000, 0, 2);
      energyAt = nowMs;
      let target = 0;
      if (want.music && E.ctx.state === 'running') {
        E.mix.analyser.getFloatTimeDomainData(E.buf);
        let s = 0;
        for (let i = 0; i < E.buf.length; i++) s += E.buf[i] * E.buf[i];
        target = clamp(Math.pow(Math.sqrt(s / E.buf.length) / 0.085, 0.8), 0, 1);
      }
      const tau = target > energy ? 0.07 : 0.6;
      energy += (target - energy) * (1 - Math.exp(-dt / tau));
      return energy;
    },
    // ---- lab and offline renderer ----
    at(t, fn) { if (E) E.clock.at(t, fn); },
    now() { return E ? E.clock.now() : 0; },
    get context() { return E ? E.ctx : null; },
    get output() { return E ? E.mix.out : null; },
    get info() {
      if (!E) return null;
      const s = E.music.song;
      const c = E.clock.stats;
      return {
        level: s.n, place: s.placeName, mode: s.mode, pc: s.pc, bpm: s.bpm, meter: s.meter.name, lead: s.ens.lead, state: E.music.mode,
        section: E.music.section, lit: E.music.lit, goalsDone: game.goalsDone, goalsTotal: game.goalsTotal,
        tickAvgMs: c.ticks ? c.sumMs / c.ticks : 0, tickMaxMs: c.maxMs, ticks: c.ticks,
      };
    },
    renderOffline() {
      if (!E || !E.offline) throw new Error('renderOffline needs an OfflineAudioContext');
      E.clock.tick();
      return E.ctx.startRendering();
    },
  };

  if (muted) return { setMusic() {}, setSfx() {}, setAmbience() {}, getEnergy: () => 0, at() {}, now: () => 0, context: null, output: null, info: null };

  for (const type of EVENTS) bus.on(type, (data) => handle(type, data));
  if (options.context) {
    boot(options.context);
    if (E.offline) { gestured = true; }
  } else {
    prepared = createAssets(options.seed ?? (Date.now() & 0x7fffffff));
    prepared.warm();
    probe();
    prewarm();
  }
  if (!(options.context && E.offline) && typeof window !== 'undefined' && window.addEventListener) {
    for (const name of ACTIVATIONS) window.addEventListener(name, activation, { capture: true, passive: true });
  }
  return api;
}
