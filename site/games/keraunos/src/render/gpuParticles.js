// GPU の計算で回す爆発の粒（火花・破片・煙）。CPU は「どこで・どれだけ」だけを渡し、位置・速さ・寿命は GPU が持つ。
// 火花：白から橙へ冷えながら飛ぶ加算の粒。破片：太陽を受けて暗く光る小片（たまに縁がきらめく）。煙：太陽の側が明るく、
// 裏が暗い柔らかい塊で、ゆっくり膨らんで薄れる。どれも1種類1回の描画。
//
//   const bursts = createBursts(renderer, scene, camera, U);      // U は look.js の uniform の表（sunDir・sunTint）
//   bursts.burst([x, y, z], { scale: 1, dir: [0, 0, 1] });         // 爆発（scale で量と速さ）
//   毎コマ bursts.update(dt, flowVec3)                              // flow：世界が流れる速さ（機体が止まって世界が動く作りなら、進む向きの逆×速さ）
import * as THREE from 'three';
import { Fn, If, float, vec2, vec3, vec4, uint, uniform, instancedArray, instanceIndex, hash, normalize, exp, max, min, mix,
  select, smoothstep, length, dot, uv, pow, positionView, viewportSize, screenDPR, cameraViewMatrix } from 'three/tsl';

function system(renderer, scene, U, count, kind) {
  const pos = instancedArray(count, 'vec3');
  const vel = instancedArray(count, 'vec3');
  const life = instancedArray(count, 'vec2'); // x: 経った時間、y: 寿命（0 なら空き）
  const E = {
    center: uniform(new THREE.Vector3()), dir: uniform(new THREE.Vector3(0, 0, 1)), bias: uniform(0),
    start: uniform(0, 'uint'), n: uniform(0, 'uint'), seed: uniform(0, 'uint'),
    speed: uniform(10), span: uniform(1), radius: uniform(0.5),
  };
  const S = { dt: uniform(0), flow: uniform(new THREE.Vector3()), drag: uniform(kind === 'smoke' ? 1.8 : kind === 'sparks' ? 1.1 : 0.35) };

  // 新しい粒を入れる：輪の start から n 個
  const emit = Fn(() => {
    const i = instanceIndex;
    const rel = i.add(uint(count)).sub(E.start).mod(uint(count));
    If(rel.lessThan(E.n), () => {
      const s = i.add(E.seed);
      const r = vec3(hash(s), hash(s.add(uint(7919))), hash(s.add(uint(104729))));
      const d = normalize(r.mul(2.0).sub(1.0).add(E.dir.mul(E.bias)));
      const sp = E.speed.mul(hash(s.add(uint(31337))).mul(0.85).add(0.15));
      pos.element(i).assign(E.center.add(d.mul(E.radius).mul(hash(s.add(uint(271))))));
      vel.element(i).assign(d.mul(sp));
      life.element(i).assign(vec2(0.0, E.span.mul(hash(s.add(uint(1009))).mul(0.6).add(0.6))));
    });
  })().compute(count);

  // 進める：空気の抵抗で遅くなり、世界の流れに乗る
  const step = Fn(() => {
    const i = instanceIndex;
    const L = life.element(i);
    If(L.y.greaterThan(0.0), () => {
      const v = vel.element(i).mul(exp(S.drag.negate().mul(S.dt)));
      vel.element(i).assign(v);
      pos.element(i).assign(pos.element(i).add(v.add(S.flow).mul(S.dt)));
      const a = L.x.add(S.dt);
      life.element(i).assign(vec2(a, select(a.greaterThan(L.y), float(0.0), L.y)));
    });
  })().compute(count);

  const L = life.element(instanceIndex);
  const alive = L.y.greaterThan(0.0);
  const t = min(L.x.div(max(L.y, 1e-3)), 1.0); // 0..1 の年齢
  const dist = max(positionView.z.negate(), 0.5);
  const round = float(1.0).sub(smoothstep(0.2, 0.5, length(uv().sub(0.5))));
  const sunV = normalize(cameraViewMatrix.mul(vec4(U.sunDir, 0.0)).xyz);

  let mat;
  if (kind === 'sparks') {
    mat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false });
    mat.sizeNode = select(alive, max(viewportSize.y.mul(0.0035).mul(float(1.0).sub(t.mul(0.7))).mul(float(12.0).div(dist)), 1.0), float(0.0)).div(screenDPR);
    // 白から黄・橙・赤へ冷える
    mat.colorNode = Fn(() => {
      const hot = mix(vec3(6.0, 4.6, 2.6), vec3(3.2, 0.9, 0.18), smoothstep(0.0, 0.45, t));
      const c = mix(hot, vec3(0.6, 0.08, 0.02), smoothstep(0.45, 1.0, t));
      return vec4(c.mul(round).mul(float(1.0).sub(smoothstep(0.7, 1.0, t))), 1.0);
    })();
  } else if (kind === 'smoke') {
    mat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, sizeAttenuation: false, fog: false });
    mat.sizeNode = select(alive, viewportSize.y.mul(0.03).mul(t.mul(1.6).add(0.4)).mul(float(10.0).div(dist)), float(0.0)).div(screenDPR);
    mat.colorNode = Fn(() => {
      // 粒を球とみなした法線で、太陽の側を明るく、裏を暗く。太陽に向かって見る煙は縁が光る（前へ散る光）
      const p = uv().sub(0.5).mul(2.0);
      const n = normalize(vec3(p.x, p.y.negate(), max(float(1.0).sub(dot(p, p)), 0.0).sqrt()));
      const lam = dot(n, sunV).mul(0.5).add(0.5);
      const fwd = pow(max(dot(normalize(positionView.xyz), sunV), 0.0), 6.0);
      const c = mix(vec3(0.02, 0.018, 0.016), U.sunTint.mul(0.22), lam).add(U.sunTint.mul(fwd.mul(0.25)));
      // 生まれた直後は火の色が残る
      const fire = vec3(2.2, 0.7, 0.15).mul(float(1.0).sub(smoothstep(0.0, 0.18, t)));
      return vec4(c.add(fire), 1.0);
    })();
    mat.opacityNode = round.mul(round).mul(float(1.0).sub(smoothstep(0.35, 1.0, t))).mul(0.55);
  } else {
    mat = new THREE.PointsNodeMaterial({ transparent: false, depthWrite: true, sizeAttenuation: false, fog: false });
    mat.sizeNode = select(alive, max(viewportSize.y.mul(0.0028).mul(float(14.0).div(dist)), 1.0), float(0.0)).div(screenDPR);
    mat.colorNode = Fn(() => {
      // 小片ごとに向きの違う面が太陽を受け、たまに縁がきらめく
      const s = hash(instanceIndex);
      const n = normalize(vec3(hash(instanceIndex.add(uint(3))).sub(0.5), hash(instanceIndex.add(uint(5))).sub(0.5), 0.6));
      const spin = L.x.mul(s.mul(9.0).add(3.0));
      const lam = max(dot(n, sunV).mul(spin.sin().mul(0.5).add(0.5)), 0.0);
      const glint = pow(lam, 24.0).mul(4.0);
      const c = vec3(0.05, 0.045, 0.04).add(U.sunTint.mul(lam.mul(0.35).add(glint)));
      // 生まれた直後は赤熱
      return vec4(c.add(vec3(2.0, 0.5, 0.1).mul(float(1.0).sub(smoothstep(0.0, 0.25, t)))), 1.0);
    })();
    mat.alphaTestNode = float(0.5);
    mat.opacityNode = round.mul(2.0);
  }
  mat.positionNode = pos.element(instanceIndex);
  const mesh = new THREE.Sprite(mat);
  mesh.count = count;
  mesh.frustumCulled = false;
  mesh.renderOrder = kind === 'smoke' ? 6 : 4;
  scene.add(mesh);

  let head = 0;
  let seed = 1;
  const queue = [];
  return {
    mesh,
    add(center, { n, speed, span, radius, dir = [0, 0, 1], bias = 0 }) {
      queue.push({ center, n: Math.min(n, count), speed, span, radius, dir, bias });
    },
    update(dt, flow) {
      for (const q of queue) {
        E.center.value.set(...q.center); E.dir.value.set(...q.dir); E.bias.value = q.bias;
        E.start.value = head; E.n.value = q.n; E.seed.value = (seed = (seed * 1664525 + 1013904223) >>> 0) & 0xffffff;
        E.speed.value = q.speed; E.span.value = q.span; E.radius.value = q.radius;
        renderer.compute(emit);
        head = (head + q.n) % count;
      }
      queue.length = 0;
      S.dt.value = dt; S.flow.value.copy(flow);
      renderer.compute(step);
    },
    dispose() { scene.remove(mesh); mat.dispose(); },
  };
}

