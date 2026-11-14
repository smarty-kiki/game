import * as THREE from 'three';
import { RING_Z, GATE_Z, GRAVE_Z, BASE_Z, BASE_LEN, TUNNEL_Z, TUNNEL_LEN, LINE_Z, ARENA_Z, BOSS_Z } from './course.js';
import { createSetPieces } from './fx/setpieces.js';
import { createWingmen } from './fx/wingman.js';
import { createBossFight } from './fx/bossfight.js';
import { createSerpentFight } from './fx/bossSerpent.js';
// 1面のボス：既定は機械の大蛇。?boss=core で防衛コア
const BOSS_KIND = new URLSearchParams(location.search).get('boss') === 'core' ? 'core' : 'serpent';
import { upgradeMaterial } from './fx/hardsurface.js';
import { getPbr } from './fx/pbr.js';
import { audio } from './audio/index.js';
import { createComm } from './commView.js';

// 1面の進行：小惑星帯 → 基地の外周（砲台・燃料タンク・アンテナ塔・輪・重巡洋艦）→ 防衛コアとの戦い → クリア。
// 道の上の位置（自機の z）で出来事を起こす。道の区間は stepRail、ボス戦は今の自由飛行で動く。

const FIGHTER_MAX = 32;
let fighterScale = 1;
const NEAR_X = 100; // これより内側の部品だけ壊せる（奥の層は景色）

