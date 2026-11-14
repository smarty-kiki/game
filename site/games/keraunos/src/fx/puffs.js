import * as THREE from 'three';
import {
  Fn, If, attribute, varying, select, positionGeometry, cameraViewMatrix,
  vec2, vec3, vec4, float, exp, pow, max, mix, clamp, smoothstep, length, normalize, dot, floor, abs, sin, cos, atan,
} from 'three/tsl';
import { softUniforms, nodeUniforms, viewVertex, softFade, smoothstepR } from './soft.js';

// 煙・炎・蒸気・噴射・閃光を、1つの粒の束で描く。位置は発生の情報からシェーダが計算するので、数千粒でも軽い。
// 粒の絵は雑音から作った16種類の塊で、年を取るほど薄い所から欠けていく（板に見えない）。
// 位置の基準は2つ。near は機体のそばの効果用で、機体が実際よりゆっくり進む座標。far は世界の本当の座標。

export const KIND = { SMOKE: 0, FIRE: 1, VAPOR: 2, EXHAUST: 3, FLASH: 4, SOOT: 5, SHOCK: 6, MUZZLE: 7, SCORCH: 8, TRAIL: 9 };

function makeAtlas() {
  const TILE = 128;
  const N = 4;
  const size = TILE * N;
  const data = new Uint8Array(size * size * 4);
  const hash = (x, y, s) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const noise = (x, y, s) => {
    const xi = Math.floor(x); const yi = Math.floor(y);
    let fx = x - xi; let fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi, s); const b = hash(xi + 1, yi, s);
    const c = hash(xi, yi + 1, s); const d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (x, y, s) => {
    let v = 0; let a = 0.5;
    for (let o = 0; o < 5; o++) { v += a * noise(x, y, s + o * 3.1); x = x * 2.03 + 7.1; y = y * 2.03 + 3.3; a *= 0.5; }
    return v;
  };
  const dens = new Float32Array(TILE * TILE);
  for (let ty = 0; ty < N; ty++) {
    for (let tx = 0; tx < N; tx++) {
      const s = tx * 5.3 + ty * 11.7 + 1.0;
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const u = (x + 0.5) / TILE * 2 - 1;
          const v = (y + 0.5) / TILE * 2 - 1;
          const r = Math.hypot(u, v);
          const n = fbm(u * 2.2 + 10, v * 2.2 + 10, s);
          // 中心が濃く縁で必ず 0 になる塊。雑音で縁を崩す
          const m = Math.max(0, 1 - r * (1.0 + (0.62 - n) * 1.1));
          dens[y * TILE + x] = Math.min(1, Math.pow(m, 0.9) * (0.45 + 1.0 * n) * 1.5) * (r < 0.98 ? 1 : 0);
        }
      }
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const d = dens[y * TILE + x];
          const dx = dens[y * TILE + Math.min(TILE - 1, x + 1)] - dens[y * TILE + Math.max(0, x - 1)];
          const dy = dens[Math.min(TILE - 1, y + 1) * TILE + x] - dens[Math.max(0, y - 1) * TILE + x];
          const i = ((ty * TILE + y) * size + tx * TILE + x) * 4;
          data[i] = d * 255;
          data[i + 1] = Math.max(0, Math.min(255, 127.5 - dx * 900));
          data[i + 2] = Math.max(0, Math.min(255, 127.5 - dy * 900));
          data[i + 3] = 255;
        }
      }
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// 粒の位置：発生の情報（位置・速さ・生まれた時刻・減速）から今の位置を出す。減速 d は速さが exp(-d t) で落ちる
// p は基準（near / far）を引いた位置。e は今の速さの割合
function particleCore(U) {
  // 位置と速度は4つ組で持つ（3つ組だと WebGPU が更新のたびに全件を4つ組へ詰め直す新しい配列を作るため。spec REQ-013）
  const aPos = attribute('aPos', 'vec4').xyz;
  const aVel = attribute('aVel', 'vec4').xyz;
  const aLife = attribute('aLife', 'vec4');
  const aMisc = attribute('aMisc', 'vec4');
  const t = U.uNow.sub(aLife.x);
  const age = t.div(aLife.y);
  const d = aMisc.z;
  const e = exp(d.negate().mul(t));
  const travel = select(d.greaterThan(0.001), float(1.0).sub(e).div(max(d, 0.001)), t);
  const origin = select(aMisc.w.greaterThan(0.5), U.uOriginFar, U.uOriginNear);
  const p = aPos.add(aVel.mul(travel)).sub(origin);
  // 生まれる前か寿命が尽きた粒は画面の外へ飛ばす
  const dead = age.lessThan(0.0).or(age.greaterThanEqual(1.0));
  return { aVel, aLife, aMisc, t, age, e, p, dead };
}

