// Paper lanterns and the plinths' light: one instanced mesh for all lanterns, plus their glow, light and shadow.
// A plinth holds a small cool wisp. When a lantern arrives the wisp slips inside and the lantern lights up;
// when the lantern leaves, the wisp stays behind. The game drives positions; this module adds the physical
// feel (lagging tilt, squash, flicker) and its part in the big sequences: lanterns rise with their tiles, take a
// light from the moth's swarm, answer in the celebration, give their flame back and sink with the leaving garden.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { gardenMaterial } from './materials.js';
import { merge, paint, writeTRS } from './geo.js';
import { ease, clamp01, damp, noise1, hash2, Spring } from '../util.js';
import { SENSE } from './sense.js';

const MAX = 32;
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const FLAME = lin(PALETTE.flame), WISP = lin(PALETTE.wisp), RING_IDLE = lin(PALETTE.plinthRingIdle), RING_LIT = lin(PALETTE.plinthRingLit);
const CORE = lin(PALETTE.flameCore);
const CATCH = 0.085, BLOOM = 0.24;       // lighting up: seconds of first flicker, then of swelling to the peak

function lanternGeometry() {
  // A paper lantern: a barrel of paper stretched over nine hoops (the hoops show in the outline), a wooden foot,
  // and a six-sided wooden roof with a finial and a carrying ring. Vertex colour: r = paper, g = how pale the wood is.
  const paperPts = [];
  for (let i = 0; i <= 36; i++) { const t = i / 36; paperPts.push(new THREE.Vector2((0.085 + 0.175 * Math.pow(Math.sin(Math.PI * t), 0.5)) * (1 + 0.028 * Math.cos(t * 18 * Math.PI)), 0.075 + 0.52 * t)); }
  const paper = paint(new THREE.LatheGeometry(paperPts, 26), 1, 1, 1);
  const V = (x, y) => new THREE.Vector2(x, y);
  const foot = paint(new THREE.LatheGeometry([V(0.001, 0.02), V(0.128, 0.02), V(0.128, 0.05), V(0.1, 0.085), V(0.001, 0.085)], 20), 0, 0.05, 0);
  const roofGeo = new THREE.LatheGeometry([V(0.001, 0.583), V(0.15, 0.583), V(0.168, 0.598), V(0.062, 0.662), V(0.03, 0.676), V(0.001, 0.68)], 6).toNonIndexed();
  roofGeo.computeVertexNormals();
  const roof = paint(roofGeo, 0, 0.3, 0);
  const finial = paint(new THREE.SphereGeometry(0.024, 8, 6), 0, 0.12, 0); finial.translate(0, 0.692, 0);
  const handle = paint(new THREE.TorusGeometry(0.036, 0.008, 5, 14), 0, 0.05, 0); handle.translate(0, 0.742, 0);
  return merge([paper, foot, roof, finial, handle]);
}

export class Lanterns {
  constructor(stage, garden) {
    this.stage = stage; this.garden = garden;
    this.mesh = new THREE.InstancedMesh(lanternGeometry(), gardenMaterial({ kind: 'lantern', vertexColors: true, aoGain: 0, lightGain: 0.9 }), MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.aLit = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage);
    this.mesh.geometry.setAttribute('aLit', this.aLit);
    this.mesh.castShadow = true; this.mesh.receiveShadow = false; this.mesh.frustumCulled = false; this.mesh.count = 0;
    stage.scene.add(this.mesh);
    this.items = []; this.goals = []; this.time = 0; this.hover = 0;
    this.leaving = []; this.oldGoals = []; this.breath = 0;      // lanterns and plinth rings of the garden that is going
    this.onCatch = null; this.fx = null;                          // set by the game: called when a lantern catches light; particles
  }

