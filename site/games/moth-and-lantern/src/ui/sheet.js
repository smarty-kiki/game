// Panel helpers: the list of focusable things inside a panel (for the Tab trap), and swipe-down-to-close for
// panels shown as bottom sheets on phones.

export function focusables(root) {
  return [...root.querySelectorAll('button, input, a[href], [tabindex]')].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
}

// A finger that starts on the sheet and moves down drags the sheet with it; past a third of the way, or with a
// quick flick, the sheet closes, otherwise it settles back. Inside a scrolling list the drag only starts when
// the list is already at its top, so scrolling and closing never fight. The sheet follows through --drag (panels.css).
export function sheetDrag(panel, { enabled, onClose, scrim }) {
  let t = null;
  const scrollerOf = (el) => {
    for (let n = el; n && n !== panel; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
    return null;
  };
  panel.addEventListener('touchstart', (e) => {
    if (!enabled() || e.touches.length !== 1) { t = null; return; }
    const p = e.touches[0];
    t = { x0: p.clientX, y0: p.clientY, y: p.clientY, time: e.timeStamp, v: 0, mode: 'wait', sc: scrollerOf(e.target) };
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (!t) return;
    const p = e.touches[0], dy = p.clientY - t.y0, dx = p.clientX - t.x0;
    if (t.mode === 'wait') {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      t.mode = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.2 && (!t.sc || t.sc.scrollTop <= 0) ? 'drag' : 'scroll';
      if (t.mode === 'drag') panel.classList.add('dragging');
    }
    if (t.mode !== 'drag') return;
    if (e.cancelable) e.preventDefault();
    const d = Math.max(0, dy), dt = Math.max(1, e.timeStamp - t.time);
    t.v = t.v * 0.4 + ((p.clientY - t.y) / dt) * 0.6; t.y = p.clientY; t.time = e.timeStamp;
    panel.style.setProperty('--drag', d + 'px');
    scrim.style.opacity = String(Math.max(0.2, 1 - d / (panel.offsetHeight * 1.05)));
  }, { passive: false });
  const end = () => {
    if (!t) return;
    const was = t; t = null;
    if (was.mode !== 'drag') return;
    const d = parseFloat(panel.style.getPropertyValue('--drag')) || 0;
    panel.classList.remove('dragging'); scrim.style.opacity = '';
    if (d > Math.min(150, panel.offsetHeight * 0.3) || (was.v > 0.5 && d > 24)) onClose();
    else panel.style.removeProperty('--drag');
  };
  panel.addEventListener('touchend', end); panel.addEventListener('touchcancel', end);
}
