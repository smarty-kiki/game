import * as THREE from 'three';
import { Fn, uniform, texture, referenceAttribute, positionGeometry, materialRoughness, materialEmissive, vec3, vec4, clamp, fract, sin, dot, floor, step, abs, normalView, positionViewDirection } from 'three/tsl';
import { repairTangents } from '../materials.js';

// 機械の大蛇（ボス）。形は「節1つ・頭・尾」を整えて並べる作り（assets/bosses/serpent2/。作りの手順は .work/ボス/節/）。
// 継ぎ目は「玉と受け口」：節の前の玉が一つ前の節の受け口へ入る。どちらも同じ軸点を中心にした球なので、どの向きに曲げても隙間も重なりも出ない。
// 節の殻は前後の軸点を頂点にした円錐（軸から ANG 度）の内側に収めてあるので、継ぎ目ごとの曲げが 180-2*ANG 度より小さければ殻どうしは当たらない。
// 動かし方：頭の後ろの軸点が通った道（trail）を、軸点が鎖のようになぞる。節は固い1つの物で、頂点は曲げない。
// 座標はすべて模型の中（長さ約2.1）。ゲームでは返す object を大きくして置く。

const UP = new THREE.Vector3(0, 1, 0);
const D2R = Math.PI / 180;
const MIN_BEND = 0.55;          // 道の曲がりの最小半径（模型の長さ約2.1に対して）。節1つで約18度まで
const MAX_JOINT = 25 * D2R;     // 継ぎ目ごとの曲げの上限（殻の溝は 28 度。うねり・首振りが重なってもここで止める）

export function loadSerpent(loader, base = './assets/bosses/serpent2/') {
  const glb = (n) => new Promise((res, rej) => loader.load(`${base}${n}.glb`, res, undefined, rej));
  // 画像は .work/ボス/節/e3_maps.py が作る（UV は glTF の向きなので flipY しない）
  const tl = new THREE.TextureLoader();
  const tex = (n, k, srgb) => new Promise((res) => tl.load(`${base}${n}_${k}.jpg`, (t) => {
    t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; res(t);
  }, undefined, () => res(null)));
  const maps = (n) => Promise.all([tex(n, 'color', true), tex(n, 'normal'), tex(n, 'orm'), tex(n, 'emissive')])
    .then(([color, normal, orm, emissive]) => ({ color, normal, orm, emissive }));
  return Promise.all([glb('segment'), glb('head'), glb('tail'), fetch(`${base}serpent2.json`).then((r) => r.json()),
    maps('segment'), maps('head'), maps('jaw'), maps('tail')])
    .then(([seg, head, tail, data, ms, mh, mj, mt]) => ({ g: { seg, head, tail }, data, maps: { seg: ms, head: mh, jaw: mj, tail: mt } }));
}

function meshesOf(gltf) {
  const out = [];
  gltf.scene.traverse((o) => { if (o.isMesh) out.push(o); });
  return out;
}

