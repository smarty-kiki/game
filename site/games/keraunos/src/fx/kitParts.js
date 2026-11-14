import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { uniform, texture, uv, vec3, vec4, dot, pow, clamp, mix, smoothstep, length, positionView, output, materialColor, materialEmissive } from 'three/tsl';
import { uniformOf } from './hardsurface.js';
import { applySurface, SURF_ON, regionLightK, breakLitPaint } from './surface.js';

// Tripo で作ったパーツ15品目（assets/kit）。部品の前は +Z、上は +Y、原点は底の中央。
// 全部品で1枚の共有画像を使うので、まとめた形は描画1回で済む。配色は塗り分けの画像で材質ごとに変える。
export const PALETTES = {
  enemy: { main: null, acc: null, glow: 1.6 }, // 元の赤
  ally: { main: [0.62, 0.65, 0.69], acc: [0.05, 0.28, 0.85], glow: 1.5 },
  rust: { main: [0.16, 0.075, 0.035], acc: [0.22, 0.15, 0.07], glow: 0.35 },
  base: { main: [0.13, 0.145, 0.17], acc: [0.85, 0.28, 0.03], glow: 1.8 },
  // 役割で塗り分ける色（赤は撃つ対象と敵の印だけに使う）
  enemyHull: { main: [0.10, 0.105, 0.115], acc: [0.55, 0.05, 0.025], glow: 1.5 }, // 敵の艦：暗い鋼に、赤は所属の印の帯だけ
  hangar: { main: [0.26, 0.28, 0.29], acc: [0.72, 0.52, 0.05], glow: 1.6 },        // 格納庫：灰色に、扉まわりの黄
  fuel: { main: [0.50, 0.24, 0.05], acc: [0.62, 0.62, 0.60], glow: 1.2 },          // 燃料・精製：橙に白の帯
  comms: { main: [0.55, 0.56, 0.55], acc: [0.04, 0.38, 0.40], glow: 1.6 },         // 通信のアンテナ：白に青緑
  radiator: { main: [0.085, 0.095, 0.105], acc: [0.42, 0.20, 0.08], glow: 1.4 },   // 放熱板：暗い鋼に銅
  crane: { main: [0.55, 0.40, 0.05], acc: [0.05, 0.05, 0.05], glow: 1.4 },         // 作業の腕：工事の黄と黒
};

const parts = {};
let tex = null;
const texLoader = new THREE.TextureLoader();
const load = (name, srgb) => new Promise((ok, err) => texLoader.load(`./assets/kit/${name}`, (t) => {
  t.flipY = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  ok(t);
}, undefined, err));

export const kitReady = (async () => {
  const [gltf, color, mask, normal, orm] = await Promise.all([
    new Promise((ok, err) => new GLTFLoader().load('./assets/kit/kit.glb', ok, undefined, err)),
    load('kit_color.jpg', true), load('kit_mask.jpg'), load('kit_normal.jpg'), load('kit_orm.jpg'),
  ]);
  tex = { color, mask, normal, orm };
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.name.match(/kit(\d\d)_L(\d)/);
    if (!m) return;
    const key = `kit${m[1]}`;
    if (!parts[key]) parts[key] = [];
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    g.computeBoundingBox();
    parts[key][Number(m[2])] = g;
  });
})();

export function kitPart(key, lod = 1) { return parts[key][lod]; }

