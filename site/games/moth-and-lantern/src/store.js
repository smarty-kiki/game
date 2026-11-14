// Persistence in localStorage: solved levels with best move counts, last level, settings.
// With ?fresh=1 nothing is read and nothing is written, so test runs never pollute real progress.

const KEY = 'moth-and-lantern:v1';
const DEFAULTS = { best: {}, last: 1, turn: null, settings: { music: true, sfx: true, view: 'iso', hintSeen: false } };

export function createStore({ fresh = false } = {}) {
  let data = structuredCloneSafe(DEFAULTS);
  if (!fresh) {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        data = { ...data, ...p, settings: { ...data.settings, ...(p.settings || {}) }, best: { ...(p.best || {}) } };
      }
    } catch { /* private mode or broken JSON: start clean */ }
  }
  let timer = 0;
  const save = () => {
    if (fresh) return;
    clearTimeout(timer);
    timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ } }, 120);
  };
  return {
    get last() { return data.last; },
    setLast(n) { data.last = n; if (data.turn && data.turn.n !== n) data.turn = null; save(); },
    // The player's own quarter turn (0..3) of the level that is open. It comes back with that level after a
    // reload and is forgotten when another level opens (every level opens in its own predictable orientation).
    turn(n) { const t = data.turn; return t && t.n === n && t.rot >= 0 && t.rot <= 3 ? t.rot | 0 : null; },
    setTurn(n, rot) { data.turn = rot == null ? null : { n, rot }; save(); },
    best(n) { return data.best[n] ?? null; },
    isSolved(n) { return data.best[n] != null; },
    solvedCount() { return Object.keys(data.best).length; },
    // Returns true when this is a new best.
    recordSolve(n, moves) { const old = data.best[n]; if (old == null || moves < old) { data.best[n] = moves; save(); return true; } return false; },
    get settings() { return data.settings; },
    setSetting(k, v) { data.settings[k] = v; save(); },
  };
}

function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }
