// The garden island: flagstones, a cut-stone coping under every wall, clipped hedges on top of it, hanging basalt
// underneath, carved plinths, grass, blossoms. Every wall is the same thing: coping plus box hedge. The hedge is
// tall where it hides nothing and trimmed low where a tall one would hide a gameplay cell from the current view.
// Everything is instanced and pre-allocated; a level only rewrites instance matrices and colours.
// Owns three kinds of motion: the build-in / tear-down wave, hedges that grow and sink with the view
// (so a wall never hides a gameplay cell), and small reactions (tile presses, the celebration wave, blossoms).
import * as THREE from 'three';
import { PALETTE, WALL } from '../config.js';
import { gardenMaterial, hedgeDepthMaterial } from './materials.js';
import { chamferBox, boxColumn, hedgeGrid, writeTS, paintBy, merge } from './geo.js';
import { ease, clamp01, hash2, damp } from '../util.js';
import { SENSE } from './sense.js';

const MAX = 520, MAX_PLINTH = 64, MAX_TUFT = 2600, MAX_BLOSSOM = 700;
const DEPTH = 3.7;          // how far below the floor a cell waits before it rises
const RISE = 0.56, FALL = 0.44;
const DROP = 4.3;           // how far a leaving cell sinks: deep enough to dissolve into the mist completely

function instanced(geo, mat, count, cast, receive) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.castShadow = cast; m.receiveShadow = receive; m.frustumCulled = false; m.count = 0;
  return m;
}

function tuftGeometry() {
  // A small clump of grass: thin curved blades fanning out, dark at the root and pale at the tip.
  const blades = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3 + (i % 3) * 0.21, lean = 0.012 + ((i * 7) % 5) * 0.009, hgt = 0.085 + ((i * 5) % 7) * 0.017, wdt = 0.011;
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa * wdt, pz = ca * wdt, bx = ca * 0.018, bz = sa * 0.018;
    const at = (t, side) => { const k = side * (1 - Math.pow(t, 1.4) * 0.85); return [bx + ca * lean * t * t + px * k, hgt * t, bz + sa * lean * t * t + pz * k]; };
    const T = [0, 0.42, 0.78], pos = [];
    for (let k = 0; k < 2; k++) pos.push(...at(T[k], -1), ...at(T[k], 1), ...at(T[k + 1], 1), ...at(T[k], -1), ...at(T[k + 1], 1), ...at(T[k + 1], -1));
    pos.push(...at(T[2], -1), ...at(T[2], 1), bx + ca * lean, hgt, bz + sa * lean);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    blades.push(g);
  }
  const g = merge(blades);
  // Normals point up so the blades take light like the ground does.
  const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  const lo = new THREE.Color(PALETTE.hedge).multiplyScalar(0.8), hi = new THREE.Color(PALETTE.hedgeTip).multiplyScalar(0.9);
  return paintBy(g, (x, y, z, o) => { const t = clamp01(y / 0.17); o[0] = lo.r + (hi.r - lo.r) * t; o[1] = lo.g + (hi.g - lo.g) * t; o[2] = lo.b + (hi.b - lo.b) * t; });
}

function blossomGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, p = new THREE.CircleGeometry(0.03, 7);
    p.rotateX(-Math.PI / 2); p.scale(1.25, 1, 0.8); p.rotateY(-a); p.translate(Math.cos(a) * 0.034, 0.012, Math.sin(a) * 0.034);
    parts.push(paintBy(p, (x, y, z, o) => { o[0] = 1; o[1] = 1; o[2] = 1; }));
  }
  const c = new THREE.CircleGeometry(0.017, 7); c.rotateX(-Math.PI / 2); c.translate(0, 0.016, 0);
  parts.push(paintBy(c, (x, y, z, o) => { o[0] = 1.0; o[1] = 0.72; o[2] = 0.3; }));
  return merge(parts);
}