export function createSerpent({ g, data, maps = {}, envMap, range = 1.7, yRange = 0.55 }) {
  // 節は胴（serpent_segment）と背の砲台（serpent_turret）の2つ。砲台は別に回し、壊れたら消す
  const sm = meshesOf(g.seg);
  const segGeo = (sm.find((m) => /segment/.test(m.name)) || sm[0]).geometry;
  const turSrc = sm.find((m) => /turret/.test(m.name));
  const turGeo = turSrc ? turSrc.geometry : null;
  const hm = meshesOf(g.head);
  let headSrc = hm.find((m) => /head/.test(m.name)); let jawSrc = hm.find((m) => /jaw/.test(m.name));
  if (!headSrc || !jawSrc) { // 名前が無いときは大きい方が頭
    hm.forEach((m) => m.geometry.computeBoundingSphere());
    hm.sort((a, b) => b.geometry.boundingSphere.radius - a.geometry.boundingSphere.radius);
    [headSrc, jawSrc] = hm;
  }
  const headGeo = headSrc.geometry; const jawGeo = jawSrc.geometry; const tailGeo = meshesOf(g.tail)[0].geometry;
  [segGeo, headGeo, jawGeo, tailGeo, turGeo].forEach((geo) => geo && repairTangents(geo));
  const NSEG = data.nseg; const D = data.D; const QR = data.Q;
  const LEN = Array.from({ length: NSEG }, (_, k) => D * QR ** k); // 節 k の前後の軸点の間隔
  const SCALE = LEN.map((l) => l / D);
  const hinge = new THREE.Vector3(...data.head.hinge);
  headGeo.computeBoundingBox(); tailGeo.computeBoundingBox();
  const HL = headGeo.boundingBox.max.z;      // 頭の後ろの軸点から鼻先まで
  const TL = -tailGeo.boundingBox.min.z;     // 尾の前の軸点から先まで
  const L = HL + LEN.reduce((a, b) => a + b, 0) + TL;

  // ---- 見た目 ----
  const glow = { value: 0.5 }; const time = { value: 0 }; const hitU = { value: 0 }; const heatU = { value: 0 }; const noHeat = { value: 0 };
  const matSeg = partMaterial(maps.seg || {}, envMap, glow, time, 'seg', hitU, noHeat);
  const matHead = partMaterial(maps.head || {}, envMap, glow, time, 'head', hitU, heatU);
  const matJaw = partMaterial(maps.jaw || {}, envMap, glow, time, 'jaw', hitU, heatU);
  const matTail = partMaterial(maps.tail || {}, envMap, glow, time, 'tail', hitU, noHeat);
  const root = new THREE.Group(); root.name = 'serpent_root';
  const segMesh = new THREE.InstancedMesh(segGeo, matSeg, NSEG);
  segMesh.name = 'serpent_segments'; segMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const headGroup = new THREE.Group(); headGroup.name = 'serpent_head'; headGroup.matrixAutoUpdate = false;
  const headMesh = new THREE.Mesh(headGeo, matHead); headGroup.add(headMesh);
  const jawPivot = new THREE.Group(); jawPivot.name = 'serpent_jaw_hinge'; jawPivot.position.copy(hinge); headGroup.add(jawPivot);
  const jawMesh = new THREE.Mesh(jawGeo, matJaw); jawMesh.position.copy(hinge).negate(); jawPivot.add(jawMesh);
  const tailMesh = new THREE.Mesh(tailGeo, matTail); tailMesh.name = 'serpent_tail'; tailMesh.matrixAutoUpdate = false;
  // 背の砲台：節と同じ画像の材質。節の座標の y 軸まわりに PIV を中心に回る（砲身は +z 向き）
  const turMesh = turGeo ? new THREE.InstancedMesh(turGeo, matSeg, NSEG) : null;
  const PIV = new THREE.Vector3(...((data.turret && data.turret.pivot) || [0.031, 0.091, -0.004]));
  const MUZ = new THREE.Vector3(); // 砲口（節の座標・回す前）
  if (turGeo) {
    turMesh.name = 'serpent_turrets'; turMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    turGeo.computeBoundingBox();
    const pa = turGeo.attributes.position; const zt = turGeo.boundingBox.max.z - 0.004; let n = 0;
    for (let i = 0; i < pa.count; i++) if (pa.getZ(i) > zt) { MUZ.x += pa.getX(i); MUZ.y += pa.getY(i); MUZ.z += pa.getZ(i); n++; }
    MUZ.multiplyScalar(1 / Math.max(1, n));
  }
  const tur = Array.from({ length: NSEG }, () => ({ alive: true, yaw: 0, pop: 0 }));
  const turTarget = new THREE.Vector3(); let turAim = false;
  for (const m of [segMesh, headMesh, jawMesh, tailMesh, turMesh]) { if (!m) continue; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; }
  root.add(segMesh, headGroup, tailMesh);
  if (turMesh) root.add(turMesh);
  // 軸点（0 が頭の継ぎ目、k が節 k の前の継ぎ目、NSEG が尾の継ぎ目）。向きは後ろの節に合わせる。?focus=<番号> の目印
  const bones = Array.from({ length: NSEG + 1 }, (_, k) => {
    const b = new THREE.Object3D(); b.name = `joint_${k}`; b.matrixAutoUpdate = false; root.add(b); return b;
  });

  // ---- 動きの状態 ----
  const headPos = new THREE.Vector3(-0.3, 0.35, -0.1);  // 頭の後ろの軸点
  const dir = new THREE.Vector3(-1, 0, 0);              // 進む向き
  const TSTEP = 0.012;
  const trail = [];
  for (let s = TSTEP; s < L + 0.3; s += TSTEP) trail.push(headPos.clone().addScaledVector(dir, -s));
  const st = {
    act: 'swim', t: 0, auto: true, autoI: 0,
    speed: 0.5, turn: 1.4, wig: 0.04, wigLen: 1.25, wigSpd: 4.2, wigPhase: 0,
    jaw: 0, jawTarget: 0, jawK: 10, jawManual: null,
    look: new THREE.Vector3(), lookAmt: 0, pitchUp: 0, shake: 0,
    // 動きのなめらかさ：速さ vel は accel（模型の長さ/秒²）で speed へ寄る。曲がる速さ w は alpha（rad/秒²）で寄る。
    // 首は lookCur（見る量）をゆっくり寄せ、ばねで角度を追い、角速度は neckRate（rad/秒）まで。泳ぎの緩急は surge
    vel: 0.5, accel: 0.9, w: 0, alpha: 2.2, lookCur: 0, curYaw: 0, curPitch: 0, yawV: 0, pitchV: 0, neckRate: 1.3, surge: 0, surgeT: 0,
    hUp: new THREE.Vector3(0, 1, 0), hDir: dir.clone(), // 頭の上向き（前のコマから運ぶ）と、その時の進む向き
    target: new THREE.Vector3(-1, 0.3, 0.6), coilC: new THREE.Vector3(), coilA: 0, lungeAt: new THREE.Vector3(), bit: false,
    events: [], maxBend: 0, clamped: 0,
  };
  const J = Array.from({ length: NSEG + 1 }, () => new THREE.Vector3());
  const U = Array.from({ length: NSEG + 2 }, () => new THREE.Vector3());   // 前向き：0 頭、k+1 節 k、NSEG+1 尾
  const V = Array.from({ length: NSEG + 2 }, () => new THREE.Vector3());   // 上向き
  const desired = new THREE.Vector3(); const axis = new THREE.Vector3(); const snout = new THREE.Vector3();
  const tmpV = new THREE.Vector3(); const tmpW = new THREE.Vector3(); const side = new THREE.Vector3();
  const tq = new THREE.Quaternion(); const m4 = new THREE.Matrix4(); const sv = new THREE.Vector3();

  // 道を一定の間隔で伸ばし、体の長さより古い所を捨てる
  function pushTrail() {
    if (headPos.distanceTo(trail[0]) >= TSTEP) {
      trail.unshift(headPos.clone());
      let acc = 0;
      for (let i = 1; i < trail.length; i++) {
        acc += trail[i].distanceTo(trail[i - 1]);
        if (acc > L + 0.4) { trail.length = i + 1; break; }
      }
    }
  }
  const pt = (i) => (i === 0 ? headPos : trail[i - 1]);
  // 道の上で、点 c から直線距離 R の所（i0 の区間から先を探す）。見つけた区間の番号を返す
  function onTrail(c, R, i0, out) {
    const n = trail.length + 1;
    for (let i = Math.max(0, i0); i < n - 1; i++) {
      const a = pt(i); const b = pt(i + 1);
      const db = b.distanceTo(c);
      if (db < R) continue;
      // |a + t(b-a) - c| = R の、区間の中の解
      tmpV.subVectors(b, a); tmpW.subVectors(a, c);
      const A = tmpV.lengthSq(); const B = 2 * tmpV.dot(tmpW); const C = tmpW.lengthSq() - R * R;
      const disc = Math.max(0, B * B - 4 * A * C);
      const t = A > 1e-12 ? Math.min(1, Math.max(0, (-B + Math.sqrt(disc)) / (2 * A))) : 1;
      out.copy(a).addScaledVector(tmpV, t);
      return i;
    }
    // 道が足りない：最後の向きのまま伸ばす
    const a = pt(n - 2); const b = pt(n - 1);
    tmpV.subVectors(b, a).normalize();
    out.copy(c).addScaledVector(tmpV, R);
    return n - 2;
  }
  // 前の向き u0 に対して、u を最大 MAX_JOINT までに抑える
  function clampDir(u0, u) {
    const ang = Math.acos(Math.max(-1, Math.min(1, u0.dot(u))));
    if (ang > st.maxBend) st.maxBend = ang;
    if (ang <= MAX_JOINT) return;
    st.clamped++;
    axis.crossVectors(u0, u);
    if (axis.lengthSq() < 1e-12) axis.copy(UP);
    axis.normalize();
    u.copy(u0).applyAxisAngle(axis, MAX_JOINT);
  }
  // 上向きを、前の節から最小の回転で運ぶ（ねじれを出さない）
  function carryUp(uPrev, vPrev, u, out) {
    tq.setFromUnitVectors(uPrev, u);
    out.copy(vPrev).applyQuaternion(tq);
    out.addScaledVector(u, -out.dot(u)).normalize();
  }

  function steer(dt) {
    // 速さは加速度の上限で目標へ寄せる（技が切り替わっても速さが一瞬で変わらない。前は1コマで0.06→2.8になり、飛んで見えた）
    st.vel += THREE.MathUtils.clamp(st.speed - st.vel, -st.accel * dt, st.accel * dt);
    snout.copy(headPos).addScaledVector(dir, HL);
    desired.subVectors(st.target, snout);
    if (desired.lengthSq() > 1e-6) {
      desired.normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, dir.dot(desired))));
      // 胴が折れないよう、曲がりの半径を MIN_BEND より小さくしない（遅いときほど向きを変えにくい。狙いは首振りで補う）
      const maxRate = Math.min(st.turn, Math.max(st.vel, 0.05) / (st.minBend || MIN_BEND));
      // 曲がる速さも角加速度の上限で寄せる（急に向きを変え始めない・急に止めない）
      const want = Math.min(ang / Math.max(dt, 1e-4), maxRate);
      st.w = Math.min(maxRate, st.w + THREE.MathUtils.clamp(want - st.w, -st.alpha * dt, st.alpha * dt));
      if (ang > 1e-4 && st.w > 0) {
        axis.crossVectors(dir, desired);
        if (axis.lengthSq() < 1e-10) axis.copy(UP);
        axis.normalize();
        dir.applyAxisAngle(axis, Math.min(ang, st.w * dt)).normalize();
      }
    }
    headPos.addScaledVector(dir, st.vel * dt);
  }

  // ---- 技（act） ----
  const R = range; // 頭が動く範囲
  // 次の行き先：今の向きから左右 ±70°・上下 ±20°、0.6〜1.0 先（後ろへ急に折り返さない）。範囲の外へ出る先は中心の方へ寄せる
  function wander() {
    const yaw = (Math.random() * 2 - 1) * 70 * D2R; const pit = (Math.random() * 2 - 1) * 20 * D2R; const d = 0.6 + 0.4 * Math.random();
    tmpV.set(dir.x, 0, dir.z); if (tmpV.lengthSq() < 1e-6) tmpV.set(1, 0, 0);
    tmpV.normalize().applyAxisAngle(UP, yaw);
    st.target.copy(headPos).addScaledVector(tmpV, d * Math.cos(pit)); st.target.y += d * Math.sin(pit);
    const r = Math.hypot(st.target.x, st.target.z);
    if (r > R * 0.85) { st.target.x *= R * 0.85 / r; st.target.z *= R * 0.85 / r; }
    st.target.y = THREE.MathUtils.clamp(st.target.y, -yRange * 0.9, yRange * 0.9 + 0.05);
  }
  const ACTS = {
    // 登場：遠くから中心へまっすぐ泳いで来る（ゲームのボス戦の始まり）
    enter: { dur: 4.5, tick() {
      st.speed = 1.5; st.accel = 1.2; st.turn = 2.4; st.alpha = 2.4; st.neckRate = 1.0; st.wig = 0.03; st.wigSpd = 5; st.target.set(0, 0.1, 0); st.lookAmt = 0; st.pitchUp = 0.05; st.jawTarget = -0.1; st.jawK = 6;
    } },
    swim: { dur: 6, start() { wander(); }, tick(dt, ctx) {
      // 泳ぎの緩急：2.5〜5.5秒ごとに、速く泳ぐ・ゆったり漂う・ふつう を選び直す（速さは加速度の上限でゆっくり変わる）
      st.surgeT -= dt;
      if (st.surgeT <= 0) { st.surgeT = 2.5 + Math.random() * 3; const r = Math.random(); st.surge = r < 0.35 ? 1 : r < 0.6 ? -1 : 0; }
      st.speed = 0.5 + (st.surge > 0 ? 0.3 : st.surge < 0 ? -0.2 : 0); st.accel = 0.6; st.turn = 1.5; st.alpha = 1.8; st.neckRate = 1.0;
      st.wig = 0.04 + (st.surge > 0 ? 0.015 : 0); st.wigSpd = 4.2 + (st.surge > 0 ? 1.5 : st.surge < 0 ? -1.2 : 0);
      st.jawTarget = -0.12 + 0.07 * Math.sin(st.t * 1.7); st.jawK = 6;
      st.lookAmt = 0.25; st.look.copy(ctx.player); st.pitchUp = 0;
      if (headPos.distanceTo(st.target) < 0.35) wander();
    } },
    aim: { dur: 3.2, tick(dt, ctx) {
      // 狙う：ゆっくり泳ぎながら体ごと狙う先へ向きを変え（速さ0.28で曲がれる速さは毎秒約0.5rad）、首で合わせる
      // aimTight（ゲームの側が光線のぶつかり合いの間に立てる）：首を反らさず、速く正確に向ける（口から出る光線と頭の向きをそろえる）
      // 速さ0.42で曲がれる速さは毎秒約0.76rad（2秒の溜めで約87°）。首の左右は ±45° まで（ふだんは ±40°）
      // 狙う間は体を巻くように小さく曲がれる（最小半径0.25＝世界で約50。自機は口のまわり125〜190を回るので、ふつうの半径0.55では
      // 自機が曲がりの円の内側に入り、追っても回り込むだけで一度も向けなかった）。継ぎ目ごとの曲げの上限 25° はそのまま
      // aimHold（ゲームの側が狙いを固めた時と撃っている間に立てる）：ブレーキをかけて踏ん張り、首で追う（泳ぎながら撃つと口が動き、狙いがずれる）。
      // 場の外へ出かけたら速さを落とす（行き先を中心へ差し替えると、自機でなく中心へ向かってしまう）
      st.speed = st.aimHold ? 0.06 : (headPos.length() > R * 1.1 ? 0.22 : 0.42); st.accel = st.aimHold ? 1.6 : 0.9;
      st.turn = 1.8; st.alpha = 3; st.minBend = 0.25; st.neckRate = st.aimTight ? 2.2 : 1.4; st.neckYaw = 45; st.wig = 0.016; st.wigSpd = 7; st.target.copy(ctx.player);
      st.lookAmt = 1; st.look.copy(ctx.player); st.jawTarget = 0.12 + 0.05 * Math.sin(st.t * 9); st.jawK = 8; st.pitchUp = st.aimTight ? 0 : 0.12;
    } },
    lunge: { dur: 2.3, start(ctx) { st.lungeAt.copy(ctx.player); st.bit = false; }, tick(dt, ctx) {
      const t = st.t;
      st.look.copy(st.lungeAt); st.target.copy(st.lungeAt);
      if (t < 0.55) { // ため：ブレーキをかけて止まり、首を反らせて口を大きく開ける（予備動作）
        st.speed = 0.05; st.accel = 2.5; st.turn = 2.5; st.alpha = 3; st.neckRate = 1.5; st.wig = 0.01; st.pitchUp = 0.35 * (t / 0.55); st.jawTarget = 0.45; st.jawK = 7; st.lookAmt = 1;
      } else if (t < 1.05) { // 突進：0.2秒で最高の速さ（模型2.0/秒＝世界約400/秒）まで一気に加速し、首は前へ突き出す
        st.speed = 2.0; st.accel = 10; st.turn = 2.2; st.alpha = 5; st.neckRate = 2.5; st.wig = 0; st.pitchUp = 0; st.jawTarget = 0.5; st.jawK = 14; st.lookAmt = 1;
      } else { // 噛む → 勢いを殺しながら離れる（戻りの動作）
        if (!st.bit) { st.bit = true; st.events.push({ type: 'bite', at: snout.clone() }); }
        st.jawTarget = -0.42; st.jawK = 45; st.speed = THREE.MathUtils.lerp(1.0, 0.4, Math.min(1, (t - 1.05) / 0.8)); st.accel = 3; st.turn = 1.2; st.alpha = 2; st.neckRate = 1.2;
        st.lookAmt = 0.3;
        if (t > 1.2) st.target.set(-st.lungeAt.x * 0.5, 0.4, -st.lungeAt.z * 0.5);
      }
    } },
    coil: { dur: 7.5, start() { st.coilC.copy(headPos).add(new THREE.Vector3(0.62, 0, 0).applyAxisAngle(UP, Math.random() * Math.PI * 2)); st.coilC.y = Math.min(st.coilC.y, 0.3); st.coilA = Math.atan2(headPos.z - st.coilC.z, headPos.x - st.coilC.x); },
      tick(dt) {
        st.speed = 0.75; st.accel = 0.9; st.turn = 3.2; st.alpha = 3; st.neckRate = 1.0; st.wig = 0; st.jawTarget = -0.3; st.jawK = 6; st.lookAmt = 0; st.pitchUp = 0.1;
        st.coilA += dt * st.speed / 0.62;
        const y = st.coilC.y + 0.35 - 0.1 * st.t;
        st.target.set(st.coilC.x + Math.cos(st.coilA + 0.5) * 0.62, y, st.coilC.z + Math.sin(st.coilA + 0.5) * 0.62);
      } },
    roar: { dur: 2.8, tick(dt, ctx) {
      st.speed = 0.1; st.accel = 1.5; st.turn = 0.8; st.alpha = 1.5; st.neckRate = 1.4; st.wig = 0.01; st.target.copy(ctx.player); st.look.copy(ctx.player);
      const up = Math.min(1, st.t / 0.5);
      st.pitchUp = 0.55 * up; st.lookAmt = 0.4; st.jawTarget = st.t < 2.3 ? 0.62 : -0.35; st.jawK = st.t < 2.3 ? 9 : 30;
      st.shake = st.t > 0.4 && st.t < 2.3 ? 1 : 0;
      if (st.t > 0.4 && !st.roared) { st.roared = true; st.events.push({ type: 'roar' }); }
    }, start() { st.roared = false; } },
    // 戻り：大きな攻撃の後、頭を少し下げ、口を閉じて、ゆっくり泳ぐ（息を整える間。自機が反撃できる隙）
    recover: { dur: 1.2, tick() {
      st.speed = 0.22; st.accel = 1.2; st.turn = 1.0; st.alpha = 1.5; st.neckRate = 0.8; st.wig = 0.02; st.wigSpd = 3;
      st.lookAmt = 0.15; st.pitchUp = -0.1; st.jawTarget = -0.2; st.jawK = 4;
    } },
  };
  const AUTO = ['swim', 'aim', 'lunge', 'swim', 'coil', 'roar', 'swim', 'aim', 'lunge'];
  function act(name, ctx = { player: new THREE.Vector3(0, 0.3, 2.2) }, manual = true) {
    if (!ACTS[name]) return;
    if (manual) st.auto = false;
    st.act = name; st.t = 0; st.shake = 0;
    if (ACTS[name].start) ACTS[name].start(ctx);
  }

  // 砲台：狙う点（模型の座標）へ、節ごとの向きで回す。壊れた砲台は大きさ 0。壊れた瞬間は少し跳ねて消える
  const TM = new THREE.Matrix4(); const TMi = new THREE.Matrix4(); const TR = new THREE.Matrix4(); const TT = new THREE.Matrix4(); const tl = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function turretMatrix(k, out) {
    segMesh.getMatrixAt(k, TM);
    TT.makeTranslation(PIV.x, PIV.y + tur[k].pop, PIV.z);
    TR.makeRotationY(tur[k].yaw);
    out.copy(TM).multiply(TT).multiply(TR);
    TT.makeTranslation(-PIV.x, -PIV.y, -PIV.z);
    return out.multiply(TT);
  }
  function updateTurrets(dt) {
    for (let k = 0; k < NSEG; k++) {
      const t = tur[k];
      if (!t.alive) { turMesh.setMatrixAt(k, ZERO); continue; }
      if (turAim) {
        segMesh.getMatrixAt(k, TM); TMi.copy(TM).invert();
        tl.copy(turTarget).applyMatrix4(TMi);
        const want = Math.atan2(tl.x - PIV.x, tl.z - PIV.z);
        let d = want - t.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        t.yaw += Math.sign(d) * Math.min(Math.abs(d), 2.6 * dt);
      }
      turMesh.setMatrixAt(k, turretMatrix(k, m4));
    }
    turMesh.instanceMatrix.needsUpdate = true;
  }

  const look = new THREE.Vector3(); const hq = new THREE.Quaternion(); const e = new THREE.Euler();
  const HB = new THREE.Matrix4(); const HBi = new THREE.Matrix4(); const hs = new THREE.Vector3(); const hu = new THREE.Vector3();
  function update(dt, ctx) {
    dt = Math.min(dt, 1 / 20);
    st.t += dt;
    const A = ACTS[st.act];
    st.minBend = MIN_BEND; // 技が変えない限り、曲がりの最小半径はふつう
    A.tick(dt, ctx);
    if (st.t > A.dur) {
      if (st.auto) { st.autoI = (st.autoI + 1) % AUTO.length; act(AUTO[st.autoI], ctx, false); } else act('swim', ctx, false);
    }
    // 光の強さ：ふだんは弱く、狙う・ため・咆哮で強まる
    const glowT = { swim: 0.45, aim: 0.9, lunge: st.t < 1.05 ? 1.1 : 0.5, coil: 0.35, roar: 1.3 }[st.act];
    glow.value = THREE.MathUtils.damp(glow.value, glowT ?? 0.45, 3, dt);
    hitU.value = Math.max(0, hitU.value - dt * 4);
    heatU.value = Math.max(0, heatU.value - dt * 0.5);
    time.value += dt;
    if (headPos.length() > R * 1.25 && st.act !== 'aim') st.target.multiplyScalar(0.3); // 狙う間は行き先を差し替えない（速さを落とす）
    steer(dt);
    pushTrail();
    st.wigPhase += dt * st.wigSpd;
    st.maxBend = 0; st.clamped = 0;

    // 頭：進む向きを基に、狙う向きへ首を振る（±40度まで）、反らせる、震わせる。後ろの軸点のまわりに回る
    // 頭の上向きは、前のコマの上向きを進む向きの変化の分だけ回して運び（ねじれを出さない）、世界の上へは毎秒1.2radまでで戻す。
    // 毎コマ世界の上から作ると、真上・真下を向いた瞬間に上向きが反転し、体じゅうが1コマで180°回って瞬間移動に見えた（口が1コマで約15動いた）
    tq.setFromUnitVectors(st.hDir, dir);
    hu.copy(st.hUp).applyQuaternion(tq);
    hu.addScaledVector(dir, -hu.dot(dir));
    if (hu.lengthSq() < 1e-8) hu.copy(UP).addScaledVector(dir, -UP.dot(dir));
    if (hu.lengthSq() < 1e-8) hu.set(1, 0, 0);
    hu.normalize();
    tmpV.copy(UP).addScaledVector(dir, -UP.dot(dir));
    if (tmpV.lengthSq() > 0.04) { // 真上・真下の近くでは戻さない（戻す向きが定まらない）
      tmpV.normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, hu.dot(tmpV))));
      if (ang > 1e-4) {
        axis.crossVectors(hu, tmpV);
        hu.applyAxisAngle(dir, (axis.dot(dir) >= 0 ? 1 : -1) * Math.min(ang, 1.2 * dt)).normalize();
      }
    }
    st.hUp.copy(hu); st.hDir.copy(dir);
    hs.crossVectors(hu, dir).normalize();
    HB.makeBasis(hs, hu, dir).setPosition(headPos);
    HBi.copy(HB).invert();
    look.copy(st.look).applyMatrix4(HBi);
    // 見る量はゆっくり寄せ（0.25→1 のように技で跳ねても首が鞭のように振れない）、角度はばね（臨界減衰）で追い、角速度は neckRate まで
    st.lookCur = THREE.MathUtils.damp(st.lookCur, st.lookAmt, 2.5, dt);
    const yMax = (st.act === 'aim' ? st.neckYaw || 40 : 40) * D2R;
    const yaw = THREE.MathUtils.clamp(Math.atan2(look.x, look.z), -yMax, yMax) * st.lookCur;
    const pitch = THREE.MathUtils.clamp(Math.atan2(look.y, Math.hypot(look.x, look.z)), -35 * D2R, 35 * D2R) * st.lookCur + st.pitchUp;
    const NK = 30; const NC = 2 * Math.sqrt(NK);
    st.yawV = THREE.MathUtils.clamp(st.yawV + ((yaw - st.curYaw) * NK - st.yawV * NC) * dt, -st.neckRate, st.neckRate);
    st.pitchV = THREE.MathUtils.clamp(st.pitchV + ((pitch - st.curPitch) * NK - st.pitchV * NC) * dt, -st.neckRate, st.neckRate);
    st.curYaw += st.yawV * dt; st.curPitch += st.pitchV * dt;
    const sh = st.shake ? (Math.sin(st.t * 61) * 0.03 + Math.sin(st.t * 37) * 0.02) : 0;
    e.set(-st.curPitch + sh, st.curYaw, sh * 0.6);
    hq.setFromEuler(e);
    HB.multiply(m4.makeRotationFromQuaternion(hq));
    U[0].setFromMatrixColumn(HB, 2); V[0].setFromMatrixColumn(HB, 1);
    headGroup.matrix.copy(HB); headGroup.matrixWorldNeedsUpdate = true;

    // 胴：軸点を道の上に、前の軸点から節の長さ（直線）の所へ順に置く。横へうねりを足し、継ぎ目の曲げを上限で抑える
    J[0].copy(headPos);
    let idx = 0; let s = 0;
    for (let k = 0; k <= NSEG; k++) {
      const len = k < NSEG ? LEN[k] : TL * 0.55;   // 最後は尾の向きを決める距離
      idx = onTrail(J[k], len, idx, tmpW);
      s += len;
      const env = THREE.MathUtils.smoothstep(s / L, 0.08, 0.3) * (1 - 0.35 * s / L);
      side.crossVectors(V[k], U[k]).normalize();
      tmpW.addScaledVector(side, st.wig * env * Math.sin(s / st.wigLen * Math.PI * 2 - st.wigPhase));
      const u = U[k + 1].subVectors(J[k], tmpW).normalize();
      clampDir(U[k], u);
      carryUp(U[k], V[k], u, V[k + 1]);
      if (k < NSEG) J[k + 1].copy(J[k]).addScaledVector(u, -len);
    }
    // 節・尾・目印の置き方
    for (let k = 0; k < NSEG; k++) {
      side.crossVectors(V[k + 1], U[k + 1]).normalize();
      m4.makeBasis(side, V[k + 1], U[k + 1]);
      sv.setScalar(SCALE[k]); m4.scale(sv);
      m4.setPosition(tmpV.addVectors(J[k], J[k + 1]).multiplyScalar(0.5));
      segMesh.setMatrixAt(k, m4);
    }
    segMesh.instanceMatrix.needsUpdate = true;
    if (turMesh) updateTurrets(dt);
    side.crossVectors(V[NSEG + 1], U[NSEG + 1]).normalize();
    tailMesh.matrix.makeBasis(side, V[NSEG + 1], U[NSEG + 1]).setPosition(J[NSEG]); tailMesh.matrixWorldNeedsUpdate = true;
    for (let k = 0; k <= NSEG; k++) {
      side.crossVectors(V[k + 1], U[k + 1]).normalize();
      bones[k].matrix.makeBasis(side, V[k + 1], U[k + 1]).setPosition(J[k]);
      bones[k].matrixWorld.multiplyMatrices(root.matrixWorld, bones[k].matrix);
    }

    // 下顎：ばねで目標へ。手で動かすときはその値。蝶番は頭の座標
    const jt = st.jawManual != null ? st.jawManual : st.jawTarget;
    st.jaw += (jt - st.jaw) * (1 - Math.exp(-st.jawK * dt));
    jawPivot.rotation.x = st.jaw;
    snout.set(0, 0, HL).applyMatrix4(HB);
    const ev = st.events; st.events = [];
    return ev;
  }
  update(0.016, { player: new THREE.Vector3(0, 0.3, 2.2) });

  return {
    // maxBendDeg は抑える前の曲げの最大（道とうねりと首振りが求めた角度）、bendDegs は抑えた後の継ぎ目ごとの実際の角度
    debug: { HL, TL, L, LEN, joints: () => J.map((p) => p.toArray().map((x) => +x.toFixed(4))), get maxBendDeg() { return st.maxBend / D2R; }, get clamped() { return st.clamped; },
      bendDegs: () => U.slice(1).map((u, i) => Math.acos(Math.max(-1, Math.min(1, U[i].dot(u)))) / D2R) },
    object: root, mesh: segMesh, turrets: turMesh, head: headGroup, jaw: jawPivot, tail: tailMesh, bones, st, act, update, ACTS: Object.keys(ACTS),
    // 背の砲台：狙う点（模型の座標。null で止める）、生きているか、壊す、砲台の中心と砲口（root の外の座標）
    aimTurrets: (p) => { turAim = !!p; if (p) turTarget.copy(p); },
    turretAlive: (k) => !!turMesh && tur[k].alive,
    killTurret: (k) => { if (tur[k]) tur[k].alive = false; },
    turretCenter: (k, out) => { turretMatrix(k, TM); return out.set(PIV.x, PIV.y + 0.014, PIV.z + 0.008).applyMatrix4(TM).applyMatrix4(root.matrixWorld); },
    turretMuzzle: (k, outPos, outDir) => {
      turretMatrix(k, TM);
      outPos.copy(MUZ).applyMatrix4(TM).applyMatrix4(root.matrixWorld);
      if (outDir) outDir.set(0, 0, 1).transformDirection(TM).transformDirection(root.matrixWorld);
      return outPos;
    },
    headWorld: (out) => out.copy(snout).applyMatrix4(root.matrixWorld),
    // ゲームから使う：頭・節・尾の置き方（模型の座標）、口の位置と向き（root の外の座標）、被弾の光、置き直し
    headMatrix: () => HB, tailMatrix: () => tailMesh.matrix, segMatrix: (k, out) => { segMesh.getMatrixAt(k, out); return out; }, nseg: NSEG, scaleOf: (k) => SCALE[k],
    mouth: (outPos, outDir) => {
      outPos.set(0, -0.035, HL * 0.8).applyMatrix4(HB).applyMatrix4(root.matrixWorld);
      if (outDir) outDir.copy(U[0]).transformDirection(root.matrixWorld);
      return outPos;
    },
    flash: (v = 1) => { hitU.value = Math.max(hitU.value, v); },
    // 頭と顎の装甲が熱で赤く光る（光線を口へ押し込まれた時）。0..1、2秒ほどで冷める
    heat: (v = 1) => { heatU.value = Math.max(heatU.value, v); },
    place: (pos, d) => {
      headPos.copy(pos); dir.copy(d).normalize(); trail.length = 0;
      st.hDir.copy(dir); st.hUp.copy(UP).addScaledVector(dir, -UP.dot(dir)).normalize(); st.vel = 0.5; st.w = 0;
      for (let s = TSTEP; s < L + 0.3; s += TSTEP) trail.push(headPos.clone().addScaledVector(dir, -s));
    },
    setJaw: (a) => { st.jawManual = a; },
    setAuto: (on) => { st.auto = on; },
  };
}

