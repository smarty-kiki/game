import * as THREE from 'three';
import { Builder, ROLE, PROP_TYPES, M4, rng } from './core.js';
import { createStructureMaterial, STRUCT_U } from './material.js';

// 建物に置く小物の一式（箱・コンテナ・樽・小さなタンク・空調・通風口・アンテナ・小さな皿・灯りの柱・配管・配管の束・
// 手すり・はしご・ハッチ・配電箱・ケーブルの巻き・瓦礫・割れた床板・鉄骨）と、その描画。
//
// 形：core.js の Builder で、種類ごとの「ふつうの大きさ」（PROP_INFO.size、メートル）のまま組み、最後に足元 1m 四方・高さ 1m へ縮める。
//   uv（模様の座標）はメートルのまま残すので、B.prop にふつうの大きさを渡せば、継ぎ目・汚れ・錆・波板が建物と同じ密度で乗る
//   （1m の箱のまま組むと、6m のコンテナに伸ばしたとき波板やボルトの間隔まで 6倍に伸びるため）。
//   距離で2段：近い形（寄り〜20m で見劣りしない作り込み、三角形 60〜600）と遠い形（輪郭だけ、細すぎる部品は太らせるか省く）。
// 描き方：種類ごとに InstancedMesh（近い形・遠い形の2つ）。材質は全部で1つ（createStructureMaterial の worldSpace）。
//   毎コマ、カメラから区画ごとに見える物だけを表へ詰める。遠い物は大きさに比例した距離で消し、消える手前の帯で小さく縮めてから消す
//   （ぱっと消えると遠くでちらつくため）。インスタンスごとの色（instanceColor）で塗りの色と明るさをばらつかせる。
//
//   const field = createPropField({ scene, castShadow: true, maxPerType: 2048 });
//   const h = field.add(g.props, structureGroup.matrixWorld); // 建物の生成結果の小物を、建物の置き場所で登録する（Object3D・Matrix4・16個の配列）
//   毎コマ：field.update(camera)（setStructureView の後に呼ぶ。画面の倍率で消す距離を合わせる）。戻り値と field.stats に数と時間
//   捨てる：field.remove(h) / field.clear() / field.dispose()。影の切り替え：field.setShadow(true | false | ['container', …])
//   確認用：field.forceLod(-1 | 0 | 1)、field.snapshot()（表の中身）
//
// 種類の約束（core.js の PROP_TYPES）：原点は足元の中心、+y が上。長さで伸ばす物（pipeRun・pipeBundle・railing・girder）は
// 原点から +z の向きに長さ 1m（z が 0〜1）、はしご（ladder）は原点から +y に高さ 1m で、壁の側が -z。
// 長さで伸ばす物は、登録のときに「ふつうの長さ」に近い区間へ分けて並べる（支柱・フランジ・継ぎ手が伸びて太らないように）。

const R = ROLE;
const D2R = Math.PI / 180;

// ---- 種類ごとの決まり ----
// model：下の SHAPES が組む寸法（m、x・y・z）。k：組むときの一様な倍率（主担当の B.prop が渡す大きさの真ん中に近づける。
//   uv もメートルのまま一緒に伸びるので、模様の密度は崩れない）。size＝model×k が「ふつうの大きさ」で、形はこれで割って縮める。
//   B.prop(type, x, y, z, ry, ...PROP_INFO[type].size) で、この形の寸法どおりに置ける。
//   手すり（railing）だけは x・y を縮めない（size の x・y が 1）。主担当の core.js の railing() が B.prop('railing', …, 1, h / 1.1, L) と
//   「倍率1で太さそのまま・高さ 1.1m」として呼ぶため
// linear：長さで伸ばす向きの軸（2=z、1=y）。区間の長さは size のその軸の値
// shadow：既定で影を落とす（大きく、影が見た目に効く物だけ）
// cullMul・nearMul：消す距離・遠い形へ切り替える距離の倍率（細い棒の物は早く消し、長い線の物は遠くまで残す）
// palette：インスタンスごとに掛ける色（線形の倍率）。灰色の塗装に掛けて、塗りの色違いを作る
export const PROP_INFO = {
  // 主担当は足元の荷物の箱を 1.2〜3.8m で置くので、1m の形を 1.4倍で組む
  crate: { model: [1, 1, 1], k: 1.4, palette: [[1, 1, 1], [0.72, 0.84, 0.6], [1.18, 1.02, 0.78], [0.72, 0.8, 0.95], [1.3, 0.78, 0.52]] },
  container: { model: [2.44, 2.59, 6.06], shadow: true, palette: [[1.75, 0.62, 0.42], [0.55, 0.8, 1.45], [0.62, 1.15, 0.72], [1.6, 1.15, 0.45], [1, 1, 1], [1.8, 1.8, 1.75], [0.62, 0.62, 0.66]] },
  barrel: { model: [0.6, 0.9, 0.6], palette: [[1.7, 0.5, 0.36], [0.5, 0.75, 1.5], [1.7, 1.3, 0.38], [0.65, 1.05, 0.62], [0.42, 0.42, 0.45], [1, 1, 1]] },
  tankS: { model: [1.6, 2.2, 1.6], shadow: true, palette: [[1.6, 1.6, 1.55], [1, 1, 1], [0.86, 1.06, 0.92]] },
  // 屋上の機械は 1.2〜4m で置かれる
  acUnit: { model: [1.2, 0.85, 1.0], k: 1.6, palette: [[1.2, 1.2, 1.18], [1, 1, 1]] },
  vent: { model: [0.8, 0.7, 0.8], k: 1.8 },
  antenna: { model: [1, 6, 1], shadow: true, cullMul: 0.8 },
  dishS: { model: [1.4, 1.5, 1.4], shadow: true },
  lampPost: { model: [0.5, 5, 1.8], shadow: true, cullMul: 1.2 },
  pipeRun: { model: [0.4, 0.4, 3], linear: 2, cullMul: 1.4, palette: [[1, 1, 1], [0.8, 1.05, 0.85], [1.6, 1.3, 0.5], [1.3, 0.7, 0.5], [0.7, 0.75, 0.85]] },
  pipeBundle: { model: [0.9, 0.7, 2], linear: 2, cullMul: 1.3 },
  railing: { model: [1, 1, 1.8], linear: 2, cullMul: 0.55, palette: [[2.0, 1.5, 0.32], [1, 1, 1], [2.0, 1.5, 0.32]] },
  ladder: { model: [0.5, 2.4, 0.25], linear: 1, cullMul: 0.6 },
  hatch: { model: [1.2, 0.3, 1.2] },
  // 壁の配電箱は 0.6〜4.6m で置かれる
  junction: { model: [0.8, 1.2, 0.4], k: 1.5, palette: [[1, 1, 1], [0.8, 0.9, 0.82], [1.25, 1.15, 0.95]] },
  cableSpool: { model: [1, 1, 0.8], palette: [[1.3, 0.95, 0.66], [0.82, 0.88, 1.0]] },
  rubble: { model: [1.6, 0.7, 1.6] },
  slab: { model: [2, 0.3, 2] },
  girder: { model: [0.3, 0.4, 4], linear: 2, cullMul: 1.4, palette: [[1.4, 0.62, 0.45], [1, 1, 1], [1.7, 1.35, 0.45]] },
};
for (const t of PROP_TYPES) {
  const I = PROP_INFO[t];
  I.k = I.k ?? 1; I.size = I.model.map((x) => x * I.k);
  I.linear = I.linear ?? -1; I.shadow = !!I.shadow; I.cullMul = I.cullMul ?? 1; I.nearMul = I.nearMul ?? (I.shadow ? 1.5 : 1);
  I.palette = I.palette || [[1, 1, 1]];
}
// 既定で影を落とす種類
export const PROP_SHADOW_TYPES = PROP_TYPES.filter((t) => PROP_INFO[t].shadow);

// ---- 形を組む小さな道具 ----
// ボルトの頭（面から少し出た四角）。axis：面の向きの軸（0=x 1=y 2=z）、sg：面の向き（+1/-1）。面の側の1面は見えないので作らない
function bolt(B, x, y, z, axis, sg, s = 0.03, role = R.BARE) {
  const sz = [s, s, s]; sz[axis] = s * 0.5;
  const c = [x, y, z]; c[axis] += sg * s * 0.25;
  B.box(c[0], c[1], c[2], sz[0], sz[1], sz[2], { role, c: 0, rnd: 0.3, skip: [axis * 2 + (sg > 0 ? 0 : 1)] });
}
const CORNERS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

