// 戦うシーンの一覧。確認用は ?scene=番号 で切り替える。
// 光と岩の色は画面で見る色（sRGB）、空の色はシェーダーへそのまま渡す値。空の色・恒星の向きと色・惑星・小惑星の数と大きさと色・塵の色をシーンごとに持つ。
// 環境パーツができたら、各シーンの「どのパーツをどれだけ置くか」をここへ足す。

import { GRAVE_Z, BASE_Z, TUNNEL_Z, LINE_Z } from './course.js';

// 防衛線の赤い恒星の向き（左上の前方。あふれる光の絵も同じ向きに置く）
export const STAR_DIR = [0.46, 0.26, 0.85];

export const SCENES = [
  {
    name: '小惑星帯',
    // 宇宙は日の当たる面と陰がはっきり分かれる。周りからの光は弱く、色はほぼ中立
    sun: { dir: [-2.2, 3.0, -2.6], color: [1.0, 0.93, 0.84], intensity: 5.2 },
    rim: { color: [0.62, 0.72, 0.95], intensity: 0.9 },
    hemi: { sky: [0.55, 0.58, 0.66], ground: [0.3, 0.24, 0.2], intensity: 0.32 },
    sky: {
      base0: [0.016, 0.019, 0.034], base1: [0.075, 0.085, 0.125],
      nebA: [0.05, 0.056, 0.085], nebB: [0.085, 0.07, 0.13], nebC: [0.14, 0.05, 0.02], nebD: [0.025, 0.10, 0.22],
      nebK: 0.8, starK: 1, sunSize: 16, sunTint: [1, 1, 1],
    },
    planets: [
      // 近くへ置いて半径を小さくし、進むと目に見えて大きくなりずれる（視差）。light は惑星ごとの光の向きで、明暗境界が見えるように選ぶ
      // range：その惑星が見える z（消え始め・消え終わり。空が切り替わる間に雲へ溶ける）
      // 小惑星帯：輪のあるガス惑星と、その手前を横切る月・遠くの氷の小さな星
      { type: 'gas', pos: [-3300, 1250, 7400], radius: 1750, tilt: 0.30, ring: true, light: [0.62, 0.40, -0.45], range: [-1e9, -1e9, GRAVE_Z - 300, GRAVE_Z + 40] },
      { type: 'moon', pos: [-1500, -650, 4200], radius: 150, tilt: 0.2, light: [0.62, 0.40, -0.45], orbit: [120, 60, 0.05, 0.4], range: [-1e9, -1e9, GRAVE_Z - 300, GRAVE_Z + 40] },
      { type: 'gas', map: 'ice', pos: [5400, 1900, 9000], radius: 620, tilt: -0.5, light: [0.3, 0.5, 0.5], range: [-1e9, -1e9, GRAVE_Z - 300, GRAVE_Z + 40] },
      // 墓場：太陽を背にした死にかけの惑星。細い三日月と、夜側の裂け目の灯り
      { type: 'dead', pos: [-3200, 1300, GRAVE_Z + 6200], radius: 2000, tilt: 0.3, light: [0.72, 0.42, 0.55], range: [GRAVE_Z - 200, GRAVE_Z + 150, BASE_Z - 300, BASE_Z + 40] },
      // 基地の外周：基地が回っている地球のような惑星。右下いっぱいに夜側の街の灯りと明暗境界が見える。遠くに月と氷の惑星
      { type: 'earth', pos: [-3500, -3300, BASE_Z + 5200], radius: 3300, tilt: -0.2, lon0: 0.42, light: [0.50, 0.46, 0.72], range: [BASE_Z - 240, BASE_Z + 120, TUNNEL_Z + 200, TUNNEL_Z + 400] },
      { type: 'moon', pos: [2500, 1500, BASE_Z + 6200], radius: 300, light: [0.70, 0.55, 0.42], orbit: [160, 90, 0.04, 2.0], range: [BASE_Z - 240, BASE_Z + 120, TUNNEL_Z + 200, TUNNEL_Z + 400] },
      { type: 'gas', map: 'ice', pos: [7000, -500, BASE_Z + 12000], radius: 700, tilt: -0.22, light: [0.5, 0.5, -0.5], range: [BASE_Z - 240, BASE_Z + 120, TUNNEL_Z + 200, TUNNEL_Z + 400] },
      // 防衛線とボス戦：赤く大きな恒星と、その前を横切る黒い惑星
      { type: 'star', pos: [STAR_DIR[0] * 11500, STAR_DIR[1] * 11500, LINE_Z + 700 + STAR_DIR[2] * 11500], radius: 2800, range: [LINE_Z - 220, LINE_Z + 60, 1e9, 1e9] },
      { type: 'rocky', pos: [STAR_DIR[0] * 8200 - 1500, STAR_DIR[1] * 8200 - 950, LINE_Z + 700 + STAR_DIR[2] * 8200], radius: 520, tint: [0.3, 0.26, 0.24], order: -7.5, atm: [1.0, 0.35, 0.12], term: [1.0, 0.25, 0.06], light: [0.46, 0.26, 0.85], range: [LINE_Z - 220, LINE_Z + 60, 1e9, 1e9] },
    ],
    rocks: { count: 84, scale: 1, color: [0.285, 0.27, 0.255] },
    dust: [1, 1, 1],
  },
  {
    // 大きな岩の惑星のすぐ上。足元いっぱいに地表が見え、岩はまばら
    name: '惑星の軌道',
    sun: { dir: [3.0, 1.2, 1.5], color: [1.0, 0.93, 0.84], intensity: 4.2 },
    rim: { color: [0.55, 0.7, 1.0], intensity: 1.0 },
    hemi: { sky: [0.8, 0.85, 1.0], ground: [0.35, 0.22, 0.14], intensity: 0.5 },
    sky: {
      base0: [0.003, 0.004, 0.012], base1: [0.012, 0.020, 0.055],
      nebA: [0.006, 0.008, 0.020], nebB: [0.020, 0.020, 0.050], nebC: [0.06, 0.03, 0.02], nebD: [0.02, 0.06, 0.12],
      nebK: 0.5, starK: 0.8, sunSize: 22, sunTint: [1, 0.95, 0.85],
    },
    planets: [
      { type: 'rocky', pos: [0, -10400, 5200], radius: 9600, tilt: 0.2 },
      { type: 'moon', pos: [-6800, 2600, 15000], radius: 900 },
    ],
    rocks: { count: 22, scale: 0.7, color: [0.30, 0.24, 0.19] },
    debrisShards: false,
    dust: [1, 0.9, 0.8],
  },
  {
    // 赤い星雲の中。空が赤紫に染まり、恒星は赤く暗い。岩は多く暗い
    name: '赤い星雲',
    sun: { dir: [1.5, 2.0, -3.0], color: [1.0, 0.62, 0.45], intensity: 2.6 },
    rim: { color: [1.0, 0.35, 0.55], intensity: 1.8 },
    hemi: { sky: [1.0, 0.6, 0.7], ground: [0.2, 0.08, 0.1], intensity: 0.45 },
    sky: {
      base0: [0.010, 0.002, 0.006], base1: [0.040, 0.010, 0.030],
      nebA: [0.050, 0.008, 0.030], nebB: [0.200, 0.030, 0.090], nebC: [0.40, 0.10, 0.05], nebD: [0.10, 0.03, 0.22],
      nebK: 1.6, starK: 0.55, sunSize: 26, sunTint: [1, 0.55, 0.4],
    },
    planets: [
      { type: 'gas', pos: [-9000, 3500, 16000], radius: 2600, tilt: -0.4, ring: true },
    ],
    rocks: { count: 84, scale: 1.15, color: [0.16, 0.12, 0.12] },
    debrisShards: false,
    dust: [1, 0.55, 0.6],
  },
  {
    // 氷の帯。青白い恒星の冷たい光、白っぽく光を返す氷の岩
    name: '氷の帯',
    sun: { dir: [-1.0, 2.5, -2.0], color: [0.82, 0.9, 1.0], intensity: 4.0 },
    rim: { color: [0.6, 0.85, 1.0], intensity: 1.6 },
    hemi: { sky: [0.8, 0.9, 1.0], ground: [0.12, 0.16, 0.22], intensity: 0.45 },
    sky: {
      base0: [0.001, 0.003, 0.010], base1: [0.006, 0.016, 0.040],
      nebA: [0.004, 0.012, 0.030], nebB: [0.010, 0.040, 0.080], nebC: [0.03, 0.07, 0.10], nebD: [0.04, 0.16, 0.26],
      nebK: 1.0, starK: 1.3, sunSize: 14, sunTint: [0.75, 0.85, 1],
    },
    planets: [
      { type: 'moon', pos: [7000, 2200, 9000], radius: 1500 },
      { type: 'moon', pos: [-12000, -3000, 14000], radius: 500 },
    ],
    rocks: { count: 70, scale: 0.85, color: [0.62, 0.70, 0.78], roughness: 0.55, metalness: 0.1 },
    debrisShards: false,
    dust: [0.8, 0.95, 1.1],
  },
];

