import * as THREE from 'three';
import { Fn, instancedBufferAttribute, modelViewMatrix, vec4, vec3, float, max, clamp, fract, select, smoothstep, length, pow, uv, uniform, time, varying } from 'three/tsl';
import { createStructureMaterial, aoTexture, STRUCT_U } from './material.js';
import { Builder, ROLE, DETAIL, rng, V } from './core.js';

// 作った建物（build.js の generate の戻り値）を three の物にする。
// - 距離で3段に切り替える（THREE.LOD）。3つの段は頂点と並びの配列を共有し、描く数だけが違う
// - 破片はインスタンス描画（形5種）。宇宙ではゆっくり回りながら漂い、地上では地面に積もる
// - 灯りは、遠くでも最小の大きさで見える点の板（画面の画素で大きさを決める）

// 段を切り替える距離（建物の大きさ S に対して）。寄り→中くらい、中くらい→遠く
// 細かい部品（〜1.6m）は区画の縁から near m、中くらいの部品（〜7m）は far m まで描く（大きな建物でも、遠くの区画は細部を省く）。
// 小さな建物は、建物の大きさ S から決めた距離（S×nearS＋nearAdd など）のほうが近ければそちらで切り替える（数が多い街で軽くする）
export const LOD_K = { near: 150, far: 700, nearS: 1.2, nearAdd: 40, farS: 5, farAdd: 250 };
// 破片の段：小さな破片（0.9m 未満）は建物の中心から mid m、2m 未満は far m まで描く
export const DEBRIS_LOD = { mid: 160, far: 450, cell: 160 };

// 段の切り替えを画面のカメラだけで決める仕組み。setStructureView(renderer, camera) を毎コマ呼ぶと有効になる。
// three の LOD は、影を描くときも太陽側の遠いカメラで段を選び直すので、そのままだと影が遠くの段（細部なし）で描かれる。
// 画面のカメラで決めた段を影にも使えば、近くの建物は細部まで影を落とし、遠くの建物は影を省ける（描画の回数が減る）
const LIVE_LODS = new Set();
let lodManaged = false;
function setManaged(lod) {
  lod.autoUpdate = false;
  const far = lod.levels[2] && lod.levels[2].object;
  if (far && far.isMesh) far.castShadow = false;
}

// 写し（group.clone() で置いた建物）の LOD を登録する。中の LOD を全部探して、setStructureView の管理に入れる。
// 写しを捨てるときは unregisterStructureLods(写しの group) を呼ぶ
export function registerStructureLods(root) {
  root.traverse((o) => { if (o.isLOD) { LIVE_LODS.add(o); if (lodManaged) setManaged(o); } });
}
export function unregisterStructureLods(root) {
  root.traverse((o) => { if (o.isLOD) LIVE_LODS.delete(o); });
}

