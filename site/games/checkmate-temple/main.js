import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { TempleAudio } from './audio.js';
import { ChessGame, sqPos, posSq } from './chessgame.js';
import { Voices } from './voice.js';

const $ = (id) => document.getElementById(id);
const sent = {}; function track(name) { if (sent[name]) return; sent[name] = 1; try { if (window.va) window.va('event', { name }); } catch (e) { } }
const params = new URLSearchParams(location.search);
const TOTAL_TIME = 28 * 60;
// the title lives in one place: game/site.json (then run `node apply-site.mjs` to refresh the static tags and the link-preview image)
const L = window.__L;                                   // the downloads were started by index.html
const SITE = await L.site;
const TITLE = SITE.title; document.title = TITLE; document.querySelector('#title h1').textContent = TITLE.toUpperCase();

// ---------------------------------------------------------------- shader patches (before any material compiles)
THREE.ShaderChunk.lights_fragment_maps = THREE.ShaderChunk.lights_fragment_maps
  .replace('iblIrradiance += getIBLIrradiance( geometryNormal );', '')
  + `
#if defined( USE_LIGHTMAP ) && defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  radiance *= mix( 0.10, 1.0, clamp( dot( lightMapIrradiance, vec3( 0.25 ) ), 0.0, 1.0 ) );
#endif
#ifdef USE_PIECE_AMB
  irradiance += uAmb;
#endif`;

const TOUCH = params.has('mobile') || (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);
// Phones get their own quality tier, chosen here and stepped down in play only as far as needed to hold about 30 frames a second (see "quality" in frame()).
const LOWMEM = TOUCH && navigator.deviceMemory && navigator.deviceMemory <= 2;
const Q = { mobile: TOUCH, pr: TOUCH ? Math.min(devicePixelRatio, LOWMEM ? 1 : 1.25) : Math.min(devicePixelRatio, 1.5), tier: 0, mirror: true, mirrorEvery: TOUCH ? 3 : 1, mirrorDiv: TOUCH ? 3 : 2, texCap: LOWMEM ? 512 : 1024 };
if (TOUCH) document.documentElement.classList.add('touch');
$('help').innerHTML = TOUCH ? '左拇指行走 &middot; 右侧拖动环视<br>轻点白棋抬起 &middot; 轻点方格放下<br>右上角的 &middot;&middot;&middot; 可重新开始'
  : 'WASD 行走 &middot; 鼠标环视 &middot; Shift 快走 &middot; E 阅读或按下<br>按住鼠标左键抬起白棋（它们很沉）；松手放下<br>连按两次 R 重新开始 &middot; M 静音 &middot; H 隐藏提示';
// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Q.pr);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = !Q.mobile; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x0b0907, 0.011);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.06, 140);
camera.rotation.order = 'YXZ';

const FLOAT_RT = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float') ? THREE.HalfFloatType : THREE.UnsignedByteType;      // a few phones cannot draw into float targets
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: FLOAT_RT, samples: Q.mobile ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.7, 1.0);
composer.addPass(bloom);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uVig: { value: 1 }, uDark: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT,uVig,uDark; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))+uT)*43758.5453); }
    void main(){ vec2 d=vUv-0.5; float r2=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse, vUv+d*r2*0.006).r; c.g=texture2D(tDiffuse, vUv).g; c.b=texture2D(tDiffuse, vUv-d*r2*0.006).b;
      c*=mix(1.0, smoothstep(0.85,0.12,r2*1.9), uVig);
      float l=dot(c,vec3(0.3,0.59,0.11)); c=mix(c, c*vec3(0.92,0.98,1.1), smoothstep(0.25,0.0,l)*0.6);     // cold shadows
      c+= (h(vUv*vec2(1920.0,1080.0))-0.5)*0.018*(0.4+l);
      c*=1.0-uDark;
      gl_FragColor=vec4(c,1.0); }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- loading
// Names, retries and the failure message live in index.html (window.__L). Here the bytes become models and textures.
// The loading screen itself (the rank of squares, the percentage, the lines) is in index.html so that it is up before this file arrives;
// it counts the bytes to 86 %, and stage() here reports the building of the scene after that.
const stage = (v) => { try { L.ui.stage(v); } catch (e) { } };
const gl = new GLTFLoader();
gl.setDRACOLoader(new DRACOLoader().setDecoderPath('./vendor/three/addons/libs/draco/gltf/'));
// On phones every picture is decoded straight to a small size (the full-size one is never kept), and the browser's copy is let go once the GPU has it.
async function picSize(blob) {          // width and height from the file header (WebP, PNG), without decoding
  try { const b = new DataView(await blob.slice(0, 32).arrayBuffer()); const tag = (o) => String.fromCharCode(b.getUint8(o), b.getUint8(o + 1), b.getUint8(o + 2), b.getUint8(o + 3));
    if (tag(0) === 'RIFF' && tag(8) === 'WEBP') { const c = tag(12);
      if (c === 'VP8X') return [1 + b.getUint8(24) + (b.getUint8(25) << 8) + (b.getUint8(26) << 16), 1 + b.getUint8(27) + (b.getUint8(28) << 8) + (b.getUint8(29) << 16)];
      if (c === 'VP8 ') return [b.getUint16(26, true) & 0x3fff, b.getUint16(28, true) & 0x3fff];
      if (c === 'VP8L') { const v = b.getUint32(21, true); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; } }
    if (b.getUint32(0) === 0x89504e47) return [b.getUint32(16), b.getUint32(20)];
  } catch (e) { } return null;
}
const rawBitmap = window.createImageBitmap ? window.createImageBitmap.bind(window) : null;
async function smallBitmap(src, opts, cap) {
  const o = { ...(opts || {}) };
  try { const sz = src instanceof Blob ? await picSize(src) : [src.width, src.height];
    if (sz && Math.max(sz[0], sz[1]) > cap) { const k = cap / Math.max(sz[0], sz[1]); return await rawBitmap(src, { ...o, resizeWidth: Math.max(1, Math.round(sz[0] * k)), resizeHeight: Math.max(1, Math.round(sz[1] * k)), resizeQuality: 'medium' }); } } catch (e) { }
  return rawBitmap(src, o);
}
if (Q.mobile && rawBitmap) window.createImageBitmap = (src, a, b) => (a && typeof a === 'object' && !(b !== undefined)) || a === undefined ? smallBitmap(src, a, Q.texCap) : rawBitmap(src, a, b);       // the model loader's pictures come through here
const letGo = (t) => { if (Q.mobile && t) { if (t.image) t.userData.size = [t.image.width, t.image.height]; t.onUpdate = function () { if (this.image && this.image.close) this.image.close(); this.onUpdate = null; }; } };
const toTex = async (blob) => { const im = await (Q.mobile ? smallBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }, Q.texCap) : createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })); const t = new THREE.Texture(im); t.needsUpdate = true; return t; };
const parseGLB = async (p) => gl.parseAsync(await (await p).arrayBuffer(), './assets/');
const [data, lmInfo, bin] = await Promise.all([L.data, L.lmInfo, L.bin, RAPIER.init()]);
performance.mark('json');
const ATL = L.atl;
const LM = {};
const loadLM = async (a, p) => { const t = await toTex(await p); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.channel = 1; t.anisotropy = 4; LM[a] = t; if (!Q.mobile) renderer.initTexture(t); return t; };
const [templeG, piecesG] = await Promise.all([parseGLB(bin.temple), parseGLB(bin.pieces), ...ATL.map(a => loadLM(a, bin['lm_' + a]))]);
performance.mark('lm'); stage(0.89);
const B = (p) => new THREE.Vector3(p[0], p[2], -p[1]);
if (Q.mobile) {          // phones: normal and roughness maps go down another step; nothing over the cap survives (older Safari decodes in the page, so check again here)
  const seen = new Set(), jobs = [];
  const fit = (t, max) => { const im = t && t.image; if (!im || !im.width || seen.has(t)) return; seen.add(t); if (Math.max(im.width, im.height) <= max) { letGo(t); return; }
    const k = max / Math.max(im.width, im.height), w = Math.round(im.width * k), h = Math.round(im.height * k);
    jobs.push((rawBitmap ? rawBitmap(im, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' }) : Promise.reject()).catch(() => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); return c; })
      .then((small) => { if (im.close) im.close(); t.image = small; t.needsUpdate = true; letGo(t); })); };
  for (const g of [templeG, piecesG]) g.scene.traverse(o => { if (o.isMesh) { const m = o.material; fit(m.normalMap, Q.texCap / 2); fit(m.roughnessMap, Q.texCap / 2); fit(m.metalnessMap, Q.texCap / 2); fit(m.map, Q.texCap); fit(m.emissiveMap, Q.texCap); } });
  await Promise.all(jobs);
}
// ---------------------------------------------------------------- world materials
const G = { light: 1, flick: 0, time: 0 };
const lmMats = []; const baseMats = {}; const boardMeshes = []; const dyn = {};
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const mirrorRT = new THREE.WebGLRenderTarget(innerWidth / Q.mirrorDiv, innerHeight / Q.mirrorDiv, { type: FLOAT_RT, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
const mirrorU = { tMirror: { value: mirrorRT.texture }, uMirrorVP: { value: new THREE.Matrix4() }, uMirrorK: { value: 1 } }; const mirrorMats = [];
function setMirror(on) { Q.mirror = on; mirrorU.uMirrorK.value = on ? 1 : 0; for (const m of mirrorMats) m.envMapIntensity = on ? 0 : 1.1; }
function mirrorPatch(m) {
  m.envMapIntensity = 0; mirrorMats.push(m);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mirrorU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform sampler2D tMirror; uniform mat4 uMirrorVP; uniform float uMirrorK;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec4 rc = uMirrorVP * vec4(vWPos, 1.0); vec2 ruv = rc.xy / rc.w * 0.5 + 0.5;
          float ndv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float fres = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);
          vec3 refl = textureLod(tMirror, ruv, roughnessFactor * 9.0).rgb;
          reflectedLight.indirectSpecular += refl * fres * (1.0 - roughnessFactor * 0.8) * 1.5 * uMirrorK; }`);
  };
  m.customProgramCacheKey = () => 'mirror';
}
const macroList = [];
function macroPatch(m, alt) {
  const u = { tAlt: { value: alt } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tAlt = u.tAlt;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <project_vertex>', '#include <project_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform sampler2D tAlt;
      float mh(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      float mn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(mh(i),mh(i+vec3(1,0,0)),f.x), mix(mh(i+vec3(0,1,0)),mh(i+vec3(1,1,0)),f.x), f.y), mix(mix(mh(i+vec3(0,0,1)),mh(i+vec3(1,0,1)),f.x), mix(mh(i+vec3(0,1,1)),mh(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      #ifdef USE_MAP
      { float n1 = mn(vWPos*0.5)*0.65 + mn(vWPos*1.3+9.0)*0.35;
        vec3 alt = texture2D(tAlt, vMapUv*0.83 + vec2(0.37,0.19)).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, alt * 0.9, smoothstep(0.42, 0.62, n1) * 0.42); }
      #endif`);
  };
  m.customProgramCacheKey = () => 'macro2';
}
const adopt = (root) => root.traverse(o => {
  if (!o.isMesh) return;
  let n = o, atlas = null, special = null;
  while (n) { const m = /^LM_(\w+?)(_\d+)?$/.exec(n.name); if (m && ATL.includes(m[1])) { atlas = m[1]; break; } if (/^(Door|Secret\d)/.test(n.name)) { special = n; break; } n = n.parent; }
  const src = o.material; if (!baseMats[src.name]) baseMats[src.name] = src;
  const m = o.material = src.clone(); m.name = src.name;
  for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[k]) m[k].anisotropy = maxAniso;
  const nm = m.name;
  m.envMapIntensity = /bronze|gold|iron/.test(nm) ? 1.3 : /marble/.test(nm) ? 1.0 : 0.3;
  if (/gold/.test(nm)) { m.roughness = 0.6; }
  if (atlas) { m.lightMap = LM[atlas]; lmMats.push(m); o.receiveShadow = atlas === 'board' || atlas === 'floor'; }
  if (atlas === 'board') { boardMeshes.push(o); if (/marble|bronze/.test(nm)) mirrorPatch(m); }
  else if (/^(wall_blocks|flagstone|rock|stone)$/.test(nm)) macroList.push(m);
  if (special) { dyn[special.name] = special; m.emissiveMap = m.map; m.emissive = new THREE.Color(0.34, 0.22, 0.12); m.emissiveIntensity = 1.0; m.envMapIntensity = 0.1; }
  if (/_decal$/.test(nm)) { m.transparent = true; m.depthWrite = false; m.polygonOffset = true; m.polygonOffsetFactor = -2; m.lightMap = null; m.color.multiplyScalar(1.0); o.renderOrder = 1; }
});
const macroAll = () => { const ALT = { wall_blocks: 'stone', stone: 'wall_blocks', rock: 'stone', flagstone: 'rock' }; for (const m of macroList.splice(0)) { const a = baseMats[ALT[m.name]]; if (a && a.map) macroPatch(m, a.map); } };
adopt(templeG.scene); macroAll();
scene.add(templeG.scene);
const LMI = lmInfo.max * Math.PI;