  setLevel(level, boxes) {
    const g = this.garden;
    this.items = boxes.map((b, id) => ({
      id, cx: b.x, cy: b.y, x: g.wx(b.x), z: g.wz(b.y), tx: g.wx(b.x), tz: g.wz(b.y), y: 0, lagX: g.wx(b.x), lagZ: g.wz(b.y), lvx: 0, lvz: 0,
      mode: 'hidden', t: 0, dur: 1, fromX: 0, fromZ: 0, hop: 0, delay: 0,
      lit: 0, litTarget: 0, flare: 0, squash: new Spring(0, 420, 16), scale: 0, seed: hash2(id * 7 + 3, level.n) * 50, yaw: hash2(id, level.n + 9) * 6.28, lift: 0,
      hov: 0, hovK: 0, swell: 0, skyY: 0, dropY: 0, glow: 0,
      ign: 0, ignT: 0, gutter: 0, touch: false, wasHeld: false, flx: g.wx(b.x), flz: g.wz(b.y), flvx: 0, flvz: 0,
    }));
    this.goals = [];
    for (let i = 0; i < level.w * level.h; i++) if (level.goal[i]) {
      const x = i % level.w, y = (i / level.w) | 0;
      this.goals.push({ x, y, wx: g.wx(x), wz: g.wz(y), wisp: 0, warm: 0, held: false, away: false, seed: hash2(x + 3, y + 8) * 40, show: 0, lift: 0 });
    }
    this.mesh.count = this.items.length + this.leaving.length; this.hover = 0; this.hoverOn = false; this.breath = 0;
  }

  // ---- driven by the game -------------------------------------------------------------------------------
  setCell(id, cx, cy) { const it = this.items[id]; it.cx = cx; it.cy = cy; it.tx = this.garden.wx(cx); it.tz = this.garden.wz(cy); }
  // While pushed, the game gives the minimum position along the push axis every frame.
  contact(id, wx, wz, dx, dz) {
    const it = this.items[id]; if (it.mode !== 'free') it.mode = 'free';
    if ((wx - it.x) * dx + (wz - it.z) * dz > 0) { if (!it.touch) { it.touch = true; it.squash.vel -= 2.6; } it.x = wx; it.z = wz; }
    it.held = true;
  }
  // Undo: the lantern is pulled back along with the moth.
  drag(id, wx, wz) { const it = this.items[id]; it.mode = 'free'; it.x = wx; it.z = wz; it.held = true; }
  tween(id, dur, hop = 0, delay = 0) { const it = this.items[id]; it.mode = 'tween'; it.t = -delay; it.dur = dur; it.fromX = it.x; it.fromZ = it.z; it.hop = hop; it.dropY = it.skyY; it.skyY = 0; }
  // Lighting up with `flare` is a short sequence (see update): the lantern sits down on its plinth, catches, blooms
  // past full brightness and settles. `onCatch(id)` is called at the moment it catches. Without `flare` it only ramps.
  setLit(id, on, flare = true) {
    const it = this.items[id], was = it.litTarget;
    it.litTarget = on ? 1 : 0;
    if (on && flare) { it.ign = 1; it.ignT = 0; }
    else { it.ign = 0; if (!on && was && it.lit > 0.35) { it.gutter = 1; if (this.fx && this.fx.smoke) this.fx.smoke(it.x, it.y + 0.7, it.z); } }
  }
  // A knock: the lantern jolts, rocks, and its paper gives.
  bump(id, dx, dz, power = 1) { const it = this.items[id]; it.lvx += dx * 2.2 * power; it.lvz += dz * 2.2 * power; it.x += dx * 0.03 * power; it.z += dz * 0.03 * power; it.squash.vel -= 1.5 * power; }
  showAll() { for (const it of this.items) { it.mode = 'free'; it.scale = 1; it.x = it.tx; it.z = it.tz; it.lagX = it.x; it.lagZ = it.z; } }
  celebrate(on) { this.hoverOn = on; if (!on) for (const it of this.items) it.hov = 0; }
  // ---- the big sequences ----
  // Build-in: a lantern comes up out of the mist standing on its tile.
  arrive(id) { const it = this.items[id]; it.mode = 'rise'; it.x = it.tx; it.z = it.tz; it.lagX = it.x; it.lagZ = it.z; it.scale = 0; }
  // Build-in: a light arrives from the moth's swarm and the lantern takes it at once (no sitting down first).
  kindle(id) { const it = this.items[id]; it.litTarget = 1; it.ign = 0; it.flare = 1; it.squash.vel -= 3; }
  // Celebration: one lantern answers. It flares, its pool of light swells and it lifts off its plinth.
  answer(id) { const it = this.items[id]; it.hov = 1; it.flare = 1.5; it.swell = 1; it.squash.vel += 3.4; }
  settle(id) { const it = this.items[id]; it.hov = 0; }
  // The last garden: a lantern is let go and rises into the night, still lit.
  release(id, delay = 0) { const it = this.items[id]; if (it.mode === 'hidden') return; it.mode = 'sky'; it.t = -delay; it.skyY = 0; }
  // Tear-down: the flame leaves the lantern as a travelling light (it is not blown out: no gutter, no smoke).
  take(id) { const it = this.items[id]; it.litTarget = 0; it.ign = 0; }
  // Tear-down: every lantern and plinth ring now belongs to the leaving garden and sinks with its tile.
  retire() {
    const garden = this.garden, lv = garden.level;
    this.leaving = this.items.filter((it) => it.scale > 0.01 && it.mode !== 'hidden');
    for (const it of this.leaving) { it.onP = it.mode !== 'sky' && lv.goal[it.cy * lv.w + it.cx] ? 0.058 : 0; it.gone = 0; it.baseY = it.y - garden.yAt(it.cx, it.cy); }
    this.oldGoals = this.goals.filter((g) => g.show > 0.02);
    for (const g of this.oldGoals) g.baseY = garden.yAt(g.x, g.y);
    this.items = []; this.goals = []; this.hoverOn = false; this.breath = 0;
    this.mesh.count = this.leaving.length;
  }
  get settled() { return this.items.every((it) => it.mode === 'free' || it.mode === 'hidden'); }
  isLit(id) { return this.items[id].litTarget > 0; }

