// Keyboard, touch, mouse and wheel. Turns raw events into game commands in SCREEN directions
// (up is always the top of the screen); the game maps them to grid directions for the current rotation.
// Held keys repeat from the frame loop, in step with the walk animation, so holding never queues a backlog.
//
// One finger (or the left mouse button) on the garden:
//   flick / swipe   exactly one step, whatever its length or speed. It fires when the finger lifts, or as soon
//                   as the finger has come to rest; the direction is read early in the stroke, so the hook at
//                   the end of a thumb arc does not count. After it has fired the gesture is spent.
//   tap             walk to that cell by the shortest way that pushes nothing (game.walkTo). Any other input stops it.
//   hold, then drag the walk ring appears under the finger after TOUCH.holdMs without moving. Dragging out of its
//                   middle walks that way for as long as the finger stays out; the first step may push, the steps
//                   that follow never do. Back to the middle, or lifting, stops at once.
// Two fingers: pinch zooms, dragging both slides the view (look-around). A gesture that ever had two fingers
// never moves the moth. Right mouse button: drag slides the view. The view returns to the moth when it moves.
import * as THREE from 'three';
import { TIME, CAM, TOUCH, PALETTE } from './config.js';
import { clamp } from './util.js';

const MOVE_KEYS = { w: 0, arrowup: 0, d: 1, arrowright: 1, s: 2, arrowdown: 2, a: 3, arrowleft: 3 };
const UI_TARGET = 'button, a, input, select, textarea, label, summary, [role="button"], [data-act], .panel, #scrim, #dock, [contenteditable]';

