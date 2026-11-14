import * as THREE from 'three';

// 機体の可動部。1つの形に骨を入れ、翼・補助翼・尾翼（と前翼）を蝶番の線のまわりに回す。
// どこが動くかは src/airframes.js の定義で決まる。エンジンの骨は重みを持たず、炎の首振りだけに使う。

const X_AXIS = new THREE.Vector3(1, 0, 0);

function hingeBone(def, sg, parent, parentP) {
  const bone = new THREE.Bone();
  const [a, b] = def.hinge;
  const P = new THREE.Vector3(sg * a[0], a[1], a[2]);
  bone.position.copy(P).sub(parentP);
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  if (sg < 0) {
    d.x = -d.x;
    if (!def.same) d.negate();
  }
  bone.userData.base = new THREE.Quaternion().setFromUnitVectors(X_AXIS, d);
  bone.quaternion.copy(bone.userData.base);
  parent.add(bone);
  return bone;
}

const qHinge = new THREE.Quaternion();
function setHinge(bone, angle) {
  if (!bone.userData.base) return;
  qHinge.setFromAxisAngle(X_AXIS, angle);
  bone.quaternion.copy(bone.userData.base).multiply(qHinge);
}

const inBox = (b, ax, y, z) => ax >= b.x[0] && ax <= b.x[1] && y >= b.y[0] && y <= b.y[1] && z >= b.z[0] && z <= b.z[1];

function bonesFor(sg, root, frame, tipPoint) {
  const W = new THREE.Vector3(sg * frame.wing.root[0], frame.wing.root[1], frame.wing.root[2]);
  const wing = new THREE.Bone();
  wing.position.copy(W);
  root.add(wing);
  const zero = new THREE.Vector3();
  const aileron = frame.aileron ? hingeBone(frame.aileron, sg, wing, W) : new THREE.Bone();
  const fin = frame.fin
    ? (frame.fin.parent === 'wing' ? hingeBone(frame.fin, sg, wing, W) : hingeBone(frame.fin, sg, root, zero))
    : new THREE.Bone();
  const canard = frame.canard ? hingeBone(frame.canard, sg, root, zero) : new THREE.Bone();
  if (!frame.aileron) wing.add(aileron);
  if (!frame.fin) wing.add(fin);
  if (!frame.canard) root.add(canard);
  const n = frame.nozzles[0];
  const nacelle = new THREE.Bone();
  nacelle.position.set(sg * n[0], n[1], n[2]);
  root.add(nacelle);
  // 翼端の印：翼の骨について動く（雲の出どころ）
  const tip = new THREE.Object3D();
  tip.position.copy(tipPoint).sub(W);
  wing.add(tip);
  return { wing, aileron, fin, canard, nacelle, tip, sign: sg };
}

