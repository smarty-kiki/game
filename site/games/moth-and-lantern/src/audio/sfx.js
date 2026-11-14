// Sound effects for every game event. All pitched effects ask the music for notes of the key and chord at
// their own start time, so they always sit inside the harmony. Materials: paper (the lanterns), glass (their
// light), wood and stone (the garden), felt and air (the moth).
//
// Rate awareness: walking, pushing and undoing are single sounds at walking pace. When the events come faster
// than about six per second (a held key, a held undo, a fast swipe) they turn into one continuous texture that
// is held while the events keep coming and lets go by itself when they stop.
import { clamp, mtof, makeRng } from './util.js';

const PAPER_LP = 7500;
const PAN = 0.3;                  // how far the moth's place across the level moves a sound (1 = hard left/right)

// Idle flavour: which small sound goes with which idle action of the moth (BRIEF.md, "Idle kinds"). To add a
// kind, add a line here; several kinds may share a sound. Kinds that are not listed get 'murmur', a soft neutral
// breath - never a footstep. The moth acts every 1.5 to 3 s, so all of these are small, and the ones with a
// voice (chirp, sigh, yawn, firefly ...) are rationed: at most one every few seconds, otherwise the breath.
export const IDLE_MAP = {
  look: 'glance', twitch: 'feel', preen: 'brush', clean: 'wash', flutter: 'whirr', stretch: 'stretch', hop: 'hop', shake: 'shake',
  tilt: 'drum', peek: 'peek', bask: 'sigh', curious: 'firefly', jump: 'lunge', sleep: 'yawn', wake: 'startle',
  // names from earlier drafts of the animation and likely relatives
  gaze: 'sigh', admire: 'sigh', warm: 'sigh', glance: 'glance', nod: 'glance', antenna: 'feel', antennae: 'feel', groom: 'brush',
  scratch: 'brush', wings: 'whirr', flap: 'whirr', shiver: 'shake', bounce: 'hop', nap: 'yawn', doze: 'yawn', yawn: 'yawn',
  blink: 'glance', twinkle: 'firefly', sparkle: 'firefly',
};

