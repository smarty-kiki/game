// Tiny event bus. It is the only link between the game and the audio engine.
// The event names and payloads are listed in gauntlet/BRIEF.md ("Event contract"). Keep that list and the code in step.
const listeners = new Map();

export const bus = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => bus.off(type, fn);
  },
  off(type, fn) {
    listeners.get(type)?.delete(fn);
  },
  emit(type, data = {}) {
    for (const key of [type, '*']) {
      const set = listeners.get(key);
      if (!set) continue;
      for (const fn of [...set]) {
        try { fn(data, type); } catch (err) { console.error(`bus listener for "${type}" failed`, err); }
      }
    }
  },
};