// 回転体の面を、決めた向きに張る（輪郭 prof=[[半径, 高さ]...] を y 軸のまわりに回す）。away(帯の中心) が返す点から離れる向きに面を向ける。
// core.js の lathe の both は、面を外向きに直した後でその裏返しを足すので、上へ伸びる輪郭では表と裏が同じ向きになり、
// 皿の表や筒の内側が見えなくなる（重なった2枚がちらつく）。両面が要る所はこれで表と裏を別々に張る
function revolve(B, prof, seg, a, away) {
  const sc = B.s;
  let acc = 0; const vs = [0];
  for (let k = 1; k < prof.length; k++) { acc += Math.hypot(prof[k][0] - prof[k - 1][0], prof[k][1] - prof[k - 1][1]) * sc; vs.push(acc); }
  const circ = 2 * Math.PI * Math.max(...prof.map((p) => p[0])) * sc;
  const P = (k, i) => { const t = (i / seg) * Math.PI * 2; return [Math.cos(t) * prof[k][0], prof[k][1], Math.sin(t) * prof[k][0]]; };
  for (let k = 0; k < prof.length - 1; k++) {
    if (prof[k][0] < 1e-4 && prof[k + 1][0] < 1e-4) continue;
    for (let i = 0; i < seg; i++) {
      const L = [P(k, i), P(k, i + 1), P(k + 1, i + 1), P(k + 1, i)];
      const c = L.reduce((s2, q) => [s2[0] + q[0] / 4, s2[1] + q[1] / 4, s2[2] + q[2] / 4], [0, 0, 0]);
      const uvs = [[i / seg * circ, vs[k]], [(i + 1) / seg * circ, vs[k]], [(i + 1) / seg * circ, vs[k + 1]], [i / seg * circ, vs[k + 1]]];
      B.poly(L.map((q) => B.toW(q)), uvs, { role: a.role, edge: a.edgeRows?.includes(k) ? 1 : 0, rnd: a.rnd ?? 0.5, base: 0, p1: 0, p2: 0 }, B.toW(away(c)));
    }
  }
}

