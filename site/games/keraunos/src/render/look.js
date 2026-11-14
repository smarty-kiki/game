// 見え方の底上げ（光・影・空気・映り込み・画面の仕上げ）の入口。遊ぶ画面の main.js から ?look=1 のときだけ呼ばれる。
//
// main.js 側の約束：
//   const look = await createLook({ renderer, scene, camera, scenePass, sun, rim, hemi, params, backend });
//   const distorted = distortionPass.build(look.sceneColor);      // 歪みの段へ渡す場面の色（テクスチャの node）
//   look.attach(renderPipeline);
//   renderPipeline.outputNode = look.finish(distorted, bloomPass); // 発光の後ろの仕上げ（トーンマップと sRGB まで持つ）
//   毎コマ renderPipeline.render() の前に look.update(state, fly, { boost, flash })（読むだけ）
//
// 段の流れ：場面 → 背景を落ち着かせる・接地の暗がり・霞の輝き → 光の筋 →（歪み・発光は main.js）→ 光の筋とゴースト →
//          目の慣れ → トーンマップ（AgX）→ 色の調整 → sRGB → 粒子感。影は段ごとの影（CSM）、塵は場面に1回の描画で足す。
//
// 確認用の引数：
//   lookq=high|mid|low … 設定の段（既定は high）
//   lk=名前,…         … 使う効果を名前で選ぶ（grade sky contact haze shafts csm streak ghosts dust adapt grain）。lk=none で全部切る
//   lkoff=名前,…      … 段の既定から外す
//   tm=agx|aces|neutral … トーンマップ
//   lookview=contact|shafts|streak|fine … その段だけを映す（fine は光の筋の1段目）
//
// 場面ごとの設定（createLook の preset）：space（遊ぶ画面・大蛇の確認ページ）、hangar（格納庫）、ground（地上。地形の試作が持つ
// 霞・光の筋・映り込み・時間方向のアンチエイリアスはそのまま使い、こちらはトーンマップ・色・光の筋の横伸び・塵・接地の暗がりだけを足す）
import * as THREE from 'three';
import { uniform, convertToTexture, perspectiveDepthToViewZ, vec2 } from 'three/tsl';
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { buildAtmosphere } from './atmosphere.js';
import { buildFinish } from './finish.js';
import { setupShadows } from './shadows.js';
import { createDust } from './dust.js';
import { createBursts } from './gpuParticles.js';
import { TOUCH } from '../touch.js';

// 既定で入れる効果。段ごとの影（csm）・継ぎ目の暗がり（contact）・光の釣り合い（balance）・爆発の粒（bursts）は、
// 國松の指摘（大きな物の中が真っ黒・機体に意味のない黒いまだら・画面が暗い・読み込みが長い）で既定から外した。lk= で個別に試せる
// レンズのゴースト（ghosts）も、撃つたびに銃口の光の反対側へ丸い光が出て余計に見える、との國松の指摘（11/8）で既定から外した
const ALL = ['grade', 'sky', 'haze', 'shafts', 'streak', 'dust', 'adapt', 'grain'];
export const TIERS = {
  high: { fx: ALL, rs: 1.0, rsMin: 0.62, csmCascades: 4, csmMap: 2048, contactPairs: 8, contactScale: 0.5, shaftSamples: 48, streakTaps: 12, dust: 2400 },
  mid: { fx: ALL.filter((f) => f !== 'ghosts'), rs: 0.9, rsMin: 0.6, csmCascades: 3, csmMap: 1024, contactPairs: 6, contactScale: 0.5, shaftSamples: 32, streakTaps: 10, dust: 1400 },
  low: { fx: ['grade', 'sky', 'haze', 'shafts', 'streak', 'adapt'], rs: 0.8, rsMin: 0.55, csmCascades: 0, csmMap: 1024, contactPairs: 4, contactScale: 0.35, shaftSamples: 24, streakTaps: 8, dust: 0 },
};