  goalAt(cx, cy) { for (const g of this.goals) if (g.x === cx && g.y === cy) return g; return null; }

  update(dt, time) {
    this.time = time;
    const M = this.mesh.instanceMatrix.array, L = this.aLit.array, garden = this.garden;
    this.hover = damp(this.hover, this.hoverOn ? 1 : 0, 0.5, dt);
    for (const g of this.goals) g.held = false;
    for (const it of this.items) {
      let y = 0, s = it.scale;
      if (it.mode === 'free') {
        if (!it.held) { it.x = damp(it.x, it.tx, 0.045, dt); it.z = damp(it.z, it.tz, 0.045, dt); }
        s = it.scale = 1;
      } else if (it.mode === 'tween') {
        it.t += dt; const p = clamp01(it.t / it.dur), e = ease.inOutCubic(p);
        it.x = it.fromX + (it.tx - it.fromX) * e; it.z = it.fromZ + (it.tz - it.fromZ) * e;
        y = it.hop * Math.sin(Math.PI * p) + it.dropY * (1 - e); s = it.scale = 1;
        if (p >= 1) { it.mode = 'free'; if (it.hop > 0) it.squash.vel -= 3.2; }
      } else if (it.mode === 'rise') {
        // Build-in: comes up out of the mist standing on its tile.
        s = it.scale = garden.sAt(it.cx, it.cy);
        if (s > 0 && garden.landedAt(it.cx, it.cy)) { it.mode = 'free'; it.squash.vel -= 2.6; }
      } else if (it.mode === 'sky') {
        // Let go: drifts up and outward like a sky lantern and stays there, bobbing.
        it.t += dt; s = it.scale = 1;
        if (it.t > 0) {
          it.skyY = 5.2 * (1 - Math.exp(-it.t * 0.36));
          const d = Math.hypot(it.x, it.z) + 0.4, v = 0.3 * Math.exp(-it.t * 0.22);
          it.x += ((it.x / d) * v + Math.sin(it.seed + time * 0.6) * 0.07) * dt; it.z += ((it.z / d) * v + Math.cos(it.seed * 1.7 + time * 0.5) * 0.07) * dt;
          it.tx = it.x; it.tz = it.z;
        }
        y = it.skyY;
      } else { s = 0; }
      it.wasHeld = it.held; it.held = false;
      // The top of the lantern lags behind its base: lean back on a push, wobble on a stop.
      const ax = (it.x - it.lagX) * 190 - it.lvx * 13, az = (it.z - it.lagZ) * 190 - it.lvz * 13;
      it.lvx += ax * dt; it.lvz += az * dt; it.lagX += it.lvx * dt; it.lagZ += it.lvz * dt;
      const tiltZ = Math.max(-0.3, Math.min(0.3, -(it.lagX - it.x) * 1.5)), tiltX = Math.max(-0.3, Math.min(0.3, (it.lagZ - it.z) * 1.5));
      it.squash.step(dt);
      // Paper on a light frame: the body gives when the lantern leans hard or is let go, and the flame inside trails behind.
      if (it.touch && !it.wasHeld) { it.touch = false; it.squash.vel -= 1.7; }
      const give = Math.min(0.1, Math.hypot(it.lagX - it.x, it.lagZ - it.z) * 0.42);
      const fax = (it.x - it.flx) * 150 - it.flvx * 9.5, faz = (it.z - it.flz) * 150 - it.flvz * 9.5;
      it.flvx += fax * dt; it.flvz += faz * dt; it.flx += it.flvx * dt; it.flz += it.flvz * dt;
      { const ox = it.flx - it.x, oz = it.flz - it.z, o = Math.hypot(ox, oz); if (o > 0.11) { it.flx = it.x + (ox / o) * 0.11; it.flz = it.z + (oz / o) * 0.11; } }
      // Light. Lighting up is a sequence: the lantern sits down on the plinth (ign 1), the flame catches with a
      // stutter, swells past full and swings back to rest (ign 2). Going dark, the flame gutters out.
      if (it.ign === 1) {
        it.ignT += dt; it.lit = damp(it.lit, 0, 0.1, dt);
        const seated = it.mode === 'free' && !it.wasHeld && Math.hypot(it.x - it.tx, it.z - it.tz) < 0.03;
        if (seated || (it.ignT > 0.3 && it.mode === 'free') || it.ignT > 1.2) { it.ign = 2; it.ignT = 0; it.squash.vel -= 3.6; if (this.onCatch) this.onCatch(it.id); }
      }
      if (it.ign === 2) {
        const t0 = it.ignT; it.ignT += dt; const t = it.ignT;
        if (t < CATCH) it.lit = 0.2 * (t / CATCH) * (0.55 + 0.45 * Math.sin(t * 110));
        else if (t < CATCH + BLOOM) { const u = (t - CATCH) / BLOOM; it.lit = 0.2 + 1.22 * u * u * (3 - 2 * u); }
        else { const u = t - CATCH - BLOOM; it.lit = 1 + 0.42 * Math.exp(-u * 6.5) * Math.cos(u * 12.5); if (u > 0.75) it.ign = 0; }
        if (t0 < CATCH && t >= CATCH) { it.flare = Math.max(it.flare, 0.55); it.squash.vel += 4.2; }
      } else if (it.ign === 0) it.lit = damp(it.lit, it.litTarget, it.litTarget ? 0.07 : 0.15, dt);
      it.flare = Math.max(0, it.flare - dt * 2.4); it.gutter = Math.max(0, it.gutter - dt * 2.2);
      const flick = 0.9 + 0.14 * noise1(time * 5.5 + it.seed) + 0.05 * Math.sin(time * 17 + it.seed);
      it.glow = it.lit * flick * (1 + it.flare * 0.9) * (1 - 0.42 * this.breath) * (1 - it.gutter * 0.34 * (0.5 + 0.5 * Math.sin(time * 47 + it.seed)));
      // Celebration: lit lanterns lift off their plinths and hover.
      it.hovK = damp(it.hovK, Math.max(this.hover, it.hov), 0.3, dt); it.swell = Math.max(0, it.swell - dt * 1.5);
      it.lift = it.hovK * it.lit * (0.34 + 0.1 * Math.sin(time * 1.4 + it.seed));
      const cellY = garden.yAt(it.cx, it.cy);
      it.y = y + (it.mode === 'lift' ? 0 : cellY);
      const onPlinth = garden.level.goal[it.cy * garden.level.w + it.cx] ? 0.058 : 0;
      // Always a little alive: warm air sways and swells a lit lantern; the swell at the peak of lighting up shows too.
      const sq = it.squash.v - give, sway = it.hovK * it.lit + 0.42 * (0.3 + 0.7 * Math.min(1, it.lit));
      const puff = 1 + 0.2 * Math.max(0, it.lit - 1), pulse = 0.012 * Math.sin(time * 2.3 + it.seed) * Math.min(1, it.lit);
      writeTRS(M, it.id, it.x, it.y + it.lift + onPlinth * (1 - Math.min(1, Math.hypot(it.x - it.tx, it.z - it.tz) * 3)), it.z, it.yaw,
        tiltX + sway * 0.07 * Math.sin(time * 1.1 + it.seed), tiltZ + sway * 0.07 * Math.cos(time * 0.9 + it.seed),
        s * puff * (1 - sq * 0.45), s * puff * (1 + sq + pulse), s * puff * (1 - sq * 0.45));
      L[it.id] = it.glow;
      if (it.litTarget && it.scale > 0.5 && it.mode !== 'lift' && it.mode !== 'sky') { const g = this.goalAt(it.cx, it.cy); if (g) g.held = true; }
    }
    for (const g of this.goals) {
      g.show = damp(g.show, garden.visibleAt(g.x, g.y) ? 1 : 0, 0.18, dt);
      g.wisp = damp(g.wisp, g.held || g.away ? 0 : 1, g.held || g.away ? 0.06 : 0.25, dt);
      g.warm = damp(g.warm, g.held ? 1 : 0, 0.12, dt);
      // The waiting flame makes room when the moth walks over its plinth: it slips out and circles the moth's feet.
      g.lift = damp(g.lift, SENSE.ground > 0.5 && Math.hypot(SENSE.x - g.wx, SENSE.z - g.wz) < 1.1 ? 1 : 0, 0.07, dt);
    }
    // The leaving garden: lanterns ride their sinking tiles while their light goes out; released ones fly on.
    const ghost = garden.ghost, n0 = this.items.length;
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const it = this.leaving[i]; let s = 0, y = 0;
      it.lit = damp(it.lit, it.litTarget, 0.16, dt); it.flare = Math.max(0, it.flare - dt * 2.4);
      if (it.mode === 'sky') {
        it.gone += dt; it.baseY += dt * (1.1 + it.gone * 5); s = 1 - ease.inCubic(clamp01(it.gone / 1.0));
        y = it.baseY + it.lift;
        it.glow = it.lit * (0.9 + 0.14 * noise1(time * 5.5 + it.seed));
      } else {
        it.hovK = damp(it.hovK, 0, 0.16, dt); it.lift = it.hovK * it.lit * 0.34;
        s = ghost && ghost.live ? ghost.sAt(it.cx, it.cy) : 0; y = (ghost ? ghost.yAt(it.cx, it.cy) : 0) + it.baseY + it.lift;
        it.glow = it.lit * (0.9 + 0.14 * noise1(time * 5.5 + it.seed)) * (1 + it.flare * 0.9);
      }
      it.scale = s; it.y = y;
      if (s <= 0.001) { this.leaving.splice(i, 1); continue; }
    }
    if (n0 + this.leaving.length > MAX) this.leaving.length = MAX - n0;
    for (let i = 0; i < this.leaving.length; i++) { const it = this.leaving[i]; writeTRS(M, n0 + i, it.x, it.y + it.onP, it.z, it.yaw, 0, 0, it.scale, it.scale, it.scale); L[n0 + i] = it.glow; }
    this.mesh.count = n0 + this.leaving.length;
    for (let i = this.oldGoals.length - 1; i >= 0; i--) { const g = this.oldGoals[i]; g.show = Math.min(g.show, ghost && ghost.live ? ghost.sAt(g.x, g.y) : 0); g.warm = damp(g.warm, 0, 0.12, dt); if (g.show < 0.02) this.oldGoals.splice(i, 1); }
    this.mesh.instanceMatrix.needsUpdate = true; this.aLit.needsUpdate = true;
  }

  // Adds this frame's lights, glows and ground decals.
  emit(field, glow, shade, shine) {
    const time = this.time, garden = this.garden;
    for (const it of this.items) {
      if (it.scale <= 0.01) continue;
      const k = it.glow * it.scale, gy = it.y + it.lift;
      if (k > 0.01) {
        // A wide pool that walls stop and things cast shadows in, plus a faint bounce that reaches around corners.
        // The pool grows with the flame, and it is centred on the flame, which trails the lantern a little.
        const grow = 0.45 + 0.55 * Math.min(1, it.lit), w = Math.min(1, it.lit * 1.7);
        field.add(it.flx, it.flz, (4.8 + it.flare * 0.9) * grow, FLAME[0] * 1.7 * k, FLAME[1] * 1.7 * k, FLAME[2] * 1.7 * k, true);
        field.add(it.flx, it.flz, 6.5 * grow, FLAME[0] * 0.1 * k, FLAME[1] * 0.1 * k, FLAME[2] * 0.1 * k);
        glow.push(it.flx, gy + 0.33, it.flz, (1.05 + it.flare * 0.5) * grow, FLAME[0], FLAME[1] * 0.9, FLAME[2] * 0.75, 0.2 * k);
        // The flame itself: a small hot point inside the paper; cool like the wisp while it is only catching.
        glow.push(it.flx, gy + 0.3 + 0.018 * Math.sin(time * 9 + it.seed), it.flz, 0.21, WISP[0] + (CORE[0] - WISP[0]) * w, WISP[1] + (CORE[1] - WISP[1]) * w, WISP[2] + (CORE[2] - WISP[2]) * w, 0.42 * Math.min(1.4, k + 0.25));
      }
      // An answering or hovering lantern throws a wider, softer wash on top of its pool.
      // (Scaled down when many lanterns answer, so a full garden glows amber instead of burning out.)
      if (k > 0.01 && (it.swell > 0.01 || it.hovK > 0.01)) { const a = k * (0.5 * it.swell + 0.16 * it.hovK) / Math.max(1, this.items.length / 4); field.add(it.x, it.z, 6 + it.swell * 2.2, FLAME[0] * a, FLAME[1] * a, FLAME[2] * a); }
      // A lantern that was let go shows from far away.
      if (it.mode === 'sky' && k > 0.01) glow.push(it.x, gy + 0.33, it.z, 1.9, FLAME[0], FLAME[1] * 0.85, FLAME[2] * 0.6, 0.32 * k);
      const air = Math.max(0, gy - garden.yAt(it.cx, it.cy));
      if (air < 0.45) field.block(it.x, it.z, 0.2 * it.scale);
      shade.push(it.x, garden.yAt(it.cx, it.cy) + 0.09 * (garden.level.goal[it.cy * garden.level.w + it.cx] ? 1 : 0) + 0.004, it.z, 0.4 + air * 0.12, 0.02, 0.02, 0.07, 0.55 * it.scale * (1 - it.lit * 0.5) / (1 + air * 1.6));
    }
    const ghost = garden.ghost;
    for (const it of this.leaving) {
      const k = it.glow * it.scale;
      if (k > 0.01) { field.add(it.x, it.z, 4.8, FLAME[0] * 1.7 * k, FLAME[1] * 1.7 * k, FLAME[2] * 1.7 * k, true); glow.push(it.x, it.y + 0.33, it.z, 1.05, FLAME[0], FLAME[1] * 0.9, FLAME[2] * 0.75, 0.2 * k); }
    }
    for (const g of this.oldGoals) {
      const y = g.baseY + (ghost ? ghost.yAt(g.x, g.y) : 0), w = g.warm, c0 = RING_IDLE, c1 = RING_LIT;
      shine.push(g.wx, y + 0.092, g.wz, 0.36 * (0.6 + 0.4 * g.show), c0[0] + (c1[0] - c0[0]) * w, c0[1] + (c1[1] - c0[1]) * w, c0[2] + (c1[2] - c0[2]) * w, g.show * 0.3, true);   // ring strengths tuned once the ground decals became visible
    }
    for (const g of this.goals) {
      if (g.show < 0.02) continue;
      const y = garden.yAt(g.x, g.y), pulse = 0.5 + 0.5 * Math.sin(time * 1.7 + g.seed), w = g.warm, c0 = RING_IDLE, c1 = RING_LIT;
      const r = c0[0] + (c1[0] - c0[0]) * w, gg = c0[1] + (c1[1] - c0[1]) * w, b = c0[2] + (c1[2] - c0[2]) * w;
      shine.push(g.wx, y + 0.092, g.wz, 0.36, r, gg, b, g.show * (0.26 + 0.12 * pulse + w * 0.2), true);
      if (g.wisp > 0.02) {
        // The waiting flame: a small cool point that hovers and breathes above the plinth.
        const wy = y + 0.3 + 0.045 * Math.sin(time * 2.1 + g.seed) - (1 - g.wisp) * 0.16 - g.lift * 0.1, a = g.wisp * g.show;
        const wr = 0.025 + 0.5 * g.lift, wxo = Math.sin(time * 2.6 + g.seed) * wr, wzo = Math.cos(time * 2.6 + g.seed) * wr;
        glow.push(g.wx + wxo, wy, g.wz + wzo, 0.085 + 0.012 * pulse, WISP[0], WISP[1], WISP[2], 0.6 * a);
        // The soft halo is drawn in front of things (it must not be cut by the plinth), so it fades when the moth is on top of it.
        const clear = Math.min(1, Math.max(0, (Math.hypot(g.wx + wxo - SENSE.x, g.wz + wzo - SENSE.z) - 0.3) / 0.35)) * SENSE.ground + (1 - SENSE.ground);
        glow.push(g.wx + wxo, wy, g.wz + wzo, 0.34, WISP[0] * 0.45, WISP[1] * 0.7, WISP[2], 0.14 * a * clear);
        field.add(g.wx, g.wz, 1.15, WISP[0] * 0.07 * a, WISP[1] * 0.1 * a, WISP[2] * 0.15 * a);
      }
    }
  }
}
