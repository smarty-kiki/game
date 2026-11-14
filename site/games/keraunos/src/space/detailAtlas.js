import * as THREE from 'three';
import {
  Fn, uv, uniform, vec2, vec3, vec4, float, abs, max, floor, fract, dot, clamp, normalize,
  smoothstep, select, cross, Loop, If, texture, saturate,
} from 'three/tsl';
import { hash31, hash33, fbm3, octEncode, octDecode, octWrap, stretchOf } from './shapeMath.js';
import { makeDerivedMaterials, BOUND } from './shapes.js';

// 近い岩ごとの細かい形の地図。大きく寄った岩だけ、その岩1つのための高い解像度の地図を焼く。
// 形の式（shapes.js の shapeCore）を高い解像度で計算し直し（共通の地図の粗い画素で、層の段の縁がのこぎり状になるのを無くす）、
// 世界の長さで決めた細かい地層（大きな層の段に重ねる薄い層）と角ばった石（クレーターの底に多い）を足し、
// 共通の地図の小さな石は減らす。どれも割れ面で切る前に足すので、新しい割れ面はきれいな平面のまま残る。
// 地図は横に並べた「ます」（slots 個）で持つ。焼くのは1つの岩につき1回（同じ岩が近くにいる間は使い回す）。
// 形の地図と同じ作り（半径−1・印・法線・隙間の暗がり）なので、質感の式（rockShading）はそのまま読める。
export function createDetailAtlas(renderer, base, { res = 1536, pad = 12, slots = 2 } = {}) {
  const RES = res; const PAD = pad;
  const W = RES * slots; const H = RES;
  // 向き dir・ます s → 地図の画像の位置
  const atlasUV = (dir, s) => {
    const o = octEncode(dir);
    return vec2(s, 0.0).mul(RES).add(PAD).add(o.mul(RES - 2 * PAD)).div(vec2(W, H));
  };
  // 1つの岩を焼く時の、1枚だけの地図（ますの中）
  const localUV = (dir) => octEncode(dir).mul(RES - 2 * PAD).add(PAD).div(RES);
  const localDir = () => {
    const o = uv().mul(RES).sub(PAD).div(RES - 2 * PAD);
    const f = octWrap(o.mul(2.0).sub(1.0));
    return { d: octDecode(f.mul(0.5).add(0.5)), k: float(0.0) };
  };

  // 焼く岩の値
  const U = { k: uniform(0), seed: uniform(0), scale: uniform(1), kind: uniform(0), strata: uniform(1), stones: uniform(1) }; // strata・stones：確認用（0 で切る）

  // ---- 1回目：細かい形を足した半径（上位・下位）と印 ----
  const rtH = new THREE.RenderTarget(RES, RES, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const matH = new THREE.MeshBasicNodeMaterial({ fog: false, toneMapped: false });
  matH.fragmentNode = Fn(() => {
    const { d } = localDir();
    const st = stretchOf(U.seed);
    const sv = hash33(vec3(U.seed, U.seed.mul(1.7), U.seed.mul(2.3)));
    // 細かい形の大きさは岩の大きさに合わせる（大きな岩 90 で 1、小さな岩ほど細かく）
    const fs = clamp(U.scale.div(90.0), 0.2, 1.0);
    // 同じ形の式を高い解像度で計算し直す（共通の地図の画素の粗さで、層の段の縁がのこぎり状に見えるのを無くす）。
    // 割れ面で切る前に、世界の長さで決めた細かい形を足す
    const extraH = ({ p, crater, sAx, sideF, patchF }) => {
      const X = p.mul(st).mul(U.scale);
      const nb = normalize(d.div(st));
      const add = float(0.0).toVar();
      const fill = saturate(crater.mul(1.3));
      // 細かい地層：大きな層の段の上に、薄い層（世界の長さで 3.5 と 9）の段を重ねる（層の向きは大きな層と同じ）。
      // 段は smoothstep − f（層の両端で 0）で途切れさせない。途切れると縁が画素の並びの点線になる
      [[3.5, 0.3], [9.0, 0.25]].forEach(([T0, amp], li) => {
        const T = fs.mul(T0);
        const t = dot(X, sAx).div(T).add(fbm3(X.mul(float(0.03).div(fs)).add(li * 3.3)).mul(0.1));
        const f = fract(t);
        const kd = hash31(vec3(floor(t), U.seed, li * 7.0)).mul(0.9).add(0.3);
        const w = sideF.mul(patchF).mul(float(1.0).sub(fill)).mul(select(U.kind.lessThan(0.5), float(1.0), float(0.0)));
        add.subAssign(smoothstep(0.0, 0.25, f).sub(f).mul(T).mul(amp).mul(kd).mul(w).div(U.scale).mul(U.strata));
      });
      // 角ばった石（世界の長さで 2.6 と 1.2 のます）。クレーターの底と斜面の下に多い
      const Tq = normalize(cross(select(abs(nb.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0)), nb));
      const Bq = cross(nb, Tq);
      [[2.6, 0.06], [1.2, 0.07]].forEach(([C0, prob], si) => {
        const C = fs.mul(C0);
        const q = X.div(C); const cell = floor(q);
        Loop(27, ({ i }) => {
          const fi = float(i);
          const oz = floor(fi.div(9.0)); const oy = floor(fi.sub(oz.mul(9.0)).div(3.0)); const ox = fi.sub(oz.mul(9.0)).sub(oy.mul(3.0));
          const cc = cell.add(vec3(ox, oy, oz).sub(1.0));
          const hh = hash33(cc.add(sv.mul(11.0)).add(601.0 + si * 13.0));
          If(hh.x.lessThan(float(prob).mul(fill.mul(1.2).add(0.6))), () => {
            const ctr = cc.add(hash33(cc.add(611.0 + si)).mul(0.8).add(0.1)).mul(C);
            const R = hh.y.mul(0.2).add(0.22).mul(C);
            const v = X.sub(ctr);
            const th = hh.z.mul(6.283);
            const u1 = Tq.mul(th.cos()).add(Bq.mul(th.sin())); const u2 = cross(nb, u1);
            const linf = max(abs(dot(v, u1)), abs(dot(v, u2)).mul(hh.y.mul(0.6).add(0.8)));
            If(linf.lessThan(R).and(abs(dot(v, nb)).lessThan(R.mul(2.0))), () => {
              add.addAssign(smoothstep(R, R.mul(0.8), linf).mul(R).mul(0.85).div(U.scale).mul(U.stones));
            });
          });
        });
      });
      return add;
    };
    const { rr, crater, frac } = base.shapeCore(d, U.k, { extraH, boulderK: 0.35 });
    const rc = clamp(rr, 0.22, BOUND - 0.02);
    const rHi = floor(rc.mul(1024.0)).div(1024.0);
    return vec4(rHi, rc.sub(rHi).mul(1024.0), crater, frac);
  })();

  // ---- 2回目：法線・隙間の暗がり・半径−1・印（形の地図と同じ作り。隙間の暗がりは細かい形の大きさで調べる）----
  const { matN, matR } = makeDerivedMaterials({ srcTex: rtH.texture, uvOf: (dir) => localUV(dir), dirOf: localDir, ang: 5.0 / RES, aoRad: [0.005, 0.014, 0.036] }); // 隣を読む角度は約3画素（細い段の縁で、画素の並びの段差が法線に縞として出ない）
  const rtR = new THREE.RenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const rtN = new THREE.RenderTarget(W, H, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const quad = new THREE.QuadMesh(matH);

  // ますの割り当て（近い岩の鍵 → ます）。長く使っていないますから入れ替える
  const slotKey = new Array(slots).fill(null);
  const slotUsed = new Array(slots).fill(-1);
  let frame = 0;
  let bakedThisFrame = 0;
  let bakeMs = 0;

  function bake(slot, { k, seed, scale, kind }) {
    const t0 = performance.now();
    U.k.value = k; U.seed.value = seed; U.scale.value = scale; U.kind.value = kind;
    const prev = renderer.getRenderTarget();
    const prevClear = renderer.autoClear;
    quad.material = matH;
    renderer.setRenderTarget(rtH);
    quad.render(renderer);
    // ますの範囲だけに書く（他のますを消さないよう、消去はしない）
    renderer.autoClear = false;
    for (const [rt, m] of [[rtN, matN], [rtR, matR]]) {
      rt.viewport.set(slot * RES, 0, RES, RES);
      rt.scissor.set(slot * RES, 0, RES, RES);
      rt.scissorTest = true;
      quad.material = m;
      renderer.setRenderTarget(rt);
      quad.render(renderer);
    }
    renderer.autoClear = prevClear;
    renderer.setRenderTarget(prev);
    bakeMs = performance.now() - t0;
  }

  return {
    RES, PAD, W, H, atlasUV, slots, U,
    radiusTex: rtR.texture, normalTex: rtN.texture, maskTex: rtR.texture,
    radius: (dir, s) => texture(rtR.texture, atlasUV(dir, s)).level(0).x.add(1.0),
    // 頂点を押し出す用：ぼかした半径。頂点の間隔（物の座標で約 0.02）より細い段を頂点で押し出すと、
    // 段の縁が三角形の並びでのこぎり状になる。頂点はなだらかな形にし、切り立った段は法線と自分の影で見せる
    radiusSoft: (dir, s, w = 0.03) => {
      const T = normalize(cross(select(abs(dir.y).lessThan(0.99), vec3(0, 1, 0), vec3(1, 0, 0)), dir)); const B = cross(dir, T);
      const at = (v) => texture(rtR.texture, atlasUV(normalize(v), s)).level(0).x;
      let sum = at(dir).mul(2.0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2; const ca = Math.cos(a); const sa = Math.sin(a);
        const tv = T.mul(ca).add(B.mul(sa));
        sum = sum.add(at(dir.add(tv.mul(w * 0.5))).mul(1.5)).add(at(dir.add(tv.mul(w))));
      }
      return sum.div(2.0 + 6 * 2.5).add(1.0);
    },
    get bakeMs() { return bakeMs; },
    beginFrame() { frame++; bakedThisFrame = 0; },
    // 近い岩のますを返す。まだ焼いていなければ焼く（1コマに1つまで。焼けない時は -1）
    request(key, params) {
      let s = slotKey.indexOf(key);
      if (s >= 0) { slotUsed[s] = frame; return s; }
      if (bakedThisFrame >= 1) return -1;
      // 今のコマで使っていない、一番古います
      let best = -1; let bestT = Infinity;
      for (let i = 0; i < slots; i++) if (slotUsed[i] !== frame && slotUsed[i] < bestT) { best = i; bestT = slotUsed[i]; }
      if (best < 0) return -1;
      bake(best, params);
      slotKey[best] = key; slotUsed[best] = frame; bakedThisFrame++;
      return best;
    },
    dispose() { rtH.dispose(); rtR.dispose(); rtN.dispose(); for (const m of [matH, matN, matR]) m.dispose(); },
  };
}
