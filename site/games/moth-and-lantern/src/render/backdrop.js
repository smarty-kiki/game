// The world behind the garden: a moonlit sea of cloud that runs to a hazy horizon, with a low moon above it.
// Drawn in two steps: (1) the cloud sea, haze, sky glow and far islands into a small texture (it is soft anyway,
// and the garden materials read the same texture to dissolve into it below the floor); (2) a full-screen pass
// that stretches it and adds the crisp parts: the moon's disc and the stars.
// The cloud layers are anchored in the world (they turn and slide with the garden); the horizon and the moon
// stay put on screen, on the side the key light comes from, and tilt out of view as the camera looks straight down.
import * as THREE from 'three';
import { PALETTE, QUALITY } from '../config.js';
import { G, colorGLSL as C } from './materials.js';

const NOISE = /* glsl */`
float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bHash(i), bHash(i + vec2(1.0, 0.0)), f.x), mix(bHash(i + vec2(0.0, 1.0)), bHash(i + vec2(1.0, 1.0)), f.x), f.y); }
float bFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * bNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.0; a *= 0.5; } return s / 0.9375; }
float bFbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * bNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 17.0; a *= 0.5; } return s / 0.875; }
`;

const VERT = /* glsl */`varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;

const SEA_FRAG = /* glsl */`
varying vec2 vN;
uniform vec3 uCamPos; uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uFwd;
uniform float uTime; uniform float uWarm; uniform float uAspect; uniform float uHorizon; uniform float uIsleR; uniform float uYaw;
uniform vec2 uMoon; uniform vec2 uMoonXZ; uniform float uMoonR;
uniform sampler2D uLightMap; uniform sampler2D uAoMap; uniform vec4 uFieldRect;
${NOISE}
vec2 planeHit(float y) { vec3 o = uCamPos + uRight * vN.x + uUp * vN.y; float t = (o.y - y) / max(-uFwd.y, 0.05); return o.xz + uFwd.xz * t; }
// One far island on the horizon: a flat cap, hanging rock, a few trees. Returns coverage; x is in half-heights.
float farIsle(vec2 p, float s, float seed) {
  // Every edge is soft by about one texel of the small backdrop texture, so nothing turns into stairs when stretched.
  p /= s; float e = 0.03;
  float cap = smoothstep(e, -e, abs(p.y) - 0.025) * smoothstep(e, -e, abs(p.x) - 1.0);
  float w = 1.0 - smoothstep(0.0, 1.0, -p.y * 1.5); float jag = 0.12 * bNoise(vec2(p.x * 7.0 + seed, 1.0));
  float rock = smoothstep(e, -e, p.y) * smoothstep(-e, e, p.y + 0.62 + jag * 2.0) * smoothstep(e, -e, abs(p.x) - w * w * (0.95 - jag));
  float tx = fract(p.x * 2.6 + seed) - 0.5, th = 0.16 + 0.22 * bHash(vec2(floor(p.x * 2.6 + seed), seed));
  float tree = smoothstep(-e, e, p.y + 0.02) * smoothstep(e * 0.7, -e * 0.7, abs(tx) - 0.2 * (1.0 - p.y / th)) * step(p.y, th) * step(abs(p.x), 0.8) * step(0.35, bHash(vec2(floor(p.x * 2.6 + seed), seed + 3.0)));
  return max(max(cap, rock), tree);
}
void main() {
  float t = uTime;
  vec2 mo = vec2((vN.x - uMoon.x) * uAspect, vN.y - uMoon.y); float mr = length(mo);
  // How close to the horizon (0 far below it, 1 on it). The cloud sea is squeezed toward it like a real distance.
  float s = clamp((vN.y - (uHorizon - 1.25)) / 1.25, 0.0, 1.0);
  float squeeze = 1.0 / (1.0 - 0.9 * s * s);
  vec2 pa = planeHit(-13.0) * squeeze, pb = planeHit(-7.5) * squeeze, pc = planeHit(-4.4) * mix(1.0, squeeze, 0.6);
  // Light on the sea: brightest under the moon, fading away from it.
  float under = exp(-pow((vN.x - uMoon.x) * uAspect * 1.1, 2.0));
  float moonK = (0.45 + 0.55 * under) * (0.62 + 0.38 * s) + 0.5 * exp(-mr * mr * 1.4);
  // Deep layer: slow dark swells.
  float da = bFbm3(pa * 0.045 + vec2(t * 0.004, -t * 0.003));
  vec3 col = mix(vec3(${C(PALETTE.abyss)}), vec3(${C(PALETTE.cloudDark)}), smoothstep(0.25, 0.75, da));
  // Middle layer: cloud banks with their moon side lit.
  vec2 qb = pb * 0.085 + vec2(-t * 0.007, t * 0.004);
  float db = bFbm(qb), dbl = bFbm(qb + uMoonXZ * 0.22);
  float ab = smoothstep(0.44, 0.64, db), shb = clamp((db - dbl) * 4.5 + 0.42, 0.0, 1.0);
  vec3 cb = mix(vec3(${C(PALETTE.cloudDark)}), vec3(${C(PALETTE.cloudMid)}), shb) + vec3(${C(PALETTE.cloudLit)}) * pow(shb, 3.0) * 0.55 * moonK;
  col = mix(col, cb * (0.55 + 0.75 * moonK), ab);
  // Near layer: brighter wisps that drift faster.
  vec2 qc = pc * 0.15 + vec2(t * 0.012, t * 0.007);
  float dc = bFbm(qc), dcl = bFbm3(qc + uMoonXZ * 0.2);
  float ac = smoothstep(0.52, 0.76, dc) * 0.85, shc = clamp((dc - dcl) * 4.0 + 0.45, 0.0, 1.0);
  vec3 cc = mix(vec3(${C(PALETTE.cloudMid)}) * 0.8, vec3(${C(PALETTE.cloudLit)}), shc) + vec3(${C(PALETTE.cloudSilver)}) * pow(shc, 4.0) * 0.5 * moonK;
  col = mix(col, cc * (0.62 + 0.75 * moonK), ac);
  // The mist pooled under the garden: pale in moonlight, amber as the lanterns come on.
  vec2 pm = planeHit(-2.6);
  vec2 fuv = (pm - uFieldRect.xy) * uFieldRect.zw;
  float inField = step(0.0, fuv.x) * step(fuv.x, 1.0) * step(0.0, fuv.y) * step(fuv.y, 1.0);
  float isle = texture2D(uAoMap, clamp(fuv, 0.0, 1.0)).g * inField;
  float rr = length(pm) / (uIsleR + 3.5), pool = exp(-rr * rr * 1.6) * 0.8;
  float pn = bFbm(pm * 0.22 + vec2(t * 0.02, -t * 0.013)); pn = smoothstep(0.25, 0.8, pn);
  col += vec3(${C(PALETTE.mistPool)}) * pool * (0.035 + 0.2 * pn);
  col += vec3(${C(PALETTE.mistWarm)}) * pool * uWarm * (0.015 + 0.06 * pn);
  col += texture2D(uLightMap, clamp(fuv, 0.0, 1.0)).rgb * inField * vec3(0.5, 0.36, 0.3) * (0.05 + 0.12 * pn);
  // Haze toward the horizon, then the sky above it.
  vec3 hzc = vec3(${C(PALETTE.horizon)}) * (0.55 + 0.9 * under) + vec3(${C(PALETTE.mistWarm)}) * uWarm * 0.07;
  col = mix(col, hzc, pow(smoothstep(0.35, 1.0, s), 2.2));
  float up = max(vN.y - uHorizon, 0.0);
  vec3 sky = mix(hzc, vec3(${C(PALETTE.skyTop)}), 1.0 - exp(-up * 4.2));
  sky += vec3(${C(PALETTE.moonHalo)}) * (0.42 * exp(-mr * mr * 9.0) + 0.16 * exp(-mr * 2.6));
  // High thin cloud streaks, lit from behind near the moon.
  float streak = bFbm3(vec2(vN.x * uAspect * 1.3 + uYaw * 0.9 + t * 0.004, up * 9.0 + 3.0));
  sky += vec3(${C(PALETTE.cloudLit)}) * smoothstep(0.5, 0.85, streak) * (0.05 + 0.5 * exp(-mr * mr * 5.0)) * exp(-up * 2.5);
  sky = mix(sky, vec3(${C(PALETTE.moonDisc)}) * 1.3, 1.0 - smoothstep(uMoonR * 0.9, uMoonR * 1.05, mr));   // the disc again, soft: things that dissolve into the backdrop must not cut it out
  col = mix(col, sky, smoothstep(-0.012, 0.012, vN.y - uHorizon));
  // Far islands standing in the haze: other gardens, some already lit.
  float turn = uYaw * 0.6366;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), sx = 0.12 + 0.07 * bHash(vec2(fi, 7.0));
    float x = (fract(0.13 + fi * 0.27 + turn * (0.25 + 0.03 * fi)) * 2.0 - 1.0) * (uAspect + 0.5);
    vec2 ip = vec2(vN.x * uAspect - x, vN.y - uHorizon - 0.035 - 0.05 * bHash(vec2(fi, 3.0)) + 0.008 * sin(t * 0.3 + fi * 2.0));
    float cov = farIsle(ip, sx, fi * 13.7) * exp(-max(-ip.y, 0.0) * 13.0 / (sx * 5.0));
    vec3 ic = mix(vec3(${C(PALETTE.cloudDark)}), hzc, 0.42);
    col = mix(col, ic, cov * 0.9);
    vec2 lp = ip - vec2(sx * (0.3 - 0.6 * bHash(vec2(fi, 9.0))), sx * 0.07);
    col += vec3(${C(PALETTE.flame)}) * exp(-dot(lp, lp) / (sx * sx * 0.012)) * 0.55 * step(0.4, bHash(vec2(fi, 5.0))) * (0.8 + 0.2 * sin(t * 2.3 + fi * 5.0));
  }
  gl_FragColor = vec4(sqrt(max(col, 0.0)), 1.0);
}`;

const FINAL_FRAG = /* glsl */`
varying vec2 vN;
uniform sampler2D uTex; uniform float uTime; uniform float uAspect; uniform float uHorizon; uniform vec2 uMoon; uniform float uMoonR; uniform float uYaw;
${NOISE}
void main() {
  vec3 col = texture2D(uTex, vN * 0.5 + 0.5).rgb; col *= col;
  vec2 mo = vec2((vN.x - uMoon.x) * uAspect, vN.y - uMoon.y) / uMoonR; float r = length(mo);
  float up = vN.y - uHorizon;
  if (r < 1.2) {
    // The moon: a pale disc with soft seas, darker toward the limb, and a band of cloud drifting across its foot.
    float disc = 1.0 - smoothstep(0.97, 1.02, r);
    float seas = bFbm3(mo * 1.9 + 4.0) * 0.6 + bNoise(mo * 5.0 + 9.0) * 0.4;
    vec3 mc = vec3(${C(PALETTE.moonDisc)}) * (1.02 - 0.3 * smoothstep(0.42, 0.7, seas)) * (1.0 - 0.22 * r * r);
    float veil = smoothstep(0.35, 0.8, bFbm3(vec2(mo.x * 1.1 + uTime * 0.01, mo.y * 3.5 + 1.0))) * smoothstep(0.3, -0.9, mo.y);
    col = mix(col, mc * 1.5, disc * (1.0 - 0.72 * veil) * smoothstep(-0.02, 0.05, up));
  }
  if (up > 0.0) {
    // Stars, only in the open sky and not next to the moon.
    vec2 g = vec2(vN.x * uAspect + uYaw * 0.35, vN.y) * 46.0, gi = floor(g), gf = fract(g) - 0.5;
    float h = bHash(gi), on = step(0.9, h);
    vec2 o = (vec2(bHash(gi + 3.1), bHash(gi + 7.7)) - 0.5) * 0.7;
    float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
    float star = on * exp(-dot(gf - o, gf - o) * 260.0) * tw * (0.35 + 0.65 * bHash(gi + 1.3));
    col += vec3(0.75, 0.84, 1.0) * star * smoothstep(0.03, 0.3, up) * smoothstep(1.3, 3.2, r) * 0.8;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (bHash(gl_FragCoord.xy + fract(uTime) * 53.0) - 0.5) / 200.0;
}`;

export class Backdrop {
  constructor(renderer, touch = false) {
    this.renderer = renderer;
    this.scale = touch ? QUALITY.backdropScaleTouch : QUALITY.backdropScale;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.u = {
      uCamPos: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() }, uFwd: { value: new THREE.Vector3(0, -1, 0) },
      uTime: G.uTime, uWarm: G.uWarm, uAspect: { value: 1.6 }, uHorizon: { value: 0.6 }, uIsleR: { value: 5 }, uYaw: { value: 0 },
      uMoon: { value: new THREE.Vector2(-0.4, 0.75) }, uMoonXZ: { value: new THREE.Vector2(-0.8, 0.6) }, uMoonR: { value: 0.11 },
      uLightMap: G.uLightMap, uAoMap: G.uAoMap, uFieldRect: G.uFieldRect, uTex: { value: null },
    };
    const sea = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: SEA_FRAG, depthTest: false, depthWrite: false, toneMapped: false });
    this.seaScene = new THREE.Scene(); const sm = new THREE.Mesh(tri, sea); sm.frustumCulled = false; this.seaScene.add(sm);
    this.seaCam = new THREE.Camera();
    const fin = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VERT, fragmentShader: FINAL_FRAG, depthTest: false, depthWrite: false });
    this.mesh = new THREE.Mesh(tri, fin); this.mesh.frustumCulled = false; this.mesh.renderOrder = -1000;
    this.target = null; this.tw = 0; this.th = 0;
  }

  setLevel(level) { this.u.uIsleR.value = Math.hypot(level.w, level.h) / 2; }

  // bw, bh: drawing buffer size in pixels.
  resize(bw, bh) {
    const tw = Math.max(64, Math.round(bw * this.scale)), th = Math.max(64, Math.round(bh * this.scale));
    if (tw === this.tw && th === this.th) return;
    this.tw = tw; this.th = th;
    if (this.target) this.target.dispose();
    this.target = new THREE.WebGLRenderTarget(tw, th, { depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.target.texture.colorSpace = THREE.NoColorSpace;
    this.u.uTex.value = this.target.texture; G.uBackdrop.value = this.target.texture;
    G.uInvRes.value.set(1 / bw, 1 / bh);
  }

  // Reads the camera, places the horizon and the moon for this view, and draws the small cloud-sea texture.
  render(camera, moonDir, yaw) {
    const u = this.u, e = camera.matrixWorld.elements;
    const hw = (camera.right - camera.left) / 2, hh = (camera.top - camera.bottom) / 2, aspect = hw / hh;
    u.uCamPos.value.set(e[12], e[13], e[14]);
    u.uRight.value.set(e[0], e[1], e[2]).multiplyScalar(hw); u.uUp.value.set(e[4], e[5], e[6]).multiplyScalar(hh);
    u.uFwd.value.set(-e[8], -e[9], -e[10]);
    const elev = Math.asin(Math.min(1, Math.max(0, e[9]))) * 180 / Math.PI;
    const st = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const tall = st(1.15, 0.7, aspect);                       // 1 on a portrait screen
    const horizon = 0.5 + 0.16 * st(37, 50, elev) - 0.16 * tall + 2.6 * st(53, 84, elev);
    const moonR = 0.115 * Math.min(1, 0.55 + aspect * 0.5);
    u.uAspect.value = aspect; u.uHorizon.value = horizon; u.uYaw.value = yaw; u.uMoonR.value = moonR;
    // Left of centre, clear of the level title; further in on a very wide screen, where the move counter sits beside the title.
    u.uMoon.value.set(-0.44 + 0.2 * tall + 0.17 * st(1.85, 2.2, aspect), horizon + moonR + 0.035);
    u.uMoonXZ.value.set(moonDir.x, moonDir.z).normalize();
    const r = this.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(this.target); r.render(this.seaScene, this.seaCam); r.setRenderTarget(prev);
  }
}
