import * as THREE from 'three';
import { Fn, vec3, vec4, length, exp, pow, max, mix, clamp } from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, edgeMask, softFade } from './soft.js';
import { KIND } from './puffs.js';
import { rotate } from '../flightState.js';
import { BALANCE } from '../weaponBalance.js';

// 誘導ランス。翼の上から6発が外へ飛び出し、前の岩へ曲がりながら追いかけて爆発する。
// 尾は線でなく、炎と煙の粒で太く残す。岩が見つからなければ前へ飛んで自爆する。

// 弾の頭：芯の白と橙の光の玉（カメラへ向く板）
function headMaterial() {
  const U = nodeUniforms({ uSize: 0.1, uAspect: 1, uRot: 0, uOpacity: 1 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const r = length(bb.vC);
    const core = exp(r.mul(r).mul(-22.0)).mul(2.4);
    const halo = pow(max(0.0, r.oneMinus()), 2.5).mul(0.9);
    const a = core.add(halo).mul(U.uOpacity).mul(edgeMask(bb.vC));
    const col = mix(vec3(1.0, 0.42, 0.10), vec3(1.0, 0.95, 0.85), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.4), a.mul(softFade(0.05, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

const LANCE = BALANCE.sub.lance;
const MAX_LIFE = LANCE.life;

export function createLance({ anchors }) {
  const group = new THREE.Group();
  const quad = new THREE.PlaneGeometry(1, 1);
  const missiles = [];
  for (let i = 0; i < 6; i++) {
    const mat = headMaterial();
    const head = new THREE.Mesh(quad, mat);
    head.frustumCulled = false;
    head.renderOrder = 9;
    head.visible = false;
    group.add(head);
    missiles.push({ head, mat, alive: false, pos: [0, 0, 0], vel: [0, 0, 0], age: 0, target: null, acc: 0, delay: 0 });
  }
  const light = new THREE.PointLight(0xff8a3a, 0, 2.2, 2);
  group.add(light);

  let lastVolley = 0;
  let launchGlow = 0;

  function launch(ship, world, R) {
    const used = [];
    const fw = ship.forward;
    for (let i = 0; i < missiles.length; i++) {
      const m = missiles[i];
      const sign = i < 3 ? 1 : -1;
      const k = i % 3;
      const wing = sign > 0 ? anchors.wingR : anchors.wingL;
      const local = [wing.x - sign * (0.12 + 0.07 * k), wing.y + 0.07 + 0.02 * k, wing.z + 0.15];
      const w = ship.toWorld({ x: local[0], y: local[1], z: local[2] });
      m.pos = [w[0], w[1], w[2]];
      const out = rotate(ship.q, [sign * (9 + 5 * k + R() * 3), 5 + 4 * k + R() * 2, 16 + R() * 6]);
      m.vel = [out[0], out[1], out[2]];
      m.age = 0;
      m.delay = k * 0.05 + (sign > 0 ? 0 : 0.025);
      m.acc = 0;
      m.alive = true;
      m.target = world.nearestAhead(fw, used) || world.nearestAhead(fw, []);
      if (m.target) used.push(m.target);
    }
    launchGlow = 1;
  }

  function update(state, ship, world, fx, puffs, dt) {
    if (state.lance.volleys !== lastVolley) {
      lastVolley = state.lance.volleys;
      if (state.lance.volleys > 0) launch(ship, world, puffs.rnd);
    }
    const R = puffs.rnd;
    const P = ship.pos;
    const prevP = [P[0] - ship.forward[0] * ship.speed * dt, P[1] - ship.forward[1] * ship.speed * dt, P[2] - ship.forward[2] * ship.speed * dt];
    void prevP;
    for (const m of missiles) {
      if (!m.alive) { m.head.visible = false; continue; }
      m.age += dt;
      if (m.age < m.delay) { m.head.visible = false; continue; }
      const a = m.age - m.delay;
      // 速さと曲がる力は時間とともに上がる
      const fwd = ship.forward;
      const speed = ship.speed + 30 + (LANCE.speedMax - 30) * Math.min(1, a / 0.7);
      let want;
      if (m.target && m.target.radius > 0.5) {
        const t = m.target.rel;
        want = [t.x - m.pos[0], t.y - m.pos[1], t.z - m.pos[2]];
      } else {
        want = [fwd[0], fwd[1], fwd[2]];
      }
      const wl = Math.hypot(want[0], want[1], want[2]) || 1;
      const vl = Math.hypot(m.vel[0], m.vel[1], m.vel[2]) || 1;
      const turn = 1 - Math.exp(-dt * (1.2 + 9.0 * Math.min(1, a / 0.35)));
      const dir = [
        m.vel[0] / vl + (want[0] / wl - m.vel[0] / vl) * turn,
        m.vel[1] / vl + (want[1] / wl - m.vel[1] / vl) * turn,
        m.vel[2] / vl + (want[2] / wl - m.vel[2] / vl) * turn,
      ];
      const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      m.vel = [dir[0] / dl * speed, dir[1] / dl * speed, dir[2] / dl * speed];

      // 位置は機体からの相対。機体が動いた分を引く
      const step = speed * dt;
      const sx = m.vel[0] * dt - fwd[0] * ship.speed * dt;
      const sy = m.vel[1] * dt - fwd[1] * ship.speed * dt;
      const sz = m.vel[2] * dt - fwd[2] * ship.speed * dt;
      const sl = Math.hypot(sx, sy, sz) || 1;
      const hit = dt > 0 ? world.raycast(m.pos[0], m.pos[1], m.pos[2], sx / sl, sy / sl, sz / sl, sl + 0.2) : null;
      if (hit || a > MAX_LIFE) {
        const point = hit ? hit.point : m.pos.slice();
        const size = hit ? Math.max(2.5, hit.rock.size * 0.55) : 2.5;
        fx.explode(point, size);
        if (hit && world.damage(hit.rock, LANCE.damage, state, P)) fx.explode(point, hit.rock.size);
        m.alive = false;
        m.head.visible = false;
        continue;
      }
      // 尾：進んだ距離ごとに炎と煙を落とす（当たった地点まで間を埋める）
      m.acc += step;
      const spacing = 0.55 + a * 1.3;
      while (m.acc > spacing) {
        m.acc -= spacing;
        const f = R();
        const p = [m.pos[0] + sx * f, m.pos[1] + sy * f, m.pos[2] + sz * f];
        const small = Math.min(1, a / 0.5);
        puffs.puff(p, [(R() - 0.5), (R() - 0.5), (R() - 0.5)], 0.22 + R() * 0.2, 0.12 + 0.2 * small, 0.3 + 0.55 * small, KIND.FIRE, 1.5, 1);
        puffs.puff(p, [(R() - 0.5) * 0.6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6], 0.8 + R() * 0.7, 0.16 + 0.2 * small, 0.6 + 0.9 * small, KIND.SMOKE, 0.5, 1, 0.05);
      }
      m.pos = [m.pos[0] + sx, m.pos[1] + sy, m.pos[2] + sz];
      m.head.visible = true;
      m.head.position.set(m.pos[0], m.pos[1], m.pos[2]);
      m.mat.uniforms.uSize.value = 0.20 + 0.12 * Math.sin(state.time * 50 + m.delay * 40);
    }
    launchGlow = Math.max(0, launchGlow - dt * 7);
    light.intensity = launchGlow * 2.6;
    light.position.set(0, 0.3, -0.2);
  }

  function reset() {
    lastVolley = 0;
    launchGlow = 0;
    for (const m of missiles) { m.alive = false; m.head.visible = false; }
  }

  return { group, update, reset };
}
