import * as THREE from 'three';
import {
  Fn, uv, uniform, uniformArray, texture, attribute, varying, instanceIndex, instancedArray, positionGeometry, positionWorld, cameraPosition,
  vec2, vec3, vec4, float, int, abs, max, min, floor, fract, dot, mix, clamp, length, normalize, cross, select, smoothstep, sin, cos,
  Loop, If, Break, Discard, cameraViewMatrix, cameraNear, cameraFar, viewZToPerspectiveDepth,
} from 'three/tsl';
import { octEncode, octDecode, basisR, qrot, qrotInv, stretchOf } from './shapeMath.js';
import { TX, TY, BOUND, SHAPES, pickShape } from './shapes.js';
import { SPACE_U } from './rockShading.js';

// 遠くの岩：八面体のインポスター（國松の言う「板に画像」の本格版）。
// 起動時に、8種の形をそれぞれ 12×12 の向き（八面体に並べた全天）から撮った「地表の点の位置」の画像を焼く。
// 描くときは板1枚に、見ている向きに近い3枚の画像を、奥行きでずれを直して重ね、地表の点 P を取り出す。
// P が分かれば、近くの立体と同じ質感の式（形の地図の法線・材質・自分の影）で光を当てられる。
// だから太陽の向きを変えても、板なのに立体のように陰が回り、近くの立体へ切り替わっても見た目が変わらない。
//
// 2つの使い方：
//   near：近くの岩のうち小さく見える物（CPU が毎コマ詰める。nearRocks が振り分ける）
//   far ：何万個もの小惑星帯。位置・回転・使う3枚の選択・見えない物の省略を GPU の計算（compute）で行う