export function buildStructure(g, { shadows = true, lights = true, debris = true } = {}) {
  const group = new THREE.Group();
  group.name = `structure:${g.kind}`;
  const geoBase = new THREE.BufferGeometry();
  const attrs = {
    position: new THREE.BufferAttribute(g.position, 3), normal: new THREE.BufferAttribute(g.normal, 3), uv: new THREE.BufferAttribute(g.uv, 2),
    aMat: new THREE.BufferAttribute(g.aMat, 4), aExt: new THREE.BufferAttribute(g.aExt, 4),
  };
  const index = new THREE.BufferAttribute(g.index, 1);
  const aoTex = aoTexture(g.ao);
  const mat = createStructureMaterial({ ao: { tex: aoTex, origin: g.ao.origin, size: g.ao.size, cell: g.ao.cell } });
  const bbox = new THREE.Box3(new THREE.Vector3(...g.min), new THREE.Vector3(...g.max));
  const meshes = [];
  const lods = [];
  // 区画ごとに3段の LOD（大きな建物は複数、小さな建物は1つ）。形の配列は全部で共有し、描く範囲だけを変える
  const cells = g.cells || [{ start: 0, lod: g.lodCounts, min: g.min, max: g.max }];
  let dists = null;
  for (const c of cells) {
    const cb = new THREE.Box3(new THREE.Vector3(...c.min), new THREE.Vector3(...c.max));
    const sph = cb.getBoundingSphere(new THREE.Sphere());
    const lod = new THREE.LOD();
    lod.position.copy(sph.center);
    const ds = [0, Math.min(sph.radius * 0.5 + LOD_K.near, g.S * LOD_K.nearS + LOD_K.nearAdd), Math.min(sph.radius * 0.5 + LOD_K.far, g.S * LOD_K.farS + LOD_K.farAdd)];
    if (!dists) dists = ds;
    for (let l = 0; l < 3; l++) {
      // 三角形が0の段（小さな建物の遠くの段）は空の物にする（0個の描画は WebGPU が警告を出す）
      if (!c.lod[l]) { const empty = new THREE.Object3D(); empty.name = `lod${l}`; lod.addLevel(empty, ds[l]); continue; }
      const geo = (l === 0 && c === cells[0]) ? geoBase : new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(attrs)) geo.setAttribute(k, a);
      geo.setIndex(index);
      geo.setDrawRange(c.start, c.lod[l]);
      // 枠は形の座標（建物の座標）で持つ。物の行列は LOD の移動と打ち消し合うので、画面外の区画はこの枠で省かれる
      geo.boundingSphere = sph.clone(); geo.boundingBox = cb.clone();
      const mesh = new THREE.Mesh(geo, mat);
      // 形は建物の座標なので、LOD を区画の中心へ動かした分を戻す
      mesh.position.copy(sph.center).negate();
      // 段の切り替えを画面のカメラで決めないとき（setStructureView を呼ばないとき）は、どの段も影を落とす
      // （影を描くときに遠くの段が選ばれるため。外すと影が消える）
      mesh.castShadow = shadows; mesh.receiveShadow = shadows;
      mesh.name = `lod${l}`;
      meshes.push(mesh);
      lod.addLevel(mesh, ds[l]);
    }
    group.add(lod);
    LIVE_LODS.add(lod);
    if (lodManaged) setManaged(lod);
    lods.push(lod);
  }
  const lod = lods[0];

  // ---- 破片 ----
  const deb = debris && g.debris.length ? buildDebris(g, shadows) : null;
  if (deb) { group.add(deb.group); for (const dl of deb.lods) { LIVE_LODS.add(dl); if (lodManaged) setManaged(dl); lods.push(dl); } }
  // ---- 灯りの点 ----
  const pts = lights && g.lights.length ? buildLightPoints(g.lights) : null;
  if (pts) group.add(pts);

  return {
    group, lod, lods, meshes, material: mat, debris: deb, lights: pts, g, dists,
    update(t) { if (deb) deb.update(t); },
    // 段を固定する（確認用）。-1 で距離に任せる
    forceLod(l) {
      for (const ld of lods) {
        ld.userData.forced = l >= 0;
        ld.autoUpdate = l < 0 && !lodManaged;
        if (l >= 0) ld.levels.forEach((lv, i) => { lv.object.visible = i === l; });
      }
    },
    stats() { return { tris: g.stats.tris, debris: g.debris.length, lights: g.lights.length }; },
    dispose() { for (const ld of lods) LIVE_LODS.delete(ld); geoBase.dispose(); meshes.forEach((m) => m.geometry.dispose()); mat.dispose(); aoTex.dispose(); if (deb) deb.dispose(); if (pts) { pts.geometry.dispose(); pts.material.dispose(); } },
  };
}