function puffNodes(U) {
  const P = particleCore(U);
  const { aLife, aMisc, t, age, p, dead } = P;
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const vAge = varying(age, 'vAge');
  const vKind = varying(aMisc.x, 'vKind');
  const vSeed = varying(aMisc.y, 'vSeed');
  const mv0 = cameraViewMatrix.mul(vec4(p, 1.0));
  const dist = mv0.z.negate();
  const vCam = varying(smoothstep(0.5, 2.2, dist), 'vCam');
  const grow = float(1.0).sub(pow(max(float(1.0).sub(age), 0.0), 2.2));
  const s = mix(aLife.z, aLife.w, grow);
  // カメラが煙の中へ入ると画面が一面灰色になるので、粒の大きさに応じて手前で薄くする
  const vCamS = varying(smoothstep(s.mul(0.35), s.mul(1.5).add(0.6), dist), 'vCamS');
  const a = aMisc.y.mul(6.2832).add(t.mul(aMisc.y.sub(0.5)).mul(0.9));
  const c = cos(a);
  const sn = sin(a);
  const q = positionGeometry.xy.mul(2.0).mul(s);
  const mv = vec4(mv0.xy.add(vec2(c.mul(q.x).sub(sn.mul(q.y)), sn.mul(q.x).add(c.mul(q.y)))), mv0.z, mv0.w);
  const vv = viewVertex(mv);
  const vertexNode = select(dead, vec4(2.0, 2.0, 2.0, 1.0), vv.vertexNode);

  const fragmentNode = Fn(() => {
    const tile = floor(vSeed.mul(16.0));
    const tuv = vC.mul(0.5).add(0.5);
    const uv = vec2(tile.sub(floor(tile.div(4.0)).mul(4.0)), floor(tile.div(4.0))).add(tuv.mul(0.98)).add(0.01).mul(0.25);
    // 分岐の前で読む（WGSL は分岐の中で画像を読めない）
    const tx = U.uAtlas.sample(uv).toVar();
    const dens = tx.r;
    const N = normalize(vec3(tx.gb.sub(0.5).mul(2.0), 0.55));
    const lit = clamp(dot(N, U.uSunV).mul(0.65).add(0.42), 0.0, 1.0);
    const life = max(float(1.0).sub(vAge), 0.0);
    const fadeIn = smoothstep(0.0, 0.05, vAge);
    const col = vec3(0.0).toVar();
    const emis = vec3(0.0).toVar();
    const al = float(0.0).toVar();
    const outA = float(1.0).toVar();
    If(vKind.lessThan(0.5), () => { // 煙
      const thr = mix(0.06, 0.60, vAge);
      al.assign(smoothstep(thr, thr.add(0.28), dens).mul(fadeIn).mul(pow(life, 0.8)).mul(0.55).mul(vCamS));
      // 煤けた暗い煙。日の当たる側だけ少し明るく、出たばかりは内側が火で赤く照らされる
      col.assign(mix(vec3(0.012, 0.011, 0.010), vec3(0.075, 0.07, 0.066), lit));
      emis.assign(vec3(1.0, 0.32, 0.08).mul(pow(max(0.0, float(1.0).sub(vAge.mul(3.5))), 3.0)).mul(smoothstep(0.45, 0.9, dens)).mul(1.6).mul(al));
    }).ElseIf(vKind.lessThan(1.5), () => { // 炎（熱い芯から、冷えると煙になる）
      const thr = mix(0.02, 0.5, vAge.mul(vAge));
      al.assign(smoothstep(thr, thr.add(0.22), dens).mul(fadeIn).mul(pow(life, 0.5)).mul(vCamS));
      const heat = clamp(dens.sub(thr).mul(2.4).mul(float(1.15).sub(vAge.mul(1.25))), 0.0, 1.0);
      // 白くしない：芯でも山吹色まで。外は橙から暗い赤、冷えた所は煤に変わり、割れ目だけ内側の火で光る
      const hot0 = mix(vec3(0.42, 0.04, 0.006), vec3(1.0, 0.34, 0.045), smoothstep(0.0, 0.55, heat));
      const hot = mix(hot0, vec3(1.0, 0.56, 0.15), smoothstep(0.72, 1.0, heat));
      emis.assign(hot.mul(pow(heat, 1.5)).mul(2.1).mul(al));
      col.assign(vec3(0.016, 0.013, 0.012).mul(lit.add(0.2)));
    }).ElseIf(vKind.lessThan(2.5), () => { // 音速の蒸気
      const thr = mix(0.04, 0.58, vAge);
      al.assign(pow(dens, 1.4).mul(smoothstep(thr.mul(0.4), thr.mul(0.4).add(0.5), dens)).mul(fadeIn).mul(pow(life, 1.2)).mul(0.34).mul(vCam));
      col.assign(vec3(0.78, 0.84, 0.98).mul(lit.mul(0.9).add(0.22)));
    }).ElseIf(vKind.lessThan(3.5), () => { // 噴射の光
      al.assign(smoothstep(0.02, 0.6, dens).mul(pow(life, 1.4)));
      emis.assign(mix(vec3(0.55, 0.92, 1.0), vec3(0.03, 0.22, 1.0), smoothstep(0.0, 0.7, vAge)).mul(al).mul(1.5));
      outA.assign(0.0);
    }).ElseIf(vKind.lessThan(4.5), () => { // 閃光
      const r = length(vC);
      const k = pow(max(0.0, r.oneMinus()), 2.4).mul(pow(life, 2.0));
      emis.assign(mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.86, 0.66), pow(max(0.0, float(1.0).sub(r.mul(1.6))), 2.0)).mul(k).mul(4.2));
      al.assign(k);
      outA.assign(0.0);
    }).ElseIf(vKind.lessThan(5.5), () => { // 爆発の煤：ほとんど黒い塊。出たばかりの濃い所だけ、内側の火に照らされる
      const thr = mix(0.03, 0.55, vAge);
      al.assign(smoothstep(thr, thr.add(0.3), dens).mul(smoothstep(0.0, 0.03, vAge)).mul(pow(life, 1.1)).mul(0.92).mul(vCamS));
      col.assign(mix(vec3(0.005, 0.0045, 0.004), vec3(0.055, 0.05, 0.046), lit.mul(lit)));
      const inner = smoothstep(0.35, 0.85, dens).mul(pow(max(0.0, float(1.0).sub(vAge.mul(2.6))), 2.0));
      emis.assign(mix(vec3(0.5, 0.06, 0.008), vec3(1.0, 0.36, 0.06), inner).mul(inner).mul(1.7).mul(al));
    }).ElseIf(vKind.lessThan(6.5), () => { // 衝撃の輪：球の殻。縁が濃く、内側は透ける
      const r = length(vC);
      const ang = atan(vC.y, vC.x);
      const n0 = float(0.5).add(sin(ang.mul(5.0).add(vSeed.mul(40.0))).mul(0.3)).add(sin(ang.mul(13.0).sub(vSeed.mul(90.0))).mul(0.2));
      const n = clamp(n0.add(sin(ang.mul(31.0).add(vSeed.mul(17.0))).mul(0.25)), 0.05, 1.0);
      const w = mix(0.022, 0.012, vAge);
      const x = r.sub(0.92).div(w);
      const rim = exp(x.mul(x).negate());
      const shell = pow(smoothstep(0.35, 0.92, r), 4.0).mul(smoothstepR(0.96, 0.92, r)).mul(0.13);
      const k = rim.add(shell).mul(n).mul(pow(life, 2.0)).mul(smoothstep(0.0, 0.02, vAge));
      emis.assign(mix(vec3(1.0, 0.62, 0.34), vec3(0.42, 0.6, 1.0), smoothstep(0.0, 0.45, vAge)).mul(k).mul(1.1));
      outA.assign(0.0);
    }).ElseIf(vKind.lessThan(7.5), () => { // 砲口の閃光：花びらの形。ほんの数コマ
      const r = length(vC);
      const ang = atan(vC.y, vC.x);
      const pet = pow(abs(cos(ang.mul(2.5).add(vSeed.mul(6.28)))), 5.0);
      const k = pow(max(0.0, float(1.0).sub(r.div(float(0.22).add(pet.mul(0.78))))), 1.8).mul(pow(life, 1.4));
      emis.assign(mix(vec3(1.0, 0.4, 0.09), vec3(1.0, 0.88, 0.66), pow(max(0.0, float(1.0).sub(r.mul(2.6))), 2.0)).mul(k).mul(3.4));
      al.assign(k);
      outA.assign(0.0);
    }).ElseIf(vKind.lessThan(8.5), () => { // 焦げ：当たった所に残る黒い跡。最初の一瞬は赤熱している
      al.assign(smoothstep(0.08, 0.5, dens).mul(smoothstep(0.0, 0.01, vAge)).mul(pow(life, 0.6)).mul(0.88));
      col.assign(vec3(0.007, 0.006, 0.006));
      emis.assign(vec3(1.0, 0.28, 0.04).mul(pow(max(0.0, float(1.0).sub(vAge.mul(9.0))), 2.0)).mul(smoothstep(0.4, 0.9, dens)).mul(2.2).mul(al));
    }).Else(() => { // 誘導弾の煙：細く、日に当たって薄く白い
      const thr = mix(0.1, 0.62, vAge);
      al.assign(smoothstep(thr, thr.add(0.3), dens).mul(fadeIn).mul(pow(life, 1.1)).mul(0.42).mul(vCamS));
      col.assign(mix(vec3(0.02, 0.02, 0.022), vec3(0.3, 0.3, 0.31), lit));
    });
    const soft = softFade(0.12, vv.viewDist);
    return vec4(col.mul(al).add(emis).mul(soft), al.mul(outA).mul(soft));
  })();
  return { vertexNode, fragmentNode };
}