// ---- 種類ごとの形（メートルで組む。far=true は遠い形） ----
const SHAPES = {
  // 補給の箱：明るい塗装の本体、暗い枠（ふたの縁・すべり台・角の柱）、左右の取っ手、前後の警告の帯、銘板と留め金
  crate(B, far) {
    if (far) {
      B.box(0, 0.5, 0, 0.96, 0.88, 0.96, { role: R.PAINT2, rnd: 0.6 });
      B.box(0, 0.97, 0, 1, 0.06, 1, { role: R.DARK, rnd: 0.3 });
      B.box(0, 0.04, 0, 1, 0.08, 1, { role: R.DARK, rnd: 0.3 });
      return;
    }
    B.box(0, 0.5, 0, 0.92, 0.88, 0.92, { role: R.PAINT2, c: 0.03, rnd: 0.6 });
    B.box(0, 0.97, 0, 1, 0.06, 1, { role: R.DARK, c: 0.012, rnd: 0.3 });
    B.box(0, 0.04, 0, 1, 0.08, 1, { role: R.DARK, c: 0.012, rnd: 0.3 });
    for (const [sx, sz] of CORNERS) B.box(sx * 0.465, 0.51, sz * 0.465, 0.07, 0.86, 0.07, { role: R.DARK, c: 0, rnd: 0.3 });
    for (const sx of [-1, 1]) {
      B.box(sx * 0.462, 0.64, 0, 0.012, 0.09, 0.3, { role: R.INNER, c: 0 });
      B.box(sx * 0.482, 0.64, 0, 0.026, 0.026, 0.26, { role: R.BARE, c: 0 });
    }
    for (const sz of [-1, 1]) B.box(0, 0.3, sz * 0.464, 0.62, 0.11, 0.01, { role: R.HAZARD, c: 0 });
    B.box(0.24, 0.66, 0.464, 0.24, 0.15, 0.008, { role: R.PAINT, c: 0 });
    for (const sx of [-1, 1]) B.box(sx * 0.26, 0.915, 0.478, 0.06, 0.07, 0.024, { role: R.BARE, c: 0 });
  },

  // 輸送用コンテナ：波板の箱（模様は材質の波板）、外へ出た暗い枠（角の柱・上下の梁）、後ろの観音扉と4本の錠の棒と取っ手
  container(B, far) {
    const H = 2.59;
    if (far) {
      // 遠い形は外の寸法の箱と扉の板だけ（遠い形になる 100m 先では、5cm 出た枠は1画素に満たない。場面で一番多い小物なので軽くする）
      B.box(0, H / 2, 0, 2.44, H, 6.0, { role: R.CORRUGATED, bottom: R.DARK, rnd: 0.5 });
      B.box(0, 1.315, 3.015, 2.2, 2.35, 0.03, { role: R.CORRUGATED, rnd: 0.45 });
      return;
    }
    B.box(0, 1.295, 0, 2.34, 2.47, 5.92, { role: R.CORRUGATED, bottom: R.DARK, rnd: 0.5 });
    for (const [sx, sz] of CORNERS) B.box(sx * 1.17, H / 2, sz * 2.98, 0.1, H, 0.1, { role: R.DARK, c: 0.012, rnd: 0.3 });
    for (const sx of [-1, 1]) {
      B.box(sx * 1.17, 2.54, 0, 0.1, 0.1, 5.86, { role: R.DARK, c: 0, rnd: 0.3 });
      B.box(sx * 1.17, 0.07, 0, 0.1, 0.14, 5.86, { role: R.DARK, c: 0, rnd: 0.3 });
    }
    for (const sz of [-1, 1]) {
      B.box(0, 2.54, sz * 2.98, 2.24, 0.1, 0.1, { role: R.DARK, c: 0, rnd: 0.3 });
      B.box(0, 0.07, sz * 2.98, 2.24, 0.14, 0.1, { role: R.DARK, c: 0, rnd: 0.3 });
    }
    // 扉（2枚。合わせ目の細い隙間から本体の暗い面がのぞく）
    for (const sx of [-1, 1]) B.box(sx * 0.555, 1.315, 2.985, 1.09, 2.35, 0.03, { role: R.CORRUGATED, rnd: 0.45 });
    for (const x of [-0.88, -0.22, 0.22, 0.88]) {
      B.cyl([x, 0.18, 3.015], [x, 2.44, 3.015], 0.02, 0.02, 6, { role: R.BARE, rnd: 0.3 });
      B.box(x + 0.07, 1.25, 3.04, 0.14, 0.035, 0.024, { role: R.BARE, c: 0 });
    }
  },

  // 樽：転がす輪（上下の縁）と2本のたが、ふたの大小の栓。縁とたがは塗装がはげやすい（縁の印）
  barrel(B, far) {
    if (far) { B.lathe(0, 0, 0, [[0, 0], [0.29, 0], [0.29, 0.9], [0, 0.9]], 8, { role: R.PAINT2, rnd: 0.55 }); return; }
    const prof = [[0, 0.005], [0.28, 0.005], [0.295, 0.02], [0.295, 0.05], [0.28, 0.065], [0.28, 0.285], [0.294, 0.3], [0.28, 0.315],
      [0.28, 0.585], [0.294, 0.6], [0.28, 0.615], [0.28, 0.835], [0.295, 0.85], [0.295, 0.9], [0.268, 0.9], [0.26, 0.888], [0, 0.888]];
    B.lathe(0, 0, 0, prof, 12, { role: R.PAINT2, rnd: 0.55, edgeRows: [1, 2, 3, 5, 6, 8, 9, 11, 12, 13] });
    B.cyl([0.15, 0.885, 0], [0.15, 0.9, 0], 0.034, 0.034, 8, { role: R.BARE, rnd: 0.3 });
    B.cyl([-0.14, 0.885, 0.05], [-0.14, 0.897, 0.05], 0.022, 0.022, 6, { role: R.BARE, rnd: 0.3 });
  },

  // 小さなタンク：鏡板（丸い上下）の胴、中ほどの帯、4本の脚、上の口とフランジ、点検口、横の出口、銘板
  tankS(B, far) {
    if (far) {
      B.cyl([0, 0, 0], [0, 0.56, 0], 0.48, 0.48, 8, { role: R.DARK, capA: false, capB: false });
      B.lathe(0, 0, 0, [[0, 0.5], [0.72, 0.6], [0.75, 1.84], [0.56, 2.04], [0, 2.08]], 8, { role: R.PAINT2, rnd: 0.5 });
      return;
    }
    for (const [sx, sz] of CORNERS) B.beam([sx * 0.5, 0, sz * 0.5], [sx * 0.44, 0.62, sz * 0.44], 0.08, 0.08, { role: R.DARK, c: 0 });
    const prof = [[0, 0.48], [0.42, 0.5], [0.64, 0.56], [0.73, 0.65], [0.75, 0.76], [0.75, 1.3], [0.765, 1.31], [0.765, 1.37], [0.75, 1.38],
      [0.75, 1.82], [0.72, 1.92], [0.62, 2.0], [0.42, 2.06], [0, 2.08]];
    B.lathe(0, 0, 0, prof, 12, { role: R.PAINT2, rnd: 0.5, edgeRows: [5, 6, 7] });
    B.cyl([0.3, 1.97, 0], [0.3, 2.16, 0], 0.06, 0.06, 8, { role: R.BARE });
    B.cyl([0.3, 2.14, 0], [0.3, 2.2, 0], 0.095, 0.095, 8, { role: R.DARK });
    B.cyl([0, 2.04, 0], [0, 2.11, 0], 0.18, 0.18, 12, { role: R.DARK, rnd: 0.35 });
    B.cyl([0.62, 0.62, 0], [0.8, 0.62, 0], 0.05, 0.05, 8, { role: R.BARE });
    B.cyl([0.75, 0.62, 0], [0.8, 0.62, 0], 0.08, 0.08, 8, { role: R.DARK });
    B.box(0, 1.1, 0.758, 0.32, 0.2, 0.016, { role: R.HAZARD, c: 0 });
  },

  // 屋上の空調：台のレール、面取りした本体、3面の格子、上の送風機（筒の縁・暗い底・5枚の羽根・軸・指よけの棒）、横の弁と電気箱
  acUnit(B, far) {
    if (far) {
      B.box(0, 0.04, 0, 1.2, 0.08, 0.82, { role: R.DARK });
      B.box(0, 0.43, 0, 1.12, 0.7, 0.94, { role: R.PAINT2, rnd: 0.6 });
      B.lathe(0, 0.78, 0, [[0.38, 0], [0.38, 0.065], [0, 0.065]], 8, { role: R.DARK });
      return;
    }
    for (const sz of [-1, 1]) B.box(0, 0.04, sz * 0.36, 1.2, 0.08, 0.1, { role: R.DARK, c: 0 });
    B.box(0, 0.43, 0, 1.12, 0.7, 0.94, { role: R.PAINT2, c: 0.03, rnd: 0.6 });
    for (const sz of [-1, 1]) B.box(0, 0.42, sz * 0.474, 0.92, 0.5, 0.012, { role: R.GRILLE, c: 0 });
    B.box(-0.564, 0.42, 0, 0.012, 0.5, 0.74, { role: R.GRILLE, c: 0 });
    B.lathe(0, 0.78, 0, [[0.36, 0], [0.37, 0.05], [0.39, 0.065]], 14, { role: R.PAINT2, edgeRows: [1], rnd: 0.6 });
    B.push(0, 0.78, 0); revolve(B, [[0.355, 0], [0.365, 0.05], [0.385, 0.065]], 14, { role: R.DARK, rnd: 0.6 }, (c) => [c[0] * 3, c[1], c[2] * 3]); B.pop();
    B.lathe(0, 0.785, 0, [[0.36, 0], [0, 0]], 14, { role: R.INNER });
    B.cyl([0, 0.785, 0], [0, 0.83, 0], 0.065, 0.065, 8, { role: R.DARK });
    for (let k = 0; k < 5; k++) {
      B.push(0, 0.81, 0, 0, k * 72 * D2R + 0.2, 0);
      B.push(0, 0, 0, 22 * D2R, 0, 0);
      B.box(0.2, 0, 0, 0.26, 0.008, 0.12, { role: R.DARK, c: 0, rnd: 0.4 });
      B.pop(); B.pop();
    }
    B.box(0, 0.848, 0, 0.78, 0.012, 0.012, { role: R.BARE, c: 0 });
    B.box(0, 0.848, 0, 0.012, 0.012, 0.78, { role: R.BARE, c: 0 });
    B.box(0.575, 0.26, 0.25, 0.03, 0.12, 0.16, { role: R.BARE, c: 0 });
    for (const y of [0.22, 0.3]) B.cyl([0.59, y, 0.25], [0.6, y, 0.25], 0.016, 0.016, 6, { role: R.BARE });
    B.box(0.575, 0.52, -0.25, 0.03, 0.2, 0.18, { role: R.DARK, c: 0 });
  },

  // 屋上の通風口：縁石とボルトの帯、格子の箱、前後の斜めの羽板、外へ張り出した四角錐のかさ、頂の板
  vent(B, far) {
    if (far) {
      B.box(0, 0.06, 0, 0.8, 0.12, 0.8, { role: R.DARK });
      B.box(0, 0.36, 0, 0.6, 0.48, 0.6, { role: R.GRILLE, top: R.PAINT2 });
      B.box(0, 0.64, 0, 0.76, 0.08, 0.76, { role: R.PAINT2, tx: 0.55, tz: 0.55, bottom: R.DARK });
      return;
    }
    B.box(0, 0.06, 0, 0.8, 0.12, 0.8, { role: R.DARK, c: 0.015 });
    B.box(0, 0.36, 0, 0.6, 0.48, 0.6, { role: R.GRILLE, top: R.PAINT2, c: 0.03 });
    // 羽板は外の縁が下がる向き（雨が入らない向き）。-z の側は角度を逆にして同じ向きにする
    for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) {
      B.push(0, 0.2 + k * 0.1, sz * 0.31, sz * 35 * D2R, 0, 0);
      B.box(0, 0, 0, 0.56, 0.008, 0.09, { role: R.PAINT2, c: 0, rnd: 0.4 });
      B.pop();
    }
    B.box(0, 0.64, 0, 0.76, 0.08, 0.76, { role: R.PAINT2, tx: 0.55, tz: 0.55, bottom: R.DARK, c: 0 });
    B.box(0, 0.69, 0, 0.3, 0.02, 0.3, { role: R.DARK, c: 0 });
    for (const s of [-1, 1]) for (const t of [-0.2, 0.2]) { bolt(B, t, 0.12, s * 0.35, 1, 1); bolt(B, s * 0.35, 0.12, t, 1, 1); }
  },

  // アンテナ：台座とボルト、赤白の帯で先細りの柱、2段の腕と素子、中ほどの機器の箱、登る足かけ、頂の赤い灯り、避雷の針
  antenna(B, far) {
    if (far) {
      B.box(0, 0.03, 0, 0.7, 0.06, 0.7, { role: R.DARK });
      // 遠くでは柱を太らせる（細いままだと1画素より細くなってちらつく）
      B.box(0, 2.84, 0, 0.16, 5.58, 0.16, { role: R.PAINT2, tx: 0.65, tz: 0.65 });
      B.box(0, 4.4, 0, 0.9, 0.06, 0.06, { role: R.BARE });
      B.box(0, 3.2, 0, 0.06, 0.06, 0.9, { role: R.BARE });
      B.box(0, 5.68, 0, 0.12, 0.12, 0.12, { role: R.BEACON });
      return;
    }
    B.box(0, 0.03, 0, 0.7, 0.06, 0.7, { role: R.DARK, c: 0.01 });
    for (const [sx, sz] of CORNERS) bolt(B, sx * 0.27, 0.06, sz * 0.27, 1, 1, 0.04);
    const ys = [0.06, 1.45, 2.85, 4.25, 5.62];
    for (let i = 0; i < 4; i++) {
      const r0 = 0.07 - 0.025 * (ys[i] / 5.62); const r1 = 0.07 - 0.025 * (ys[i + 1] / 5.62);
      B.cyl([0, ys[i], 0], [0, ys[i + 1], 0], r0, r1, 8, { role: i % 2 ? R.RED : R.PAINT2, capA: i === 0, capB: i === 3, rnd: 0.5 });
    }
    B.box(0, 4.4, 0, 0.9, 0.04, 0.04, { role: R.BARE, c: 0 });
    for (const x of [-0.42, -0.22, 0.22, 0.42]) B.box(x, 4.4, 0, 0.018, 0.6, 0.018, { role: R.BARE, c: 0 });
    B.box(0, 3.2, 0, 0.04, 0.04, 0.9, { role: R.BARE, c: 0 });
    for (const z of [-0.42, 0.42]) B.box(0, 3.2, z, 0.5, 0.018, 0.018, { role: R.BARE, c: 0 });
    B.box(0, 1.7, 0.12, 0.22, 0.34, 0.14, { role: R.PAINT2, c: 0.01, rnd: 0.4 });
    for (let k = 0; k < 8; k++) B.box((k % 2 ? 1 : -1) * 0.1, 0.6 + k * 0.5, 0, 0.14, 0.016, 0.016, { role: R.BARE, c: 0 });
    B.box(0, 5.68, 0, 0.1, 0.1, 0.1, { role: R.BEACON, c: 0.012 });
    B.cyl([0, 5.73, 0], [0, 6.0, 0], 0.01, 0.006, 4, { role: R.BARE });
  },

  // 小さなパラボラ：台座とボルト、柱、受け台、斜め上を向いた皿（表は明るく裏は暗い）、受信部の3本の支えと筒
  dishS(B, far) {
    if (far) {
      B.cyl([0, 0, 0], [0, 0.8, 0], 0.09, 0.09, 6, { role: R.DARK });
      B.push(0, 0.88, 0.04, 55 * D2R, 0, 0);
      const dp = [[0, 0], [0.4, 0.07], [0.62, 0.17]];
      revolve(B, dp, 8, { role: R.PAINT }, () => [0, 10, 0]);
      revolve(B, dp.map(([r, y]) => [r, y + 0.015]), 8, { role: R.PAINT2 }, () => [0, -10, 0]);
      B.pop();
      return;
    }
    B.box(0, 0.03, 0, 0.6, 0.06, 0.6, { role: R.DARK, c: 0.01 });
    for (const [sx, sz] of CORNERS) bolt(B, sx * 0.23, 0.06, sz * 0.23, 1, 1, 0.035);
    B.cyl([0, 0.06, 0], [0, 0.7, 0], 0.08, 0.08, 10, { role: R.PAINT2 });
    B.box(0, 0.795, 0, 0.2, 0.21, 0.2, { role: R.DARK, c: 0.012 });
    B.push(0, 0.88, 0.04, 55 * D2R, 0, 0);
    const dp = [[0, 0], [0.18, 0.015], [0.34, 0.05], [0.48, 0.1], [0.62, 0.17]];
    revolve(B, dp, 16, { role: R.PAINT, rnd: 0.6, edgeRows: [3] }, () => [0, 10, 0]);
    revolve(B, dp.map(([r, y]) => [r, y + 0.012]), 16, { role: R.PAINT2, rnd: 0.6, edgeRows: [3] }, () => [0, -10, 0]);
    const F = [0, 0.48, 0];
    for (let k = 0; k < 3; k++) { const a = k * 2.0944 + 0.5; B.beam([Math.cos(a) * 0.6, 0.16, Math.sin(a) * 0.6], F, 0.02, 0.02, { role: R.BARE, c: 0 }); }
    B.cyl([0, 0.42, 0], [0, 0.54, 0], 0.045, 0.035, 8, { role: R.DARK });
    B.pop();
  },

  // 灯りの柱：ボルト留めの台と箱、先細りの柱と点検口、前へ曲がる腕、灯具と下向きの発光面、柱の頭
  lampPost(B, far) {
    if (far) {
      B.box(0, 0.2, 0, 0.46, 0.4, 0.46, { role: R.DARK, tx: 0.78, tz: 0.78 });
      B.box(0, 2.65, 0, 0.16, 4.5, 0.16, { role: R.PAINT2, tx: 0.7, tz: 0.7 });
      B.box(0, 4.84, 0.24, 0.06, 0.06, 0.4, { role: R.PAINT2 });
      B.box(0, 4.86, 0.66, 0.24, 0.12, 0.48, { role: R.PAINT2 });
      B.box(0, 4.795, 0.66, 0.19, 0.012, 0.4, { role: R.LAMP });
      return;
    }
    B.box(0, 0.015, 0, 0.46, 0.03, 0.46, { role: R.DARK, c: 0.006 });
    for (const [sx, sz] of CORNERS) bolt(B, sx * 0.18, 0.03, sz * 0.18, 1, 1, 0.035);
    B.box(0, 0.21, 0, 0.36, 0.36, 0.36, { role: R.DARK, c: 0.03 });
    B.cyl([0, 0.39, 0], [0, 4.82, 0], 0.075, 0.05, 10, { role: R.PAINT2, rnd: 0.6 });
    B.box(0, 0.9, 0.066, 0.06, 0.22, 0.02, { role: R.DARK, c: 0 });
    B.cyl([0, 4.58, 0], [0, 4.84, 0.3], 0.035, 0.03, 6, { role: R.PAINT2 });
    B.cyl([0, 4.84, 0.3], [0, 4.86, 0.46], 0.03, 0.03, 6, { role: R.PAINT2 });
    B.box(0, 4.86, 0.66, 0.24, 0.12, 0.48, { role: R.PAINT2, c: 0.02, tx: 0.85, tz: 0.92 });
    B.box(0, 4.795, 0.66, 0.19, 0.012, 0.4, { role: R.LAMP, c: 0 });
    B.cyl([0, 4.82, 0], [0, 4.9, 0], 0.06, 0.04, 8, { role: R.DARK });
  },

  // 配管の1区間（z が 0〜3m）：管、始まりのフランジと6本のボルト、中ほどの支えの帯と台、識別の帯
  pipeRun(B, far) {
    const y = 0.2; const r = 0.14;
    // 遠い形は六角の管。平らな面の幅が丸い管より細くならないよう、少し太らせる（細いと遠くでちらつく）
    if (far) { B.cyl([0, y, 0], [0, y, 3], 0.16, 0.16, 6, { role: R.PAINT2, rnd: 0.5 }); return; }
    // 管は塗装（地金の管は低い日に光の筋が強く出て、発光と重なると光る棒に見えるため）
    B.cyl([0, y, 0], [0, y, 3], r, r, 12, { role: R.PAINT2, rnd: 0.5 });
    B.cyl([0, y, 0], [0, y, 0.06], 0.19, 0.19, 12, { role: R.DARK, rnd: 0.35 });
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + 0.3; B.box(Math.cos(a) * 0.165, y + Math.sin(a) * 0.165, 0.03, 0.028, 0.028, 0.1, { role: R.BARE, c: 0 }); }
    B.cyl([0, y, 1.48], [0, y, 1.56], r + 0.012, r + 0.012, 12, { role: R.DARK, capA: false, capB: false });
    B.box(0, 0.035, 1.52, 0.18, 0.07, 0.1, { role: R.DARK, c: 0 });
    B.cyl([0, y, 2.3], [0, y, 2.45], r + 0.004, r + 0.004, 12, { role: R.HAZARD, capA: false, capB: false });
  },

  // 配管の束の1区間（z が 0〜2m）：太さと色の違う4本の管、架台（枕木・柱・中段・押さえ）、管の留め帯、2本のフランジ
  pipeBundle(B, far) {
    const pipes = [[-0.27, 0.21, 0.13, R.PAINT2, 0.5], [0.03, 0.175, 0.095, R.PAINT, 0.6], [0.27, 0.155, 0.075, R.RED, 0.45], [-0.05, 0.445, 0.085, R.BARE, 0.4]];
    if (far) {
      for (const [x, y, r, role] of pipes) B.cyl([x, y, 0], [x, y, 2], r, r, 4, { role, capA: false, capB: false });
      B.box(0, 0.04, 0.25, 0.9, 0.08, 0.1, { role: R.DARK });
      return;
    }
    B.box(0, 0.04, 0.25, 0.9, 0.08, 0.1, { role: R.DARK, c: 0 });
    for (const sx of [-1, 1]) B.box(sx * 0.42, 0.37, 0.25, 0.05, 0.58, 0.07, { role: R.DARK, c: 0 });
    B.box(0, 0.345, 0.25, 0.9, 0.03, 0.06, { role: R.DARK, c: 0 });
    B.box(0, 0.68, 0.25, 0.9, 0.04, 0.08, { role: R.DARK, c: 0 });
    pipes.forEach(([x, y, r, role, rnd], i) => {
      B.cyl([x, y, 0], [x, y, 2], r, r, 10, { role, rnd });
      B.cyl([x, y, 0.22], [x, y, 0.28], r + 0.012, r + 0.012, 10, { role: R.DARK, capA: false, capB: false });
      if (i < 2) B.cyl([x, y, 1.28], [x, y, 1.33], r + 0.045, r + 0.045, 10, { role: R.DARK });
    });
  },

  // 手すりの1区間（z が 0〜1.8m）：両端の支柱（継ぎ目でちょうど重なる）、上の手すり、中の桟、警告の縞の幅木
  railing(B, far) {
    const L = 1.8;
    if (far) {
      // 遠くでは棒を太らせる（細い棒は1画素より細くなってちらつく）
      for (const z of [0, L]) B.box(0, 0.53, z, 0.07, 1.06, 0.07, { role: R.PAINT2, rnd: 0.55 });
      B.box(0, 1.08, L / 2, 0.07, 0.05, L, { role: R.PAINT2, rnd: 0.55 });
      B.box(0, 0.55, L / 2, 0.06, 0.05, L, { role: R.PAINT2, rnd: 0.55 });
      return;
    }
    // 支柱：床へボルトで留めた台の板と、頭のふた（両端の支柱は隣の区間と同じ位置に重なるので、継ぎ目でも1本に見える）
    for (const z of [0, L]) {
      B.box(0, 0.53, z, 0.045, 1.06, 0.045, { role: R.PAINT2, rnd: 0.55 });
      B.box(0, 0.006, z, 0.12, 0.012, 0.12, { role: R.DARK, c: 0 });
      for (const s of [-1, 1]) bolt(B, 0, 0.012, z + s * 0.04, 1, 1, 0.018);
    }
    B.box(0, 1.08, L / 2, 0.05, 0.04, L, { role: R.PAINT2, rnd: 0.55 });
    B.box(0, 0.55, L / 2, 0.035, 0.035, L, { role: R.PAINT2, c: 0, rnd: 0.55 });
    B.box(0, 0.06, L / 2, 0.012, 0.1, L - 0.05, { role: R.HAZARD, c: 0 });
  },

  // はしごの1区間（y が 0〜2.4m、壁の側が -z）：2本の側木、0.3m おきの8本の段、壁への留め金
  ladder(B, far) {
    const H = 2.4; const z0 = 0.06;
    if (far) {
      for (const sx of [-1, 1]) B.box(sx * 0.22, H / 2, z0, 0.06, H, 0.07, { role: R.PAINT2 });
      for (let k = 0; k < 4; k++) B.box(0, 0.3 + k * 0.6, z0, 0.4, 0.035, 0.035, { role: R.BARE });
      for (const sx of [-1, 1]) B.box(sx * 0.22, 1.2, -0.05, 0.05, 0.06, 0.15, { role: R.DARK });
      return;
    }
    for (const sx of [-1, 1]) B.box(sx * 0.22, H / 2, z0, 0.05, H, 0.07, { role: R.PAINT2, c: 0.006 });
    for (let k = 0; k < 8; k++) B.cyl([-0.2, 0.15 + k * 0.3, z0], [0.2, 0.15 + k * 0.3, z0], 0.016, 0.016, 6, { role: R.BARE, capA: false, capB: false });
    for (const sx of [-1, 1]) B.box(sx * 0.22, 1.2, -0.05, 0.04, 0.05, 0.15, { role: R.DARK, c: 0 });
  },

  // 床のハッチ：警告の縞の縁（4本）、隙間からのぞく暗い底、面取りしたふた、取っ手、奥の蝶番、4辺の締め金
  hatch(B, far) {
    if (far) {
      B.box(0, 0.1, 0, 1.2, 0.2, 1.2, { role: R.DARK, top: R.HAZARD });
      B.box(0, 0.22, 0, 0.98, 0.06, 0.98, { role: R.PAINT2, rnd: 0.6 });
      return;
    }
    const rim = { role: R.DARK, top: R.HAZARD, c: 0.01, rnd: 0.3 };
    for (const s of [-1, 1]) { B.box(s * 0.55, 0.1, 0, 0.1, 0.2, 1.2, rim); B.box(0, 0.1, s * 0.55, 1.0, 0.2, 0.1, rim); }
    B.box(0, 0.01, 0, 1.0, 0.02, 1.0, { role: R.INNER, c: 0 });
    B.box(0, 0.22, 0, 0.98, 0.06, 0.98, { role: R.PAINT2, c: 0.015, rnd: 0.6 });
    B.box(0, 0.285, 0.3, 0.3, 0.022, 0.022, { role: R.BARE, c: 0 });
    for (const sx of [-1, 1]) B.box(sx * 0.14, 0.262, 0.3, 0.022, 0.024, 0.022, { role: R.BARE, c: 0 });
    for (const sx of [-1, 1]) B.cyl([sx * 0.38 - 0.08, 0.245, -0.5], [sx * 0.38 + 0.08, 0.245, -0.5], 0.03, 0.03, 8, { role: R.DARK });
    for (const s of [-1, 1]) { B.box(s * 0.49, 0.255, 0, 0.05, 0.03, 0.08, { role: R.BARE, c: 0 }); B.box(0.25, 0.255, s * 0.49, 0.08, 0.03, 0.05, { role: R.BARE, c: 0 }); }
  },

  // 配電箱（扉は +z）：台、面取りした本体、雨よけ、少し出た扉、取っ手と蝶番、2つの灯り（橙・白）、通気の格子、警告の札
  junction(B, far) {
    if (far) {
      B.box(0, 0.6, 0, 0.78, 1.2, 0.36, { role: R.PAINT2, rnd: 0.6 });
      B.box(0, 0.62, 0.19, 0.66, 0.94, 0.02, { role: R.PAINT2, rnd: 0.45 });
      B.box(-0.18, 1.0, 0.203, 0.06, 0.06, 0.012, { role: R.LAMP });
      return;
    }
    B.box(0, 0.05, 0, 0.8, 0.1, 0.4, { role: R.DARK, c: 0 });
    B.box(0, 0.64, 0, 0.76, 1.08, 0.36, { role: R.PAINT2, c: 0.03, rnd: 0.6 });
    B.box(0, 1.19, 0.01, 0.8, 0.02, 0.38, { role: R.DARK, c: 0 });
    B.box(0, 0.62, 0.19, 0.66, 0.94, 0.02, { role: R.PAINT2, c: 0.006, rnd: 0.45 });
    B.box(0.27, 0.62, 0.208, 0.028, 0.15, 0.026, { role: R.BARE, c: 0 });
    for (const y of [0.35, 0.9]) B.box(-0.335, y, 0.195, 0.02, 0.08, 0.03, { role: R.DARK, c: 0 });
    B.box(-0.18, 1.0, 0.203, 0.05, 0.05, 0.012, { role: R.LAMP, c: 0 });
    B.box(-0.08, 1.0, 0.203, 0.05, 0.05, 0.012, { role: R.STRIP, c: 0 });
    B.box(0, 0.3, 0.202, 0.42, 0.12, 0.006, { role: R.GRILLE, c: 0 });
    B.box(0.12, 0.82, 0.2015, 0.16, 0.12, 0.004, { role: R.HAZARD, c: 0 });
  },

  // ケーブルの巻き（軸は z）：両側のつば、巻いたケーブル、軸の金具、つばのボルト、垂れて床へ届くケーブルの端
  cableSpool(B, far) {
    const y = 0.5;
    if (far) {
      for (const z of [-0.37, 0.37]) B.cyl([0, y, z - 0.03], [0, y, z + 0.03], 0.5, 0.5, 8, { role: R.PAINT2, rnd: 0.6 });
      B.cyl([0, y, -0.34], [0, y, 0.34], 0.37, 0.37, 8, { role: R.CABLE, capA: false, capB: false });
      return;
    }
    for (const z of [-0.37, 0.37]) B.cyl([0, y, z - 0.03], [0, y, z + 0.03], 0.5, 0.5, 16, { role: R.PAINT2, rnd: 0.6 });
    B.cyl([0, y, -0.34], [0, y, 0.34], 0.37, 0.37, 16, { role: R.CABLE, capA: false, capB: false });
    B.cyl([0, y, -0.405], [0, y, 0.405], 0.075, 0.075, 8, { role: R.BARE });
    for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; bolt(B, Math.cos(a) * 0.22, y + Math.sin(a) * 0.22, sg * 0.4, 2, sg, 0.035); }
    const pts = [[0.18, 0.86, 0.1], [0.42, 0.62, 0.14], [0.47, 0.3, 0.18], [0.45, 0.025, 0.24]];
    for (let i = 0; i < 3; i++) B.beam(pts[i], pts[i + 1], 0.045, 0.045, { role: R.CABLE, c: 0 });
  },

  // 瓦礫の山：ゆがんだコンクリートの塊6つ、傾いた床の破片、曲がった鉄筋4本、小さな欠片、折れた鉄板
  rubble(B, far) {
    const cs = rubbleChunks();
    cs.forEach((c, i) => {
      if (far && i >= 3) return;
      B.push(c.p[0], c.p[1], c.p[2], c.tilt[0], c.ry, c.tilt[1]);
      B.hexa(c.c8, { role: R.CONCRETE, c: far ? 0 : (i < 3 ? 0.02 : 0), rnd: c.rnd });
      B.pop();
    });
    B.push(0.05, 0.3, -0.38, 0.35, 0.4, 0.15);
    B.box(0, 0, 0, 0.8, 0.08, 0.5, { role: R.CONCRETE, top: R.DECK, c: far ? 0 : 0.01, rnd: 0.7 });
    B.pop();
    if (far) return;
    const bars = [[[-0.2, 0.3, -0.1], [-0.35, 0.55, 0.05], [-0.25, 0.66, 0.3]], [[0.3, 0.25, 0.1], [0.55, 0.42, 0.2], [0.7, 0.46, 0.0]],
      [[0.0, 0.45, 0.1], [0.1, 0.62, 0.35], [0.32, 0.66, 0.45]], [[-0.4, 0.15, 0.4], [-0.62, 0.3, 0.55], [-0.72, 0.28, 0.3]]];
    for (const b of bars) for (let i = 0; i < 2; i++) B.beam(b[i], b[i + 1], 0.022, 0.022, { role: R.RUST, c: 0 });
    for (const [x, z, s] of [[0.62, 0.35, 0.1], [-0.6, -0.5, 0.12], [0.25, -0.62, 0.08], [-0.15, 0.68, 0.09]]) B.box(x, s * 0.4, z, s, s * 0.8, s * 1.2, { role: R.CONCRETE, c: 0, rnd: 0.4 });
    B.push(0.45, 0.06, 0.55, 0, 0.7, 0); B.box(0, 0, 0, 0.32, 0.012, 0.22, { role: R.PAINT, bottom: R.BARE, c: 0 });
    B.push(0.16, 0.0, 0, 0, 0, 0.9); B.box(0.1, 0, 0, 0.2, 0.012, 0.22, { role: R.PAINT, bottom: R.BARE, c: 0 }); B.pop(); B.pop();
  },

  // 割れた床板：-x と -z は真っ直ぐな縁（金物）、+x と +z の側はぎざぎざに割れた断面（蜂の巣の芯と焦げ）。
  // 上は甲板、下は暗い裏。下の2本の梁は割れ目で折れて曲がり、割れ目から鉄筋が飛び出す。真っ直ぐな縁にボルトの帯
  slab(B, far) {
    const out = far ? [[-1, -1], [1, -1], [0.82, -0.3], [0.95, 0.35], [0.4, 0.8], [-0.3, 0.95], [-1, 1]]
      : [[-1, -1], [1, -1], [0.86, -0.55], [0.97, -0.25], [0.78, 0.05], [0.92, 0.38], [0.62, 0.6], [0.5, 0.9], [0.15, 0.78], [-0.2, 0.97], [-0.55, 0.86], [-1, 1]];
    // 遠い形は下の梁を省くので、板の裏を床まで下げて浮かないようにする
    const yT = 0.25; const yB = far ? 0 : 0.07;
    const n = out.length;
    const cx = out.reduce((s, p) => s + p[0], 0) / n; const cz = out.reduce((s, p) => s + p[1], 0) / n;
    B.poly(out.map(([x, z]) => B.toW([x, yT, z])), out.map(([x, z]) => [x, z]), { role: R.DECK, rnd: 0.5 }, B.toW([cx, 0, cz]), true);
    B.poly(out.map(([x, z]) => B.toW([x, yB, z])), out.map(([x, z]) => [x, z]), { role: R.INNER, rnd: 0.5 }, B.toW([cx, 1, cz]), true);
    let u = 0;
    for (let i = 0; i < n; i++) {
      const a = out[i]; const b = out[(i + 1) % n];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // 真っ直ぐな縁は最後の2辺（(-1,1)→(-1,-1)）と最初の辺（(-1,-1)→(1,-1)）
      const straight = i === 0 || i === n - 1;
      const pts = [[a[0], yT, a[1]], [b[0], yT, b[1]], [b[0], yB, b[1]], [a[0], yB, a[1]]].map((p) => B.toW(p));
      B.poly(pts, [[u, yT], [u + L, yT], [u + L, yB], [u, yB]], straight ? { role: R.BARE, rnd: 0.4 } : { role: R.HONEY, rnd: 0.4, soot: 0.45 }, B.toW([cx, (yT + yB) / 2, cz]));
      u += L;
    }
    if (far) return;
    for (const [x, zEnd] of [[-0.5, 0.86], [0.3, 0.78]]) {
      B.box(x, 0.035, (zEnd - 0.95) / 2, 0.1, 0.07, zEnd + 0.95, { role: R.DARK, c: 0 });
      B.beam([x, 0.035, zEnd], [x + 0.03, 0.06, Math.min(0.98, zEnd + 0.2)], 0.09, 0.06, { role: R.RUST, c: 0 });
    }
    const bars = [[[0.85, 0.16, -0.4], [0.98, 0.18, -0.42], [1.0, 0.28, -0.36]], [[0.82, 0.16, 0.2], [0.96, 0.19, 0.22], [0.99, 0.27, 0.3]],
      [[0.55, 0.16, 0.7], [0.58, 0.18, 0.92], [0.66, 0.29, 0.98]], [[-0.1, 0.16, 0.8], [-0.12, 0.2, 0.98], [-0.05, 0.29, 1.0]], [[-0.45, 0.16, 0.78], [-0.48, 0.18, 0.94], [-0.4, 0.27, 0.99]]];
    for (const b of bars) for (let i = 0; i < 2; i++) B.beam(b[i], b[i + 1], 0.02, 0.02, { role: R.RUST, c: 0 });
    for (let k = 0; k < 6; k++) { const t = -0.8 + k * 0.32; bolt(B, -0.92, yT, t, 1, 1, 0.032); bolt(B, t, yT, -0.92, 1, 1, 0.032); }
  },

  // 鉄骨（H形）の1区間（z が 0〜4m）：面取りしたフランジ2枚とウェブ、始まりの継ぎ板とボルト、中ほどの補剛板
  girder(B, far) {
    const L = 4.0;
    if (far) {
      B.box(0, 0.38, L / 2, 0.3, 0.04, L, { role: R.PAINT2, rnd: 0.55 });
      B.box(0, 0.02, L / 2, 0.3, 0.04, L, { role: R.PAINT2, rnd: 0.55 });
      B.box(0, 0.2, L / 2, 0.03, 0.32, L, { role: R.PAINT2, rnd: 0.55 });
      return;
    }
    B.box(0, 0.38, L / 2, 0.3, 0.04, L, { role: R.PAINT2, c: 0.006, rnd: 0.55 });
    B.box(0, 0.02, L / 2, 0.3, 0.04, L, { role: R.PAINT2, c: 0.006, rnd: 0.55 });
    B.box(0, 0.2, L / 2, 0.022, 0.32, L, { role: R.PAINT2, c: 0, rnd: 0.55 });
    for (const sx of [-1, 1]) {
      B.box(sx * 0.017, 0.2, 0, 0.012, 0.24, 0.3, { role: R.DARK, c: 0 });
      for (const by of [0.13, 0.27]) for (const bz of [-0.08, 0.08]) bolt(B, sx * 0.023, by, bz, 0, sx, 0.026);
      B.box(sx * 0.075, 0.354, 0, 0.11, 0.012, 0.3, { role: R.DARK, c: 0 });
      B.box(sx * 0.075, 0.2, L / 2, 0.12, 0.32, 0.015, { role: R.PAINT2, c: 0, rnd: 0.5 });
    }
    for (const [sx, sz] of CORNERS) bolt(B, sx * 0.08, 0.4, sz * 0.08, 1, 1, 0.026);
  },
};

