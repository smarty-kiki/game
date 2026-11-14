import * as THREE from 'three';
import { buildCapital, hullMaterial, rng } from './fleetKit.js';
import {
  Fn, attribute, varying, texture3D, cameraViewMatrix, cameraProjectionMatrix, positionGeometry, vec2, vec3, vec4, float,
  length, max, mix, select, pow, abs, clamp, smoothstep,
} from 'three/tsl';
import { noise3D } from './skyNoise.js';
import { smoothstepR } from './soft.js';
import { kitReady, kitMaterial, buildKitShip } from './kitParts.js';
import { SURF_ON } from './surface.js';
import { GRAVE_Z, BASE_Z, TUNNEL_Z, TUNNEL_LEN, LINE_Z, ARENA_Z, BOSS_Z } from '../course.js';
import { REGIONS, regionAt } from '../scenes.js';

// 遠景の大型艦隊。当たり判定はなく、区間ごとに決めた場面を演じる：航行・砲撃の応酬・爆発・小型機の群れ。
// 描画は「艦の種類ごとに1回」と「光の板をまとめて1回」だけ。+x が画面の左。

// 光の板：a→b の間を覆う向きのある板。種類 0=丸い光 1=火球（時間で燃え尽きる）2=光の筋
function fxMaterial(N) {
  // 端の位置は4つ組で持つ（3つ組だと WebGPU が更新のたびに全件を詰め直す新しい配列を作るため。spec REQ-013）
  const iA = attribute('iA', 'vec4').xyz; const iB = attribute('iB', 'vec4').xyz; const iC = attribute('iC', 'vec4'); const iW = attribute('iW', 'vec2');
  const a = cameraViewMatrix.mul(vec4(iA, 1.0));
  const b = cameraViewMatrix.mul(vec4(iB, 1.0));
  const d = b.xy.sub(a.xy);
  const l = length(d);
  const dir = select(l.greaterThan(1e-3), d.div(max(l, 1e-3)), vec2(1.0, 0.0));
  const nrm = vec2(dir.y.negate(), dir.x);
  const w = iW.x;
  const p = mix(a, b, positionGeometry.x.mul(0.5).add(0.5));
  const pv = vec4(p.xy.add(dir.mul(positionGeometry.x).mul(w)).add(nrm.mul(positionGeometry.y).mul(w)), p.z, p.w);
  const vQ = varying(positionGeometry.xy, 'vFxQ');
  const vCol = varying(iC.rgb, 'vFxCol');
  const vI = varying(vec2(iC.a, iW.y), 'vFxI');
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false, fog: false });
  mat.vertexNode = cameraProjectionMatrix.mul(pv);
  mat.fragmentNode = Fn(() => {
    const kind = vI.x;
    const age = vI.y;
    const r = length(vQ);
    // 丸い光
    const glow = vCol.mul(pow(max(0.0, r.oneMinus()), 2.6).add(smoothstepR(0.32, 0.0, r).mul(1.5)));
    // 火球：雲模様を年齢で削っていく。白→橙→暗い赤
    const n = texture3D(N, vec3(vQ.mul(0.32), age.mul(0.22)).add(vCol.x.mul(3.0))).toVar();
    const n2 = texture3D(N, vec3(vQ.mul(0.9).add(n.rg.mul(0.4)), age.mul(0.36)));
    const shape = float(1.0).sub(r.mul(n.r.sub(0.5).mul(1.1).add(n2.g.sub(0.5).mul(0.5)).add(1.0)));
    const body = smoothstep(age.mul(0.55), age.mul(0.55).add(0.34), shape);
    const heat = clamp(shape.mul(1.7).sub(age.mul(1.25)).add(0.15), 0.0, 1.0);
    const fc = mix(mix(vec3(0.34, 0.05, 0.012), vec3(2.2, 0.72, 0.13), smoothstep(0.08, 0.55, heat)), vec3(5.0, 3.6, 2.0), smoothstep(0.62, 1.0, heat));
    const fire = fc.mul(body).mul(float(1.0).sub(age.mul(age))).mul(vCol);
    // 筋：両端を丸めた、軸に沿った帯
    const across = abs(vQ.y);
    const sa = pow(max(0.0, across.oneMinus()), 2.2).add(smoothstepR(0.26, 0.0, across).mul(1.8));
    const along = clamp(vQ.x.mul(0.5).add(0.5), 0.0, 1.0);
    const end = smoothstepR(1.0, 0.82, abs(vQ.x));
    const tail = mix(1.0, along.oneMinus().mul(along.oneMinus()), age);
    const streak = vCol.mul(sa).mul(end).mul(tail);
    return vec4(select(kind.lessThan(0.5), glow, select(kind.lessThan(1.5), fire, streak)), 1.0);
  })();
  return mat;
}

