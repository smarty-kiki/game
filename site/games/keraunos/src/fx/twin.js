import * as THREE from 'three';
import {
  Fn, attribute, vec2, vec3, vec4, abs, exp, pow, mix, clamp, smoothstep, length, atan, cos, sin, min, max,
  normalize, cross, select, modelViewMatrix,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, viewVertex, edgeMask, softFade, vnoise, fbm2 } from './soft.js';
import { AIM_ASSIST } from './hud.js';
import { aimAssist } from './aim.js';
import { POWER } from './weaponFeel.js';
import { BALANCE } from '../weaponBalance.js';
import { createGun } from './weaponGun.js';

// ツインレーザー。翼端の砲口から +Z へ、速さで引き伸ばした光弾を交互に撃つ。
// 1発ごとに、砲口の星形の閃光・前へ吹く短い炎・翼を照らす光が出る。

const SPEED = BALANCE.main.twin.speed;
const BOLT_LEN = 16;
const MAX = 120; // Lv3 で1回に6発 × 1.6秒÷0.09秒

// 軸 axisV に直交し、カメラ（視点の原点）を向く横の向き。軸がカメラの方を向いて外積が潰れるときは +X で代える
function sideToward(axisV, atV, limit = 0.05) {
  const c = cross(axisV, normalize(atV.negate()));
  return select(length(c).greaterThan(limit), normalize(c), vec3(1.0, 0.0, 0.0));
}

