// Light in motion. Short-lived particles (sparks when a lantern lights, dust when the moth lands or bumps,
// embers over a finished garden) and the pieces that stage the big sequences:
//  - motes: the light itself when it travels. A lantern's flame or a plinth's wisp leaves as a mote, joins the
//    swarm around the moth, rides with it to the next garden and flies out again to a plinth or a lantern there.
//  - rings: a ring of light on the ground where a lantern answers.
//  - glory: the warmth of a finished garden spilling over walls, mist and islets.
// Everything is drawn through the shared glow layer, the ground decals and the light field.
import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { ease, clamp01, damp } from '../util.js';
import { DustLayer } from './dust.js';

const MAX = 420, MAX_MOTES = 40;
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const WARM = lin(PALETTE.flame), CORE = lin(PALETTE.flameCore), DUST = lin(0xb9c6ee), PETAL = lin(PALETTE.blossom), COOL = lin(PALETTE.wisp);
const HOT = [WARM[0] * 0.6 + CORE[0] * 0.4, WARM[1] * 0.6 + CORE[1] * 0.4, WARM[2] * 0.6 + CORE[2] * 0.4];
const _o = [0, 0, 0];
const STONE = lin(0xd9cfc0), SOOT = lin(0x9a96a6);       // dust kicked up from the paving; smoke from a flame that went out
const LEAF = lin(0x7fd69a);

export class Fx {
  constructor(lanterns) {
    this.lanterns = lanterns;
    this.pool = []; for (let i = 0; i < MAX; i++) this.pool.push({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, life: 1, size: 0.05, r: 1, g: 1, b: 1, grav: 0, drag: 1, a: 1, sway: 0, kind: 0 });
    this.cursor = 0; this.emberOn = false; this.emberAcc = 0; this.time = 0;
    this.motes = []; this.slot = 0; this.ax = 0; this.ay = 0; this.az = 0;
    this.rings = [];
    this.glory = 0; this.gx = 0; this.gz = 0; this.gr = 4; this.bx = 0; this.by = 3; this.bz = 0; this.bs = 0;
    this.calm = false;                // reduced motion: light changes hands without flying
    this.aura = 0; this.auraWarm = 0.3; // the glow the moth carries from one garden to the next
    // Dust and smoke are drawn in their own layer: lit by the place, not glowing.
    this.dust = new DustLayer(96);
    if (lanterns && lanterns.stage) lanterns.stage.scene.add(this.dust.mesh);
  }

  _spawn() { for (let k = 0; k < MAX; k++) { const p = this.pool[this.cursor]; this.cursor = (this.cursor + 1) % MAX; if (!p.live) { p.live = true; p.t = 0; p.kind = 0; return p; } } return null; }

  sparks(x, y, z, n, cool = false) {
    for (let i = 0; i < n; i++) {
      const p = this._spawn(); if (!p) return;
      const a = Math.random() * 6.283, s = 0.6 + Math.random() * 1.5, c = cool ? COOL : Math.random() < 0.4 ? CORE : WARM;
      p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = 0.8 + Math.random() * 1.6;
      p.life = 0.45 + Math.random() * 0.55; p.size = 0.05 + Math.random() * 0.06; p.r = c[0]; p.g = c[1]; p.b = c[2]; p.grav = -2.2; p.drag = 2.6; p.a = 1; p.sway = 0;
    }
  }

