import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPlanets } from './planets.js';
import {
  Fn, uniform, texture, texture3D, attribute, varying, positionGeometry, normalGeometry, modelViewMatrix, screenCoordinate, materialColor,
  output, diffuseColor, normalView, positionView, positionViewDirection, vec2, vec3, vec4, float, abs, pow, max, mix, clamp, dot, fract,
  length, normalize, smoothstep, If, Discard,
} from 'three/tsl';
import { SURF_ON } from './surface.js';
import { noise3D } from './skyNoise.js';

// 広い宇宙。機体は常に原点にいて、世界の座標 flight.pos から周りの物の位置を計算する。
// 惑星は実際の距離と半径から見かけの大きさを求めて遠くに描く（近づくと大きくなる）。
// 小惑星と塵は機体のまわりの立方体の中で座標を折り返すので、どこまで飛んでも尽きない。


// 位置だけから決まる値（同じ位置は同じ高さになり、細かさの違う形でも輪郭がそろう）
const hash3 = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
function vnoise(x, y, z) {
  const xi = Math.floor(x); const yi = Math.floor(y); const zi = Math.floor(z);
  let fx = x - xi; let fy = y - yi; let fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), fx), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), fx), fy),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), fx), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), fx), fy),
    fz,
  );
}
// 岩ごとの窪みの一覧（向きと大きさ）
function craterList(seed) {
  let s = Math.floor(seed * 1000) + 11;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const list = [];
  for (let i = 0; i < 26; i++) {
    const z = r() * 2 - 1; const t = r() * 6.2832; const c = Math.sqrt(1 - z * z);
    const big = r();
    list.push({ x: c * Math.cos(t), y: z, z: c * Math.sin(t), r: 0.1 + big * big * 0.42, d: 0.35 + r() * 0.4 });
  }
  return list;
}
function rockHeight(p, seed, craters) {
  const n = (f, o) => vnoise(p.x * f + seed * 3.1 + o, p.y * f - seed * 1.7 + o, p.z * f + seed * 2.3 - o);
  // 大きな塊（割れた面が残るように、谷を鋭く）
  let h = (n(1.1, 0) - 0.5) * 0.55;
  const ridge = 1 - Math.abs(n(2.1, 5) * 2 - 1);
  h -= ridge * ridge * ridge * 0.18;
  h += (n(4.7, 9) - 0.5) * 0.09 + (n(9.5, 13) - 0.5) * 0.045 + (n(21, 17) - 0.5) * 0.02;
  for (const c of craters) {
    const dx = p.x - c.x; const dy = p.y - c.y; const dz = p.z - c.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / c.r;
    if (d > 1.7) continue;
    const k = c.r * c.d;
    if (d < 1) h -= (1 - d * d) * k;
    h += Math.exp(-((d - 1.05) ** 2) / 0.06) * k * 0.3;
  }
  return h;
}
function rockGeometry(seed, detail = 5) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position;
  const p = new THREE.Vector3();
  const craters = craterList(seed);
  const sx = 0.72 + 0.45 * Math.abs(Math.sin(seed * 1.7));
  const sz = 0.62 + 0.55 * Math.abs(Math.cos(seed * 2.3));
  const cav = new Float32Array(pos.count);
  // 割れた面：岩ごとに2〜4枚の平面で削る（割れ口の平らな面と鋭い縁が、丸い石ではなく砕けた岩に見せる）
  let ps = Math.floor(seed * 977) + 5;
  const pr = () => { ps = (ps * 16807) % 2147483647; return ps / 2147483647; };
  const cuts = [];
  for (let k = 0, n = 2 + Math.floor(pr() * 3); k < n; k++) {
    const z = pr() * 2 - 1; const t = pr() * 6.2832; const c = Math.sqrt(1 - z * z);
    cuts.push({ x: c * Math.cos(t), y: z, z: c * Math.sin(t), d: 0.62 + pr() * 0.22 });
  }
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    const h = rockHeight(p, seed, craters);
    let r = 1 + h;
    for (const c of cuts) {
      const dn = p.x * c.x + p.y * c.y + p.z * c.z;
      if (dn > 0.05) {
        // 割れ面にもわずかな凹凸を残す
        const lim = c.d / dn + (vnoise(p.x * 9 + seed, p.y * 9, p.z * 9) - 0.5) * 0.03;
        if (r > lim) r = lim;
      }
    }
    cav[i] = Math.max(0, Math.min(1, 0.72 + h * 1.5));
    pos.setXYZ(i, p.x * r * sx, p.y * r, p.z * r * sz);
  }
  g.setAttribute('aCav', new THREE.BufferAttribute(cav, 1));
  g.computeVertexNormals();
  return g;
}

