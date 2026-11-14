// The light field: a small top-down texture that holds the coloured light of every lantern, wisp and the moth.
// It is redrawn every frame with additive soft discs (one instanced draw call) and sampled by every garden
// material and by the mist. This gives dozens of flickering lights for the cost of one texture lookup.
// Lantern light is shadowed here, in 2D: walls stop it (a march through a small wall-occupancy texture) and
// lanterns and the moth cast soft streaks away from the light (analytic discs). So a lit lantern fills its own
// room, spills through doorways and throws the moth's shadow across the floor.
// It also owns two static textures: ambient occlusion next to walls, and a blurred island footprint for the mist.
import * as THREE from 'three';
import { G } from './materials.js';
import { QUALITY } from '../config.js';

const MAX_LIGHTS = 160, MAX_BLOCK = 36;
const MARGIN = 5;      // cells of light spill kept around the level
const OCC = 4;         // wall-occupancy texels per cell
const STATIC = 6;      // AO / footprint texels per cell

// Box blur with a running sum (both directions), radius R texels, in place via a scratch buffer.
function boxBlur(a, b, tw, th, R, passes = 2) {
  const n = R * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < th; y++) { const o = y * tw; let s = 0; for (let x = 0; x <= R && x < tw; x++) s += a[o + x];
      for (let x = 0; x < tw; x++) { b[o + x] = s / n; const add = x + R + 1, sub = x - R; if (add < tw) s += a[o + add]; if (sub >= 0) s -= a[o + sub]; } }
    for (let x = 0; x < tw; x++) { let s = 0; for (let y = 0; y <= R && y < th; y++) s += b[y * tw + x];
      for (let y = 0; y < th; y++) { a[y * tw + x] = s / n; const add = y + R + 1, sub = y - R; if (add < th) s += b[add * tw + x]; if (sub >= 0) s -= b[sub * tw + x]; } }
  }
}

