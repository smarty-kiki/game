import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { attribute, varying, uniform, positionGeometry, positionWorld, cameraPosition, normalize, float, vec3, vec4, length, max, min, clamp, acos, atan, sin, cos, pow, cross, mix, smoothstep } from 'three/tsl';
import { qrot, qrotInv, basisR, stretchOf, STRETCH_MAX } from './shapeMath.js';
import { objectDirs, SPACE_U } from './rockShading.js';
import { BOUND } from './shapes.js';

// 近くの岩：本物の立体。細かく分けた球（形は全種類で共通）を、頂点ごとに形の地図の半径まで押し出し、岩ごとの比で伸ばす。
// 画面での大きさで4段の細かさから選び、さらに小さい物は遠くの板（インポスター）へ回す。
// 1段につき描画は1回（全種類・全材質をまとめて描く）。
//
// 使い方（ゲームは毎コマ）:
//   near.begin();
//   near.add(x, y, z, scale, qx, qy, qz, qw, shape, kind, seed, hide);  // 位置は描く座標（ゲームは機体からの相対）
//   near.end(camera);   // 段を振り分けて送る。板へ回した物は impostors.near へ入る
// hide は 0〜1（1 で見えない）。折り返しの境目で少しずつ消すのに使う（MSAA の網目で透かす）。

// 段ごとの [球の分け方, 数の上限]。分け方 n の三角形は 20×(n+1)² 個
// 一番細かい段は「カメラ側へ三角形を集めた球」：見えない裏側を捨て、見える側の、カメラに近い所ほど細かく分ける。
// そこへ細かいクレーターと小石を本当に押し出すので、大きく寄っても輪郭と角がくっきりする
export const LOD_PRESETS = {
  lab: { lods: [[96, 2], [30, 14], [13, 80], [6, 320]], px: [480, 140, 50, 20] },
  // ゲーム：三角形の上限（場面全体で 26万）に収まるよう、一番細かい段は1つだけ（最悪でも約18万、ふだんは数万）
  game: { lods: [[40, 1], [16, 6], [8, 30], [4, 120]], px: [420, 150, 56, 20] },
};

const uPxK = uniform(800);