// 瓦礫の塊（近い形と遠い形で同じ塊になるよう、ゆがみを先に決めておく）
let _rubble = null;
function rubbleChunks() {
  if (_rubble) return _rubble;
  const Q = rng(4242);
  const defs = [[-0.3, 0.2, -0.2, 0.7, 0.4, 0.55, 0.3, 0.1], [0.35, 0.16, 0.1, 0.55, 0.32, 0.5, -0.5, -0.15], [0.0, 0.4, 0.05, 0.45, 0.28, 0.4, 1.1, 0.25],
    [-0.45, 0.12, 0.45, 0.35, 0.24, 0.3, 0.8, 0.2], [0.45, 0.1, -0.45, 0.3, 0.2, 0.32, 2.0, -0.1], [0.15, 0.1, 0.55, 0.28, 0.18, 0.22, 0.4, 0.3]];
  _rubble = defs.map(([x, y, z, sx, sy, sz, ry, tl]) => {
    const c8 = [];
    for (let i = 0; i < 8; i++) {
      const j = () => 1 + (Q() * 2 - 1) * 0.28;
      c8.push([(i & 1 ? 0.5 : -0.5) * sx * j(), ((i >> 1) & 1 ? 0.5 : -0.5) * sy * j(), ((i >> 2) & 1 ? 0.5 : -0.5) * sz * j()]);
    }
    return { p: [x, y, z], c8, ry, tilt: [tl * 0.6, tl], rnd: Q() };
  });
  return _rubble;
}

