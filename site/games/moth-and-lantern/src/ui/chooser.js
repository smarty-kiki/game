// The garden chooser: 155 gardens as a night path in ten named stretches. Every garden is a small silhouette of the
// real level; lit (solved) gardens glow and show their best count. One cursor (`sel`) is shared by mouse, keys and
// touch, and it carries the DOM focus, so there is a single focus ring. The current garden wears the moth.
// Miniatures are painted once, in idle time, and repainted only when a garden changes from dark to lit.
import { LEVELS } from '../levels-data.js';
import { drawMini, fitCanvas, levelOf } from './mini.js';

// The path runs from dusk to dawn. `tint` colours the small marks of a stretch.
export const STRETCHES = [
  { name: '暮色之门', from: 1, to: 14, tint: '#f2b9a8' },
  { name: '苔石阶', from: 15, to: 29, tint: '#b6dba6' },
  { name: '萤火庭院', from: 30, to: 44, tint: '#dbe98f' },
  { name: '睡莲水塘', from: 45, to: 60, tint: '#9fe0d2' },
  { name: '月下小径', from: 61, to: 76, tint: '#c3cfff' },
  { name: '静篱', from: 77, to: 92, tint: '#93d0ac' },
  { name: '午夜果园', from: 93, to: 108, tint: '#b3a6f5' },
  { name: '纸桥', from: 109, to: 124, tint: '#f3dcb2' },
  { name: '远梯田', from: 125, to: 140, tint: '#a3bdec' },
  { name: '向晓', from: 141, to: 155, tint: '#ffc79c' },
];
export const stretchOf = (n) => STRETCHES.findIndex((s) => n >= s.from && n <= s.to);

const TILE_W = 96, TILE_H = 62, COUNT = LEVELS.length;
const MOTH = '<svg viewBox="0 0 24 20" aria-hidden="true"><path d="M12 8C9 2 3 1 1.500 3.500.500 7.500 3 10.500 7 10.800 4.500 13 5.500 17.500 8.500 17.500 10.500 17.500 11.600 15 12 12.500 12.400 15 13.500 17.500 15.500 17.500 18.500 17.500 19.500 13 17 10.800 21 10.500 23.500 7.500 22.500 3.500 21 1 15 2 12 8Z" fill="currentColor"/><path d="M12 6.500v8.500" stroke="#b9643f" stroke-width="2" stroke-linecap="round"/><path d="M12 6.500 10 3M12 6.500 14 3" stroke="currentColor" stroke-width="0.900" stroke-linecap="round" fill="none"/></svg>';
const $ = (id) => document.getElementById(id);
const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 30));