export function createNearRocks({ group, shading, impostorNear, preset = 'lab', castShadow = [false, true, true, false], renderer, detail = null }) {
  const P = LOD_PRESETS[preset];
  // 段ごとに、材質（岩・氷・金属）ごとの描画を1つずつ持つ。材質ごとに分けると、その材質の計算だけで済む（他の画像を読まない）
  const lods = P.lods.map(([subdiv, cap], li) => {
    let g = new THREE.IcosahedronGeometry(1, subdiv);
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-5);
    const parts = [0, 1, 2].map((kc) => {
      const ig = new THREE.InstancedBufferGeometry();
      ig.index = g.index;
      ig.setAttribute('position', g.attributes.position);
      const mk = (name) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); a.setUsage(THREE.DynamicDrawUsage); ig.setAttribute(name, a); return a; };
      const aPos = mk('iPos'); const aQuat = mk('iQuat'); const aData = mk('iData'); const aFx = mk('iFx');
      // 一番細かい段だけ：その岩の細かい形の地図のますと、混ぜる強さ
      const aDet = li === 0 && detail ? mk('iDet') : null;
      ig.instanceCount = 0;
      const mat = makeMaterial(shading, { focused: li === 0, uPxK, tier: li <= 1 ? 0 : 1, kindConst: kc, detail: aDet ? detail : null });
      const mesh = new THREE.Mesh(ig, mat);
      mesh.frustumCulled = false;
      mesh.castShadow = castShadow[li];
      mesh.receiveShadow = true; // 自分の影は「受ける影」に掛けるので、受ける設定が要る
      mesh.name = `spaceRockLOD${li}_${['rock', 'ice', 'metal'][kc]}`;
      group.add(mesh);
      return { mesh, ig, aPos, aQuat, aData, aFx, aDet, used: 0 };
    });
    return { parts, cap, used: 0, tris: g.index.count / 3 };
  });

  // 受け付けた岩（毎コマ詰め直す）
  let CAP = 4096;
  const ST = 16; // 1つの岩の値の数
  let buf = new Float32Array(CAP * ST);
  let n = 0;
  const frustum = new THREE.Frustum();
  const m4 = new THREE.Matrix4();
  const sph = new THREE.Sphere();
  const camPos = new THREE.Vector3();
  const size = new THREE.Vector2();
  const stats = { lod: [0, 0, 0, 0], imp: 0, tris: 0, culled: 0 };

  function begin() { n = 0; }
  // 最後の4つは効果：撃たれた所の向き（物の座標の単位の向き。0 なら全体）と熱（0〜1。赤熱して冷える）
  function add(x, y, z, scale, qx, qy, qz, qw, shape, kind, seed, hide = 0, fx = 0, fy = 0, fz = 0, heat = 0) {
    if (n >= CAP) { CAP *= 2; const nb = new Float32Array(CAP * ST); nb.set(buf); buf = nb; }
    const o = n * ST;
    buf[o] = x; buf[o + 1] = y; buf[o + 2] = z; buf[o + 3] = scale;
    buf[o + 4] = qx; buf[o + 5] = qy; buf[o + 6] = qz; buf[o + 7] = qw;
    buf[o + 8] = shape; buf[o + 9] = kind; buf[o + 10] = seed; buf[o + 11] = hide;
    buf[o + 12] = fx; buf[o + 13] = fy; buf[o + 14] = fz; buf[o + 15] = heat;
    n++;
  }
  function end(camera) {
    camera.updateMatrixWorld();
    m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m4, camera.coordinateSystem);
    camPos.setFromMatrixPosition(camera.matrixWorld);
    renderer.getDrawingBufferSize(size);
    const pxK = (size.y * 0.5) / Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    uPxK.value = pxK;
    for (const l of lods) { l.used = 0; for (const pt of l.parts) pt.used = 0; }
    if (detail) detail.beginFrame();
    if (impostorNear) impostorNear.begin();
    stats.lod.fill(0); stats.imp = 0; stats.culled = 0;
    for (let i = 0; i < n; i++) {
      const o = i * ST;
      const s = buf[o + 3];
      if (s <= 0 || buf[o + 11] >= 0.999) continue;
      sph.center.set(buf[o], buf[o + 1], buf[o + 2]);
      sph.radius = s * BOUND * STRETCH_MAX;
      if (!frustum.intersectsSphere(sph)) { stats.culled++; continue; }
      const dist = Math.max(0.01, sph.center.distanceTo(camPos) - s * 0.6);
      const px = (s * 1.2 / dist) * pxK;
      let li = api.forceImp ? 4 : px > P.px[0] ? 0 : px > P.px[1] ? 1 : px > P.px[2] ? 2 : px > P.px[3] ? 3 : 4;
      const kc = Math.max(0, Math.min(2, Math.round(buf[o + 9])));
      while (li < 4 && lods[li].used >= lods[li].cap) li++; // 段の上限は材質をまとめた数
      // 一番細かい段は、その岩の細かい形の地図を使う。まだ焼けない時（1コマに1つまで）は1つ粗い段で描く
      let slot = 0; let amp = 0;
      if (li === 0 && detail) {
        slot = detail.request(`${buf[o + 8]}|${buf[o + 10]}|${s.toFixed(2)}|${kc}`, { k: buf[o + 8], seed: buf[o + 10], scale: s, kind: kc });
        if (slot < 0) { li = 1; while (li < 4 && lods[li].used >= lods[li].cap) li++; }
        // 細かい形は近づくほど強く（段が切り替わる大きさでは 0。切り替えで形が飛ばない）
        const t = Math.min(1, Math.max(0, (px - P.px[0]) / (P.px[0] * 0.8)));
        amp = t * t * (3 - 2 * t);
      }
      if (li === 4) {
        if (impostorNear) { impostorNear.push(buf, o); stats.imp++; }
        continue;
      }
      const l = lods[li].parts[kc];
      const j = l.used * 4;
      l.aPos.array[j] = buf[o]; l.aPos.array[j + 1] = buf[o + 1]; l.aPos.array[j + 2] = buf[o + 2]; l.aPos.array[j + 3] = s;
      l.aQuat.array[j] = buf[o + 4]; l.aQuat.array[j + 1] = buf[o + 5]; l.aQuat.array[j + 2] = buf[o + 6]; l.aQuat.array[j + 3] = buf[o + 7];
      l.aData.array[j] = buf[o + 8]; l.aData.array[j + 1] = buf[o + 9]; l.aData.array[j + 2] = buf[o + 10]; l.aData.array[j + 3] = buf[o + 11];
      l.aFx.array[j] = buf[o + 12]; l.aFx.array[j + 1] = buf[o + 13]; l.aFx.array[j + 2] = buf[o + 14]; l.aFx.array[j + 3] = buf[o + 15];
      if (l.aDet) { l.aDet.array[j] = slot; l.aDet.array[j + 1] = amp; }
      l.used++;
      lods[li].used++;
      stats.lod[li]++;
    }
    stats.tris = 0;
    for (const l of lods) {
      for (const pt of l.parts) {
        pt.ig.instanceCount = pt.used;
        pt.mesh.visible = pt.used > 0;
        if (pt.used > 0) {
          for (const a of [pt.aPos, pt.aQuat, pt.aData, pt.aFx, pt.aDet]) { if (!a) continue; a.clearUpdateRanges(); a.addUpdateRange(0, pt.used * 4); a.needsUpdate = true; }
        }
      }
      stats.tris += l.used * l.tris;
    }
    if (impostorNear) impostorNear.end();
  }
  const api = { begin, add, end, lods, stats, forceImp: false, get count() { return n; } };
  return api;
}

