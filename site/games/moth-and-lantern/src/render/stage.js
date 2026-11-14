// Renderer, scene, lights and the shared per-frame layers (light field, backdrop, glows, decals).
// Owns resize handling and the adaptive pixel ratio. Knows nothing about the puzzle.
import * as THREE from 'three';
import { PALETTE, QUALITY } from '../config.js';
import { G } from './materials.js';
import { LightField } from './lightfield.js';
import { Backdrop } from './backdrop.js';
import { GlowLayer, DecalLayer } from './sprites.js';

const _v = new THREE.Vector3(), _size = new THREE.Vector2();
const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createStage(canvas) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(PALETTE.abyss, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 1, 200);

  // Moonlight: one cool key light that turns with the camera, so every rotation is lit from the same side
  // (the side of the screen where the moon hangs). It is dim on purpose: the lanterns are the bright thing.
  const moon = new THREE.DirectionalLight(PALETTE.moon, 1.0);
  moon.castShadow = true;
  const size = touch ? QUALITY.shadowSizeTouch : QUALITY.shadowSize;
  moon.shadow.mapSize.set(size, size);
  moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.035; moon.shadow.radius = touch ? 3 : 4.5;
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(PALETTE.skyAmbient, PALETTE.groundAmbient, 0.85);
  scene.add(hemi);

  const field = new LightField(renderer, touch);
  const backdrop = new Backdrop(renderer, touch);
  const glow = new GlowLayer(700), shade = new DecalLayer(96, false), shine = new DecalLayer(160, true);
  scene.add(backdrop.mesh, glow.mesh, shade.mesh, shine.mesh);

  let maxRatio = Math.min(devicePixelRatio || 1, touch ? QUALITY.maxPixelRatioTouch : QUALITY.maxPixelRatio);
  let ratio = maxRatio, width = 0, height = 0, slow = 0, fast = 0;
  const sizeBackdrop = () => { renderer.getDrawingBufferSize(_size); backdrop.resize(_size.x, _size.y); };

  const stage = {
    renderer, scene, camera, moon, hemi, field, backdrop, glow, shade, shine, touch,
    get width() { return width; }, get height() { return height; },
    resize() {
      const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
      if (w === width && h === height) return false;
      width = w; height = h;
      renderer.setPixelRatio(ratio); renderer.setSize(w, h, false); sizeBackdrop();
      return true;
    },
    // Covers the level with the shadow camera. Called once per level.
    setLevel(level) {
      field.setLevel(level); backdrop.setLevel(level);
      const R = Math.hypot(level.w, level.h) / 2 + 1.5, c = moon.shadow.camera;
      c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = R * 2 + 30; c.updateProjectionMatrix();
      stage.shadowR = R;
    },
    shadowR: 10, yaw: 0,
    // Light comes from the upper left of the screen, slightly from the front. Seen from straight above the moon
    // stands higher and its shadows are fainter, so the plan view keeps soft, short shadows.
    aimMoon(yaw) {
      const e = camera.matrixWorld.elements, elev = Math.asin(Math.min(1, Math.max(0, e[9]))) * 180 / Math.PI, k = sstep(58, 88, elev);
      const lx = -0.62, ly = 0.92 + 0.9 * k, lz = 0.36, s = Math.sin(yaw), c = Math.cos(yaw), d = stage.shadowR + 12;
      const n = 1 / Math.hypot(lx, ly, lz);
      moon.position.set((lx * c + lz * s) * d * n, ly * d * n, (-lx * s + lz * c) * d * n);
      moon.target.position.set(0, 0, 0);
      moon.shadow.intensity = 0.9 - 0.4 * k;
      stage.yaw = yaw;
      // Direction to the moon in view space, for the rim light.
      _v.copy(moon.position).normalize().transformDirection(camera.matrixWorldInverse);
      G.uMoonV.value.copy(_v);
    },
    render(dt) {
      // Adaptive resolution: drop the pixel ratio when frames are slow, restore it when there is headroom.
      if (dt > 0.03) { slow++; fast = 0; } else if (dt < 0.019) { fast++; slow = Math.max(0, slow - 1); }
      if (slow > 40 && ratio > 1) { ratio = Math.max(1, ratio - 0.25); slow = 0; renderer.setPixelRatio(ratio); renderer.setSize(width, height, false); sizeBackdrop(); }
      else if (fast > 600 && ratio < maxRatio) { ratio = Math.min(maxRatio, ratio + 0.25); fast = 0; renderer.setPixelRatio(ratio); renderer.setSize(width, height, false); sizeBackdrop(); }
      field.render();
      backdrop.render(camera, moon.position, stage.yaw);
      renderer.render(scene, camera);
    },
  };
  return stage;
}