const TEAM = {
  a: { shot: [0.45, 0.75, 1.0], engine: [0.55, 0.78, 1.0], tint: 0xdde4ec },
  e: { shot: [1.0, 0.25, 0.14], engine: [1.0, 0.42, 0.22], tint: 0x8f8783 },
};

// 場面の一覧。p：空間の座標（zActive の瞬間）、h：艦首の向き、sp：秒速。+x が画面の左、y が上。
// 敵味方の砲撃は range の間だけ（battle:true）
function makeScript() {
  const A = (cls, p, h, sp, o = {}) => ({ cls, team: 'a', p, h, sp, ...o });
  const E = (cls, p, h, sp, o = {}) => ({ cls, team: 'e', p, h, sp, ...o });
  return [
    // 視線は少し下を向くので、水平より下の空が広い。艦は基地の壁に隠れない下側の空を主に使う
    // 小惑星帯：味方の艦隊が前方を同じ向きに進み、前線へ向かっている
    { z0: -100, z1: GRAVE_Z + 200, ships: [
      A('cruiser', [-560, -230, 1000], [0.22, 0.01, 1], 35),
      A('cruiser', [-860, -420, 1250], [0.22, 0.01, 1], 35),
      A('frigate', [-330, -300, 860], [0.22, 0.01, 1], 37),
      A('frigate', [-640, -520, 1000], [0.22, 0.01, 1], 37),
      A('frigate', [-980, -240, 1050], [0.22, 0.01, 1], 37),
      A('frigate', [-420, -610, 1250], [0.22, 0.01, 1], 37),
    ], fighters: 0 },
    // 墓場：奥で大破した味方の旗艦が燃え、敵の巡洋艦がとどめを刺している
    { z0: GRAVE_Z - 200, z1: BASE_Z + 100, battle: true, ships: [
      A('dread', [760, -420, GRAVE_Z + 1450], [-0.90, 0.08, 0.42], 3, { burn: 1, tilt: 0.42, roll: 0.0035 }),
      E('ecruiser', [-640, -210, GRAVE_Z + 1700], [0.62, -0.03, 0.75], 28),
      E('ecruiser', [-1120, -420, GRAVE_Z + 1900], [0.66, -0.02, 0.72], 28),
      E('efrigate', [-300, -620, GRAVE_Z + 1400], [0.70, 0.04, 0.7], 36),
      A('frigate', [1120, -520, GRAVE_Z + 1650], [-0.5, 0.05, 0.85], 30),
    ], fighters: 50, swarm: [180, -350, GRAVE_Z + 1600], swarmR: 460 },
    // 基地の外周：味方の旗艦が外壁に沿って進む。自機はその横を少しずつ追い越す
    { z0: BASE_Z - 240, z1: TUNNEL_Z + 90, battle: true, ships: [
      A('dread', [-800, -470, BASE_Z + 1050], [0.0, 0, 1], 26),
      A('cruiser', [-1250, -650, BASE_Z + 1500], [0.04, 0, 1], 27),
      A('frigate', [-520, -640, BASE_Z + 900], [0.0, 0, 1], 30),
      A('cruiser', [760, -470, BASE_Z + 2000], [-0.02, 0, -1], 14),
      A('frigate', [520, -700, BASE_Z + 1450], [-0.02, 0, -1], 18),
      E('ecruiser', [1050, -700, BASE_Z + 2800], [-0.5, 0.04, -0.85], 24),
      E('efrigate', [720, -900, BASE_Z + 2500], [-0.55, 0.05, -0.8], 34),
      E('efrigate', [1380, -520, BASE_Z + 2550], [-0.55, 0.02, -0.8], 34),
    ], fighters: 80, swarm: [120, -620, BASE_Z + 2100], swarmR: 620 },
    // 防衛線とボス戦：赤い恒星を背に、両艦隊の決戦。味方の巡洋艦が1隻、途中で沈む
    { z0: LINE_Z - 180, z1: 1e9, battle: true, ships: [
      E('edread', [760, -300, LINE_Z + 2400], [-0.95, 0.02, 0.28], 14),
      E('ecruiser', [1300, -130, LINE_Z + 2150], [-0.9, -0.01, 0.36], 20),
      E('ecruiser', [260, -660, LINE_Z + 2700], [-0.92, 0.02, 0.32], 20),
      E('efrigate', [520, -860, LINE_Z + 1900], [-0.88, 0.05, 0.34], 30),
      A('dread', [-900, -520, LINE_Z + 1800], [0.72, 0.02, 0.68], 30),
      A('cruiser', [-420, -760, LINE_Z + 2150], [0.72, 0, 0.66], 30, { dies: LINE_Z + 760 }),
      A('cruiser', [-1320, -300, LINE_Z + 1900], [0.7, 0.01, 0.7], 30),
      A('frigate', [-180, -470, LINE_Z + 1750], [0.74, 0.02, 0.64], 36),
      A('frigate', [-720, -950, LINE_Z + 1700], [0.74, 0.02, 0.64], 36),
    ], fighters: 130, swarm: [60, -500, LINE_Z + 2150], swarmR: 720 },
  ];
}