export function createInput({ canvas, game, ui, rig, garden = null, stage = null, bus = null, store = null }) {
  const held = [];                 // screen directions currently held, most recent last
  let holdTime = 0, holdDelay = TIME.holdDelay, undoHeld = false, undoTime = 0, undoNext = 0, undoKey = false;
  const pointers = new Map();
  let g = null;                    // the one-finger gesture in progress
  let multi = false;               // a second finger joined: nothing moves the moth until every finger has lifted
  let pinch = null, stick = null, wheelAt = 0;
  const now = () => performance.now();

  const press = (d, delay = TIME.holdDelay) => { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); held.push(d); holdTime = 0; holdDelay = delay; };
  const release = (d) => { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); holdTime = 0; };
  const stopStick = () => { if (stick) { stick = null; game.dropAuto(); } };
  const dropGesture = () => { stopStick(); ring.hide(); g = null; };
  const releaseAll = () => { held.length = 0; undoHeld = false; undoKey = false; dropGesture(); pinch = null; multi = false; pointers.clear(); };

  function setUndoHeld(on) {
    if (on && !undoHeld) { undoHeld = true; undoTime = 0; undoNext = TIME.undoHoldDelay; game.undo(); }
    else if (!on) undoHeld = false;
  }

  // ---------------------------------------------------------------- keyboard
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k !== 'z') return;
    game.gesture(); wake();
    if (ui.panel) { if (ui.key(e)) e.preventDefault(); return; }
    if (k in MOVE_KEYS) {
      e.preventDefault();
      if (e.repeat) return;
      const d = MOVE_KEYS[k]; press(d); game.input(d);
      return;
    }
    let used = true;
    if (k === 'z' || k === 'u' || k === 'backspace') { if (!e.repeat) { undoKey = true; setUndoHeld(true); } }
    else if (e.repeat) used = k === ' ';
    else if (k === 'r') game.reset();
    else if (k === 'q') game.rotate(-1);
    else if (k === 'e') game.rotate(1);
    else if (k === 'v') game.cycleView();
    else if (k === 'l') ui.open('levels');
    else if (k === '?' || k === '/' || k === 'h' || k === 'f1') ui.open('help');
    else if (k === '[') game.prev();
    else if (k === ']') game.next();
    else if (k === '+' || k === '=') game.zoomBy(1);
    else if (k === '-' || k === '_') game.zoomBy(-1);
    else if (k === 'm') ui.toggleSound();
    else if (k === 'escape') ui.close();
    else if (k === 'enter' || k === ' ') game.confirm();
    else used = false;
    if (used) e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k in MOVE_KEYS) release(MOVE_KEYS[k]);
    if (k === 'z' || k === 'u' || k === 'backspace') { undoKey = false; setUndoHeld(false); }
  });
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); else wake(); });

  // ---------------------------------------------------------------- the walk ring (hold, then drag)
  const ring = (() => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;width:144px;height:144px;margin:-72px 0 0 -72px;pointer-events:none;z-index:3;opacity:0;'
      + 'transition:opacity .18s ease;will-change:transform,opacity;contain:layout style;';
    const chev = (deg) => `<path data-d d="M-9 -50 L0 -59 L9 -50" transform="rotate(${deg})" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    el.innerHTML = `<svg viewBox="-72 -72 144 144" width="144" height="144" style="display:block;overflow:visible">
      <circle r="66" fill="rgba(10,14,40,0.22)" stroke="rgba(196,208,255,0.42)" stroke-width="1.2"/>
      <circle r="${TOUCH.ringDead + 8}" fill="none" stroke="rgba(196,208,255,0.22)" stroke-width="1" stroke-dasharray="2 5"/>
      ${chev(0)}${chev(90)}${chev(180)}${chev(270)}
      <circle data-k r="7" fill="rgba(255,236,200,0.9)"/></svg>`;
    document.body.appendChild(el);
    const arrows = [...el.querySelectorAll('[data-d]')], knob = el.querySelector('[data-k]');
    let x = 0, y = 0, scale = 0.6, shown = false, active = -1;
    const paint = () => { for (let i = 0; i < 4; i++) { arrows[i].setAttribute('stroke', i === active ? '#ffbe6a' : 'rgba(210,220,255,0.6)'); arrows[i].setAttribute('opacity', i === active ? '1' : '0.75'); } };
    paint();
    return {
      show(px, py) { x = px; y = py; shown = true; active = -1; paint(); knob.setAttribute('cx', 0); knob.setAttribute('cy', 0); el.style.opacity = '1'; },
      hide() { if (!shown) return; shown = false; el.style.opacity = '0'; },
      set(dir, dx, dy) {
        if (dir !== active) { active = dir; paint(); }
        const d = Math.hypot(dx, dy), k = d > 40 ? 40 / d : 1;
        knob.setAttribute('cx', (dx * k).toFixed(1)); knob.setAttribute('cy', (dy * k).toFixed(1));
      },
      update(dt) {
        const want = shown ? 1 : 0.7; if (Math.abs(want - scale) < 0.002 && !shown) return;
        scale += (want - scale) * Math.min(1, dt * 16);
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      },
      get shown() { return shown; },
    };
  })();

  // ---------------------------------------------------------------- the tap marker (a ring of light on the target tile)
  const marker = (() => {
    if (!stage || !garden) return { show() {}, update() {} };
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.wisp, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 48), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 6; mesh.frustumCulled = false;
    stage.scene.add(mesh);
    let t = 0, ok = true, live = false, fade = 0;
    return {
      show(cx, cy, reachable) {
        mesh.position.set(garden.wx(cx), (garden.yAt?.(cx, cy) || 0) + 0.04, garden.wz(cy));
        t = 0; ok = reachable; live = true; fade = 1; mesh.visible = true;
      },
      update(dt) {
        if (!mesh.visible) return;
        t += dt;
        if (ok) { if (!game.walking && t > 0.25) live = false; } else if (t > 0.3) live = false;
        fade = live ? 1 : Math.max(0, fade - dt * 4);
        const pop = Math.min(1, t / 0.2), e = 1 - (1 - pop) * (1 - pop);
        const s = ok ? 1.55 - 0.55 * e + 0.04 * Math.sin(t * 7) : 0.9 - 0.2 * e;
        mesh.scale.setScalar(s);
        mat.opacity = (ok ? 0.85 : 0.4) * e * fade;
        if (fade <= 0) mesh.visible = false;
      },
    };
  })();

  // ---------------------------------------------------------------- comfort: screen stays on, small haptics
  let lock = null;
  async function wake() {
    if (lock || document.hidden || !navigator.wakeLock) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch { lock = null; }
  }
  wake();
  // Haptics follow the sound-effects setting (or settings.haptics === false to turn them off alone). Never needed.
  const buzz = (pattern) => {
    if (!navigator.vibrate || !navigator.userActivation?.hasBeenActive) return;
    if (store && (store.settings.sfx === false || store.settings.haptics === false)) return;
    try { navigator.vibrate(pattern); } catch { /* not allowed here */ }
  };
  if (bus) {
    bus.on('move:bump', () => buzz(9));
    bus.on('box:dock', (d) => { if (!d || (!d.initial && !d.undo)) buzz(16); });
    bus.on('win', () => buzz([14, 70, 14, 70, 26]));
    // A key or a finger that was down before a garden started to build does not carry over into it:
    // it has to be pressed again.
    const letGo = () => { held.length = 0; holdTime = 0; stopStick(); };
    bus.on('level:teardown', letGo); bus.on('level:build', letGo);
  }

  // ---------------------------------------------------------------- pointer: flick, tap, walk ring, pinch, look-around
  const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
  const isGarden = (e) => { const t = e.target; return t === canvas || (t instanceof Element && !t.closest(UI_TARGET)); };

  // The cell under a screen point. A lantern stands taller than its tile, so a tap on its body means the lantern.
  const _pt = {};
  function cellAt(px, py) {
    const lv = game.level, pz = game.puzzle; if (!lv || !pz) return null;
    const at = (h) => { const p = rig.groundAt(px, py, h, _pt); return { x: Math.round(p.x + (lv.w - 1) / 2), y: Math.round(p.z + (lv.h - 1) / 2) }; };
    const inside = (c) => c.x >= 0 && c.y >= 0 && c.x < lv.w && c.y < lv.h;
    const hi = at(0.42); if (inside(hi) && pz.boxAt[hi.y * lv.w + hi.x] >= 0) return { ...hi, box: true };
    const c = at(0.02); return inside(c) ? c : null;
  }

  function tap(x, y, onGarden) {
    if (game.phase === 'win') return game.confirm();
    if (!onGarden || game.phase !== 'play') return;
    const c = cellAt(x, y), lv = game.level;
    if (!c || c.box || !lv.floor[c.y * lv.w + c.x]) return;
    const steps = game.walkTo(c.x, c.y);
    if (steps !== 0) marker.show(c.x, c.y, steps > 0);
  }

  function fire(gs) {
    const d = gs.dir >= 0 ? gs.dir : dirOf(gs.x - gs.x0, gs.y - gs.y0);
    gs.mode = 'spent';
    game.input(d);
  }

  // Walk ring: where the finger is, relative to the middle of the ring.
  function ringMove(gs) {
    const dx = gs.x - gs.cx, dy = gs.y - gs.cy, dist = Math.hypot(dx, dy);
    let d = stick ? stick.dir : -1;
    if (dist >= TOUCH.ringOut) {
      const nd = dirOf(dx, dy);
      // Changing direction needs a clear lead of the new axis, so a wobbling thumb does not zigzag.
      if (d < 0 || (nd !== d && (nd % 2 === 0 ? Math.abs(dy) > Math.abs(dx) * 1.35 : Math.abs(dx) > Math.abs(dy) * 1.35))) d = nd;
    } else if (dist < TOUCH.ringDead) d = -1;
    if (d !== (stick ? stick.dir : -1)) {
      stopStick();
      if (d >= 0) { gs.walked = true; game.input(d); stick = { dir: d, time: 0 }; }
    }
    ring.set(d, dx, dy);
  }

  function startPinch() {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: rig.zoom.target, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, zooming: false, zoomed: false };
  }
  function movePinch() {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    // Two fingers that keep their distance slide the view; the zoom joins in once they clearly open or close.
    if (!pinch.zooming && Math.abs(d / Math.max(20, pinch.d) - 1) > 0.1) { pinch.zooming = true; pinch.d = d; pinch.z = rig.zoom.target; }
    if (pinch.zooming) {
      const z = clamp(pinch.z * (d / Math.max(20, pinch.d)), CAM.zoomMin, rig.zoomMax);
      if (Math.abs(z - rig.zoom.target) > 0.004) { game.setZoom(z, { quiet: true, fast: true }); pinch.zoomed = true; }
    }
    rig.panBy(cx - pinch.cx, cy - pinch.cy); pinch.cx = cx; pinch.cy = cy;
  }

  document.addEventListener('pointerdown', (e) => {
    if (!isGarden(e)) return;
    game.gesture(); wake(); ui.setTray(false);
    if (ui.panel) return;
    if (e.pointerType === 'mouse' && e.button > 2) return;
    if (e.target === canvas) { try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ } }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      multi = false; dropGesture();
      const t = now(), look = e.pointerType === 'mouse' && e.button !== 0;
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: t, t1: 0, still: t,
        mode: look ? 'look' : 'wait', dir: -1, onGarden: e.target === canvas, walked: false, cx: 0, cy: 0 };
    } else {
      multi = true; dropGesture();                       // whatever the first finger was doing is void
      if (pointers.size === 2) startPinch();
    }
  });
  document.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const px = p.x, py = p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) { if (pinch && pointers.size === 2) movePinch(); return; }
    if (!g || g.id !== e.pointerId || multi) return;
    g.x = e.clientX; g.y = e.clientY;
    if (g.mode === 'look') { rig.panBy(g.x - px, g.y - py); return; }
    if (Math.hypot(g.x - g.sx, g.y - g.sy) > 3) { g.sx = g.x; g.sy = g.y; g.still = now(); }
    const dx = g.x - g.x0, dy = g.y - g.y0, dist = Math.hypot(dx, dy);
    if (g.mode === 'wait' && dist >= TOUCH.slop) { g.mode = 'flick'; g.t1 = now(); }
    if (g.mode === 'flick' && g.dir < 0 && dist >= TOUCH.lock) g.dir = dirOf(dx, dy);
    if (g.mode === 'ring') ringMove(g);
  });
  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch && pointers.size < 2) { if (pinch.zoomed) ui.toast(Math.round(rig.zoom.target * 100) + '%'); pinch = null; }
    if (g && g.id === e.pointerId) {
      const gs = g, cancelled = e.type === 'pointercancel';
      if (!multi && !cancelled) {
        // A ring that never walked ends like the plain gestures: a short slow drag is one step, a still finger a tap.
        const crawl = gs.mode === 'ring' && !gs.walked && Math.hypot(gs.x - gs.x0, gs.y - gs.y0) >= TOUCH.slop;
        if (gs.mode === 'flick' || crawl) fire(gs);
        else if (gs.mode === 'wait' || (gs.mode === 'ring' && !gs.walked)) { if (now() - gs.t0 < TOUCH.tapMs) tap(gs.x0, gs.y0, gs.onGarden); }
      }
      dropGesture();
    }
    if (pointers.size === 0) multi = false;
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const t = now(); if (t - wheelAt < 140 || ui.panel) return; wheelAt = t;
    game.zoomBy(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  // Stop the page from scrolling or zooming under the game on touch devices.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => { if (e.cancelable && !e.target.closest?.('.panel')) e.preventDefault(); }, { passive: false });

  return {
    setUndoHeld,
    get wakeLocked() { return !!lock; },
    update(dt) {
      ring.update(dt); marker.update(dt);
      if (ui.panel) { if (held.length || undoHeld || g || stick) releaseAll(); return; }
      if (held.length) {
        holdTime += dt;
        if (holdTime >= holdDelay && game.repeatReady) game.input(held[held.length - 1], { repeat: true });
      }
      if (undoHeld) {
        undoTime += dt;
        if (undoTime >= undoNext) { undoNext = undoTime + (undoTime > 1.6 ? TIME.undoRepeat * 0.6 : TIME.undoRepeat); game.undo({ repeat: true }); }
      }
      // A walk under the ring: steps follow each other in time with the moth, and never push.
      if (stick) {
        stick.time += dt;
        if (stick.time >= TOUCH.walkDelay && game.repeatReady) game.input(stick.dir, { repeat: true, walk: true });
      }
      if (g && !multi) {
        const t = now();
        // A flick whose finger stays down fires once the finger rests (or, for a slow drag, after a moment).
        if (g.mode === 'flick' && (t - g.still >= TOUCH.restMs || t - g.t1 >= TOUCH.capMs)) fire(g);
        // A finger that has not moved brings up the walk ring.
        else if (g.mode === 'wait' && t - g.t0 >= TOUCH.holdMs && game.phase === 'play') {
          g.mode = 'ring'; g.cx = g.x; g.cy = g.y; ring.show(g.cx, g.cy); buzz(6);
        }
      }
    },
  };
}
