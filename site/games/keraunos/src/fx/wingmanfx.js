import * as THREE from 'three';
import {
  Fn, attribute, positionGeometry, modelViewMatrix, cameraProjectionMatrix, varying,
  vec3, vec4, abs, exp, pow, max, mix, clamp, smoothstep, cross, normalize, length, dot, select,
} from 'three/tsl';
import { glowNodeMaterial, softUniforms, edgeMask, softFade } from './soft.js';

// 僚機の光の部品。どれも1回の描画で全機分を描く。
// - 光の点：航法灯（左が赤・右が緑・尾の白い点滅）、噴射口の光、砲口の閃光。遠くでも数画素は残る
// - 弾：僚機の金色の曳光弾と、追手の赤い弾。頭が明るく、尾へ細く消える
// 位置はどれもシーンの座標（自機が原点）で渡す。

const LIGHT_MAX = 24;
const BOLT_MAX = 64;

// 下の色に、出した色をそのまま足す（α を 0 で出すので、下の色は薄めない）
const BLEND = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation };

// 光の点：カメラへ向く四角を、灯1つに1枚のインスタンスで並べる
// aPos（位置）、aCol（色, 大きさ＝世界の単位）、aMisc（明るさ, 最小の画素数）
function lightMaterial() {
  const aPos = attribute('aPos', 'vec3');
  const aCol = attribute('aCol', 'vec4');
  const aMisc = attribute('aMisc', 'vec2');
  const mv = modelViewMatrix.mul(vec4(aPos, 1.0));
  // 1画素が世界でどれだけの大きさか。遠くても aMisc.y 画素より小さくしない
  const px = max(mv.z.negate(), 0.01).mul(2.0).div(cameraProjectionMatrix.element(1).y.mul(softUniforms.uRes.y));
  const s = max(aCol.w, aMisc.y.mul(px));
  // 広げた分だけ少し暗くする（遠くの灯が大きな玉にならない）。大きさ 0 の灯で 0 で割らない
  const vA = varying(aMisc.x.mul(mix(1.0, aCol.w.div(max(s, 1e-6)), 0.45)), 'vA');
  const vCol = varying(aCol.xyz, 'vCol');
  const vC = varying(positionGeometry.xy.mul(2.0), 'vC');
  const vertexNode = cameraProjectionMatrix.mul(vec4(mv.xy.add(positionGeometry.xy.mul(2.0).mul(s)), mv.z, mv.w));
  const fragmentNode = Fn(() => {
    const r = length(vC);
    const core = exp(r.mul(r).mul(-40.0)).mul(1.6);
    const halo = pow(max(0.0, r.oneMinus()), 3.0).mul(0.45);
    const col = mix(vCol, vec3(1.0), clamp(core.mul(0.35), 0.0, 1.0)).mul(core.add(halo));
    return vec4(col.mul(vA).mul(2.2).mul(edgeMask(vC)), 0.0);
  })();
  return glowNodeMaterial({}, { vertexNode, fragmentNode }, BLEND);
}

// 弾：頭から尾へ伸びる帯をインスタンスで並べる
// aOrigin（頭の位置）、aDir（進む向き）、aCol（色）、aShape（長さ, 太さ, 明るさ）。板の aT は尾 0〜頭 1、aSide は -1..1
function boltMaterial() {
  const aOrigin = attribute('aOrigin', 'vec3');
  const aDir = attribute('aDir', 'vec3');
  const aCol = attribute('aCol', 'vec3');
  const aShape = attribute('aShape', 'vec3');
  const aT = attribute('aT', 'float');
  const aSide = attribute('aSide', 'float');
  const headV = modelViewMatrix.mul(vec4(aOrigin, 1.0));
  const axisV = normalize(modelViewMatrix.mul(vec4(aDir, 0.0)).xyz);
  const toCam = normalize(headV.xyz.negate());
  const c = cross(axisV, toCam);
  const sideV = select(length(c).greaterThan(0.05), normalize(c), vec3(1.0, 0.0, 0.0));
  // 真っすぐこちらへ向かう弾は、帯を短く細くして点に近づける
  const facing = abs(dot(axisV, toCam)).oneMinus();
  const side = smoothstep(0.02, 0.3, facing);
  const w = aShape.y.mul(aT.mul(0.7).add(0.3)).mul(mix(0.3, 1.0, side));
  const p = headV.xyz.sub(axisV.mul(aT.oneMinus().mul(aShape.x).mul(mix(0.3, 1.0, side)))).add(sideV.mul(aSide).mul(w));
  const vA = varying(aShape.z.mul(smoothstep(1.5, 6.0, p.z.negate())), 'vA');
  const vDist = varying(p.z.negate(), 'vViewDist');
  const vCol = varying(aCol, 'vCol');
  const vT = varying(aT, 'vT');
  const vSide = varying(aSide, 'vSide');
  const vertexNode = cameraProjectionMatrix.mul(vec4(p, 1.0));
  const fragmentNode = Fn(() => {
    const x = abs(vSide);
    const core = exp(x.mul(x).div(0.06).negate());
    const glow = exp(x.mul(x).mul(-2.4)).mul(0.45);
    const head = smoothstep(0.75, 1.0, vT);
    const a = core.mul(head.mul(1.5).add(0.7)).add(glow.mul(head.mul(0.8).add(0.3))).mul(pow(vT, 1.6)).mul(vA);
    const col = mix(vCol, vec3(1.0, 0.97, 0.88), clamp(core.mul(head), 0.0, 1.0).mul(0.8));
    return vec4(col.mul(2.4).mul(a).mul(softFade(0.04, vDist)), 0.0);
  })();
  return glowNodeMaterial({}, { vertexNode, fragmentNode }, BLEND);
}