// 部品の共有材質。palette は PALETTES の名前。hazeU は遠景が溶ける色（{ value: Vector3 }。無ければ溶けない）
// WebGPU 版：標準の材質の node 版。配色の置き換えは colorNode、灯りは emissiveNode、遠景の溶けは outputNode で足す
export function kitMaterial({ palette = 'enemy', hazeU = null, glow = null } = {}) {
  const P = PALETTES[palette];
  const m = new THREE.MeshStandardNodeMaterial({
    map: tex.color, normalMap: tex.normal, roughnessMap: tex.orm, metalnessMap: tex.orm,
    // 焼いた溝の暗がり（ORM の R）を、周りから回り込む光に効かせる
    aoMap: SURF_ON ? tex.orm : null, aoMapIntensity: 1,
    roughness: 1, metalness: 1, envMapIntensity: SURF_ON ? 0.5 : 0.35, fog: false,
  });
  const kitMask = texture(tex.mask, uv()).rgb;
  const kitBase = materialColor.rgb;
  if (P.main) {
    const kitL = dot(kitBase, vec3(0.3, 0.59, 0.11));
    // 赤の塗装の明るさを基準に、汚れを弱めて新しい色へ掛ける
    const kitK = pow(clamp(kitL.div(0.085), 0.0, 3.0), 0.55);
    const c = mix(kitBase, vec3(...P.main).mul(kitK), kitMask.r);
    m.colorNode = mix(c, vec3(...P.acc).mul(clamp(kitL.div(0.3), 0.0, 2.0)), kitMask.g);
  }
  breakLitPaint(m, kitBase, 16.0, 14.0);
  // 質感の層（粒・傷・板・汚れ・凹み・剥げ・彩度）。部品は数十の単位の大きさなので、粒は2.5、板は4の単位
  applySurface(m, { scale: 2.5, panel: 4.0, ao: texture(tex.orm, uv()).r, paint: true });
  m.emissiveNode = vec3(materialEmissive).add(kitBase.mul(kitMask.b).mul(uniform(glow ?? P.glow)).mul(2.5)).mul(regionLightK(16.0, 1.0));
  if (hazeU) {
    const uHaze = uniformOf(hazeU);
    m.outputNode = vec4(mix(output.rgb, uHaze, smoothstep(320.0, 1500.0, length(positionView)).mul(0.62)), output.a);
  }
  return m;
}

// 組み立て：部品を置く。s は倍率、sx・sy・sz で方向ごとに伸ばせる。ry は上の軸まわりの回転
export class KitBuilder {
  constructor(lod = 1) { this.lod = lod; this.list = []; }
  put(key, x, y, z, { s = 1, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0, lod = this.lod } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s * sx, s * sy, s * sz));
    this.list.push(kitPart(key, lod).clone().applyMatrix4(m));
    return this;
  }
  geometry() {
    const g = mergeGeometries(this.list.map((x) => { const y = x.index ? x.toNonIndexed() : x; for (const k of Object.keys(y.attributes)) if (!['position', 'normal', 'uv'].includes(k)) y.deleteAttribute(k); return y; }), false);
    g.computeBoundingSphere();
    return g;
  }
}

// 施設：古い形と同じ大きさ（箱の一番長い辺）に合わせた部品の形を返す
export function kitFacility(key, targetSize, lod = 1) {
  const g = kitPart(key, lod);
  const b = g.boundingBox; const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
  const out = g.clone().applyMatrix4(new THREE.Matrix4().makeScale(targetSize / size, targetSize / size, targetSize / size));
  const y = out.index ? out.toNonIndexed() : out;
  for (const k of Object.keys(y.attributes)) if (!['position', 'normal', 'uv'].includes(k)) y.deleteAttribute(k);
  return y;
}

// 大きさ（部品の実寸）。bake_kit.py の kit.json と同じ値
const D = { kit01: [0.206, 0.313, 0.31], kit02: [0.26, 0.233, 0.4375], kit03: [0.39, 0.264, 0.3335], kit04: [0.1196, 0.2036, 0.4312], kit05: [0.165, 0.155, 0.391], kit06: [0.123, 0.155, 0.325] };

