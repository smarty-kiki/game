import * as THREE from 'three';
import { STAR_DIR } from '../scenes.js';
import {
  Fn, vec2, vec3, vec4, float, texture, texture3D, screenUV, screenCoordinate, positionGeometry, attribute, instancedBufferAttribute,
  varying, uv, atan, asin, clamp, mix, smoothstep, fract, abs, normalize, dot, exp, max, sin, length, select, Loop, If, Continue,
} from 'three/tsl';
import { noise3D, flushTextures } from './skyNoise.js';
import { nodeUniforms, smoothstepR } from './soft.js';

// 星空と星雲。空は動かす：低い解像度の画面へ毎コマ描いて（画面の大半が空なので、ここで重さを抑える）、引き伸ばして貼る。
// 全天の絵を流れの場で歪ませて流し（2つの位相を重ねるので伸びきらない）、3次元の雑音の雲を重ね、内側の塊を脈打たせる。

// 全天の画像を読む座標（経度・緯度）
const eq = (d) => vec2(atan(d.z, d.x).div(6.2831853).add(0.5), asin(clamp(d.y, -1.0, 1.0)).div(3.1415927).add(0.5));

// 低い解像度の空の色。U は uniform の表、N は3次元の雑音
function skyColorNode(U, N) {
  const n3 = (p) => texture3D(N, p);
  const panoAt = (d) => {
    const uv = eq(d);
    // 写真の色味を場面の色へ寄せる（xyz=色、w=寄せる強さ。明るさは保つ）
    const tint = (c, T) => mix(c, vec3(dot(c, vec3(0.3, 0.59, 0.11))).mul(T.xyz).mul(1.4), T.w);
    return mix(tint(U.uPano.sample(uv).rgb, U.uPanoT).mul(U.uPanoK), tint(U.uPanoB.sample(uv).rgb, U.uPanoTB).mul(U.uPanoKB), U.uPanoMix);
  };
  return Fn(() => {
    // 描いている画素の向き。screenUV は左上が原点なので、上下を返して画面の座標（-1..1）にする。
    // 引き伸ばす側も screenUV で読むので、WebGPU と WebGL2 のどちらでも上下がそろう
    const ndc = vec2(screenUV.x.mul(2.0).sub(1.0), screenUV.y.oneMinus().mul(2.0).sub(1.0));
    const v = U.uIP.mul(vec4(ndc, 1.0, 1.0));
    const d = normalize(U.uCam.mul(v.xyz.div(v.w))).toVar();
    const t = U.uTime;
    const up = clamp(d.y.mul(0.5).add(0.5), 0.0, 1.0);
    const base = mix(U.uBase0, U.uBase1, up.mul(up)).toVar();
    // 流れの場：空の面に沿う向きだけを使う。場そのものも少しずつ変わる
    const F = n3(d.mul(0.42).add(vec3(0.0, t.mul(0.0035), t.mul(0.005)))).rgb.sub(0.5).toVar();
    F.addAssign(n3(d.mul(1.05).sub(vec3(t.mul(0.006), 0.0, 0.0))).gbr.sub(0.5).mul(0.5));
    F.subAssign(d.mul(dot(F, d)));
    const ph = fract(t.mul(U.uFlow));
    const ph2 = fract(ph.add(0.5));
    const wA = float(1.0).sub(abs(ph.mul(2.0).sub(1.0)));
    const dA = normalize(d.add(F.mul(ph.sub(0.5)).mul(U.uAmp))).toVar();
    const dB = normalize(d.add(F.mul(ph2.sub(0.5)).mul(U.uAmp)));
    const pano = panoAt(dA).mul(wA).add(panoAt(dB).mul(wA.oneMinus()));
    // 雲の濃さの焼いた画像も、ゆっくり歪ませる
    const cl = U.uClouds.sample(eq(dA)).rgb;
    const neb = mix(U.uNebA, U.uNebB, smoothstep(0.34, 0.86, cl.r)).toVar();
    const c2 = smoothstep(0.58, 1.0, cl.g);
    const c3 = smoothstep(0.55, 1.0, cl.b);
    neb.addAssign(U.uNebC.mul(c2.mul(c2).mul(0.30)).add(U.uNebD.mul(c3.mul(c3).mul(c3).mul(0.28))));
    // 雑音の雲：自機が進むと近い層ほど大きくずれる（uTravel）
    const w1 = n3(d.mul(0.45).add(U.uTravel.mul(0.5)).add(vec3(t.mul(0.009), 0.0, t.mul(-0.006)))).rgb.sub(0.5).toVar();
    // 雲を体積として光線で進む。手前から奥へ足し、手前の雲が奥の絵と雲を隠す
    const back = base.add(neb.mul(U.uNebK).mul(0.35)).mul(0.30).add(pano);
    const acc = vec3(0.0).toVar();
    const T = float(1.0).toVar();
    const STEPS = 7;
    Loop(STEPS, ({ i }) => {
      const u = float(i).add(0.5).div(STEPS);
      const p = d.mul(u.mul(1.15).add(0.55)).add(U.uTravel).add(w1.mul(0.42)).toVar();
      const a0 = n3(p.mul(0.62).add(vec3(0.0, t.mul(0.0045), 0.0))).toVar();
      const den = a0.r.mul(0.62).add(n3(p.mul(1.7).add(a0.rgb.sub(0.5).mul(0.16)).sub(vec3(t.mul(0.008), 0.0, t.mul(0.006)))).g.mul(0.38));
      const rho = smoothstep(0.56, 0.84, den).toVar();
      If(rho.lessThan(0.003), () => { Continue(); });
      // 太陽の向きへ1点だけ見て、自己影の量を出す
      const shade = n3(p.add(U.uSunD.mul(0.22)).mul(0.62).add(vec3(0.0, t.mul(0.0045), 0.0))).r;
      const lit = exp(max(shade.sub(0.38), 0.0).mul(-4.2));
      // ライトランプ：影は深い地の色、中間は幕の色、よく照らされた縁は熱い色
      const ramp0 = mix(base.mul(0.5).add(U.uVeil.mul(0.08)), U.uVeil.mul(0.9), smoothstep(0.08, 0.55, lit));
      const ramp = mix(ramp0, U.uVeil.mul(0.8).add(U.uGlow.mul(0.30).mul(U.uGlowK)), smoothstep(0.62, 0.98, lit));
      // 内側の光：塊ごとにずれた周期で息をする
      const pk = smoothstep(0.50, 0.88, a0.a);
      const beat = sin(t.mul(0.8).add(a0.b.mul(16.0))).mul(0.5).add(0.5);
      const em = U.uGlow.mul(U.uGlowK).mul(pk).mul(beat.mul(beat).mul(0.92).add(0.08)).mul(0.85);
      const ab = float(1.0).sub(exp(rho.mul(-0.42).mul(U.uVeilK)));
      acc.addAssign(ramp.add(em).mul(T.mul(ab)));
      T.mulAssign(ab.oneMinus());
    });
    const col = back.mul(mix(T.mul(0.38).add(0.62), 1.0, U.uVeilK.oneMinus())).add(acc);
    return vec4(col, 1.0);
  })();
}

