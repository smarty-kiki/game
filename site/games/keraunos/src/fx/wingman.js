import * as THREE from 'three';
import { AIRFRAMES } from '../airframes.js';
import { loadAirframeMaps, makeShipMaterial, repairTangents } from '../materials.js';
import { createTube, tubeGeometry } from './tube.js';
import { KIND } from './puffs.js';
import { createWingFx, WING_COLORS } from './wingmanfx.js';

// 僚機2機。ふだんは自機の前を並んで飛び、時々敵を撃つ。
// 救出の出来事では前へ出て敵に追われ、自機が追手を落とせば助かる。間に合わなければ被弾して離脱する。
// 見た目：自機と同じ材質（塗装だけ僚機ごとの色）、自機と同じ噴射の筒、航法灯、金色の曳光弾。
// 追われている間は翼端から雲を引き、追手の赤い弾が掠める。被弾すると片方の噴射が息をつき、煙を引いて離脱する。
const NAMES = ['ルカ', 'ナギ'];
const HOME = [[-16, 6, 20], [16, 3, 24]];
const SCALE = 3.2;
// 塗装：主・差し色・地金・発光。自機（灰と橙）と見分けられ、敵（赤）と取り違えない色
const PAINT = [['56687f', 'd6a93a', '2e3238', 'ffcf70'], ['5f6f58', 'd9d4c4', '2b2e2a', 'ffcf70']];
const FRAME = AIRFRAMES.a;

