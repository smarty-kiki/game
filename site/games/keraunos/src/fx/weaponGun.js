import * as THREE from 'three';
import {
  Fn, attribute, vec3, vec4, abs, exp, pow, mix, clamp, smoothstep, step, length, max, normalize, cross, select,
  modelViewMatrix, cameraProjectionMatrix, positionGeometry,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms, billboard, viewVertex, edgeMask, softFade, softUniforms } from './soft.js';
import { BALANCE, spreadFalloff } from '../weaponBalance.js';

// 主武装の実弾：機関砲（gun）と散弾（spread）。撃つ間隔は vfxState の stepShip が数え（state.twinInterval）、
// ここでは撃った1回ごとに自分の弾を作り、飛ばし、当て、描く。ツインの光弾とは別の、細く黄白い曳光弾。
//   機関砲：左右の砲口から同時に1発ずつ。速く、射程は短い。強化で連射が上がる
//   散弾  ：左右の砲口から扇に粒弾を撒く。近いほど多く当たり、遠いほど威力が落ちる。1回ごとに待ちがある
const GUN = BALANCE.main.gun;
const SPREAD = BALANCE.main.spread;

const MAX = 96;

// 曳光弾：+Z の軸のまわりでカメラへ向く細い板。芯は白、外は黄。遠くでも細くなりすぎないよう、幅を距離に比例させる
function tracerMaterial(spread) {
  const U = nodeUniforms({
    uWidth: spread ? 0.05 : 0.055,
    uEdge: spread ? new THREE.Color(1.0, 0.55, 0.18) : new THREE.Color(1.0, 0.78, 0.30),
    uGain: spread ? 2.6 : 2.8,
  });
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const aAlpha = attribute('aAlpha', 'float');
  const headV = modelViewMatrix.mul(vec4(attribute('aOrigin', 'vec3'), 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(attribute('aDir', 'vec3'), 0.0)).xyz);
  const c = cross(axisV, normalize(headV.xyz.negate()));
  const sideV = select(length(c).greaterThan(0.05), normalize(c), vec3(1.0, 0.0, 0.0));
  const w = U.uWidth.mul(max(1.0, headV.z.negate().div(12.0))).mul(aT.mul(aT).mul(0.88).add(0.12));
  const p = headV.xyz.sub(axisV.mul(aT.oneMinus().mul(attribute('aLen', 'float')))).add(sideV.mul(aSide).mul(w));
  const vv = viewVertex(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const x = abs(aSide);
    const core = exp(x.mul(x).div(-0.16));
    const glow = exp(x.mul(x).mul(-2.5)).mul(0.45);
    const head = smoothstep(0.85, 1.0, aT);
    const a = core.mul(head.mul(1.2).add(0.7)).add(glow).mul(pow(max(aT, 0.0), 0.8)).mul(aAlpha);
    const col = mix(U.uEdge, vec3(1.0, 0.98, 0.9), clamp(core.mul(head.add(0.5)), 0.0, 1.0));
    return vec4(col.mul(U.uGain), a.mul(softFade(0.04, vv.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: vv.vertexNode, fragmentNode });
}

// 砲口の閃光：短い十字の光と芯（黄白）
function flashMaterial() {
  const U = nodeUniforms({ uSize: 0.1, uAspect: 1, uRot: 0, uOpacity: 0 });
  const bb = billboard(U);
  const fragmentNode = Fn(() => {
    const vC = bb.vC;
    const r = length(vC);
    const core = exp(r.mul(r).mul(-30.0)).mul(1.8);
    const cross1 = exp(abs(vC.y).mul(-22.0)).mul(exp(abs(vC.x).mul(-3.0))).mul(0.8);
    const cross2 = exp(abs(vC.x).mul(-22.0)).mul(exp(abs(vC.y).mul(-4.5))).mul(0.45);
    const halo = exp(r.mul(-5.0)).mul(0.3);
    const a = core.add(cross1).add(cross2).add(halo).mul(U.uOpacity);
    const col = mix(vec3(1.0, 0.72, 0.28), vec3(1.0, 0.97, 0.88), clamp(core, 0.0, 1.0));
    return vec4(col.mul(2.4), a.mul(edgeMask(vC)).mul(softFade(0.03, bb.viewDist)));
  })();
  return glowNodeMaterial(U, { vertexNode: bb.vertexNode, fragmentNode });
}

// 散弾の粒：後ろから見ると線が縮むので、丸い光の点で見せる。遠くても小さな点で残る。
// WebGPU の点は常に1画素なので、粒ごとに画面へ向く四角を1つずつ（インスタンスで）描き、大きさは画素で決める
function pelletMaterial() {
  const U = nodeUniforms({ uScale: 300 });
  const aOn = attribute('aOn', 'float');
  const v = modelViewMatrix.mul(vec4(attribute('aPos', 'vec3'), 1.0));
  const clip = cameraProjectionMatrix.mul(v);
  // 今の点の大きさ（画素）と同じ式。消えた粒は大きさ 0 で描かない
  const px = clamp(U.uScale.div(max(0.5, v.z.negate())), 3.0, 15.0).mul(step(0.001, aOn));
  const off = positionGeometry.xy.mul(px).mul(2.0).div(softUniforms.uRes).mul(clip.w);
  const vertexNode = vec4(clip.xy.add(off), clip.z, clip.w);
  const fragmentNode = Fn(() => {
    const r = length(positionGeometry.xy.mul(2.0));
    const core = exp(r.mul(r).mul(-14.0)).mul(1.8);
    const halo = pow(max(0.0, r.oneMinus()), 2.2).mul(0.7);
    const col = mix(vec3(1.0, 0.55, 0.16), vec3(1.0, 0.95, 0.8), clamp(core, 0.0, 1.0)).mul(1.9);
    return vec4(col, core.add(halo).mul(aOn));
  })();
  return glowNodeMaterial(U, { vertexNode, fragmentNode });
}

function pelletGeometry() {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.setIndex(base.index);
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('aPos', new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aOn', new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount = 0;
  return g;
}

function tracerGeometry() {
  const g = new THREE.InstancedBufferGeometry();
  const pos = []; const aT = []; const aSide = []; const idx = [];
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const s of [-1, 1]) { pos.push(0, 0, 0); aT.push(t); aSide.push(s); }
  }
  for (let r = 0; r < rows - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setIndex(idx);
  for (const [name, n] of [['aOrigin', 3], ['aDir', 3], ['aLen', 1], ['aAlpha', 1]]) {
    g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n).setUsage(THREE.DynamicDrawUsage));
  }
  g.instanceCount = 0;
  return g;
}