// 火花：速さの向きに伸びる小さな光（aLife の z は太さ、w は伸び。aMisc の x は色 0=橙,1=水色）
function sparkNodes(U) {
  const P = particleCore(U);
  const { aVel, aLife, aMisc, e, p, dead, age } = P;
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const vAge = varying(age, 'vAge');
  const vTint = varying(aMisc.x, 'vTint');
  const mv0 = cameraViewMatrix.mul(vec4(p, 1.0));
  const dirV = cameraViewMatrix.mul(vec4(aVel.mul(e), 0.0)).xyz;
  const len = length(dirV.xy);
  const dir = select(len.greaterThan(1e-4), dirV.xy.div(max(len, 1e-4)), vec2(1.0, 0.0));
  const side = vec2(dir.y.negate(), dir.x);
  const stretch = aLife.z.add(len.mul(aLife.w));
  const close = clamp(mv0.z.negate().div(30.0), 0.12, 1.0);
  const off = dir.mul(positionGeometry.y.mul(2.0).mul(stretch)).add(side.mul(positionGeometry.x.mul(2.0).mul(aLife.z))).mul(close);
  const vv = viewVertex(vec4(mv0.xy.add(off), mv0.z, mv0.w));
  const vertexNode = select(dead, vec4(2.0, 2.0, 2.0, 1.0), vv.vertexNode);

  const fragmentNode = Fn(() => {
    const r = length(vC);
    const life = max(float(1.0).sub(vAge), 0.0);
    const k = pow(max(0.0, r.oneMinus()), 1.5).mul(pow(life, 1.2));
    const c = select(vTint.lessThan(0.5),
      mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.16, 0.03), vAge),
      mix(vec3(0.7, 0.95, 1.0), vec3(0.1, 0.4, 1.0), vAge));
    return vec4(c.mul(k).mul(3.6).mul(softFade(0.05, vv.viewDist)), 0.0);
  })();
  return { vertexNode, fragmentNode };
}

