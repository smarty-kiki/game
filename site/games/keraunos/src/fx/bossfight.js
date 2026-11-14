import * as THREE from 'three';
import { createTube, tubeGeometry } from './tube.js';
import { KIND } from './puffs.js';

// 1面のボス「防衛コア」の戦い。登場 → 砲台 → 腕 → 炉 → 撃破。
// 攻撃はどれも「予告 → 実行 → 隙」の順に進む。予告の間に狙いが決まるので、
// 止まっている（流れているだけの）自機には当たり、予告を見て向きを変えれば外れる。
// 位置は世界の座標で持ち、毎コマ自機からの相対にして置く（他の敵と同じ）。

// 体力は今の武器（多重誘導 24×8発・ランス 26）に合わせる。低いと攻撃を見る前に終わる
const TURRET_HP = 160;
const ARM_HP = 200;
const CORE_HP = 420;
const TOTAL_HP = TURRET_HP * 4 + ARM_HP * 4 + CORE_HP;
const PHASE = { NONE: -1, ENTRY: 0, TURRETS: 1, ARMS: 2, CORE: 3, DYING: 4 };
const ATTACKS = { 1: ['fan', 'missiles', 'mines'], 2: ['sweep', 'summon', 'sweep'], 3: ['ram', 'beam', 'ring'] };
const GLOW = 28; // 炉の光のふだんの大きさ
const TRACK_SLOW = 18; // 狙いが追う速さ。流れる自機（毎秒12）には追いつき、動く自機（毎秒60）には追いつけない

