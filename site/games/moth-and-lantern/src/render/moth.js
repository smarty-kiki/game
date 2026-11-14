// The moth: a plump, fuzzy character built from primitives and animated entirely in code.
// The game sets where it is, where it faces, whether it pushes or flies. This module turns that into a body.
//
// The rig, from the ground up:
//  - feet: six two-jointed legs solved by IK. A foot stays where it was planted while the body moves over it and
//    swings to its next place in an alternating tripod; the stride comes from the distance actually travelled,
//    so walking backwards (undo) and turning on the spot step correctly too.
//  - body: thorax, abdomen and head are separate segments. Springs driven by the body's own acceleration make
//    them lag on a start, pile up on a stop and swing out through a turn (two springs, a fast and a slow one,
//    so the abdomen, wings and antennae trail the thorax by a beat).
//  - wings: four of them, folded like a tent on the ground; they bounce with the gait, pop open and flick shut
//    on a stop, spread and beat in the air.
//  - a layer of life that never stops (breathing, weight shifts, glances, antenna and wing twitches, blinks)
//    and a repertoire of idle actions that grows bolder the longer the player waits (see ACTS and _choose).
// The model faces +Z; `heading` is the yaw in radians.
import * as THREE from 'three';
import { PALETTE, TIME } from '../config.js';
import { gardenMaterial, G } from './materials.js';
import { merge, paintBy } from './geo.js';
import { Spring, damp, clamp, clamp01, angDiff, noise1, ease, TAU } from '../util.js';
import { SENSE } from './sense.js';

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const AURA = lin(PALETTE.mothAura);
const SIZE = 1.36;                    // overall scale of the moth relative to a cell
const FEMUR = 0.15, TIBIA = 0.21;     // leg segments in world units
const HOME = [[0.27, 0.3], [0.33, 0.07], [0.28, -0.19]];   // where a foot rests: sideways, forward (front, middle, hind)
const GRAV = 9.5, PRINTS = 12;
const rnd = (a, b) => a + Math.random() * (b - a);
const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// 0 -> 1 -> hold -> 0 over u = 0..1.
const hold = (u, a = 0.2, b = 0.8) => sstep(0, a, u) * (1 - sstep(b, 1, u));
const _h = new THREE.Vector3(), _f = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3(), _k = new THREE.Vector3(), _o = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function wingTexture(hind) {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, '#fbe9c8'); g.addColorStop(0.42, hind ? '#f6b673' : '#f2b878'); g.addColorStop(1, hind ? '#e8793f' : '#d9793f');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  // Wavy bands across the span.
  for (const [u, wdt, col] of hind ? [[0.55, 9, 'rgba(176,88,58,0.75)'], [0.82, 12, 'rgba(120,60,62,0.7)']] : [[0.34, 7, 'rgba(150,70,44,0.8)'], [0.55, 5, 'rgba(255,240,212,0.9)'], [0.8, 12, 'rgba(120,52,48,0.85)']]) {
    c.strokeStyle = col; c.lineWidth = wdt; c.beginPath();
    for (let y = -4; y <= S + 4; y += 4) { const x = u * S + Math.sin(y * 0.11 + u * 9) * 5; if (y === -4) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
  }
  // Eyespot.
  const ex = (hind ? 0.5 : 0.62) * S, ey = (hind ? 0.55 : 0.52) * S, r = hind ? 15 : 13;
  c.fillStyle = '#2a2140'; c.beginPath(); c.arc(ex, ey, r, 0, TAU); c.fill();
  c.fillStyle = '#f6c877'; c.beginPath(); c.arc(ex, ey, r * 0.68, 0, TAU); c.fill();
  c.fillStyle = '#2a2140'; c.beginPath(); c.arc(ex, ey, r * 0.36, 0, TAU); c.fill();
  c.fillStyle = '#fff6df'; c.beginPath(); c.arc(ex - r * 0.14, ey - r * 0.14, r * 0.12, 0, TAU); c.fill();
  // Dusty speckles.
  for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${i % 2 ? '90,52,48' : '255,246,226'},${0.08 + (i % 5) * 0.03})`; c.fillRect((i * 53.7) % S, (i * 91.3) % S, 2, 2); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function wingGeometry(hind) {
  const s = new THREE.Shape();
  // Broad wings: folded, the two forewings make the arrowhead a moth shows from above.
  if (!hind) { s.moveTo(0, 0.04); s.bezierCurveTo(0.1, 0.17, 0.3, 0.2, 0.42, 0.1); s.bezierCurveTo(0.46, 0.0, 0.4, -0.17, 0.29, -0.23); s.bezierCurveTo(0.18, -0.24, 0.06, -0.17, 0, -0.08); }
  else { s.moveTo(0, 0.0); s.bezierCurveTo(0.1, 0.04, 0.24, 0.02, 0.29, -0.07); s.bezierCurveTo(0.31, -0.2, 0.17, -0.3, 0.08, -0.25); s.bezierCurveTo(0.02, -0.18, 0, -0.08, 0, 0); }
  const g = new THREE.ShapeGeometry(s, 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  g.computeBoundingBox(); const b = g.boundingBox;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  g.rotateX(Math.PI / 2);                       // leading edge toward +Z, span along +X
  g.translate(-0.06, 0, 0.025);                 // folded, the wings start over the thorax and leave only the head free
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

function antennaGeometry() {
  // A feathery paddle along +Y: thin at the root, broad in the middle, with a little thickness so it reads from every side.
  const g = new THREE.SphereGeometry(1, 10, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) * 0.5 + 0.5, wdt = 0.008 + 0.034 * Math.pow(Math.sin(Math.PI * Math.min(1, y * 1.08)), 0.8);
    p.setXYZ(i, p.getX(i) * wdt + Math.sin(y * 2.2) * 0.02, y * 0.27, p.getZ(i) * wdt * 0.42);
  }
  g.computeVertexNormals();
  const tip = new THREE.Color(PALETTE.mothBand), base = new THREE.Color(PALETTE.mothWing);
  paintBy(g, (x, y, z, o) => { const t = clamp01(y / 0.27); o[0] = base.r + (tip.r - base.r) * t; o[1] = base.g + (tip.g - base.g) * t; o[2] = base.b + (tip.b - base.b) * t; });
  return g;
}

// One leg segment along +Y from the origin, thick end first; `joint` adds a small ball at the far end (the knee).
function legSegment(r0, r1, len, joint, col) {
  const parts = [], paintIt = (g) => paintBy(g, (x, y, z, o) => { o[0] = col.r; o[1] = col.g; o[2] = col.b; });
  const c = new THREE.CylinderGeometry(r1, r0, len, 5); c.translate(0, len / 2, 0); parts.push(paintIt(c));
  if (joint) { const s = new THREE.SphereGeometry(r1 * 1.2, 6, 5); s.translate(0, len, 0); parts.push(paintIt(s)); }
  return merge(parts);
}

// ---- idle actions -------------------------------------------------------------------------------------------
// Each action writes into the pose `P` (offsets on top of the living rest pose) for its duration.
// start(m) may set m.aDur and variables; run(m, t, u, P) gets seconds and 0..1 progress.
const ACTS = {
  // A glance to one side; sometimes a double take the other way.
  look: {
    start(m) { m.aN = Math.random() < 0.35 ? 2 : 1; m.aDur = m.aN === 2 ? rnd(2.2, 2.7) : rnd(1.3, 2.0); m.aAmp = rnd(0.6, 0.95); },
    run(m, t, u, P) {
      let y;
      if (m.aN === 1) y = m.aDir * m.aAmp * hold(u, 0.22, 0.74);
      else y = u < 0.45 ? m.aDir * 0.6 * hold(u / 0.45, 0.3, 0.75) : -m.aDir * m.aAmp * hold((u - 0.45) / 0.55, 0.16, 0.75);
      P.yaw += y; P.pitch -= 0.1 * Math.abs(y); P.bodyYaw += y * 0.16; P.roll += y * 0.12;
      P.antA[y > 0 ? 1 : 0] -= 0.3 * Math.abs(y);
    },
  },
  // Antennae perk up and feel the air, one after the other.
  twitch: {
    start(m) { m.aDur = rnd(0.9, 1.4); },
    run(m, t, u, P) { const e = hold(u, 0.2, 0.7); P.antUp -= 0.42 * e; P.antA[0] += 0.3 * Math.sin(t * 21) * e; P.antA[1] -= 0.3 * Math.sin(t * 21 + 0.8) * e; P.pitch -= 0.13 * e; P.wide = Math.max(P.wide, 0.5 * e); },
  },
  // Grooming: one antenna is pulled down through a front leg, two or three strokes.
  preen: {
    start(m) { m.aDur = rnd(1.9, 2.5); },
    run(m, t, u, P) {
      const e = hold(u, 0.2, 0.84), s = m.aDir, i = s > 0 ? 1 : 0, st = Math.sin(t * 9.5 - 0.6);
      P.pitch += 0.2 * e; P.roll -= s * 0.5 * e; P.yaw += s * 0.3 * e; P.bodyRoll -= s * 0.1 * e; P.bodyYaw += s * 0.12 * e;
      P.antA[i] -= (0.3 - 0.16 * st) * e; P.antR[i] += s * (0.9 + 0.36 * st) * e; P.antA[1 - i] -= 0.2 * e; P.lid = Math.max(P.lid, 0.45 * e);
      P.legW[i] = e; P.legX[i] = s * (0.16 + 0.06 * st); P.legY[i] = 0.275 + 0.03 * st; P.legZ[i] = 0.25 + 0.02 * st; P.roll -= s * 0.08 * st * e;
    },
  },
  // Washing the face with both front legs, like a fly.
  clean: {
    start(m) { m.aDur = rnd(1.7, 2.2); },
    run(m, t, u, P) {
      const e = hold(u, 0.2, 0.82), a = t * 13;
      P.pitch += (0.16 + 0.07 * Math.sin(a)) * e; P.bodyPitch -= 0.09 * e; P.lid = Math.max(P.lid, 0.85 * e); P.antUp -= 0.5 * e; P.abdPitch += 0.12 * e;
      P.antR[0] -= 0.25 * e; P.antR[1] += 0.25 * e;
      for (let i = 0; i < 2; i++) { const s = i ? 1 : -1, ph = a + i * Math.PI; P.legW[i] = e; P.legX[i] = s * (0.058 + 0.02 * Math.cos(ph)); P.legY[i] = 0.25 + 0.05 * Math.sin(ph); P.legZ[i] = 0.335 + 0.012 * Math.cos(ph); }
    },
  },
  // Wings half open and buzzing.
  flutter: {
    start(m) { m.aDur = rnd(0.9, 1.3); m.gust(0.8); },
    run(m, t, u, P) { const e = ease.arch(u); P.spread = Math.max(P.spread, 0.52 * e); P.beat = Math.max(P.beat, 0.5 * e); P.shiver += 0.24 * e; P.bodyY += 0.02 * e; P.antUp -= 0.2 * e; },
  },
  // Up on its legs, wings spread wide to show the eyespots, then folded with a flick.
  stretch: {
    start(m) { m.aDur = rnd(2.4, 3.0); m.aFlag = false; },
    run(m, t, u, P) {
      const o = sstep(0.04, 0.34, u) * (1 - sstep(0.8, 0.88, u)), q = sstep(0.34, 0.5, u) * (1 - sstep(0.7, 0.8, u));
      P.spread = Math.max(P.spread, 0.95 * o + 0.035 * Math.sin(t * 31) * q); P.bodyY += 0.05 * o; P.bodyPitch -= 0.15 * o; P.pitch -= 0.22 * o;
      P.abdPitch += 0.32 * o; P.antUp -= 0.38 * o; P.lid = Math.max(P.lid, 0.62 * o);
      if (!m.aFlag && u > 0.8) { m.aFlag = true; m.spread.vel -= 4.5; m.squash.vel -= 1.6; m.gust(0.9); }
    },
  },
  // A shiver, then a shake like a wet dog.
  shake: {
    start(m) { m.aDur = rnd(1.5, 1.8); m.aFlag = false; },
    run(m, t, u, P) {
      const a = hold(u / 0.44, 0.3, 0.86) * (u < 0.44 ? 1 : 0);
      P.bodyY -= 0.028 * a; P.shiver += 0.11 * a; P.bodyRoll += Math.sin(t * 56) * 0.03 * a; P.lid = Math.max(P.lid, 0.55 * a); P.antUp += 0.38 * a;
      if (u >= 0.44) {
        if (!m.aFlag) { m.aFlag = true; m.gust(1); if (m.fx) m.fx.puff(m.x, 0.22, m.z, 4); }
        const s = (u - 0.44) * m.aDur, env = Math.exp(-s * 3.4) * sstep(0, 0.05, s), w = s * 33;
        P.bodyYaw += Math.sin(w) * 0.34 * env; P.bodyRoll += Math.cos(w) * 0.13 * env; P.yaw -= Math.sin(w - 0.7) * 0.3 * env;
        P.flop[0] += Math.sin(w - 1.1) * 0.5 * env; P.flop[1] += Math.sin(w - 1.6) * 0.5 * env; P.spread = Math.max(P.spread, 0.2 * env);
        P.antA[0] += Math.sin(w - 1.4) * 0.6 * env; P.antA[1] += Math.sin(w - 1.9) * 0.6 * env; P.abdYaw -= Math.sin(w - 0.9) * 0.45 * env; P.lid = Math.max(P.lid, 0.8 * env);
      }
    },
  },
  // A jump on the spot; now and then two.
  hop: {
    start(m) { m.aN = Math.random() < 0.3 ? 2 : 1; m.aDur = m.aN === 2 ? 1.4 : 0.95; m.aFlag = 0; },
    run(m, t, u, P) {
      const t2 = m.aN === 2 && t > 0.62 ? t - 0.62 : t, k = m.aN === 2 && t > 0.62 ? 2 : 1;
      if (t2 < 0.13) { const c = t2 / 0.13; P.bodyY -= 0.04 * c; P.bodyPitch += 0.06 * c; }
      else if (m.aFlag < k) { m.aFlag = k; m.hop(k === 2 ? 0.2 : rnd(0.13, 0.18)); m.spread.vel += 4.5; P.bodyY -= 0.04; }
    },
  },
  // Impatient: looks up at the player, tilts its head, drums a front foot.
  tilt: {
    start(m) { m.aDur = rnd(2.4, 3.1); },
    run(m, t, u, P) {
      const e = hold(u, 0.16, 0.86), rel = angDiff(m.heading, SENSE.camYaw), s = m.aDir, i = s > 0 ? 1 : 0;
      P.yaw += clamp(rel, -1.15, 1.15) * e; P.bodyYaw += clamp(rel, -1, 1) * 0.3 * e; P.pitch -= 0.34 * e; P.roll += s * 0.4 * e * sstep(0.2, 0.36, u);
      P.antA[i] -= 0.35 * e; P.antA[1 - i] += 0.3 * e; P.wide = Math.max(P.wide, 0.7 * e);
      const d = sstep(0.36, 0.42, u) * (1 - sstep(0.8, 0.86, u));
      P.legLift[1 - i] = Math.max(0, Math.sin(t * 17)) * 0.075 * d;
    },
  },
  // The lantern beside it: leans over, feels it with the antennae, taps it with a leg. The lantern wobbles.
  peek: {
    start(m) { m.aDur = rnd(2.0, 2.5); m.aIt = SENSE.pushable; m.aFlag = 0; },
    run(m, t, u, P) {
      const it = m.aIt; if (!it) return;
      const e = hold(u, 0.2, 0.84), dx = it.x - m.x, dz = it.z - m.z, rel = angDiff(m.heading, Math.atan2(dx, dz)), front = Math.abs(rel) < 0.7;
      P.yaw += clamp(rel, -1.1, 1.1) * e; P.bodyYaw += clamp(rel, -0.7, 0.7) * 0.45 * e; P.bodyPitch += 0.13 * e; P.pitch += 0.1 * e; P.antUp += 0.42 * e;
      P.antA[0] += 0.16 * Math.sin(t * 15) * e; P.antA[1] -= 0.16 * Math.sin(t * 15) * e;
      if (front) {
        const i = rel > 0 ? 1 : 0, tap = Math.max(0, Math.sin((t - 0.55) * 8.5)), w = sstep(0.24, 0.34, u) * (1 - sstep(0.72, 0.84, u));
        P.legW[i] = w; P.legX[i] = (i ? 1 : -1) * 0.05; P.legY[i] = 0.2 - 0.02 * tap; P.legZ[i] = 0.36 + 0.07 * tap;
      }
      const n = t > 1.34 ? 2 : t > 0.74 ? 1 : 0;
      if (n > m.aFlag) { m.aFlag = n; const L = m.lanterns, d = Math.hypot(dx, dz) || 1; if (L && L.items[it.id] === it) L.bump(it.id, dx / d, dz / d, front ? 0.42 : 0.2); }
    },
  },
  // Near a lit lantern: turns to it, opens its wings to the warmth, eyes half shut.
  bask: {
    start(m) { m.aDur = rnd(3.2, 4.6); m.aIt = SENSE.nearLit; },
    run(m, t, u, P) {
      const it = m.aIt; if (!it) return;
      const e = hold(u, 0.16, 0.86), rel = angDiff(m.heading, Math.atan2(it.x - m.x, it.z - m.z));
      P.yaw += clamp(rel, -0.95, 0.95) * e; P.bodyYaw += clamp(rel, -1, 1) * 0.4 * e; P.spread = Math.max(P.spread, (0.4 + 0.07 * Math.sin(t * 2.3)) * e);
      P.lid = Math.max(P.lid, 0.56 * e); P.antUp -= 0.14 * e; P.bodyRoll += 0.045 * Math.sin(t * 1.7) * e; P.abdPitch -= 0.08 * e; P.pitch -= 0.06 * e;
    },
  },
  // A firefly came too close: crouch, snap at it, miss, look after it.
  jump: {
    start(m) { m.aDur = 1.25; m.aFlag = 0; m.aFly = SENSE.fly; },
    run(m, t, u, P) {
      const rel = angDiff(m.heading, Math.atan2(SENSE.flyX - m.x, SENSE.flyZ - m.z));
      P.yaw += clamp(rel, -1.1, 1.1) * (1 - sstep(0.75, 1, u)); P.wide = Math.max(P.wide, 1 - u);
      if (t < 0.14) { const c = t / 0.14; P.bodyY -= 0.035 * c; P.bodyPitch += 0.08 * c; P.antUp += 0.3 * c; }
      else {
        if (!m.aFlag) { m.aFlag = 1; m.hop(0.11); m.spread.vel += 3.2; SENSE.snap++; SENSE.snapFly = m.aFly; m.fw.vel += 1.3 * Math.cos(rel); m.lt.vel += 1.3 * Math.sin(rel); }
        const s = t - 0.14, lunge = Math.exp(-s * 7);
        P.bodyPitch -= 0.42 * lunge; P.pitch -= 0.3 * lunge; P.antUp -= 0.5 * lunge;
        const sad = sstep(0.4, 0.6, u) * (1 - sstep(0.85, 1, u)); P.antUp += 0.45 * sad; P.pitch += 0.12 * sad; P.yaw += Math.sin(s * 24) * 0.22 * sstep(0.5, 0.56, u) * (1 - sstep(0.7, 0.82, u));
      }
    },
  },
};

export class Moth {
  constructor(stage) {
    this.stage = stage;
    this.root = new THREE.Group(); stage.scene.add(this.root);
    this.turn = new THREE.Group(); this.root.add(this.turn);          // heading
    this.body = new THREE.Group(); this.turn.add(this.body);          // lean, roll, squash
    this.body.scale.setScalar(SIZE); this.body.rotation.order = 'YXZ';

    const fuzz = gardenMaterial({ kind: 'fuzz', vertexColors: true, aoGain: 0, lightGain: 0.5 });
    const cBody = new THREE.Color(PALETTE.mothBody), cBand = new THREE.Color(PALETTE.mothBand).lerp(cBody, 0.45), cWhite = new THREE.Color(0xfffaf0);
    // Abdomen: hinged where it meets the thorax, so it can wag, bob and telescope.
    const abdomen = new THREE.SphereGeometry(1, 18, 12); abdomen.scale(0.15, 0.135, 0.2); abdomen.translate(0, 0.19, -0.09);
    paintBy(abdomen, (x, y, z, o) => { const band = Math.sin((z + 0.3) * 46) > 0.35 && z < -0.06 ? 1 : 0; const c = band ? cBand : cBody; o[0] = c.r; o[1] = c.g; o[2] = c.b; });
    abdomen.translate(0, -0.2, -0.03);
    this.abd = new THREE.Group(); this.abd.position.set(0, 0.2, 0.03); this.body.add(this.abd);
    const abdMesh = new THREE.Mesh(abdomen, fuzz); abdMesh.castShadow = true; this.abd.add(abdMesh);
    const thorax = new THREE.SphereGeometry(0.155, 16, 12);
    paintBy(thorax, (x, y, z, o) => { o[0] = cWhite.r; o[1] = cWhite.g; o[2] = cWhite.b; });
    this.thorax = new THREE.Mesh(thorax, fuzz); this.thorax.position.set(0, 0.225, 0.07); this.thorax.castShadow = true;
    this.body.add(this.thorax);

    // Head group: head, eyes, antennae. Pivot at the neck.
    this.head = new THREE.Group(); this.head.position.set(0, 0.255, 0.165); this.body.add(this.head);
    const headGeo = new THREE.SphereGeometry(0.128, 18, 14); headGeo.scale(1.06, 0.96, 0.98); headGeo.translate(0, 0.012, 0.035);
    paintBy(headGeo, (x, y, z, o) => { o[0] = cBody.r; o[1] = cBody.g; o[2] = cBody.b; });
    const headMesh = new THREE.Mesh(headGeo, fuzz); headMesh.castShadow = true; this.head.add(headMesh);
    const eyeParts = [];
    for (const sx of [-1, 1]) {
      const e = new THREE.SphereGeometry(0.052, 14, 10); e.translate(sx * 0.077, 0, 0.0);
      const ec = new THREE.Color(PALETTE.mothEye); paintBy(e, (x, y, z, o) => { o[0] = ec.r; o[1] = ec.g; o[2] = ec.b; });
      const h = new THREE.SphereGeometry(0.017, 8, 6); h.translate(sx * 0.077 - 0.016, 0.026, 0.036); paintBy(h, (x, y, z, o) => { o[0] = 1; o[1] = 1; o[2] = 1; });
      const h2 = new THREE.SphereGeometry(0.008, 6, 5); h2.translate(sx * 0.077 + 0.02, -0.012, 0.045); paintBy(h2, (x, y, z, o) => { o[0] = 0.8; o[1] = 0.85; o[2] = 1; });
      eyeParts.push(e, h, h2);
    }
    this.eyes = new THREE.Mesh(merge(eyeParts), new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.eyes.position.set(0, 0.04, 0.115); this.head.add(this.eyes);
    const antMat = gardenMaterial({ vertexColors: true, side: THREE.DoubleSide, aoGain: 0 });
    const antGeo = antennaGeometry();
    this.ant = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Mesh(antGeo, antMat); a.position.set(sx * 0.055, 0.105, 0.05); a.castShadow = true;
      this.head.add(a);
      this.ant.push({ mesh: a, side: sx, pitch: new Spring(0.75, 90, 5.2), roll: new Spring(0, 80, 5.2), twT: rnd(1, 3) });
    }

    // Wings: fore and hind on each side, each on a shoulder pivot (order ZYX = roll about the body, then sweep).
    // The hind wing has its own hinge under the forewing and follows it a beat late.
    const wingMat = (tex) => { const m = gardenMaterial({ kind: 'fuzz', side: THREE.DoubleSide, aoGain: 0, lightGain: 0.5 }); m.map = tex; return m; };
    const foreTex = wingTexture(false), hindTex = wingTexture(true);
    const foreMat = wingMat(foreTex), hindMat = wingMat(hindTex);
    this.wings = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.06, 0.335, 0.06); pivot.rotation.order = 'ZYX';
      const fg = wingGeometry(false), hg = wingGeometry(true);
      if (sx < 0) { fg.scale(-1, 1, 1); hg.scale(-1, 1, 1); }
      const fore = new THREE.Mesh(fg, foreMat), hind = new THREE.Mesh(hg, hindMat);
      fore.castShadow = hind.castShadow = true;
      fore.position.y = sx * 0.004; hind.position.set(sx * 0.01, -0.012, -0.05);
      pivot.add(hind, fore); this.body.add(pivot);
      this.wings.push({ pivot, hind, fore, side: sx, bounce: new Spring(0, 210, 9 + (sx > 0 ? 1.5 : 0)) });
    }

    // Legs: three per side, two segments each, solved by IK in the heading frame (world units, not squashed).
    const lc = new THREE.Color(PALETTE.mothLeg);
    const femurGeo = legSegment(0.0155, 0.0125, FEMUR, true, lc), tibiaGeo = legSegment(0.012, 0.0075, TIBIA, false, lc);
    const legMat = gardenMaterial({ vertexColors: true, aoGain: 0 });
    this.legRoot = new THREE.Group(); this.turn.add(this.legRoot);
    this.legs = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const femur = new THREE.Mesh(femurGeo, legMat), tibia = new THREE.Mesh(tibiaGeo, legMat);
      this.legRoot.add(femur, tibia);
      this.legs.push({ femur, tibia, side: sx, k, tripod: (k + (sx > 0 ? 1 : 0)) % 2, hip: new THREE.Vector3(sx * 0.085, 0.125, 0.13 - k * 0.1),
        hx: sx * HOME[k][0], hz: HOME[k][1], wx: 0, wz: 0, fromX: 0, fromZ: 0, swing: false, lift: 0 });
    }

    // State driven by the game.
    this.x = 0; this.z = 0; this.y = 0; this.heading = 0; this.headingTarget = 0;
    this.speed = 0; this.pushing = 0; this.air = 0; this.airTarget = 0; this.visible = true; this.scale = 1;
    this.fx = null; this.garden = null; this.lanterns = null;       // set by the game: particles, tiles and lanterns the moth can touch
    this.onIdle = null; this.onPlant = null;                         // callbacks: an idle action started (kind); a foot came down while walking
    this.calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Kinematics.
    this.px = 0; this.pz = 0; this.vx = 0; this.vz = 0; this.spd = 0; this.moving = 0; this.fresh = true;
    this.hs = new Spring(0, 620, 38);                                  // heading: quick, a hair of overshoot
    this.fw = new Spring(0, 340, 13); this.fw2 = new Spring(0, 150, 8);   // forward follow-through: fast (thorax) and slow (abdomen, wings, head)
    this.lt = new Spring(0, 340, 13); this.lt2 = new Spring(0, 150, 8);   // sideways
    this.abdYaw = new Spring(0, 170, 9); this.wingYaw = new Spring(0, 130, 8);
    this.gp = 0; this.moveAmt = 0; this.pushAmt = 0; this.flap = 0;
    // Pose springs.
    this.squash = new Spring(0, 380, 15); this.squashZ = new Spring(0, 420, 16); this.lean = new Spring(0, 150, 15);
    this.spread = new Spring(0, 160, 13); this.spread2 = new Spring(0, 95, 8.5);
    this.lookYaw = new Spring(0, 150, 18); this.lookPitch = new Spring(0, 150, 18); this.lookRoll = new Spring(0, 120, 15);
    this.bodyYaw = new Spring(0, 70, 13); this.bodyY = new Spring(0, 160, 17); this.bodyPitch = new Spring(0, 120, 15); this.bodyRoll = new Spring(0, 120, 14);
    this.hopH = 0; this.hopV = 0;
    // Bump.
    this.bumpT = -1; this.bumpX = 0; this.bumpZ = 0; this.bumpReach = 0.13; this.bumpHit = false; this.bOff = new Spring(0, 300, 16); this.shakeT = -1;
    this.squint = 0; this.joy = 0; this.joyYaw = 0; this.wideT = 0;
    // Life and idle.
    this.blinkT = 2; this.blink = 0; this.sacT = 1; this.sacY = 0; this.sacP = 0; this.flickT = 3;
    this.still = 0; this.gap = 2; this.act = null; this.actKind = ''; this.aT = 0; this.aDur = 1; this.aDir = 1; this.aN = 1; this.aAmp = 1; this.aFlag = 0; this.aIt = null; this.aFly = -1;
    this.last1 = ''; this.last2 = ''; this.asleep = false; this.sleepT = 0; this.nodT = 6; this.nod = -1; this.dreamT = 3; this.dreamK = 0; this.dreamLeg = 0;
    this.watch = 0; this.watchCool = 0; this.nearT = 0; this.snapCool = 4;
    this.P = { yaw: 0, pitch: 0, roll: 0, antUp: 0, antA: [0, 0], antR: [0, 0], beat: 0, spread: 0, shiver: 0, droop: 0, flop: [0, 0], bodyY: 0, bodyPitch: 0, bodyRoll: 0, bodyYaw: 0,
      abdPitch: 0, abdYaw: 0, lid: 0, wide: 0, legW: [0, 0], legX: [0, 0], legY: [0, 0], legZ: [0, 0], legLift: [0, 0] };
    this._w = [];
    this.prints = []; for (let i = 0; i < PRINTS; i++) this.prints.push({ x: 0, z: 0, t: 9 });
    this.printI = 0; this.time = 0;
    // Test hook: with ?mothdebug in the URL the moth is reachable as window.__moth (e.g. __moth._start('stretch')).
    if (typeof location !== 'undefined' && /[?&]mothdebug/.test(location.search)) window.__moth = this;
  }

  // ---- triggers -----------------------------------------------------------------------------------------
  face(yaw, instant = false) { this.headingTarget = yaw; if (instant) { this.heading = yaw; this.hs.set(yaw); } }
  // A blocked move. kind: 'wall' | 'box'. With no direction (nothing to undo) the moth only shakes its head.
  bump(dx, dz, kind) {
    this._wake();
    if (!dx && !dz) { this.shakeT = 0.07; this.squash.vel -= 1.4; return; }
    this.bumpT = 0; this.bumpX = dx; this.bumpZ = dz; this.bumpHit = false; this.bumpReach = kind === 'box' ? 0.27 : 0.125; this.bOff.set(0);
  }
  land() { this.squash.vel -= 5.2; this.spread.vel -= 3; this.fresh = true; this.gust(1); }
  // A lantern lit up: hop, flare the wings wide (the eyespots show) and look at it.
  rejoice(x, z) {
    this.joy = 1; this.hop(0.1); this.squash.vel += 3; this.spread.vel += 9;
    this.joyYaw = x === undefined ? 0 : clamp(angDiff(this.headingTarget, Math.atan2(x - this.x, z - this.z)), -0.9, 0.9);
    for (const a of this.ant) a.pitch.vel -= 7;
  }
  pushStart() { this.squash.vel -= 2.2; this.squashZ.vel -= 2.4; }
  wake() { this._wake(); }
  hop(h) { if (this.hopH <= 0.001 && this.air < 0.3) { this.hopV = Math.sqrt(2 * GRAV * h); this.hopH = 0.0011; } }
  gust(power) { SENSE.gust++; SENSE.gustX = this.x; SENSE.gustZ = this.z; SENSE.gustPower = power; }

  _wake() {
    if (this.asleep) {
      // Startled awake: a jolt, wings flare for an instant, antennae shoot up, eyes wide.
      this.asleep = false; this.squash.vel += 3.6; this.spread.vel += 6.5; this.wideT = 0.7; this.blink = 0;
      for (const a of this.ant) a.pitch.vel -= 13;
      if (this.onIdle) this.onIdle('wake');
    }
    this.still = 0; this.act = null; this.gap = this.calm ? rnd(3, 5) : rnd(1.3, 2.3); this.watch = 0; this.nearT = 0;
  }

  _start(kind) {
    this.act = ACTS[kind]; this.actKind = kind; this.aT = 0; this.aDur = 1; this.aDir = Math.random() < 0.5 ? -1 : 1; this.aFlag = 0;
    this.last2 = this.last1; this.last1 = kind;
    this.act.start(this);
    if (this.onIdle) this.onIdle(kind);
  }

  // What to do next. The list grows with the time the moth has been left alone; the last two picks are left out.
  _choose() {
    const s = this.still, calm = this.calm, W = this._w; W.length = 0;
    const add = (kind, w) => { if (w > 0 && kind !== this.last1 && kind !== this.last2) W.push(kind, w); };
    add('look', 3); add('preen', 2.2);
    if (!calm) add('twitch', 2);
    if (SENSE.nearLit) add('bask', 5);
    if (SENSE.pushable && !calm) add('peek', 3.6);
    if (s > 5) { add('clean', 2); if (!calm) { add('flutter', 1.6); add('stretch', 2.3); } }
    if (s > 9 && !calm) { add('hop', 1.7); add('shake', 1.5); }
    if (s > 14) add('tilt', 3.4);
    let sum = 0; for (let i = 1; i < W.length; i += 2) sum += W[i];
    let r = Math.random() * sum;
    for (let i = 0; i < W.length; i += 2) { r -= W[i + 1]; if (r <= 0) return W[i]; }
    return 'look';
  }

  _idle(dt, P) {
    const calm = this.calm;
    this.still += dt; this.watchCool -= dt; this.snapCool -= dt;
    if (this.asleep) {
      // Dozing: eyes shut, head sunk, slow deep breaths; now and then the head drops and jerks back up.
      this.sleepT += dt; const e = sstep(0, 2.4, this.sleepT);
      let lid = 0.94 * e, nodP = 0;
      this.nodT -= dt; if (this.nodT <= 0 && this.nod < 0) { this.nod = 0; this.nodT = rnd(5, 9); }
      if (this.nod >= 0) {
        this.nod += dt; const n = this.nod;
        if (n < 1.3) nodP = 0.3 * (n / 1.3) * (n / 1.3);
        else if (n < 1.62) { const j = (n - 1.3) / 0.32; nodP = 0.3 * (1 - sstep(0, 0.35, j)) - 0.26 * ease.arch(j); lid *= 1 - 0.65 * ease.arch(j); }
        else this.nod = -1;
      }
      // Asleep is not still: the wings rise and sink with each long breath, and now and then it twitches in a dream.
      const sb = Math.sin(this.time * 1.25);
      this.dreamT -= dt;
      if (this.dreamT <= 0) {
        this.dreamT = rnd(2.2, 5); this.dreamK = 0.4; this.dreamLeg = Math.random() < 0.5 ? 0 : 1;
        const a = this.ant[Math.random() < 0.5 ? 0 : 1]; a.pitch.vel += rnd(5, 10) * (Math.random() < 0.5 ? -1 : 1);
        if (!calm && Math.random() < 0.6) this.spread.vel += rnd(1.6, 2.8);
      }
      this.dreamK = Math.max(0, this.dreamK - dt);
      if (!calm) P.legLift[this.dreamLeg] = 0.05 * ease.arch(this.dreamK / 0.4) * Math.abs(Math.sin(this.dreamK * 40));
      P.lid = Math.max(P.lid, lid); P.pitch += (0.4 + 0.05 * sb) * e + nodP; P.bodyY -= (0.036 - 0.012 * sb) * e; P.antUp += (0.72 + 0.1 * sb) * e;
      P.droop += (0.2 + 0.11 * sb) * e; P.abdPitch -= 0.12 * e; P.bodyPitch += 0.05 * e; P.bodyRoll += 0.03 * Math.sin(this.time * 0.6) * e;
      return;
    }
    if (this.act) {
      this.aT += dt;
      this.act.run(this, this.aT, clamp01(this.aT / this.aDur), P);
      if (this.aT >= this.aDur) { this.act = null; this.gap = calm ? rnd(4, 7.5) : rnd(1.2, 3.1); }
      return;
    }
    // Nothing in particular: a firefly that drifts close gets watched, and snapped at if it comes too close.
    const seen = SENSE.fly >= 0 && SENSE.flyD < 1.9 && this.still > 1;
    this.watch = damp(this.watch, seen ? 1 : 0, seen ? 0.12 : 0.3, dt);
    if (this.watch > 0.02 && SENSE.fly >= 0) {
      const rel = angDiff(this.heading, Math.atan2(SENSE.flyX - this.x, SENSE.flyZ - this.z)), up = Math.atan2(SENSE.flyY - 0.42, Math.max(0.2, SENSE.flyD));
      P.yaw += clamp(rel, -1.15, 1.15) * this.watch; P.pitch -= clamp(up, -0.1, 0.75) * 0.75 * this.watch; P.antUp -= 0.3 * this.watch; P.bodyYaw += clamp(rel, -1, 1) * 0.22 * this.watch; P.wide = Math.max(P.wide, 0.5 * this.watch);
      if (seen && this.watchCool <= 0 && this.watch > 0.5) { this.watchCool = 11; if (this.onIdle) this.onIdle('curious'); }
      this.nearT = seen && SENSE.flyD < 0.8 ? this.nearT + dt : 0;
      if (!calm && this.nearT > 0.45 && this.snapCool <= 0) { this.snapCool = rnd(13, 22); this.nearT = 0; this._start('jump'); return; }
    }
    this.gap -= dt;
    if (this.gap <= 0) {
      if (this.still > (calm ? 24 : 32)) { this.asleep = true; this.sleepT = 0; this.nodT = rnd(4, 7); this.nod = -1; if (this.onIdle) this.onIdle('sleep'); }
      else this._start(this._choose());
    }
  }

  update(dt, time) {
    this.time = time;
    const P = this.P, calm = this.calm;
    P.yaw = P.pitch = P.roll = P.antUp = P.spread = P.shiver = P.droop = P.bodyY = P.bodyPitch = P.bodyRoll = P.bodyYaw = P.abdPitch = P.abdYaw = P.lid = P.wide = P.beat = 0;
    P.antA[0] = P.antA[1] = P.antR[0] = P.antR[1] = P.flop[0] = P.flop[1] = P.legW[0] = P.legW[1] = P.legLift[0] = P.legLift[1] = 0;

    // ---- how the game moved us this frame ----
    let dx = this.x - this.px, dz = this.z - this.pz;
    const jumped = this.fresh || dx * dx + dz * dz > 1.7;
    if (jumped) { dx = 0; dz = 0; }
    this.px = this.x; this.pz = this.z;
    const idt = 1 / Math.max(dt, 1e-3), dist = Math.hypot(dx, dz), vx = dx * idt, vz = dz * idt, spd = dist * idt;
    this.air = damp(this.air, this.airTarget, 0.09, dt);
    const ground = 1 - this.air, grounded = ground > 0.5;
    const moving = spd > 0.25 ? 1 : 0;
    this.moveAmt = damp(this.moveAmt, moving, 0.06, dt);
    this.pushAmt = damp(this.pushAmt, this.pushing, 0.06, dt);
    this.flap += dt * TAU * (9 + this.air * 3);

    // Heading: a quick spring, so a turn has a start, a swing and a stop instead of a snap.
    if (this.heading !== this.hs.v) this.hs.set(this.heading);
    const hd0 = angDiff(this.hs.v, this.headingTarget);
    this.hs.target = this.hs.v + hd0; this.hs.step(dt);
    const dHead = this.hs.v - this.heading; this.heading = this.hs.v;
    const turnRate = clamp(this.hs.vel, -16, 16), hd = angDiff(this.heading, this.headingTarget);
    const sh = Math.sin(this.heading), ch = Math.cos(this.heading);

    // Follow-through: the change of velocity, seen from the body, kicks the springs the segments hang on.
    if (!jumped) {
      const ax = clamp(vx - this.vx, -4.5, 4.5), az = clamp(vz - this.vz, -4.5, 4.5), dF = ax * sh + az * ch, dL = ax * ch - az * sh;
      this.fw.vel -= 0.19 * dF * ground; this.fw2.vel -= 0.17 * dF * ground; this.lt.vel -= 0.17 * dL * ground; this.lt2.vel -= 0.17 * dL * ground;
    }
    this.vx = vx; this.vz = vz; this.spd = spd;
    this.fw.step(dt); this.fw2.step(dt); this.lt.step(dt); this.lt2.step(dt);
    const fw = clamp(this.fw.v, -0.1, 0.1), fw2 = clamp(this.fw2.v, -0.13, 0.13), lt = clamp(this.lt.v, -0.09, 0.09), lt2 = clamp(this.lt2.v, -0.12, 0.12);
    this.abdYaw.target = clamp(-turnRate * 0.04, -0.6, 0.6) * ground; this.abdYaw.step(dt);
    this.wingYaw.target = clamp(-turnRate * 0.032, -0.45, 0.45) * ground; this.wingYaw.step(dt);

    // Setting off and stopping.
    if (moving && !this.moving && grounded) { this.squash.vel -= 2.7; this.gp = Math.floor(this.gp * 2) / 2 + 0.02; }
    if (!moving && this.moving && grounded) { this.spread.vel += 2.7; this.squash.vel -= 1.5; }
    this.moving = moving;

    // ---- gait: the phase runs with the distance walked and the angle turned ----
    const stride = 0.42 + 0.42 * clamp01(spd / 8);
    let adv = (dist + Math.abs(dHead) * 0.21) / stride;
    const feet = this.legs;
    if (jumped || !grounded) {
      for (const l of feet) { l.wx = this.x + l.hx * ch + l.hz * sh; l.wz = this.z - l.hx * sh + l.hz * ch; l.swing = false; l.lift = 0; }
      this.fresh = false;
    } else {
      if (adv < 0.4 * dt) {
        // Standing: any foot left out of place steps home, one tripod after the other.
        let off = false;
        for (const l of feet) { const tx = this.x + l.hx * ch + l.hz * sh, tz = this.z - l.hx * sh + l.hz * ch; if (l.swing || (l.wx - tx) * (l.wx - tx) + (l.wz - tz) * (l.wz - tz) > 0.0036) { off = true; break; } }
        adv = off ? dt * 7.5 : 0;
      }
      this.gp += adv;
      const reach = stride * 0.25 * clamp01(spd / 1.5), inv = spd > 1e-3 ? 1 / spd : 0, ux = vx * inv, uz = vz * inv;
      for (const l of feet) {
        const lp = (this.gp + (l.tripod ? 0.5 : 0)) % 1, swinging = lp < 0.5;
        const tx = this.x + l.hx * ch + l.hz * sh + ux * reach, tz = this.z - l.hx * sh + l.hz * ch + uz * reach;
        if (swinging) {
          if (!l.swing) { l.swing = true; l.fromX = l.wx; l.fromZ = l.wz; }
          const s = lp * 2, e = s * s * (3 - 2 * s);
          l.wx = l.fromX + (tx - l.fromX) * e; l.wz = l.fromZ + (tz - l.fromZ) * e;
          l.lift = Math.sin(Math.PI * s) * (0.045 + 0.05 * clamp01(spd / 6));
        } else if (l.swing) {
          l.swing = false; l.wx = tx; l.wz = tz; l.lift = 0;
          if (l.k === 1 && spd > 1.5) { this._print(tx, tz); if (this.onPlant) this.onPlant(); }
        }
      }
    }

    // ---- what the moth is up to ----
    const busy = moving || this.pushing || this.airTarget > 0 || this.bumpT >= 0;
    if (busy) { if (this.still > 0 || this.act || this.asleep) this._wake(); this.still = 0; }
    else this._idle(dt, P);

    // ---- bump: lunge, hit, recoil, shake it off ----
    let bx = 0, bz = 0, lunge = 0;
    if (this.bumpT >= 0) {
      this.bumpT += dt; const t = this.bumpT, H = TIME.bumpHit || 0.066;
      if (!this.bumpHit) {
        const u = Math.min(1, t / H); lunge = u;
        this.bOff.v = this.bumpReach * u * u;
        if (t >= H) {
          this.bumpHit = true; this.bOff.v = this.bumpReach; this.bOff.vel = -this.bumpReach * 20 - 0.8; this.bOff.target = 0;
          this.squashZ.v = -0.3; this.squashZ.vel = 0; this.squash.vel += 1.5; this.squint = 1; this.shakeT = 0;
          this.lookPitch.vel -= 7; this.spread.vel += 3.4; this.fw2.vel -= 1.1;
          for (const a of this.ant) { a.pitch.vel += 15; a.roll.vel += a.side * 4; }
          this.gust(0.8);
        }
      } else { this.bOff.step(dt); if (t > 0.6) { this.bumpT = -1; this.bOff.set(0); } }
      bx = this.bumpX * this.bOff.v; bz = this.bumpZ * this.bOff.v;
    }
    this.squint = Math.max(0, this.squint - dt * 2.1);
    this.joy = Math.max(0, this.joy - dt * 1.3);
    this.wideT = Math.max(0, this.wideT - dt);

    // ---- hop (idle hops, the joy at a lit lantern, a snap at a firefly) ----
    if (this.hopH > 0) {
      this.hopV -= GRAV * dt; this.hopH += this.hopV * dt;
      if (this.hopH <= 0) {
        const hit = clamp01(-this.hopV / 1.9); this.hopH = 0; this.hopV = 0;
        this.squash.vel -= 2 + 3 * hit; this.spread.vel -= 2 * hit;
        if (grounded && hit > 0.5) { if (this.fx) this.fx.puff(this.x, 0.04, this.z, 5); this.gust(0.9); }
      }
    }
    const hopK = clamp01(this.hopH / 0.07);

    // ---- springs ----
    this.lean.target = this.moveAmt * 0.1 + this.pushAmt * 0.3 + this.air * 0.32;
    this.lean.step(dt); this.squash.step(dt); this.squashZ.step(dt);
    const life = ground * (1 - this.moveAmt) * (1 - this.pushAmt), lifeK = calm ? 0.5 : 1;
    // A wing flick now and then, for no reason.
    this.flickT -= dt; if (this.flickT <= 0) { this.flickT = rnd(2.4, 6); if (life > 0.8 && !calm && !this.asleep) this.spread.vel += rnd(1.4, 2.4); }
    this.spread.target = Math.max(this.air, this.pushAmt * 0.16, P.spread, this.joy * 0.5, hopK * 0.3 * (1 - this.joy));
    this.spread.step(dt); this.spread2.target = this.spread.v; this.spread2.step(dt);
    // Glances: small, quick, at nothing.
    this.sacT -= dt; if (this.sacT <= 0) { this.sacT = rnd(0.7, 2.6); this.sacY = rnd(-0.26, 0.26); this.sacP = rnd(-0.08, 0.06); }
    const loose = this.act || this.asleep || this.watch > 0.3 ? 0 : life * lifeK;
    let yawT = P.yaw + this.sacY * loose + clamp(hd, -1, 1) * 0.6 * ground + this.joyYaw * Math.min(1, this.joy * 2.2), pitchT = P.pitch + this.sacP * loose + this.pushAmt * 0.22 + lunge * 0.18;
    if (this.shakeT >= 0) { this.shakeT += dt; const s = this.shakeT - 0.07; if (s > 0) yawT += Math.sin(s * 44) * 0.44 * Math.exp(-s * 6); if (this.shakeT > 0.8) this.shakeT = -1; }
    this.lookYaw.target = yawT; this.lookPitch.target = pitchT; this.lookRoll.target = P.roll;
    this.lookYaw.step(dt); this.lookPitch.step(dt); this.lookRoll.step(dt);
    this.bodyYaw.target = P.bodyYaw; this.bodyYaw.step(dt); this.bodyY.target = P.bodyY; this.bodyY.step(dt);
    this.bodyPitch.target = P.bodyPitch; this.bodyPitch.step(dt); this.bodyRoll.target = P.bodyRoll; this.bodyRoll.step(dt);

    // ---- blink ----
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 1.8 + Math.random() * 3.6; if (Math.random() < 0.25) this.blinkT = 0.22; }
    this.blink = Math.max(0, this.blink - dt * 8.5);
    const wide = Math.max(P.wide, Math.min(1, this.wideT * 3));
    const lid = Math.max(ease.arch(this.blink) * (1 - wide), this.squint * 0.9, this.pushAmt * 0.3, P.lid);

    // ---- pose: body ----
    const w = this.gp * TAU, walk = this.moveAmt * ground, sw = Math.sin(w);
    const bob = Math.abs(Math.sin(w)) * 0.042 * walk;
    const hover = this.air * (0.035 * Math.sin(time * 6.5) + 0.02 * Math.sin(this.flap));
    const br = this.asleep ? 1.25 : 2.5, bAmp = (this.asleep ? 1.7 : 1) * (1 - 0.6 * this.moveAmt), b1 = Math.sin(time * br) * bAmp, b2 = Math.sin(time * br - 0.9) * bAmp;
    const wsx = (noise1(time * 0.23) - 0.5) * 0.055 * life * lifeK, wsz = (noise1(time * 0.19 + 7.1) - 0.5) * 0.04 * life * lifeK, wsy = (noise1(time * 0.16 + 3.3) - 0.5) * 0.16 * life * lifeK;
    this.root.position.set(this.x + bx, this.y + this.hopH + hover, this.z + bz);
    this.root.visible = this.visible && this.scale > 0.01; this.root.scale.setScalar(this.scale);
    this.turn.rotation.y = this.heading;
    const bodyYaw = sw * 0.085 * walk + this.bodyYaw.v + wsy;
    this.body.position.set(lt * 0.5 + wsx, bob + this.bodyY.v + 0.005 * b1 - 0.012 * this.pushAmt, fw * 0.7 + wsz);
    this.body.rotation.set(this.lean.v + fw * 0.9 + this.bodyPitch.v + lunge * 0.2 - hopK * 0.06, bodyYaw,
      sw * 0.1 * walk + lt * 1.6 + this.bodyRoll.v + wsx * 1.1 + turnRate * (0.011 * ground - 0.012 * this.air));
    const sq = this.squash.v, sz = clamp(this.squashZ.v + lunge * 0.12, -0.4, 0.3);
    this.body.scale.set(SIZE * (1 - sq * 0.5 - sz * 0.45), SIZE * (1 + sq - sz * 0.3), SIZE * (1 - sq * 0.5 + sz));
    // Segments: the thorax breathes, the abdomen pumps, wags, bobs and telescopes, the head nods late.
    const tb = 1 + 0.034 * b1; this.thorax.scale.set(tb, tb, 1 + 0.012 * b1);
    const ab = 1 + 0.06 * b2;
    this.abd.scale.set(ab, 1 + 0.02 * b2, clamp(1 - fw2 * 2.3, 0.72, 1.3));
    // It lies under the folded wings, so it may sag freely but lift only as far as the wings have opened.
    this.abd.rotation.set(Math.min(0.05 + 0.7 * Math.max(0, this.spread.v), P.abdPitch + fw2 * 2.6 + 0.04 * b2 - 0.04 + Math.cos(2 * w - 1.0) * 0.075 * walk - hopK * 0.25),
      clamp(this.abdYaw.v - lt2 * 4 + P.abdYaw - Math.sin(w - 0.9) * 0.3 * walk - this.bodyYaw.v * 0.35, -0.62, 0.62), 0);
    this.head.position.z = 0.165 + fw2 * 0.2;
    this.head.rotation.set(this.lookPitch.v - this.lean.v * 0.55 + fw2 * 1.9 + Math.cos(2 * w - 0.5) * 0.03 * walk, this.lookYaw.v - sw * 0.075 * walk, this.lookRoll.v - lt2 * 1.4 - sw * 0.05 * walk);
    this.eyes.scale.y = (1 - lid * 0.9) * (1 + 0.12 * wide);

    // Antennae: lag behind turns and speed, sway and twitch on their own.
    for (let i = 0; i < 2; i++) {
      const a = this.ant[i], n = noise1(time * 0.9 + a.side * 5.3) - 0.5;
      a.twT -= dt; if (a.twT <= 0) { a.twT = rnd(1.4, 4.2); if (!calm && !this.asleep) a.pitch.vel += rnd(-5, 5); }
      a.pitch.target = 0.72 + this.moveAmt * 0.38 + this.pushAmt * 0.3 + this.air * 0.55 + P.antUp + P.antA[i] + n * 0.26 + fw2 * 3.2 - this.joy * 0.3;
      a.roll.target = a.side * (0.42 + n * 0.14) + turnRate * 0.05 + lt2 * 2.4 + P.antR[i];
      a.pitch.step(dt); a.roll.step(dt);
      a.mesh.rotation.set(a.pitch.v, 0, -a.roll.v);
    }

    // Wings: folded like a tent on the ground, spread and beating in the air. Each wing rides its own spring, so
    // they bounce with the steps, shuffle against each other and flick shut after a stop.
    const sp = clamp(this.spread.v, -0.18, 1.2), sp2 = clamp(this.spread2.v, -0.18, 1.2), beat = Math.sin(this.flap) * Math.max(this.air, Math.min(1, this.joy * 1.6), P.beat, hopK * 0.6);
    const shiver = Math.sin(time * 38) * (this.pushAmt * 0.035 + P.shiver);
    for (let i = 0; i < 2; i++) {
      const wg = this.wings[i], s = wg.side;
      wg.bounce.target = (Math.sin(2 * w - 1.3) * 0.15 + s * Math.sin(w - 0.6) * 0.12) * walk + 0.032 * b1 * (1 - this.air) + P.droop + P.flop[i] - fw2 * 0.9 * ground;
      wg.bounce.step(dt);
      const sweep = 1.18 - sp * 1.02, roll = -0.34 + sp * 0.5 + sp * beat * 0.72 + shiver + this.joy * 0.2 * Math.sin(time * 30) + wg.bounce.v;
      wg.pivot.rotation.y = s * sweep + (this.wingYaw.v - lt2 * 2.2) * (1 - 0.6 * clamp01(sp)) + Math.sin(w - 0.3 + s * 0.5) * 0.085 * walk;
      wg.pivot.rotation.z = s * roll;
      wg.pivot.rotation.x = -0.1 - sp * 0.12 + Math.abs(Math.sin(w + 0.9)) * 0.1 * walk - fw2 * 1.5 * ground;
      wg.hind.rotation.y = -s * sp * 0.5 + s * (sp - sp2) * 0.8 + this.wingYaw.v * 0.5;
      wg.hind.rotation.z = s * (sp - sp2) * 0.35;
      wg.hind.rotation.x = (this.fw.v - this.fw2.v) * 1.2 * ground;
    }

    // ---- legs: IK from each hip (on the squashed, leaning body) to its foot ----
    this.body.updateMatrix();
    const invS = 1 / Math.max(0.05, this.scale), rootY = this.root.position.y - this.y, tuck = Math.max(sstep(0.15, 0.8, this.air), hopK * 0.75);
    for (let i = 0; i < 6; i++) {
      const l = feet[i];
      _h.copy(l.hip).applyMatrix4(this.body.matrix);
      // The planted foot, from the world into the heading frame.
      const rx = (l.wx - this.x - bx) * invS, rz = (l.wz - this.z - bz) * invS;
      _f.set(rx * ch - rz * sh, (l.lift - rootY) * invS, rx * sh + rz * ch);
      if (l.k === 0) {
        const j = l.side > 0 ? 1 : 0;
        _f.y += P.legLift[j];
        if (P.legW[j] > 0.001) { _o.set(P.legX[j], P.legY[j], P.legZ[j]).applyMatrix4(this.body.matrix); _f.lerp(_o, P.legW[j]); }
        if (this.pushAmt > 0.01) _f.z -= 0.05 * this.pushAmt;
      }
      if (tuck > 0.001) { _o.set(_h.x + l.side * 0.085, _h.y - 0.13, _h.z + 0.03 - (l.k - 1) * 0.03); _f.lerp(_o, tuck); }
      // Two-bone solve; the knee points up and out.
      _d.subVectors(_f, _h); let len = _d.length();
      const max = FEMUR + TIBIA - 0.002;
      if (len > max) { _d.multiplyScalar(max / len); len = max; _f.addVectors(_h, _d); }
      if (len < 0.04) { _d.set(l.side * 0.03, -0.03, 0); len = _d.length(); }
      _d.multiplyScalar(1 / len);
      const d1 = (FEMUR * FEMUR - TIBIA * TIBIA + len * len) / (2 * len), hgt = Math.sqrt(Math.max(0, FEMUR * FEMUR - d1 * d1));
      _p.set(l.side * 0.6, 1, (1 - l.k) * 0.12); _p.addScaledVector(_d, -_p.dot(_d)).normalize();
      _k.copy(_h).addScaledVector(_d, d1).addScaledVector(_p, hgt);
      l.femur.position.copy(_h); l.femur.quaternion.setFromUnitVectors(UP, _p.subVectors(_k, _h).normalize());
      l.tibia.position.copy(_k); l.tibia.quaternion.setFromUnitVectors(UP, _p.subVectors(_f, _k).normalize());
    }

    // ---- what the garden may know ----
    for (let i = 0; i < PRINTS; i++) this.prints[i].t += dt;
    const on = this.visible && this.scale > 0.5 ? 1 : 0;
    SENSE.x = this.x + bx; SENSE.z = this.z + bz; SENSE.y = this.y + this.hopH; SENSE.heading = this.heading;
    SENSE.hx = SENSE.x + sh * 0.3; SENSE.hz = SENSE.z + ch * 0.3; SENSE.hy = SENSE.y + 0.4;
    SENSE.vx = vx; SENSE.vz = vz; SENSE.speed = spd; SENSE.ground = ground * on * (this.y < 0.3 ? 1 : 0); SENSE.still = busy ? 0 : this.still; SENSE.asleep = this.asleep;
    G.uMoth.value.set(this.x + bx, this.z + bz, ground * (this.visible ? 1 : 0));
  }

  // A foot came down: leave a faint print of moth dust that fades.
  _print(x, z) { const p = this.prints[this.printI]; this.printI = (this.printI + 1) % PRINTS; p.x = x; p.z = z; p.t = 0; }

  emit(field, glow, shade, groundY) {
    if (!this.visible || this.scale <= 0.01) return;
    const alt = Math.max(0, this.y + this.hopH - groundY), k = this.scale;
    field.add(this.x, this.z, 2.1, AURA[0] * 0.26 * k, AURA[1] * 0.26 * k, AURA[2] * 0.32 * k);
    if (alt < 0.45) field.block(this.x, this.z, 0.17 * k);   // the moth casts a shadow in lantern light
    shade.push(this.root.position.x, groundY + 0.004, this.root.position.z, (0.34 + alt * 0.16) * k, 0.02, 0.02, 0.07, 0.62 * k / (1 + alt * 1.4));
    // Footfalls: a small pool of the moth's own light where a foot came down, fading behind it as it walks.
    for (let i = 0; i < PRINTS; i++) {
      const p = this.prints[i]; if (p.t > 0.7) continue;
      const f = 1 - p.t / 0.7, a = 1.15 * f * f * k;
      field.add(p.x, p.z, 0.4 + 0.2 * (1 - f), AURA[0] * a, AURA[1] * a, AURA[2] * a);
    }
  }
}