// 星の色と明るさ（頂点で計算して渡す）。色温度：多くは白、少しだけ青と橙
function starColorNode(mag, temp, starU) {
  const warm = mix(vec3(1.0, 0.72, 0.5), vec3(1.0, 0.93, 0.85), temp.div(0.3));
  const cool = mix(vec3(0.96, 0.97, 1.0), vec3(0.68, 0.8, 1.0), temp.sub(0.3).div(0.7));
  const c = select(temp.lessThan(0.3), warm, cool);
  // 明るい星だけ、ごくわずかに瞬く
  const b = mag.mul(1.5).add(0.16).mul(float(1.0).sub(mag.mul(0.18).mul(sin(starU.uTime.mul(1.7).add(temp.mul(90.0))).mul(0.5).add(0.5))));
  return c.mul(b).mul(starU.uStarK);
}
// 星の大きさ（画面の画素。高い画素比では three が掛ける）
const starSize = (mag) => mag.mul(mag).mul(2.4).add(1.15);
// 1画素の点で描く暗い星：大きさ s の丸い点が画素に落とす光の総量（s² × 0.3246）を1画素へまとめる
const STAR_DISC = 0.3246;
// これより大きい星（画素比 1 のとき）は、大きさのある板で描く
const STAR_SPRITE_PX = 1.6;