// ---- 破片の形（板・梁の切れ端・塊・管・薄い欠片）。どれも大きさ 1 に収まる ----
const SHAPE_SETS = {};
function debrisShapes(ground = false) {
  if (SHAPE_SETS[ground]) return SHAPE_SETS[ground];
  const P = ground ? ROLE.CONCRETE : ROLE.PAINT;
  const make = (fn) => {
    const B = new Builder();
    fn(B, rng(5));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(B.P), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(B.N), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(B.UV), 2));
    geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(B.A), 4));
    geo.setAttribute('aExt', new THREE.BufferAttribute(new Float32Array(B.E), 4));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(B.I), 1));
    geo.computeBoundingSphere();
    return geo;
  };
  const SHAPES = {
    // 曲がった板（2枚を折り目でつなぐ。塗装の面と裏の暗い面）
    plate: make((B) => {
      const t = ground ? 0.18 : 0.04;
      B.box(-0.25, 0, 0, 0.5, t, 0.8, { role: P, bottom: ROLE.INNER, c: 0.01, p1: 0.5, p2: 0.8 });
      B.push(0, 0, 0, 0, 0, 0.5); B.box(0.2, 0, 0, 0.4, t, 0.7, { role: P, bottom: ROLE.INNER, c: 0.01, p1: 0.4, p2: 0.7 }); B.pop();
    }),
    // 梁の切れ端（H形、先が折れて細い）
    girder: make((B) => {
      B._beamSeg([0, 0.08, -0.5], [0, 0.08, 0.3], 0.22, 0.03, { role: ROLE.DARK }, DETAIL.MID);
      B._beamSeg([0, -0.08, -0.5], [0, -0.08, 0.3], 0.22, 0.03, { role: ROLE.DARK }, DETAIL.MID);
      B._beamSeg([0, 0, -0.5], [0, 0, 0.3], 0.03, 0.16, { role: ROLE.DARK }, DETAIL.MID);
      B._beamSeg([0, 0, 0.3], [0.12, 0.05, 0.5], 0.18, 0.12, { role: ROLE.BARE }, DETAIL.MID, 1, 0.4);
    }),
    // 塊（ゆがんだ箱と、付いたままの小さな部品）
    chunk: make((B) => {
      B.hexa([[-0.5, -0.4, -0.45], [0.42, -0.5, -0.4], [-0.45, 0.4, -0.5], [0.5, 0.45, -0.35], [-0.4, -0.45, 0.5], [0.5, -0.35, 0.42], [-0.5, 0.5, 0.4], [0.35, 0.42, 0.5]], { role: P, c: 0.05, p1: 0.45, p2: 0.45 });
      if (ground) for (let k = 0; k < 3; k++) B.beam([-0.3 + k * 0.3, 0.45, -0.3], [-0.2 + k * 0.35, 0.95, 0.1 + k * 0.1], 0.03, 0.03, { role: ROLE.RUST }, DETAIL.MID);
      else B.box(0.15, 0.55, 0.1, 0.3, 0.2, 0.25, { role: ROLE.DARK, c: 0.03 });
    }),
    // 管の切れ端
    pipe: make((B) => { B.cyl([0, 0, -0.5], [0, 0, 0.5], 0.12, 0.12, 8, { role: ROLE.BARE, capA: false }); B.cyl([0, 0, 0.1], [0, 0, 0.18], 0.16, 0.16, 8, { role: ROLE.DARK }); }),
    // 薄い欠片（三角形に近いぎざぎざの板）
    shard: make((B) => {
      const t = ground ? 0.12 : 0.02;
      B.hexa([[-0.5, -t, -0.3], [0.5, -t, -0.45], [-0.5, t, -0.3], [0.5, t, -0.45], [-0.1, -t, 0.5], [0.3, -t, 0.2], [-0.1, t, 0.5], [0.3, t, 0.2]], { role: P, c: 0, p1: 0.5, p2: 0.5 });
    }),
  };
  SHAPE_SETS[ground] = SHAPES;
  return SHAPES;
}

