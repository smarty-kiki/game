// Small math / easing / spring helpers shared by every module. No dependencies.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp01((v - a) / (b - a));
export const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mod = (n, m) => ((n % m) + m) % m;

// Frame-rate independent exponential approach. `halfLife`-ish: tau is the time constant in seconds.
export const damp = (cur, target, tau, dt) => target + (cur - target) * Math.exp(-dt / tau);

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inBack: (t, s = 1.70158) => t * t * ((s + 1) * t - s),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  // Decaying wobble that ends at 1: used for "settle" after a landing.
  outElastic: (t, p = 0.38) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -9 * t) * Math.sin(((t - p / 4) * TAU) / p) + 1),
  // 0 -> 1 -> 0 arch.
  arch: (t) => Math.sin(Math.PI * clamp01(t)),
};

// Deterministic PRNG (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap stable hash of two integers -> 0..1.
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Smooth 1D value noise, period-free. Good for flicker and idle drift.
export function noise1(t) {
  const i = Math.floor(t), f = t - i;
  const a = hash2(i, 17), b = hash2(i + 1, 17);
  return a + (b - a) * f * f * (3 - 2 * f);
}

// Damped spring toward a target. Stable for dt up to ~1/20 s (callers clamp dt).
export class Spring {
  constructor(value = 0, stiffness = 120, damping = 18) {
    this.v = value; this.target = value; this.vel = 0; this.k = stiffness; this.c = damping;
  }
  set(value) { this.v = value; this.target = value; this.vel = 0; return this; }
  step(dt) {
    // Semi-implicit Euler in two sub-steps for stability at low frame rates.
    const h = dt * 0.5;
    for (let i = 0; i < 2; i++) {
      this.vel += (this.k * (this.target - this.v) - this.c * this.vel) * h;
      this.v += this.vel * h;
    }
    return this.v;
  }
  get settled() { return Math.abs(this.target - this.v) < 1e-4 && Math.abs(this.vel) < 1e-3; }
}

// Shortest signed angular difference b - a.
export const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