// 場面ごとに使う効果（段に含まれるものだけ使う。dof は段に関係なく格納庫だけ）と、既定の値
export const PRESETS = {
  space: { fx: null, values: {} },
  hangar: {
    fx: ['balance', 'grade', 'contact', 'streak', 'dust', 'grain'],
    values: { sunk: 1.25, hemik: 0.85, envk: 1.0, contactr: 0.035, contactk: 2.0, exposure: 1.15, vignette: 0.3, sat: 0.88, contrast: 1.15, streakk: 0.6, blackpt: 0.008, grain: 0.012, focusat: [0, 0.3, 0],
      dustbox: [7, 4, 9], dustahead: 2.5, dustsize: 0.35, dustdrift: 0.12, dustk: 1.4, bokeh: 1.2, focallen: 1.6 },
  },
  ground: {
    fx: ['grade', 'streak', 'dust', 'grain'],
    values: { sat: 0.86, contrast: 1.15, splitk: 0.08, vignette: 0.2, grain: 0.025, streakk: 0.35,
      dustbox: [60, 30, 120], dustahead: 40, dustsize: 1.0, dustdrift: 0.4, dustk: 0.6 },
  },
};

export async function createLook({ renderer, scene, camera, scenePass, sun, hemi, params, preset = 'space' }) {
  const P = PRESETS[preset] || PRESETS.space;
  const tierName = TIERS[params.get('lookq')] ? params.get('lookq') : 'high';
  const tier = TIERS[tierName];
  const lk = params.get('lk');
  const base = P.fx ? P.fx.filter((f) => f === 'dof' || tier.fx.includes(f)) : tier.fx;
  const on = new Set(lk === 'none' ? [] : (lk ? lk.split(',') : base));
  for (const f of (params.get('lkoff') || '').split(',')) on.delete(f);
  const num = (k, d) => (params.has(k) ? Number(params.get(k)) : (P.values[k] ?? d));
  document.documentElement.dataset.look = `${preset}:${tierName}:${[...on].join(',')}`;

  const U = {
    projInv: uniform(new THREE.Matrix4()),
    camWorld: uniform(new THREE.Matrix4()),
    near: uniform(camera.near),
    far: uniform(camera.far),
    aspect: uniform(camera.aspect),
    res: uniform(new THREE.Vector2(1280, 720)), // 描画の大きさ（画素）
    time: uniform(0),
    sunDir: uniform(new THREE.Vector3(0, 1, 0)),
    sunCol: uniform(new THREE.Color(1, 1, 1)),
    sunTint: uniform(new THREE.Color(1, 1, 1)), // 太陽の色だけ（明るさ1）
    fogCol: uniform(new THREE.Color(0, 0, 0)),
    fogD: uniform(0.0016),
    sunUV: uniform(new THREE.Vector2(0.5, 0.5)),
    sunVis: uniform(0),
    // 空（背景）を落ち着かせる：彩度と明るさの掛け率
    skySat: uniform(num('skysat', 0.82)),
    skyK: uniform(num('skyk', 0.88)),
    // 接地と隙間の暗がり：調べる半径（画面の高さに対する割合）と強さ
    contactR: uniform(num('contactr', 0.022)),
    contactK: uniform(num('contactk', 1.1)),
    hazeK: uniform(num('hazek', 1.0)),
    shaftK: uniform(num('shaftk', 0.35)),
    streakK: uniform(num('streakk', 0.5)),
    streakLen: uniform(num('streaklen', 0.22)),
    streakTint: uniform(new THREE.Color(0.85, 0.92, 1.15)),
    ghostK: uniform(num('ghostk', 0.35)),
    exposure: uniform(num('exposure', 1.15)),
    // 色の調整（トーンマップの後ろ）
    sat: uniform(num('sat', 0.92)),
    satHi: uniform(num('sathi', 1.2)),
    contrast: uniform(num('contrast', 1.04)),
    splitK: uniform(num('splitk', 0.10)),
    shadowTint: uniform(new THREE.Color(0.9, 1.0, 1.1)),
    lightTint: uniform(new THREE.Color(1.08, 1.0, 0.92)),
    vignette: uniform(num('vignette', 0.14)),
    grain: uniform(num('grain', 0.022)),
    dustK: uniform(num('dustk', 1.0)),
    focus: uniform(5),
    blackPt: uniform(num('blackpt', 0.0)),
  };

  // 描く解像度（場面と場面の段）。下げた分は最後に輪郭を少し立てて戻す。確認用: rs=0.75（固定）、dyn=0（自動の上げ下げを切る）
  // 自動：1.5秒ごとにコマの間隔の中央値を見て、60fps を割れば下げ、余裕が続けば上げる（地上の試作と同じ決まり）
  const rsMax = num('rs', tier.rs);
  // 地上は地形の試作が描く解像度を自分で上げ下げしている（時間方向の拡大つき）ので、ここでは触らない
  const ownScale = preset !== 'ground';
  const dyn = { on: ownScale && params.get('dyn') !== '0' && params.get('test') !== '1' && !params.has('rs'), scale: rsMax, min: num('rsmin', TOUCH ? Math.max(tier.rsMin, 0.8) : tier.rsMin), /* スマホは下げても 0.8 まで（それより下はガタガタに見えた。spec REQ-014） */ win: [], t: 0, good: 0, bad: 0 };
  // 輪郭を立てる強さ（three の SharpenNode は 0 が最も強く、2 で素通し）。解像度を下げるほど強くする
  const sharpK = ownScale && (dyn.on || rsMax < 1) ? uniform(2) : null;
  const setScale = (s) => {
    if (!ownScale) return;
    scenePass.setResolutionScale(s);
    if (air && air.sceneColor !== color && air.sceneColor.setResolutionScale) air.sceneColor.setResolutionScale(s);
    // 画面の画素比より粗く描いている分（renderer の画素比 / 画面の画素比）も、輪郭を立てる強さに入れる
    const sEff = s * Math.min(1, renderer.getPixelRatio() / (window.devicePixelRatio || 1));
    if (sharpK) sharpK.value = Math.min(2, Math.max(0.9, 2 - (1 - sEff) * 3.0));
    document.documentElement.dataset.lookScale = s.toFixed(2);
  };
  const color = scenePass.getTextureNode('output');
  const depth = scenePass.getTextureNode('depth');
  const passes = [];

  const shadows = on.has('csm') ? setupShadows({ renderer, sun, tier, num, camera }) : null;
  if (shadows) passes.push('csm');
  let air = null;
  air = ['sky', 'contact', 'haze', 'shafts'].some((f) => on.has(f)) ? buildAtmosphere({ color, depth, U, on, tier, params }) : { sceneColor: color, passes: [] };
  setScale(dyn.scale);
  passes.push(...air.passes);
  // 被写界深度（格納庫だけ）：画面の中心の奥行きに合わせ、奥の壁と手前をぼかす
  if (on.has('dof')) {
    const viewZ = perspectiveDepthToViewZ(depth, U.near, U.far);
    // 焦点は主役（格納庫なら機体）までの距離。focusat の位置がなければ画面の中心の奥行き
    const d = dof(air.sceneColor, viewZ, U.focus, uniform(num('focallen', 1.4)), uniform(num('bokeh', 1.6)));
    air.sceneColor = convertToTexture(d);
    passes.push('dof');
  }
  const dustBox = P.values.dustbox || [70, 44, 150];
  const dust = on.has('dust') && tier.dust ? createDust(scene, camera, U, {
    count: num('dustn', preset === 'hangar' ? Math.round(tier.dust * 0.5) : tier.dust),
    box: dustBox, ahead: num('dustahead', 45), size: num('dustsize', 1), drift: num('dustdrift', 0),
  }) : null;
  if (dust) passes.push('dust');

  // 爆発の粒（GPU の計算）。爆発を出すのは各担当（look.burst を呼ぶ）。確認用: lookburst=1 で前方に一定の間隔で出す
  const bursts = (on.has('bursts') || params.has('lookburst')) ? createBursts(renderer, scene, camera, U, tierName === 'low' ? { sparks: 4000, smoke: 1000, debris: 1000 } : {}) : null;
  if (bursts) passes.push('bursts');
  let burstT = 0;
  const _flow = new THREE.Vector3();
  const _bp = new THREE.Vector3();

  let pipeline = null;
  let lumTex = null;
  let adaptExp = 1;
  let adaptBusy = false;
  let frame = 0;
  const baseExposure = U.exposure.value;
  const _sun = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _sp = new THREE.Vector3();
  let lastT = performance.now();

  // 目の慣れ：縮めた明るさの像を時々読み戻し（待たない）、画面の平均の明るさに合わせて露出をゆっくり動かす。
  // 暗い通路で少し明るく、太陽や爆発の多い画面で少し暗く（幅は 0.75〜1.3 倍。広げると暗い宇宙が白っぽく浮く）
  async function readAdapt() {
    const rt = lumTex && lumTex.renderTarget;
    if (!rt || adaptBusy || !rt.width) return;
    adaptBusy = true;
    try {
      const px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, rt.width, rt.height);
      let sum = 0; let n = 0;
      const half = px instanceof Uint16Array;
      for (let i = 0; i < px.length; i += 4) {
        const v = half ? THREE.DataUtils.fromHalfFloat(px[i]) : px[i];
        if (Number.isFinite(v)) { sum += v; n++; }
      }
      if (n) {
        const avg = Math.pow(2, sum / n);
        // 宇宙は暗い画面が基本なので、目標の明るさを低めに置く
        const target = Math.min(num('adaptmax', 1.4), Math.max(num('adaptmin', 0.9), num('adaptkey', 0.12) / Math.max(avg, 1e-3)));
        adaptExp = target;
      }
    } catch (e) { /* 読み戻せないコマは飛ばす */ }
    adaptBusy = false;
  }
  let curExp = 1;
  let followExposure = false;
  const focusAt = P.values.focusat ? new THREE.Vector3(...P.values.focusat) : null;
  const sunOverride = params.has('sundir') ? new THREE.Vector3(...params.get('sundir').split(',').map(Number)).normalize() : null;

  // 光の釣り合い：太陽を強め、周りから回り込む光（半球光・映り込み）を弱めて、光の当たる面と陰の差を大きくする。
  // main.js は区間が変わるたびに強さを入れ直すので、入れ直されたらその値を元にして掛け直す
  const BAL = { sun: num('sunk', 1.2), hemi: num('hemik', 0.75), env: num('envk', 0.85) };
  const bal = { sun: [null, null], hemi: [null, null], env: [null, null] };
  function balance() {
    const apply = (key, get, set) => {
      const v = get();
      const b = bal[key];
      if (v !== b[1]) { b[0] = v; b[1] = v * BAL[key]; set(b[1]); }
    };
    if (sun) apply('sun', () => sun.intensity, (v) => { sun.intensity = v; });
    if (hemi) apply('hemi', () => hemi.intensity, (v) => { hemi.intensity = v; });
    apply('env', () => scene.environmentIntensity, (v) => { scene.environmentIntensity = v; });
  }

  if (params.get('test') === '1') window.__look = { U, on, tier: tierName };
  return {
    passes,
    // 爆発の粒を出す（各担当が爆発の所で呼ぶ）。pos は世界の位置 [x, y, z]
    // 片付け（格納庫を閉じて描画器を手放すとき）：場面に足した塵と爆発の粒を外し、太陽の影を元の1枚の影に戻す
    dispose() {
      if (dust) dust.dispose();
      if (bursts) bursts.dispose();
      if (shadows && sun) sun.shadow.shadowNode = null;
    },
    burst: (pos, opts) => bursts && bursts.burst(pos, opts),
    hit: (pos, opts) => bursts && bursts.hit(pos, opts),
    sceneColor: air.sceneColor,
    attach(rp) {
      pipeline = rp;
      // トーンマップと sRGB は finish で掛ける
      rp.outputColorTransform = false;
    },
    // opts.bloomIncluded：渡す色に発光が足してある。opts.followExposure：露出を renderer.toneMappingExposure に合わせる（地上）
    finish(distorted, bloomPass, opts = {}) {
      followExposure = !!opts.followExposure;
      const f = buildFinish({ distorted, bloomPass, U, on, tier, params, sharpK, bloomIncluded: !!opts.bloomIncluded });
      lumTex = f.lumTex;
      passes.push(...f.passes);
      return f.outputNode;
    },
    update(state, fly, info = {}) {
      const now = performance.now();
      // 確認用の起動（test=1）は1回の呼び出しで1コマ進むので、決まった刻みで進める
      const dt = params.get('test') === '1' ? 1 / 60 : Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      frame++;
      if (dyn.on && frame > 30) {
        dyn.win.push(dt * 1000);
        if (now - dyn.t > 1500) {
          dyn.t = now;
          const a = dyn.win.slice().sort((x, y) => x - y); dyn.win.length = 0;
          const med = a[a.length >> 1] || 16;
          let next = dyn.scale;
          // スマホは切り替えるたびに描画先を全部作り直して止まりやすいので、回数を減らす（下げるのは重さが2回続いたとき、上げるのは30秒余裕が続いたとき。spec REQ-014）
          const downN = TOUCH ? 2 : 1; const upN = TOUCH ? 20 : 4;
          if (med > 18.5 && dyn.scale > dyn.min) { dyn.good = 0; if (++dyn.bad >= downN) { next = Math.max(dyn.min, dyn.scale - (TOUCH ? 0.1 : 0.08)); dyn.bad = 0; } }
          else if (med < 16.0) { dyn.bad = 0; if (++dyn.good >= upN && dyn.scale < rsMax) { next = Math.min(rsMax, dyn.scale + (TOUCH ? 0.1 : 0.05)); dyn.good = 0; } }
          else { dyn.good = 0; dyn.bad = 0; }
          if (next !== dyn.scale) { dyn.scale = next; setScale(next); }
        }
      }
      camera.updateMatrixWorld();
      U.projInv.value.copy(camera.projectionMatrixInverse);
      U.camWorld.value.copy(camera.matrixWorld);
      U.near.value = camera.near; U.far.value = camera.far; U.aspect.value = camera.aspect;
      renderer.getDrawingBufferSize(U.res.value);
      U.time.value = (U.time.value + dt) % 1000;
      if (on.has('balance')) balance();
      // 確認用：sundir=x,y,z で太陽の向きを差し替える（区間の太陽の向きを変える案を見せるため。既定では使わない）
      if (sunOverride && sun) sun.position.copy(sunOverride).multiplyScalar(sun.position.length() || 400);
      if (sun) {
        _sun.copy(sun.position).sub(sun.target.position).normalize();
        U.sunDir.value.copy(_sun);
        U.sunCol.value.copy(sun.color).multiplyScalar(sun.intensity);
        const sl = 0.2126 * sun.color.r + 0.7152 * sun.color.g + 0.0722 * sun.color.b;
        U.sunTint.value.copy(sun.color).multiplyScalar(1 / Math.max(sl, 1e-3));
        // 太陽の画面の位置（左上が原点）と、画面の中・近くにあるか
        camera.getWorldDirection(_fwd);
        const front = _fwd.dot(_sun);
        _sp.copy(camera.position).addScaledVector(_sun, 1000).project(camera);
        U.sunUV.value.set(_sp.x * 0.5 + 0.5, 0.5 - _sp.y * 0.5);
        const off = Math.max(Math.abs(_sp.x), Math.abs(_sp.y));
        // 太陽が画面の外（画面の大きさの3倍ほどまで）でも、隙間から差す筋は見えるので弱めながら残す
        U.sunVis.value = front > 0 ? Math.max(0, 1 - Math.max(0, off - 1) / 2.5) * Math.min(1, front * 3) : 0;
      }
      if (scene.fog) { U.fogCol.value.copy(scene.fog.color); U.fogD.value = scene.fog.density ?? 0.002; }
      if (focusAt) U.focus.value = camera.position.distanceTo(focusAt);
      if (shadows) shadows.update();
      const speed = fly ? Math.abs(fly.speed || 0) : 0;
      if (dust) dust.update(dt, speed, info.boost || 0);
      if (bursts) {
        camera.getWorldDirection(_fwd);
        if (params.has('lookburst') && (burstT -= dt) <= 0) {
          burstT = 1.1;
          _bp.copy(camera.position).addScaledVector(_fwd, 45 + Math.random() * 35);
          _bp.x += (Math.random() - 0.5) * 30; _bp.y += (Math.random() - 0.3) * 14;
          bursts.burst(_bp.toArray(), { scale: 0.7 + Math.random() * 1.2 });
        }
        // 機体が止まって世界が動く作りなので、粒も進む向きの逆へ流す（地上・格納庫は speed=0）
        bursts.update(dt, _flow.copy(_fwd).multiplyScalar(-speed));
      }
      if (lumTex && frame % 8 === 0) readAdapt();
      const expBase = followExposure ? renderer.toneMappingExposure * num('exposure', 1) : baseExposure;
      if (on.has('adapt')) curExp += (adaptExp - curExp) * Math.min(1, dt * 1.5);
      U.exposure.value = expBase * (on.has('adapt') ? curExp : 1);
    },
    // 一時停止から戻ったとき（spec REQ-017）：止めていた時間を、1コマの長さと重さの測定に数えない
    resetClock() { lastT = performance.now(); dyn.win.length = 0; dyn.t = lastT; dyn.good = 0; dyn.bad = 0; },
  };
}