// ambient for moving pieces: read the board's baked light under them
const ambCanvas = document.createElement('canvas'); ambCanvas.width = ambCanvas.height = 128;
const actx = ambCanvas.getContext('2d', { willReadFrequently: true }); actx.drawImage(LM.board.image, 0, 0, 128, 128);
const ambPx = actx.getImageData(0, 0, 128, 128).data;
if (Q.mobile) for (const a of ATL) letGo(LM[a]);
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function sampleAmb(x, z, out) {
  const u = THREE.MathUtils.clamp((x + 6.7) / 13.4, 0.02, 0.98), v = THREE.MathUtils.clamp((-z + 6.7) / 13.4, 0.02, 0.98);
  const i = (Math.floor((1 - v) * 127) * 128 + Math.floor(u * 127)) * 4; const k = LMI * G.light * 2.4; const c0 = 0.05 * G.light;
  out.x += (s2l(ambPx[i]) * k + c0 * 1.2 - out.x) * 0.1; out.y += (s2l(ambPx[i + 1]) * k + c0 - out.y) * 0.1; out.z += (s2l(ambPx[i + 2]) * k + c0 * 0.9 - out.z) * 0.1;
}
// the same baked light, unscaled, for things that are placed once (chips, grit); the hall's light level is applied in the shader
G.lightU = { value: 1 };
function ambRaw(x, z, out) {
  const u = THREE.MathUtils.clamp((x + 6.7) / 13.4, 0.02, 0.98), v = THREE.MathUtils.clamp((-z + 6.7) / 13.4, 0.02, 0.98);
  const i = (Math.floor((1 - v) * 127) * 128 + Math.floor(u * 127)) * 4; const k = LMI * 2.4;
  out[0] = s2l(ambPx[i]) * k + 0.06; out[1] = s2l(ambPx[i + 1]) * k + 0.05; out[2] = s2l(ambPx[i + 2]) * k + 0.045;
}
function instMat(m, key) {            // lit by a per-instance ambient (iAmb.rgb); iAmb.a is opacity
  m.lightMap = null; m.defines = { ...(m.defines || {}), USE_PIECE_AMB: '' };
  m.onBeforeCompile = (sh) => { sh.uniforms.uLightK = G.lightU;
    sh.vertexShader = 'attribute vec4 iAmb; varying vec4 vAmb;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAmb = iAmb;');
    sh.fragmentShader = 'varying vec4 vAmb; uniform float uLightK;\n#define uAmb (vAmb.rgb * uLightK)\n' + sh.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAmb.a;'); };
  m.customProgramCacheKey = () => 'iamb' + key;
  return m;
}
function chipMat(color) { const m = (baseMats['rock'] || baseMats['stone']).clone(); m.map = null; m.normalMap = null; m.roughnessMap = null; m.metalnessMap = null; m.metalness = 0; m.color.set(color === 'w' ? 0xcbc5b6 : 0x1b1b1e); m.roughness = 0.82; m.envMapIntensity = 0.25; m.flatShading = true; return instMat(m, 'chip'); }
function gritMat() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const gs = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;                                    // roughly normal, -1..1
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 120); g.addColorStop(0, 'rgba(255,255,255,0.20)'); g.addColorStop(0.45, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const px = 128 + gs() * 92, py = 128 + gs() * 92, r = 0.35 + rnd() * rnd() * 1.6; x.fillStyle = 'rgba(255,255,255,' + (0.25 + rnd() * 0.6).toFixed(2) + ')'; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); }
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.3, r0 = 8 + rnd() * 50, l = 14 + rnd() * 40; x.strokeStyle = 'rgba(255,255,255,' + (0.05 + rnd() * 0.10).toFixed(2) + ')'; x.lineWidth = 0.6 + rnd() * 1.6; x.beginPath(); x.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); x.lineTo(128 + Math.cos(a) * (r0 + l), 128 + Math.sin(a) * (r0 + l)); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return instMat(new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 'grit');
}
function pieceMat(base, opts = {}) {
  const m = base.clone(); Object.assign(m, opts); m.lightMap = null; m.defines = { ...(m.defines || {}), USE_PIECE_AMB: '' };
  const amb = { value: new THREE.Vector3(0.3, 0.2, 0.12) };
  m.onBeforeCompile = (sh) => { sh.uniforms.uAmb = amb; sh.fragmentShader = 'uniform vec3 uAmb;\n' + sh.fragmentShader; };
  m.customProgramCacheKey = () => 'amb';
  return { m, amb };
}
function makePieceMats(color) {
  const a = pieceMat(baseMats[color === 'w' ? 'marble_white' : 'marble_black'], { envMapIntensity: 1.0 });
  const b = pieceMat(baseMats['rock'] || baseMats['stone'], { envMapIntensity: 0.1 });
  b.m.map = null; b.m.color.set(color === 'w' ? 0xb9b4a8 : 0x18181a); b.m.roughness = 0.95; b.m.roughnessMap = null;
  b.m.onBeforeCompile = (sh) => { sh.uniforms.uAmb = a.amb; sh.fragmentShader = 'uniform vec3 uAmb;\n' + sh.fragmentShader; };
  return { marble: a.m, brk: b.m, amb: a.amb };
}

performance.mark('mats'); stage(0.91);
// ---------------------------------------------------------------- flames
const FL = data.flames.map(f => ({ p: B(f.p), t: f.t }));
{
  const inst = []; const add = (p, w, h, kind) => inst.push({ p, w, h, kind, seed: Math.random() });
  for (const f of FL) {
    if (f.t === 'candle') add(f.p.clone().add(new THREE.Vector3(0, -0.036, 0)), 0.05, 0.12, 0);
    else if (f.t === 'lamp') add(f.p.clone().add(new THREE.Vector3(0, -0.06, 0)), 0.15, 0.32, 0.25);
    else { const s = f.t === 'bigbrazier' ? 1.25 : 1; for (let i = 0; i < 4; i++) add(f.p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.35 * s, -0.36 * s, (Math.random() - 0.5) * 0.35 * s)), (0.55 + Math.random() * 0.3) * s, (0.9 + Math.random() * 0.5) * s, 1); }
  }
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  g.instanceCount = inst.length;
  const ip = new Float32Array(inst.length * 3), is = new Float32Array(inst.length * 2), ie = new Float32Array(inst.length), ik = new Float32Array(inst.length);
  inst.forEach((f, i) => { ip.set([f.p.x, f.p.y, f.p.z], i * 3); is.set([f.w, f.h], i * 2); ie[i] = f.seed; ik[i] = f.kind; });
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(ip, 3)); g.setAttribute('iSize', new THREE.InstancedBufferAttribute(is, 2));
  g.setAttribute('iSeed', new THREE.InstancedBufferAttribute(ie, 1)); g.setAttribute('iKind', new THREE.InstancedBufferAttribute(ik, 1));
  G.flameMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uGutter: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 iPos; attribute vec2 iSize; attribute float iSeed, iKind; varying vec2 vUv; varying float vSeed, vKind;
      void main(){ vUv=uv; vSeed=iSeed; vKind=iKind; vec3 tc=cameraPosition-iPos; tc.y=0.0; tc=normalize(tc); vec3 right=vec3(tc.z,0.0,-tc.x);
        vec3 p=iPos+right*(position.x*iSize.x)+vec3(0.0,(position.y+0.5)*iSize.y,0.0); gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform float uT, uGutter; varying vec2 vUv; varying float vSeed, vKind;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){ float t=uT+vSeed*17.0; float y=vUv.y;
        float n=noise(vec2(vUv.x*3.0+vSeed*9.0, y*mix(2.0,3.5,vKind)-t*mix(2.2,3.4,vKind))); float n2=noise(vec2(vUv.x*7.0+vSeed, y*6.0-t*5.0));
        float x=(vUv.x-0.5)*2.0; x+=(n-0.5)*mix(0.35,1.3,vKind)*y*0.9+sin(t*6.0)*0.06*y*(1.0-vKind);
        float hgt=1.0-uGutter*(0.25+0.3*noise(vec2(t*2.0,vSeed*5.0))); float yy=y/hgt;
        float w=(1.0-pow(clamp(yy,0.0,1.0), mix(1.4,0.9,vKind)))*mix(0.55,0.8,vKind)*smoothstep(0.0,0.15,yy);
        w*=mix(1.0, 0.7+0.6*n2, vKind);
        float d=abs(x)/max(w,0.001); float a=smoothstep(1.0,0.35,d)*step(yy,1.0);
        float core=smoothstep(0.75,0.0,d)*(1.0-yy*0.7);
        vec3 col=mix(vec3(1.0,0.30,0.035), vec3(1.0,0.78,0.40), core);
        col=mix(col, vec3(0.2,0.3,1.0), smoothstep(0.2,0.0,yy)*0.5*(1.0-vKind));
        float I=mix(6.0,3.4,vKind)*(0.85+0.3*noise(vec2(t*3.0,vSeed)));
        gl_FragColor=vec4(col*a*I,1.0); }`,
  });
  const mesh = new THREE.Mesh(g, G.flameMat); mesh.frustumCulled = false; mesh.renderOrder = 5; scene.add(mesh);
}
// a few real lights so fire flickers on stone and glints on marble and bronze
const fireLights = [];
for (const f of FL) {
  if (f.t === 'candle' || (Q.mobile && f.t === 'lamp')) continue;
  const big = f.t !== 'lamp';
  const l = new THREE.PointLight(0xff8a3c, 0, big ? 16 : 7, 2); l.position.copy(f.p); l.userData = { base: big ? 5.0 : 0.7, seed: Math.random() * 100 };
  scene.add(l); fireLights.push(l);
}
if (!Q.mobile) { const gp = B(data.grate); const l = new THREE.PointLight(0xff8a3c, 0, 2.2, 2); l.position.set(gp.x, gp.y, gp.z - 0.25); l.userData = { base: 0.35, seed: 7 }; scene.add(l); fireLights.push(l); }
// light inside the hidden passage, behind each panel: it comes up as the panel goes down, so the opened doorway is lit from within
const loopLight = new THREE.PointLight(0xffb070, 0, 9, 1.6); loopLight.position.set(17.7, 1.5, -4.9); loopLight.userData = { base: 3.2, k: 0, seed: 3 }; scene.add(loopLight);
const loopLight2 = new THREE.PointLight(0xffb070, 0, 8, 1.6); loopLight2.position.set(11.9, 1.5, -10.1); loopLight2.userData = { base: 2.6, k: 0, seed: 11 }; if (!Q.mobile) scene.add(loopLight2);
const firePos = FL.filter(f => f.t === 'brazier' || f.t === 'bigbrazier').map(f => [f.p.x, f.p.y, f.p.z]);

// cold light from the well over the board, with real shadows from the pieces
// THE FALL OF LIGHT OVER THE BOARD, in one place. top: the middle of the opening in the vault. foot: the middle of where it lands on the
// floor. topHalf / footHalf: half-widths (x, z) of the light at those two heights (where it has thinned to about a fifth). a: how dense
// the lit dust looks. The haze in the air, the two real-time lights and their shadows, and the motes all follow these numbers.
// Numbers from the world lane (handoff, 2026-11-10): three openings side by side in the vault crown, x -2.2..2.2, z -6..6, ribs across at
// z = -2 and +2, light straight down; on the floor full strength to about x 2.5, half at the board's edge, gone by the columns.
// hazeFoot: the visible dust is drawn narrower than the light on the floor, so the room's corners stay clear. ribs: z of the vault ribs (faint gaps in the haze under them).
const FALL = { top: new THREE.Vector3(0, 12.85, 0), foot: new THREE.Vector3(0, 0, 0), topHalf: [2.3, 5.6], footHalf: [6.6, 6.6], hazeFoot: [4.6, 8.0], ribs: [-2, 2], a: 0.0085 };
FALL.lamp = FALL.foot.clone().add(FALL.top.clone().sub(FALL.foot).multiplyScalar(21 / (FALL.top.y - FALL.foot.y)));       // the lights sit on the same line, 21 m up
FALL.reach = Math.hypot(FALL.footHalf[0], FALL.footHalf[1]) * 1.05;                                                       // floor radius the lights must cover (the board's corners)
const well = new THREE.SpotLight(0x9fc2ff, 0.55, 0, Math.max(0.44, Math.atan(FALL.reach * 1.15 / 21)), 0.9, 0); well.position.copy(FALL.lamp); well.target.position.copy(FALL.foot);
well.castShadow = !Q.mobile; well.shadow.mapSize.set(2048, 2048); well.shadow.camera.near = 6; well.shadow.camera.far = 24; well.shadow.bias = -0.0004; well.shadow.normalBias = 0.035; well.shadow.radius = 5;
// (was a 0.085 rad pencil of light at strength 5 on the middle four squares; now it spans the board, softer and wider-edged)
const core = new THREE.SpotLight(0x9fc2ff, 1.9, 0, Math.atan(FALL.reach / 21), 0.75, 0); core.position.copy(FALL.lamp); core.target.position.copy(FALL.foot);
core.castShadow = !Q.mobile; core.shadow.mapSize.set(2048, 2048); core.shadow.camera.near = 6; core.shadow.camera.far = 24; core.shadow.bias = -0.0004; core.shadow.normalBias = 0.02; core.shadow.radius = 3;      // normalBias: no hairline stripes on faces the light only grazes (the base of a piece lying down)
scene.add(well, well.target, core, core.target);
well.shadow.autoUpdate = core.shadow.autoUpdate = false;         // shadows are redrawn only while something on the board moves (see frame())

// ---------------------------------------------------------------- shafts of dusty light
// A beam is drawn as a volume: for each pixel the ray is walked through the box and the dusty light is added up, densest on the axis and
// falling to nothing at the sides, so it has no faces and no edges from any angle.
const shaftMat = (o) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uA: { value: o.a }, uC: { value: o.c }, uH: { value: o.h }, uRound: { value: o.fall ? 1 : 0 },
    uTop: { value: o.fall ? o.fall.top : new THREE.Vector3() }, uFoot: { value: o.fall ? o.fall.foot : new THREE.Vector3() }, uS: { value: o.fall ? new THREE.Vector4(...o.fall.topHalf, ...o.fall.hazeFoot) : new THREE.Vector4(1, 1, 1, 1) }, uRib: { value: new THREE.Vector2(...(o.fall ? o.fall.ribs : [99, 99])) } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  vertexShader: 'varying vec3 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `uniform float uT,uA,uRound; uniform vec3 uC,uH,uTop,uFoot; uniform vec4 uS; uniform vec2 uRib; varying vec3 vP;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
    // No edge anywhere: the light thins out like a bell curve from the axis, the beam widens a little on its way down, its axis and its
    // width wander slowly with height, and slow dust drifts through it, so no side is a straight line from any angle.
    float dens(vec3 p){ vec3 q=(p-uC)/uH; float h=q.y*0.5+0.5, rr;
      vec2 wob=vec2(noise(vec2(p.y*0.19-uT*0.013, 3.7)), noise(vec2(p.y*0.23+uT*0.011, 9.1)))-0.5;
      vec2 d;
      if(uRound>0.5){            // the broad fall over the board: a rounded square of light spreading from the opening to its footprint, in faint rays, thin enough to see through
        float hh=clamp((p.y-uFoot.y)/(uTop.y-uFoot.y),0.0,1.0); d=(p.xz-mix(uFoot.xz,uTop.xz,hh)+wob*1.1)/mix(uS.zw,uS.xy,hh);
        float e=noise(vec2(d.x*1.1+d.y*0.8+p.y*0.21, p.y*0.13-uT*0.02))-0.5;
        float r2=sqrt(d.x*d.x*d.x*d.x+d.y*d.y*d.y*d.y)*(1.0+0.9*e);
        float side=exp(-1.6*r2)*smoothstep(1.0,0.55,max(abs(q.x),abs(q.z)));
        float ray=noise(d*2.3+vec2(uT*0.012,3.1))*0.7+noise(d*5.1-vec2(1.7,uT*0.016))*0.3;                 // constant along the light's own lines, so the streaks fan out from the opening
        float n=noise(vec2(p.x*0.45+p.z*0.4+uT*0.03, p.y*0.22-uT*0.04)), n2=noise(vec2(p.x*1.6-p.z*1.2+uT*0.05, p.y*0.7+p.z*0.8+uT*0.1));
        vec2 rb=(p.z-mix(uFoot.z,uTop.z,hh)-uRib)/(0.42+0.9*(1.0-hh)); side*=1.0-0.92*mix(0.3,1.0,hh)*min(1.0,exp(-rb.x*rb.x)+exp(-rb.y*rb.y));          // three falls of light, one from each opening: the ribs' shadows part them, deep under the vault and softer toward the floor
        return side*(0.12+1.7*ray*ray)*(0.55+0.6*n+0.3*n2)*(1.0+0.5*hh*hh)*(smoothstep(0.0,1.5,p.y)*0.6+0.4)*smoothstep(1.0,0.86,q.y); }
      d=(vec2(q.x*uH.x, q.z*uH.z)+wob*vec2(0.9,0.3))/(vec2(uH.x,uH.z)*0.64*mix(1.0,0.74,h));
      float e=noise(vec2(d.x*1.1+d.y*0.8+p.y*0.31, p.y*0.17-uT*0.02))-0.5;            // the width breathes: wisps reach out, hollows reach in
      rr=dot(d,d)*(1.0+1.1*e);
      float side=exp(-1.9*rr)*smoothstep(1.0,0.55,max(abs(q.x),abs(q.z)));
      float n=noise(vec2(p.x*0.6+p.z*0.5+uT*0.03, p.y*0.25-uT*0.05));
      float n2=noise(vec2(p.x*1.9-p.z*1.3+uT*0.05, p.y*0.8+p.z*0.9+uT*0.11));         // finer dust, sinking slowly
      return side*(0.42+0.85*n+0.42*n2)*(smoothstep(0.0,1.5,p.y)*0.6+0.4)*smoothstep(1.0,0.8,q.y); }
    void main(){ vec3 ro=cameraPosition, rd=normalize(vP-cameraPosition)+vec3(1e-5);
      vec3 t0=(uC-uH-ro)/rd, t1=(uC+uH-ro)/rd, tmn=min(t0,t1), tmx=max(t0,t1);
      float tn=max(max(tmn.x,tmn.y),max(tmn.z,0.0)), tf=min(tmx.x,min(tmx.y,tmx.z));
      if(tf<=tn) discard;
      float j=hash(gl_FragCoord.xy+fract(uT)*17.0), st=(tf-tn)/12.0, acc=0.0;
      for(int i=0;i<12;i++) acc+=dens(ro+rd*(tn+(float(i)+j)*st));
      gl_FragColor=vec4(vec3(0.55,0.72,1.0)*acc*st*uA,1.0); }`,
});
const shafts = [];
{ const lean = FALL.top.clone().sub(FALL.foot), k = 1.5;       // the box the fall is drawn in: wide enough for the footprint's soft edge to reach nothing before the faces
  FALL.c = FALL.foot.clone().addScaledVector(lean, 0.5); FALL.h = new THREE.Vector3(k * Math.max(FALL.hazeFoot[0], FALL.topHalf[0]) + Math.abs(lean.x) / 2, lean.y / 2, k * Math.max(FALL.hazeFoot[1], FALL.topHalf[1]) + Math.abs(lean.z) / 2); }
for (const o of [{ c: FALL.c, h: FALL.h, a: FALL.a, fall: FALL }, { c: new THREE.Vector3(0, 13, -23.3), h: new THREE.Vector3(4.3, 12, 1.4), a: 0.036 }]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(o.h.x * 2, o.h.y * 2, o.h.z * 2), shaftMat(o)); m.position.copy(o.c); m.userData = o; m.renderOrder = 0.5; scene.add(m); shafts.push(m); }       // before the decals (order 1): lettering seen through a beam (D . V from the entrance) stays crisp and dark
// dust motes
const dustMat = new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec4 aSeed; attribute vec3 aBox; uniform float uT; varying float vA;
    void main(){ vec3 p=position; float t=uT*(0.3+aSeed.x*0.5);
      p.y=mod(p.y - t*0.06 + aSeed.y*aBox.y, aBox.y); p.x+=sin(t*0.4+aSeed.z*6.28)*0.25; p.z+=cos(t*0.33+aSeed.w*6.28)*0.25;
      vec4 mv=viewMatrix*modelMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=(1.5+aSeed.x*2.5)*(300.0/-mv.z)*0.012*60.0/ max(1.0,-mv.z*0.0+1.0)*0.02*50.0/50.0;
      gl_PointSize=clamp((1.0+aSeed.x*2.0)*9.0/(-mv.z),1.0,6.0);
      vA=(0.4+0.6*sin(t*2.0+aSeed.z*20.0))*smoothstep(0.3,2.0,-mv.z); }`,
  fragmentShader: 'varying float vA; void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vec3(0.6,0.75,1.0)*smoothstep(0.5,0.1,d)*vA*0.5,1.0); }',
});
function motes(n, cx, cz, sx, sy, sz, round) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4), box = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x, z; do { x = (Math.random() - 0.5) * sx; z = (Math.random() - 0.5) * sz; } while (round && (x * x) / (sx * sx / 4) + (z * z) / (sz * sz / 4) > 1);
    pos.set([cx + x, Math.random() * sy, cz + z], i * 3); seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4); box.set([sx, sy, sz], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); g.setAttribute('aBox', new THREE.BufferAttribute(box, 3));
  const p = new THREE.Points(g, dustMat); p.frustumCulled = false; scene.add(p);
}
motes(Q.mobile ? 420 : 900, FALL.foot.x, FALL.foot.z, FALL.hazeFoot[0] * 2.4, FALL.top.y, FALL.hazeFoot[1] * 2.1, true); motes(520, 0, -23.3, 8.4, 20, 2.6, false);

