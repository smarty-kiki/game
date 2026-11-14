import * as THREE from 'three';
import {
  uniform, texture, uv, vec3, float, abs, pow, normalize, dot, clamp, mix, smoothstep, max, sign, cross, inverseSqrt, select,
  positionGeometry, normalGeometry, positionView, materialColor, materialRoughness, materialMetalness, materialNormal, materialClearcoat,
} from 'three/tsl';

const KINDS = ['color', 'orm', 'normal', 'emissive', 'mask', 'wear'];

// 機体の画像は src/airframes.js の base に _color.jpg などを付けた名前で置く（tools/make_airframe_maps.py が作る）
export function loadAirframeMaps(loader, frame) {
  const out = {};
  const jobs = KINDS.map((kind) => new Promise((resolve, reject) => {
    loader.load(`${frame.base}_${kind}.jpg`, (tex) => {
      tex.flipY = false;
      tex.colorSpace = kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      out[kind] = tex;
      resolve();
    }, undefined, reject);
  }));
  jobs.push(fetch(`${frame.base}_maps.json`).then((r) => r.json()).then((j) => { out.refs = j.refs; }));
  return Promise.all(jobs).then(() => out);
}

const toLin = (v) => Math.pow(v, 2.2);

// 接線が 0 の頂点（UV がつぶれた所）は、光の計算で値が壊れて画面が白く飛ぶ。法線に直交する向きで埋める
export function repairTangents(geo) {
  const t = geo.attributes.tangent; const n = geo.attributes.normal;
  if (!t || !n) return 0;
  let fixed = 0;
  for (let i = 0; i < t.count; i++) {
    const x = t.getX(i); const y = t.getY(i); const z = t.getZ(i);
    if (Number.isFinite(x + y + z) && x * x + y * y + z * z > 1e-12) continue;
    const nx = n.getX(i); const ny = n.getY(i); const nz = n.getZ(i);
    // 法線と平行でない軸との外積
    const ax = Math.abs(nx) < 0.9 ? 1 : 0; const ay = 1 - ax;
    let tx = ay * nz; let ty = -ax * nz; let tz = ax * ny - ay * nx;
    const l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
    t.setXYZW(i, tx, ty, tz, 1);
    fixed++;
  }
  if (fixed) t.needsUpdate = true;
  return fixed;
}

// 表面の細かい傷と粒（どの機体も同じ画像を繰り返す）
let detailTex = null;
function detailTexture() {
  if (detailTex) return detailTex;
  detailTex = new THREE.TextureLoader().load('./assets/airframes/detail.jpg');
  detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.colorSpace = THREE.NoColorSpace;
  detailTex.anisotropy = 8;
  return detailTex;
}

