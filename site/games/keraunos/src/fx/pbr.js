import * as THREE from 'three';

// Blender で焼いて合成した材質の画像（tools/compose_kit.py が assets/pbr/ に書き出す）を読み込む。
// 名前は「部品の名前_GLB の材質名」。色・ORM（遮蔽・粗さ・金属度）・法線・発光の4枚。

const store = new Map();

export function preloadPbr(base = './assets/pbr/') {
  const loader = new THREE.TextureLoader();
  const one = (file, srgb) => new Promise((res) => loader.load(base + encodeURIComponent(file), (t) => {
    t.flipY = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    res(t);
  }, undefined, () => res(null)));
  return fetch(base + 'manifest.json').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((names) => Promise.all(names.map(async (n) => {
    const [color, orm, normal, emissive] = await Promise.all([one(`${n}_color.jpg`, true), one(`${n}_orm.jpg`), one(`${n}_normal.jpg`), one(`${n}_emissive.jpg`, true)]);
    if (color && orm && normal) store.set(n, { color, orm, normal, emissive });
  }))).then(() => store.size);
}

export function getPbr(key, materialName) {
  return store.get(`${key}_${materialName}`) || null;
}