// ---------------------------------------------------------------- particles: stone dust, and grit that falls. No sparks.
class Particles {
  constructor(n, hard) {
    this.n = n; this.i = 0; this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n); this.vel = []; this.life = new Float32Array(n); this.max = new Float32Array(n); this.a0 = new Float32Array(n); this.hard = hard;
    for (let i = 0; i < n; i++) this.vel.push(new THREE.Vector3());
    const g = this.g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      vertexShader: 'attribute vec4 aCol; attribute float aSize; varying vec4 vC; void main(){ vC=aCol; vec4 mv=viewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=' + (hard ? 'max(1.0, aSize*700.0/max(0.3,-mv.z))' : 'min(aSize*700.0/max(0.3,-mv.z), 420.0)') + '; }',
      fragmentShader: 'varying vec4 vC; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,' + (hard ? '0.3' : '0.0') + ',d); gl_FragColor=vec4(vC.rgb, vC.a*a); }' });
    this.mesh = new THREE.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh);
  }
  emit(p, v, size, life, c) { const i = this.i = (this.i + 1) % this.n; this.pos.set([p.x, p.y, p.z], i * 3); this.vel[i].copy(v); this.size[i] = size; this.life[i] = this.max[i] = life; this.col.set(c, i * 4); this.a0[i] = c[3]; }
  update(dt) {
    let live = false;
    for (let i = 0; i < this.n; i++) { if (this.life[i] <= 0) { this.col[i * 4 + 3] = 0; continue; } live = true;
      this.life[i] -= dt; const v = this.vel[i]; const k = Math.max(this.life[i] / this.max[i], 0);
      if (this.hard) { v.y -= 9.8 * dt; if (this.pos[i * 3 + 1] < 0.012 && v.y < 0) { this.pos[i * 3 + 1] = 0.012; v.y *= -0.25; v.x *= 0.45; v.z *= 0.45; if (v.y < 0.4) v.set(0, 0, 0); } this.col[i * 4 + 3] = this.a0[i] * G.light * Math.min(1, k * 4); }
      else { v.y += 0.25 * dt; v.multiplyScalar(1 - 1.6 * dt); this.size[i] += dt * 0.25; this.col[i * 4 + 3] = Math.min(1, k * 2.5) * 0.38 * Math.min(1, (1 - k) * 12); }
      this.pos[i * 3] += v.x * dt; this.pos[i * 3 + 1] += v.y * dt; this.pos[i * 3 + 2] += v.z * dt; }
    if (live || this.was) for (const a of ['position', 'aCol', 'aSize']) this.g.attributes[a].needsUpdate = true; this.was = live;
  }
}
const dustP = new Particles(420, false), gritP = new Particles(Q.mobile ? 300 : 900, true);
const player = { x: 0, z: 16.1, y: 1.66, vy: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, bobA: 0, shake: 0, step: 0 };
const fx = {
  dust(p, n, s, spread = 1) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = (0.3 + Math.random() * 1.4) * s * spread; dustP.emit(p, new THREE.Vector3(Math.cos(a) * sp, (0.2 + Math.random() * 0.9 * s) / spread, Math.sin(a) * sp), (0.25 + Math.random() * 0.45) * s, 1.8 + Math.random() * 2.2, [0.36, 0.33, 0.30, 0.3]); } },
  // specks of broken stone thrown out and dropping to the floor
  grit(p, n, r, color, dir) { const c = color === 'w' ? [0.40, 0.38, 0.34] : color === 'b' ? [0.045, 0.045, 0.05] : [0.2, 0.18, 0.16];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 0.4 + Math.random() * 3.6, k = 0.7 + Math.random() * 0.6;
      gritP.emit({ x: p.x + Math.cos(a) * r * Math.random(), y: p.y * (0.2 + Math.random() * 1.5), z: p.z + Math.sin(a) * r * Math.random() }, new THREE.Vector3(Math.cos(a) * sp + (dir ? dir.x : 0) * 1.5, 0.5 + Math.random() * 3.2, Math.sin(a) * sp + (dir ? dir.z : 0) * 1.5), 0.004 + Math.random() * Math.random() * 0.012, 2.5 + Math.random() * 3.5, [c[0] * k, c[1] * k, c[2] * k, 0.95]); } },
  // dust shaken out of a seam (a line from a to b)
  seam(a, b, n, s = 0.3) { for (let i = 0; i < n; i++) { const k = Math.random(); dustP.emit({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }, new THREE.Vector3((Math.random() - 0.5) * 0.25, -0.15 - Math.random() * 0.5, (Math.random() - 0.5) * 0.25), (0.03 + Math.random() * 0.06) * s / 0.3, 1.4 + Math.random() * 1.6, [0.07 * G.light, 0.056 * G.light, 0.042 * G.light, 0.3]);
      if (Math.random() < 0.7) gritP.emit({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }, new THREE.Vector3((Math.random() - 0.5) * 0.3, -Math.random(), (Math.random() - 0.5) * 0.3), 0.004 + Math.random() * 0.007, 2 + Math.random() * 2, [0.2, 0.18, 0.16, 0.9]); } },
  shake(a, p) { const d = Math.hypot(p.x - player.x, p.z - player.z); player.shake = Math.max(player.shake, a * 6 / (1 + d * d * 0.12)); },
};