function pool(count, build, extra) {
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  g.setAttribute('position', quad.attributes.position);
  g.setIndex(quad.index);
  const add = (name, n) => {
    const attr = new THREE.InstancedBufferAttribute(new Float32Array(count * n), n);
    attr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(name, attr);
    return attr;
  };
  const aPos = add('aPos', 4);
  const aVel = add('aVel', 4);
  const aLife = add('aLife', 4);
  const aMisc = add('aMisc', 4);
  aLife.array.fill(-1000);
  g.instanceCount = count;
  const U = nodeUniforms({ ...extra, uNow: 0, uOriginNear: new THREE.Vector3(), uOriginFar: new THREE.Vector3() });
  // 煙は暗い色で下を隠し、光は足すだけ（色は不透明度を掛けた値で出す）
  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true, // 今の版の ShaderMaterial と同じく1回で描く
    fog: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendEquation: THREE.AddEquation,
  });
  Object.assign(mat, build(U));
  mat.uniforms = { ...softUniforms, ...U };
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  let cursor = 0;
  let dirty = false;
  let runStart = 0; let written = 0; // このコマに書いた範囲（輪の上で cursor から順に続く）
  const attrs = [aPos, aVel, aLife, aMisc];
  return {
    mesh, mat, count,
    write(p, v, l0, l1, l2, l3, m0, m1, m2, m3) {
      const i = cursor;
      if (!dirty) { runStart = i; written = 0; }
      cursor = (cursor + 1) % count;
      aPos.setXYZW(i, p[0], p[1], p[2], 0);
      aVel.setXYZW(i, v[0], v[1], v[2], 0);
      aLife.setXYZW(i, l0, l1, l2, l3);
      aMisc.setXYZW(i, m0, m1, m2, m3);
      written++;
      dirty = true;
    },
    // 書いた範囲だけを GPU へ送る（輪の端をまたいだら2つに分ける。1周を超えたら全部）
    flush() {
      if (!dirty) return;
      const parts = written >= count ? null : runStart + written <= count ? [[runStart, written]] : [[runStart, count - runStart], [0, runStart + written - count]];
      for (const a of attrs) {
        a.clearUpdateRanges();
        if (parts) for (const [st, n] of parts) a.addUpdateRange(st * a.itemSize, n * a.itemSize);
        a.needsUpdate = true;
      }
      dirty = false;
    },
    clear() { aLife.array.fill(-1000); aLife.clearUpdateRanges(); aLife.needsUpdate = true; cursor = 0; dirty = false; },
  };
}