export function bakeImpostors(renderer, atlas, { frames = 12, framePx = 80 } = {}) {
  const F = frames; const FP = framePx;
  const W = TX * F * FP; const H = TY * F * FP;
  const rt = new THREE.RenderTarget(W, H, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const mat = new THREE.MeshBasicNodeMaterial({ fog: false, toneMapped: false });
  mat.fragmentNode = Fn(() => {
    const t = uv().mul(vec2(W, H));
    const tile = floor(t.div(F * FP));
    const local = t.sub(tile.mul(F * FP));
    const fr = floor(local.div(FP));
    const pix = local.sub(fr.mul(FP)).sub(1.0).div(FP - 2);
    const k = tile.x.add(tile.y.mul(TX));
    const D = octDecode(fr.div(F - 1));
    const R = basisR(D); const U = cross(D, R);
    const X0 = D.mul(BOUND).add(R.mul(pix.x.sub(0.5).mul(2 * BOUND))).add(U.mul(pix.y.sub(0.5).mul(2 * BOUND)));
    // 視線をまっすぐ進め、地図の半径より内側に入った所を探す（等間隔→二分）
    const STEPS = 96;
    const dt = (2 * BOUND) / STEPS;
    const tHit = float(-1.0).toVar();
    const tt = float(0.0).toVar();
    Loop(STEPS, () => {
      const q = X0.sub(D.mul(tt));
      const rq = length(q);
      If(rq.lessThan(atlas.radius(q.div(max(rq, 1e-4)), k)), () => { tHit.assign(tt); Break(); });
      tt.addAssign(dt);
    });
    const out = vec4(0.0).toVar();
    If(tHit.greaterThan(0.0), () => {
      const lo = tHit.sub(dt).toVar(); const hi = tHit.toVar();
      Loop(7, () => {
        const mid = lo.add(hi).mul(0.5);
        const q = X0.sub(D.mul(mid));
        const rq = length(q);
        If(rq.lessThan(atlas.radius(q.div(max(rq, 1e-4)), k)), () => { hi.assign(mid); }).Else(() => { lo.assign(mid); });
      });
      const q = X0.sub(D.mul(hi));
      out.assign(vec4(q.div(2 * BOUND).add(0.5), 1.0));
    });
    return out;
  })();
  const quad = new THREE.QuadMesh(mat);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  quad.render(renderer);
  renderer.setRenderTarget(prev);
  mat.dispose();
  return { tex: rt.texture, F, FP, W, H, dispose: () => rt.dispose() };
}

// 板の材質。inst は頂点の段の値 { C（中心）, S（大きさ）, q（回転）, k（種類）, kind, seed, hide, frames? }
function makeImpostorMaterial(shading, imp, inst, { depth = false, tier = 1, kindConst } = {}) {
  const { F, FP, W, H, tex } = imp;
  const mat = new THREE.MeshPhysicalNodeMaterial({ fog: false });
  const { C, S, q, k } = inst;
  // 岩ごとの縦・横・奥行きの比。板の画像は伸ばす前の形で焼いてあるので、視線を元の座標へ戻して読む
  const st = stretchOf(inst.seed);
  // 見ている向き（元の座標）と、使う3枚の選び方
  let f0, f1, f2, wv;
  if (inst.frames) {
    ({ f0, f1, f2, wv } = inst.frames);
  } else {
    const Vc = normalize(qrotInv(q, cameraPosition.sub(C)).div(st));
    const g = octEncode(Vc).mul(F - 1);
    const base = clamp(floor(g), 0.0, F - 2);
    const f = g.sub(base);
    const up = f.x.add(f.y).greaterThan(1.0);
    f0 = select(up, base.add(1.0), base);
    f1 = base.add(vec2(1.0, 0.0));
    f2 = base.add(vec2(0.0, 1.0));
    wv = select(up, vec3(f.x.add(f.y).sub(1.0), float(1.0).sub(f.y), float(1.0).sub(f.x)), vec3(float(1.0).sub(f.x).sub(f.y), f.x, f.y));
  }
  // 板の頂点：中心からカメラへの向きに直交する板。見えない物は1点へ潰す
  const toCam = normalize(cameraPosition.sub(C));
  const R = normalize(cross(select(abs(toCam.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0)), toCam));
  const U = cross(toCam, R);
  const half = S.mul(BOUND).mul(max(st.x, max(st.y, st.z)));
  const shown = S.greaterThan(0.0).and(inst.hide.lessThan(0.999));
  mat.positionNode = select(shown, C.add(R.mul(positionGeometry.x).add(U.mul(positionGeometry.y)).mul(half)), C);
  const vC = varying(C, 'vImC'); const vS = varying(S, 'vImS'); const vQ = varying(q, 'vImQ'); const vSt = varying(st, 'vImSt');
  const vK = varying(vec4(k, inst.kind, inst.seed, inst.hide), 'vImK');
  const vF01 = varying(vec4(f0, f1), 'vImF01'); const vF2 = varying(vec2(f2), 'vImF2'); const vW = varying(wv, 'vImW');
  const vL = varying(normalize(qrotInv(q, SPACE_U.sunDir)), 'vImL');
  const vFx = inst.fx ? varying(inst.fx, 'vImFx') : null;

  const kk = vK.x;
  const tileO = vec2(kk.sub(floor(kk.div(TX)).mul(TX)), floor(kk.div(TX))).mul(F * FP);
  const sampleFrame = (fr, uvf) => {
    const tx = tileO.add(fr.mul(FP)).add(1.0).add(clamp(uvf, 0.0, 1.0).mul(FP - 2));
    const s = texture(tex, tx.div(vec2(W, H))).level(0);
    // 縁は位置×被覆で焼いてあるので割り戻す
    const P = s.xyz.div(max(s.w, 1e-3)).sub(0.5).mul(2 * BOUND);
    const inside = select(uvf.x.greaterThan(0.0).and(uvf.x.lessThan(1.0)).and(uvf.y.greaterThan(0.0)).and(uvf.y.lessThan(1.0)), float(1.0), float(0.0));
    return { P, a: s.w.mul(inside) };
  };
  const res = Fn(() => {
    const Oo = qrotInv(vQ, cameraPosition.sub(vC)).div(vS).div(vSt);
    const Ro = normalize(qrotInv(vQ, normalize(positionWorld.sub(cameraPosition))).div(vSt));
    const accP = vec3(0.0).toVar();
    const accA = float(0.0).toVar();
    const one = (fr, w) => {
      const D = octDecode(fr.div(F - 1));
      const Rr = basisR(D); const Uu = cross(D, Rr);
      const den = dot(Ro, D);
      const den2 = select(abs(den).lessThan(1e-4), float(-1e-4), den);
      const t0 = dot(Oo, D).negate().div(den2);
      const X = Oo.add(Ro.mul(t0));
      const s0 = sampleFrame(fr, vec2(dot(X, Rr), dot(X, Uu)).div(2 * BOUND).add(0.5));
      // 奥行きでずれを直す：取れた点の深さの面と視線の交わりで読み直す
      let s1 = s0; let a = s0.a;
      if (tier < 2) {
        const t1 = dot(s0.P, D).sub(dot(Oo, D)).div(den2);
        const X1 = Oo.add(Ro.mul(t1));
        s1 = sampleFrame(fr, vec2(dot(X1, Rr), dot(X1, Uu)).div(2 * BOUND).add(0.5));
        a = select(s0.a.greaterThan(0.5), s1.a, s0.a.mul(s1.a));
      }
      accP.addAssign(s1.P.mul(a.mul(w)));
      accA.addAssign(a.mul(w));
    };
    one(vF01.xy, vW.x);
    one(vF01.zw, vW.y);
    one(vF2, vW.z);
    return vec4(accP.div(max(accA, 1e-4)), accA);
  })();
  const Pobj = res.xyz;
  const alpha = res.w;
  const Vobj = normalize(qrotInv(vQ, cameraPosition.sub(positionWorld)));
  shading.applyTo(mat, { tier, kindConst, fx: vFx, P: Pobj, st: vSt, scale: vS, tile: kk, kind: vK.y, seed: vK.z, quat: vQ, Vobj, Lobj: vL }, { shadowMap: tier < 2 });
  const worldP = vC.add(qrot(vQ, Pobj.mul(vSt).mul(vS)));
  mat.receivedShadowPositionNode = worldP;
  mat.alphaToCoverage = true;
  mat.opacityNode = smoothstep(0.3, 0.7, alpha).mul(float(1.0).sub(vK.w));
  mat.alphaTestNode = float(0.02);
  if (depth) {
    // 地表の本当の奥行きを書く（近くの立体や他の物と正しく交わる）
    const vz = cameraViewMatrix.mul(vec4(worldP, 1.0)).z;
    mat.depthNode = viewZToPerspectiveDepth(vz, cameraNear, cameraFar);
  }
  return mat;
}

const quadGeo = () => {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
};

// 近くの岩のうち小さく見える物（nearRocks から詰める）
export function createNearImpostors({ group, shading, imp, cap = 4096 }) {
  // 材質（岩・氷・金属）ごとに描画を分ける（その材質の計算だけで済む）
  const parts = [0, 1, 2].map((kc) => {
    const g = quadGeo();
    const mk = (name) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; };
    const aPos = mk('iPos'); const aQuat = mk('iQuat'); const aData = mk('iData'); const aFx = mk('iFx');
    g.instanceCount = 0;
    const iPos = attribute('iPos', 'vec4'); const iQuat = attribute('iQuat', 'vec4'); const iData = attribute('iData', 'vec4'); const iFx = attribute('iFx', 'vec4');
    const mat = makeImpostorMaterial(shading, imp, { C: iPos.xyz, S: iPos.w, q: iQuat, k: iData.x, kind: iData.y, seed: iData.z, hide: iData.w, fx: iFx }, { depth: true, tier: 1, kindConst: kc });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.name = `spaceRockImpNear_${['rock', 'ice', 'metal'][kc]}`;
    group.add(mesh);
    return { g, mesh, aPos, aQuat, aData, aFx, used: 0 };
  });
  let used = 0;
  return {
    parts,
    begin() { used = 0; for (const p of parts) p.used = 0; },
    push(buf, o) {
      const p = parts[Math.max(0, Math.min(2, Math.round(buf[o + 9])))];
      if (p.used >= cap) return;
      const j = p.used * 4;
      for (let c = 0; c < 4; c++) { p.aPos.array[j + c] = buf[o + c]; p.aQuat.array[j + c] = buf[o + 4 + c]; p.aData.array[j + c] = buf[o + 8 + c]; p.aFx.array[j + c] = buf[o + 12 + c]; }
      p.used++; used++;
    },
    end() {
      for (const p of parts) {
        p.g.instanceCount = p.used;
        p.mesh.visible = p.used > 0;
        if (p.used) for (const a of [p.aPos, p.aQuat, p.aData, p.aFx]) { a.clearUpdateRanges(); a.addUpdateRange(0, p.used * 4); a.needsUpdate = true; }
      }
    },
    get count() { return used; },
  };
}

