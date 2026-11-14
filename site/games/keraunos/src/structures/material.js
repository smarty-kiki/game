import * as THREE from 'three';
import {
  Fn, uniform, uniformArray, attribute, texture3D, vec2, vec3, vec4, float, int, floor, fract, abs, min, max, mix, clamp, smoothstep, step, pow,
  length, dot, normalize, cross, sign, select, exp, sin, fwidth, positionGeometry, normalGeometry, positionView, normalView, positionWorld, cameraPosition, output, uv, time,
  instanceIndex,
} from 'three/tsl';
import { ROLE, ROLE_COUNT } from './core.js';
import { texture, transformNormalToView, cos, modelWorldMatrix, normalWorld } from 'three/tsl';

// 建物と残骸の材質（1つの材質で全部の役割を描く。部品ごとに材質を分けると描画の回数が増えるため）。
// 頂点に持たせた役割・縁・乱数・根元の暗さ・熱・焦げ・寸法から、次を描く（品質の定義の観点3・4・5・7）：
//   板の継ぎ目とボルト、角と板の縁の塗装はげ（地金がのぞく）、板の上端と通気口から垂れる汚れ、継ぎ目の錆、
//   窓（灯りは一部だけ）、灯り（橙・赤のまたたき・白い帯）、警告の縞、波板、通気口の格子、甲板の滑り止め、蜂の巣の芯、
//   焦げ、熱の焼け色と細い橙の割れ筋、隅・根元・奥の暗さ（建物ごとに焼いた3Dの格子）、遠くの霞
// 細かい模様は、画面の1画素が何メートルかを見て、細かすぎる所では平均の色へ溶かす（遠くでちらつかせない）。

// ---- 役割ごとの値：色（線形）と粗さ ／ 金属・継ぎ目・はげ・発光 ----
// 色は宇宙の物とそろえた落ち着いた灰。差し色は警告の縞・橙の窓と灯り・赤の灯りと印だけ
const PAL = new Array(ROLE_COUNT).fill(null).map(() => new THREE.Vector4(0.12, 0.12, 0.12, 0.7));
const PAL2 = new Array(ROLE_COUNT).fill(null).map(() => new THREE.Vector4(0, 0, 0, 0));
const set = (r, rgb, rough, metal, seam, wear, emis = 0) => { PAL[r].set(rgb[0], rgb[1], rgb[2], rough); PAL2[r].set(metal, seam, wear, emis); };
set(ROLE.PAINT, [0.1, 0.102, 0.105], 0.66, 0.12, 1, 1);
set(ROLE.PAINT2, [0.24, 0.236, 0.228], 0.6, 0.1, 1, 1.1);
set(ROLE.DARK, [0.06, 0.062, 0.065], 0.66, 0.12, 0.5, 0.6);
set(ROLE.BARE, [0.36, 0.36, 0.37], 0.42, 0.9, 0.2, 0.2);
set(ROLE.RED, [0.24, 0.025, 0.018], 0.62, 0.0, 0.6, 1.2);
set(ROLE.HAZARD, [0.55, 0.36, 0.03], 0.6, 0.0, 0.3, 1.5);
set(ROLE.FACADE, [0.13, 0.13, 0.13], 0.8, 0.0, 0.4, 0.4);
set(ROLE.GLASS, [0.02, 0.022, 0.025], 0.32, 0.25, 0, 0);
set(ROLE.LAMP, [1.0, 0.5, 0.16], 0.4, 0.0, 0, 0, 7.0);
set(ROLE.BEACON, [1.0, 0.06, 0.03], 0.4, 0.0, 0, 0, 9.0);
set(ROLE.STRIP, [0.75, 0.86, 1.0], 0.4, 0.0, 0, 0, 3.2);
set(ROLE.INNER, [0.055, 0.06, 0.055], 0.75, 0.1, 0.5, 0.5);
set(ROLE.CONCRETE, [0.15, 0.145, 0.138], 0.94, 0.0, 0.3, 0.6);
set(ROLE.CORRUGATED, [0.15, 0.15, 0.15], 0.6, 0.55, 0.3, 0.6);
set(ROLE.RUST, [0.13, 0.06, 0.03], 0.88, 0.3, 0.3, 0.3);
set(ROLE.GRILLE, [0.05, 0.05, 0.055], 0.55, 0.6, 0.3, 0.4);
set(ROLE.DECK, [0.085, 0.086, 0.088], 0.72, 0.25, 1, 0.7);
set(ROLE.HONEY, [0.3, 0.3, 0.3], 0.5, 0.8, 0, 0);
set(ROLE.CABLE, [0.02, 0.02, 0.02], 0.7, 0.0, 0, 0);
set(ROLE.GROUND, [0.06, 0.058, 0.055], 0.95, 0.0, 0, 0);
// 格納の口の奥：ほのかに暖かく光る面（下ほど明るい。汚れの素材でむらを付ける）
set(ROLE.GLOW, [0.9, 0.48, 0.16], 0.8, 0.0, 0, 0, 0.07);

