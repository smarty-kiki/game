import * as THREE from 'three';
import { createShapeAtlas, SHAPES, BOUND } from './shapes.js';
import { createDetailAtlas } from './detailAtlas.js';
import { createRockShading, SPACE_U, OPTS } from './rockShading.js';
import { createNearRocks } from './nearRocks.js';
import { bakeImpostors, createNearImpostors, createFarField } from './impostors.js';
import { createMotes, createBeltGlow } from './motes.js';

// 宇宙空間の物（隕石・小惑星帯・残骸の岩・氷や金属の塊・漂う塵と氷の粒）をまとめて作る入口。
// 起動時に GPU で形の地図とインポスターの画像を焼く（ファイルは読まない）。
//
//   const space = await createSpaceObjects({ renderer, scene });
//   毎コマ：
//     space.near.begin(); space.near.add(...岩ごと...); space.near.end(camera);
//     space.far.update(renderer, camera, origin, time);   // origin = 世界の中での描く座標の原点（ゲームは flight.pos）
//     space.motes.update(origin, cameraVelocity);
//   場面：space.setSun(dir, color, power)、space.setHaze(color, near, far, max)
export async function createSpaceObjects(opts) {
  const space = createSpaceObjectsSync(opts);
  // 初めて見えた段で材質を組み立てると一瞬止まるので、全部の段を1つずつ見える状態にして先に組み立てる
  if (opts.renderer.compileAsync && opts.warmCamera) await space.warmUp(opts.warmCamera);
  return space;
}

// 同期版（ゲームの createWorld のように待てない所から作る）。warmUp(camera) は後から呼べる
export function createSpaceObjectsSync({
  renderer, scene, preset = 'lab', farCount = 40000, shapeRes = 640, impostorFrames = 10, impostorPx = 72,
  farCell = [9000, 2600, 9000], nearCut = 380, motes = true, moteCount = 16000, beltGlow = true, farOpts = {},
  detailRes = 1536, detailSlots = 2,
}) {
  const t0 = performance.now();
  const group = new THREE.Group();
  group.name = 'spaceObjects';
  scene.add(group);
  const atlas = createShapeAtlas(renderer, { res: shapeRes, pad: Math.round(shapeRes / 64) });
  const imp = bakeImpostors(renderer, atlas, { frames: impostorFrames, framePx: impostorPx });
  // 大きく寄った岩だけの細かい形の地図（近い岩ごとに焼く。detailSlots=0 で使わない）
  const detail = detailSlots > 0 ? createDetailAtlas(renderer, atlas, { res: detailRes, pad: Math.round(detailRes / 128), slots: detailSlots }) : null;
  const shading = createRockShading(atlas, detail);
  const nearImp = createNearImpostors({ group, shading, imp });
  const near = createNearRocks({ group, shading, impostorNear: nearImp, preset, renderer, detail });
  const far = farCount > 0 ? createFarField({ group, shading, imp, count: farCount, cell: farCell, nearCut, useCompute: !renderer.backend.isWebGLBackend, ...farOpts }) : null;
  const mo = motes ? createMotes({ group, count: moteCount }) : null;
  const glow = beltGlow ? createBeltGlow({ group }) : null;
  const bakeMs = performance.now() - t0;
  return {
    group, near, far, motes: mo, glow, nearImp, atlas, imp, detail, shading, shapes: SHAPES, BOUND, U: SPACE_U, bakeMs,
    async warmUp(camera) {
      const parts = [...near.lods.flatMap((l) => l.parts.map((p) => p.mesh)), ...nearImp.parts.map((p) => p.mesh)];
      for (const m of parts) { m.geometry.instanceCount = 1; m.visible = true; }
      try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn('compileAsync', e); }
      for (const m of parts) { m.geometry.instanceCount = 0; m.visible = false; }
    },
    setSun(dir, color, power) {
      SPACE_U.sunDir.value.copy(dir).normalize();
      if (color) SPACE_U.sunColor.value.copy(color);
      if (power !== undefined) SPACE_U.sunPower.value = power;
    },
    setHaze(color, nearD, farD, max = 0.85) {
      SPACE_U.haze.value.copy(color);
      SPACE_U.hazeNear.value = nearD; SPACE_U.hazeFar.value = farD; SPACE_U.hazeMax.value = max;
    },
    dispose() { atlas.dispose(); imp.dispose(); if (detail) detail.dispose(); scene.remove(group); },
  };
}
export { SHAPES, SPACE_U, BOUND, OPTS };
