// 自機の状態の計算。three.js に依存しない。
// 1/60 秒刻みで stepShip を呼ぶ前提で、描画側はこの状態だけを見て絵を作る。

import { BALANCE } from './weaponBalance.js';

const { twin: TWIN } = BALANCE.main;
const { cannon: CANNON } = BALANCE.heavy;
const { lance: LANCE } = BALANCE.sub;

export const SHIP = {
  cruiseMach: 0.85,
  maxMach: 1.58,
  machRate: 0.75, // 秒あたりのマッハの変化
  boostRate: 2.2, // 秒あたりのブースト量の変化
  flapRate: 2.5, // 秒あたりの開閉クリップの進行（上限）
  twinInterval: TWIN.interval,
  twinLife: TWIN.life,
  chargeRamp: CANNON.ramp,
  chargeMin: CANNON.min,
  chargeBase: CANNON.base,
  chargePerLevel: CANNON.perLevel,
  shockLife: 1.6,
  shockRadius: 12,
  vaporLife: 1.3,
  shakeLife: 1.1,
  lanceInterval: LANCE.interval,
  lanceLife: 1.1,
  lanceRibbons: LANCE.count,
};

export function createShipState() {
  return {
    time: 0,
    mach: SHIP.cruiseMach,
    boostAmount: 0,
    flapClipTime: 1,
    supersonic: false,
    shockCount: 0,
    lastShock: -1e9,
    shockwaves: [],
    vaporCone: 0,
    cameraShake: 0,
    twinShots: 0,
    twinTimer: 0,
    twinBolts: [],
    charge: { level: 0, firing: false, fireLeft: 0 },
    lance: { volleys: 0, ribbons: [], cooldown: 0 },
    lancePrev: false,
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function stepShip(s, dt, input) {
  const inp = input || {};
  s.time += dt;

  // 速度は巡航と最大の間を一定の割合で行き来する。
  const target = inp.boost ? SHIP.maxMach : SHIP.cruiseMach;
  const dv = target - s.mach;
  const vStep = SHIP.machRate * dt;
  s.mach = Math.abs(dv) <= vStep ? target : s.mach + Math.sign(dv) * vStep;

  // 見た目のブースト量（炎・視野・速度線の強さ）
  const bt = inp.boost ? 1 : 0;
  const bd = bt - s.boostAmount;
  const bStep = SHIP.boostRate * dt;
  s.boostAmount = Math.abs(bd) <= bStep ? bt : s.boostAmount + Math.sign(bd) * bStep;

  // 装甲の開閉。巡航で1.0、ブーストで2.0。
  const flapTarget = 1 + s.boostAmount;
  const fd = flapTarget - s.flapClipTime;
  const fStep = SHIP.flapRate * dt;
  s.flapClipTime = Math.abs(fd) <= fStep ? flapTarget : s.flapClipTime + Math.sign(fd) * fStep;

  // 音速を上へ越えた瞬間だけ衝撃波を出す。0.95 未満に戻るまで再発しない。
  if (s.mach >= 1 && !s.supersonic) {
    s.supersonic = true;
    s.shockCount += 1;
    s.lastShock = s.time;
    s.shockwaves.push({ age: 0, radius: 0, strength: 1 });
  } else if (s.mach < 0.95) {
    s.supersonic = false;
  }

  for (const w of s.shockwaves) {
    w.age += dt;
    w.radius = SHIP.shockRadius * (w.age / SHIP.shockLife);
    w.strength = clamp01(1 - w.age / SHIP.shockLife);
  }
  s.shockwaves = s.shockwaves.filter((w) => w.age < SHIP.shockLife);

  s.vaporCone = clamp01(1 - (s.time - s.lastShock) / SHIP.vaporLife);
  s.cameraShake = clamp01(1 - (s.time - s.lastShock) / SHIP.shakeLife);

  // ツインレーザー（主武装）。機関砲・散弾は s.twinInterval で間隔を変える。
  // 間隔を変えた武装は、離している間も次の1発までの待ちを進め、待ち終えていれば押した瞬間に撃てる
  const iv = s.twinInterval || SHIP.twinInterval;
  if (inp.twin) {
    s.twinTimer += dt;
    while (s.twinTimer >= iv) {
      s.twinTimer -= iv;
      s.twinShots += 1;
      s.twinBolts.push({ side: 1, age: 0 }, { side: -1, age: 0 });
    }
  } else {
    s.twinTimer = s.twinInterval ? Math.min(iv, s.twinTimer + dt) : 0;
  }
  for (const b of s.twinBolts) b.age += dt;
  s.twinBolts = s.twinBolts.filter((b) => b.age < SHIP.twinLife);

  // 主砲（溜め → 発射）。レールガン（s.railMode）は溜めないので、押しているかだけを残す
  const c = s.charge;
  c.held = !!inp.charge;
  if (s.railMode) {
    c.level = 0; c.firing = false; c.fireLeft = 0;
  } else if (inp.charge) {
    if (!c.firing) c.level = Math.min(1, c.level + dt / SHIP.chargeRamp);
  } else if (c.firing) {
    c.fireLeft -= dt;
    if (c.fireLeft <= 1e-9) {
      c.firing = false;
      c.fireLeft = 0;
      c.level = 0;
    }
  } else if (c.level > 0) {
    if (c.level >= SHIP.chargeMin) {
      c.firing = true;
      c.fireLeft = SHIP.chargeBase + SHIP.chargePerLevel * c.level;
    } else {
      c.level = 0;
    }
  }

  // 誘導ランス（押した瞬間に6本、1.5秒に1回）
  const L = s.lance;
  L.cooldown = Math.max(0, L.cooldown - dt);
  if (inp.lance && !s.lancePrev && L.cooldown <= 0) {
    L.volleys += 1;
    L.cooldown = SHIP.lanceInterval;
    for (let i = 0; i < SHIP.lanceRibbons; i++) L.ribbons.push({ index: i, age: 0 });
  }
  s.lancePrev = !!inp.lance;
  for (const r of L.ribbons) r.age += dt;
  L.ribbons = L.ribbons.filter((r) => r.age < SHIP.lanceLife);

  return s;
}
