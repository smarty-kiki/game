import * as THREE from 'three';
import {
  Fn, attribute, vec2, vec3, vec4, abs, exp, mix, clamp, smoothstep, length, max, normalize, cross, modelViewMatrix,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, viewVertex, edgeMask, softFade, fbm2 } from './soft.js';
import { KIND } from './puffs.js';
import { BALANCE } from '../weaponBalance.js';

// レールガン（重武装 'rail'）。溜めなしの単発。押した瞬間に機首から一直線の貫通の一撃を撃つ。
// 絵は、一瞬だけ光る細く鋭い芯と、その後に残って広がりながら薄れる「空気が裂けた跡」の鞘、跡に沿って湧く蒸気。
// 弾数制で、補給（B）で増える。撃った後は待ちがある。主砲の溜めの球・溜めの表示は出さない。
const RAIL = BALANCE.heavy.rail;
export { RAIL };

const SHOTS = 3; // 同時に残る跡の数（待ち 0.85 秒 × 余韻 1.1 秒）
const CORE_LIFE = 0.16;
const TRAIL_LIFE = 1.1;

// 跡の層：撃った点から +Z へ伸び、軸のまわりでカメラへ向く板。遠くでも幅に下限を持つ
function rayMaterial(inner, outer, sharp, noise) {
  const U = nodeUniforms({
    uLen: RAIL.range, uR: 0.05, uPx: 0.0015, uGain: 0, uSharp: sharp,
    uNoise: noise, uAge: 0, uIn: new THREE.Color(...inner), uOut: new THREE.Color(...outer),
  });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const z = U.uLen.mul(aT.mul(aT));
  const vp = modelViewMatrix.mul(vec4(0.0, 0.0, z, 1.0));
  const dir = normalize(modelViewMatrix.mul(vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  const side = normalize(cross(dir, vp.xyz));
  const w = max(U.uR.mul(mix(0.3, 1.0, smoothstep(0.0, 6.0, z))), U.uPx.mul(vp.z.negate()));
  const vv = viewVertex(vec4(vp.xyz.add(side.mul(w).mul(aSide)), 1.0));
  const vZ = z.toVarying('vZ'); // 軸に沿った距離は線形に補間する
  const fragmentNode = Fn(() => {
    const vS = aSide;
    const a = exp(vS.mul(vS).mul(U.uSharp).negate());
    const e = smoothstep(0.8, 1.0, abs(vS)).oneMinus();
    // 鞘は裂け目のように途切れ、跡に沿ってゆっくり揺らぐ
    const n = fbm2(vec2(vZ.mul(0.18).add(U.uAge.mul(1.5)), vS.mul(2.5).add(U.uAge.mul(3.0))));
    const tear = mix(1.0, smoothstep(0.2, 0.9, n).mul(1.3), U.uNoise);
    const ends = smoothstep(0.0, 0.8, vZ).mul(smoothstep(U.uLen.mul(0.6), U.uLen, vZ).oneMinus());
    const c = mix(U.uOut, U.uIn, a.mul(a));
    // カメラのすぐそばを通る所は消す（画面いっぱいの光にしない）
    const cam = smoothstep(2.0, 12.0, vv.viewDist);
    return vec4(c.mul(U.uGain), a.mul(e).mul(tear).mul(ends).mul(cam).mul(softFade(0.05, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 砲口の閃光：横に長い光と、短い縦の光
function flashMaterial() {
  const U = nodeUniforms({ uSize: 0.3, uAspect: 1.6, uRot: 0, uOpacity: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const vC = bb.vC;
    const r = length(vC);
    const core = exp(r.mul(r).mul(-22.0)).mul(2.0);
    const streak = exp(abs(vC.y).mul(-30.0)).mul(exp(abs(vC.x).mul(-1.6))).mul(0.9);
    const streakV = exp(abs(vC.x).mul(-30.0)).mul(exp(abs(vC.y).mul(-3.2))).mul(0.35);
    const halo = exp(r.mul(-4.0)).mul(0.3);
    const a = core.add(streak).add(streakV).add(halo).mul(U.uOpacity);
    const col = mix(vec3(0.45, 0.85, 1.0), vec3(1.0), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.4), a.mul(edgeMask(vC)).mul(softFade(0.04, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

export function createRail({ anchors, scene = null, feel = null }) {
  const group = new THREE.Group(); // 機体についていく物（砲口の閃光と光）
  const worldGroup = new THREE.Group(); // 世界に残る物（撃った跡）
  (scene || group).add(worldGroup);
  const nose = anchors.nose;
  const muzzlePos = new THREE.Vector3(nose.x, nose.y + 0.01, nose.z + 0.10);
  const quad = new THREE.PlaneGeometry(1, 1);

  const RAY_N = 40;
  const pos = new Float32Array((RAY_N + 1) * 6);
  const aT = new Float32Array((RAY_N + 1) * 2);
  const aSide = new Float32Array((RAY_N + 1) * 2);
  const idx = [];
  for (let i = 0; i <= RAY_N; i++) {
    aT[i * 2] = aT[i * 2 + 1] = i / RAY_N;
    aSide[i * 2] = -1; aSide[i * 2 + 1] = 1;
    if (i < RAY_N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
  geo.setIndex(idx);
  const layer = (inner, outer, sharp, noise, order) => {
    const mat = rayMaterial(inner, outer, sharp, noise);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    mesh.visible = false;
    worldGroup.add(mesh);
    return { mesh, u: mat.uniforms };
  };
  const shots = [];
  for (let i = 0; i < SHOTS; i++) {
    shots.push({
      age: 9, far: [0, 0, 0], dir: [0, 0, 1],
      // 鞘（空気の裂け目）と芯（細く鋭い光）
      sheath: layer([0.55, 0.80, 1.0], [0.10, 0.25, 0.75], 2.2, 1, 10),
      core: layer([1.0, 1.0, 1.0], [0.40, 0.85, 1.0], 3.0, 0, 11),
    });
  }
  let shotCursor = 0;
  let lastP = null;

  const flashMat = flashMaterial();
  const flash = new THREE.Mesh(quad, flashMat);
  flash.position.copy(muzzlePos);
  flash.renderOrder = 13;
  flash.frustumCulled = false;
  flash.visible = false;
  group.add(flash);
  // 主砲と同じく2つの光を常に置く（機体を照らす光と、撃った先を照らす光）
  const light = new THREE.PointLight(0x9fe6ff, 0, 3.0, 2);
  light.position.set(muzzlePos.x, muzzlePos.y + 0.08, muzzlePos.z + 0.05);
  group.add(light);
  const farLight = new THREE.PointLight(0x9fdcff, 0, 90, 1.6);
  group.add(farLight);

  const s = { ammo: RAIL.ammo, cool: 0, fired: 0, prevHeld: false, emptyAge: 9, fireAge: 9, hitFar: null, firstHit: 30, regen: 0 };
  const _q = new THREE.Quaternion();
  const _z = new THREE.Vector3(0, 0, 1);
  const _d = new THREE.Vector3();

  function fire(state, ship, world, fx, puffs) {
    const P = ship.pos;
    const fw = ship.forward;
    const o = ship.toWorld(muzzlePos);
    // 一直線に貫く。同じ物は1回だけ。止まらずに射程の端まで届く
    let from = [o[0], o[1], o[2]];
    let left = RAIL.range;
    let travelled = 0;
    const done = new Set();
    s.hitFar = null; s.firstHit = 30;
    state.railFiring = true; // 当たった側が「レールガンの弾」と分かるように（大蛇の溜めを撃ち抜く。spec REQ-015）
    for (let k = 0; k < RAIL.pierce && left > 0; k++) {
      const hit = world.raycast(from[0], from[1], from[2], fw[0], fw[1], fw[2], left);
      if (!hit) break;
      const rock = hit.rock;
      if (!done.has(rock)) {
        done.add(rock);
        const nr = [hit.point[0] - rock.rel.x, hit.point[1] - rock.rel.y, hit.point[2] - rock.rel.z];
        const m = Math.hypot(nr[0], nr[1], nr[2]) || 1;
        const nn = [nr[0] / m, nr[1] / m, nr[2] / m];
        fx.hitSmall(hit.point, nn, 1);
        fx.hitBeam(hit.point, nn, 0.05);
        if (!s.hitFar) { s.hitFar = [hit.point[0] + P[0], hit.point[1] + P[1], hit.point[2] + P[2]]; s.firstHit = travelled + hit.dist; }
        if (world.damage(rock, RAIL.damage, state, P)) fx.explode(hit.point, rock.size);
      }
      // 物の向こう側へ抜けて続ける
      const skip = hit.dist + (rock.radius || 1) * 2 + 0.5;
      from = [from[0] + fw[0] * skip, from[1] + fw[1] * skip, from[2] + fw[2] * skip];
      left -= skip; travelled += skip;
    }
    state.railFiring = false;
    const sh = shots[shotCursor];
    shotCursor = (shotCursor + 1) % SHOTS;
    sh.age = 0;
    sh.far = [o[0] + P[0], o[1] + P[1], o[2] + P[2]];
    sh.dir = fw.slice();
    // 裂けた空気：跡に沿って細い蒸気と、前へ抜ける細い光の粒
    if (puffs) {
      const R = puffs.rnd;
      for (let d = 24; d < 200; d += 9 + d * 0.1) {
        const p = [o[0] + fw[0] * d, o[1] + fw[1] * d, o[2] + fw[2] * d];
        const a = R() * Math.PI * 2;
        const out = ship.toWorld({ x: Math.cos(a), y: Math.sin(a), z: 0 });
        const sp = 0.8 + R() * 1.6;
        puffs.puff(p, [out[0] * sp, out[1] * sp, out[2] * sp], 0.35 + R() * 0.35, 0.06, 0.32 + d * 0.003, KIND.VAPOR, 1.5, 1, d * 0.0015);
        if (R() < 0.5) puffs.spark(p, [fw[0] * (60 + R() * 80) + out[0] * 3, fw[1] * (60 + R() * 80) + out[1] * 3, fw[2] * (60 + R() * 80) + out[2] * 3], 0.15 + R() * 0.2, 0.014, 0.0003, 1, 0, 1);
      }
    }
    s.ammo -= 1;
    s.fired += 1;
    s.cool = RAIL.cool;
    s.fireAge = 0;
    if (feel) feel.fire('beamStart', 0.75);
  }

  function update(state, dt, ship, world, fx, puffs) {
    state.railMode = true;
    const held = !!(state.charge && state.charge.held);
    s.cool = Math.max(0, s.cool - dt);
    // 弾は撃たずにいても RAIL.regen 秒に1発戻る（最大まで。spec REQ-015）
    if (s.ammo < RAIL.ammoMax) { s.regen += dt; if (s.regen >= RAIL.regen) { s.regen = 0; s.ammo += 1; } } else s.regen = 0;
    s.emptyAge += dt;
    s.fireAge += dt;
    if (held && !s.prevHeld && ship && world) {
      if (s.ammo <= 0) s.emptyAge = 0;
      else if (s.cool <= 0) fire(state, ship, world, fx, puffs);
    }
    s.prevHeld = held;
    const P = ship ? ship.pos : [0, 0, 0];
    if (ship) lastP = P;

    for (const sh of shots) {
      sh.age += dt;
      const on = sh.age < TRAIL_LIFE;
      sh.core.mesh.visible = sh.age < CORE_LIFE;
      sh.sheath.mesh.visible = on;
      if (!on) continue;
      _d.set(sh.dir[0], sh.dir[1], sh.dir[2]);
      _q.setFromUnitVectors(_z, _d);
      for (const L of [sh.core, sh.sheath]) {
        L.mesh.position.set(sh.far[0] - P[0], sh.far[1] - P[1], sh.far[2] - P[2]);
        L.mesh.quaternion.copy(_q);
        L.u.uAge.value = sh.age;
      }
      const c = 1 - sh.age / CORE_LIFE;
      sh.core.u.uGain.value = Math.max(0, c) * 3.6;
      sh.core.u.uR.value = 0.02 + 0.03 * Math.max(0, c);
      sh.core.u.uPx.value = 0.0009 + 0.0009 * Math.max(0, c);
      // 鞘：撃った瞬間は細く明るく、広がりながら薄れる
      const u = sh.age / TRAIL_LIFE;
      sh.sheath.u.uR.value = 0.03 + 0.85 * u;
      sh.sheath.u.uPx.value = 0.0008 + 0.0034 * u;
      sh.sheath.u.uGain.value = 0.38 * Math.pow(1 - u, 1.6);
    }

    const k = Math.exp(-s.fireAge * 26);
    flash.visible = k > 0.01;
    flashMat.uniforms.uOpacity.value = k * 0.75;
    flashMat.uniforms.uSize.value = 0.08 + 0.15 * k;
    light.intensity = Math.exp(-s.fireAge * 14) * 3.0;
    farLight.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z + Math.min(s.firstHit, 30));
    farLight.intensity = Math.exp(-s.fireAge * 14) * 420;
  }

  return {
    group,
    update,
    get recoil() { return 0; },
    get visible() { return shots.some((sh) => sh.age < TRAIL_LIFE); },
    get flash() { return Math.exp(-s.fireAge * 20) * 0.6; },
    // 当たった所の光（機体からの相対）。撃った直後の一瞬だけ
    get hitPoint() {
      if (!s.hitFar || s.fireAge > 0.12 || !lastP) return null;
      return [s.hitFar[0] - lastP[0], s.hitFar[1] - lastP[1], s.hitFar[2] - lastP[2]];
    },
    get muzzle() { return muzzlePos; },
    get ammo() { return s.ammo; },
    get fired() { return s.fired; },
    // 補給：増えた数を返す
    addAmmo(n = RAIL.resupply) { const before = s.ammo; s.ammo = Math.min(RAIL.ammoMax, s.ammo + n); return s.ammo - before; },
    // 画面の下の武装の列：[右の数字, 線の長さ, 使えるか, 区切りの数]。線は残りの弾、待ちの間は今の1発分を欠かせる
    hud() {
      if (s.ammo <= 0) return ['EMPTY', 0, false, RAIL.ammoMax];
      const k = (s.ammo - s.cool / RAIL.cool) / RAIL.ammoMax;
      return [String(s.ammo), Math.max(0, k), s.cool <= 0, RAIL.ammoMax];
    },
    reset() {
      Object.assign(s, { ammo: RAIL.ammo, cool: 0, fired: 0, prevHeld: false, emptyAge: 9, fireAge: 9, hitFar: null, firstHit: 30, regen: 0 });
      for (const sh of shots) { sh.age = 9; sh.core.mesh.visible = false; sh.sheath.mesh.visible = false; }
    },
  };
}