// ---- 共有の値（場面ごとに書き換える） ----
export const STRUCT_U = {
  hazeColor: uniform(new THREE.Color(0.012, 0.014, 0.024)),
  hazeNear: uniform(600), hazeFar: uniform(9000), hazeMax: uniform(0.8),
  wear: uniform(1.0), dirt: uniform(1.0), rust: uniform(1.0), lightK: uniform(1.0), heatK: uniform(1.0), aoK: uniform(1.0),
  litWindows: uniform(0.32), tint: uniform(new THREE.Color(1, 1, 1)),
  // 外壁・甲板の面の素材の強さ（0＝計算の模様だけ）
  panelTex: uniform(1.0),
  // 確認用：1=雑音 2=隅の暗さ 3=焦げと熱 4=継ぎ目とはげ 5=uv 6=汚れの素材
  debug: uniform(0),
  // 破片の回転の時刻と、漂う距離の倍率（宇宙：毎コマ進める。地上：0 のまま）
  debrisT: uniform(0), debrisDrift: uniform(0),
  // 1m が画面で何画素か（距離 1m のとき）。画面の高さ ÷ (2 tan(視野角/2))。破片が1画素より小さくなったら消すのに使う
  pxScale: uniform(1000),
};
const uPal = uniformArray(PAL, 'vec4');
const uPal2 = uniformArray(PAL2, 'vec4');

// ---- 3次元の雑音の画像（64³、繰り返しても継ぎ目なし）。R=粗い G=中 B=細かい A=升ごとの乱数 ----
let noiseTex = null;
function structNoise() {
  if (noiseTex) return noiseTex;
  const N = 64;
  let seed = 90917;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // 勾配の雑音（Perlin 風）。値の雑音は格子のマス目が出て、甲板などの広い面で繰り返しの模様に見えたため
  const octave = (G) => {
    const grad = new Float32Array(G * G * G * 3);
    for (let i = 0; i < G * G * G; i++) { const z = rnd() * 2 - 1; const t = rnd() * Math.PI * 2; const c = Math.sqrt(1 - z * z); grad[i * 3] = c * Math.cos(t); grad[i * 3 + 1] = z; grad[i * 3 + 2] = c * Math.sin(t); }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const out = new Float32Array(N * N * N);
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / N * G; const fy = y / N * G; const fz = z / N * G;
      const ix = Math.floor(fx); const iy = Math.floor(fy); const iz = Math.floor(fz);
      const tx = fx - ix; const ty = fy - iy; const tz = fz - iz;
      let v = 0;
      for (let cz = 0; cz < 2; cz++) for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
        const gi = (((ix + cx) % G) + ((iy + cy) % G) * G + ((iz + cz) % G) * G * G) * 3;
        const dx = tx - cx; const dy = ty - cy; const dz = tz - cz;
        const w = (cx ? fade(tx) : 1 - fade(tx)) * (cy ? fade(ty) : 1 - fade(ty)) * (cz ? fade(tz) : 1 - fade(tz));
        v += w * (grad[gi] * dx + grad[gi + 1] * dy + grad[gi + 2] * dz);
      }
      out[x + y * N + z * N * N] = Math.min(1, Math.max(0, v * 1.4 + 0.5));
    }
    return out;
  };
  const a = octave(4); const b = octave(8); const c = octave(16);
  const data = new Uint8Array(N * N * N * 4);
  for (let i = 0; i < N * N * N; i++) {
    data[i * 4] = Math.round(a[i] * 255); data[i * 4 + 1] = Math.round(b[i] * 255); data[i * 4 + 2] = Math.round(c[i] * 255); data[i * 4 + 3] = Math.round(rnd() * 255);
  }
  noiseTex = new THREE.Data3DTexture(data, N, N, N);
  noiseTex.format = THREE.RGBAFormat; noiseTex.type = THREE.UnsignedByteType;
  noiseTex.wrapS = noiseTex.wrapT = noiseTex.wrapR = THREE.RepeatWrapping;
  noiseTex.minFilter = THREE.LinearFilter; noiseTex.magFilter = THREE.LinearFilter;
  noiseTex.unpackAlignment = 1; noiseTex.needsUpdate = true;
  return noiseTex;
}

// 使い古した塗装の汚れの素材（画像生成の写真風の素材を、継ぎ目なしの繰り返し画像にした物。assets/structures/grunge_steel.png）。
// 傷・塗装のはげ・垂れた汚れの形が計算の雑音より本物らしいので、塗装の面に重ねる（小さく試して決めた）
let grungeTex = null;
function grunge() {
  if (grungeTex) return grungeTex;
  grungeTex = new THREE.TextureLoader().load(new URL('../../assets/structures/grunge_steel.png', import.meta.url).href);
  grungeTex.wrapS = grungeTex.wrapT = THREE.RepeatWrapping;
  grungeTex.colorSpace = THREE.NoColorSpace;
  grungeTex.anisotropy = 4;
  return grungeTex;
}