// choose(n): the player picked garden n.  rotOf(n): quarter turns garden n opens in on this screen (0..3).
export function createChooser({ bus, store, choose, rotOf = () => 0 }) {
  const scroller = $('levels-grid'), rail = $('levels-stretches'), jump = $('levels-jump'), map = $('preview-map');
  const tiles = [null], caps = [null], drawn = new Array(COUNT + 1).fill(''), seen = new Array(COUNT + 1).fill(''), sections = [], links = [], litIn = [];
  let litTotal = -1, gridW = -1;
  const here = el('span', 'here'); here.innerHTML = MOTH;
  let built = false, sel = 1, current = 1, goalX = null, rows = null, rowOf = null, colX = null, secTop = null, activeSt = -1;
  let typed = '', typedAt = 0, jumpTimer = 0, popTimer = 0, queue = [], pumping = false, lastX = -1, lastY = -1, pointerKind = 'mouse', spyRaf = 0, isOpen = false, scrub = null, scrubbed = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rot = (n) => { try { return (rotOf(n, levelOf(n)) | 0) & 3; } catch { return 0; } };

  // ---------------------------------------------------------------- build (once)
  function build() {
    if (built) return; built = true;
    const frag = document.createDocumentFragment(), nav = document.createDocumentFragment();
    STRETCHES.forEach((s, i) => {
      const sec = el('section', 'st'); sec.dataset.st = i; sec.style.setProperty('--tint', s.tint);
      sec.setAttribute('role', 'group'); sec.setAttribute('aria-label', `${s.name}，第 ${s.from} 至 ${s.to} 座庭园`);
      sec.innerHTML = `<header class="st-head"><h3>${s.name}</h3><span class="st-range">${s.from}–${s.to}</span><span class="st-lit"></span></header>`;
      const grid = el('div', 'st-grid');
      for (let n = s.from; n <= s.to; n++) {
        const b = el('button', 'lv'); b.type = 'button'; b.dataset.n = n; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', 'false'); b.tabIndex = -1;
        b.innerHTML = `<canvas class="lv-map" width="${TILE_W}" height="${TILE_H}"></canvas><span class="lv-cap"><b>${n}</b><i></i></span>`;
        tiles[n] = b; caps[n] = b.querySelector('i'); grid.appendChild(b);
      }
      sec.appendChild(grid); frag.appendChild(sec); sections.push(sec);
      const a = el('button', 'st-link'); a.type = 'button'; a.dataset.st = i; a.tabIndex = i ? -1 : 0; a.style.setProperty('--tint', s.tint);
      a.innerHTML = `<span class="st-dot"></span><span class="st-name">${s.name}</span><span class="st-span">${s.from}–${s.to}</span><span class="st-from">${s.from}</span>`;
      nav.appendChild(a); links.push(a);
    });
    scroller.appendChild(frag); rail.appendChild(nav);

    scroller.addEventListener('pointerdown', (e) => { pointerKind = e.pointerType || 'mouse'; });
    scroller.addEventListener('click', (e) => {
      const b = e.target.closest('.lv'); if (!b) return;
      const n = +b.dataset.n, kind = e.pointerType || pointerKind;
      // A finger first shows the garden (miniature, title, best); a second tap, or the Enter button, goes in.
      if (kind !== 'mouse' && e.detail !== 0 && n !== sel) select(n, { scroll: 'nearest' });
      else pick(n);
    });
    scroller.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || (e.clientX === lastX && e.clientY === lastY)) return;       // not a scroll passing under a still mouse
      lastX = e.clientX; lastY = e.clientY;
      const b = e.target.closest('.lv'); if (b && +b.dataset.n !== sel) select(+b.dataset.n, { scroll: false, focus: focusInPath() });
    });
    scroller.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
    rail.addEventListener('click', (e) => { const a = e.target.closest('.st-link'); if (a && !scrubbed) goStretch(+a.dataset.st, e.detail === 0 || pointerKind === 'mouse'); });
    // The ruler (narrow screens): a finger that lands on it or slides along it moves the path under it, stop by stop.
    rail.addEventListener('pointerdown', (e) => {
      pointerKind = e.pointerType || 'mouse'; scrubbed = false;
      if (pointerKind === 'mouse' || !isRuler()) return;
      scrub = -1; scrubbed = true; rail.setPointerCapture?.(e.pointerId); scrubTo(e.clientX, e.clientY);
    });
    rail.addEventListener('pointermove', (e) => { if (scrub !== null) scrubTo(e.clientX, e.clientY); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) rail.addEventListener(ev, () => { scrub = null; });
    $('preview-go').addEventListener('click', () => pick(sel));
    if (window.ResizeObserver) new ResizeObserver(() => { rows = null; if (isOpen) { drawPreview(sel); spy(); } }).observe(scroller);
  }
  const isRuler = () => getComputedStyle(rail).flexDirection === 'row';
  function scrubTo(x, y) {
    // the stop under the finger, or the nearest one (the ruler is one row, or two rows of five on small phones)
    let i = -1, near = 1e9;
    for (const a of links) { const r = a.getBoundingClientRect(), d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom)); if (d < near) { near = d; i = +a.dataset.st; } }
    if (i === scrub) return;
    scrub = i; goStretch(i, false, true);
    say(STRETCHES[i].name);                               // the numbers are on the ruler itself
  }
  function say(text) { jump.textContent = text; jump.classList.add('on'); clearTimeout(jumpTimer); jumpTimer = setTimeout(() => jump.classList.remove('on'), 1300); }
  const focusInPath = () => { const a = document.activeElement; return !a || a === document.body || scroller.contains(a) || a.classList.contains('panel'); };

  // ---------------------------------------------------------------- miniatures
  function paint(n) {
    const lit = store.best(n) != null, r = rot(n), want = (lit ? 'lit' : 'dark') + r;
    if (drawn[n] === want) return;
    drawn[n] = want;
    const c = fitCanvas(tiles[n].firstChild, TILE_W, TILE_H);
    drawMini(c, levelOf(n), { x: 4, y: 2, w: TILE_W - 8, h: TILE_H - 4, rot: r, lit, maxCell: 9 });
  }
  function paintAll(centre) {
    queue = [];
    for (let n = 1; n <= COUNT; n++) queue.push(n);
    queue.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
    pump();
  }
  function pump() {
    if (pumping || !queue.length) return;
    pumping = true;
    idle(() => { pumping = false; const t0 = performance.now(); while (queue.length && performance.now() - t0 < 6) paint(queue.shift()); pump(); });
  }

  // ---------------------------------------------------------------- state from the store
  // Only what changed since the last look is written to the page, so opening stays cheap.
  function sync() {
    let total = 0;
    STRETCHES.forEach((s, i) => {
      let lit = 0;
      for (let n = s.from; n <= s.to; n++) {
        const best = store.best(n), solved = best != null, isHere = n === current, key = (solved ? best : '-') + (isHere ? '*' : '');
        if (solved) lit++;
        if (seen[n] === key) continue;
        seen[n] = key;
        const b = tiles[n], title = levelOf(n).title;
        b.classList.toggle('solved', solved); b.classList.toggle('current', isHere);
        caps[n].textContent = solved ? best : '';
        b.setAttribute('aria-label', `庭园 ${n}${title ? '，' + title.replace(/\.$/, '') : ''}，${solved ? `已点亮，最佳 ${best} 步` : '尚未点亮'}${isHere ? '，你在这里' : ''}`);
        if (isHere) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      }
      total += lit;
      if (litIn[i] === lit) return;
      litIn[i] = lit;
      const size = s.to - s.from + 1;
      sections[i].querySelector('.st-lit').textContent = lit === size ? '全部点亮' : lit ? `${lit} / ${size} 已亮` : '';
      sections[i].classList.toggle('all-lit', lit === size);
      links[i].style.setProperty('--f', lit / size); links[i].classList.toggle('all-lit', lit === size);
      links[i].setAttribute('aria-label', `${s.name}，第 ${s.from} 至 ${s.to} 座庭园，${lit} / ${size} 已亮`);
    });
    if (here.parentNode !== tiles[current]) tiles[current].appendChild(here);
    if (total !== litTotal) { litTotal = total; $('levels-sub').textContent = total === 0 ? `还有 ${COUNT} 座庭园等待点亮` : total === COUNT ? `全部 ${COUNT} 座庭园已点亮` : `已点亮 ${total} / ${COUNT}`; }
    return total;
  }
  function fillBar() {
    const bar = $('levels-bar'); bar.style.transition = 'none'; bar.style.width = '0%';
    requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = (litTotal / COUNT) * 100 + '%'; });
  }

  // ---------------------------------------------------------------- geometry for keys and scrolling
  function measure() {
    if (rows && gridW === scroller.clientWidth) return;
    gridW = scroller.clientWidth; rows = []; rowOf = new Int16Array(COUNT + 1); colX = new Float32Array(COUNT + 1);
    let lastTop = -1e9;
    for (let n = 1; n <= COUNT; n++) {
      const t = tiles[n], top = t.offsetTop;
      if (Math.abs(top - lastTop) > 4) { rows.push([]); lastTop = top; }
      rows[rows.length - 1].push(n); rowOf[n] = rows.length - 1; colX[n] = t.offsetLeft + t.offsetWidth / 2;
    }
    secTop = sections.map((s) => s.offsetTop);
  }
  function reveal(n, mode, instant) {
    measure();
    const t = tiles[n], vh = scroller.clientHeight, st = scroller.scrollTop, pad = 12, max = scroller.scrollHeight - vh;
    const s = STRETCHES[stretchOf(n)], firstRow = rowOf[n] === rowOf[s.from];
    const top = firstRow ? secTop[stretchOf(n)] : t.offsetTop - pad, bottom = t.offsetTop + t.offsetHeight + pad;
    let to = st;
    if (mode === 'center') to = t.offsetTop - (vh - t.offsetHeight) / 2;
    else if (top < st) to = top;
    else if (bottom > st + vh) to = bottom - vh;
    to = clamp(Math.round(to), 0, Math.max(0, max));
    // a short hop glides; a long jump (typing a number, Home, End) cuts straight there
    if (to !== st) scroller.scrollTo({ top: to, behavior: instant || reduced() || Math.abs(to - st) > vh * 1.2 ? 'auto' : 'smooth' });
  }
  function spy() {
    spyRaf = 0; measure();
    // The stretch in view: the one of the cursor while the cursor is on screen, otherwise the one at the top of the list.
    const st = scroller.scrollTop, vh = scroller.clientHeight, t = tiles[sel], mid = t.offsetTop + t.offsetHeight / 2;
    if (mid > st && mid < st + vh) return setActive(stretchOf(sel));
    const y = st + Math.min(120, vh * 0.35);
    let i = 0; while (i < secTop.length - 1 && secTop[i + 1] <= y) i++;
    if (st >= scroller.scrollHeight - vh - 2) i = secTop.length - 1;
    setActive(i);
  }
  function setActive(i) {
    if (i === activeSt) return;
    links[activeSt]?.classList.remove('active'); links[activeSt]?.removeAttribute('aria-current');
    activeSt = i; const a = links[i]; a.classList.add('active'); a.setAttribute('aria-current', 'true');
    for (const l of links) l.tabIndex = l === a ? 0 : -1;
    // keep the active stretch in sight when the list of stretches scrolls itself (phones)
    const left = a.offsetLeft - (rail.clientWidth - a.offsetWidth) / 2, top = a.offsetTop - (rail.clientHeight - a.offsetHeight) / 2;
    if (rail.scrollWidth > rail.clientWidth + 2 || rail.scrollHeight > rail.clientHeight + 2) rail.scrollTo({ left, top, behavior: isOpen && !reduced() ? 'smooth' : 'auto' });
  }

  // ---------------------------------------------------------------- the cursor
  function select(n, { scroll = 'nearest', instant = false, focus = true, quiet = false, keepGoal = false } = {}) {
    n = clamp(n, 1, COUNT);
    if (!keepGoal) goalX = null;
    const prev = tiles[sel], t = tiles[n];
    if (prev !== t) { prev.classList.remove('sel'); prev.setAttribute('aria-selected', 'false'); prev.tabIndex = -1; }
    const moved = n !== sel; sel = n;
    t.classList.add('sel'); t.setAttribute('aria-selected', 'true'); t.tabIndex = 0;
    if (focus && document.activeElement !== t) t.focus({ preventScroll: true });
    if (scroll) reveal(n, scroll, instant);
    drawPreview(n);
    if (isOpen && !scroll) spy();
    if (!quiet && moved) bus.emit('ui:hover', {});
  }
  function pick(n) { bus.emit('ui:select', {}); choose(n); }
  function vertical(d) {
    measure();
    const r = clamp(rowOf[sel] + d, 0, rows.length - 1);
    if (r === rowOf[sel]) return select(d < 0 ? rows[0][0] : COUNT);
    const x = goalX ?? colX[sel]; let best = rows[r][0];
    for (const n of rows[r]) if (Math.abs(colX[n] - x) < Math.abs(colX[best] - x)) best = n;
    select(best, { keepGoal: true }); goalX = x;
  }
  function pageRows() { measure(); const pitch = rows.length > 1 ? Math.max(40, tiles[rows[1][0]].offsetTop - tiles[rows[0][0]].offsetTop) : 90; return Math.max(2, Math.floor(scroller.clientHeight / pitch) - 1); }
  function goStretch(i, focus = true, instant = false) {
    measure();
    const s = STRETCHES[i]; let n = current >= s.from && current <= s.to ? current : s.from;
    if (n !== current) for (let k = s.from; k <= s.to; k++) if (store.best(k) == null) { n = k; break; }
    const t = tiles[n], vh = scroller.clientHeight; let to = secTop[i];
    if (t.offsetTop + t.offsetHeight + 12 > to + vh) to = t.offsetTop + t.offsetHeight + 12 - vh;
    scroller.scrollTo({ top: to, behavior: instant || reduced() ? 'auto' : 'smooth' });
    select(n, { scroll: false, focus });
    setActive(i);
  }

  // ---------------------------------------------------------------- preview
  function drawPreview(n) {
    const L = levelOf(n), best = store.best(n), s = STRETCHES[stretchOf(n)], lit = best != null;
    $('preview-num').textContent = n;
    $('preview-stretch').textContent = s.name; $('preview-stretch').style.setProperty('--tint', s.tint);
    $('preview-name').textContent = L.title ? `“${L.title.replace(/\.$/, '')}”` : '';
    $('preview-size').textContent = `${L.w} × ${L.h}`;
    $('preview-boxes').textContent = L.boxes.length;
    const pb = $('preview-best'); pb.textContent = lit ? `最佳 ${best} 步` : '尚未点亮'; pb.classList.toggle('lit', lit);
    $('preview-line').innerHTML = `${L.boxes.length} 盏灯笼 · ` + (lit ? `<b>最佳 ${best}</b>` : '尚未点亮');
    $('preview').classList.toggle('lit', lit);
    $('preview-go').setAttribute('aria-label', `进入庭园 ${n}`);
    const w = map.clientWidth || 252, h = map.clientHeight || 190, pad = Math.max(5, Math.min(w, h) * 0.08);
    const c = fitCanvas(map, w, h);
    drawMini(c, L, { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2, rot: rot(n), detail: true, maxCell: Math.min(30, w * 0.12) });
  }

  // ---------------------------------------------------------------- open / close
  function open(cur) {
    build(); isOpen = true; current = clamp(cur, 1, COUNT); typed = '';
    sync(); fillBar();
    select(current, { scroll: 'center', instant: true, quiet: true });
    activeSt = -1; spy();
    // what the player sees first is painted now, the rest of the path in idle time
    const top = scroller.scrollTop - 100, bottom = scroller.scrollTop + scroller.clientHeight + 100;
    for (let n = 1; n <= COUNT; n++) { const y = tiles[n].offsetTop; if (y + 100 > top && y < bottom) paint(n); }
    paintAll(current);
    // the gardens near the cursor rise in, rippling outward from it
    clearTimeout(popTimer);
    if (!reduced()) {
      const r0 = rowOf[current], x0 = colX[current], popped = [];
      for (let r = Math.max(0, r0 - 5); r <= Math.min(rows.length - 1, r0 + 5); r++) for (const n of rows[r]) {
        const t = tiles[n]; t.style.setProperty('--d', Math.min(300, Math.round(Math.abs(r - r0) * 34 + Math.abs(colX[n] - x0) * 0.16)) + 'ms'); t.classList.add('pop'); popped.push(t);
      }
      popTimer = setTimeout(() => { for (const t of popped) t.classList.remove('pop'); }, 900);
    }
  }
  function close() { isOpen = false; jump.classList.remove('on'); }

  // Keys while the chooser is open. `k` is the lower-cased key. Returns true when the key was used.
  function key(e, k) {
    const a = document.activeElement;
    if (a && a.classList.contains('st-link')) {
      const i = links.indexOf(a);
      if (k === 'ArrowDown' || k === 'ArrowRight') { links[Math.min(links.length - 1, i + 1)].focus(); return true; }
      if (k === 'ArrowUp' || k === 'ArrowLeft') { links[Math.max(0, i - 1)].focus(); return true; }
      if (k === 'Home') { links[0].focus(); return true; }
      if (k === 'End') { links[links.length - 1].focus(); return true; }
      if (k === 'Enter' || k === ' ') return false;                    // the browser clicks the button
    }
    if (/^[0-9]$/.test(k)) {
      const now = performance.now(); let t = now - typedAt < 1100 ? typed + k : k;
      if (+t < 1 || +t > COUNT) t = k;
      typed = t; typedAt = now;
      if (+typed >= 1) { select(+typed, { scroll: 'center' }); say(`庭园 ${typed}`); }
      return true;
    }
    if (k === 'ArrowLeft' || k === 'a') select(sel - 1);
    else if (k === 'ArrowRight' || k === 'd') select(sel + 1);
    else if (k === 'ArrowUp' || k === 'w') vertical(-1);
    else if (k === 'ArrowDown' || k === 's') vertical(1);
    else if (k === 'Home') select(1);
    else if (k === 'End') select(COUNT);
    else if (k === 'PageUp') vertical(-pageRows());
    else if (k === 'PageDown') vertical(pageRows());
    else if (k === 'Enter' || k === ' ') { if (a && a.tagName === 'BUTTON' && !a.classList.contains('lv')) return false; pick(sel); }
    else return false;
    return true;
  }

  return {
    open, close, key,
    // Builds the path and paints the miniatures ahead of the first opening, a few milliseconds at a time.
    warm(cur = 1) { build(); current = clamp(cur, 1, COUNT); sync(); paintAll(cur); idle(measure); },
    get selected() { return sel; },
  };
}