// 破片をまとめて描く物（g：{ debris, min, max, S, ground }）。並べ方（街区・基地全体）では全部の建物の破片を1つにまとめるのに使う。
// 全部の破片を1つの形にまとめる（破片ごとに中心・回転の軸と速さ・漂う向きを頂点に持たせる）。
// 広い物（並べ方など）は区画（DEBRIS_LOD.cell m 四方）に分け、区画ごとに大きい順に並べて3段の LOD にする。
// 離れた区画では小さい破片を描かない（並びの先頭からの数で描き分ける。地上の街では破片が三角形の4割を占めていた）
export function buildDebris(g, shadows) {
  const shapes = debrisShapes(g.ground);
  const CELL = g.S > DEBRIS_LOD.cell * 1.6 ? DEBRIS_LOD.cell : Infinity;
  const cellMap = new Map();
  for (const d of g.debris) {
    const key = CELL === Infinity ? '0' : `${Math.floor((d.p[0] - g.min[0]) / CELL)}_${Math.floor((d.p[2] - g.min[2]) / CELL)}`;
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(d);
  }
  let nv = 0; let ni = 0;
  for (const d of g.debris) { const sh = shapes[d.shape] || shapes.chunk; nv += sh.attributes.position.count; ni += sh.index.count; }
  const P = new Float32Array(nv * 3); const N = new Float32Array(nv * 3); const UVA = new Float32Array(nv * 2);
  const A = new Float32Array(nv * 4); const E = new Float32Array(nv * 4);
  const CEN = new Float32Array(nv * 4); const SPIN = new Float32Array(nv * 4); const VEL = new Float32Array(nv * 3);
  const I = new Uint32Array(ni);
  const q = new THREE.Quaternion(); const v = new THREE.Vector3();
  let vo = 0; let io = 0; let k = 0;
  const cells = [];
  for (const raw of cellMap.values()) {
    const list = raw.sort((x, y) => y.s - x.s);
    const start = io;
    // 中くらいの距離では 0.9m 以上、遠くでは 2m 以上の破片だけを描く
    let cutMid = -1; let cutFar = -1;
    const cb = new THREE.Box3();
    for (const d of list) {
      if (cutFar < 0 && d.s < 2) cutFar = io - start;
      if (cutMid < 0 && d.s < 0.9) cutMid = io - start;
      cb.expandByPoint(v.set(d.p[0], d.p[1], d.p[2]));
      const sh = shapes[d.shape] || shapes.chunk;
      const sp = sh.attributes.position; const sn = sh.attributes.normal; const su = sh.attributes.uv; const sa = sh.attributes.aMat; const se = sh.attributes.aExt;
      q.set(d.q[0], d.q[1], d.q[2], d.q[3]);
      const rnd = (k++ * 0.6180339) % 1;
      for (let i = 0; i < sp.count; i++) {
        v.fromBufferAttribute(sp, i).multiplyScalar(d.s).applyQuaternion(q); P.set([v.x, v.y, v.z], (vo + i) * 3);
        v.fromBufferAttribute(sn, i).applyQuaternion(q); N.set([v.x, v.y, v.z], (vo + i) * 3);
        UVA.set([su.getX(i) * d.s, su.getY(i) * d.s], (vo + i) * 2);
        A.set([sa.getX(i), sa.getY(i), rnd, 0], (vo + i) * 4);
        E.set([Math.max(se.getX(i), d.heat), se.getY(i) * 0.5 + (d.heat ? 0.3 : 0.15), se.getZ(i) * d.s, se.getW(i) * d.s], (vo + i) * 4);
        CEN.set([d.p[0], d.p[1], d.p[2], d.s], (vo + i) * 4); SPIN.set([d.spin[0], d.spin[1], d.spin[2], d.spin[3]], (vo + i) * 4); VEL.set(d.vel, (vo + i) * 3);
      }
      for (let i = 0; i < sh.index.count; i++) I[io + i] = sh.index.array[i] + vo;
      vo += sp.count; io += sh.index.count;
    }
    const n = io - start;
    if (cutFar < 0) cutFar = n;
    if (cutMid < 0) cutMid = n;
    // 漂って動く（宇宙）・傾いて積もる（地上）ので、枠は広めに取る
    cb.expandByScalar(g.ground ? 4 : Math.max(8, Math.min(g.S * 0.6, 60)));
    cells.push({ start, counts: [n, cutMid, cutFar], box: cb });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(UVA, 2));
  geo.setAttribute('aMat', new THREE.BufferAttribute(A, 4)); geo.setAttribute('aExt', new THREE.BufferAttribute(E, 4));
  geo.setAttribute('aCen', new THREE.BufferAttribute(CEN, 4)); geo.setAttribute('aSpin', new THREE.BufferAttribute(SPIN, 4)); geo.setAttribute('aVel', new THREE.BufferAttribute(VEL, 3));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  const mat = createStructureMaterial({ debris: true });
  const group = new THREE.Group(); group.name = 'debris';
  const meshes = []; const lods = [];
  // 区画ごとに3段の LOD（同じ形を共有し、描く範囲だけを変える）。距離は区画の中心から測る
  for (const c of cells) {
    const sph = c.box.getBoundingSphere(new THREE.Sphere());
    const lod = new THREE.LOD(); lod.name = 'debris';
    lod.position.copy(sph.center);
    const ds = [0, sph.radius * 0.5 + DEBRIS_LOD.mid, sph.radius * 0.5 + DEBRIS_LOD.far];
    for (let l = 0; l < 3; l++) {
      if (!c.counts[l]) { const empty = new THREE.Object3D(); empty.name = `debris${l}`; lod.addLevel(empty, ds[l]); continue; }
      const gl = meshes.length === 0 ? geo : new THREE.BufferGeometry();
      if (gl !== geo) { for (const [k2, a] of Object.entries(geo.attributes)) gl.setAttribute(k2, a); gl.setIndex(geo.index); }
      gl.boundingBox = c.box.clone(); gl.boundingSphere = sph.clone();
      gl.setDrawRange(c.start, c.counts[l]);
      const mesh = new THREE.Mesh(gl, mat);
      mesh.position.copy(sph.center).negate();
      // 破片は影を落とさない（小さく見た目にほぼ効かないのに、建物ごとに影の描画が1回増える）
      mesh.castShadow = false; mesh.receiveShadow = shadows;
      mesh.name = 'debris';
      meshes.push(mesh);
      lod.addLevel(mesh, ds[l]);
    }
    group.add(lod); lods.push(lod);
  }
  return { group, lod: lods[0], lods, mesh: meshes[0], material: mat, update() {}, dispose() { meshes.forEach((m) => m.geometry.dispose()); mat.dispose(); } };
}

