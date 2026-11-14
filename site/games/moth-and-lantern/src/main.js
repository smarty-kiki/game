// Entry point: reads the URL, builds every module, wires them together and runs the frame loop.
// Frame order: input -> game (rules, actions, transitions) -> world, lanterns, moth, ambience, particles
//              -> camera -> per-frame layers (light field, glows, decals) -> render.
import { bus } from './bus.js';
import { createStore } from './store.js';
import { LEVELS } from './levels-data.js';
import { VIEW, GAME_TITLE } from './config.js';
import { damp, clamp } from './util.js';
import { createStage } from './render/stage.js';
import { CameraRig, levelTurn } from './render/camera.js';
import { Garden } from './render/world.js';
import { Lanterns } from './render/lanterns.js';
import { Moth } from './render/moth.js';
import { Ambient } from './render/ambient.js';
import { Fx } from './render/fx.js';
import { G } from './render/materials.js';
import { Vector3 as THREE_V } from 'three';
import { createGame } from './game.js';
import { createInput } from './input.js';
import { createUI } from './ui/ui.js';

const q = new URLSearchParams(location.search);
const num = (k, lo, hi) => { const v = parseFloat(q.get(k)); return Number.isFinite(v) ? clamp(v, lo, hi) : null; };
const params = {
  level: num('level', 1, LEVELS.length), view: VIEW[q.get('view')] ? q.get('view') : null,
  rot: num('rot', 0, 3), zoom: num('zoom', 1, 8), mute: q.get('mute') === '1', fresh: q.get('fresh') === '1',
};

const store = createStore({ fresh: params.fresh });
const canvas = document.getElementById('stage');
const stage = createStage(canvas);
const rig = new CameraRig(stage.camera); rig.touch = stage.touch;
const garden = new Garden(stage);
const lanterns = new Lanterns(stage, garden);
const moth = new Moth(stage);
const ambient = new Ambient(stage);
const fx = new Fx(lanterns);
const ui = createUI({ bus, store });
const game = createGame({ bus, store, stage, rig, garden, lanterns, moth, fx, hud: ui.hud, params });
const input = createInput({ canvas, game, ui, rig, garden, stage, bus, store });

// ---- audio: optional module, loaded once, never when muted by URL
let audio = null;
if (!params.mute) {
  import('./audio/index.js')
    .then((m) => { audio = m.initAudio(bus, { music: store.settings.music, sfx: store.settings.sfx }) || null; })
    .catch(() => { /* the audio engine is a separate module; the game runs without it */ });
}

// ---- actions the interface can trigger
Object.assign(ui.actions, {
  gesture: game.gesture,
  undo: () => game.undo(), undoHold: (on) => input.setUndoHeld(on), reset: () => game.reset(),
  rotl: () => game.rotate(-1), rotr: () => game.rotate(1), view: () => game.cycleView(),
  zoomin: () => game.zoomBy(1), zoomout: () => game.zoomBy(-1),
  prev: () => game.prev(), next: () => game.next(), load: (n) => game.loadLevel(n),
  sound: (music, sfx) => { audio?.setMusic?.(music); audio?.setSfx?.(sfx); bus.emit('settings', { music, sfx }); },
});
moth.onIdle = (kind) => bus.emit('idle', { kind });

// ---- layout
// The camera frames the garden in what the interface leaves free. The interface blocks are measured on the live
// page (the parts of the HUD, the dock bar), so the framing follows whatever the interface looks like here.
function uiRects() {
  const out = [];
  const add = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return false;
    const b = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    // Blocks that touch or nearly touch count as one.
    const near = out.find((o) => b.x0 < o.x1 + 24 && b.x1 > o.x0 - 24 && b.y0 < o.y1 + 24 && b.y1 > o.y0 - 24);
    if (near) { near.x0 = Math.min(near.x0, b.x0); near.y0 = Math.min(near.y0, b.y0); near.x1 = Math.max(near.x1, b.x1); near.y1 = Math.max(near.y1, b.y1); }
    else out.push(b);
    return true;
  };
  const hud = document.getElementById('hud');
  if (hud) { let any = false; for (const el of hud.children) any = add(el) || any; if (!any) add(hud); }
  if (!add(document.querySelector('#dock .bar'))) add(document.getElementById('dock'));
  return out;
}
let laidOut = '';
function layout(force = true) {
  const rects = uiRects(), q4 = (v) => Math.round(v / 4);
  const key = stage.width + 'x' + stage.height + '|' + rects.map((r) => [q4(r.x0), q4(r.y0), q4(r.x1), q4(r.y1)].join(',')).join(';');
  if (key === laidOut && force !== true) return;
  laidOut = key;
  rig.setViewport(stage.width, stage.height, rects.length || !ui.insets ? { l: 0, t: 0, r: 0, b: 0 } : ui.insets(), rects);
}
addEventListener('resize', layout); addEventListener('orientationchange', layout);
bus.on('level:ready', () => layout(false));           // the interface has settled: measure it again
setTimeout(() => layout(false), 1200);
stage.resize(); layout();