function plinthGeometry() {
  // A carved stone plinth: eight-sided, a stepped foot, a raised rim around a shallow dish for the lantern.
  const P = [[0.001, 0.058], [0.235, 0.058], [0.262, 0.09], [0.325, 0.09], [0.345, 0.07], [0.345, 0.04], [0.375, 0.03], [0.375, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(P.reverse(), 8);
  g.rotateY(Math.PI / 8);
  return g;
}

// Height of a hedge above its coping for a raise amount 0 (trimmed low) .. 1 (tall).
const hedgeHeight = (s, low = WALL.lowH) => (low + (WALL.hedgeH - low) * s) * (1 + 0.1 * Math.sin(s * Math.PI));

export class Garden {
  constructor(stage) {
    this.group = new THREE.Group(); stage.scene.add(this.group);
    this.stage = stage;
    this.tiles = instanced(chamferBox(0.96, 0.22, 0.96, 0.026), gardenMaterial({ kind: 'paver', aoGain: 0.95, rimGain: 0.25 }), MAX, false, true);
    this.columns = instanced(boxColumn(1.004), gardenMaterial({ kind: 'earth', color: PALETTE.earthTop, lightGain: 0.5, aoGain: 0, rimGain: 0.3 }), MAX, false, true);
    this.curbs = instanced(chamferBox(1.0, WALL.curbH + 0.22, 1.0, 0.024), gardenMaterial({ kind: 'curb', aoGain: 0.2, rimGain: 0.3 }), MAX, true, true);
    this.hedges = instanced(hedgeGrid(), gardenMaterial({ kind: 'hedge', color: PALETTE.hedge, aoGain: 0, rimGain: 0.55 }), MAX, true, true);
    this.hedges.customDepthMaterial = hedgeDepthMaterial();
    this.aNbr = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aH = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage);
    this.aDiag = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
    this.hedges.geometry.setAttribute('aNbr', this.aNbr); this.hedges.geometry.setAttribute('aH', this.aH); this.hedges.geometry.setAttribute('aDiag', this.aDiag);
    this.plinths = instanced(plinthGeometry(), gardenMaterial({ kind: 'stone', color: PALETTE.plinth, flatShading: true, aoGain: 0, rimGain: 0.7 }), MAX_PLINTH, true, true);
    this.tufts = instanced(tuftGeometry(), gardenMaterial({ kind: 'grass', vertexColors: true, side: THREE.DoubleSide, aoGain: 0, rimGain: 0 }), MAX_TUFT, false, false);
    this.blossoms = instanced(blossomGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), MAX_BLOSSOM, false, false);
    this.group.add(this.columns, this.tiles, this.curbs, this.hedges, this.plinths, this.tufts, this.blossoms);
    this.level = null; this.phase = 'none'; this.clock = 0; this.span = 1;
    this.delay = new Float32Array(MAX); this.cellY = new Float32Array(MAX);
    this.hedgeS = new Float32Array(MAX); this.hedgeT = new Float32Array(MAX); this.hedgeWait = new Float32Array(MAX);
    this.hedgeNow = new Float32Array(MAX).fill(-1); this.wallK = null;
    this.low = WALL.lowH; this.lowT = WALL.lowH;          // height of a trimmed hedge now, and where it is heading
    this.presses = []; this.waveT = -1; this.waveX = 0; this.waveZ = 0;
    this.bloomT = -1; this._c = new THREE.Color();
    this.viewYaw = 0; this.viewElev = Math.PI / 4;
    this.waveV = 9; this.calm = false;          // calm: reduced motion, the garden settles in place instead of travelling
    this.ghost = new Ghost(this);
  }

  wx(x) { return x - (this.level.w - 1) / 2; }
  wz(y) { return y - (this.level.h - 1) / 2; }

  // Lays out a level. Everything starts hidden below the mist; call startBuild() to raise it.
  setLevel(level) {
    this.level = level;
    const { w, h, wall, floor, goal, start } = level, c = this._c;
    this.floorCells = []; this.wallCells = []; this.goalCells = []; this.tuftList = []; this.blossomList = [];
    // Distance to the island edge, for the length of the rock columns.
    const solid = new Uint8Array(w * h), dist = new Int16Array(w * h).fill(99);
    for (let i = 0; i < w * h; i++) solid[i] = wall[i] || floor[i] ? 1 : 0;
    const q = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!solid[i]) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !solid[i - 1] || !solid[i + 1] || !solid[i - w] || !solid[i + w]) { dist[i] = 0; q.push(i); }
    }
    for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w; for (const j of [i - 1, i + 1, i - w, i + w]) { if (j < 0 || j >= w * h || !solid[j] || dist[j] <= dist[i] + 1) continue; if (Math.abs((j % w) - x) > 1) continue; dist[j] = dist[i] + 1; q.push(j); } }
    let maxD = 0;
    const ta = this.tiles, pa = new THREE.Color(PALETTE.paverA), pb = new THREE.Color(PALETTE.paverB), cu = new THREE.Color(PALETTE.curb), ea = new THREE.Color(1, 1, 1);
    this.colLen = new Float32Array(w * h); this.cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!solid[i]) continue;
      const d = Math.hypot(x - start.x, y - start.y); maxD = Math.max(maxD, d);
      const cell = { i, x, y, d, wall: wall[i] === 1, idx: this.cells.length, k: wall[i] ? this.wallCells.length : this.floorCells.length };
      this.cells.push(cell);
      this.colLen[cell.idx] = 0.5 + Math.min(dist[i], 5) * 0.62 + hash2(x * 3 + 1, y * 7 + 2) * (0.5 + Math.min(dist[i], 3) * 0.3);
      const v = 0.94 + hash2(x, y) * 0.12;
      if (cell.wall) {
        this.wallCells.push(cell);
        this.curbs.setColorAt(cell.k, c.copy(cu).multiplyScalar(v));
        this.hedges.setColorAt(cell.k, c.setRGB(1, 1, 1));
        cell.hh = 1;
        const nb = 1 + (hash2(x + 31, y + 17) > 0.5 ? 1 : 0);
        for (let b = 0; b < nb && this.blossomList.length < MAX_BLOSSOM; b++) {
          this.blossomList.push({ cell, ox: (hash2(x + b * 13, y + 41) - 0.5) * 0.62, oz: (hash2(x + 57, y + b * 29) - 0.5) * 0.62, s: 0.8 + hash2(x + b, y + 77) * 0.7, warm: hash2(x + 3 * b, y + 5) > 0.6 });
        }
      } else {
        this.floorCells.push(cell);
        ta.setColorAt(cell.k, c.copy((x + y) % 2 ? pa : pb).multiplyScalar(v));
        if (goal[i]) { cell.goal = this.goalCells.length; this.goalCells.push(cell); }
        else for (let dir = 0; dir < 4 && this.tuftList.length < MAX_TUFT; dir++) {
          const dx = [0, 1, 0, -1][dir], dy = [-1, 0, 1, 0][dir], nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !wall[ny * w + nx]) continue;
          const r = hash2(x * 5 + dir, y * 9 + dir * 3); if (r > 0.42) continue;
          const lat = (hash2(x + dir * 7, y + 19) - 0.5) * 0.66;
          this.tuftList.push({ cell, ox: dx * 0.385 + (dx ? 0 : lat), oz: dy * 0.385 + (dy ? 0 : lat), s: 0.75 + r * 1.6 });
        }
      }
      this.columns.setColorAt(cell.idx, c.copy(ea).multiplyScalar(0.85 + hash2(x + 9, y + 9) * 0.3));
    }
    this.maxD = Math.max(1, maxD);
    this.tiles.count = this.floorCells.length; this.columns.count = this.cells.length;
    this.curbs.count = this.wallCells.length; this.hedges.count = this.wallCells.length;
    this.plinths.count = this.goalCells.length; this.tufts.count = this.tuftList.length; this.blossoms.count = this.blossomList.length;
    for (const m of [this.tiles, this.columns, this.curbs, this.hedges]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    for (let b = 0; b < this.blossomList.length; b++) this.blossoms.setColorAt(b, c.set(this.blossomList[b].warm ? PALETTE.blossomWarm : PALETTE.blossom));
    if (this.blossoms.instanceColor) this.blossoms.instanceColor.needsUpdate = true;
    this.hedgeS.fill(0); this.hedgeT.fill(0); this.hedgeWait.fill(0); this.hedgeNow.fill(-1);
    // Wall neighbours of every wall cell (+x, -x, +z, -z), for hedges that fuse into one run.
    this.wallK = new Int16Array(w * h).fill(-1); for (const cell of this.wallCells) this.wallK[cell.i] = cell.k;
    for (const cell of this.wallCells) cell.nb = [cell.x + 1 < w ? this.wallK[cell.i + 1] : -1, cell.x > 0 ? this.wallK[cell.i - 1] : -1, cell.y + 1 < h ? this.wallK[cell.i + w] : -1, cell.y > 0 ? this.wallK[cell.i - w] : -1];
    // Diagonal wall neighbours (+x+z, -x+z, +x-z, -x-z): an L-shaped run needs them to shape its inner corner.
    const isWall = (x, y) => x >= 0 && y >= 0 && x < w && y < h && wall[y * w + x] === 1, D = this.aDiag.array;
    for (const cell of this.wallCells) { const o = cell.k * 4, x = cell.x, y = cell.y; D[o] = isWall(x + 1, y + 1) ? 1 : 0; D[o + 1] = isWall(x - 1, y + 1) ? 1 : 0; D[o + 2] = isWall(x + 1, y - 1) ? 1 : 0; D[o + 3] = isWall(x - 1, y - 1) ? 1 : 0; }
    this.aDiag.needsUpdate = true;
    this.phase = 'hidden'; this.clock = 0; this.presses.length = 0; this.waveT = -1; this.bloomT = -1;
    this._write();
  }

  // Raise the island in a ripple that starts at the moth's cell. `span` is how long the ripple takes to reach
  // the farthest cell (each cell then needs RISE to come up); without it the ripple fills `duration`.
  startBuild(duration, span = null) {
    this.phase = 'in'; this.clock = 0;
    this.span = span != null ? Math.max(0.02, span) : Math.max(0.05, duration - RISE - 0.25);
    for (const cell of this.cells) this.delay[cell.idx] = (cell.d / this.maxD) * this.span * 0.9 + hash2(cell.x, cell.y + 50) * this.span * 0.1;
    for (const cell of this.wallCells) { this.hedgeS[cell.k] = 0; this.hedgeWait[cell.k] = this.clockAll + this.delay[cell.idx] + RISE * 0.75; }
  }

  // Let the island sink back into the mist, far cells first, the moth's cell last. The leaving island is handed
  // to the ghost (a twin of every mesh), so this garden is free at once to lay out and raise the next level
  // while the old one is still going: the stage is never empty.
  startTeardown(duration, fromX, fromY) {
    this.ghost.capture(duration, fromX, fromY);
    this.phase = 'hidden'; this.clock = 0; this.waveT = -1; this.bloomT = -1; this.presses.length = 0;
    this._write();
  }
  // Seconds after startBuild() at which a cell has come up, and the same for the whole island.
  riseEnd(x, y) { const c = this._cellAt(x, y); return c ? this.delay[c.idx] + RISE : 0; }
  get buildTime() { return this.span + RISE; }

  get busy() { return this.phase === 'in' || this.phase === 'out'; }

  // Hedges that would hide a gameplay cell from this view are trimmed low; the others stand tall.
  setView(yaw, elev, instant = false) {
    this.viewYaw = yaw; this.viewElev = elev;
    // A trimmed hedge is as tall as the view allows: seen from higher up it can stand higher without covering
    // the foot of a plinth behind it.
    this.lowT = Math.min(0.16, Math.max(WALL.lowH, 0.24 * Math.tan(Math.min(elev, 1.5)) - WALL.curbH));
    if (instant) { this.low = this.lowT; this.hedgeNow.fill(-1); }
    if (!this.level) return;
    const { w, h, floor } = this.level;
    const top = WALL.curbH + WALL.hedgeH * 1.12, L = elev > 1.55 ? 0 : top / Math.tan(elev);
    const vx = -Math.sin(yaw) * L, vz = -Math.cos(yaw) * L, half = WALL.hedgeHalf + 0.035 + WALL.inner, reach = Math.ceil(L) + 1;
    for (const cell of this.wallCells) {
      let hide = false;
      if (L > 0.02) {
        for (let dy = -reach; dy <= reach && !hide; dy++) for (let dx = -reach; dx <= reach; dx++) {
          const nx = cell.x + dx, ny = cell.y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !floor[ny * w + nx]) continue;
          if (segBox(vx, vz, dx, dy, half)) { hide = true; break; }
        }
      }
      const t = hide ? 0 : 1;
      if (t !== this.hedgeT[cell.k]) {
        this.hedgeT[cell.k] = t;
        // A short ripple along the view direction keeps the change from looking mechanical.
        this.hedgeWait[cell.k] = Math.max(this.hedgeWait[cell.k], this.clockAll + 0.05 + hash2(cell.x, cell.y + 3) * 0.16);
      }
      if (instant) { this.hedgeS[cell.k] = t; }
    }
    if (instant) this._write();
  }

  press(x, y, amount = 1) { const cell = this._cellAt(x, y); if (cell && this.presses.length < 12) this.presses.push({ cell, t: 0, a: amount }); }
  // The moth ran into this wall: the hedge shudders away from the hit and settles.
  knock(x, y, dx, dz) { const cell = this._cellAt(x, y); if (!cell || !cell.wall) return; (this.knocks || (this.knocks = [])).push({ cell, t: 0, dx, dz }); if (this.knocks.length > 6) this.knocks.shift(); }

  // Grass answers the moth. Blades near it are pushed over, and spring back with a wobble once it has passed;
  // a gust (wing flutter, a landing, a bump) makes the grass around it shiver. Each tuft leans by a shear of
  // its instance matrix, on a spring of its own; tufts at rest cost one distance test.
  _bend(dt) {
    const n = this.tuftList.length; if (!n) return;
    if (!this.tuftB) this.tuftB = new Float32Array(MAX_TUFT * 4);            // lean x, lean z and their speeds
    if (this._bendLevel !== this.level) { this._bendLevel = this.level; this.tuftB.fill(0); }
    const B = this.tuftB, F = this.tufts.instanceMatrix.array, S = SENSE, on = S.ground > 0.5;
    const gust = S.gust !== this._gust; this._gust = S.gust;
    const hx = (this.level.w - 1) / 2, hz = (this.level.h - 1) / 2; let any = false;
    for (let i = 0; i < n; i++) {
      const f = this.tuftList[i], c = f.cell, o = i * 4, x = c.x - hx + f.ox, z = c.y - hz + f.oz;
      let tx = 0, tz = 0;
      const dx = x - S.x, dz = z - S.z, d2 = dx * dx + dz * dz;
      if (on && d2 < 0.9) { const d = Math.sqrt(d2) + 1e-3, p = 1 - d / 0.95; tx = (dx / d) * p * 1.05; tz = (dz / d) * p * 1.05; }
      if (gust) { const gx = x - S.gustX, gz = z - S.gustZ, gd = Math.hypot(gx, gz) + 1e-3; if (gd < 1.9) { const p = S.gustPower * 5.5 * (1 - gd / 1.9); B[o + 2] += (gx / gd) * p; B[o + 3] += (gz / gd) * p; } }
      if (tx === 0 && tz === 0 && B[o] === 0 && B[o + 1] === 0 && B[o + 2] === 0 && B[o + 3] === 0) continue;
      B[o + 2] += ((tx - B[o]) * 125 - B[o + 2] * 6.5) * dt; B[o + 3] += ((tz - B[o + 1]) * 125 - B[o + 3] * 6.5) * dt;
      B[o] += B[o + 2] * dt; B[o + 1] += B[o + 3] * dt;
      if (tx === 0 && tz === 0 && Math.abs(B[o]) + Math.abs(B[o + 1]) < 0.004 && Math.abs(B[o + 2]) + Math.abs(B[o + 3]) < 0.03) { B[o] = B[o + 1] = B[o + 2] = B[o + 3] = 0; }
      const k = f.s * c.s, m = i * 16; F[m + 4] = B[o] * k; F[m + 6] = B[o + 1] * k; F[m + 5] = k / Math.sqrt(1 + B[o] * B[o] + B[o + 1] * B[o + 1]);
      any = true;
    }
    if (any) this.tufts.instanceMatrix.needsUpdate = true;
  }
  wave(x, y, speed = 9) { this.waveT = 0; this.waveX = x; this.waveZ = y; this.waveV = speed; }
  bloom(x, y) { this.bloomT = 0; this.bloomX = x; this.bloomZ = y; this.wiltT = 0; }
  // The blossoms close again (the celebration was taken back).
  wilt() { if (this.bloomT >= 0 && !this.wiltT) this.wiltT = 1e-4; }
  _cellAt(x, y) { if (!this._map || this._mapLevel !== this.level) { this._map = new Map(); this._mapLevel = this.level; for (const c of this.cells) this._map.set(c.i, c); } return this._map.get(y * this.level.w + x); }

  clockAll = 0;

  update(dt) {
    if (!this.level) return;
    this.clock += dt; this.clockAll += dt;
    this.ghost.update(dt);
    let dirty = this.phase === 'in';
    if (this.low !== this.lowT) { this.low = Math.abs(this.low - this.lowT) < 0.002 ? this.lowT : damp(this.low, this.lowT, 0.12, dt); this.hedgeNow.fill(-1); dirty = true; }
    if (this.phase === 'in' && this.clock > this.span + RISE + 0.05) { this.phase = 'idle'; dirty = true; }
    const tIn = this.clockAll;
    for (const cell of this.wallCells) {
      const k = cell.k, t = this.phase === 'out' || this.phase === 'hidden' ? this.hedgeS[k] : this.hedgeT[k];
      if (Math.abs(this.hedgeS[k] - t) < 0.002) { if (this.hedgeS[k] !== t) { this.hedgeS[k] = t; dirty = true; } continue; }
      if (tIn < this.hedgeWait[k]) continue;
      this.hedgeS[k] = damp(this.hedgeS[k], t, 0.085, dt); dirty = true;
    }
    for (let i = this.presses.length - 1; i >= 0; i--) { const p = this.presses[i]; p.t += dt; dirty = true; if (p.t > 0.5) this.presses.splice(i, 1); }
    if (this.knocks) for (let i = this.knocks.length - 1; i >= 0; i--) { const p = this.knocks[i]; p.t += dt; dirty = true; if (p.t > 0.55) this.knocks.splice(i, 1); }
    if (this.phase === 'idle') this._bend(dt);
    if (this.waveT >= 0) { this.waveT += dt; dirty = true; if (this.waveT > this.maxD * 2 / this.waveV + 1.2) this.waveT = -1; }
    if (this.bloomT >= 0) { this.bloomT += dt; dirty = true; if (this.bloomT > 6) this.bloomT = 6; if (this.wiltT) { this.wiltT += dt; if (this.wiltT > 0.4) { this.bloomT = -1; this.wiltT = 0; } } }
    if (dirty) this._write();
  }

  _write() {
    const T = this.tiles.instanceMatrix.array, C = this.columns.instanceMatrix.array, U = this.curbs.instanceMatrix.array, H = this.hedges.instanceMatrix.array;
    const ph = this.phase, t = this.clock;
    for (const cell of this.cells) {
      let y = 0, s = 1;
      if (ph === 'hidden' || ph === 'none') { y = -DEPTH; s = 0; }
      else if (ph === 'in') { const p = clamp01((t - this.delay[cell.idx]) / RISE); y = this.calm ? -1.6 * (1 - ease.outCubic(p)) : -DEPTH * (1 - ease.outBack(p, 1.25)); s = p <= 0 ? 0 : Math.min(1, p * 5); }
      if (this.waveT >= 0) { const d = Math.hypot(cell.x - this.waveX, cell.y - this.waveZ); y += 0.11 * ease.arch((this.waveT - d / this.waveV) / 0.42); }
      this.cellY[cell.idx] = y; cell.s = s;
    }
    for (const p of this.presses) this.cellY[p.cell.idx] -= 0.045 * p.a * Math.exp(-p.t * 9) * Math.cos(p.t * 26);
    for (const cell of this.cells) {
      const x = this.wx(cell.x), z = this.wz(cell.y), y = this.cellY[cell.idx], s = cell.s;
      writeTS(C, cell.idx, x, y - 0.2, z, s, this.colLen[cell.idx] * s, s);
      if (cell.wall) {
        writeTS(U, cell.k, x, y + WALL.curbH, z, s, s, s);
        writeTS(H, cell.k, x, y + WALL.curbH - 0.012, z, s, s, s);
      } else writeTS(T, cell.k, x, y, z, s, s, s);
    }
    if (this.knocks) for (const p of this.knocks) { const o = p.cell.k * 16, a = 0.075 * Math.exp(-p.t * 8) * Math.cos(p.t * 34); H[o + 12] += p.dx * a; H[o + 14] += p.dz * a; H[o + 13] += 0.012 * Math.exp(-p.t * 8) * Math.sin(p.t * 34); }
    const P = this.plinths.instanceMatrix.array;
    for (const cell of this.goalCells) writeTS(P, cell.goal, this.wx(cell.x), this.cellY[cell.idx], this.wz(cell.y), cell.s, cell.s, cell.s);
    const F = this.tufts.instanceMatrix.array;
    for (let i = 0; i < this.tuftList.length; i++) {
      const f = this.tuftList[i], c = f.cell, k = f.s * c.s;
      writeTS(F, i, this.wx(c.x) + f.ox, this.cellY[c.idx], this.wz(c.y) + f.oz, k, k, k);
      if (this.tuftB && (this.tuftB[i * 4] !== 0 || this.tuftB[i * 4 + 1] !== 0)) { const bx = this.tuftB[i * 4], bz = this.tuftB[i * 4 + 1], m = i * 16; F[m + 4] = bx * k; F[m + 6] = bz * k; F[m + 5] = k / Math.sqrt(1 + bx * bx + bz * bz); }
    }
    const B = this.blossoms.instanceMatrix.array;
    for (let i = 0; i < this.blossomList.length; i++) {
      const b = this.blossomList[i], c = b.cell; let s = 0;
      if (this.bloomT >= 0 && ph !== 'hidden') { const d = Math.hypot(c.x - this.bloomX, c.y - this.bloomZ); s = ease.outBack(clamp01((this.bloomT - d / 9 - 0.15 - (i % 5) * 0.05) / 0.5), 2.4) * b.s * c.s * (this.wiltT ? Math.max(0, 1 - this.wiltT / 0.4) : 1); }
      const top = WALL.curbH + hedgeHeight(this.hedgeS[c.k], this.low) + 0.012;
      writeTS(B, i, this.wx(c.x) + b.ox, this.cellY[c.idx] + top, this.wz(c.y) + b.oz, s, s, s);
    }
    for (const m of [this.tiles, this.columns, this.curbs, this.hedges, this.plinths, this.tufts, this.blossoms]) m.instanceMatrix.needsUpdate = true;
    this._writeHedges();
  }

  // Hedge heights and how each hedge joins its neighbours. Only rewritten when a hedge has grown or sunk;
  // the light field is told at the same time, because a tall hedge stops lantern light and a low one only dims it.
  _writeHedges() {
    const S = this.hedgeS, now = this.hedgeNow; let changed = false;
    for (const cell of this.wallCells) if (now[cell.k] !== S[cell.k]) { changed = true; break; }
    if (!changed) return;
    const N = this.aNbr.array, Hh = this.aH.array;
    for (const cell of this.wallCells) {
      const k = cell.k, h = hedgeHeight(S[k], this.low); now[k] = S[k]; Hh[k] = h;
      for (let d = 0; d < 4; d++) { const j = cell.nb[d]; N[k * 4 + d] = j < 0 ? 0 : 1 + clamp01(1 - (h - hedgeHeight(S[j], this.low)) / 0.14); }
    }
    this.aNbr.needsUpdate = true; this.aH.needsUpdate = true;
    const wk = this.wallK; this.stage.field.setWalls((i) => 0.55 + 0.45 * S[wk[i]]);
  }

  // Height offset of a cell right now (build wave, presses). Lanterns and the moth ride on it.
  yAt(x, y) { const c = this._cellAt(x, y); return c ? this.cellY[c.idx] : 0; }
  visibleAt(x, y) { const c = this._cellAt(x, y); return c ? c.s > 0 && this.cellY[c.idx] > -0.6 : false; }
  // Scale of a cell right now (0 while it waits below the mist), and whether it has finished rising.
  sAt(x, y) { const c = this._cellAt(x, y); return c ? c.s : 0; }
  landedAt(x, y) { const c = this._cellAt(x, y); return !c || this.phase === 'idle' || (this.phase === 'in' && this.clock >= this.delay[c.idx] + RISE); }
}