// 画面の大きさとカメラの視野角を材質へ伝える（遠くの小さな破片を消す判断に使う）。毎コマか、画面の大きさが変わったときに呼ぶ
const _sz = new THREE.Vector2();
export function setStructureView(renderer, camera, { manageLod = true } = {}) {
  if (manageLod) {
    if (!lodManaged) { lodManaged = true; for (const l of LIVE_LODS) setManaged(l); }
    for (const l of LIVE_LODS) if (!l.userData.forced) l.update(camera);
  }
  renderer.getDrawingBufferSize(_sz);
  const fov = camera.isPerspectiveCamera ? camera.fov : 50;
  STRUCT_U.pxScale.value = _sz.y / renderer.getPixelRatio() / (2 * Math.tan(fov * Math.PI / 360));
}

// 破片の時刻を進める（宇宙だけ。地上の破片は止まっている）。漂う距離は行って戻る
export function updateDebrisTime(t, ground = false) {
  STRUCT_U.debrisT.value = ground ? 0 : t;
  STRUCT_U.debrisDrift.value = ground ? 0 : Math.sin(t * 0.05) * 40;
}

// ---- 灯りの点：画面の画素で大きさを決める板。最小の大きさを保ち、小さい分は暗くする ----
const LIGHT_U = { uScale: uniform(600), uK: uniform(1.0) };
export function buildLightPoints(list) {
  const n = list.length;
  const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const info = new Float32Array(n * 3);
  list.forEach((l, i) => {
    pos.set(l.p, i * 3);
    const c = l.role === ROLE.BEACON ? [1.0, 0.1, 0.05] : l.role === ROLE.STRIP ? [0.7, 0.82, 1.0] : [1.0, 0.55, 0.2];
    col.set(c, i * 3);
    // 大きさ（m）、明るさ、またたき（1=赤の点滅、2=不規則）
    info.set([Math.max(0.8, l.size * 3.2), l.role === ROLE.BEACON ? 1.6 : 1.0, l.flicker ? 2 : l.role === ROLE.BEACON ? 1 : 0], i * 3);
  });
  const P = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3), 'vec3');
  const C = instancedBufferAttribute(new THREE.InstancedBufferAttribute(col, 3), 'vec3');
  const I = instancedBufferAttribute(new THREE.InstancedBufferAttribute(info, 3), 'vec3');
  const mv = modelViewMatrix.mul(vec4(P, 1.0));
  const d = max(1.0, mv.z.negate());
  const size = I.x.mul(LIGHT_U.uScale).div(d);
  const MIN_PX = 2.0;
  const dim = clamp(size.div(MIN_PX).mul(0.6).add(0.4), 0.35, 1.0);
  const ph = fract(time.mul(0.45).add(P.x.mul(0.013)).add(P.z.mul(0.007)));
  const blinkRed = smoothstep(0.0, 0.08, ph).mul(float(1).sub(smoothstep(0.3, 0.55, ph)));
  const flick = fract(time.mul(7.3).add(P.y.mul(0.31))).greaterThan(0.45).select(0.85, 0.1);
  const blink = select(I.z.greaterThan(1.5), flick, select(I.z.greaterThan(0.5), blinkRed, float(1)));
  // 近すぎる時は消す（建物の灯りの箱そのものが見えるので、板を重ねない）
  const near = smoothstep(15.0, 60.0, d);
  const vC = varying(C.mul(I.y).mul(blink).mul(dim).mul(near).mul(LIGHT_U.uK), 'vSLightC');
  const mat = new THREE.PointsNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false, fog: false });
  mat.positionNode = P;
  mat.sizeNode = clamp(size, MIN_PX, 24.0);
  mat.fragmentNode = Fn(() => {
    const r = length(uv().sub(0.5)).mul(2.0);
    const a = pow(max(r.oneMinus(), 0.0), 2.4).add(float(1).sub(smoothstep(0.0, 0.3, r)).mul(1.5));
    return vec4(vC.mul(a), 1.0);
  })();
  const pts = new THREE.Sprite(mat);
  pts.count = n;
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  const sz = new THREE.Vector2();
  pts.onBeforeRender = (r, sc, cam) => {
    r.getDrawingBufferSize(sz);
    const fov = cam.isPerspectiveCamera ? cam.fov : 50;
    LIGHT_U.uScale.value = sz.y / r.getPixelRatio() / (2 * Math.tan(fov * Math.PI / 360));
  };
  return pts;
}
export { STRUCT_U, LIGHT_U };