  // Dust off the paving: soft grey puffs that spread low, swell and thin out. (dx, dz) throws them one way.
  puff(x, y, z, n, dx = 0, dz = 0) {
    for (let i = 0; i < n; i++) {
      const p = this._spawn(); if (!p) return;
      const a = Math.random() * 6.283, s = 0.35 + Math.random() * 0.9, v = 0.86 + Math.random() * 0.2;
      p.kind = 1; p.x = x + Math.cos(a) * 0.05; p.y = y + Math.random() * 0.05; p.z = z + Math.sin(a) * 0.05;
      p.vx = Math.cos(a) * s + dx * (0.5 + Math.random() * 0.9); p.vz = Math.sin(a) * s + dz * (0.5 + Math.random() * 0.9); p.vy = 0.15 + Math.random() * 0.5;
      p.life = 0.42 + Math.random() * 0.4; p.size = 0.075 + Math.random() * 0.06; p.r = STONE[0] * v; p.g = STONE[1] * v; p.b = STONE[2] * v; p.grav = 0.1; p.drag = 4.2; p.a = 0.62; p.sway = 0.15;
    }
  }
  // A few leaves shaken out of a hedge: they tumble down and are gone.
  leaves(x, y, z, n, dx = 0, dz = 0) {
    for (let i = 0; i < n; i++) {
      const p = this._spawn(); if (!p) return;
      const v = 0.75 + Math.random() * 0.5;
      p.kind = 2; p.x = x + (Math.random() - 0.5) * 0.5 * Math.abs(dz) + dx * 0.02; p.y = y + Math.random() * 0.25; p.z = z + (Math.random() - 0.5) * 0.5 * Math.abs(dx) + dz * 0.02;
      p.vx = dx * (0.5 + Math.random() * 0.9) + (Math.random() - 0.5) * 0.5; p.vz = dz * (0.5 + Math.random() * 0.9) + (Math.random() - 0.5) * 0.5; p.vy = 0.5 + Math.random() * 0.8;
      p.life = 0.5 + Math.random() * 0.35; p.size = 0.028 + Math.random() * 0.02; p.r = LEAF[0] * v; p.g = LEAF[1] * v; p.b = LEAF[2] * v; p.grav = -4.2; p.drag = 1.6; p.a = 1; p.sway = 0.5;
    }
  }
  // A thread of smoke from a lantern that just went dark.
  smoke(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const p = this._spawn(); if (!p) return;
      p.kind = 1; p.x = x + (Math.random() - 0.5) * 0.05; p.y = y + i * 0.05; p.z = z + (Math.random() - 0.5) * 0.05;
      p.vx = (Math.random() - 0.5) * 0.14; p.vz = (Math.random() - 0.5) * 0.14; p.vy = 0.45 + Math.random() * 0.3 + i * 0.12;
      p.life = 0.7 + Math.random() * 0.45; p.size = 0.05 + Math.random() * 0.03; p.r = SOOT[0]; p.g = SOOT[1]; p.b = SOOT[2]; p.grav = 0.25; p.drag = 1.1; p.a = 0.4; p.sway = 0.5;
    }
  }

  // Embers rise from the lit lanterns; with an area ({ hx, hz } half sizes) lights also rise all over the garden.
  embers(on, area = null) { this.emberOn = on; this.emberArea = on ? area : null; }

  // ---- rings and glory -------------------------------------------------------------------------------------
  ring(x, y, z, size = 1.5, dur = 0.6, warm = 1) { if (this.rings.length < 40) this.rings.push({ x, y, z, size, dur, warm, t: 0 }); }
  // Where the glory sits: centre and radius on the ground, and a point in front of the scene for the bloom.
  gloryAt(x, z, radius, bx, by, bz, bloomSize) { this.gx = x; this.gz = z; this.gr = radius; this.bx = bx; this.by = by; this.bz = bz; this.bs = bloomSize; }

  // ---- motes -----------------------------------------------------------------------------------------------
  anchor(x, y, z) { this.ax = x; this.ay = y; this.az = z; }
  get carried() { let n = 0; for (const m of this.motes) if (m.st === 'in' || m.st === 'orbit') n++; return n; }

  _mote(x, y, z, warm) {
    if (this.motes.length >= MAX_MOTES) return null;
    const m = { st: 'orbit', x, y, z, sx: x, sy: y, sz: z, tx: 0, ty: 0, tz: 0, t: 0, dur: 0.5, warm, w0: warm, w1: warm, k: 0, slot: this.slot++, seed: Math.random() * 6.283,
      side: Math.random() < 0.5 ? -1 : 1, x1: x, y1: y, z1: z, x2: x, y2: y, z2: z, done: null, hidden: this.calm };
    this.motes.push(m); return m;
  }
  _orbit(m, time, o) {
    const dir = m.slot % 2 ? 1 : -1, a = m.seed + time * (2.3 + (m.slot % 3) * 0.8) * dir, r = 0.36 + 0.12 * (m.slot % 4);
    o[0] = this.ax + Math.cos(a) * r; o[1] = this.ay + 0.4 + 0.15 * Math.sin(time * 2.1 + m.seed * 1.7) + (m.slot % 3) * 0.11; o[2] = this.az + Math.sin(a) * r;
  }

  // A light leaves (x, y, z) and joins the swarm around the anchor.
  gather(x, y, z, warm = 1, wait = 0, dur = 0.45) {
    if (this.calm) return;
    const m = this._mote(x, y, z, warm); if (!m) return;
    m.st = 'in'; m.t = -wait; m.dur = dur; m.k = 0.6;
  }
  // New lights appear in the swarm.
  spawn(n, warm = 0) { if (this.calm) return; for (let i = 0; i < n; i++) { const m = this._mote(this.ax, this.ay + 0.4, this.az, warm); if (m) this._orbit(m, this.time, _o), m.x = m.x1 = m.x2 = _o[0], m.y = m.y1 = m.y2 = _o[1], m.z = m.z1 = m.z2 = _o[2]; } }
  // One light of the swarm flies to (x, y, z), becoming warm (1) or cool (0) on the way; `done` runs on arrival.
  send(x, y, z, warm, wait, dur, done) {
    let m = null;
    for (const q of this.motes) if (q.st === 'orbit' && !q.done) { m = q; break; }
    if (!m) for (const q of this.motes) if (q.st === 'in') { m = q; break; }
    if (!m) m = this._mote(this.ax, this.ay + 0.4, this.az, warm);
    if (!m) { if (done) done(); return; }
    if (m.st === 'in') { m.sx = m.x; m.sy = m.y; m.sz = m.z; }
    m.st = 'to'; m.t = -wait; m.dur = Math.max(0.05, dur); m.tx = x; m.ty = y; m.tz = z; m.w0 = m.warm; m.w1 = warm; m.done = done || null; m.go = false;
  }
  // The lights that were not sent anywhere drift up and go out.
  dismiss() { for (const m of this.motes) if (m.st === 'in' || m.st === 'orbit') { m.st = 'out'; m.t = -Math.random() * 0.2; } }
  // Keep n lights in the swarm; the others drift up and go out.
  keep(n) { let k = 0; for (const m of this.motes) if ((m.st === 'in' || m.st === 'orbit') && k++ >= n) { m.st = 'out'; m.t = -Math.random() * 0.15; } }
  // Lights on their way somewhere turn back to the swarm (their sequence was cut short).
  recall() { for (const m of this.motes) if (m.st === 'to') { m.st = 'in'; m.sx = m.x; m.sy = m.y; m.sz = m.z; m.t = 0; m.dur = 0.3; m.done = null; } }
  // Every flying light arrives now (used when a sequence is cut short).
  flush() { const list = this.motes; this.motes = []; for (const m of list) if (m.st === 'to' && m.done) m.done(); }

  update(dt, time) {
    this.time = time;
    if (this.emberOn && this.emberArea) {
      // The last garden: slow lights lift off everywhere and climb into the night.
      const A = this.emberArea;
      this.areaAcc = (this.areaAcc || 0) + dt * Math.min(70, 14 + A.hx * A.hz * 0.5);
      while (this.areaAcc >= 1) {
        this.areaAcc -= 1;
        const p = this._spawn(); if (!p) break;
        const c = Math.random() < 0.25 ? PETAL : Math.random() < 0.5 ? CORE : WARM;
        p.x = (Math.random() * 2 - 1) * A.hx; p.y = 0.3 + Math.random() * 0.5; p.z = (Math.random() * 2 - 1) * A.hz;
        p.vx = (Math.random() - 0.5) * 0.3; p.vz = (Math.random() - 0.5) * 0.3; p.vy = 0.5 + Math.random() * 0.9;
        p.life = 2.6 + Math.random() * 2.4; p.size = 0.05 + Math.random() * 0.07; p.r = c[0]; p.g = c[1]; p.b = c[2]; p.grav = 0.12; p.drag = 0.3; p.a = 1; p.sway = 0.5 + Math.random();
      }
    }
    if (this.emberOn) {
      this.emberAcc += dt * Math.min(46, 8 + this.lanterns.items.length * 5);
      while (this.emberAcc >= 1) {
        this.emberAcc -= 1;
        const items = this.lanterns.items; if (!items.length) break;
        const it = items[(Math.random() * items.length) | 0]; if (it.lit < 0.5) continue;
        const p = this._spawn(); if (!p) break;
        const petal = Math.random() < 0.3, c = petal ? PETAL : Math.random() < 0.5 ? CORE : WARM;
        p.x = it.x + (Math.random() - 0.5) * 0.5; p.y = it.y + (it.lift || 0) + 0.4 + Math.random() * 0.3; p.z = it.z + (Math.random() - 0.5) * 0.5;
        p.vx = (Math.random() - 0.5) * 0.5; p.vz = (Math.random() - 0.5) * 0.5; p.vy = 0.7 + Math.random() * 1.1;
        p.life = 1.3 + Math.random() * 1.5; p.size = 0.035 + Math.random() * 0.055; p.r = c[0]; p.g = c[1]; p.b = c[2]; p.grav = 0.25; p.drag = 0.5; p.a = petal ? 0.6 : 1; p.sway = 0.6 + Math.random();
      }
    }
    for (const p of this.pool) {
      if (!p.live) continue;
      p.t += dt; if (p.t >= p.life) { p.live = false; continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k + p.grav * dt;
      p.x += (p.vx + Math.sin(time * 2.3 + p.life * 40) * p.sway * 0.35) * dt; p.y += p.vy * dt; p.z += (p.vz + Math.cos(time * 1.9 + p.life * 31) * p.sway * 0.35) * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt; if (r.t >= r.dur) this.rings.splice(i, 1); }

    // Motes.
    let arrived = null;
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      if (m.st === 'orbit') { this._orbit(m, time, _o); m.x = _o[0]; m.y = _o[1]; m.z = _o[2]; m.k = damp(m.k, 1, 0.12, dt); }
      else if (m.st === 'in') {
        m.t += dt; m.k = damp(m.k, 1, 0.1, dt);
        if (m.t > 0) {
          const p = clamp01(m.t / m.dur), e = ease.inOutCubic(p), arc = Math.sin(Math.PI * p);
          this._orbit(m, time, _o);
          const dx = _o[0] - m.sx, dz = _o[2] - m.sz, d = Math.hypot(dx, dz) + 1e-4, sw = arc * Math.min(0.6, d * 0.22) * m.side;
          m.x = m.sx + dx * e - (dz / d) * sw; m.z = m.sz + dz * e + (dx / d) * sw; m.y = m.sy + (_o[1] - m.sy) * e + arc * 0.35;
          if (p >= 1) m.st = 'orbit';
        }
      } else if (m.st === 'to') {
        const was = m.t; m.t += dt;
        if (m.t <= 0) { this._orbit(m, time, _o); m.x = damp(m.x, _o[0], 0.05, dt); m.y = damp(m.y, _o[1], 0.05, dt); m.z = damp(m.z, _o[2], 0.05, dt); m.k = damp(m.k, 1, 0.12, dt); }
        else {
          if (!m.go) { m.go = true; m.sx = m.x; m.sy = m.y; m.sz = m.z; if (was < 0) m.t = Math.min(m.t, dt); }
          const p = clamp01(m.t / m.dur), e = ease.inOutQuad(p), arc = Math.sin(Math.PI * p);
          const dx = m.tx - m.sx, dz = m.tz - m.sz, d = Math.hypot(dx, dz) + 1e-4, sw = arc * Math.min(0.7, d * 0.16) * m.side;
          m.x = m.sx + dx * e - (dz / d) * sw; m.z = m.sz + dz * e + (dx / d) * sw; m.y = m.sy + (m.ty - m.sy) * e + arc * (0.45 + d * 0.09);
          m.warm = m.w0 + (m.w1 - m.w0) * ease.inOutQuad(p); m.k = damp(m.k, 1, 0.1, dt);
          if (p >= 1) { this.motes.splice(i, 1); if (m.done) (arrived || (arrived = [])).push(m.done); continue; }
        }
      } else {
        m.t += dt;
        if (m.t > 0) { m.y += dt * (0.6 + m.t * 2.2); m.x += Math.sin(time * 3 + m.seed) * dt * 0.4; m.k = Math.max(0, 1 - m.t / 0.55); if (m.t >= 0.55) { this.motes.splice(i, 1); continue; } }
        else { this._orbit(m, time, _o); m.x = _o[0]; m.y = _o[1]; m.z = _o[2]; }
      }
      m.x1 = damp(m.x1, m.x, 0.04, dt); m.y1 = damp(m.y1, m.y, 0.04, dt); m.z1 = damp(m.z1, m.z, 0.04, dt);
      m.x2 = damp(m.x2, m.x1, 0.055, dt); m.y2 = damp(m.y2, m.y1, 0.055, dt); m.z2 = damp(m.z2, m.z1, 0.055, dt);
    }
    if (arrived) for (const f of arrived) f();
  }

  emit(glow) {
    const dust = this.dust; dust.begin();
    for (const p of this.pool) {
      if (!p.live) continue;
      const u = p.t / p.life, fade = u < 0.12 ? u / 0.12 : 1 - (u - 0.12) / 0.88;
      if (p.kind === 1) dust.push(p.x, p.y, p.z, p.size * (0.7 + 1.5 * Math.sqrt(u)), p.r, p.g, p.b, p.a * (u < 0.08 ? u / 0.08 : Math.pow(1 - (u - 0.08) / 0.92, 1.4)));
      else if (p.kind === 2) dust.push(p.x, Math.max(0.02, p.y), p.z, p.size, p.r, p.g, p.b, Math.min(1, (1 - u) * 4));
      else glow.push(p.x, p.y, p.z, p.size * (0.7 + fade * 0.6), p.r, p.g, p.b, p.a * fade * 1.5);
    }
    dust.end();
    const stage = this.lanterns.stage, field = stage && stage.field, shine = stage && stage.shine;
    if (shine) for (const r of this.rings) {
      const p = r.t / r.dur, c = r.warm > 0.5 ? WARM : COOL;
      shine.push(r.x, r.y, r.z, 0.3 + (r.size - 0.3) * ease.outCubic(p), c[0], c[1], c[2], Math.pow(1 - p, 1.5) * 1.1, true);
    }
    // The swarm casts one shared pool of light; a light on its way casts its own.
    let n = 0, w = 0;
    for (const m of this.motes) {
      if (m.hidden || m.k <= 0.01) continue;
      const u = m.warm, r = COOL[0] + (HOT[0] - COOL[0]) * u, g = COOL[1] + (HOT[1] - COOL[1]) * u, b = COOL[2] + (HOT[2] - COOL[2]) * u, k = m.k;
      glow.push(m.x, m.y, m.z, 0.14, r, g, b, 1.7 * k);
      glow.push(m.x, m.y, m.z, 0.55, r, g, b, 0.3 * k);
      glow.push(m.x1, m.y1, m.z1, 0.1, r, g, b, 0.8 * k);
      glow.push(m.x2, m.y2, m.z2, 0.075, r, g, b, 0.42 * k);
      if (m.st === 'orbit' || (m.st === 'to' && !m.go)) { n += k; w += u * k; }
      else if (field) { const a = (0.3 + 0.5 * u) * k; field.add(m.x, m.z, 2.4, r * a, g * a, b * a); }
    }
    if (n > 0.01 && field) {
      const u = w / n, a = (0.3 + Math.min(0.9, 0.09 * n)) * (0.5 + 0.5 * u), r = COOL[0] + (WARM[0] - COOL[0]) * u, g = COOL[1] + (WARM[1] - COOL[1]) * u, b = COOL[2] + (WARM[2] - COOL[2]) * u;
      field.add(this.ax, this.az, 2.8 + Math.min(3.4, 0.28 * n), r * a, g * a, b * a);
      glow.push(this.ax, this.ay + 0.42, this.az, 0.9 + Math.min(0.7, 0.05 * n), r, g, b, 0.1 + Math.min(0.16, 0.012 * n));
    }
    // The glow that travels with the moth between two gardens: the next garden rises in its light.
    if (this.aura > 0.01 && field) {
      const u = this.auraWarm, k = this.aura, r = COOL[0] + (WARM[0] - COOL[0]) * u, g = COOL[1] + (WARM[1] - COOL[1]) * u, b = COOL[2] + (WARM[2] - COOL[2]) * u, a = k * (0.35 + 0.75 * u);
      field.add(this.ax, this.az, 5.6, r * a, g * a, b * a);
      glow.push(this.ax, this.ay + 0.35, this.az, 1.5, r, g, b, 0.12 * k);
    }
    if (this.glory > 0.01) {
      const k = this.glory;
      if (field) field.add(this.gx, this.gz, this.gr, WARM[0] * 0.3 * k, WARM[1] * 0.3 * k, WARM[2] * 0.3 * k);
      if (this.bs > 0) glow.push(this.bx, this.by, this.bz, this.bs, WARM[0], WARM[1] * 0.85, WARM[2] * 0.7, 0.028 * k);
    }
  }
}