export function createFleet({ scene }) {
  const group = new THREE.Group();
  // 読み込みの時に材質のシェーダーを作っておくため、最初は見える状態にする（数が0なので何も映らない）
  scene.add(group);
  const hazeU = { value: new THREE.Vector3() };
  const R = rng(5.5);

  const CLS = {
    dread: buildCapital({ seed: 1.1, L: 900, style: 'allied', tier: 2 }),
    cruiser: buildCapital({ seed: 2.3, L: 420, style: 'allied', tier: 1 }),
    frigate: buildCapital({ seed: 3.7, L: 170, style: 'allied', tier: 1 }),
    edread: buildCapital({ seed: 4.1, L: 820, style: 'enemy', tier: 2 }),
    ecruiser: buildCapital({ seed: 5.9, L: 400, style: 'enemy', tier: 1 }),
    efrigate: buildCapital({ seed: 6.2, L: 170, style: 'enemy', tier: 1 }),
  };
  const mats = {
    a: hullMaterial({ hazeU, panel: 9, windowK: 1 }),
    e: hullMaterial({ hazeU, panel: 8, windowK: 0.5, color: 0xa39a96 }),
    burn: hullMaterial({ hazeU, panel: 9, burn: 1, windowK: 0.6 }),
  };
  // 遠くの艦は甲板の細部・砲塔・小物のない軽い形で描く（画面で小さい艦の三角形を減らす）
  const LO = {
    dread: buildCapital({ seed: 1.1, L: 900, style: 'allied', tier: 2, lo: true }),
    cruiser: buildCapital({ seed: 2.3, L: 420, style: 'allied', tier: 1, lo: true }),
    frigate: buildCapital({ seed: 3.7, L: 170, style: 'allied', tier: 1, lo: true }),
    edread: buildCapital({ seed: 4.1, L: 820, style: 'enemy', tier: 2, lo: true }),
    ecruiser: buildCapital({ seed: 5.9, L: 400, style: 'enemy', tier: 1, lo: true }),
    efrigate: buildCapital({ seed: 6.2, L: 170, style: 'enemy', tier: 1, lo: true }),
  };
  const insts = {}; const instsLo = {};
  const script = makeScript();
  for (const [k, c] of Object.entries(CLS)) {
    const n = Math.max(1, ...script.map((s) => s.ships.filter((h) => h.cls === k).length)) + 1;
    const mat = k[0] === 'e' ? mats.e : mats.a;
    const m = new THREE.InstancedMesh(c.geo, mat, n);
    m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.count = 0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.renderOrder = -3;
    group.add(m);
    insts[k] = m;
    const ml = new THREE.InstancedMesh(LO[k].geo, mat, n);
    ml.frustumCulled = false; ml.castShadow = false; ml.receiveShadow = false; ml.count = 0;
    ml.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    ml.renderOrder = -3;
    group.add(ml);
    instsLo[k] = ml;
  }
  // 燃えている艦は別の材質で1隻ずつ（旗艦1隻だけなので描画は1回増えるだけ）
  const burnMesh = new THREE.Mesh(CLS.dread.geo, mats.burn);
  burnMesh.frustumCulled = false; burnMesh.renderOrder = -3;
  group.add(burnMesh);
  // Tripo のパーツで組んだ艦へ差し替える（読み込みが済むまでは、コードで組んだ形のまま）
  kitReady.then(() => {
    const matA = kitMaterial({ palette: 'ally', hazeU });
    const matE = kitMaterial({ palette: SURF_ON ? 'enemyHull' : 'enemy', hazeU });
    const SPEC = { dread: [900, 2], cruiser: [420, 1], frigate: [170, 1], edread: [820, 2], ecruiser: [400, 1], efrigate: [170, 1] };
    for (const [k, [L, tier]] of Object.entries(SPEC)) {
      const hi = buildKitShip({ L, tier });
      const lo = buildKitShip({ L, tier, lo: true });
      Object.assign(CLS[k], hi);
      const mat = k[0] === 'e' ? matE : matA;
      insts[k].geometry = hi.geo; insts[k].material = mat;
      instsLo[k].geometry = lo.geo; instsLo[k].material = mat;
    }
    burnMesh.geometry = CLS.dread.geo;
    burnMesh.material = kitMaterial({ palette: 'rust', hazeU, glow: 1.2 });
  }).catch((e) => console.error('kit', e));

  // 光の板
  const MAX_FX = 1500;
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const fxA = new Float32Array(MAX_FX * 4); const fxB = new Float32Array(MAX_FX * 4); const fxC = new Float32Array(MAX_FX * 4); const fxW = new Float32Array(MAX_FX * 2);
  const attr = (arr, n) => new THREE.InstancedBufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
  const aA = attr(fxA, 4); const aB = attr(fxB, 4); const aC = attr(fxC, 4); const aW = attr(fxW, 2);
  quad.setAttribute('iA', aA); quad.setAttribute('iB', aB); quad.setAttribute('iC', aC); quad.setAttribute('iW', aW);
  quad.instanceCount = 0;
  const fxMat = fxMaterial(noise3D());
  const fxMesh = new THREE.Mesh(quad, fxMat);
  fxMesh.frustumCulled = false;
  fxMesh.renderOrder = 1;
  group.add(fxMesh);

  let nFx = 0;
  // 遠い物は実際の方向のまま近くへ縮めて描く（カメラの奥の限界 1800 の内側に収める）
  const K_MAX = 1550;
  const shrink = (x, y, z) => { const d = Math.hypot(x, y, z); return d > K_MAX ? K_MAX / d : 1; };
  const putFx = (ax, ay, az, bx, by, bz, w, r, g, b, kind, age = 0) => {
    if (nFx >= MAX_FX) return;
    const k = shrink(ax, ay, az);
    const i = nFx++;
    fxA[i * 4] = ax * k; fxA[i * 4 + 1] = ay * k; fxA[i * 4 + 2] = az * k;
    fxB[i * 4] = bx * k; fxB[i * 4 + 1] = by * k; fxB[i * 4 + 2] = bz * k;
    fxC[i * 4] = r; fxC[i * 4 + 1] = g; fxC[i * 4 + 2] = b; fxC[i * 4 + 3] = kind;
    fxW[i * 2] = w * k; fxW[i * 2 + 1] = age;
  };

  // ---- 動く物の状態 ----
  let scene_ = null;
  let ships = [];
  let shots = []; // 砲弾・光線
  let blasts = []; // 爆発
  let fighters = [];
  let clock = 0;
  const m4 = new THREE.Matrix4(); const qq = new THREE.Quaternion(); const vp = new THREE.Vector3(); const vs = new THREE.Vector3();
  const fw = new THREE.Vector3(); const rt = new THREE.Vector3(); const upv = new THREE.Vector3(); const wy = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();

  function enter(sc, z) {
    scene_ = sc;
    const warp = Math.max(0, (z - sc.z0) / 40);
    clock = warp;
    ships = sc.ships.map((o) => {
      const h = new THREE.Vector3(...o.h).normalize();
      return { ...o, dir: h, pos: new THREE.Vector3(...o.p), c: CLS[o.cls], cd: R() * 2, alive: true, deadT: 0, smoke: 0, hit: 0, roll0: o.tilt || 0, dying: 0 };
    });
    shots = []; blasts = [];
    fighters = [];
    for (let i = 0; i < (sc.fighters || 0); i++) {
      fighters.push({
        team: i % 2 ? 'a' : 'e', r: (sc.swarmR || 500) * (0.25 + R() * 0.75), a0: R() * 6.28, sp: (0.18 + R() * 0.22) * (R() < 0.5 ? 1 : -1),
        inc: R() * 1.2 - 0.6, ph: R() * 6.28, y: (R() - 0.5) * 0.7, wob: 8 + R() * 30, last: null, dead: 0, shot: R() * 3,
      });
    }
    // 途中から入っても画が同じになるよう、場面の時間を進めておく
    for (let i = 0; i < ships.length; i++) ships[i].pos.addScaledVector(ships[i].dir, ships[i].sp * warp);
    for (const s of ships) if (s.dies && z >= s.dies + 300) s.alive = false;
  }

  const spawnBlast = (x, y, z, size, life = 1.6, tint = 1, seed = R()) => { if (blasts.length < 90) blasts.push({ x, y, z, size, life, age: 0, tint, seed, vx: (R() - 0.5) * 8, vy: (R() - 0.5) * 8, vz: (R() - 0.5) * 8 }); };
  const hullPoint = (s, o = vp) => {
    const L = s.c.L;
    o.copy(s.pos).addScaledVector(s.dir, (R() - 0.5) * L * 0.86);
    rt.crossVectors(wy, s.dir).normalize();
    o.addScaledVector(rt, (R() - 0.5) * L * 0.12); o.y += (R() - 0.3) * L * 0.1;
    return o;
  };
  const fire = (from, to, dist) => {
    const g = from.c.guns[Math.floor(R() * from.c.guns.length)] || [0, 0, 0];
    rt.crossVectors(wy, from.dir).normalize();
    const ax = from.pos.x + rt.x * g[0] + from.dir.x * g[2]; const ay = from.pos.y + g[1] + from.dir.y * g[2]; const az = from.pos.z + rt.z * g[0] + from.dir.z * g[2];
    hullPoint(to);
    const beam = from.c.L > 300 && R() < 0.22;
    const T = TEAM[from.team];
    const col = beam ? [T.shot[0] * 1.2, T.shot[1] * 1.2, T.shot[2] * 1.2] : T.shot;
    if (shots.length < 240) shots.push({ ax, ay, az, bx: vp.x, by: vp.y, bz: vp.z, age: 0, dur: beam ? 0.7 : Math.max(0.9, dist / 800), beam, col, w: beam ? from.c.L * 0.012 : from.c.L * 0.005 + 2.2, target: to, big: from.c.L });
  };

  function updateShips(dt, Pz, P) {
    for (const s of ships) {
      s.pos.addScaledVector(s.dir, s.sp * dt);
      const boss = Pz > ARENA_Z - 260;
      // 前へ進む艦は自機の前に保つ（ボス戦の前まで）
      if (!boss && s.dir.z > 0.3) { const ahead = 1250 + s.c.L * 0.5; if (s.pos.z - Pz < ahead) s.pos.z = Pz + ahead; }
      // ボス戦：自機はボスのまわりを回り、どの向きも見るので、艦は戦場の中心から遠い輪の上に留める
      if (boss) {
        const minR = 1700 + s.c.L * 0.6;
        const dx = s.pos.x; const dz = s.pos.z - BOSS_Z;
        const hr = Math.hypot(dx, dz) || 1;
        if (hr < minR) { s.pos.x = dx / hr * minR; s.pos.z = BOSS_Z + dz / hr * minR; }
        if (s.pos.y > -420) s.pos.y = -420;
      }
      // どの区間でも、艦の中心と自機の間を艦の大きさに応じて空ける
      const minD = 950 + s.c.L * 0.7;
      const ex = s.pos.x - P[0]; const ey = s.pos.y - P[1]; const ez = s.pos.z - P[2];
      const ed = Math.hypot(ex, ey, ez) || 1;
      if (ed < minD) { const f = minD / ed; s.pos.set(P[0] + ex * f, P[1] + ey * f, P[2] + ez * f); }
      if (s.dies && s.alive) {
        if (Pz > s.dies - 200) {
          s.dying = Math.min(1, s.dying + dt / 12);
          s.smoke -= dt;
          if (s.smoke <= 0) { s.smoke = 0.28 + R() * 0.5; hullPoint(s); spawnBlast(vp.x, vp.y, vp.z, s.c.L * (0.05 + R() * 0.07 + s.dying * 0.08), 1.8); }
          if (s.dying >= 1) {
            // 最後に大きく爆ぜて沈む
            s.alive = false;
            for (let k = 0; k < 9; k++) { hullPoint(s); spawnBlast(vp.x, vp.y, vp.z, s.c.L * (0.15 + R() * 0.24), 2.6 + R(), 1, R()); }
          }
        }
      }
      if (s.burn) {
        s.smoke -= dt;
        if (s.smoke <= 0) { s.smoke = 0.45 + R() * 0.8; hullPoint(s); spawnBlast(vp.x, vp.y, vp.z, s.c.L * (0.03 + R() * 0.05), 1.7); }
      }
      if (!scene_.battle || !s.alive) continue;
      s.cd -= dt;
      if (s.cd <= 0) {
        // 反対の陣営の中から、1隻を選んで撃つ
        const foes = ships.filter((o) => o.team !== s.team && o.alive);
        if (foes.length) {
          const to = foes[Math.floor(R() * foes.length)];
          const d = s.pos.distanceTo(to.pos);
          fire(s, to, d);
          s.cd = (s.c.L > 500 ? 0.45 : s.c.L > 300 ? 0.8 : 1.2) * (0.6 + R() * 0.9);
        } else s.cd = 1;
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      b.age += dt;
      if (b.age >= b.dur) {
        // 小型機の弾（big=0）は爆発を出さない
        if (b.big > 0) spawnBlast(b.bx, b.by, b.bz, (b.beam ? b.big * 0.05 : b.big * 0.015 + 8) * (0.8 + R() * 0.9), 1.0 + R() * 0.5, 1);
        shots.splice(i, 1);
      }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.age += dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.age >= b.life) blasts.splice(i, 1);
    }
  }

  function draw(P) {
    nFx = 0;
    for (const k of Object.keys(insts)) { insts[k].count = 0; instsLo[k].count = 0; }
    burnMesh.visible = false;
    for (const s of ships) {
      if (!s.alive) continue;
      const rx = s.pos.x - P[0]; const ry = s.pos.y - P[1]; const rz = s.pos.z - P[2];
      // 後ろへ過ぎた艦は描かない
      const d = Math.hypot(rx, ry, rz);
      if (rz < -s.c.L * 0.8 && d > s.c.L) continue;
      const k = shrink(rx, ry, rz);
      fw.copy(s.dir);
      rt.crossVectors(wy, fw).normalize();
      upv.crossVectors(fw, rt).normalize();
      if (s.tilt || s.dying) {
        const a = (s.tilt || 0) + (s.roll || 0) * clock + s.dying * s.dying * 0.5;
        const c = Math.cos(a); const n = Math.sin(a);
        const r2 = rt.clone().multiplyScalar(c).addScaledVector(upv, n);
        upv.multiplyScalar(c).addScaledVector(rt, -n); rt.copy(r2);
      }
      basis.makeBasis(rt, upv, fw);
      qq.setFromRotationMatrix(basis);
      vp.set(rx * k, ry * k, rz * k); vs.setScalar(k);
      m4.compose(vp, qq, vs);
      if (s.burn) { burnMesh.matrixAutoUpdate = false; burnMesh.matrix.copy(m4); burnMesh.matrixWorldNeedsUpdate = true; burnMesh.visible = true; } else { const near = s.c.L / Math.max(1, d) > 0.8; const m = near ? insts[s.cls] : instsLo[s.cls]; m.setMatrixAt(m.count++, m4); }
      // エンジンの光
      const T = TEAM[s.team];
      if (!s.burn) {
        for (const e of s.c.engines) {
          const ex = rx + rt.x * e[0] + upv.x * e[1] + fw.x * e[2]; const ey = ry + rt.y * e[0] + upv.y * e[1] + fw.y * e[2]; const ez = rz + rt.z * e[0] + upv.z * e[1] + fw.z * e[2];
          putFx(ex, ey, ez, ex, ey, ez, e[3] * 1.7, T.engine[0] * 1.3, T.engine[1] * 1.3, T.engine[2] * 1.3, 0);
          const l = e[3] * 9;
          putFx(ex, ey, ez, ex - fw.x * l, ey - fw.y * l, ez - fw.z * l, e[3] * 0.55, T.engine[0] * 0.42, T.engine[1] * 0.42, T.engine[2] * 0.42, 2, 1);
        }
      }
      for (const b of s.c.beacons) {
        const on = Math.sin(clock * 2.6 + b[3]) > 0.55;
        if (!on) continue;
        const ex = rx + rt.x * b[0] + upv.x * b[1] + fw.x * b[2]; const ey = ry + rt.y * b[0] + upv.y * b[1] + fw.y * b[2]; const ez = rz + rt.z * b[0] + upv.z * b[1] + fw.z * b[2];
        putFx(ex, ey, ez, ex, ey, ez, s.c.L * 0.012 + 2, 3, b[3] === 2 ? 0.4 : 0.5, 0.3, 0);
      }
    }
    for (const k of Object.keys(insts)) { insts[k].instanceMatrix.needsUpdate = insts[k].count > 0; instsLo[k].instanceMatrix.needsUpdate = instsLo[k].count > 0; }
    // 砲弾
    for (const b of shots) {
      const ax = b.ax - P[0]; const ay = b.ay - P[1]; const az = b.az - P[2];
      const bx = b.bx - P[0]; const by = b.by - P[1]; const bz = b.bz - P[2];
      const c = b.col;
      // 視点の近くを通る線は消す（遠景の砲撃が画面を横切って手前の物に見えないように）
      const dx = bx - ax; const dy = by - ay; const dz = bz - az;
      const u = Math.max(0, Math.min(1, -(ax * dx + ay * dy + az * dz) / (dx * dx + dy * dy + dz * dz || 1)));
      const near = Math.hypot(ax + dx * u, ay + dy * u, az + dz * u);
      const nf = Math.min(1, Math.max(0, (near - 380) / 260));
      if (nf <= 0) continue;
      if (b.beam) {
        const f = Math.sin(Math.min(1, b.age / b.dur) * Math.PI) * nf;
        putFx(ax, ay, az, bx, by, bz, b.w * 0.6, c[0] * 1.1 * f, c[1] * 1.1 * f, c[2] * 1.1 * f, 2);
      } else {
        const t = b.age / b.dur; const t0 = Math.max(0, t - 0.07);
        putFx(ax + dx * t0, ay + dy * t0, az + dz * t0, ax + dx * t, ay + dy * t, az + dz * t, b.w * 0.8, c[0] * 1.5 * nf, c[1] * 1.5 * nf, c[2] * 1.5 * nf, 2);
      }
    }
    for (const b of blasts) {
      const t = b.age / b.life;
      const x = b.x - P[0]; const y = b.y - P[1]; const z = b.z - P[2];
      const sz = b.size * (0.55 + 0.9 * Math.pow(t, 0.5));
      putFx(x, y, z, x, y, z, sz, b.tint, b.tint, b.tint, 1, t);
      if (t < 0.22) { const fl = (1 - t / 0.22); putFx(x, y, z, x, y, z, b.size * 2.4, 2.8 * fl, 1.8 * fl, 1.0 * fl, 0); }
    }
    // 小型機：輪を描いて飛び、短い光の尾を引く
    if (scene_.swarm) {
      const [sx, sy, sz] = scene_.swarm;
      for (const f of fighters) {
        if (f.dead > clock) continue;
        const a = f.a0 + clock * f.sp;
        const px = sx + Math.cos(a) * f.r + Math.sin(clock * 0.7 + f.ph) * f.wob;
        const py = sy + (Math.sin(a) * f.inc * f.r + f.y * f.r * 0.4) + Math.cos(clock * 0.9 + f.ph) * f.wob;
        const pz = sz + Math.sin(a) * f.r;
        const x = px - P[0]; const y = py - P[1]; const z = pz - P[2];
        const fnear = Math.min(1, Math.max(0, (Math.hypot(x, y, z) - 260) / 200));
        if (f.last && fnear > 0) {
          const T = TEAM[f.team];
          const lx = f.last[0] - P[0]; const ly = f.last[1] - P[1]; const lz = f.last[2] - P[2];
          const dx = x - lx; const dy = y - ly; const dz = z - lz;
          const dl = Math.hypot(dx, dy, dz) || 1;
          const tl = 11;
          putFx(x, y, z, x - dx / dl * tl, y - dy / dl * tl, z - dz / dl * tl, 1.4, T.engine[0] * 0.95 * fnear, T.engine[1] * 0.95 * fnear, T.engine[2] * 0.95 * fnear, 2, 1);
          f.shot -= 1 / 60;
          if (f.shot <= 0) {
            f.shot = 3 + R() * 7;
            if (R() < 0.12) { spawnBlast(px, py, pz, 12, 0.9); f.dead = clock + 2 + R() * 4; }
            else if (shots.length < 240) {
              const tp = 60 + R() * 60;
              shots.push({ ax: px, ay: py, az: pz, bx: px + dx / dl * tp + (R() - 0.5) * 20, by: py + dy / dl * tp + (R() - 0.5) * 20, bz: pz + dz / dl * tp, age: 0, dur: 0.25, beam: false, col: TEAM[f.team].shot, w: 0.9, big: 0 });
            }
          }
        }
        f.last = f.last || [0, 0, 0]; f.last[0] = px; f.last[1] = py; f.last[2] = pz;
      }
    }
    quad.instanceCount = nFx;
    // 使った本数の分だけ送る（spec REQ-013）
    if (nFx > 0) for (const a of [aA, aB, aC, aW]) { a.clearUpdateRanges(); a.addUpdateRange(0, nFx * a.itemSize); a.needsUpdate = true; }
  }

  let lastIdx = -1;
  let booted = false;
  return {
    group,
    update(state, P, dt, sunDir) {
      const z = P[2];
      if (!booted) { booted = true; burnMesh.visible = false; group.visible = false; }
      // 区間の霞の色に合わせる
      const { a, b, t } = regionAt(z);
      const ra = REGIONS[a]; const rb = REGIONS[b];
      hazeU.value.set(ra.haze[0] + (rb.haze[0] - ra.haze[0]) * t, ra.haze[1] + (rb.haze[1] - ra.haze[1]) * t, ra.haze[2] + (rb.haze[2] - ra.haze[2]) * t);
      mats.a.userData.uTime.value = state.time; mats.e.userData.uTime.value = state.time; mats.burn.userData.uTime.value = state.time;
      // いまの場面を選ぶ（内部通路の中は何も見えない）
      let idx = -1;
      if (!(z > TUNNEL_Z + 90 && z < LINE_Z - 180)) for (let i = 0; i < script.length; i++) if (z >= script[i].z0 && z < script[i].z1) idx = i;
      if (idx !== lastIdx) {
        lastIdx = idx;
        if (idx >= 0) enter(script[idx], z); else { scene_ = null; ships = []; shots = []; blasts = []; fighters = []; }
        group.visible = idx >= 0;
      }
      if (idx < 0) return;
      clock += dt;
      updateShips(dt, z, P);
      draw(P);
    },
    get count() { return ships.filter((s) => s.alive).length; },
    get fx() { return nFx; },
  };
}