// ---- 形を three に渡せる配列にする ----
// 角度の小さい面どうしの法線をならす（円筒・樽・鏡板は滑らかに、箱の角と面取りの縁は立てたまま）
const SMOOTH_COS = Math.cos(40 * D2R);
function smoothNormals(P, N) {
  const nv = P.length / 3;
  const groups = new Map();
  for (let v = 0; v < nv; v++) {
    const k = `${Math.round(P[v * 3] * 1e4)},${Math.round(P[v * 3 + 1] * 1e4)},${Math.round(P[v * 3 + 2] * 1e4)}`;
    let g = groups.get(k); if (!g) { g = []; groups.set(k, g); } g.push(v);
  }
  const out = new Float32Array(N.length);
  for (const g of groups.values()) {
    for (const v of g) {
      let x = 0; let y = 0; let z = 0;
      for (const w of g) {
        if (N[v * 3] * N[w * 3] + N[v * 3 + 1] * N[w * 3 + 1] + N[v * 3 + 2] * N[w * 3 + 2] < SMOOTH_COS) continue;
        x += N[w * 3]; y += N[w * 3 + 1]; z += N[w * 3 + 2];
      }
      const l = Math.hypot(x, y, z) || 1;
      out[v * 3] = x / l; out[v * 3 + 1] = y / l; out[v * 3 + 2] = z / l;
    }
  }
  return out;
}