export function createSfx(ctx, clock, mix, S, music) {
  const bus = mix.sfx;
  const dry = bus.input(0.05), room = bus.input(0.18), wet = bus.input(0.42), far = bus.input(0.7);
  const r = makeRng(4242);
  const pools = {
    step: S.makePool(6), body: S.makePool(4), paper: S.makePool(4), tone: S.makePool(12), air: S.makePool(3), ui: S.makePool(5), spark: S.makePool(14),
  };
  const last = {};
  // Seconds since the previous event of this kind (and remember this one).
  const since = (key, t) => { const d = t - (last[key] ?? -99); last[key] = t; return d; };
  // Hard rate limit per kind of event: anything faster than a held key can produce is dropped before any
  // node is created, so a flood of events cannot load the audio thread.
  const flood = (key, t, minGap) => t - (last[key] ?? -99) < minGap;
  // Rate of a kind of event: `fast` from the third event in a row that follows its predecessor within 0.19 s.
  const rates = {};
  function rate(key, t) {
    const s = rates[key] || (rates[key] = { last: -9, run: 0 });
    const gap = t - s.last;
    s.last = t; s.run = gap < 0.19 ? s.run + 1 : 0;
    return { gap, run: s.run, fast: s.run >= 2 };
  }
  let foot = 0, undoRun = 0, hoverIdx = 0, zoomPrev = 1, P = 0, lastDock = -9, igniteIdx = 0;

  // ---- continuous textures ----------------------------------------------------------------------------
  // A stream is built on its first hit and is re-armed by every further hit: its level is scheduled to fall
  // away `hold` seconds after the last one, on the audio clock, so it can never hang.
  function makeStream(build, dest, hold = 0.15, rel = 0.07) {
    let cur = null;
    const end = (tk) => {
      const c = cur; cur = null;
      if (!c) return;
      c.out.gain.cancelScheduledValues(tk); c.out.gain.setTargetAtTime(0, tk, 0.02);
      for (const n of c.sources) { try { n.stop(tk + 0.2); } catch (e) { /* stopped */ } }
    };
    const watch = () => clock.at(cur.last + hold + rel * 9, (tt) => { if (!cur) return; if (tt - cur.last > hold + rel * 8 || tt - cur.t0 > 40) end(tt); else watch(); });
    return {
      hit(t, level) {
        if (cur && (t - cur.last > hold + rel * 6 || t - cur.t0 > 30)) end(t);
        const fresh = !cur;
        if (fresh) {
          cur = build(t);
          cur.t0 = t; cur.out = S.gain(0); cur.node.connect(cur.out); cur.out.connect(dest);
          cur.out.gain.setValueAtTime(0, t);
        }
        cur.last = t;
        const g = cur.out.gain;
        g.cancelScheduledValues(t); g.setTargetAtTime(level, t, 0.04); g.setTargetAtTime(0, t + hold, rel);
        if (fresh) watch();
        return cur;
      },
      get active() { return !!cur && clock.now() - cur.last < hold + 0.05; },
      get last() { return cur ? cur.last : -9; },
    };
  }

  // Rewind: pages running backwards and an airy tone that slides down the key.
  const rewind = makeStream((t) => {
    const node = S.gain(1);
    const n = S.noise('rustle', t, null, 1.35), bp = S.filter('bandpass', 1100, 0.8), lp = S.filter('lowpass', 6500, 0.5), trem = S.gain(0.7), ng = S.gain(1.5);
    const lfo = S.osc('sine', 6.3, t, null), lg = S.gain(0.1);
    lfo.connect(lg); lg.connect(trem.gain);
    n.connect(bp); bp.connect(lp); lp.connect(trem); trem.connect(ng); ng.connect(node);
    const lad = music.safeLadder(62, 9, t);
    const f = mtof(lad[7]);
    const o1 = S.osc('sine', f, t, null), o2 = S.osc('sine', f * 2, t, null), g2 = S.gain(0.14), tg = S.gain(0.14);
    const n2 = S.noise('pink', t, null), b2 = S.filter('bandpass', f, 10), ng2 = S.gain(5);
    o1.connect(tg); o2.connect(g2); g2.connect(tg); n2.connect(b2); b2.connect(ng2); ng2.connect(tg); tg.connect(node);
    return { node, sources: [n, lfo, o1, o2, n2], lad, idx: 7, dir: -1, stepAt: t, bp, set(tk, m) { const x = mtof(m); o1.frequency.setTargetAtTime(x, tk, 0.07); o2.frequency.setTargetAtTime(x * 2, tk, 0.07); b2.frequency.setTargetAtTime(x, tk, 0.07); } };
  }, room, 0.16, 0.08);
  // Scurry: the wing whirr of a moth that runs.
  const scurry = makeStream((t) => {
    const node = S.gain(1);
    const n = S.noise('pink', t, null, 1.2), bp = S.filter('bandpass', 1700, 0.8), chop = S.gain(0.55), lfo = S.osc('sine', 31, t, null), lg = S.gain(0.45);
    lfo.connect(lg); lg.connect(chop.gain); n.connect(bp); bp.connect(chop); chop.connect(node);
    return { node, sources: [n, lfo], bp };
  }, dry, 0.19, 0.06);
  // Slide: one long paper-on-stone slide while lanterns are pushed in a row.
  const slide = makeStream((t) => {
    const node = S.gain(1);
    const n = S.noise('rustle', t, null, 1), bp = S.filter('bandpass', 1500, 0.7), lp = S.filter('lowpass', PAPER_LP, 0.5), g1 = S.gain(0.42);
    const n2 = S.noise('pink2', t, null, 1), lo = S.filter('lowpass', 520, 0.7), g2 = S.gain(0.2);
    n.connect(bp); bp.connect(lp); lp.connect(g1); g1.connect(node); n2.connect(lo); lo.connect(g2); g2.connect(node);
    return { node, sources: [n, n2], bp };
  }, room, 0.3, 0.07);

  // ---- the moth -------------------------------------------------------------------------------------
  // A soft pat: a felt-like noise tap, a tiny low thump and a trace of definition on top. Left and right
  // feet differ, and every step gets new pitch, level and length, so a walk never sounds like a machine.
  function pat(t, level, o = {}) {
    foot ^= 1;
    const fc = (foot ? 700 : 860) * r.range(0.8, 1.25) * (o.pitch ?? 1);
    const pan = P + (foot ? -0.05 : 0.05) + r.range(-0.04, 0.04);
    const lv = level * r.range(0.75, 1.1);
    S.air(dry, t, 0.05, { kind: 'pink', f0: fc, f1: fc * 0.7, q: 1.0, shape: 'perc', attack: 0.006, tau: r.range(0.016, 0.026), vel: lv * 9, pool: pools.step, pan0: pan });
    S.air(dry, t, 0.02, { kind: 'white', f0: r.range(2200, 3400), q: 0.9, shape: 'perc', attack: 0.002, tau: 0.006, vel: lv * 0.95, pool: pools.step, pan0: pan });
    S.thump(dry, t, r.range(175, 225), r.range(110, 135), lv * 0.7, r.range(0.014, 0.02), { pool: pools.step, pan });
  }
  function step(t) {
    if (flood('step', t, 0.025)) return;
    last.step = t;
    const q = rate('step', t);
    if (q.fast) {
      // running: light single pats under one continuous whirr
      pat(t, 0.062);
      const s = scurry.hit(t, 0.05);
      s.bp.frequency.setTargetAtTime(r.range(1400, 2100), t, 0.1);
      return;
    }
    pat(t, q.gap < 0.19 ? 0.085 : 0.115);
    if (r.chance(0.55)) pat(t + r.range(0.05, 0.085), q.gap < 0.19 ? 0.04 : 0.055, { pitch: 1.18 });
    if (r.chance(0.22) && q.gap > 0.2) S.flutter(dry, t + 0.01, 0.12, { vel: 0.1, f: r.range(1300, 1900), rate: r.range(34, 44), pool: pools.paper, pan: P });
  }

  // Lantern slide: paper rustle over a low wooden scrape, a soft push-off and a settle tick.
  function push(t) {
    if (flood('push', t, 0.03)) return;
    last.push = t;
    const q = rate('push', t);
    if (q.fast) {
      pat(t, 0.045);
      const s = slide.hit(t, 0.42);
      s.bp.frequency.setTargetAtTime(r.range(1250, 1800), t, 0.12);
      S.air(dry, t + 0.02, 0.03, { kind: 'pink', f0: r.range(820, 1050), q: 1.4, shape: 'perc', tau: 0.011, vel: 0.26, pool: pools.paper, pan0: P });
      return;
    }
    const k = q.gap < 0.19 ? 0.75 : 1;
    pat(t, 0.07 * k);
    S.thump(dry, t, r.range(190, 230), 140, 0.11 * k, 0.03, { pool: pools.body, pan: P });
    S.air(room, t + 0.01, 0.2, { kind: 'rustle', f0: r.range(1500, 1900), f1: r.range(950, 1200), q: 0.7, attackFrac: 0.22, holdFrac: 0.3, vel: 0.36 * k, lp: PAPER_LP, pool: pools.paper, pan0: P, pan1: P });
    S.air(dry, t + 0.01, 0.2, { kind: 'pink', type: 'lowpass', f0: r.range(520, 640), f1: 300, q: 0.8, attackFrac: 0.25, holdFrac: 0.3, vel: 0.18 * k, pool: pools.body });
    S.air(dry, t + 0.19, 0.03, { kind: 'pink', f0: r.range(820, 1050), q: 1.4, shape: 'perc', tau: 0.012, vel: 0.5 * k, pool: pools.paper, pan0: P });
  }

  // Blocked, with real contact on screen (a lunge, a squash, a recoil). Against the garden wall: a padded knock
  // on stone under moss, and the hedge shudders: leaves stir twice. Against a lantern: it jolts, its bamboo frame
  // ticks and the paper rattles. Both keep a body above 500 Hz for small speakers.
  function bump(t, d) {
    if (flood('bump', t, 0.05)) return;
    const k = since('bump', t) < 0.2 ? 0.6 : 1;
    const low = music.tonicLadder(57, 3, t);
    if (d && d.kind === 'box') {
      S.thump(dry, t, r.range(150, 170), 105, 0.13 * k, 0.034, { pool: pools.body, pan: P });
      S.tone('wood', dry, t + 0.004, low[2] + 12, 0.11 * k, { decay: 0.04, bright: 0.8, pool: pools.body, pan: P });
      S.air(room, t + 0.012, 0.12, { kind: 'rustle', f0: r.range(2100, 2700), f1: 1500, q: 0.8, shape: 'perc', attack: 0.006, tau: 0.045, vel: 0.78 * k, lp: PAPER_LP, pool: pools.paper, pan0: P });
      S.air(dry, t + 0.06, 0.05, { kind: 'rustle', f0: r.range(1500, 1900), q: 1.0, shape: 'perc', attack: 0.004, tau: 0.02, vel: 0.4 * k, lp: PAPER_LP, pool: pools.paper, pan0: P });
    } else {
      S.thump(dry, t, r.range(125, 145), 80, 0.115 * k, 0.045, { pool: pools.body, pan: P });
      S.tone('wood', dry, t, low[r.int(1, 2)], 0.18 * k, { decay: 0.05, bright: 0.7, pool: pools.body, pan: P });
      S.air(dry, t, 0.05, { kind: 'pink', f0: r.range(700, 900), q: 0.8, shape: 'perc', attack: 0.004, tau: 0.02, vel: 2.2 * k, pool: pools.body, pan0: P });
      S.air(room, t + 0.03, 0.2, { kind: 'rustle', f0: r.range(1300, 1700), f1: 2300, q: 0.6, shape: 'perc', attack: 0.02, tau: 0.07, vel: 0.34 * k, lp: 5200, pool: pools.paper, pan0: P });
      S.air(room, t + 0.17, 0.16, { kind: 'rustle', f0: r.range(1700, 2200), f1: 1400, q: 0.7, shape: 'perc', attack: 0.03, tau: 0.05, vel: 0.16 * k, lp: 5200, pool: pools.paper, pan0: P + 0.06 });
    }
  }

  // ---- lanterns -------------------------------------------------------------------------------------
  // The signature sound: paper catches the light, a warm body tone, and a glass chime on the current chord.
  // The chime climbs with progress, but only inside a sweet register (G4 .. D6): later lanterns add voices
  // (a third, then a fourth note) instead of height.
  function chimeNotes(t, x, tonic) {
    const lad = (tonic ? music.tonicLadder(67, 9, t) : music.chordLadder(67, 9, t)).filter((m) => m <= 86);
    const i = clamp(Math.round(x * (lad.length - 2)), 0, lad.length - 2);
    return { lad, i };
  }
  function chime(t, x, done, o = {}) {
    const { lad, i } = chimeNotes(t, x, o.tonic);
    const k = o.level ?? 1, br = 1 - 0.28 * x;
    const voices = x >= 0.66 ? 4 : x >= 0.3 ? 3 : 2;
    S.tone('glass', wet, t + 0.03, lad[i], 0.1 * k, { pan: P - 0.1, bright: br, pool: pools.tone });
    S.tone('glass', wet, t + 0.125, lad[i + 1], 0.085 * k, { pan: P + 0.12, bright: br, pool: pools.tone });
    if (voices >= 3 && i >= 1) S.tone('kalimba', wet, t + 0.03, lad[i - 1], 0.06 * k, { pan: P + 0.05, bright: 0.85, pool: pools.tone });
    if (voices >= 4) S.tone('harp', wet, t + 0.075, lad[Math.max(0, i - 2)] - (i < 2 ? 12 : 0), 0.06 * k, { pan: P - 0.05, bright: 0.9, pool: pools.tone });
    // the warm body under the chime, and its halo
    S.glow(room, t, mtof(lad[i] - 12), 0.03 * k, { attack: 0.05, hold: 0.1, release: 0.16, harm: 0.2, pool: pools.tone, pan: P });
    S.glow(far, t + 0.06, mtof(lad[i + 1]), 0.014 * k, { attack: 0.3, hold: 0.2, release: 0.45, breath: 0.5, pool: pools.tone });
    return lad[i + 1];
  }
  const catchLight = (t, k) => {
    S.air(room, t, 0.24, { kind: 'rustle', f0: 800, f1: 2700, q: 0.7, attackFrac: 0.65, holdFrac: 0.05, vel: 0.22 * k, lp: PAPER_LP, pool: pools.paper, pan0: P });
    S.air(room, t, 0.3, { kind: 'pink', type: 'lowpass', f0: 300, f1: 1100, q: 0.5, attackFrac: 0.5, vel: 0.1 * k, pool: pools.air });
  };
  function dock(t, d, o = {}) {
    if (flood('dock', t, 0.03)) return;
    const total = Math.max(1, d.goalsTotal | 0), done = clamp(d.goalsDone | 0, 1, total);
    const x = total > 1 ? (done - 1) / (total - 1) : 1;
    const gap = since('dock', t);
    lastDock = t;
    if (o.kind === 'ignite') {
      // lanterns that light while the garden builds: one small glass note each, climbing gently, no ducking
      igniteIdx = gap > 2.5 ? 0 : igniteIdx + 1;
      const lad = music.chordLadder(72, 6, t).filter((m) => m <= 88);
      S.tone('glass', far, t, lad[igniteIdx % lad.length], 0.036, { pan: P + r.range(-0.2, 0.2), bright: 0.85, pool: pools.spark });
      S.air(room, t, 0.14, { kind: 'rustle', f0: 1000, f1: 2400, q: 0.7, attackFrac: 0.6, vel: 0.07, lp: PAPER_LP, pool: pools.paper, pan0: P });
      return;
    }
    if (o.kind === 'undo' || rewind.active) {
      // a lantern that lights again because time ran backwards: the chime in small, backwards
      const { lad, i } = chimeNotes(t, x, false);
      if (rewind.active) { S.tone('glass', far, t, lad[i], 0.022, { pan: P, bright: 0.7, decay: 0.25, pool: pools.spark }); return; }
      S.tone('glass', wet, t, lad[i + 1], 0.05, { reverse: 0.16, pan: P + 0.08, bright: 0.85, pool: pools.tone });
      S.tone('glass', wet, t + 0.15, lad[i], 0.034, { pan: P - 0.08, bright: 0.75, decay: 0.35, pool: pools.tone });
      S.air(room, t, 0.15, { kind: 'rustle', f0: 2300, f1: 1100, q: 0.7, shape: 'reverse', tau: 0.02, vel: 0.1, lp: PAPER_LP, pool: pools.paper, pan0: P });
      return;
    }
    const k = gap < 0.2 ? 0.7 : 1;
    catchLight(t, k);
    chime(t, x, done, { level: k });
    mix.music.duck(t, 0.8, 0.03, 0.3, 0.9);
  }

  // The lantern goes dark: the chime falls back and the glow is puffed out.
  function undock(t, d, o = {}) {
    if (flood('undock', t, 0.03)) return;
    const total = Math.max(1, d.goalsTotal | 0), done = clamp(d.goalsDone | 0, 0, total);
    const x = total > 1 ? done / (total - 1) : 0.5;
    const k = (since('undock', t) < 0.2 ? 0.65 : 1) * (o.undo ? 0.6 : 1);
    const { lad, i } = chimeNotes(t, clamp(x, 0, 1), false);
    if (rewind.active) { S.air(room, t, 0.12, { kind: 'pink', type: 'lowpass', f0: 2200, f1: 500, q: 0.6, attackFrac: 0.15, vel: 0.1, pool: pools.air }); return; }
    S.tone('kalimba', room, t, lad[i + 1], 0.085 * k, { decay: 0.2, bright: 0.7, pan: P + 0.08, pool: pools.tone });
    S.tone('kalimba', room, t + 0.09, lad[i], 0.08 * k, { decay: 0.28, bright: 0.6, pan: P - 0.08, pool: pools.tone });
    S.air(room, t, 0.26, { kind: 'pink', type: 'lowpass', f0: 2800, f1: 340, q: 0.6, attackFrac: 0.12, holdFrac: 0.05, vel: 0.22 * k, pool: pools.air, pan0: P });
  }

  // ---- time -----------------------------------------------------------------------------------------
  // Undo: a note played backwards (it swells and stops) with a small backwards breath. Single undos walk
  // down and back up the key. A held undo becomes the rewind stream: no single notes, no thumps.
  function undo(t, d) {
    if (flood('undo', t, 0.02)) return;
    last.undo = t;
    const q = rate('undo', t);
    if (q.fast) {
      const s = rewind.hit(t, 0.2);
      if (t - s.stepAt > 0.21) {
        s.stepAt = t;
        if (s.idx <= r.int(0, 2)) s.dir = 1; else if (s.idx >= r.int(6, 8)) s.dir = -1;
        s.idx += s.dir;
        s.set(t, s.lad[s.idx]);
        s.bp.frequency.setTargetAtTime(r.range(800, 1700), t, 0.15);
      }
      // when the stream lets go, the moth sets down softly
      clock.at(t + 0.2, (tt) => { if (rewind.last === t) { S.air(dry, tt, 0.04, { kind: 'pink', f0: 760, q: 1.0, shape: 'perc', tau: 0.016, vel: 0.5, pool: pools.step, pan0: P }); S.tone('kalimba', room, tt + 0.01, s.lad[s.idx], 0.03, { decay: 0.2, bright: 0.6, pan: P, pool: pools.tone }); } });
      return;
    }
    undoRun = q.gap < 0.9 ? undoRun + 1 : 0;
    const lad = music.safeLadder(62, 9, t);
    const tri = undoRun % 16;
    const m = lad[8 - (tri < 8 ? tri : 16 - tri)];
    const quick = q.gap < 0.19;
    const dur = quick ? 0.1 : 0.16, lv = quick ? 0.6 : 1;
    S.tone('kalimba', room, t, m, 0.13 * lv, { reverse: dur, pan: P + r.range(-0.08, 0.08), pool: pools.tone });
    S.air(room, t, dur, { kind: 'pink', f0: 500, f1: 1500, q: 1.0, shape: 'reverse', tau: 0.014, vel: 0.4 * lv, pool: pools.air, pan0: P });
    if (d && d.wasPush && !quick) S.air(room, t, dur * 0.9, { kind: 'rustle', f0: 1000, f1: 1900, q: 0.8, shape: 'reverse', tau: 0.012, vel: 0.4, lp: PAPER_LP, pool: pools.paper, pan0: P });
    S.air(dry, t + dur, 0.03, { kind: 'pink', f0: 800, q: 1.1, shape: 'perc', tau: 0.012, vel: 0.5 * lv, pool: pools.step, pan0: P });
    S.thump(dry, t + dur, 150, 110, 0.045 * lv, 0.02, { pool: pools.step, pan: P });
  }
  // Nothing to undo: two dry wooden taps, the second lower.
  function undoEmpty(t) {
    if (since('undoEmpty', t) < 0.18) return;
    const lad = music.safeLadder(67, 3, t);
    S.tone('wood', dry, t, lad[1], 0.15, { decay: 0.045, bright: 0.75, pool: pools.body, pan: P });
    S.tone('wood', dry, t + 0.085, lad[0], 0.12, { decay: 0.05, bright: 0.7, pool: pools.body, pan: P });
    S.air(dry, t, 0.03, { kind: 'pink', f0: 1000, q: 1.2, shape: 'perc', tau: 0.01, vel: 0.7, pool: pools.body, pan0: P });
  }
  // Reset: a longer rewind, notes falling back to the tonic, and a soft landing.
  function reset(t) {
    if (since('reset', t) < 0.3) return;
    const lad = music.safeLadder(62, 8, t);
    S.air(room, t, 0.5, { kind: 'pink', f0: 320, f1: 2100, q: 0.9, shape: 'reverse', tau: 0.03, vel: 0.4, pool: pools.air, pan0: 0.4, pan1: -0.4 });
    S.air(room, t, 0.48, { kind: 'rustle', f0: 900, f1: 2300, q: 0.8, shape: 'reverse', tau: 0.03, vel: 0.3, lp: PAPER_LP, pool: pools.paper });
    for (let i = 0; i < 6; i++) {
      S.tone('harp', wet, t + 0.03 + i * 0.075, lad[7 - i], 0.04 + i * 0.007, { decay: 0.3, pan: 0.3 - i * 0.12, pool: pools.tone });
    }
    S.thump(dry, t + 0.53, 150, 90, 0.1, 0.05, { pool: pools.body });
    S.tone('wood', dry, t + 0.53, music.tonicLadder(55, 1, t)[0], 0.07, { decay: 0.05, bright: 0.6, pool: pools.body });
    S.tone('kalimba', wet, t + 0.54, music.tonicLadder(60, 1, t)[0], 0.085, { bright: 0.8, pool: pools.tone });
    mix.music.duck(t, 0.7, 0.1, 0.45, 0.8, 1);
  }

  // ---- level transitions ------------------------------------------------------------------------------
  // Build-in: air rising for exactly `duration`, harp notes climbing the bridge chord of the new key, and the
  // moth setting down shortly before the level is ready.
  function build(t, d) {
    if (since('build', t) < 0.2) return;
    const dur = clamp(d.duration ?? 1.75, 0.4, 8);
    S.air(wet, t, dur, { kind: 'pink', f0: 260, fmid: 1000, f1: 2100, midAt: 0.6, q: 0.8, attackFrac: 0.55, holdFrac: 0.15, vel: 0.3, pool: pools.air, pan0: -0.5, pan1: 0.5 });
    S.air(room, t + dur * 0.2, dur * 0.8, { kind: 'rustle', f0: 1200, f1: 2600, q: 0.6, attackFrac: 0.6, holdFrac: 0.1, vel: 0.12, lp: PAPER_LP, pool: pools.paper });
    const lad = music.chordLadder(57, 12, t + 0.1);
    const n = clamp(Math.round(dur * 4), 4, 11);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const tt = t + dur * (0.1 + 0.74 * Math.pow(x, 0.85));
      S.tone('harp', wet, tt, lad[i], 0.036 + 0.03 * x, { pan: -0.4 + 0.8 * x, bright: 0.7 + 0.3 * x, pool: pools.tone });
    }
    S.thump(dry, t + dur * 0.9, 120, 70, 0.08, 0.06, { pool: pools.body });
    S.air(dry, t + dur * 0.9, 0.05, { kind: 'pink', f0: 700, q: 0.9, shape: 'perc', tau: 0.02, vel: 0.7, pool: pools.step });
  }
  // The level is ready: one small glass note on the new tonic, with the first downbeat of the new key.
  function ready(t) {
    if (since('ready', t) < 0.3) return;
    const lad = music.tonicLadder(72, 3, t + 0.05);
    S.tone('glass', far, t + 0.02, lad[2], 0.045, { bright: 0.9, pan: 0.1, pool: pools.tone });
  }
  // Tear-down: the same gesture falling and darker.
  function teardown(t, d) {
    winCancel(t);
    if (since('teardown', t) < 0.2) return;
    const dur = clamp(d.duration ?? 1.0, 0.3, 6);
    S.air(wet, t, dur, { kind: 'pink', f0: 1900, fmid: 800, f1: 220, midAt: 0.45, q: 0.8, attackFrac: 0.25, holdFrac: 0.15, vel: 0.4, pool: pools.air, pan0: 0.4, pan1: -0.4 });
    const lad = music.chordLadder(57, 9, t);
    const n = clamp(Math.round(dur * 3.5), 3, 7);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      S.tone('harp', wet, t + dur * (0.05 + 0.7 * x), lad[n - i], 0.08 - 0.04 * x, { decay: 0.5, bright: 0.85 - 0.3 * x, pan: 0.3 - 0.6 * x, pool: pools.tone });
    }
  }

  // Win. One gesture with the last lantern:
  //   t             its chime, now on the tonic and at the top of the climb (the music resolves underneath)
  //   win:lantern   every lantern answers in turn: one note each of a harp and glass run up the tonic chord
  //   t + bloom     the garden is fully lit: a wide chord, then a shower of small lights that thins out
  // After that the music holds its afterglow for as long as the player stays. A tear-down or a taken-back move
  // before the bloom cancels what has not sounded yet.
  let winAt = -9, winToken = 0, winShapeNow = null, answered = 0, runLast = -1, winVoices = [];
  const keep = (v) => { winVoices.push(v); return v; };
  function runNote(t, x, i) {
    const lad = music.tonicLadder(60, 12, t).filter((m) => m <= 86);
    let k = Math.round(x * (lad.length - 1));
    const again = k === runLast;
    runLast = k;
    const inst = again ? 'kalimba' : 'harp';
    S.tone(inst, wet, t, lad[k], 0.05 + 0.032 * x, { pan: clamp(-0.45 + 0.9 * x, -0.6, 0.6), bright: 0.75 + 0.25 * x, pool: pools.spark });
    if (i % 2 === 1 || x === 1) S.tone('glass', far, t + 0.012, lad[k], 0.022 + 0.02 * x, { pan: clamp(0.45 - 0.9 * x, -0.6, 0.6), bright: 0.8, pool: pools.spark });
  }
  function win(t, d, o = {}) {
    if (since('win', t) < 0.3) return;
    const shape = o.shape, k = shape.k, token = ++winToken;
    const lanterns = clamp(o.lanterns | 0, 1, 16);
    winAt = t; winShapeNow = shape; answered = 0; runLast = -1; winVoices = [];
    const lad = music.tonicLadder(57, 14, t);
    const safe = music.safeLadder(81, 6, t);          // small lights: A5 .. about C7
    if (o.playDock) { catchLight(t, 1); chime(t, 1, lanterns, { tonic: true, level: 0.95 }); lastDock = t; }
    else if (!o.withDock) S.glow(room, t, mtof(lad[2]), 0.03, { attack: 0.08, hold: 0.2, release: 0.3, harm: 0.2, pool: pools.tone });
    S.air(wet, t, shape.bloom + 0.3, { kind: 'pink', f0: 500, f1: 3200, q: 0.6, attackFrac: 0.75, holdFrac: 0.05, vel: 0.2, pool: pools.air });
    // a game that does not send `win:lantern` gets a run of its own
    clock.at(t + Math.min(0.5, shape.bloom * 0.45), (tt) => {
      if (token !== winToken || answered) return;
      const left = t + shape.bloom - tt - 0.08, n = clamp(Math.round(left / 0.09), 3, 9);
      if (left > 0.2) for (let i = 0; i < n; i++) runNote(tt + left * Math.pow(i / (n - 1), 0.85), i / (n - 1), i);
    });
    // the bloom: a wide chord in the sweet register, then the small lights
    clock.at(t + shape.bloom, (tb) => {
      if (token !== winToken) return;
      [[lad[6], 0.066, -0.3], [lad[7], 0.055, 0.3], [lad[8], 0.055, -0.15], [lad[9], 0.046, 0.15]].forEach(([m, v, p], i) => {
        S.tone('glass', far, tb + i * 0.03, m > 88 ? m - 12 : m, v, { pan: p, bright: 0.85, pool: pools.spark });
      });
      S.glow(far, tb, mtof(lad[4]), 0.02, { attack: 0.5, hold: 0.9 * k, release: 0.8, breath: 0.5, pool: pools.tone });
      S.glow(far, tb, mtof(lad[6]), 0.016, { attack: 0.6, hold: 0.9 * k, release: 0.8, breath: 0.5, pool: pools.tone });
      const span = 2.4 + 0.12 * lanterns, sparks = Math.round(clamp(9 + lanterns * 1.3, 10, 26));
      for (let i = 0; i < sparks; i++) {
        const ts = tb + 0.14 + span * Math.pow((i + r()) / sparks, 1.35);
        keep(S.tone(i % 3 ? 'glass' : 'kalimba', far, ts, r.pick(safe), r.range(0.008, 0.019) * (1 - 0.55 * i / sparks), { pan: r.range(-0.8, 0.8), bright: 0.8 }));
      }
      keep(S.tone('glass', far, tb + span + 0.5, music.tonicLadder(81, 1, tb)[0], 0.024, { bright: 0.8 }));
    });
    mix.music.duck(t, 0.82, 0.06, shape.bloom + 0.3, 1.4, 1);
    mix.amb.duck(t, 0.6, 0.2, shape.bloom + 1, 2);
  }
  // One lantern answers in the celebration.
  function winLantern(t, d) {
    if (t - winAt > 12) return;
    const total = Math.max(1, d.total | 0), i = clamp(d.index | 0, 0, total - 1);
    answered++;
    runNote(t, total > 1 ? i / (total - 1) : 1, i);
  }
  // The celebration is cut short (the player goes on, or takes the winning move back): what has not sounded
  // yet is taken back.
  function winCancel(t) {
    winToken++;
    for (const v of winVoices) { try { if (v.end > t) v.in.gain.setTargetAtTime(0, t, 0.04); } catch (e) { /* gone */ } }
    winVoices = [];
  }

  // ---- camera -----------------------------------------------------------------------------------------
  function rotate(t, d) {
    if (since('rotate', t) < 0.12) return;
    const dir = d.dir < 0 ? -1 : 1;
    S.air(room, t, 0.44, { kind: 'pink', f0: 420, fmid: 1300, f1: 560, q: 0.9, attackFrac: 0.42, holdFrac: 0.08, vel: 0.62, pool: pools.air, pan0: -0.6 * dir, pan1: 0.6 * dir });
    S.air(dry, t, 0.4, { kind: 'pink2', type: 'lowpass', f0: 210, f1: 150, q: 0.7, attackFrac: 0.4, holdFrac: 0.1, vel: 0.2, pool: pools.body });
    S.tone('wood', dry, t + 0.4, music.tonicLadder(55, 1, t)[0], 0.045, { decay: 0.04, bright: 0.6, pool: pools.body });
    S.thump(dry, t + 0.4, 135, 95, 0.07, 0.035, { pool: pools.body });
  }
  function view(t, d) {
    if (since('view', t) < 0.12) return;
    const lad = music.tonicLadder(64, 5, t);
    const shape = { top: [lad[0], lad[2]], iso: [lad[2], lad[1]], ortho: [lad[2], lad[0]] }[d.mode] || [lad[1], lad[2]];
    S.air(room, t, 0.5, { kind: 'pink', f0: d.mode === 'top' ? 450 : 1000, fmid: d.mode === 'top' ? 1600 : 760, f1: d.mode === 'top' ? 1000 : 420, q: 0.9, attackFrac: 0.45, holdFrac: 0.1, vel: 0.42, pool: pools.air });
    S.air(room, t + 0.05, 0.3, { kind: 'rustle', f0: 1400, f1: 2100, q: 0.7, attackFrac: 0.5, vel: 0.14, lp: PAPER_LP, pool: pools.paper });
    S.glow(wet, t + 0.04, mtof(shape[1]), 0.03, { attack: 0.16, hold: 0.1, release: 0.2, glide: mtof(shape[0]) / mtof(shape[1]), glideTime: 0.3, breath: 0.4, pool: pools.tone });
    S.tone('glass', far, t + 0.34, shape[1] + 12, 0.022, { bright: 0.8, pool: pools.tone });
  }
  function zoom(t, d) {
    const z = d.zoom ?? 1;
    const dz = z - zoomPrev;
    zoomPrev = z;
    if (since('zoom', t) < 0.1 || Math.abs(dz) < 0.004) return;
    const inward = dz > 0;
    const base = 520 + 520 * clamp(z - 1, 0, 0.8) / 0.8;
    S.air(room, t, 0.26, { kind: 'pink', f0: inward ? base : base * 1.9, f1: inward ? base * 1.9 : base, q: 1.2, attackFrac: 0.4, holdFrac: 0.1, vel: 0.6, pool: pools.air });
  }

  // ---- interface --------------------------------------------------------------------------------------
  function uiOpen(t) {
    if (since('uiOpen', t) < 0.08) return;
    const lad = music.tonicLadder(69, 4, t);
    S.air(room, t, 0.26, { kind: 'rustle', f0: 1100, f1: 2400, q: 0.7, attackFrac: 0.5, holdFrac: 0.1, vel: 0.26, lp: PAPER_LP, pool: pools.paper });
    S.tone('kalimba', wet, t + 0.02, lad[0], 0.06, { bright: 0.8, pan: -0.1, pool: pools.ui });
    S.tone('kalimba', wet, t + 0.11, lad[2], 0.06, { bright: 0.8, pan: 0.1, pool: pools.ui });
  }
  function uiClose(t) {
    if (since('uiClose', t) < 0.08) return;
    const lad = music.tonicLadder(69, 4, t);
    S.air(room, t, 0.22, { kind: 'rustle', f0: 2200, f1: 1000, q: 0.7, attackFrac: 0.2, holdFrac: 0.1, vel: 0.24, lp: PAPER_LP, pool: pools.paper });
    S.tone('kalimba', wet, t + 0.01, lad[2], 0.056, { bright: 0.7, pan: 0.1, decay: 0.3, pool: pools.ui });
    S.tone('kalimba', wet, t + 0.09, lad[0], 0.06, { bright: 0.7, pan: -0.1, pool: pools.ui });
  }
  function uiHover(t) {
    if (since('hover', t) < 0.045) return;
    const lad = music.safeLadder(81, 5, t);
    hoverIdx = (hoverIdx + 1 + (r.chance(0.3) ? 1 : 0)) % 5;
    S.tone('kalimba', room, t, lad[hoverIdx], 0.05, { decay: 0.09, bright: 0.6, pan: r.range(-0.2, 0.2), pool: pools.ui });
    S.air(dry, t, 0.03, { kind: 'pink', f0: 1500, q: 1.2, shape: 'perc', tau: 0.008, vel: 0.3, pool: pools.ui });
  }
  function uiSelect(t) {
    if (since('uiSelect', t) < 0.05) return;
    const lad = music.tonicLadder(72, 4, t);
    S.tone('kalimba', wet, t, lad[1], 0.06, { bright: 0.9, pan: -0.08, pool: pools.ui });
    S.tone('glass', wet, t + 0.07, lad[3], 0.05, { bright: 0.9, pan: 0.08, pool: pools.ui });
    S.tone('wood', dry, t, lad[0] - 12, 0.05, { decay: 0.04, bright: 0.6, pool: pools.body });
  }

  // ---- idle flavour: small moth noises ------------------------------------------------------------
  const brushStroke = (t, lv = 0.34) => S.air(dry, t, 0.07, { kind: 'rustle', f0: r.range(1800, 2600), f1: 1400, q: 1, shape: 'perc', attack: 0.012, tau: 0.02, vel: lv, lp: PAPER_LP, pool: pools.paper, pan0: P });
  const tick = (t, lv = 0.3, f = 2400) => S.air(dry, t, 0.03, { kind: 'rustle', f0: f * r.range(0.9, 1.15), q: 1.4, shape: 'perc', attack: 0.003, tau: 0.009, vel: lv, lp: PAPER_LP, pool: pools.paper, pan0: P });
  const breath = (t, lv = 0.2, len = 0.3) => S.air(room, t, len, { kind: 'pink', f0: 1000, f1: 1400, q: 0.8, attackFrac: 0.4, holdFrac: 0.1, vel: lv, pool: pools.air, pan0: P });
  const chirpUp = (t, lv = 0.03) => { const lad = music.safeLadder(84, 4, t), i = r.int(0, 1); S.glow(room, t, mtof(lad[i + 1]), lv, { attack: 0.03, hold: 0.04, release: 0.05, glide: mtof(lad[i]) / mtof(lad[i + 1]), glideTime: 0.08, harm: 0.06, breath: 0.4, pool: pools.tone, pan: P }); };
  const IDLE = {
    // sounds without a voice: they may come every time
    glance(t) { if (r.chance(0.4)) breath(t + 0.1, 0.12, 0.25); },                                   // a look to the side: almost nothing
    feel(t) { tick(t + 0.15, 0.4, 3000); tick(t + 0.42, 0.34, 3400); },                              // antennae perk up, one after the other
    brush(t) { for (let i = 0; i < 3; i++) brushStroke(t + 0.5 + i * r.range(0.36, 0.44)); },           // an antenna is stroked two or three times
    wash(t) { for (let i = 0; i < 7; i++) brushStroke(t + 0.3 + i * r.range(0.13, 0.17), 0.22); },       // quick alternating rubs
    whirr(t) { S.flutter(room, t + 0.05, 0.6, { vel: 0.36, f: r.range(900, 1300), rate: r.range(22, 28), rateEnd: 0.7, pool: pools.paper, pan: P }); },
    stretch(t) {                                                                                        // wings spread slowly, fold with a flick
      S.air(room, t + 0.2, 1.5, { kind: 'pink', f0: 500, fmid: 1100, f1: 700, q: 0.7, attackFrac: 0.55, holdFrac: 0.2, vel: 0.13, pool: pools.air, pan0: P });
      S.flutter(dry, t + 2.1, 0.14, { vel: 0.16, f: 1500, rate: 38, pool: pools.paper, pan: P });
    },
    hop(t) { S.flutter(dry, t + 0.22, 0.16, { vel: 0.14, f: 1600, rate: 36, pool: pools.paper, pan: P }); pat(t + 0.52, 0.09, { pitch: 0.9 }); },
    shake(t) {                                                                                          // a shiver, then it shakes itself out
      S.flutter(dry, t + 0.1, 0.4, { vel: 0.07, f: 2000, rate: 46, pool: pools.paper, pan: P });
      S.flutter(room, t + 0.7, 0.6, { vel: 0.34, f: r.range(1000, 1300), rate: 19, rateEnd: 0.6, pool: pools.paper, pan: P });
    },
    drum(t) { for (let i = 0; i < 5; i++) pat(t + 1.2 + i * 0.115, 0.03 + 0.004 * i, { pitch: 1.3 }); }, // impatient: a front foot drums
    // only beside a lantern: two taps on its paper (0.74 s and 1.34 s after the start), each with a trace of its glass
    peek(t) {
      const lad = music.chordLadder(76, 3, t);
      [0.74, 1.34].forEach((dt, i) => {
        tick(t + dt, 0.42, 1700);
        S.thump(dry, t + dt, 300, 230, 0.03, 0.02, { pool: pools.body, pan: P });
        S.tone('glass', far, t + dt + 0.01, lad[i ? 1 : 0], 0.014, { bright: 0.7, decay: 0.3, pan: P, pool: pools.spark });
      });
    },
    // sounds with a voice (rationed)
    sigh(t) {                                                                                           // wings open to the warmth of a lit lantern
      S.air(room, t + 0.3, 0.9, { kind: 'pink', f0: 900, fmid: 1500, f1: 700, q: 0.7, attackFrac: 0.4, holdFrac: 0.15, vel: 0.12, pool: pools.air, pan0: P });
      S.glow(far, t + 0.5, mtof(music.chordLadder(72, 2, t)[1]), 0.011, { attack: 0.4, hold: 0.3, release: 0.5, harm: 0.1, breath: 0.6, pool: pools.tone, pan: P });
    },
    firefly(t) {                                                                                        // a firefly drifts close
      const lad = music.safeLadder(88, 4, t);
      S.tone('glass', far, t + 0.1, lad[r.int(0, 1)], 0.014, { bright: 0.8, pan: P + 0.25, pool: pools.spark });
      S.tone('glass', far, t + 0.32, lad[r.int(2, 3)], 0.011, { bright: 0.8, pan: P + 0.3, pool: pools.spark });
      chirpUp(t + 0.55, 0.022);
    },
    lunge(t) {                                                                                          // a snap at the firefly, a miss
      S.flutter(dry, t + 0.14, 0.14, { vel: 0.2, f: 1700, rate: 40, pool: pools.paper, pan: P });
      pat(t + 0.42, 0.07);
      const lad = music.safeLadder(79, 3, t);
      S.glow(room, t + 0.75, mtof(lad[0]), 0.02, { attack: 0.04, hold: 0.08, release: 0.12, glide: mtof(lad[1]) / mtof(lad[0]), glideTime: 0.16, harm: 0.05, breath: 0.4, pool: pools.tone, pan: P });
    },
    yawn(t) { const f = mtof(music.tonicLadder(72, 2, t)[1]); S.glow(room, t + 0.2, f, 0.02, { attack: 0.3, hold: 0.2, release: 0.3, glide: 1.12, glideTime: 0.7, harm: 0.04, breath: 0.5, pool: pools.tone, pan: P }); },
    startle(t) { S.flutter(dry, t, 0.2, { vel: 0.22, f: 1500, rate: 42, pool: pools.paper, pan: P }); chirpUp(t + 0.06, 0.03); },   // wakes with a jolt
    // neutral: a small breath, for idle kinds this table does not know
    murmur(t) { breath(t, 0.2); },
  };
  const VOICED = new Set(['sigh', 'firefly', 'lunge', 'yawn']);
  function idle(t, d) {
    if (since('idle', t) < 0.4) return;
    const kind = String((d && d.kind) || '').toLowerCase();
    let name = IDLE[IDLE_MAP[kind]] ? IDLE_MAP[kind] : 'murmur';
    if (VOICED.has(name)) { if (t - (last.voiced ?? -99) < 5) name = 'murmur'; else last.voiced = t; }
    IDLE[name](t);
  }

  return {
    step, push, bump, dock, undock, undo, undoEmpty, reset, build, ready, teardown, win, winLantern, winCancel, rotate, view, zoom,
    uiOpen, uiClose, uiHover, uiSelect, idle,
    setZoom(z) { zoomPrev = z; },
    setPan(p) { P = clamp(p, -1, 1) * PAN; },
    get lastDock() { return lastDock; },
  };
}
