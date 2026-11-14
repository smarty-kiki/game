// The music: one composed piece, "a serene night in the garden, with fireflies". Nothing in it is random.
//
// A slow ballad in A flat major, 4/4 at 63 beats per minute, 60 bars (3 minutes 49 seconds), written to loop:
//
//   Intro (4)  the garden at night: strings, a slow harp, two fireflies of glass
//   A1 (8)     the theme on the felt piano, over the descending-bass ballad progression
//                I   V/7   vi7   I/5   IVmaj7   I/3   ii7   V7sus        (the bass walks down the scale: 1 7 6 5 4 3 2, then 5)
//   A2 (8)     the theme again, the harp now flowing, a kalimba under it; it closes:  ... ii7 V7 | I
//   B (8)      the lift, sung by the glass high up:  vi7  iii7  IVmaj7  I/3  |  vi7  iii7  IVmaj7 iv6  V7sus V7
//                (the borrowed minor iv is the one wistful moment of the piece: the melody sighs 6, flat 6, 5)
//   A3 (8)     the theme, ornamented and fullest, a glass descant above it
//   C (8)      fireflies: no tune, glass and kalimba call and answer over  IVmaj7  I/3  IVmaj7  I/3  ii7  I/3  IVmaj7  V7sus
//   B2 (8)     the lift again, now on the piano: the high point of the piece
//   A4 (8)     the theme comes home, quiet, with a glass echo; it ends on the tonic, and the Intro follows
//
// The piece never restarts. It keeps its place across levels: `level:teardown` thins it to the held strings,
// `level:build` plays a bridge on the dominant that lasts exactly as long as the garden takes to build, and
// the next section of the piece then starts on a downbeat when the level is ready. A win resolves to the tonic
// and stays in a quiet afterglow (the sway of the Intro, with a memory of the theme) until the next level.
//
// Lanterns: the lit fraction opens the string filter, adds air, brightens every instrument and brings in a
// high sparkle, so the garden audibly brightens. It never changes the notes of the piece.
//
// Sound effects ask chordLadder / tonicLadder / safeLadder for the key and chord at their own start time, so
// they are always inside the harmony.
import { clamp, mod, mtof, makeRng } from './util.js';

// ---- key and time ---------------------------------------------------------------------------------
const KEY = 8;                                    // A flat
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SCALE = MAJOR.map((x) => mod(KEY + x, 12));
const PENTA = [0, 2, 4, 7, 9].map((x) => mod(KEY + x, 12));     // no semitones: fits over every chord of the key
const BPM = 63, BEATS = 4, BEAT = 60 / BPM, BAR = BEATS * BEAT;
const BASE = 60 + KEY;                            // a degree with no octave mark lies in the octave from A flat 4

// ---- chords ---------------------------------------------------------------------------------------
// quality: [triad, colour]. The triad is what figures and sound effects use; the strings add the colour tone.
const QUAL = {
  maj: [[0, 4, 7], []], add9: [[0, 4, 7], [14]], maj7: [[0, 4, 7], [11]], m7: [[0, 3, 7], [10]],
  m6: [[0, 3, 7], [9]], sus7: [[0, 5, 7], [10]], dom7: [[0, 4, 7], [10]],
};
// name: [root, quality, bass] in semitones above the tonic. "X/n": chord X over scale degree n in the bass.
const CH = Object.fromEntries(Object.entries({
  'I': [0, 'add9'], 'Imaj7': [0, 'maj7'], 'I/3': [0, 'maj', 4], 'I/5': [0, 'maj', 7],
  'ii7': [2, 'm7'], 'iii7': [4, 'm7'], 'IVmaj7': [5, 'maj7'], 'IVmaj7/1': [5, 'maj7', 0], 'iv6': [5, 'm6'],
  'V7sus': [7, 'sus7'], 'V7': [7, 'dom7'], 'V/7': [7, 'maj', 11], 'vi7': [9, 'm7'],
}).map(([name, [root, quality, bass = root]]) => {
  const [triad, colour] = QUAL[quality];
  const pcs = (list) => list.map((x) => mod(KEY + root + x, 12));
  const pad = pcs(triad.concat(colour));
  // `safe`: notes an effect may play in any order over this chord. The borrowed chord allows only itself.
  return [name, { name, root: mod(KEY + root, 12), bass: mod(KEY + bass, 12), triad: pcs(triad), pad, safe: pad.every((p) => SCALE.includes(p)) ? PENTA : pad }];
}));