export function createWingmen({ scene, loader, puffs, say, addScore, R }) {
  const wings = NAMES.map((name, i) => ({
    name, i, group: new THREE.Group(), rel: [HOME[i][0], HOME[i][1], -40], vel: [0, 0, 0], state: 'form', t: 0, fireAt: 2 + i, saved: false, chasers: [], roll: 0, ready: false,
    tipPrev: [null, null], burst: 0, burstNext: 0, gun: 0, flash: [0, 0], tipAcc: 0, smokeAcc: 0, enemyAt: 2, spin: 0, engines: [], model: null, target: null,
  }));
  for (const w of wings) { w.group.visible = false; w.group.name = `wingman_${w.name}`; scene.add(w.group); }
  const fx = createWingFx({ scene });

  // 模型の座標での目印（左右対称なので右だけ測る）
  const mark = { tipR: new THREE.Vector3(0.5, 0.05, -0.35), tail: new THREE.Vector3(0.14, 0.3, -0.38), gunR: new THREE.Vector3(0.19, 0.09, 0.2) };
  const noz = FRAME.nozzles[0];

  const ready = new Promise((res) => loader.load(`${FRAME.base}.glb`, (g) => {
    g.scene.updateMatrixWorld(true);
    // 翼端と尾翼の先を、頂点から測る
    let maxX = -1e9; let maxY = -1e9;
    const v = new THREE.Vector3();
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      repairTangents(o.geometry);
      const p = o.geometry.attributes.position;
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld);
        if (v.x > maxX) { maxX = v.x; mark.tipR.copy(v); }
        if (v.y > maxY && v.x > 0) { maxY = v.y; mark.tail.copy(v); }
      }
    });
    loadAirframeMaps(new THREE.TextureLoader(), FRAME).then((maps) => {
      const jetGeom = tubeGeometry(40, 20);
      for (const w of wings) {
        const c = g.scene.clone(true);
        const mat = makeShipMaterial({ maps, envMap: null, part: `wing${w.i}`, paint: PAINT[w.i], gain: 0.55 });
        // 自機は撮影用の映り込みを使う。僚機は宇宙の空を映すので、そのぶん鈍く
        mat.envMapIntensity = 0.9;
        c.traverse((o) => {
          if (!o.isMesh) return;
          o.material = mat;
          o.castShadow = false;
          o.receiveShadow = true;
        });
        c.scale.setScalar(SCALE);
        // 噴射：自機と同じ筒（青い外の層と白い芯）
        for (const sx of [1, -1]) {
          const toe = 0.08 * sx;
          const outer = createTube(jetGeom, { radius: 0.105, near: [0.08, 0.50, 1.0], far: [0.01, 0.10, 1.0], intensity: 1.2, sharp: 2.0, flowAmount: 0.65, flowSpeed: 34, flowScale: 2.6, bulge: 0.12, bulgeFreq: 30, wobble: 0.05, endFade: 1.2, seed: w.i * 3 + sx });
          const inner = createTube(jetGeom, { radius: 0.044, near: [0.85, 0.97, 1.0], far: [0.18, 0.72, 1.0], intensity: 2.4, sharp: 1.8, flowAmount: 0.3, flowSpeed: 46, flowScale: 3.4, bulge: 0.42, bulgeFreq: 30, wobble: 0.02, endFade: 1.8, seed: w.i * 5 + sx + 5 });
          for (const t of [outer, inner]) {
            t.mesh.position.set(noz[0] * sx, noz[1], noz[2] + 0.02);
            t.mesh.rotation.set(-0.06, Math.PI + toe, 0);
            t.mesh.renderOrder = 3;
            c.add(t.mesh);
          }
          w.engines.push({ outer, inner, sx, cough: 0 });
        }
        w.model = c;
        w.group.add(c);
        w.ready = true;
      }
      res();
    }).catch((e) => { console.error(e); res(); });
  }, undefined, () => res()));

  // 救出の始まり：前へ出て追われる。chasers は追手の雑魚（stage1 が渡す）
  function startRescue(i, chasers) {
    const w = wings[i];
    if (w.state !== 'form') return false;
    w.state = 'chased'; w.t = 0; w.chasers = chasers; w.enemyAt = 1.2;
    say(`${w.name}：後ろに付かれた！ 振り切れない、撃ち落として！`);
    return true;
  }

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const lastP = [0, 0, 0];
  let havePrev = false;

  // 模型の座標の点を、シーンの座標へ
  const at = (w, local, sx = 1) => _a.set(local.x * sx, local.y, local.z).applyMatrix4(w.model.matrixWorld);

  // 機体の表面に当たった火花（追手の弾・被弾の瞬間）
  function hullHit(p, n, big) {
    const k = big ? 2 : 1;
    for (let j = 0; j < 10 * k; j++) {
      const d = [R() - 0.5, R() - 0.5, R() - 0.5];
      const sp = 6 + R() * 16;
      puffs.spark(p, [(n[0] + d[0]) * sp, (n[1] + d[1]) * sp, (n[2] + d[2]) * sp], 0.2 + R() * 0.35, 0.03, 0.014, 0, 2.8, 1);
    }
    puffs.puff(p, [0, 0, 0], 0.06, 0.3 * k, 0.9 * k, KIND.MUZZLE, 0, 1);
    for (let j = 0; j < 2 * k; j++) puffs.puff(p, [n[0] * 2 + (R() - 0.5) * 2, n[1] * 2 + (R() - 0.5) * 2, n[2] * 2 + (R() - 0.5) * 2], 0.3 + R() * 0.2, 0.2 * k, 0.6 * k, KIND.FIRE, 2.5, 1);
    for (let j = 0; j < 2 * k; j++) puffs.puff(p, [n[0] * 1.5 + (R() - 0.5), n[1] * 1.5 + (R() - 0.5), n[2] * 1.5 + (R() - 0.5)], 0.7 + R() * 0.5, 0.25 * k, 1.0 * k, KIND.SOOT, 1.5, 1);
  }

  function update(state, dt, P, pickTarget, sfx) {
    // 自機の速さ（煙を機体に付いてくるように流すため）
    const pv = havePrev && dt > 0 ? [(P[0] - lastP[0]) / dt, (P[1] - lastP[1]) / dt, (P[2] - lastP[2]) / dt] : [0, 0, 40];
    lastP[0] = P[0]; lastP[1] = P[1]; lastP[2] = P[2]; havePrev = true;
    fx.beginLights();
    for (const w of wings) {
      if (w.state === 'gone') { w.group.visible = false; continue; }
      w.t += dt;
      let tx; let ty; let tz;
      const wob = state.time * 0.9 + w.i * 2;
      if (w.state === 'form') {
        tx = HOME[w.i][0] + Math.sin(wob) * 4; ty = HOME[w.i][1] + Math.sin(wob * 1.3) * 3; tz = HOME[w.i][2];
        w.fireAt -= dt;
        if (w.fireAt <= 0 && w.burst <= 0) {
          w.fireAt = 1.4 + R() * 2.2;
          const tg = pickTarget(w.rel);
          // 4発の連射。最後の1発が届いたら当たり
          if (tg) { w.target = tg; w.burst = 4; w.burstNext = 0; }
        }
      } else if (w.state === 'chased') {
        tx = Math.sin(w.t * 1.1 + w.i) * 26; ty = 8 + Math.sin(w.t * 1.7) * 12; tz = 75;
        const alive = w.chasers.filter((f) => f.alive).length;
        if (alive === 0) {
          w.state = 'form'; w.saved = true;
          addScore(500);
          say(`${w.name}：助かった！ 借りができたな`);
        } else if (w.t > 14) {
          w.state = 'hurt'; w.t = 0;
          for (const f of w.chasers) { f.alive = false; f.target.radius = 0; }
          if (w.model) {
            // 右の噴射口のあたりを撃ち抜かれる：火花と火の玉、外板の破片
            const p = at(w, new THREE.Vector3(noz[0], noz[1] + 0.05, noz[2] + 0.1)).toArray();
            hullHit(p, [0, 1, 0], true);
            if (sfx) sfx.hitSmall(p, [0, 1, 0], 0);
            w.engines[0].cough = 1;
          }
          say(`${w.name}：被弾した！ ここで離脱する`);
        }
      } else {
        // 離脱：煙を引き、ゆっくり傾きながら上へ抜ける
        tx = w.rel[0] + (w.i ? 60 : -60); ty = w.rel[1] + 40; tz = 200;
        if (w.t > 5) { w.state = 'gone'; w.group.visible = false; continue; }
      }
      // 離脱はゆっくり（煙を引いて傾きながら抜けていくのが見えるように）
      const k = Math.min(1, dt * (w.state === 'hurt' ? 0.55 : 1.6));
      const px = w.rel[0]; const py = w.rel[1];
      w.rel[0] += (tx - w.rel[0]) * k; w.rel[1] += (ty - w.rel[1]) * k; w.rel[2] += (tz - w.rel[2]) * k;
      const vx = (w.rel[0] - px) / Math.max(dt, 1e-3); const vy = (w.rel[1] - py) / Math.max(dt, 1e-3);
      const rx = w.rel[0] - P[0]; const ry = w.rel[1] - P[1]; const rz = w.rel[2];
      w.group.visible = w.ready;
      w.group.position.set(rx, ry, rz);
      if (w.state === 'hurt') w.spin += dt * (0.6 + w.t * 0.5) * (w.i ? 1 : -1);
      w.roll += ((-vx * 0.03) - w.roll) * Math.min(1, dt * 3);
      w.group.rotation.set(-vy * 0.015, vx * 0.01, w.roll + w.spin);
      if (!w.model) continue;
      w.group.updateMatrixWorld(true);

      // ---- 噴射：巡航は短く、追われている間は踏み込んで長く。被弾した側は息をつく ----
      const boost = w.state === 'chased' ? 0.55 + 0.25 * Math.sin(w.t * 2.3) : w.state === 'hurt' ? 0.3 : 0.12;
      const flick = 0.96 + 0.04 * Math.sin(state.time * 71 + w.i) + 0.03 * Math.sin(state.time * 113);
      for (const e of w.engines) {
        let pw = (0.55 + 0.45 * boost) * flick;
        if (e.cough > 0) {
          e.cough = Math.min(1, e.cough + dt);
          // 不規則に途切れる
          pw *= Math.sin(state.time * 23 + Math.sin(state.time * 7) * 3) > 0.2 ? 0.15 : 0.9;
        }
        const len = (0.34 + (1.6 - 0.34) * boost) * flick * (e.cough > 0 ? 0.6 : 1);
        for (const t of [e.outer, e.inner]) { t.u.uTime.value = state.time; t.u.uLen.value = len; t.u.uPower.value = pw; }
        e.outer.u.uIntensity.value = 0.6 + 0.5 * boost;
        e.inner.u.uIntensity.value = 1.1 + 0.6 * boost;
        // 噴射口の光（遠くでも2画素）
        fx.light(at(w, new THREE.Vector3(noz[0], noz[1], noz[2] - 0.03), e.sx), WING_COLORS.engine, 0.35 + 0.25 * boost, 0.55 * pw, 2);
      }

      // ---- 航法灯：左が赤、右が緑、尾翼の先の白は2回ずつ点滅 ----
      const failing = w.state === 'hurt' && Math.sin(state.time * 31 + w.i) > 0.3 ? 0.2 : 1;
      fx.light(at(w, mark.tipR, -1), WING_COLORS.red, 0.16, 0.9 * failing, 3);
      fx.light(at(w, mark.tipR, 1), WING_COLORS.green, 0.16, 0.9 * failing, 3);
      const ph = (state.time + w.i * 0.37) % 1.3;
      const strobe = ph < 0.05 || (ph > 0.16 && ph < 0.21) ? 1 : 0;
      fx.light(at(w, mark.tail, 1), WING_COLORS.white, 0.3, strobe * failing, 4);

      // ---- 撃つ：翼の付け根の左右から交互に、金色の曳光弾 ----
      if (w.burst > 0) {
        w.burstNext -= dt;
        if (w.burstNext <= 0) {
          w.burstNext = 0.07;
          w.gun = 1 - w.gun;
          const sx = w.gun ? 1 : -1;
          const m = at(w, mark.gunR, sx);
          const from = [m.x + P[0], m.y + P[1], m.z + P[2]];
          const tg = w.target;
          const last = w.burst === 1;
          w.flash[w.gun] = 1;
          puffs.puff(m.toArray(), [0, 0, 0], 0.045, 0.15, 0.5, KIND.MUZZLE, 0, 1);
          _b.set(0, 0, 1).transformDirection(w.model.matrixWorld);
          fx.fire(from, tg, {
            dir: [_b.x, _b.y, _b.z], col: WING_COLORS.shot, speed: 280, len: 4, width: 0.13,
            onArrive: (p, dir) => {
              if (last && tg) tg.hit(1);
              if (sfx) sfx.hitSmall(p, [-dir[0], -dir[1], -dir[2]], 0);
            },
          });
          w.burst -= 1;
        }
      }
      for (let s = 0; s < 2; s++) {
        if (w.flash[s] <= 0) continue;
        fx.light(at(w, new THREE.Vector3(mark.gunR.x, mark.gunR.y, mark.gunR.z + 0.08), s ? 1 : -1), WING_COLORS.muzzle, 0.3, w.flash[s], 3);
        w.flash[s] = Math.max(0, w.flash[s] - dt * 18);
      }

      // ---- 追われている間：翼端の雲、追手の赤い弾が掠め、時々当たって火花 ----
      if (w.state === 'chased') {
        // 翼端の雲：空気に置いていかれる（世界に止めて置く）。前のコマの翼端から今の翼端まで隙間なく並べる
        const g = Math.min(1, (Math.abs(vx) + Math.abs(vy)) / 26);
        for (const sx of [1, -1]) {
          const p = at(w, mark.tipR, sx);
          const cur = [p.x + P[0], p.y + P[1], p.z + P[2]];
          const prev = w.tipPrev[sx > 0 ? 0 : 1] || cur;
          w.tipPrev[sx > 0 ? 0 : 1] = cur;
          if (g < 0.2) continue;
          const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
          const n = Math.min(16, Math.ceil(d / 0.22));
          for (let j = 0; j < n; j++) {
            const f = (j + R()) / n;
            const q = [prev[0] + (cur[0] - prev[0]) * f - P[0], prev[1] + (cur[1] - prev[1]) * f - P[1], prev[2] + (cur[2] - prev[2]) * f - P[2]];
            puffs.puff(q, [(R() - 0.5) * 0.3, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3], 0.3 + 0.35 * g, 0.09, 0.22 + 0.2 * g, KIND.VAPOR, 0.5, 1, -f * dt);
          }
        }
        w.enemyAt -= dt;
        const live = w.chasers.filter((f) => f.alive);
        if (w.enemyAt <= 0 && live.length) {
          w.enemyAt = 0.35 + R() * 0.5;
          const f = live[Math.floor(R() * live.length)];
          const from = [f.target.rel.x + P[0], f.target.rel.y + P[1], f.target.rel.z + P[2]];
          const hit = R() < 0.18;
          const miss = hit ? null : new THREE.Vector3((R() - 0.5) * 6, (R() - 0.5) * 4, 0).add(_b.set(Math.sign(R() - 0.5) * 2.5, 0, 0));
          const tgt = { rel: w.group.position };
          fx.fire(from, tgt, {
            dir: [0, 0, 1], col: WING_COLORS.enemy, speed: 150, len: 3, width: 0.3, miss, life: 1.4,
            onArrive: (p) => { if (hit) hullHit(p, [(R() - 0.5), 0.7, -0.4], false); },
          });
        }
      }

      // ---- 被弾して離脱：右の噴射口から黒い煙と火、ときどき火花 ----
      if (w.state === 'hurt') {
        // 進んだ距離ごとに、前のコマの位置から今の位置まで間を埋めて煙を置く（速く逃げても筋が途切れない）
        const p = at(w, new THREE.Vector3(noz[0], noz[1] + 0.03, noz[2] + 0.05));
        const cur = [p.x + P[0], p.y + P[1], p.z + P[2]];
        const prev = w.smokePrev || cur;
        w.smokePrev = cur;
        const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
        w.smokeAcc += d / 0.45 + dt * 12;
        let n = 0;
        while (w.smokeAcc >= 1 && n < 24) {
          w.smokeAcc -= 1; n += 1;
          const f = R();
          const q = [prev[0] + (cur[0] - prev[0]) * f - P[0], prev[1] + (cur[1] - prev[1]) * f - P[1], prev[2] + (cur[2] - prev[2]) * f - P[2]];
          // 日に当たる灰色の煙と、根元の黒い煤（暗い背景でも筋が見える）
          puffs.puff(q, [(R() - 0.5) * 0.8, (R() - 0.5) * 0.8 + 0.6, (R() - 0.5) * 0.8], 1.1 + R() * 0.8, 0.35, 1.3 + R() * 0.7, KIND.TRAIL, 0.6, 1);
          if (R() < 0.35) puffs.puff(q, [(R() - 0.5), (R() - 0.5), (R() - 0.5)], 0.6 + R() * 0.4, 0.3, 0.9, KIND.SOOT, 0.6, 1);
          if (R() < 0.45) puffs.puff(q, [(R() - 0.5), (R() - 0.5), (R() - 0.5)], 0.14 + R() * 0.12, 0.25, 0.5, KIND.FIRE, 0, 1);
          if (R() < 0.05) puffs.spark(q, [(R() - 0.5) * 10, R() * 8, (R() - 0.5) * 10], 0.3 + R() * 0.4, 0.03, 0.015, 0, 1.5, 1);
        }
        w.smokeAcc = Math.min(w.smokeAcc, 2);
      }
    }
    fx.endLights();
    fx.update(dt, P);
  }

  return {
    ready, wings, startRescue, update,
    get saved() { return wings.filter((w) => w.saved).length; },
    get relOf() { return wings.map((w) => w.rel); },
  };
}
