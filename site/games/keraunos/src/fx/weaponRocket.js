import * as THREE from 'three';
import { Fn, vec3, vec4, length, exp, mix, clamp } from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, edgeMask, softFade } from './soft.js';
import { KIND } from './puffs.js';
import { BALANCE } from '../weaponBalance.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rotate } from '../flightState.js';

// ロケット（副武装）：誘導しない大型の弾。押した瞬間に翼の下から左右交互に1発。
// 少し落ちてから点火し、機首の向きへまっすぐ加速する。物に当たるか、近くを通るか、射程の端で爆発し、
// 爆発の半径の中の敵をまとめて削る（中心ほど重い）。煙の尾を引く。弾数制で、補給（B）で増える。
export const ROCKET = BALANCE.sub.rocket;
const MAX = 4;

// 噴射口の光：芯の白と橙の光の玉（カメラへ向く板）
function flareMaterial() {
  const U = nodeUniforms({ uSize: 0.5, uAspect: 1, uRot: 0, uOpacity: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const r = length(bb.vC);
    const core = exp(r.mul(r).mul(-26.0)).mul(2.2);
    const halo = exp(r.mul(-4.0)).mul(0.5);
    const a = core.add(halo).mul(U.uOpacity).mul(edgeMask(bb.vC));
    const col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.95, 0.8), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.4), a.mul(softFade(0.05, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

export function createRocket({ scene, anchors, feel }) {
  const group = new THREE.Group();
  scene.add(group);
  // 弾の形：鈍い塗装の胴、暗い弾頭、4枚の尾翼。+Z が前。描画を増やさないよう1つの形にまとめて色は頂点で持つ
  const tint = (g, c) => { const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const PAINT = [0.26, 0.27, 0.24]; const DARK = [0.03, 0.03, 0.035];
  const parts = [tint(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 10).rotateX(Math.PI / 2), PAINT), tint(new THREE.ConeGeometry(0.11, 0.32, 10).rotateX(Math.PI / 2).translate(0, 0, 0.71), DARK)];
  for (let k = 0; k < 4; k++) parts.push(tint(new THREE.BoxGeometry(0.02, 0.2, 0.22).translate(0, 0.17, -0.42).rotateZ(k * Math.PI / 2), DARK));
  const bodyGeo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.6 });
  const quad = new THREE.PlaneGeometry(1, 1);
  const rockets = [];
  for (let i = 0; i < MAX; i++) {
    const obj = new THREE.Group();
    obj.add(new THREE.Mesh(bodyGeo, bodyMat));
    const glowMat = flareMaterial();
    const glow = new THREE.Mesh(quad, glowMat);
    glow.position.z = -0.65;
    glow.renderOrder = 9;
    glow.frustumCulled = false;
    obj.add(glow);
    obj.visible = false;
    group.add(obj);
    rockets.push({ obj, glowMat, alive: false, far: [0, 0, 0], dir: [0, 0, 1], v: 0, base: 0, drop: [0, 0, 0], age: 0, travel: 0, trail: 0 });
  }

  const s = { ammo: ROCKET.ammo, cool: 0, fired: 0, emptyAge: 9, prev: false, side: 1 };
  const _q = new THREE.Quaternion();
  const _z = new THREE.Vector3(0, 0, 1);
  const _d = new THREE.Vector3();

  function launch(ship) {
    const r = rockets.find((x) => !x.alive);
    if (!r) return false;
    const wing = s.side > 0 ? anchors.wingR : anchors.wingL;
    const w = ship.toWorld({ x: wing.x * 0.55, y: wing.y - 0.1, z: wing.z + 0.15 });
    const P = ship.pos;
    r.far = [w[0] + P[0], w[1] + P[1], w[2] + P[2]];
    r.dir = ship.forward.slice();
    r.base = ship.speed;
    r.v = ship.speed + ROCKET.speed * 0.3;
    // 点火までは下と外へ少し落ちる
    r.drop = rotate(ship.q, [s.side * 2.0, -4.5, 0]);
    r.age = 0; r.travel = 0; r.trail = 0;
    r.alive = true;
    r.obj.visible = true;
    if (feel) feel.fire('salvoShot', 1.6, s.side);
    s.side = -s.side;
    return true;
  }

  function detonate(r, point, direct, state, world, fx, P) {
    fx.explode(point, 5.5);
    let hits = 0;
    // 爆風：半径の中の敵（と直撃した物）を、中心からの距離で削る
    for (const t of world.targets.slice()) {
      if (!(t.radius > 0.5)) continue;
      if (!t.aim && t !== direct) continue; // 1隻が複数の当たりの球を持つ敵に、爆風を重ねない
      const d = Math.max(0, Math.hypot(t.rel.x - point[0], t.rel.y - point[1], t.rel.z - point[2]) - t.radius);
      if (d > ROCKET.radius && t !== direct) continue;
      const k = 1 - Math.min(1, d / ROCKET.radius);
      const dmg = ROCKET.splash * (0.35 + 0.65 * k) + (t === direct ? ROCKET.damage : 0);
      if (world.damage(t, dmg, state, P)) fx.explode([t.rel.x, t.rel.y, t.rel.z], t.size || 2);
      hits += 1;
    }
    // 岩は直撃した物だけ
    if (direct && !world.targets.includes(direct)) {
      if (world.damage(direct, ROCKET.damage + ROCKET.splash, state, P)) fx.explode(point, direct.size || 2);
    }
    if (feel) feel.fire('lanceHit', 1.3);
    r.alive = false;
    r.obj.visible = false;
    return hits;
  }

  function update(state, ship, world, fx, puffs, dt, input, contacts, blocked) {
    void contacts;
    const P = ship.pos;
    const R = puffs.rnd;
    s.cool = Math.max(0, s.cool - dt);
    s.emptyAge += dt;
    const press = !!(input && input.rocket);
    if (press && !s.prev && !blocked) {
      if (s.ammo <= 0) s.emptyAge = 0;
      else if (s.cool <= 0 && launch(ship)) { s.ammo -= 1; s.fired += 1; s.cool = ROCKET.cool; }
    }
    s.prev = press;

    for (const r of rockets) {
      if (!r.alive) continue;
      r.age += dt;
      const lit = r.age >= ROCKET.ignite;
      if (lit) r.v = Math.min(r.base + ROCKET.vmax, r.v + ROCKET.accel * dt);
      const vel = [r.dir[0] * r.v, r.dir[1] * r.v, r.dir[2] * r.v];
      if (!lit) { for (let k = 0; k < 3; k++) vel[k] += r.drop[k]; }
      const sp = Math.hypot(vel[0], vel[1], vel[2]) || 1;
      const step = sp * dt;
      const rx = r.far[0] - P[0]; const ry = r.far[1] - P[1]; const rz = r.far[2] - P[2];
      if (dt > 0) {
        const hit = world.raycast(rx, ry, rz, vel[0] / sp, vel[1] / sp, vel[2] / sp, step + 0.3);
        if (hit) { detonate(r, hit.point, hit.rock, state, world, fx, P); continue; }
        // 近接信管：小さな敵の球のそばを通ったら起爆して直撃の扱い（大きな物は実際に当たるまで飛ぶ）
        let near = null;
        for (const t of world.targets) {
          if (!t.aim || !(t.radius > 0.5) || t.radius > ROCKET.fuseMax) continue;
          if (Math.hypot(t.rel.x - rx, t.rel.y - ry, t.rel.z - rz) < t.radius + ROCKET.fuse) { near = t; break; }
        }
        if (near && r.age > ROCKET.ignite) { detonate(r, [rx, ry, rz], near, state, world, fx, P); continue; }
      }
      for (let k = 0; k < 3; k++) r.far[k] += vel[k] * dt;
      r.travel += Math.max(0, (r.v - r.base)) * dt;
      if (r.travel > ROCKET.range || r.age > 4) { detonate(r, [r.far[0] - P[0], r.far[1] - P[1], r.far[2] - P[2]], null, state, world, fx, P); continue; }

      const nx = r.far[0] - P[0]; const ny = r.far[1] - P[1]; const nz = r.far[2] - P[2];
      r.obj.position.set(nx, ny, nz);
      _d.set(r.dir[0], r.dir[1], r.dir[2]);
      r.obj.quaternion.copy(_q.setFromUnitVectors(_z, _d));
      const flick = 0.85 + 0.15 * Math.sin(state.time * 90 + r.far[2]);
      r.glowMat.uniforms.uOpacity.value = lit ? flick : 0;
      r.glowMat.uniforms.uSize.value = lit ? 0.45 + 0.25 * flick : 0.1;
      // 煙の尾：走った距離に応じて、後ろに一定の間隔で置く。噴射口には短い炎
      if (lit && dt > 0) {
        r.trail += step;
        const back = [-r.dir[0], -r.dir[1], -r.dir[2]];
        while (r.trail >= 1.6) {
          r.trail -= 1.6;
          const off = r.trail + 0.7;
          const p = [nx + back[0] * off, ny + back[1] * off, nz + back[2] * off];
          // 機体のすぐ前は煙を出さない（自分の煙で前が見えなくならないように）
          if (r.travel > 8) puffs.puff(p, [(R() - 0.5) * 1.2, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2], 1.1 + R() * 0.8, 0.22, 1.0 + R() * 0.5, KIND.TRAIL, 1.0, 1);
        }
        puffs.puff([nx + back[0] * 0.8, ny + back[1] * 0.8, nz + back[2] * 0.8], [back[0] * 20, back[1] * 20, back[2] * 20], 0.07, 0.42, 0.18, KIND.FIRE, 0, 1);
      }
    }
  }

  return {
    group,
    get ammo() { return s.ammo; },
    get cool() { return s.cool; },
    get fired() { return s.fired; },
    get flying() { return rockets.filter((r) => r.alive).length; },
    update,
    addAmmo(n) { s.ammo = Math.min(ROCKET.ammoMax, s.ammo + n); },
    reset() {
      Object.assign(s, { ammo: ROCKET.ammo, cool: 0, fired: 0, emptyAge: 9, prev: false, side: 1 });
      for (const r of rockets) { r.alive = false; r.obj.visible = false; }
    },
    // 画面の下の武装の列：[右の数字, 線の長さ 0..1, 使えるか]。弾切れは 'EMPTY'
    hud() {
      if (s.ammo <= 0) return ['EMPTY', 0, false];
      return [String(s.ammo), (s.ammo - s.cool / ROCKET.cool) / ROCKET.ammoMax, s.cool <= 0];
    },
  };
}
