// 1面の道の区切り（自機の z）。速さは毎秒40なので、400 で10秒。
// 小惑星帯 45秒 → 沈没艦の墓場 40秒 → 基地の外周 50秒 → 基地の内部通路 30秒 → 防衛線 45秒 → ボス
export const GRAVE_Z = 1800;
export const BASE_Z = 3400;
export const BASE_LEN = 2000;
export const TUNNEL_Z = BASE_Z + BASE_LEN;
export const TUNNEL_LEN = 1200;
export const LINE_Z = TUNNEL_Z + TUNNEL_LEN;
export const LINE_LEN = 1800;
export const ARENA_Z = LINE_Z + LINE_LEN;
export const BOSS_Z = ARENA_Z + 320;
// 小惑星帯の金属の輪（3つ続けてくぐると強化）
export const GATE_Z = [520, 860, 1200];
// 基地の外周の、回復の輪（基地の入口からの距離）
export const RING_Z = [140, 700, 1300];