function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,240,210,1)'); g.addColorStop(0.25, 'rgba(255,170,70,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 機雷の形：丸い胴から信管の棘が12本出る
function mineGeometry() {
  const ball = new THREE.IcosahedronGeometry(1.9, 1);
  const spikeDirs = new THREE.IcosahedronGeometry(1, 0).attributes.position;
  const seen = [];
  const pos = Array.from(ball.attributes.position.array);
  const Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < spikeDirs.count; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(spikeDirs, i).normalize();
    if (seen.some((v) => v.distanceToSquared(d) < 1e-3)) continue;
    seen.push(d);
    const c = new THREE.ConeGeometry(0.34, 1.5, 5).toNonIndexed();
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d));
    c.translate(d.x * 2.3, d.y * 2.3, d.z * 2.3);
    pos.push(...c.attributes.position.array);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function createBossFight({ scene, world, puffs, enemies, outpost, R, center, say, addScore, summon, setBar }) {
  const params = new URLSearchParams(location.search);
  const FORCE_ATK = params.get('bossatk'); // 確認用：同じ攻撃だけを繰り返す
  const FORCE_PHASE = Number(params.get('bossphase')) || 0; // 確認用：登場を省いてその段階から（実機で段階ごとに測るのにも使う）

  const HOME = new THREE.Vector3(...center);
  const b = {
    group: null, armRig: null, phase: PHASE.NONE, t: 0, pos: HOME.clone(), turrets: [], arms: [], arcs: [], parts: [], core: null, coreHp: CORE_HP,
    open: 0, wantOpen: 0, closeT: 0, coreAcc: 0, atk: null, gap: 2, idx: 0, spin: 0, spinRate: 0.12, ext: 0, detach: 0, dying: 0, done: false, shake: 0, glow: null, beam: null, armBeams: [], flash: 0, wounds: [],
  };
  const tex = glowTexture();
  const sprite = (size, opacity = 0) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
    s.scale.setScalar(size);
    return s;
  };

  // ---- 画面の表示：警告と攻撃の知らせ ----
  const warnEl = document.createElement('div');
  warnEl.className = 'ui'; warnEl.id = 'uiWarn';
  warnEl.innerHTML = '<b>WARNING</b><span>巨大な熱源が接近　防衛コア</span>';
  const vignette = document.createElement('div');
  vignette.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;background:radial-gradient(ellipse at center,rgba(255,30,0,0) 62%,rgba(255,30,0,.28) 100%)';
  const alertEl = document.createElement('div');
  alertEl.className = 'ui'; alertEl.id = 'uiAlert';
  const flashEl = document.createElement('div');
  flashEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;opacity:0;background:#fff3df';
  document.body.append(warnEl, vignette, alertEl, flashEl);
  let warnT = 0;
  let alertT = 0;
  function alert(text, sec = 1.6) { alertEl.textContent = text; alertT = sec; }
  function updateScreen(state, dt) {
    warnT = Math.max(0, warnT - dt);
    const blink = 0.72 + 0.28 * Math.sign(Math.sin(state.time * 7));
    warnEl.style.opacity = warnT > 0 ? String(Math.min(1, warnT * 2) * blink) : '0';
    b.danger = Math.max(0, (b.danger || 0) - dt);
    vignette.style.opacity = warnT > 0 ? String(Math.min(1, warnT * 2) * (0.5 + 0.5 * Math.sin(state.time * 9))) : (b.danger > 0 ? String(0.55 + 0.45 * Math.sin(state.time * 16)) : '0');
    alertT = Math.max(0, alertT - dt);
    alertEl.style.opacity = alertT > 0 ? String(0.8 + 0.2 * Math.sign(Math.sin(state.time * 7))) : '0';
    b.flash = Math.max(0, b.flash - dt * 1.6);
    flashEl.style.opacity = String(b.flash);
    // 画面の揺れ：描画の面ごと動かす。少し拡大して端を見せない
    b.shake = Math.max(0, b.shake - dt * 1.4);
    const cv = document.querySelector('canvas');
    if (cv) {
      if (b.shake > 0.01) {
        const s = b.shake * b.shake * 16;
        cv.style.transform = `translate(${(Math.sin(state.time * 67) * s).toFixed(1)}px,${(Math.sin(state.time * 83) * s).toFixed(1)}px) scale(1.02)`;
      } else if (cv.style.transform) cv.style.transform = '';
    }
  }

  // ---- 機雷と誘導弾 ----
  const mineGeo = mineGeometry();
  const mineMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.5, roughness: 0.55, flatShading: true });
  const mines = [];
  for (let i = 0; i < 8; i++) {
    const m = { mesh: new THREE.Mesh(mineGeo, mineMat), glow: sprite(7), blast: sprite(40), alive: false, far: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), age: 0, delay: 0 };
    m.mesh.visible = false; m.glow.visible = false; m.blast.visible = false;
    m.glow.material.color.setRGB(1, 0.25, 0.1);
    m.blast.material.color.setRGB(1, 0.2, 0.08);
    scene.add(m.mesh, m.glow, m.blast);
    m.target = { rel: new THREE.Vector3(), radius: 0, size: 1.4, aim: true, onDamage: () => { killMine(m, true); return false; } };
    world.targets.push(m.target);
    mines.push(m);
  }
  const MINE_TRAVEL = 3.0;
  const MINE_ARM = 1.5; // 着いてから爆ぜるまで。点滅が速くなり、爆ぜる範囲が光る
  const MINE_BLAST = 19;
  let fxRef = null;
  function killMine(m, shot) {
    if (!m.alive) return;
    m.alive = false;
    m.target.radius = 0;
    m.mesh.visible = false; m.glow.visible = false; m.blast.visible = false;
    if (fxRef) fxRef.explode(m.target.rel.toArray(), shot ? 2 : 3.4);
    if (shot) addScore(50);
  }

  const missiles = [];
  for (let i = 0; i < 6; i++) {
    const m = { glow: sprite(5), alive: false, far: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, acc: 0, locked: false };
    m.glow.visible = false;
    m.glow.material.opacity = 1;
    scene.add(m.glow);
    m.target = { rel: new THREE.Vector3(), radius: 0, size: 1, aim: true, onDamage: () => { killMissile(m); return false; } };
    world.targets.push(m.target);
    missiles.push(m);
  }
  function killMissile(m) {
    if (!m.alive) return;
    m.alive = false;
    m.target.radius = 0;
    m.glow.visible = false;
    if (fxRef) fxRef.explode(m.target.rel.toArray(), 1.4);
  }

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _d = new THREE.Vector3();
  const _m = new THREE.Matrix4();
  const Z = new THREE.Vector3(0, 0, 1);

  // 自機はボスのまわりを円を描いて回るので、t 秒後の位置は直線の先読みでは外れる。
  // 円の上で t 秒進んだ位置へ向かう速さを返す。向きを変えなければ当たり、変えれば外れる
  function orbitVel(player, t) {
    const P = player.pos; const v = player.vel;
    const hx = P[0] - HOME.x; const hz = P[2] - HOME.z;
    const r2 = hx * hx + hz * hz || 1;
    const a = (hx * v[2] - hz * v[0]) / r2 * t;
    const c = Math.cos(a); const s = Math.sin(a);
    const k = 1 / Math.max(t, 1e-3);
    return [(hx * c - hz * s - hx) * k, v[1], (hx * s + hz * c - hz) * k];
  }
  function aimDir(from, player, speed, spread, warn) {
    const t = Math.hypot(from[0], from[1], from[2]) / speed + warn;
    return enemies.leadDir(from, { vel: orbitVel(player, t) }, speed, spread, warn);
  }

  function updateMines(state, player, fx, dt, P) {
    for (const m of mines) {
      if (!m.alive) continue;
      m.age += dt;
      if (m.age < 0) continue;
      const u = Math.min(1, m.age / MINE_TRAVEL);
      m.far.lerpVectors(m.from, m.to, 1 - (1 - u) * (1 - u));
      _a.set(m.far.x - P[0], m.far.y - P[1], m.far.z - P[2]);
      m.target.rel.copy(_a);
      m.target.radius = 3.2;
      m.mesh.visible = true; m.glow.visible = true;
      m.mesh.position.copy(_a);
      m.mesh.scale.setScalar(0.75);
      m.mesh.rotation.x += dt * 1.6; m.mesh.rotation.y += dt * 2.3;
      m.glow.position.copy(_a);
      // 点滅は爆ぜる時が近いほど速い
      const armed = Math.max(0, m.age - MINE_TRAVEL) / MINE_ARM;
      m.blink = (m.blink || 0) + dt * (3 + armed * armed * 26);
      m.glow.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(m.blink * 6.283));
      m.blast.visible = armed > 0;
      if (armed > 0) {
        m.blast.position.copy(_a);
        m.blast.scale.setScalar(MINE_BLAST * 2.6 * Math.min(1, armed * 1.3));
        // 爆ぜる範囲の光。近いほど薄くして、画面を塗りつぶさない
        m.blast.material.opacity = (0.12 + 0.09 * Math.sin(m.blink * 6.283)) * Math.min(1, _a.length() / 70);
        if (_a.length() < MINE_BLAST + 4 && armed < 1) alert('機雷 爆発範囲', 0.2);
      }
      if (armed >= 1) {
        const d = _a.length();
        killMine(m, false);
        if (d < MINE_BLAST && !player.invuln) enemies.hurtPlayer(12, state, [_a.x / d, _a.y / d, _a.z / d], fx);
      }
    }
  }

  function updateMissiles(state, player, fx, dt, P) {
    let any = false;
    for (const m of missiles) {
      if (!m.alive) continue;
      any = true;
      m.age += dt;
      m.far.addScaledVector(m.vel, dt);
      _a.set(m.far.x - P[0], m.far.y - P[1], m.far.z - P[2]);
      const d = _a.length();
      if (m.age > 0.5 && !m.locked) {
        // 追う間は曲がれる量に上限がある。2秒で追うのをやめ、その時に向かう先へまっすぐ飛ぶ
        const speed = Math.min(135, 60 + m.age * 55);
        const lead = d / speed;
        const ov = orbitVel(player, lead);
        _b.set(-_a.x + ov[0] * lead, -_a.y + ov[1] * lead, -_a.z + ov[2] * lead).normalize();
        _c.copy(m.vel).normalize();
        const ang = Math.acos(Math.max(-1, Math.min(1, _c.dot(_b))));
        const step = Math.min(1, (2.4 * dt) / Math.max(ang, 1e-3));
        _c.lerp(_b, step).normalize();
        m.vel.copy(_c).multiplyScalar(speed);
        if (m.age > 2.0) m.locked = true;
      }
      m.target.rel.copy(_a);
      m.target.radius = 2.6;
      m.glow.position.copy(_a);
      m.glow.scale.setScalar(4.5 + Math.sin(state.time * 50 + m.age * 9) * 0.8);
      m.acc += dt * 34;
      while (m.acc > 1) {
        m.acc -= 1;
        puffs.puff(_a.toArray(), [(R() - 0.5) * 1.5, (R() - 0.5) * 1.5, (R() - 0.5) * 1.5], 0.5 + R() * 0.5, 0.6, 2.2, KIND.SMOKE, 0.8, 1);
        if (R() < 0.5) puffs.puff(_a.toArray(), [0, 0, 0], 0.18, 0.7, 1.4, KIND.FIRE, 1, 1);
      }
      if (d < 3.2) {
        if (player.dodging) { killMissile(m); continue; }
        if (!player.invuln) { killMissile(m); enemies.hurtPlayer(8, state, [_a.x / d, _a.y / d, _a.z / d], fx); continue; }
      }
      if (m.age > 6.5) killMissile(m);
    }
    return any;
  }

  // ---- 組み立て ----
  function build() {
    const P = outpost.parts;
    if (!P.dock || !P.hab) return false;
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    const mesh = (part, parent, x, y, z, s) => {
      const m = new THREE.Mesh(P[part].geo, P[part].mat);
      m.castShadow = true;
      m.receiveShadow = true;
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      parent.add(m);
      return m;
    };
    b.parts.push(mesh('dock', g, 0, 0, 0, 4), mesh('mast', g, 0, 56, 0, 1.6));
    // 腕：炉の面に十字に開く。砲台は腕の先にあり、砲身は炉と同じ向き（-z）
    const rig = new THREE.Group();
    g.add(rig);
    const qT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
    for (let k = 0; k < 4; k++) {
      const pivot = new THREE.Group();
      pivot.rotation.z = Math.PI / 4 + k * Math.PI / 2;
      rig.add(pivot);
      const arm = new THREE.Group();
      pivot.add(arm);
      const hab = mesh('hab', arm, 58, 0, 0, 1.4);
      const tm = mesh('turret', arm, 92, 0, 0, 2.5);
      tm.quaternion.copy(qT);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(99, 0, -15);
      arm.add(muzzle);
      const flare = sprite(26);
      flare.position.copy(muzzle.position);
      arm.add(flare);
      const tip = new THREE.Object3D();
      tip.position.set(70, 0, -8);
      arm.add(tip);
      const tu = { mesh: tm, hp: TURRET_HP, dead: false, muzzle, flare };
      tu.target = { rel: new THREE.Vector3(), radius: 0, size: 3, aim: true, onDamage: (n) => { hitTurret(tu, n); return false; } };
      world.targets.push(tu.target);
      b.turrets.push(tu);
      const am = { pivot, arm, hab, tip, hp: ARM_HP, dead: false, angle: pivot.rotation.z, vel: new THREE.Vector3(), spinV: new THREE.Vector3() };
      am.target = { rel: new THREE.Vector3(), radius: 0, size: 3, aim: true, onDamage: (n) => { hitArm(am, n); return false; } };
      world.targets.push(am.target);
      b.arms.push(am);
      b.parts.push(hab);
    }
    // 炉を囲む輪。閉じると炉を隠す
    const K = 60 / 46.28;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      const m = mesh('arc', g, Math.cos(a) * -36 - Math.sin(a) * 36, Math.sin(a) * -36 + Math.cos(a) * 36, -30, 1.2);
      m.rotation.z = a;
      m.scale.set(1.2, 1.2 * K, 1.2);
      b.arcs.push({ mesh: m, x: m.position.x, y: m.position.y });
      b.parts.push(m);
    }
    b.glow = sprite(GLOW);
    b.glow.position.set(0, 0, -34);
    g.add(b.glow);
    // 炉の光線と突進の予告に使う太い筒
    b.beam = createTube(tubeGeometry(40, 20), { len: 700, radius: 9, near: [1, 0.95, 0.85], far: [1, 0.62, 0.32], intensity: 2.6, sharp: 3, flowAmount: 0.4, flowSpeed: 30, flowScale: 2, taper: 0, endFade: 0, startFade: 0.02, lenPow: 2, nearFade: 80 });
    b.beam.mesh.visible = false;
    b.beam.mesh.renderOrder = 6;
    scene.add(b.beam.mesh);
    // 腕の光線（4本）
    for (let k = 0; k < 4; k++) {
      const t = createTube(tubeGeometry(16, 10), { len: 760, radius: 3.4, near: [1, 0.92, 0.78], far: [1, 0.55, 0.25], intensity: 2.4, sharp: 3, flowAmount: 0.35, flowSpeed: 34, flowScale: 2, taper: 0, endFade: 0, startFade: 0.02, lenPow: 2, nearFade: 45, seed: k * 3.1 });
      t.mesh.visible = false;
      t.mesh.renderOrder = 6;
      scene.add(t.mesh);
      b.armBeams.push(t);
    }
    // 光線が自機の盾で止まる所の光
    b.splash = sprite(20);
    b.splash.visible = false;
    b.splash.renderOrder = 7;
    scene.add(b.splash);
    b.core = { rel: new THREE.Vector3(), radius: 0, size: 5, aim: true, onDamage: (n) => { hitCore(n); return false; } };
    world.targets.push(b.core);
    b.group = g;
    b.armRig = rig;
    return true;
  }

  // ---- 被弾 ----
  function jolt(amount) { b.shake = Math.max(b.shake, amount); }
  function hitTurret(tu, n) {
    if (tu.dead) return;
    tu.hp -= n;
    if (tu.hp > 0) return;
    tu.dead = true;
    tu.mesh.visible = false;
    tu.flare.visible = false;
    tu.target.radius = 0;
    addScore(800);
    jolt(0.7);
    if (fxRef) fxRef.explode(tu.target.rel.toArray(), 6);
    // 壊れた跡から煙が出続ける
    b.wounds.push({ node: tu.muzzle, acc: 0 });
  }
  function hitArm(am, n) {
    if (am.dead || b.phase !== PHASE.ARMS) return;
    am.hp -= n;
    if (am.hp > 0) return;
    am.dead = true;
    am.target.radius = 0;
    am.arm.visible = false;
    addScore(1200);
    jolt(0.8);
    if (fxRef) {
      fxRef.explode(am.target.rel.toArray(), 7);
      am.tip.getWorldPosition(_a);
      fxRef.explode(_a.toArray(), 4);
    }
    const left = b.arms.filter((a) => !a.dead).length;
    if (left) say(`腕を破壊。残り ${left} 本`);
  }
  function hitCore(n) {
    if (b.phase !== PHASE.CORE) return;
    if (b.open < 0.6 || b.closeT > 0) {
      // 閉じた炉は弾く
      if (fxRef) fxRef.hitSmall(b.core.rel.toArray(), [0, 0, -1], 0);
      return;
    }
    b.coreHp -= n;
    b.coreAcc += n;
    if (b.coreHp <= 0) { b.coreHp = 0; startDying(); return; }
    // 撃たれ続けると炉を閉じる。溜めている光線も止まる（撃ち込む価値がある）
    if (b.coreAcc >= 44) {
      b.coreAcc = 0;
      b.closeT = 2.6;
      alert('炉を閉じた', 1.2);
      if (b.atk && b.atk.name === 'beam' && b.atk.t < 1.8) { endBeam(); b.atk = null; b.gap = 3.0; }
    }
  }
  function endBeam() {
    b.beam.mesh.visible = false;
    b.beam.u.uIntensity.value = 2.4;
  }
  function startDying() {
    b.phase = PHASE.DYING;
    b.dying = 0;
    b.atk = null;
    b.core.radius = 0;
    b.beam.mesh.visible = false;
    for (const t of b.armBeams) t.mesh.visible = false;
    for (const m of mines) killMine(m, false);
    for (const m of missiles) killMissile(m);
    for (const p of b.parts) { p.userData.v = new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5) * 2); p.userData.s = new THREE.Vector3((R() - 0.5) * 1.6, (R() - 0.5) * 1.6, (R() - 0.5) * 1.6); p.userData.at = 0.8 + R() * 2.6; }
    addScore(5000);
    jolt(1);
    say('炉を破壊！ 離れて！');
  }

  function start(radarDown, allies = 0) {
    if (!b.group) return;
    // 僚機を2機とも救っていれば、援護で炉の守りが弱まる
    if (allies >= 2) b.coreHp = CORE_HP * 0.7;
    b.group.visible = true;
    b.t = 0;
    let off = 0;
    if (radarDown) for (const tu of b.turrets.slice(0, 2)) { tu.dead = true; tu.hp = 0; tu.mesh.visible = false; tu.flare.visible = false; off += 1; }
    b.radarOff = off;
    if (FORCE_PHASE) {
      b.phase = FORCE_PHASE;
      b.ext = 1;
      if (FORCE_PHASE >= 2) for (const tu of b.turrets) { tu.dead = true; tu.hp = 0; tu.mesh.visible = false; tu.flare.visible = false; }
      if (FORCE_PHASE >= 3) for (const a of b.arms) { a.dead = true; a.hp = 0; a.arm.visible = false; }
      if (FORCE_PHASE === 2) b.detach = 1;
      b.gap = 1.5;
      return;
    }
    b.phase = PHASE.ENTRY;
    warnT = 3.4;
    say('基地の奥から巨大な熱源！ 防衛コアが来る');
  }

  // ---- 攻撃 ----
  function aliveTurrets() { return b.turrets.filter((t) => !t.dead); }
  function nextAttack() {
    const list = ATTACKS[b.phase];
    const name = FORCE_ATK || list[b.idx % list.length];
    b.idx += 1;
    b.atk = { name, t: 0, fired: 0 };
  }

  function stepFan(a, state, player, dt, P) {
    // 砲口が0.8秒光ってから、3回に分けて扇形に3発ずつ撃つ
    const ROUND = [0.8, 1.25, 1.7];
    const list = aliveTurrets();
    for (const tu of list) {
      tu.flare.material.opacity = a.t < 0.8 ? a.t / 0.8 * (0.7 + 0.3 * Math.sin(state.time * 40)) : Math.max(0, tu.flare.material.opacity - dt * 3);
    }
    if (a.fired < ROUND.length && a.t >= ROUND[a.fired]) {
      a.fired += 1;
      for (const tu of list) {
        tu.muzzle.getWorldPosition(_a);
        const from = _a.toArray();
        const speed = 155;
        const d = aimDir(from, player, speed, 1.0, 0.55);
        // 扇：狙いの線を中心に、水平へ少しずつ開く
        const s = Math.hypot(d[0], d[2]) || 1;
        const side = [d[2] / s, 0, -d[0] / s];
        for (const k of [-1, 0, 1]) {
          const dir = [d[0] + side[0] * k * 0.075, d[1], d[2] + side[2] * k * 0.075];
          const l = Math.hypot(dir[0], dir[1], dir[2]);
          enemies.fireBolt(from, P, [dir[0] / l, dir[1] / l, dir[2] / l], speed, 0, 0.55, 2.0);
        }
        puffs.puff(from, [0, 0, 0], 0.14, 4, 12, KIND.FLASH, 0, 1);
      }
    }
    return a.t > 2.3;
  }

  function stepMissiles(a, state, player, dt) {
    // 炉の上の発射口が光る → 上へ扇形に6発。少し飛んでから自機へ曲がる
    if (a.t < 1.0 && a.fired === 0 && !a.warned) { a.warned = true; alert('誘導弾', 2.2); }
    b.glow.material.opacity = Math.max(b.glow.material.opacity, a.t < 1.0 ? a.t * 0.7 : 0);
    const n = Math.floor((a.t - 1.0) / 0.13) + 1;
    while (a.fired < 6 && a.fired < n) {
      const m = missiles.find((x) => !x.alive);
      a.fired += 1;
      if (!m) break;
      _a.set(0, 34, -10).applyMatrix4(b.group.matrixWorld); // 相対
      m.far.set(_a.x + player.pos[0], _a.y + player.pos[1], _a.z + player.pos[2]);
      const ang = (a.fired - 3.5) * 0.55;
      _b.set(Math.sin(ang), 0.8, Math.cos(ang) * 0.2 - 0.3).applyQuaternion(b.group.quaternion).normalize();
      m.vel.copy(_b).multiplyScalar(62);
      m.age = 0; m.acc = 0; m.locked = false; m.alive = true;
      m.glow.visible = true;
      puffs.puff(_a.toArray(), [0, 0, 0], 0.12, 3, 9, KIND.FLASH, 0, 1);
    }
    return a.fired >= 6 && a.t > 2.6;
  }

  function stepMines(a, state, player, dt, P) {
    // 腕の先から1個ずつ放り出す。自機の行き先のまわりで止まり、点滅してから爆ぜる
    const n = Math.floor(a.t / 0.28) + 1;
    while (a.fired < 6 && a.fired < n) {
      const m = mines.find((x) => !x.alive);
      const k = a.fired;
      a.fired += 1;
      if (!m) break;
      const tip = b.arms[k % 4].tip;
      tip.getWorldPosition(_a);
      m.from.set(_a.x + P[0], _a.y + P[1], _a.z + P[2]);
      m.far.copy(m.from);
      const lead = MINE_TRAVEL + MINE_ARM * 0.6;
      const v = orbitVel(player, lead);
      const sp = k === 0 ? 4 : 30;
      // 自機より少しボス寄りに止める（爆ぜる範囲には入るが、カメラの目の前は塞がない）
      _b.set(HOME.x - P[0], 0, HOME.z - P[2]).normalize().multiplyScalar(13);
      m.to.set(P[0] + v[0] * lead + _b.x + (R() - 0.5) * sp * 2, Math.max(-90, Math.min(90, P[1] + v[1] * lead + (R() - 0.5) * sp)), P[2] + v[2] * lead + _b.z + (R() - 0.5) * sp * 2);
      m.age = 0; m.alive = true; m.blink = 0;
      puffs.puff(_a.toArray(), [0, 0, 0], 0.1, 2, 6, KIND.FLASH, 0, 1);
    }
    return a.fired >= 6 && a.t > 2.2;
  }

  // 腕の光線：4本で輪を作り、輪を縮めながら回す。輪の中心は自機をゆっくり追う。
  // 輪の外へ出るか、2本の間をくぐれば当たらない。中心に居続けると、最後に4本が集まって当たる
  function stepSweep(a, state, player, fx, dt, P) {
    const WARN = 1.4;
    const SHRINK = 3.2;
    const HOLD = 0.5;
    const arms = b.arms.filter((x) => !x.dead);
    if (a.t === 0 || !a.c) {
      a.c = new THREE.Vector3(P[0], P[1], P[2]);
      a.dirSign = b.idx % 2 ? 1 : -1;
      a.tick = 0;
      alert('光線の輪', 1.4);
    }
    // 中心は上限つきで自機を追う
    _a.set(P[0] - a.c.x, P[1] - a.c.y, P[2] - a.c.z);
    const dist = _a.length();
    if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, TRACK_SLOW * dt / dist));

    const firing = a.t > WARN;
    const u = Math.min(1, Math.max(0, (a.t - WARN) / SHRINK));
    const ringR = 125 * Math.pow(1 - u, 1.25);
    b.spinRate = (firing ? 0.95 : 0.5) * a.dirSign;

    _b.copy(a.c).sub(b.pos).normalize(); // 炉から中心への向き
    _c.set(_b.z, 0, -_b.x).normalize(); // 横
    _d.crossVectors(_b, _c); // 上

    a.tick -= dt;
    arms.forEach((arm, i) => {
      const t = b.armBeams[i];
      t.mesh.visible = true;
      t.u.uTime.value = state.time;
      const A = arm.tip.getWorldPosition(new THREE.Vector3());
      const th = b.spin + arm.angle;
      const T = new THREE.Vector3(a.c.x - P[0], a.c.y - P[1], a.c.z - P[2])
        .addScaledVector(_c, Math.cos(th) * ringR).addScaledVector(_d, Math.sin(th) * ringR);
      const dir = T.sub(A).normalize();
      t.mesh.position.copy(A);
      t.mesh.quaternion.setFromUnitVectors(Z, dir);
      if (!firing) {
        const w = 0.06 + 0.1 * (a.t / WARN) + 0.05 * Math.max(0, Math.sin(state.time * 30));
        t.mesh.scale.set(w, w, 1);
        t.u.uLen.value = 760;
        return;
      }
      t.mesh.scale.set(1, 1, 1);
      beamContact(t, A, dir, 3.4, state, player, fx, 7, a);
    });
    return a.t > WARN + SHRINK + HOLD;
  }
  function endSweep() { for (const t of b.armBeams) t.mesh.visible = false; b.spinRate = 0.3; }

  // 光線と自機の距離を見て、当たれば手前で止めて火花を散らす（カメラが筒の中に入らない）
  function beamContact(t, A, dir, radius, state, player, fx, dmg, a) {
    const toP = _a.copy(A).negate();
    const along = toP.dot(dir);
    const miss = toP.addScaledVector(dir, -along).length();
    const reach = radius + 1.2;
    const stop = Math.max(6, radius * 2.4);
    if (along > 0 && miss < reach + 6) t.u.uLen.value = Math.max(10, along - stop);
    else t.u.uLen.value = 760;
    if (along > 0 && miss < reach) {
      const end = [A.x + dir.x * (along - stop), A.y + dir.y * (along - stop), A.z + dir.z * (along - stop)];
      b.splash.visible = true;
      b.splash.position.set(end[0], end[1], end[2]);
      b.splash.scale.setScalar((radius * 1.3 + 3) * (0.85 + 0.15 * Math.sin(state.time * 60)));
      b.splash.material.opacity = 0.5;
      for (let i = 0; i < 6; i++) {
        const sp = 8 + R() * 20;
        puffs.spark(end, [(-dir.x + (R() - 0.5) * 1.6) * sp, (-dir.y + (R() - 0.5) * 1.6) * sp, (-dir.z + (R() - 0.5) * 1.6) * sp], 0.2 + R() * 0.3, 0.05, 0.02, R() < 0.5 ? 1 : 0, 3, 1);
      }
      if (!player.invuln && a.tick <= 0) {
        a.tick = 0.25;
        enemies.hurtPlayer(dmg, state, [-dir.x, -dir.y, -dir.z], fx);
      }
    }
  }

  function stepSummon(a) {
    if (a.t < 0.01) { alert('敵機 発進', 1.4); }
    b.glow.material.opacity = Math.max(b.glow.material.opacity, Math.min(0.5, a.t));
    if (!a.fired && a.t > 0.9) { a.fired = 1; summon(b.pos); }
    return a.t > 1.6;
  }

  // 突進：下がって溜める → 自機の居た所へ一直線 → 止まる → 戻る。
  // 溜めの間だけ狙いが追う。予告の帯から横へ出るか、回避の回転でかわせる
  function stepRam(a, state, player, fx, dt, P) {
    const WIND = 1.5;
    const DASH = 0.62;
    const STOP = 0.5;
    const BACK = 1.5;
    const STOP_D = 112;
    const HIT_D = 122;
    if (!a.c) {
      a.c = new THREE.Vector3(P[0], P[1], P[2]);
      a.from = b.pos.clone();
      a.done = false;
      a.tick = 0;
      alert('突進', 1.6);
    }
    if (a.t < WIND - 0.3) {
      // 狙いは自機の今の位置を、上限つきで追う（先読みしない。動き続ければ帯の外へ出られる）
      _a.set(P[0] - a.c.x, P[1] - a.c.y, P[2] - a.c.z);
      const dist = _a.length();
      if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, TRACK_SLOW * dt / dist));
    }
    const toC = _b.copy(a.c).sub(a.from);
    const span = toC.length() - STOP_D;
    const dir = toC.normalize();
    const t = b.beam;
    if (a.t < WIND) {
      // 溜め：少し下がる。通る道に赤い帯が出る
      const u = a.t / WIND;
      b.pos.copy(a.from).addScaledVector(dir, -46 * Math.sin(u * Math.PI * 0.5));
      t.mesh.visible = true;
      t.u.uTime.value = state.time;
      t.u.uIntensity.value = 0.5 + 0.5 * Math.max(0, Math.sin(state.time * 22));
      _c.set(b.pos.x - P[0], b.pos.y - P[1], b.pos.z - P[2]);
      t.mesh.position.copy(_c);
      t.mesh.quaternion.setFromUnitVectors(Z, dir);
      const w = 1.2 + 0.3 * u;
      t.mesh.scale.set(w, w, 1);
      const toP = _d.copy(_c).negate().dot(dir);
      t.u.uLen.value = Math.max(20, Math.min(760, toP - 12));
      b.glow.material.opacity = 0.4 + 0.5 * u;
      b.danger = 0.1; // 帯は正面を向くと見えにくいので、画面の縁も赤く脈打たせる
    } else if (a.t < WIND + DASH) {
      if (t.mesh.visible) { endBeam(); jolt(0.5); }
      b.glow.material.opacity = 0.3;
      const u = (a.t - WIND) / DASH;
      const e = u * u * (3 - 2 * u);
      b.pos.copy(a.from).addScaledVector(dir, -46 + (span + 46) * e);
      // 噴射の尾
      _c.set(b.pos.x - P[0], b.pos.y - P[1], b.pos.z - P[2]);
      for (let i = 0; i < 5; i++) puffs.puff([_c.x - dir.x * 46 + (R() - 0.5) * 50, _c.y - dir.y * 46 + (R() - 0.5) * 50, _c.z - dir.z * 46 + (R() - 0.5) * 50], [-dir.x * 20, -dir.y * 20, -dir.z * 20], 0.5 + R() * 0.5, 3, 12, R() < 0.5 ? KIND.FIRE : KIND.SMOKE, 1, 1);
      if (u > 0.55 && !a.done) {
        const d = _c.length();
        if (d < HIT_D) {
          if (player.dodging) { a.done = true; }
          else if (!player.invuln) { a.done = true; enemies.hurtPlayer(25, state, [_c.x / d, _c.y / d, _c.z / d], fx); jolt(1); }
        }
      }
    } else if (a.t < WIND + DASH + STOP) {
      if (!a.arrived) { a.arrived = true; jolt(0.9); }
      b.glow.material.opacity = 0.3;
      b.pos.copy(a.from).addScaledVector(dir, span);
    } else {
      const u = Math.min(1, (a.t - WIND - DASH - STOP) / BACK);
      const e = u * u * (3 - 2 * u);
      _c.copy(a.from).addScaledVector(dir, span);
      b.pos.lerpVectors(_c, a.from, e);
    }
    return a.t > WIND + DASH + STOP + BACK;
  }

  // 炉の太い光線：細い線と溜めの光で2秒予告し、発射の少し前に狙いを固める
  function stepBeam(a, state, player, fx, dt, P) {
    const WARN = 2.0;
    const FIRE = 2.4;
    const t = b.beam;
    if (!a.c) { a.c = new THREE.Vector3(P[0], P[1], P[2]); a.tick = 0; alert('炉の光線', 1.8); }
    a.tick -= dt;
    // 狙い：予告の線は自機の行き先を追い、撃つ0.5秒前に固まる（線が止まったら向きを変える）。撃ってからはごくゆっくり
    if (a.t < WARN - 0.5) {
      const lead = WARN - a.t + 0.1;
      const ov = orbitVel(player, lead);
      _a.set(P[0] + ov[0] * lead - a.c.x, P[1] + ov[1] * lead - a.c.y, P[2] + ov[2] * lead - a.c.z);
      const dist = _a.length();
      if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, 150 * dt / dist));
    } else if (a.t > WARN) {
      _a.set(P[0] - a.c.x, P[1] - a.c.y, P[2] - a.c.z);
      const dist = _a.length();
      if (dist > 1e-3) a.c.addScaledVector(_a, Math.min(1, 7 * dt / dist));
    }
    _b.set(0, 0, -34).applyMatrix4(b.group.matrixWorld); // 炉の位置（相対）
    const A = _b.clone();
    const dir = new THREE.Vector3(a.c.x - P[0], a.c.y - P[1], a.c.z - P[2]).sub(A).normalize();
    t.mesh.visible = a.t < WARN + FIRE;
    t.u.uTime.value = state.time;
    t.mesh.position.copy(A);
    t.mesh.quaternion.setFromUnitVectors(Z, dir);
    if (a.t < WARN) {
      const u = a.t / WARN;
      const w = 0.05 + 0.1 * u + 0.05 * Math.max(0, Math.sin(state.time * 30));
      t.mesh.scale.set(w, w, 1);
      t.u.uIntensity.value = 2.4;
      t.u.uLen.value = 760;
      b.glow.material.opacity = 0.5 + 0.4 * u;
      if (a.t > WARN - 0.5) b.danger = 0.1; // 狙いが固まった。今が向きを変える時
      b.glow.scale.setScalar(GLOW + 24 * u);
      // 光が炉へ吸い込まれる
      if (R() < 0.6) {
        _c.set((R() - 0.5), (R() - 0.5), (R() - 0.5)).normalize();
        puffs.puff([A.x + _c.x * 60, A.y + _c.y * 60, A.z + _c.z * 60], [-_c.x * 60, -_c.y * 60, -_c.z * 60], 0.6, 2, 0.6, KIND.FLASH, 0, 1);
      }
    } else if (a.t < WARN + FIRE) {
      if (!a.fired) { a.fired = 1; jolt(0.8); b.flash = Math.max(b.flash, 0.18); }
      const u = (a.t - WARN) / FIRE;
      const w = Math.min(1, u * 12) * Math.min(1, (1 - u) * 8);
      t.mesh.scale.set(w, w, 1);
      b.glow.scale.setScalar(GLOW + 24);
      beamContact(t, A, dir, 9 * w, state, player, fx, 9, a);
      b.shake = Math.max(b.shake, 0.3);
    } else {
      b.glow.scale.setScalar(GLOW);
      endBeam();
    }
    return a.t > WARN + FIRE + 0.4;
  }

  // 全方向の弾の輪：炉が光って輪が広がる予告 → 水平に全方向へ24発 → 少しずらして、もう一度。
  // 1つ目の輪は1発が自機の行き先を通る。もう1つは隙間が自機の居る所へ来る
  function stepRing(a, state, player, dt, P) {
    const WARN = 1.0;
    if (a.t < 0.01 && !a.warned) { a.warned = true; alert('全方向弾', 1.6); }
    if (a.t < WARN) {
      const u = a.t / WARN;
      b.glow.material.opacity = 0.5 + 0.5 * Math.sin(u * 20);
      b.glow.scale.setScalar(GLOW + 34 * u);
    }
    const SHOTS = [WARN, WARN + 0.7, WARN + 1.4];
    if (a.fired < SHOTS.length && a.t >= SHOTS[a.fired]) {
      _a.set(0, 0, -34).applyMatrix4(b.group.matrixWorld);
      const from = _a.toArray();
      const speed = 170;
      const WARN_B = 0.6;
      const d = aimDir(from, player, speed, 0.6, WARN_B);
      const base = Math.atan2(d[0], d[2]);
      const off = a.fired === 1 ? Math.PI / 24 : 0;
      const dy = d[1];
      const N = 22;
      for (let k = 0; k < N; k++) {
        const th = base + off + k / N * Math.PI * 2;
        const h = Math.sqrt(Math.max(0, 1 - dy * dy));
        enemies.fireBolt(from, P, [Math.sin(th) * h, dy, Math.cos(th) * h], speed, k % 2, WARN_B, 2.4);
      }
      puffs.puff(from, [0, 0, 0], 0.2, 8, 40, KIND.FLASH, 0, 1);
      jolt(0.4);
      a.fired += 1;
    }
    if (a.t >= WARN + 2) b.glow.scale.setScalar(GLOW);
    return a.t > WARN + 2.2;
  }

  function stepAttack(state, player, fx, dt, P) {
    const a = b.atk;
    let end = false;
    if (a.name === 'fan') end = stepFan(a, state, player, dt, P);
    else if (a.name === 'missiles') end = stepMissiles(a, state, player, dt);
    else if (a.name === 'mines') end = stepMines(a, state, player, dt, P);
    else if (a.name === 'sweep') { end = stepSweep(a, state, player, fx, dt, P); if (end) endSweep(); }
    else if (a.name === 'summon') end = stepSummon(a);
    else if (a.name === 'ram') end = stepRam(a, state, player, fx, dt, P);
    else if (a.name === 'beam') end = stepBeam(a, state, player, fx, dt, P);
    else if (a.name === 'ring') end = stepRing(a, state, player, dt, P);
    if (b.atk) a.t += dt;
    if (end) { b.atk = null; b.gap = FORCE_ATK ? 1.5 : (b.phase === PHASE.TURRETS ? 1.3 : 1.6); }
  }

  // ---- 毎コマ ----
  const _face = new THREE.Quaternion();
  function faceTo(rate, P, dt) {
    _a.set(P[0], P[1], P[2]);
    _m.lookAt(b.pos, _a, THREE.Object3D.DEFAULT_UP);
    _face.setFromRotationMatrix(_m);
    if (rate <= 0) b.group.quaternion.copy(_face);
    else b.group.quaternion.rotateTowards(_face, rate * dt);
  }

  function update(state, player, fx, dt, P) {
    fxRef = fx;
    updateScreen(state, dt);
    if (b.splash) b.splash.visible = false;
    updateMines(state, player, fx, dt, P);
    updateMissiles(state, player, fx, dt, P);
    if (!b.group || b.phase === PHASE.NONE) return;
    const g = b.group;
    b.t += dt;

    if (b.phase === PHASE.ENTRY) stepEntry(state, dt, P);
    else if (b.phase === PHASE.DYING) stepDying(state, fx, dt, P);
    else stepFight(state, player, fx, dt, P);

    g.position.set(b.pos.x - P[0], b.pos.y - P[1], b.pos.z - P[2]);
    b.spin += b.spinRate * dt;
    b.armRig.rotation.z = b.spin;
    g.updateMatrixWorld(true);

    // 炉の輪の開き
    if (b.phase !== PHASE.DYING) {
      b.open += (b.wantOpen - b.open) * Math.min(1, dt * 4);
      const e = b.open * b.open * (3 - 2 * b.open);
      for (const a of b.arcs) a.mesh.position.set(a.x * (1 + 0.8 * e), a.y * (1 + 0.8 * e), -30);
    }
    // 腕の開き（登場）と外れ（第2段階）
    for (const a of b.arms) a.arm.position.x = (b.ext - 1) * 42 + b.detach * 62;

    // 煙の跡
    for (const w of b.wounds) {
      w.acc += dt * 9;
      if (w.acc > 1) {
        w.acc -= 1;
        w.node.getWorldPosition(_a);
        puffs.puff(_a.toArray(), [(R() - 0.5) * 3, 3 + R() * 3, (R() - 0.5) * 3], 1.6 + R(), 3, 12, KIND.SMOKE, 0.5, 1);
        if (R() < 0.3) puffs.puff(_a.toArray(), [0, 0, 0], 0.3, 2, 5, KIND.FIRE, 1, 1);
      }
    }
    updateBar();
  }

  function stepEntry(state, dt, P) {
    const DUR = 4.6;
    const t = b.t;
    if (!b.back) b.back = new THREE.Vector3().subVectors(HOME, new THREE.Vector3(P[0], P[1], P[2])).setY(0).normalize();
    const u = Math.min(1, t / 3.3);
    const e = 1 - Math.pow(1 - u, 3);
    b.pos.copy(HOME).addScaledVector(b.back, 1500 * (1 - e));
    b.pos.y = HOME.y - 80 * (1 - e);
    faceTo(0, P, dt);
    // 着いた所で腕が順に開き、揺れる
    b.ext = Math.max(0, Math.min(1, (t - 2.6) / 1.2));
    b.spinRate = 0.9 * (1 - b.ext) + 0.12 * b.ext;
    if (t > 3.0 && !b.landed) { b.landed = true; jolt(0.9); }
    if (t > DUR) {
      b.phase = PHASE.TURRETS;
      b.t = 0;
      b.gap = 1.0;
      say(b.radarOff ? 'レーダーが落ちて、砲台が2基止まっている。残りを叩いて' : '砲台を全部壊せば腕が外れる。予告の線を見て、向きを変えて');
    }
  }

  function stepFight(state, player, fx, dt, P) {
    const g = b.group;
    // 本体の動き：浮き沈みと、段階ごとの横の動き
    const bob = Math.sin(b.t * 0.7) * 14;
    const ramming = b.atk && b.atk.name === 'ram';
    if (!ramming) {
      if (b.phase === PHASE.ARMS || b.phase === PHASE.CORE) {
        // 横へ大きく動く（回る中心は変えないので、狙いやすさは保つ）
        const sx = Math.sin(b.t * 0.45) * 95;
        const sz = Math.sin(b.t * 0.31 + 1.0) * 60;
        const want = _a.set(HOME.x + sx, HOME.y + bob, HOME.z + sz);
        b.pos.lerp(want, Math.min(1, dt * 1.2));
      } else {
        b.pos.set(HOME.x, HOME.y + bob, HOME.z);
      }
      faceTo(b.phase === PHASE.TURRETS ? 0.34 : 0.55, P, dt);
    } else faceTo(1.2, P, dt);
    g.position.set(b.pos.x - P[0], b.pos.y - P[1], b.pos.z - P[2]);
    g.updateMatrixWorld(true);

    if (b.phase === PHASE.TURRETS) {
      b.wantOpen = 0;
      b.glow.material.opacity = Math.max(0, b.glow.material.opacity - dt * 1.5);
      let alive = 0;
      for (const tu of b.turrets) {
        if (tu.dead) continue;
        alive += 1;
        tu.muzzle.getWorldPosition(_a);
        tu.target.rel.copy(_a);
        tu.target.radius = 15;
      }
      b.spinRate += (0.12 - b.spinRate) * Math.min(1, dt);
      if (!alive) { toArms(); return; }
    }
    if (b.phase === PHASE.ARMS) {
      b.wantOpen = 0;
      if (!b.atk || b.atk.name !== 'summon') b.glow.material.opacity = Math.max(0, b.glow.material.opacity - dt * 1.5);
      b.detach = Math.min(1, b.detach + dt / 1.8);
      let alive = 0;
      for (const a of b.arms) {
        if (a.dead) continue;
        alive += 1;
        a.hab.getWorldPosition(_a);
        a.target.rel.copy(_a);
        a.target.radius = b.detach > 0.5 ? 26 : 0;
      }
      if (!alive) { toCore(); return; }
    }
    if (b.phase === PHASE.CORE) {
      b.closeT = Math.max(0, b.closeT - dt);
      b.wantOpen = b.closeT > 0 ? 0 : 1;
      if (b.closeT <= 0) b.coreAcc = Math.max(0, b.coreAcc - dt * 4);
      const glowBase = b.closeT > 0 ? 0.12 : 0.65 + 0.25 * Math.sin(state.time * 9);
      if (!b.atk || b.atk.name === 'summon') b.glow.material.opacity += (glowBase - b.glow.material.opacity) * Math.min(1, dt * 5);
      _a.set(0, 0, -30).applyMatrix4(g.matrixWorld);
      b.core.rel.copy(_a);
      b.core.radius = 34;
      // 炉の傷から火を吹く
      if (R() < dt * 14 && b.coreHp < CORE_HP * 0.6) {
        _b.set((R() - 0.5) * 80, (R() - 0.5) * 50, (R() - 0.5) * 50).applyMatrix4(g.matrixWorld);
        puffs.puff(_b.toArray(), [(R() - 0.5) * 6, 4, (R() - 0.5) * 6], 1 + R(), 4, 14, R() < 0.3 ? KIND.FIRE : KIND.SMOKE, 0.5, 1);
      }
    }
    if (b.atk) stepAttack(state, player, fx, dt, P);
    else {
      b.gap -= dt;
      if (b.gap <= 0) nextAttack();
    }
  }

  function clearAttack() {
    if (b.atk && b.atk.name === 'sweep') endSweep();
    if (b.atk && (b.atk.name === 'ram' || b.atk.name === 'beam')) endBeam();
    b.atk = null;
  }
  function toArms() {
    clearAttack();
    b.phase = PHASE.ARMS;
    b.t = 0;
    b.idx = 0;
    b.gap = 2.4;
    jolt(1);
    for (const a of b.arms) if (fxRef) { a.hab.getWorldPosition(_a); fxRef.explode(_a.toArray(), 4); }
    say('砲台が全滅。腕が外れた！ 光線の輪は間をくぐるか、外へ抜けて');
  }
  function toCore() {
    clearAttack();
    for (const t of b.armBeams) t.mesh.visible = false;
    b.phase = PHASE.CORE;
    b.t = 0;
    b.idx = 0;
    b.gap = 2.4;
    b.detach = 1;
    jolt(1);
    say('腕が全部落ちた。炉が開く！ 撃ち込んで。突進は回避の回転でかわして');
  }

  function stepDying(state, fx, dt, P) {
    const g = b.group;
    b.dying += dt;
    const before = b.dying - dt;
    const STEP = 0.12 - Math.min(0.07, b.dying * 0.018); // だんだん間隔が詰まる
    if (b.dying < 3.8 && Math.floor(before / STEP) !== Math.floor(b.dying / STEP)) {
      _a.set((R() - 0.5) * 170, (R() - 0.5) * 90, (R() - 0.5) * 120).applyMatrix4(g.matrixWorld);
      fx.explode(_a.toArray(), 4 + R() * 6);
      jolt(0.5);
    }
    // 燃えながら傾き、部品が順に外れて飛ぶ
    g.rotateX(dt * 0.09);
    g.rotateZ(dt * 0.13);
    b.pos.y -= dt * 7;
    for (const p of b.parts) {
      const u = p.userData;
      if (b.dying < u.at) continue;
      if (!u.off) { u.off = true; _a.copy(p.position).applyMatrix4(g.matrixWorld); fx.explode(_a.toArray(), 4); u.v.normalize().multiplyScalar(16 + R() * 22); }
      p.position.addScaledVector(u.v, dt);
      p.rotation.x += u.s.x * dt; p.rotation.y += u.s.y * dt; p.rotation.z += u.s.z * dt;
    }
    b.glow.material.opacity = Math.max(0, 1 - b.dying / 3.5) * (0.6 + 0.4 * Math.sin(state.time * 30));
    b.glow.scale.setScalar(GLOW + 16);
    if (before < 4.2 && b.dying >= 4.2) {
      _a.set(0, 0, 0).applyMatrix4(g.matrixWorld);
      fx.explode(_a.toArray(), 26);
      fx.explode([_a.x + 30, _a.y + 10, _a.z - 20], 11);
      fx.explode([_a.x - 26, _a.y - 14, _a.z + 16], 9);
      b.flash = 0.35;
      jolt(1.2);
      g.visible = false;
      b.wounds.length = 0;
      setBar(-1);
    }
    if (b.dying > 7) b.done = true;
  }

  function updateBar() {
    if (b.phase === PHASE.DYING) return;
    if (b.phase === PHASE.ENTRY) { setBar(Math.min(1, b.t / 3.2)); return; }
    const hp = b.turrets.reduce((s, t) => s + Math.max(0, t.dead ? 0 : t.hp), 0) + b.arms.reduce((s, a) => s + Math.max(0, a.dead ? 0 : a.hp), 0) + b.coreHp;
    setBar(hp / TOTAL_HP);
  }

  function contacts(out) {
    if (b.phase === PHASE.TURRETS) for (const t of b.turrets) if (!t.dead) out.push({ kind: 'ship', rel: t.target.rel, radius: 15, aim: t.target });
    if (b.phase === PHASE.ARMS) for (const a of b.arms) if (!a.dead && a.target.radius > 0) out.push({ kind: 'ship', rel: a.target.rel, radius: 26, aim: a.target });
    if (b.phase === PHASE.CORE) out.push({ kind: 'ship', rel: b.core.rel, radius: 34, aim: b.core });
    for (const m of mines) if (m.alive && m.age >= 0) out.push({ kind: 'missile', rel: m.target.rel, radius: 3.2 });
    for (const m of missiles) if (m.alive) out.push({ kind: 'missile', rel: m.target.rel, radius: 2.6 });
  }

  return {
    build, start, update, contacts,
    get phase() { return b.phase; },
    // ボス戦の間（回る中心を返す間）。撃破の間も回り続けて、最期を画面に入れる
    get fighting() { return b.phase >= PHASE.ENTRY && !b.done; },
    get done() { return b.done; },
    get info() {
      return { phase: b.phase, coreHp: Math.round(b.coreHp), turrets: b.turrets.filter((t) => !t.dead).length, arms: b.arms.filter((a) => !a.dead).length, atk: b.atk ? b.atk.name : '', atkT: b.atk ? Number(b.atk.t.toFixed(2)) : 0, open: Number(b.open.toFixed(2)), bossD: b.group ? Math.round(b.group.position.length()) : -1, mines: mines.filter((m) => m.alive).length, missiles: missiles.filter((m) => m.alive).length };
    },
    // 確認用：今の段階の的を削る
    debugHit(what, n) {
      if (what === 'turrets') for (const t of b.turrets) hitTurret(t, n);
      if (what === 'core') {
        if (b.phase === PHASE.ARMS) for (const a of b.arms) hitArm(a, n);
        else hitCore(n);
      }
    },
  };
}