// 種類 type の形を組む（far：遠い形）。足元 1m 四方・高さ 1m へ縮めた頂点と、メートルのままの uv を返す
export function buildPropShape(type, far = false) {
  const info = PROP_INFO[type];
  const fn = SHAPES[type];
  if (!info || !fn) throw new Error(`小物の種類がない: ${type}`);
  const B = new Builder();
  // 一様な倍率で組む（Builder の倍率は uv にも掛かるので、模様はメートルのまま。面取りを省く判断も実寸で行われる）
  if (info.k !== 1) B.push(0, 0, 0, 0, 0, 0, info.k);
  fn(B, far);
  const P = new Float32Array(B.P); const N0 = new Float32Array(B.N);
  const N = smoothNormals(P, N0);
  const [sx, sy, sz] = info.size;
  // 位置は大きさで割り、法線は逆の向きに掛けて直す（縮めた形に、置くときの拡大を掛けると元の向きに戻る）
  const mn = [Infinity, Infinity, Infinity]; const mx = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < P.length; v += 3) {
    P[v] /= sx; P[v + 1] /= sy; P[v + 2] /= sz;
    for (let k = 0; k < 3; k++) { if (P[v + k] < mn[k]) mn[k] = P[v + k]; if (P[v + k] > mx[k]) mx[k] = P[v + k]; }
    const nx = N[v] * sx; const ny = N[v + 1] * sy; const nz = N[v + 2] * sz;
    const l = Math.hypot(nx, ny, nz) || 1;
    N[v] = nx / l; N[v + 1] = ny / l; N[v + 2] = nz / l;
  }
  // 面積のない三角形（回転体の軸の上の点が作る、つぶれた三角形）を外す。描いても何も出ないのに頂点の計算だけかかるため
  const I0 = B.I; const keep = [];
  for (let i = 0; i < I0.length; i += 3) {
    const a = I0[i] * 3; const b = I0[i + 1] * 3; const c = I0[i + 2] * 3;
    const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2];
    const wx = P[c] - P[a]; const wy = P[c + 1] - P[a + 1]; const wz = P[c + 2] - P[a + 2];
    if (Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx) > 1e-12) keep.push(I0[i], I0[i + 1], I0[i + 2]);
  }
  const index = P.length / 3 < 65536 ? new Uint16Array(keep) : new Uint32Array(keep);
  return { type, far, position: P, normal: N, uv: new Float32Array(B.UV), aMat: new Float32Array(B.A), aExt: new Float32Array(B.E), index, tris: index.length / 3, min: mn, max: mx };
}

