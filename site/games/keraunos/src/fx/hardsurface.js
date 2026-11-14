import * as THREE from 'three';
import {
  Fn, uniform, vec2, vec3, vec4, float, floor, fract, abs, max, min, mix, smoothstep, step, clamp, pow, dot, length, normalize, sign, cross, select,
  fwidth, positionGeometry, normalGeometry, positionView, positionViewDirection, normalView, normalViewGeometry, modelWorldMatrix, output, texture, uv,
  materialColor, materialRoughness, materialMetalness, materialNormal, materialEmissive, diffuseColor,
} from 'three/tsl';
import { applySurface, regionLightK, breakLitPaint, recolorPaint, SURF_ON } from './surface.js';

// 縁の光の色（区間の縁の光の色に合わせて main.js が毎区間書き換える。星雲の中は橙、地球のそばは青）
export const HS_RIM = uniform(new THREE.Color(0.32, 0.45, 0.75));

// 敵と基地の材質を、自機と同じ水準の金属・塗装に作り直す。
// - 色の画像がある部品（Tripo）：画像の明るさから細かな凹凸を起こし、明るさと色から粗さ・金属度を決める
// - 色だけの部品（組み立てた敵の胴・砲・枠）：部品の座標で継ぎ目の線・汚れ・角の擦れを描く
// - どちらも、輪郭に弱い縁の光を足して、暗い宇宙でも形が読めるようにする
// 当たった時の赤白い光（uHit）と、基地の橙の灯り・遠くを空の色へ溶かす処理（opts.base）もここで足す。
// WebGPU 版：標準の材質の node 版に、色・粗さ・金属度・法線・発光を node で書く。最後に足す光（縁・当たり・灯り）は
// 霧の後に足していた今の版に合わせて outputNode で足す（output が霧まで済んだ色）。包む側は前の outputNode を包む。

// 外から { value } を書き換える今の書き方のまま、TSL の uniform として読む（同じ物には同じ uniform を返す）
const bridged = new WeakMap();
export function uniformOf(u, fallback = 0) {
  if (u == null) return uniform(fallback);
  if (u.isNode) return u;
  if (!bridged.has(u)) bridged.set(u, uniform(u.value).onRenderUpdate(() => u.value));
  return bridged.get(u);
}

// 雑音（引数だけで計算する純粋な関数なので、WGSL の関数にしてよい）
const hsHash = /*@__PURE__*/ Fn(([p0]) => {
  const p = fract(p0.mul(0.3183099).add(0.1)).mul(17.0);
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
}).setLayout({ name: 'hsHash', type: 'float', inputs: [{ name: 'p0', type: 'vec3' }] });

export const hsNoise = /*@__PURE__*/ Fn(([x]) => {
  const i = floor(x);
  const f0 = fract(x);
  const f = f0.mul(f0).mul(float(3.0).sub(f0.mul(2.0)));
  return mix(
    mix(mix(hsHash(i), hsHash(i.add(vec3(1, 0, 0))), f.x), mix(hsHash(i.add(vec3(0, 1, 0))), hsHash(i.add(vec3(1, 1, 0))), f.x), f.y),
    mix(mix(hsHash(i.add(vec3(0, 0, 1))), hsHash(i.add(vec3(1, 0, 1))), f.x), mix(hsHash(i.add(vec3(0, 1, 1))), hsHash(i.add(vec3(1, 1, 1))), f.x), f.y),
    f.z,
  );
}).setLayout({ name: 'hsNoise', type: 'float', inputs: [{ name: 'x', type: 'vec3' }] });

export const hsFbm = /*@__PURE__*/ Fn(([p]) => {
  return hsNoise(p).mul(0.55).add(hsNoise(p.mul(2.13)).mul(0.28)).add(hsNoise(p.mul(4.37)).mul(0.17));
}).setLayout({ name: 'hsFbm', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });

// 1方向の継ぎ目の線（0..1）。間隔を少しずつずらして、同じ格子に見えないようにする
const hsSeamLine = /*@__PURE__*/ Fn(([q, w]) => {
  const cell = floor(q);
  const jx = hsHash(vec3(cell.y, 3.1, 7.7)).mul(0.5);
  const g = abs(fract(q.add(vec2(jx, 0.0))).sub(0.5));
  const fw = fwidth(q).mul(1.2).add(1e-4);
  const e = vec2(float(0.5).sub(w));
  const l = vec2(1.0).sub(smoothstep(e.sub(fw), e.add(fw), vec2(0.5).sub(g)));
  return max(l.x, l.y.mul(0.85));
}).setLayout({ name: 'hsSeamLine', type: 'float', inputs: [{ name: 'q', type: 'vec2' }, { name: 'w', type: 'float' }] });

// 3方向の継ぎ目を、面の向きの重み W で混ぜる
const hsSeam3 = (q, w, W) => hsSeamLine(q.yz, w).mul(W.x).add(hsSeamLine(q.xz, w).mul(W.y)).add(hsSeamLine(q.xy, w).mul(W.z));

// 部品の座標と法線。root があれば、入れ子の部品を1つの座標で描く（root は基準にする物の逆行列）
function partFrame(rootU) {
  if (!rootU) return { P: positionGeometry.toVarying('vHsP'), N: normalGeometry.toVarying('vHsN') };
  const m = rootU.mul(modelWorldMatrix);
  return {
    P: m.mul(vec4(positionGeometry, 1.0)).xyz.toVarying('vHsP'),
    N: normalize(m.mul(vec4(normalGeometry, 0.0)).xyz).toVarying('vHsN'),
  };
}

// 面の向きの重み（3方向から貼る模様に使う）
const triWeights = (N, k) => {
  const w = pow(abs(normalize(N)), vec3(k));
  return w.div(w.x.add(w.y).add(w.z));
};

// 高さ h の画面上の傾きで法線を傾ける（視点の座標）。傾きが出ない所では元の法線のまま
export function bumpNormal(n, h, amt) {
  const sx = positionView.dFdx(); const sy = positionView.dFdy();
  const r1 = cross(sy, n); const r2 = cross(n, sx);
  const det = dot(sx, r1);
  const grad = sign(det).mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2)));
  const b = abs(det).mul(n).sub(grad.mul(amt));
  const L2 = dot(b, b);
  return select(L2.greaterThan(1e-24), b.div(max(L2, 1e-24).sqrt()), n);
}

// 輪郭ほど強い縁の光の重み（凹凸を付けた後の法線で見る）
const rimF = () => pow(float(1.0).sub(clamp(dot(normalView, positionViewDirection), 0.0, 1.0)), 3.0);

// 材質を名前と色で分ける
function classify(src) {
  if (src.map) return 'textured';
  const c = src.color;
  const em = src.emissive && (src.emissive.r + src.emissive.g + src.emissive.b) > 0.05;
  if (em) return 'lamp';
  const lum = (c.r + c.g + c.b) / 3;
  if (lum < 0.012) return 'hole';
  if (c.r > c.g * 3 && c.r > 0.2) return 'paint';
  if (c.r > 0.5 && c.g > 0.35 && c.b < 0.2) return 'gold';
  if (lum < 0.12) return 'dark';
  return 'metal';
}

const PRESET = {
  textured: { metalness: 0.2, roughness: 0.6, env: 1.0 },
  dark: { color: [0.06, 0.062, 0.068], metalness: 0.35, roughness: 0.62, env: 1.0 },
  metal: { metalness: 0.45, roughness: 0.5, env: 1.0 },
  paint: { metalness: 0.05, roughness: 0.52, env: 1.0 },
  gold: { metalness: 0.9, roughness: 0.42, env: 1.0 },
  lamp: { metalness: 0.0, roughness: 0.3, env: 0.3, glow: 3.2 },
  hole: { metalness: 0.0, roughness: 0.95, env: 0.0 },
};

/**
 * opts.cell   継ぎ目の間隔（部品の座標の単位）
 * opts.hit    当たった時の光の uniform（{value} か TSL の uniform）
 * opts.root   部品の座標の基準にする物の逆行列の uniform（入れ子の部品を1つの座標で描く）
 * opts.base   基地用：橙の灯りを光らせ、遠くを空の色へ溶かす
 * opts.rim    縁の光の強さ
 */
