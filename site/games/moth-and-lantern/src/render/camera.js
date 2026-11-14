// Camera rig. One orthographic camera described by yaw, elevation, zoom and a ground focus point.
//   zoom 1.0  = the whole level fits the free part of the screen (what the HUD and the dock leave over)
//   zoom >1.0 = the view follows the moth: the moth roams a window in the middle of the free screen, and the
//               view leans toward the middle of the level so the screen shows garden, not mist
// Every camera move (turn, view change, zoom, new level, resize) runs on a clock and ends dead on time: yaw,
// elevation, zoom, level size, insets and the focus all arrive together. Between moves the focus follows the
// moth on a soft spring. The player can also slide the view away from the moth (look-around, `panBy`).
import * as THREE from 'three';
import { VIEW, CAM } from '../config.js';
import { Spring, clamp } from '../util.js';

const RAD = Math.PI / 180;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

// 0 -> 1 with zero slope at both ends. The shape of a critically damped spring (fast start, long soft landing),
// but it arrives exactly at u = 1 instead of creeping.
export const settle = (u, n = CAM.settlePower) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, n) * (1 + n * u));

// The orientation a level opens in: 0 = as drawn, 1 = turned a quarter clockwise (grid "up" points to the right
// of the screen). A pure function of the level size and the screen shape, so a preview can show the same thing.
// A level is turned when that makes it clearly bigger on this screen: wide levels on portrait screens, tall
// levels on landscape screens.
export function levelTurn(w, h, screenW, screenH) {
  const a = screenW / Math.max(1, screenH);
  const keep = Math.min(a / w, 1 / h), turned = Math.min(a / h, 1 / w);
  return turned > keep * 1.2 ? 1 : 0;
}

const sameBands = (a, b) => a.l === b.l && a.t === b.t && a.r === b.r && a.b === b.b;

// A value that glides to its target in a fixed time and keeps the speed it had when the target changed.
class Glide {
  constructor(v = 0) { this.v = v; this.target = v; this.from = v; this.v0 = 0; this.vel = 0; this.t = 1; this.dur = 1; }
  set(v) { this.v = this.target = this.from = v; this.v0 = this.vel = 0; this.t = this.dur; return this; }
  to(target, dur) {
    if (target === this.target && (this.t < this.dur || this.v === target)) return this;
    if (!(dur > 0)) return this.set(target);
    this.from = this.v; this.v0 = this.vel; this.target = target; this.t = 0; this.dur = dur;
    return this;
  }
  step(dt) {
    if (this.t >= this.dur) { this.v = this.target; this.vel = 0; return this.v; }
    this.t = Math.min(this.dur, this.t + dt);
    const u = this.t / this.dur, prev = this.v;
    this.v = this.from + (this.target - this.from) * settle(u) + this.v0 * this.t * (1 - u) * (1 - u);
    this.vel = dt > 0 ? (this.v - prev) / dt : 0;
    return this.v;
  }
  get settled() { return this.t >= this.dur; }
}

