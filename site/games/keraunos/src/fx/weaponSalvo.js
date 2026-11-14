import * as THREE from 'three';
import { rotate } from '../flightState.js';
import { createRibbons } from './weaponRibbon.js';
import { SALVO, pickLock } from './weaponFeel.js';
import { Fn, attribute, positionGeometry, modelViewMatrix, cameraProjectionMatrix, varying, vec3, vec4, length, exp, pow, max, min, mix, clamp } from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, softUniforms } from './soft.js';

// 多重誘導弾。弾数に限りがあり、補給（B の取る物）で増える。V を押している間、前方の円錐に入った敵へ順に狙いを付け（最大8）、離すと一斉に撃つ。
// 翼の下から外へ投げ出され、尾を引いて弧を描きながら狙った敵へ曲がる。

// 弾の頭：画面の上で決まった画素の大きさの光の玉。WebGPU の点は1画素にしかならないので、
// 1発に1枚の四角をインスタンスで並べ、四角の角を画素の数だけ広げる（今の点の大きさと同じ式）
function headMaterial(U) {
  const aPos = attribute('aPos', 'vec3');
  const aSize = attribute('aSize', 'float');
  const aOn = attribute('aOn', 'float');
  const mv = modelViewMatrix.mul(vec4(aPos, 1.0));
  const clip = cameraProjectionMatrix.mul(mv);
  // 遠いほど小さく、5〜30画素に収める。撃っていない弾は大きさ 0 で潰れて描かれない
  const px = min(30.0, max(5.0, aOn.mul(aSize).mul(U.uScale).div(max(0.5, mv.z.negate())))).mul(aOn);
  // 描く先の画素の数（softUniforms.uRes）で割って、画面の座標の広がりにする
  const off = positionGeometry.xy.mul(px).mul(2.0).div(softUniforms.uRes).mul(clip.w);
  const vertexNode = vec4(clip.xy.add(off), clip.zw);
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const fragmentNode = Fn(() => {
    const r = length(vC);
    const core = exp(r.mul(r).mul(-20.0)).mul(2.4);
    const halo = pow(max(0.0, r.oneMinus()), 2.4).mul(0.9);
    return vec4(mix(vec3(0.25, 0.7, 1.0), vec3(1.0), clamp(core, 0.0, 1.0)).mul(2.2), core.add(halo));
  })();
  return glowNodeMaterial(U, { vertexNode, fragmentNode });
}

const MAX_LIFE = 3.2;