// 全種類の近い形と遠い形（1回だけ組む）
let _shapes = null;
export function getPropShapes() {
  if (_shapes) return _shapes;
  _shapes = {};
  for (const t of PROP_TYPES) {
    const near = buildPropShape(t, false); const far = buildPropShape(t, true);
    // 置き場所の球（近い形と遠い形を合わせた枠）
    const mn = near.min.map((x, k) => Math.min(x, far.min[k])); const mx = near.max.map((x, k) => Math.max(x, far.max[k]));
    _shapes[t] = { near, far, center: mn.map((x, k) => (x + mx[k]) / 2), half: mn.map((x, k) => (mx[k] - x) / 2) };
  }
  return _shapes;
}

function toGeometry(s) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(s.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(s.normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(s.uv, 2));
  g.setAttribute('aMat', new THREE.BufferAttribute(s.aMat, 4));
  g.setAttribute('aExt', new THREE.BufferAttribute(s.aExt, 4));
  g.setIndex(new THREE.BufferAttribute(s.index, 1));
  g.computeBoundingSphere();
  return g;
}

// ---- 置き場所を世界の座標のインスタンスへ広げる（three に頼らない） ----
// props：建物の生成結果の g.props（{ type, m: 4x4 列優先・建物の局所, rnd }）。world：建物の置き場所の行列（Matrix4・Object3D・16個の配列）
// 戻り値：[{ type, m: 世界の 4x4, rnd, sub }]。長さで伸ばす物は区間に分ける（sub が区間の番号）
export function matrixArray(world) {
  if (!world) return M4.ident();
  if (world.isObject3D) return Array.from(world.matrixWorld.elements);
  if (world.isMatrix4) return Array.from(world.elements);
  if (world.length === 16) return Array.from(world);
  throw new Error('建物の置き場所の行列が読めない');
}
export function expandProps(props, world) {
  const W = matrixArray(world);
  const out = [];
  for (const p of props) {
    const info = PROP_INFO[p.type];
    if (!info) continue;
    const m = M4.mul(W, p.m);
    const ax = info.linear;
    let n = 1;
    if (ax >= 0) { const L = Math.hypot(m[ax * 4], m[ax * 4 + 1], m[ax * 4 + 2]); n = Math.max(1, Math.round(L / info.size[ax])); }
    for (let i = 0; i < n; i++) {
      let mi = m;
      if (n > 1) {
        // 区間 i：軸の向きに i/n だけ進め、軸の長さを 1/n にする
        mi = m.slice();
        for (let k = 0; k < 3; k++) { mi[12 + k] = m[12 + k] + m[ax * 4 + k] * (i / n); mi[ax * 4 + k] = m[ax * 4 + k] / n; }
      }
      out.push({ type: p.type, m: mi, rnd: p.rnd ?? 0.5, sub: i });
    }
  }
  return out;
}