// 自機の真後ろから見るので、弾の長さは縮んで見える。遠くても細くなりすぎないよう、幅を距離に比例させて画面の上の太さを保つ。
// 光弾：+Z の軸のまわりでカメラへ向く板。芯は白、外は青緑。先端が明るく尾へ消える。
function boltMaterial() {
  const U = nodeUniforms({ uWidth: 0.11 });
  const aT = attribute('aT', 'float'); // 1 が先端、0 が尾
  const aSide = attribute('aSide', 'float');
  const aLen = attribute('aLen', 'float');
  const aAlpha = attribute('aAlpha', 'float');
  const aPow = attribute('aPow', 'float');
  const headV = modelViewMatrix.mul(vec4(attribute('aOrigin', 'vec3'), 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(attribute('aDir', 'vec3'), 0.0)).xyz);
  const sideV = sideToward(axisV, headV.xyz);
  const w = U.uWidth.mul(aPow.mul(0.4).add(1.0)).mul(max(1.0, headV.z.negate().div(10.0))).mul(aT.mul(aT).mul(0.88).add(0.12));
  const p = headV.xyz.sub(axisV.mul(aT.oneMinus().mul(aLen))).add(sideV.mul(aSide).mul(w));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const x = abs(aSide);
    const core = exp(x.mul(x).div(-0.06));
    const glow = exp(x.mul(x).mul(-3.0)).mul(0.5);
    // 先端の丸い明るさと、尾へ向かう消え方
    const head = smoothstep(0.80, 1.0, aT).mul(smoothstep(0.985, 1.0, aT).oneMinus());
    const tail = pow(max(aT, 0.0), 1.2);
    const a = core.mul(head.mul(1.5).add(0.75)).add(glow.mul(head.add(0.30))).mul(tail).mul(aAlpha);
    // 段階が上がると青緑から白に近い青へ
    const outer = mix(vec3(0.10, 1.0, 0.78), vec3(0.28, 0.62, 1.0), aPow.mul(0.5));
    const col = mix(outer, vec3(1.0), clamp(core.mul(head.add(0.65)), 0.0, 1.0));
    return vec4(col.mul(3.2), a.mul(softFade(0.04, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 砲口の閃光：細い光条と芯、横に長い光。発射ごとに回転を変える。
function flashMaterial() {
  const U = nodeUniforms({ uSize: 0.1, uAspect: 1, uRot: 0, uOpacity: 0, uSeed: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const vC = bb.vC;
    const r = length(vC);
    const ang = atan(vC.y, vC.x);
    const rays = pow(abs(cos(ang.mul(3.0).add(U.uSeed))), 6.0).mul(exp(r.mul(-4.2))).mul(0.8);
    const core = exp(r.mul(r).mul(-26.0)).mul(1.6);
    const halo = exp(r.mul(-4.5)).mul(0.35);
    const n = vnoise(vec2(ang.mul(3.0), r.mul(6.0).add(U.uSeed.mul(9.0)))).mul(0.6).add(0.7);
    const a = core.add(rays.mul(n)).add(halo).mul(U.uOpacity);
    const col = mix(vec3(0.25, 1.0, 0.85), vec3(1.0), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.4), a.mul(edgeMask(vC)).mul(softFade(0.03, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

// 前へ吹く短い炎（砲口の先の円錐を、軸のまわりでカメラへ向く板で描く）
function plumeMaterial() {
  const U = nodeUniforms({ uLen: 0.2, uWidth: 0.03, uOpacity: 0, uSeed: 0 });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const o = modelViewMatrix.mul(vec4(0.0, 0.0, 0.0, 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  const sideV = sideToward(axisV, o.xyz);
  const w = U.uWidth.mul(sin(min(1.0, aT.mul(1.3)).mul(Math.PI)).mul(0.65).add(0.35));
  const p = o.xyz.add(axisV.mul(aT).mul(U.uLen)).add(sideV.mul(aSide).mul(w));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const x = abs(aSide);
    const n = fbm2(vec2(aSide.mul(3.0).add(U.uSeed.mul(7.0)), aT.mul(5.0).sub(U.uSeed.mul(3.0))));
    const shape = exp(x.mul(x).mul(-3.0)).mul(aT.oneMinus()).mul(smoothstep(0.0, 0.08, aT));
    const a = shape.mul(n.add(0.4)).mul(U.uOpacity);
    const col = mix(vec3(0.2, 0.95, 1.0), vec3(1.0), exp(x.mul(x).mul(-18.0)).mul(aT.oneMinus()));
    return vec4(col.mul(2.0), a.mul(softFade(0.03, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

function boltGeometry() {
  const quad = new THREE.InstancedBufferGeometry();
  const pos = [];
  const aT = [];
  const aSide = [];
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const s of [-1, 1]) { pos.push(0, 0, 0); aT.push(t); aSide.push(s); }
  }
  const idx = [];
  for (let r = 0; r < rows - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  quad.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  quad.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  quad.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  quad.setIndex(idx);
  quad.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  quad.setAttribute('aDir', new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  quad.setAttribute('aLen', new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
  quad.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
  quad.setAttribute('aPow', new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
  quad.instanceCount = 0;
  return quad;
}

function plumeGeometry() {
  const g = new THREE.BufferGeometry();
  const pos = []; const aT = []; const aSide = []; const idx = [];
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const s of [-1, 1]) { pos.push(0, 0, 0); aT.push(t); aSide.push(s); }
  }
  for (let r = 0; r < rows - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setIndex(idx);
  return g;
}

export function createTwin({ anchors, kind = 'twin', feel = null, puffs = null }) {
  // 機関砲・散弾は別の部品（同じ口：group・boltGroup・update・hud）
  if (kind === 'gun' || kind === 'spread') return createGun({ anchors, kind, feel, puffs });
  // 閃光と光は機体と一緒に動く。弾だけ世界（scene）に置く
  const group = new THREE.Group();
  const boltGroup = new THREE.Group();

  const boltMat = boltMaterial();
  const bolts = new THREE.Mesh(boltGeometry(), boltMat);
  bolts.frustumCulled = false;
  bolts.renderOrder = 7;
  boltGroup.add(bolts);

  const quad = new THREE.PlaneGeometry(1, 1);
  const plumeGeom = plumeGeometry();
  const sides = [];
  for (const [side, anchor] of [[1, anchors.wingR], [-1, anchors.wingL]]) {
    const muzzle = new THREE.Vector3(anchor.x, anchor.y + 0.012, anchor.z + 0.03);
    const flashMat = flashMaterial();
    const flash = new THREE.Mesh(quad, flashMat);
    flash.position.copy(muzzle);
    flash.renderOrder = 9;
    flash.frustumCulled = false;
    group.add(flash);

    const plumeMat = plumeMaterial();
    const plume = new THREE.Mesh(plumeGeom, plumeMat);
    plume.position.copy(muzzle);
    plume.renderOrder = 8;
    plume.frustumCulled = false;
    group.add(plume);

    // 翼と機体を照らす発射の光（数を変えると材質を作り直すので、常に置いて明るさだけ変える）
    const light = new THREE.PointLight(0x5effd8, 0, 0.8, 2);
    light.position.set(muzzle.x * 0.92, muzzle.y + 0.06, muzzle.z - 0.08);
    group.add(light);

    sides.push({ side, muzzle, flash, flashMat, plume, plumeMat, light });
  }

  const aOrigin = bolts.geometry.attributes.aOrigin;
  const aDir = bolts.geometry.attributes.aDir;
  const aLen = bolts.geometry.attributes.aLen;
  const aAlpha = bolts.geometry.attributes.aAlpha;
  const aPow = bolts.geometry.attributes.aPow;

  function update(state, ship, world, fx, dt, level = 1) {
    let n = 0;
    const newest = { 1: 99, '-1': 99 };
    for (const b of state.twinBolts) {
      if (n >= MAX) break;
      const s = b.side === 1 ? sides[0] : sides[1];
      // 初めて見た弾に、撃った時の世界の位置と向きを覚えさせる
      if (!b.from) {
        // 段階が上がると、翼の内側の砲と外へ開く砲が同時に撃つ（この後の繰り返しで同じように処理される）
        if (!b.extra && level > 1) {
          for (const [k, spread] of POWER.extra[level - 1]) state.twinBolts.push({ side: b.side, age: b.age, extra: true, inner: k, spread });
        }
        b.level = level;
        const mz = b.extra ? { x: s.muzzle.x * (b.inner > 1 ? 1 : b.inner), y: s.muzzle.y - (b.inner > 1 ? 0.03 : 0.012), z: s.muzzle.z + 0.04 } : s.muzzle;
        const w = ship.toWorld(mz);
        b.from = [w[0] + ship.pos[0], w[1] + ship.pos[1], w[2] + ship.pos[2]];
        // 照準の近くに敵がいれば、その中心へ少しだけ寄せて撃つ
        const as = aimAssist(world, w[0], w[1], w[2], ship.forward, AIM_ASSIST);
        b.dir = as ? as.dir.slice() : ship.forward.slice();
        if (b.spread) {
          // 外へ少し開く（機体の左右の軸の向きへ足す。+X が右の翼）
          const sideV = ship.toWorld({ x: b.side, y: 0, z: 0 });
          for (let k = 0; k < 3; k++) b.dir[k] += sideV[k] * b.spread;
          const l = Math.hypot(b.dir[0], b.dir[1], b.dir[2]) || 1;
          for (let k = 0; k < 3; k++) b.dir[k] /= l;
        }
        b.speed = SPEED + ship.speed;
      }
      const travel = b.age * b.speed;
      // 前のコマから今までの線分で岩に当たるか見る
      if (dt > 0) {
        const ax = b.from[0] + b.dir[0] * (travel - b.speed * dt) - ship.pos[0];
        const ay = b.from[1] + b.dir[1] * (travel - b.speed * dt) - ship.pos[1];
        const az = b.from[2] + b.dir[2] * (travel - b.speed * dt) - ship.pos[2];
        const hit = world.raycast(ax, ay, az, b.dir[0], b.dir[1], b.dir[2], b.speed * dt + 0.1);
        if (hit) {
          const nr = [hit.point[0] - hit.rock.rel.x, hit.point[1] - hit.rock.rel.y, hit.point[2] - hit.rock.rel.z];
          const m = Math.hypot(nr[0], nr[1], nr[2]) || 1;
          fx.hitSmall(hit.point, [nr[0] / m, nr[1] / m, nr[2] / m], 1);
          if (world.damage(hit.rock, POWER.damage[(b.level || 1) - 1], state, ship.pos)) fx.explode(hit.point, hit.rock.size);
          b.age = 99;
          continue;
        }
      }
      aOrigin.setXYZ(n, b.from[0] + b.dir[0] * travel - ship.pos[0], b.from[1] + b.dir[1] * travel - ship.pos[1], b.from[2] + b.dir[2] * travel - ship.pos[2]);
      aDir.setXYZ(n, b.dir[0], b.dir[1], b.dir[2]);
      // 砲口から出てくる間は短く、出切ったら一定の長さ
      aLen.setX(n, Math.min(BOLT_LEN, 0.02 + travel));
      aAlpha.setX(n, 1 - Math.max(0, (b.age - 1.3) / 0.3));
      aPow.setX(n, (b.level || 1) - 1);
      n += 1;
      if (b.age < newest[b.side]) { newest[b.side] = b.age; }
    }
    bolts.geometry.instanceCount = n;
    aOrigin.needsUpdate = true;
    aDir.needsUpdate = true;
    aLen.needsUpdate = true;
    aAlpha.needsUpdate = true;
    aPow.needsUpdate = true;

    const shot = state.twinShots;
    for (const s of sides) {
      const age = newest[s.side];
      const k = age < 0.07 ? 1 - age / 0.07 : 0;
      const seed = (shot * 2.399 + s.side * 1.3) % 6.283;
      s.flashMat.uniforms.uOpacity.value = k;
      s.flashMat.uniforms.uSize.value = 0.09 + 0.14 * k;
      s.flashMat.uniforms.uSeed.value = seed;
      s.flashMat.uniforms.uRot.value = seed;
      s.flash.visible = k > 0.01;
      s.plumeMat.uniforms.uOpacity.value = k * 0.9;
      s.plumeMat.uniforms.uLen.value = 0.12 + 0.22 * (1 - k);
      s.plumeMat.uniforms.uSeed.value = seed;
      s.plume.visible = k > 0.01;
      s.light.intensity = k * 0.7;
    }
  }

  return { group, boltGroup, update };
}
