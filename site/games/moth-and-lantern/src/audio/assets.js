// Generated sample data (see dsp.js): noise textures, the reverb impulse response and the instrument zones.
// Nothing here needs an AudioContext, so the engine computes it in small idle slices while the game loads and
// plays; whatever is still missing when it is asked for is computed on the spot (one zone takes a few ms).
import { makeRng } from './util.js';
import { ASSET_RATE, noiseData, impulseData, instrumentData, zoneOf, ZONE_STEP, INSTRUMENTS } from './dsp.js';

export { ASSET_RATE };

const IR_SECONDS = 3.0;

export function createAssets(seed) {
  const data = {};
  const zones = new Map();          // 'inst:zone' -> Float32Array, until the synth takes it
  const queued = new Set();
  // Each asset has its own seeded generator, so the result does not depend on when it is computed.
  const base = {
    irL: () => impulseData(IR_SECONDS, makeRng(seed + 11), ASSET_RATE),
    irR: () => impulseData(IR_SECONDS, makeRng(seed + 12), ASSET_RATE),
    white: () => noiseData(2.3, 'white', makeRng(seed + 13)),
    pink: () => noiseData(6.1, 'pink', makeRng(seed + 14)),
    pink2: () => noiseData(7.3, 'pink', makeRng(seed + 15)),
    rustle: () => noiseData(3.3, 'rustle', makeRng(seed + 16)),
  };
  const tasks = Object.keys(base).map((name) => () => { if (!data[name]) data[name] = base[name](); });
  let timer = null;
  const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 250 }) : setTimeout(fn, 30));
  function pump() {
    if (timer != null || !tasks.length || typeof setTimeout === 'undefined') return;
    timer = idle(() => { timer = null; const t = tasks.shift(); if (t) t(); pump(); });
  }
  const get = (name) => { if (!data[name]) data[name] = base[name](); return data[name]; };
  const zoneData = (inst, zone) => instrumentData(inst, zone, 20260711);      // instruments sound the same in every session

  return {
    // Compute what is queued in the background, one item per idle slice.
    warm() { pump(); },
    noise(name) { return get(name); },
    // The convolver needs its buffer at the context rate.
    impulse(sr) {
      if (sr === ASSET_RATE) return [get('irL'), get('irR')];
      return [impulseData(IR_SECONDS, makeRng(seed + 11), sr), impulseData(IR_SECONDS, makeRng(seed + 12), sr)];
    },
    // The zone for a note: { key, root, data }. `data` is handed over once (the synth keeps the AudioBuffer).
    zone(inst, midi) {
      const root = zoneOf(inst, midi), key = `${inst}:${root}`;
      return { key, root, take() { const d = zones.get(key) || zoneData(inst, root); zones.delete(key); queued.delete(key); return d; } };
    },
    // Ask for the zones of a pitch range ahead of time (background). `live`: skip when not running a timer.
    want(inst, lo, hi) {
      if (typeof setTimeout === 'undefined' || !INSTRUMENTS[inst]) return;
      for (let z = zoneOf(inst, lo); z <= zoneOf(inst, hi); z += ZONE_STEP) {
        const key = `${inst}:${z}`;
        if (queued.has(key)) continue;
        queued.add(key);
        tasks.push(() => { if (queued.has(key) && !zones.has(key)) zones.set(key, zoneData(inst, z)); });
      }
      pump();
    },
    // The synth tells which zones it already holds, so they are not computed twice.
    has(key) { queued.add(key); zones.delete(key); },
  };
}
