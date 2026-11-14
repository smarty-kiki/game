import * as THREE from 'three';
import {
  Fn, uniform, attribute, varying, positionGeometry, cameraPosition, vec2, vec3, vec4, float, abs, max, min, floor, fract, dot, mix,
  length, normalize, cross, select, smoothstep, sin, pow, saturate, time, uv,
} from 'three/tsl';
import { SPACE_U } from './rockShading.js';

// 漂う塵と氷の粒。カメラのまわりの箱で座標を折り返すので、どこまで飛んでも尽きない（頂点の計算だけで動く）。
// 塵：太陽の方を向くと前へ散る光で明るく見える（前方散乱）。氷の粒：回りながら、面が太陽を目へ返した瞬間にきらりと光る。
// 速く飛ぶと、進む向きに少し伸びて速さが分かる。加算で重ね、奥行きは書かない。
export function createMotes({ group, count = 16000, half = 80, iceRatio = 0.35, seed = 3 }) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const base = new Float32Array(count * 4); const info = new Float32Array(count * 4);
  let s = seed * 7919 + 3;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    const ice = rnd() < iceRatio;
    base.set([rnd() * half * 2, rnd() * half * 2, rnd() * half * 2, (ice ? 0.012 : 0.018) + Math.pow(rnd(), 3) * (ice ? 0.05 : 0.07)], i * 4);
    info.set([ice ? 1 : 0, rnd(), 0.6 + rnd() * 3.0, rnd() * 6.2832], i * 4);
  }
  g.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 4));
  g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 4));
  g.instanceCount = count;
  const U = { origin: uniform(new THREE.Vector3()), vel: uniform(new THREE.Vector3()), half: uniform(half), bright: uniform(1.0), shutter: uniform(0.012) };
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  mat.forceSinglePass = true;
  const aB = attribute('aBase', 'vec4'); const aI = attribute('aInfo', 'vec4');
  const H2 = U.half.mul(2.0);
  const p0 = aB.xyz.sub(U.origin).sub(cameraPosition);
  const rel = p0.sub(H2.mul(floor(p0.div(H2).add(0.5))));
  const C = rel.add(cameraPosition);
  const toCam = normalize(rel.negate());
  const vel = U.vel;
  const vt = vel.sub(toCam.mul(dot(vel, toCam)));
  const vlen = length(vt);
  const ax = select(vlen.greaterThan(1e-3), vt.div(max(vlen, 1e-3)), normalize(cross(vec3(0, 1, 0), toCam)));
  const pr = normalize(cross(toCam, ax));
  const size = aB.w;
  const stretch = vlen.mul(U.shutter);
  const along = positionGeometry.x.mul(size.add(stretch));
  mat.positionNode = C.add(ax.mul(along)).add(pr.mul(positionGeometry.y.mul(size)));
  const dist = length(rel);
  const vFade = varying(smoothstep(1.2, 4.0, dist).mul(float(1.0).sub(smoothstep(U.half.mul(0.6), U.half.mul(0.98), dist))), 'vMoFade');
  const vInfo = varying(aI, 'vMoInfo');
  const vView = varying(rel.div(max(dist, 1e-3)), 'vMoView');
  const vStr = varying(size.div(size.add(stretch)), 'vMoStr');
  mat.colorNode = Fn(() => {
    const c = uv().mul(2.0).sub(1.0);
    const r2 = c.x.mul(c.x).add(c.y.mul(c.y));
    const disc = pow(saturate(float(1.0).sub(r2)), 2.0);
    const L = SPACE_U.sunDir;
    // 前方散乱（Henyey-Greenstein の g=0.72）。太陽の方を見ると塵が明るい
    const ct = dot(vView, L);
    const gg = float(0.72);
    const hg = float(1.0).sub(gg.mul(gg)).div(pow(max(float(1.0).add(gg.mul(gg)).sub(gg.mul(2.0).mul(ct)), 1e-3), 1.5)).mul(0.08);
    const sun = SPACE_U.sunColor.mul(SPACE_U.sunPower);
    const ice = vInfo.x;
    const dustC = vec3(0.55, 0.5, 0.45).mul(sun).mul(hg.mul(0.12).add(0.004));
    // 氷の粒：回る面が太陽を返す瞬間だけ強く光る
    const tw = pow(saturate(sin(time.mul(vInfo.z).add(vInfo.w))), 28.0);
    const iceC = vec3(0.7, 0.85, 1.0).mul(sun).mul(hg.mul(0.1).add(0.006).add(tw.mul(0.05)));
    const col = mix(dustC, iceC, ice);
    return col.mul(disc).mul(vFade).mul(U.bright).mul(vStr.mul(0.7).add(0.3));
  })();
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.name = 'spaceMotes';
  group.add(mesh);
  return {
    mesh, U,
    // origin：世界の中での描く座標の原点、vel：カメラの世界の速さ（伸びる向き）
    update(origin, vel) {
      U.origin.value.set(origin[0], origin[1], origin[2]);
      if (vel) U.vel.value.set(vel[0], vel[1], vel[2]);
    },
  };
}

// 小惑星帯の霞：細かい塵の層が太陽の光を前へ散らし、太陽の方がぼんやり明るく、帯の向きに筋が流れる。
// カメラを包む大きな球の内側に、加算で薄く描く（物の手前には描かない：奥行きの試験あり・書き込みなし）。
export function createBeltGlow({ group, radius = 1500 }) {
  const U = { k: uniform(1.0), radius: uniform(radius), tilt: uniform(new THREE.Vector3(0, 1, 0)) };
  const g = new THREE.SphereGeometry(1, 48, 24);
  const mat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  mat.forceSinglePass = true;
  mat.positionNode = cameraPosition.add(positionGeometry.mul(U.radius));
  const vDir = varying(normalize(positionGeometry), 'vBgDir');
  mat.colorNode = Fn(() => {
    const d = normalize(vDir);
    const L = SPACE_U.sunDir;
    const ct = dot(d, L);
    const gg = float(0.78);
    const hg = float(1.0).sub(gg.mul(gg)).div(pow(max(float(1.0).add(gg.mul(gg)).sub(gg.mul(2.0).mul(ct)), 1e-3), 1.5)).mul(0.08);
    // 帯の面（tilt に直交）に近い向きほど塵が濃い。筋は帯の向きに流れる
    const band = float(1.0).sub(abs(dot(d, U.tilt))).pow(3.0);
    const streak = sin(dot(d, normalize(cross(U.tilt, vec3(0.3, 0.1, 1.0)))).mul(40.0).add(sin(d.y.mul(23.0).add(d.x.mul(7.0))).mul(2.0))).mul(0.25).add(0.75);
    const dens = band.mul(0.7).add(0.3).mul(streak);
    const sun = SPACE_U.sunColor.mul(SPACE_U.sunPower);
    return sun.mul(hg.mul(0.012).add(0.0006)).mul(dens).mul(U.k);
  })();
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -5;
  mesh.name = 'spaceBeltGlow';
  group.add(mesh);
  return { mesh, U };
}
