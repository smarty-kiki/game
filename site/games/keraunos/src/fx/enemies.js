import * as THREE from 'three';
import {
  Fn, attribute, varying, select, instanceIndex, positionGeometry, modelViewMatrix,
  vec3, vec4, float, exp, pow, max, mix, clamp, smoothstep, step, length, normalize, cross, dot, abs, fract, sin, atan,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, viewVertex, edgeMask, softFade } from './soft.js';
import { createTube, tubeGeometry } from './tube.js';
import { KIND } from './puffs.js';
import { upgradeMaterial } from './hardsurface.js';
import { getPbr } from './pbr.js';
import { boltHeat } from './distortion.js';

// 敵：上級機（重巡洋艦）。自機のまわりを大きく回りながら、主砲・副砲・誘導弾で撃ってくる。
// 位置は世界の座標（far）で持ち、毎コマ自機からの相対（rel）にして置く。
// 当たり判定は胴の前・中・後ろの3つの球を world.targets に入れ、自機の武器がそのまま当たる。
// 撃沈すると連鎖して爆発し、砲塔・翼・マスト・発射箱が本物の部品のまま外れて飛ぶ。

const SCALE = 2.6;
const MAX_HP = 180;
const MAIN_SPEED = 120;   // 主砲の弾の速さ（ブーストなら振り切れる）
const SUB_SPEED = 150;
const BOLT_MAX = 64;
const PLAYER_R = 0.95;    // 自機の当たりの半径
const CRUISER_LANE = { x: 10, y0: 2, y: 4 }; // 面の中で重巡洋艦が並走する所（道の筒の中心からの左右の揺れ・上下の中心と揺れ。spec REQ-021）
const CRUISER_ASSIST = 0.5; // 重巡洋艦の胴へ寄せる角度（ラジアン・約29度。艦は自機の前の左右30度ほどを回る）。ツインの既定は 0.05
let SHIELD_MAX = 100; // 機体ごとに createEnemies の shieldMax で変わる

// 弾の帯の頂点：軸に沿って伸び、軸のまわりでカメラへ向く（弾と予告の線で共通）
function boltVertex() {
  const aOrigin = attribute('aOrigin', 'vec3');
  const aDir = attribute('aDir', 'vec3');
  const aLen = attribute('aLen', 'float');
  const aWidth = attribute('aWidth', 'float');
  const aAlpha = attribute('aAlpha', 'float');
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const headV = modelViewMatrix.mul(vec4(aOrigin, 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(aDir, 0.0)).xyz);
  const toCam = normalize(headV.xyz.negate());
  const c = cross(axisV, toCam);
  const sideV = select(length(c).greaterThan(0.05), normalize(c), vec3(1.0, 0.0, 0.0));
  // 正面から来る弾は尾が自分の方へ伸びて大きな三角に見えるので、尾を細く短くする（頭の光の玉で見せる）
  const facing = float(1.0).sub(abs(dot(axisV, toCam)));
  const side = smoothstep(0.02, 0.3, facing);
  const w = aWidth.mul(float(0.25).add(pow(aT, 1.5).mul(0.75))).mul(mix(0.12, 1.0, side));
  const p = headV.xyz.sub(axisV.mul(float(1.0).sub(aT).mul(aLen).mul(mix(0.25, 1.0, side)))).add(sideV.mul(aSide).mul(w));
  // カメラのすぐ脇を通る尾は薄くする（遠近で画面を横切る巨大なくさびに見える）
  const vAlpha = varying(aAlpha.mul(smoothstep(2.0, 10.0, p.z.negate())), 'vAlpha');
  return { ...viewVertex(vec4(p, 1.0)), vT: varying(aT, 'vT'), vSide: varying(aSide, 'vSide'), vAlpha };
}

// 敵の光弾：赤橙の太い弾。先端が白く、尾へ赤く消える
function boltMaterial() {
  const bv = boltVertex();
  const fragmentNode = Fn(() => {
    const x = abs(bv.vSide);
    const core = exp(x.mul(x).negate().div(0.05));
    const glow = exp(x.mul(x).mul(-2.6)).mul(0.55);
    const head = smoothstep(0.78, 1.0, bv.vT).mul(float(1.0).sub(smoothstep(0.985, 1.0, bv.vT)));
    const tail = pow(bv.vT, 1.4);
    const a = core.mul(float(0.8).add(head.mul(1.6))).add(glow.mul(float(0.35).add(head.mul(1.2)))).mul(tail).mul(bv.vAlpha);
    const hot = mix(vec3(1.0, 0.18, 0.06), vec3(1.0, 0.62, 0.25), core);
    const col = mix(hot, vec3(1.0, 0.95, 0.85), clamp(core.mul(head).mul(1.4), 0.0, 1.0));
    return vec4(col.mul(3.0), a.mul(softFade(0.04, bv.viewDist)));
  })();
  return glowNodeMaterial({}, { vertexNode: bv.vertexNode, fragmentNode });
}