const fract = (x) => x - Math.floor(x);
const smooth01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// ---- 小物を描く場 ----
// 引数：scene / group / parent（どれかに足す）、castShadow（true＝既定の大きい種類・false・種類名の配列）、farShadow（遠い形も影を落とす）、
//   maxPerType（種類ごと・段ごとの表の大きさ。数か { 種類: 数 }）、maxDist（消す距離の上限 m）、cullK（大きさ×何 m で消すか）、
//   nearK（大きさ×何 m まで近い形か）、cellSize（区画の大きさ m）、fadeBand（消す手前の縮める帯の割合）、material（材質を差し替える。試験用）
export function createPropField(opts = {}) {
  const {
    scene = null, group = null, parent = null, castShadow = true, farShadow = false, maxPerType = 2048,
    maxDist = 1500, cullK = 120, nearK = 18, cellSize = 48, fadeBand = 0.22, lodBias = 1, receiveShadow = true, material = null,
  } = opts;
  const root = new THREE.Group();
  root.name = 'props';
  const host = parent || group || scene;
  if (host) host.add(root);
  const ownMaterial = !material;
  const mat = material || createStructureMaterial({ worldSpace: true });
  const shapes = getPropShapes();

  // 種類ごとの描く物（近い形・遠い形の InstancedMesh）
  const kinds = PROP_TYPES.map((type, ti) => {
    const info = PROP_INFO[type];
    const cap = typeof maxPerType === 'object' ? (maxPerType[type] ?? 2048) : maxPerType;
    const band = (s, lod) => {
      const geo = toGeometry(s);
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.name = `prop:${type}:${lod ? 'far' : 'near'}`;
      mesh.count = 0; mesh.visible = false;
      // 見える物を毎コマ自分で選んで詰めるので、three の枠による選別は使わない
      mesh.frustumCulled = false;
      mesh.receiveShadow = receiveShadow;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      root.add(mesh);
      return { mesh, M: mesh.instanceMatrix.array, C: mesh.instanceColor.array, n: 0, tris: s.tris };
    };
    return { type, ti, info, cap, bands: [band(shapes[type].near, 0), band(shapes[type].far, 1)], shape: shapes[type] };
  });
  const TI = Object.fromEntries(PROP_TYPES.map((t, i) => [t, i]));

  let shadowSet = new Set();
  function setShadow(spec, far = farShadow) {
    shadowSet = new Set(spec === true ? PROP_SHADOW_TYPES : Array.isArray(spec) ? spec : []);
    for (const k of kinds) { k.bands[0].mesh.castShadow = shadowSet.has(k.type); k.bands[1].mesh.castShadow = far && shadowSet.has(k.type); }
  }
  setShadow(castShadow, farShadow);

  // ---- インスタンスの表（伸びる型付き配列） ----
  let cap = 1024; let top = 0; const free = [];
  let MAT = new Float32Array(cap * 16); let SPH = new Float32Array(cap * 4); let DST = new Float32Array(cap * 2); let COL = new Float32Array(cap * 3);
  let TYP = new Uint8Array(cap); let ALIVE = new Uint8Array(cap); let NEAR = new Uint8Array(cap); let CELL = new Int32Array(cap);
  function grow() {
    const c2 = cap * 2;
    const g = (A, k, T) => { const B2 = new T(c2 * k); B2.set(A); return B2; };
    MAT = g(MAT, 16, Float32Array); SPH = g(SPH, 4, Float32Array); DST = g(DST, 2, Float32Array); COL = g(COL, 3, Float32Array);
    TYP = g(TYP, 1, Uint8Array); ALIVE = g(ALIVE, 1, Uint8Array); NEAR = g(NEAR, 1, Uint8Array); CELL = g(CELL, 1, Int32Array);
    cap = c2;
  }
  // 区画（空間を cellSize の升に分け、升ごとに中の物と枠を持つ）
  const cellMap = new Map(); const cells = [];
  let alive = 0; let unknown = 0;

  function insert(rec) {
    const ti = TI[rec.type];
    const k = kinds[ti]; const info = k.info; const sh = k.shape;
    const id = free.length ? free.pop() : top++;
    if (id >= cap) grow();
    const m = rec.m;
    MAT.set(m, id * 16);
    // 置き場所の球：形の枠の中心を置き、軸ごとの拡大で半径を出す
    const [lx, ly, lz] = sh.center;
    const cx = m[0] * lx + m[4] * ly + m[8] * lz + m[12]; const cy = m[1] * lx + m[5] * ly + m[9] * lz + m[13]; const cz = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
    const e = [0, 1, 2].map((a) => 2 * sh.half[a] * Math.hypot(m[a * 4], m[a * 4 + 1], m[a * 4 + 2]));
    const r = 0.5 * Math.hypot(e[0], e[1], e[2]);
    SPH[id * 4] = cx; SPH[id * 4 + 1] = cy; SPH[id * 4 + 2] = cz; SPH[id * 4 + 3] = r;
    // 見た目の大きさ：一番長い辺と二番目の辺の相乗平均（細長い物は太さだけで決めると早く消えすぎ、長さだけだと細い棒が遠くまで残ってちらつく）
    e.sort((a, b) => b - a);
    const vis = Math.sqrt(e[0] * e[1]);
    DST[id * 2] = vis * cullK * info.cullMul;
    DST[id * 2 + 1] = vis * nearK * info.nearMul;
    // 塗りの色違いと明るさのばらつき（同じ入力なら同じ色）
    const h = fract(rec.rnd * 0.618 + rec.sub * 0.137);
    const pc = info.palette[Math.floor(fract(rec.rnd * 3.71 + rec.sub * 0.53) * info.palette.length) % info.palette.length];
    const br = 0.9 + 0.2 * h;
    COL[id * 3] = pc[0] * br; COL[id * 3 + 1] = pc[1] * br; COL[id * 3 + 2] = pc[2] * br;
    TYP[id] = ti; ALIVE[id] = 1; NEAR[id] = 0;
    // 区画へ
    const ix = Math.floor(cx / cellSize); const iy = Math.floor(cy / cellSize); const iz = Math.floor(cz / cellSize);
    const key = `${ix},${iy},${iz}`;
    let c = cellMap.get(key);
    if (!c) { c = { i: cells.length, ids: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], maxR: 0, shadow: false, d: 0 }; cellMap.set(key, c); cells.push(c); }
    c.ids.push(id);
    for (let a = 0; a < 3; a++) { const v = SPH[id * 4 + a]; if (v - r < c.min[a]) c.min[a] = v - r; if (v + r > c.max[a]) c.max[a] = v + r; }
    c.maxR = Math.max(c.maxR, DST[id * 2]);
    if (info.shadow) c.shadow = true;
    CELL[id] = c.i;
    alive++;
    return id;
  }

  // 建物の小物を登録する。戻り値の handle を remove に渡すと外せる
  function add(props, world) {
    const ids = [];
    for (const p of props) if (!PROP_INFO[p.type]) unknown++;
    for (const rec of expandProps(props, world)) ids.push(insert(rec));
    return { ids, removed: false };
  }
  function remove(handle) {
    if (!handle || handle.removed) return;
    handle.removed = true;
    const byCell = new Map();
    for (const id of handle.ids) {
      if (!ALIVE[id]) continue;
      ALIVE[id] = 0; alive--; free.push(id);
      const c = cells[CELL[id]];
      let s = byCell.get(c); if (!s) { s = new Set(); byCell.set(c, s); } s.add(id);
    }
    for (const [c, s] of byCell) c.ids = c.ids.filter((id) => !s.has(id));
  }
  function clear() {
    top = 0; free.length = 0; alive = 0; cellMap.clear(); cells.length = 0; ALIVE.fill(0);
    for (const k of kinds) for (const b of k.bands) { b.n = 0; b.mesh.count = 0; b.mesh.visible = false; }
  }

  // ---- 毎コマ：見える物を選んで表へ詰める ----
  const frustum = new THREE.Frustum(); const pm = new THREE.Matrix4();
  const vis = [];
  let forced = -1;
  const stats = { instances: 0, near: 0, far: 0, draws: 0, shadowDraws: 0, tris: 0, cellsSeen: 0, updateMs: 0, total: 0, unknown: 0 };
  // 影を落とす物は、画面の外でも影が画面に入るので、少し広く残す
  const SHADOW_MARGIN = 25;
  function update(camera) {
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm, camera.coordinateSystem, camera.reversedDepth);
    const planes = frustum.planes;
    const e = camera.matrixWorld.elements;
    const px = e[12]; const py = e[13]; const pz = e[14];
    // 画面の倍率：1m が距離 1m で何画素か（setStructureView が毎コマ入れる）。國松の画面（高さ 956、視野角 55°）の値 919 を基準に、
    // 望遠や大きな画面ほど遠くまで残す
    const kv = Math.min(2.5, Math.max(0.5, STRUCT_U.pxScale.value / 919)) * lodBias;
    for (const k of kinds) { k.bands[0].n = 0; k.bands[1].n = 0; }
    // 区画を選ぶ：近い順に並べ、表があふれたときに近い物を優先する
    vis.length = 0;
    for (const c of cells) {
      if (!c.ids.length) continue;
      const dx = Math.max(c.min[0] - px, 0, px - c.max[0]); const dy = Math.max(c.min[1] - py, 0, py - c.max[1]); const dz = Math.max(c.min[2] - pz, 0, pz - c.max[2]);
      const d = Math.hypot(dx, dy, dz);
      if (d > Math.min(maxDist, c.maxR * kv)) continue;
      const hx = (c.max[0] - c.min[0]) / 2; const hy = (c.max[1] - c.min[1]) / 2; const hz = (c.max[2] - c.min[2]) / 2;
      const ccx = c.min[0] + hx; const ccy = c.min[1] + hy; const ccz = c.min[2] + hz;
      const rr = Math.hypot(hx, hy, hz) + (c.shadow ? SHADOW_MARGIN : 0);
      let out = false; let inside = true;
      for (let i = 0; i < 6; i++) {
        const p = planes[i]; const s = p.normal.x * ccx + p.normal.y * ccy + p.normal.z * ccz + p.constant;
        if (s < -rr) { out = true; break; }
        if (s < rr) inside = false;
      }
      if (out) continue;
      c.d = d; c.inside = inside;
      vis.push(c);
    }
    vis.sort((a, b) => a.d - b.d);
    for (const c of vis) {
      const ids = c.ids;
      for (let j = 0; j < ids.length; j++) {
        const id = ids[j];
        const o4 = id * 4;
        const cx = SPH[o4]; const cy = SPH[o4 + 1]; const cz = SPH[o4 + 2]; const r = SPH[o4 + 3];
        const dist = Math.hypot(cx - px, cy - py, cz - pz);
        const d = Math.max(0, dist - r);
        const Rc = Math.min(maxDist, DST[id * 2] * kv);
        if (d > Rc) continue;
        const ti = TYP[id]; const k = kinds[ti];
        if (!c.inside) {
          const rr = r + (k.info.shadow ? SHADOW_MARGIN : 0);
          let out = false;
          for (let i = 0; i < 6; i++) { const p = planes[i]; if (p.normal.x * cx + p.normal.y * cy + p.normal.z * cz + p.constant < -rr) { out = true; break; } }
          if (out) continue;
        }
        // 近い形か遠い形か（行き来でちらつかないよう、切り替えの距離に少し幅を持たせる）
        let near;
        if (forced >= 0) near = forced === 0;
        else { const Dn = DST[id * 2 + 1] * kv; near = NEAR[id] ? d < Dn * 1.08 : d < Dn * 0.92; }
        NEAR[id] = near ? 1 : 0;
        const b = k.bands[near ? 0 : 1];
        if (b.n >= k.cap) continue;
        // 消える手前の帯では、球の中心へ向けて縮める
        const f = fadeBand > 0 ? smooth01((Rc - d) / (Rc * fadeBand)) : 1;
        const M = b.M; const dO = b.n * 16; const sO = id * 16;
        if (f >= 0.999) {
          for (let q = 0; q < 16; q++) M[dO + q] = MAT[sO + q];
        } else {
          for (let q = 0; q < 12; q++) M[dO + q] = MAT[sO + q] * f;
          M[dO + 3] = 0; M[dO + 7] = 0; M[dO + 11] = 0;
          M[dO + 12] = cx + (MAT[sO + 12] - cx) * f; M[dO + 13] = cy + (MAT[sO + 13] - cy) * f; M[dO + 14] = cz + (MAT[sO + 14] - cz) * f; M[dO + 15] = 1;
        }
        const C = b.C; const cO = b.n * 3; const kO = id * 3;
        C[cO] = COL[kO]; C[cO + 1] = COL[kO + 1]; C[cO + 2] = COL[kO + 2];
        b.n++;
      }
    }
    // 表を GPU へ（使った所だけ）
    stats.instances = 0; stats.near = 0; stats.far = 0; stats.draws = 0; stats.shadowDraws = 0; stats.tris = 0;
    for (const k of kinds) {
      for (let l = 0; l < 2; l++) {
        const b = k.bands[l]; const mesh = b.mesh; const n = b.n;
        mesh.count = n; mesh.visible = n > 0;
        if (n) {
          mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, n * 16); mesh.instanceMatrix.needsUpdate = true;
          mesh.instanceColor.clearUpdateRanges(); mesh.instanceColor.addUpdateRange(0, n * 3); mesh.instanceColor.needsUpdate = true;
          stats.draws++; if (mesh.castShadow) stats.shadowDraws++;
          stats.tris += n * b.tris;
          if (l === 0) stats.near += n; else stats.far += n;
        }
      }
    }
    stats.instances = stats.near + stats.far;
    stats.cellsSeen = vis.length;
    stats.total = alive; stats.unknown = unknown;
    stats.updateMs = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
    return stats;
  }

  // 確認用：今の表の中身（種類ごとに、段ごとの数と行列の写し）
  function snapshot() {
    const out = {};
    for (const k of kinds) out[k.type] = k.bands.map((b) => ({ n: b.n, m: Array.from(b.M.subarray(0, b.n * 16)), c: Array.from(b.C.subarray(0, b.n * 3)) }));
    return out;
  }

  return {
    group: root, kinds, material: mat, stats,
    add, remove, clear, update, setShadow, snapshot,
    // 段を固定する（確認用）。-1 で距離に任せる、0 で全部近い形、1 で全部遠い形
    forceLod(l) { forced = l; },
    get count() { return alive; },
    dispose() {
      if (root.parent) root.parent.remove(root);
      for (const k of kinds) for (const b of k.bands) { b.mesh.geometry.dispose(); b.mesh.dispose?.(); }
      if (ownMaterial) mat.dispose();
    },
  };
}

// 確認用：種類ごとの三角形の数（近い形・遠い形）
export function propShapeStats() {
  const S = getPropShapes();
  return Object.fromEntries(PROP_TYPES.map((t) => [t, { near: S[t].near.tris, far: S[t].far.tris }]));
}
export { PROP_TYPES };