function makeMaterial(shading, { focused = false, uPxK: pxK, tier = 0, kindConst, detail = null } = {}) {
  const mat = new THREE.MeshPhysicalNodeMaterial({ fog: false });
  const iPos = attribute('iPos', 'vec4');
  const iQuat = attribute('iQuat', 'vec4');
  const iData = attribute('iData', 'vec4');
  const iFx = attribute('iFx', 'vec4');
  let dir = normalize(positionGeometry);
  let geoFade = float(1.0);
  const toCam = cameraPosition.sub(iPos.xyz);
  // 岩ごとの縦・横・奥行きの比。形の地図は伸ばす前の形（元の座標）で読み、描く位置だけ伸ばす
  const st = stretchOf(iData.z);
  if (focused) {
    // 球の北極をカメラの向き（元の座標）へ回し、極の角度を縮めて見える側へ集める（影の地図を描く時は太陽の側へ集まる）
    const distO = length(toCam).div(iPos.w);
    const V = normalize(qrotInv(iQuat, toCam).div(st));
    const T = basisR(V); const B = cross(V, T);
    const th = acos(clamp(dir.z, -1.0, 1.0)); const ph = atan(dir.y, dir.x);
    const cap = min(float(Math.PI), acos(clamp(float(0.5).div(max(distO, 0.51)), -1.0, 1.0)).add(0.55));
    const th2 = cap.mul(pow(th.div(Math.PI), 1.4));
    const dl = vec3(sin(th2).mul(cos(ph)), sin(th2).mul(sin(ph)), cos(th2));
    dir = normalize(T.mul(dl.x).add(B.mul(dl.y)).add(V.mul(dl.z)));
    // 頂点がまばらになる輪郭の近くでは、細かい形の押し出しを弱める（陰影の細かさは残す。輪郭が棘にならない）
    geoFade = float(1.0).sub(smoothstep(cap.mul(0.45), cap.mul(0.9), th2));
  }
  const iDet = detail ? attribute('iDet', 'vec4') : null;
  // 細かい形の地図があれば、近さで混ぜた半径まで押し出す（素材の高さの押し出しは、細かい形が強いほど弱める）
  const r0 = iDet ? mix(shading.radiusAt(dir, iData.x), detail.radiusSoft(dir, iDet.x), iDet.y.mul(geoFade)) : shading.radiusAt(dir, iData.x);
  const dispK = iDet ? float(1.0).sub(iDet.y.mul(0.6)) : float(1.0);
  const Pobj = focused
    ? dir.mul(r0.add(shading.microDisp(dir.mul(r0), iPos.w, iData.z, iData.y, length(toCam), pxK, st).mul(dispK).div(iPos.w)))
    : dir.mul(r0);
  const vPt = varying(dir.mul(r0), 'vSpPt'); // 質感を貼る位置（素材の高さの押し出しを除く）
  mat.positionNode = qrot(iQuat, Pobj.mul(st).mul(iPos.w)).add(iPos.xyz);
  const vP = varying(Pobj, 'vSpP');
  const vQ = varying(iQuat, 'vSpQ');
  const vD = varying(iData, 'vSpD');
  const vS = varying(iPos.w, 'vSpS');
  const { Vobj, Lobj } = objectDirs(vQ, positionWorld);
  shading.applyTo(mat, { tier, kindConst, detail: iDet ? { slot: varying(iDet.x, 'vSpDs'), amp: varying(iDet.y, 'vSpDa') } : null, fx: varying(iFx, 'vSpFx'), P: vP, Pt: vPt, D: varying(dir, 'vSpDir'), st: varying(st, 'vSpSt'), scale: vS, tile: vD.x, kind: vD.y, seed: vD.z, quat: vQ, Vobj, Lobj: varying(objectDirs(iQuat, iPos.xyz).Lobj, 'vSpL') });
  // 折り返しの境目で消すときは MSAA の網目で透かす（点描の粒が見えない）
  mat.alphaToCoverage = true;
  mat.opacityNode = float(1.0).sub(vD.w);
  mat.transparent = false;
  return mat;
}
export { SPACE_U, vec4 };