// The leaving garden. capture() copies every instanced mesh of the garden as it stands (matrices, colours and
// per-instance attributes) into a twin and then plays the whole tear-down on the copies: each cell bows up a
// little, sinks and dissolves into the mist, in a ripple that closes in on the moth's cell.
class Ghost {
  constructor(garden) {
    this.garden = garden; this.group = new THREE.Group(); this.twins = new Map(); this.sets = [];
    this.live = false; this.calm = false; this.t = 0; this.end = 0; this.w = 1; this.h = 1; this.delay = new Float32Array(1);
  }

  capture(duration, fromX, fromY) {
    const g = this.garden, L = g.level; if (!L) return;
    if (!this.group.parent && g.group.parent) g.group.parent.add(this.group);
    const w = this.w = L.w, h = this.h = L.h, n = w * h, ox = (w - 1) / 2, oz = (h - 1) / 2;
    if (this.delay.length < n) this.delay = new Float32Array(n);
    this.delay.fill(0);
    const span = g.calm ? 0.02 : Math.max(0.02, duration - FALL);
    let maxD = 1; for (const c of g.cells) maxD = Math.max(maxD, Math.hypot(c.x - fromX, c.y - fromY));
    for (const c of g.cells) this.delay[c.i] = (1 - Math.hypot(c.x - fromX, c.y - fromY) / maxD) * span * 0.95 + hash2(c.x + 5, c.y) * span * 0.05;
    this.calm = g.calm; this.sets.length = 0;
    for (const tw of this.twins.values()) { tw.count = 0; tw.visible = false; }
    for (const m of g.group.children) {
      if (!m.isInstancedMesh || m.count === 0) continue;
      let tw = this.twins.get(m);
      if (!tw) {
        // Own copies of per-instance attributes, shared vertex data.
        const geo = new THREE.BufferGeometry(); geo.index = m.geometry.index;
        for (const k in m.geometry.attributes) { const a = m.geometry.attributes[k]; geo.setAttribute(k, a.isInstancedBufferAttribute ? new THREE.InstancedBufferAttribute(new Float32Array(a.array.length), a.itemSize).setUsage(THREE.DynamicDrawUsage) : a); }
        tw = new THREE.InstancedMesh(geo, m.material, m.instanceMatrix.count);
        tw.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tw.frustumCulled = false;
        this.twins.set(m, tw); this.group.add(tw);
      }
      tw.material = m.material; tw.customDepthMaterial = m.customDepthMaterial; tw.castShadow = m.castShadow; tw.receiveShadow = m.receiveShadow; tw.renderOrder = m.renderOrder;
      for (const k in m.geometry.attributes) { const a = m.geometry.attributes[k], b = tw.geometry.attributes[k]; if (a.isInstancedBufferAttribute && b && b !== a) { b.array.set(a.array); b.needsUpdate = true; } }
      if (m.instanceColor) {
        if (!tw.instanceColor) tw.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.instanceColor.array.length), 3);
        tw.instanceColor.array.set(m.instanceColor.array); tw.instanceColor.needsUpdate = true;
      }
      const cnt = m.count, base = m.instanceMatrix.array.slice(0, cnt * 16), del = new Float32Array(cnt);
      for (let i = 0; i < cnt; i++) {
        const cx = Math.round(base[i * 16 + 12] + ox), cz = Math.round(base[i * 16 + 14] + oz);
        del[i] = cx >= 0 && cz >= 0 && cx < w && cz < h ? this.delay[cz * w + cx] : 0;
      }
      tw.count = cnt; tw.visible = true;
      // Unlit materials (the blossoms) do not dissolve in the mist: those close up as they sink instead.
      this.sets.push({ tw, base, del, cnt, close: !!m.material.isMeshBasicMaterial });
    }
    this.t = 0; this.end = span + FALL; this.live = true; this._write();
  }

  // Offset and scale of a leaving cell at progress p (0..1).
  // Cells keep their size (a shrinking cell would open gaps in walls and paving); the mist takes them.
  _dy(p) { return (this.calm ? 0 : 0.07 * Math.sin(Math.min(1, p * 3.2) * Math.PI)) - DROP * ease.inCubic(p); }
  _s(p) { return p >= 1 ? 0 : 1; }
  _p(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? clamp01((this.t - this.delay[y * this.w + x]) / FALL) : 1; }
  yAt(x, y) { return this.live ? this._dy(this._p(x, y)) : -DROP; }
  sAt(x, y) { return this.live ? this._s(this._p(x, y)) : 0; }

  update(dt) {
    if (!this.live) return;
    this.t += dt;
    if (this.t > this.end + 0.03) { this.live = false; for (const s of this.sets) { s.tw.count = 0; s.tw.visible = false; } this.sets.length = 0; return; }
    this._write();
  }

  _write() {
    const t = this.t;
    for (const s of this.sets) {
      const out = s.tw.instanceMatrix.array, B = s.base, D = s.del;
      for (let i = 0, o = 0; i < s.cnt; i++, o += 16) {
        const p = clamp01((t - D[i]) / FALL), k = s.close ? Math.max(0, 1 - p * 2.2) : this._s(p), dy = this._dy(p);
        out[o] = B[o] * k; out[o + 1] = B[o + 1] * k; out[o + 2] = B[o + 2] * k; out[o + 3] = 0;
        out[o + 4] = B[o + 4] * k; out[o + 5] = B[o + 5] * k; out[o + 6] = B[o + 6] * k; out[o + 7] = 0;
        out[o + 8] = B[o + 8] * k; out[o + 9] = B[o + 9] * k; out[o + 10] = B[o + 10] * k; out[o + 11] = 0;
        out[o + 12] = B[o + 12]; out[o + 13] = B[o + 13] + dy; out[o + 14] = B[o + 14]; out[o + 15] = 1;
      }
      s.tw.instanceMatrix.needsUpdate = true;
    }
  }
}

// Does the segment from the origin to (vx, vz) touch the square of half-size `half` centred at (cx, cz)?
function segBox(vx, vz, cx, cz, half) {
  let t0 = 0, t1 = 1;
  for (let a = 0; a < 2; a++) {
    const v = a ? vz : vx, lo = (a ? cz : cx) - half, hi = (a ? cz : cx) + half;
    if (Math.abs(v) < 1e-9) { if (lo > 0 || hi < 0) return false; continue; }
    let ta = lo / v, tb = hi / v; if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return false;
  }
  return true;
}
