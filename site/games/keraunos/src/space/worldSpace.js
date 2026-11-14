import * as THREE from 'three';
import { createPlanets } from '../fx/planets.js';
import { GRAVE_Z } from '../course.js';
import { createSpaceObjectsSync, SPACE_U } from './index.js';
import { pickShape } from './shapes.js';

// ゲームの中で宇宙空間の物を見るための world.js の差し替え（index.html は 2026-11-08 から既定で、space_game.html は常に、読み込みの対応表でこれを使う。
// index.html の ?space=0 と ?test=1 は今の world.js のまま）。この写しを使っている間は、src/fx/world.js を直しても既定のゲームには出ない。
// 遊びの作り（岩の数・大きさ・折り返し・当たり・削れ方・壊れ方・押し戻し）は src/fx/world.js と同じ。変えたのは描き方だけ：
//   近くの岩 → 細かさ4段の立体＋小さく見える物は板（nearRocks・impostors.near）
//   遠くの岩（340個）→ GPU の計算で動く数万個の小惑星帯（impostors.far）。小惑星帯の区間だけに出す
//   爆発の破片 → 同じ岩の部品。砕けた直後は割れ口が赤熱して冷える
//   撃たれた岩 → 当たった側が赤熱して冷える
//   漂う細かな小石 → 同じ部品の小さな岩。氷の粒と塵（motes）と帯の霞（belt glow）を足す
// 本採用のときは、この写しではなく world.js 自体を書き換える（手順は 組み込みの手引き.md）。

// 描画の道具（renderer）は createWorld に渡されないので、three の初期化を一度だけ見張って受け取る（このページの中だけ）
let theRenderer = null;
const origInit = THREE.WebGPURenderer.prototype.init;
THREE.WebGPURenderer.prototype.init = function patchedInit(...a) { theRenderer = this; return origInit.apply(this, a); };

const BELT_ROCK = [0.285, 0.27, 0.255]; // 小惑星帯の岩の色（scenes.js の値）。場面の色はこれとの比で掛ける