export function createPuffs({ scene }) {
  const puffs = pool(7000, puffNodes, { uAtlas: makeAtlas(), uSunV: new THREE.Vector3(0, 1, 0) });
  const sparks = pool(2400, sparkNodes, {});
  puffs.mesh.renderOrder = 4;
  sparks.mesh.renderOrder = 5;
  scene.add(puffs.mesh);
  scene.add(sparks.mesh);

  let seed = 73421;
  const rnd = () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let now = 0;
  const near = [0, 0, 0];
  const far = [0, 0, 0];
  const sunV = new THREE.Vector3();

  return {
    rnd,
    near, far,
    camera: null,
    get now() { return now; },
    // rel は機体からの相対位置。space=0 は near、1 は far
    puff(rel, vel, life, s0, s1, kind, drag = 0, space = 0, delay = 0) {
      const o = space ? far : near;
      puffs.write([rel[0] + o[0], rel[1] + o[1], rel[2] + o[2]], vel, now + delay, life, s0, s1, kind, rnd(), drag, space);
    },
    spark(rel, vel, life, width, stretch, tint = 0, drag = 2, space = 0) {
      const o = space ? far : near;
      sparks.write([rel[0] + o[0], rel[1] + o[1], rel[2] + o[2]], vel, now, life, width, stretch, tint, rnd(), drag, space);
    },
    frame(state, fly, forward, nearK, dt, camera, sunDir) {
      this.camera = camera;
      now = state.time;
      const v = fly.speed * nearK * dt;
      near[0] += forward[0] * v; near[1] += forward[1] * v; near[2] += forward[2] * v;
      far[0] = fly.pos[0]; far[1] = fly.pos[1]; far[2] = fly.pos[2];
      for (const m of [puffs.mat, sparks.mat]) {
        m.uniforms.uNow.value = now;
        m.uniforms.uOriginNear.value.set(near[0], near[1], near[2]);
        m.uniforms.uOriginFar.value.set(far[0], far[1], far[2]);
      }
      sunV.copy(sunDir).transformDirection(camera.matrixWorldInverse);
      puffs.mat.uniforms.uSunV.value.copy(sunV);
    },
    flush() { puffs.flush(); sparks.flush(); },
    reset() {
      puffs.clear(); sparks.clear();
      seed = 73421; now = 0;
      near[0] = near[1] = near[2] = 0;
    },
  };
}