// 配色を変えられる機体の材質。
// 色の画像の陰影（明るさの比）を残したまま、塗り分けごとに配色の色へ置き換える。
// 角は塗装が剥げて地金が光り、凹みには汚れが溜まる。塗装には薄いクリアの艶を乗せる。
// gain は塗装の反射の強さ。太陽が強いゲームの中では下げて、明るい色でも白く飛ばさず面の陰影を残す。
// WebGPU 版：物理材質の node 版に、色・粗さ・金属度・法線・クリアの艶を node で書く。
// 画像（map・metalnessMap など）は材質の属性のまま持ち、materialColor などで読む（地図を掛けた値）。
export function makeShipMaterial({ maps, envMap, part, paint, gain = 1 }) {
  const mat = new THREE.MeshPhysicalNodeMaterial({
    map: maps.color,
    aoMap: maps.orm,
    aoMapIntensity: 1.0,
    metalnessMap: maps.orm,
    roughnessMap: maps.orm,
    normalMap: maps.normal,
    emissiveMap: maps.emissive,
    metalness: 1,
    roughness: 1,
    emissive: new THREE.Color(0x66d8ff),
    emissiveIntensity: 0.45,
    envMap,
    // 周りの光を弱めた宇宙でも機体が沈まないよう、自機だけ撮影用の照明の映り込みを強める
    envMapIntensity: 1.15,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    normalScale: new THREE.Vector2(1, 1),
  });
  mat.name = `ship_${part}`;
  const refs = (maps.refs || [0.65, 0.37, 0.29]).map(toLin);
  // 外から U.uX.value で値を変えられるよう、TSL の uniform（画像は texture）を同じ名前で持つ
  const U = {
    uMask: texture(maps.mask),
    uWear: texture(maps.wear),
    uRef: uniform(new THREE.Vector3(...refs)),
    uMain: uniform(new THREE.Color()),
    uAccent: uniform(new THREE.Color()),
    uTrim: uniform(new THREE.Color()),
    uWearAmt: uniform(1),
    uDetail: texture(detailTexture()),
    uDetailAmt: uniform(1),
    uGain: uniform(gain),
  };
  mat.userData.uniforms = U;
  mat.userData.setPaint = (p) => {
    U.uMain.value.set(`#${p[0]}`);
    U.uAccent.value.set(`#${p[1]}`);
    U.uTrim.value.set(`#${p[2]}`);
    mat.emissive.set(`#${p[3]}`);
  };
  mat.userData.setPaint(paint || ['a8a6a0', 'd84a18', '3a3c40', '66d8ff']);

  // 模型の座標と法線（細かい凹凸を3方向から貼る）
  const shipPos = positionGeometry.toVarying('vShipPos');
  const shipN = normalGeometry.toVarying('vShipN');
  const shipTri = (k) => {
    const w0 = pow(abs(normalize(shipN)), vec3(6.0));
    const w = w0.div(w0.x.add(w0.y).add(w0.z));
    return U.uDetail.sample(shipPos.zy.mul(k)).rgb.mul(w.x)
      .add(U.uDetail.sample(shipPos.xz.mul(k)).rgb.mul(w.y))
      .add(U.uDetail.sample(shipPos.xy.mul(k)).rgb.mul(w.z));
  };
  // 高さ h の画面上の傾きで法線を傾ける（視点の座標）
  const shipBump = (surfPos, n, h, amt) => {
    const sx = surfPos.dFdx(); const sy = surfPos.dFdy();
    const r1 = cross(sy, n); const r2 = cross(n, sx);
    const det = dot(sx, r1);
    const g = sign(det).mul(h.dFdx().mul(r1).add(h.dFdy().mul(r2))).mul(amt);
    const b = abs(det).mul(n).sub(g);
    // 面がつぶれて傾きが出ない所では、元の法線のまま（0 で割って値が壊れないように）
    const L2 = dot(b, b);
    return select(L2.greaterThan(1e-24).and(L2.lessThan(1e24)), b.mul(inverseSqrt(max(L2, 1e-24))), n);
  };

  // 塗り分け（r=主色・g=差し色・b=地金）と、傷み（r=角の剥げ・g=凹みの汚れ）
  const mask0 = U.uMask.sample(uv()).rgb;
  const shipMask = mask0.div(max(1.0, mask0.r.add(mask0.g).add(mask0.b)));
  const shipWear = U.uWear.sample(uv()).rgb;
  const base = materialColor.rgb;
  const shipLum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  const shipPaint = shipMask.r.mul(U.uMain).mul(clamp(shipLum.div(U.uRef.x), 0.0, 1.6))
    .add(shipMask.g.mul(U.uAccent).mul(clamp(shipLum.div(U.uRef.y), 0.0, 1.6)))
    .add(shipMask.b.mul(U.uTrim).mul(clamp(shipLum.div(U.uRef.z), 0.0, 2.2)));
  let col = mix(base, shipPaint, clamp(shipMask.r.add(shipMask.g).add(shipMask.b), 0.0, 1.0)).mul(U.uGain);
  const shipPainted = shipMask.r.add(shipMask.g);
  // 面の細かいむらと汚れの点
  const shipFine = shipTri(8.0);
  const shipFineH = shipFine.r;
  const shipFineK = U.uDetailAmt.mul(mix(1.0, 0.4, shipMask.r.add(shipMask.g))); // 塗装は滑らかに、地金は荒く
  col = col.mul(mix(1.0, float(0.92).add(shipFine.b.mul(0.16)).mul(float(1.0).sub(shipFine.g.mul(0.22))), shipFineK));
  // 角の剥げ：塗装の所だけ、外へ出た角で地金が見える
  const shipChip = smoothstep(0.28, 0.7, shipWear.r).mul(shipPainted).mul(U.uWearAmt);
  col = mix(col, vec3(0.32, 0.33, 0.35), shipChip.mul(0.75));
  // 地金の角は削れて明るい
  const trimEdge = shipMask.b.mul(smoothstep(0.3, 0.8, shipWear.r));
  col = col.add(trimEdge.mul(0.06).mul(U.uWearAmt));
  // 凹みの汚れ
  col = col.mul(mix(1.0, 0.62, shipWear.g.mul(U.uWearAmt)));
  mat.colorNode = col;

  // 剥げた所と地金の角はつやが出る。細かいむらで粗さも揺らす
  const rough = mix(materialRoughness, 0.3, shipChip.add(trimEdge.mul(0.5)));
  mat.roughnessNode = clamp(rough.add(U.uDetailAmt.mul(shipFine.b.sub(0.5).mul(0.2).add(shipFine.g.mul(0.12)))), 0.12, 1.0);
  mat.metalnessNode = mix(materialMetalness, 0.95, shipChip);
  mat.normalNode = shipBump(positionView, materialNormal, shipFineH, shipFineK.mul(0.0011));
  // クリアの艶は塗装の所だけ。剥げと汚れで消える
  mat.clearcoatNode = materialClearcoat.mul(shipPainted).mul(float(1.0).sub(shipChip)).mul(float(1.0).sub(shipWear.g.mul(0.6)));
  return mat;
}
