import * as THREE from 'three';
import { loadAirframeMaps, makeShipMaterial, repairTangents } from './materials.js';

// 武装の模型を機体の取り付け位置へ付ける。機体選択の画面とゲームで同じ物を使う。
// 砲口はノード muzzle_<名前>。機関砲の銃身は w_gun_spin で回す。
const SPIN_MAX = 46;
// 枠ごとの模型の大きさ（大きいと機体の形が隠れる）
export const SLOT_SCALE = { main: 0.8, heavy: 0.78, sub: 0.66 };
// 模型は Tripo で作った3枚（sheet_w1〜w3）を tools/bake_weapons_tripo.py で8種に分けた物。
// 画像は tools/make_weapon_maps.py が機体と同じ形式で作り、材質も機体と同じ makeShipMaterial で配色を変える。
const SHEETS = ['w1', 'w2', 'w3'];
const BASE = './assets/weapons';

export function loadWeaponModels(loader) {
  const tl = new THREE.TextureLoader();
  const glb = new Promise((res, rej) => loader.load(`${BASE}/weapons_tripo.glb`, (g) => res(g.scene), undefined, rej));
  const maps = Promise.all(SHEETS.map((s) => loadAirframeMaps(tl, { base: `${BASE}/sheet_${s}` }).then((m) => [s, m])));
  return Promise.all([glb, maps]).then(([scene, list]) => {
    scene.userData.maps = Object.fromEntries(list);
    scene.traverse((o) => { if (o.isMesh) repairTangents(o.geometry); });
    return scene;
  });
}

export function createWeaponMounts({ models, envMap, paint, gain = 1, shadow = true }) {
  const mats = {};
  for (const s of SHEETS) mats[s] = makeShipMaterial({ maps: models.userData.maps[s], envMap, part: `weapon_${s}`, paint, gain });
  function setPaint(p) {
    for (const m of Object.values(mats)) m.userData.setPaint(p);
  }
  setPaint(paint);
  const built = new Map(); // 付いている武装
  const q = new THREE.Vector3();

  function meshOf(node) {
    const sheet = (node.material.name || '').replace(/^sheet_/, '').replace(/\.\d+$/, '');
    const m = new THREE.Mesh(node.geometry, mats[sheet] || mats.w1);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    m.layers.enable(1);
    return m;
  }
  function instance(name) {
    const src = models.getObjectByName(`w_${name}`);
    const c = meshOf(src);
    c.name = `w_${name}`;
    const spin = models.getObjectByName(`w_${name}_spin`);
    if (spin) {
      const s2 = meshOf(spin);
      s2.name = `w_${name}_spin`;
      s2.position.copy(spin.position);
      c.add(s2);
    }
    return c;
  }
  function muzzleOf(name) {
    const m = models.getObjectByName(`muzzle_${name}`);
    return m ? m.position.clone() : new THREE.Vector3();
  }

  // weapon を hp（右側の位置）へ。pair なら左右に付ける。parentOf(x) は親（翼の骨など）を返す
  function mount(slot, weapon, hp, pair, root, parentOf) {
    remove(slot);
    const list = [];
    const muzzles = [];
    const signs = pair ? [1, -1] : [1];
    for (const sg of signs) {
      const g = instance(weapon);
      const sc = SLOT_SCALE[slot.startsWith('sub') ? 'sub' : slot];
      g.scale.setScalar(sc);
      g.position.set(sg * hp[0], hp[1], hp[2]);
      root.add(g);
      root.updateMatrixWorld(true);
      const parent = parentOf ? parentOf(sg * hp[0]) : null;
      if (parent && parent !== root) parent.attach(g);
      g.userData.base = g.position.clone();
      list.push(g);
      muzzles.push(muzzleOf(weapon).multiplyScalar(sc).add(new THREE.Vector3(sg * hp[0], hp[1], hp[2])));
    }
    built.set(slot, { list, weapon, kick: 0, spin: 0, spinV: 0 });
    return muzzles;
  }
  function remove(slot) {
    const b = built.get(slot);
    if (!b) return;
    for (const g of b.list) g.parent && g.parent.remove(g);
    built.delete(slot);
  }
  function kick(slot, k = 1) { const b = built.get(slot); if (b) b.kick = Math.max(b.kick, k); }
  // 毎コマ：反動を戻し、機関砲の銃身を回す
  function update(dt, firing) {
    for (const [slot, b] of built) {
      b.kick *= Math.exp(-dt * 11);
      for (const g of b.list) {
        if (!g.userData.base) continue;
        q.copy(g.userData.base);
        q.z -= b.kick * (b.weapon === 'cannon' || b.weapon === 'rail' ? 0.05 : 0.016);
        g.position.copy(q);
      }
      if (b.weapon === 'gun') {
        const target = firing && firing[slot] ? SPIN_MAX : (b.idleSpin || 0);
        b.spinV += (target - b.spinV) * (1 - Math.exp(-dt * (firing && firing[slot] ? 9 : 2)));
        b.spin += b.spinV * dt;
        for (const g of b.list) {
          const s = g.getObjectByName('w_gun_spin');
          if (s) s.rotation.z = b.spin;
        }
      }
    }
  }
  return { mount, remove, kick, update, setPaint, built, instance };
}

// 構成どおりに全部付ける。返り値は枠ごとの砲口（機体の座標）
export function mountLoadout(mounts, frame, L, root, parentOf) {
  const out = { sub: [] };
  out.main = mounts.mount('main', L.main, frame.hp.main, true, root, parentOf);
  out.heavy = mounts.mount('heavy', L.heavy, frame.hp.heavy, false, root, parentOf);
  L.subs.forEach((w, i) => { out.sub[i] = mounts.mount(`sub${i}`, w, frame.hp.sub[i], true, root, parentOf); });
  return out;
}