export function createBursts(renderer, scene, camera, U, { sparks = 12000, smoke = 3000, debris = 3000 } = {}) {
  const S = system(renderer, scene, U, sparks, 'sparks');
  const M = system(renderer, scene, U, smoke, 'smoke');
  const D = system(renderer, scene, U, debris, 'debris');
  const _flow = new THREE.Vector3();
  return {
    // 爆発：scale は大きさ（1 で雑魚1機ほど）。dir と bias で飛ぶ向きを偏らせる（撃たれた面の外へ）
    burst(center, { scale = 1, dir = [0, 0, 1], bias = 0 } = {}) {
      const k = Math.max(0.2, scale);
      S.add(center, { n: Math.round(260 * k), speed: 38 * Math.sqrt(k), span: 0.9, radius: 0.4 * k, dir, bias });
      M.add(center, { n: Math.round(36 * k), speed: 7 * Math.sqrt(k), span: 2.6, radius: 1.2 * k, dir, bias: bias * 0.5 });
      D.add(center, { n: Math.round(70 * k), speed: 22 * Math.sqrt(k), span: 2.2, radius: 0.5 * k, dir, bias });
    },
    // 当たり：火花だけを少し
    hit(center, { dir = [0, 0, -1], scale = 1 } = {}) {
      S.add(center, { n: Math.round(40 * scale), speed: 26, span: 0.45, radius: 0.1, dir, bias: 1.4 });
    },
    update(dt, flow = _flow) { S.update(dt, flow); M.update(dt, flow); D.update(dt, flow); },
    meshes: [S.mesh, M.mesh, D.mesh],
    dispose() { S.dispose(); M.dispose(); D.dispose(); },
  };
}