// 色・法線・溝の影/粗さ/金属度（orm）・発光の画像の材質。通気口ごとに位相のずれた脈動と、時々弱まるゆらぎ。全体の強さ uGlow は技で変わる
// WebGPU 版：物理材質の node 版。粗さの細かいむらは roughnessNode、脈動は emissiveNode で書く。glow・time・hitU は { value } のまま受ける
let detailTex = null;
const bridged = new WeakMap();
const uOf = (u) => { if (!bridged.has(u)) bridged.set(u, uniform(u.value).onRenderUpdate(() => u.value)); return bridged.get(u); };
function partMaterial(m, envMap, glow, time, key, hitU = null, heatU = null) {
  if (!detailTex) {
    detailTex = new THREE.TextureLoader().load('./assets/airframes/detail.jpg');
    detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.colorSpace = THREE.NoColorSpace;
  }
  const mat = new THREE.MeshPhysicalNodeMaterial({
    map: m.color || null, normalMap: m.normal || null, aoMap: m.orm || null, aoMapIntensity: 1,
    roughnessMap: m.orm || null, metalnessMap: m.orm || null, emissiveMap: m.emissive || null,
    color: m.color ? 0xffffff : 0x3a3c42, roughness: 1, metalness: 1,
    emissive: new THREE.Color(0xb8ff3a), emissiveIntensity: m.emissive ? 1.25 : 0,
    envMap, envMapIntensity: 0.7, clearcoat: 0.1, clearcoatRoughness: 0.5,
  });
  mat.name = `serpent2_${key}`;
  const uGlow = uOf(glow); const uTime = uOf(time);
  // 模型の座標。並べた節は置き場所でずらして、節ごとに模様と脈動の位相を変える
  const restP = Fn((builder) => (builder.object && builder.object.isInstancedMesh
    ? positionGeometry.add(referenceAttribute('instanceMatrix', 'mat4').mul(vec4(0.0, 0.0, 0.0, 1.0)).xyz.mul(5.0))
    : positionGeometry))().toVarying('vRestP');
  const dtl = texture(detailTex, restP.xz.mul(22.0).add(restP.y.mul(7.0))).rgb;
  mat.roughnessNode = clamp(materialRoughness.add(dtl.b.sub(0.5).mul(0.12)).add(dtl.g.mul(0.04)), 0.12, 1.0);
  const ph = fract(sin(dot(floor(restP.mul(30.0)), vec3(12.9898, 78.233, 37.719))).mul(43758.5453));
  const pulse = sin(uTime.mul(ph.mul(1.6).add(1.2)).add(ph.mul(6.2831))).mul(0.5).add(0.5);
  const flick = step(0.08, fract(sin(floor(uTime.mul(7.0).add(ph.mul(40.0)))).mul(9134.7))).mul(0.28).add(0.72);
  let em = vec3(materialEmissive).mul(uGlow.mul(pulse.mul(0.75).add(0.25))).mul(flick);
  if (hitU) em = em.add(vec3(1.0, 0.85, 0.7).mul(uOf(hitU)).mul(0.35));
  // 熱：頭と顎が赤く焼ける（uHeat の2乗で強まり、模様で揺らぐ）
  if (heatU) {
    const uHeat = uOf(heatU);
    const hn = sin(restP.x.mul(90.0).add(uTime.mul(9.0))).mul(sin(restP.z.mul(70.0).sub(uTime.mul(7.0)))).mul(0.45).add(0.55);
    // 熱：縁（輪郭に近い面）と角だけが赤く光る。面の正面まで光らせると頭全体が白っぽく飛ぶ
    const hf0 = clamp(abs(dot(normalView, positionViewDirection)), 0.0, 1.0).oneMinus();
    const hf = hf0.mul(hf0);
    em = em.add(vec3(1.0, 0.3, 0.05).mul(uHeat.mul(uHeat)).mul(hf.mul(1.1).add(0.15)).mul(hn));
  }
  mat.emissiveNode = em;
  return mat;
}