// 何万個もの小惑星帯。機体のまわりの大きな箱で座標を折り返すので、どこまで飛んでも尽きない（ゲームの今の岩と同じ考え方）。
// 毎コマ GPU の計算で：漂い（ゆっくり流れる）・回転・折り返し・視野の外と小さすぎる物と近すぎる物（近くの岩の担当）の省略・
// 使う3枚の画像の選択、までを1回ずつ済ませ、板の頂点は結果を読むだけにする。
export function createFarField({ group, shading, imp, useCompute = true, count = 40000, cell = [9000, 2600, 9000], seed = 7, sizeRange = [1.0, 48], sizePow = 5.5, beltSigma = 240, shapes = null, kindOf = null, kindMix = [0.7, 0.2, 0.1], nearCut = 380, corridor = 0, loose = 0.35, clusterSize = 40 }) {
  const N = count;
  const base = new Float32Array(N * 4); const spin = new Float32Array(N * 4); const info = new Float32Array(N * 4); const drift = new Float32Array(N * 4);
  let s = seed * 9973 + 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gauss = () => { const u = Math.max(1e-6, rnd()); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()); };
  const shapeList = shapes || SHAPES.map((_, i) => i);
  const clampY = (y) => Math.max(-cell[1] * 0.49, Math.min(cell[1] * 0.49, y));
  const pickKind = () => { const kr = rnd(); return kr < kindMix[0] ? 0 : kr < kindMix[0] + kindMix[1] ? 1 : 2; };
  const shapeOf = (kd) => {
    if (kindOf) { const sh = shapeList[Math.floor(rnd() * shapeList.length)]; return [sh, kindOf(sh, rnd)]; }
    return [shapes ? shapeList[Math.floor(rnd() * shapeList.length)] : pickShape(kd, rnd()), kd];
  };
  // 大きい物ほどゆっくり回る（小さな破片は速く回る）
  const spinOf = (sz) => (0.02 + rnd() * 0.3) * Math.min(1.6, Math.max(0.12, Math.sqrt(3 / sz))) * (rnd() < 0.5 ? -1 : 1);
  const put = (i, x, y, z, sz, kd0, dx, dz) => {
    base.set([x, clampY(y), z, sz], i * 4);
    const zz = rnd() * 2 - 1; const a = rnd() * 6.2832; const c = Math.sqrt(1 - zz * zz);
    spin.set([c * Math.cos(a), zz, c * Math.sin(a), spinOf(sz)], i * 4);
    const [shp, kd] = shapeOf(kd0);
    info.set([shp, kd, rnd() * 100, rnd() * 6.2832], i * 4);
    drift.set([dx + (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.2, dz + (rnd() - 0.5) * 0.4, 0], i * 4);
  };
  // 配置：群れ（大きな親の岩のまわりに、離れるほど小さくまばらな破片。流れの向きに伸びる）と、群れの間のまばらな小石。
  // 群れは同じ材質でそろえる（氷の群れ・金属の群れ）。群れの間は空ける（一様に撒いた見た目にしない）
  const nLoose = Math.floor(N * loose);
  let i = 0;
  while (i < N - nLoose) {
    const cx = (rnd() - 0.5) * cell[0]; const cz = (rnd() - 0.5) * cell[2]; const cy = gauss() * beltSigma;
    const kd = pickKind();
    const parent = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * (0.25 + 0.75 * Math.pow(rnd(), 1.6));
    const R = parent * (5 + rnd() * 9);
    // 流れの向き（破片の尾）と伸び
    const ta = rnd() * 6.2832; const tx = Math.cos(ta); const tz = Math.sin(ta); const ty = (rnd() - 0.5) * 0.4; const stretch = 1.5 + rnd() * 2.5;
    const dx = (rnd() - 0.5) * 1.0; const dz = (rnd() - 0.5) * 1.0;
    const m = Math.min(N - nLoose - i, Math.floor(clusterSize * (0.4 + rnd() * 1.2) * Math.min(2, Math.sqrt(parent / (sizeRange[1] * 0.4)))) + 3);
    put(i++, cx, cy, cz, parent, kd, dx, dz);
    for (let j = 1; j < m && i < N - nLoose; j++) {
      const u = Math.pow(rnd(), 0.75);
      const zz = rnd() * 2 - 1; const a = rnd() * 6.2832; const c = Math.sqrt(1 - zz * zz);
      let ox = c * Math.cos(a) * R * u; let oy = zz * R * u * 0.6; let oz = c * Math.sin(a) * R * u;
      const al = ox * tx + oy * ty + oz * tz; const k = (stretch - 1) * al; // 流れの向きにだけ伸ばす
      ox += tx * k; oy += ty * k; oz += tz * k;
      const sz = Math.max(sizeRange[0] * 0.6, parent * (0.03 + 0.32 * Math.pow(rnd(), 2.2)) * (1.15 - 0.6 * u));
      put(i++, cx + ox, cy + oy, cz + oz, sz, rnd() < 0.85 ? kd : pickKind(), dx, dz);
    }
  }
  for (; i < N; i++) {
    const t = rnd();
    const sz = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * 0.12 * Math.pow(t, sizePow);
    put(i, (rnd() - 0.5) * cell[0], gauss() * beltSigma * 1.3, (rnd() - 0.5) * cell[2], sz, pickKind(), (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2);
  }
  // 材質（岩・氷・金属）ごとに並べ替え、材質ごとに描画を分ける（その材質の計算だけで済む）
  const order = Array.from({ length: N }, (_, i) => i).sort((x, y) => info[x * 4 + 1] - info[y * 4 + 1]);
  for (const arr of [base, spin, info, drift]) {
    const src = arr.slice();
    order.forEach((from, to) => { for (let c = 0; c < 4; c++) arr[to * 4 + c] = src[from * 4 + c]; });
  }
  const kindCount = [0, 0, 0];
  for (let i = 0; i < N; i++) kindCount[Math.round(info[i * 4 + 1])]++;
  const kindOff = [0, kindCount[0], kindCount[0] + kindCount[1]];
  const U = {
    time: uniform(0), origin: uniform(new THREE.Vector3()), cam: uniform(new THREE.Vector3()), cell: uniform(new THREE.Vector3(...cell)),
    pxK: uniform(800), nearCut: uniform(nearCut), farCut: uniform(cell[0] * 0.5), planes: uniformArray(Array.from({ length: 6 }, () => new THREE.Vector4()), 'vec4'),
    minPx: uniform(0.7), scaleK: uniform(1.0),
    // 通り道：進む向きの前方の筒（半径 corridor）の中は小さくして消す（ゲームで行く手と敵を覆わない）。0 で無し
    fwd: uniform(new THREE.Vector3(0, 0, 1)), corridor: uniform(corridor),
  };
  const F = imp.F;
  // 1つの岩の、今のコマの位置・大きさ・回転・使う3枚と重み（GPU の計算でも、頂点の計算でも同じ式を使う）
  const calc = (b, sp, inf, dr) => {
    // 折り返し：機体の位置 origin から見た相対位置を箱の中へ
    const p0 = b.xyz.add(dr.xyz.mul(U.time)).sub(U.origin);
    const p = p0.sub(U.cell.mul(floor(p0.div(U.cell).add(0.5))));
    const dist = length(p.sub(U.cam));
    const S = b.w.mul(U.scaleK);
    const stF = stretchOf(inf.z);
    const rad = S.mul(BOUND).mul(max(stF.x, max(stF.y, stF.z)));
    // 見えない物の省略：視野の6面・画面で小さすぎる・近くの岩の担当の範囲・箱の端
    let vis = float(1.0);
    for (let j = 0; j < 6; j++) {
      const pl = U.planes.element(j);
      vis = vis.mul(select(dot(pl.xyz, p).add(pl.w).lessThan(rad.negate()), float(0.0), float(1.0)));
    }
    const px = rad.div(max(dist, 1e-3)).mul(U.pxK);
    vis = vis.mul(select(px.greaterThan(U.minPx), float(1.0), float(0.0)));
    // 近くの岩の範囲と、折り返しの境目では小さくして消す（ぱっと現れない）
    const nearK = smoothstep(U.nearCut, U.nearCut.mul(1.3), dist);
    const edge = U.cell.mul(0.5).sub(abs(p));
    const edgeK = smoothstep(0.0, U.cell.x.mul(0.06), min(edge.x, edge.z)).mul(smoothstep(0.0, U.cell.y.mul(0.08), edge.y));
    const rv = p.sub(U.cam);
    const along = dot(rv, U.fwd);
    const lat = length(rv.sub(U.fwd.mul(along)));
    const corrK = select(U.corridor.greaterThan(0.0).and(along.greaterThan(-50.0)), smoothstep(U.corridor.mul(0.65), U.corridor, lat), float(1.0));
    const shownS = S.mul(vis).mul(nearK).mul(edgeK).mul(corrK);
    const ang = sp.w.mul(U.time).add(inf.w).mul(0.5);
    const q = vec4(sp.xyz.mul(sin(ang)), cos(ang));
    const Vc = normalize(qrotInv(q, U.cam.sub(p)).div(stF));
    const g = octEncode(Vc).mul(F - 1);
    const bs = clamp(floor(g), 0.0, F - 2);
    const f = g.sub(bs);
    const up = f.x.add(f.y).greaterThan(1.0);
    const w = select(up, vec3(f.x.add(f.y).sub(1.0), float(1.0).sub(f.y), float(1.0).sub(f.x)), vec3(float(1.0).sub(f.x).sub(f.y), f.x, f.y));
    return { p, shownS, q, f0: select(up, bs.add(1.0), bs), f1: bs.add(vec2(1.0, 0.0)), f2: bs.add(vec2(0.0, 1.0)), w };
  };
  // WebGPU は計算（compute）で1つにつき1回だけ求めて配列へ書く。WebGL2 は書き出せる値が4つまでで足りないので、
  // 板の頂点で同じ式を求める（頂点は4つなので計算は4倍になるが、結果は同じ）
  let compute = null;
  let instOf; // 材質 k の描画の、頂点の段の値
  if (useCompute) {
    const sBase = instancedArray(base, 'vec4'); const sSpin = instancedArray(spin, 'vec4'); const sInfo = instancedArray(info, 'vec4'); const sDrift = instancedArray(drift, 'vec4');
    const oPos = instancedArray(N, 'vec4'); const oQuat = instancedArray(N, 'vec4'); const oFr = instancedArray(N, 'vec4');
    const id = (v2) => v2.x.add(v2.y.mul(F));
    compute = Fn(() => {
      const i = instanceIndex;
      const r = calc(sBase.element(i), sSpin.element(i), sInfo.element(i), sDrift.element(i));
      oPos.element(i).assign(vec4(r.p, r.shownS));
      oQuat.element(i).assign(r.q);
      oFr.element(i).assign(vec4(id(r.f0), id(r.f1), id(r.f2), floor(clamp(r.w.x, 0.0, 1.0).mul(1023.0)).add(clamp(r.w.y, 0.0, 0.999))));
    })().compute(N);
    instOf = (k) => {
      const ii = instanceIndex.add(kindOff[k]);
      const op = oPos.element(ii); const oq = oQuat.element(ii); const of = oFr.element(ii); const oi = sInfo.element(ii);
      const unid = (x) => vec2(x.sub(floor(x.div(F)).mul(F)), floor(x.div(F)));
      const wx = floor(of.w).div(1023.0); const wy = fract(of.w);
      const frames = { f0: unid(of.x), f1: unid(of.y), f2: unid(of.z), wv: vec3(wx, wy, max(float(1.0).sub(wx).sub(wy), 0.0)) };
      return { geo: quadGeo(), inst: { C: op.xyz, S: op.w, q: oq, k: oi.x, kind: oi.y, seed: oi.z, hide: float(0.0), frames } };
    };
  } else {
    instOf = (k) => {
      const g = quadGeo();
      const o = kindOff[k] * 4; const e = (kindOff[k] + kindCount[k]) * 4;
      for (const [name, arr] of [['aBase', base], ['aSpin', spin], ['aInfo', info], ['aDrift', drift]]) g.setAttribute(name, new THREE.InstancedBufferAttribute(arr.subarray(o, e), 4));
      const oi = attribute('aInfo', 'vec4');
      const r = calc(attribute('aBase', 'vec4'), attribute('aSpin', 'vec4'), oi, attribute('aDrift', 'vec4'));
      return { geo: g, inst: { C: r.p, S: r.shownS, q: r.q, k: oi.x, kind: oi.y, seed: oi.z, hide: float(0.0), frames: { f0: r.f0, f1: r.f1, f2: r.f2, wv: r.w } } };
    };
  }
  const mesh = new THREE.Group(); // 材質ごとの3つの描画をまとめる（visible で一度に出し消しできる）
  mesh.name = 'spaceRockFar';
  const parts = [0, 1, 2].filter((k) => kindCount[k] > 0).map((k) => {
    const { geo, inst } = instOf(k);
    geo.instanceCount = kindCount[k];
    const m = new THREE.Mesh(geo, makeImpostorMaterial(shading, imp, inst, { tier: 2, kindConst: k }));
    m.frustumCulled = false;
    m.receiveShadow = false; // 遠くの板は影の地図の外。自分の影だけを色へ畳み込む
    m.name = `spaceRockFar_${['rock', 'ice', 'metal'][k]}`;
    mesh.add(m);
    return { m, k };
  });
  group.add(mesh);

  const frustum = new THREE.Frustum();
  const m4 = new THREE.Matrix4();
  const size = new THREE.Vector2();
  const cp = new THREE.Vector3();
  return {
    mesh, U, count: N,
    // origin：世界の中での描く座標の原点（ゲームは機体の位置 flight.pos）、camera：描く座標のカメラ
    update(renderer, camera, origin, time, fwd = null) {
      if (fwd) U.fwd.value.set(fwd[0], fwd[1], fwd[2]).normalize();
      U.time.value = time;
      U.origin.value.set(origin[0], origin[1], origin[2]);
      camera.updateMatrixWorld();
      cp.setFromMatrixPosition(camera.matrixWorld);
      U.cam.value.copy(cp);
      m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(m4, camera.coordinateSystem);
      frustum.planes.forEach((pl, j) => U.planes.array[j].set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant));
      renderer.getDrawingBufferSize(size);
      U.pxK.value = (size.y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
      if (compute) renderer.compute(compute);
    },
    // 数を減らす時は、材質ごとに同じ割合で減らす
    setCount(n) { const f = Math.max(0, Math.min(1, n / N)); for (const p of parts) p.m.geometry.instanceCount = Math.round(kindCount[p.k] * f); },
  };
}
