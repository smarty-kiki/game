import * as THREE from 'three';
import { Fn, positionGeometry, varying, vec2, vec3, vec4, abs, max, fract, length, exp, mix, clamp, smoothstep } from 'three/tsl';
import { glowNodeMaterial, nodeUniforms } from './soft.js';

// 衝撃爆雷。B で1発。自機を中心に波が広がり、触れた敵の弾を消し、敵へ傷を与える。数に限りがある。
// 弾の消し方：波と同じ大きさの当たりの球を、敵の弾を動かす間だけ world.targets に入れる（enemies.js の
// 弾は onDamage の無い物に当たると火花を出して消える）。自機の武器の当たりには入らない。
export const BOMB = { max: 3, start: 2, T: 0.8, radius: 220, damage: 30, safe: 1.0, cool: 0.9 };

// 六角の格子の線（中心の座標 p から、線の上ほど 1）
const hexLine = /*@__PURE__*/ Fn(([p0]) => {
  const p = p0.mul(vec2(1.0, 1.1547));
  const q = vec2(p.x.add(p.y.mul(0.5)), p.y);
  const f = fract(q).sub(0.5);
  const e = max(abs(f.x), max(abs(f.y), abs(f.x.add(f.y))));
  return smoothstep(0.43, 0.5, e);
}).setLayout({ name: 'hexLine', type: 'float', inputs: [{ name: 'p', type: 'vec2' }] });

// 画面いっぱいの板に、自機の所を中心とした波の輪を描く。板の頂点はそのまま画面の座標（-1..1、上が +）
function ringMaterial(U) {
  const vP = varying(positionGeometry.xy, 'vP');
  const vertexNode = vec4(positionGeometry.xy, 0.0, 1.0);
  const fragmentNode = Fn(() => {
    const d = vP.sub(U.uC).mul(vec2(U.uAspect, 1.0));
    const r = length(d);
    const w = U.uR.mul(0.022).add(0.012);
    // 負の数の pow は WGSL で NaN になるので、2乗は掛け算で書く
    const tf = r.sub(U.uR).div(w);
    const front = exp(tf.mul(tf).negate());
    const tb = r.sub(U.uR.mul(0.72)).div(w.mul(2.6));
    const back = exp(tb.mul(tb).negate()).mul(0.10);
    const band = smoothstep(U.uR.mul(0.45), U.uR, r).mul(smoothstep(U.uR, U.uR.add(w.mul(0.6)), r).oneMinus());
    const cells = hexLine(d.mul(15.0)).mul(band).mul(0.28);
    const fill = smoothstep(0.0, U.uR, r).oneMinus().mul(0.015);
    const a = front.mul(0.9).add(back).add(cells).add(fill).mul(U.uA);
    const col = mix(vec3(0.20, 0.62, 1.0), vec3(0.95, 1.0, 1.0), clamp(front, 0.0, 1.0));
    return vec4(col, a);
  })();
  return glowNodeMaterial(U, { vertexNode, fragmentNode }, { depthTest: false, side: THREE.FrontSide });
}

export function createBomb({ scene, start = BOMB.start }) {
  const mat = ringMaterial(nodeUniforms({ uC: new THREE.Vector2(), uAspect: 1, uR: 0, uA: 0 }));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 30;
  mesh.visible = false;
  scene.add(mesh);

  const s = { count: start, t: -1, safe: 0, cool: 0, prev: false, fired: 0, cleared: 0, hit: new Set(), lastTry: -9 };
  // 敵の弾を消す球（自機が原点）
  const sweep = { rel: new THREE.Vector3(0, 0, 0), radius: 0, size: 1, aim: false, bombSweep: true };
  const _p = new THREE.Vector3();

  function update(state, ship, world, fx, puffs, camera, dt, inp, blocked, onBurst) {
    s.safe = Math.max(0, s.safe - dt);
    s.cool = Math.max(0, s.cool - dt);
    if (inp.bomb && !s.prev && !blocked) {
      if (s.count > 0 && s.t < 0 && s.cool <= 0) {
        s.count -= 1;
        s.fired += 1;
        s.t = 0;
        s.safe = BOMB.safe;
        s.cool = BOMB.cool;
        s.hit.clear();
        onBurst();
        // 中心の閃光と外へ散る火花
        const R = puffs.rnd;
        for (let i = 0; i < 70; i++) {
          const x = R() - 0.5; const y = R() - 0.5; const z = R() - 0.5;
          const l = Math.hypot(x, y, z) || 1;
          const sp = 60 + R() * 120;
          puffs.spark([x / l * 2, y / l * 2, z / l * 2], [x / l * sp + ship.forward[0] * ship.speed, y / l * sp + ship.forward[1] * ship.speed, z / l * sp + ship.forward[2] * ship.speed], 0.5 + R() * 0.5, 0.08, 0.02, 1, 1.2, 1);
        }
      } else if (s.count <= 0) {
        s.lastTry = state.time;
      }
    }
    s.prev = !!inp.bomb;
    if (s.t < 0) { mesh.visible = false; sweep.radius = 0; return; }
    s.t += dt;
    const u = Math.min(1, s.t / BOMB.T);
    const e = 1 - Math.pow(1 - u, 2.4);
    const R = BOMB.radius * e;
    sweep.radius = R;
    // 波が届いた敵へ1回だけ傷を与える
    for (const t of world.targets) {
      if (t === sweep || !t.onDamage || !(t.radius > 0.5) || s.hit.has(t)) continue;
      const d = t.rel.length();
      if (d - t.radius <= R) {
        s.hit.add(t);
        const point = t.rel.toArray();
        fx.hitSmall(point, [-t.rel.x / (d || 1), -t.rel.y / (d || 1), -t.rel.z / (d || 1)], 1);
        world.damage(t, BOMB.damage, state, ship.pos);
      }
    }
    // 画面の上の輪は、自機の所を中心に画面の外まで広がる
    _p.set(0, 0.2, 0).project(camera);
    mat.uniforms.uC.value.set(_p.x, _p.y);
    mat.uniforms.uAspect.value = camera.aspect;
    mat.uniforms.uR.value = 0.02 + 2.5 * e;
    mat.uniforms.uA.value = (1 - u) * (1 - u) * 1.15 + 0.0;
    mesh.visible = true;
    if (u >= 1) { s.t = -1; sweep.radius = 0; mesh.visible = false; }
  }

  return {
    update, sweep,
    get count() { return s.count; },
    get active() { return s.t >= 0; },
    get invuln() { return s.safe > 0; },
    get fired() { return s.fired; },
    get screenRing() { return s.t >= 0 ? { x: mat.uniforms.uC.value.x * 0.5 + 0.5, y: mat.uniforms.uC.value.y * 0.5 + 0.5, r: mat.uniforms.uR.value * 0.5, k: mat.uniforms.uA.value } : null; },
    get emptyAge() { return s.lastTry; },
    add(n = 1) { s.count = Math.min(BOMB.max, s.count + n); },
    reset(n = start) { s.count = n; s.t = -1; s.safe = 0; s.cool = 0; s.prev = false; s.hit.clear(); sweep.radius = 0; mesh.visible = false; },
  };
}
