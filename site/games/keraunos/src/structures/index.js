import * as THREE from 'three';
import { generateAny, KINDS } from './build.js';
import { createPropField, PROP_INFO } from './props.js';
import { buildDebris, buildStructure, buildLightPoints, updateDebrisTime, setStructureView, registerStructureLods, unregisterStructureLods, LOD_K, STRUCT_U, LIGHT_U } from './mesh.js';

// 建物・建造物とその残骸を作る入口（プロシージャル。ファイルを読まない）。
//
//   const s = createStructure({ kind: 'tower', size: 110, damage: 0.6, heat: 0.5, seed: 7 });
//   scene.add(s.group);            // 足元が y=0、中心が x=z=0。位置と向きは s.group に掛ける
//   毎コマ：s.update(time)          // 破片が漂う（地上の建物では何もしない）
//   捨てる：s.dispose()
//
// kind：tower（塔）・turret（砲台）・hangar（格納庫）・bridge（橋）・module（ステーションの区画）・ring（ドッキングリング）・
//       tanks（タンク群）・station（基地全体＝並べ方）・factory（工場）・apartment（集合住宅）・shed（小さな建物）・city（街区＝並べ方）
// size：大きさ（m。種類ごとの目安は KINDS[kind].size と range）
// damage：壊れ具合 0〜1（0.05〜：穴と焦げ、0.35〜：割れて塊に分かれ、破片が漂う）
// heat：割れ口の熱さ 0〜1（壊れたばかり＝1、古い残骸＝0）
// seed：乱数の種（同じなら同じ物）
// 場面の霞・汚れ・灯りの強さは STRUCT_U（共有の uniform）で変える
export function createStructure(params) {
  const g = generateAny(params);
  if (!g.layout) {
    const s = buildStructure(g, params);
    return { ...s, kind: g.kind, params, generated: g, update(t) { updateDebrisTime(t, g.ground); } };
  }
  // 並べ方（基地全体・街区）：建物ごとに作り、置いて、まとめて扱う
  const group = new THREE.Group();
  group.name = `layout:${g.kind}`;
  // 灯りの点は並べ方ごとに1つにまとめる（建物ごとに作ると描画の回数が増える）
  const allLights = [];
  // 破片も並べ方ごとに1つにまとめる（建物ごとだと、地上の街区で破片だけで描画が約30回増えた）
  const allDebris = [];
  const box = new THREE.Box3(); const qr = new THREE.Quaternion(); const qd = new THREE.Quaternion(); const v = new THREE.Vector3(); const Y = new THREE.Vector3(0, 1, 0);
  const parts = g.items.map((it) => {
    const s = buildStructure(it.g, { ...params, lights: false, debris: false });
    qr.setFromAxisAngle(Y, it.ry || 0);
    const P0 = new THREE.Vector3(...it.pos);
    for (let k = 0; k < 8; k++) box.expandByPoint(v.set(k & 1 ? it.g.max[0] : it.g.min[0], k & 2 ? it.g.max[1] : it.g.min[1], k & 4 ? it.g.max[2] : it.g.min[2]).applyQuaternion(qr).add(P0));
    if (params.debris !== false) for (const d of it.g.debris) {
      const p = v.set(...d.p).applyQuaternion(qr).add(P0).toArray();
      qd.set(d.q[0], d.q[1], d.q[2], d.q[3]).premultiply(qr);
      const ax = v.set(d.spin[0], d.spin[1], d.spin[2]).applyQuaternion(qr).toArray();
      const vel = v.set(...d.vel).applyQuaternion(qr).toArray();
      allDebris.push({ ...d, p, q: [qd.x, qd.y, qd.z, qd.w], spin: [...ax, d.spin[3]], vel });
    }
    s.group.position.set(...it.pos);
    s.group.rotation.y = it.ry || 0;
    group.add(s.group);
    const c = Math.cos(it.ry || 0); const sn = Math.sin(it.ry || 0);
    for (const l of it.g.lights) allLights.push({ ...l, p: [it.pos[0] + l.p[0] * c + l.p[2] * sn, it.pos[1] + l.p[1], it.pos[2] - l.p[0] * sn + l.p[2] * c] });
    return s;
  });
  const lights = params.lights !== false && allLights.length ? buildLightPoints(allLights) : null;
  if (lights) group.add(lights);
  const deb = allDebris.length ? buildDebris({ debris: allDebris, min: box.min.toArray(), max: box.max.toArray(), S: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), ground: g.ground }, params.shadows !== false) : null;
  if (deb) { group.add(deb.group); registerStructureLods(deb.group); }
  return {
    group, parts, kind: g.kind, params, generated: g,
    update(t) { updateDebrisTime(t, g.ground); },
    forceLod(l) {
      for (const p of parts) p.forceLod(l);
      if (deb) for (const dl of deb.lods) { dl.userData.forced = l >= 0; dl.autoUpdate = l < 0; if (l >= 0) dl.levels.forEach((lv, i) => { lv.object.visible = i === l; }); }
    },
    stats() { return parts.reduce((a, p) => { const st = p.stats(); return { tris: a.tris.map((x, i) => x + st.tris[i]), debris: a.debris + st.debris, lights: a.lights + st.lights }; }, { tris: [0, 0, 0], debris: 0, lights: 0 }); },
    dispose() { for (const p of parts) p.dispose(); if (deb) { unregisterStructureLods(deb.group); deb.dispose(); } if (lights) { lights.geometry.dispose(); lights.material.dispose(); } },
  };
}

export { createStructureMaterial } from './material.js';
export { PROP_TYPES, Builder, ROLE, DETAIL } from './core.js';
export { generate, generateAny } from './build.js';
export { KINDS, LOD_K, STRUCT_U, LIGHT_U, updateDebrisTime, setStructureView, registerStructureLods, unregisterStructureLods, buildLightPoints };

// 建物の小物（generate に props: true を渡したときの g.props）を、小物を描く場（createPropField）へ登録する。
// 建物を置き終えてから呼ぶ（置き場所の行列をこの時に読む。あとで建物を動かしたら外して登録し直す）。戻り値は外すときに渡す
export function attachProps(field, s) {
  s.group.updateMatrixWorld(true);
  const list = s.parts ? s.parts.map((p) => [p.g.props, p.group]) : [[s.generated.props, s.group]];
  return list.filter(([pr]) => pr && pr.length).map(([pr, grp]) => field.add(pr, grp));
}
export function detachProps(field, handles) { for (const h of handles || []) field.remove(h); }
export { createPropField, PROP_INFO };
