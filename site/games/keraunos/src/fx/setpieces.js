import * as THREE from 'three';

// 道の途中の仕掛け。どれも基地の部品（outpost.parts）で作り、世界の座標で持つ。
// 倒れる柱：通路の壁から倒れ込み、道の半分をふさぐ。上か下へ避ける。撃てば壊せる
// 隔壁：上下から閉まり、細い隙間だけ残る。隙間の高さへ寄せる
// 宝箱のゲート：撃って開けると爆雷が出る
// 漂う骨組み：回りながら道を横切る。撃てば壊せる

export function createSetPieces({ scene, world, outpost, say, addScore, drop, R, enemies }) {
  const pieces = [];

  function mesh(part, lod = 1) {
    const P = outpost.parts[part];
    if (!P) return null;
    const m = new THREE.Mesh(P.geos ? P.geos[lod] : P.geo, P.mat);
    m.castShadow = false;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  function addTarget(p, radius, hp, size = 2.5) {
    p.hp = hp;
    p.target = {
      rel: new THREE.Vector3(), radius, r0: radius, size, aim: true,
      onDamage: (amount) => { hit(p, amount); return false; },
    };
    world.targets.push(p.target);
  }

  let fxRef = null;
  function remove(p) {
    p.dead = true;
    if (p.mesh) { scene.remove(p.mesh); p.mesh = null; }
    for (const m of p.extra || []) scene.remove(m);
    p.extra = null;
    if (p.target) {
      p.target.radius = 0;
      const i = world.targets.indexOf(p.target);
      if (i >= 0) world.targets.splice(i, 1);
    }
  }

  function hit(p, amount) {
    if (p.dead) return;
    p.hp -= amount;
    if (p.hp > 0) return;
    if (fxRef) fxRef.explode(p.target.rel.toArray(), p.boom || 2.4);
    addScore(p.score || 150);
    if (p.reward) drop(p.reward, p.target.rel.toArray());
    if (p.onBreak) p.onBreak();
    remove(p);
  }

  // 倒れる柱：壁の根元（x=side*48）を軸に、上向きから内側へ倒れる。長さ52で道の真ん中まで届く
  function pillar(z, side, y = 0) {
    // 骨組みの部品の使い回しをやめ、太い柱の専用の形にする（長さ52がそのまま当たりの長さ）
    const m = mesh('girder');
    if (!m) return;
    const p = { kind: 'pillar', mesh: m, z, side, y, t: -1, score: 200, boom: 2.6 };
    addTarget(p, 9, 7);
    pieces.push(p);
  }

  // 隔壁：上下の扉が閉まり、高さ yc のまわりに ±gap の隙間を残す
  function bulkhead(z, yc, gap = 13) {
    // 分厚い鋼板の扉（幅130・高さ70）。ドッキング部品を引き伸ばしていたのをやめた
    const a = mesh('blastDoor'); const b = mesh('blastDoor');
    if (!a) return;
    pieces.push({ kind: 'bulkhead', mesh: a, extra: [b], z, yc, gap, t: -1, h: 70, passed: false });
  }

  // 宝箱のゲート：道の脇に立つ箱。撃って壊すと爆雷
  function gate(z, side, y = 8) {
    const m = mesh('box', 0);
    if (!m) return;
    m.scale.setScalar(3.2);
    const p = { kind: 'gate', mesh: m, pos: [side * 30, y, z], spin: 0.5, reward: 'B', score: 300, boom: 3 };
    addTarget(p, 9, 8);
    pieces.push(p);
  }

  // 漂う骨組み：x0 から道を横切る
  function drift(z, x0, y, vx, part = 'girder') {
    const m = mesh(part === 'truss' ? 'girder' : part);
    if (!m) return;
    const p = { kind: 'drift', mesh: m, pos: [x0, y, z], vx, spin: 0.5 + R() * 0.7, axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), score: 120, boom: 2.2 };
    addTarget(p, 11, 5);
    pieces.push(p);
  }

  let cool = 0;
  function hurt(state, player, fx, amount, n, text) {
    if (cool > 0 || player.invuln) return;
    cool = 1;
    enemies.hurtPlayer(amount, state, n, fx);
    if (text) say(text);
  }

  const _q = new THREE.Quaternion();
  const _z = new THREE.Vector3(0, 0, 1);
  const _yq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  function update(state, player, fx, dt, P) {
    fxRef = fx;
    cool -= dt;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.dead) { pieces.splice(i, 1); continue; }
      const rz = (p.pos ? p.pos[2] : p.z) - P[2];
      if (rz < -60) { remove(p); pieces.splice(i, 1); continue; }
      if (rz > 1400) { if (p.mesh) p.mesh.visible = false; if (p.target) p.target.radius = 0; continue; }
      if (p.mesh) p.mesh.visible = true;
      if (p.target) p.target.radius = p.target.r0;

      if (p.kind === 'pillar') {
        // 170 手前で倒れ始める（4秒の余裕）。ゆっくり傾き、最後は勢いよく倒れる
        if (p.t < 0 && rz < 170) { p.t = 0; say('柱が倒れてくる！ 上か下へ'); }
        if (p.t >= 0) p.t += dt;
        const u = Math.min(1, Math.max(0, p.t) / 1.8);
        const a = (Math.PI / 2) * (1 - u * u * u);      // 上向き(90度)→水平(0度)
        // 柱の軸（長さ方向）：壁から内側へ
        const dirX = -p.side * Math.cos(a); const dirY = Math.sin(a);
        const L = 52;
        const cx = p.side * 48 + dirX * L / 2; const cy = p.y + dirY * L / 2;
        p.mesh.position.set(cx - P[0], cy - P[1], rz);
        _q.setFromUnitVectors(_z, new THREE.Vector3(dirX, dirY, 0));
        p.mesh.quaternion.copy(_q);
        p.target.rel.set(cx - P[0], cy - P[1], rz);
        if (Math.abs(rz) < 5) {
          // 自機と柱の線分の距離（横から見た面の上で）
          const ax = p.side * 48 - P[0]; const ay = p.y - P[1];
          const tt = Math.max(0, Math.min(L, -(ax * dirX + ay * dirY)));
          const dx = ax + dirX * tt; const dy = ay + dirY * tt;
          if (Math.hypot(dx, dy) < 6) hurt(state, player, fx, 15, [dx, dy, 1], null);
        }
      } else if (p.kind === 'bulkhead') {
        if (p.t < 0 && rz < 200) { p.t = 0; say(p.yc > 4 ? '隔壁が閉まる！ 上の隙間へ' : p.yc < -4 ? '隔壁が閉まる！ 下の隙間へ' : '隔壁が閉まる！ 真ん中へ'); }
        if (p.t >= 0) p.t += dt;
        const u = Math.min(1, Math.max(0, p.t) / 3.0);
        const e = u * u * (3 - 2 * u);
        const off = p.gap + p.h / 2 + (1 - e) * 44;
        p.mesh.position.set(-P[0], p.yc + off - P[1], rz);
        p.extra[0].position.set(-P[0], p.yc - off - P[1], rz);
        if (!p.passed && rz < 1) {
          p.passed = true;
          const miss = Math.abs(P[1] - p.yc) - (p.gap + (1 - e) * 44);
          if (miss > 0) hurt(state, player, fx, 15, [0, P[1] > p.yc ? 1 : -1, 1], '隔壁に接触！');
          else addScore(100);
        }
      } else {
        if (p.kind === 'drift') p.pos[0] += p.vx * dt;
        const rx = p.pos[0] - P[0]; const ry = p.pos[1] - P[1];
        p.mesh.position.set(rx, ry, rz);
        p.target.rel.set(rx, ry, rz);
        if (p.axis) { p.mesh.quaternion.setFromAxisAngle(p.axis, state.time * p.spin); } else p.mesh.rotation.y = state.time * p.spin;
        if (p.kind === 'drift' && Math.hypot(rx, ry, rz) < 9) hurt(state, player, fx, 10, [rx, ry, rz], null);
      }
    }
  }

  function contacts(out) {
    for (const p of pieces) {
      if (p.kind === 'gate' && !p.dead && p.target.radius > 0) out.push({ kind: 'ship', rel: p.target.rel, radius: 9, aim: p.target });
    }
  }

  return { pillar, bulkhead, gate, drift, update, contacts, get count() { return pieces.length; } };
}
