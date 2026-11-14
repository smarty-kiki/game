import * as THREE from 'three';
import {
  Fn, attribute, float, vec2, vec3, vec4, abs, exp, pow, mix, clamp, smoothstep, step, length, atan, cos, sin, floor, fract,
  max, normalize, cross, modelViewMatrix, positionGeometry, positionView,
} from 'three/tsl';
import {
  glowNodeMaterial, nodeUniforms, billboard, viewVertex, edgeMask, softFade, smoothstepR, hash12, vnoise, fbm2, stripGeometry,
} from './soft.js';
import { KIND } from './puffs.js';
import { rotate } from '../flightState.js';
import { createRail } from './weaponRail.js';
import { BALANCE } from '../weaponBalance.js';

// 主砲。溜めている間は機首の前に光の球が育ち、稲妻と縮む輪が集まる。
// 放すと太い光線を撃つ。光線は芯・紫の外側・前へ流れる筋・進む輪・らせんの層からなり、機体を強く照らす。

const CANNON = BALANCE.heavy.cannon;
const BEAM_LEN = CANNON.len;
const BEAM_DPS = CANNON.beamDps; // 最大まで溜めた時の毎秒の威力
const BEAM_STOP = CANNON.stop; // これより大きい物では光線が止まる

// GLSL の mod と同じ（負の数でも 0..y に収める）。WGSL の % は負で答えが違うため
const fmod = (x, y) => x.sub(floor(x.div(y)).mul(y));
// exp(-(x)^2)。pow(負, 2) は WGSL で NaN になるので掛け算で2乗する
const gauss = (x) => exp(x.mul(x).negate());