// ---- first level
const view = params.view || store.settings.view || 'iso';
rig.setMode(VIEW[view] ? view : 'iso', true);
const first = params.level ?? clamp(store.last || 1, 1, LEVELS.length);
game.loadLevel(first);
ambient.setLevel(game.level, true);
if (params.level == null) ui.titleCard();
document.title = GAME_TITLE;

// ---- frame loop
let last = performance.now(), time = 0, lastLevel = game.level;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (dt <= 0) return;
  time += dt; G.uTime.value = time;
  if (stage.resize()) layout();

  input.update(dt);
  game.update(dt);
  if (game.level !== lastLevel) { lastLevel = game.level; ambient.setLevel(game.level); }
  const st = game.puzzle, warmTarget = st && st.boxes.length ? lanterns.items.reduce((s, it) => s + it.lit, 0) / st.boxes.length : 0;
  G.uWarm.value = damp(G.uWarm.value, warmTarget, 0.5, dt);

  garden.update(dt);
  lanterns.update(dt, time);
  moth.update(dt, time, moth._ctx || (moth._ctx = { nearLit: null }));
  moth._ctx.nearLit = game.idle ? game.nearLit() : null;
  ambient.update(dt, time, G.uWarm.value, moth.x, moth.z);
  fx.update(dt, time);

  rig.update(dt, game.followX, game.followZ);
  stage.aimMoon(rig.yawNow);

  const { field, glow, shade, shine } = stage;
  field.begin(); glow.begin(); shade.begin(); shine.begin();
  lanterns.emit(field, glow, shade, shine);
  const p = st ? st.player : null;
  moth.emit(field, glow, shade, p && game.phase !== 'teardown' ? garden.yAt(p.x, p.y) : 0);
  ambient.emit(field, glow);
  fx.emit(glow);
  glow.end(); shade.end(); shine.end();
  stage.render(dt);
}
requestAnimationFrame(frame);

// ---- test hooks (see gauntlet/BRIEF.md)
window.__game = {
  state: () => game.state(),
  loadLevel: (n) => game.loadLevel(n),
  input: (dir) => game.input(dir, { api: true }),
  debugWin: () => game.debugWin(),
  screenDirOf: (gridDir) => game.screenDirOf(gridDir),
  // extras for testing
  mothScreen: () => { const v = moth.root.position.clone().project(stage.camera); return { x: Math.round((v.x * 0.5 + 0.5) * stage.width), y: Math.round((-v.y * 0.5 + 0.5) * stage.height) }; },
  undo: () => game.undo(), reset: () => game.reset(), rotate: (dir) => game.rotate(dir),
  setView: (mode) => game.setView(mode), setZoom: (z) => game.setZoom(z), openPanel: (name) => (name ? ui.open(name) : ui.close()),
  // controls and camera
  walkTo: (x, y) => game.walkTo(x, y),                                  // tap-to-walk to a cell; returns the step count or -1
  cellScreen: (x, y, h = 0) => { const v = new THREE_V(garden.wx(x), h, garden.wz(y)).project(stage.camera); return { x: Math.round((v.x * 0.5 + 0.5) * stage.width), y: Math.round((-v.y * 0.5 + 0.5) * stage.height) }; },
  camera: () => ({ yaw: rig.yawNow, elev: rig.elevNow, yawTarget: rig.targetYaw, elevTarget: rig.targetElev, moving: rig.moving, panned: rig.panned, pan: [rig.panA.v, rig.panB.v], insets: { ...rig.insets }, rects: rig.rects, fit: rig.fit, cellPx: rig.pxPerUnit, zoomMax: rig.zoomMax, autoZoom: rig.autoZoom, autoTurn: rig.autoTurn }),
  levelTurn: (w, h, sw = stage.width, sh = stage.height) => levelTurn(w, h, sw, sh),
  wakeLocked: () => input.wakeLocked,
};