// 丸い光の点を描く板（THREE.Sprite の形の代わり）。四角の2枚でなく、丸を内に含む三角形1枚にして三角形の数を半分にする。
// 頂点は中心から 1（点の直径）の所。uv は位置 + 0.5 なので、uv() - 0.5 の長さが中心からの距離（0.5 で丸の縁）になる
export function discTriangle() {
  const g = new THREE.BufferGeometry();
  const p = [0, 1, 0, -0.8660254, -0.5, 0, 0.8660254, -0.5, 0];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([p[0] + 0.5, p[1] + 0.5, p[3] + 0.5, p[4] + 0.5, p[6] + 0.5, p[7] + 0.5], 2));
  return g;
}

const DEFAULT_MOTION = { flow: 0.05, amp: 0.3, veilK: 0.9, veil: [0.018, 0.014, 0.034], glow: [0.10, 0.075, 0.20], glowK: 0.8 };

export function createBackground(scene, sunDir) {
  // 全天の画像は縮小の段（mip）を作らない：経度の継ぎ目に線が出ないように
  const skyTex = (url) => {
    const t = new THREE.TextureLoader().load(url);
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  };
  // 区間ごとの全天の写真。切り替えの間は2枚を重ねる
  const panos = {};
  for (const [k, f] of [['nebula', 'nebula'], ['grave', 'pano_grave'], ['base', 'pano_base'], ['line', 'pano_line']]) {
    panos[k] = skyTex(`./assets/sky/${f}.jpg`);
    panos[k].colorSpace = THREE.SRGBColorSpace;
  }
  const uniforms = nodeUniforms({
    uBase0: new THREE.Color(0.0022, 0.0032, 0.011),
    uBase1: new THREE.Color(0.010, 0.015, 0.042),
    uNebA: new THREE.Color(0.010, 0.012, 0.036),
    uNebB: new THREE.Color(0.045, 0.022, 0.090),
    uNebC: new THREE.Color(0.14, 0.05, 0.02),
    uNebD: new THREE.Color(0.025, 0.10, 0.22),
    uNebK: 0.8,
    uPano: panos.nebula,
    uClouds: skyTex('./assets/sky/clouds.jpg'),
    uPanoK: 1.05,
    uPanoB: panos.nebula,
    uPanoKB: 1.05,
    uPanoMix: 0,
    uPanoT: new THREE.Vector4(1, 1, 1, 0),
    uPanoTB: new THREE.Vector4(1, 1, 1, 0),
    uIP: new THREE.Matrix4(),
    uCam: new THREE.Matrix3(),
    uTime: 0,
    uTravel: new THREE.Vector3(),
    uFlow: DEFAULT_MOTION.flow,
    uAmp: DEFAULT_MOTION.amp,
    uVeilK: DEFAULT_MOTION.veilK,
    uVeil: new THREE.Color(...DEFAULT_MOTION.veil),
    uGlow: new THREE.Color(...DEFAULT_MOTION.glow),
    uGlowK: DEFAULT_MOTION.glowK,
    uSunD: sunDir.clone(),
  });
  // 同じ画像を指す画像の uniform は、材質を組む時に1つへまとめられる（あとで片方を差し替えても効かない）。
  // 区間の切り替えで2枚を別々に差し替えるので、まとめさせない
  uniforms.uPano.mergeable = false;
  uniforms.uPanoB.mergeable = false;
  // 空を描く低解像度の画面
  const skyRT = new THREE.RenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  // 画面全体を覆う1枚の三角形（頂点は画面の座標のまま）
  const fullTri = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const screenVertex = vec4(positionGeometry.xy, 0.5, 1.0);
  const skyMat = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  skyMat.vertexNode = screenVertex;
  skyMat.fragmentNode = skyColorNode(uniforms, noise3D());
  const skyScene = new THREE.Scene();
  const skyQuad = new THREE.Mesh(fullTri, skyMat);
  skyQuad.frustumCulled = false;
  skyScene.add(skyQuad);
  const skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // WebGPU は投影の更新を持つカメラが要る
  const skySize = new THREE.Vector2();
  // 確認用（ソフトウェア描画）は光線の計算が重いので低い解像度で描く。実機は 540
  const SKY_H = Number(new URLSearchParams(location.search).get('skyh')) || (new URLSearchParams(location.search).has('test') ? 200 : 480);
  // 低い解像度に描いた空を画面へ引き伸ばす。画面全体の三角形を、ほかの物より先に描く
  const showMat = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false, fog: false });
  showMat.vertexNode = screenVertex;
  showMat.fragmentNode = Fn(() => {
    const col = texture(skyRT.texture, screenUV).rgb;
    // 暗い階調の縞を消す、ごく弱いばらつき
    const dn = fract(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715))).mul(52.9829189));
    return vec4(col.add(dn.sub(0.5).div(255.0)), 1.0);
  })();
  const mesh = new THREE.Mesh(fullTri, showMat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);

  // 星：assets/sky/stars.bin（tools/bake_sky.py）の一覧。WebGPU の点は1画素なので、
  // 暗い星は1画素の点に光の総量をまとめ、大きい星は大きさのある板（1回の描画で全部）で描く。
  // 画素比が 1 より大きい画面では、どの星も1画素より大きいので、全部を板で描く
  const starU = nodeUniforms({ uStarK: 1, uTime: 0 });
  const starAdd = { transparent: false, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false };
  const starPoints = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsNodeMaterial(starAdd));
  const starSprites = new THREE.Sprite(new THREE.PointsNodeMaterial({ ...starAdd, sizeAttenuation: false }));
  starSprites.geometry = discTriangle();
  let starN = 0; let starBright = 0;
  // 不透明の一覧のまま足し合わせて、空の一部として基地より先に描く
  for (const o of [starPoints, starSprites]) { o.frustumCulled = false; o.renderOrder = -9.5; o.visible = false; scene.add(o); }
  // 読み終わりを starsReady で返し、main.js の読み込み完了で待つ（下準備で星のシェーダーも作る。spec REQ-013）
  const starsReady = fetch('./assets/sky/stars.bin').then((r) => (r.ok ? r.arrayBuffer() : null)).then((buf) => {
    if (!buf) return;
    const n = Math.floor(buf.byteLength / 8);
    const raw = new DataView(buf);
    // 明るい順に並べ、前の starBright 個を板で、残りを点で描く
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => raw.getUint8(b * 8 + 6) - raw.getUint8(a * 8 + 6));
    const pos = new Float32Array(n * 3); const mag = new Float32Array(n); const temp = new Float32Array(n);
    const magMin = Math.sqrt((STAR_SPRITE_PX - 1.15) / 2.4);
    order.forEach((src, i) => {
      const o = src * 8;
      pos[i * 3] = raw.getInt16(o, true) / 32767 * 85;
      pos[i * 3 + 1] = raw.getInt16(o + 2, true) / 32767 * 85;
      pos[i * 3 + 2] = raw.getInt16(o + 4, true) / 32767 * 85;
      mag[i] = raw.getUint8(o + 6) / 255;
      temp[i] = raw.getUint8(o + 7) / 255;
      if (mag[i] > magMin) starBright = i + 1;
    });
    starN = n;
    // 点：頂点ごとに色を出し、1画素へ光の総量をまとめる
    const g = starPoints.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
    g.setAttribute('aTemp', new THREE.BufferAttribute(temp, 1));
    g.setDrawRange(starBright, n - starBright);
    const pm = attribute('aMag', 'float');
    const ps = starSize(pm);
    starPoints.material.colorNode = varying(starColorNode(pm, attribute('aTemp', 'float'), starU).mul(ps.mul(ps).mul(STAR_DISC)), 'vStarC');
    // 板：大きさは画面の画素で決める。写真を引き伸ばさないので、どの解像度でも鋭い
    const sm = instancedBufferAttribute(new THREE.InstancedBufferAttribute(mag, 1), 'float');
    const sMat = starSprites.material;
    sMat.positionNode = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3), 'vec3');
    sMat.sizeNode = starSize(sm);
    const sc = varying(starColorNode(sm, instancedBufferAttribute(new THREE.InstancedBufferAttribute(temp, 1), 'float'), starU), 'vStarC');
    sMat.colorNode = sc.mul(smoothstepR(0.5, 0.12, length(uv().sub(0.5))));
    starPoints.material.needsUpdate = true; sMat.needsUpdate = true;
    starPoints.visible = true; starSprites.visible = true;
  }).catch((e) => console.error(e));

  // 遠くの恒星（左上の奥）。構図の目印と、光の来る向きの手がかり
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0.0, 'rgba(255,250,240,1)'); grad.addColorStop(0.06, 'rgba(255,236,200,0.95)');
  grad.addColorStop(0.18, 'rgba(255,170,90,0.35)'); grad.addColorStop(0.5, 'rgba(255,120,50,0.06)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,220,180,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a2 = i * Math.PI / 3 + 0.2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a2) * 120, 128 + Math.sin(a2) * 120); g.stroke(); }
  const starTex = new THREE.CanvasTexture(cv); starTex.colorSpace = THREE.SRGBColorSpace;
  const sunSprite = new THREE.Sprite(new THREE.SpriteNodeMaterial({ fog: false, map: starTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: false }));
  sunSprite.position.copy(sunDir).multiplyScalar(85); sunSprite.scale.setScalar(16); sunSprite.renderOrder = -9;
  scene.add(sunSprite);

  // 大きな恒星のまわりにあふれる光（筋のない丸いぼかし）
  const hc = document.createElement('canvas'); hc.width = hc.height = 256;
  const hg = hc.getContext('2d');
  const hgr = hg.createRadialGradient(128, 128, 0, 128, 128, 128);
  hgr.addColorStop(0, 'rgba(255,255,255,0.55)'); hgr.addColorStop(0.3, 'rgba(255,255,255,0.42)'); hgr.addColorStop(0.5, 'rgba(255,255,255,0.14)'); hgr.addColorStop(1, 'rgba(0,0,0,0)');
  hg.fillStyle = hgr; hg.fillRect(0, 0, 256, 256);
  const haloTex = new THREE.CanvasTexture(hc); haloTex.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(new THREE.SpriteNodeMaterial({ fog: false, map: haloTex, color: new THREE.Color(1.0, 0.22, 0.05), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
  halo.position.set(...STAR_DIR).normalize().multiplyScalar(85); halo.scale.setScalar(82); halo.renderOrder = -7.5; halo.visible = false;
  scene.add(halo);

  return {
    mesh,
    starsReady,
    update(state, dt, camera, renderer, P) {
      starU.uTime.value = state.time;
      if (camera && renderer && starN) {
        // 高い画素比の画面は全部を板で、画素比 1 は明るい星だけを板で描く
        const all = renderer.getPixelRatio() > 1.01;
        starSprites.count = all ? starN : starBright;
        starPoints.visible = !all;
      }
      if (camera && renderer) {
        flushTextures(renderer);
        renderer.getDrawingBufferSize(skySize);
        const h = Math.min(SKY_H, skySize.y);
        const w = Math.max(2, Math.round(skySize.x * h / Math.max(1, skySize.y)));
        if (skyRT.width !== w || skyRT.height !== h) skyRT.setSize(w, h);
        uniforms.uIP.value.copy(camera.projectionMatrixInverse);
        uniforms.uCam.value.setFromMatrix4(camera.matrixWorld);
        uniforms.uTime.value = state.time;
        // 道を進むと近い雲の層がずれる。遠くから自機のまわりへ開いていくように、進む向きに動かす
        if (P) uniforms.uTravel.value.set(P[0] * 0.00012, P[1] * 0.00012, P[2] * 0.00012);
        const prev = renderer.getRenderTarget();
        renderer.setRenderTarget(skyRT);
        renderer.render(skyScene, skyCam);
        renderer.setRenderTarget(prev);
      }
    },
    // シーンの空：地の色・星雲の4色と濃さ・星の明るさ・恒星の向きと色
    setSky(sky, sunDir) {
      for (const k of ['Base0', 'Base1', 'NebA', 'NebB', 'NebC', 'NebD']) uniforms['u' + k].value.setRGB(...sky[k[0].toLowerCase() + k.slice(1)]);
      uniforms.uNebK.value = sky.nebK;
      starU.uStarK.value = sky.starK;
      sunSprite.position.copy(sunDir).multiplyScalar(85);
      sunSprite.scale.setScalar(sky.sunSize || 16);
      sunSprite.material.color.setRGB(...(sky.sunTint || [1, 1, 1]));
    },
    // 道の区間の間を混ぜる。a・b は REGIONS の項目、t は 0〜1。恒星の絵は移動中だけ薄くする
    setBlend(a, b, t, sunDir) {
      const mix3 = (u, x, y) => u.setRGB(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
      for (const k of ['Base0', 'Base1', 'NebA', 'NebB', 'NebC', 'NebD']) { const n = k[0].toLowerCase() + k.slice(1); mix3(uniforms['u' + k].value, a.sky[n], b.sky[n]); }
      uniforms.uNebK.value = a.sky.nebK + (b.sky.nebK - a.sky.nebK) * t;
      starU.uStarK.value = a.sky.starK + (b.sky.starK - a.sky.starK) * t;
      uniforms.uPano.value = panos[a.pano]; uniforms.uPanoK.value = a.panoK;
      uniforms.uPanoB.value = panos[b.pano]; uniforms.uPanoKB.value = b.panoK;
      uniforms.uPanoMix.value = t;
      uniforms.uPanoT.value.set(...(a.panoTint || [1, 1, 1]), a.panoTint ? (a.panoTintK ?? 0.8) : 0);
      uniforms.uPanoTB.value.set(...(b.panoTint || [1, 1, 1]), b.panoTint ? (b.panoTintK ?? 0.8) : 0);
      uniforms.uSunD.value.copy(sunDir);
      const am = a.mot || DEFAULT_MOTION; const bm = b.mot || DEFAULT_MOTION;
      for (const k of ['flow', 'amp', 'veilK', 'glowK']) uniforms['u' + k[0].toUpperCase() + k.slice(1)].value = am[k] + (bm[k] - am[k]) * t;
      mix3(uniforms.uVeil.value, am.veil, bm.veil);
      mix3(uniforms.uGlow.value, am.glow, bm.glow);
      sunSprite.position.copy(sunDir).multiplyScalar(85);
      sunSprite.scale.setScalar(a.sky.sunSize + (b.sky.sunSize - a.sky.sunSize) * t);
      mix3(sunSprite.material.color, a.sky.sunTint, b.sky.sunTint);
      const vis = (a.sunVis + (b.sunVis - a.sunVis) * t) * (1 - Math.sin(Math.PI * t));
      sunSprite.material.opacity = vis;
      sunSprite.visible = vis > 0.01;
      const h = (a.halo || 0) + ((b.halo || 0) - (a.halo || 0)) * t;
      halo.material.opacity = h * 0.3;
      halo.visible = h > 0.01;
    },
    reset() {},
  };
}
