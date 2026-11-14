// Generated sample data, computed with plain arithmetic (no Web Audio, so it also runs in a worker):
//   - noise textures (white, pink, paper rustle)
//   - the reverb impulse response (early reflections from the garden walls, a bright but smooth tail)
//   - the instruments: every struck or plucked note of the game is a small physical model, rendered once per
//     pitch zone as a sum of decaying partials (inharmonic where the material is), with beating pairs and a
//     hammer, nail or finger noise at the start. Notes are then played from these buffers.
import { makeRng, mtof, clamp } from './util.js';

export const ASSET_RATE = 48000;

export function noiseData(seconds, color, rng, sr = ASSET_RATE) {
  const len = Math.floor(sr * seconds);
  const d = new Float32Array(len);
  if (color === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = rng() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (color === 'rustle') {
    // Paper: noise broken into many tiny grains of random size, like a crinkling sheet.
    let g = 0, target = 0, left = 0;
    for (let i = 0; i < len; i++) {
      if (left <= 0) { left = Math.floor(sr * (0.0015 + rng() * rng() * 0.02)); target = rng() < 0.45 ? 0.08 : rng(); }
      left--;
      g += (target - g) * 0.02;
      d[i] = (rng() * 2 - 1) * g;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = rng() * 2 - 1;
  }
  // Make the loop point seamless.
  const x = Math.floor(sr * 0.05);
  for (let i = 0; i < x; i++) { const k = i / x; d[len - x + i] = d[len - x + i] * (1 - k) + d[i] * k; }
  return d;
}

// One channel of the reverb. A walled garden at night: a handful of early reflections in the first 90 ms,
// then a diffuse tail in three bands with their own decay times (the top dies first but is not cut off,
// so the tail stays airy). Unit energy.
export function impulseData(seconds, rng, sr = ASSET_RATE) {
  const len = Math.floor(sr * seconds);
  const d = new Float32Array(len);
  const pre = Math.floor(sr * 0.011);
  const kLow = 1 - Math.exp(-2 * Math.PI * 650 / sr), kMid = 1 - Math.exp(-2 * Math.PI * 3400 / sr), kTop = 1 - Math.exp(-2 * Math.PI * 11000 / sr);
  const dLow = Math.exp(-6.91 / 2.5 / sr), dMid = Math.exp(-6.91 / 2.05 / sr), dHigh = Math.exp(-6.91 / 1.2 / sr);
  const rise = Math.exp(-1 / (0.035 * sr));
  let l1 = 0, l2 = 0, l3 = 0, eL = 1, eM = 1, eH = 1, hold = 1;
  for (let i = pre; i < len; i++) {
    const w = rng() * 2 - 1;
    l3 += kTop * (w - l3); l1 += kLow * (l3 - l1); l2 += kMid * (l3 - l2);
    d[i] = (l1 * 1.5 * eL + (l2 - l1) * 1.25 * eM + (l3 - l2) * 1.0 * eH) * (1 - hold);
    eL *= dLow; eM *= dMid; eH *= dHigh; hold *= rise;
  }
  // early reflections: short, slightly soft pulses, denser and weaker with time
  let t = 0.004;
  for (let k = 0; k < 13; k++) {
    t += 0.0025 + rng() * (0.004 + k * 0.0008);
    const i = pre + Math.floor(t * sr);
    const width = 5 + Math.floor(k * 0.8 + rng() * 3);
    const amp = (rng() < 0.5 ? -1 : 1) * 0.085 * Math.exp(-t * 22) * (0.6 + 0.8 * rng());
    for (let j = 0; j < width && i + j < len; j++) d[i + j] += amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * (j + 0.5) / width));
  }
  let mean = 0;
  for (let i = 0; i < len; i++) mean += d[i];
  mean /= len;
  let e = 0;
  for (let i = 0; i < len; i++) { d[i] -= mean; e += d[i] * d[i]; }
  const k = 1 / Math.sqrt(e);
  const fade = Math.floor(sr * 0.3);
  for (let i = 0; i < len; i++) d[i] *= k * (i > len - fade ? (len - i) / fade : 1);
  return d;
}

// ---- instruments -------------------------------------------------------------------------------------
// Zones: one rendered note every 4 semitones; a note is played from the nearest zone at a slightly changed speed.
export const INSTRUMENTS = {
  felt: { lo: 28, hi: 100 },      // felt-hammer piano: soft, round, a little thud of the action
  harp: { lo: 36, hi: 100 },      // nylon string, plucked
  kalimba: { lo: 48, hi: 100 },   // metal tine on a wooden box
  wood: { lo: 40, hi: 96 },       // small wooden bar, soft mallet
  glass: { lo: 52, hi: 108 },     // struck glass / celesta bar with slow beating
};
export const ZONE_STEP = 4;
export const zoneOf = (inst, midi) => {
  const r = INSTRUMENTS[inst];
  return clamp(Math.round(midi / ZONE_STEP) * ZONE_STEP, r.lo, r.hi);
};