export function createSalvo({ scene, anchors, parent = scene, feel }) {
  const positions = new Float32Array(SALVO.max * 3);
  const sizes = new Float32Array(SALVO.max);
  const ons = new Float32Array(SALVO.max);
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index;
  g.setAttribute('position', quad.attributes.position);
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aOn', new THREE.InstancedBufferAttribute(ons, 1).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount = SALVO.max;
  const mat = headMaterial(nodeUniforms({ uScale: 420 }));
  const heads = new THREE.Mesh(g, mat);
  heads.frustumCulled = false;
  heads.renderOrder = 9;
  heads.visible = false;
  parent.add(heads);
  const ribbons = createRibbons({ count: SALVO.max, rows: 26, spacing: 1.6, width: 0.09, core: [0.62, 0.86, 1], edge: [0.06, 0.28, 0.9], gain: 0.55, parent });

  const missiles = [];
  for (let i = 0; i < SALVO.max; i++) missiles.push({ alive: false, far: [0, 0, 0], vel: [0, 0, 0], age: 0, delay: 0, target: null });

  const s = { locks: [], timer: 0, holding: false, cool: 0, fired: 0, pending: 0, kickQueue: [], ammo: SALVO.ammo, emptyAge: 9 };
  const anyAlive = () => missiles.some((m) => m.alive);

  function fire(ship, R) {
    let slot = 0;
    const list = s.locks;
    for (let i = 0; i < list.length && slot < missiles.length; i++) {
      const m = missiles[slot];
      const sign = slot % 2 ? -1 : 1;
      const k = (slot >> 1) % 4;
      const wing = sign > 0 ? anchors.wingR : anchors.wingL;
      const w = ship.toWorld({ x: wing.x - sign * (0.1 + 0.09 * k), y: wing.y - 0.06, z: wing.z + 0.1 });
      m.far = [w[0] + ship.pos[0], w[1] + ship.pos[1], w[2] + ship.pos[2]];
      // 外と下へ投げ出してから曲がる。1発ごとに開く向きを変えて、扇に広がって見せる
      const out = rotate(ship.q, [sign * (16 + 5 * k + R() * 5), -4 + 7 * k + R() * 4, 12 + R() * 6]);
      const fw = ship.forward;
      m.vel = [out[0] + fw[0] * ship.speed, out[1] + fw[1] * ship.speed, out[2] + fw[2] * ship.speed];
      m.age = 0;
      m.delay = slot * 0.05;
      m.alive = true;
      m.shot = false;
      m.target = list[i].target;
      ribbons.release(slot);
      slot += 1;
    }
    s.fired += slot;
    s.ammo = Math.max(0, s.ammo - slot);
    s.cool = SALVO.cool;
    s.locks = [];
  }

  function update(state, ship, world, fx, puffs, dt, inp, targets, blocked) {
    const P = ship.pos;
    const R = puffs.rnd;
    s.cool = Math.max(0, s.cool - dt);
    s.emptyAge += dt;
    if (inp.salvo && s.ammo <= 0 && !s.pressed) s.emptyAge = 0;
    s.pressed = !!inp.salvo;
    const hold = !!inp.salvo && !blocked && s.cool <= 0 && s.ammo > 0;
    // 死んだ敵の狙いは外す
    s.locks = s.locks.filter((l) => l.target.radius > 0.5);
    if (hold) {
      s.timer += dt;
      while (s.timer >= SALVO.lockEvery) {
        s.timer -= SALVO.lockEvery;
        if (s.locks.length >= Math.min(SALVO.max, s.ammo)) break;
        let t = pickLock(targets, s.locks, ship.forward);
        // 敵がいなければ岩を狙う（小惑星帯でも使える）
        if (!t) {
          const used = s.locks.map((l) => l.target);
          const r = world.nearestAhead(ship.forward, used);
          if (r && r.radius > 0.5) {
            const d = r.rel.length() || 1;
            const c = (r.rel.x * ship.forward[0] + r.rel.y * ship.forward[1] + r.rel.z * ship.forward[2]) / d;
            if (c > Math.cos(SALVO.cone)) t = r;
          }
        }
        if (!t) break;
        s.locks.push({ target: t, t0: state.time });
      }
    } else if (s.holding) {
      if (s.locks.length && !blocked) fire(ship, R);
      else s.locks = [];
      s.timer = 0;
    }
    s.holding = hold;

    let n = 0;
    for (let i = 0; i < missiles.length; i++) {
      const m = missiles[i];
      if (!m.alive) { ons[i] = 0; ribbons.release(i); continue; }
      m.age += dt;
      if (m.age < m.delay) {
        // 待っている間は翼の下についてくる
        const fw = ship.forward;
        for (let k = 0; k < 3; k++) m.far[k] += fw[k] * ship.speed * dt;
        ons[i] = 0;
        continue;
      }
      if (!m.shot) { m.shot = true; if (feel) feel.fire('salvoShot', 1, i % 2 ? -1 : 1); }
      const a = m.age - m.delay;
      const fw = ship.forward;
      const speed = ship.speed + 34 + 210 * Math.min(1, a / 0.75);
      const tgt = m.target;
      const alive = tgt && tgt.radius > 0.5;
      const rx = m.far[0] - P[0]; const ry = m.far[1] - P[1]; const rz = m.far[2] - P[2];
      const want = alive ? [tgt.rel.x - rx, tgt.rel.y - ry, tgt.rel.z - rz] : [fw[0], fw[1], fw[2]];
      const wl = Math.hypot(want[0], want[1], want[2]) || 1;
      const vl = Math.hypot(m.vel[0], m.vel[1], m.vel[2]) || 1;
      const turn = 1 - Math.exp(-dt * (0.5 + 15 * Math.min(1, Math.max(0, a - 0.12) / 0.3)));
      const d = [m.vel[0] / vl + (want[0] / wl - m.vel[0] / vl) * turn, m.vel[1] / vl + (want[1] / wl - m.vel[1] / vl) * turn, m.vel[2] / vl + (want[2] / wl - m.vel[2] / vl) * turn];
      const dl = Math.hypot(d[0], d[1], d[2]) || 1;
      const sp = a < 0.12 ? vl : speed;
      m.vel = [d[0] / dl * sp, d[1] / dl * sp, d[2] / dl * sp];
      const step = sp * dt;
      const hit = dt > 0 ? world.raycast(rx, ry, rz, d[0] / dl, d[1] / dl, d[2] / dl, step + 0.2) : null;
      const close = alive && wl < tgt.radius + 1.5;
      if (hit || close || a > MAX_LIFE) {
        const point = hit ? hit.point : [rx, ry, rz];
        fx.explode(point, 1.5);
        const victim = hit ? hit.rock : (close ? tgt : null);
        if (victim && world.damage(victim, SALVO.damage, state, P)) fx.explode(point, victim.size);
        m.alive = false;
        ons[i] = 0;
        ribbons.release(i);
        continue;
      }
      for (let k = 0; k < 3; k++) m.far[k] += m.vel[k] * dt;
      const nx = m.far[0] - P[0]; const ny = m.far[1] - P[1]; const nz = m.far[2] - P[2];
      positions[i * 3] = nx; positions[i * 3 + 1] = ny; positions[i * 3 + 2] = nz;
      sizes[i] = 0.62 + 0.14 * Math.sin(state.time * 70 + i * 2.1);
      ons[i] = 1;
      ribbons.head(i, m.far, 1);
      // 尾の火花は少しだけ（粒の予算を使いすぎない）
      if (R() < dt * 26) puffs.spark([nx, ny, nz], [(R() - 0.5) * 7, (R() - 0.5) * 7, (R() - 0.5) * 7], 0.22 + R() * 0.2, 0.03, 0.012, 1, 3, 1);
      n += 1;
    }
    heads.visible = n > 0;
    if (n > 0 || anyAlive()) {
      g.attributes.aPos.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aOn.needsUpdate = true;
    }
    ribbons.update(P, dt, 1.5);
    mat.uniforms.uScale.value = window.innerHeight * 0.9;
  }

  function reset() {
    s.locks = []; s.timer = 0; s.holding = false; s.cool = 0; s.ammo = SALVO.ammo; s.emptyAge = 9;
    for (const m of missiles) m.alive = false;
    ons.fill(0);
    heads.visible = false;
    ribbons.clear();
  }

  return {
    update, reset,
    get locks() { return s.locks; },
    get holding() { return s.holding; },
    get cool() { return s.cool / SALVO.cool; },
    get fired() { return s.fired; },
    get ammo() { return s.ammo; },
    get emptyAge() { return s.emptyAge; },
    addAmmo(n) { s.ammo = Math.min(SALVO.ammoMax, s.ammo + n); },
    get flying() { return missiles.filter((m) => m.alive).length; },
  };
}