export function upgradeMaterial(src, opts = {}) {
  if (opts.pbr) return pbrMaterial(src, opts);
  const kind = classify(src);
  let pr = PRESET[kind];
  // 敵の組み立て部品：焼いた画像の部品と色と鈍さを合わせる。灯りは小さく光るだけ（レンズだけ強く）
  if (!opts.base && !src.map) {
    pr = { ...pr };
    const nm = src.name || '';
    if (kind === 'paint') { pr.color = [0.13, 0.012, 0.011]; pr.roughness = 0.68; }
    if (kind === 'gold') { pr.color = [src.color.r * 0.45, src.color.g * 0.42, src.color.b * 0.35]; pr.metalness = 0.45; pr.roughness = 0.62; }
    if (kind === 'metal') { pr.color = [src.color.r * 0.6, src.color.g * 0.6, src.color.b * 0.6]; pr.metalness = 0.3; pr.roughness = 0.62; }
    if (kind === 'lamp') { pr.glow = nm.includes('レンズ') ? 1.2 : 0.2; pr.color = [src.color.r * 0.2, src.color.g * 0.2, src.color.b * 0.2]; pr.roughness = 0.5; }
  }
  // 塗装だけ上塗りのつやを持たせる。ほかは軽い標準の材質で描く
  const Mat = pr.clearcoat ? THREE.MeshPhysicalNodeMaterial : THREE.MeshStandardNodeMaterial;
  const m = new Mat({
    name: `${src.name || 'mat'}_hs`,
    map: src.map || null,
    color: pr.color ? new THREE.Color(...pr.color) : src.color.clone(),
    metalness: pr.metalness,
    roughness: pr.roughness,
    envMapIntensity: pr.env,
    emissive: src.emissive ? src.emissive.clone() : new THREE.Color(0),
    emissiveIntensity: pr.glow || 1,
    side: src.side,
  });
  if (pr.clearcoat) { m.clearcoat = pr.clearcoat; m.clearcoatRoughness = pr.clearcoatRoughness; }
  const uHit = opts.hit ? uniformOf(opts.hit) : null;
  if (kind === 'lamp' || kind === 'hole') {
    if (uHit) m.outputNode = vec4(output.rgb.add(uHit.mul(vec3(1.6, 0.55, 0.3))), output.a);
    return m;
  }
  const uCell = uniform(opts.cell || 0.25);
  const uRim = uniform(opts.rim ?? 0.35);
  const textured = kind === 'textured';
  const { P, N } = partFrame(opts.root ? uniformOf(opts.root) : null);

  // 色：継ぎ目を暗く、汚れのむら。角は塗装が擦れて明るい金属が出る
  const W = triWeights(N, 4.0);
  const Q = P.div(uCell);
  const hsN1 = hsFbm(Q.mul(0.35));
  const hsN2 = hsNoise(Q.mul(3.1));
  const base = materialColor.rgb;
  let hsLum; let hsSeam; let col;
  if (textured) {
    hsLum = dot(base, vec3(0.299, 0.587, 0.114));
    hsSeam = float(0.0);
    col = base.mul(hsN1.mul(0.18).add(0.9));
  } else {
    hsSeam = hsSeam3(Q, 0.035, W);
    hsLum = float(0.5).sub(hsSeam.mul(0.5));
    col = base.mul(float(1.0).sub(hsSeam.mul(0.6))).mul(hsN1.mul(0.3).add(0.82));
  }
  const hsEdge = clamp(length(fwidth(normalViewGeometry)).mul(3.0).sub(0.15), 0.0, 1.0).mul(smoothstep(0.35, 0.7, hsN2));
  col = mix(col, vec3(0.42, 0.43, 0.45), hsEdge.mul(0.55));
  m.colorNode = col;

  let rough = materialRoughness;
  let metal = materialMetalness;
  if (textured) {
    // 明るい所は塗装（つや）、暗い所は粗い金属、赤い所はつやのある塗装
    const hsSat = max(col.r, max(col.g, col.b)).sub(min(col.r, min(col.g, col.b)));
    rough = mix(0.7, 0.5, smoothstep(0.1, 0.45, hsLum)).sub(smoothstep(0.15, 0.4, hsSat).mul(0.06));
    metal = mix(0.4, 0.1, smoothstep(0.12, 0.4, hsLum)).mul(float(1.0).sub(smoothstep(0.15, 0.4, hsSat)));
  }
  m.roughnessNode = clamp(rough.mul(hsN1.mul(0.3).add(0.85)).add(hsSeam.mul(0.25)).sub(hsEdge.mul(0.12)), 0.3, 1.0);
  m.metalnessNode = mix(metal, 0.9, hsEdge.mul(0.5));
  // 凹凸：画像の明るさ（Tripo）か継ぎ目（組み立て）を高さにして法線を傾ける
  m.normalNode = bumpNormal(materialNormal, textured ? hsLum.mul(0.9) : hsSeam.mul(-0.55), textured ? 0.6 : 1.0);
  // 質感の層（粒・傷・汚れ・凹み・剥げ・彩度）。基地は止まっているので世界の座標で、敵は部品の座標で描く
  if (opts.base) {
    if (SURF_ON) recolorPaint(m, m.colorNode ?? materialColor.rgb, opts.recolor);
    breakLitPaint(m, m.colorNode ?? materialColor.rgb, 12.0, 14.0);
    applySurface(m, { world: true, scale: 2.0, panel: 3.5, paint: kind !== 'metal' && kind !== 'dark' });
    if (m.emissiveNode == null && src.emissive && (src.emissive.r + src.emissive.g + src.emissive.b) > 0.05) m.emissiveNode = vec3(materialEmissive).mul(regionLightK(12.0, 1.0));
  }
  else applySurface(m, { P, N, scale: (opts.cell || 0.25) * 0.45, paint: kind === 'paint' || textured, bumpK: 0.6 });

  // 縁の光：輪郭を空の色で少し照らす。当たりの光と、基地の橙の灯り
  let add = rimF().mul(uRim).mul(HS_RIM);
  if (uHit) add = add.add(uHit.mul(vec3(1.6, 0.55, 0.3)));
  if (opts.base) {
    const c = diffuseColor.rgb;
    const glow = smoothstep(0.55, 0.85, c.r).mul(smoothstep(0.10, 0.20, c.g)).mul(float(1.0).sub(smoothstep(0.32, 0.46, c.g))).mul(float(1.0).sub(smoothstep(0.05, 0.14, c.b)));
    add = add.add(c.mul(glow).mul(2.6));
  }
  m.outputNode = vec4(output.rgb.add(add), output.a);
  return m;
}

