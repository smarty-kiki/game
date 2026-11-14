import * as THREE from 'three';
import {
  Fn, attribute, positionGeometry, modelViewMatrix, cameraProjectionMatrix, varying,
  vec3, vec4, abs, exp, mix, smoothstep, cross, normalize, length, select,
} from 'three/tsl';
import { glowNodeMaterial, nodeUniforms } from './soft.js';

// 世界に残る細い光の尾（多重誘導の弾・翼端の雲）。全部で1回の描画にまとめる。
// 位置は世界の座標で覚え、自機からの相対に直して描く。カメラへ向く帯にする。
function ribbonMaterial(U) {
  const aDir = attribute('aDir', 'vec3');
  const aSide = attribute('aSide', 'float');
  const aA = attribute('aA', 'float');
  const v = modelViewMatrix.mul(vec4(positionGeometry, 1.0));
  // カメラのすぐそばを通る所は消す（画面いっぱいの太い帯にしない）
  const vA = varying(aA.mul(smoothstep(2.5, 9.0, v.z.negate())), 'vA');
  const vSide = varying(aSide, 'vSide');
  // 帯の向きと視線の両方に直交する向きへ広げる。真っすぐこちらへ向かう所は向きが決まらないので横へ逃がす
  const d = modelViewMatrix.mul(vec4(aDir, 0.0)).xyz;
  const c = cross(normalize(d.add(1e-5)), normalize(v.xyz.negate()));
  const s = select(length(c).greaterThan(0.02), normalize(c), vec3(1.0, 0.0, 0.0));
  const p = v.xyz.add(s.mul(aSide).mul(U.uWidth).mul(aA.mul(0.75).add(0.25)));
  const vertexNode = cameraProjectionMatrix.mul(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const x = abs(vSide);
    const core = exp(x.mul(x).mul(-9.0));
    const a = core.mul(0.8).add(exp(x.mul(x).mul(-2.5)).mul(0.35)).mul(smoothstep(0.7, 1.0, x).oneMinus()).mul(vA).mul(U.uGain);
    return vec4(mix(U.uEdge, U.uCore, core).mul(1.9), a);
  })();
  return glowNodeMaterial(U, { vertexNode, fragmentNode });
}

export function createRibbons({ count, rows, spacing = 0.8, width = 0.12, core = [0.8, 1, 1], edge = [0.15, 0.55, 1], gain = 1, parent }) {
  const V = count * rows * 2;
  const pos = new Float32Array(V * 3);
  const dirA = new Float32Array(V * 3);
  const side = new Float32Array(V);
  const alpha = new Float32Array(V);
  const index = [];
  for (let c = 0; c < count; c++) {
    for (let r = 0; r < rows; r++) {
      const i = (c * rows + r) * 2;
      side[i] = -1; side[i + 1] = 1;
      if (r < rows - 1) index.push(i, i + 1, i + 2, i + 2, i + 1, i + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aDir', new THREE.BufferAttribute(dirA, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  g.setAttribute('aA', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(index);
  const mat = ribbonMaterial(nodeUniforms({ uWidth: width, uCore: new THREE.Color(...core), uEdge: new THREE.Color(...edge), uGain: gain }));
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  parent.add(mesh);

  // 1本ずつ：古い順の環状の点の並び。far は世界の座標、life は残りの濃さ
  const trails = [];
  for (let c = 0; c < count; c++) trails.push({ pts: [], acc: 0, last: null, on: false });

  return {
    mesh, trails,
    // c 番の尾の先頭を動かす。strength は新しい点の濃さ
    head(c, far, strength = 1) {
      const t = trails[c];
      t.on = true;
      if (!t.last) { t.last = far.slice(); t.pts.push({ far: far.slice(), a: strength }); return; }
      const d = Math.hypot(far[0] - t.last[0], far[1] - t.last[1], far[2] - t.last[2]);
      t.acc += d;
      t.last = far.slice();
      if (t.acc >= spacing) {
        t.acc = 0;
        t.pts.push({ far: far.slice(), a: strength });
        if (t.pts.length > rows - 1) t.pts.shift();
      }
    },
    release(c) { const t = trails[c]; t.on = false; t.last = null; t.acc = 0; },
    // decay は1秒に薄くなる量
    update(P, dt, decay = 1.6) {
      let any = false;
      for (let c = 0; c < count; c++) {
        const t = trails[c];
        for (const p of t.pts) p.a -= dt * decay;
        while (t.pts.length && t.pts[0].a <= 0) t.pts.shift();
        const n = t.pts.length + (t.on && t.last ? 1 : 0);
        for (let r = 0; r < rows; r++) {
          const i = (c * rows + r) * 2;
          const rr = Math.min(r, n - 1);
          const src = rr < 0 ? null : (rr < t.pts.length ? t.pts[rr] : { far: t.last, a: 1 });
          if (!src) { alpha[i] = 0; alpha[i + 1] = 0; continue; }
          const next = rr + 1 < t.pts.length ? t.pts[rr + 1].far : (t.on && t.last ? t.last : src.far);
          const prev = rr > 0 ? t.pts[rr - 1].far : src.far;
          const dx = next[0] - prev[0]; const dy = next[1] - prev[1]; const dz = next[2] - prev[2];
          const x = src.far[0] - P[0]; const y = src.far[1] - P[1]; const z = src.far[2] - P[2];
          // 尾の端は細く消す
          const a = r >= n ? 0 : Math.max(0, Math.min(1, src.a)) * Math.min(1, (rr + 1) / 4);
          for (const k of [i, i + 1]) {
            pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
            dirA[k * 3] = dx; dirA[k * 3 + 1] = dy; dirA[k * 3 + 2] = dz;
            alpha[k] = a;
          }
          if (a > 0) any = true;
        }
      }
      mesh.visible = any;
      if (any) {
        g.attributes.position.needsUpdate = true;
        g.attributes.aDir.needsUpdate = true;
        g.attributes.aA.needsUpdate = true;
      }
    },
    clear() {
      for (const t of trails) { t.pts.length = 0; t.on = false; t.last = null; t.acc = 0; }
      mesh.visible = false;
    },
  };
}