export function createStage1({ scene, loader, world, puffs, enemies, outpost, startZ = 0, drop = () => {} }) {
  const R = puffs.rnd;
  const START = outpost.start;
  const ARENA = [0, 0, BOSS_Z];

  let mode = 'rail';
  let score = 0;
  let kills = 0;
  let cleared = false;

  // ---- 画面の表示 ----
  const scoreEl = document.createElement('div');
  scoreEl.className = 'ui'; scoreEl.id = 'uiScore';
  scoreEl.innerHTML = '<span class="ui-label">SCORE</span><b>0000000</b>';
  const scoreNum = scoreEl.querySelector('b');
  const commEl = document.createElement('div');
  commEl.className = 'ui'; commEl.id = 'uiComm';
  const comm = createComm({ root: commEl, audio });
  const bossEl = document.createElement('div');
  bossEl.className = 'ui ui-bossbar';
  bossEl.innerHTML = '<div><div class="row"><span>' + (BOSS_KIND === 'core' ? '防衛コア' : '機械の大蛇') + '</span></div><div class="ui-track"><i class="lag"></i><i class="fill b"></i></div></div>';
  const bossBar = bossEl.querySelector('.b');
  const bossLag = bossEl.querySelector('.lag');
  const clearEl = document.createElement('div');
  clearEl.className = 'ui'; clearEl.id = 'uiClear';
  document.body.append(scoreEl, commEl, bossEl, clearEl);

  // 通信：顔窓・名前・本文・声（commView.js）。「名前：本文」の形なら名前を話し手にする（配役は commCast.js）
  function say(text) { comm.say(text); }
  let scoreShown = 0;
  // 被弾・撃墜・撃墜からの復帰に、カナタたちが短く反応する
  // 反応は控えめに：被弾は大きな一撃だけ、シールド低下は低くなるたびに1回、復帰は本当に撃墜された後だけ
  let lastShield = null; let lastKills = 0; let wasDown = false; let lowSaid = false; let commClock = 0;
  function updateComm(dt) {
    commClock += dt;
    const sh = enemies.shield;
    if (typeof sh === 'number') {
      if (lastShield != null && sh <= 0 && lastShield > 0) { wasDown = true; comm.bark('down', commClock); }
      else if (wasDown && sh >= 90) { wasDown = false; comm.bark('revive', commClock); }
      else if (lastShield != null && sh > 0 && sh < 30 && !lowSaid) { lowSaid = comm.bark('low', commClock); }
      else if (lastShield != null && sh > 0 && lastShield - sh >= 10) comm.bark('hurt', commClock);
      if (sh > 60) lowSaid = false;
      lastShield = sh;
    }
    if (kills >= lastKills + 6) { lastKills = kills; comm.bark('kill', commClock); }
    comm.update(dt, playerPos[2]); // 自機の位置を渡す（場面と合わない古い台詞を捨てる。spec REQ-009）
    if (scoreShown !== score) {
      scoreShown += Math.ceil((score - scoreShown) * Math.min(1, dt * 9));
      if (score - scoreShown < 3) scoreShown = score;
      scoreNum.textContent = String(scoreShown).padStart(7, '0');
    }
  }
  function addScore(n) { score += n; }
  addScore(0);

  // ---- 雑魚 ----
  const fighters = [];
  const fighterMeshes = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < FIGHTER_MAX; i++) {
    const f = { alive: false, rel: [0, 0, 0], vel: [0, 0, 0], keys: null, fire: [0, 0], t: 0, hp: 0, type: '', ph: 0, roll: 0, fireAt: 0, index: i };
    f.target = {
      rel: new THREE.Vector3(), radius: 0, size: 1.2, aim: true,
      onDamage: (amount, state) => { hitFighter(f, amount, state); return false; },
    };
    world.targets.push(f.target);
    fighters.push(f);
  }
  const ready = new Promise((res) => {
    loader.load('./assets/enemy_zako.glb', (g) => {
      g.scene.updateMatrixWorld(true);
      const fmats = new Map();
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (!fmats.has(o.material)) fmats.set(o.material, upgradeMaterial(o.material, { cell: 0.11, rim: 0.15, pbr: getPbr('zako', o.material.name) }));
        const inst = new THREE.InstancedMesh(geo, fmats.get(o.material), FIGHTER_MAX);
        inst.frustumCulled = false;
        inst.castShadow = true;
        inst.receiveShadow = true;
        inst.count = FIGHTER_MAX;
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        for (let i = 0; i < FIGHTER_MAX; i++) inst.setMatrixAt(i, dummy.matrix);
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(inst);
        fighterMeshes.push(inst);
      });
      // 機体の幅を自機のおよそ3倍にそろえる（画像の大きさに頼らない）
      const box = new THREE.Box3();
      for (const m of fighterMeshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }
      // 模型の中心を原点へ寄せる（狙いの枠・当たり・弾の出る所が機体の真ん中になるように）
      const ctr = box.getCenter(new THREE.Vector3());
      for (const m of fighterMeshes) m.geometry.translate(-ctr.x, -ctr.y, -ctr.z);
      box.translate(ctr.clone().negate());
      const w = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
      fighterScale = 6.0 / w;
      res();
    }, undefined, (e) => { console.error(e); res(); });
  });

  let fxRef = null;
  function hitFighter(f, amount) {
    if (!f.alive) return;
    f.hp -= amount;
    if (f.hp > 0) return;
    f.alive = false;
    f.target.radius = 0;
    kills += 1;
    addScore(100);
    if (fxRef) fxRef.explode(f.target.rel.toArray(), 1.3);
    // 編隊を全滅させると、最後の機の所に強化が出る
    if (f.group && f.group.reward) {
      f.group.left -= 1;
      if (f.group.left <= 0) {
        addScore(300);
        say('編隊を全滅！ 強化を取って');
        drop(f.group.reward, f.target.rel.toArray(), playerPos);
      }
    }
  }

  // 登場の型。キーは [秒, x, y, 自機からの前後]。x・y は道の中心からの位置。
  // 後ろから追い越す：カメラの後ろから自機の脇をすり抜けて前へ出て、振り向いて撃ち、上へ抜ける
  // 下から上がる：画面の下からせり上がって並び、撃ってから下へ潜る
  // 奥から編隊：遠くに編隊で現れ、撃ちながら正面から迫り、脇をかすめて後ろへ抜ける
  // 横切り：横から一列で画面を横切る
  const ENTRY = {
    overtake: { n: 4, gap: 0.28, slot: (i) => [[-9, 3], [9, 5], [-17, -2], [17, 0]][i],
      keys: (x, y) => [[0, x * 0.5, y - 4, -34], [0.9, x * 0.8, y, 8], [1.8, x * 1.5, y + 10, 78], [2.7, x * 1.3, y + 6, 66], [6.2, x * 1.1, y + 3, 56], [7.6, x * 3, y + 45, 120]],
      fire: [2.7, 6.2] },
    rise: { n: 4, gap: 0.2, slot: (i) => [[-24, 6], [-8, 10], [8, 10], [24, 6]][i],
      keys: (x, y) => [[0, x * 0.7, -70, 125], [1.5, x, y, 92], [5.2, x * 0.9, y - 2, 74], [6.6, x * 2.2, -70, 40]],
      fire: [1.6, 5.2] },
    depth: { n: 5, gap: 0, slot: (i) => [[0, 6], [-10, 2], [10, 2], [-20, -2], [20, -2]][i],
      keys: (x, y) => [[0, x, y, 430], [3.4, x * 0.6, y * 0.6, 45], [4.3, x * 2.4, y - 8, -10], [5.2, x * 3, y - 12, -60]],
      fire: [0.6, 3.0] },
    // 確認用（?fview=1）：1機を自機の前に止めて、近くで見る
    view: { n: 3, gap: 0, slot: (i) => [[7, 1.5], [-9, 3], [0, 8]][i], keys: (x, y) => [[0, x, y, 18 + Math.abs(x)], [999, x, y, 18 + Math.abs(x)]], fire: [999, 999] },
    // ボス戦：ボスから発進して自機の前で並んで撃ち、脇を抜ける。x・y・z は「自機からボスへ」を前にした向きで見た位置
    hangar: { n: 4, gap: 0.35, slot: (i) => [[-34, 8], [34, 12], [-14, -18], [16, 26]][i],
      keys: (x, y, dir, D) => [[0, x * 0.25, y * 0.25, D], [2.0, x, y, 150], [5.4, x * 0.8, y * 0.8, 95], [7.0, x * 3, y + 40, -50]],
      fire: [2.0, 5.4] },
    // 2機の小さな組（面の最初に）
    pair: { n: 2, gap: 0.15, slot: (i) => [[-12, 4], [12, 8]][i],
      keys: (x, y) => [[0, x, y, 300], [3, x * 0.7, y, 62], [4.2, x * 1.9, y + 10, -30]],
      fire: [1.6, 2.8] },
    // 5機の編隊：横から弧を描いて横切る。全滅で強化
    five: { n: 5, gap: 0.22, slot: (i) => [[0, 8 + i * 2]][0],
      keys: (x, y, dir) => [[0, -dir * 110, y, 150], [1.4, -dir * 30, y, 112], [2.6, dir * 22, y - 4, 92], [3.8, dir * 110, y + 12, 72]],
      fire: [0.9, 3.0] },
    // 後ろに付く：カメラの後ろから迫って撃ち、前へ追い越していく
    tail: { n: 3, gap: 0.3, slot: (i) => [[-9, 2], [9, 5], [0, 11]][i],
      keys: (x, y) => [[0, x, y, -44], [1, x, y, -18], [4.6, x * 1.3, y, -13], [5.6, x * 2, y + 8, 40], [6.8, x * 2.6, y + 18, 150]],
      fire: [1.2, 4.6] },
    // 蛇のように連なる8機
    snake: { n: 8, gap: 0.3, slot: () => [0, 4],
      keys: (x, y) => [[0, -30, y, 320], [1.5, 20, y + 10, 210], [3, -20, y - 8, 125], [4.5, 20, y + 6, 62], [5.6, -10, y, -40]],
      fire: [1.0, 4.0] },
    // 上から降りてきて並ぶ
    dive: { n: 4, gap: 0.2, slot: (i) => [[-24, 6], [-8, 12], [8, 12], [24, 6]][i],
      keys: (x, y) => [[0, x * 0.7, 90, 130], [1.5, x, y, 92], [4.6, x * 0.9, y + 2, 72], [5.9, x * 2, 90, 40]],
      fire: [1.6, 4.6] },
    // 救出の追手：僚機を追う（場所は僚機から決まる）
    chase: { n: 3, gap: 0, slot: (i) => [[-5, 2], [5, 3], [0, -4]][i],
      keys: (x, y) => [[0, x, y, 0], [16, x, y, 0]],
      fire: [999, 999] },
    sweep: { n: 5, gap: 0.3, slot: (i) => [[0, 4 + (i % 2) * 7]][0],
      keys: (x, y, dir) => [[0, -dir * 120, y, 150], [1.6, -dir * 40, y + 6, 120], [3.2, dir * 40, y - 4, 105], [4.8, dir * 125, y + 4, 95]],
      fire: [0.8, 3.6] },
  };

  function spawnWave(type, P, opts = {}) {
    const E = ENTRY[type];
    const dir = opts.dir || 1;
    let made = 0;
    const group = opts.reward ? { reward: opts.reward, left: E.n } : null;
    const list = [];
    for (const f of fighters) {
      if (made >= E.n) break;
      if (f.alive) continue;
      const [x, y] = E.slot(made);
      f.alive = true; f.hp = 3; f.type = type; f.ph = made * 0.9;
      f.t = -made * E.gap;
      f.keys = E.keys(x, y, dir, opts.dist || 0);
      f.frame = opts.frame || null;
      // 基地の中では、左右の壁（x=±64 の骨組み）より内側だけを飛ぶ（壁を突き抜けない）
      if (P[2] > START - 150 && P[2] < TUNNEL_Z - 50) for (const k of f.keys) k[1] = Math.max(-40, Math.min(40, k[1]));
      // 内部通路の中では、輪の内側（上下左右 ±30）だけを飛ぶ
      if (P[2] >= TUNNEL_Z - 50 && P[2] < LINE_Z - 50) for (const k of f.keys) { k[1] = Math.max(-30, Math.min(30, k[1])); k[2] = Math.max(-30, Math.min(30, k[2])); }
      // 防衛線は道が広いので ±64 まで
      if (P[2] >= LINE_Z - 50 && P[2] < ARENA_Z) for (const k of f.keys) k[1] = Math.max(-64, Math.min(64, k[1]));
      f.group = group;
      f.follow = opts.follow || null;
      f.followI = made;
      list.push(f);
      // 出た時の自機の位置を中心にする（後ろから追い越す型が自機の脇をかすめるように）
      f.base = [P[0] * 0.8, P[1] * 0.8];
      f.fire = E.fire;
      f.fireAt = E.fire[0] + R() * 1.2;
      f.rel = pathAt(f.keys, 0);
      f.vel = [0, 0, 0];
      f.roll = 0;
      f.target.radius = 0;
      made += 1;
    }
    return list;
  }

  // キーの間をなめらかにつなぐ（3次のエルミート。接線は前後のキーから）
  function pathAt(K, t) {
    if (t <= K[0][0]) return K[0].slice(1);
    const last = K[K.length - 1];
    if (t >= last[0]) return last.slice(1);
    let i = 0;
    while (K[i + 1][0] < t) i += 1;
    const a = K[i]; const b = K[i + 1];
    const pa = K[Math.max(0, i - 1)]; const nb = K[Math.min(K.length - 1, i + 2)];
    const h = b[0] - a[0];
    const u = (t - a[0]) / h;
    const h00 = 2 * u ** 3 - 3 * u * u + 1; const h10 = u ** 3 - 2 * u * u + u; const h01 = -2 * u ** 3 + 3 * u * u; const h11 = u ** 3 - u * u;
    const out = [];
    for (let k = 1; k < 4; k++) {
      const ma = (b[k] - pa[k]) / Math.max(1e-3, b[0] - pa[0]) * h;
      const mb = (nb[k] - a[k]) / Math.max(1e-3, nb[0] - a[0]) * h;
      out.push(h00 * a[k] + h10 * ma + h01 * b[k] + h11 * mb);
    }
    return out;
  }

  const _fw = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _m4 = new THREE.Matrix4();
  function updateFighters(state, player, fx, dt, P) {
    for (const f of fighters) {
      if (f.alive) {
        f.t += dt;
        if (f.t >= 0) {
          const prev = f.rel;
          f.rel = pathAt(f.keys, f.t);
          // 救出の追手：僚機のすぐ後ろ（自機の側）を追う
          if (f.follow) {
            const w = f.follow.rel;
            f.rel = [w[0] + f.rel[0] + Math.sin(f.t * 2 + f.ph) * 2, w[1] + f.rel[1], w[2] - 13 - f.followI * 3];
            f.base = [0, 0];
          }
          // 道の上の速さ（自機に対して）。自機の前進ぶんを足して、世界での向きにする
          let dx = f.rel[0] - prev[0]; let dy = f.rel[1] - prev[1]; let dz = f.rel[2] - prev[2];
          let rx; let ry; let rz; let ahead;
          if (f.frame) {
            // ボス戦：発進した時の向きを基準に、世界の決まった道を飛ぶ
            const { o, r, u, w } = f.frame;
            rx = o[0] + r[0] * f.rel[0] + u[0] * f.rel[1] + w[0] * f.rel[2] - P[0];
            ry = o[1] + r[1] * f.rel[0] + u[1] * f.rel[1] + w[1] * f.rel[2] - P[1];
            rz = o[2] + r[2] * f.rel[0] + u[2] * f.rel[1] + w[2] * f.rel[2] - P[2];
            const wx = r[0] * dx + u[0] * dy + w[0] * dz; const wy = r[1] * dx + u[1] * dy + w[1] * dz; const wz = r[2] * dx + u[2] * dy + w[2] * dz;
            dx = wx; dy = wy; dz = wz;
            ahead = Math.hypot(rx, ry, rz);
          } else {
            rx = f.rel[0] + f.base[0] - P[0]; ry = f.rel[1] + f.base[1] - P[1]; rz = f.rel[2];
            ahead = rz;
          }
          const inv = 1 / Math.max(dt, 1e-4);
          f.vel[0] += (dx * inv - f.vel[0]) * Math.min(1, dt * 10); f.vel[1] += (dy * inv - f.vel[1]) * Math.min(1, dt * 10); f.vel[2] += (dz * inv - f.vel[2]) * Math.min(1, dt * 10);
          f.target.radius = 3.8;
          f.target.rel.set(rx, ry, rz);
          if (f.t > f.keys[f.keys.length - 1][0]) { f.alive = false; f.target.radius = 0; }
          else if (f.t > f.fireAt && f.t < f.fire[1] && ahead > 30 && ahead < 230) {
            const from = [rx, ry, rz];
            const lead = enemies.leadDir(from, player, 110, 1.2, 0.42);
            // 2発ずつ、わずかに開いて撃つ
            for (const k of [-1, 1]) enemies.fireBolt(from, P, [lead[0] + lead[2] * k * 0.012, lead[1], lead[2] - lead[0] * k * 0.012], 110, 1);
            f.fireAt = f.t + 1.3 + R() * 1.0;
          }
        }
      }
      // 描く：動く向きへ機首を向け、曲がる向きへ傾ける。並んで撃つ間は自機の方を向く
      if (f.alive && f.t >= 0) {
        const speed = Math.hypot(f.vel[0], f.vel[1], f.vel[2]);
        const face = f.t > f.fire[0] && f.t < f.fire[1] ? 1 : Math.max(0, 1 - speed / 25);
        _fw.set(f.vel[0], f.vel[1], f.vel[2]).normalize().multiplyScalar(1 - face);
        if (f.frame) {
          const l = f.target.rel.length() || 1;
          _fw.x += -f.target.rel.x / l * face; _fw.y += -f.target.rel.y / l * face; _fw.z += -f.target.rel.z / l * face;
        } else { _fw.x += -f.target.rel.x / 60 * face; _fw.y += -f.target.rel.y / 60 * face; _fw.z += -1 * face; }
        if (_fw.lengthSq() < 1e-6) _fw.set(0, 0, -1);
        _fw.normalize();
        const wantRoll = Math.max(-1.2, Math.min(1.2, -f.vel[0] * 0.03));
        f.roll += (wantRoll - f.roll) * Math.min(1, dt * 4);
        dummy.position.copy(f.target.rel);
        dummy.lookAt(f.target.rel.x + _fw.x, f.target.rel.y + _fw.y, f.target.rel.z + _fw.z);
        dummy.rotateZ(f.roll + Math.sin(state.time * 2 + f.ph) * 0.08);
        dummy.scale.setScalar(fighterScale);
      } else {
        dummy.position.set(0, -9999, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      for (const m of fighterMeshes) m.setMatrixAt(f.index, dummy.matrix);
    }
    // 飛んでいる機の番号までしか描かない（全機分の三角形を毎回描かない）
    let top = 0;
    for (const f of fighters) if (f.alive) top = Math.max(top, f.index + 1);
    for (const m of fighterMeshes) { m.count = top; m.instanceMatrix.needsUpdate = true; }
  }

  // ---- 基地の壊せる部品 ----
  const props = [];
  let mastsLeft = 0;
  let propsReady = false;
  function buildProps() {
    for (const it of outpost.items) {
      if (Math.abs(it.x) > NEAR_X) continue;
      let kind = null; let off = 0; let radius = 0; let hp = 0;
      if (it.part === 'turret') { kind = 'turret'; off = 0.5; radius = 6; hp = 12; }
      if (it.part === 'tank') { kind = 'tank'; off = 0; radius = 7.5; hp = 5; }
      if (it.part === 'mast') { kind = 'mast'; off = 0; radius = 9; hp = 8; mastsLeft += 1; }
      if (!kind) continue;
      const p = { kind, it, hp, cool: 1 + R() * 2, pos: [it.x, it.y + off, it.z], chainAt: -1, yaw: it.ry };
      p.target = {
        rel: new THREE.Vector3(), radius, r0: radius, size: 2.5, aim: true,
        onDamage: (amount) => { hitProp(p, amount); return false; },
      };
      world.targets.push(p.target);
      props.push(p);
    }
    propsReady = true;
  }

  function hitProp(p, amount) {
    if (p.it.dead) return;
    p.hp -= amount;
    if (p.hp > 0) return;
    outpost.hideItem(p.it);
    p.target.radius = 0;
    const rel = p.target.rel.toArray();
    if (p.kind === 'turret') { addScore(300); if (fxRef) fxRef.explode(rel, 2.4); }
    if (p.kind === 'mast') {
      addScore(500);
      mastsLeft -= 1;
      if (fxRef) fxRef.explode(rel, 2.6);
      // 「防衛コアの砲台が止まる」はボスが防衛コアのときだけ本当なので、大蛇のときは数の台詞にする（spec REQ-009）
      if (mastsLeft === 0 && BOSS_KIND === 'core') say('レーダー塔を全部潰した。防衛コアの砲台が2基止まるはず');
      else say(`レーダー塔を破壊。残り ${mastsLeft} 基`);
    }
    if (p.kind === 'tank') {
      addScore(150);
      if (fxRef) fxRef.explode(rel, 3.6);
      // 燃料タンクの誘爆：近くの部品に連鎖する
      for (const o of props) {
        if (o === p || o.it.dead) continue;
        const d = Math.hypot(o.pos[0] - p.pos[0], o.pos[1] - p.pos[1], o.pos[2] - p.pos[2]);
        if (d < 42) o.chainAt = stateTime + 0.12 + d * 0.006;
      }
    }
  }

  let stateTime = 0;
  function updateProps(state, player, dt, P) {
    for (const p of props) {
      if (p.it.dead) continue;
      const rx = p.pos[0] - P[0]; const ry = p.pos[1] - P[1]; const rz = p.pos[2] - P[2];
      p.target.rel.set(rx, ry, rz);
      if (p.chainAt > 0 && stateTime >= p.chainAt) { p.chainAt = -1; hitProp(p, 999); continue; }
      if (p.kind === 'turret' && rz > -20 && rz < 260) {
        // 砲台は台ごと自機の方へ旋回する（模型の砲身は +z 向き、砲口は中心から上へ3・前へ6）
        const want = Math.atan2(-rx, -rz);
        let dy = want - p.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const step = Math.max(-1.4 * dt, Math.min(1.4 * dt, dy));
        if (Math.abs(step) > 1e-4) { p.yaw += step; outpost.setItemYaw(p.it, p.yaw); }
        p.cool -= dt;
        if (p.cool <= 0 && rz > 25 && rz < 230 && Math.abs(dy) < 0.15) {
          const sy = Math.sin(p.yaw); const cy = Math.cos(p.yaw);
          const mx = 0.15 * cy + 6.0 * sy; const mz = -0.15 * sy + 6.0 * cy;
          const from = [p.it.x + mx - P[0], p.it.y + 3.0 - P[1], p.it.z + mz - P[2]];
          const lead = enemies.leadDir(from, player, 120, 1.5, 0.5);
          // 砲台は3発の扇
          for (const k of [-1, 0, 1]) enemies.fireBolt(from, P, [lead[0] + lead[2] * k * 0.03, lead[1], lead[2] - lead[0] * k * 0.03], 120, 0);
          puffs.puff(from, [0, 0, 0], 0.1, 0.8, 2.4, 4, 0, 1);
          p.cool = 2.2 + R() * 1.6;
        }
      }
    }
  }

  // ---- 防衛コア（戦いの中身は fx/bossfight.js） ----
  // 雑魚の発進：自機からボスへの向きを前にして、ボスの所から出す
  let playerPos = [0, 0, 0];
  function summonFighters(bossPos) {
    if (fighters.filter((f) => f.alive).length > 4) return;
    const o = playerPos.slice();
    const w = [bossPos.x - o[0], bossPos.y - o[1], bossPos.z - o[2]];
    const D = Math.hypot(w[0], w[1], w[2]) || 1;
    w[0] /= D; w[1] /= D; w[2] /= D;
    const s = Math.hypot(w[0], w[2]) || 1;
    const r = [w[2] / s, 0, -w[0] / s];
    const u = [w[1] * r[2] - w[2] * r[1], w[2] * r[0] - w[0] * r[2], w[0] * r[1] - w[1] * r[0]];
    spawnWave('hangar', o, { frame: { o, r, u, w }, dist: D - 40 });
  }
  const boss = (BOSS_KIND === 'core' ? createBossFight : createSerpentFight)({
    scene, loader, world, puffs, enemies, outpost, R, center: ARENA, say, addScore,
    summon: summonFighters,
    setBar: (v) => {
      if (v < 0) { bossEl.style.opacity = '0'; return; }
      bossEl.style.opacity = '1';
      bossBar.style.width = `${v * 100}%`;
      bossLag.style.width = bossBar.style.width;
    },
  });

  // ---- 道の途中の仕掛けと僚機 ----
  const set = createSetPieces({ scene, world, outpost, say, addScore, R, enemies, drop: (k, rel) => drop(k, rel, playerPos) });
  const wing = createWingmen({ scene, loader, puffs, say, addScore, R });
  function rescue(i, P) {
    const w = wing.wings[i];
    if (w.state !== 'form') return;
    const chasers = spawnWave('chase', P, { follow: w });
    wing.startRescue(i, chasers);
  }

  // ---- 道の上の出来事（自機の z で起こす）。毎秒40で進むので 400 で10秒 ----
  const wave = (z, type, opts) => ({ z, f: (P) => spawnWave(type, P, opts) });
  const events = [
    // 小惑星帯：小さな組から始めて、編隊・輪・後ろの敵へ
    { z: 0, f: () => { comm.line('k_sortie'); say('敵の前線基地はこの小惑星帯の先。岩をよけて進んで'); } },
    wave(120, 'pair'),
    { z: 260, f: () => say('ルカ：こっちも付いていく。金属の輪を3つくぐれば、ツインを強化できるぞ') },
    wave(320, 'pair'),
    wave(480, 'five', { dir: 1, reward: 'P' }),
    wave(820, 'depth'),
    wave(1040, 'rise'),
    { z: 1230, f: () => say('ナギ：後ろ！ 急減速か宙返りで前へ出して') },
    wave(1260, 'tail'),
    wave(1540, 'sweep', { dir: -1 }),
    // 沈没艦の墓場：漂う骨組みの間を抜け、艦の肋骨の下へ
    { z: GRAVE_Z - 80, f: () => say('沈没艦の墓場に入る。漂う残骸に気をつけて') },
    { z: GRAVE_Z + 60, f: (P) => { set.drift(P[2] + 240, -90, 12, 34); set.drift(P[2] + 320, 90, -14, -30); } },
    wave(GRAVE_Z + 220, 'snake', { reward: 'B' }),
    { z: GRAVE_Z + 500, f: (P) => rescue(0, P) },
    { z: GRAVE_Z + 900, f: (P) => { set.drift(P[2] + 240, 90, 18, -36); set.drift(P[2] + 300, -90, -6, 36); set.drift(P[2] + 380, 90, -18, -28); } },
    wave(GRAVE_Z + 1080, 'dive'),
    wave(GRAVE_Z + 1380, 'five', { dir: -1 }),
    // 基地の外周
    { z: START - 70, f: () => { comm.line('e_grace_outer'); say('基地の外周に入る。砲台と燃料タンクを撃って。レーダー塔を全部壊せばボス戦が楽になる'); } },
    wave(START + 120, 'overtake'),
    { z: START + 300, f: (P) => { set.gate(P[2] + 260, 1); say('ナギ：右の箱に爆雷が入ってる。撃って開けて'); } },
    wave(START + 520, 'five', { dir: 1, reward: 'P' }),
    { z: START + 780, f: () => say('ルカ：また後ろだ！') },
    wave(START + 810, 'tail'),
    wave(START + 1080, 'dive'),
    { z: START + 1280, f: (P) => set.gate(P[2] + 260, -1, -6) },
    wave(START + 1500, 'rise'),
    wave(START + 1760, 'depth'),
    // 基地の内部通路：柱と隔壁
    { z: TUNNEL_Z - 90, f: () => say('基地の内部へ突入！ 狭いぞ') },
    { z: TUNNEL_Z + 80, f: (P) => set.pillar(P[2] + 200, 1) },
    wave(TUNNEL_Z + 200, 'pair'),
    { z: TUNNEL_Z + 330, f: (P) => set.pillar(P[2] + 200, -1, 8) },
    { z: TUNNEL_Z + 470, f: (P) => { comm.line('e_grace_tunnel'); set.bulkhead(P[2] + 230, 12); } },
    wave(TUNNEL_Z + 620, 'snake'),
    { z: TUNNEL_Z + 700, f: (P) => rescue(1, P) },
    { z: TUNNEL_Z + 950, f: (P) => set.bulkhead(P[2] + 230, -12) },
    { z: TUNNEL_Z + 1050, f: (P) => { set.pillar(P[2] + 200, 1, 10); set.pillar(P[2] + 200, -1, -10); } },
    // 防衛線：重巡洋艦
    { z: LINE_Z - 30, f: () => say('通路を抜けた！ 防衛線だ') },
    { z: LINE_Z + 100, f: (P, player) => { say('重巡洋艦が来る！'); comm.line('e_riz_in'); audio.cue('cruiserHorn'); enemies.spawnCruiser(player); } },
    wave(LINE_Z + 500, 'overtake'),
    wave(LINE_Z + 900, 'rise'),
    wave(LINE_Z + 1300, 'depth'),
    { z: ARENA_Z - 40, f: () => { if (enemies.cruiserAlive) { enemies.retreatCruiser(); comm.line('e_riz_out'); say('重巡洋艦は離脱した'); } } },
    { z: ARENA_Z, f: () => { mode = 'free'; if (wing.saved >= 2) say(BOSS_KIND === 'core' ? 'ルカ：二人とも付いてる。炉を集中して叩くぞ！' : 'ルカ：二人とも付いてる。大蛇の頭を集中して叩くぞ！'); boss.start(mastsLeft === 0 && propsReady, wing.saved); if (BOSS_KIND === 'core') { comm.line('e_core_start'); comm.line('k_boss'); } } }, // 「あれが防衛コア……！」は防衛コアのときだけ
  ];
  if (new URLSearchParams(location.search).has('fview')) events.push({ z: startZ, f: (P) => spawnWave('view', P) });
  for (const e of events) if (e.z < startZ) e.done = true;
  const rings = RING_Z.map((v) => ({ z: START + v, done: START + v < startZ }));
  const gates = GATE_Z.map((z) => ({ z, done: z < startZ }));
  let gateOk = 0;

  let bumpCool = 0;
  function update(state, player, fx, dt) {
    fxRef = fx;
    stateTime = state.time;
    const P = player.pos;
    if (!propsReady && outpost.items.length) { buildProps(); boss.build(); }
    for (const e of events) {
      if (!e.done && P[2] >= e.z) { e.done = true; e.f(P, player); }
    }
    // 輪をくぐる：得点とシールドの回復
    for (const r of rings) {
      if (!r.done && P[2] >= r.z) {
        r.done = true;
        if (Math.hypot(P[0], P[1]) < 44) { addScore(200); enemies.heal(10); audio.cue('ringPass'); say('輪を通過。シールド回復'); }
      }
    }
    // 小惑星帯の金属の輪：3つ続けてくぐると強化
    for (const g of gates) {
      if (!g.done && P[2] >= g.z) {
        g.done = true;
        if (Math.hypot(P[0], P[1]) < 40) {
          gateOk += 1;
          addScore(100);
          audio.cue('ringPass');
          if (gateOk === 3) { say('輪を3つ通過！ 強化を取って'); drop('P', [0, 2, 60], P); } else say(`輪を通過 ${gateOk}/3`);
        } else gateOk = -9;
      }
    }
    // 岩にぶつかる：シールドが減り、少し押し戻される
    bumpCool -= dt;
    if (bumpCool <= 0 && !player.invuln) {
      const h = world.rockHit(0.9);
      if (h) {
        bumpCool = 1;
        enemies.hurtPlayer(10, state, [h.push[0] * -0.9, h.push[1] * -0.9, h.push[2] * -0.9], fx);
        P[0] += h.push[0] * Math.min(4, h.depth); P[1] += h.push[1] * Math.min(4, h.depth);
      }
    }
    updateFighters(state, player, fx, dt, P);
    set.update(state, player, fx, dt, P);
    if (mode === 'rail') wing.update(state, dt, P, (from) => {
      const c = fighters.filter((f) => f.alive && f.t >= 0 && !f.follow && f.target.rel.z > 20 && f.target.rel.z < 200);
      if (!c.length) return null;
      const f = c[Math.floor(R() * c.length)];
      return { rel: f.target.rel, hit: (n) => hitFighter(f, n) };
    }, fx);
    else for (const w of wing.wings) w.group.visible = false;
    if (propsReady) updateProps(state, player, dt, P);
    playerPos = P;
    boss.update(state, player, fx, dt, P);
    if (boss.done && !cleared) {
      cleared = true;
      if (BOSS_KIND === 'core') comm.line('e_core_down');
      comm.line('e_grace_clear'); comm.line('k_clear');
      mode = 'clear';
      clearEl.innerHTML = `<b>MISSION COMPLETE</b><span class="jp">前線基地 制圧</span><div class="res"><div><span class="ui-label">SCORE</span><b>${String(score).padStart(7, '0')}</b></div><div><span class="ui-label">KILLS</span><b>${kills}</b></div></div><div class="again">R でもう一度</div>`;
      clearEl.style.opacity = '1';
    }
    updateComm(dt);
  }

  function contacts() {
    const out = [];
    for (const f of fighters) if (f.alive && f.t >= 0) out.push({ kind: 'fighter', rel: f.target.rel, radius: 2.2, aim: f.target });
    boss.contacts(out);
    set.contacts(out);
    return out;
  }

  // 基地とボスのまわりの小惑星を消す
  function rockKeep(x, y, z, size = 0) {
    // 道の区間では、道の筒をふさぐ大きな岩を置かない（よけられる大きさだけ残す）
    if (mode === 'rail' && size > 11) {
      const clear = (Math.hypot(x, y) - size - 44) / 30;
      if (clear < 1) return Math.max(0, clear);
    }
    const d = Math.hypot(x, y, z - BOSS_Z);
    if (d < 420) return 0;
    if (d < 460) return (d - 420) / 40;
    return outpost.rockKeep(x, y, z);
  }

  return {
    // ボスの読み込みも待つ（待たないと、読み込みの幕の裏の下準備にボスが入らず、ボス戦の始まりで数秒重くなる）
    ready: Promise.all([ready, wing.ready, boss.ready || Promise.resolve()]), update, contacts, rockKeep,
    get mode() { return mode; },
    // ボス戦の間だけ、回る中心を返す。機械の大蛇は中心が大蛇に付いて動く（orbitCenter）。回り方の値は orbitOpts（無ければ既定）
    get arena() { return (mode === 'free' && boss.fighting) ? (boss.orbitCenter || ARENA) : null; },
    get orbitOpts() { return boss.orbitOpts || null; },
    // ボスがカメラ・画面のゆがみ・熱の揺らぎを指定するとき（機械の大蛇のビームのぶつかり合い）。main.js が読む
    get viewHint() { return boss.viewHint || null; },
    get distortRing() { return boss.distortRing || null; },
    get heatPoint() { return boss.heatPoint || null; },
    get cleared() { return cleared; },
    get info() {
      return { z: Math.round(playerPos[2]), x: Math.round(playerPos[0] * 10) / 10, y: Math.round(playerPos[1] * 10) / 10, saved: wing.saved, mode, score, kills, mastsLeft, props: props.filter((p) => !p.it.dead).length, fighters: fighters.filter((f) => f.alive).length, ...boss.info };
    },
    // 確認用：ボスの体力を削る
    debugHit(what, n) {
      boss.debugHit(what, n);
    },
  };
}