export function createWorld({ scene, sunDir }) {
  const group = new THREE.Group();
  scene.add(group);
  const camera = scene.children.find((o) => o.isPerspectiveCamera);
  const sunLight = () => scene.children.find((o) => o.isDirectionalLight && o.castShadow);

  // ---- 惑星（今の world.js と同じ） ----
  const sun = { value: sunDir.clone() };
  const time = { value: 0 };
  const planetSys = createPlanets(group, sun, time);
  const setPlanets = (list) => planetSys.set(list);
  setPlanets([
    { type: 'gas', pos: [5200, 1500, 14000], radius: 3400, tilt: 0.32, ring: true },
    { type: 'rocky', pos: [-17000, -5200, -3800], radius: 2400, tilt: 0.12 },
    { type: 'moon', pos: [9300, -1900, 11500], radius: 330 },
  ]);

  // ---- 宇宙空間の物（起動時に形の地図とインポスターを焼く。1秒前後） ----
  const space = createSpaceObjectsSync({
    renderer: theRenderer, scene, preset: 'game', farCount: 9000, shapeRes: 512,
    farCell: [3400, 1600, 3400], nearCut: 330, motes: true, moteCount: 9000, beltGlow: true,
    // 遠くの帯は景色：小さめの岩を広く散らし、行く手の筒（半径 260）は空ける。氷と金属は少なめ
    farOpts: { sizeRange: [0.8, 22], sizePow: 4.5, beltSigma: 420, corridor: 260, kindMix: [0.84, 0.09, 0.07] },
  });
  if (space.glow) space.glow.U.radius.value = 1500; // カメラの遠い面（1800）の内側
  space.setHaze(new THREE.Color(0.03, 0.034, 0.06), 160, 1700, 0.8);
  window.__spaceGame = space;

  // ---- 小惑星（数・大きさ・当たりは今の world.js と同じ） ----
  const ROCKS = 84;
  const CELL = 620;
  let seedA = 91731;
  const rnd = () => { seedA = (seedA * 16807) % 2147483647; return seedA / 2147483647; };
  const rocks = [];
  let rockCount = ROCKS;
  let rockScale = 1;
  let rockFilter = null;
  let kindMix = [0.8, 0.12, 0.08]; // 岩・氷・金属の割合（場面で変える）
  const pickKind = (r) => (r < kindMix[0] ? 0 : r < kindMix[0] + kindMix[1] ? 1 : 2);
  for (let i = 0; i < ROCKS; i++) {
    const big = rnd();
    const r = {
      base: new THREE.Vector3(rnd() * CELL, rnd() * CELL, rnd() * CELL),
      size: 0.8 + Math.pow(big, 5) * 42 + big * 2.5,
      axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
      spin: 0.05 + rnd() * 0.35,
      stretch: new THREE.Vector3(0.75 + rnd() * 0.5, 0.75 + rnd() * 0.5, 0.75 + rnd() * 0.5),
      hp: 0, hit: 0, deadUntil: 0, rel: new THREE.Vector3(), radius: 0,
      kr: rnd(), sr: rnd(), seed: rnd() * 100, heat: 0, hitDir: new THREE.Vector3(), q: new THREE.Quaternion(),
    };
    // 当たりの大きさは今と同じにするため、伸び縮みの平均を大きさに入れる
    r.vis = (r.stretch.x + r.stretch.y + r.stretch.z) / 3;
    rocks.push(r);
  }
  const wrap = (x, half) => ((x % (half * 2)) + half * 2) % (half * 2) - half;
  const shapeOf = (r) => { const k = pickKind(r.kr); return [pickShape(k, r.sr), k]; };

  // ---- 塵の線（速さと向きを見せる。今の world.js と同じ） ----
  let dustTint = [1, 1, 1];
  const DUST = 420;
  const DUST_HALF = 70;
  const dustBase = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST * 3; i++) dustBase[i] = rnd() * DUST_HALF * 2;
  const dustPos = new Float32Array(DUST * 6);
  const dustCol = new Float32Array(DUST * 6);
  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeom.setAttribute('color', new THREE.BufferAttribute(dustCol, 3).setUsage(THREE.DynamicDrawUsage));
  const dustMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const dust = new THREE.LineSegments(dustGeom, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 5;
  group.add(dust);

  // ---- 漂う細かな破片：金属の切れ端は今のまま。小石は宇宙空間の物の小さな岩にする ----
  const DEBRIS_HALF = 130;
  const shardGeo = (() => {
    const pts = [];
    let sd = 5581;
    const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const K = 6;
    for (let i = 0; i < K; i++) { const a = i / K * 6.2832; const m = 0.55 + r() * 0.75; pts.push([Math.cos(a) * m * 1.5, Math.sin(a) * m * 0.7]); }
    const pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);
    const T = 0.13;
    for (let i = 0; i < K; i++) {
      const p = pts[i]; const q = pts[(i + 1) % K];
      tri([0, 0, T], [p[0], p[1], T], [q[0], q[1], T]);
      tri([0, 0, -T], [q[0], q[1], -T], [p[0], p[1], -T]);
      tri([p[0], p[1], T], [p[0], p[1], -T], [q[0], q[1], -T]);
      tri([p[0], p[1], T], [q[0], q[1], -T], [q[0], q[1], T]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  })();
  const shardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.45, roughness: 0.55, envMapIntensity: 0.22, fog: false });
  const SHARDS = 150;
  const PEBBLES = 170;
  const shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, SHARDS);
  shardMesh.frustumCulled = false;
  shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(shardMesh);
  const debris = [];
  const SHARD_COLORS = [[0.045, 0.045, 0.05], [0.1, 0.1, 0.105], [0.11, 0.02, 0.015], [0.025, 0.025, 0.03]];
  for (let i = 0; i < SHARDS + PEBBLES; i++) {
    const shard = i < SHARDS;
    debris.push({
      shard, index: shard ? i : i - SHARDS,
      base: [rnd() * DEBRIS_HALF * 2, rnd() * DEBRIS_HALF * 2, rnd() * DEBRIS_HALF * 2],
      size: shard ? 0.2 + Math.pow(rnd(), 3) * 1.25 : 0.1 + Math.pow(rnd(), 3) * 1.3,
      axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
      spin: 0.15 + rnd() * (shard ? 1.3 : 0.5),
      ph: rnd() * 6.28, kr: rnd(), sr: rnd(), seed: rnd() * 100,
    });
    if (shard) { const c = SHARD_COLORS[i % SHARD_COLORS.length]; shardMesh.setColorAt(i, new THREE.Color(c[0], c[1], c[2])); }
  }
  if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
  let debrisShards = true;

  // ---- 破片：爆発で飛び散る小さな岩（今と同じ動き。割れ口が赤熱して冷える） ----
  const CHUNKS = 90;
  const chunks = [];
  for (let i = 0; i < CHUNKS; i++) chunks.push({ life: 0, far: [0, 0, 0], vel: [0, 0, 0], size: 0, axis: new THREE.Vector3(1, 0, 0), spin: 1, age: 0, seed: rnd() * 100, shape: 2, kind: 0 });
  let chunkCursor = 0;

  // ---- 当たり（今の world.js と同じ） ----
  const toC = new THREE.Vector3();
  const targets = [];
  const lists = [rocks, targets];
  function raycast(ax, ay, az, dx, dy, dz, len) {
    let best = null;
    let bestT = len;
    for (const list of lists) for (const r of list) {
      if (r.radius <= 0.5) continue;
      toC.set(r.rel.x - ax, r.rel.y - ay, r.rel.z - az);
      const proj = toC.x * dx + toC.y * dy + toC.z * dz;
      const perp2 = toC.lengthSq() - proj * proj;
      const rr = r.radius * r.radius;
      if (perp2 > rr) continue;
      const t = proj - Math.sqrt(rr - perp2);
      if (t < 0 && proj < 0) continue;
      const tt = Math.max(0, t);
      if (tt < bestT) { bestT = tt; best = r; }
    }
    return best ? { rock: best, dist: bestT, point: [ax + dx * bestT, ay + dy * bestT, az + dz * bestT] } : null;
  }
  function assistDir(ox, oy, oz, forward, maxAng) {
    let best = null;
    let bestA = Infinity;
    for (const t of targets) {
      if (!t.aim || t.radius <= 0.5) continue;
      const x = t.rel.x - ox; const y = t.rel.y - oy; const z = t.rel.z - oz;
      const d = Math.hypot(x, y, z) || 1;
      if (d > 400) continue;
      const c = (x * forward[0] + y * forward[1] + z * forward[2]) / d;
      if (c <= 0) continue;
      const a = Math.acos(Math.min(1, c)) - Math.atan(t.radius / d);
      if (a < maxAng && a < bestA) { bestA = a; best = { dir: [x / d, y / d, z / d], target: t }; }
    }
    return best;
  }
  function nearestAhead(forward, used, minDist = 0) {
    let best = null;
    let bestScore = Infinity;
    for (const t of targets) {
      if (!t.aim || t.radius <= 0.5 || used.includes(t)) continue;
      const d = t.rel.length();
      const along = (t.rel.x * forward[0] + t.rel.y * forward[1] + t.rel.z * forward[2]) / (d || 1);
      if (along < 0.35 || d > 320 || d < minDist) continue;
      const score = d * (2 - along) * 0.25;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    for (const r of rocks) {
      if (r.radius <= 1.0 || used.includes(r)) continue;
      const d = r.rel.length();
      const along = (r.rel.x * forward[0] + r.rel.y * forward[1] + r.rel.z * forward[2]) / (d || 1);
      if (along < 0.55 || d > 240 || d < minDist) continue;
      const score = d * (2 - along);
      if (score < bestScore) { bestScore = score; best = r; }
    }
    return best;
  }
  const qi = new THREE.Quaternion();
  function damage(rock, amount, state, P) {
    if (rock.onDamage) return rock.onDamage(amount, state);
    rock.hp -= amount;
    rock.hit = state.time + 0.12;
    // 撃たれた側（機体の方）が赤熱する：機体への向きを岩の座標へ直して持つ
    qi.copy(rock.q).invert();
    rock.hitDir.set(-rock.rel.x, -rock.rel.y, -rock.rel.z).normalize().applyQuaternion(qi);
    rock.heat = Math.min(1, rock.heat + 0.4);
    if (rock.hp > 0) return false;
    rock.deadUntil = state.time + 14;
    rock.hp = 0;
    const n = Math.min(26, 8 + Math.floor(rock.size * 1.2));
    const [shape, kind] = shapeOf(rock);
    for (let i = 0; i < n; i++) {
      const c = chunks[chunkCursor];
      chunkCursor = (chunkCursor + 1) % CHUNKS;
      const dx = rnd() - 0.5; const dy = rnd() - 0.5; const dz = rnd() - 0.5;
      const m = Math.hypot(dx, dy, dz) || 1;
      const sp = rock.size * (0.6 + rnd() * 1.6);
      c.far = [P[0] + rock.rel.x + dx / m * rock.size * 0.4, P[1] + rock.rel.y + dy / m * rock.size * 0.4, P[2] + rock.rel.z + dz / m * rock.size * 0.4];
      c.vel = [dx / m * sp, dy / m * sp, dz / m * sp];
      c.size = rock.size * (0.06 + rnd() * rnd() * 0.3);
      c.axis.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      c.spin = 0.5 + rnd() * 3;
      c.age = 0;
      c.life = 5 + rnd() * 3;
      // 破片は元の岩と同じ材質。割れ口の多い形にする
      c.kind = kind; c.shape = kind === 0 ? 2 : shape;
    }
    return true;
  }

  const q = new THREE.Quaternion();
  const near = space.near;
  const camVel = [0, 0, 0];
  let lastP = null;
  let lastState = null;
  function update(flight, state, forward, dt = 0) {
    const P = flight.pos;
    lastState = state;
    time.value = state.time;
    planetSys.update(P);
    // 場面の光と霞を宇宙空間の物へ写す
    const sl = sunLight();
    SPACE_U.sunDir.value.copy(sunDir).normalize();
    if (sl) { SPACE_U.sunColor.value.copy(sl.color); SPACE_U.sunPower.value = sl.intensity; }
    if (scene.fog) SPACE_U.haze.value.copy(scene.fog.color).multiplyScalar(0.55);

    near.begin();
    for (let ri = 0; ri < rocks.length; ri++) {
      const r = rocks[ri];
      if (ri >= rockCount) { r.radius = 0; continue; }
      const rs = r.size * rockScale;
      const x = wrap(r.base.x - P[0], CELL / 2);
      const y = wrap(r.base.y - P[1], CELL / 2);
      const z = wrap(r.base.z - P[2], CELL / 2);
      const d = Math.hypot(x, y, z);
      const edge = Math.min(1, Math.max(0, (CELL / 2 - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) / 140));
      const nearK = Math.min(1, Math.max(0, (d - rs - 2) / 6));
      const keep = rockFilter ? rockFilter(x + P[0], y + P[1], z + P[2], rs) : 1;
      r.q.setFromAxisAngle(r.axis, state.time * r.spin);
      r.rel.set(x, y, z);
      r.heat *= Math.exp(-dt * 1.4);
      if (r.deadUntil > state.time) { r.radius = 0; continue; }
      if (r.hp <= 0) r.hp = rs * 1.4;
      const shown = rs * nearK * keep * (edge > 0.001 ? 1 : 0);
      r.radius = shown * 1.15;
      if (shown < 1e-3) continue;
      const shake = Math.max(0, r.hit - state.time) * 2.2;
      const [shape, kind] = shapeOf(r);
      near.add(x + Math.sin(state.time * 90) * shake, y, z, shown * r.vis, r.q.x, r.q.y, r.q.z, r.q.w, shape, kind, r.seed,
        1 - edge * edge * (3 - 2 * edge), r.hitDir.x, r.hitDir.y, r.hitDir.z, r.heat);
    }
    // 漂う小石
    for (const b of debris) {
      if (b.shard) continue;
      const x = wrap(b.base[0] - P[0], DEBRIS_HALF);
      const y = wrap(b.base[1] - P[1], DEBRIS_HALF);
      const z = wrap(b.base[2] - P[2], DEBRIS_HALF);
      const d = Math.hypot(x, y, z);
      if (x * forward[0] + y * forward[1] + z * forward[2] < -d * 0.3 - 10) continue;
      const edge = Math.min(1, Math.max(0, (DEBRIS_HALF - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) / 30));
      const clear = Math.min(1, Math.max(0, (d - 6) / 10));
      const sc = b.size * edge * clear;
      if (sc < 1e-3) continue;
      q.setFromAxisAngle(b.axis, state.time * b.spin + b.ph);
      const [shape, kind] = shapeOf(b);
      near.add(x, y, z, sc, q.x, q.y, q.z, q.w, shape, kind, b.seed, 0);
    }
    // 爆発の破片：割れ口は飛び出した直後ほど熱い
    for (const c of chunks) {
      if (c.life <= 0 || c.age >= c.life) continue;
      c.age += dt;
      c.far[0] += c.vel[0] * dt; c.far[1] += c.vel[1] * dt; c.far[2] += c.vel[2] * dt;
      q.setFromAxisAngle(c.axis, c.age * c.spin);
      const s = Math.max(1e-3, c.size * Math.min(1, (c.life - c.age) * 1.5));
      const heat = Math.max(0, 1 - c.age / 1.6);
      near.add(c.far[0] - P[0], c.far[1] - P[1], c.far[2] - P[2], s, q.x, q.y, q.z, q.w, c.shape, c.kind, c.seed, 0, 0, 0, 0, heat * heat);
    }
    if (camera) near.end(camera);

    // 遠くの小惑星帯：小惑星帯の区間だけに出す（墓場から先は消す）
    if (space.far && camera) {
      const k = sceneIdx === 0 ? Math.min(1, Math.max(0, (GRAVE_Z - 150 - P[2]) / 350)) : farSceneK;
      space.far.U.scaleK.value = k;
      space.far.mesh.visible = k > 0.001;
      if (k > 0.001) space.far.update(theRenderer, camera, P, state.time, forward);
      if (space.glow) space.glow.U.k.value = k;
    }
    // 氷の粒と塵：機体の速さの向きに少し伸びる
    if (lastP && dt > 0) { camVel[0] = (P[0] - lastP[0]) / dt; camVel[1] = (P[1] - lastP[1]) / dt; camVel[2] = (P[2] - lastP[2]) / dt; }
    lastP = [P[0], P[1], P[2]];
    if (space.motes) space.motes.update(P, camVel);

    // 金属の切れ端（今のまま）
    let shardUsed = 0;
    const dummy = _dummy;
    for (const b of debris) {
      if (!b.shard || !debrisShards) continue;
      const x = wrap(b.base[0] - P[0], DEBRIS_HALF);
      const y = wrap(b.base[1] - P[1], DEBRIS_HALF);
      const z = wrap(b.base[2] - P[2], DEBRIS_HALF);
      const d = Math.hypot(x, y, z);
      if (x * forward[0] + y * forward[1] + z * forward[2] < -d * 0.3 - 10) continue;
      const edge = Math.min(1, Math.max(0, (DEBRIS_HALF - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) / 30));
      const clear = Math.min(1, Math.max(0, (d - 6) / 10));
      const sc = b.size * edge * clear;
      if (sc < 1e-3) continue;
      dummy.position.set(x, y, z);
      dummy.quaternion.setFromAxisAngle(b.axis, state.time * b.spin + b.ph);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      shardMesh.setMatrixAt(shardUsed, dummy.matrix);
      if (shardMesh.instanceColor) { const a = shardMesh.instanceColor.array; const k = b.index % SHARD_COLORS.length; const c = SHARD_COLORS[k]; a[shardUsed * 3] = c[0]; a[shardUsed * 3 + 1] = c[1]; a[shardUsed * 3 + 2] = c[2]; }
      shardUsed++;
    }
    shardMesh.count = shardUsed;
    shardMesh.instanceMatrix.needsUpdate = true;
    if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;

    // 塵の線
    const speed = flight.speed;
    const tail = 0.004 + 0.008 * state.boostAmount;
    const bright = 0.14 + 0.16 * state.boostAmount;
    for (let i = 0; i < DUST; i++) {
      const j = i * 3;
      const x = wrap(dustBase[j] - P[0], DUST_HALF);
      const y = wrap(dustBase[j + 1] - P[1], DUST_HALF);
      const z = wrap(dustBase[j + 2] - P[2], DUST_HALF);
      const k = i * 6;
      dustPos[k] = x; dustPos[k + 1] = y; dustPos[k + 2] = z;
      dustPos[k + 3] = x + forward[0] * speed * tail;
      dustPos[k + 4] = y + forward[1] * speed * tail;
      dustPos[k + 5] = z + forward[2] * speed * tail;
      const dd = Math.hypot(x, y, z) / DUST_HALF;
      const f = Math.max(0, 1 - dd) * bright * (dd < 0.03 ? 0 : 1);
      dustCol[k] = 0.72 * f * dustTint[0]; dustCol[k + 1] = 0.82 * f * dustTint[1]; dustCol[k + 2] = 1.0 * f * dustTint[2];
      dustCol[k + 3] = 0; dustCol[k + 4] = 0; dustCol[k + 5] = 0;
    }
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.color.needsUpdate = true;
  }
  const _dummy = new THREE.Object3D();

  function rockHit(r) {
    for (const k of rocks) {
      if (k.radius <= 0.5) continue;
      const d = k.rel.length();
      if (d < k.radius * 0.82 + r) return { rock: k, push: [-k.rel.x / (d || 1), -k.rel.y / (d || 1), -k.rel.z / (d || 1)], depth: k.radius * 0.82 + r - d };
    }
    return null;
  }

  // シーンの切り替え：惑星・岩の数と大きさと色・塵の色・恒星の向き。場面に合わせて岩・氷・金属の割合を変える
  let sceneIdx = 0;
  let farSceneK = 1;
  function setScene(cfg) {
    setPlanets(cfg.planets);
    rockCount = Math.min(ROCKS, cfg.rocks.count);
    rockScale = cfg.rocks.scale;
    sceneIdx = ['小惑星帯', '惑星の軌道', '赤い星雲', '氷の帯'].indexOf(cfg.name);
    kindMix = cfg.name === '氷の帯' ? [0.15, 0.8, 0.05] : cfg.name === '赤い星雲' ? [0.9, 0.0, 0.1] : [0.8, 0.12, 0.08];
    farSceneK = cfg.rocks.count / ROCKS;
    setTint(cfg.rocks.color);
    dustTint = cfg.dust || [1, 1, 1];
    debrisShards = cfg.debrisShards !== false;
    sun.value.copy(cfg.sunDirV);
    for (const r of rocks) { r.hp = 0; r.deadUntil = 0; r.heat = 0; }
  }
  function setTint(c) { SPACE_U.rockTint.value.setRGB(c[0] / BELT_ROCK[0], c[1] / BELT_ROCK[1], c[2] / BELT_ROCK[2]); }
  function setRegion(sunDirV, rockC, dustC) {
    sun.value.copy(sunDirV);
    setTint(rockC);
    dustTint = dustC;
  }
  // 確認用：岩と破片の状態を読む（熱・当たり）
  space.debug = {
    rocks, chunks,
    // 画面の中で一番大きく見える岩（前方・半径つき）
    biggest() { let best = null; let bs = 0; for (const r of rocks) { if (r.radius <= 1 || r.rel.z < 10) continue; const s = r.radius / r.rel.length(); if (s > bs) { bs = s; best = r; } } return best; },
    heat(r) { if (!r || !lastState) return; damage(r, 0, lastState, lastP || [0, 0, 0]); r.heat = 1; },
    smash(r) { if (!r || !lastState) return; damage(r, 1e9, lastState, lastP || [0, 0, 0]); },
  };
  return { update, raycast, nearestAhead, damage, targets, assistDir, setScene, setRegion, rockHit, setRockFilter(f) { rockFilter = f; } };
}