export function rigShip({ shipRoot, bodyMesh, frame }) {
  const g = bodyMesh.geometry.clone();
  const pos = g.attributes.position;
  // 翼端の点を、左右それぞれの一番外の頂点から決める
  const tipOf = (sg) => {
    let best = -1; const t = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) * sg;
      if (x > best) { best = x; t.set(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    }
    return t;
  };
  const root = new THREE.Bone();
  shipRoot.add(root);
  const tipR = tipOf(1); const tipL = tipOf(-1);
  const R = bonesFor(1, root, frame, tipR);
  const L = bonesFor(-1, root, frame, tipL);
  const bones = [root, R.wing, R.aileron, R.fin, R.canard, R.nacelle, L.wing, L.aileron, L.fin, L.canard, L.nacelle];
  const IDX = { 1: { wing: 1, aileron: 2, fin: 3, canard: 4 }, '-1': { wing: 6, aileron: 7, fin: 8, canard: 9 } };

  const skinIndex = new Uint16Array(pos.count * 4);
  const skinWeight = new Float32Array(pos.count * 4);
  const counts = { wing: 0, aileron: 0, fin: 0, canard: 0 };
  const ail = frame.aileron;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const y = pos.getY(i); const z = pos.getZ(i);
    const sg = x >= 0 ? 1 : -1;
    const ax = Math.abs(x);
    const b = IDX[sg];
    let bone = 0;
    if (frame.fin && inBox(frame.fin.box, ax, y, z)) { bone = b.fin; counts.fin++; }
    else if (ail && inBox(ail.box, ax, y, z) && (!ail.behind || z < ail.hinge[0][2] + (ax - ail.hinge[0][0]) / (ail.hinge[1][0] - ail.hinge[0][0]) * (ail.hinge[1][2] - ail.hinge[0][2]))) { bone = b.aileron; counts.aileron++; }
    else if (inBox(frame.wing.box, ax, y, z)) { bone = b.wing; counts.wing++; }
    else if (frame.canard && inBox(frame.canard.box, ax, y, z)) { bone = b.canard; counts.canard++; }
    skinIndex[i * 4] = bone;
    skinWeight[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));

  const skinned = new THREE.SkinnedMesh(g, bodyMesh.material);
  skinned.name = bodyMesh.name;
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.layers.enable(1);
  skinned.frustumCulled = false;
  shipRoot.add(skinned);
  bodyMesh.parent.remove(bodyMesh);
  shipRoot.updateMatrixWorld(true);
  skinned.bind(new THREE.Skeleton(bones), skinned.matrixWorld);

  // 航法灯：翼端の点に付ける（翼の骨についていく）
  const glowTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const glow = (color, size, opacity = 1) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false, toneMapped: false }));
    sp.scale.setScalar(size);
    return sp;
  };
  const navLights = [];
  for (const [side, color] of [[R, 0x33ff66], [L, 0xff2a22]]) {
    const nav = glow(color, 0.05); side.tip.add(nav);
    const flash = glow(0xffffff, 0.085, 0.8); flash.visible = false; side.tip.add(flash);
    navLights.push({ nav, flash });
  }

  let close = 0;

  // pitch/yaw/roll は -1..1（回転速度を上限で割った値）。+pitch は機首下げ、+yaw は画面の左、+roll は右回り
  // 重い機体のように、ゆっくり動き出し行き過ぎずに止まる追いかけ。w は速さ、z は止まりやすさ（1 で行き過ぎない）
  const springs = {};
  const spring = (name, target, dt, w = 9, z = 0.42) => {
    const sp = springs[name] || (springs[name] = { x: 0, v: 0 });
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      sp.v += (w * w * (target - sp.x) - 2 * z * w * sp.v) * h;
      sp.x += sp.v * h;
    }
    return sp.x;
  };
  let prevBoost = 0;
  const pose = { bank: 0, lean: 0, yawTwist: 0, x: 0, y: 0, z: 0 };

  function update(state, fly, rates) {
    const dt = state.dt || 1 / 60;
    const boost = state.boostAmount;
    const t = state.time;
    // 操作の強さを、ばねで追う（入力の切り替えで少し行き過ぎて戻る）
    const pitch = spring('pitch', rates.pitch, dt, 3.0, 0.95);
    const yaw = spring('yaw', rates.yaw, dt, 2.6, 0.95);
    const roll = spring('roll', rates.roll, dt, 3.4, 0.95);
    // 踏み込みと戻しの瞬間の勢い
    const kickIn = dt > 0 ? (boost - prevBoost) / dt : 0;
    prevBoost = boost;
    const kick = spring('kick', Math.max(-1, Math.min(1, kickIn / 2.2)), dt, 3.2, 0.85);
    // 高速の小さな振動（翼と尾翼が生きて見える）
    const buzz = boost * 0.012 * Math.sin(t * 47.0) + 0.002 * Math.sin(t * 13.0);

    // 機体の姿勢：旋回で内側へ傾き、上下で機首を振り、旋回の外へ少し滑る。止まると行き過ぎて戻る
    // 何もしなくても、気流に揉まれて常に小さく揺れる（周期の違う波を重ねて、繰り返しに見せない）。ときどき大きめの揺れが来る
    const gust = Math.sin(t * 0.23) * Math.sin(t * 0.59 + 0.7);
    const swayB = 0.016 * Math.sin(t * 0.43) + 0.006 * Math.sin(t * 0.97 + 1.0) + 0.022 * gust;
    const swayP = 0.008 * Math.sin(t * 0.51 + 0.5) + 0.003 * Math.sin(t * 1.1);
    // 被弾と発砲の反動：ばねで揺れて戻る
    const hitR = spring('hitR', 0, dt, 5.5, 0.7);
    const hitP = spring('hitP', 0, dt, 5, 0.75);
    const hitX = spring('hitX', 0, dt, 4, 0.8);
    const rec = spring('rec', 0, dt, 12, 0.9);
    pose.bank = -yaw * 0.62 + roll * 0.10 + swayB + hitR;
    pose.lean = pitch * 0.20 - kick * 0.10 + swayP + hitP - rec * 0.35;
    pose.yawTwist = yaw * 0.12 + 0.005 * Math.sin(t * 0.37 + 1.2) + hitX * 0.25;
    pose.x = yaw * 0.2 + 0.012 * Math.sin(t * 0.29) + 0.016 * gust + hitX;
    pose.y = -pitch * 0.12 + 0.014 * Math.sin(t * 0.53) + 0.004 * Math.sin(t * 1.3 + 0.8) + hitP * 0.1;
    pose.z = kick * 0.14 - rec + 0.008 * Math.sin(t * 0.21);

    // ブーストで翼を閉じる量。少し遅れて動き、閉じきる手前でゆっくりになる
    close += (boost - close) * Math.min(1, dt * 3.2);
    const c = close * close * (3 - 2 * close);
    const breathe = 0.012 * Math.sin(t * 1.3) + 0.008 * gust;
    // 引き起こしの重さで翼がしなる（ばねで遅れる）
    const g = spring('g', -rates.pitch * 0.7 + Math.abs(rates.yaw) * 0.3, dt, 3.5, 0.8);
    for (const s of [R, L]) {
      const sg = s.sign;
      // 翼：ブーストで機体へ寄せるように下げる。引き起こしと回転でしなる
      s.wing.rotation.set(0, 0, sg * (0.10 * g - frame.wing.boostFold * c + sg * 0.08 * roll + breathe + buzz));
      // 補助翼：回転で左右逆に、上下で同じ向きに動く（+ は後ろの縁が上）
      // 何もしなくても、姿勢を保つために細かく当て舵を続ける
      const trim = 0.03 * Math.sin(t * 0.7 + sg * 1.1) + 0.012 * Math.sin(t * 1.5 + sg * 0.4) - sg * swayB * 1.2;
      const ail = (-pitch * 0.62 - sg * roll * 0.85 - sg * yaw * 0.25 + trim) * (1 - 0.5 * c) + buzz * 2.0;
      setHinge(s.aileron, ail * 0.6);
      // 尾翼：方向舵は旋回で切る。翼端の小翼はブーストで下へ折れ、旋回で左右逆に動く
      if (frame.fin) {
        const rudder = (yaw * 0.6 + 0.02 * Math.sin(t * 0.6 + sg * 0.9) - swayB * 0.4) * (1 - 0.6 * c);
        setHinge(s.fin, frame.fin.same ? rudder : 0.55 * c - sg * rudder * 0.6 + buzz * 2.0);
      }
      // 前翼：機首の上げ下げに先回りして大きく動く
      if (frame.canard) setHinge(s.canard, pitch * 0.45 - sg * roll * 0.2 + trim * 0.6);
      // 噴射の向き：曲がる向きへ炎を振る
      s.nacelle.rotation.set(
        pitch * 0.42 + sg * roll * 0.22 + 0.08 * kick + 0.004 * Math.sin(t * 0.7 + sg),
        yaw * 0.36 + 0.004 * Math.sin(t * 0.57 + sg * 2.0),
        0,
      );
    }

    // 航法灯：翼端の赤と緑はゆっくり明滅し、白い閃光が2回ずつ走る
    const pulse = 0.72 + 0.28 * Math.sin(t * 1.4);
    const cyc = t % 1.6;
    const strobe = (cyc < 0.05 || (cyc > 0.16 && cyc < 0.21)) ? 1 : 0;
    for (const l of navLights) {
      l.nav.material.opacity = pulse;
      l.flash.visible = strobe > 0;
    }
    void fly;
  }

  // 被弾：大きさ k（0〜1）で機体が弾かれて揺れ戻る。発砲：機体が少し後ろへ押される
  function bump(name, v) { const sp = springs[name] || (springs[name] = { x: 0, v: 0 }); sp.v += v; }
  function jolt(k) {
    const a = Math.random() < 0.5 ? -1 : 1;
    bump('hitR', a * 1.5 * k);
    bump('hitP', (Math.random() - 0.3) * 0.9 * k);
    bump('hitX', -a * 0.5 * k);
  }
  function recoil(k) { bump('rec', 0.25 * k); }


  return { update, pose, jolt, recoil, reset() { close = 0; prevBoost = 0; for (const k in springs) delete springs[k]; }, skinned, R, L, counts, sideBones: (x) => (x >= 0 ? R : L) };
}
