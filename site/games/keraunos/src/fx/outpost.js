import * as THREE from 'three';
import {
  Fn, instancedBufferAttribute, attribute, varying, uv, output, modelViewMatrix, modelWorldMatrix, cameraPosition, cameraViewMatrix,
  cameraProjectionMatrix, positionGeometry, positionLocal, normalLocal, positionView, vec2, vec4, float, max, clamp, fract, select,
  smoothstep, length, pow, mix, normalize, cross, dot, abs, sin,
} from 'three/tsl';
import { SURF_ON } from './surface.js';
import { nodeUniforms, smoothstepR } from './soft.js';
import { discTriangle } from './background.js';
import { upgradeMaterial } from './hardsurface.js';
import { GRAVE_Z, BASE_Z, BASE_LEN, TUNNEL_Z, TUNNEL_LEN, LINE_Z, LINE_LEN, ARENA_Z, GATE_Z, RING_Z } from '../course.js';
import { getPbr } from './pbr.js';
import { SCENES } from '../scenes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kitReady, kitMaterial, kitFacility } from './kitParts.js';
import { lightRamp, hazeNode, hullMaterial, wreckSection, wreckBow, wreckStern, ribCage, hullPlate, gunWreck, tankFarm, dishArray, radiatorWing, hangarBlock, craneArm, refineryStack, heavyGirder, blastDoor } from './fleetKit.js';
import { createStructure, STRUCT_U, KINDS as STRUCT_KINDS, updateDebrisTime, setStructureView, registerStructureLods, unregisterStructureLods } from '../structures/index.js';

// ?structures=1：墓場と基地の残骸・施設を、建物と残骸のプロシージャル生成（src/structures/）へ差し替える。
// 國松が見た目を認めるまでの試し。旗が無ければ今までどおり。
// 艦の骨格（ribCage）は自機がくぐる道の上にあるので差し替えない。小さな板の破片もそのまま
const STRUCT_Q = new URLSearchParams(location.search);
// 國松の指示（11/8）：元のステージを壊さない。プロシージャルの建物はステージの中身を差し替えず、背景にだけ使う。差し替えは ?structures=1 のときだけ
const STRUCT_ON = STRUCT_Q.get('structures') === '1';
const STRUCT_MAP = {
  wreckMid: { kind: 'module', damage: 0.8, seed: 21 },
  wreckMid2: { kind: 'block', damage: 0.85, seed: 22 },
  wreckBow: { kind: 'module', damage: 0.7, seed: 23 },
  wreckStern: { kind: 'hangar', damage: 0.75, seed: 24 },
  gunWreck: { kind: 'turret', damage: 0.9, seed: 26 },
  hangar: { kind: 'hangar', damage: 0.1, seed: 31 },
  tankFarm: { kind: 'tanks', damage: 0.05, seed: 32 },
  dish: { kind: 'tower', damage: 0.1, seed: 33 },
  refinery: { kind: 'block', damage: 0.15, seed: 34 },
  radiator: { kind: 'radiator', damage: 0.05, seed: 35 },
  crane: { kind: 'tower', damage: 0.2, seed: 36 },
};

// 1面の前線基地。Tripo で作った環境パーツ12種を、同じ物を何度も描く方式（InstancedMesh）で並べる。
// 置き場所は世界の座標で持ち、グループ全体を自機の位置だけ逆にずらす。

// 基地の灯り：点の大きさは距離で決め、遠くでも最小の大きさを保つ（手本の、基地に沿って連なる橙の灯り）。
// WebGPU の点は1画素なので、画面の画素で大きさを決める板（1回の描画で全部）で描く。U は uScale・uTime
function lightMaterial(U, posA, colA, infoA) {
  const pos = instancedBufferAttribute(posA, 'vec3');
  const info = instancedBufferAttribute(infoA, 'vec3'); // 大きさ、明るさ、点滅（0=常時、>0=周期）
  const mv = modelViewMatrix.mul(vec4(pos, 1.0));
  const d = max(1.0, mv.z.negate());
  const ph = fract(U.uTime.div(max(info.z, 1e-3)).add(pos.z.mul(0.013)));
  const blink = select(info.z.greaterThan(0.0), smoothstep(0.1, 0.25, ph).mul(smoothstepR(0.7, 0.55, ph)), 1.0);
  // 大きさは画面の画素（高い画素比は three が掛ける）
  const size = info.x.mul(U.uScale).div(d);
  const MIN_PX = 2.2;
  // 最小の大きさより小さい分は、明るさを落として数を目立たせすぎない
  const dim = clamp(size.div(MIN_PX).mul(0.5).add(0.5), 0.45, 1.0);
  const vC = varying(instancedBufferAttribute(colA, 'vec3').mul(info.y).mul(blink).mul(dim).mul(smoothstep(3.0, 14.0, d)), 'vLightC');
  const mat = new THREE.PointsNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: false, fog: false });
  mat.positionNode = pos;
  mat.sizeNode = select(info.x.lessThanEqual(0.0), 0.0, clamp(size, MIN_PX, 60.0));
  mat.fragmentNode = Fn(() => {
    const r = length(uv().sub(0.5)).mul(2.0);
    const a = pow(max(r.oneMinus(), 0.0), 2.2).add(smoothstepR(0.28, 0.0, r).mul(2.2));
    return vec4(vC.mul(a), 1.0);
  })();
  return mat;
}

