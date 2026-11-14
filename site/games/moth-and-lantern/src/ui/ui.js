// The interface outside the canvas: HUD, dock buttons, toast, win banner, panels (garden chooser, help and credits).
// The chooser lives in chooser.js (+ mini.js), first-run hints in hints.js, sheet gestures in sheet.js, help words in help-copy.js.
// It never touches game state directly: it calls the `actions` that main.js wires up and exposes `hud`
// for the game to report into. Emits the ui:* bus events for the audio engine.
import { ICONS } from './icons.js';
import { createChooser } from './chooser.js';
import { createHints } from './hints.js';
import { focusables, sheetDrag } from './sheet.js';
import * as camera from '../render/camera.js';      // only for levelTurn (the orientation a garden opens in)
import { HELP_LEAD, KEYS, GESTURES, TOUCH_NOTE, MOUSE_NOTE, UP_NOTE, CREDITS } from './help-copy.js';

const $ = (id) => document.getElementById(id);
const LABELS = { undo: '撤销', reset: '重来', view: '视角', zoomout: '缩小', zoomin: '放大', prev: '上一座', next: '下一座', levels: '庭园', sound: '声音', help: '帮助', more: '更多' };

export function createUI({ bus, store }) {
  const actions = {};                       // filled by main.js
  const dock = $('dock'), hudEl = $('hud'), toastEl = $('toast'), winEl = $('win'), scrim = $('scrim');
  const panels = { levels: $('panel-levels'), help: $('panel-help') };
  let panel = null, toastTimer = 0, winTimer = 0, current = 1, lampCount = -1;
  const shown = { moves: -1, pushes: -1, done: -1 };
  const coarse = () => matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  // Three questions about the device: is the dock in its touch layout (bar at the thumb), is the pointer a finger,
  // and are panels shown as bottom sheets. The same queries are used in ui.css and panels.css.
  const LAND = '(max-height: 520px) and (orientation: landscape)';
  const touchLayout = matchMedia(`(max-width: 760px), (pointer: coarse), ${LAND}`);
  const isTouch = () => matchMedia('(pointer: coarse)').matches;
  const isSheet = () => matchMedia(`(max-width: 760px), ${LAND}`).matches;

  // ---- icons and labels
  for (const b of document.querySelectorAll('[data-act]')) {
    const act = b.dataset.act, icon = ICONS[b.dataset.icon || act];
    if (icon && !b.classList.contains('hud-num') && !('plain' in b.dataset)) b.innerHTML = icon + (b.closest('#dock') && LABELS[act] ? `<span class="lbl">${LABELS[act]}</span>` : '');
  }

  // ---- dock: one list in the page, in reading order. The touch layout keeps the everyday controls in the bar
  // and folds the buttons marked data-tray into the tray behind "More".
  const bar = $('dock-bar'), tray = $('tray');
  const trayItems = [...dock.querySelectorAll('[data-tray]')], trayHome = trayItems.map((b) => b.nextElementSibling);
  function arrangeDock() {
    const touch = touchLayout.matches;
    if (touch === dock.classList.contains('touch')) return;
    dock.classList.toggle('touch', touch);
    if (touch) for (const b of trayItems) tray.appendChild(b);
    else { for (let i = trayItems.length - 1; i >= 0; i--) bar.insertBefore(trayItems[i], trayHome[i]); setTray(false); }
  }
  arrangeDock();
  touchLayout.addEventListener?.('change', arrangeDock);
  addEventListener('resize', arrangeDock); addEventListener('orientationchange', arrangeDock);   // before main.js measures the layout

  // ---- buttons
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'undo' && e.detail !== 0) return;          // pointer presses are handled below (hold to repeat)
    run(act);
    if (e.detail !== 0) b.blur();
  });
  // Undo button: one press is one undo. Held down, it starts to repeat after 450 ms and then speeds up.
  const undoBtn = dock.querySelector('[data-act="undo"]');
  let undoTimer = 0, undoGap = 0;
  const undoStop = () => { clearTimeout(undoTimer); undoTimer = 0; };
  const undoTick = () => { actions.undo?.(); undoGap = Math.max(66, undoGap * 0.84); undoTimer = setTimeout(undoTick, undoGap); };
  undoBtn.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault(); undoBtn.setPointerCapture?.(e.pointerId);
    actions.gesture?.(); actions.undo?.(); undoStop(); undoGap = 200; undoTimer = setTimeout(undoTick, 450);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) undoBtn.addEventListener(ev, undoStop);
  bus.on('undo:empty', undoStop); addEventListener('blur', undoStop);
  dock.addEventListener('contextmenu', (e) => e.preventDefault());

  function run(act) {
    actions.gesture?.();
    if (act === 'more') return setTray(!dock.classList.contains('open'));
    if (act === 'close') return close();
    if (act === 'levels' || act === 'help') return toggle(act);
    if (act === 'sound') return toggleSound();
    if (panel && (act === 'prev' || act === 'next')) return;
    actions[act]?.();
  }
  function setTray(on) { dock.classList.toggle('open', on); dock.querySelector('[data-act="more"]').setAttribute('aria-expanded', on); if (on) bus.emit('ui:hover', {}); }
  scrim.addEventListener('click', () => close());

  // ---- sound
  function syncSound() {
    const { music, sfx } = store.settings, b = dock.querySelector('[data-act="sound"]');
    b.innerHTML = (music || sfx ? ICONS.sound : ICONS.soundOff) + `<span class="lbl">${LABELS.sound}</span>`;
    b.classList.toggle('off', !(music || sfx));
    $('opt-music').checked = !!music; $('opt-sfx').checked = !!sfx;
  }
  function setSound(music, sfx) { store.setSetting('music', music); store.setSetting('sfx', sfx); syncSound(); actions.sound?.(music, sfx); }
  function toggleSound() { const { music, sfx } = store.settings, on = !(music || sfx); setSound(on, on); toast(on ? '声音已开' : '声音已关'); }
  $('opt-music').addEventListener('change', (e) => setSound(e.target.checked, store.settings.sfx));
  $('opt-sfx').addEventListener('change', (e) => setSound(store.settings.music, e.target.checked));
  syncSound();

  // ---- toast
  function toast(text) { toastEl.textContent = text; toastEl.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1150); }

  // ---- panels: one at a time, over a scrim. Opening moves the focus inside and keeps it there (Tab is trapped in
  // key()); closing gives it back to a keyboard user. On phones a panel is a bottom sheet that also closes by
  // swipe-down, and the browser's Back button closes a panel instead of leaving the game.
  let restore = null, histOn = false, popSkip = 0;
  function open(name) {
    if (panel === name) return;
    if (panel) { panels[panel].classList.remove('on'); if (panel === 'levels') chooser.close(); }
    else { const a = document.activeElement; restore = a && a !== document.body && a.matches?.(':focus-visible') ? a : null; }
    setTray(false);
    panel = name; scrim.classList.add('on');
    const p = panels[name]; p.style.removeProperty('--drag'); p.classList.remove('dragging'); p.classList.add('on');
    hudEl.inert = dock.inert = true;
    if (name === 'levels') chooser.open(current);
    else {
      const body = $('help-body'); body.classList.toggle('touch-first', isTouch()); body.scrollTop = 0;
      $('help-also').textContent = isTouch() ? TOUCH_NOTE : MOUSE_NOTE;
      p.focus({ preventScroll: true });
    }
    if (!histOn) { try { history.pushState({ mothPanel: true }, ''); histOn = true; } catch { /* no history here (sandboxed frame) */ } }
    bus.emit('ui:open', { panel: name });
  }
  function close(fromBack = false) {
    if (!panel) { setTray(false); return false; }
    const was = panel; panels[panel].classList.remove('on', 'dragging'); scrim.classList.remove('on'); scrim.style.opacity = ''; panel = null;
    if (was === 'levels') chooser.close();
    hudEl.inert = dock.inert = false;
    document.activeElement?.blur?.();
    if (restore && restore.isConnected) restore.focus({ preventScroll: true });
    restore = null;
    if (histOn) { histOn = false; if (fromBack !== true) { popSkip++; try { history.back(); } catch { popSkip--; } } }
    bus.emit('ui:close', { panel: was });
    return true;
  }
  function toggle(name) { if (panel === name) close(); else open(name); }
  addEventListener('popstate', () => { if (popSkip > 0) { popSkip--; return; } histOn = false; if (panel) close(true); });
  try { if (history.state && history.state.mothPanel) { popSkip++; history.back(); } } catch { /* a reload while a panel was open left our entry behind */ }
  for (const p of Object.values(panels)) sheetDrag(p, { enabled: isSheet, onClose: () => close(), scrim });

  // ---- garden chooser (chooser.js). The miniatures are drawn the way a garden will appear: turned by the quarter
  // turns it opens in on this screen (the player's own saved turn of the open garden, else the camera's levelTurn).
  const rotOf = (n, L) => store.turn?.(n) ?? camera.levelTurn?.(L.w, L.h, innerWidth, innerHeight) ?? 0;
  const chooser = createChooser({ bus, store, choose: (n) => { close(); actions.load?.(n); }, rotOf });
  (window.requestIdleCallback || ((f) => setTimeout(f, 1800)))(() => chooser.warm(current), { timeout: 5000 });

  // ---- help and credits: the words come from help-copy.js
  const cap = (k) => `<kbd>${k}</kbd>`;
  $('help-lead').textContent = HELP_LEAD;
  $('help-keys').innerHTML = KEYS.map((r) => `<div><dt>${r.keys.map(cap).join('')}${r.alt ? ` <span class="or">或</span> ${r.alt.map(cap).join('')}` : ''}</dt><dd>${r.text}</dd></div>`).join('');
  $('help-gestures').innerHTML = GESTURES.map((g) => `<li>${ICONS[g.icon] || ''}<span><b>${g.title}</b> ${g.text}</span></li>`).join('');
  $('help-up').textContent = UP_NOTE;
  $('help-credits').innerHTML = CREDITS.map((c) => `<p>${c}</p>`).join('');

  // ---- first-run hints (hints.js)
  createHints({ bus, store, root: $('hint'), dock, isTouch });

  // Keys while a panel is open. Returns true when the key was consumed.
  function key(e) {
    if (!panel) return false;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key, p = panels[panel];
    if (k === 'Escape') { close(); return true; }
    if (k === 'Tab') {                                       // the focus stays inside the open panel
      const f = focusables(p), i = f.indexOf(document.activeElement);
      if (f.length) f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length].focus();
      return true;
    }
    if (k === 'm') { toggleSound(); return true; }
    if (panel === 'help') {
      const body = $('help-body'), a = document.activeElement;
      if (k === '?' || k === '/' || k === 'h') close();
      else if (k === 'l') open('levels');
      else if (k === 'ArrowDown' || k === 'ArrowUp') body.scrollBy({ top: k === 'ArrowDown' ? 90 : -90, behavior: 'smooth' });
      else if (k === 'PageDown' || k === 'PageUp') body.scrollBy({ top: (k === 'PageDown' ? 0.8 : -0.8) * body.clientHeight, behavior: 'smooth' });
      else if (k === 'Home' || k === 'End') body.scrollTo({ top: k === 'Home' ? 0 : body.scrollHeight, behavior: 'smooth' });
      else if (k === 'Enter' && a && a.type === 'checkbox') a.click();
      else return false;                                     // Space and Enter reach the focused switch or button
      return true;
    }
    if (k === 'l') { close(); return true; }
    if (k === '?' || k === '/') { open('help'); return true; }
    return chooser.key(e, k);
  }

  // ---- win banner: "press any key" is meant literally. Keys that mean something else during the celebration
  // (moving, undo, reset, view, zoom, panels, sound) are left to the input module.
  let winKey = null;
  addEventListener('keydown', (e) => {
    if (!winKey || panel || e.repeat || e.metaKey || e.ctrlKey || e.altKey || !winEl.classList.contains('on')) return;
    const k = e.key.toLowerCase();
    if (k.length === 1 && !'wasdzurqevlhm?/[]+=-_ '.includes(k)) winKey();
  });

  // ---- HUD, reported by the game
  const hud = {
    level({ n, title, best }) {
      current = n; hudEl.classList.remove('away');
      $('hud-num').textContent = n;
      $('hud-name').textContent = title ? `“${title.replace(/\.$/, '')}”` : '';
      $('hud-best').textContent = best != null ? `最佳 ${best}` : '';
      shown.moves = shown.pushes = shown.done = -1; lampCount = -1;
    },
    stats({ moves, pushes, done, total }) {
      if (moves !== shown.moves) { $('hud-moves').textContent = shown.moves = moves; }
      if (pushes !== shown.pushes) { $('hud-pushes').textContent = shown.pushes = pushes; }
      const lamps = $('hud-lamps');
      if (lampCount !== total) { lampCount = total; lamps.textContent = ''; for (let i = 0; i < total; i++) { const s = document.createElement('span'); s.className = 'lamp'; lamps.appendChild(s); } shown.done = -1; }
      if (done !== shown.done) { shown.done = done; for (let i = 0; i < total; i++) lamps.children[i].classList.toggle('lit', i < done); }
    },
    // The win banner. The lit garden stays until the player goes on, so the hint is true: any key (or a tap)
    // continues; `onKey` is the game's "go on". The last garden gets its own card.
    win({ n, moves, pushes, best, newBest, first, last, lit, total }, onKey) {
      clearTimeout(winTimer); winKey = onKey || null;
      const how = coarse() ? '轻触' : '按任意键', left = (total || 0) - (lit || 0);
      $('win-eyebrow').textContent = last ? `庭园 ${n} · 最后一座庭园` : `庭园 ${n}`;
      winEl.querySelector('.win-title').textContent = last ? '夜已被灯火填满' : '灯笼尽亮';
      $('win-stats').innerHTML = `<b>${moves}</b> 步 &nbsp;·&nbsp; <b>${pushes}</b> 推` + (newBest ? `<span class="badge">${first ? '初次点亮' : '新纪录'}</span>` : best != null && best < moves ? ` &nbsp;·&nbsp; 最佳 <b>${best}</b>` : '')
        + (last && lit ? ` &nbsp;·&nbsp; <b>${lit}</b> / ${total} 座庭园已点亮` : '');
      $('win-hint').textContent = !last ? `${how}前往下一座庭园` : left > 0 && lit ? `${how}——还有 ${left} 座庭园在黑暗中等待` : `${how}，再次漫步这些庭园`;
      winEl.classList.toggle('last', !!last);
      $('hud-best').textContent = best != null ? `最佳 ${best}` : '';
      winEl.classList.remove('out'); void winEl.offsetWidth; winEl.classList.add('on');
    },
    // Height the banner takes at the bottom of the screen; the camera keeps the garden clear of it.
    winRoom() { return winEl.classList.contains('on') && !winEl.classList.contains('out') ? Math.max(0, innerHeight - winEl.getBoundingClientRect().top) : 0; },
    winHide() { winKey = null; if (!winEl.classList.contains('on')) return; winEl.classList.add('out'); clearTimeout(winTimer); winTimer = setTimeout(() => winEl.classList.remove('on', 'out'), 380); },
    leaving() { hudEl.classList.add('away'); },
    ready() {},
    toast,
    nudge(act) { const b = dock.querySelector(`[data-act="${String(act).toLowerCase()}"]`); if (!b) return; b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); },
    panel: () => panel,
  };

  return {
    actions, hud, open, close, toggle, key, toast, setTray, syncSound, toggleSound,
    get panel() { return panel; },
    titleCard() { const t = $('title'); t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 3700); },
    // Screen area that the interface covers, so the camera can frame the level in what is left. It is measured
    // from the real layout (main.js asks again on every resize): l/t/r/b are the bands along the edges that the
    // HUD and the dock occupy, and `rects` lists their exact boxes for callers that want more than bands.
    insets() {
      arrangeDock();
      const W = innerWidth, H = innerHeight, d = (dock.classList.contains('touch') ? bar : dock).getBoundingClientRect();
      const row = hudEl.querySelector('.hud-row'), hl = hudEl.offsetLeft, ht = hudEl.offsetTop;
      const rects = [{ x: hl, y: ht, w: hudEl.offsetWidth, h: hudEl.offsetHeight }, { x: Math.round(d.left), y: Math.round(d.top), w: Math.round(d.width), h: Math.round(d.height) }];
      if (!dock.classList.contains('touch')) return { l: 0, t: Math.ceil(d.bottom) + 6, r: 0, b: 22, rects };                 // pill at the top, a little air below
      if (matchMedia(LAND).matches) return { l: Math.ceil(hl + hudEl.offsetWidth) + 4, t: 0, r: Math.ceil(W - d.left) + 4, b: 0, rects };   // HUD column left, dock column right
      return { l: 0, t: Math.ceil(ht + row.offsetTop + row.offsetHeight) + 4, r: 0, b: Math.ceil(H - d.top) + 6, rects };       // HUD row on top, bar at the thumb
    },
  };
}