// 1面の道の区間ごとの背景。z で移り変わる（fade は切り替えにかける距離。毎秒40で進む）。
// pano は全天の写真、panoK はその明るさ。haze は基地の遠景が溶ける色（シェーダーへそのまま渡す値）
const R0 = SCENES[0];
export const REGIONS = [
  {
    name: '小惑星帯', z: -1e9, fade: 1, pano: 'nebula', panoK: 1.05,
    sun: R0.sun, rim: R0.rim, hemi: R0.hemi, sky: R0.sky, env: R0,
    fog: [0.08, 0.09, 0.135], fogD: 0.0016, haze: [0.020, 0.018, 0.042],
    rock: R0.rocks.color, dust: [1, 1, 1], sunVis: 1,
    mot: { flow: 0.05, amp: 0.34, veilK: 1.0, veil: [0.020, 0.015, 0.040], glow: [0.11, 0.08, 0.24], glowK: 0.9 },
  },
  {
    // 沈没艦の墓場：死んだ艦隊の冷たい青緑。燃え残りの裂け目の橙だけが目立つ（赤は防衛線とボスの危険の色に取っておく）
    name: '沈没艦の墓場', z: GRAVE_Z, fade: 420, pano: 'grave', panoK: 0.42, panoTint: [0.5, 1.0, 0.95], panoTintK: 0.85,
    sun: { dir: [-0.62, 0.42, 0.66], color: [0.72, 0.95, 0.92], intensity: 3.4 },
    rim: { color: [0.35, 0.85, 0.80], intensity: 0.9 },
    hemi: { sky: [0.38, 0.62, 0.62], ground: [0.06, 0.12, 0.12], intensity: 0.42 },
    sky: { base0: [0.004, 0.012, 0.012], base1: [0.020, 0.055, 0.055], nebA: [0.012, 0.04, 0.038], nebB: [0.03, 0.09, 0.085], nebC: [0.05, 0.12, 0.09], nebD: [0.03, 0.05, 0.08], nebK: 0.8, starK: 0.55, sunSize: 26, sunTint: [0.7, 0.95, 0.9] },
    fog: [0.040, 0.100, 0.100], fogD: 0.0023, haze: [0.018, 0.050, 0.050],
    rock: [0.21, 0.23, 0.23], dust: [0.80, 1.10, 1.05], sunVis: 1,
    // 冷たい霧の雲：ゆっくり流れ、内側で青緑が脈打つ
    mot: { flow: 0.06, amp: 0.5, veilK: 1.0, veil: [0.006, 0.030, 0.030], glow: [0.12, 0.50, 0.45], glowK: 0.8 },
  },
  {
    name: '基地の外周', z: BASE_Z, fade: 400, pano: 'base', panoK: 0.40,
    sun: { dir: [-0.82, 0.48, -0.30], color: [0.86, 0.93, 1.0], intensity: 5.6 },
    rim: { color: [0.40, 0.66, 1.0], intensity: 1.2 },
    hemi: { sky: [0.48, 0.66, 0.92], ground: [0.12, 0.20, 0.30], intensity: 0.40 },
    sky: { base0: [0.006, 0.014, 0.030], base1: [0.022, 0.055, 0.105], nebA: [0.012, 0.03, 0.06], nebB: [0.02, 0.05, 0.10], nebC: [0.02, 0.06, 0.08], nebD: [0.02, 0.10, 0.2], nebK: 0.7, starK: 1.25, sunSize: 15, sunTint: [0.78, 0.88, 1] },
    fog: [0.055, 0.105, 0.17], fogD: 0.0015, haze: [0.016, 0.038, 0.075],
    rock: [0.33, 0.36, 0.40], dust: [0.78, 0.95, 1.25], sunVis: 1,
    // 冷たい薄い幕
    mot: { flow: 0.05, amp: 0.36, veilK: 1.0, veil: [0.006, 0.020, 0.045], glow: [0.10, 0.30, 0.55], glowK: 0.8 },
  },
  {
    // 内部通路：外はほとんど見えず、頭上の作業灯の白緑（工場の蛍光灯）。抜けた先の防衛線の赤が危険として効くよう、暖色を避ける
    name: '基地の内部通路', z: TUNNEL_Z, fade: 170, pano: 'base', panoK: 0.05,
    sun: { dir: [0.12, 0.96, 0.25], color: [0.85, 1.0, 0.92], intensity: 3.3 },
    rim: { color: [0.5, 0.9, 0.8], intensity: 0.8 },
    hemi: { sky: [0.70, 0.95, 0.88], ground: [0.12, 0.20, 0.18], intensity: 0.72 },
    sky: { base0: [0.003, 0.004, 0.006], base1: [0.010, 0.012, 0.018], nebA: [0.004, 0.005, 0.008], nebB: [0.006, 0.006, 0.01], nebC: [0.0, 0.0, 0.0], nebD: [0.0, 0.0, 0.0], nebK: 0.3, starK: 0.08, sunSize: 8, sunTint: [0.85, 1, 0.92] },
    fog: [0.040, 0.080, 0.070], fogD: 0.0026, haze: [0.018, 0.035, 0.030],
    rock: [0.22, 0.24, 0.23], dust: [0.90, 1.15, 1.05], sunVis: 0,
    mot: { flow: 0.03, amp: 0.2, veilK: 0.2, veil: [0.002, 0.003, 0.003], glow: [0.01, 0.04, 0.035], glowK: 0.2 },
  },
  {
    // 通路を抜けると、赤い恒星の前の防衛線
    name: '防衛線', z: LINE_Z, fade: 240, pano: 'line', panoK: 0.42,
    sun: { dir: [0.60, 0.36, 0.71], color: [1.0, 0.56, 0.34], intensity: 5.0 },
    // 恒星の反対から、青白い弱い光で手前の面を起こす
    rim: { color: [0.55, 0.62, 0.95], intensity: 1.15, dir: [-0.5, 0.35, -0.8] },
    hemi: { sky: [0.80, 0.46, 0.40], ground: [0.28, 0.13, 0.13], intensity: 0.72 },
    sky: { base0: [0.020, 0.004, 0.004], base1: [0.09, 0.02, 0.015], nebA: [0.06, 0.012, 0.01], nebB: [0.13, 0.03, 0.02], nebC: [0.2, 0.05, 0.015], nebD: [0.06, 0.01, 0.03], nebK: 0.7, starK: 0.35, sunSize: 8, sunTint: [0.75, 0.22, 0.07] },
    fog: [0.19, 0.055, 0.035], fogD: 0.0016, haze: [0.095, 0.022, 0.014],
    rock: [0.20, 0.145, 0.13], dust: [1.3, 0.62, 0.42], sunVis: 0, halo: 1,
    // 恒星の風に煽られる赤い雲
    mot: { flow: 0.085, amp: 0.6, veilK: 1.0, veil: [0.050, 0.008, 0.005], glow: [0.95, 0.22, 0.05], glowK: 1.0 },
  },
];
// z から「今の区間 a・次の区間 b・混ぜ具合 t」を返す
export function regionAt(z) {
  let i = 0;
  for (let k = 1; k < REGIONS.length; k++) if (z >= REGIONS[k].z - REGIONS[k].fade * 0.75) i = k;
  if (i === 0) return { a: 0, b: 0, t: 0 };
  const r = REGIONS[i];
  const x = Math.min(1, (z - (r.z - r.fade * 0.75)) / r.fade);
  return { a: i - 1, b: i, t: x * x * (3 - 2 * x) };
}