// 光の筋：太陽から基地のすき間へ差し込む薄い帯。帯の軸のまわりで常に正面を向く。U は uAxis・uColor
function shaftMaterial(U) {
  const aPos = attribute('aPos', 'vec3');
  const info = attribute('aInfo', 'vec3'); // 長さ、幅、濃さ
  const anchor = modelWorldMatrix.mul(vec4(aPos, 1.0)).xyz;
  const toCam = normalize(cameraPosition.sub(anchor));
  const side = normalize(cross(U.uAxis, toCam));
  const w = anchor.add(U.uAxis.mul(positionGeometry.y.mul(info.x))).add(side.mul(positionGeometry.x.mul(info.y)));
  const vU = varying(vec2(positionGeometry.x.mul(2.0), positionGeometry.y.add(0.5)), 'vShaftU');
  // 帯の近くでは消す（画面いっぱいに広がらないように）。真横から見るほど濃く、遠すぎても薄く
  const rel = cameraPosition.sub(anchor);
  const along = dot(rel, U.uAxis);
  const dd = length(rel.sub(U.uAxis.mul(along)));
  const edgeOn = float(1.0).sub(abs(dot(toCam, U.uAxis)));
  const vA = varying(info.z.mul(smoothstep(info.y.mul(0.9), info.y.mul(3.2), dd)).mul(smoothstepR(1300.0, 600.0, dd)).mul(smoothstep(0.0, 0.5, edgeOn)), 'vShaftA');
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, forceSinglePass: true });
  mat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(w, 1.0)));
  mat.fragmentNode = Fn(() => {
    const across = float(1.0).sub(abs(vU.x));
    const a = across.mul(across).mul(float(3.0).sub(across.mul(2.0)));
    // 帯の中のごく弱いむら（線に見えないよう、ゆるやかに）
    const streak = sin(vU.x.mul(4.3).add(1.3)).mul(0.18).add(0.82);
    // 太陽側は細く薄れて、奥へ行くほど消える
    const alongU = smoothstep(0.0, 0.18, vU.y).mul(smoothstepR(1.0, 0.42, vU.y));
    return vec4(U.uColor.mul(a).mul(streak).mul(alongU).mul(vA), 1.0);
  })();
  return mat;
}

// 基地の部品の赤い塗装を、役割の色へ塗り替える（線形の色）。砲台と塔は撃つ対象なので赤のまま（null）
const STEEL = [0.075, 0.09, 0.11];
const BASE_ROLE = {
  truss: STEEL, cross: STEEL, plate: STEEL, bow: STEEL, solar: STEEL,
  arc: [0.30, 0.32, 0.34],          // 道をまたぐ輪：明るい灰色（大きさが読める）
  hab: [0.50, 0.45, 0.36],          // 居住区画：生成りの白
  dock: [0.05, 0.27, 0.28],         // ドッキングの継ぎ目：青緑
  tank: [0.55, 0.22, 0.04],         // 燃料タンク：橙
  box: [[0.42, 0.28, 0.05], [0.16, 0.20, 0.09], [0.09, 0.16, 0.28], [0.28, 0.28, 0.27], [0.30, 0.10, 0.04]], // 積み荷：色を散らす
  turret: null, mast: null,
};
const FILES = {
  truss: '01', cross: '02', hab: '03', dock: '04', solar: '05', tank: '06',
  turret: '07', mast: '08', arc: '09', plate: '10', bow: '11', box: '12',
};

// 置き方の一覧を作る。x=左右、y=上下、z=進む向き。中央（x=0, y=0）が飛ぶ道
export { BASE_LEN, RING_Z } from '../course.js';