// 外壁と甲板の面の素材（画像生成で作った、パネル・ハッチ・通気口・配線・汚れの描き込まれた写真風の素材）。
// 中くらい・遠くの距離で、面を細かく割らなくても目標の絵のような描き込みの密度を出す（assets/structures/hull_panels.png・deck_plates.png）
const surfTex = {};
function surface(name) {
  if (surfTex[name]) return surfTex[name];
  const t = new THREE.TextureLoader().load(new URL(`../../assets/structures/${name}.png`, import.meta.url).href);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  surfTex[name] = t;
  return t;
}

// 高さ h の画面上の傾きで法線を傾ける（視点の座標）
function bumpN(n, h, amt) {
  const sx = positionView.dFdx(); const sy = positionView.dFdy();
  const r1 = cross(sy, n); const r2 = cross(n, sx);
  const det = dot(sx, r1);
  const grad = sign(det).mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  const b = abs(det).mul(n).sub(grad.mul(amt));
  const L2 = dot(b, b);
  return select(L2.greaterThan(1e-24), b.div(max(L2, 1e-24).sqrt()), n);
}

// 隅の暗さの格子（建物ごと）を3次元の画像にする
export function aoTexture(ao) {
  const [nx, ny, nz] = ao.dims;
  const t = new THREE.Data3DTexture(ao.data, nx, ny, nz);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = THREE.ClampToEdgeWrapping;
  t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
}