export class LightField {
  constructor(renderer, touch = false) {
    this.renderer = renderer;
    this.texels = touch ? QUALITY.lightTexelsTouch : QUALITY.lightTexels;
    this.count = 0;
    this.data = new Float32Array(MAX_LIGHTS * 4);   // x, z, radius, 1 when the light is shadowed
    this.color = new Float32Array(MAX_LIGHTS * 3);
    this.blockN = 0; this.blocks = []; for (let i = 0; i < MAX_BLOCK; i++) this.blocks.push(new THREE.Vector3());
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.aData = new THREE.InstancedBufferAttribute(this.data, 4).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aData', this.aData); geo.setAttribute('aColor', this.aColor);
    this.geo = geo;
    this.uOcc = { value: null }; this.uBlockN = { value: 0 };
    const mat = new THREE.ShaderMaterial({
      uniforms: { uRect: G.uFieldRect, uOcc: this.uOcc, uBlock: { value: this.blocks }, uBlockN: this.uBlockN },
      vertexShader: /* glsl */`
        attribute vec4 aData; attribute vec3 aColor; uniform vec4 uRect; varying vec2 vP; varying vec3 vC; varying vec2 vW; varying vec3 vL;
        void main() { vP = position.xy; vC = aColor; vL = vec3(aData.xy, aData.w);
          vW = aData.xy + position.xy * aData.z;
          gl_Position = vec4((vW - uRect.xy) * uRect.zw * 2.0 - 1.0, 0.0, 1.0); }`,
      fragmentShader: /* glsl */`
        varying vec2 vP; varying vec3 vC; varying vec2 vW; varying vec3 vL;
        uniform sampler2D uOcc; uniform vec4 uRect; uniform vec3 uBlock[${MAX_BLOCK}]; uniform int uBlockN;
        void main() { float d = dot(vP, vP); float a = max(0.0, 1.0 - d);
          // A hot centre that falls off like real light, inside a soft window that ends at the radius.
          a = vL.z > 0.5 ? a * a / (1.0 + 8.0 * d) : a * a * (0.35 + 0.65 * a);
          float T = 1.0;
          if (vL.z > 0.5 && a > 0.0) {
            vec2 dv = vW - vL.xy; float L = length(dv); vec2 dir = dv / max(L, 1e-4);
            // Walls: the densest thing between the light and here. The last stretch is left out, so the lit side
            // of a wall (and the first part of its top) still receives the light.
            float end = max(L - 0.72, 0.0), m = 0.0;
            for (int i = 0; i < 18; i++) { vec2 p = vL.xy + dir * (end * (float(i) + 0.5) / 18.0); m = max(m, texture2D(uOcc, (p - uRect.xy) * uRect.zw).r); }
            T = 1.0 - smoothstep(0.25, 0.85, m);
            // Lanterns and the moth: a soft streak away from the light that widens and thins with distance.
            for (int i = 0; i < uBlockN; i++) {
              vec3 b = uBlock[i]; vec2 ob = b.xy - vL.xy; float t = dot(ob, dir);
              if (dot(ob, ob) < 0.09 || t <= 0.0 || t >= L) continue;
              float perp = abs(ob.x * dir.y - ob.y * dir.x);
              float w = 0.05 + 0.3 * (L - t) / max(t, 0.35);
              float s = 1.0 - smoothstep(b.z - w * 0.5, b.z + w, perp);
              s *= smoothstep(b.z * 0.9, b.z + 0.22, length(vW - b.xy)) * (b.z / (b.z + w * 0.6));
              T *= 1.0 - 0.85 * s;
            }
          }
          // Lantern pools are stronger and a little more golden than the flame colour the lantern itself shows.
          vec3 c = vL.z > 0.5 ? vC * vec3(1.7, 2.15, 0.8) : vC;
          gl_FragColor = vec4(c * a * T, 1.0); }`,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.mesh);
    this.camera = new THREE.Camera();
    this.target = null; this.ao = null; this.occ = null; this.level = null;
    this._clear = new THREE.Color(0, 0, 0);
    this._prevClear = new THREE.Color();
    this.setLevel({ w: 4, h: 4, wall: new Uint8Array(16), floor: new Uint8Array(16) });
  }

  // Sizes the field for a level (cells are 1 world unit, centred on the origin) and bakes the static textures.
  setLevel(level) {
    const { w, h } = level; this.level = level;
    const minX = -w / 2 - MARGIN, minZ = -h / 2 - MARGIN, sx = w + MARGIN * 2, sz = h + MARGIN * 2;
    G.uFieldRect.value.set(minX, minZ, 1 / sx, 1 / sz);
    const tw = sx * this.texels, th = sz * this.texels;
    if (this.target) this.target.dispose();
    const type = this.renderer.extensions.has('EXT_color_buffer_half_float') || this.renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.target = new THREE.WebGLRenderTarget(tw, th, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    this.target.texture.colorSpace = THREE.NoColorSpace;
    G.uLightMap.value = this.target.texture;
    this._bakeStatic(level, sx, sz);
    // Wall occupancy: rebuilt by setWalls() whenever hedges grow or sink.
    const ow = sx * OCC, oh = sz * OCC;
    this.occA = new Float32Array(ow * oh); this.occB = new Float32Array(ow * oh); this.occBytes = new Uint8Array(ow * oh);
    if (this.occ) this.occ.dispose();
    this.occ = new THREE.DataTexture(this.occBytes, ow, oh, THREE.RedFormat, THREE.UnsignedByteType);
    this.occ.minFilter = this.occ.magFilter = THREE.LinearFilter; this.occ.needsUpdate = true;
    this.uOcc.value = this.occ; this.ow = ow; this.oh = oh;
    this.setWalls(null);
  }

  // strength(i) -> 0..1 for the wall at cell index i: how completely it stops lantern light (low hedges let some over).
  setWalls(strength) {
    const { w, h, wall } = this.level, a = this.occA, ow = this.ow, oh = this.oh;
    a.fill(0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!wall[i]) continue;
      const v = strength ? strength(i) : 1, px = (x + MARGIN) * OCC, py = (y + MARGIN) * OCC;
      for (let j = 0; j < OCC; j++) a.fill(v, (py + j) * ow + px, (py + j) * ow + px + OCC);
    }
    boxBlur(a, this.occB, ow, oh, 1, 1);
    const bytes = this.occBytes; for (let i = 0; i < bytes.length; i++) bytes[i] = Math.min(255, a[i] * 255);
    this.occ.needsUpdate = true;
  }

  _bakeStatic(level, sx, sz) {
    const S = STATIC, tw = sx * S, th = sz * S, { w, h, wall, floor } = level;
    const a = new Float32Array(tw * th), b = new Float32Array(tw * th), isle = new Float32Array(tw * th);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!wall[i] && !floor[i]) continue;
      const px = (x + MARGIN) * S, py = (y + MARGIN) * S;
      for (let j = 0; j < S; j++) isle.fill(1, (py + j) * tw + px, (py + j) * tw + px + S);
      if (!wall[i]) continue;
      // Only walls that touch garden floor cast occlusion; it keeps the outer rim clean.
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && floor[ny * w + nx]) { near = true; break; } }
      if (!near) continue;
      for (let j = 0; j < S; j++) a.fill(1, (py + j) * tw + px, (py + j) * tw + px + S);
    }
    // Occlusion: a soft falloff of about half a cell. Footprint: a wide blur, the mist pools along its slope.
    boxBlur(a, b, tw, th, 3, 2);
    boxBlur(isle, b, tw, th, Math.round(S * 0.9), 2);
    const bytes = new Uint8Array(tw * th * 2);
    for (let i = 0; i < tw * th; i++) { bytes[i * 2] = Math.min(255, a[i] * 255); bytes[i * 2 + 1] = Math.min(255, isle[i] * 255); }
    if (this.ao) this.ao.dispose();
    this.ao = new THREE.DataTexture(bytes, tw, th, THREE.RGFormat, THREE.UnsignedByteType);
    this.ao.minFilter = this.ao.magFilter = THREE.LinearFilter; this.ao.needsUpdate = true;
    G.uAoMap.value = this.ao;
  }

  begin() { this.count = 0; this.blockN = 0; }

  // shadow = true: the light is stopped by walls and throws shadows of lanterns and the moth.
  add(x, z, radius, r, g, b, shadow = false) {
    if (this.count >= MAX_LIGHTS) return;
    const i = this.count++, d = this.data, c = this.color;
    d[i * 4] = x; d[i * 4 + 1] = z; d[i * 4 + 2] = radius; d[i * 4 + 3] = shadow ? 1 : 0;
    c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
  }

  // A round thing standing on the floor (a lantern, the moth) that casts a shadow in lantern light.
  block(x, z, radius) { if (this.blockN < MAX_BLOCK && radius > 0.01) this.blocks[this.blockN++].set(x, z, radius); }

  render() {
    const r = this.renderer;
    this.geo.instanceCount = this.count; this.uBlockN.value = this.blockN;
    this.aData.needsUpdate = true; this.aColor.needsUpdate = true;
    const prevTarget = r.getRenderTarget(), prevAlpha = r.getClearAlpha();
    r.getClearColor(this._prevClear);
    r.setRenderTarget(this.target); r.setClearColor(this._clear, 1); r.clear(true, false, false);
    if (this.count > 0) r.render(this.scene, this.camera);
    r.setRenderTarget(prevTarget); r.setClearColor(this._prevClear, prevAlpha);
  }
}