// 溜めの球：芯・渦・外から集まる稲妻・縮む輪を1枚の板で描く
function orbMaterial() {
  const U = nodeUniforms({ uSize: 0.3, uAspect: 1, uRot: 0, uLevel: 0, uTime: 0, uOpacity: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const vC = bb.vC;
    const r = length(vC);
    const ang = atan(vC.y, vC.x);
    const R = U.uLevel.mul(0.20).add(0.10); // 球の見かけの半径（板の中の割合）
    const core = gauss(r.div(R.mul(0.55))).mul(2.2);
    // 渦：角度と半径で流れる雑音
    const swirl = fbm2(vec2(ang.mul(2.0).add(U.uTime.mul(3.0)).sub(r.mul(9.0)), r.mul(7.0).sub(U.uTime.mul(2.0))));
    const shell = gauss(r.sub(R).div(U.uLevel.mul(0.06).add(0.05))).mul(swirl.add(0.5));
    // 外から中心へ走るギザギザの稲妻：数本を短い間隔で別の場所に出し直す（5本を並べて書く）
    let arcs = float(0.0);
    for (let i = 0; i < 5; i++) {
      const flip = floor(U.uTime.mul(15.0).add(i * 0.37));
      const a0 = hash12(vec2(i * 3.7, flip)).mul(6.2832);
      const jag = vnoise(vec2(r.mul(9.0), flip.add(i * 5.0))).sub(0.5).mul(1.1)
        .add(vnoise(vec2(r.mul(27.0), flip.add(i * 9.0))).sub(0.5).mul(0.35));
      const da = fmod(ang.sub(a0).add(jag.mul(r.sub(R))).add(3.14159), 6.28318).sub(3.14159);
      const dist = abs(da).mul(r);
      const reach = R.add(hash12(vec2(flip, i)).mul(0.45).add(0.45).mul(R.oneMinus()));
      const fall = smoothstepR(reach, R, r).mul(step(R.mul(0.9), r));
      arcs = arcs.add(gauss(dist.div(0.0045)).mul(fall).mul(step(0.35, hash12(vec2(flip, i + 2.0)))));
      arcs = arcs.add(gauss(dist.div(0.02)).mul(0.22).mul(fall));
    }
    arcs = arcs.mul(U.uLevel.mul(0.65).add(0.35));
    // 縮みながら中心へ寄る輪
    const ringR = fract(U.uTime.mul(-1.6));
    const ringR2 = fract(U.uTime.mul(-1.6).add(0.5));
    const rings = gauss(r.sub(mix(R, 0.82, ringR)).div(0.006)).mul(sin(ringR.mul(Math.PI))).mul(ringR.oneMinus())
      .add(gauss(r.sub(mix(R, 0.82, ringR2)).div(0.006)).mul(sin(ringR2.mul(Math.PI))).mul(ringR2.oneMinus()));
    const halo = exp(r.mul(-5.0)).mul(0.45);
    const a = core.add(shell.mul(0.8)).add(arcs.mul(1.2)).add(rings.mul(0.10).mul(U.uLevel)).add(halo).mul(U.uOpacity);
    const col0 = mix(vec3(0.42, 0.30, 1.0), vec3(0.85, 0.92, 1.0), clamp(core.mul(0.6).add(arcs.mul(0.5)), 0.0, 1.0));
    const col = mix(col0, vec3(1.0), step(0.999, U.uLevel).mul(0.35).mul(clamp(core, 0.0, 1.0)));
    return vec4(col.mul(2.3), a.mul(edgeMask(vC)).mul(softFade(0.05, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

// 光線の層：砲口から +Z へ伸び、軸のまわりでカメラへ向く板。根元は細く出て、遠くでも幅に下限を持つ
function rayMaterial(R, px, inner, outer, gain, sharp) {
  const U = nodeUniforms({
    uLen: BEAM_LEN, uR: R, uPx: px, uGrow: 0, uTime: 0, uGain: gain, uSharp: sharp,
    uIn: new THREE.Color(...inner), uOut: new THREE.Color(...outer),
  });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const z = U.uLen.mul(pow(aT, 2.2));
  const vp = modelViewMatrix.mul(vec4(0.0, 0.0, z, 1.0));
  const dir = normalize(modelViewMatrix.mul(vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  const side = normalize(cross(dir, vp.xyz));
  const w = max(U.uR.mul(mix(0.2, 1.0, smoothstep(0.0, 45.0, z))), U.uPx.mul(vp.z.negate())).mul(U.uGrow);
  const vv = viewVertex(vec4(vp.xyz.add(side.mul(w).mul(aSide)), 1.0));
  const vZ = z.toVarying('vZ'); // 軸に沿った距離は線形に補間する（aT から画素ごとに計算し直すと形が変わる）
  const fragmentNode = Fn(() => {
    const vS = aSide;
    const a = exp(vS.mul(vS).mul(U.uSharp).negate());
    const e = smoothstep(0.8, 1.0, abs(vS)).oneMinus();
    // 前へ流れる明暗。光線が止まって見えないように
    const flow = sin(vZ.mul(0.33).sub(U.uTime.mul(62.0))).mul(0.09).add(0.86)
      .add(sin(vZ.mul(0.11).sub(U.uTime.mul(37.0)).add(vS.mul(2.0))).mul(0.05));
    const ends = smoothstep(0.0, 1.2, vZ).mul(smoothstep(0.0, 2.0, U.uLen.sub(vZ)));
    const c = mix(U.uOut, U.uIn, a.mul(a));
    return vec4(c.mul(a).mul(e).mul(flow).mul(ends).mul(U.uGain), 1.0);
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 撃った瞬間の衝撃の輪：砲口から一気に広がって消える。芯より外へ広がる白い線と、その外の淡い光
function burstMaterial() {
  const U = nodeUniforms({ uOpacity: 0 });
  const fragmentNode = Fn(() => {
    const vC = positionGeometry.xy.mul(2.0);
    const r = length(vC);
    const line = gauss(r.sub(0.8).div(0.03)).add(gauss(r.sub(0.8).div(0.12)).mul(0.3));
    const a = line.mul(U.uOpacity).mul(edgeMask(vC));
    return vec4(vec3(0.92, 0.86, 1.0).mul(2.8), a.mul(softFade(0.05, positionView.z.negate())));
  })();
  return glowNodeMaterial(U, { fragmentNode });
}

// 光線に沿って進む輪（板はそのまま。向きは物の回転で決まる）
function ringMaterial() {
  const U = nodeUniforms({ uOpacity: 0 });
  const fragmentNode = Fn(() => {
    const vC = positionGeometry.xy.mul(2.0);
    const r = length(vC);
    const line = gauss(r.sub(0.80).div(0.018)).add(gauss(r.sub(0.74).div(0.05)).mul(0.12));
    const a = line.mul(U.uOpacity).mul(edgeMask(vC));
    return vec4(vec3(0.70, 0.66, 1.0).mul(2.0), a.mul(softFade(0.05, positionView.z.negate())));
  })();
  return glowNodeMaterial(U, { fragmentNode });
}

// 砲口の閃光：横に長い光と光条
function muzzleMaterial() {
  const U = nodeUniforms({ uSize: 0.3, uAspect: 1.0, uRot: 0, uOpacity: 0, uTime: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const vC = bb.vC;
    const r = length(vC);
    const ang = atan(vC.y, vC.x);
    const core = exp(r.mul(r).mul(-14.0)).mul(1.8);
    const streak = exp(abs(vC.y).mul(-16.0)).mul(exp(abs(vC.x).mul(-2.4))).mul(0.5);
    const rays = pow(abs(cos(ang.mul(4.0).add(U.uTime.mul(0.8)))), 6.0).mul(exp(r.mul(-3.4))).mul(0.55);
    const halo = exp(r.mul(-4.5)).mul(0.28);
    const a = core.add(streak).add(rays.mul(0.8)).add(halo).mul(U.uOpacity);
    const col = mix(vec3(0.55, 0.45, 1.0), vec3(1.0), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.2), a.mul(edgeMask(vC)).mul(softFade(0.05, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

// らせん：光線のまわりを回りながら前へ進む細い帯
function helixMaterial(phase) {
  const U = nodeUniforms({ uTime: 0, uPhase: phase, uRadius: 0.20, uLen: 30, uGrow: 0, uOpacity: 0 });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const d = aT.mul(U.uLen);
  const ang = d.mul(2.6).sub(U.uTime.mul(14.0)).add(U.uPhase);
  const rad = U.uRadius.mul(U.uGrow).mul(smoothstep(0.0, 0.8, d).mul(0.6).add(0.4));
  const pv = modelViewMatrix.mul(vec4(cos(ang).mul(rad), sin(ang).mul(rad), d, 1.0));
  const tang = normalize(modelViewMatrix.mul(vec4(sin(ang).negate().mul(rad).mul(2.6), cos(ang).mul(rad).mul(2.6), 1.0, 0.0)).xyz);
  const sideV = normalize(cross(tang, normalize(pv.xyz.negate())));
  const vv = viewVertex(vec4(pv.xyz.add(sideV.mul(aSide).mul(0.011)), 1.0));
  const fragmentNode = Fn(() => {
    const prof = exp(aSide.mul(aSide).mul(-3.0));
    const a = prof.mul(aT.oneMinus()).mul(smoothstep(0.04, 0.22, aT)).mul(U.uOpacity);
    return vec4(vec3(0.75, 0.72, 1.0).mul(2.4), a.mul(softFade(0.04, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

export function createBeam({ anchors, kind = 'cannon', scene = null, feel = null }) {
  // レールガンは別の部品（同じ口：group・update・recoil・flash・hitPoint・reset、加えて hud・addAmmo）
  if (kind === 'rail') return createRail({ anchors, scene, feel });
  const group = new THREE.Group();
  const nose = anchors.nose;
  const muzzlePos = new THREE.Vector3(nose.x, nose.y + 0.01, nose.z + 0.10);
  const quad = new THREE.PlaneGeometry(1, 1);

  // 溜めの球
  const orbMat = orbMaterial();
  const orb = new THREE.Mesh(quad, orbMat);
  orb.position.set(muzzlePos.x, muzzlePos.y + 0.03, muzzlePos.z + 0.32);
  orb.renderOrder = 10;
  orb.frustumCulled = false;
  group.add(orb);

  // 光線の本体：砲口から敵まで届く、まっすぐで芯の白い光。遠くでも細くなりきらないよう、幅に下限を持つ
  const RAY_N = 48;
  const rayPos = new Float32Array((RAY_N + 1) * 6);
  const rayT = new Float32Array((RAY_N + 1) * 2);
  const raySide = new Float32Array((RAY_N + 1) * 2);
  const rayIdx = [];
  for (let i = 0; i <= RAY_N; i++) {
    rayT[i * 2] = rayT[i * 2 + 1] = i / RAY_N;
    raySide[i * 2] = -1; raySide[i * 2 + 1] = 1;
    if (i < RAY_N) { const k = i * 2; rayIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const rayGeo = new THREE.BufferGeometry();
  rayGeo.setAttribute('position', new THREE.BufferAttribute(rayPos, 3));
  rayGeo.setAttribute('aT', new THREE.BufferAttribute(rayT, 1));
  rayGeo.setAttribute('aSide', new THREE.BufferAttribute(raySide, 1));
  rayGeo.setIndex(rayIdx);
  const makeRay = (R, px, inner, outer, gain, sharp, order) => {
    const mat = rayMaterial(R, px, inner, outer, gain, sharp);
    const mesh = new THREE.Mesh(rayGeo, mat);
    mesh.position.copy(muzzlePos);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, u: mat.uniforms, base: gain };
  };
  const rays = [
    makeRay(2.5, 0.011, [0.5, 0.22, 1.0], [0.24, 0.04, 0.9], 1.1, 3.0, 10),
    // 芯は純白にせず淡い紫（発光の処理で白く飛んで、紫の光線に見えなくなるため）。明るさも抑え、外の紫が読めるようにする
    makeRay(0.85, 0.0038, [0.78, 0.6, 1.0], [0.56, 0.3, 1.0], 1.6, 2.4, 11),
  ];
  // 当たった所の光：光線の先で燃える大きな光
  const hitCv = document.createElement('canvas'); hitCv.width = hitCv.height = 256;
  const hitG = hitCv.getContext('2d');
  const hitGr = hitG.createRadialGradient(128, 128, 0, 128, 128, 128);
  hitGr.addColorStop(0, 'rgba(255,255,255,1)'); hitGr.addColorStop(0.12, 'rgba(235,225,255,0.9)'); hitGr.addColorStop(0.32, 'rgba(150,110,255,0.32)'); hitGr.addColorStop(1, 'rgba(60,20,200,0)');
  hitG.fillStyle = hitGr; hitG.fillRect(0, 0, 256, 256);
  const hitGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hitCv), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false }));
  hitGlow.renderOrder = 12; hitGlow.visible = false;
  group.add(hitGlow);
  let chunkT = 0;

  // らせん2本
  const helixGeom = stripGeometry(160);
  const helices = [0, Math.PI].map((phase) => {
    const mat = helixMaterial(phase);
    const mesh = new THREE.Mesh(helixGeom, mat);
    mesh.position.copy(muzzlePos);
    mesh.renderOrder = 11;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, mat };
  });

  // 進む輪
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const mat = ringMaterial();
    const mesh = new THREE.Mesh(quad, mat);
    mesh.renderOrder = 12;
    mesh.frustumCulled = false;
    mesh.visible = false;
    group.add(mesh);
    rings.push({ mesh, mat });
  }

  // 砲口の閃光
  const muzzleMat = muzzleMaterial();
  const muzzle = new THREE.Mesh(quad, muzzleMat);
  muzzle.position.copy(muzzlePos);
  muzzle.renderOrder = 13;
  muzzle.frustumCulled = false;
  group.add(muzzle);

  // 撃った瞬間の衝撃の輪（砲口から広がって消える）
  const burstMat = burstMaterial();
  const burst = new THREE.Mesh(quad, burstMat);
  burst.position.copy(muzzlePos);
  burst.renderOrder = 13;
  burst.frustumCulled = false;
  burst.visible = false;
  group.add(burst);

  // 機体を照らす光（溜めは弱く、発射で強く）
  // 光線の先を照らす光（周りの岩を染める）
  const farLight = new THREE.PointLight(0x9d7cff, 0, 90, 1.6);
  group.add(farLight);
  let hitPoint = null;
  let emitSpark = 0;
  let emitCollar = 0;
  const light = new THREE.PointLight(0x9d8cff, 0, 3.0, 2);
  light.position.set(muzzlePos.x, muzzlePos.y + 0.08, muzzlePos.z + 0.05);
  group.add(light);

  let fade = 0;
  let fireAge = 0;
  let sinceFire = 99; // 撃ってからの秒（撃つ前は十分に長く、閃光を出さない）
  let wasFiring = false;
  let chargeShown = 0;
  let emitIn = 0; // 溜めの粒の出し残し
  let hitWas = false;
  let hitPop = 0; // 当たった瞬間の膨らみ（すぐ消える）
  let fullWas = false; // 溜めきった瞬間の一度きりの光の粒

  function update(state, dt, ship, world, fx, puffs) {
    const c = state.charge;
    const firing = c.firing;
    const t = state.time;
    const started = firing && !wasFiring;
    const ended = !firing && wasFiring;
    if (started) { fireAge = 0; sinceFire = 0; } else sinceFire += dt;
    wasFiring = firing;
    if (firing) fireAge += dt;
    // 撃った瞬間に立つ閃光の強さ（撃ったあと 0.4 秒ほどで消える）。溜めの fade の立ち上がりは待たない
    const kick = sinceFire < 3 ? Math.exp(-sinceFire * 9) : 0;

    // 溜め：押している間だけ育つ。撃った瞬間に光線へ吸い込まれて消える
    const chargeTarget = !firing && c.level > 0 ? c.level : 0;
    chargeShown += (chargeTarget - chargeShown) * Math.min(1, dt * (chargeTarget > chargeShown ? 30 : 14));
    orb.visible = chargeShown > 0.01;
    if (!firing && c.level <= 0) fullWas = false;
    if (!firing && puffs && dt > 0 && chargeShown > 0.05) {
      const R = puffs.rnd;
      const fw = ship.forward;
      const orbX = muzzlePos.x; const orbY = muzzlePos.y + 0.03; const orbZ = muzzlePos.z + 0.32;
      emitIn += dt * (40 + 140 * chargeShown);
      while (emitIn >= 1) {
        emitIn -= 1;
        const a = R() * Math.PI * 2;
        const rad = 0.5 + R() * 0.5;
        const from = { x: orbX + Math.cos(a) * rad, y: orbY + Math.sin(a) * rad, z: orbZ + (R() - 0.5) * 0.5 };
        const p = ship.toWorld(from);
        const q = ship.toWorld({ x: orbX, y: orbY, z: orbZ });
        const life = 0.2 + R() * 0.08;
        // 機体と一緒に進む分を足して、砲口の前へ向かわせる
        const v = [(q[0] - p[0]) / life + fw[0] * ship.speed, (q[1] - p[1]) / life + fw[1] * ship.speed, (q[2] - p[2]) / life + fw[2] * ship.speed];
        puffs.spark(p, v, life, 0.012 + R() * 0.008, 0.0002, 1, 0, 1);
      }
      if (c.level >= 0.999 && !fullWas) {
        fullWas = true;
        for (let k = 0; k < 14; k++) {
          const a = R() * Math.PI * 2;
          const from = ship.toWorld({ x: orbX + Math.cos(a) * 0.3, y: orbY + Math.sin(a) * 0.3, z: orbZ });
          const out = ship.toWorld({ x: Math.cos(a) * 1.0, y: Math.sin(a) * 1.0, z: 0 });
          puffs.spark(from, [fw[0] * ship.speed + out[0] * 18, fw[1] * ship.speed + out[1] * 18, fw[2] * ship.speed + out[2] * 18], 0.28 + R() * 0.12, 0.014 + R() * 0.01, 0.0002, 1, 1, 1);
        }
      }
    }
    if (orb.visible) {
      const full = c.level >= 0.999 ? 1 : 0;
      orbMat.uniforms.uLevel.value = chargeShown;
      orbMat.uniforms.uTime.value = t;
      orbMat.uniforms.uOpacity.value = Math.min(1, chargeShown * 3) * (0.85 + 0.15 * Math.sin(t * (30 + 30 * full)));
      orbMat.uniforms.uSize.value = 0.14 + 0.2 * chargeShown;
    }

    const target = firing ? 1 : 0;
    fade += Math.sign(target - fade) * Math.min(Math.abs(target - fade), dt * (firing ? 30 : 9));
    const on = fade > 0.002;
    // 撃ち終わりは、光線が細くなりながら砲口の前へ光の粒を散らす
    if (ended && puffs && ship && dt > 0) {
      const R = puffs.rnd;
      const fw = ship.forward;
      for (let k = 0; k < 12; k++) {
        const a = R() * Math.PI * 2;
        const from = ship.toWorld({ x: muzzlePos.x + Math.cos(a) * 0.3, y: muzzlePos.y + Math.sin(a) * 0.3, z: muzzlePos.z + 0.4 + R() * 1.5 });
        const out = ship.toWorld({ x: Math.cos(a), y: Math.sin(a), z: 0 });
        const sp = ship.speed + 30 + R() * 50;
        puffs.spark(from, [fw[0] * sp + out[0] * 22, fw[1] * sp + out[1] * 22, fw[2] * sp + out[2] * 22], 0.22 + R() * 0.2, 0.014 + R() * 0.01, 0.0002, 1, 1, 1);
      }
    }
    for (const r of rays) r.mesh.visible = on;
    for (const h of helices) h.mesh.visible = false;
    // 光線の先が岩に当たるならそこで止める
    let reach = BEAM_LEN;
    hitPoint = null;
    if (firing && ship && world) {
      const fw = ship.forward;
      const o = ship.toWorld(muzzlePos);
      // 溜めた分だけ威力が上がり、小さな物は貫いて奥まで届く。大きな物（BEAM_STOP 以上）で止まる
      const dps = BEAM_DPS * (0.55 + 0.45 * Math.min(1, c.level));
      let from = [o[0], o[1], o[2]];
      let left = BEAM_LEN;
      let first = true;
      for (let n = 0; n < 8 && left > 0; n++) {
        const hit = world.raycast(from[0], from[1], from[2], fw[0], fw[1], fw[2], left);
        if (!hit) break;
        const rock = hit.rock;
        const size = rock.radius;
        const nr = [hit.point[0] - rock.rel.x, hit.point[1] - rock.rel.y, hit.point[2] - rock.rel.z];
        const m = Math.hypot(nr[0], nr[1], nr[2]) || 1;
        const nn = [nr[0] / m, nr[1] / m, nr[2] / m];
        // noImpact の物（大蛇の光線とのぶつかり合いの点）では、当たりの火花・爆発・光を出さない（見た目は相手側が描く）
        if (!rock.noImpact) fx.hitBeam(hit.point, nn, first ? dt : dt * 0.4);
        if (world.damage(rock, dt * dps, state, ship.pos)) fx.explode(hit.point, rock.size);
        first = false;
        const dist = BEAM_LEN - left + hit.dist;
        if (size >= BEAM_STOP) { reach = dist + 0.2; hitPoint = rock.noImpact ? null : hit.point; break; }
        const skip = hit.dist + size * 2 + 0.5;
        from = [from[0] + fw[0] * skip, from[1] + fw[1] * skip, from[2] + fw[2] * skip];
        left -= skip;
      }
      if (hitPoint) {
        chunkT -= dt;
        if (chunkT <= 0) { chunkT = 0.2; fx.explode(hitPoint, 1.6); }
      }
    }
    if (hitPoint && !hitWas && fx) { fx.explode(hitPoint, 2.2); hitPop = 1; }
    hitWas = !!hitPoint;
    hitPop = Math.max(0, hitPop - dt * 5);
    for (const r of rays) r.u.uLen.value = reach;
    hitGlow.visible = !!hitPoint && fade > 0.05;
    if (hitGlow.visible) {
      hitGlow.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z + reach);
      hitGlow.scale.setScalar((5 + reach * 0.03) * (0.9 + 0.12 * Math.sin(t * 47)) * (1 + 0.9 * hitPop));
      hitGlow.material.opacity = 0.7 + 0.3 * hitPop;
    }

    // 発射の始まりは一瞬太く、それから少し細って保つ
    const grow = fade * (1.0 + 0.6 * kick);
    const pulse = 0.93 + 0.07 * Math.sin(t * 57) + 0.05 * Math.sin(t * 131);
    for (const r of rays) {
      r.u.uTime.value = t;
      r.u.uGrow.value = grow * pulse;
      r.u.uGain.value = r.base * (1 + 1.2 * kick);
    }
    // 撃った瞬間の衝撃の輪
    burst.visible = sinceFire < 0.32;
    if (burst.visible) {
      const bt = Math.min(1, sinceFire / 0.32);
      burst.scale.setScalar((0.2 + 1.6 * (1 - Math.pow(1 - bt, 3))) / 0.8);
      burstMat.uniforms.uOpacity.value = (1 - bt) * (1 - bt) * 0.9;
    }

    // 光線に沿って前へ飛ぶ細かな光と、砲口から後ろへ吹く空気の襟
    if (firing && puffs && dt > 0) {
      const R = puffs.rnd;
      const fw = ship.forward;
      emitSpark += dt * 220;
      while (emitSpark >= 1) {
        emitSpark -= 1;
        const a = R() * Math.PI * 2;
        const rad = 0.25 + R() * 0.55;
        const p = ship.toWorld({ x: muzzlePos.x + Math.cos(a) * rad, y: muzzlePos.y + Math.sin(a) * rad, z: muzzlePos.z + R() * 2.5 });
        const sp = ship.speed + 70 + R() * 90;
        const out = rotate(ship.q, [Math.cos(a) * 2.5, Math.sin(a) * 2.5, 0]);
        puffs.spark(p, [fw[0] * sp + out[0], fw[1] * sp + out[1], fw[2] * sp + out[2]], 0.2 + R() * 0.25, 0.016 + R() * 0.01, 0.0002, 1, 0, 1);
      }
    }

    for (const h of helices) {
      h.mat.uniforms.uTime.value = t;
      h.mat.uniforms.uGrow.value = grow;
      h.mat.uniforms.uOpacity.value = fade * 0.22;
    }

    // 輪：一定の間隔で砲口から出て、広がりながら前へ進む
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const phase = (fireAge * 2.2 + i / rings.length) % 1;
      r.mesh.visible = false;
      const z = 0.2 + phase * 7.0;
      r.mesh.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z + 0.15 + z);
      r.mesh.scale.setScalar((0.22 + 1.1 * phase) * grow);
      r.mat.uniforms.uOpacity.value = fade * Math.sin(Math.PI * phase) * (1 - phase) * 0.16;
    }

    const flash = Math.max(kick, 0.0) * fade;
    muzzle.visible = on || orb.visible || kick > 0.02;
    muzzleMat.uniforms.uTime.value = t;
    muzzleMat.uniforms.uOpacity.value = Math.max(fade * (0.22 + 0.38 * flash) + kick * 0.3, chargeShown * 0.12);
    muzzleMat.uniforms.uSize.value = 0.28 + 0.34 * flash + 0.12 * kick + 0.05 * Math.sin(t * 43);
    muzzleMat.uniforms.uAspect.value = 1.3;

    // 撃った瞬間は光を強く、すぐ戻す（点灯のまま光の数は変えない。強さだけ変える）
    light.intensity = chargeShown * 0.6 * (0.8 + 0.2 * Math.sin(t * 40)) + fade * (1.6 + 2.6 * flash) * pulse + kick * 0.8;
    farLight.position.set(muzzlePos.x, muzzlePos.y, muzzlePos.z + Math.min(reach - 1, 24));
    farLight.intensity = fade * (180 + 500 * flash) * pulse + kick * 60;
  }

  return {
    group,
    update,
    get recoil() { return fade; },
    get visible() { return fade > 0.002; },
    get flash() { return Math.exp(-fireAge * 9.0) * fade; },
    get hitPoint() { return hitPoint; },
    get muzzle() { return muzzlePos; },
    reset() { fade = 0; fireAge = 0; sinceFire = 99; wasFiring = false; chargeShown = 0; emitIn = 0; hitWas = false; hitPop = 0; fullWas = false; burst.visible = false; },
  };
}