// 大型艦：中央の船体を3列・2段に積み、前へ細らせた段々の形にする。部品は同じでも、並べ方で艦の大きさが出る
export function buildKitShip({ L = 900, tier = 2, lo = false }) {
  const n = tier === 2 ? 7 : L > 300 ? 4 : 2; // 中央の列の長さ（部品の数）
  const midL = D.kit05[2]; const midW = D.kit05[0]; const midH = D.kit05[1];
  const bowL = D.kit04[2] * 1.5; const engL = D.kit02[2] * 0.6;
  const raw = n * midL + bowL + engL;
  const u = L / raw; // 部品1単位あたりの長さ
  // 胴の列は最も軽い段（画像が細部を受け持つ）。艦橋と砲塔だけ細かい段にする
  const b = new KitBuilder(2);
  const fineLod = lo ? 2 : 1;
  const z0 = -L / 2 + engL * u;
  const guns = []; const engines = []; const beacons = [];
  const col = (x, y, from, to, every = 2) => {
    for (let i = from; i < to; i++) {
      const key = i % every === 1 ? 'kit06' : 'kit05';
      const sz = midL / D[key][2];
      b.put(key, x, y, z0 + (i + 0.5) * midL * u, { s: u, sz, sx: midW / D[key][0], sy: midH / D[key][1] });
    }
  };
  // 中央の列（下段）と、艦首
  col(0, 0, 0, n);
  b.put('kit04', 0, 0, z0 + n * midL * u + bowL * 0.5 * u, { s: u, sx: (midW / D.kit04[0]), sy: midH / D.kit04[1] * 0.95, sz: 1.5 });
  // 両脇の列：前へ行くほど短い。艦幅を出す
  if (n >= 4) { const m = Math.max(2, n - 2); for (const sg of [-1, 1]) col(sg * midW * u * 0.98, -midH * u * 0.18, 0, m); }
  if (tier === 2) for (const sg of [-1, 1]) col(sg * midW * u * 1.96, -midH * u * 0.34, 0, n - 4, 3);
  // 上段：後ろ寄りに重ねる
  const top = midH * u * 0.92;
  if (n >= 4) col(0, top, 0, Math.ceil(n * 0.55));
  const bridgeZ = z0 + Math.ceil(n * 0.55) * midL * u * 0.62;
  const yTop = n >= 4 ? top * 2 : top;
  b.put('kit01', 0, yTop * 0.98, bridgeZ, { s: u * 0.72, lod: fineLod });
  beacons.push([0, yTop + D.kit01[1] * u * 0.72, bridgeZ, 1]);
  // 砲塔：甲板の前後に
  const gunAt = (x, y, z, s) => { if (lo) return; b.put('kit03', x, y, z, { s: u * s, lod: 2 }); guns.push([x, y + D.kit03[1] * u * s * 0.6, z + D.kit03[2] * u * s * 0.5]); };
  for (let i = Math.ceil(n * 0.55); i < n; i++) gunAt(0, top * 0.98, z0 + (i + 0.5) * midL * u, 0.55);
  if (n >= 4) for (const sg of [-1, 1]) for (let i = 0; i < Math.max(2, n - 2); i += 2) gunAt(sg * midW * u * 0.98, top * 0.8, z0 + (i + 0.5) * midL * u, 0.42);
  if (!guns.length) guns.push([0, top, 0]);
  // 推進器：艦尾に（噴射口が -Z）
  const es = u * 0.72;
  const eX = n >= 4 ? [-midW * u * 0.98, 0, midW * u * 0.98] : [0];
  for (const x of eX) {
    b.put('kit02', x, -midH * u * 0.1, z0 - D.kit02[2] * es * 0.5 + midL * u * 0.08, { s: es });
    engines.push([x - D.kit02[0] * es * 0.28, D.kit02[1] * es * 0.3, -L / 2, D.kit02[0] * es * 0.28], [x + D.kit02[0] * es * 0.28, D.kit02[1] * es * 0.3, -L / 2, D.kit02[0] * es * 0.28]);
  }
  if (!lo && tier === 2) {
    // 甲板の小物：機器・アンテナ・放熱板
    b.put('kit14', 0, yTop * 0.98, z0 + midL * u * 0.4, { s: u * 0.55 });
    b.put('kit15', midW * u * 0.2, yTop * 0.98, bridgeZ - D.kit01[2] * u * 0.7, { s: u * 0.5 });
    for (const sg of [-1, 1]) b.put('kit09', sg * midW * u * 2.5, midH * u * 0.1, z0 + midL * u * 1.2, { s: u * 1.1, ry: sg * Math.PI / 2 });
  }
  return { geo: b.geometry(), engines, guns, beacons, L };
}
