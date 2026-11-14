// Everything around the garden that is not the far backdrop (see backdrop.js): the mist that pools around the
// island's foot (two drifting sheets), the fireflies, and the small sister islets with their cypresses that
// float at a distance and rearrange themselves between levels.
// None of it is gameplay; it gives depth, scale and life.
import * as THREE from 'three';
import { PALETTE, QUALITY } from '../config.js';
import { G, gardenMaterial, colorGLSL } from './materials.js';
import { writeTS, writeTRS } from './geo.js';
import { rng, damp, noise1 } from '../util.js';
import { SENSE } from './sense.js';

const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const FLY = lin(PALETTE.firefly), FLYW = lin(PALETTE.fireflyWarm), FLAME = lin(PALETTE.flame);

const NOISE = /* glsl */`
float aHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float aNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), f.x), mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float aFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * aNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.0; a *= 0.5; } return s / 0.875; }
`;

// A sheet of mist at one height. It is thickest along the island's edge (the blurred footprint texture),
// thins out over open air, and takes the colour of moonlight, of nearby lanterns and of a warming garden.
function mistSheet(seed, reach, strength) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: G.uTime, uWarm: G.uWarm, uLightMap: G.uLightMap, uAoMap: G.uAoMap, uFieldRect: G.uFieldRect, uSeed: { value: seed }, uReach: { value: reach }, uStrength: { value: strength } },
    vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      varying vec3 vW; uniform float uTime; uniform float uWarm; uniform float uSeed; uniform float uReach; uniform float uStrength;
      uniform sampler2D uLightMap; uniform sampler2D uAoMap; uniform vec4 uFieldRect;
      ${NOISE}
      void main() {
        vec2 fuv = (vW.xz - uFieldRect.xy) * uFieldRect.zw;
        vec2 e = min(fuv, 1.0 - fuv); float inside = smoothstep(0.0, 0.06, min(e.x, e.y));
        float isle = texture2D(uAoMap, fuv).g;
        vec2 p = vW.xz * 0.42 + uSeed;
        float n = aFbm(p + vec2(-uTime * 0.02, uTime * 0.012) + 0.5 * aNoise(p * 0.5 - uTime * 0.01));
        float shore = smoothstep(uReach, 0.5, isle) * (1.0 - 0.9 * smoothstep(0.62, 0.97, isle));   // a ring along the edge, thin under the garden itself
        float a = shore * smoothstep(0.46, 0.9, n + 0.2 * shore) * uStrength * inside;
        vec3 lm = texture2D(uLightMap, fuv).rgb;
        vec3 col = vec3(${colorGLSL(PALETTE.mistPool)}) * (0.2 + 0.42 * n) + lm * vec3(0.5, 0.4, 0.34) * 0.5 + vec3(${colorGLSL(PALETTE.mistWarm)}) * uWarm * (0.04 + 0.07 * n);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false,
  });
}

