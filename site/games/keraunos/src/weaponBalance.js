// 武装の数値の正本。three.js に依存しない。各武装の部品はここから読む。
// 上の const に調整の値を置き、BALANCE の dps / burst は同じ値から計算する（画面の表示と実際の威力がずれないように）。
// 共通の項目（画面に出す）：
//   weight 重さ1〜4（重い＝強い） / dps 持続の毎秒火力（Lv1） / burst 1回の発射の最大の総ダメージ / range 射程
//   ammo 弾数（無限は null） / cool 次まで秒 / role 役割の語 / desc 何に強く何に弱いか
// 実測の撃破時間と下位互換の判定：.work/新武装/バランス表.md、.work/t8944/test_balance.mjs

const TWIN = { interval: 0.09, bolts: 2, damage: [1, 0.85, 0.87], speed: 220, life: 1.6 };
const GUN = { interval: [0.06, 0.045, 0.035], rounds: 2, damage: [1.0, 1.275, 1.52], speed: 340, range: 150, jitter: 0.07, len: 20 };
// 散弾の距離：ボス戦の距離（125〜190）でも効くように、全力 60・半分 120・下限 3 割・届く距離 200（11/9。spec REQ-015）
const SPREAD = { interval: 0.65, pellets: [6, 8, 11], damage: [3, 3.83, 4.25], cone: 0.3, speed: 290, range: 200, near: 60, mid: 120, midK: 0.5, far: 0.3, len: 5 };
const CANNON = { beamDps: 94, len: 400, stop: 16, ramp: 1.2, min: 0.45, base: 0.4, perLevel: 1.2 };
// regen：撃たずにいても弾が1発戻る秒。snipe：大蛇の溜めている口を撃ち抜いたときに足す削り（11/9。spec REQ-015）
const RAIL = { ammo: 8, ammoMax: 12, resupply: 2, regen: 3.5, cool: 1.2, damage: 80, range: 600, pierce: 10, snipe: 100 };
const LANCE = { interval: 1.5, count: 6, damage: 6.5, life: 1.6, speedMax: 200 };
const SALVO = { max: 8, lockEvery: 0.15, cone: 0.5, range: 420, cool: 3.2, bigShare: 4, ammo: 24, ammoMax: 32, resupply: 8, damage: 6 };
const ROCKET = { ammo: 12, ammoMax: 16, resupply: 4, cool: 1.5, ignite: 0.12, speed: 30, accel: 260, vmax: 130, range: 300, fuse: 3.0, fuseMax: 6, damage: 60, splash: 30, radius: 22 };

const r1 = (v) => Math.round(v * 10) / 10;

// 主砲は溜めの量 L で1回の総量が決まる：毎秒の威力 × 撃つ秒
export const cannonBurst = (L) => CANNON.beamDps * (0.55 + 0.45 * L) * (CANNON.base + CANNON.perLevel * L);
// 散弾の1粒の距離の倍率：near まで1、mid で midK、その先も同じ傾きで far まで落ちる
export const spreadFalloff = (d) => {
  const k = 1 - (1 - SPREAD.midK) * Math.max(0, d - SPREAD.near) / (SPREAD.mid - SPREAD.near);
  return Math.max(SPREAD.far, Math.min(1, k));
};

export const BALANCE = {
  main: {
    twin: {
      ...TWIN, weight: 1, dps: r1(TWIN.bolts * TWIN.damage[0] / TWIN.interval), burst: TWIN.bolts * TWIN.damage[0], range: TWIN.speed * TWIN.life, ammo: null, cool: TWIN.interval,
      role: '長射程の基準', desc: '狙いの補正があり遠くまで届く。どこでも使えるが、近距離や硬い敵では他に劣る',
    },
    gun: {
      ...GUN, weight: 2, dps: r1(GUN.rounds * GUN.damage[0] / GUN.interval[0]), burst: GUN.rounds * GUN.damage[0], ammo: null, cool: GUN.interval[0],
      role: '近接の削り', desc: '近づいて硬い敵を削るのに強い。補正がなく弾がぶれ、射程の外や遠くの小さな敵には弱い',
    },
    spread: {
      ...SPREAD, weight: 2, dps: r1(SPREAD.pellets[0] * 2 * SPREAD.damage[0] / SPREAD.interval), burst: r1(SPREAD.pellets[0] * 2 * SPREAD.damage[0]), ammo: null, cool: SPREAD.interval,
      role: '至近の一撃', desc: '至近の編隊と硬い敵に最も強い。遠いほど弱まり、150より遠くでは3割まで落ちる',
    },
  },
  heavy: {
    cannon: {
      ...CANNON, weight: 4, dps: r1(cannonBurst(1) / (CANNON.ramp + CANNON.base + CANNON.perLevel)), burst: r1(cannonBurst(1)), range: CANNON.len, ammo: null, cool: CANNON.ramp,
      role: '溜めの大火力', desc: '弾数無限で1回の総量が大きく、並んだ敵を貫く。溜める間は撃てず、急な敵には間に合わない',
    },
    rail: {
      ...RAIL, weight: 3, dps: r1(RAIL.damage / RAIL.cool), burst: RAIL.damage,
      role: '遠距離の狙撃', desc: '溜めなしで遠くの硬い敵を撃ち抜き、並んだ敵も貫く。大蛇が溜めている口を撃ち抜くと光線を止める。弾は少ないが、ゆっくり戻る',
    },
  },
  sub: {
    lance: {
      ...LANCE, weight: 2, dps: r1(LANCE.count * LANCE.damage / LANCE.interval), burst: LANCE.count * LANCE.damage, range: Math.round(LANCE.speedMax * LANCE.life * 0.8 / 10) * 10, ammo: null, cool: LANCE.interval,
      role: '中距離の安定', desc: '弾数無限で狙いもいらず、中距離で安定して当たる。遠くには届かず、1回は軽い',
    },
    salvo: {
      ...SALVO, weight: 1, dps: r1(SALVO.bigShare * SALVO.damage / (SALVO.cool + SALVO.bigShare * SALVO.lockEvery)), burst: SALVO.max * SALVO.damage,
      role: '雑魚の掃除', desc: '狙い不要で遠くの8機まで一斉に撃てる。1発が軽く弾数も限られ、硬い敵は落とせない',
    },
    rocket: {
      ...ROCKET, weight: 3, dps: r1((ROCKET.damage + ROCKET.splash) / ROCKET.cool), burst: ROCKET.damage + ROCKET.splash,
      role: '大型の範囲弾', desc: '1発の威力と範囲が最大で、群れにも硬い敵にも効く。誘導せず弾が遅いので、外すと損',
    },
  },
  // 爆雷は構成で選ばない共通の装備。実際の値は fx/weaponBomb.js の BOMB（ここは表示用の写し。test_balance が一致を見る）
  bomb: {
    weight: 1, dps: 0, burst: 30, range: 220, ammo: 2, ammoMax: 3, cool: 0.9, damage: 30,
    role: '緊急の一掃', desc: '周りの敵の弾を消し、雑魚をまとめて落とす。数が少なく、硬い敵にはほとんど効かない',
  },
};

// ツインの段階の威力・弾の増え方。段階ごとの総火力は3つの主武装で同じ倍率（×1、×1.7、×2.6。11/10 spec REQ-022）にする
export const POWER = { max: 3, damage: TWIN.damage, extra: [[], [[0.55, 0]], [[0.55, 0], [1.25, 0.05]]] };