// 焼いた画像を持つ部品：画像のとおりに描く（ゲームの中で模様を計算しない分、軽い）
// 敵（opts.base なし）はさらに部品の座標で、組み立ての継ぎ目・流れた汚れ・噴射口の側の煤・受けた傷の焦げを足す。
// 画像は材質の属性のまま持つ（clone して null にすれば、その材質だけ外れる）。
function pbrMaterial(src, opts) {
  const Pb = opts.pbr;
  const enemy = !opts.base;
  const m = new THREE.MeshStandardNodeMaterial({
    name: `${src.name || 'mat'}_pbr`,
    map: Pb.color,
    aoMap: Pb.orm,
    aoMapIntensity: 1,
    roughnessMap: Pb.orm,
    metalnessMap: Pb.orm,
    roughness: 1,
    metalness: 1,
    normalMap: Pb.normal,
    normalScale: new THREE.Vector2(1, -1),
    emissiveMap: Pb.emissive || null,
    emissive: new THREE.Color(Pb.emissive ? 0xffffff : 0x000000),
    emissiveIntensity: enemy ? 4.0 : 3.0,
    envMapIntensity: opts.env ?? 1.0,
    side: src.side,
  });
  const rim = opts.rim ?? 0.3;
  const uHit = opts.hit ? uniformOf(opts.hit) : null;
  if (enemy) {
    const uCell = uniform(opts.cell || 0.25);
    const uBurn = uniformOf(opts.burn);
    const { P, N } = partFrame(opts.root ? uniformOf(opts.root) : null);
    const W = triWeights(N, 4.0);
    // 左右対称の継ぎ目（組み立ての板の境）
    const S = vec3(abs(P.x), P.y, P.z).div(uCell.mul(1.8));
    const hsSeam = hsSeam3(S, 0.014, W);
    const hsBig = hsFbm(P.div(uCell).mul(0.3));
    // 前後に長く伸びた汚れの筋
    const hsSt = hsFbm(vec3(P.x.mul(3.0), P.y.mul(3.0), P.z.mul(0.25)).div(uCell));
    const hsBn = float(1.0).sub(uBurn.mul(0.75));
    const hsB = hsFbm(P.div(uCell).mul(0.8).add(11.0));
    const burnOn = step(0.001, uBurn);
    const hsChar = smoothstep(hsBn, hsBn.add(0.07), hsB).mul(burnOn);
    m.colorNode = materialColor.rgb.mul(float(1.0).sub(hsSeam.mul(0.38))).mul(hsBig.mul(0.2).add(0.9))
      .mul(float(1.0).sub(smoothstep(0.5, 0.74, hsSt).mul(0.2))).mul(float(1.0).sub(hsChar.mul(0.88)));
    m.roughnessNode = clamp(materialRoughness.mul(hsBig.mul(0.2).add(0.92)).add(hsSeam.mul(0.2)).add(hsChar.mul(0.3)), 0.42, 1.0);
    // 焦げの縁の一部だけ、熾火のように赤く残る
    const ember = smoothstep(hsBn.sub(0.008), hsBn.add(0.004), hsB).sub(smoothstep(hsBn.add(0.004), hsBn.add(0.016), hsB));
    m.emissiveNode = vec3(materialEmissive).add(vec3(0.55, 0.09, 0.01).mul(ember).mul(smoothstep(0.55, 0.68, hsBig)).mul(burnOn));
  }
  // 質感の層（粒・傷・板・汚れ・凹み・剥げ・彩度）。基地は止まっているので世界の座標で、敵は動くので部品の座標で描く
  if (enemy) applySurface(m, { scale: (opts.cell || 0.25) * 0.45, ao: texture(Pb.orm, uv()).r, paint: true, bumpK: 0.6 });
  else {
    if (SURF_ON) recolorPaint(m, materialColor.rgb, opts.recolor);
    breakLitPaint(m, materialColor.rgb, 12.0, 14.0);
    applySurface(m, { world: true, scale: 2.0, panel: 3.5, ao: texture(Pb.orm, uv()).r, paint: true });
    // 基地の灯りの板：場所ごとに消灯・減光・明滅を分ける
    if (Pb.emissive) m.emissiveNode = vec3(materialEmissive).mul(regionLightK(12.0, 1.0));
    // 横向きの面（上下の面は除く）に、板の中の小さな窓。1割弱だけ灯る（暖色と白）。目標の絵の「生きている灯り」
    const wcell = float(opts.cell || 3).mul(0.5);
    const hsW0 = pow(abs(normalize(normalGeometry)), vec3(4.0));
    const hsW = hsW0.div(hsW0.x.add(hsW0.y).add(hsW0.z));
    const wq = positionGeometry.div(wcell);
    const side = float(1.0).sub(smoothstep(0.45, 0.6, hsW.y));
    const wuv = select(hsW.x.greaterThan(hsW.z), wq.zy, wq.xy);
    const wc = floor(wuv); const wf = fract(wuv);
    const win = step(0.22, wf.x).mul(step(wf.x, 0.78)).mul(step(0.4, wf.y)).mul(step(wf.y, 0.62)).mul(side);
    const wh = hsHash(vec3(wc, floor(positionGeometry.y.div(wcell.mul(2.0))).add(5.3)));
    const wcol = select(wh.greaterThan(0.97), vec3(0.75, 0.85, 1.0), vec3(1.0, 0.72, 0.42));
    m.emissiveNode = (m.emissiveNode || vec3(materialEmissive)).add(wcol.mul(win).mul(step(0.92, wh)).mul(1.8));
  }
  // 縁の光と当たりの光（基地は縁の光も当たりも無いので、何も足さない）
  if (enemy || rim > 0 || uHit) {
    const hsF = rimF();
    let add = hsF.mul(uniform(rim)).mul(HS_RIM);
    if (uHit) add = add.add(enemy ? uHit.mul(vec3(0.9, 0.28, 0.07)).mul(hsF.mul(1.3).add(0.22)) : uHit.mul(vec3(1.6, 0.55, 0.3)));
    m.outputNode = vec4(output.rgb.add(add), output.a);
  }
  return m;
}
