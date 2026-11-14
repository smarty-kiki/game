import * as THREE from 'three';
import { KIND } from './puffs.js';
import { rotate } from '../flightState.js';

// 機体が出す粒をまとめる。噴射の熱、翼端の雲、音速の蒸気、着弾と爆発。

const v3 = new THREE.Vector3();

export function createShipFx({ puffs, anchors, rig }) {
  const nozzles = [anchors.nozzleR, anchors.nozzleL];
  const finTips = [new THREE.Vector3(0.49, 0.0, -0.40), new THREE.Vector3(-0.49, 0.0, -0.40)];
  let lastShock = 0;
  let acc = { exhaust: 0, tip: 0, shed: 0, ember: 0 };
  const blasts = []; // 歪みと光に使う爆発の記録
  const debris = []; // 火と煙を引いて飛ぶ破片（世界の座標で持つ）

  const R = puffs.rnd;
  const onSphere = () => {
    const z = R() * 2 - 1; const a = R() * Math.PI * 2; const r = Math.sqrt(1 - z * z);
    return [Math.cos(a) * r, Math.sin(a) * r, z];
  };

  // 音速突破：機体を包む円錐の蒸気と、外へ広がる白い襟
  function sonicBoom(q, fw) {
    // 芯の閃光
    void fw;
  }

  function updateDebris(dt) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.age += dt;
      if (d.age > d.life) { debris.splice(i, 1); continue; }
      const k = Math.exp(-dt * 0.8);
      for (let j = 0; j < 3; j++) { d.v[j] = d.v[j] * k + d.c[j] * dt; d.w[j] += d.v[j] * dt; }
      const rel = [d.w[0] - puffs.far[0], d.w[1] - puffs.far[1], d.w[2] - puffs.far[2]];
      d.acc += Math.hypot(d.v[0], d.v[1], d.v[2]) * dt;
      const gap = 0.16 + d.size * 0.7;
      const burn = 1 - d.age / d.life;
      while (d.acc > gap) {
        d.acc -= gap;
        if (burn > 0.3) puffs.puff(rel, [(R() - 0.5) * 0.5, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5], 0.16 + R() * 0.14, d.size * 1.3, d.size * 1.8 * burn, KIND.FIRE, 2, 1);
        puffs.puff(rel, [(R() - 0.5) * 0.6, (R() - 0.5) * 0.6, (R() - 0.5) * 0.6], 0.5 + R() * 0.5, d.size * 0.7, d.size * (1.4 + 1.2 * burn), KIND.SOOT, 0.8, 1, 0.03);
      }
    }
  }

  function update(state, fly, forward, dt, rates) {
    if (dt <= 0) return;
    updateDebris(dt);
    const q = fly.q;
    const boost = state.boostAmount;

    if (state.shockCount !== lastShock) {
      if (state.shockCount > lastShock) sonicBoom(q, forward);
      lastShock = state.shockCount;
    }

    const back = rotate(q, [0, 0, -1]);

    // 翼端の雲：ブーストと急旋回で太く出る。機体が曲がれば曲がって残る
    const g = Math.min(1, Math.abs(rates.pitch) + Math.abs(rates.yaw) * 0.6 + Math.abs(rates.roll) * 0.4);
    const tipRate = Math.max(0, g - 0.45) * 420;
    acc.tip += dt * tipRate;
    while (acc.tip >= 1) {
      acc.tip -= 1;
      const side = R() < 0.5 ? 1 : -1;
      const tip = side > 0 ? rig.R.tip : rig.L.tip;
      v3.setFromMatrixPosition(tip.matrixWorld);
      // 1コマの間に機体が進んだ分へ散らして、粒が固まらないようにする
      const f = R() * fly.speed * 0.055 * dt;
      const p = [v3.x + back[0] * f, v3.y + back[1] * f, v3.z + back[2] * f];
      const w = 0.12 + R() * 0.2;
      puffs.puff(p, [back[0] * w + (R() - 0.5) * 0.12, back[1] * w + (R() - 0.5) * 0.12, back[2] * w + (R() - 0.5) * 0.12],
        0.30 + 0.28 * boost + R() * 0.12, 0.012 + R() * 0.008, 0.035 + 0.04 * boost + R() * 0.02, KIND.VAPOR, 0.3);
    }

    // 装甲の隙間から飛ぶ火の粉
    acc.ember += dt * (2 + 70 * boost);
    while (acc.ember >= 1) {
      acc.ember -= 1;
      const n = nozzles[R() < 0.5 ? 0 : 1];
      const th = R() * Math.PI * 2;
      const r0 = 0.085 + R() * 0.05;
      const p = rotate(q, [n.x + Math.cos(th) * r0, n.y + Math.sin(th) * r0, n.z + 0.02]);
      const out = 0.25 + R() * 0.8;
      const v = rotate(q, [Math.cos(th) * out, Math.sin(th) * out, -0.8 - R() * 1.5]);
      puffs.spark(p, v, 0.25 + R() * 0.45, 0.0035 + R() * 0.003, 0.012, 0, 1.2, 0);
    }

    for (const b of blasts) b.age += dt;
    while (blasts.length && blasts[0].age > 1.0) blasts.shift();
  }

  // 小さな着弾：火花と小さな炎と砕けた煙
  function hitSmall(rel, normal, tint = 1) {
    // 当たった瞬間の青白い閃光、岩の破片の火花、小さな炎、砕けた煙
    puffs.puff(rel, [0, 0, 0], 0.07, 0.7, 2.2, KIND.FLASH, 0, 1);
    puffs.puff(rel, [normal[0] * 1.5, normal[1] * 1.5, normal[2] * 1.5], 0.14, 0.5, 1.4, KIND.FLASH, 1, 1, 0.02);
    for (let i = 0; i < 22; i++) {
      const d = onSphere();
      const sp = 10 + R() * 34;
      puffs.spark(rel, [(normal[0] + d[0] * 0.9) * sp, (normal[1] + d[1] * 0.9) * sp, (normal[2] + d[2] * 0.9) * sp], 0.25 + R() * 0.45, 0.07, 0.02, R() < 0.5 ? tint : 0, 3.2, 1);
    }
    for (let i = 0; i < 5; i++) {
      const d = onSphere();
      const sp = 2 + R() * 6;
      puffs.puff(rel, [(normal[0] + d[0] * 0.7) * sp, (normal[1] + d[1] * 0.7) * sp, (normal[2] + d[2] * 0.7) * sp], 0.22 + R() * 0.22, 0.25, 0.85, KIND.FIRE, 3, 1);
    }
    for (let i = 0; i < 4; i++) {
      const d = onSphere();
      puffs.puff(rel, [normal[0] * 3 + d[0], normal[1] * 3 + d[1], normal[2] * 3 + d[2]], 0.8 + R() * 0.8, 0.4, 1.9, KIND.SOOT, 1.2, 1);
    }
    blasts.push({ rel: rel.slice(), far: puffs.far.slice(), size: 0.6, age: 0.25 });
  }

  // 光線が当たり続ける所：吹き出す火花と炎
  function hitBeam(rel, normal, dt) {
    const n = Math.ceil(dt * 620);
    for (let i = 0; i < n; i++) {
      const d = onSphere();
      const sp = 12 + R() * 42;
      puffs.spark(rel, [(normal[0] + d[0] * 0.7) * sp, (normal[1] + d[1] * 0.7) * sp, (normal[2] + d[2] * 0.7) * sp], 0.3 + R() * 0.6, 0.075, 0.03, R() < 0.4 ? 1 : 0, 3.0, 1);
    }
    const m = Math.ceil(dt * 150);
    puffs.puff(rel, [0, 0, 0], 0.07, 3.5, 7.0, KIND.FLASH, 0, 1);
    for (let i = 0; i < m; i++) {
      const d = onSphere();
      const sp = 5 + R() * 12;
      puffs.puff(rel, [(normal[0] + d[0] * 0.6) * sp, (normal[1] + d[1] * 0.6) * sp, (normal[2] + d[2] * 0.6) * sp], 0.45 + R() * 0.6, 0.9, 3.6, R() < 0.75 ? KIND.FIRE : KIND.SMOKE, 2.2, 1);
    }
  }

  // 大きな爆発。宇宙なので煙は立ちのぼらず、球のまま広がって薄れる。順に：
  // ほんの一瞬の閃光 → 内側から照らされる火の玉（形は偏る） → 火を飲み込む暗い煤。
  // 同時に、球の殻の衝撃の輪が走り、破片が火の筋を引いて飛び、火の粉が残る。size は岩の半径の目安
  function explode(rel, size, space = 1) {
    const S = Math.max(1, size);
    blasts.push({ rel: rel.slice(), far: puffs.far.slice(), size: S, age: 0 });
    // 閃光は小さく短く（画面を白く潰さない）
    puffs.puff(rel, [0, 0, 0], 0.06, S * 0.5, S * 1.5, KIND.FLASH, 0, space);
    puffs.puff(rel, [0, 0, 0], 0.2, S * 0.6, S * 1.4, KIND.FLASH, 0, space, 0.015);
    // 衝撃の輪：速い輪と、遅れて出る薄い輪
    puffs.puff(rel, [0, 0, 0], 0.7, S * 0.3, S * 6.5, KIND.SHOCK, 0, space);
    if (S >= 4) puffs.puff(rel, [0, 0, 0], 1.0, S * 0.3, S * 4.2, KIND.SHOCK, 0, space, 0.06);
    // 破片：燃えながら弧を描いて飛び、火と煙の筋を残す
    if (space === 1) {
      // 長さも太さもばらつかせ、少し曲げる（放射状の同じ腕に見せない）
      const n = Math.min(9, 3 + Math.round(S * 0.7));
      for (let i = 0; i < n; i++) {
        const d = onSphere();
        const c = onSphere();
        const sp = S * (2.5 + R() * R() * 11);
        debris.push({ w: [rel[0] + puffs.far[0], rel[1] + puffs.far[1], rel[2] + puffs.far[2]], v: [d[0] * sp, d[1] * sp, d[2] * sp], c: [c[0] * sp * 0.5, c[1] * sp * 0.5, c[2] * sp * 0.5], age: 0, life: 0.7 + R() * 1.3, acc: 0, size: Math.min(0.55, S * (0.025 + R() * R() * 0.07)) });
      }
    }
    // 火の玉：中心に詰まった塊と、偏った方向へ噴き出す数本の舌
    const fire = Math.min(50, 26 + S * 3);
    for (let i = 0; i < fire; i++) {
      const d = onSphere();
      const sp = S * (0.3 + R() * R() * 2.6);
      puffs.puff(rel, [d[0] * sp, d[1] * sp, d[2] * sp], 0.8 + R() * 0.7, S * 0.62, S * (0.95 + R() * 0.7), KIND.FIRE, 2.0, space, R() * 0.05);
    }
    // 塊の形を崩す：数か所だけ外へふくらむ（まっすぐの腕にしない）
    const lobes = 2 + Math.floor(R() * 3);
    for (let l = 0; l < lobes; l++) {
      const d = onSphere();
      const reach = 1.8 + R() * 1.6;
      for (let i = 0; i < 6; i++) {
        const e = onSphere();
        const sp = S * reach * (0.4 + R() * 0.6);
        puffs.puff(rel, [(d[0] + e[0] * 0.55) * sp, (d[1] + e[1] * 0.55) * sp, (d[2] + e[2] * 0.55) * sp], 0.6 + R() * 0.5, S * 0.35, S * (0.6 + R() * 0.45), KIND.FIRE, 2.0, space, 0.01 + R() * 0.05);
      }
    }
    // 煤：火より少し遅れて、外側を黒く包む
    const soot = Math.min(34, 14 + S * 2.5);
    for (let i = 0; i < soot; i++) {
      const d = onSphere();
      const sp = S * (0.5 + R() * 1.8);
      puffs.puff(rel, [d[0] * sp, d[1] * sp, d[2] * sp], 1.1 + R() * 0.8, S * 0.5, S * (1.05 + R() * 0.65), KIND.SOOT, 1.0, space, 0.06 + R() * 0.16);
    }
    // 火の粉：細く、少し長く残る
    const sparks = Math.min(180, 60 + S * 10);
    for (let i = 0; i < sparks; i++) {
      const d = onSphere();
      const sp = S * (3 + R() * R() * 24);
      puffs.spark(rel, [d[0] * sp, d[1] * sp, d[2] * sp], 0.5 + R() * 1.3, 0.03 + S * 0.006, 0.022, 0, 1.4, space);
    }
  }

  // 弾が岩や船体に残す焦げ。面の少し手前に置く
  function scorch(rel, normal, size = 0.9) {
    const p = [rel[0] + normal[0] * 0.12, rel[1] + normal[1] * 0.12, rel[2] + normal[2] * 0.12];
    puffs.puff(p, [0, 0, 0], 3.5 + R() * 2, size * 0.8, size * (1.0 + R() * 0.4), KIND.SCORCH, 0, 1);
  }

  function reset() {
    lastShock = 0;
    acc = { exhaust: 0, tip: 0, shed: 0, ember: 0 };
    blasts.length = 0;
    debris.length = 0;
  }

  return { update, hitSmall, hitBeam, explode, scorch, reset, blasts };
}