export function createWorld({ scene, sunDir }) {
  const group = new THREE.Group();
  scene.add(group);

  // ---- 惑星 ----
  const sun = { value: sunDir.clone() };
  const time = { value: 0 };
  const planetSys = createPlanets(group, sun, time);
  const setPlanets = (list) => planetSys.set(list);
  setPlanets([
    { type: 'gas', pos: [5200, 1500, 14000], radius: 3400, tilt: 0.32, ring: true },
    { type: 'rocky', pos: [-17000, -5200, -3800], radius: 2400, tilt: 0.12 },
    { type: 'moon', pos: [9300, -1900, 11500], radius: 330 },
  ]);

  // ---- 小惑星 ----
  const ROCKS = 84;
  const CELL = 620;
  const rockTex = new THREE.TextureLoader().load('./assets/env/rock_detail.jpg');
  rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;
  rockTex.colorSpace = THREE.NoColorSpace;
  rockTex.anisotropy = 4;
  const rockHaze = uniform(new THREE.Color(0.02, 0.02, 0.04));
  const rockMat = new THREE.MeshStandardNodeMaterial({ color: 0x3a342e, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.1, fog: false });
  {
    const rockN = noise3D();
    // 頂点の値：物の座標の位置と法線（同じ物を並べる前の値）、窪みの暗さ、遠くから現れる量
    const vRockP = varying(positionGeometry, 'vRockP');
    const vRockN = varying(normalGeometry, 'vRockN');
    const vRockCav = varying(attribute('aCav', 'float'), 'vRockCav');
    const vHide = varying(attribute('aHide', 'float'), 'vHide');
    // 物の座標から視点の座標への回転（並べる行列の大きさを1列目の長さで割る）。行列は渡せないので3列に分ける
    const a0 = attribute('aIM0', 'vec3'); const a1 = attribute('aIM1', 'vec3'); const a2 = attribute('aIM2', 'vec3');
    const sc = max(length(a0), 1e-5);
    const toView = (c) => modelViewMatrix.mul(vec4(c, 0.0)).xyz.div(sc);
    const vR0 = varying(toView(a0), 'vRockR0'); const vR1 = varying(toView(a1), 'vRockR1'); const vR2 = varying(toView(a2), 'vRockR2');
    // 3方向から画像を貼る（UV が要らず、継ぎ目も出ない）。大小2段を重ねて、遠くも近くも面に細部を残す
    const rockW0 = pow(abs(normalize(vRockN)), vec3(5.0));
    const rockW = rockW0.div(rockW0.x.add(rockW0.y).add(rockW0.z));
    const rockTri = (q) => texture(rockTex, q.yz).rgb.mul(rockW.x).add(texture(rockTex, q.xz).rgb.mul(rockW.y)).add(texture(rockTex, q.xy).rgb.mul(rockW.z));
    const rockA = rockTri(vRockP.mul(0.83).add(0.17));
    const rockB = rockTri(vRockP.mul(3.7).add(0.61));
    const rockC = rockTri(vRockP.mul(0.19).add(0.37));
    const nA = texture3D(rockN, vRockP.mul(0.55).add(0.3));
    const nB = texture3D(rockN, vRockP.mul(2.3).add(nA.rgb.mul(0.2)));
    // 岩の粒（光をきらりと返す鉱物）
    const rockSpark = smoothstep(0.80, 0.96, texture3D(rockN, vRockP.mul(11.0)).a).mul(smoothstep(0.5, 0.7, nB.r));
    rockMat.colorNode = Fn(() => {
      // 遠くから現れる岩：大きさは変えず、少しずつ姿を出す。MSAA の網目（alphaToCoverage）で透かすので、点描の粒が見えない
      // （?surface=0 では今までの点描）
      if (!SURF_ON) {
        const dth = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
        If(vHide.greaterThan(0.0).and(dth.lessThan(vHide)), () => { Discard(); });
      }
      const m = rockA.b.mul(0.6).add(rockB.b.mul(0.4));
      const big = smoothstep(0.32, 0.68, rockC.b);
      const tint = mix(vec3(1.06, 1.0, 0.92), vec3(0.86, 0.87, 0.92), big);
      const c = materialColor.mul(tint).mul(m.mul(m).mul(2.5).add(m.mul(0.45)).add(0.2)).mul(mix(0.5, 1.1, vRockCav)).toVar();
      // 大きな色の斑（酸化した赤茶・灰・暗い玄武岩）と、細い割れ目の網
      c.mulAssign(mix(vec3(0.78, 0.80, 0.84), vec3(1.22, 1.04, 0.86), smoothstep(0.3, 0.75, nA.r)));
      c.mulAssign(mix(1.0, 0.62, smoothstep(0.55, 0.8, nA.g)));
      const crackL = float(1.0).sub(abs(nB.b.mul(2.0).sub(1.0)));
      c.mulAssign(float(1.0).sub(smoothstep(0.93, 0.99, crackL).mul(0.7)));
      return c;
    })();
    if (SURF_ON) { rockMat.alphaToCoverage = true; rockMat.opacityNode = float(1.0).sub(vHide); }
    // 画像の傾きを物の座標で足し、物の回転を通して視点の座標へ戻す
    rockMat.normalNode = Fn(() => {
      const g = rockA.mul(2.0).sub(1.0).mul(0.95).add(rockB.mul(2.0).sub(1.0).mul(0.65));
      const onorm = normalize(vRockN);
      const tx = vec3(0.0, g.x, g.y).mul(rockW.x).add(vec3(g.x, 0.0, g.y).mul(rockW.y)).add(vec3(g.x, g.y, 0.0).mul(rockW.z));
      const n = normalize(onorm.sub(tx.mul(1.25)));
      return normalize(vR0.mul(n.x).add(vR1.mul(n.y)).add(vR2.mul(n.z)));
    })();
    rockMat.outputNode = Fn(() => {
      // ライトランプ：影の中は冷たく深く、日向の頂は少し明るく。縁に宙の光が回る
      const rl = dot(output.rgb, vec3(0.3, 0.55, 0.15));
      const c = output.rgb.mul(mix(vec3(0.72, 0.78, 1.0), vec3(1.10, 1.02, 0.92), smoothstep(0.01, 0.34, rl))).toVar();
      const nv = clamp(dot(normalView, positionViewDirection), 0.0, 1.0);
      c.addAssign(diffuseColor.rgb.mul(pow(nv.oneMinus(), 3.0)).mul(0.5));
      c.addAssign(vec3(1.0, 0.95, 0.85).mul(rockSpark).mul(rl).mul(2.5));
      // かすみ：遠い岩ほど空の色へ溶ける
      c.assign(mix(c, rockHaze, smoothstep(120.0, 420.0, length(positionView)).mul(0.75)));
      return vec4(c, output.a);
    })();
  }
  // 岩の材質が物の回転を読めるよう、並べる行列の3列を頂点の値としても渡す（同じ配列を見るので、行列を書き換えたら一緒に送り直す）
  const rockInstanced = (m) => {
    const ib = new THREE.InstancedInterleavedBuffer(m.instanceMatrix.array, 16, 1);
    for (let k = 0; k < 3; k++) m.geometry.setAttribute(`aIM${k}`, new THREE.InterleavedBufferAttribute(ib, 3, k * 4));
    let seen = -1;
    m.onBeforeRender = () => { if (seen !== m.instanceMatrix.version) { seen = m.instanceMatrix.version; ib.needsUpdate = true; } };
    return m;
  };
  // 形は3種×細かさ3段。岩の見かけの大きさで段を選び、使う段の分だけ描く（隠した岩の三角形も描かない）
  const ROCK_HI_MAX = 2;
  const rockSets = [1.3, 4.1, 7.7].map((seed) => {
    const lods = [[20, ROCK_HI_MAX], [7, Math.ceil(ROCKS / 3)], [3, Math.ceil(ROCKS / 3)]].map(([detail, cap]) => {
      const m = rockInstanced(new THREE.InstancedMesh(rockGeometry(seed, detail), rockMat, cap));
      m.geometry.setAttribute('aHide', new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
      m.frustumCulled = false;
      // 岩は影を受けるだけ（落とす分の描画を省く）
      m.castShadow = false;
      m.receiveShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      group.add(m);
      return m;
    });
    return { lods, used: [0, 0, 0] };
  });
  let seedA = 91731;
  const rnd = () => { seedA = (seedA * 16807) % 2147483647; return seedA / 2147483647; };
  const rocks = [];
  let rockCount = ROCKS;   // シーンで使う岩の数（残りは隠す）
  let rockScale = 1;       // シーンで岩の大きさにかける倍率
  let rockFilter = null;   // 場所ごとに岩を小さくする量を返す関数（基地の範囲を空ける）
  for (let i = 0; i < ROCKS; i++) {
    const big = rnd();
    rocks.push({
      set: rockSets[i % 3],
      base: new THREE.Vector3(rnd() * CELL, rnd() * CELL, rnd() * CELL),
      size: 0.8 + Math.pow(big, 5) * 42 + big * 2.5,
      axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
      spin: 0.05 + rnd() * 0.35,
      stretch: new THREE.Vector3(0.75 + rnd() * 0.5, 0.75 + rnd() * 0.5, 0.75 + rnd() * 0.5),
      hp: 0, hit: 0, deadUntil: 0, rel: new THREE.Vector3(), radius: 0,
    });
  }
  const dummy = new THREE.Object3D();
  const wrap = (x, half) => ((x % (half * 2)) + half * 2) % (half * 2) - half;

  // ---- 塵：進む向きへ流れる線で、速さと向きを見せる ----
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

  // 遠くを漂う小さな岩の群れ（当たり判定なし。景色の奥行きを出す）
  const FAR_N = 340;
  const FAR_CELL = 1400;
  const farSets = [5.3, 8.1].map((seed) => {
    const m = rockInstanced(new THREE.InstancedMesh(rockGeometry(seed, 1), rockMat, FAR_N / 2));
    m.geometry.setAttribute('aHide', new THREE.InstancedBufferAttribute(new Float32Array(FAR_N / 2), 1));
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.count = 0;
    group.add(m);
    return m;
  });
  const farRocks = [];
  for (let i = 0; i < FAR_N; i++) {
    const t = rnd();
    farRocks.push({ set: i % 2, base: [rnd() * FAR_CELL, rnd() * FAR_CELL * 0.5, rnd() * FAR_CELL], size: 0.6 + t * t * t * 14, axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), spin: 0.05 + rnd() * 0.3 });
  }

  // 漂う細かな破片：機体のまわりの立方体で折り返す。金属の切れ端は回りながら日の光を返し、小石は奥行きを見せる（当たり判定なし）
  const DEBRIS_HALF = 130;
  const shardGeo = (() => {
    // 不揃いな薄い板
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
  const pebbleMesh = rockInstanced(new THREE.InstancedMesh(rockGeometry(3.3, 0), rockMat, PEBBLES));
  pebbleMesh.geometry.setAttribute('aHide', new THREE.InstancedBufferAttribute(new Float32Array(PEBBLES), 1));
  pebbleMesh.frustumCulled = false;
  pebbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(shardMesh, pebbleMesh);
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
      ph: rnd() * 6.28,
    });
    if (shard) { const c = SHARD_COLORS[i % SHARD_COLORS.length]; shardMesh.setColorAt(i, new THREE.Color(c[0], c[1], c[2])); }
  }
  if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;
  let debrisShards = true;

  // 破片：爆発で飛び散る小さな岩
  const CHUNKS = 90;
  const chunkMesh = rockInstanced(new THREE.InstancedMesh(rockGeometry(2.9, 2), rockMat, CHUNKS));
  chunkMesh.geometry.setAttribute('aHide', new THREE.InstancedBufferAttribute(new Float32Array(CHUNKS), 1));
  chunkMesh.frustumCulled = false;
  chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(chunkMesh);
  const chunks = [];
  for (let i = 0; i < CHUNKS; i++) chunks.push({ life: 0, far: [0, 0, 0], vel: [0, 0, 0], size: 0, axis: new THREE.Vector3(1, 0, 0), spin: 1, age: 0 });
  let chunkCursor = 0;

  // 線分 a→b（機体からの相対位置）が最初に当たる岩を返す
  const seg = new THREE.Vector3();
  const toC = new THREE.Vector3();
  // 岩のほかに当たる物（敵の当たり判定の球）。rel・radius・size と onDamage を持つ
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

  // 狙える敵が、origin から forward のまわり maxAng 以内にあれば、その中心への向きを返す（ツインの補正と照準の色）
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
      // 敵の見かけの大きさの分だけ、許す角度を広げる
      const a = Math.acos(Math.min(1, c)) - Math.atan(t.radius / d);
      if (a < maxAng && a < bestA) { bestA = a; best = { dir: [x / d, y / d, z / d], target: t }; }
    }
    return best;
  }
  function nearestAhead(forward, used, minDist = 0) {
    let best = null;
    let bestScore = Infinity;
    // 敵は岩より先に狙う（距離を短く見積もる）
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

  // 岩を削る。壊れたら true
  function damage(rock, amount, state, P) {
    if (rock.onDamage) return rock.onDamage(amount, state);
    rock.hp -= amount;
    rock.hit = state.time + 0.12;
    if (rock.hp > 0) return false;
    rock.deadUntil = state.time + 14;
    rock.hp = 0;
    const n = Math.min(26, 8 + Math.floor(rock.size * 1.2));
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
    }
    return true;
  }

  function update(flight, state, forward, dt = 0) {
    const P = flight.pos;
    time.value = state.time;
    planetSys.update(P);
    if (scene.fog) rockHaze.value.copy(scene.fog.color).multiplyScalar(0.55);

    for (const st of rockSets) st.used.fill(0);
    for (let ri = 0; ri < rocks.length; ri++) {
      const r = rocks[ri];
      if (ri >= rockCount) { r.radius = 0; continue; }
      const rs = r.size * rockScale;
      const x = wrap(r.base.x - P[0], CELL / 2);
      const y = wrap(r.base.y - P[1], CELL / 2);
      const z = wrap(r.base.z - P[2], CELL / 2);
      const d = Math.hypot(x, y, z);
      // 折り返しの境目で急に現れないよう遠くで小さくし、機体に重なる近さでも小さくする
      // 折り返しの境目では小さくせず、遠いかすみの中で点描から姿を出す（境目の 140 手前から）
      const edge = Math.min(1, Math.max(0, (CELL / 2 - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) / 140));
      const near = Math.min(1, Math.max(0, (d - rs - 2) / 6));
      const keep = rockFilter ? rockFilter(x + P[0], y + P[1], z + P[2], rs) : 1;
      dummy.position.set(x, y, z);
      dummy.quaternion.setFromAxisAngle(r.axis, state.time * r.spin);
      r.rel.set(x, y, z);
      if (r.deadUntil > state.time) { r.radius = 0; continue; }
      if (r.hp <= 0) r.hp = rs * 1.4;
      const shown = rs * near * keep * (edge > 0.001 ? 1 : 0);
      r.radius = shown * 1.15;
      if (shown < 1e-3) continue;
      // 当たった瞬間に少し揺れる
      const shake = Math.max(0, r.hit - state.time) * 2.2;
      dummy.position.x += Math.sin(state.time * 90) * shake;
      dummy.scale.set(shown * r.stretch.x, shown * r.stretch.y, shown * r.stretch.z);
      dummy.updateMatrix();
      // 見かけの大きさで細かさを選ぶ（一番細かい段は数に上限があり、あふれたら1段下げる）
      const seen = shown / Math.max(1, d - shown);
      let li = seen > 0.22 ? 0 : seen > 0.05 ? 1 : 2;
      if (li === 0 && r.set.used[0] >= ROCK_HI_MAX) li = 1;
      const lm = r.set.lods[li];
      lm.geometry.attributes.aHide.array[r.set.used[li]] = 1 - edge * edge * (3 - 2 * edge);
      lm.setMatrixAt(r.set.used[li]++, dummy.matrix);
    }
    for (const st of rockSets) {
      st.lods.forEach((m, i) => { m.count = st.used[i]; m.instanceMatrix.needsUpdate = st.used[i] > 0; m.geometry.attributes.aHide.needsUpdate = st.used[i] > 0; });
    }
    const farUsed = [0, 0];
    for (const r of farRocks) {
      const x = wrap(r.base[0] - P[0], FAR_CELL / 2);
      const y = wrap(r.base[1] - P[1], FAR_CELL / 4);
      const z = wrap(r.base[2] - P[2], FAR_CELL / 2);
      const d = Math.hypot(x, y, z);
      // 見えない後ろの岩は描かない
      if (x * forward[0] + y * forward[1] + z * forward[2] < -d * 0.25 - 40) continue;
      // 道のすぐそばには置かず、折り返しの境目では小さくする
      const edge = Math.min(1, Math.max(0, (FAR_CELL / 2 - Math.max(Math.abs(x), Math.abs(z))) / 120));
      const clear = Math.min(1, Math.max(0, (d - 70) / 60));
      const keep = rockFilter ? rockFilter(x + P[0], y + P[1], z + P[2], r.size) : 1;
      const sc = r.size * rockScale * edge * clear * keep;
      if (sc < 1e-3) continue;
      dummy.position.set(x, y, z);
      dummy.quaternion.setFromAxisAngle(r.axis, state.time * r.spin);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      farSets[r.set].setMatrixAt(farUsed[r.set]++, dummy.matrix);
    }
    farSets.forEach((m, i) => { m.count = farUsed[i]; m.instanceMatrix.needsUpdate = true; });

    let shardUsed = 0;
    let pebbleUsed = 0;
    for (const b of debris) {
      if (b.shard && !debrisShards) continue;
      const x = wrap(b.base[0] - P[0], DEBRIS_HALF);
      const y = wrap(b.base[1] - P[1], DEBRIS_HALF);
      const z = wrap(b.base[2] - P[2], DEBRIS_HALF);
      const d = Math.hypot(x, y, z);
      if (x * forward[0] + y * forward[1] + z * forward[2] < -d * 0.3 - 10) continue;
      // 機体のすぐそばと折り返しの境目では小さくして、急に現れないようにする
      const edge = Math.min(1, Math.max(0, (DEBRIS_HALF - Math.max(Math.abs(x), Math.abs(y), Math.abs(z))) / 30));
      const clear = Math.min(1, Math.max(0, (d - 6) / 10));
      const sc = b.size * edge * clear;
      if (sc < 1e-3) continue;
      dummy.position.set(x, y, z);
      dummy.quaternion.setFromAxisAngle(b.axis, state.time * b.spin + b.ph);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      if (b.shard) {
        shardMesh.setMatrixAt(shardUsed, dummy.matrix);
        // 色は入れ物の順に持つので、詰めた先の色も書き直す
        if (shardMesh.instanceColor) { const a = shardMesh.instanceColor.array; const k = b.index % SHARD_COLORS.length; const c = SHARD_COLORS[k]; a[shardUsed * 3] = c[0]; a[shardUsed * 3 + 1] = c[1]; a[shardUsed * 3 + 2] = c[2]; }
        shardUsed++;
      } else {
        pebbleMesh.setMatrixAt(pebbleUsed++, dummy.matrix);
      }
    }
    shardMesh.count = shardUsed; pebbleMesh.count = pebbleUsed;
    shardMesh.instanceMatrix.needsUpdate = true; pebbleMesh.instanceMatrix.needsUpdate = true;
    if (shardMesh.instanceColor) shardMesh.instanceColor.needsUpdate = true;

    let chunkUsed = 0;
    for (let i = 0; i < CHUNKS; i++) {
      const c = chunks[i];
      if (c.life <= 0 || c.age >= c.life) continue;
      c.age += dt;
      c.far[0] += c.vel[0] * dt; c.far[1] += c.vel[1] * dt; c.far[2] += c.vel[2] * dt;
      dummy.position.set(c.far[0] - P[0], c.far[1] - P[1], c.far[2] - P[2]);
      dummy.quaternion.setFromAxisAngle(c.axis, c.age * c.spin);
      dummy.scale.setScalar(Math.max(1e-3, c.size * Math.min(1, (c.life - c.age) * 1.5)));
      dummy.updateMatrix();
      chunkMesh.setMatrixAt(chunkUsed++, dummy.matrix);
    }
    chunkMesh.count = chunkUsed;
    chunkMesh.instanceMatrix.needsUpdate = chunkUsed > 0;

    const speed = flight.speed;
    const tail = 0.004 + 0.008 * state.boostAmount; // 線の長さは速さ×この秒数
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
      const d = Math.hypot(x, y, z) / DUST_HALF;
      const f = Math.max(0, 1 - d) * bright * (d < 0.03 ? 0 : 1);
      dustCol[k] = 0.72 * f * dustTint[0]; dustCol[k + 1] = 0.82 * f * dustTint[1]; dustCol[k + 2] = 1.0 * f * dustTint[2];
      dustCol[k + 3] = 0; dustCol[k + 4] = 0; dustCol[k + 5] = 0;
    }
    dustGeom.attributes.position.needsUpdate = true;
    dustGeom.attributes.color.needsUpdate = true;
  }

    // 自機（原点）が岩にぶつかっているか。ぶつかった岩と、岩から離れる向きを返す
  function rockHit(r) {
    for (const k of rocks) {
      if (k.radius <= 0.5) continue;
      const d = k.rel.length();
      if (d < k.radius * 0.82 + r) return { rock: k, push: [-k.rel.x / (d || 1), -k.rel.y / (d || 1), -k.rel.z / (d || 1)], depth: k.radius * 0.82 + r - d };
    }
    return null;
  }

  // シーンの切り替え：惑星・岩の数と大きさと色・塵の色・恒星の向き
  function setScene(cfg) {
    setPlanets(cfg.planets);
    rockCount = Math.min(ROCKS, cfg.rocks.count);
    rockScale = cfg.rocks.scale;
    rockMat.color.setRGB(...cfg.rocks.color, THREE.SRGBColorSpace); // 値は画面で見る色（sRGB）で持つ
    rockMat.roughness = cfg.rocks.roughness ?? 1;
    rockMat.metalness = cfg.rocks.metalness ?? 0;
    dustTint = cfg.dust || [1, 1, 1];
    debrisShards = cfg.debrisShards !== false;
    sun.value.copy(cfg.sunDirV);
    for (const r of rocks) { r.hp = 0; r.deadUntil = 0; }
  }
  // 道の区間の移り変わり：太陽の向き・岩の色・塵の色を毎コマ合わせる
  function setRegion(sunDirV, rockC, dust) {
    sun.value.copy(sunDirV);
    rockMat.color.setRGB(rockC[0], rockC[1], rockC[2], THREE.SRGBColorSpace);
    dustTint = dust;
  }
  return { update, raycast, nearestAhead, damage, targets, assistDir, setScene, setRegion, rockHit, setRockFilter(f) { rockFilter = f; } };
}