// 予告の線：撃つ前に、弾が通る線を細い赤で示す。点線が自機の方へ流れ、撃つ直前に明るくなる
function warnMaterial(U) {
  const bv = boltVertex();
  const fragmentNode = Fn(() => {
    const x = abs(bv.vSide);
    const core = exp(x.mul(x).negate().div(0.08));
    const dash = float(0.55).add(step(0.5, fract(bv.vT.mul(14.0).add(U.uTime.mul(3.0)))).mul(0.45));
    const a = core.mul(dash).mul(bv.vAlpha).mul(float(0.35).add(smoothstep(0.0, 0.15, bv.vT.oneMinus()).mul(0.65)));
    return vec4(vec3(1.0, 0.16, 0.08).mul(2.4), a.mul(softFade(0.04, bv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bv.vertexNode, fragmentNode });
}

// 光の玉（砲口の溜め・誘導弾の頭・噴射口）
function orbMaterial(color, size) {
  const U = nodeUniforms({ uSize: size, uAspect: 1, uRot: 0, uOpacity: 0, uColor: new THREE.Color(...color) });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const r = length(bb.vC);
    const core = exp(r.mul(r).mul(-24.0)).mul(2.2);
    const halo = pow(max(0.0, r.oneMinus()), 2.6).mul(0.8);
    const a = core.add(halo).mul(U.uOpacity).mul(edgeMask(bb.vC));
    const col = mix(U.uColor, vec3(1.0, 0.95, 0.88), clamp(core.mul(0.6), 0.0, 1.0));
    return vec4(col.mul(2.6), a.mul(softFade(0.05, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

// 弾の頭の光の玉（遠くでも丸く光って見えるように）
// 白く熱い芯と、揺らぐ橙の外の光（輪や十字を描くと玩具に見えるので描かない）
function headMaterial(U) {
  const aOrigin = attribute('aOrigin', 'vec3');
  const aSize = attribute('aSize', 'float');
  const aAlpha = attribute('aAlpha', 'float');
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const vSeed = varying(fract(float(instanceIndex).mul(0.618)), 'vSeed');
  const c = modelViewMatrix.mul(vec4(aOrigin, 1.0));
  // すぐ目の前では薄くする（カメラの前で大きな玉にならない）
  const vAlpha = varying(aAlpha.mul(mix(0.12, 1.0, smoothstep(2.0, 14.0, c.z.negate()))), 'vAlpha');
  // 遠いほど少し大きくして、点にならないようにする
  const grow = float(1.0).add(clamp(c.z.negate().div(90.0), 0.0, 0.6));
  const vv = viewVertex(vec4(c.xy.add(positionGeometry.xy.mul(2.0).mul(aSize).mul(grow)), c.z, c.w));
  const fragmentNode = Fn(() => {
    const r = length(vC);
    const ang = atan(vC.y, vC.x);
    const t = U.uTime.mul(9.0).add(vSeed.mul(6.28));
    const wob = float(1.0).add(sin(ang.mul(5.0).add(t)).mul(0.12)).add(sin(ang.mul(9.0).sub(t.mul(1.7))).mul(0.08));
    const rr = r.mul(wob);
    const core = exp(rr.mul(rr).mul(-60.0)).mul(2.2);
    const shell = exp(rr.mul(rr).mul(-14.0)).mul(0.6);
    const halo = pow(max(0.0, rr.oneMinus()), 3.6).mul(0.28);
    const a = core.add(shell).add(halo).mul(vAlpha).mul(edgeMask(vC));
    const col0 = mix(vec3(1.0, 0.12, 0.04), vec3(1.0, 0.55, 0.15), clamp(shell.add(halo.mul(0.4)), 0.0, 1.0));
    const col = mix(col0, vec3(1.0, 0.95, 0.88), clamp(core.mul(0.5), 0.0, 1.0));
    return vec4(col.mul(2.0), a.mul(softFade(0.05, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

function headGeometry() {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  for (const [name, n] of [['aOrigin', 3], ['aSize', 1], ['aAlpha', 1]]) {
    g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(BOLT_MAX * n), n).setUsage(THREE.DynamicDrawUsage));
  }
  g.instanceCount = 0;
  return g;
}

function boltGeometry() {
  const g = new THREE.InstancedBufferGeometry();
  const pos = []; const aT = []; const aSide = []; const idx = [];
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const s of [-1, 1]) { pos.push(0, 0, 0); aT.push(t); aSide.push(s); }
  }
  for (let r = 0; r < rows - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setIndex(idx);
  for (const [name, n] of [['aOrigin', 3], ['aDir', 3], ['aLen', 1], ['aWidth', 1], ['aAlpha', 1]]) {
    g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(BOLT_MAX * n), n).setUsage(THREE.DynamicDrawUsage));
  }
  g.instanceCount = 0;
  return g;
}

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const len3 = (x, y, z) => Math.hypot(x, y, z);

export function createEnemies({ scene, world, puffs, onPlayerDown = () => {}, onShieldHit = () => {}, auto = true, onCruiserDead = () => {}, enabled = true, placeNear = false, startHp = MAX_HP, startShield, shieldMax = 100 }) {
  const R = puffs.rnd;
  const group = new THREE.Group();
  scene.add(group);

  // ---- 弾 ----
  const boltMesh = new THREE.Mesh(boltGeometry(), boltMaterial());
  boltMesh.frustumCulled = false;
  boltMesh.renderOrder = 7;
  group.add(boltMesh);
  const warnU = nodeUniforms({ uTime: 0 });
  const warnMesh = new THREE.Mesh(boltGeometry(), warnMaterial(warnU));
  warnMesh.frustumCulled = false;
  group.add(warnMesh);
  const headMesh = new THREE.Mesh(headGeometry(), headMaterial(warnU));
  headMesh.frustumCulled = false;
  headMesh.renderOrder = 8;
  group.add(headMesh);
  const bolts = [];

  const quad = new THREE.PlaneGeometry(1, 1);
  function orb(color, size) {
    const m = new THREE.Mesh(quad, orbMaterial(color, size));
    m.frustumCulled = false;
    m.renderOrder = 9;
    return m;
  }

  // ---- 誘導弾 ----
  const missiles = [];
  for (let i = 0; i < 12; i++) {
    const head = orb([1.0, 0.25, 0.1], 0.3);
    head.visible = false;
    group.add(head);
    const m = { head, alive: false, far: [0, 0, 0], vel: [0, 0, 0], age: 0, acc: 0, rel: new THREE.Vector3(), radius: 0, size: 0.6, aim: false };
    m.onDamage = () => { killMissile(m, true); return false; };
    world.targets.push(m);
    missiles.push(m);
  }

  // ---- 自機の盾と表示 ----
  SHIELD_MAX = shieldMax;
  let shield = startShield === undefined ? SHIELD_MAX : startShield;
  let hurt = 0;
  let lastHit = -9;
  let hits = 0;
  let down = false;
  let breaks = 0;
  let deflects = 0;
  const hud = document.createElement('div');
  hud.className = 'ui ui-bossbar';
  hud.innerHTML = '<div><div class="row"><span id="eName">重巡洋艦</span></div><div class="ui-track"><i class="lag" id="eLag"></i><i class="fill" id="eBar"></i></div></div>';
  const hud2 = document.createElement('div');
  hud2.className = 'ui'; hud2.id = 'uiShield';
  hud2.innerHTML = '<div class="row"><span class="ui-label">SHIELD</span><b id="pNum">100</b></div><div class="ui-track"><i class="lag" id="pLag"></i><i class="fill" id="pBar"></i></div>';
  const flashDiv = document.createElement('div');
  // 被弾の画面の縁：暗い赤を縁にだけ、撃たれた側へ寄せて出す（画面全体を赤く染めない）
  flashDiv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0';
  const edgeBg = (x, y) => `radial-gradient(ellipse 72% 76% at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(110,8,2,0) 66%, rgba(135,14,4,.34) 88%, rgba(80,5,1,.72) 100%)`;
  flashDiv.style.background = edgeBg(50, 50);
  let edge = 0;
  if (enabled) { document.body.append(hud, hud2, flashDiv); }
  const eBar = hud.querySelector('#eBar');
  const pBar = hud2.querySelector('#pBar');
  const pLag = hud2.querySelector('#pLag');
  const pNum = hud2.querySelector('#pNum');
  const eLag = hud.querySelector('#eLag');

  // ---- 敵の本体 ----
  let ship = null;

  function setModel(gltf) {
    if (!enabled) return;
    const root = gltf.scene;
    root.scale.setScalar(SCALE);
    const holder = new THREE.Group();
    holder.add(root);
    group.add(holder);
    const node = (n) => root.getObjectByName(n);

    // 当たった時に全体を赤白く光らせる（材質の最後に色を足す）
    const hitU = { value: 0 };
    // 受けた傷の分だけ船体が焦げる
    const burnU = { value: 0 };
    // 部品の座標を艦全体の座標にそろえる（継ぎ目の線が部品ごとにずれないように）
    const rootInv = { value: new THREE.Matrix4() };
    const mats = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const src = o.material;
      if (!mats.has(src)) mats.set(src, upgradeMaterial(src, { hit: hitU, root: rootInv, burn: burnU, cell: 0.32, rim: 0.035, env: 0.75, pbr: getPbr('heavy', src.name) }));
      o.material = mats.get(src);
    });

    // 噴射：後ろの3つの噴射口から、赤橙の筒と光
    const jetGeom = tubeGeometry(40, 24);
    const jets = [];
    for (const [x, y, r] of [[0, 0.2, 0.15], [0.3, -0.12, 0.13], [-0.3, -0.12, 0.13]]) {
      // 噴射は短く、橙から暗い赤へ（赤に白を足すとピンクの棒に見える）
      const outer = createTube(jetGeom, { len: 0.75, radius: r * 0.9, near: [1.0, 0.42, 0.08], far: [0.55, 0.06, 0.01], intensity: 0.85, sharp: 2.2, flowAmount: 0.6, flowSpeed: 18, flowScale: 2.2, bulge: 0.1, bulgeFreq: 22, wobble: 0.06, endFade: 1.3, seed: x * 9 + y });
      const inner = createTube(jetGeom, { len: 0.4, radius: r * 0.4, near: [1.0, 0.78, 0.42], far: [1.0, 0.36, 0.06], intensity: 1.5, sharp: 1.8, flowAmount: 0.3, flowSpeed: 26, flowScale: 3, bulge: 0.35, bulgeFreq: 26, wobble: 0.02, endFade: 1.8, seed: x * 5 + 3 });
      for (const t of [outer, inner]) {
        t.mesh.position.set(x, y, -1.5);
        t.mesh.rotation.set(0, Math.PI, 0);
        t.mesh.renderOrder = 3;
        root.add(t.mesh);
      }
      jets.push(outer, inner);
    }
    // 噴射の光は、いつも見えている敵のまとまりの下に置き、毎コマ噴射口の位置へ動かす。
    // 艦の中に入れると、艦を隠す・出すたびに場面の光の数が変わり、光を受ける材質のシェーダーが全部作り直されて数秒止まる
    const jetLight = new THREE.PointLight(0xff6a2a, 0, 9, 2);
    const jetLocal = new THREE.Vector3(0, 0, -1.8);
    group.add(jetLight);

    // 主砲の溜めの光（砲口ごと）
    const mainMuzzles = ['主砲塔_砲口穴_左', '主砲塔_砲口穴_右'].map((n) => {
      const o = orb([1.0, 0.3, 0.1], 0.5);
      node(n).add(o);
      o.position.set(0, 0, 0.03);
      return { node: node(n), glow: o };
    });
    const subTurrets = ['右', '左'].map((s) => ({
      yaw: node(`副砲塔_${s}_旋回`),
      pitch: node(`副砲塔_${s}_砲身`),
      muzzles: [node(`副砲塔_${s}_砲口穴_左`), node(`副砲塔_${s}_砲口穴_右`)],
      cool: 1 + R() * 2,
      burst: 0,
      next: 0,
      flip: 0,
    }));
    const missileNodes = [];
    for (const s of ['右', '左']) for (const k of ['00', '01', '02', '10', '11', '12']) {
      missileNodes.push([node(`ミサイル_${s}_${k}`), node(`ミサイル_${s}_${k}_先`)]);
    }

    // 撃沈で外れて飛ぶ部品
    const parts = ['主砲塔_旋回', '副砲塔_右_旋回', '副砲塔_左_旋回', 'マスト', '翼取付_右', '翼取付_左', '発射箱_右', '発射箱_左'].map((n) => {
      const o = node(n);
      return { o, parent: o.parent, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone(), far: [0, 0, 0], vel: [0, 0, 0], axis: new THREE.Vector3(), spin: 0, acc: 0 };
    });

    // 当たり判定の球（模型の座標で、前・中・後ろ）
    const spheres = [[0, 0, 0.95, 0.72], [0, 0, 0, 0.98], [0, 0, -0.95, 0.72]].map(([x, y, z, r], i) => {
      // 胴の中心の球だけ狙える。機首が動ける範囲の外（左右・上下 20〜30 度）を回るので、寄せる角度を広げる（spec REQ-021）
      const t = { local: new THREE.Vector3(x, y, z), rel: new THREE.Vector3(), radius: r * SCALE, r0: r * SCALE, size: 3, aim: i === 1, assistAng: i === 1 ? CRUISER_ASSIST : undefined };
      t.onDamage = (amount, state) => hitShip(amount, state);
      world.targets.push(t);
      return t;
    });

    ship = {
      rootInv,
      holder, root, node, hitU, burnU, jets, jetLight, jetLocal, mainMuzzles, subTurrets, missileNodes, parts, spheres,
      mainYaw: node('主砲塔_旋回'), mainPitch: node('主砲塔_砲身'),
      doors: [node('扉ヒンジ_右'), node('扉ヒンジ_左')],
      wings: [node('翼ヒンジ_右'), node('翼ヒンジ_左')],
      far: [0, 0, 0], q: new THREE.Quaternion(), speed: 30, bank: 0, yawRate: 0,
      hp: MAX_HP, alive: true, dying: -1, respawnAt: 0, hitFlash: 0, lastHitSmoke: 0,
      mainCool: 2.5, charge: 0, chargeSide: 0, missileCool: 7, doorOpen: 0, launch: -1, launched: 0,
      wingOpen: 0, smokeAcc: 0, placed: false, wounds: [],
    };
  }

  // ---- 敵への被弾 ----
  function hitShip(amount, state) {
    if (!ship || !ship.alive) return false;
    ship.hp -= amount;
    ship.hitFlash = Math.min(1, ship.hitFlash + 0.35 + amount * 0.02);
    if (ship.hp > 0) return false;
    ship.hp = 0;
    ship.alive = false;
    ship.dying = 0;
    for (const s of ship.spheres) s.radius = 0;
    void state;
    return false; // 大爆発はこちらで連鎖させる（武器側の爆発は出さない）
  }

  function killMissile(m, shotDown) {
    if (!m.alive) return;
    m.alive = false;
    m.radius = 0;
    m.head.visible = false;
    if (shotDown) explodeAt(m.rel.toArray(), 1.1);
  }

  const fxRef = { fx: null };
  function explodeAt(rel, size) { if (fxRef.fx) fxRef.fx.explode(rel, size); }

  // ---- 置き直し ----
  const _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4();
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  function place(player, near) {
    const P = player.pos;
    const f = v3(player.forward);
    const right = _a.copy(UP).applyQuaternion(_q.set(player.q[0], player.q[1], player.q[2], player.q[3]));
    const side = new THREE.Vector3().crossVectors(f, right).normalize();
    const dist = near ? 50 : 190;
    const off = near ? new THREE.Vector3() : side.clone().multiplyScalar(45).add(right.clone().multiplyScalar(12));
    const pos = f.clone().multiplyScalar(dist).add(off);
    ship.far = [P[0] + pos.x, P[1] + pos.y, P[2] + pos.z];
    // 自機の前を横切る向き（near は自機へ斜めに向く）
    // 自機と同じ向きに進ませる（前方に陣取って並走する）
    const dir = f.clone().add(side.clone().multiplyScalar(near ? 0.25 : -0.3)).normalize();
    _m.lookAt(new THREE.Vector3(), dir.negate(), right);
    ship.q.setFromRotationMatrix(_m);
    ship.hp = ship.placed ? MAX_HP : startHp;
    ship.alive = true;
    ship.wounds = [];
    ship.fall = null;
    ship.dying = -1;
    ship.placed = true;
    ship.holder.visible = true;
    ship.wingOpen = near ? 1 : 0;
    for (const s of ship.spheres) s.radius = s.r0;
    for (const p of ship.parts) {
      p.parent.add(p.o);
      p.o.position.copy(p.pos);
      p.o.quaternion.copy(p.quat);
      p.o.scale.copy(p.scale);
      p.o.visible = true;
    }
    for (const [a, b] of ship.missileNodes) { a.visible = true; b.visible = true; }
  }

  // ---- 自機への被弾 ----
  function hurtPlayer(amount, state, rel, fx) {
    shield = Math.max(0, shield - amount);
    onShieldHit(rel, 'hit', shield < 30);
    hurt = Math.min(1, hurt + 0.35 + amount * 0.025);
    edge = Math.min(1, edge + 0.45 + amount * 0.03);
    // 撃たれた側の縁が濃くなるよう、楕円の中心を反対へずらす
    const cam = puffs.camera;
    if (cam) {
      const l = Math.hypot(rel[0], rel[1], rel[2]) || 1;
      _a.setFromMatrixColumn(cam.matrixWorld, 0);
      _b.setFromMatrixColumn(cam.matrixWorld, 1);
      const sx = (rel[0] * _a.x + rel[1] * _a.y + rel[2] * _a.z) / l;
      const sy = (rel[0] * _b.x + rel[1] * _b.y + rel[2] * _b.z) / l;
      flashDiv.style.background = edgeBg(50 - sx * 20, 50 + sy * 20);
    }
    lastHit = state.time;
    const m = Math.hypot(rel[0], rel[1], rel[2]) || 1;
    // カメラの目の前なので、閃光は出さず火花と炎と煙だけにする。
    // 機体のそばの座標（near）で出す：世界の座標だと機体が進む分だけカメラへ迫って、大きな火の玉に見える
    const n = [rel[0] / m, rel[1] / m, rel[2] / m];
    const big = amount >= 10;
    for (let i = 0; i < (big ? 34 : 16); i++) {
      const d = [R() - 0.5, R() - 0.5, R() - 0.5];
      const sp = 6 + R() * 20;
      puffs.spark(rel, [(n[0] + d[0]) * sp * 0.4, (n[1] + d[1]) * sp * 0.4, (n[2] + d[2]) * sp * 0.4], 0.16 + R() * 0.28, 0.012, 0.012, 0, 3.2, 0);
    }
    for (let i = 0; i < (big ? 6 : 3); i++) {
      const d = [R() - 0.5, R() - 0.5, R() - 0.5];
      puffs.puff(rel, [(n[0] + d[0]) * 1.2, (n[1] + d[1]) * 1.2, (n[2] + d[2]) * 1.2], 0.16 + R() * 0.14, 0.04, 0.13, KIND.FIRE, 3, 0);
      puffs.puff(rel, [n[0] * 0.8 + d[0] * 0.4, n[1] * 0.8 + d[1] * 0.4, n[2] * 0.8 + d[2] * 0.4], 0.45 + R() * 0.35, 0.04, 0.2, KIND.SOOT, 1.5, 0);
    }
    hits += 1;
    if (shield <= 0 && !down) {
      down = true;
      breaks += 1;
      bolts.length = 0;
      onPlayerDown();
    }
  }

  function deflect(rel, dir) {
    onShieldHit(rel, 'deflect', false);
    const m = Math.hypot(rel[0], rel[1], rel[2]) || 1;
    const n = [rel[0] / m, rel[1] / m, rel[2] / m];
    puffs.puff(rel, [0, 0, 0], 0.06, 0.12, 0.45, KIND.FLASH, 0, 0);
    for (let i = 0; i < 18; i++) {
      const d = [R() - 0.5, R() - 0.5, R() - 0.5];
      const sp = 10 + R() * 22;
      // 来た向きを面で折り返した方向へ散らす
      const dn = dir[0] * n[0] + dir[1] * n[1] + dir[2] * n[2];
      const r = [dir[0] - 2 * dn * n[0], dir[1] - 2 * dn * n[1], dir[2] - 2 * dn * n[2]];
      puffs.spark(rel, [(r[0] + d[0]) * sp * 0.4, (r[1] + d[1]) * sp * 0.4, (r[2] + d[2]) * sp * 0.4], 0.16 + R() * 0.22, 0.014, 0.012, 1, 3, 0);
    }
    deflects += 1;
  }

  // 弾は撃つ前に WARN 秒だけ砲口に留まり、通る線を見せる（狙いはその時に決まる。動けば避けられる）
  const WARN = [0.5, 0.42];
  function fireBolt(fromRel, P, dir, speed, kind, warn = WARN[kind] ?? 0.4, scale = 1) {
    if (bolts.length >= BOLT_MAX) bolts.shift();
    // 國松の指示で発射前の予告（線と砲口の光）を出さない。すぐ飛ぶ
    bolts.push({ far: [fromRel[0] + P[0], fromRel[1] + P[1], fromRel[2] + P[2]], dir, speed, age: 0, warn: 0, life: 2.6, scale, kind });
  }

  // 自機の未来の位置へ向ける。少しばらつかせて避けられるようにする
  // 狙い：自機が今の動きを続けた時に居る所（予告の間＋弾が飛ぶ間の分だけ先）。
  // 同じ向きへ動き続けると当たり、予告の線を見て向きを変えるか止まるか回避すればかわせる
  function leadDir(fromRel, player, speed, spread, warn = 0.45) {
    const v = player.vel || [player.forward[0] * player.speed, player.forward[1] * player.speed, player.forward[2] * player.speed];
    let tx = -fromRel[0]; let ty = -fromRel[1]; let tz = -fromRel[2];
    // 届くまでの時間は、未来の位置までの距離で2回詰める
    let t = len3(tx, ty, tz) / speed; // 予告が無くなったので、留まる時間は足さない
    for (let k = 0; k < 2; k++) t = len3(tx + v[0] * t, ty + v[1] * t, tz + v[2] * t) / speed;
    tx += v[0] * t + (R() - 0.5) * spread; ty += v[1] * t + (R() - 0.5) * spread; tz += v[2] * t + (R() - 0.5) * spread;
    const l = len3(tx, ty, tz) || 1;
    return [tx / l, ty / l, tz / l];
  }

  // 砲塔を自機へ向ける（旋回は y、砲身は x。負が上向き）。狙いの誤差を返す
  const _p = new THREE.Vector3();
  function aimTurret(yawNode, pitchNode, dt, rate) {
    _p.set(0, 0, 0);
    yawNode.parent.worldToLocal(_p);
    const want = Math.atan2(_p.x - yawNode.position.x, _p.z - yawNode.position.z);
    let d = want - yawNode.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    yawNode.rotation.y += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    yawNode.updateMatrixWorld(true);
    _p.set(0, 0, 0);
    pitchNode.parent.worldToLocal(_p);
    const dy = _p.y - pitchNode.position.y;
    const dh = Math.hypot(_p.x - pitchNode.position.x, _p.z - pitchNode.position.z);
    const wantP = THREE.MathUtils.clamp(-Math.atan2(dy, dh), -0.9, 0.25);
    const e = wantP - pitchNode.rotation.x;
    pitchNode.rotation.x += Math.sign(e) * Math.min(Math.abs(e), rate * 0.8 * dt);
    return Math.abs(d) + Math.abs(e);
  }

  function worldPos(o) { o.getWorldPosition(_c); return [_c.x, _c.y, _c.z]; }

  function update(state, player, fx, dt) {
    fxRef.fx = fx;
    const P = player.pos;
    // 盾は撃たれていない間に少しずつ戻る
    if (state.time - lastHit > 4 && !down) shield = Math.min(SHIELD_MAX, shield + dt * 4);
    hurt = Math.max(0, hurt - dt * 2.2);
    edge = Math.max(0, edge - dt * 3.0);
    // シールドが少ない間は、縁がゆっくり脈打って残る
    const lowPulse = shield < 30 && !down ? (0.22 + 0.1 * Math.sin(state.time * 5)) * (1 - shield / 30) : 0;
    const edgeNow = Math.min(1, Math.max(edge, lowPulse));
    if (edgeNow !== flashDiv._v) { flashDiv._v = edgeNow; flashDiv.style.opacity = edgeNow.toFixed(3); }
    // 画面の文字と幅は、変わったときだけ書く（毎コマの書き込みを減らす。spec REQ-013）
    const shW = `${shield / SHIELD_MAX * 100}%`;
    if (shW !== pBar._w) { pBar._w = shW; pBar.style.width = shW; pLag.style.width = shW; }
    const shN = String(Math.max(0, Math.ceil(shield)));
    if (shN !== pNum._t) { pNum._t = shN; pNum.textContent = shN; }
    const shLow = shield < SHIELD_MAX * 0.3;
    if (shLow !== hud2._low) { hud2._low = shLow; hud2.classList.toggle('low', shLow); }

    if (ship) updateShip(state, player, fx, dt, P);
    updateBolts(state, player, fx, dt, P);
    updateMissiles(state, player, fx, dt, P);
  }

  function updateShip(state, player, fx, dt, P) {
    const s = ship;
    // 面の進行で出すとき（auto=false）は、spawnCruiser が呼ばれるまで出さない
    if (!s.placed) {
      if (!auto) { s.holder.visible = false; s.jetLight.intensity = 0; for (const t of s.spheres) t.radius = 0; hud.style.opacity = '0'; return; }
      place(player, placeNear);
    }
    if (!s.alive && s.dying < 0) {
      if (auto && state.time > s.respawnAt) place(player, false);
      hud.style.opacity = '0';
      return;
    }

    // 動き：自機の前方に陣取り、左右・上下にゆっくり揺れながら並走する。
    // 自機が向きを変えれば、大きく回り込んで前へ戻ろうとする
    const rel = _a.set(s.far[0] - P[0], s.far[1] - P[1], s.far[2] - P[2]);
    const d = rel.length();
    if (s.alive && d > 520) { place(player, false); return; }
    const fwd = _b.set(0, 0, 1).applyQuaternion(s.q);
    if (s.alive) {
      s.orbitT = (s.orbitT || 0) + dt;
      const t = s.orbitT;
      const pq = _q.set(player.q[0], player.q[1], player.q[2], player.q[3]);
      const pf = new THREE.Vector3(0, 0, 1).applyQuaternion(pq);
      const pu = new THREE.Vector3(0, 1, 0).applyQuaternion(pq);
      const pr = new THREE.Vector3().crossVectors(pf, pu);
      // 面の中（レールの上、auto=false）では、居場所を道の筒の中心（x=y=0）から決める。自機を基準にすると艦も自機と一緒にずれ、
      // 寄っても射線に重ならず、筒の外（自機の届かない上下左右）まで出ていた（spec REQ-021、11/10「射程外の上下左右に寄りすぎて攻撃が当たらない」）。
      // 揺れは左右 ±10・上下 -2〜6（前方 36±8 では正面から 15 度以内）にして、自機が寄れば重なるようにする
      const station = auto
        ? pf.clone().multiplyScalar(36 + 8 * Math.sin(t * 0.21))
          .addScaledVector(pr, 20 * Math.sin(t * 0.33))
          .addScaledVector(pu, 5 + 6 * Math.sin(t * 0.23 + 1.0))
        : new THREE.Vector3(CRUISER_LANE.x * Math.sin(t * 0.33) - P[0], CRUISER_LANE.y0 + CRUISER_LANE.y * Math.sin(t * 0.23 + 1.0) - P[1], 36 + 8 * Math.sin(t * 0.21));
      const toSt = station.sub(rel);
      const vel = pf.clone().multiplyScalar(player.speed).addScaledVector(toSt, 0.55);
      // 面の中では、寄るときも前へ進む速さ（自機の 1/4）を残し、向きを反転させない。反転すると曲がりが遅いので大回りになり、
      // 出てから十数秒、自機の後ろ・下（160m ほど）を回っていた（spec REQ-021、11/10）
      if (!auto) { const fz = vel.dot(pf); if (fz < player.speed * 0.25) vel.addScaledVector(pf, player.speed * 0.25 - fz); }
      const vmax = player.speed + 45;
      if (vel.length() > vmax) vel.setLength(vmax);
      s.speed = THREE.MathUtils.clamp(vel.length(), 14, vmax);
      const want = vel.normalize();
      const axis = new THREE.Vector3().crossVectors(fwd, want);
      const ang = Math.acos(THREE.MathUtils.clamp(fwd.dot(want), -1, 1));
      const turn = Math.min(ang, 0.75 * dt);
      if (axis.lengthSq() > 1e-8) s.q.premultiply(_q.setFromAxisAngle(axis.normalize(), turn));
      // 機首を水平へ戻す力（宙返りしない）
      const upNow = new THREE.Vector3(0, 1, 0).applyQuaternion(s.q);
      const f2 = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
      const rollErr = Math.atan2(new THREE.Vector3().crossVectors(upNow, UP).dot(f2), upNow.dot(UP));
      const yawSign = Math.sign(axis.y || 0) * turn / Math.max(dt, 1e-4);
      s.yawRate += (yawSign - s.yawRate) * (1 - Math.exp(-dt * 1.5));
      const wantBank = -s.yawRate * 0.9;
      s.q.premultiply(_q.setFromAxisAngle(f2, (rollErr + wantBank) * Math.min(1, dt * 1.2)));
    } else {
      // 撃沈中は惰性で進みながら沈むように回る
      // 自機と同じくらいの速さで前を流れたまま、自機の進路から下と横へ外れて落ちていく（煙の中を通らせない）
      s.speed += (player.speed * 0.97 - s.speed) * (1 - Math.exp(-dt * 2));
      if (!s.fall) {
        const pq2 = _q.set(player.q[0], player.q[1], player.q[2], player.q[3]);
        const pu2 = new THREE.Vector3(0, 1, 0).applyQuaternion(pq2);
        const pr2 = new THREE.Vector3(1, 0, 0).applyQuaternion(pq2);
        const side = Math.sign(s.holder.position.dot(pr2)) || 1;
        s.fall = pu2.multiplyScalar(-0.75).addScaledVector(pr2, side * 0.65).normalize();
      }
      const fk = Math.min(1, s.dying / 1.2) * 14 * dt;
      s.far[0] += s.fall.x * fk; s.far[1] += s.fall.y * fk; s.far[2] += s.fall.z * fk;
      s.q.premultiply(_q.setFromAxisAngle(_b.set(0, 0, 1).applyQuaternion(s.q), dt * 0.5));
      s.q.premultiply(_q.setFromAxisAngle(_c.set(1, 0, 0).applyQuaternion(s.q), dt * 0.12));
    }
    const f3 = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
    s.far[0] += f3.x * s.speed * dt; s.far[1] += f3.y * s.speed * dt; s.far[2] += f3.z * s.speed * dt;
    s.holder.position.set(s.far[0] - P[0], s.far[1] - P[1], s.far[2] - P[2]);
    s.holder.quaternion.copy(s.q);
    s.holder.updateMatrixWorld(true);
    s.rootInv.value.copy(s.holder.matrixWorld).invert();
    s.holder.updateMatrixWorld(true);
    const relA = s.holder.position.toArray();

    // 当たり判定の球を動かす
    for (const t of s.spheres) {
      _c.copy(t.local).applyMatrix4(s.root.matrixWorld);
      t.rel.copy(_c);
    }

    // 翼は戦闘の距離に入ると開く
    s.wingOpen += ((s.alive && d < 260 ? 1 : 0) - s.wingOpen) * (1 - Math.exp(-dt * 1.2));
    const wk = s.wingOpen * s.wingOpen * (3 - 2 * s.wingOpen);
    s.wings[0].rotation.y = -1.0 * wk;
    s.wings[1].rotation.y = 1.0 * wk;

    // 噴射：速さで長さと明るさが変わる
    const thr = THREE.MathUtils.clamp(s.speed / 50, 0.4, 1.2);
    for (let i = 0; i < s.jets.length; i++) {
      const j = s.jets[i];
      j.u.uTime.value = state.time;
      j.u.uLen.value = (i % 2 ? 0.34 : 0.62) * (0.6 + 0.6 * thr) * (s.alive ? 1 : Math.max(0, 1 - s.dying));
      j.u.uPower.value = 0.85 + 0.15 * Math.sin(state.time * 37 + i);
    }
    s.root.updateWorldMatrix(true, false);
    s.jetLight.position.copy(s.jetLocal).applyMatrix4(s.root.matrixWorld);
    group.worldToLocal(s.jetLight.position);
    s.jetLight.intensity = s.holder.visible ? 1.5 * thr * (s.alive ? 1 : 0) : 0;

    // 被弾の光と、傷んだ所からの煙と火
    s.hitFlash = Math.max(0, s.hitFlash - dt * 6);
    s.hitU.value = s.hitFlash * 0.6;
    // 傷口：体力が減るごとに船体の上に1つずつ開き、そこから煙と火を吹き続ける
    const dmg = 1 - s.hp / MAX_HP;
    s.burnU.value += (dmg * 0.75 - s.burnU.value) * Math.min(1, dt * 2);
    const wantW = dmg > 0.85 ? 3 : dmg > 0.6 ? 2 : dmg > 0.35 ? 1 : 0;
    while (s.wounds.length < wantW) {
      s.wounds.push(new THREE.Vector3((R() - 0.5) * 1.3, 0.3 + R() * 0.15, (R() - 0.5) * 2.2));
      s.hitFlash = 1;
    }
    const f3Now = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q);
    for (const w of s.wounds) {
      w.acc = (w.acc || 0) + dt * (s.alive ? 26 : 40);
      _c.copy(w).applyMatrix4(s.root.matrixWorld);
      const up = _b.set(0, 1, 0).applyQuaternion(s.q);
      const p = [_c.x, _c.y, _c.z];
      while (w.acc > 1) {
        w.acc -= 1;
        // 機体の進みに置いていかれて、後ろへ流れる煙の帯になる
        // 艦の速さを受け継がせ、傷口のすぐ後ろに細くつながる（粒が離れて玉の列に見えない）
        const sv = f3Now.clone().multiplyScalar(s.speed * 0.72);
        const fv = f3Now.clone().multiplyScalar(s.speed * 0.9);
        puffs.puff(p, [sv.x + up.x * 1.2 + (R() - 0.5), sv.y + up.y * 1.2 + (R() - 0.5), sv.z + up.z * 1.2 + (R() - 0.5)], 1.0 + R() * 0.8, 0.25, 1.1 + R() * 0.6, KIND.SOOT, 0, 1);
        if (R() < 0.55) puffs.puff(p, [fv.x + up.x * 1.5 + (R() - 0.5), fv.y + up.y * 1.5 + (R() - 0.5), fv.z + up.z * 1.5 + (R() - 0.5)], 0.2 + R() * 0.2, 0.22, 0.42, KIND.FIRE, 0, 1);
        if (R() < 0.12) puffs.spark(p, [up.x * 8 + (R() - 0.5) * 10, up.y * 8 + (R() - 0.5) * 10, up.z * 8 + (R() - 0.5) * 10], 0.3 + R() * 0.4, 0.05, 0.02, 0, 2.5, 1);
      }
    }

    if (!s.alive) { dieStep(state, fx, dt, P); return; }

    hud.style.opacity = d < 320 ? '1' : '0';
    eBar.style.width = `${(s.hp / MAX_HP) * 100}%`;
    eLag.style.width = eBar.style.width;

    // 主砲：狙いが合ったら溜めて、左右交互に重い弾を撃つ
    const err = aimTurret(s.mainYaw, s.mainPitch, dt, 1.1);
    s.mainCool -= dt;
    if (s.charge > 0) {
      s.charge += dt;
      const mz = s.mainMuzzles[s.chargeSide];
      const k = Math.min(1, s.charge / 0.55);
      mz.glow.material.uniforms.uOpacity.value = k * (0.8 + 0.2 * Math.sin(state.time * 70));
      mz.glow.material.uniforms.uSize.value = 0.25 + 0.6 * k;
      mz.glow.visible = true;
      if (s.charge > 0.55) {
        const from = worldPos(mz.node);
        fireBolt(from, P, leadDir(from, player, MAIN_SPEED, 0.8, 0.5), MAIN_SPEED, 0);
        // 砲口の閃光（花びら形を2枚）、前へ噴く火、薄く残る発射煙
        puffs.puff(from, [0, 0, 0], 0.08, 1.4, 3.6, KIND.MUZZLE, 0, 1);
        puffs.puff(from, [0, 0, 0], 0.05, 0.8, 2.2, KIND.MUZZLE, 0, 1);
        puffs.puff(from, [0, 0, 0], 0.14, 0.8, 1.6, KIND.FLASH, 0, 1);
        const bd = _c.set(0, 0, 1).transformDirection(mz.node.matrixWorld);
        for (let i = 0; i < 6; i++) puffs.puff(from, [bd.x * (10 + R() * 14) + (R() - 0.5) * 3, bd.y * (10 + R() * 14) + (R() - 0.5) * 3, bd.z * (10 + R() * 14) + (R() - 0.5) * 3], 0.18 + R() * 0.16, 0.25, 0.9, KIND.FIRE, 3, 1);
        for (let i = 0; i < 4; i++) puffs.puff(from, [bd.x * 4 + (R() - 0.5) * 2, bd.y * 4 + (R() - 0.5) * 2, bd.z * 4 + (R() - 0.5) * 2], 0.8 + R() * 0.6, 0.25, 1.5, KIND.TRAIL, 1.2, 1);
        mz.glow.visible = false;
        mz.glow.material.uniforms.uOpacity.value = 0;
        // 反動で砲身が下がる
        s.mainPitch.rotation.x += 0.12;
        s.charge = 0;
        s.chargeSide = 1 - s.chargeSide;
        s.mainCool = s.chargeSide === 1 ? 0.35 : 2.4 + R() * 1.2;
      }
    } else if (s.mainCool <= 0 && err < 0.12 && d < 240) {
      s.charge = 0.0001;
    }

    // 副砲：短い連射
    for (const t of s.subTurrets) {
      const e = aimTurret(t.yaw, t.pitch, dt, 2.2);
      t.cool -= dt;
      if (t.burst > 0) {
        t.next -= dt;
        if (t.next <= 0) {
          const mz = t.muzzles[t.flip];
          t.flip = 1 - t.flip;
          const from = worldPos(mz);
          fireBolt(from, P, leadDir(from, player, SUB_SPEED, 2.5, 0.42), SUB_SPEED, 1);
          puffs.puff(from, [0, 0, 0], 0.055, 0.6, 1.7, KIND.MUZZLE, 0, 1);
          t.burst -= 1;
          t.next = 0.11;
        }
      } else if (t.cool <= 0 && e < 0.2 && d < 180) {
        t.burst = 6;
        t.cool = 2.2 + R() * 1.6;
      }
    }

    // 誘導弾：扉を開けて、12発を順に放つ
    s.missileCool -= dt;
    if (s.launch < 0 && s.missileCool <= 0 && d < 220) { s.launch = 0; s.launched = 0; }
    if (s.launch >= 0) {
      s.launch += dt;
      s.doorOpen = Math.min(1, s.doorOpen + dt * 2.2);
      if (s.launch > 0.6 && s.launched < s.missileNodes.length && s.launch > 0.6 + s.launched * 0.07) {
        const [body, tip] = s.missileNodes[s.launched];
        // 左右の箱から交互に、半分（6発）を放つ
        const order = [0, 6, 2, 8, 4, 10, 1, 7, 3, 9, 5, 11];
        const k = order[s.launched];
        const [b2, t2] = s.missileNodes[k];
        if (s.launched < 6) {
          b2.visible = false; t2.visible = false;
          const from = worldPos(t2);
          const out = _c.set(0, 0, 1).transformDirection(t2.matrixWorld);
          launchMissile(from, P, [out.x, out.y, out.z]);
        }
        void body; void tip;
        s.launched += 1;
      }
      if (s.launched >= s.missileNodes.length && s.launch > 2.4) {
        s.launch = -1;
        s.missileCool = 9 + R() * 4;
        s.reloadAt = state.time + 5;
      }
    } else {
      s.doorOpen = Math.max(0, s.doorOpen - dt * 1.2);
      if (s.reloadAt && state.time > s.reloadAt) { for (const [a, b] of s.missileNodes) { a.visible = true; b.visible = true; } s.reloadAt = 0; }
    }
    const dk = s.doorOpen * s.doorOpen * (3 - 2 * s.doorOpen);
    s.doors[0].rotation.y = 1.9 * dk;
    s.doors[1].rotation.y = -1.9 * dk;
    void relA;
  }

  // 撃沈：2.4秒かけて船体のあちこちで爆発し、最後に大爆発して部品が飛ぶ
  function dieStep(state, fx, dt, P) {
    const s = ship;
    const before = s.dying;
    s.dying += dt;
    hud.style.opacity = '0';
    const STEP = 0.13;
    if (s.dying < 2.4 && Math.floor(before / STEP) !== Math.floor(s.dying / STEP)) {
      _c.set((R() - 0.5) * 1.7, (R() - 0.3) * 0.8, (R() - 0.5) * 2.8).applyMatrix4(s.root.matrixWorld);
      fx.explode([_c.x, _c.y, _c.z], 0.9 + R() * 0.9);
      s.hitFlash = 1;
    }
    if (before < 2.4 && s.dying >= 2.4) {
      const c = s.holder.position;
      fx.explode([c.x, c.y, c.z], 4.5);
      fx.explode([c.x + (R() - 0.5) * 4, c.y + (R() - 0.5) * 2, c.z + (R() - 0.5) * 4], 2.5);
      // 部品を外して飛ばす
      for (const p of s.parts) {
        p.o.getWorldPosition(_c);
        scene.attach(p.o);
        p.far = [_c.x + P[0], _c.y + P[1], _c.z + P[2]];
        const out = _c.clone().sub(c).normalize();
        const sp = 10 + R() * 18;
        const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q).multiplyScalar(s.speed);
        p.vel = [out.x * sp + fw.x + (R() - 0.5) * 6, out.y * sp + fw.y + 4 + R() * 6, out.z * sp + fw.z + (R() - 0.5) * 6];
        p.axis.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
        p.spin = 1 + R() * 4;
        p.acc = 0;
      }
      s.holder.visible = false; s.jetLight.intensity = 0;
      s.debrisAge = 0;
    }
    if (s.dying >= 2.4) {
      s.debrisAge += dt;
      for (const p of s.parts) {
        const ox = p.far[0] - P[0]; const oy = p.far[1] - P[1]; const oz = p.far[2] - P[2];
        p.far[0] += p.vel[0] * dt; p.far[1] += p.vel[1] * dt; p.far[2] += p.vel[2] * dt;
        p.o.position.set(p.far[0] - P[0], p.far[1] - P[1], p.far[2] - P[2]);
        p.o.rotateOnWorldAxis(p.axis, p.spin * dt);
        // 燃えながら煙を引く（進んだ距離ごとに、このコマの線分の上へ間を埋めて落とす）
        const nx = p.o.position.x; const ny = p.o.position.y; const nz = p.o.position.z;
        p.acc += len3(p.vel[0], p.vel[1], p.vel[2]) * dt;
        const spacing = 0.35 + s.debrisAge * 0.25;
        const fade = Math.max(0, 1 - s.debrisAge / 4.5);
        while (p.acc > spacing) {
          p.acc -= spacing;
          if (fade <= 0) continue;
          const f = R();
          const pr = [ox + (nx - ox) * f, oy + (ny - oy) * f, oz + (nz - oz) * f];
          puffs.puff(pr, [(R() - 0.5) * 0.8, (R() - 0.5) * 0.8, (R() - 0.5) * 0.8], 0.9 + R() * 0.8, 0.25, 0.9 + 0.9 * fade, KIND.SMOKE, 0.5, 1, 0.04);
          if (R() < 0.6 * fade) puffs.puff(pr, [(R() - 0.5), (R() - 0.5), (R() - 0.5)], 0.18 + R() * 0.15, 0.18, 0.45 * fade + 0.1, KIND.FIRE, 1.5, 1);
        }
        if (s.debrisAge > 6) p.o.visible = false;
      }
      if (s.debrisAge > 7) {
        s.dying = -1;
        onCruiserDead();
        s.respawnAt = state.time + 3;
      }
    }
  }

  function launchMissile(fromRel, P, out) {
    const m = missiles.find((x) => !x.alive);
    if (!m) return;
    m.alive = true;
    m.age = 0;
    m.acc = 0;
    m.far = [fromRel[0] + P[0], fromRel[1] + P[1], fromRel[2] + P[2]];
    const sp = 26;
    m.vel = [out[0] * sp + (R() - 0.5) * 8, out[1] * sp + (R() - 0.5) * 8, out[2] * sp + (R() - 0.5) * 8];
    m.seed = R() * 6.28;
    m.radius = 0.7;
    m.rel.set(fromRel[0], fromRel[1], fromRel[2]);
  }

  function updateMissiles(state, player, fx, dt, P) {
    const fw = player.forward;
    for (const m of missiles) {
      if (!m.alive) continue;
      m.age += dt;
      const rx = m.far[0] - P[0]; const ry = m.far[1] - P[1]; const rz = m.far[2] - P[2];
      // 自機の未来の位置を追う。曲がる力は限られるので、急旋回とブーストでかわせる
      const dist = len3(rx, ry, rz);
      const speed = Math.min(72, 26 + m.age * 55);
      const t = Math.min(1.5, dist / speed);
      // 1発ごとにうねりを持たせ、煙が平行に並ばないようにする
      const wv = Math.min(1, m.age / 0.6) * Math.min(1, dist / 30) * 7;
      const wx = fw[0] * player.speed * t - rx + Math.sin(m.age * 3.1 + m.seed) * wv;
      const wy = fw[1] * player.speed * t - ry + Math.cos(m.age * 2.6 + m.seed * 1.7) * wv;
      const wz = fw[2] * player.speed * t - rz + Math.sin(m.age * 2.2 + m.seed * 0.6) * wv;
      const wl = len3(wx, wy, wz) || 1;
      const vl = len3(m.vel[0], m.vel[1], m.vel[2]) || 1;
      // 近づくと追うのをやめる（最後の一瞬に横へ動けばかわせる）
      const k = m.age < 0.3 ? 1 - Math.exp(-dt * 0.4) : dist < 24 ? 0 : 1 - Math.exp(-dt * 2.4);
      let dx = m.vel[0] / vl + (wx / wl - m.vel[0] / vl) * k;
      let dy = m.vel[1] / vl + (wy / wl - m.vel[1] / vl) * k;
      let dz = m.vel[2] / vl + (wz / wl - m.vel[2] / vl) * k;
      const dl = len3(dx, dy, dz) || 1;
      dx /= dl; dy /= dl; dz /= dl;
      m.vel = [dx * speed, dy * speed, dz * speed];
      const ox = rx; const oy = ry; const oz = rz;
      m.far[0] += m.vel[0] * dt; m.far[1] += m.vel[1] * dt; m.far[2] += m.vel[2] * dt;
      const nx = m.far[0] - P[0]; const ny = m.far[1] - P[1]; const nz = m.far[2] - P[2];
      m.rel.set(nx, ny, nz);
      m.head.position.set(nx, ny, nz);
      m.head.visible = true;
      m.head.material.uniforms.uOpacity.value = 1;
      m.head.material.uniforms.uSize.value = 0.22 + 0.1 * Math.sin(state.time * 60 + m.seed * 10);
      // 尾の炎と煙（自機のランスと同じ作り。間隔は飛ぶほど広がる。カメラのすぐ前には出さない）
      m.acc += speed * dt;
      const spacing = 0.32 + m.age * 0.14;
      while (m.acc > spacing) {
        m.acc -= spacing;
        const f = R();
        const p = [ox + (nx - ox) * f, oy + (ny - oy) * f, oz + (nz - oz) * f];
        if (len3(p[0], p[1] - 0.9, p[2] + 2.5) < 5) continue;
        const small = Math.min(1, m.age / 0.5);
        // 火は点火の間だけ（ずっと出すと火の玉の数珠に見える）。あとは頭の光と煙で見せる
        if (m.age < 0.22) puffs.puff(p, [(R() - 0.5), (R() - 0.5), (R() - 0.5)], 0.14 + R() * 0.1, 0.1, 0.2 + 0.1 * small, KIND.FIRE, 1.5, 1);
        puffs.puff(p, [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5], 0.9 + R() * 0.8, 0.12 + 0.1 * small, 0.42 + 0.55 * small, KIND.TRAIL, 0.5, 1, 0.05);
      }
      // 自機に届いたか（このコマの線分と自機の球）
      const segL = len3(nx - ox, ny - oy, nz - oz) || 1;
      const ux = (nx - ox) / segL; const uy = (ny - oy) / segL; const uz = (nz - oz) / segL;
      const proj = THREE.MathUtils.clamp(-(ox * ux + oy * uy + oz * uz), 0, segL);
      const cx = ox + ux * proj; const cy = oy + uy * proj; const cz = oz + uz * proj;
      if (len3(cx, cy, cz) < PLAYER_R + 0.25 && !player.invuln) {
        hurtPlayer(14, state, [cx, cy, cz], fx);
        killMissile(m, false);
        continue;
      }
      if (m.age > 6.5) killMissile(m, true);
    }
  }

  const attrs = boltMesh.geometry.attributes;
  const hattrs = headMesh.geometry.attributes;
  const wattrs = warnMesh.geometry.attributes;
  function updateBolts(state, player, fx, dt, P) {
    let n = 0;
    let wn = 0;
    warnU.uTime.value = state.time;
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      // 撃墜で弾が全部消えた直後は、残りの番号が空になる
      if (!b) continue;
      b.age += dt;
      if (b.age > b.life) { bolts.splice(i, 1); continue; }
      if (b.age < 0) {
        // 予告：砲口で光が膨らみ、通る線が出る
        if (n >= BOLT_MAX) continue;
        const k = 1 + b.age / b.warn;
        const ox = b.far[0] - P[0]; const oy = b.far[1] - P[1]; const oz = b.far[2] - P[2];
        // 線は自機のそばで止める（カメラの前を横切らない）
        const reach = Math.max(8, -(ox * b.dir[0] + oy * b.dir[1] + oz * b.dir[2]) - 6);
        wattrs.aOrigin.setXYZ(wn, ox + b.dir[0] * reach, oy + b.dir[1] * reach, oz + b.dir[2] * reach);
        wattrs.aDir.setXYZ(wn, b.dir[0], b.dir[1], b.dir[2]);
        wattrs.aLen.setX(wn, reach);
        wattrs.aWidth.setX(wn, (b.kind === 0 ? 0.22 : 0.15) * b.scale);
        wattrs.aAlpha.setX(wn, Math.min(1, k * 1.6) * (0.6 + 0.4 * Math.sin(state.time * 40)));
        wn += 1;
        hattrs.aOrigin.setXYZ(n, ox, oy, oz);
        hattrs.aSize.setX(n, (b.kind === 0 ? 1.1 : 0.7) * b.scale * (0.3 + 0.9 * k) * (0.85 + 0.15 * Math.sin(state.time * 70)));
        hattrs.aAlpha.setX(n, 0.4 + 0.6 * k);
        attrs.aOrigin.setXYZ(n, ox, oy, oz);
        attrs.aDir.setXYZ(n, b.dir[0], b.dir[1], b.dir[2]);
        attrs.aLen.setX(n, 0.01); attrs.aWidth.setX(n, 0); attrs.aAlpha.setX(n, 0);
        n += 1;
        continue;
      }
      const step = b.speed * dt;
      const ox = b.far[0] - P[0]; const oy = b.far[1] - P[1]; const oz = b.far[2] - P[2];
      b.far[0] += b.dir[0] * step; b.far[1] += b.dir[1] * step; b.far[2] += b.dir[2] * step;
      // 自機への当たり
      const proj = THREE.MathUtils.clamp(-(ox * b.dir[0] + oy * b.dir[1] + oz * b.dir[2]), 0, step);
      const cx = ox + b.dir[0] * proj; const cy = oy + b.dir[1] * proj; const cz = oz + b.dir[2] * proj;
      if (dt > 0 && len3(cx, cy, cz) < PLAYER_R * (b.kind === 0 ? 1.0 : 0.85) * (1 + (b.scale - 1) * 0.35)) {
        if (player.dodging) {
          // 回避の回転で弾をはじく：青白い火花が外へ散る
          deflect([cx, cy, cz], b.dir);
          bolts.splice(i, 1);
          continue;
        }
        if (!player.invuln) {
          hurtPlayer(b.kind === 0 ? 12 : 4, state, [cx, cy, cz], fx);
          bolts.splice(i, 1);
          continue;
        }
      }
      // 岩に当たれば消える
      if (dt > 0) {
        const hit = world.raycast(ox, oy, oz, b.dir[0], b.dir[1], b.dir[2], step);
        if (hit && !hit.rock.onDamage) {
          const nr = [hit.point[0] - hit.rock.rel.x, hit.point[1] - hit.rock.rel.y, hit.point[2] - hit.rock.rel.z];
          const m = Math.hypot(nr[0], nr[1], nr[2]) || 1;
          fx.hitSmall(hit.point, [nr[0] / m, nr[1] / m, nr[2] / m], 0);
          if (fx.scorch) fx.scorch(hit.point, [nr[0] / m, nr[1] / m, nr[2] / m], b.kind === 0 ? 1.0 : 0.6);
          bolts.splice(i, 1);
          continue;
        }
      }
      if (n >= BOLT_MAX) continue;
      const travel = Math.max(0, b.age) * b.speed;
      attrs.aOrigin.setXYZ(n, b.far[0] - P[0], b.far[1] - P[1], b.far[2] - P[2]);
      attrs.aDir.setXYZ(n, b.dir[0], b.dir[1], b.dir[2]);
      // 遠くても弾が読めるよう、離れているほど太く長く描く
      const vis = b.scale * THREE.MathUtils.clamp(len3(ox, oy, oz) / 30, 1, 3.2);
      attrs.aLen.setX(n, Math.min((b.kind === 0 ? 15.0 : 9.0) * vis, 0.05 + travel));
      attrs.aWidth.setX(n, (b.kind === 0 ? 1.25 : 0.75) * vis);
      const al = 1 - Math.max(0, (b.age - b.life + 0.3) / 0.3);
      attrs.aAlpha.setX(n, al);
      hattrs.aOrigin.setXYZ(n, b.far[0] - P[0], b.far[1] - P[1], b.far[2] - P[2]);
      hattrs.aSize.setX(n, (b.kind === 0 ? 1.2 : 0.8) * vis);
      hattrs.aAlpha.setX(n, al);
      n += 1;
    }
    // 近い順に4発まで、弾のまわりの空気を揺らす
    for (let i = 0; i < 4; i++) boltHeat.a[i].w = 0;
    const cam = puffs.camera;
    if (cam) {
      let hn = 0;
      for (let i = bolts.length - 1; i >= 0 && hn < 4; i--) {
        const b = bolts[i];
        if (b.age <= 0) continue;
        const hx = b.far[0] - P[0]; const hy = b.far[1] - P[1]; const hz = b.far[2] - P[2];
        const dist = len3(hx, hy, hz);
        if (dist < 3 || dist > 200) continue;
        _p.set(hx, hy, hz).project(cam);
        if (_p.z > 1 || Math.abs(_p.x) > 1.2 || Math.abs(_p.y) > 1.2) continue;
        const a = boltHeat.a[hn];
        const tl = Math.min(b.kind === 0 ? 9 : 5, b.age * b.speed);
        a.set(_p.x * 0.5 + 0.5, _p.y * 0.5 + 0.5, THREE.MathUtils.clamp(2.2 / dist, 0.006, 0.06), 1);
        _p.set(hx - b.dir[0] * tl, hy - b.dir[1] * tl, hz - b.dir[2] * tl).project(cam);
        boltHeat.b[hn].set(_p.x * 0.5 + 0.5, _p.y * 0.5 + 0.5);
        hn += 1;
      }
    }
    warnMesh.geometry.instanceCount = wn;
    for (const k of ['aOrigin', 'aDir', 'aLen', 'aWidth', 'aAlpha']) wattrs[k].needsUpdate = true;
    boltMesh.geometry.instanceCount = n;
    headMesh.geometry.instanceCount = n;
    for (const k of ['aOrigin', 'aSize', 'aAlpha']) hattrs[k].needsUpdate = true;
    for (const k of ['aOrigin', 'aDir', 'aLen', 'aWidth', 'aAlpha']) attrs[k].needsUpdate = true;
  }

  return {
    setModel, update,
    get hurt() { return hurt; },
    get shield() { return shield; },
    get info() { return ship ? { hp: ship.hp, alive: ship.alive, dying: ship.dying, far: ship.far.slice(), bolts: bolts.length, missiles: missiles.filter((m) => m.alive).length, shield: Math.round(shield), hits, breaks, deflects, down } : null; },
    // 再出撃：シールドを満たす
    revive() { down = false; shield = SHIELD_MAX; lastHit = -9; },
    // 確認用：シールドを0にして撃墜させる
    forceDown() { if (!down) { shield = 0; down = true; breaks += 1; bolts.length = 0; onPlayerDown(); } },
    // 照準とレーダーへ渡す、いま見えている敵と誘導弾（自機からの相対位置）
    contacts() {
      const out = [];
      if (ship && ship.alive && ship.holder.visible) {
        const t = ship.spheres[1];
        out.push({ kind: 'ship', rel: t.rel, radius: t.radius, hp: ship.hp / MAX_HP, aim: t });
      }
      for (const m of missiles) if (m.alive) out.push({ kind: 'missile', rel: m.rel, radius: m.radius });
      return out;
    },
    // 確認用：敵を自機の前に置き直す
    placeNear(player) { if (ship) place(player, true); },
    // 面の進行から使う：重巡洋艦を前方に出す・戦わずに去らせる
    spawnCruiser(player) { if (ship) place(player, false); },
    retreatCruiser() {
      if (!ship || !ship.alive) return;
      ship.alive = false; ship.dying = -1; ship.placed = false;
      ship.holder.visible = false; ship.jetLight.intensity = 0;
      for (const t of ship.spheres) t.radius = 0;
      hud.style.opacity = '0';
    },
    get cruiserAlive() { return !!(ship && ship.alive && ship.placed); },
    fireBolt, leadDir, hurtPlayer,
    heal(n) { if (!down) shield = Math.min(SHIELD_MAX, shield + n); },
    get invulnShots() { return bolts.length; },
    damage(amount, state) { return hitShip(amount, state); },
  };
}