// 材質を作る。ao：{ tex, origin, size, cell }（無ければ隅の暗さは頂点の値だけ）。debris：破片（インスタンス）用
// worldSpace：模様の座標を世界の座標で取る（InstancedMesh で描く小物・まとめた形用。物の局所の座標だと、同じ形の写しが全部同じ模様になる）
export function createStructureMaterial({ ao = null, debris = false, worldSpace = false } = {}) {
  const U = STRUCT_U;
  const NT = structNoise();
  const m = new THREE.MeshStandardNodeMaterial({ fog: true });
  const aMat = attribute('aMat', 'vec4');
  const aExt = attribute('aExt', 'vec4');
  // 小物（InstancedMesh）は写しごとに乱数をずらす（ずらさないと、同じ種類の写しが全部同じ汚れ・同じ灯りの点滅になる）
  const instR = worldSpace ? fract(sin(float(instanceIndex).mul(12.9898).add(0.31)).mul(43758.5453)).toVarying('vSInst') : null;
  const vUv = worldSpace ? uv().add(vec2(instR.mul(17.3), instR.mul(7.9))).toVarying('vSUv') : uv().toVarying('vSUv');
  const vMat = aMat.toVarying('vSMat');
  const vExt = aExt.toVarying('vSExt');
  // 破片：1つの形に全部の破片をまとめ、破片ごとの中心のまわりの回転と漂いを頂点で計算する（描画は1回）
  let posG = positionGeometry; let norG = normalGeometry; let viewN = normalView;
  if (debris) {
    const aCen4 = attribute('aCen', 'vec4'); const aSpin = attribute('aSpin', 'vec4'); const aVel = attribute('aVel', 'vec3');
    const aCen = aCen4.xyz;
    const k = aSpin.xyz; const ang = aSpin.w.mul(U.debrisT);
    const c = cos(ang); const sn = sin(ang);
    const rot = (v) => v.mul(c).add(cross(k, v).mul(sn)).add(k.mul(dot(k, v)).mul(float(1).sub(c)));
    const cen = aCen.add(aVel.mul(U.debrisDrift));
    // 画面で1画素に満たない破片は縮めて消す（遠くで砂のようにちらつかせない）
    const camD = max(length(modelWorldMatrix.mul(vec4(cen, 1.0)).xyz.sub(cameraPosition)), 1.0);
    const px = aCen4.w.mul(U.pxScale).div(camD);
    const keep = smoothstep(0.7, 1.8, px);
    posG = cen.add(rot(positionGeometry).mul(keep));
    norG = rot(normalGeometry);
    m.positionNode = posG;
    viewN = transformNormalToView(norG);
  }
  const vP = worldSpace ? positionWorld.toVarying('vSP') : posG.toVarying('vSP');
  const vN = worldSpace ? normalWorld.toVarying('vSN') : norG.toVarying('vSN');
  const nz = (p) => texture3D(NT, p).level(0);
  const aoU = ao ? { origin: uniform(new THREE.Vector3(...ao.origin)), size: uniform(new THREE.Vector3(...ao.size)), cell: uniform(ao.cell) } : null;

  const smoothstepR1 = (e0, e1, x) => float(1).sub(smoothstep(e0, e1, x));
  // ---- 1画素ぶんの計算（色・粗さ・金属・発光・高さ・隅の暗さ）。値は上から順に重ねる ----
  const roleI = int(vMat.x.add(0.5));
  const pal = uPal.element(roleI); const pal2 = uPal2.element(roleI);
  // aMat.w の整数部＝根元の暗さの段（0・1・2）。0.5 と 1.5 で分ける。city.js は小数部 0.02〜0.38 に焼いた隅の暗さを詰めて使う
  // （判定を整数部の境目から動かすと、地上の街の隅の暗さと根元の暗さが壊れる）
  const edge = vMat.y; const rnd = instR ? fract(vMat.z.add(instR)) : vMat.z; const baseK = vMat.w;
  const heat = vExt.x; const soot = vExt.y; const p1 = vExt.z; const p2 = vExt.w;
  const N0 = normalize(vN).toVar();
  const vert = float(1.0).sub(abs(N0.y)).toVar(); // 縦の面ほど 1
  const fw = max(length(fwidth(vUv)), 1e-4).toVar(); // 1画素が何メートルか
  const isRole = (r) => float(1.0).sub(step(0.5, abs(vMat.x.sub(r))));

  // 部品ごとの色のばらつき（明るさと、わずかな暖色・寒色）と、大きな濃淡
  const n1 = nz(vP.mul(0.011)).toVar(); const n2 = nz(vP.mul(0.07)).toVar();
  // 細かい雑音も2回だけ読み、汚れ・錆・焦げ・割れ筋・コンクリートで別のチャンネルを使い回す（1画素で読む回数を約16回→8回に。
  // 画素比 1.6 の画面では画素ごとの計算が重さの多くを占めるため）。x は 1枚に4山、y は8山、z は16山、w は画素ごとの乱数
  const cA = nz(vP.mul(0.9)).toVar(); const cB = nz(vP.mul(3.1)).toVar();
  const tintK = rnd.mul(0.14).add(0.93).mul(n1.x.mul(0.18).add(0.91));
  const warm = fract(rnd.mul(7.31)).sub(0.5).mul(0.06);
  let col = pal.xyz.mul(tintK).mul(vec3(warm.add(1.0), 1.0, warm.negate().add(1.0))).mul(U.tint);
  let rough = pal.w;
  let metal = pal2.x;
  let emis = vec3(0);
  let hgt = float(0);

  // ---- 板の継ぎ目とボルト（p1・p2 が板の大きさ） ----
  const hasPanel = step(0.05, p1).mul(step(0.05, p2)).mul(pal2.y).toVar();
  const pp = vec2(max(p1, 0.05), max(p2, 0.05)).toVar();
  const fq = fract(vUv.div(pp)).toVar();
  const dU = min(fq.x, float(1).sub(fq.x)).mul(pp.x).toVar(); const dV = min(fq.y, float(1).sub(fq.y)).mul(pp.y).toVar();
  const dEdge = min(dU, dV).toVar();
  const seamW = float(0.022);
  const seamCov = min(1.0, seamW.mul(2.5).div(fw)); // 遠くで細い線が消えすぎないよう、覆う割合で薄める
  const seam = float(1).sub(smoothstep(seamW, seamW.add(fw.mul(1.5)), dEdge)).mul(seamCov).mul(hasPanel).toVar();
  // ボルト：板の縁から 0.14m 内側に 0.45m 間隔
  const sp = float(0.45);
  const rowV = abs(dV.sub(0.14)); const rowU = abs(dU.sub(0.14));
  const along = vec2(fract(vUv.x.div(sp)).sub(0.5).mul(sp), fract(vUv.y.div(sp)).sub(0.5).mul(sp));
  const dB = min(length(vec2(along.x, rowV)), length(vec2(along.y, rowU))).sub(0.032);
  const bolt = float(1).sub(smoothstep(0.0, fw.mul(1.2), dB)).mul(smoothstepR1(0.012, 0.04, fw)).mul(step(1.1, min(p1, p2))).mul(hasPanel).toVar();
  const cellR = fract(sin(dot(floor(vUv.div(pp)).add(vec2(rnd.mul(17.0), rnd.mul(29.0))), vec2(41.3, 289.1))).mul(31415.9));
  const procK = float(1).sub(isRole(ROLE.PAINT).add(isRole(ROLE.PAINT2)).add(isRole(ROLE.DECK)).mul(U.panelTex).mul(0.6));
  // 縦の面は強め、上の面（甲板・屋根）は控えめ
  const cellAA = smoothstepR1(0.08, 0.35, fw.div(min(pp.x, pp.y)));
  col = col.mul(mix(float(1), cellR.mul(mix(0.12, 0.24, vert)).add(mix(0.94, 0.88, vert)), hasPanel.min(1.0).mul(procK).mul(cellAA)));
  col = col.mul(float(1).sub(seam.mul(0.55).mul(procK))).mul(bolt.mul(0.25).mul(procK).add(1.0));
  hgt = hgt.add(seam.mul(-0.6)).add(bolt.mul(0.5));

  // ---- 外壁・甲板の面の素材（縦の面は外壁、上の面は甲板。部品ごとにずらして繰り返しを隠す） ----
  const paintRole = isRole(ROLE.PAINT).add(isRole(ROLE.PAINT2)).add(isRole(ROLE.DECK)).toVar();
  const off = vec2(rnd.mul(5.3), fract(rnd.mul(3.7)).mul(4.1));
  // 大きな建物ほど素材を大きく貼る（小さな石の積み重ねに見えないように）。人の大きさの手がかりは扉・手すり・灯りが受け持つ
  const tScale = aoU ? clamp(aoU.cell.div(1.25), 1.0, 2.6) : float(1.0);
  const uvH = vUv.div(tScale.mul(9.0)).add(off); const uvD = vUv.div(tScale.mul(16.0)).add(off);
  const up = smoothstep(0.6, 0.85, N0.y);
  // 素材の明るさ（細かい描き込み）と、粗い段（mip の5段目＝パネル数枚分の平均）の差だけを使う。
  // パネルごとの明暗の差をそのまま使うと、遠くで明暗の四角が並んで石積みに見えるため。パネルの明暗は計算で控えめに付け直す
  const hullT = texture(surface('hull_panels'), uvH); const deckT = texture(surface('deck_plates'), uvD);
  const texC0 = mix(hullT.xyz, deckT.xyz, up);
  const texLo = mix(texture(surface('hull_panels'), uvH).level(5).xyz, texture(surface('deck_plates'), uvD).level(5).xyz, up);
  const LUM = vec3(0.2126, 0.7152, 0.0722);
  const texL = dot(texC0, LUM).toVar();
  const texLL = dot(texLo, LUM).toVar();
  // 細部の比（1＝平均と同じ）。継ぎ目・ボルト・通気口・ハッチの縁が残り、パネルの明暗は消える
  const detR = clamp(texL.div(max(texLL, 0.02)), 0.0, 2.5).toVar();
  // 色の差（錆の茶色）は少しだけ残す
  const hue = texC0.div(max(texL, 0.01)).sub(vec3(1.0)).mul(0.2).add(vec3(1.0));
  const baseL = dot(pal.xyz, LUM);
  const texK = paintRole.mul(U.panelTex).toVar();
  // 遠くでは細部の明暗を弱める（細かい明暗が斑点になって石やアスファルトに見えるため）
  const farK = smoothstepR1(0.04, 0.3, fw.div(tScale)).toVar();
  const detail = detR.sub(1.0).mul(mix(0.35, 0.9, farK)).add(1.0);
  col = mix(col, col.mul(detail).mul(hue), texK);
  hgt = hgt.add(detR.sub(1.0).mul(0.7).mul(texK).mul(smoothstepR1(0.03, 0.15, fw)));
  // 塗装の鋼板のつや：素材の明るい所（擦れた所）ほど少し滑らか。下限は高め（照り返しが箔のように散らないように）
  rough = mix(rough, clamp(rough.sub(0.06).sub(detR.sub(1.0).mul(0.1)), 0.5, 1.0), texK);

  // ---- 汚れの素材（2つの大きさで重ね、向きを変えて繰り返しを隠す） ----
  const GT = grunge();
  const gA = texture(GT, vUv.mul(0.43).add(vec2(rnd.mul(3.7), rnd.mul(1.9)))).x;
  // 地上の建物の壁（コンクリート・窓の壁）は向きを変えずに大きく貼る（横向きの汚れの筋が縦の細い縞になり、木の板に見えるため）
  const concW = isRole(ROLE.CONCRETE).add(isRole(ROLE.FACADE)).min(1.0).toVar();
  const gB = texture(GT, mix(vec2(vUv.y.mul(0.17).add(rnd), vUv.x.mul(-0.17)), vec2(vUv.x.mul(0.07).add(rnd), vUv.y.mul(0.09)), concW)).x;
  const gr0 = gA.mul(0.62).add(gB.mul(0.38)).toVar();
  const paintK = pal2.y.min(1.0).mul(float(1).sub(isRole(ROLE.GLASS)));
  // 暗い所は汚れ、明るい所ははげ（地金）。継ぎ目のある塗装の面ほど強く
  col = col.mul(mix(float(1), gr0.sub(0.5).mul(mix(0.25, 1.1, smoothstepR1(0.03, 0.25, fw))).add(1.0), paintK.mul(U.dirt).mul(0.85).add(0.15)));
  rough = rough.add(float(0.5).sub(gr0).mul(0.25).mul(paintK));
  const gChip = smoothstep(0.7, 0.86, gr0).mul(paintK).mul(U.wear);

  // ---- 塗装はげ：面取りの面と板の縁の近く。細かすぎる距離では、縁がわずかに明るい平均へ ----
  const chipN = cA.z.mul(0.55).add(cB.z.mul(0.45));
  const nearEdge = max(edge, float(1).sub(smoothstep(0.03, 0.16, dEdge)).mul(hasPanel).mul(procK));
  const wearAmt = nearEdge.mul(pal2.z).mul(U.wear).mul(0.85).add(pal2.z.mul(U.wear).mul(0.06)).toVar();
  const chipDetail = smoothstepR1(0.01, 0.05, fw);
  const chip = max(mix(wearAmt.mul(0.5), smoothstep(float(1).sub(wearAmt), float(1.05).sub(wearAmt), chipN), chipDetail), gChip.mul(0.8)).toVar();
  const bare = vec3(0.5, 0.5, 0.5).mul(n2.y.mul(0.3).add(0.85));
  col = mix(col, bare, chip);
  metal = mix(metal, 0.85, chip);
  rough = mix(rough, 0.5, chip);
  hgt = hgt.add(chip.mul(-0.15));

  // ---- 汚れ：板の上端と通気口から下へ垂れる筋（縦の面）、上の面は埃のむら ----
  const topDist = select(hasPanel.greaterThan(0.0), float(1).sub(fq.y).mul(pp.y), float(3.0));
  // 筋の幅 約1m・長さ 約7m（雑音の y は 1枚に 8山。横を細かくしすぎると 0.2m 幅の細い縦縞になり、木の板に見えた）
  const streakN = nz(vec3(vUv.x.mul(0.13), vP.y.mul(0.018), rnd.mul(13.0))).y;
  const streak = smoothstep(0.42, 0.78, streakN).mul(exp(topDist.negate().div(1.6)).mul(0.7).add(0.3)).toVar();
  const dustN = n1.y.mul(0.6).add(n2.y.mul(0.4));
  const dust = smoothstep(0.45, 0.8, dustN).mul(float(1).sub(vert));
  const dirtK = U.dirt.mul(float(1).sub(isRole(ROLE.GLASS))).mul(float(1).sub(pal2.w.min(1.0))).toVar();
  // 地上の建物の壁（コンクリート・窓の壁）は垂れ筋を弱める（強いと低い日差しで木の板の縦縞に見える）
  const streakK = float(0.7).sub(isRole(ROLE.CONCRETE).add(isRole(ROLE.FACADE)).min(1.0).mul(0.3));
  col = col.mul(float(1).sub(streak.mul(vert).mul(streakK).add(dust.mul(0.35)).mul(dirtK)));
  rough = mix(rough, 0.92, streak.mul(vert).mul(0.5).mul(dirtK));

  // ---- 錆：継ぎ目と縁から滲む ----
  const rustN = cA.x.mul(0.6).add(cB.x.mul(0.4));
  // 錆は継ぎ目と板の下の縁から下へ伸びる（点々を撒かない）
  const seamRust = float(1).sub(smoothstep(0.0, 0.1, dEdge)).mul(hasPanel).mul(procK);
  const rustStreak = smoothstep(0.55, 0.85, streakN).mul(exp(topDist.negate().div(0.9))).mul(vert);
  const rustM = smoothstep(0.62, 0.9, rustN.mul(0.7).add(seamRust.mul(0.45)).add(rustStreak.mul(0.5)).add(isRole(ROLE.RUST).mul(0.45))).toVar();
  const rustCol = vec3(0.16, 0.065, 0.025).mul(n2.z.mul(0.5).add(0.7));
  const rk = rustM.mul(U.rust).mul(0.9).mul(float(1).sub(isRole(ROLE.GLASS))).mul(float(1).sub(concW.mul(0.75))).toVar();
  col = mix(col, rustCol, rk.mul(pal2.y.min(1.0)).add(isRole(ROLE.RUST).mul(rustM).mul(0.6)));
  rough = mix(rough, 0.9, rk);

  // ---- 役割ごとの模様 ----
  // 警告の縞（斜め）
  const stripe = step(0.5, fract(vUv.x.add(vUv.y).div(0.7)));
  const hz = isRole(ROLE.HAZARD);
  col = mix(col, mix(col, vec3(0.025, 0.025, 0.025), stripe), hz.mul(float(1).sub(chip)));
  // 波板（u に沿う溝）
  const corr = isRole(ROLE.CORRUGATED);
  const cw = sin(vUv.x.mul(6.2832 / 0.22));
  hgt = hgt.add(cw.mul(0.5).mul(corr).mul(smoothstepR1(0.02, 0.08, fw)));
  col = col.mul(float(1).sub(corr.mul(cw.mul(0.08))));
  // 通気口の格子（v に沿う羽根）
  const gr = isRole(ROLE.GRILLE);
  const slat = fract(vUv.y.div(0.11));
  const slatM = smoothstep(0.35, 0.5, slat).mul(smoothstepR1(0.85, 1.0, slat));
  col = col.mul(mix(float(1), mix(0.25, 1.0, slatM), gr.mul(smoothstepR1(0.02, 0.06, fw))));
  hgt = hgt.add(slatM.mul(gr).mul(0.6).mul(smoothstepR1(0.015, 0.05, fw)));
  // 甲板の滑り止め（小さな菱形の凸）
  const dk = isRole(ROLE.DECK);
  const dia = abs(fract(vUv.x.mul(4.0).add(vUv.y.mul(4.0))).sub(0.5)).add(abs(fract(vUv.x.mul(4.0).sub(vUv.y.mul(4.0))).sub(0.5)));
  hgt = hgt.add(smoothstep(0.55, 0.75, dia).mul(dk).mul(0.25).mul(smoothstepR1(0.01, 0.04, fw)));
  // 蜂の巣の芯（切り口の床の縁）
  const hn = isRole(ROLE.HONEY);
  const hx = vec2(vUv.x.mul(14.0), vUv.y.mul(14.0).mul(1.1547));
  const hc = abs(fract(hx.x.add(floor(hx.y).mul(0.5))).sub(0.5)).add(abs(fract(hx.y).sub(0.5)).mul(0.6));
  col = col.mul(mix(float(1), smoothstep(0.18, 0.3, hc).mul(0.8).add(0.2), hn.mul(smoothstepR1(0.006, 0.03, fw))));
  // コンクリートのむらと染み
  const cc = isRole(ROLE.CONCRETE).add(isRole(ROLE.GROUND));
  col = col.mul(mix(float(1), n2.z.mul(0.35).add(0.8).mul(cA.y.mul(0.3).add(0.85)), cc));

  // ---- 窓（壁の窓の格子 FACADE と、ガラスの帯 GLASS） ----
  const fac = isRole(ROLE.FACADE); const gl = isRole(ROLE.GLASS);
  const wq = vUv.div(pp); const wc = floor(wq); const wf = fract(wq).toVar();
  const aaW = fw.div(min(pp.x, pp.y)).mul(1.5);
  const box1 = (x, a0, a1) => smoothstep(a0.sub(aaW), a0.add(aaW), x).mul(smoothstepR1(a1.sub(aaW), a1.add(aaW), x));
  const winX = mix(box1(wf.x, float(0.03), float(0.97)), box1(wf.x, float(0.16), float(0.84)), fac);
  const winY = mix(box1(wf.y, float(0.08), float(0.92)), box1(wf.y, float(0.28), float(0.82)), fac);
  const winAA = smoothstepR1(0.05, 0.25, fw.div(min(pp.x, pp.y)));
  const win = mix(fac.mul(0.36).add(gl.mul(0.85)), winX.mul(winY).mul(fac.add(gl)), winAA).toVar();
  const cellH = fract(sin(dot(wc.add(vec2(rnd.mul(37.0), rnd.mul(11.0))), vec2(12.9898, 78.233))).mul(43758.5453)).toVar();
  // ガラスの帯（管制室など）は灯りを少なめに（市松模様に見えないように）
  const litK = U.litWindows.mul(gl.mul(-0.55).add(1.0));
  const lit = mix(litK.mul(0.8), step(cellH, litK), winAA).mul(float(1).sub(smoothstep(0.05, 0.3, soot)));
  const cool = step(0.86, fract(cellH.mul(7.7)));
  const winCol = mix(vec3(1.0, 0.58, 0.26), vec3(0.62, 0.74, 1.0), cool).mul(fract(cellH.mul(3.3)).mul(0.9).add(0.5));
  // 窓の奥：灯りのない窓は暗いガラス（空が映る）、灯りのある窓は高さで明るさのむら
  col = mix(col, vec3(0.012, 0.014, 0.018), win);
  // 窓のつやは、窓が数画素になる距離から粗くする（浅い角度で空を映した窓が、中くらいの距離で青と黄のモザイクに見えるため）
  rough = mix(rough, mix(float(0.75), float(0.3), winAA), win);
  metal = mix(metal, 0.2, win);
  emis = emis.add(winCol.mul(win).mul(lit).mul(mix(float(1.6), float(0.9), gl)).mul(U.lightK).mul(wf.y.mul(0.5).add(0.6)));

  // ---- 灯り ----
  const lampK = pal2.w;
  const isBeacon = isRole(ROLE.BEACON);
  const ph = fract(time.mul(0.45).add(rnd));
  const blink = mix(float(1), smoothstep(0.0, 0.08, ph).mul(smoothstepR1(0.3, 0.55, ph)).mul(0.95).add(0.05), isBeacon);
  // base=2 の灯りは不規則にまたたく
  const flickN = texture3D(NT, vec3(time.mul(1.7), rnd.mul(5.0), 0.5)).level(0).w;
  const flick = select(baseK.greaterThan(1.5), step(0.45, flickN).mul(0.8).add(0.08), float(1));
  const isGlow = isRole(ROLE.GLOW);
  // 光る奥の面の地の色は暗く（日が当たって明るい板に見えないように）
  col = mix(col, vec3(0.02, 0.018, 0.016), isGlow);
  const glowK = mix(float(1), gr0.mul(0.8).add(0.6).mul(smoothstepR1(0.0, 8.0, vUv.y).mul(0.7).add(0.3)), isGlow);
  emis = emis.add(pal.xyz.mul(lampK).mul(blink).mul(flick).mul(glowK).mul(U.lightK));

  // ---- 焦げと熱 ----
  // 焦げは大きなむら（煙が流れた跡）と、縦に垂れる筋
  const sootN = n2.x.mul(0.55).add(n2.z.mul(0.3)).add(streakN.mul(0.15));
  const sootM = smoothstep(0.0, 0.55, soot.mul(1.4).sub(sootN.mul(0.6)).add(0.05)).mul(float(1).sub(lampK.min(1.0))).toVar();
  col = col.mul(float(1).sub(sootM.mul(0.75)));
  rough = mix(rough, 0.96, sootM);
  metal = mix(metal, 0.0, sootM.mul(0.8));
  // 焼け色（熱が中くらいの所の金属に、麦わら→銅→青の帯）
  const hK = heat.mul(U.heatK).toVar();
  const temper = mix(mix(vec3(0.42, 0.33, 0.14), vec3(0.3, 0.14, 0.12), smoothstep(0.25, 0.45, hK)), vec3(0.08, 0.12, 0.3), smoothstep(0.45, 0.7, hK));
  const tempM = smoothstep(0.15, 0.35, hK).mul(smoothstepR1(0.8, 1.0, hK)).mul(0.35).mul(metal.add(0.3).min(1.0));
  col = mix(col, temper.mul(n2.y.mul(0.4).add(0.8)), tempM);
  // 細い橙の割れ筋（熱いほど広く、白っぽく）
  const crackN = abs(cA.y.sub(0.5)).add(abs(cB.y.sub(0.5)).mul(0.5));
  const crack = float(1).sub(smoothstep(0.0, hK.mul(0.12).add(0.015), crackN));
  // 熱い所（切り口の縁）だけ光る。広い面は光らせない
  const ember = pow(clamp(hK.sub(0.35).div(0.65), 0.0, 1.0), 2.0);
  // 面全体を光らせず、細い筋だけ（筋の外はごく弱い赤み）
  emis = emis.add(mix(vec3(1.0, 0.22, 0.03), vec3(1.0, 0.55, 0.2), smoothstep(0.85, 1.0, hK)).mul(ember).mul(crack.mul(0.95).add(0.05)).mul(3.0));

  // ---- 隅の暗さ ----
  let occl = float(1);
  if (aoU) {
    const at = (off) => texture3D(ao.tex, vP.add(N0.mul(aoU.cell.mul(off))).sub(aoU.origin).div(aoU.size)).level(0);
    // 平らな開けた壁でも、そばの升には壁そのものが入る（狭い範囲で約0.33、広い範囲で約0.15）。それを超えた分だけ暗くする
    const nearO = at(1.6).x; const wideO = at(4.0).y;
    const oN = clamp(nearO.sub(0.34).div(0.45), 0.0, 1.0); const oW = clamp(wideO.sub(0.16).div(0.4), 0.0, 1.0);
    occl = clamp(float(1).sub(oN.mul(0.55)).sub(oW.mul(0.5)), 0.12, 1.0);
  }
  // 根元の暗さ（地面や甲板に立つ部品の下ほど暗い。縦の面の uv の v は面の下からの高さ）
  const contact = mix(float(0.42), float(1), smoothstep(0.0, 3.0, vUv.y)).mul(vert).add(float(1).sub(vert));
  occl = occl.mul(select(baseK.greaterThan(0.5).and(baseK.lessThan(1.5)), contact, float(1)));
  occl = occl.mul(float(1).sub(seam.mul(0.35).mul(procK)));
  occl = mix(float(1), occl, U.aoK);

  const dbg = U.debug;
  const dsel = (k) => float(1).sub(step(0.5, abs(dbg.sub(k))));
  const dcol = n2.xyz.mul(dsel(1)).add(vec3(occl).mul(dsel(2))).add(vec3(soot, heat, 0).mul(dsel(3))).add(vec3(seam, chip, bolt).mul(dsel(4))).add(vec3(fract(vUv.x), fract(vUv.y), 0).mul(dsel(5))).add(vec3(gr0).mul(dsel(6)));
  m.colorNode = vec4(mix(col, dcol, step(0.5, dbg)), 1.0);
  m.roughnessNode = clamp(rough, 0.05, 1.0);
  m.metalnessNode = clamp(metal, 0.0, 1.0);
  m.emissiveNode = emis;
  m.aoNode = occl;
  m.normalNode = bumpN(debris ? normalize(viewN.toVarying('vSViewN')) : normalView, hgt.mul(0.012), 1.0);
  // 遠くの霞（宇宙の物と同じ考え：遠いほど空の色へ溶ける）
  const dist = length(positionWorld.sub(cameraPosition));
  const hazeK = clamp(dist.sub(U.hazeNear).div(max(U.hazeFar.sub(U.hazeNear), 1.0)), 0.0, 1.0).mul(U.hazeMax);
  m.outputNode = vec4(mix(output.rgb, U.hazeColor, hazeK), output.a);
  m.userData.ao = aoU;
  return m;
}