// ---------------------------------------------------------------- the unseen player's move, made visible
// When black moves, the piece is wrapped in cold pale light for the whole move: its stone glows, a halo hangs round it, a cold lamp
// travels with it (lighting the marble, its neighbours and, faintly, the hall), pale dust is drawn up under it, the light over the
// board swells and the fires gutter. The square it stands on glows first, as a tell; the square it lands on stays lit for some
// seconds, the one it left more faintly. Warm is yours; cold is its. Three strengths to tune:
const UNSEEN_GLOW = 1.0;          // the piece's own glow and halo
const UNSEEN_LIGHT = 1.0;         // the lamp that travels with it, and the swell of the light over the board
const UNSEEN_MARK = 1.0;          // the glow left in the marble of the two squares
const unseenFx = (() => {
  const COLD = new THREE.Color(0.55, 0.72, 1.0), act = new Map(), marks = [], halos = [], lamps = [];
  const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 64; { const c = cv2.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  const haloTex = new THREE.CanvasTexture(cv2);
  for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: COLD, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.visible = false; s.renderOrder = 5; scene.add(s); halos.push(s);
    if (!Q.mobile) { const l = new THREE.PointLight(0x9fc2ff, 0, 34, 1.2); scene.add(l); lamps.push(l); } }           // phones: no extra lamp (glow, halo and squares only)
  const markGeo = new THREE.PlaneGeometry(1.5, 1.5);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(markGeo, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uT: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform float uA,uT; varying vec2 vUv; void main(){ vec2 c=abs(vUv-0.5)*2.0; float e=max(c.x,c.y), rim=smoothstep(0.5,0.97,e)*smoothstep(1.0,0.94,e), body=0.3*(1.0-0.55*dot(c,c));
      float sh=0.86+0.14*sin(uT*1.3+vUv.x*4.0+vUv.y*2.7); gl_FragColor=vec4(vec3(0.55,0.72,1.0)*(rim+body)*uA*sh,1.0); }` }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 2; m.userData = { amp: 0, mode: '', gain: 1, tau: 1 }; scene.add(m); marks.push(m); }
  const mark = (x, z, gain, mode, tau) => { let m = marks.find(q => !q.visible) || marks.reduce((a, b) => (a.userData.amp < b.userData.amp ? a : b)); m.position.set(x, 0.009, z); m.visible = true; Object.assign(m.userData, { amp: mode === 'rise' ? 0.02 : 1, mode, gain, tau }); return m; };
  const glow = (p, v) => { for (const m of [p.mats.marble, p.mats.brk]) { m.emissive.copy(COLD).multiplyScalar(v); } };
  const api = { amb: 0, gut: 0, act,
    on(phase, p, w) {
      let e = act.get(p); if (!e) { const used = [...act.values()].map(a => a.slot); const slot = [0, 1].find(i => !used.includes(i)); act.set(p, e = { p, w, k: 0, pulse: 0, landed: false, slot: slot === undefined ? -1 : slot, seed: Math.random() * 50, tr: 0, origin: null }); }
      e.w = w; e.landed = false;
      if (phase === 'tell') e.origin = mark(w.p0.x, w.p0.z, 0.6, 'rise', w.pre);
      else if (phase === 'lift') { if (!e.origin) e.origin = mark(w.p0.x, w.p0.z, 0.4, 'fade', 1.4); else Object.assign(e.origin.userData, { mode: 'fade', tau: 1.5 }); }
      else if (phase === 'strike') e.pulse = 1;
      else if (phase === 'land') { e.landed = true; e.origin = null; mark(w.p1.x, w.p1.z, 1, 'fade', 2.4); }
    },
    step(dt, t) {
      let amb = 0, gut = 0;
      for (const e of act.values()) { const p = e.p, w = e.w, tell = !e.landed && w.pre > 0;
        const aim = e.landed || p.dead ? 0 : tell ? 0.55 : 1; e.k += (aim - e.k) * Math.min(1, dt * (e.landed ? 1.5 : tell ? 2.2 : 4)); e.pulse *= Math.exp(-dt * 2.6);
        const swell = !e.landed && w.capture ? 0.6 * w.u * w.u : 0, I = e.k * (1 + swell + 0.8 * e.pulse) * (0.84 + 0.16 * noise1(t * 4.1 + e.seed));          // a capture: the light swells toward the strike
        const pos = p.mesh.position; glow(p, I * UNSEEN_GLOW * (p.color === 'b' ? 0.2 : 0.11));
        if (e.slot >= 0) { const h = halos[e.slot]; h.visible = true; h.position.set(pos.x, pos.y + p.h * 0.55, pos.z); h.scale.setScalar(p.h * 2.6 + 0.5); h.material.opacity = Math.min(1, I * 0.3 * UNSEEN_GLOW);
          const l = lamps[e.slot]; if (l) { l.position.set(pos.x, pos.y + p.h + 0.9, pos.z); l.intensity = I * 11 * UNSEEN_LIGHT; } }
        if (!e.landed && !tell && (e.tr -= dt) < 0) { e.tr = 0.045; const a = Math.random() * 6.28, r = p.r * (0.3 + Math.random() * 0.8);            // dust drawn up under it
          dustP.emit({ x: pos.x + Math.cos(a) * r, y: 0.03, z: pos.z + Math.sin(a) * r }, new THREE.Vector3(-Math.cos(a) * 0.08, 0.25 + Math.random() * 0.5, -Math.sin(a) * 0.08), 0.05 + Math.random() * 0.08, 1.2 + Math.random() * 1.2, [0.55, 0.64, 0.8, 0.2]); }
        amb = Math.max(amb, I); if (!e.landed && (tell || w.u < 0.35)) gut = 1;
        if ((e.landed || p.dead) && e.k < 0.015) { glow(p, 0); if (e.slot >= 0) { halos[e.slot].visible = false; if (lamps[e.slot]) lamps[e.slot].intensity = 0; } act.delete(p); } }
      api.amb = amb; api.gut += (gut - api.gut) * Math.min(1, dt * (gut ? 5 : 1.6));
      for (const m of marks) { if (!m.visible) continue; const u = m.userData;
        if (u.mode === 'rise') u.amp = Math.min(1, u.amp + dt / Math.max(0.2, u.tau)); else { u.amp *= Math.exp(-dt / u.tau); if (u.amp < 0.012) { m.visible = false; continue; } }
        m.material.uniforms.uA.value = u.amp * u.gain * UNSEEN_MARK; m.material.uniforms.uT.value = t; }
    } };
  return api;
})();
fx.unseen = (phase, p, w) => unseenFx.on(phase, p, w);

// ---------------------------------------------------------------- the hourglass
const S = { timeLeft: params.has('time') ? +params.get('time') : TOTAL_TIME, paused: params.has('pause'), started: false, secretOpen: false, secret2: false, exitOpen: false, ended: null, exitKind: null, loopSeen: false };
const HG = new THREE.Group(); HG.position.set(3.5, 0.96, -11.75); scene.add(HG);
{
  const bz = baseMats['bronze'].clone(); bz.lightMap = null; bz.envMapIntensity = 1.4; bz.emissive = new THREE.Color(0x120a04);
  const disc = new THREE.CylinderGeometry(0.66, 0.7, 0.13, 40);
  const d0 = new THREE.Mesh(disc, bz); d0.position.y = 0.065; const d1 = new THREE.Mesh(disc, bz); d1.position.y = 2.6 - 0.065; d1.rotation.x = Math.PI; HG.add(d0, d1);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.36, 10), bz); p.position.set(Math.cos(a) * 0.58, 1.3, Math.sin(a) * 0.58); HG.add(p);
    for (const yy of [0.5, 1.3, 2.1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), bz); k.position.set(Math.cos(a) * 0.58, yy, Math.sin(a) * 0.58); k.scale.y = 0.7; HG.add(k); } }
  const R = (y) => { const a = Math.abs(y); return a < 0.8 ? 0.03 + 0.47 * Math.pow(Math.sin(Math.PI / 2 * a / 0.8), 1.15) : a < 1.0 ? 0.5 : 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((a - 1.0) / 0.17, 2))) * 0.6 + 0.2; };
  G.hgR = R;
  const prof = (y0, y1, k) => { const pts = []; for (let i = 0; i <= 40; i++) { const y = y0 + (y1 - y0) * i / 40; pts.push(new THREE.Vector2(R(y) * k, y)); } return pts; };
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof(-1.17, 1.17, 1), 48), new THREE.MeshStandardMaterial({ color: 0xaec4cc, transparent: true, opacity: 0.2, roughness: 0.06, metalness: 0.0, envMapIntensity: 3.0, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 1.3; glass.renderOrder = 4; HG.add(glass);
  const sandM = (plane) => new THREE.MeshStandardMaterial({ color: 0xc9a468, roughness: 1, emissive: 0x2a1c0c, side: THREE.DoubleSide, clippingPlanes: [plane] });
  G.hgTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); G.hgBot = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const up = new THREE.Mesh(new THREE.LatheGeometry(prof(0.0, 1.17, 0.95), 40), sandM(G.hgTop)); up.position.y = 1.3;
  const lo = new THREE.Mesh(new THREE.LatheGeometry(prof(-1.17, 0.0, 0.95), 40), sandM(G.hgBot)); lo.position.y = 1.3; HG.add(up, lo);
  const capM = new THREE.MeshStandardMaterial({ color: 0xc9a468, roughness: 1, emissive: 0x2a1c0c });
  G.hgCapT = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32, 1, true), capM); G.hgCapT.rotation.x = Math.PI; HG.add(G.hgCapT);      // sinking funnel
  G.hgCapB = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 32), capM); HG.add(G.hgCapB);                                                // growing cone
  G.hgStream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0xe8c890 })); HG.add(G.hgStream);
  // grain: the world lane's tile (assets/sand.jpg) on the two bodies of sand, the funnel and the cone, and running down the stream.
  // Put on only once it has arrived, so a missing file leaves the plain sand as it was.
  { const grain = (mats, rx, ry, then) => new THREE.TextureLoader().load('./assets/sand.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      for (const m of mats) { m.map = t; m.color.set(0xd8c39a); if (m.emissive) { m.emissive.set(0x4a3a20); m.emissiveMap = t; } m.needsUpdate = true; } if (then) then(t); }, undefined, () => { });
    grain([up.material, lo.material], 10, 5); grain([capM], 8, 3); grain([G.hgStream.material], 1, 12, (t) => { G.hgGrain = t; G.hgStream.material.color.set(0xf2dcae); }); }
  const l = new THREE.PointLight(0xffa860, 0.5, 5, 2); l.position.set(0, 1.3, 0.9); HG.add(l);
}
function updateHourglass() {
  if (G.hgGrain && !S.paused && !S.ended) G.hgGrain.offset.y = (performance.now() * 0.0016) % 1;          // the grains in the stream fall
  const f = THREE.MathUtils.clamp(S.timeLeft / TOTAL_TIME, 0, 1);           // sand left above
  const yT = 0.04 + 0.98 * Math.pow(f, 0.6), yB = -1.12 + 0.72 * Math.pow(1 - f, 0.6);
  const wy = HG.position.y + 1.3;
  G.hgTop.constant = wy + yT; G.hgBot.constant = wy + yB;
  const rT = G.hgR(yT) * 0.95, rB = G.hgR(yB) * 0.95;
  G.hgCapT.visible = f > 0.002; G.hgCapT.scale.set(rT, Math.min(0.16, yT * 0.5), rT); G.hgCapT.position.y = 1.3 + yT - G.hgCapT.scale.y / 2;
  G.hgCapB.scale.set(rB, 0.05 + 0.2 * (1 - f) , rB); G.hgCapB.position.y = 1.3 + yB + G.hgCapB.scale.y / 2 - 0.01;
  G.hgStream.visible = f > 0.001 && !S.paused; const top = 1.3 + 0.02, bot = 1.3 + yB + 0.02; G.hgStream.scale.y = top - bot; G.hgStream.position.y = (top + bot) / 2;
}

// ---------------------------------------------------------------- moving stones: exit door, loop panels, the loose square
const DOOR = B([data.door.x, data.door.y, data.door.z]);
const movers = [];
function sink(obj, depth, dur, pos) { movers.push({ obj, y0: obj.position.y, depth, dur, t: 0, k: 0 }); audio.grind(pos, dur); fx.shake(0.05, { x: pos[0], z: pos[2] }); }
// A hidden panel opening: it drops a hand's width with a knock and a fall of dust, hangs, then grinds down into the floor while dust and grit
// pour from the seams and the light from inside spreads across the floor. flag is the name of the "still in the way" switch in S.
function openPanel(obj, light, flag) {
  if (!obj) { S[flag] = false; return; }
  const bb = new THREE.Box3().setFromObject(obj), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, top = bb.max.y, pos = [cx, 1, cz];
  const seams = (n, s) => { for (const z of [bb.max.z + 0.04, bb.min.z - 0.04]) { fx.seam({ x: bb.min.x, y: top, z }, { x: bb.max.x, y: top, z }, n, s); fx.seam({ x: bb.min.x, y: 0.2, z }, { x: bb.min.x, y: top, z }, n >> 2, s); fx.seam({ x: bb.max.x, y: 0.2, z }, { x: bb.max.x, y: top, z }, n >> 2, s); } };
  S[flag] = true;
  const m = { obj, y0: obj.position.y, depth: bb.max.y - bb.min.y + 0.12, dur: 8.2, t: 0, k: 0, light, lightBase: light ? light.userData.base : 0, flag, acc: 0,
    step(dt) {                 // 0-0.14 s the knock; to 1.0 s it hangs; then 7.2 s of grinding down
      const t = this.t; let y;
      if (t < 1.0) y = 0.045 * Math.min(1, t / 0.14) ** 2;
      else { const u = Math.min((t - 1.0) / 7.2, 1); const e = u < 0.2 ? u * u * 2.5 : u > 0.85 ? 1 - (1 - u) * (1 - u) / 0.3 * 1.0 + 0 : 0.1 + (u - 0.2) / 0.65 * 0.825; y = 0.045 + (this.depth - 0.045) * Math.min(1, e) + Math.sin(t * 31) * 0.0025 * (1 - u); }
      this.obj.position.y = this.y0 - y; this.open = y / this.depth;
      if (!this.ground && t >= 1.0) { this.ground = true; audio.grind(pos, 7.2); }
      if (t >= 1.0 && this.open < 0.97) { this.acc += dt; if (this.acc > 0.12) { this.acc = 0; seams(2, 0.22); } player.shake = Math.max(player.shake, 0.0025 / (1 + 0.05 * ((player.x - cx) ** 2 + (player.z - cz) ** 2))); }
      if (this.light) this.light.userData.k = THREE.MathUtils.smoothstep(this.open, 0.02, 0.8);
      if (this.open > 0.7 && S[this.flag]) S[this.flag] = false;
      if (t >= 8.2 && !this.done) { this.done = true; for (const z of [bb.max.z + 0.25, bb.min.z - 0.25]) fx.seam({ x: bb.min.x, y: 0.15, z }, { x: bb.max.x, y: 0.15, z }, 14, 0.5); fx.shake(0.03, { x: cx, z: cz }); }
    } };
  movers.push(m);
  audio.thud(pos, 0.9); fx.shake(0.035, { x: cx, z: cz }); seams(10, 0.3);
}
const rl = data.relief;
const btn = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.112, 0.112), (() => { const m = baseMats['stone'].clone(); m.lightMap = null; m.color.multiplyScalar(0.8); m.emissive = new THREE.Color(0x0c0906); return m; })());
{ const u = (112 + 350) / 1024, v = (112 + 450) / 1024; btn.position.set(rl.x + 0.012, rl.z0 + v * (rl.z1 - rl.z0), -(rl.y0 + u * (rl.y1 - rl.y0))); scene.add(btn); }
// The way out is not a white card: the end of the passage shows a stair climbing to an arch of daylight (painted in a shader; the far
// arch drifts a little with the eye, so it sits behind the wall, not on it), thin haze hangs in the passage, the light is brightest at
// the far end and falls off toward the hall, and it spills out of the doorway across the floor.
const EXIT_NOISE = `float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }`;
const EXIT_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
const exitU = { uK: { value: 0 }, uT: { value: 0 } };
const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.7), new THREE.ShaderMaterial({ uniforms: exitU, transparent: true, vertexShader: EXIT_VS,
  fragmentShader: `uniform float uK,uT; varying vec2 vUv; varying vec3 vW; ${EXIT_NOISE}
    void main(){ vec2 p=vUv; vec3 eye=cameraPosition-vW; vec2 par=clamp(vec2(eye.x,eye.y)*0.035,-0.09,0.09);
      vec2 a=vec2(0.5,0.735)+par;                                  // the arch at the head of the stair
      float top=a.y-0.115, d=clamp(p.y/top,0.0,1.0), cx=mix(0.5,a.x,d*d), w=mix(0.56,0.105,pow(d,0.8)), x=abs(p.x-cx);
      float u=pow(d,0.72)*10.0, f=fract(u), tread=smoothstep(0.42,0.5,f);
      vec3 cool=vec3(0.80,0.88,1.0), warm=vec3(1.0,0.95,0.86);
      float stair=mix(0.035,0.19,tread)*(0.3+2.3*d*d)+0.03*smoothstep(0.9,1.0,f)*d;                     // risers dark, treads catch the day; a bright nosing
      float r=length((p-a)*vec2(1.0,1.8));
      float wallL=0.02+0.42*exp(-5.0*r)*(0.8+0.2*step(0.5,fract(r*14.0)));                            // the well's walls and vault: lit only near the arch
      float inS=smoothstep(w+0.012,w-0.012,x)*step(p.y,top);
      vec3 col=mix(cool*wallL, mix(cool,warm,0.4)*stair, inS);
      // the arch full of sky
      vec2 q=(p-a)/vec2(0.105,0.115); float arch=q.y>0.0?length(q):max(abs(q.x),-q.y), sky=smoothstep(1.06,0.92,arch)*step(-1.0,q.y);
      vec3 day=mix(vec3(1.9,1.7,1.35),vec3(1.35,1.75,2.4),smoothstep(-0.9,0.9,q.y))*(0.9+0.2*noise(p*vec2(9.0,5.0)+uT*0.02));
      col=mix(col,day,sky);
      col+=cool*(0.26*exp(-4.0*r)+0.015);                                                           // daylight scattered in the dusty well
      col*=0.93+0.14*noise(p*vec2(34.0,60.0)+uT*0.15);
      gl_FragColor=vec4(col,uK); }` }));
exitGlow.position.set(0, DOOR.y + 1.35, -(data.door.y1 - 0.05)); scene.add(exitGlow);
const exitHaze = [0.9, 2.3, 3.7].map((back, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.7), new THREE.ShaderMaterial({ uniforms: { ...exitU, uA: { value: [0.085, 0.06, 0.04][i] }, uS: { value: i * 7.3 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: EXIT_VS,
  fragmentShader: `uniform float uK,uT,uA,uS; varying vec2 vUv; ${EXIT_NOISE}
    void main(){ vec2 c=vUv-vec2(0.5,0.6); float g=exp(-dot(c,c)*5.0)*(0.55+0.9*noise(vUv*vec2(2.2,3.0)+vec2(uS+uT*0.03,-uT*0.045)));
      gl_FragColor=vec4(vec3(0.78,0.87,1.0)*g*uA*uK,1.0); }` })); m.position.set(0, DOOR.y + 1.35, -(data.door.y1 - back)); m.renderOrder = 4; m.visible = false; scene.add(m); return m; });
const exitSpill = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.0), new THREE.ShaderMaterial({ uniforms: exitU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, vertexShader: EXIT_VS,
  fragmentShader: `uniform float uK,uT; varying vec2 vUv; ${EXIT_NOISE}
    void main(){ float L=1.0-vUv.y, x=abs(vUv.x-0.5)*4.4, w=0.5+L*1.25;                                // L: 0 at the threshold, 1 five metres into the hall
      float g=smoothstep(w,w*0.25,x)*exp(-L*2.6)*smoothstep(1.0,0.75,L)*(0.85+0.3*noise(vUv*vec2(7.0,9.0)));
      gl_FragColor=vec4(vec3(0.74,0.85,1.0)*g*0.5*uK,1.0); }` }));
exitSpill.rotation.x = -Math.PI / 2; exitSpill.position.set(0, DOOR.y + 0.012, -(data.door.y - 2.5)); exitSpill.renderOrder = 2; exitSpill.visible = false; scene.add(exitSpill);
const exitLight = new THREE.PointLight(0xc9dcff, 0, 13, 2); exitLight.position.set(0, DOOR.y + 1.75, -(data.door.y1 - 1.3)); scene.add(exitLight);

// ---------------------------------------------------------------- what lies outside: rendered in Cycles, seen through openings, never reached
const vista = new THREE.Group(); scene.add(vista); const vistaAnim = [];
const OPEN = {
  drop: { at: B(data.vistas.drop), eye: new THREE.Vector3(0, -0.3, 0), yaw: 0, pitch: -1.3, pano: 'drop', r: 70 },
  spy: { at: B(data.vistas.spy), eye: new THREE.Vector3(0, 0, 0.40), yaw: Math.PI, pitch: -0.08, pano: 'spy', r: 70 },
  crack: { at: B(data.vistas.crack), eye: new THREE.Vector3(0, 0, 0.30), yaw: Math.PI, pitch: -0.5, pano: 'cell', r: 70 },          // r 70 like the others: at 3.6 the sphere cut through the passage walls and showed as black holes
};
for (const k in OPEN) {
  const o = OPEN[k]; o.id = k;
  o.mat = new THREE.ShaderMaterial({ side: THREE.BackSide, fog: false, uniforms: { tPano: { value: null }, tPanoB: { value: null }, uMix: { value: 0 }, uC: { value: o.at.clone() }, uGain: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform sampler2D tPano, tPanoB; uniform vec3 uC; uniform float uGain, uMix; varying vec3 vW; void main(){ vec3 d=normalize(vW-uC); vec2 uv=vec2(atan(d.z,d.x)/6.2831853+0.5, asin(clamp(d.y,-1.0,1.0))/3.14159265+0.5); gl_FragColor=vec4(pow(mix(texture2D(tPano,uv).rgb, texture2D(tPanoB,uv).rgb, uMix), vec3(1.5))*uGain,1.0); }' });
  o.mesh = new THREE.Mesh(new THREE.SphereGeometry(o.r, 48, 24), o.mat); o.mesh.position.copy(o.at); o.mesh.visible = false; vista.add(o.mesh);
  o.rim = new THREE.PointLight(k === 'crack' ? 0xffb070 : 0x9fc2ff, 0, 4.5, 2); o.rim.position.copy(o.at).add(k === 'drop' ? new THREE.Vector3(0, -0.35, 0) : new THREE.Vector3(0, 0, 0.1)); if (!Q.mobile) scene.add(o.rim);
}
// something far off is moving: a lamp carried along a bridge
{ const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffb060, size: 0.5, sizeAttenuation: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); p.frustumCulled = false; vista.add(p);
  vistaAnim.push((t) => { const a = g.attributes.position, k = (t * 0.012) % 1, k2 = (t * 0.008 + 0.4) % 1; const s1 = OPEN.spy.at, d1 = OPEN.drop.at;
    a.setXYZ(0, s1.x - 34 + 68 * k, s1.y - 9 - 2 * k, s1.z + 52); a.setXYZ(1, d1.x - 30 + 60 * k2, d1.y - 48, d1.z + 14 - 20 * k2); a.needsUpdate = true; }); }
// A view is one picture, or a few frames of the same view that are cross-faded slowly back and forth (far-off things move).
// Frames are named <view>.jpg, <view>_b.jpg, <view>_c.jpg, or listed in temple.json "assets": { "vistas": { "drop": ["a.jpg", "b.jpg"] } }. Missing extra frames are simply not used.
function panoTex(key, names) { return L.any(key, names.filter((x, i, a) => x && a.indexOf(x) === i), { soft: true })
  .then((b) => { const op = { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }; return Q.mobile ? smallBitmap(b, op, 2048) : createImageBitmap(b, op); })
  .then((im) => { const t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }); }
function loadPano(o) { if (o.loading || o.ready || performance.now() < (o.retryAt || 0)) return; o.loading = true; const n = (L.assets.vistas || {})[o.pano], list = Array.isArray(n) ? n : null, base = 'vista_' + o.pano;
  panoTex(base, list ? [list[0]] : [n, base + '.jpg', base + '.webp']).then((t) => { o.frames = [t]; o.mat.uniforms.tPano.value = o.mat.uniforms.tPanoB.value = t; o.ready = true;
    if (o.pano !== 'cell' && !Q.mobile) (list ? list.slice(1) : [base + '_b.jpg', base + '_c.jpg']).reduce((p, f, i) => p.then(() => panoTex(base + '_' + i, [f])).then((t2) => { o.frames.push(t2); }), Promise.resolve()).catch(() => { });
  }).catch(() => { o.loading = false; o.retryAt = performance.now() + 30000; }); }
function panoStep(o, t) {          // 0 -> 1 -> 2 -> 1 -> 0 ..., nine seconds a step, eased
  const f = o.frames; if (!f || f.length < 2) return; const n = f.length, span = 2 * (n - 1), x = (t / 9) % span, i = Math.floor(x), k = x - i, e = k * k * (3 - 2 * k), at = (j) => f[j < n ? j : span - j];
  o.mat.uniforms.tPano.value = at(i); o.mat.uniforms.tPanoB.value = at((i + 1) % span); o.mat.uniforms.uMix.value = e; }
const VIS = Object.values(OPEN).map(o => o.at);
performance.mark('world'); stage(0.93);
// ---------------------------------------------------------------- audio, voices, game
const audio = new TempleAudio();
const voices = new Voices(audio);
voices.cfg = SITE;
const status = (t, hold = 4000) => { const e = $('status'); e.textContent = t; e.style.opacity = t ? 1 : 0; clearTimeout(status.t); if (t && hold) status.t = setTimeout(() => e.style.opacity = 0, hold); };
const game = new ChessGame({
  fragStep: Q.mobile ? 2 : 1, scene, RAPIER, gltf: piecesG, makeMat: makePieceMats, chipMat, gritMat, ambRaw, audio, fx, sampleAmb, data,
  onEvent(type, d) {
    voices.event(type, d);
    if (type === 'check') { audio.check(); status('将军', 5000); }
    else if (type === 'quiet') { audio.setTension(tight()); }
    else if (type === 'mate') mate(d);
    else if (type === 'draw') { status('两只手都无法移动', 8000); setTimeout(() => game.setup(), 9000); }
    else if (type === 'concede') openExit('concede');
    else if (type === 'grab' && !S.touched) { S.touched = true; track('first_piece_lifted'); }
    else if (type === 'shatter') track('first_capture');
  },
});
performance.mark('game'); stage(0.94);
if (audio.trackPieces) audio.trackPieces(game);            // the piece sounds read the physics from here, not through window.__g
if (params.has('fen')) game.setup(params.get('fen'));
// The stakes, once, in the player's own voice. The take is the sound lane's (voice manifest player.stakes, subtitle SUBS.stakes in voice.js);
// until it exists, or with the voice switched off, the line is shown as a subtitle only.
const STAKES = '等沙子流完……不。一定有出去的办法。';
function showSub(text, ms) { if (SITE.subtitles === false) return; const e = $('sub'); e.textContent = text; e.style.opacity = 1; clearTimeout(showSub.t); showSub.t = setTimeout(() => { if (e.textContent === text) e.style.opacity = 0; }, ms); }
function stakes() {
  if (S.stakes) return; S.stakes = true; track('stakes_told');
  const has = !!(voices.ok && voices.m && voices.m.player && voices.m.player.stakes) && SITE.playerVoice !== false;
  if (has) voices.say('stakes');
  if (!has) showSub(STAKES, 7000);
}
function tight() { return S.timeLeft < TOTAL_TIME * 0.25 ? 0.35 + 0.4 * (1 - S.timeLeft / (TOTAL_TIME * 0.25)) : 0; }
function mate(who) {
  audio.checkmate(); player.shake = 0.03;
  if (who === 'white') { status('将死', 9000); const k = game.pieces.find(p => p.type === 'k' && p.color === 'b'); if (k) { k.state = 'laid'; k.body.wakeUp(); movers.push({ t: 0, k: 0, dur: 2.5, step() { if (!k.dead && game.tilt(k) < 0.75) k.body.setAngvel({ x: 2.6, y: 0, z: 0.7 }, true); } }); }          // it is pushed over, and falls
    setTimeout(() => openExit('win'), 5000); }
  else { status('将死', 6000); setTimeout(() => { const k = game.pieces.find(p => p.type === 'k' && p.color === 'w'); if (k) game._explode(k, new THREE.Vector3(0, 0, 1), null); }, 2500); setTimeout(() => ending('kept'), 7000); }
}
function openExit(kind) {
  if (S.exitOpen) return; S.exitOpen = true; S.exitKind = kind; game.exitOpen = true; game.over = game.over || 'left';
  audio.bell(0.5, 65.4, 9); voices.event('exit', kind);
  setTimeout(() => { if (dyn.Door) sink(dyn.Door, 2.9, 8, [0, 2, -data.door.y]); status('国王与王后身后，石头正在移动', 9000); }, 2500);
}
function ending(kind) {
  if (S.ended) return; S.ended = kind; const e = $('end'); track('ending_' + kind); if (kind === 'sand') track('timeout'); voices.event('ending', kind);
  const T = {
    concede: ['只是离开', '你放下王冠，门记起了这件事。<br>你走出高高的阶梯，下方是一座城市般巨大的棋盘。在很远的地方，仍有一枚棋子正在移动。', true],
    win: ['它放下了自己的国王', '从来没有人见过这样的结局。<br>你向日光攀去。身后，棋子正被重新摆好，声音很轻。', true],
    kept: ['被留下', '被击败的人会被留下。另一只手仍在生长。<br>黑暗里，一枚新棋子被放上棋格，等着被移动。', false],
    sand: ['最后一粒沙', '沙已流尽。烛火一盏盏熄灭，不慌不忙。<br>你仍站在棋盘边，而它替你走了一步。', false],
  }[kind];
  e.querySelector('h1').textContent = T[0]; e.querySelector('p').innerHTML = T[1]; e.querySelector('small').textContent = TOUCH ? '轻点重新开始' : '按 R 重新开始'; if (TOUCH) setTimeout(() => { e.style.pointerEvents = 'auto'; }, 3500);
  if (T[2]) e.classList.add('white'); else $('fade').style.opacity = 1;
  setTimeout(() => { e.style.opacity = 1; }, T[2] ? 300 : 2500);
  document.exitPointerLock && document.exitPointerLock();
}

// ---------------------------------------------------------------- walking
const rectsOf = (l) => l.map(r => ({ x0: r.x0, x1: r.x1, z0: -r.y1, z1: -r.y0 }));
const WALK = rectsOf(data.walk), LOOP = rectsOf(data.loop);
const EXITR = { x0: -0.4, x1: 0.4, z0: -(data.door.y1 - 0.5), z1: -(data.door.y - 0.7) };
const BLOCK = data.collision.map(c => c.t === 'b' ? { b: 1, x0: c.x0 - 0.3, x1: c.x1 + 0.3, z0: -c.y1 - 0.3, z1: -c.y0 + 0.3 } : { x: c.x, z: -c.y, r: c.r + 0.3 });
BLOCK.push({ x: HG.position.x, z: HG.position.z, r: 1.0 });
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
function canStand(x, z) {
  let ok = WALK.some(r => inR(r, x, z));
  if (!ok && S.secretOpen) ok = (inR(LOOP[0], x, z) && !S.block1) || inR(LOOP[1], x, z) || (inR(LOOP[2], x, z) && ((S.secret2 && !S.block2) || z < -9.2));       // a panel is in the way until it is most of the way down
  if (!ok && S.exitOpen && S.doorDown) ok = inR(EXITR, x, z);
  if (!ok) return false;
  for (const b of BLOCK) { if (b.b ? inR(b, x, z) : (x - b.x) ** 2 + (z - b.z) ** 2 < b.r * b.r) return false; }
  for (const c of game.circles()) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.28) ** 2) return false;
  return true;
}
function roundBlock(x, z) {       // the round thing in the way at this spot, if any: a candle stand, a brazier, the hourglass, a chess piece
  let best = null, bd = 0;
  for (const b of BLOCK) { if (b.b) continue; const d = b.r - Math.hypot(x - b.x, z - b.z); if (d > bd) { bd = d; best = b; } }
  for (const c of game.circles()) { const R = c.r + 0.28, d = R - Math.hypot(x - c.x, z - c.z); if (d > bd) { bd = d; best = { x: c.x, z: c.z, r: R }; } }
  return best;
}
function boxBlock(x, z) { for (const b of BLOCK) if (b.b && b.x1 - b.x0 <= 2.7 && b.z1 - b.z0 <= 2.7 && inR(b, x, z)) return b; return null; }       // a small square thing in the way: a column's plinth, a pedestal (not a wall)
const st = data.stairs, da = data.dais;
function ground(x, z) {
  const y = -z;
  if (Math.abs(x) < 1.7 && y < st.y0) return THREE.MathUtils.clamp((st.y0 - y) / st.tread, 0, st.n) * st.rise;
  if (x > 17.0 && x < 18.4 && y > 3.4) return THREE.MathUtils.clamp((y - 4.5) / 6, 0, 1) * 1.6;
  if (x > 12.4 && x <= 17.0 && y > 11.9) return 1.6;
  if (x > 11.2 && x <= 12.4 && y > 8.9) return THREE.MathUtils.clamp((y - 9.4) / 2.4, 0, 1) * 1.6;
  if (Math.abs(x) < 7.7 && y > da.y0) return THREE.MathUtils.clamp((y - da.y0) / (da.y1 - da.y0), 0, 1) * da.h;
  return 0;
}
const keys = {};
let locked = false, dragging = false;
addEventListener('keydown', e => { if (e.repeat) return; keys[e.code] = true; onKey(e.code); });
addEventListener('keyup', e => { keys[e.code] = false; });
const cv = renderer.domElement;
cv.addEventListener('mousedown', e => { if (TOUCH || !S.started || S.ended) return; if (!locked) { lock(); dragging = true; } if (e.button === 0) tryGrab(); });
addEventListener('mouseup', e => { if (TOUCH) return; dragging = false; if (e.button === 0 && game.held) game.release(); });
addEventListener('mousemove', e => { if (!(locked || dragging) || !S.started) return; const k = game.held ? 0.0016 : 0.0022; player.yaw -= e.movementX * k; player.pitch = THREE.MathUtils.clamp(player.pitch - e.movementY * k, -1.35, 1.35); });
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; });
const look = new THREE.Vector3(), eye = new THREE.Vector3();
const NOLOCK = params.has('nolock') || navigator.webdriver === true;
function lock() { if (NOLOCK) return; try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { } }
const joy = { x: 0, y: 0 };
if (TOUCH) {
  let moveId = null, lookId = null, m0 = [0, 0], l0 = [0, 0], tapT = 0, tapMove = 0, mT = 0, mMove = 0; const stick = $('stick');
  const opt = { passive: false };
  cv.addEventListener('touchstart', e => { e.preventDefault(); if (!S.started || S.ended) return;
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.4 && moveId === null) { moveId = t.identifier; m0 = [t.clientX, t.clientY]; mT = performance.now(); mMove = 0; stick.style.display = 'block'; stick.style.left = m0[0] + 'px'; stick.style.top = m0[1] + 'px'; }
      else if (lookId === null) { lookId = t.identifier; l0 = [t.clientX, t.clientY]; tapT = performance.now(); tapMove = 0; }
    } }, opt);
  cv.addEventListener('touchmove', e => { e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { mMove = Math.max(mMove, Math.abs(t.clientX - m0[0]) + Math.abs(t.clientY - m0[1])); joy.x = THREE.MathUtils.clamp((t.clientX - m0[0]) / 50, -1, 1); joy.y = THREE.MathUtils.clamp((m0[1] - t.clientY) / 50, -1, 1); stick.firstElementChild.style.transform = 'translate(' + (joy.x * 30) + 'px,' + (-joy.y * 30) + 'px)'; }
      else if (t.identifier === lookId) { const dx = t.clientX - l0[0], dy = t.clientY - l0[1]; l0 = [t.clientX, t.clientY]; tapMove += Math.abs(dx) + Math.abs(dy);
        player.yaw -= dx * 0.0055; player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0055, -1.35, 1.35); }
    } }, opt);
  const end = e => { e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; joy.x = joy.y = 0; stick.style.display = 'none'; stick.firstElementChild.style.transform = ''; if (performance.now() - mT < 280 && mMove < 12) tapAt(t.clientX, t.clientY); }       // a quick touch on the left is a tap too
      else if (t.identifier === lookId) { lookId = null; if (performance.now() - tapT < 300 && tapMove < 14) tapAt(t.clientX, t.clientY); }
    } };
  cv.addEventListener('touchend', end, opt); cv.addEventListener('touchcancel', end, opt);
  $('act').addEventListener('click', () => { const a = $('act').dataset.a; if (a === 'lay') onKey('KeyF'); else onKey('KeyE'); });
  $('end').addEventListener('click', () => { if (S.ended) location.reload(); });
  for (const ev of ['gesturestart', 'gesturechange', 'contextmenu', 'selectstart']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
}
const rc = new THREE.Raycaster();
function tapAt(x, y) {
  if (peek) { onKey('KeyE'); return; }
  if (reading) { reading = false; $('read').style.opacity = 0; return; }
  rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  if (game.held) {             // tap a square: the piece is carried there and set down. Tap anywhere else: it is set down where it is.
    const o = rc.ray.origin, d = rc.ray.direction; S.place = null;
    if (d.y < -0.02) { const k = -o.y / d.y; let fx = o.x + d.x * k, fz = o.z + d.z * k; const sq = posSq(fx, fz); if (sq) { const c = sqPos(sq); fx = c.x; fz = c.z; }
      if (Math.hypot(fx - player.x, fz - player.z) < 4.6) { S.place = { x: fx, z: fz, t: 0 }; return; } }
    game.release(); return; }
  const p = game.pick(rc.ray.origin, rc.ray.direction, 4.6); if (p) game.grab(p);
}
function tryGrab() { if (game.held) return; const p = game.pick(eye, look); if (p) game.grab(p); }

// ---------------------------------------------------------------- things to read and press
const READS = data.reads.map(r => ({ ...r, pos: B(r.p) }));
READS.push({ id: 'hourglass', pos: new THREE.Vector3(HG.position.x, 2.2, HG.position.z), r: 2.6, title: '沙漏', text: '青铜与厚重旧玻璃，比你还要高。你用肩膀顶了顶它。它固定在原地，从来就不是用来转动的。沙仍在流。上方的玻璃里剩下多少沙，你就还有多少时间。' });
READS.push({ id: 'relief', pos: new THREE.Vector3(rl.x, 1.2, -2.4), r: 2.2, title: '刻在墙上的棋盘', text: '六十四格浅浅浮雕，横列刻着 a 到 h，纵列刻着 1 到 8。其中一格的颜色略有不同，像是被人反复触摸过。' });
let focus = null, reading = false, peek = null;
function findFocus() {
  if (game.held) return null;
  const bd = btn.position.clone().sub(eye); const bl = bd.length();
  if (!S.secretOpen && bl < 1.7 && bd.normalize().dot(look) > 0.992) return { press: true };
  let best = null, bs = 0;
  for (const r of READS) { const d = r.pos.clone().sub(eye); const l = d.length(); if (l > r.r) continue; const dot = d.normalize().dot(look); if (dot > 0.86 && dot > bs) { bs = dot; best = r; } }
  return best;
}
function onKey(c) {
  if (c === 'KeyM') toggleMute();
  if (c === 'KeyH') $('help').style.opacity = $('help').style.opacity === '0' ? 1 : 0;
  if (!S.started) return;
  if (c === 'KeyR') { if (S.ended || performance.now() - (onKey.r || 0) < 1500) location.reload(); else { onKey.r = performance.now(); status('再按一次 R 重新开始', 1500); } }
  if (S.ended) return;
  if (c === 'KeyE') {
    if (peek) { player.yaw = peek.py; player.pitch = peek.pp; camera.fov = 62; camera.updateProjectionMatrix(); peek = null; return; }
    if (reading) { reading = false; $('read').style.opacity = 0; return; }
    if (game.held) { game.release(); return; }
    if (focus && OPEN[focus.id]) { const o = OPEN[focus.id]; peek = { o, py: player.yaw, pp: player.pitch }; player.yaw = o.yaw; player.pitch = o.pitch; camera.fov = 58; camera.updateProjectionMatrix(); loadPano(o); voices.event('read', focus.id); S['read_' + focus.id] = true; if (focus.id === 'drop') S.knowsLay = true; return; }
    if (focus && focus.press) pressButton();
    else if (focus) { if (['ledger', 'shame', 'scr3', 'scr4', 'scr5', 'study'].includes(focus.id)) S.knowsLay = true; reading = true; $('read').querySelector('h3').textContent = focus.title || ''; $('read').querySelector('p').textContent = focus.text; $('read').style.opacity = 1; voices.event('read', focus.id); S['read_' + focus.id] = true; }
    else tryGrab();
  }
  if (c === 'KeyF' && game.held) { const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); game.release(right); }
  if (c === 'Digit9') S.timeLeft = 75;                 // hidden: jump to the last minute
  if (c === 'Digit0') { S.paused = !S.paused; status(S.paused ? '沙流停住了' : '沙又开始流了', 1500); }
  if (c === 'Digit8') S.timeLeft = TOTAL_TIME * 0.24;
}
function pressButton() {
  if (S.secretOpen) return; S.secretOpen = true; S.block1 = true;
  const x0 = btn.position.x; movers.push({ t: 0, k: 0, dur: 0.22, step() { btn.position.x = x0 - 0.024 * Math.min(1, this.t / 0.2); } });          // the loose stone goes in under the hand
  audio.thud([btn.position.x, btn.position.y, btn.position.z], 0.8); voices.event('button'); fx.seam({ x: btn.position.x - 0.03, y: btn.position.y - 0.06, z: btn.position.z - 0.06 }, { x: btn.position.x - 0.03, y: btn.position.y - 0.06, z: btn.position.z + 0.06 }, 4, 0.12);
  setTimeout(() => openPanel(dyn.Secret1, loopLight, 'block1'), 700);
}
function toggleMute() { audio.setMuted(!audio.muted); $('mute').textContent = audio.muted ? '关闭声音' : '开启声音'; }
$('mute').onclick = toggleMute;
// Phones have no R key. A small "..." beside the sound switch opens a one-item menu: BEGIN AGAIN, which must then be tapped twice
// (the second tap within four seconds). Touching the game, or waiting, closes it. Three deliberate taps, so it cannot happen by accident.
{ const menu = $('menu'), again = $('again'); let shut = 0, sure = 0;
  const close = () => { menu.classList.remove('open'); again.classList.remove('sure'); again.textContent = '重新开始'; clearTimeout(shut); clearTimeout(sure); };
  $('more').onclick = () => { if (menu.classList.contains('open')) { close(); return; } close(); if (!S.started || S.ended) return; menu.classList.add('open'); shut = setTimeout(close, 7000); };
  again.onclick = () => { if (again.classList.contains('sure')) { location.reload(); return; }
    again.classList.add('sure'); again.textContent = '再点一次确认'; clearTimeout(shut); sure = setTimeout(close, 4000); };
  cv.addEventListener('touchstart', close, { passive: true }); cv.addEventListener('mousedown', close); }

// ---------------------------------------------------------------- reflection in the polished board
const mirrorCam = new THREE.PerspectiveCamera();
function renderMirror() {
  const c = camera; mirrorCam.fov = c.fov; mirrorCam.aspect = c.aspect; mirrorCam.near = c.near; mirrorCam.far = c.far; mirrorCam.updateProjectionMatrix();
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion);
  mirrorCam.position.set(c.position.x, -c.position.y, c.position.z);
  mirrorCam.up.set(u.x, -u.y, u.z); mirrorCam.lookAt(mirrorCam.position.x + f.x, mirrorCam.position.y - f.y, mirrorCam.position.z + f.z);
  mirrorCam.updateMatrixWorld(); mirrorU.uMirrorVP.value.multiplyMatrices(mirrorCam.projectionMatrix, mirrorCam.matrixWorldInverse);
  boardMeshes.forEach(m => m.visible = false); game.markers.visible = false; vista.visible = false;
  const fog = scene.fog; renderer.setRenderTarget(mirrorRT); renderer.render(scene, mirrorCam); renderer.setRenderTarget(null);
  boardMeshes.forEach(m => m.visible = true); game.markers.visible = true; vista.visible = true; scene.fog = fog;
}

// ---------------------------------------------------------------- environment reflections for bronze and marble, captured from the hall itself
const envRT = new THREE.WebGLCubeRenderTarget(256, { type: FLOAT_RT });
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromCubemap(envRT.texture).texture; scene.environmentIntensity = 1.0; pm.dispose(); }      // black stand-in, same size as the real one, so shaders are built once
function captureEnv() {
  for (const m of lmMats) m.lightMapIntensity = LMI;
  G.flameMat.uniforms.uT.value = 1; fireLights.forEach(l => l.intensity = l.userData.base);
  const crt = envRT; const cc = new THREE.CubeCamera(0.2, 80, crt); cc.position.set(0, 2.2, 2.5);
  const hide = HG.children.filter(c => c.isMesh);         // hide the glass, keep its lamp: a changed light count would rebuild every shader
  scene.add(cc); hide.forEach(c => c.visible = false); vista.visible = false; cc.update(renderer, scene); hide.forEach(c => c.visible = true); vista.visible = true; scene.remove(cc);
  const pm = new THREE.PMREMGenerator(renderer); const old = scene.environment; scene.environment = pm.fromCubemap(crt.texture).texture; scene.environmentIntensity = 1.0; pm.dispose(); if (old) old.dispose();
}
performance.mark('preenv'); stage(0.95);
camera.position.set(0, 2.3, 10.6); camera.rotation.set(-0.06, 0, 0); camera.updateMatrixWorld();
// build every shader in parallel, in the form the frame really uses (drawn into a float target, not straight to the screen)
try { renderer.setRenderTarget(rt); const p = renderer.compileAsync(scene, camera); renderer.setRenderTarget(null); await p; } catch (e) { renderer.setRenderTarget(null); }
performance.mark('compiled'); stage(0.985);
// the room's own reflections are captured on the first frame, behind the fade-in, so the Enter button is not kept waiting for them

// ---------------------------------------------------------------- frame
const clock = new THREE.Clock(); let lastSurf = 'stone';
const noise1 = (t) => Math.sin(t * 1.7) * 0.5 + Math.sin(t * 4.3 + 1.3) * 0.3 + Math.sin(t * 9.1 + 0.7) * 0.2;
function frame() {
  let dt = Math.min(clock.getDelta(), 0.05);
  G.hold = TOUCH && innerHeight > innerWidth * 1.05 && !params.has('mobile') || G.lost;            // phone held upright: everything waits behind the "turn your phone" card
  if (G.hold) { if (G.lost) return; dt = 0; joy.x = joy.y = 0; }
  G.time += dt; const t = G.time;
  // --- time
  if (S.started && !S.paused && !S.ended && !S.exitOpen) S.timeLeft = Math.max(0, S.timeLeft - dt);
  updateHourglass();
  const q = THREE.MathUtils.clamp(S.timeLeft / (TOTAL_TIME * 0.25), 0, 1), lastMin = THREE.MathUtils.clamp(S.timeLeft / 60, 0, 1);
  unseenFx.step(dt, t);
  const gutter = Math.min(1, (1 - q) * 0.7 + (1 - lastMin) * 0.3 + unseenFx.gut * 0.75);          // the fires gutter as the unseen hand takes hold of a piece
  let lightK = (0.62 + 0.38 * q) * (0.45 + 0.55 * lastMin);
  if (lastMin < 1) lightK *= 0.82 + 0.18 * Math.sin(t * 4.2);
  if (S.ended === 'kept' || S.ended === 'sand') { G.dark = Math.min(1, (G.dark || 0) + dt * 0.16); lightK *= 1 - G.dark; }
  if (S.timeLeft <= 0 && !S.ended && S.started) { audio.checkmate(); ending('sand'); }
  if (S.started && !S.ended && lastMin < 1 && Math.floor(t / 1.6) !== Math.floor((t - dt) / 1.6)) audio.thud([player.x, 0, player.z], 0.25 + 0.3 * (1 - lastMin));
  if (S.started && Math.floor(t) !== Math.floor(t - dt)) audio.setTension(Math.max(tight(), game.chess.inCheck() && !game.over ? 1 : 0));
  G.light += (lightK - G.light) * Math.min(1, dt * 2);
  const fl = (1 + (0.035 + gutter * 0.12) * noise1(t * 2.3)) * (1 - 0.2 * unseenFx.gut);          // the whole hall dips for a moment as the unseen hand takes hold
  for (const m of lmMats) m.lightMapIntensity = LMI * G.light * fl;
  G.flameMat.uniforms.uT.value = t; G.flameMat.uniforms.uGutter.value = gutter;
  for (const l of fireLights) l.intensity = l.userData.base * G.light * (1 - 0.3 * unseenFx.gut) * (0.75 + 0.5 * (0.5 + 0.5 * noise1(t * 3.1 + l.userData.seed)));
  well.intensity = 0.55 * (1 + 0.9 * UNSEEN_LIGHT * unseenFx.amb); core.intensity = 1.9 * (1 + 0.22 * UNSEEN_LIGHT * unseenFx.amb);          // a cold swell over the whole board while it moves
  dustMat.uniforms.uT.value = t; grade.uniforms.uT.value = t % 10; G.lightU.value = G.light;

  // --- player
  if (S.started && !S.ended) {
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + joy.y, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
    if (keys.KeyQ) player.yaw += dt * 1.6; if (keys.KeyC) player.yaw -= dt * 1.6;
    if (peek && (f || s)) onKey('KeyE');
    let sp = (keys.ShiftLeft || keys.ShiftRight) ? 4.4 : 2.5; if (game.held) sp = 1.25; if (reading && (f || s)) { reading = false; $('read').style.opacity = 0; }
    const sn = Math.sin(player.yaw), cs = Math.cos(player.yaw);
    let wx = (-sn * f + cs * s), wz = (-cs * f - sn * s); const wl = Math.hypot(wx, wz); if (wl > 0) { const k = sp * Math.min(1, Math.hypot(f, s)) / wl; wx *= k; wz *= k; }
    player.vx += (wx - player.vx) * Math.min(1, dt * 9); player.vz += (wz - player.vz) * Math.min(1, dt * 9);
    const nx = player.x + player.vx * dt, nz = player.z + player.vz * dt;
    if (canStand(nx, nz)) { player.x = nx; player.z = nz; player.slide = 0; player.boxDir = 0; }
    else { let done = false; const c = roundBlock(nx, nz), spd = Math.hypot(player.vx, player.vz);
      if (c && spd > 0.05) {            // something round: go round it. Walk along its rim, to whichever side the step already leans
        let dx = player.x - c.x, dz = player.z - c.z; const dl = Math.hypot(dx, dz) || 1e-6; dx /= dl; dz /= dl; const tx = -dz, tz = dx, vt = player.vx * tx + player.vz * tz;
        if (!player.slide || Math.abs(vt) > spd * 0.5) player.slide = vt >= 0 ? 1 : -1;
        const along = player.slide * Math.max(Math.abs(vt), spd * 0.45) * dt;
        let px = player.x + tx * along, pz = player.z + tz * along; const pl = Math.hypot(px - c.x, pz - c.z) || 1e-6, rr = Math.max(pl, c.r + 0.004); px = c.x + (px - c.x) / pl * rr; pz = c.z + (pz - c.z) / pl * rr;
        if (canStand(px, pz)) { player.x = px; player.z = pz; done = true; } else player.slide = -player.slide; }         // that way is shut: try the other side next step
      if (!done && !c && spd > 0.05) { const b = boxBlock(nx, nz);            // walked square into a plinth: step along its face toward the nearer corner and carry on past it
        if (b) { const outZ = player.z < b.z0 || player.z > b.z1, outX = player.x < b.x0 || player.x > b.x1, go = Math.max(spd * 0.55, 0.5) * dt;
          // (if that corner is shut by something else, a candle stand say, turn and go round the other one, and keep to that choice)
          if (outZ && !outX && Math.abs(player.vx) < spd * 0.3) { const d = player.boxDir || (player.x < (b.x0 + b.x1) / 2 ? -1 : 1), px = player.x + d * go; if (canStand(px, player.z)) { player.x = px; player.boxDir = d; done = true; } else player.boxDir = -d; }
          else if (outX && !outZ && Math.abs(player.vz) < spd * 0.3) { const d = player.boxDir || (player.z < (b.z0 + b.z1) / 2 ? -1 : 1), pz = player.z + d * go; if (canStand(player.x, pz)) { player.z = pz; player.boxDir = d; done = true; } else player.boxDir = -d; } } }
      if (!done) { if (canStand(nx, player.z)) { player.x = nx; player.vz = 0; } else if (canStand(player.x, nz)) { player.z = nz; player.vx = 0; } else { player.vx = player.vz = 0; } } }
    const v = Math.hypot(player.vx, player.vz);
    player.step += v * dt;
    const stride = game.held ? 0.62 : 0.78;
    if (player.step > stride) { player.step = 0; const onB = Math.abs(player.x) < 6.6 && Math.abs(player.z) < 6.6; const g = ground(player.x, player.z);
      audio.footstep(onB ? 'marble' : (g > 0.02 && g < 0.94) || g > 1 ? 'stair' : 'stone', game.held ? 1.3 : 0.75 + v * 0.1); }
    // The feet walk on ground(): flat floors and plain ramps, never the visible stones, rubble or candle bases.
    // The eye follows on a critically damped spring (time constant 0.2 s), so stairs are a glide and nothing snaps.
    { const gy = ground(player.x, player.z) + 1.66 - (game.held ? 0.05 : 0), w = 5.0; let n = Math.max(1, Math.ceil(dt / 0.01)); const h = dt / n;
      while (n--) { player.vy += (w * w * (gy - player.y) - 2 * w * player.vy) * h; player.y += player.vy * h; } }
    // head-bob: one slow rise per two steps, a few millimetres, fading in and out with speed
    player.bob += v * dt / (2 * stride) * 6.2832; player.bobA += ((game.held ? 0.005 : 0.0035) * Math.min(v / 2, 1) - player.bobA) * Math.min(1, dt * 4);
    // loop passage bookkeeping
    const inLoop = S.secretOpen && (inR(LOOP[0], player.x, player.z) || inR(LOOP[1], player.x, player.z) || inR(LOOP[2], player.x, player.z)) && !WALK.some(r => inR(r, player.x, player.z));
    if (inLoop && !S.secret2 && player.x < 13.4) { S.secret2 = true; openPanel(dyn.Secret2, loopLight2, 'block2'); }
    if (inLoop && !S.inLoop) { voices.event('loop_enter'); track('loop_passage_found'); } if (!inLoop && S.inLoop && player.z > -8.8 && player.x < 13) { voices.event('loop_return'); S.loopSeen = true; }
    S.inLoop = inLoop;
    // tell the stakes: just after the first remark at the hourglass; or when the player has looked across at it for a moment; or, failing both, a minute and a half in
    S.playT = (S.playT || 0) + dt;
    if (!S.stakes && !reading && !peek && (voices.ok && SITE.playerVoice !== false || $('sub').style.opacity !== '1')) {         /* spoken lines queue; a bare subtitle waits for a gap */ const hx = HG.position.x - player.x, hz = HG.position.z - player.z, hd = Math.hypot(hx, hz) || 1, facing = (look.x * hx + look.z * hz) / hd;
      if (voices.said && voices.said.hourglass) { S.hgT = (S.hgT || 0) + dt; if (S.hgT > 4.5) stakes(); }
      else if (hd < 3.2 && S.playT > 3) { S.hgT = (S.hgT || 0) + dt; if (S.hgT > 5) stakes(); }
      if (S.playT > 25 && hd < 26 && facing > 0.95 && Math.abs(player.x) < 7.5) { S.hgLook = (S.hgLook || 0) + dt; if (S.hgLook > 1.2) stakes(); }
      if (S.playT > 95) stakes(); }
    // a spoken clue earns the lay-down hint as well as a read one
    if (!S.knowsLay && ((voices.noticed && /clue/.test(voices.lastPrisoner || '')) || /clue/.test(voices.lastWhisper || ''))) S.knowsLay = true;
    audio.loopAir && audio.loopAir(inLoop);
    if (S.exitOpen && S.doorDown && player.z < -(data.door.y + 2.2)) ending(S.exitKind);
  }
  player.shake *= Math.exp(-dt * 5);
  camera.position.set(player.x + (Math.random() - 0.5) * player.shake, player.y + Math.sin(player.bob) * player.bobA + (Math.random() - 0.5) * player.shake, player.z + (Math.random() - 0.5) * player.shake);
  if (!(G.titleK >= 1)) {   // while the title is up: less exposure and glow, so the flames keep their shape behind the lettering; eases to the game's values on Enter
    G.titleK = S.started ? Math.min(1, (G.titleK || 0) + dt / 2.5) : 0; const k = G.titleK * G.titleK * (3 - 2 * G.titleK);
    renderer.toneMappingExposure = 1.2 + 0.3 * k; bloom.strength = 0.24 + 0.18 * k; }
  if (!S.started) { const a = t * 0.05; camera.position.set(Math.sin(a) * 0.8, 2.3 + Math.sin(a * 0.7) * 0.15, 10.6); camera.rotation.set(-0.06, Math.sin(a * 0.8) * 0.05, 0); }
  else camera.rotation.set(player.pitch + (Math.random() - 0.5) * player.shake * 0.3, player.yaw, 0);          // no roll, no sway of the view
  if (peek) { const o = peek.o; player.yaw = THREE.MathUtils.clamp(player.yaw, o.yaw - 0.6, o.yaw + 0.6); player.pitch = THREE.MathUtils.clamp(player.pitch, o.pitch - 0.5, Math.min(1.3, o.pitch + 0.5));
    camera.position.copy(o.at).add(o.eye); camera.rotation.set(player.pitch, player.yaw, 0); }
  if (window.__cam) window.__cam(camera);
  camera.updateMatrixWorld(); eye.copy(camera.position); look.set(0, 0, -1).applyQuaternion(camera.quaternion);
  // where a held piece is asked to go: over the floor where you look, within reach
  if (game.held) { let d = look.y < -0.05 ? (0.3 - eye.y) / look.y * Math.hypot(look.x, look.z) : 2.6; d = THREE.MathUtils.clamp(d, 1.15, 2.6); const hl = Math.hypot(look.x, look.z) || 1;
    game.carry = { x: player.x + look.x / hl * d, y: ground(player.x, player.z) + 0.3, z: player.z + look.z / hl * d };
    if (S.place) { const pl = S.place, t = game.held.body.translation(); pl.t += dt; game.carry.x = pl.x; game.carry.z = pl.z;
      if (Math.hypot(t.x - pl.x, t.z - pl.z) < 0.1 || pl.t > 4) { S.place = null; game.release(); } } }
  else S.place = null;
  if (S.started) game.setPlayer(player.x, player.z);
  game.update(dt, t);
  if (game.moving || (G.shadowN = (G.shadowN || 0) + 1) < 30 || G.shadowN % 120 === 0) { G.still = 0; } else G.still = (G.still || 0) + 1;
  if ((G.still || 0) < 20) well.shadow.needsUpdate = core.shadow.needsUpdate = true;
  dustP.update(dt); gritP.update(dt);
  for (const s of shafts) { const o = s.userData, c = camera.position, inside = Math.abs(c.x - o.c.x) < o.h.x + 0.3 && Math.abs(c.y - o.c.y) < o.h.y + 0.3 && Math.abs(c.z - o.c.z) < o.h.z + 0.3;        // from inside, draw the far faces
    s.material.uniforms.uT.value = t; if (s.material.side !== (inside ? THREE.BackSide : THREE.FrontSide)) { s.material.side = inside ? THREE.BackSide : THREE.FrontSide; s.material.depthTest = !inside; s.material.needsUpdate = true; } }
  for (let i = movers.length - 1; i >= 0; i--) { const m = movers[i]; m.t += dt; const k = m.k = Math.min(m.t / m.dur, 1);
    if (m.step) m.step(dt); else { m.obj.position.y = m.y0 - m.depth * (k * k * (3 - 2 * k)); player.shake = Math.max(player.shake, 0.002); }
    if (k >= 1) { movers.splice(i, 1); if (m.obj === dyn.Door) S.doorDown = true; } }
  for (const l of [loopLight, loopLight2]) l.intensity = l.userData.base * l.userData.k * G.light * (0.8 + 0.2 * (0.5 + 0.5 * noise1(t * 2.3 + l.userData.seed)));
  if (S.exitOpen) { const k = exitU.uK.value += ((S.doorDown ? 1 : 0.5) - exitU.uK.value) * Math.min(1, dt * 0.4); exitU.uT.value = t % 1000; exitLight.intensity = k * 14; exitSpill.visible = true; for (const h of exitHaze) h.visible = true; }
  // --- prompts
  if (S.started && !S.ended) {
    focus = reading || peek ? focus : findFocus();
    let p = '';
    if (peek) p = 'E  —  后退';
    else if (game.held) p = game.held.type === 'k' && S.knowsLay ? '松开放下  ·  F 将棋子侧放' : '';
    else if (focus && focus.press) p = 'E  —  按下';
    else if (focus && !reading) p = 'E  —  ' + (focus.id === 'hourglass' ? '试着转动它' : focus.id === 'grate' ? '倾听' : OPEN[focus.id] ? '望过去' : '阅读');
    if (TOUCH) { const a = $('act'); let lab = '';
      if (peek) { lab = '后退'; a.dataset.a = 'e'; } else if (game.held && game.held.type === 'k' && S.knowsLay) { lab = '侧放'; a.dataset.a = 'lay'; } else if (game.held) { lab = ''; } else if (focus && focus.press) { lab = '按下'; a.dataset.a = 'e'; }
      else if (focus || reading) { lab = reading ? '关闭' : focus.id === 'grate' ? '倾听' : focus.id === 'hourglass' ? '转动' : OPEN[focus.id] ? '观看' : '阅读'; a.dataset.a = 'e'; }
      if (a.textContent !== lab) a.textContent = lab; a.style.display = lab ? 'block' : 'none'; p = game.held ? '轻点方格放下棋子' : ''; }
    $('prompt').textContent = p; $('prompt').style.opacity = p ? 1 : 0;
  }
  for (const f of vistaAnim) f(t);
  { let k = 0; for (const v of VIS) k = Math.max(k, 1 - Math.hypot(v.x - player.x, v.z - player.z) / 3.2); k = Math.max(0, k); if (audio.nearVoid) audio.nearVoid(k);
    let best = null, bd = 9; for (const id in OPEN) { const o = OPEN[id]; const d = Math.hypot(o.at.x - player.x, o.at.z - player.z); if (d < 14) loadPano(o); if (d < bd) { bd = d; best = o; } o.rim.intensity = o.ready ? Math.max(0, 1 - d / 7) * (id === 'crack' ? 0.5 : id === 'spy' ? 0.55 : 1.6) * (0.9 + 0.1 * Math.sin(t * 3 + d)) : 0; }
    for (const id in OPEN) { const o = OPEN[id]; o.mesh.visible = o === best && !!o.ready; if (o.mesh.visible) panoStep(o, t); o.mat.uniforms.uGain.value = id === 'crack' ? 4.0 : id === 'drop' ? 0.6 : 1.5; } }
  audio.setListener(camera.position, look); voices.update(dt, player, S, game);
  // --- render
  if (Q.mirror && (G.frameN = (G.frameN || 0) + 1) % Q.mirrorEvery === 0) renderMirror();
  composer.render();
  // quality: measured from the first frames of the title screen on; a phone steps down one notch at a time until it holds about 30
  if (!document.hidden && !G.hold) { const rdt = Math.min((performance.now() - (G.lastNow || performance.now())) / 1000, 0.5); G.qT = (G.qT || 0) + rdt; G.qN = (G.qN || 0) + 1;
    if (G.qT > (Q.mobile ? 2.5 : 4)) { const fps = G.qN / G.qT; Q.fps = fps; G.qT = G.qN = 0;
      if (!params.has('fixed') && !G.qSkip && (Q.mobile ? fps < 27 && Q.tier < 6 : S.started && fps < 45 && Q.tier < 3)) setTier(Q.tier + 1);
      G.qSkip = false; } }
  G.lastNow = performance.now();
  requestAnimationFrame(frame);
}
function setTier(n) {
  const setPR = (v) => { Q.pr = v; renderer.setPixelRatio(v); composer.setPixelRatio(v); };
  while (Q.tier < n) { Q.tier++; G.qSkip = true;                 // the window after a change is not judged: it holds the hitch of changing
    if (Q.mobile) { const base = Math.min(devicePixelRatio, 1.25);
      if (Q.tier === 1) setMirror(false);                         // 1: no second drawing of the room for the floor
      else if (Q.tier === 2) bloom.enabled = false;               // 2: no glow pass
      else if (Q.tier === 3) setPR(Math.min(base, 1));            // 3-6: fewer pixels
      else if (Q.tier === 4) setPR(0.8); else if (Q.tier === 5) setPR(0.65); else setPR(0.5); }
    else { setPR(Q.pr * 0.8); if (Q.tier === 2) Q.mirrorEvery++; } }
}
if (params.has('tier')) setTier(+params.get('tier')); else if (LOWMEM) setTier(3);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); mirrorRT.setSize(innerWidth / Q.mirrorDiv, innerHeight / Q.mirrorDiv); });

// if the browser takes the graphics away (phones do, under memory pressure): say so over the still, and offer a reload
cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); G.lost = true; const n = $('nogl'); n.querySelector('div').innerHTML = '<b>' + TITLE.toUpperCase() + '</b>这台设备已经没有余力容纳神殿。请关闭其他标签页或应用，然后轻点重试。'; n.style.display = 'flex'; n.addEventListener('click', () => location.reload()); try { audio.setMuted(true); } catch (x) { } });

// ---------------------------------------------------------------- start
performance.mark('ready');
$('start').disabled = false; $('start').textContent = '进入'; try { L.ui.ready(); } catch (e) { }          // the still fades into the live scene; the rank gives way to ENTER
$('fade').style.opacity = 0;
function begin() {
  if (S.started) return; S.started = true; track('game_started');
  audio.start(); audio.setFires(firePos); audio.sandHiss && audio.sandHiss([HG.position.x, HG.position.y + 1.3, HG.position.z]); voices.start(data);
  $('title').style.opacity = 0; $('title').style.pointerEvents = 'none'; document.documentElement.classList.add('playing'); $('help').style.opacity = 1; setTimeout(() => $('help').style.opacity = 0, 40000);
  if (!TOUCH) lock();
  status('', 0);
}
$('start').onclick = begin;
// models the first view does not need (named in temple.json "assets": { "late": [...] }) arrive after the Enter button is up
(async () => { for (const n of (L.assets.late || [])) { try {
  const g = await parseGLB(L.any('late_' + n, [n], { soft: true })); const need = new Set();
  g.scene.traverse(o => { const m = /^LM_(\w+?)(_\d+)?$/.exec(o.name); if (m && !LM[m[1]]) need.add(m[1]); });
  for (const a of need) { ATL.push(a); await loadLM(a, L.any('lm_' + a, L.lmNames(a), { soft: true })); }
  adopt(g.scene); macroAll(); scene.add(g.scene); G.late = (G.late || 0) + 1;
} catch (e) { console.warn('late model not loaded', n, e); } } })();
window.__g = { Q, tapAt, S, player, game, audio, voices, begin, pressButton, openExit, ending, canStand, ground, G, renderer, camera, sqPos, posSq, bloom, scene, composer, grade, fireLights, HG, OPEN, THREE, movers, stakes, shafts, setTier, setMirror,
  tp(x, z, yaw = player.yaw, pitch = player.pitch) { player.x = x; player.z = z; player.yaw = yaw; player.pitch = pitch; player.vx = player.vz = 0; player.vy = 0; player.y = ground(x, z) + 1.66; } };
if (params.has('clean')) for (const id of ['help', 'mute', 'more', 'dot', 'prompt', 'status', 'sub']) $(id).style.display = 'none';
if (params.has('auto')) begin();
requestAnimationFrame(() => { captureEnv(); performance.mark('env'); frame(); });