function layout() {
  const L = [];
  const put = (part, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => L.push({ part, x, y, z, ry, rx, rz, sx, sy, sz });
  let seed = 4242;
  const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const SEG = 40;

  // 道をまたぐ輪。4分の1の部品を中心のまわりに回して輪にする（which で欠けた輪も作れる）
  const K = 60 / 46.28; // 部品の幅と高さをそろえて、きれいな4分の1にする
  const ringAt = (z, which = [0, 1, 2, 3], scale = 1, tilt = 0) => {
    for (const k of which) {
      const a = k * Math.PI / 2 + tilt;
      const c = Math.cos(a); const sn = Math.sin(a);
      const px = -30 * scale; const py = 30 * scale;
      put('arc', c * px - sn * py, sn * px + c * py, z, 0, 0, a, scale, K * scale, scale);
    }
  };

  // 骨組みの壁：近い列（壊せる砲台など）と奥の層
  const wall = (Z0, N, X0, opt = {}) => {
    for (const s of [-1, 1]) {
      const X = s * X0;
      const Y = s > 0 ? -2 : 6;
      for (let i = 0; i < N; i++) {
        const z = Z0 + SEG * i;
        if (i % 4 === 2) {
          // 継ぎ目：外側へ居住区画とドッキングの継ぎ目を伸ばす
          put('cross', X, Y, z);
          put('hab', X + s * 38, Y, z);
          put('dock', X + s * 64, Y, z);
          put('solar', X + s * 66, Y + 16, z, s > 0 ? 0 : Math.PI);
          put('tank', X, Y - 15, z, Math.PI / 2);
          if (opt.masts && i % 8 === 2) put('mast', X, Y + 24, z, R() * 6.28);
        } else {
          put('truss', X, Y, z);
          // 骨組みに沿って走る居住区画の列（道の両側に壁を作る）
          if (i % 4 === 1) put('hab', X + s * 2, Y - 13, z, Math.PI / 2);
          if (i % (opt.turretEvery || 4) === 0) put('turret', X, Y + 8.2, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
          if (i % 4 === 3) {
            // 骨組みの下に吊ったコンテナ
            const n = 1 + Math.floor(R() * 3);
            for (let k = 0; k < n; k++) put('box', X + (k - (n - 1) / 2) * 5, Y - 7.2, z + (R() - 0.5) * 8);
          }
        }
      }
    }
    // 奥の層：倒せる砲台と塔だけを同じ場所に残す。間の施設は layoutKit が置く
    for (const s of [-1, 1]) {
      const X = s * (X0 + 104);
      const Y = s > 0 ? 22 : -18;
      for (let i = 0; i < N; i += 1) {
        const z = Z0 + 20 + SEG * i;
        if (i % 5 === 3) put('mast', X, Y + 23, z, R() * 6.28);
        else if (i % 5 === 1) put('turret', X, Y + 8.2, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    }
  };

  // ---- 小惑星帯：3つの金属の輪 ----
  for (const z of GATE_Z) ringAt(z, [0, 1, 2, 3], 0.85);

  // ---- 沈没艦の墓場：コードで組んだ残骸（layoutKit）に置き換えた。ここでは組み立て部品を置かない ----

  // ---- 基地の外周 ----
  const N = Math.round(BASE_LEN / SEG);
  wall(BASE_Z, N, 64, { masts: true });
  for (const v of RING_Z) ringAt(BASE_Z + v);
  // ---- 基地の内部通路：輪を連ねた筒。四隅に骨組みを通し、壁に箱とタンクを付ける ----
  const TN = Math.round(TUNNEL_LEN / 40);
  for (let i = 0; i < TN; i++) {
    const z = TUNNEL_Z + i * 40;
    if (i % 2 === 0) ringAt(z);
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) put('truss', sx * 46, sy * 46, z + 20);
    if (i % 3 === 0) put('box', (i % 6 === 0 ? 1 : -1) * 50, -44, z + 8, R() * 3);
    if (i % 5 === 1) put('tank', (i % 10 === 1 ? 1 : -1) * 54, 8, z + 10, Math.PI / 2);
  }
  // 入口と出口の大きな枠
  for (const z of [TUNNEL_Z - 10, TUNNEL_Z + TUNNEL_LEN]) {
    for (const [x, y] of [[-70, 0], [70, 0], [0, 70], [0, -70]]) put('dock', x, y, z, 0, 0, 0, 1.4, 1.4, 1.4);
  }

  // ---- 防衛線：道の幅を広げ、砲台の数を倍にした壁 ----
  wall(LINE_Z, Math.round(LINE_LEN / SEG), 88, { turretEvery: 2 });
  for (const v of [400, 1000, 1600]) ringAt(LINE_Z + v, [0, 1, 2, 3], 1.5);
  return L;
}

// コードで組んだ置き物の配置。name, x, y, z, rx, ry, rz, s
function layoutKit() {
  const L = [];
  let seed = 7171;
  const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const put = (name, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => L.push({ name, x, y, z, rx, ry, rz, s });
  const G = GRAVE_Z;
  // 墓場：折れた艦の3つの塊が、道の両側に大きく横たわる
  put('wreckBow', 265, 80, G + 150, 0.20, 2.5, 0.45, 1.1);
  put('wreckMid', 225, 60, G + 430, -0.15, 1.1, -0.55, 1.05);
  put('wreckStern', 290, 30, G + 720, 0.3, 0.4, 0.3, 1.05);
  put('wreckMid2', -270, -80, G + 300, 0.35, -0.5, 0.25, 1.1);
  put('wreckBow', -250, 90, G + 1010, -0.25, 0.7, -0.7, 0.9);
  put('wreckStern', -240, -120, G + 1180, 0.1, 2.6, 0.5, 1.0);
  put('wreckMid', 250, -130, G + 1260, 0.45, 2.0, 0.2, 1.1);
  // 遠景の残骸は大きく、霞に溶ける
  put('wreckMid2', 620, -240, G + 760, 0.2, 0.8, 0.5, 3.4);
  put('wreckBow', -700, -280, G + 1120, -0.25, -0.9, 0.3, 3.6);
  put('wreckStern', 560, 160, G + 1400, 0.4, -1.6, -0.2, 3.1);
  put('wreckMid', -640, 130, G + 520, 0.1, 0.2, 0.9, 3.0);
  // 中をくぐる艦の骨格
  put('ribCage', 4, -4, G + 880, 0, 0, 0.08, 1);
  // 破片
  for (let i = 0; i < 46; i++) {
    const a = R() * 6.28; const r = 66 + R() * 260; const z = G - 30 + R() * 1640;
    const n = R();
    const name = n < 0.45 ? 'plateA' : n < 0.75 ? 'plateB' : n < 0.9 ? 'plateC' : 'gunWreck';
    put(name, Math.cos(a) * r, Math.sin(a) * r * 0.75, z, R() * 6.28, R() * 6.28, R() * 6.28, 0.5 + R() * 1.3);
  }
  // 基地：道の両側の奥に、役割の違う施設を連ねる
  const facility = (Z0, Zlen, X0) => {
    const seq = ['hangar', 'tankFarm', 'dish', 'refinery', 'radiator', 'hangar2', 'crane', 'tankFarm2', 'refinery2', 'dish2'];
    for (const s of [-1, 1]) {
      let z = Z0 + 40 + R() * 40; let i = s > 0 ? 0 : 4;
      while (z < Z0 + Zlen - 40) {
        const nm = seq[i++ % seq.length].replace(/2$/, '');
        const X = s * (X0 + 112 + R() * 36);
        const Y = (s > 0 ? 22 : -18) + (R() - 0.5) * 34;
        const flip = s > 0 ? 0 : Math.PI;
        // 施設は本体の骨組みへ腕でつなぐ
        put(nm, X, Y, z, 0, nm === 'hangar' ? -s * Math.PI / 2 : flip, 0, 1.05 + R() * 0.4);
        put('strut', s * (X0 + 52), Y * 0.6, z, 0, Math.PI / 2, 0, 1);
        z += 95 + R() * 90;
      }
    }
  };
  facility(BASE_Z, BASE_LEN, 64);
  facility(LINE_Z, LINE_LEN, 88);
  // 基地の遠くを漂う沈没艦
  put('wreckBow', -460, 190, BASE_Z + 520, -0.2, 0.6, 0.3, 1.5);
  put('wreckMid2', 520, -290, BASE_Z + 1320, 0.3, 1.1, 0.5, 1.5);
  for (let i = 0; i < 24; i++) {
    const t = R() * 6.28; const r = 45 + R() * 110; const b = R() < 0.5;
    put(R() < 0.5 ? 'plateA' : 'plateB', (b ? -460 : 520) + Math.cos(t) * r, (b ? 190 : -290) + (R() - 0.5) * 70, BASE_Z + (b ? 520 : 1320) + Math.sin(t) * r, R() * 6.28, R() * 6.28, R() * 6.28, 0.5 + R());
  }
  for (let i = 0; i < 18; i++) put('plateC', (R() < 0.5 ? -1 : 1) * (58 + R() * 40), (R() - 0.5) * 60, BASE_Z + R() * BASE_LEN, R() * 6.28, R() * 6.28, R() * 6.28, 0.25 + R() * 0.3);
  return L;
}

export function createOutpost({ scene, loader, renderer = null, camera = null, start = BASE_Z }) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  let count = 0;
  const allItems = [];
  const partMap = {};
  const hazeU = { value: new THREE.Vector3(0.020, 0.018, 0.042) };
  const _q = new THREE.Quaternion(); const _e = new THREE.Euler(); const _p = new THREE.Vector3(); const _s = new THREE.Vector3();

  // 遠景用に三角形を減らした形（assets/env/lod/NN_1.glb・NN_2.glb）。無ければ元の形を使う
  const loadGeo = (url) => new Promise((res) => loader.load(url, (g) => {
    let mesh = null;
    g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    res(mesh ? { mesh, geo: mesh.geometry.clone().applyMatrix4(mesh.matrixWorld) } : null);
  }, undefined, () => res(null)));

  // 描く細かさを選ぶ区切りは2段。近い区切り（CELL_Z × CELL_X）の距離で元の形か減らした形か、
  // 遠い塊（FAR_Z・左中右）の距離で最も粗い形かを決める。描く単位は部品の種類×細かさ（cull() を参照）
  const CELL_Z = 80;
  const CELL_X = 64;
  const FAR_Z = 320;
  const LOD_NEAR = 70;   // ここより近い区切りだけ元の形
  const LOD_FAR = 300;   // ここより遠い塊は最も粗い形
  const bigs = new Map();
  const partEntries = [];

  // 遠景用の材質：地の法線画像を外し（減らした形と合わず、まだらになる）、遠いほど空の色へ少し溶かす
  const hazeN = hazeNode(hazeU);
  const hazeOf = (mat, withNormal) => {
    const m = mat.clone();
    m.fog = false;
    // 最も遠い段は、鈍い塗装として日の光を受ける形だけ描く（画像は色と灯りだけなので軽い）
    if (!withNormal) {
      m.normalMap = null; m.aoMap = null; m.metalnessMap = null; m.roughnessMap = null; m.metalness = 0.1; m.roughness = 0.75; m.envMapIntensity = 0.3;
      // 細い骨組みが1画素より細くなって欠けないよう、遠いほど面を法線の向きへ少し押し出す（並べた後の座標で距離を測る）
      const p0 = mat.positionNode || positionLocal;
      m.positionNode = p0.add(normalLocal.mul(modelViewMatrix.mul(vec4(p0, 1.0)).z.negate().mul(0.0017)));
    }
    // 元の材質の最後の色（ライトランプ済み）を、遠いほど空の色へ溶かす
    const src = mat.outputNode;
    m.outputNode = vec4(mix(src.rgb, hazeN, smoothstep(350.0, 1750.0, length(positionView)).mul(0.5)), src.a);
    return m;
  };

  // ---- コードで組んだ置き物。帯（z で 400 ごと）に1つの形へまとめて、描画は帯ごとに1回 ----
  const kitWreckMat = hullMaterial({ hazeU, panel: 7, burn: 0.6, windowK: 0.7, color: 0xffffff });
  const kitFacMat = hullMaterial({ hazeU, panel: 5, windowK: 1 });
  kitWreckMat.color.setRGB(1.05, 0.98, 0.92);
  kitFacMat.color.setRGB(1.35, 1.35, 1.4);
  const KIT = {
    wreckMid: wreckSection({ seed: 2.1 }), wreckMid2: wreckSection({ seed: 3.3, L: 300, W: 66, H: 60 }), wreckBow: wreckBow({ seed: 3.9 }), wreckStern: wreckStern({ seed: 4.2 }),
    ribCage: ribCage({ seed: 5.1 }), plateA: hullPlate({ seed: 6.1 }), plateB: hullPlate({ seed: 7.4, S: 30 }), plateC: hullPlate({ seed: 8.8, S: 22 }), gunWreck: gunWreck({ S: 16 }),
    tankFarm: tankFarm({ S: 15 }), dish: dishArray({ S: 24 }), radiator: radiatorWing({ S: 26 }), hangar: hangarBlock({ S: 30 }), crane: craneArm({ S: 54 }), refinery: refineryStack({ S: 36 }), strut: heavyGirder({ L: 96, W: 4 }),
  };
  const WRECKS = new Set(['wreckMid', 'wreckMid2', 'wreckBow', 'wreckStern', 'ribCage', 'plateA', 'plateB', 'plateC', 'gunWreck']);
  // 施設は Tripo のパーツへ差し替える（古い形と同じ大きさに合わせる）。残骸はコードで組んだまま
  const KIT_PART = { hangar: 'kit08', hangar2: 'kit08', tankFarm: 'kit14', tankFarm2: 'kit14', dish: 'kit15', dish2: 'kit15', radiator: 'kit09', crane: 'kit11', refinery: 'kit14', refinery2: 'kit10' };
  // 施設の役割の色（kitParts の PALETTES）。赤は撃つ対象だけに残す
  const KIT_ROLE = { hangar: 'hangar', hangar2: 'hangar', tankFarm: 'fuel', tankFarm2: 'fuel', refinery: 'fuel', refinery2: 'fuel', dish: 'comms', dish2: 'comms', radiator: 'radiator', crane: 'crane' };
  const kitGeoCache = {}; const kitMats = {};
  const kitGeo = (name) => {
    if (!kitGeoCache[name]) {
      const o = KIT[name]; if (!o.boundingBox) o.computeBoundingBox();
      const b = o.boundingBox;
      kitGeoCache[name] = kitFacility(KIT_PART[name], Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z));
    }
    return kitGeoCache[name];
  };
  const kitMat = (pal) => kitMats[pal] || (kitMats[pal] = kitMaterial({ palette: pal, hazeU }));
  const kitMeshes = [];
  const kitTumble = [];
  // ?structures=1 の差し替え。同じ種類・同じ大きさの段（2倍ごと）は1回だけ作り、置く所では写しを使う（形と材質は共有）
  if (STRUCT_ON) { STRUCT_U.hazeNear.value = 350; STRUCT_U.hazeFar.value = 1750; STRUCT_U.hazeMax.value = 0.5; }
  const structProtos = new Map();
  const structPlaced = [];
  // 段は画面のカメラで決め、影にも同じ段を使う（three の LOD は影を描くときに太陽側のカメラで段を選び直し、影が遠くの段になる）。
  // 写しは registerStructureLods で建物の側の管理に入れる（毎コマの選び直しと遠くの段の影の省略は setStructureView が行う）
  const STRUCT_VIEW = !!(renderer && camera);
  const _sb = new THREE.Box3(); const _sv = new THREE.Vector3();
  function placeStructure(it) {
    const def = STRUCT_MAP[it.name];
    if (!def) return false;
    const o = KIT[it.name]; if (!o.boundingBox) o.computeBoundingBox();
    const T = o.boundingBox.getSize(_sv).toArray().reduce((a, b) => Math.max(a, b)) * it.s;
    const K = STRUCT_KINDS[def.kind];
    const S = Math.min(K.range[1], Math.max(K.range[0], 2 ** Math.round(Math.log2(T))));
    const key = `${it.name}_${S}`;
    if (!structProtos.has(key)) {
      const s = createStructure({ ...def, size: S, heat: 0, shadows: SURF_ON });
      // 全体のかすみ（濃い藍）は受けない。遠景は建物の材質が自前で溶かす（基地の他の部品と同じ）
      s.group.traverse((c) => { if (c.material) c.material.fog = false; });
      // 写しの元は置かないので、段の選び直しの対象から外す
      unregisterStructureLods(s.group);
      s.group.updateMatrixWorld(true);
      _sb.setFromObject(s.lod || s.group);
      structProtos.set(key, { s, ext: _sb.getSize(new THREE.Vector3()).toArray().reduce((a, b) => Math.max(a, b)), center: _sb.getCenter(new THREE.Vector3()) });
    }
    const pr = structProtos.get(key);
    const k = T / Math.max(1, pr.ext);
    const inner = pr.s.group.clone();
    inner.position.copy(pr.center).negate();
    // 段の切り替えの距離も大きさに合わせる（写しは段の表を自分で持つ）
    inner.traverse((c) => { if (c.isLOD) for (const lv of c.levels) lv.distance *= k; });
    if (STRUCT_VIEW) registerStructureLods(inner);
    const outer = new THREE.Group();
    outer.position.set(it.x, it.y, it.z);
    outer.rotation.set(it.rx, it.ry, it.rz);
    outer.scale.setScalar(k);
    outer.add(inner);
    group.add(outer);
    structPlaced.push(outer);
    return true;
  }
  function buildKit() {
    const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const p = new THREE.Vector3(); const sc = new THREE.Vector3();
    const bands = new Map();
    let tumbleN = 0;
    for (const it of layoutKit()) {
      if (STRUCT_ON && placeStructure(it)) continue;
      const wr = WRECKS.has(it.name);
      const part = KIT_PART[it.name];
      const pal = part ? (it.z < BASE_Z ? 'rust' : (SURF_ON ? KIT_ROLE[it.name] || 'hangar' : 'enemy')) : null;
      const key = `${part ? pal : (wr ? 'w' : 'f')}_${Math.floor(it.z / 400)}_${Math.sign(Math.round(it.x / 200))}`;
      if (!bands.has(key)) bands.set(key, { wr, pal, geos: [] });
      q.setFromEuler(e.set(it.rx, it.ry, it.rz));
      m.compose(p.set(it.x, it.y, it.z), q, sc.setScalar(it.s));
      bands.get(key).geos.push((part ? kitGeo(it.name) : KIT[it.name]).clone().applyMatrix4(m));
    }
    for (const b of bands.values()) {
      const g = mergeGeometries(b.geos, false);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, b.pal ? kitMat(b.pal) : (b.wr ? kitWreckMat : kitFacMat));
      // 部品どうしが影を落とし合うと、一方向の強い太陽光と深い陰が出る（?surface=0 では今までどおり影なし）
      mesh.castShadow = SURF_ON; mesh.receiveShadow = SURF_ON;
      group.add(mesh);
      kitMeshes.push(mesh);
    }
    for (const g of Object.values(KIT)) g.computeBoundingSphere();
    // 回りながら漂う大きめの破片（墓場と基地のまわり）。1回の描画で済ませる
    let sd = 991;
    const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const TN = 26;
    const inst = new THREE.InstancedMesh(KIT.plateA, kitWreckMat, TN);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.frustumCulled = false;
    inst.receiveShadow = SURF_ON;
    group.add(inst);
    const list = [];
    for (let i = 0; i < TN; i++) {
      const a = R() * 6.28; const r = 54 + R() * 150;
      list.push({ pos: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7, GRAVE_Z - 40 + R() * (BASE_Z - GRAVE_Z + 400)), axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), spin: 0.06 + R() * 0.25, sc: 0.45 + R() * 1.1, drift: (R() - 0.5) * 2.2 });
    }
    kitTumble.push({ inst, list });
    tumbleN = TN;
    return tumbleN;
  }
  const _tm = new THREE.Matrix4(); const _tq = new THREE.Quaternion(); const _tp = new THREE.Vector3(); const _ts = new THREE.Vector3();
  // 確認用の撮影（test=1）では回る破片を止める（撮るたびに向きが変わると、同じ時刻の比べにならない）
  const KIT_FROZEN = new URLSearchParams(location.search).get('test') === '1';
  function updateKit(P) {
    const t = KIT_FROZEN ? 0 : performance.now() / 1000;
    kitWreckMat.userData.uTime.value = t; kitFacMat.userData.uTime.value = t;
    if (STRUCT_ON) {
      updateDebrisTime(t, false);
      if (STRUCT_VIEW) setStructureView(renderer, camera);
    }
    for (const { inst, list } of kitTumble) {
      list.forEach((d, i) => {
        _tq.setFromAxisAngle(d.axis, t * d.spin);
        _tm.compose(_tp.set(d.pos.x + Math.sin(t * 0.1 + i) * d.drift * 6, d.pos.y + Math.cos(t * 0.13 + i) * d.drift * 4, d.pos.z), _tq, _ts.setScalar(d.sc));
        inst.setMatrixAt(i, _tm);
      });
      inst.instanceMatrix.needsUpdate = true;
    }
  }

  const ready = kitReady.then(() => Promise.all(Object.entries(FILES).map(([part, file]) => Promise.all([
    loadGeo(`./assets/env/${file}.glb`), loadGeo(`./assets/env/lod/${file}_1.glb`), loadGeo(`./assets/env/lod/${file}_2.glb`),
  ]).then(([g0, g1, g2]) => {
    const mat = upgradeMaterial(g0.mesh.material, { base: true, cell: 2.4, rim: 0.28, pbr: getPbr(`env${file}`, g0.mesh.material.name), recolor: BASE_ROLE[part] });
    // 全体のかすみ（濃い藍）は遠くの基地を一色に塗りつぶすので受けない。宇宙なので、遠景だけ自前で薄く溶かす
    mat.fog = false;
    // どの段にも同じライトランプを掛ける（材質担当の最後の加算があれば、それを包む）
    const src = mat.outputNode || output;
    mat.outputNode = vec4(lightRamp(src.rgb, hazeN), src.a);
    const lod1 = hazeOf(mat, true); const lod2 = hazeOf(mat, false);
    const geos = [g0.geo, (g1 || g0).geo, (g2 || g1 || g0).geo];
    return { part, geo: g0.geo, geos, mat, mats: [mat, lod1, lod2] };
  })))).then((loaded) => {
    for (const l of loaded) partMap[l.part] = { geo: l.geo, mat: l.mat, geos: l.geos };
    const L = layout();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    // 部品の種類ごとに、細かさ3段（元の形・減らした形・最も粗い形）の描画を1つずつだけ作る。
    // どの物をどの段で描くかは、区切り（遠い塊 FAR_Z・近い区切り CELL）の距離で今までどおり決め、
    // 画面に入る物と影の届く範囲の物だけを毎コマ cull() で並べ直す（描く回数は部品の種類×3 まで）
    for (const { part, geos, mats } of loaded) {
      const items = L.filter((it) => it.part === part);
      if (!items.length) continue;
      geos[0].computeBoundingSphere();
      const bs = geos[0].boundingSphere;
      const meshes = [0, 1, 2].map((l) => {
        const inst = new THREE.InstancedMesh(geos[l], mats[l], items.length);
        inst.matrixAutoUpdate = false; // 置き場所は描画の中の各物が持つ。この物自体は動かない
        inst.castShadow = l < 2; inst.receiveShadow = l < 2; // 影を落とすのは近い段だけ
        inst.frustumCulled = false; // 画面に入るかは cull() が物ごとに調べる
        inst.count = 0; inst.visible = false;
        group.add(inst);
        return inst;
      });
      const entry = { part, items, meshes };
      partEntries.push(entry);
      for (const it of items) {
        p.set(it.x, it.y, it.z); q.setFromEuler(e.set(it.rx, it.ry, it.rz)); s.set(it.sx, it.sy, it.sz);
        it.matrix = m.compose(p, q, s).clone();
        it.ctr = bs.center.clone().applyMatrix4(it.matrix);
        it.rad = bs.radius * Math.max(Math.abs(it.sx), Math.abs(it.sy), Math.abs(it.sz));
        it.slots = []; it.insts = meshes;
        const k = `${Math.floor(it.z / FAR_Z)}_${Math.sign(Math.round(it.x / 110))}`;
        if (!bigs.has(k)) bigs.set(k, { min: [1e9, 1e9], max: [-1e9, -1e9], cells: new Map(), lod: -1 });
        const big = bigs.get(k);
        big.min[0] = Math.min(big.min[0], it.x); big.min[1] = Math.min(big.min[1], it.z);
        big.max[0] = Math.max(big.max[0], it.x); big.max[1] = Math.max(big.max[1], it.z);
        const c = `${Math.floor(it.z / CELL_Z)}_${Math.floor(it.x / CELL_X)}`;
        if (!big.cells.has(c)) big.cells.set(c, { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], lod: -1 });
        const cell = big.cells.get(c);
        cell.min[0] = Math.min(cell.min[0], it.x); cell.min[1] = Math.min(cell.min[1], it.y); cell.min[2] = Math.min(cell.min[2], it.z);
        cell.max[0] = Math.max(cell.max[0], it.x); cell.max[1] = Math.max(cell.max[1], it.y); cell.max[2] = Math.max(cell.max[2], it.z);
        it.big = big; it.cell = cell;
      }
      count += items.length;
      allItems.push(...items);
    }
    buildLights();
    buildKit();
    // 倒れる柱・隔壁は専用の形を使う（中身は同じ1つの形）
    const girder = heavyGirder({ L: 52, W: 8 }); const door = blastDoor();
    partMap.girder = { geo: girder, geos: [girder, girder, girder], mat: kitFacMat };
    partMap.blastDoor = { geo: door, geos: [door, door, door], mat: kitFacMat };
    partMap.hullChunk = { geo: KIT.wreckBow, geos: [KIT.wreckBow, KIT.wreckBow, KIT.wreckBow], mat: kitWreckMat };
    return count;
  });

  // 自機からの距離で、区切りごとに描く細かさを1つだけ選ぶ
  const distBox = (min, max, P) => {
    let d2 = 0;
    for (let i = 0; i < min.length; i++) {
      const v = P[min.length === 2 && i === 1 ? 2 : i];
      const o = v < min[i] ? min[i] - v : v > max[i] ? v - max[i] : 0;
      d2 += o * o;
    }
    return Math.sqrt(d2);
  };
  function pickLod(P) {
    for (const big of bigs.values()) {
      const far = distBox(big.min, big.max, P) > LOD_FAR ? 1 : 0;
      big.lod = far;
      if (far) continue;
      for (const cell of big.cells.values()) cell.lod = distBox(cell.min, cell.max, P) < LOD_NEAR ? 0 : 1;
    }
  }
  // 画面に入る物と、太陽の影の箱（影のカメラの範囲）に入る物だけを、その段の描画へ詰めて並べる。壊れた物は入れない。
  // 描く直前（カメラの向きが決まった後）に呼ぶ。light を渡さないと、影の箱による追加はしない
  const _fr = new THREE.Frustum(); const _frS = new THREE.Frustum(); const _pm = new THREE.Matrix4(); const _sp = new THREE.Sphere();
  function cull(cam = camera, light = null) {
    const op = group.position;
    if (cam) { cam.updateMatrixWorld(); _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); }
    const sh = !!(light && light.castShadow);
    if (sh) { light.updateMatrixWorld(); light.target.updateMatrixWorld(); light.shadow.updateMatrices(light); const sc = light.shadow.camera; _frS.setFromProjectionMatrix(_pm.multiplyMatrices(sc.projectionMatrix, sc.matrixWorldInverse)); }
    for (const { items, meshes } of partEntries) {
      const n = [0, 0, 0];
      for (const it of items) {
        if (it.dead) continue;
        const lod = it.big.lod === 1 ? 2 : it.cell.lod === 1 ? 1 : 0;
        _sp.center.set(it.ctr.x + op.x, it.ctr.y + op.y, it.ctr.z + op.z);
        _sp.radius = it.rad * 1.1 + 2;
        if (cam && !(sh && lod < 2 && _frS.intersectsSphere(_sp)) && !_fr.intersectsSphere(_sp)) continue;
        meshes[lod].setMatrixAt(n[lod]++, it.matrix);
      }
      for (let l = 0; l < 3; l++) {
        const mm = meshes[l]; const c = n[l];
        if (c || mm.count) { const im = mm.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(0, Math.max(c, 1) * 16); im.needsUpdate = true; }
        mm.count = c; mm.visible = c > 0;
      }
    }
  }

  // ---- 灯り ----
  const lightU = nodeUniforms({ uScale: 500, uTime: 0 });
  let lightSizes = null;
  function buildLights() {
    const AMBER = [1.0, 0.5, 0.14]; const RED = [1.0, 0.13, 0.06]; const COOL = [0.72, 0.86, 1.0];
    const box = {};
    for (const part of Object.keys(partMap)) { const g = partMap[part].geo; g.computeBoundingBox(); box[part] = g.boundingBox; }
    const pos = []; const col = []; const info = [];
    const v3 = new THREE.Vector3();
    const addAt = (it, fx, fy, fz, c, size, power, period = 0) => {
      const b = box[it.part];
      v3.set(b.min.x + (b.max.x - b.min.x) * fx, b.min.y + (b.max.y - b.min.y) * fy, b.min.z + (b.max.z - b.min.z) * fz).applyMatrix4(it.matrix);
      it.lights = it.lights || [];
      it.lights.push(info.length);
      (it.lightSize = it.lightSize || {})[info.length] = size;
      pos.push(v3.x, v3.y, v3.z); col.push(...c); info.push([size, power, period]);
    };
    for (const it of allItems) {
      switch (it.part) {
        case 'truss':
          // 骨組みの上の縁に沿って、間を空けて
          addAt(it, 0.06, 0.97, 0.25, AMBER, 1.1, 1.7);
          addAt(it, 0.94, 0.97, 0.75, AMBER, 1.1, 1.7);
          break;
        case 'mast': addAt(it, 0.5, 1.0, 0.5, RED, 2.6, 3.6, 2.4); addAt(it, 0.5, 0.55, 0.5, AMBER, 1.1, 1.6); break;
        case 'hab': addAt(it, 0.5, 0.96, 0.08, AMBER, 1.4, 1.8); addAt(it, 0.5, 0.96, 0.92, AMBER, 1.4, 1.8); break;
        case 'dock': addAt(it, 0.5, 0.5, 0.02, COOL, 2.0, 1.6); addAt(it, 0.12, 0.9, 0.5, AMBER, 1.2, 1.7); addAt(it, 0.88, 0.9, 0.5, AMBER, 1.2, 1.7); break;
        case 'cross': addAt(it, 0.5, 0.98, 0.5, AMBER, 1.3, 1.8); break;
        case 'turret': addAt(it, 0.5, 0.85, 0.5, RED, 1.4, 2.4, 1.6); break;
        case 'solar': addAt(it, 0.5, 0.5, 0.5, COOL, 1.2, 1.0, 3.1); break;
        case 'tank': addAt(it, 0.1, 0.5, 0.5, AMBER, 0.9, 1.3); break;
        case 'box': addAt(it, 0.5, 1.0, 0.5, AMBER, 0.6, 1.1); break;
        default: break;
      }
    }
    const n = info.length;
    const inf = new Float32Array(n * 3);
    info.forEach((a, i) => inf.set(a, i * 3));
    lightSizes = new THREE.InstancedBufferAttribute(inf, 3);
    const pts = new THREE.Sprite(lightMaterial(lightU, new THREE.InstancedBufferAttribute(new Float32Array(pos), 3), new THREE.InstancedBufferAttribute(new Float32Array(col), 3), lightSizes));
    pts.geometry = discTriangle();
    pts.count = n;
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    pts.onBeforeRender = (r) => {
      r.getDrawingBufferSize(_size);
      // 点の直径（世界の単位 1 が画面で何画素か × 距離）。画面の画素で決め、高い画素比の分は three が掛ける
      lightU.uScale.value = _size.y / r.getPixelRatio() / (2 * Math.tan(26 * Math.PI / 180));
      lightU.uTime.value = performance.now() / 1000;
    };
    group.add(pts);
    buildShafts();
  }
  const setLights = (it, on) => {
    if (!it.lights || !lightSizes) return;
    for (const i of it.lights) lightSizes.array[i * 3] = on ? (it.lightSize?.[i] ?? 0) : 0;
    lightSizes.needsUpdate = true;
  };
  const _size = new THREE.Vector2();

  // ---- 光の筋 ----
  function buildShafts() {
    const SHAFTS = 14;
    const quad = new THREE.InstancedBufferGeometry();
    quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    quad.setIndex([0, 1, 2, 0, 2, 3]);
    let seed = 90217;
    const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const a = new Float32Array(SHAFTS * 3); const info = new Float32Array(SHAFTS * 3);
    for (let i = 0; i < SHAFTS; i++) {
      const sd = R() < 0.5 ? -1 : 1;
      a.set([sd * (46 + R() * 150), -20 + R() * 70, start + 40 + (i + R()) / SHAFTS * BASE_LEN], i * 3);
      info.set([340 + R() * 240, 45 + R() * 70, 0.012 + R() * 0.016], i * 3);
    }
    quad.setAttribute('aPos', new THREE.InstancedBufferAttribute(a, 3));
    quad.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 3));
    quad.instanceCount = SHAFTS;
    const d = SCENES[0].sun.dir;
    const axis = new THREE.Vector3(-d[0], -d[1], -d[2]).normalize();
    const mesh = new THREE.Mesh(quad, shaftMaterial(nodeUniforms({ uAxis: axis, uColor: new THREE.Color(1.0, 0.86, 0.68) })));
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
  }

  return {
    // 遠景が溶ける色（道の区間で変わる）
    setHaze(c) { hazeU.value.set(c[0], c[1], c[2]); if (STRUCT_ON) STRUCT_U.hazeColor.value.setRGB(c[0], c[1], c[2]); },
    ready,
    get count() { return count; },
    update(P) { group.position.set(-P[0], -P[1], -P[2]); pickLod(P); updateKit(P); },
    // 基地の範囲にある小惑星を小さくする量（1=そのまま、0=消す）。道と建物に岩が重ならないようにする
    rockKeep(x, y, z) {
      if (z < start - 80 || z > ARENA_Z + 220) return 1;
      const k = (Math.abs(x) - 215) / 40;
      return Math.max(0, Math.min(1, k));
    },
    setVisible(v) { group.visible = v; },
    start,
    items: allItems,
    // 壊れた部品を消す（同じ物の描画の中の1つを大きさ0にする）
    hideItem(it) { it.dead = true; setLights(it, false); },
    // 部品の向き（y 軸まわり）を変える。砲台を自機へ向けるのに使う（次の cull() で描画に入る）
    setItemYaw(it, yaw) {
      _q.setFromEuler(_e.set(it.rx, yaw, it.rz));
      it.matrix.compose(_p.set(it.x, it.y, it.z), _q, _s.set(it.sx, it.sy, it.sz));
    },
    showItem(it) { it.dead = false; setLights(it, true); },
    // 描く直前に、画面に入る物だけを並べ直す（main.js の renderFrame から呼ぶ）
    cull,
    group,
    parts: partMap,
  };
}