// ---- notation -------------------------------------------------------------------------------------
// One string per bar. A note is  degree/beats : degree 1..7 of the major scale, ' one octave up, , one octave
// down, b or # in front for a flat or a sharp. A rest is  -/beats . Every bar must add up to four beats.
function parseBar(text) {
  const out = [];
  let beat = 0;
  for (const tok of text.trim().split(/\s+/)) {
    const [p, d] = tok.split('/'), dur = +d;
    if (!(dur > 0)) throw new Error(`music: bad length in "${tok}"`);
    if (p !== '-') {
      const m = /^([b#]?)([1-7])([',]*)$/.exec(p);
      if (!m) throw new Error(`music: bad note "${tok}"`);
      let oct = 0;
      for (const c of m[3]) oct += c === "'" ? 1 : -1;
      out.push({ beat, dur, si: +m[2] - 1 + 7 * oct, acc: m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0 });
    }
    beat += dur;
  }
  if (Math.abs(beat - BEATS) > 1e-6) throw new Error(`music: bar "${text}" has ${beat} beats`);
  return out;
}
export const pitchOf = (n) => BASE + 12 * Math.floor(n.si / 7) + MAJOR[mod(n.si, 7)] + (n.acc || 0);
// One or two chords in a bar: "ii7 V7" changes on the third beat.
const parseChords = (text) => text.trim().split(/\s+/).map((name, i, all) => {
  if (!CH[name]) throw new Error(`music: unknown chord "${name}"`);
  return { beat: i * BEATS / all.length, len: BEATS / all.length, chord: CH[name] };
});

// ---- the score ------------------------------------------------------------------------------------
const REST = '-/4';
const part = (role, inst, vel, bars, o = {}) => ({ role, inst, vel, bars: bars.map(parseBar), ...o });
// kind: 'tune' is shaped as a melody (phrase swell, section dynamics), 'under' is the quiet line below it,
// 'firefly' is a single light, left or right. Glass notes ring out; piano and kalimba notes are damped.
const piano = (bars, vel = 0.3) => part('lead', 'felt', vel, bars, { kind: 'tune', pan: 0.1 });
const kalimba = (bars, vel = 0.135) => part('counter', 'kalimba', vel, bars, { kind: 'under', pan: 0.32 });
const glassTune = (bars) => part('second', 'glass', 0.27, bars, { kind: 'tune', pan: -0.12, ring: true });
const fireflies = (role, vel, bars) => part(role, 'glass', vel, bars, { kind: 'firefly', ring: true });

// The theme, first half: a rise to the sixth and a sigh back (6 5), answered a third lower, then a climb.
const THEME = ['3/1.5 5/.5 6/1 5/1', '2/2.5 1/.5 7,/1', '1/1.5 3/.5 5/1 6/1', '5/2 -/1 6/.5 7/.5'];
const A_OPEN = ['I', 'V/7', 'vi7', 'I/5', 'IVmaj7', 'I/3', 'ii7', 'V7sus'];
const A_CLOSED = ['I', 'V/7', 'vi7', 'I/5', 'IVmaj7', 'I/3', 'ii7 V7', 'I'];
const B_CHORDS = ['vi7', 'iii7', 'IVmaj7', 'I/3', 'vi7', 'iii7', 'IVmaj7 iv6', 'V7sus V7'];
// The lift. Bars 1-4 fall in sequence, bar 5 reaches the top of the piece, bar 7 sighs over the minor iv.
const LIFT = ["1'/2 3'/1 2'/1", '7/3 5/1', "6/2 1'/1 7/1", '5/3 -/1', "3'/1.5 4'/.5 5'/1 3'/1", "2'/2 7/1 5/1", "1'/1 6/1 b6/2"];
// The kalimba under the theme: one held tone a bar, and a small rising answer under each long melody note.
const UNDER = ['-/2 1/2', '-/2 7,/2', '-/2 1/2', '-/1 5,/1 1/1 3/1', '-/2 4/2', '-/2 1/2', '-/2 7,/2', '-/1 5,/1 1/1 3/1'];
const ANSWERS = [REST, '-/1 5,/.5 7,/.5 2/2', REST, '-/1 3,/.5 5,/.5 1/2', REST, REST, REST];

// fig: the harp figure.  bass: 'whole' one note per chord, 'half' adds a second note on the third beat.
// pad: level of the strings.  dyn: how strongly the melody is played.  sparkle: false where the glass has
// written fireflies of its own.  entry: false for a section a new level never starts with.
const SCORE = [
  {
    name: 'Intro', chords: ['IVmaj7/1', 'Imaj7', 'IVmaj7/1', 'V7sus'], fig: 'sway', bass: 'whole', pad: 1.1, sparkle: false, entry: false,
    parts: [fireflies('second', 0.2, ["-/2 1'/.5 3'/1.5", '-/2 5/.5 7/1.5', "-/2 1'/.5 4'/1.5", "-/2 2'/.5 1'/1.5"])],
  },
  {
    name: 'A1', chords: A_OPEN, fig: 'quarters', bass: 'whole', pad: 0.9, dyn: 0.92,
    parts: [piano([...THEME, "1'/1.5 7/.5 6/1 5/1", '6/1.5 5/.5 3/2', '4/1.5 3/.5 2/1 1/1', '2/3 -/1'])],
  },
  {
    name: 'A2', chords: A_CLOSED, fig: 'flow', bass: 'half', pad: 1, dyn: 1,
    parts: [piano([...THEME, "1'/1.5 7/.5 6/1 5/1", '6/1.5 5/.5 3/1 1/1', '2/1.5 3/.5 4/1 2/1', '1/3 -/1']), kalimba(UNDER)],
  },
  {
    name: 'B', chords: B_CHORDS, fig: 'rock', figLo: 56, bass: 'whole', pad: 0.8, dyn: 1,
    parts: [
      glassTune([...LIFT, '5/3 -/1']),
      piano([...ANSWERS, '-/3 7,/.5 2/.5'], 0.21),              // the piano answers, and leads back into the theme
    ],
  },
  {
    name: 'A3', chords: A_CLOSED, fig: 'flow', bass: 'half', pad: 1, dyn: 1.08,
    parts: [
      piano(['3/1.5 5/.5 6/1 5/1', '2/2 3/.5 2/.5 1/.5 7,/.5', '1/1.5 3/.5 5/1 6/1', '5/2 -/1 6/.5 7/.5', "1'/1.5 2'/.5 3'/1 1'/1", '6/1.5 5/.5 3/1 1/1', '4/1.5 3/.5 2/1 7,/1', '1/4']),
      fireflies('spark', 0.075, ["-/2 1'/2", '-/2 7/2', "-/2 1'/2", "-/1 1'/1 3'/2", "3'/2 5'/2", "-/2 3'/2", "-/2 4'/2", "3'/4"]),
      kalimba([...UNDER.slice(0, 4), '-/2 6,/2', UNDER[5], '-/2 5,/2', UNDER[7]]),
    ],
  },
  {
    name: 'C', chords: ['IVmaj7', 'I/3', 'IVmaj7', 'I/3', 'ii7', 'I/3', 'IVmaj7', 'V7sus'], fig: 'sway', bass: 'whole', pad: 1.15, sparkle: false,
    parts: [
      fireflies('second', 0.2, ["3'/1 1'/3", REST, "3'/1 5'/3", REST, "4'/1 1'/3", "-/2 3'/2", "1'/1 6/3", REST]),
      kalimba([REST, '-/.5 5/.5 3/.5 5/.5 1/2', REST, '-/.5 5/.5 3/.5 1/.5 2/.5 3/1.5', REST, '1/.5 3/.5 5/1 -/2', REST, '2/.5 4/.5 5/2 -/1'], 0.17),
      piano([REST, REST, REST, REST, REST, REST, REST, '-/3 5/.5 6/.5'], 0.21),     // the piano steps back in
    ],
  },
  {
    name: 'B2', chords: B_CHORDS, fig: 'flow', bass: 'half', pad: 1, dyn: 1.1,
    parts: [piano([...LIFT, '5/2 -/1 7,/.5 2/.5']), kalimba([...ANSWERS, REST], 0.17)],
  },
  {
    name: 'A4', chords: A_CLOSED, fig: 'quarters', bass: 'whole', pad: 0.9, dyn: 0.86,
    parts: [
      piano([...THEME, "1'/1.5 7/.5 6/1 5/1", '6/1.5 5/.5 3/1 1/1', '2/1.5 3/.5 4/1 2/1', '1/4']),
      fireflies('spark', 0.07, [REST, "-/1 6'/.5 5'/1.5 -/1", REST, "-/1 6'/.5 5'/1.5 -/1", REST, REST, REST, "-/1 5'/1 3'/2"]),
    ],
  },
].map((s) => ({ ...s, bars: s.chords.length, chords: s.chords.map(parseChords) }));

// Harp figures: [beat, index into the ladder of chord tones that starts near F3].
const FIG = {
  sway: [[0, 0], [1, 2], [2, 4], [3, 3]],
  quarters: [[0, 0], [1, 2], [2, 3], [3, 2]],
  flow: [[0, 0], [0.5, 2], [1, 3], [1.5, 2], [2, 4], [2.5, 3], [3, 2], [3.5, 3]],
  rock: [[0, 0], [0.5, 2], [1, 1], [1.5, 2], [2, 3], [2.5, 2], [3, 1], [3.5, 2]],
};
const HEAD = parseBar(THEME[0]);

// The piece as data, for the score printer (gauntlet/tools/audio-score.mjs).
export const PIECE = { key: KEY, bpm: BPM, beats: BEATS, beat: BEAT, bar: BAR, base: BASE, scale: SCALE, sections: SCORE, chords: CH };
const INFO = {
  placeName: 'night garden', mode: 'major', pc: KEY, bpm: BPM, beat: BEAT, barDur: BAR, pulse: BEAT,
  meter: { beats: BEATS, name: '4/4' },
  ens: { lead: 'felt', second: 'glass', arp: 'harp', counter: 'kalimba', pad: 'strings', bass: 'felt', spark: 'glass' },
};

// The instrument zones the piece needs, so they can be rendered before they are played.
export function songNeeds() {
  return [['felt', 36, 90], ['glass', 72, 98], ['harp', 52, 84], ['kalimba', 58, 80]];
}

// The shape of the win gesture in time (shared by the music and the sound effect). `duration` is the time from
// the win to the moment the garden is fully lit: the lanterns answer one by one on the way (`win:lantern`), and
// the bloom chord lands at the end of it.
export function winShape(duration = 1.1) {
  const bloom = clamp(Number.isFinite(duration) ? duration : 1.1, 0.45, 8);
  return { bloom, k: clamp(bloom / 1.1, 0.8, 2.2) };
}

// `count` notes of the pitch classes `pcs`, ascending from midi `lo`.
function ladder(pcs, lo, count) {
  const out = [];
  for (let m = Math.ceil(lo); out.length < count && m < 128; m++) if (pcs.includes(mod(m, 12))) out.push(m);
  return out;
}

export function createMusic(ctx, clock, mix, S) {
  const bus = mix.music;
  const input = (g) => bus.input(g * 1.28);      // the level of the whole piece against effects and ambience
  // ---- pad chain: voices -> chorus -> high-pass -> moving low-pass -> bus; breath -> its own level ----
  const padIn = S.gain(1), padHp = S.filter('highpass', 300, 0.5), padLp = S.filter('lowpass', 900, 0.6), padOut = S.gain(1);
  const airIn = S.gain(1), airHp = S.filter('highpass', 900, 0.5), airOut = S.gain(0.2);
  padIn.connect(padHp);
  if (ctx && ctx.createDelay) {
    // chorus: two slowly moving short delays, left and right
    [[0.0127, 0.0031, 0.31, -0.7], [0.0171, 0.0038, 0.23, 0.7]].forEach(([base, depth, rate, pan]) => {
      const d = ctx.createDelay(0.05), lfo = S.osc('sine', rate, 0, null), lg = S.gain(depth), p = S.panner(pan), g = S.gain(0.55);
      d.delayTime.value = base; lfo.connect(lg); lg.connect(d.delayTime);
      padIn.connect(d); d.connect(g); g.connect(p); p.connect(padHp);
    });
  }
  padHp.connect(padLp); padLp.connect(padOut); padOut.connect(input(0.42));
  airIn.connect(airHp); airHp.connect(airOut); airOut.connect(input(0.5));
  // air: a faint bed of high noise that comes up with the lit lanterns, like light in mist
  const bed = S.gain(0);
  if (ctx) {
    const n = S.noise('white', 0, null, 0.83), hp = S.filter('highpass', 3800, 0.5), lp = S.filter('lowpass', 9000, 0.5);
    n.connect(hp); hp.connect(lp); lp.connect(bed); bed.connect(input(0.6));
  }
  const IN = { lead: input(0.34), second: input(0.36), arp: input(0.3), counter: input(0.4), bass: input(0.07), spark: input(0.62) };
  const human = makeRng(977);       // touch only: a few milliseconds and a few percent of loudness per note
  const hooks = { note: null, bar: null };
  const muted = new Set();          // roles silenced for balance measurements (lab only)
  const E = INFO.ens;

  let enabled = true;
  const song = { n: 1, ...INFO };   // `n` is the level the game is in; the piece itself is the same in every level
  let mode = 'rest';                // 'play' | 'coda' | 'rest'
  let barTime = 0;                  // start of the next bar to write
  let pos = { k: 0, bar: 0 };       // section of the score, bar in it
  let age = 0, loops = 0;           // bars written since the session started; times the piece has come round
  let codaBar = 0, thin = false;
  let gridT = 0;
  let pending = [];
  let pads = new Map();             // midi -> pad voice
  let prevVoicing = null, prevBass = 44;
  let lit = 0, drift = 0;
  let harmLog = [{ t: -1e9, chord: CH.I }];
  let lastSec = null;

  const ev = (t, fn, role = '') => pending.push({ t, fn, role });
  const pushHarm = (t, chord) => { harmLog.push({ t, chord, song }); if (harmLog.length > 16) harmLog.shift(); };
  const harmAt = (t) => { let h = harmLog[0]; for (const c of harmLog) if (t == null || c.t <= t + 0.02) h = c; return h; };
  // Notes are handed to the audio thread a little ahead of time. When the music turns (a win, a level change)
  // the ones that have not started yet are taken back, so nothing of the old bar sounds into the new one.
  let committed = [];
  const commit = (t, v) => { if (!v) return; for (const x of [].concat(v)) committed.push({ t, v: x }); if (committed.length > 96) committed = committed.slice(-64); };
  function cut(tCut, keepPad = false) {
    pending = pending.filter((e) => e.t < tCut - 0.005 || (keepPad && e.role === 'pad'));
    for (const c of committed) if (c.t >= tCut - 0.005) { try { c.v.in.gain.value = 0; } catch (err) { /* gone */ } }
    committed = committed.filter((c) => c.t < tCut - 0.005);
    if (keepPad) return;
    const last = harmLog[harmLog.length - 1];
    harmLog = harmLog.filter((h) => h.t < tCut - 0.005);
    if (!harmLog.length) harmLog = [{ ...last, t: -1e9 }];
  }

  // One note of a role. Everything audible in the music goes through here.
  function play(role, inst, t, midi, vel, o = {}) {
    if (hooks.note) hooks.note({ role, inst, t, midi, vel, dur: o.dur });
    if (!enabled || muted.has(role)) return;
    commit(t, S.tone(inst, IN[role] || IN.lead, t, midi, vel, o));
  }
  function playBass(t, midi, vel, dur) {
    if (hooks.note) hooks.note({ role: 'bass', inst: E.bass, t, midi, vel, dur });
    if (!enabled || muted.has('bass')) return;
    commit(t, S.bass(IN.bass, t, midi, vel, dur, { inst: E.bass, bright: 0.7 + 0.3 * lit }));
  }

  // ---- pad ----------------------------------------------------------------------------------------
  // The strings hold each chord in the voicing that moves least from the one before.
  function voicing(pcs) {
    const opts = pcs.map((p) => { const o = []; for (let m = 55; m <= 79; m++) if (mod(m, 12) === p) o.push(m); return o; });
    let best = null, bestCost = 1e9;
    const cur = [];
    const walk = (i) => {
      if (i === opts.length) {
        const v = cur.slice().sort((a, b) => a - b);
        const span = v[v.length - 1] - v[0];
        let cost = Math.abs(v.reduce((a, b) => a + b, 0) / v.length - 66) * 0.7;
        if (span > 19) cost += (span - 19) * 3;
        if (span < 8) cost += 8;
        for (let j = 0; j + 1 < v.length; j++) {
          const gap = v[j + 1] - v[j];
          if (gap < 2) cost += 9;
          if (gap < 5 && v[j] < 60) cost += 5;
        }
        if (prevVoicing) {
          for (const a of v) cost += Math.min(...prevVoicing.map((b) => Math.abs(a - b)));
          for (const b of prevVoicing) cost += Math.min(...v.map((a) => Math.abs(a - b)));
        }
        if (cost < bestCost) { bestCost = cost; best = v; }
        return;
      }
      for (const m of opts[i]) { cur[i] = m; walk(i + 1); }
    };
    walk(0);
    return best;
  }
  function setPad(t, chord, o = {}) {
    const v = voicing(chord.pad);
    prevVoicing = v;
    if (hooks.note) hooks.note({ role: 'pad', inst: E.pad, t, chord: v, level: o.level ?? 1 });
    if (!enabled || muted.has('pad')) return;
    const want = new Set(v);
    for (const [m, voice] of pads) if (!want.has(m)) { voice.off(t, o.release ?? 0.8); pads.delete(m); }
    const level = 0.0135 * (o.level ?? 1);
    for (const m of v) {
      const lv = level * (m < 59 ? 0.8 : m > 74 ? 0.8 : 1);
      if (pads.has(m)) { pads.get(m).level(t, lv, 0.8); continue; }
      pads.set(m, S.padNote(padIn, t, mtof(m), lv, { type: E.pad, attack: o.attack ?? 0.5, detune: (m % 3) - 1, air: airIn }));
    }
  }
  function releasePads(t, tau) {
    for (const [, voice] of pads) voice.off(t, tau);
    pads = new Map();
  }
  // The lit fraction sets the colour: pad filter, breath, brightness of every note.
  function colour(t, tau = 1.2) {
    drift += 1.3;                           // the filter never stands still
    const sway = 1 + 0.2 * Math.sin(drift);
    padLp.frequency.setTargetAtTime(clamp(900 * Math.pow(2, 2.1 * lit) * sway, 300, 5600), t, tau);
    // the whole ensemble opens up at the top as the lanterns light
    if (bus.shelf) bus.shelf.gain.setTargetAtTime(3 + 4 * lit, t, tau);
    airOut.gain.setTargetAtTime(0.1 + 0.9 * lit * lit, t, tau);
    bed.gain.setTargetAtTime(enabled && mode !== 'rest' && !muted.has('air') ? (0.0005 + 0.0028 * lit * sway) * (mode === 'coda' ? 0.6 : 1) : 0, t, tau);
  }

  // The bass note of a pitch class: the one nearest to the note before, so the line moves by step where it can.
  function bassOf(pc) {
    let best = 44, bd = 99;
    for (let m = 36; m <= 50; m++) if (mod(m, 12) === pc) { const d = Math.abs(m - prevBass) + (m > 47 ? 2 : 0) + (m < 38 ? 1 : 0); if (d < bd) { bd = d; best = m; } }
    prevBass = best;
    return best;
  }
  const jit = (x) => (human() - 0.5) * x;
  const touch = () => 0.93 + 0.14 * human();

  // ---- one bar ------------------------------------------------------------------------------------
  function genBar(tBar) {
    const I = lit;
    gridT = tBar;
    ev(tBar, (t) => colour(t, BAR * 0.45), 'pad');
    if (mode === 'coda') { genCoda(tBar); barTime += BAR; age++; return; }

    const sec = SCORE[pos.k], b = pos.bar, chords = sec.chords[b];
    lastSec = sec;
    const chordAt = (beat) => { let c = chords[0]; for (const x of chords) if (x.beat <= beat + 1e-6) c = x; return c.chord; };
    for (const c of chords) pushHarm(tBar + c.beat * BEAT, c.chord);
    if (hooks.bar) hooks.bar({ t: tBar, song, type: sec.name, bar: b, chords: chords.map((c) => ({ beat: c.beat, name: c.chord.name })), lit: I, thin, loop: loops });

    // strings
    const padLevel = (sec.pad ?? 1) * (thin ? 0.7 : 1);
    for (const c of chords) ev(tBar + c.beat * BEAT, (t) => setPad(t, c.chord, { attack: age === 0 ? 0.25 : 0.5, level: padLevel }), 'pad');

    if (!thin) {
      // bass
      const bassVel = 0.075 + 0.015 * I;
      for (const c of chords) {
        const root = bassOf(c.chord.bass), whole = c.len === BEATS;
        ev(tBar + c.beat * BEAT + jit(0.006), (t) => playBass(t, root, bassVel, c.len * BEAT * (whole ? (sec.bass === 'half' ? 0.62 : 0.9) : 0.85)));
        if (sec.bass === 'half' && whole) {
          // third beat: the root under an inverted chord, else the fifth
          const pc = c.chord.bass !== c.chord.root ? c.chord.root : c.chord.triad[2];
          const second = ladder([pc], root + 1, 1)[0];
          ev(tBar + 2 * BEAT + jit(0.006), (t) => playBass(t, second > 53 ? second - 12 : second, bassVel * 0.72, 2 * BEAT * 0.8));
        }
      }

      // the written parts: melody, answers, counter-melody, fireflies
      for (const p of sec.parts) {
        for (const n of p.bars[b]) {
          const midi = pitchOf(n);
          const strong = n.beat === 0 || n.beat === 2 || n.dur >= 1.5;
          const arch = 0.82 + 0.18 * Math.sin(Math.PI * ((b & 3) + n.beat / BEATS) / 4);         // each four-bar phrase swells and falls
          const tn = tBar + n.beat * BEAT + jit(p.kind === 'tune' ? 0.014 : 0.018);
          let vel = p.vel * (strong ? 1 : 0.82) * touch(), o;
          if (p.kind === 'tune') {
            vel *= (sec.dyn ?? 1) * (0.92 + 0.2 * I) * arch;
            o = { bright: 0.78 + 0.22 * I, pan: p.pan };
            if (!p.ring) { o.dur = n.dur * BEAT + (n.dur >= 2 ? 0.5 : BEAT * 0.7); o.rel = 0.22; }
          } else if (p.kind === 'under') {
            o = { dur: n.dur * BEAT + 0.3, rel: 0.3, bright: 0.65 + 0.35 * I, pan: p.pan };
          } else {
            o = { bright: 0.7 + 0.3 * I, pan: n.si % 2 ? 0.36 : -0.36 };          // fireflies: left and right
          }
          ev(tn, (t) => play(p.role, p.inst, t, midi, vel, o));
        }
      }

      // harp
      const lo = sec.figLo ?? 53;
      for (const [bt, idx] of FIG[sec.fig]) {
        const lad = ladder(chordAt(bt).triad, lo, 6);
        const vel = (0.125 + 0.035 * I) * (bt === 0 ? 1.1 : bt === 2 ? 0.95 : 0.8) * touch();
        ev(tBar + bt * BEAT + jit(0.012), (t) => play('arp', E.arp, t, lad[idx], vel, { bright: 0.7 + 0.3 * I, pan: -0.26, dur: BEAT * 1.6, rel: 0.35 }));
      }

      // sparkle: the lit lanterns, high above everything
      if (I >= 0.3 && sec.sparkle !== false) {
        const slots = I >= 0.6 ? [0.5, 1.5, 2.5, 3.5] : [1.5, 3.5];
        slots.forEach((bt, i) => {
          const lad = ladder(chordAt(bt).triad, 79, 5);          // G5 .. about A6: bright, never piercing
          const vel = (0.03 + 0.03 * I) * (0.85 + 0.3 * human());
          ev(tBar + bt * BEAT + jit(0.02), (t) => play('spark', E.spark, t, lad[(i * 2 + b) % 5], vel, { pan: i % 2 ? 0.5 : -0.5, bright: 0.8 + 0.2 * I }));
        });
        if (I >= 0.85 && b % 2 === 0) {
          const hl = ladder(chords[0].chord.triad, 76, 3);
          ev(tBar + BEAT, (t) => enabled && !muted.has('spark') && S.glow(IN.spark, t, mtof(hl[1 + (b / 2) % 2]), 0.012, { attack: 1.1, hold: BAR * 0.8, release: 1.0, harm: 0.08, breath: 0.6, pan: (b % 4) ? 0.4 : -0.4 }));
        }
      }
    }

    pos.bar++;
    if (pos.bar >= sec.bars) { pos = { k: (pos.k + 1) % SCORE.length, bar: 0 }; if (pos.k === 0) loops++; }
    barTime += BAR; age++;
  }

  // Afterglow after a win: the sway of the Intro on the tonic, and now and then the first bar of the theme.
  function genCoda(tBar) {
    const k = codaBar++;
    const chord = k % 4 === 2 ? CH['IVmaj7/1'] : CH.I;
    pushHarm(tBar, chord);
    if (hooks.bar) hooks.bar({ t: tBar, song, type: 'coda', bar: k, chords: [{ beat: 0, name: chord.name }], lit, thin, loop: loops });
    ev(tBar, (t) => setPad(t, chord, { attack: 0.9, release: 1.2, level: thin ? 0.6 : 0.85 }), 'pad');
    if (thin) return;
    if (k % 2 === 0) ev(tBar, (t) => playBass(t, bassOf(chord.bass), 0.07, BAR * 0.9));
    const lad = ladder(chord.triad, 62, 7);
    const fig = k % 2 === 1 ? [[0, 0], [1, 2], [2, 4]] : [[0, 5], [1.5, 3]];
    for (const [bt, i] of fig) ev(tBar + bt * BEAT + jit(0.015), (t) => play('arp', E.arp, t, lad[i], 0.13, { bright: 0.9, pan: -0.25 + 0.08 * i }));
    if (k % 2 === 1) {
      const hl = ladder(chord.triad, 81, 4);
      ev(tBar + 3 * BEAT, (t) => play('spark', E.spark, t, hl[k % 3], 0.055, { pan: 0.4 }));
    }
    if (k % 4 === 3 || (song.n === 155 && k % 2 === 1)) {
      // a memory of the theme (the last garden of all keeps remembering)
      for (const n of HEAD) ev(tBar + n.beat * BEAT + jit(0.015), (t) => play('lead', E.lead, t, pitchOf(n), 0.17, { bright: 0.85, pan: 0.1, dur: n.dur * BEAT + BEAT, rel: 0.3 }));
    }
  }

  // ---- transport ----------------------------------------------------------------------------------
  function tick(now, horizon) {
    if (mode !== 'rest') {
      let guard = 0;
      if (barTime < now - 3) barTime = now;         // the context slept: do not replay the gap
      while (barTime < horizon && guard++ < 8) genBar(barTime);
      pending.sort((a, b) => a.t - b.t);
    }
    while (pending.length && pending[0].t < horizon) {
      const e = pending.shift();
      if (e.t > now - 0.12) e.fn(Math.max(e.t, now));
    }
  }
  clock.onTick(tick);

  const prepare = () => { if (S.want) for (const [inst, lo, hi] of songNeeds()) S.want(inst, lo, hi); };
  // Where the piece goes on in a new level: the section it is about to start, or the one after the section it
  // was in. A level never starts with the Intro (that belongs to the start of the session and to the loop).
  function entry() {
    let k = pos.bar > 0 || mode === 'coda' ? (pos.k + 1) % SCORE.length : pos.k;
    if (SCORE[k].entry === false) k = (k + 1) % SCORE.length;
    return k;
  }

  function startAt(n, t) {
    releasePads(t, 0.4);
    song.n = n;
    prepare();
    pos = { k: age === 0 ? 0 : entry(), bar: 0 };
    mode = 'play'; barTime = t + 0.03; pending = []; prevVoicing = null; thin = false;
    harmLog = [{ t: -1e9, chord: CH.I, song }];
    gridT = barTime;
    padOut.gain.setTargetAtTime(1, t, 0.2);
    colour(t, 0.3);
  }

  return {
    // A hard start: the session begins (with the Intro), or the engine wakes up in another level.
    start(n, t) { startAt(n, t); },
    // Level setup: a bridge on the dominant. It lasts as long as the setup animation, so the next section of
    // the piece arrives on a downbeat when the level is ready.
    build(n, t, duration = 1.75) {
      if (mode === 'rest') { startAt(n, t); return; }
      song.n = n;
      // After a win or a tear-down only the pad sounds, so the bridge starts at once and ends exactly when the
      // level is ready. In full flow it starts on the next beat and lasts a whole number of beats.
      const still = thin || mode === 'coda';
      const tCut = still ? t + 0.03 : gridT + Math.ceil((t + 0.05 - gridT) / BEAT) * BEAT;
      const k = entry();
      cut(tCut);
      const L = still ? clamp(duration, 0.6, 8) - 0.03 : Math.max(2, Math.round(duration / BEAT)) * BEAT;
      const D = CH.V7sus;
      pushHarm(tCut, D);
      if (hooks.bar) hooks.bar({ t: tCut, song, type: 'bridge', bar: 0, chords: [{ beat: 0, name: D.name }], lit, thin: false, loop: loops, len: L });
      thin = false;
      padOut.gain.setTargetAtTime(1, tCut, 0.4);
      ev(tCut, (tt) => setPad(tt, D, { level: 0.8, attack: 0.45 }), 'pad');
      if (age >= 2) { const root = bassOf(D.bass); ev(tCut, (tt) => playBass(tt, root, 0.07, L * 0.85)); }
      if (L > 2.3) {
        // a long build: the harp climbs the dominant, one note per beat
        const lad = ladder(D.triad, 55, 8), np = Math.min(7, Math.floor((L - BEAT) / BEAT));
        for (let i = 0; i < np; i++) ev(tCut + L - (np - i + 1) * BEAT, (tt) => play('arp', E.arp, tt, lad[i], 0.1 + 0.01 * i, { bright: 0.55 + 0.4 * lit, pan: -0.26 }));
      }
      const main = SCORE[k].parts[0], first = main.bars[0][0];
      if (first && first.beat === 0) {
        // the melody instrument walks up to its first note, on the two notes of the pentatonic scale below it
        const steps = [];
        for (let si = first.si - 1; steps.length < 2; si--) if ([0, 1, 2, 4, 5].includes(mod(si, 7))) steps.unshift(si);
        const u = BEAT / 2;
        steps.forEach((si, i) => L - (2 - i) * u > 0.12 && ev(tCut + L - (2 - i) * u, (tt) => play(main.role, main.inst, tt, pitchOf({ si }), 0.17, { bright: 0.6 + 0.4 * lit, dur: u * 2, rel: 0.2, pan: main.pan })));
      }
      mode = 'play'; pos = { k, bar: 0 };
      barTime = tCut + L; gridT = tCut;
    },
    // Level removal: the music breathes out. Melody and figures stop, the pad holds.
    teardown(t, duration) {
      if (mode === 'rest') return;
      thin = true;
      cut(t + 0.1, true);
      padOut.gain.setTargetAtTime(0.7, t, clamp(duration / 2, 0.2, 0.8));
    },
    reset(t) { colour(t, 0.5); },
    setProgress(done, total, t) {
      lit = total > 0 ? clamp(done / total, 0, 1) : 0;
      if (mode !== 'rest') colour(t, 0.45);
    },
    // Resolve: everything lands on the tonic, then a quiet afterglow. `shape` is winShape(duration).
    win(t, shape = winShape()) {
      cut(t - 0.02);
      mode = 'coda'; thin = false; lit = 1;
      gridT = t;
      pushHarm(t - 0.001, CH.I);
      if (hooks.bar) hooks.bar({ t, song, type: 'win', bar: 0, chords: [{ beat: 0, name: CH.I.name }], lit, thin: false, loop: loops });
      padOut.gain.setTargetAtTime(1, t, 0.2);
      colour(t, 0.25);
      setPad(t, CH.I, { attack: 0.22, level: 1.1 });
      prevBass = 40;
      const root = bassOf(CH.I.bass);
      playBass(t, root, 0.09, shape.bloom + 0.6);
      // the bloom: tonic and fifth in the middle, the melody instrument settles on the tonic above
      const mid = ladder(CH.I.triad, 55, 3), top = ladder([CH.I.root], 72, 1)[0];
      ev(t + shape.bloom, (tt) => {
        playBass(tt, root, 0.075, BAR);
        play('counter', E.counter, tt, mid[0], 0.13, { bright: 0.9, pan: 0.3 });
        play('counter', E.counter, tt + 0.03, mid[2], 0.11, { bright: 0.9, pan: 0.3 });
        play('lead', E.lead, tt + 0.06, top, 0.2, { bright: 1, pan: 0.1 });
      });
      // the afterglow starts on a bar line after the bloom has rung
      codaBar = 1;
      barTime = t + Math.max(1, Math.ceil((shape.bloom + BEAT) / BAR)) * BAR;
    },
    // The winning move was taken back: out of the afterglow, the piece goes on with the section it was in.
    resume(t) {
      if (mode !== 'coda') return;
      cut(t);
      mode = 'play'; thin = false; pos = { ...pos, bar: 0 };
      barTime = t + 2 * BEAT; gridT = barTime;
      pushHarm(t, CH.I);
    },
    setPanel(open, t) {
      bus.stateGain.setTargetAtTime(open ? 0.5 : 1, t, open ? 0.12 : 0.3);
      bus.tone.frequency.setTargetAtTime(open ? 1300 : 19000, t, open ? 0.1 : 0.25);
    },
    setEnabled(on, t) {
      if (on === enabled) return;
      enabled = on;
      colour(t, 0.2);
      if (!on) releasePads(t, 0.2);
      else if (mode !== 'rest') setPad(t, harmAt(t).chord, { attack: 0.6 });
    },
    // ---- harmony queries for sound effects, so that they are always in key ----
    harm: harmAt,
    chordLadder(lo, count, t) { return ladder(mode === 'rest' ? CH.I.triad : harmAt(t).chord.triad, lo, count); },
    tonicLadder(lo, count) { return ladder(CH.I.triad, lo, count); },
    safeLadder(lo, count, t) { return ladder(mode === 'rest' ? PENTA : harmAt(t).chord.safe, lo, count); },
    hooks, muted,
    get song() { return song; },
    get mode() { return mode; },
    get lit() { return lit; },
    get section() { return lastSec ? `${lastSec.name}${loops ? ` (time ${loops + 1})` : ''}` : ''; },
  };
}