function instanced(base, max, attrs) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
  const out = {};
  for (const [name, n] of attrs) {
    out[name] = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(name, out[name]);
  }
  g.instanceCount = 0;
  return { g, a: out };
}

function stripBase(rows) {
  const g = new THREE.BufferGeometry();
  const pos = []; const aT = []; const aSide = []; const idx = [];
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    for (const s of [-1, 1]) { pos.push(0, 0, 0); aT.push(t); aSide.push(s); }
  }
  for (let r = 0; r < rows - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(aSide, 1));
  g.setIndex(idx);
  return g;
}

export const WING_COLORS = {
  shot: [1.0, 0.86, 0.32],      // 僚機の弾：金色（自機の青緑・敵の赤橙と分ける）
  enemy: [1.0, 0.16, 0.06],
  red: [1.0, 0.1, 0.06],
  green: [0.15, 1.0, 0.35],
  white: [0.95, 0.97, 1.0],
  engine: [0.35, 0.75, 1.0],
  muzzle: [1.0, 0.85, 0.5],
};

export function createWingFx({ scene }) {
  const L = instanced(new THREE.PlaneGeometry(1, 1), LIGHT_MAX, [['aPos', 3], ['aCol', 4], ['aMisc', 2]]);
  const lightMesh = new THREE.Mesh(L.g, lightMaterial());
  lightMesh.frustumCulled = false;
  lightMesh.renderOrder = 9;
  scene.add(lightMesh);

  const B = instanced(stripBase(5), BOLT_MAX, [['aOrigin', 3], ['aDir', 3], ['aCol', 3], ['aShape', 3]]);
  const boltMesh = new THREE.Mesh(B.g, boltMaterial());
  boltMesh.frustumCulled = false;
  boltMesh.renderOrder = 7;
  scene.add(boltMesh);

  const bolts = [];
  let nl = 0;

  // 毎コマ、灯をはじめから置き直す
  function beginLights() { nl = 0; }
  function light(p, col, size, alpha, minPx = 3) {
    if (nl >= LIGHT_MAX || alpha <= 0.002) return;
    L.a.aPos.setXYZ(nl, p.x, p.y, p.z);
    L.a.aCol.setXYZW(nl, col[0], col[1], col[2], size);
    L.a.aMisc.setXY(nl, alpha, minPx);
    nl += 1;
  }
  function endLights() {
    L.g.instanceCount = nl;
    for (const k of ['aPos', 'aCol', 'aMisc']) L.a[k].needsUpdate = true;
  }

  // 弾：from（世界の座標）から target（{ rel } を毎コマ読む）へ曲がりながら飛ぶ。届いたら onArrive
  // miss を与えると、狙いからその分だけ外れた所を通り過ぎる（追手の弾）
  function fire(fromWorld, target, opts) {
    if (bolts.length >= BOLT_MAX) bolts.shift();
    bolts.push({ w: fromWorld.slice(), target, dir: opts.dir || [0, 0, 1], speed: opts.speed || 260, col: opts.col, len: opts.len || 4, width: opts.width || 0.22, age: 0, life: opts.life || 1.2, onArrive: opts.onArrive || null, miss: opts.miss || null, homing: opts.homing ?? 1 });
  }

  const _t = new THREE.Vector3();
  function update(dt, P) {
    let n = 0;
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.age += dt;
      if (b.age > b.life) { bolts.splice(i, 1); continue; }
      const sx = b.w[0] - P[0]; const sy = b.w[1] - P[1]; const sz = b.w[2] - P[2];
      if (b.target && b.homing > 0) {
        _t.copy(b.target.rel);
        if (b.miss) _t.add(b.miss);
        let dx = _t.x - sx; let dy = _t.y - sy; let dz = _t.z - sz;
        const d = Math.hypot(dx, dy, dz) || 1;
        const step = b.speed * dt;
        if (d <= step) {
          if (b.onArrive) b.onArrive([_t.x, _t.y, _t.z], b.dir);
          if (!b.miss) { bolts.splice(i, 1); continue; }
          b.homing = 0;
        } else {
          dx /= d; dy /= d; dz /= d;
          const k = Math.min(1, dt * 14 * b.homing);
          b.dir = [b.dir[0] + (dx - b.dir[0]) * k, b.dir[1] + (dy - b.dir[1]) * k, b.dir[2] + (dz - b.dir[2]) * k];
          const l = Math.hypot(...b.dir) || 1;
          b.dir = b.dir.map((v) => v / l);
        }
      }
      const step = b.speed * dt;
      b.w[0] += b.dir[0] * step; b.w[1] += b.dir[1] * step; b.w[2] += b.dir[2] * step;
      if (n >= BOLT_MAX) continue;
      const fade = 1 - Math.max(0, (b.age - b.life + 0.2) / 0.2);
      B.a.aOrigin.setXYZ(n, b.w[0] - P[0], b.w[1] - P[1], b.w[2] - P[2]);
      B.a.aDir.setXYZ(n, b.dir[0], b.dir[1], b.dir[2]);
      B.a.aCol.setXYZ(n, b.col[0], b.col[1], b.col[2]);
      B.a.aShape.setXYZ(n, Math.min(b.len, 0.2 + b.age * b.speed), b.width, fade);
      n += 1;
    }
    B.g.instanceCount = n;
    for (const k of ['aOrigin', 'aDir', 'aCol', 'aShape']) B.a[k].needsUpdate = true;
  }

  return { beginLights, light, endLights, fire, update, get bolts() { return bolts.length; } };
}
