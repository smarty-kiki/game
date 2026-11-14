// First-run teaching: one quiet line under the garden, for moving, pushing and undoing, in that order.
// A hint shows only until the player has done the thing, then never again (saved in settings.hints).
// It follows the input in use (keys or touch), hides while a panel is open, and listens only to bus events.
// Deep links (?level=N, the test hook) skip the teaching, like the title card; ?hints=1 forces it, ?hints=0 stops it.
import { HINTS } from './help-copy.js';

const UNDO_SHOW_MS = 14000;      // the undo line rests after this long ...
const UNDO_SHOWS = 2;            // ... and is retired for good after it has been offered this many times

export function createHints({ bus, store, root, dock, isTouch }) {
  const q = new URLSearchParams(location.search);
  const enabled = q.get('hints') === '1' || (q.get('hints') !== '0' && !q.has('level'));
  const saved = store.settings.hints || {}, legacy = store.settings.hintSeen === true;
  const done = { move: legacy || !!saved.move, push: legacy || !!saved.push, undo: legacy || !!saved.undo };
  let shown = saved.shown | 0, stage = null, mode = isTouch() ? 'touch' : 'keys';
  let ready = false, won = false, pushed = false, rested = false, panel = false, timer = 0, restTimer = 0;
  if (!enabled || (done.move && done.push && done.undo)) return { active: false };

  const save = () => store.setSetting('hints', { ...done, shown });
  const cap = (s) => `<kbd>${s}</kbd>`;
  const LANTERN = '<svg class="hint-art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="8" y="5.500" width="8" height="11" rx="3.600"/><path d="M9.500 3.500h5M6.500 20.500h11" /><circle cx="12" cy="11" r="1.300" fill="currentColor" stroke="none"/></svg>';
  function html(name) {
    const h = HINTS[name];
    if (name === 'move') {
      return mode === 'keys'
        ? `<span class="hint-caps">${h.keys.caps.map(cap).join('')}</span><span>${h.keys.text}</span><span class="hint-dim">${h.keys.aside}</span>`
        : `<span class="hint-swipe" aria-hidden="true"><i></i></span><span>${h.touch.text}</span><span class="hint-dim">${h.touch.aside}</span>`;
    }
    if (name === 'push') return `${LANTERN}<span>${h.text}</span>`;
    return mode === 'keys' ? h.keys.map((k) => `<span class="hint-pair">${cap(k.cap)}<span>${k.text}</span></span>`).join('') : `<span>${h.touch.text}</span>`;
  }

  // Which line belongs on screen right now.
  function wanted() {
    if (!ready || won || panel) return null;
    if (!done.move) return 'move';
    if (!done.push) return 'push';
    if (!done.undo && pushed && !rested) return 'undo';
    return null;
  }
  function refresh(delay = 0) {
    clearTimeout(timer);
    const target = wanted();
    if (target === stage) return;
    if (stage) { hide(); delay = Math.max(delay, 420); }
    if (target) timer = setTimeout(() => { if (wanted() === target) show(target); }, delay);
  }
  function show(name) {
    stage = name; root.className = ''; root.dataset.stage = name; root.innerHTML = html(name);
    void root.offsetWidth; root.classList.add('on');
    if (name === 'undo') {
      for (const act of ['undo', 'reset']) dock.querySelector(`[data-act="${act}"]`)?.classList.add('teach');
      clearTimeout(restTimer); restTimer = setTimeout(restUndo, UNDO_SHOW_MS);
    }
  }
  function hide() {
    if (stage === 'undo') { clearTimeout(restTimer); for (const b of dock.querySelectorAll('.teach')) b.classList.remove('teach'); }
    stage = null; root.classList.remove('on', 'done');
  }
  // The undo line was offered and not needed: let it rest, and retire it after a couple of offers.
  function restUndo() {
    if (done.undo) return;
    rested = true; shown++;
    if (shown >= UNDO_SHOWS) done.undo = true;
    save(); refresh();
  }
  function complete(name) {
    if (done[name]) return;
    done[name] = true; save();
    if (stage !== name) return refresh(600);
    root.classList.add('done');                       // a short warm glow says "that's it"
    clearTimeout(timer); timer = setTimeout(() => { hide(); refresh(name === 'push' ? 1500 : 500); }, 650);
  }

  bus.on('level:build', () => { ready = false; won = false; pushed = false; rested = false; refresh(); });
  bus.on('level:teardown', () => { ready = false; refresh(); });
  bus.on('level:ready', () => { ready = true; refresh(700); });
  bus.on('move:step', () => complete('move'));
  bus.on('move:push', () => { pushed = true; if (!done.move) { done.move = true; if (stage === 'move') hide(); } if (!done.push) complete('push'); else refresh(1500); });
  bus.on('undo', () => complete('undo'));
  bus.on('reset', () => complete('undo'));
  bus.on('win', () => { won = true; if (stage === 'undo') restUndo(); else refresh(); });
  bus.on('ui:open', () => { panel = true; refresh(); });
  bus.on('ui:close', () => { panel = false; refresh(500); });

  const setMode = (m) => { if (m === mode) return; mode = m; if (stage && root.classList.contains('on') && !root.classList.contains('done')) root.innerHTML = html(stage); };
  addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) setMode('keys'); }, true);
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') setMode('touch'); }, true);

  return { active: true };
}