// Adds a * exp(-t/tau) * sin(2 pi f t + ph) to d (a rotating phasor: four multiplications per sample).
function addMode(d, sr, f, a, tau, ph = 0) {
  if (f >= sr * 0.42 || a <= 0) return;
  const w = 2 * Math.PI * f / sr, r = Math.exp(-1 / (tau * sr));
  const c = Math.cos(w) * r, s = Math.sin(w) * r;
  let re = Math.cos(ph) * a, im = Math.sin(ph) * a;
  const n = Math.min(d.length, Math.ceil(tau * sr * Math.log(Math.max(a, 1e-6) / 2e-5)));
  for (let i = 0; i < n; i++) {
    d[i] += im;
    const t = re * c - im * s; im = re * s + im * c; re = t;
  }
}

// Adds a short burst of band-limited noise (hammer felt, finger, nail, mallet).
function addBurst(d, sr, rng, amp, tau, lp, hp, attack = 0.0004) {
  const kl = 1 - Math.exp(-2 * Math.PI * lp / sr), kh = 1 - Math.exp(-2 * Math.PI * hp / sr);
  const n = Math.min(d.length, Math.ceil(tau * sr * 9));
  const dec = Math.exp(-1 / (tau * sr)), ar = Math.exp(-1 / (attack * sr));
  let a1 = 0, a2 = 0, b = 0, e = 1, h = 1;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    a1 += kl * (w - a1); a2 += kl * (a1 - a2); b += kh * (a2 - b);
    d[i] += (a2 - b) * amp * e * (1 - h);
    e *= dec; h *= ar;
  }
}

const RECIPES = {
  // Felt piano. Slightly stretched partials, two strings per note a hair apart (slow beating, two-stage decay),
  // a hammer that is soft (felt strip) and strikes at 1/7 of the string, the knock of the key bed.
  felt(m, rng, sr) {
    const f0 = mtof(m);
    const tau1 = clamp(0.82 * Math.pow(261.6 / f0, 0.6), 0.2, 2.5);
    const d = new Float32Array(Math.floor(sr * Math.min(3.3, tau1 * 4.4 + 0.25)));
    const B = clamp(0.00015 * Math.pow(2, (m - 60) / 11), 0.00004, 0.004);
    const soft = 4600 + 1800 * clamp((m - 48) / 36, 0, 1);
    for (let n = 1; n <= 40; n++) {
      const fn = n * f0 * Math.sqrt(1 + B * n * n);
      if (fn > 8600) break;
      const amp = Math.pow(n, -0.9) * (0.25 + 0.75 * Math.abs(Math.sin(Math.PI * n / 7.3))) / Math.sqrt(1 + Math.pow(fn / soft, 1.7));
      const tau = Math.max(0.04, tau1 / (1 + 0.12 * Math.pow(n - 1, 1.1)));
      const cents = (0.45 + 0.8 * rng()) * (m < 52 ? 0.5 : 1);
      addMode(d, sr, fn * Math.pow(2, -cents / 2400), amp * 0.62, tau);
      addMode(d, sr, fn * Math.pow(2, cents / 2400), amp * 0.38, tau * 1.6, rng() * 0.5);
    }
    addMode(d, sr, 92, 0.05, 0.035); addMode(d, sr, 151, 0.04, 0.028);          // key bed
    addBurst(d, sr, rng, 0.5, 0.011, 1500, 250, 0.0012);                          // felt on the string
    addBurst(d, sr, rng, 0.22, 0.005, 7500, 2400);                                // the soft edge of the attack
    return shape(d, sr, 0.0022);
  },
  // Nylon harp string plucked a fifth of the way along: a clear start that mellows quickly.
  harp(m, rng, sr) {
    const f0 = mtof(m);
    const tau1 = clamp(0.95 * Math.pow(261.6 / f0, 0.55), 0.22, 2.6);
    const d = new Float32Array(Math.floor(sr * Math.min(3.0, tau1 * 4.4 + 0.2)));
    for (let n = 1; n <= 48; n++) {
      const fn = n * f0 * Math.sqrt(1 + 0.00003 * n * n);
      if (fn > 9500) break;
      const amp = (0.16 + 0.84 * Math.abs(Math.sin(Math.PI * n * 0.19))) / Math.pow(n, 1.0);
      const tau = Math.max(0.035, tau1 / (1 + 0.09 * Math.pow(n - 1, 1.2)));
      addMode(d, sr, fn, amp * 0.76, tau);
      addMode(d, sr, fn * Math.pow(2, 0.6 / 1200), amp * 0.24, tau * 1.35, rng());
    }
    addMode(d, sr, 210, 0.035, 0.03);                                             // sound box
    addBurst(d, sr, rng, 0.28, 0.0035, 6000, 1500);                                // finger leaving the string
    return shape(d, sr, 0.0007);
  },
  // Kalimba: a tine (fundamental, a soft octave, the high clang of the bar that dies at once) on a wooden box.
  kalimba(m, rng, sr) {
    const f0 = mtof(m);
    const tau1 = clamp(0.62 * Math.pow(440 / f0, 0.45), 0.18, 1.5);
    const d = new Float32Array(Math.floor(sr * Math.min(2.2, tau1 * 4.6 + 0.15)));
    const beat = 0.35 + 0.5 * rng();
    addMode(d, sr, f0, 0.66, tau1); addMode(d, sr, f0 + beat, 0.3, tau1 * 1.25, 0.3);
    addMode(d, sr, f0 * 2.0, 0.36, tau1 * 0.66); addMode(d, sr, f0 * 3.01, 0.2, tau1 * 0.48); addMode(d, sr, f0 * 4.02, 0.08, tau1 * 0.33); addMode(d, sr, f0 * 5.03, 0.04, tau1 * 0.25);
    addMode(d, sr, f0 * 5.87, 0.3, 0.13 + 0.04 * rng()); addMode(d, sr, f0 * 9.3, 0.12, 0.06); addMode(d, sr, f0 * 16.6, 0.05, 0.025);
    addMode(d, sr, 188, 0.1, 0.03); addMode(d, sr, 415, 0.075, 0.024);            // the box
    addBurst(d, sr, rng, 0.5, 0.003, 5000, 1300);                                // thumb nail
    return shape(d, sr, 0.0005);
  },
  // Small wooden bar with a soft mallet: short, dry, hollow.
  wood(m, rng, sr) {
    const f0 = mtof(m);
    const tau1 = clamp(0.26 * Math.pow(440 / f0, 0.55), 0.07, 0.75);
    const d = new Float32Array(Math.floor(sr * Math.min(1.5, tau1 * 5 + 0.12)));
    addMode(d, sr, f0, 0.9, tau1); addMode(d, sr, f0 * 1.004, 0.2, tau1 * 0.8, 0.4);
    addMode(d, sr, f0 * 3.93, 0.5, tau1 * 0.42); addMode(d, sr, f0 * 9.2, 0.17, tau1 * 0.2); addMode(d, sr, f0 * 16.1, 0.06, tau1 * 0.1);
    addMode(d, sr, f0 * 0.5, 0.1, tau1 * 0.4);                                    // the resonator tube under the bar
    addBurst(d, sr, rng, 0.36, 0.004, 3000, 500);                                 // mallet
    return shape(d, sr, 0.0006);
  },
  // Struck glass: the partials of a free bar (1 : 2.76 : 5.4 : 8.9), each one a pair a little apart, so the
  // note shimmers slowly as it rings.
  glass(m, rng, sr) {
    const f0 = mtof(m);
    const tau1 = clamp(1.05 * Math.pow(660 / f0, 0.5), 0.3, 2.2);
    const d = new Float32Array(Math.floor(sr * Math.min(3.0, tau1 * 4.2 + 0.15)));
    const hi = clamp(1.25 - (m - 60) / 60, 0.45, 1.2);                            // high notes carry less on top
    for (const [r, a, k] of [[1, 1, 1], [2.756, 0.6 * hi, 0.85], [5.404, 0.32 * hi, 0.62], [8.933, 0.15 * hi, 0.42], [13.34, 0.07 * hi, 0.28]]) {
      const f = f0 * r;
      if (f > 11500) break;
      const beat = (0.35 + 0.9 * rng()) * (r === 1 ? 1 : 1.7);
      addMode(d, sr, f - beat / 2, a * 0.6, tau1 * k); addMode(d, sr, f + beat / 2, a * 0.4, tau1 * k * 1.15, rng() * 0.8);
    }
    addMode(d, sr, f0 * 0.5, 0.05, tau1 * 0.3);
    addBurst(d, sr, rng, 0.2, 0.002, 9000, 3000);                                 // the tap
    return shape(d, sr, 0.0005);
  },
};

// Soft onset, faded end, peak at 0.9.
function shape(d, sr, onset) {
  const n = d.length, a = Math.max(2, Math.floor(onset * sr)), fade = Math.floor(n * 0.14);
  for (let i = 0; i < a; i++) d[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / a);
  let peak = 0;
  for (let i = 0; i < n; i++) { if (i > n - fade) d[i] *= (n - i) / fade; const v = Math.abs(d[i]); if (v > peak) peak = v; }
  const k = 0.9 / (peak || 1);
  for (let i = 0; i < n; i++) d[i] *= k;
  return d;
}

// One zone of one instrument. Deterministic for a given seed.
export function instrumentData(inst, zone, seed, sr = ASSET_RATE) {
  return RECIPES[inst](zone, makeRng(seed * 31 + zone * 977 + inst.length * 7 + inst.charCodeAt(0)), sr);
}
