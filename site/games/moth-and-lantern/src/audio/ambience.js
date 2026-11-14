// Night-garden ambience. A continuous bed (wind in two decorrelated layers, leaves, distant water, a faint
// insect trill) whose levels and filters wander at random, plus sparse events on the context clock:
// cricket bouts, a night bird, wind chimes tuned to the current key. Nothing here repeats on a fixed period.
import { clamp, mtof, makeRng } from './util.js';

export function createAmbience(ctx, clock, mix, S, music, seed) {
  const bus = mix.amb;
  const bed = bus.input(0.1), mid = bus.input(0.45), far = bus.input(0.75);
  const r = makeRng(seed);
  let started = false, enabled = true;
  let wind = null;
  const next = { gust: 0, cricket: [0, 0], bird: 0, chime: 0, water: 0, trill: 0 };
  const crickets = [
    { f: 4050, pan: -0.55, rate: 0.62, until: 0, level: 0.011 },
    { f: 3620, pan: 0.5, rate: 0.71, until: 0, level: 0.008 },
  ];

  function start(t) {
    if (started) return;
    started = true;
    wind = [-1, 1].map((side) => {
      const src = S.noise(side < 0 ? 'pink' : 'pink2', t, null, side < 0 ? 0.93 : 1.06);
      const lp = S.filter('lowpass', 480, 0.5), hp = S.filter('highpass', 250, 0.5), g = S.gain(0), p = S.panner(side * 0.55);
      g.gain.setValueAtTime(0.0001, t); lp.frequency.setValueAtTime(480, t);
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(p); p.connect(bed);
      return { lp, g };
    });
    // leaves: the top of each gust
    const lsrc = S.noise('white', t, null, 0.9), lbp = S.filter('bandpass', 2900, 0.5), llp = S.filter('lowpass', 5200, 0.5), lg = S.gain(0);
    lg.gain.setValueAtTime(0.0001, t);
    lsrc.connect(lbp); lbp.connect(llp); llp.connect(lg); lg.connect(bed);
    wind.leaves = lg;
    // distant water: band of noise whose level burbles at random
    const wsrc = S.noise('pink2', t, null, 1.31), wbp = S.filter('bandpass', 1500, 1.1), wg = S.gain(0), wp = S.panner(-0.35);
    const msrc = S.noise('white', t, null, 0.71), mlp = S.filter('lowpass', 7, 0.7), mg = S.gain(0);
    wsrc.connect(wbp); wbp.connect(wg); wg.connect(wp); wp.connect(mid);
    msrc.connect(mlp); mlp.connect(mg); mg.connect(wg.gain);
    wind.water = wg; wind.waterBp = wbp; wind.waterMod = mg;
    wg.gain.setTargetAtTime(0.012, t, 2); mg.gain.setTargetAtTime(0.25, t, 2);
    // faint insect trill, far away
    const tosc = ctx.createOscillator(), tlfo = ctx.createOscillator(), tam = S.gain(0.5), tl = S.gain(0.5), tg = S.gain(0), tp = S.panner(0.3);
    tosc.frequency.value = 2950; tlfo.frequency.value = 43;
    tlfo.connect(tl); tl.connect(tam.gain); tosc.connect(tam); tam.connect(tg); tg.connect(tp); tp.connect(mid);
    tosc.start(t); tlfo.start(t);
    wind.trill = tg;
    next.gust = t + 0.01; next.water = t + 3; next.trill = t + 4;
    next.cricket = [t + r.range(2, 6), t + r.range(9, 18)];
    next.bird = t + r.range(14, 26); next.chime = t + r.range(8, 16);
  }

  function tick(now, horizon) {
    if (!started) return;
    // Wind: a random walk of gusts. Each side follows the same gust with its own variation.
    while (next.gust < horizon) {
      // Each pass draws the next point of a random walk; levels and filters glide there (ramps in dB),
      // so a gust swells and dies slowly.
      const s = Math.pow(r(), 1.6);                 // mostly calm, sometimes a real gust
      const t1 = next.gust + r.range(2.5, 6.5);
      wind.forEach((w) => {
        const k = clamp(s + r.range(-0.15, 0.15), 0, 1);
        w.g.gain.exponentialRampToValueAtTime(0.04 + 0.085 * k, t1);
        w.lp.frequency.exponentialRampToValueAtTime(380 + 900 * k, t1);
      });
      wind.leaves.gain.exponentialRampToValueAtTime(0.003 + 0.02 * s * s, t1 + 0.5);
      wind.gust = s;
      next.gust = t1;
    }
    while (next.water < horizon) {
      const t = next.water;
      wind.water.gain.setTargetAtTime(r.range(0.007, 0.016), t, 3);
      wind.waterBp.frequency.setTargetAtTime(r.range(1200, 1900), t, 4);
      next.water = t + r.range(5, 11);
    }
    while (next.trill < horizon) {
      const t = next.trill;
      wind.trill.gain.setTargetAtTime(r.chance(0.45) ? r.range(0.0012, 0.003) : 0, t, 4);
      next.trill = t + r.range(12, 30);
    }
    // Crickets: each one sings in bouts of regular chirps, then goes quiet. (While the ambience is switched off
    // the bed keeps running silently, but no events are made.)
    crickets.forEach((c, i) => {
      while (next.cricket[i] < horizon) {
        const t = next.cricket[i];
        if (t > c.until) { c.until = t + r.range(5, 16); c.f2 = c.f * r.range(0.97, 1.03); c.rate2 = c.rate * r.range(0.9, 1.12); c.pulses = r.int(2, 4); }
        if (enabled) chirp(t, c);
        next.cricket[i] = t + c.rate2 * r.range(0.96, 1.05);
        if (next.cricket[i] > c.until) next.cricket[i] += r.range(7, 28);
      }
    });
    while (next.bird < horizon) { if (enabled) bird(next.bird); next.bird += r.range(26, 60); }
    while (next.chime < horizon) { if (enabled) chime(next.chime); next.chime += r.range(16, 40); }
  }
  clock.onTick(tick);

  function chirp(t, c) {
    const n = c.pulses, period = 0.034;
    const v = S.voice(far, c.level * r.range(0.7, 1.1), c.pan);
    const env = S.gain(0), o = S.osc('sine', c.f2, t, t + n * period + 0.03);
    for (let i = 0; i < n; i++) {
      const tp = t + i * period;
      env.gain.setValueAtTime(0, tp); env.gain.linearRampToValueAtTime(0.6 + 0.4 * i / n, tp + 0.007); env.gain.linearRampToValueAtTime(0, tp + 0.02);
    }
    o.connect(env); env.connect(v.in);
    S.release(v, o);
  }

  // A night bird, far off: either a low two-note hoot or a short whistled figure, both on notes of the key.
  function bird(t) {
    if (r.chance(0.5)) {
      const m = music.tonicLadder(62, 3, t)[r.int(0, 1)];
      const pan = r.range(-0.7, 0.7);
      [[0, 0.3, 1], [0.48, 0.2, 0.8], [0.74, 0.42, 1]].forEach(([dt, len, lv]) => {
        S.glow(far, t + dt, mtof(m), 0.026 * lv, { attack: 0.07, hold: len * 0.4, release: len * 0.25, glide: 1.035, glideTime: len, harm: 0.18, pan });
      });
    } else {
      const lad = music.safeLadder(88, 6, t);
      const pan = r.range(-0.7, 0.7);
      let tt = t, i = r.int(1, 3);
      const n = r.int(3, 5);
      for (let k = 0; k < n; k++) {
        const len = r.range(0.07, 0.14);
        S.glow(far, tt, mtof(lad[i]), 0.0095, { attack: 0.02, hold: len * 0.5, release: 0.03, glide: r.chance(0.5) ? 0.94 : 1.05, glideTime: len, harm: 0.03, pan });
        tt += len + r.range(0.05, 0.16);
        i = clamp(i + r.pick([-1, 1, 1, 2, -2]), 0, 5);
      }
    }
  }

  // Wind chimes, tuned to the key. More notes when the wind is up.
  function chime(t) {
    const lad = music.safeLadder(81, 6, t);
    const n = 1 + Math.round((wind.gust || 0) * 2) + (r.chance(0.5) ? 1 : 0);
    const pan = r.range(-0.6, 0.6);
    let tt = t;
    for (let k = 0; k < n; k++) {
      S.tone('glass', far, tt, r.pick(lad), r.range(0.011, 0.022), { bright: 0.85, pan: pan + r.range(-0.15, 0.15) });
      tt += r.range(0.14, 0.7);
    }
  }

  return { start, setEnabled(on) { enabled = !!on; } };
}