// A Glide that is driven by assigning `target` (the staged zoom of build-in and celebration is set that way).
class Lens {
  constructor(v, dur) { this.g = new Glide(v); this.dur = dur; }
  get v() { return this.g.v; }
  get target() { return this.g.target; }
  set target(t) { this.g.to(t, this.dur); }
  set(v) { this.g.set(v); return this; }
  step(dt) { return this.g.step(dt); }
  get settled() { return this.g.settled; }
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'iso';
    this.turns = 0;                                  // unbounded count of 90 degree steps
    this.yaw = new Glide(0); this.elev = new Glide(50 * RAD); this.zoom = new Glide(1);
    this.extra = new Lens(1, CAM.stageTime);         // staged zoom multiplier (build-in, celebration): set `extra.target`
    this.fx = new Spring(0, ...CAM.springFocus);     // where the view rests for the target angles: ground x
    this.fz = new Spring(0, ...CAM.springFocus);     // ... ground z
    this.kickX = new Spring(0, 320, 22); this.kickZ = new Spring(0, 320, 22);
    this.panA = new Glide(0); this.panB = new Glide(0);          // look-around offset in the screen plane (world units)
    this.sx = new Glide(2); this.sz = new Glide(2);              // half size of the level box
    this.il = new Glide(0); this.it = new Glide(0); this.ir = new Glide(0); this.ib = new Glide(0);   // insets in use
    this.vw = 1280; this.vh = 800; this.bands = { l: 0, t: 0, r: 0, b: 0 }; this.rects = [];
    this.hx = 2; this.hz = 2; this.thx = 2; this.thz = 2; this.top = 0.8;
    this.touch = false; this.insets = { l: 0, t: 0, r: 0, b: 0 }; this.yawNow = 0; this.elevNow = 50 * RAD;   // insets: what is in use this frame
    this._tilt = null;
    this.onTurn = null;                              // called when the rig re-orients a level by itself (screen changed shape)
    this.autoZoom = true;                            // the zoom follows the default until the player picks one
    this.autoTurn = true;                            // the orientation follows `levelTurn` until the player turns
    this.pxPerUnit = 60; this.fit = 60;
    this.gx = 0; this.gz = 0; this.gvx = 0; this.gvz = 0;        // the focus on screen right now, and its speed
    this.blend = { t: 1, dur: 1, x: 0, z: 0, vx: 0, vz: 0 }; this._snap = true;
    this._quad = new Float64Array(8); this._c0 = new Float64Array(32); this._c1 = new Float64Array(32);
    this._p = {}; this._pt = {}; this._lo = [0, 0]; this._hi = [0, 0]; this._sa = 0; this._sb = 0;
    this.right = new THREE.Vector3(); this.up = new THREE.Vector3(); this.fwd = new THREE.Vector3();
    this._apply(0, 0, true);
  }

  get rot() { return ((this.turns % 4) + 4) % 4; }
  get targetYaw() { return (this.turns * 90 + VIEW[this.mode].yaw) * RAD; }
  get targetElev() { return this._tilt ?? VIEW[this.mode].elev * RAD; }
  get tilted() { return this._tilt != null; }
  get moving() { return !(this.yaw.settled && this.elev.settled && this.zoom.settled && this.blend.t >= this.blend.dur); }

  // ------------------------------------------------------------------ commands
  // `bands` are fixed insets ({l,t,r,b} in CSS px); `rects` are the boxes of interface blocks ({x0,y0,x1,y1}).
  // A block that spans most of an edge becomes an inset. A corner block is left alone when the level does not
  // reach it, and becomes an inset on its cheaper side when it does.
  // `dur` is the time the camera takes to glide to the new framing (default 0.4 s).
  setViewport(w, h, bands, rects, dur = 0.4) {
    const first = !this._sized, same = w === this.vw && h === this.vh && !bands && !rects;
    // Only the interface was measured again (same screen, same fixed insets): reframe, but keep the zoom.
    const remeasure = !first && w === this.vw && h === this.vh && rects && (!bands || sameBands(bands, this.bands));
    this.vw = w; this.vh = h; this._sized = true;
    if (bands) this.bands = bands;
    if (rects) this.rects = rects;
    if (same && !first) return;
    // A level the player has not turned follows the screen: it re-orients when the screen changes shape.
    const turn = this.autoTurn && this._lw ? levelTurn(this._lw, this._lh, w, h) : this.rot, turned = turn !== this.rot;
    if (turned) this._turnTo(turn);
    this._retarget(first ? 0 : turned ? Math.max(dur, CAM.turnTime) : dur, !remeasure);
    if (turned) this.onTurn?.();
  }

  // A new level: size, orientation and zoom in one move. `rot` and `zoom` are the player's own (saved or from
  // the URL); without them the level opens in its predictable orientation at the default zoom.
  openLevel(w, h, { rot = null, zoom = null, instant = false, dur = CAM.levelTime } = {}) {
    this._lw = w; this._lh = h; this.thx = w / 2; this.thz = h / 2;
    this.autoTurn = rot == null; this.autoZoom = zoom == null;
    this._turnTo(rot == null ? levelTurn(w, h, this.vw, this.vh) : rot);
    if (zoom != null) this.zoom.target = zoom;
    this.panA.to(0, 0.3); this.panB.to(0, 0.3);
    this._tilt = null;
    this._retarget(instant ? 0 : dur);
  }
  setLevel(w, h, instant = false) { this.openLevel(w, h, { rot: this.rot, zoom: this.autoZoom ? null : this.zoom.target, instant }); }

  setMode(mode, instant = false) { this.mode = mode; this._tilt = null; this._retarget(instant ? 0 : CAM.viewTime); }
  // A passing elevation of its own (degrees) for a staged moment; null returns to the elevation of the view mode.
  tilt(deg, dur = CAM.viewTime) { this._tilt = deg == null ? null : deg * RAD; this._retarget(dur); }
  // The player turns the view: from now on this level keeps the player's orientation.
  rotate(dir) { this.turns += dir; this.autoTurn = false; this._retarget(CAM.turnTime); }
  setRot(rot, instant = false) { this._turnTo(rot); this.autoTurn = false; this._retarget(instant ? 0 : CAM.turnTime); }
  _turnTo(rot) { let d = (((rot - this.rot) % 4) + 4) % 4; if (d === 3) d = -1; this.turns += d; }   // the short way round

  // The player's own zoom. Returns the zoom that was set.
  setZoom(z, instant = false, dur = CAM.zoomTime) {
    this.autoZoom = false;
    const t = clamp(z, CAM.zoomMin, this.zoomMax);
    if (t !== this.zoom.target || instant) { this.zoom.to(t, instant ? 0 : dur); this._move(instant ? 0 : dur); }
    return t;
  }
  kick(dx, dz, amount) { this.kickX.vel += dx * amount; this.kickZ.vel += dz * amount; }

  // Look-around: slide the view by screen pixels, never past the level. `panHome` glides back to the moth.
  panBy(dxPx, dyPx) {
    const s = this.pxPerUnit;
    this.panA.set(clamp(this.panA.v - dxPx / s, this._lo[0], this._hi[0]));
    this.panB.set(clamp(this.panB.v + dyPx / s, this._lo[1], this._hi[1]));
  }
  panHome(dur = CAM.homeTime) { this.panA.to(0, dur); this.panB.to(0, dur); }
  get panned() { return Math.abs(this.panA.target) > 1e-3 || Math.abs(this.panB.target) > 1e-3; }

  // The angles, the level or the screen changed: pick the insets and the zoom for the new state and glide there.
  _retarget(dur, rezoom = true) {
    this.yaw.to(this.targetYaw, dur); this.elev.to(this.targetElev, dur);
    this.sx.to(this.thx, dur); this.sz.to(this.thz, dur);
    const ins = this._chooseInsets();
    this.il.to(ins.l, dur); this.it.to(ins.t, dur); this.ir.to(ins.r, dur); this.ib.to(ins.b, dur);
    const z = this.autoZoom && rezoom ? this.defaultZoom() : Math.min(this.zoom.target, this.zoomMax);
    this.zoom.to(clamp(z, CAM.zoomMin, this.zoomMax), dur);
    if (dur > 0 && this.panned) this.panHome(dur);
    this._move(dur);
  }
  // Starts a focus glide from where the view is now to where it will rest.
  _move(dur) {
    const b = this.blend, left = b.dur - b.t;                    // a short move never cuts a longer one short
    b.x = this.gx; b.z = this.gz; b.vx = this.gvx; b.vz = this.gvz; b.t = 0; b.dur = Math.max(1e-3, dur > 0 ? Math.max(dur, left) : 0);
    if (!(dur > 0)) b.t = b.dur;
    this._snap = true;
  }

  // ------------------------------------------------------------------ geometry
  _basis(yaw, elev) {
    const sy = Math.sin(yaw), cy = Math.cos(yaw), se = Math.sin(elev), ce = Math.cos(elev);
    this.right.set(cy, 0, -sy);
    this.up.set(-se * sy, ce, -se * cy);
    this.fwd.set(-ce * sy, -se, -ce * cy);
  }

  // Projects the level box on the screen plane for the given angles. Returns extents; sets the basis.
  _project(yaw, elev, out, hx = this.hx, hz = this.hz) {
    this._basis(yaw, elev);
    const r = this.right, u = this.up;
    let minA = 1e9, maxA = -1e9, minB = 1e9, maxB = -1e9;
    for (let i = 0; i < 8; i++) {
      const x = (i & 1 ? 1 : -1) * (hx + 0.1), z = (i & 2 ? 1 : -1) * (hz + 0.1), y = i & 4 ? this.top : -0.25;
      const a = x * r.x + z * r.z, b = x * u.x + y * u.y + z * u.z;
      if (a < minA) minA = a; if (a > maxA) maxA = a; if (b < minB) minB = b; if (b > maxB) maxB = b;
    }
    out.minA = minA; out.maxA = maxA; out.minB = minB; out.maxB = maxB;
    return out;
  }

  // Pixels per world unit at 100% for a projected box inside the given insets.
  _fitIn(p, l, t, r, b) {
    const m = CAM.marginFrac * Math.min(this.vw, this.vh);
    const aw = Math.max(40, this.vw - l - r - m * 2), ah = Math.max(40, this.vh - t - b - m * 2);
    return Math.min(aw / (p.maxA - p.minA), ah / (p.maxB - p.minB), CAM.maxCellPx);
  }
  // The same for the state the camera is heading to.
  _fitTarget() {
    const p = this._project(this.targetYaw, this.targetElev, this._pt, this.thx, this.thz);
    return this._fitIn(p, this.il.target, this.it.target, this.ir.target, this.ib.target);
  }

  // Does the level, drawn at scale s around the middle of the given insets, touch the interface block o?
  // Separating axes: the screen axes and the two ground edges of the level box. Uses the basis set by _project.
  _touches(o, p, s, l, t, r, b) {
    const pad = 10, cx = (l + this.vw - r) / 2, cy = (t + this.vh - b) / 2, ca = (p.minA + p.maxA) / 2, cb = (p.minB + p.maxB) / 2;
    const x0 = o.x0 - pad, x1 = o.x1 + pad, y0 = o.y0 - pad, y1 = o.y1 + pad;
    if (cx + (p.minA - ca) * s > x1 || cx + (p.maxA - ca) * s < x0 || cy - (p.maxB - cb) * s > y1 || cy - (p.minB - cb) * s < y0) return false;
    const R = this.right, U = this.up, hx = this.thx + 0.1, hz = this.thz + 0.1;
    const ex = [R.x, U.x], ez = [R.z, U.z], yLo = -0.25 * U.y, yHi = this.top * U.y;
    for (const [e, f, hf] of [[ex, ez, hz], [ez, ex, hx]]) {
      const nx = -e[1], ny = e[0];                          // normal of this ground edge, in plane coordinates
      const half = hf * Math.abs(f[0] * nx + f[1] * ny), lo = -half + Math.min(yLo * ny, yHi * ny), hi = half + Math.max(yLo * ny, yHi * ny);
      let mn = 1e9, mx = -1e9;
      for (let i = 0; i < 4; i++) {
        const a = ca + ((i & 1 ? x1 : x0) - cx) / s, bb = cb - ((i & 2 ? y1 : y0) - cy) / s, d = a * nx + bb * ny;
        if (d < mn) mn = d; if (d > mx) mx = d;
      }
      if (mn > hi || mx < lo) return false;
    }
    return true;
  }

  // Insets for the state the camera is heading to: the choice that gives the biggest level at 100%.
  _chooseInsets() {
    const B = this.bands, vw = this.vw, vh = this.vh, gap = 4;
    const p = this._project(this.targetYaw, this.targetElev, this._pt, this.thx, this.thz);
    const opts = [];
    for (const o of this.rects) {
      const horiz = (o.y0 + o.y1) / 2 < vh / 2 ? { t: o.y1 + gap } : { b: vh - o.y0 + gap };
      const vert = (o.x0 + o.x1) / 2 < vw / 2 ? { l: o.x1 + gap } : { r: vw - o.x0 + gap };
      const wide = o.x1 - o.x0 >= vw * 0.6, tall = o.y1 - o.y0 >= vh * 0.6;
      opts.push(wide ? [horiz] : tall ? [vert] : [null, horiz, vert]);
    }
    let best = null, bestScore = -1;
    const pick = new Array(opts.length).fill(0);
    for (;;) {
      const ins = { l: B.l, t: B.t, r: B.r, b: B.b }; let used = 0;
      for (let i = 0; i < opts.length; i++) { const c = opts[i][pick[i]]; if (c) { used++; for (const k in c) ins[k] = Math.max(ins[k], c[k]); } }
      const s = this._fitIn(p, ins.l, ins.t, ins.r, ins.b);
      let ok = true;
      for (let i = 0; i < opts.length && ok; i++) if (!opts[i][pick[i]] && this._touches(this.rects[i], p, s, ins.l, ins.t, ins.r, ins.b)) ok = false;
      const score = s * (1 - 0.01 * used);
      if (ok && score > bestScore) { bestScore = score; best = ins; }
      let i = 0;
      while (i < opts.length && ++pick[i] >= opts[i].length) pick[i++] = 0;
      if (i >= opts.length) break;
    }
    return best || { l: B.l, t: B.t, r: B.r, b: B.b };
  }

  // The top of the zoom range for the state the camera is heading to: 180%, or more on a screen where 180% would
  // leave cells under CAM.cellPxFloor.
  get zoomMax() { return Math.max(CAM.zoomMax, Math.ceil((CAM.cellPxFloor / this._fitTarget()) * 20 - 1e-6) / 20); }
  // One press of + or -: a fifth of the range, never less than CAM.zoomStep.
  get zoomStep() { return Math.max(CAM.zoomStep, Math.round(((this.zoomMax - CAM.zoomMin) / 5) * 20) / 20); }

  // The zoom a level starts with: 100% unless cells would look tiny.
  defaultZoom() {
    const want = this.touch ? CAM.minCellPxTouch : CAM.minCellPx, fit = this._fitTarget();
    if (fit >= want * CAM.fitSlack) return CAM.zoomMin;          // nearly big enough: showing the whole level is worth more
    return clamp(Math.round((want / fit) * 20) / 20, CAM.zoomMin, this.zoomMax);
  }

  // Where the view rests for the given angles, zoom, insets and moth position. Result in this._g (ground x, z).
  _focus(yaw, elev, zoom, hx, hz, l, t, r, b, followX, followZ) {
    const p = this._project(yaw, elev, this._pt, hx, hz), R = this.right, U = this.up;
    const s = this._fitIn(p, l, t, r, b) * zoom, m = CAM.marginFrac * Math.min(this.vw, this.vh);
    const halfA = (this.vw - l - r - m * 2) / (2 * s), halfB = (this.vh - t - b - m * 2) / (2 * s);
    const ma = followX * R.x + followZ * R.z, mb = followX * U.x + 0.3 * U.y + followZ * U.z;
    const ca = (p.minA + p.maxA) / 2, cb = (p.minB + p.maxB) / 2, k = CAM.window;
    // Lean toward the middle of the level, but keep the moth inside its window; never look past the level.
    let fa = clamp(ca, ma - k * halfA, ma + k * halfA), fb = clamp(cb, mb - k * halfB, mb + k * halfB);
    fa = p.maxA - p.minA <= halfA * 2 ? ca : clamp(fa, p.minA + halfA, p.maxA - halfA);
    fb = p.maxB - p.minB <= halfB * 2 ? cb : clamp(fb, p.minB + halfB, p.maxB - halfB);
    // In a turned view the level is a slanted shape and its box has empty corners: slide the view to where it
    // shows the most garden, as far as the moth's outer window allows.
    if (p.maxA - p.minA > halfA * 2 || p.maxB - p.minB > halfB * 2) {
      const wa = (this.vw - l - r) / (2 * s), wb = (this.vh - t - b) / (2 * s), k2 = CAM.windowOuter, Q = this._quad;
      for (let i = 0; i < 4; i++) { const x = (i === 0 || i === 3 ? -1 : 1) * hx, z = (i < 2 ? -1 : 1) * hz; Q[i * 2] = x * R.x + z * R.z; Q[i * 2 + 1] = x * U.x + z * U.z; }
      const loA = Math.min(fa, ma - k2 * halfA), hiA = Math.max(fa, ma + k2 * halfA), loB = Math.min(fb, mb - k2 * halfB), hiB = Math.max(fb, mb + k2 * halfB);
      // Worth = garden shown, less a price for carrying the moth away from the middle of its window.
      const a0 = fa, b0 = fb, pull = CAM.coverPull;
      let best = this._cover(fa, fb, wa, wb), d = Math.min(halfA, halfB) * 0.5;
      if (best < wa * wb * 4 - 1e-3) for (let it = 0; it < 16 && d > 0.02; it++) {
        let moved = false;
        for (let q = 0; q < 4; q++) {
          const na = clamp(fa + (q === 0 ? d : q === 1 ? -d : 0), loA, hiA), nb = clamp(fb + (q === 2 ? d : q === 3 ? -d : 0), loB, hiB), c = this._cover(na, nb, wa, wb) - pull * ((na - a0) * (na - a0) + (nb - b0) * (nb - b0));
          if (c > best + 1e-4) { best = c; fa = na; fb = nb; moved = true; }
        }
        if (!moved) d *= 0.5;
      }
    }
    // The moth never stands under an interface block: near one, the view slides so the moth stays clear of it.
    if (this.rects.length && (p.maxA - p.minA > halfA * 2 || p.maxB - p.minB > halfB * 2)) {
      const cx = (l + this.vw - r) / 2, cy = (t + this.vh - b) / 2, pad = s * 0.9 + 6, ramp = s * 1.6;
      for (const o of this.rects) {
        const sx = cx + (ma - fa) * s, sy = cy - (mb - fb) * s;
        if (o.y1 - o.y0 >= this.vh * 0.6) {                 // a column at the side: slide sideways
          const d = sy < o.y0 - pad ? o.y0 - pad - sy : sy > o.y1 + pad ? sy - o.y1 - pad : 0, w = clamp(1 - d / ramp, 0, 1);
          if ((o.x0 + o.x1) / 2 < this.vw / 2) { const lim = w * (o.x1 + pad); if (sx < lim) fa -= (lim - sx) / s; }
          else { const lim = this.vw - w * (this.vw - o.x0 + pad); if (sx > lim) fa += (sx - lim) / s; }
        } else {                                            // a block at the top or the bottom: slide up or down
          const d = sx < o.x0 - pad ? o.x0 - pad - sx : sx > o.x1 + pad ? sx - o.x1 - pad : 0, w = clamp(1 - d / ramp, 0, 1);
          if ((o.y0 + o.y1) / 2 < this.vh / 2) { const lim = w * (o.y1 + pad); if (sy < lim) fb += (lim - sy) / s; }
          else { const lim = this.vh - w * (this.vh - o.y0 + pad); if (sy > lim) fb -= (sy - lim) / s; }
        }
      }
    }
    // Back to a ground point, so the focus stays put while the view turns.
    const tt = fb / Math.sin(elev), g = this._g || (this._g = { x: 0, z: 0 });
    g.x = R.x * fa - Math.sin(yaw) * tt; g.z = R.z * fa - Math.cos(yaw) * tt;
    return g;
  }

  // Area of the level's ground shape (this._quad, screen-plane coordinates) inside a view rectangle.
  _cover(ca, cb, wa, wb) {
    let src = this._c0, dst = this._c1, n = 4;
    for (let i = 0; i < 8; i++) src[i] = this._quad[i];
    for (let e = 0; e < 4 && n; e++) {
      const ax = e >> 1, lim = e === 0 ? ca - wa : e === 1 ? ca + wa : e === 2 ? cb - wb : cb + wb, ge = (e & 1) === 0;
      let m = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, pa = src[i * 2], pb = src[i * 2 + 1], qa = src[j * 2], qb = src[j * 2 + 1];
        const pv = ax ? pb : pa, qv = ax ? qb : qa, pin = ge ? pv >= lim : pv <= lim, qin = ge ? qv >= lim : qv <= lim;
        if (pin) { dst[m * 2] = pa; dst[m * 2 + 1] = pb; m++; }
        if (pin !== qin) { const u = (lim - pv) / (qv - pv); dst[m * 2] = pa + (qa - pa) * u; dst[m * 2 + 1] = pb + (qb - pb) * u; m++; }
      }
      n = m; const tmp = src; src = dst; dst = tmp;
    }
    let area = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += src[i * 2] * src[j * 2 + 1] - src[j * 2] * src[i * 2 + 1]; }
    return Math.abs(area) / 2;
  }

  // The ground point (at height y) under a screen pixel. Used for taps.
  groundAt(px, py, y = 0, out = {}) {
    this._basis(this.yawNow, this.elevNow);
    const s = this.pxPerUnit, R = this.right, U = this.up;
    const a = this._sa + (px - this.vw / 2) / s, b = this._sb - (py - this.vh / 2) / s - y * U.y;
    const det = R.x * U.z - R.z * U.x;
    out.x = (a * U.z - R.z * b) / det; out.z = (R.x * b - U.x * a) / det;
    return out;
  }

  // ------------------------------------------------------------------ frame
  update(dt, followX, followZ, instant = false) {
    this.yaw.step(dt); this.elev.step(dt); this.zoom.step(dt); this.extra.step(dt);
    this.kickX.step(dt); this.kickZ.step(dt); this.panA.step(dt); this.panB.step(dt);
    this.hx = this.sx.step(dt); this.hz = this.sz.step(dt);
    this.il.step(dt); this.it.step(dt); this.ir.step(dt); this.ib.step(dt);
    this._apply(followX, followZ, instant, dt);
  }

  _apply(followX, followZ, instant, dt = 0.016) {
    const maxElev = 90 * RAD, minElev = 12 * RAD;
    // 1. Where the view will rest: computed for the target state, followed softly while the moth walks.
    const g = this._focus(this.yaw.target, clamp(this.elev.target, minElev, maxElev), this.zoom.target * this.extra.v, this.thx, this.thz,
      this.il.target, this.it.target, this.ir.target, this.ib.target, followX, followZ);
    this.fx.target = g.x; this.fz.target = g.z;
    if (instant || this._snap) { this.fx.set(g.x); this.fz.set(g.z); this._snap = false; } else { this.fx.step(dt); this.fz.step(dt); }
    // 2. The focus on screen: during a camera move it glides from where it was to the resting point.
    const b = this.blend; let nx = this.fx.v, nz = this.fz.v;
    if (instant) b.t = b.dur;
    if (b.t < b.dur) {
      b.t = Math.min(b.dur, b.t + dt);
      const u = b.t / b.dur, e = settle(u), c = b.t * (1 - u) * (1 - u);
      nx = b.x + (nx - b.x) * e + b.vx * c; nz = b.z + (nz - b.z) * e + b.vz * c;
    }
    this.gvx = instant || dt <= 0 ? 0 : (nx - this.gx) / dt; this.gvz = instant || dt <= 0 ? 0 : (nz - this.gz) / dt;
    this.gx = nx; this.gz = nz;
    // 3. The camera for the angles and the zoom of this frame.
    const yaw = this.yaw.v, elev = clamp(this.elev.v, minElev, maxElev);
    const zoom = clamp(this.zoom.v, 0.9, 40) * this.extra.v;
    const p = this._project(yaw, elev, this._p), r = this.right, u = this.up;
    const il = this.il.v, it = this.it.v, ir = this.ir.v, ib = this.ib.v;
    const s0 = this._fitIn(p, il, it, ir, ib), s = s0 * zoom, m = CAM.marginFrac * Math.min(this.vw, this.vh);
    const halfA = (this.vw - il - ir - m * 2) / (2 * s), halfB = (this.vh - it - ib - m * 2) / (2 * s);
    const wx = nx + this.kickX.v, wz = nz + this.kickZ.v;
    let pa = wx * r.x + wz * r.z, pb = wx * u.x + wz * u.z;
    // Look-around offset, kept inside the level.
    this._lo[0] = Math.min(0, p.minA + halfA - pa); this._hi[0] = Math.max(0, p.maxA - halfA - pa);
    this._lo[1] = Math.min(0, p.minB + halfB - pb); this._hi[1] = Math.max(0, p.maxB - halfB - pb);
    pa += clamp(this.panA.v, this._lo[0], this._hi[0]); pb += clamp(this.panB.v, this._lo[1], this._hi[1]);
    // The focus sits in the middle of the free area, which is not the middle of the screen.
    const ox = (il - ir) / 2, oy = (it - ib) / 2;
    const sa = pa - ox / s, sb = pb + oy / s, D = CAM.distance, f = this.fwd, cam = this.camera;
    cam.position.set(r.x * sa + u.x * sb - f.x * D, u.y * sb - f.y * D, r.z * sa + u.z * sb - f.z * D);
    _e.set(-elev, yaw, 0); cam.quaternion.copy(_q.setFromEuler(_e));
    const hw = this.vw / (2 * s), hh = this.vh / (2 * s);
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.near = 1; cam.far = D * 2 + 80;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    this._sa = sa; this._sb = sb;
    this.pxPerUnit = s; this.fit = s0; this.yawNow = yaw; this.elevNow = elev;
    const I = this.insets; I.l = il; I.t = it; I.r = ir; I.b = ib;
  }
}