function cypressGeometry() {
  // A slim cypress: a flame-shaped crown on a short stem, faceted.
  const P = [[0.028, 0], [0.028, 0.07], [0.1, 0.12], [0.15, 0.28], [0.155, 0.46], [0.12, 0.68], [0.065, 0.88], [0.001, 1.0]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(P, 7);
}

function isletRockGeometry() {
  // A hanging rock: broad under the turf, narrowing to a broken point. Seven-sided, faceted.
  const P = [[0.001, -1.2], [0.1, -1.0], [0.26, -0.66], [0.4, -0.34], [0.47, -0.1], [0.5, -0.02], [0.5, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(P, 7);
}

function isletCapGeometry() {
  // The turf on top of it: a low mound that overhangs the rock a little.
  const P = [[0.5, -0.04], [0.535, 0.0], [0.5, 0.05], [0.34, 0.09], [0.001, 0.105]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(P, 7);
}

const ISLETS = 5, PER = 3;

export class Ambient {
  constructor(stage) {
    this.stage = stage;
    const sheet = new THREE.PlaneGeometry(1, 1); sheet.rotateX(-Math.PI / 2);
    this.sheets = [
      new THREE.Mesh(sheet, mistSheet(3.0, 0.03, 0.7)), new THREE.Mesh(sheet, mistSheet(41.0, 0.12, 0.5)),
    ];
    this.sheets[0].position.y = -1.7; this.sheets[1].position.y = -0.85;
    this.sheets.forEach((m, i) => { m.frustumCulled = false; m.renderOrder = 2 + i; stage.scene.add(m); });

    // Fireflies.
    const count = stage.touch ? QUALITY.firefliesTouch : QUALITY.fireflies, r = rng(77);
    this.flies = [];
    for (let i = 0; i < count; i++) this.flies.push({ hx: 0, hz: 0, x: 0, y: 1, z: 0, seed: r() * 100, rate: 0.6 + r() * 0.9, hgt: 0.35 + r() * 1.3, reach: 0.7 + r() * 1.4, warm: r() < 0.3, on: 0, rank: i / count, sx: 0, sz: 0 });
    this.hx = 3; this.hz = 3;

    // Islets: a fixed cast of small floating rocks with a turf mound, one or two cypresses, sometimes a lantern left burning.
    const rock = gardenMaterial({ kind: 'earth', color: PALETTE.earthTop, flatShading: true, aoGain: 0, lightGain: 0.3, rimGain: 0.35, mistLift: 0.9, haze: 0.42 });
    const turf = gardenMaterial({ color: new THREE.Color(PALETTE.hedge).multiplyScalar(0.62), flatShading: true, aoGain: 0, lightGain: 0.3, rimGain: 0.6, mistLift: 1.5, haze: 0.38 });
    const tree = gardenMaterial({ color: new THREE.Color(PALETTE.hedge).multiplyScalar(0.5), flatShading: true, aoGain: 0, lightGain: 0.3, rimGain: 0.9, mistLift: 1.5, haze: 0.38 });
    const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; return m; };
    this.rocks = mk(isletRockGeometry(), rock, ISLETS * PER);
    this.caps = mk(isletCapGeometry(), turf, ISLETS * PER);
    this.trees = mk(cypressGeometry(), tree, ISLETS * 2);
    stage.scene.add(this.rocks, this.caps, this.trees);
    const ir = rng(4242);
    this.islets = [];
    for (let i = 0; i < ISLETS; i++) {
      // One main rock and up to two smaller ones hanging beside it, a little lower.
      const parts = [{ dx: 0, dz: 0, dy: 0, s: 1, tall: 0.65 + ir() * 0.3, yaw: ir() * 6.283 }], n = (ir() * 3) | 0, a0 = ir() * 6.283;
      for (let k = 0; k < n; k++) { const a = a0 + k * (2.2 + ir()), d = 0.62 + ir() * 0.22; parts.push({ dx: Math.cos(a) * d, dz: Math.sin(a) * d, dy: -0.12 - ir() * 0.4, s: 0.36 + ir() * 0.24, tall: 0.6 + ir() * 0.4, yaw: ir() * 6.283 }); }
      const ta = ir() * 6.283;
      this.islets.push({ parts, trees: ir() < 0.85 ? (ir() < 0.45 ? 2 : 1) : 0, treeS: 0.95 + ir() * 0.5, tx2: Math.cos(ta) * 0.26, tz2: Math.sin(ta) * 0.26, lit: ir() < 0.6, x: 0, y: -9, z: 0, tx: 0, ty: -2, tz: 0, seed: ir() * 50, scale: 0.6 + ir() * 0.4 });
    }
    this.time = 0;
  }

  // Spreads fireflies over the new garden and sends the islets to new places around it.
  setLevel(level, instant = false) {
    this.hx = level.w / 2; this.hz = level.h / 2;
    const sx = level.w + 10, sz = level.h + 10;
    for (const m of this.sheets) m.scale.set(sx, 1, sz);
    const r = rng(level.n * 97 + 5);
    for (const f of this.flies) { f.hx = (r() * 2 - 1) * (this.hx + 1.2); f.hz = (r() * 2 - 1) * (this.hz + 1.2); if (instant) { f.x = f.hx; f.z = f.hz; } }
    const a0 = r() * 6.283;
    if (instant || this.bx == null) { this.bx = this.hx; this.bz = this.hz; }
    this.islets.forEach((it, i) => {
      let a = a0 + (i / ISLETS) * 6.283 + (r() - 0.5) * 0.7; const d = 3.6 + r() * 4.4;
      // An islet keeps its place in the ring around the garden and only shifts a little along it: it sails
      // around the garden to its new spot and never across the play area.
      if (!instant && it.ang != null) { let da = (a - it.ang) % 6.283; if (da > 3.1416) da -= 6.283; if (da < -3.1416) da += 6.283; a = it.ang + Math.max(-0.6, Math.min(0.6, da)); }
      it.ta = a; it.td = d; it.ty = -0.7 - r() * 0.7 - d * 0.14;
      if (instant || it.ang == null) { it.ang = a; it.dist = d; it.y = it.ty; }
    });
  }

  update(dt, time, warm, mothX, mothZ) {
    this.time = time;
    // Islets glide to their places and bob.
    const R = this.rocks.instanceMatrix.array, C = this.caps.instanceMatrix.array, T = this.trees.instanceMatrix.array;
    this.bx = damp(this.bx ?? this.hx, this.hx, 0.22, dt); this.bz = damp(this.bz ?? this.hz, this.hz, 0.22, dt);
    this.islets.forEach((it, i) => {
      // Distance is measured from the level's box (which glides from the old level's size to the new one),
      // not from its centre, so islets hug wide levels too and always stay clear of the garden.
      it.ang = damp(it.ang, it.ta, 0.6, dt); it.dist = damp(it.dist, it.td, 0.6, dt); it.y = damp(it.y, it.ty, 0.6, dt);
      const ex = Math.cos(it.ang), ez = Math.sin(it.ang), edge = Math.min((this.bx + 1) / Math.max(1e-3, Math.abs(ex)), (this.bz + 1) / Math.max(1e-3, Math.abs(ez)));
      it.x = ex * (edge + it.dist); it.z = ez * (edge + it.dist);
      const y = it.y + Math.sin(time * 0.45 + it.seed) * 0.09, s = it.scale; it.yNow = y;
      for (let k = 0; k < PER; k++) {
        const c = it.parts[k], j = i * PER + k;
        if (!c) { writeTS(R, j, 0, -50, 0, 0, 0, 0); writeTS(C, j, 0, -50, 0, 0, 0, 0); continue; }
        const ps = s * c.s, px = it.x + c.dx * s, py = y + c.dy * s + Math.sin(time * 0.6 + it.seed + k * 2.1) * 0.02, pz = it.z + c.dz * s;
        writeTRS(R, j, px, py, pz, c.yaw, 0, 0, ps, ps * c.tall, ps);
        writeTRS(C, j, px, py, pz, c.yaw, 0, 0, ps, ps, ps);
      }
      const ts = it.treeS * s * 0.8;
      writeTS(T, i * 2, it.x - it.tx2 * s * 0.5, y + 0.06 * s, it.z - it.tz2 * s * 0.5, it.trees > 0 ? ts : 0, it.trees > 0 ? ts * 1.2 : 0, it.trees > 0 ? ts : 0);
      writeTS(T, i * 2 + 1, it.x + it.tx2 * s * 0.9, y + 0.05 * s, it.z + it.tz2 * s * 0.9, it.trees > 1 ? ts * 0.62 : 0, it.trees > 1 ? ts * 0.72 : 0, it.trees > 1 ? ts * 0.62 : 0);
    });
    for (const m of [this.rocks, this.caps, this.trees]) m.instanceMatrix.needsUpdate = true;
    // Fireflies wander around a home point and come out as the garden warms. They answer the moth: one that walks
    // or flutters scatters those in its way (they dart off and up, then drift back); one that sits still makes
    // the bolder ones curious, and they come to circle its head until it snaps at them or moves.
    const S = SENSE, gust = S.gust !== this._gust, snap = S.snap !== this._snap, rush = S.speed > 1.2 && S.ground > 0.5;
    this._gust = S.gust; this._snap = S.snap;
    let near = -1, nd = 99, guests = 0;
    for (let i = 0; i < this.flies.length; i++) {
      const f = this.flies[i];
      if (f.ox === undefined) { f.ox = 0; f.oy = 0; f.oz = 0; f.kx = 0; f.ky = 0; f.kz = 0; f.cur = 0; f.wary = 0; f.bx = f.x; f.bz = f.z; f.by = f.y; f.bold = (f.seed * 7.3) % 1 < 0.45; }
      const t = time * f.rate * 0.35 + f.seed;
      let x = f.hx + (noise1(t) - 0.5) * 2 * f.reach * 1.6, z = f.hz + (noise1(t + 31.7) - 0.5) * 2 * f.reach * 1.6;
      let y = f.hgt + (noise1(t * 1.7 + 11.3) - 0.5) * 0.7;
      // Curious: drawn to a moth that has been still for a while.
      f.wary = Math.max(0, f.wary - dt);
      const want = f.bold && guests < 2 && f.on > 0.3 && f.wary <= 0 && S.still > 3 && S.ground > 0.5 && Math.hypot(x - S.hx, z - S.hz) < 3.4 ? 1 : 0;
      guests += want;
      f.cur = damp(f.cur, want, want ? 1.3 : 0.3, dt);
      if (f.cur > 0.005) {
        const a = time * (0.8 + f.rate * 0.5) * (f.warm ? -1 : 1) + f.seed, r = 0.95 + 0.27 * Math.sin(time * 0.5 + f.seed * 3), c = f.cur * f.cur * (3 - 2 * f.cur);
        x += (S.hx + Math.cos(a) * r - x) * c; z += (S.hz + Math.sin(a) * r - z) * c; y += (S.hy + 0.3 + 0.2 * Math.sin(time * 1.3 + f.seed * 2) - y) * c;
      }
      f.bx = damp(f.bx, x, 0.35, dt); f.bz = damp(f.bz, z, 0.35, dt); f.by = damp(f.by, y, 0.3, dt);
      // Startled: a quick dart away from the moth, upward, that fades back.
      const dx = f.x - S.x, dz = f.z - S.z, d = Math.hypot(dx, dz) + 1e-3;
      if (rush && d < 1.1 && f.wary < 0.3) { const p = 2.6 + 1.6 * (1 - d / 1.1); f.kx += (dx / d) * p + S.vx * 0.12; f.kz += (dz / d) * p + S.vz * 0.12; f.ky += 1.3; f.wary = 0.8; f.cur *= 0.3; }
      if (gust) { const gx = f.x - S.gustX, gz = f.z - S.gustZ, gd = Math.hypot(gx, gz) + 1e-3; if (gd < 1.7) { const p = S.gustPower * 2.6 * (1 - gd / 1.7); f.kx += (gx / gd) * p; f.kz += (gz / gd) * p; f.ky += p * 0.5; f.wary = Math.max(f.wary, 1.2); } }
      if (snap && S.snapFly === i) { f.kx += (dx / d) * 5.5; f.kz += (dz / d) * 5.5; f.ky += 2.4; f.wary = 7; f.cur = 0; }
      // Personal space: a firefly that is not visiting keeps a little clear of the moth.
      const shy = d < 1.0 && S.ground > 0.5 ? (1 - d) * (1 - f.cur) : 0;
      f.sx = damp(f.sx, (dx / d) * shy * 0.9, 0.22, dt); f.sz = damp(f.sz, (dz / d) * shy * 0.9, 0.22, dt);
      const kd = Math.exp(-4.2 * dt), od = Math.exp(-dt / 1.1);
      f.ox = (f.ox + f.kx * dt) * od; f.oy = (f.oy + f.ky * dt) * od; f.oz = (f.oz + f.kz * dt) * od; f.kx *= kd; f.ky *= kd; f.kz *= kd;
      f.x = f.bx + f.ox + f.sx; f.z = f.bz + f.oz + f.sz; f.y = Math.max(0.16, f.by + f.oy);
      if (f.on > 0.35) { const hd = Math.hypot(f.x - S.hx, f.z - S.hz); if (hd < nd) { nd = hd; near = i; } }
      f.on = damp(f.on, f.rank < 0.4 + warm * 0.6 ? 1 : 0, 0.8, dt);
    }
    // The moth is told which glowing firefly is nearest its head, so it can watch it.
    S.fly = near; S.flyD = nd;
    if (near >= 0) { const f = this.flies[near]; S.flyX = f.x; S.flyY = f.y; S.flyZ = f.z; }
  }

  emit(field, glow) {
    const time = this.time;
    for (const f of this.flies) {
      if (f.on < 0.02) continue;
      const tw = Math.pow(Math.max(0, Math.sin(time * (1.1 + f.rate * 0.7) + f.seed)), 2.5), a = f.on * (0.18 + 0.82 * tw), c = f.warm ? FLYW : FLY;
      glow.push(f.x, f.y, f.z, 0.075, c[0], c[1], c[2], a * 1.1);
      glow.push(f.x, f.y, f.z, 0.32, c[0], c[1], c[2], a * 0.1);
      field.add(f.x, f.z, 0.85, c[0] * 0.09 * a, c[1] * 0.09 * a, c[2] * 0.09 * a);
    }
    // A lantern someone left burning on a few of the sister islets.
    for (const it of this.islets) {
      if (!it.lit) continue;
      const k = 0.8 + 0.2 * Math.sin(time * 2.7 + it.seed), s = it.scale, x = it.x + it.tz2 * s * 1.1, z = it.z - it.tx2 * s * 1.1, y = (it.yNow ?? it.y) + 0.17 * s;
      glow.push(x, y, z, 0.07 * s, FLAME[0], FLAME[1], FLAME[2] * 0.8, 0.9 * k);
      glow.push(x, y, z, 0.5 * s, FLAME[0], FLAME[1] * 0.85, FLAME[2] * 0.7, 0.12 * k);
    }
  }
}