export function createGun({ anchors, kind = 'gun', feel = null, puffs: sparks = null }) {
  const spread = kind === 'spread';
  const group = new THREE.Group();
  const boltGroup = new THREE.Group();
  const mat = tracerMaterial(spread);
  const mesh = new THREE.Mesh(tracerGeometry(), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 7;
  boltGroup.add(mesh);
  const at = mesh.geometry.attributes;
  let pelletGeo = null;
  let pelletMat = null;
  if (spread) {
    pelletGeo = pelletGeometry();
    pelletMat = pelletMaterial();
    const pts = new THREE.Mesh(pelletGeo, pelletMat);
    pts.frustumCulled = false;
    pts.renderOrder = 8;
    boltGroup.add(pts);
  }

  const quad = new THREE.PlaneGeometry(1, 1);
  const sides = [];
  for (const [side, anchor] of [[1, anchors.wingR], [-1, anchors.wingL]]) {
    const muzzle = new THREE.Vector3(anchor.x, anchor.y + 0.012, anchor.z + 0.03);
    const flashMat = flashMaterial();
    const flash = new THREE.Mesh(quad, flashMat);
    flash.position.copy(muzzle);
    flash.renderOrder = 9;
    flash.frustumCulled = false;
    flash.visible = false;
    group.add(flash);
    // ツインと同じく光は常に置き、明るさだけ変える（数を変えると材質を作り直すため）
    const light = new THREE.PointLight(0xffc56a, 0, 0.9, 2);
    light.position.set(muzzle.x * 0.92, muzzle.y + 0.06, muzzle.z - 0.08);
    group.add(light);
    sides.push({ side, muzzle, flash, flashMat, light, age: 9 });
  }

  const rounds = [];
  const bigHits = new Map();
  let seed = 9127;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let lastShot = -9;

  function spawn(ship, world, s, level, state) {
    const P = ship.pos;
    const w = ship.toWorld(s.muzzle);
    const from = [w[0] + P[0], w[1] + P[1], w[2] + P[2]];
    // 機関砲・散弾には狙いの補正がない（ツインとの違い）
    const fw = ship.forward;
    const right = ship.toWorld({ x: 1, y: 0, z: 0 });
    const up = ship.toWorld({ x: 0, y: 1, z: 0 });
    const n = spread ? SPREAD.pellets[level - 1] : 1; // 散弾は片側の数（左右で倍）
    for (let i = 0; i < n; i++) {
      let ox; let oy;
      if (spread) {
        // 円の中に均等に散らす（中心が濃すぎないよう、半径は平方根で）。外側の砲口ほど外へ寄せる
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * SPREAD.cone;
        ox = Math.cos(a) * r + s.side * 0.025; oy = Math.sin(a) * r * 0.75;
      } else {
        ox = (rnd() - 0.5) * GUN.jitter; oy = (rnd() - 0.5) * GUN.jitter;
      }
      const d = [fw[0] + right[0] * ox + up[0] * oy, fw[1] + right[1] * ox + up[1] * oy, fw[2] + right[2] * ox + up[2] * oy];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      const speed = (spread ? SPREAD.speed : GUN.speed) * (spread ? 0.9 + rnd() * 0.2 : 1) + ship.speed;
      // 散弾は砲口から扇に開く短い火の筋も出す
      if (spread && sparks) sparks.spark(w, [d[0] / l * 90 + ship.forward[0] * ship.speed, d[1] / l * 90 + ship.forward[1] * ship.speed, d[2] / l * 90 + ship.forward[2] * ship.speed], 0.14 + rnd() * 0.1, 0.03, 0.012, 0, 0, 1);
      rounds.push({ far: from.slice(), dir: [d[0] / l, d[1] / l, d[2] / l], speed, travel: 0, range: (spread ? SPREAD.range : GUN.range) * (spread ? 0.85 + rnd() * 0.3 : 1), volley: state.twinShots, damage: (spread ? SPREAD.damage : GUN.damage)[level - 1] });
    }
    s.age = 0;
  }

  function update(state, ship, world, fx, dt, level = 1) {
    const lv = Math.max(1, Math.min(3, level));
    state.twinInterval = spread ? SPREAD.interval : GUN.interval[lv - 1];
    if (lastShot > state.time) lastShot = -9; // 最初からやり直した後
    // stepShip が積んだ発射の知らせを、自分の弾に置き換える
    for (const b of state.twinBolts) {
      if (b.from) continue;
      b.from = true;
      b.age = 99;
      spawn(ship, world, b.side === 1 ? sides[0] : sides[1], lv, state);
      if (b.side === 1) { lastShot = state.time; if (spread && feel) feel.fire('spreadShot', 1 + 0.15 * (lv - 1)); }
    }

    const P = ship.pos;
    let n = 0;
    for (let i = rounds.length - 1; i >= 0; i--) {
      const r = rounds[i];
      const step = r.speed * dt;
      if (dt > 0) {
        const rx = r.far[0] - P[0]; const ry = r.far[1] - P[1]; const rz = r.far[2] - P[2];
        const hit = world.raycast(rx, ry, rz, r.dir[0], r.dir[1], r.dir[2], step + 0.1);
        if (hit) {
          const rock = hit.rock;
          const nr = [hit.point[0] - rock.rel.x, hit.point[1] - rock.rel.y, hit.point[2] - rock.rel.z];
          const m = Math.hypot(nr[0], nr[1], nr[2]) || 1;
          const nn = [nr[0] / m, nr[1] / m, nr[2] / m];
          // 大きな着弾の効果は間引く（粒ごと・弾ごとに出すと煙で前が見えなくなり、粒の予算も尽きる）
          const key = spread ? r.volley : Math.floor(state.time / 0.12);
          const used = bigHits.get(key) || 0;
          if (used < (spread ? 3 : 1)) fx.hitSmall(hit.point, nn, 0);
          else if (sparks) for (let k = 0; k < 4; k++) sparks.spark(hit.point, [(nn[0] + rnd() - 0.5) * 30, (nn[1] + rnd() - 0.5) * 30, (nn[2] + rnd() - 0.5) * 30], 0.18 + rnd() * 0.2, 0.05, 0.02, 0, 3, 1);
          bigHits.set(key, used + 1);
          // 散弾は近いほど重い（near より先は距離で落ちる）
          const dmg = spread ? r.damage * spreadFalloff(r.travel + hit.dist) : r.damage;
          if (world.damage(rock, dmg, state, P)) fx.explode(hit.point, rock.size);
          rounds.splice(i, 1);
          continue;
        }
        r.far[0] += r.dir[0] * step; r.far[1] += r.dir[1] * step; r.far[2] += r.dir[2] * step;
        r.travel += step;
      }
      if (r.travel >= r.range) { rounds.splice(i, 1); continue; }
      if (n >= MAX) continue;
      at.aOrigin.setXYZ(n, r.far[0] - P[0], r.far[1] - P[1], r.far[2] - P[2]);
      at.aDir.setXYZ(n, r.dir[0], r.dir[1], r.dir[2]);
      at.aLen.setX(n, Math.min(spread ? SPREAD.len : GUN.len, 0.05 + r.travel));
      // 射程の終わりの2割で消える
      const fadeA = Math.min(1, (r.range - r.travel) / (r.range * 0.2));
      at.aAlpha.setX(n, fadeA);
      if (pelletGeo) {
        pelletGeo.attributes.aPos.setXYZ(n, r.far[0] - P[0], r.far[1] - P[1], r.far[2] - P[2]);
        pelletGeo.attributes.aOn.setX(n, fadeA);
      }
      n += 1;
    }
    if (bigHits.size > 8) bigHits.clear();
    mesh.geometry.instanceCount = n;
    if (pelletGeo) {
      pelletGeo.instanceCount = n;
      pelletGeo.attributes.aPos.needsUpdate = true;
      pelletGeo.attributes.aOn.needsUpdate = true;
      pelletMat.uniforms.uScale.value = window.innerHeight * 0.9;
    }
    for (const name of ['aOrigin', 'aDir', 'aLen', 'aAlpha']) at[name].needsUpdate = true;

    for (const s of sides) {
      s.age += dt;
      const life = spread ? 0.09 : 0.045;
      const k = s.age < life ? 1 - s.age / life : 0;
      s.flash.visible = k > 0.01;
      s.flashMat.uniforms.uOpacity.value = k;
      s.flashMat.uniforms.uSize.value = (spread ? 0.16 : 0.08) + (spread ? 0.22 : 0.08) * k;
      s.flashMat.uniforms.uRot.value = (state.twinShots * 0.7 + s.side) % 6.283;
      s.light.intensity = k * (spread ? 1.1 : 0.6);
    }
  }

  return {
    group, boltGroup, update,
    get rounds() { return rounds.length; },
    // 画面の下の武装の列：[右の数字, 線の長さ, 使えるか, 区切りの数]。散弾は次の1回までの待ちを線で見せる
    hud(state, level = 1) {
      if (!spread) return [`Lv.${level}`, level / 3, true, 3];
      const k = Math.min(1, (state.time - lastShot) / SPREAD.interval);
      return [`Lv.${level}`, k, k >= 1, 3];
    },
    reset() { rounds.length = 0; lastShot = -9; bigHits.clear(); },
  };
}
