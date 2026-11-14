import * as THREE from 'three';
import { pass, uniform, vec3, vec2, Fn, positionLocal, normalize, pow, mix, max, dot, atan, asin, clamp, texture, mrt, normalView, packNormalToRGB, unpackRGBToNormal, sample, screenUV, builtinAOContext } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { createShipState, stepShip, SHIP } from './vfxState.js';
import { loadAirframeMaps, makeShipMaterial, repairTangents } from './materials.js';
import { AIRFRAMES } from './airframes.js';
import { loadLoadout, WEAPONS, SUB_KEYS, subKey, frameStats } from './loadout.js';
// 出撃の構成は起動のたびに保存から読む（機体選択の画面が先に保存する）
const LOADOUT = loadLoadout();
import { createRocket, ROCKET } from './fx/weaponRocket.js';
import { loadWeaponModels, createWeaponMounts, mountLoadout } from './weaponMounts.js';
import { createBackground } from './fx/background.js';
import { HS_RIM } from './fx/hardsurface.js';
import { createFlame } from './fx/flame.js';
import { ringVisualRadius, createVaporCone } from './fx/shock.js';
import { softUniforms, shipDepth } from './fx/soft.js';
import { SURF_AO, SURF_ON } from './fx/surface.js';
import { createTwin } from './fx/twin.js';
import { createBeam } from './fx/beam.js';
import { createLance } from './fx/lance.js';
import { createPuffs } from './fx/puffs.js';
import { createShipFx } from './fx/shipfx.js';
import { rigShip } from './rig.js';
import { createWorld } from './fx/world.js';
import { createEnemies } from './fx/enemies.js';
import { preloadPbr } from './fx/pbr.js';
import { createShieldFx } from './fx/shieldfx.js';
import { createHud } from './fx/hud.js';
import { SCENES, REGIONS, regionAt } from './scenes.js';
import { createOutpost } from './fx/outpost.js';
import { createFleet } from './fx/fleet.js';
import { createStage1 } from './stage1.js';
import { createFlightState, stepFlightState, stepRail, stepOrbit, forwardOf, rotate, RAIL } from './flightState.js';
import { createDistortionPass } from './fx/distortion.js';
import { createFeel, createMoves, dropAtKill, SALVO, DODGE } from './fx/weaponFeel.js';
import { createRibbons } from './fx/weaponRibbon.js';
import { createSalvo } from './fx/weaponSalvo.js';
import { createBomb, BOMB } from './fx/weaponBomb.js';
import { createPower } from './fx/weaponPower.js';
import { audio } from './audio/index.js';
import { createTouch, TOUCH, touchPixelRatio } from './touch.js';
import { createPauseGate, hangarUrl } from './pause.js';
import { createPauseMenu } from './pauseMenu.js';
import { createGuide, createGuideState, guideText } from './controlsGuide.js';
import { tr } from './i18n.js';

const params = new URLSearchParams(location.search);
const FRAME = AIRFRAMES[LOADOUT.frame];
const FRAME_STATS = frameStats(LOADOUT);
RAIL.lateral = FRAME_STATS.lateral;
// 確認用: 誤りをページの属性へ残す
if (params.get('test') === '1' || params.has('keylog')) {
  window.addEventListener('error', (e) => { document.documentElement.dataset.err = (document.documentElement.dataset.err || '') + String(e.message).slice(0, 500) + '\n'; });
  const ce = console.error.bind(console);
  console.error = (...a) => { document.documentElement.dataset.err = (document.documentElement.dataset.err || '') + a.map(String).join(' ').slice(0, 1500) + '\n'; ce(...a); };
}
const TEST = params.get('test') === '1';
const DEMO = params.get('demo') === '1';
const KEYLOG = params.has('keylog');
const DT = 1 / 60;
const BEAM_LENGTH = 400;
const CAMERA_BASE = new THREE.Vector3(0, 0.92, -2.5);
const CAMERA_TILT = 0.20; // 機体を画面のやや下に置くための見下ろし（ラジアン）
const CAMERA_FOLLOW = 5.0; // カメラの向きが機体に追いつく速さ
const LOOK_AT = new THREE.Vector3(0, CAMERA_BASE.y - Math.tan(CAMERA_TILT) * 8, CAMERA_BASE.z + 8);

// ---- 描画の土台 ----

// WebGPU で描く。使えないブラウザでは three.js が自動で WebGL2 に切り替える。確認用: ?webgl=1 で WebGL2 の経路を強制する
// 画面のエラーの数（確認用。data-errs に「数 最後の文」を出す。外の道具からエラー0件を確かめるのに使う）
{
  const el = document.documentElement.dataset; let n = 0; el.errs = '0';
  const note = (m) => { n += 1; el.errs = `${n} ${String(m).slice(0, 160)}`; };
  addEventListener('error', (e) => note(e.message));
  addEventListener('unhandledrejection', (e) => note((e.reason && e.reason.message) || e.reason));
  const ce = console.error.bind(console); console.error = (...a) => { note(a.map(String).join(' ')); ce(...a); };
  // 確認用: ?errtest=1 で3秒後にわざとエラーを出す（数え方が効いているかを確かめる）
  if (new URLSearchParams(location.search).has('errtest')) setTimeout(() => { throw new Error('errtest'); }, 3000);
}
// 確認用: ?perf=1 で GPU が1コマに使った時間を測る（data-gpu に ms の中央値、data-cpu に JS の ms の中央値）
const PERF = params.has('perf');
const renderer = new THREE.WebGPURenderer({ antialias: false, powerPreference: 'high-performance', forceWebGL: params.has('webgl'), trackTimestamp: PERF });
// 描く解像度の倍率。重さの大半は塗る画素の量なので、既定は画面の画素比の 1.25 までにする（1.6 の画面で約4割軽い）。
// 下げた分は look の最後で輪郭を立てて戻す。確認用 ?dpr=数字（元の細かさは ?dpr=2）。試験 test=1 は 1
const DPR_Q = new URLSearchParams(location.search);
const DPR_MAX = 1.25;
// タッチの端末は画面の大きさから決める（touch.js の touchPixelRatio。PC は 1.25 のまま）
const TOUCH_PR = TOUCH && !DPR_Q.has('test') && !DPR_Q.has('dpr');
renderer.setPixelRatio(DPR_Q.has('test') ? 1 : DPR_Q.has('dpr') ? Number(DPR_Q.get('dpr')) : TOUCH_PR ? touchPixelRatio() : Math.min(window.devicePixelRatio || 1, DPR_MAX));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = !params.has('noshadow'); // 確認用: ?noshadow=1 で影を切って比べる
renderer.shadowMap.type = THREE.PCFShadowMap; // PCFSoft は r186 で廃止され、今の版も PCF で描いている
renderer.info.autoReset = false;
document.body.appendChild(renderer.domElement);
await renderer.init();
const BACKEND = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
document.documentElement.dataset.backend = BACKEND;

const scene = new THREE.Scene();
// 宇宙のかすみ：遠い物ほど青灰色に溶けて奥行きが出る（真っ黒には沈めない）
scene.fog = new THREE.FogExp2(new THREE.Color().setRGB(0.08, 0.09, 0.135), 0.0016);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1800);
camera.position.copy(CAMERA_BASE);
camera.lookAt(LOOK_AT);
scene.add(camera);

// ---- 環境の光（自作シーンから PMREM で作る）----

function buildEnvironment() {
  const env = new THREE.Scene();
  const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false });
  skyMat.colorNode = mix(vec3(0.008, 0.012, 0.045), vec3(0.05, 0.07, 0.17), pow(normalize(positionLocal).y.mul(0.5).add(0.5), 1.5));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), skyMat);
  env.add(sky);

  const band = (w, h, rgb, pos, rot) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }),
    );
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    env.add(mesh);
  };

  band(46, 8, [2.4, 2.4, 2.7], [0, 17, 0], [Math.PI / 2, 0, 0]); // 白い帯（上）
  band(18, 5, [1.1, 0.5, 0.2], [0, -9, -20]); // 橙の帯（後ろ下）
  band(12, 5, [0.9, 0.92, 1.0], [-24, 2, 0], [0, Math.PI / 2, 0]); // 青い帯（横）
  band(10, 3, [1.6, 1.5, 1.35], [24, 6, -6], [0, -Math.PI / 2, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.02);
  pmrem.dispose();
  env.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return target.texture;
}

// 自機は撮影用の照明（白い帯）を映して形を見せる。基地・敵・岩は、宇宙の空そのものを映す
const envTexture = buildEnvironment();

// 宇宙の空の映り込み：暗い空、太陽の小さく強い円、惑星のぼんやりした光だけ。
// 白い帯の照明を映すと、金属が濡れたように光って作り物に見えるため
let spaceEnv = null;
function buildSpaceEnv(cfg) {
  const env = new THREE.Scene();
  const sun = new THREE.Vector3(...cfg.sun.dir).normalize();
  const uSun = uniform(sun); const uSunCol = uniform(new THREE.Color(...cfg.sun.color));
  const uLow = uniform(new THREE.Color(...cfg.sky.base0)); const uHigh = uniform(new THREE.Color(...cfg.sky.base1));
  const skyMat = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, fog: false });
  skyMat.colorNode = Fn(() => {
    const d = normalize(positionLocal);
    const s = max(0.0, dot(d, uSun));
    let c = mix(uLow, uHigh, d.y.mul(0.5).add(0.5)).mul(1.2)
      .add(uSunCol.mul(pow(s, 900.0).mul(60.0).add(pow(s, 40.0).mul(0.25)).add(pow(s, 6.0).mul(0.03))));
    // 背景と同じ全天の写真も映す（金属に星雲の色と明暗が映り、灰色の板に見えない）。写し方は background.js の eq と同じ
    if (cfg.pano) {
      let pc = texture(cfg.pano, vec2(atan(d.z, d.x).div(6.2831853).add(0.5), asin(clamp(d.y, -1.0, 1.0)).div(3.1415927).add(0.5))).rgb;
      // 写真の色味を場面の色へ寄せる（明るさは保つ）
      if (cfg.panoTint) pc = mix(pc, vec3(dot(pc, vec3(0.3, 0.59, 0.11))).mul(vec3(...cfg.panoTint)).mul(1.4), cfg.panoTintK ?? 0.8);
      c = c.add(pc.mul(cfg.panoK ?? 1));
    }
    return c;
  })();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), skyMat);
  env.add(sky);
  for (const p of cfg.planets || []) {
    if (p.type !== 'gas') continue;
    const d = new THREE.Vector3(...p.pos).normalize();
    const blob = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.11, 0.07) }));
    blob.position.copy(d).multiplyScalar(30);
    blob.lookAt(0, 0, 0);
    env.add(blob);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.0);
  const tex = rt.texture;
  tex.userData.envBox = new THREE.Box2(new THREE.Vector2(0, 0), new THREE.Vector2(rt.width, rt.height)); // 中身を写すときの範囲
  pmrem.dispose();
  env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return tex;
}

// ---- 光 ----

const SUN_DIR = new THREE.Vector3(-2.2, 3.0, -2.6).normalize();
const sun = new THREE.DirectionalLight(0xfff3e6, 3.6);
// 太陽の影は自機のまわり（前後左右 ±SHADOW_R）に落とす。基地・敵・岩も互いに影を落とし合う
const SUN_FAR = 400;
const SHADOW_R = 100;
sun.position.copy(SUN_DIR).multiplyScalar(SUN_FAR);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.normalBias = 0.12;
sun.shadow.camera.near = SUN_FAR - 260;
sun.shadow.camera.far = SUN_FAR + 260;
sun.shadow.camera.left = -SHADOW_R;
sun.shadow.camera.right = SHADOW_R;
sun.shadow.camera.top = SHADOW_R;
sun.shadow.camera.bottom = -SHADOW_R;
sun.shadow.bias = -0.0002;
// 影の描き直しは2コマに1回（影の分の描画を半分にする。60fps なら遅れは見えない）
sun.shadow.autoUpdate = false;
let shadowTick = 0;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x7fb0ff, 1.4);
rim.position.set(2.6, 0.4, 2.5);
scene.add(rim);
// 影の側を真っ黒にしない弱い環境の光
const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x302820, 0.35);
scene.add(hemi);

const blastLight = new THREE.PointLight(0xffa860, 0, 60, 2);
scene.add(blastLight);
const background = createBackground(scene, SUN_DIR);
const world = createWorld({ scene, sunDir: SUN_DIR });

// ---- シーンの設定を当てる（確認用は ?scene=番号。面の進行から使う） ----
let sceneIndex = -1;
function applyScene(i) {
  const cfg = SCENES[i];
  sceneIndex = i;
  SUN_DIR.set(...cfg.sun.dir).normalize();
  sun.position.copy(SUN_DIR).multiplyScalar(SUN_FAR);
  sun.color.setRGB(...cfg.sun.color, THREE.SRGBColorSpace);
  sun.intensity = cfg.sun.intensity * LIGHT_K[0];
  rim.color.setRGB(...cfg.rim.color, THREE.SRGBColorSpace);
  rim.intensity = cfg.rim.intensity * LIGHT_K[1];
  hemi.color.setRGB(...cfg.hemi.sky, THREE.SRGBColorSpace);
  hemi.groundColor.setRGB(...cfg.hemi.ground, THREE.SRGBColorSpace);
  hemi.intensity = cfg.hemi.intensity * LIGHT_K[2];
  background.setSky(cfg.sky, SUN_DIR);
  if (spaceEnv) spaceEnv.dispose();
  spaceEnv = buildSpaceEnv(cfg);
  scene.environment = spaceEnv;
  scene.environmentIntensity = LIGHT_K[3];
  world.setScene({ ...cfg, sunDirV: SUN_DIR });
  if (vaporCone && vaporCone.mesh.material.uniforms.uSun) vaporCone.mesh.material.uniforms.uSun.value.copy(SUN_DIR);
  document.documentElement.dataset.scene = String(i + 1);
}

// ---- 道の区間ごとの背景（空・光・かすみ・岩の色を z で移り変わらせる） ----
// 光の強さの掛け率 [太陽, 縁の光, 半球光, 映り込み]。確認用: ?light=1.3,0.5,0.4,0.6 で掛け替える
// 新しい質感では、太陽を少し強め、周りから回り込む光を少しだけ絞る（絞りすぎると陰が真っ黒になり、ぶつかる物の形が読めない）
const LIGHT_K = (params.get('light') || (SURF_ON ? '1.15,1,0.75,0.85' : '1,1,1,1')).split(',').map(Number);
const regionEnvs = [];
// 場面に置く映り込みは1枚だけにし、区間が変わったら区間ごとの映り込みの中身をこの1枚へ写す。
// 別の画像へ差し替えると、光を受ける材質が全部組み直されて 0.4〜0.7 秒止まっていた
let regionEnvTex = null; let regionEnvIdx = -1;
// 区間の映り込みに使う全天の写真。読み終えたら映り込みを作り直す（?surface=0 では使わない）
const PANOS = {};
let panoReady = Promise.resolve();
if (SURF_ON) {
  const files = { nebula: 'nebula', grave: 'pano_grave', base: 'pano_base', line: 'pano_line' };
  panoReady = Promise.all(Object.entries(files).map(([k, f]) => new Promise((res) => new THREE.TextureLoader().load(`./assets/sky/${f}.jpg`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; PANOS[k] = t; res();
  }, undefined, () => res())))).then(() => {
    for (const t of regionEnvs) t.dispose();
    regionEnvs.length = 0;
    regionKey = '';
  });
}
const RIM_DIR = [2.6, 0.4, 2.5];
let regionKey = '';
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sunA = new THREE.Vector3();
const sunB = new THREE.Vector3();
function applyRegion(z) {
  const { a: ia, b: ib, t } = regionAt(z);
  const key = `${ia}:${ib}:${t.toFixed(3)}`;
  if (key === regionKey) return;
  regionKey = key;
  const a = REGIONS[ia]; const b = REGIONS[ib];
  if (!regionEnvs.length) for (const r of REGIONS) regionEnvs.push(buildSpaceEnv({ sun: r.sun, sky: r.sky, planets: r.env ? r.env.planets : [], pano: PANOS[r.pano], panoK: r.panoK, panoTint: r.panoTint, panoTintK: r.panoTintK }));
  if (!regionEnvTex) { const r = REGIONS[0]; regionEnvTex = buildSpaceEnv({ sun: r.sun, sky: r.sky, planets: r.env ? r.env.planets : [], pano: PANOS[r.pano], panoK: r.panoK, panoTint: r.panoTint, panoTintK: r.panoTintK }); regionEnvIdx = 0; }
  SUN_DIR.copy(sunA.set(...a.sun.dir).normalize()).lerp(sunB.set(...b.sun.dir).normalize(), t).normalize();
  sun.position.copy(SUN_DIR).multiplyScalar(SUN_FAR);
  sun.color.setRGB(...mixRGB(a.sun.color, b.sun.color, t), THREE.SRGBColorSpace);
  sun.intensity = (a.sun.intensity + (b.sun.intensity - a.sun.intensity) * t) * LIGHT_K[0];
  rim.color.setRGB(...mixRGB(a.rim.color, b.rim.color, t), THREE.SRGBColorSpace);
  // 材質の縁の光も、区間の縁の光の色に合わせる（明るさは揃えて色だけ使う）
  HS_RIM.value.copy(rim.color).multiplyScalar(0.85 / Math.max(0.05, rim.color.r, rim.color.g, rim.color.b));
  rim.intensity = (a.rim.intensity + (b.rim.intensity - a.rim.intensity) * t) * LIGHT_K[1];
  rim.position.set(...mixRGB(a.rim.dir || RIM_DIR, b.rim.dir || RIM_DIR, t));
  hemi.color.setRGB(...mixRGB(a.hemi.sky, b.hemi.sky, t), THREE.SRGBColorSpace);
  hemi.groundColor.setRGB(...mixRGB(a.hemi.ground, b.hemi.ground, t), THREE.SRGBColorSpace);
  hemi.intensity = (a.hemi.intensity + (b.hemi.intensity - a.hemi.intensity) * t) * LIGHT_K[2];
  scene.fog.color.setRGB(...mixRGB(a.fog, b.fog, t));
  scene.fog.density = a.fogD + (b.fogD - a.fogD) * t;
  background.setBlend(a, b, t, SUN_DIR);
  // 映り込みは混ぜられないので、弱めた真ん中で中身を写し替える（場面に置く画像は同じ1枚のまま）
  const envWant = t < 0.5 ? ia : ib;
  if (envWant !== regionEnvIdx) { renderer.copyTextureToTexture(regionEnvs[envWant], regionEnvTex, regionEnvs[envWant].userData.envBox); regionEnvIdx = envWant; }
  scene.environment = regionEnvTex;
  scene.environmentIntensity = (1 - 0.45 * Math.sin(Math.PI * t)) * LIGHT_K[3];
  world.setRegion(SUN_DIR, mixRGB(a.rock, b.rock, t), mixRGB(a.dust, b.dust, t));
  if (outpost) outpost.setHaze(mixRGB(a.haze, b.haze, t));
  if (vaporCone && vaporCone.mesh.material.uniforms.uSun) vaporCone.mesh.material.uniforms.uSun.value.copy(SUN_DIR);
  document.documentElement.dataset.region = b.name;
}

// ---- ポストプロセス ----

// 場面を描く → 歪み（不正な値の画素は読むときに 0 にする）→ 発光 → 色の仕上げ（ACES と sRGB）
// アンチエイリアス：場面を描く段に MSAA を付ける（renderer の antialias は、描画先を経由すると効かない）。
// 描く画素比が 1.2 以上なら 2 サンプルで足りる（既定の上限 1.25 でも 2。4 に増やさない）。確認用 ?msaa=0 で切って比べる（今の版と同じ決まり）。
// 確認用の起動（?test=1）は画素比を1に固定するのと同じく、速さのため既定で切る（?msaa=4 で付けて撮れる）
const MSAA = params.has('msaa') ? Number(params.get('msaa')) : (params.has('test') ? 0 : (renderer.getPixelRatio() >= 1.2 ? 2 : 4));
const scenePass = pass(scene, camera, { samples: MSAA });
// 隙間の暗がり（GTAO）：不透明な物の奥行きと法線を先に描いて暗がりを求め、材質の「周りから回り込む光」にだけ効かせる。
// 太陽の直接の光・発光・半透明の効果（光線・爆発）は暗くしない。確認用: ?ao=0 で切る
const AO_ON = params.get('ao') === '1'; // この規模の物では効き目が小さく、ざらつきと重さに見合わないので既定では切る
let aoPass = null;
if (AO_ON) {
  const aoPrePass = pass(scene, camera, { samples: 0 });
  aoPrePass.transparent = false;
  aoPrePass.setMRT(mrt({ output: packNormalToRGB(normalView) }));
  const preNormal = sample((u) => unpackRGBToNormal(aoPrePass.getTextureNode('output').sample(u)));
  aoPass = ao(aoPrePass.getTextureNode('depth'), params.get('aonormal') === '0' ? null : preNormal, camera);
  aoPass.resolutionScale = 0.5;
  aoPass.samples.value = Number(params.get('aosamples') || 12);
  aoPass.radius.value = Number(params.get('aoradius') || 2.0);
  aoPass.thickness.value = Number(params.get('aothick') || 1.5);
  aoPass.scale.value = Number(params.get('aoscale') || 1);
  aoPass.distanceFallOff.value = 1.0;
  scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);
  SURF_AO.value = aoPass.getTextureNode().value;
}
// 見え方の底上げ（src/render/、担当は別セッション）：既定で入れる（國松の指示で本番に組み込み）。?look=0 で切る。確認用の起動（test=1）は既定で切り、?look=1 で入れる
const look = (params.get('look') === '1' || (params.get('look') !== '0' && params.get('test') !== '1')) ? await (await import('./render/look.js')).createLook({ renderer, scene, camera, scenePass, renderPipeline: null, sun, rim, hemi, params, backend: BACKEND }) : null;
const distortionPass = createDistortionPass();
const distorted = distortionPass.build(look ? look.sceneColor : scenePass.getTextureNode('output'));
// r186 の UnrealBloomPass は合成で強さを3倍していた（3.0 * bloomStrength）。r187 の BloomNode は3倍しないので、ここで3倍して同じ明るさにする
const BLOOM_K = 3;
const bloomPass = bloom(distorted, 0.18 * BLOOM_K, 0.45, 1.05);
const renderPipeline = new THREE.RenderPipeline(renderer);
if (look) look.attach(renderPipeline);
renderPipeline.outputNode = look ? look.finish(distorted, bloomPass) : distorted.add(bloomPass);
// 確認用: ?aoview=1 で隙間の暗がりの画像だけを映す
if (aoPass && params.has('aoview')) { renderPipeline.outputNode = vec3(aoPass.getTextureNode().sample(screenUV).r).toVec4 ? vec3(aoPass.getTextureNode().sample(screenUV).r).toVec4() : aoPass.getTextureNode(); renderPipeline.outputColorTransform = false; }

// ---- 自機 ----

// 焼いた材質の画像を先に読み、どの模型もそれが揃ってから組み立てる
const pbrReady = preloadPbr();
const gltfLoader = new GLTFLoader();
const loader = { load: (url, ok, prog, err) => gltfLoader.load(url, (g) => pbrReady.then(() => ok(g)), prog, err) };
const texLoader = new THREE.TextureLoader();

let state = createShipState();
let shipRoot = null;

// ---- 操縦 ----
// 機体と効果を flight にまとめて回す。機体は常に原点にいて、世界のほうが動く。
const flight = new THREE.Group();
scene.add(flight);
let fly = createFlightState();
// 手応え（揺れ・止まる間・反動）と機体の動き（宙返り・急減速・急加速）。?shake=0 で揺れを切れる
const feel = createFeel({ shake: params.has('shake') ? Number(params.get('shake')) : 1 });
const moves = createMoves();
const cameraQ = new THREE.Quaternion();
const viewQ = new THREE.Quaternion(); // 実際にカメラへ使う向き（cameraQ に stage.viewHint の下向きを足したもの）
const _qPitch = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);
let viewPitch = 0; let viewBack = 0; let viewUp = 0; let viewLook = 0;
let beamView = 0;
const railCam = [0, 0];
let downView = 0; // 撃墜の間、カメラを後ろ上へ引く量（0..1）
const shipQ = new THREE.Quaternion();
const _v = new THREE.Vector3();
// 武器へ渡す、機体の今の姿勢と位置
const flyVel = [0, 0, 0];
const shipInfo = {
  get q() { return fly.q; },
  get pos() { return fly.pos; },
  get speed() { return fly.speed; },
  get forward() { return forwardOf(fly); },
  // 実際に動いている速さ（道の上の横の動き・ボス戦で回る動きを含む）。敵の狙いに使う
  get vel() { return flyVel; },
  toWorld(p) { return rotate(fly.q, [p.x, p.y, p.z]); },
  // 回避中・撃墜中・再出撃直後は敵の弾が当たらない。回避中に来た弾ははじく
  get invuln() { return combat.dodgeT >= 0 || combat.grace > 0 || combat.safe > 0 || combat.downT >= 0 || moves.invuln || (bomb && bomb.invuln); },
  get dodging() { return combat.dodgeT >= 0; },
};

// ---- 回避と撃墜 ----
// Q / E を 0.28 秒以内に2回押すと、その向きへ素早く横へずれながら1回転する。
// シールドが 0 になると撃墜され、少し後に再出撃する（直後は少しの間だけ当たらない）
// 回避の数値は weaponFeel.js の DODGE（動きの秒・ずれる距離・動きの後も当たらない秒。REQ-018）
const DODGE_COOL = FRAME_STATS.dodgeCool;    // 次の回避までの待ち時間（機体と積んだ重さで変わる）
const DOWN_T = 2.8;        // 撃墜から再出撃までの秒数
const SAFE_T = 2.0;        // 再出撃直後に当たらない秒数
const combat = { dodgeT: -1, dodgeDir: 0, cool: 0, downT: -1, safe: 0, grace: 0, queued: 0 };
const lastTap = { KeyQ: -9999, KeyE: -9999 };
// 操作の案内（REQ-019）：1回の出撃で同じ案内は1度だけ。出し方の判断は guideStep
const guide = createGuide({ touch: TOUCH });
window.__guide = guide; // 確認用：.work/sol の試験が案内を出して置き場所を測る
const guideSeen = createGuideState();
const GUIDE_OPT = { tr, touch: TOUCH };
let guideShieldLow = false; // 盾が初めて3割を切ったか
let guideBombWanted = false; // 3割を切った時に爆雷が残っていた（案内は空いてから出す）

// 撃墜中は操作を受け付けない。確認用に dodgeL / dodgeR で回避を起こせる
// 道の区間は道に沿って進み、ボス戦はボスのまわりを回る。ボスを倒した後は自由に飛ぶ
function stepFly(dt, ci) {
  const p0 = fly.pos.slice();
  stepFlyInner(dt, ci);
  // 急減速と踏み込みの加速：道と自由飛行の間だけ、前へ進む量を足し引きする（ボス戦の回る動きは変えない）
  if (!(stage && stage.arena)) {
    const fw = forwardOf(fly);
    const dv = fly.speed * (moves.speedScale - 1) + moves.impulse;
    for (let i = 0; i < 3; i++) fly.pos[i] += fw[i] * dv * dt;
    fly.speed += dv;
  }
  if (dt > 0) for (let i = 0; i < 3; i++) flyVel[i] += ((fly.pos[i] - p0[i]) / dt - flyVel[i]) * Math.min(1, dt * 12);
}
function stepFlyInner(dt, ci) {
  if (stage && stage.mode === 'rail') stepRail(fly, dt, ci, state.boostAmount);
  else if (stage && stage.arena) stepOrbit(fly, dt, ci, state.boostAmount, stage.arena, stage.orbitOpts || null);
  else stepFlightState(fly, dt, ci, state.boostAmount);
}

function combatInput(inp) {
  if (inp.dodgeL) combat.queued = -1;
  if (inp.dodgeR) combat.queued = 1;
  return combat.downT >= 0 ? {} : inp;
}

function combatStep(dt) {
  combat.cool = Math.max(0, combat.cool - dt);
  combat.safe = Math.max(0, combat.safe - dt);
  combat.grace = Math.max(0, combat.grace - dt);
  if (combat.queued && combat.dodgeT < 0 && combat.cool <= 0 && combat.downT < 0 && !moves.looping) {
    feel.fire('dodge');
    combat.dodgeT = 0;
    combat.dodgeDir = combat.queued;
    combat.cool = DODGE_COOL;
  }
  combat.queued = 0;
  if (combat.dodgeT >= 0) {
    combat.dodgeT += dt;
    const u = Math.min(1, combat.dodgeT / DODGE.t);
    // 動き出しと止まりが滑らかな速さで、画面の右（機体の -X）か左へずれる
    const v = DODGE.d * (Math.PI / (2 * DODGE.t)) * Math.sin(Math.PI * u);
    const right = rotate(fly.q, [-1, 0, 0]);
    for (let i = 0; i < 3; i++) fly.pos[i] += right[i] * combat.dodgeDir * v * dt;
    if (u >= 1) { combat.dodgeT = -1; combat.grace = DODGE.grace; }
  }
  if (combat.downT >= 0) {
    combat.downT += dt;
    if (combat.downT > DOWN_T) {
      combat.downT = -1;
      combat.safe = SAFE_T;
      combat.grace = 0;
      enemies.revive();
    }
  }
}

// 使いどころの手前で案内を出す。大蛇の光線（主砲）・薙ぎ払いと体当たり（回避）・重巡洋艦（誘導弾）・盾が3割を切った時（爆雷）
let guideCheckT = 0; // 判断は 0.2 秒ごと（毎コマ stage.info を組み立てない）
// 操作の案内（#hint、左上）は、体力バー・攻撃名・警告・案内が出たら消す（一度消えたら出撃の間は出さない）。
// 上の部品と重ねないための決まり。確認用 ?hintover=1 で重ねたまま出す（.work/sol の試験が、重なりの検出を確かめる）
const HINT_YIELD = !params.has('hintover');
let hintGone = false;
function hintStep() {
  if (!HINT_YIELD || hintGone) return;
  const shown = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && parseFloat(getComputedStyle(e).opacity) > 0.05; };
  if (shown('.ui-bossbar') || shown('#uiAlert') || shown('#uiWarn') || shown('#guide')) {
    hintGone = true;
    document.documentElement.classList.add('hint-off');
  }
}
function guideStep(realDt) {
  guide.update(realDt);
  guideCheckT -= realDt;
  if (guideCheckT > 0) return;
  guideCheckT = 0.2;
  hintStep();
  const atk = stage && stage.info ? stage.info.atk : '';
  if (!guide.busy && atk === 'beam' && LOADOUT.heavy === 'cannon' && guideSeen.want('beam')) guide.show(guideText('beam', GUIDE_OPT));
  else if (!guide.busy && (atk === 'sweep' || atk === 'ram') && guideSeen.want('dodge')) guide.show(guideText('dodge', GUIDE_OPT));
  else if (!guide.busy && enemies.cruiserAlive && LOADOUT.subs.includes('salvo') && guideSeen.want('salvo')) guide.show(guideText('salvo', { ...GUIDE_OPT, salvoKey: SUB_CODE.salvo }));
  if (!guideShieldLow && enemies.shield < FRAME.stats.shield * 0.3) { guideShieldLow = true; guideBombWanted = !!bomb && bomb.count > 0; }
  if (guideBombWanted && !guide.busy && guideSeen.want('bomb')) { guide.show(guideText('bomb', GUIDE_OPT)); guideBombWanted = false; }
}

function playerDown() {
  combat.downT = 0;
  combat.grace = 0;
  if (PERF) document.documentElement.dataset.downs = String(Number(document.documentElement.dataset.downs || 0) + 1);
  combat.dodgeT = -1;
  // 溜めを捨てる（撃墜で入力が切れると、離したことになって主砲が出てしまうため）
  state.charge.level = 0; state.charge.firing = false; state.charge.fireLeft = 0;
  // 撃墜でツインの段階が1つ下がる
  if (power) power.lose();
  if (shipFx) {
    // 自機は進み続けるので、機体のそばに留まる座標（space 0）で爆発させる
    shipFx.explode([0, 0.15, 0.3], 0.7, 0);
    shipFx.explode([0.4, 0.1, -0.2], 0.45, 0);
  }
  state.cameraShake = Math.max(state.cameraShake || 0, 1);
}

let bodyMesh = null;
let mixer = null;

// 自機を隠す・出す。自機の下には武器の光が4つあり、visible で隠すと場面の光の数が変わって、光を受ける材質が
// 全部作り直される（撃墜中・復活の点滅で1コマ0.4〜1秒かかっていた）。描く物の layers を空にして隠し、出すときに元へ戻す。
// 武器のコードは閃光などを visible で切り替えるので、layers とはぶつからない（spec REQ-006）
const shipLayerMask = new Map();
let shipHidden = false;
function setShipHidden(h) {
  if (h === shipHidden || !shipRoot) return;
  shipHidden = h;
  if (h) {
    shipRoot.traverse((o) => {
      if (o.isLight || !(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return;
      shipLayerMask.set(o, o.layers.mask); o.layers.mask = 0;
    });
  } else {
    for (const [o, m] of shipLayerMask) o.layers.mask = m;
    shipLayerMask.clear();
  }
}
let action = null;
let anchors = null;
let bodyMaterial = null;

const flame = { group: new THREE.Group(), update() {} };
let rig = null;
let shipFx = null;
let vaporCone = null;
const puffs = createPuffs({ scene });
// 敵（確認用の ?test=1 では enemy= を付けたときだけ出す。enemy=near で自機の前に置く）
// 1面の進行（確認用の ?test=1 では stage を付けたときだけ。stagez=数字 でその位置から始める）
const STAGE_ON = TEST ? params.has('stage') : params.get('stage') !== '0';
const ENEMY_ON = TEST ? params.has('enemy') : params.get('enemy') !== '0';
const shieldFx = createShieldFx(flight);
const enemies = createEnemies({ scene, world, puffs, onPlayerDown: () => playerDown(), onShieldHit: (rel, kind, low) => { shieldFx.hit(rel, kind, low); feel.fire(kind === 'hit' ? 'hurt' : 'deflect'); }, auto: !STAGE_ON, enabled: ENEMY_ON, placeNear: params.get('enemy') === 'near', startHp: params.has('ehp') ? Number(params.get('ehp')) : undefined, startShield: params.has('pshield') ? Number(params.get('pshield')) : undefined, shieldMax: FRAME.stats.shield });
// 1面の基地（確認用の ?test=1 では outpost を付けたときだけ読む）
const OUTPOST_ON = TEST ? (params.has('outpost') || params.has('stage')) : params.get('outpost') !== '0';
const outpost = OUTPOST_ON ? createOutpost({ scene, loader, renderer, camera }) : null;
const fleet = OUTPOST_ON && params.get('fleet') !== '0' ? createFleet({ scene }) : null; // 遠景の艦隊（当たり判定なし）
const stage = (STAGE_ON && outpost) ? createStage1({ scene, loader, world, puffs, enemies, outpost, startZ: Number(params.get('stagez')) || 0, drop: (k, rel, P) => { if (power) power.drop(k, rel, P); } }) : null;
const hud = createHud({ camera, world, enabled: ENEMY_ON });
const enemyReady = ENEMY_ON ? new Promise((res) => loader.load('./assets/enemy_heavy.glb', (g) => { enemies.setModel(g); res(); }, undefined, (e) => { console.error(e); res(); })) : Promise.resolve();

// 自機の武器が当てた時の知らせ。武器へ渡す world の damage だけを包む（敵の側の処理は変えない）
let kills = 0;
let beamMarkT = 0;
function weaponWorld(kind) {
  return {
    targets: world.targets,
    raycast: world.raycast,
    assistDir: world.assistDir,
    nearestAhead: world.nearestAhead,
    damage(rock, amount, st, P) {
      const enemy = !!rock.onDamage;
      const was = rock.radius;
      const rel = [rock.rel.x, rock.rel.y, rock.rel.z];
      const broke = world.damage(rock, amount, st, P);
      const killed = enemy ? (was > 0.5 && rock.radius <= 0.5) : broke;
      onWeaponHit(kind, rock, enemy, killed, rel);
      return broke;
    },
  };
}
function onWeaponHit(kind, rock, enemy, killed, rel) {
  const P = fly.pos;
  if (killed) {
    if (!enemy) { feel.fire('rockBreak'); return; }
    if (!rock.aim) { hud.mark(rel, P, false); return; } // 誘導弾・機雷を落としただけ
    const big = (rock.size || 0) >= 3;
    hud.mark(rel, P, true, big);
    // 爆雷でまとめて壊した分は、1機ずつ止めず、落とす物の数にも入れない
    if (kind === 'bomb') return;
    feel.fire(big ? 'killBig' : 'kill');
    kills += 1;
    const d = dropAtKill(kills);
    if (d && power) power.drop(d, rel, P);
    return;
  }
  if (!enemy) { if (kind !== 'twin' && kind !== 'beam') feel.fire(kind === 'lance' ? 'lanceHit' : 'salvoHit', 0.6); return; }
  if (kind === 'bomb') { hud.mark(rel, P, false); return; }
  if (kind === 'beam') {
    if (state.time - beamMarkT < 0.1) return;
    beamMarkT = state.time;
    feel.fire('beamHit');
  } else if (kind === 'twin') feel.fire('twinHit');
  else if (kind === 'lance') feel.fire('lanceHit');
  else if (kind === 'salvo') feel.fire('salvoHit');
  hud.mark(rel, P, false);
}

const NEAR_K = 0.055; // 機体のそばの効果を見せるときの、進む速さの割合
const RATES = { pitch: 0, yaw: 0, roll: 0 };
let twin = null;
let beam = null;
let lance = null;
let salvo = null;
let bomb = null;
let power = null;
let wingTrail = null;
const wTwin = weaponWorld('twin');
const wBeam = weaponWorld('beam');
const wLance = weaponWorld('lance');
const wSalvo = weaponWorld('salvo');
const wRocket = weaponWorld('rocket');
let rocket = null;
let mounts = null;
let weaponModels = null;
let weaponAnchors = null;
const wBomb = weaponWorld('bomb');
let frameInput = {};
let prevShots = 0; let prevFiring = false; let prevVolleys = 0; let prevFull = false;
let reticleKick = 0;
let prevTwinKey = false;
const TWIN_INTERVAL = SHIP.twinInterval;
const _wing = new THREE.Vector3();

const stats = {
  shipMeshes: 0,
  flapTime: 1,
  material: {},
  toneMapping: 'ACESFilmic',
  backend: BACKEND,
  passes: ['render', 'distortion', 'bloom', 'output', ...(look ? look.passes : [])],
  shadows: true,
  calls: 0,
  triangles: 0,
};

let distortionStrength = 0;
let ready = false;
let demoTimer = 0;

function computeAnchors(mesh, frame) {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.attributes.position;
  const matrix = mesh.matrixWorld;
  const v = new THREE.Vector3();
  const n = pos.count;
  const pts = new Float32Array(n * 3);
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxX = -Infinity;
  let minX = Infinity;
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrix);
    pts[i * 3] = v.x;
    pts[i * 3 + 1] = v.y;
    pts[i * 3 + 2] = v.z;
    if (v.z < minZ) minZ = v.z;
    if (v.z > maxZ) maxZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.x < minX) minX = v.x;
  }
  const mean = (test) => {
    const sum = new THREE.Vector3();
    let count = 0;
    for (let i = 0; i < n; i++) {
      const x = pts[i * 3];
      const y = pts[i * 3 + 1];
      const z = pts[i * 3 + 2];
      if (test(x, y, z)) { sum.x += x; sum.y += y; sum.z += z; count += 1; }
    }
    return count ? sum.multiplyScalar(1 / count) : new THREE.Vector3();
  };
  const eps = 1e-4;
  const nose = mean((x, y, z) => z >= maxZ - eps);
  const n0 = frame.nozzles[0];
  const nozzleR = new THREE.Vector3(n0[0], n0[1], n0[2]);
  const nozzleL = new THREE.Vector3(-n0[0], n0[1], n0[2]);
  const wingR = mean((x, y, z) => x >= maxX - eps);
  const wingL = mean((x, y, z) => x <= minX + eps);
  return { nose, nozzleR, nozzleL, wingR, wingL };
}

function setupShip(gltf, maps) {
  shipRoot = gltf.scene;
  shipRoot.updateMatrixWorld(true);
  flight.add(shipRoot);

  bodyMaterial = makeShipMaterial({ maps, envMap: envTexture, part: FRAME.id, paint: LOADOUT.paint, gain: 0.55 });
  shipRoot.traverse((o) => {
    if (!o.isMesh) return;
    stats.shipMeshes += 1;
    repairTangents(o.geometry);
    o.material = bodyMaterial;
    o.castShadow = true;
    o.receiveShadow = true;
    o.layers.enable(1);
    if (!bodyMesh) bodyMesh = o;
  });

  stats.material = {
    type: bodyMaterial.type,
    map: !!bodyMaterial.map,
    metalnessMap: !!bodyMaterial.metalnessMap,
    roughnessMap: !!bodyMaterial.roughnessMap,
    normalMap: !!bodyMaterial.normalMap,
    emissiveMap: !!bodyMaterial.emissiveMap,
    envMap: !!bodyMaterial.envMap,
  };

  if (!bodyMesh) throw new Error('本体のメッシュが見つからない');

  anchors = computeAnchors(bodyMesh, FRAME);

  stats.frame = FRAME.id;
  stats.loadout = LOADOUT;
  rig = rigShip({ shipRoot, bodyMesh, frame: FRAME });
  stats.rigCounts = rig.counts;
  bodyMesh = rig.skinned;

  // 武装の模型を付ける。弾はその砲口から出る
  mounts = createWeaponMounts({ models: weaponModels, envMap: envTexture, paint: LOADOUT.paint, gain: 0.55, shadow: false });
  const muzzle = mountLoadout(mounts, FRAME, LOADOUT, shipRoot, (x) => (Math.abs(x) >= FRAME.wing.root[0] ? (x > 0 ? rig.R.wing : rig.L.wing) : shipRoot));
  const pairAnchors = (m) => ({ ...anchors, wingR: m[0], wingL: m[1] });
  weaponAnchors = {
    main: pairAnchors(muzzle.main),
    heavy: { ...anchors, nose: muzzle.heavy[0] },
    sub: Object.fromEntries(LOADOUT.subs.map((w, i) => [w, pairAnchors(muzzle.sub[i])])),
  };
  // 発射の出来事で砲を跳ねさせる
  const feelFire = feel.fire;
  const KICK = { twinShot: 'main', spreadShot: 'main', beamStart: 'heavy' };
  feel.fire = (name, ...rest) => { const slot = KICK[name]; if (slot) mounts.kick(slot); return feelFire.call(feel, name, ...rest); };

  const flameFx = createFlame({ anchors });
  flame.group = flameFx.group;
  flame.update = flameFx.update;
  shipRoot.add(flame.group);
  // 炎はエンジンの骨について首を振る
  flameFx.sideMeshes.forEach((meshes, i) => {
    const side = i === 0 ? rig.R : rig.L;
    for (const m of meshes) side.nacelle.attach(m);
  });
  shipFx = createShipFx({ puffs, anchors, rig });
  vaporCone = createVaporCone({ sunDir: SUN_DIR });
  shipRoot.add(vaporCone.mesh);

  twin = createTwin({ anchors: weaponAnchors.main, camera, kind: LOADOUT.main, feel, puffs });
  flight.add(twin.group);
  scene.add(twin.boltGroup);

  beam = createBeam({ anchors: weaponAnchors.heavy, camera, kind: LOADOUT.heavy, scene, feel });
  shipRoot.add(beam.group);

  lance = createLance({ anchors: weaponAnchors.sub.lance || anchors });
  scene.add(lance.group);

  salvo = createSalvo({ scene, anchors: weaponAnchors.sub.salvo || anchors, feel });
  rocket = createRocket({ scene, anchors: weaponAnchors.sub.rocket || anchors, feel });
  bomb = createBomb({ scene, start: params.has('bombs') ? Number(params.get('bombs')) : undefined });
  power = createPower({ scene, level: params.has('power') ? Number(params.get('power')) : 1 });
  // 翼端の雲：機体を大きく傾けた時と宙返りの間だけ、翼の先から細く流れる
  wingTrail = createRibbons({ count: 2, rows: 22, spacing: 1.0, width: 0.045, core: [0.95, 0.97, 1], edge: [0.55, 0.7, 1], gain: 0.5, parent: scene });

  applyFrame(0);
  reset();
  ready = true;
  // 遊ぶときは、シェーダーの下準備（compileAsync）が終わってから読み込みの幕を消す（止まった絵を見せない）
  if (TEST) window.__demo.ready = true;
}

// ---- 状態を絵に移す ----

const projected = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const ringScratch = new THREE.Vector4();
let flash = 0;

function updateDistortion(dt) {
  const rings = distortionPass.uniforms.uRings.value;
  for (let i = 0; i < 4; i++) rings[i].set(0, 0, 0, 0);
  const origin = new THREE.Vector3(0, 0.2, 0).applyQuaternion(flight.quaternion);
  rightVec.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const put = (i, point, radius, strength) => {
    projected.copy(point).project(camera);
    if (projected.z > 1) return;
    const p1 = point.clone().addScaledVector(rightVec, radius).project(camera);
    const rUv = Math.hypot((p1.x - projected.x) * 0.5 * camera.aspect, (p1.y - projected.y) * 0.5);
    rings[i].set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5, rUv, strength);
  };
  let strongest = 0;
  let slot = 0;
  for (let i = 0; i < Math.min(2, state.shockwaves.length); i++) {
    const w = state.shockwaves[i];
    const k = Math.pow(w.strength, 1.3);
    put(slot, origin, ringVisualRadius(w), k);
    slot += 1;
    strongest = Math.max(strongest, k);
  }
  if (shipFx) {
    for (let i = shipFx.blasts.length - 1; i >= 0 && slot < 4; i--) {
      const b = shipFx.blasts[i];
      const k = Math.pow(Math.max(0, 1 - b.age / 0.7), 1.5);
      if (k <= 0) continue;
      const pt = new THREE.Vector3(b.rel[0] + b.far[0] - fly.pos[0], b.rel[1] + b.far[1] - fly.pos[1], b.rel[2] + b.far[2] - fly.pos[2]);
      put(slot, pt, b.size * (1.0 + 16.0 * (1 - Math.pow(1 - Math.min(1, b.age / 0.7), 2))), k);
      slot += 1;
      strongest = Math.max(strongest, k);
    }
  }

  // 爆雷の波で画面を押し曲げる
  const br = bomb && bomb.screenRing;
  if (br) {
    rings[3].set(br.x, br.y, br.r, br.k * 0.9);
    strongest = Math.max(strongest, br.k);
  }
  // ステージ（ボス）の衝撃波の輪：stage.distortRing = { p: 相対の位置, r: 世界の半径, k: 強さ }
  const sr = stage && stage.distortRing;
  if (sr && !br) put(3, sr.p, sr.r, sr.k);

  flash = Math.max(0, 1 - (state.time - state.lastShock) / 0.08);
  distortionPass.uniforms.uAspect.value = camera.aspect;
  distortionPass.uniforms.uChroma.value = state.boostAmount * 0.4;
  distortionPass.uniforms.uFlash.value = flash * 0.012;
  distortionPass.uniforms.uTime.value = state.time;
  distortionPass.uniforms.uBlur.value = state.boostAmount * 0.012  + (beam ? 0.02 * beam.flash : 0);
  // 熱のゆらぎ：噴射の中ほど2か所と、主砲の砲口
  const heat = distortionPass.uniforms.uHeat.value;
  const heatAt = (i, x, y, z, radius, k) => {
    projected.set(x, y, z).applyQuaternion(flight.quaternion).project(camera);
    if (projected.z > 1) { heat[i].set(0, 0, 0, 0); return; }
    heat[i].set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5, radius, k);
  };
  if (anchors) {
    const k = 0.25 + 0.75 * state.boostAmount;
    heatAt(0, anchors.nozzleR.x, anchors.nozzleR.y, anchors.nozzleR.z - 0.7, 0.07 + 0.06 * state.boostAmount, k);
    heatAt(1, anchors.nozzleL.x, anchors.nozzleL.y, anchors.nozzleL.z - 0.7, 0.07 + 0.06 * state.boostAmount, k);
    heat[2].set(0, 0, 0, 0);
  }
  // ステージ（ボス）の熱の揺らぎ：stage.heatPoint = { p: 相対の位置, r: 画面の半径, k: 強さ }
  const hp = stage && stage.heatPoint;
  if (hp) {
    projected.copy(hp.p).project(camera);
    if (projected.z <= 1) heat[2].set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5, hp.r, hp.k);
  }
  // 爆発の光を一番新しいものへ
  if (shipFx && shipFx.blasts.length) {
    const b = shipFx.blasts[shipFx.blasts.length - 1];
    const k = Math.max(0, 1 - b.age / 0.5);
    blastLight.position.set(b.rel[0] + b.far[0] - fly.pos[0], b.rel[1] + b.far[1] - fly.pos[1], b.rel[2] + b.far[2] - fly.pos[2]);
    blastLight.intensity = k * k * b.size * b.size * 260;
    blastLight.distance = b.size * 26;
  } else {
    blastLight.intensity = 0;
  }
  if (beam && beam.hitPoint) {
    blastLight.position.set(beam.hitPoint[0], beam.hitPoint[1], beam.hitPoint[2]);
    blastLight.intensity = Math.max(blastLight.intensity, 520);
    blastLight.distance = 60;
  }
  distortionStrength = strongest * 0.5 + state.boostAmount * 0.05 + flash * 0.3;
}

const railTravel = [0, 0];
let prevHurt = 0;
function applyFrame(dt, realDt = dt) {
  RATES.pitch = fly.rate[0] / 1.7;
  RATES.yaw = fly.rate[1] / 1.1;
  RATES.roll = fly.rate[2] / 2.8;
  state.dt = dt;
  if (rig) {
    // 被弾した瞬間に機体が弾かれる
    if (enemies.hurt > prevHurt + 0.05) rig.jolt(Math.min(1, 0.45 + enemies.hurt - prevHurt));
    prevHurt = enemies.hurt;
    rig.update(state, fly, RATES);
  }

  const boost = state.boostAmount;
  const shake = state.cameraShake * 0.05 + enemies.hurt * 0.05 + (beam ? beam.recoil * 0.016 + beam.flash * 0.07 : 0);
  const recoil = beam ? beam.recoil : 0;

  if (shipRoot) {
    const pz = rig ? rig.pose : { x: 0, y: 0, z: 0 };
    // 主砲を溜める間は機体が小さく震えながら少し後ろへ沈む
    const chargeK = state.charge.firing ? 0 : state.charge.level;
    const buzz = chargeK * chargeK * 0.008;
    shipRoot.position.z = -0.06 * recoil + pz.z + feel.z - 0.05 * chargeK + moves.pose.z + 0.55 * moves.brake + 0.35 * (moves.impulse / 55);
    shipRoot.position.x = Math.sin(state.time * 53.0) * (0.012 * recoil + buzz) + pz.x + moves.tiltSlide;
    shipRoot.position.y = Math.sin(state.time * 41.0) * (0.008 * recoil + buzz) + pz.y + feel.y + moves.pose.y;
  }

  // 機体の姿勢（傾きと機首の振りは shipRoot にだけ足す）
  flight.quaternion.set(fly.q[0], fly.q[1], fly.q[2], fly.q[3]);
  if (shipRoot) {
    const p = rig ? rig.pose : null;
    // 宙返りと急減速は機首の向きに足す（照準と弾の向きは変えない）
    shipRoot.rotation.set((p ? p.lean : fly.lean) + moves.pose.pitch - 0.26 * moves.brake, (p ? p.yawTwist : 0) - (fly.tilt || 0) * 0.08, (p ? p.bank : fly.bank) + feel.roll);
    // 回避：1回転（後ろから見て、E は右回り）と、画面の上で少し横へ流れる
    if (combat.dodgeT >= 0) {
      const u = Math.min(1, combat.dodgeT / DODGE.t);
      const e = u * u * (3 - 2 * u);
      shipRoot.rotation.z += combat.dodgeDir * Math.PI * 2 * e;
      shipRoot.position.x += -combat.dodgeDir * 0.45 * Math.sin(Math.PI * u);
    }
    // 撃墜中は消え、再出撃直後は点滅する（visible は使わない。setShipHidden を参照）
    setShipHidden(!(combat.downT < 0 && (combat.safe <= 0 || Math.floor(state.time * 14) % 2 === 0)));
  }
  shipQ.copy(flight.quaternion);

  // カメラは機体の向きを少し遅れて追う
  cameraQ.slerp(shipQ, 1 - Math.exp(-CAMERA_FOLLOW * dt));
  // ボスの指定で、カメラを機体の上へ上げて引き、少し下へ向ける（大蛇の光線とのぶつかり合いを、見上げる構図で見せる）。
  // stage.viewHint = { pitch: 機首の向きを画面の上へずらす角度, up: 上げる量, back: 引く量, look: 注視点を上げる量 }（機体の大きさの単位）。
  // pitch はカメラを機体のまわりで回すので、機体の画面の位置は変わらず、機首の先（照準の消える点）だけが上下する。look は画面全体を下へずらす
  const vh = stage && stage.viewHint;
  const vk = 1 - Math.exp(-dt * 3);
  viewPitch += ((vh ? vh.pitch : 0) - viewPitch) * vk;
  viewBack += ((vh ? vh.back : 0) - viewBack) * vk;
  viewUp += ((vh ? vh.up || 0 : 0) - viewUp) * vk;
  viewLook += ((vh ? vh.look || 0 : 0) - viewLook) * vk;
  viewQ.copy(cameraQ).multiply(_qPitch.setFromAxisAngle(X_AXIS, viewPitch));
  beamView += ((beam && beam.recoil > 0.02 ? 1 : 0) - beamView) * (1 - Math.exp(-dt * 3.2));
  const ease = beamView * beamView * (3 - 2 * beamView);
  downView += ((combat.downT >= 0 ? 1 : 0) - downView) * (1 - Math.exp(-dt * (combat.downT >= 0 ? 6 : 2.2)));
  const dv = downView * downView * (3 - 2 * downView);
  // 道の区間：動く向きへ機体が画面の上を少し先行する（カメラが遅れてついてくる）
  // ボス戦は回る速さが大きいので、ずらす量を小さくする
  const railV = (stage && (stage.mode === 'rail' || stage.arena) && fly.rv) ? fly.rv : [0, 0];
  const railK = stage && stage.arena ? 0.008 : 0.02;
  railCam[0] += (-railV[0] * railK - railCam[0]) * (1 - Math.exp(-dt * 2));
  railCam[1] += (-railV[1] * railK * 0.75 - railCam[1]) * (1 - Math.exp(-dt * 2));
  // 道の区間では、機体が画面の中を実際に動き回る（カメラは道の中心寄りに残る）。向きは変えないので画面は揺れない
  const onRail = stage && stage.mode === 'rail';
  const travelK = 1 - Math.exp(-dt * 2.2);
  railTravel[0] += ((onRail ? -fly.pos[0] / RAIL.radius * 0.85 : 0) - railTravel[0]) * travelK;
  railTravel[1] += ((onRail ? -fly.pos[1] / RAIL.radius * 0.34 : 0) - railTravel[1]) * travelK;
  // 宙返りの間はカメラが後ろ上へ引いて、機体の円が画面に収まるようにする。減速は寄る
  const lv = moves.pose.view;
  const viewX = -0.3 * ease + railCam[0] + railTravel[0] + feel.sx;
  const viewY = 0.2 * ease + 1.7 * lv + feel.sy + railTravel[1];
  _v.set(
    viewX + Math.sin(state.time * 61.0) * shake + Math.sin(state.time * 23.7) * shake * 0.4,
    CAMERA_BASE.y + viewY + railCam[1] + 2.6 * dv + Math.sin(state.time * 47.3) * shake * 0.8 + viewUp,
    CAMERA_BASE.z - 0.25 * boost - 0.5 * ease - 9.0 * dv - 5.2 * lv + 0.45 * moves.brake - 0.6 * (moves.impulse / 55) - viewBack,
  ).applyQuaternion(viewQ);
  camera.position.copy(_v);
  camera.up.set(0, 1, 0).applyQuaternion(viewQ);
  _v.set(LOOK_AT.x + viewX, LOOK_AT.y + viewY + railCam[1] + viewUp + viewLook, LOOK_AT.z - 0.5 * ease).applyQuaternion(viewQ);
  camera.lookAt(_v);
  camera.rotateZ(feel.sr);
  const squeeze = state.charge.firing ? 0 : state.charge.level * 2.0; // 溜めで視野が少し絞られ、撃つと開く
  camera.fov = 52 + 4 * boost + (beam ? beam.recoil * 3 + beam.flash * 9 : 0) + feel.fov - squeeze - 3 * moves.brake + 5 * (moves.impulse / 55);
  camera.updateProjectionMatrix();

  flight.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const fw = forwardOf(fly);
  puffs.frame(state, fly, fw, NEAR_K, dt, camera, SUN_DIR);
  background.update(state, dt, camera, renderer, fly.pos);
  if (flame.update) flame.update(state, dt);
  if (shipFx) shipFx.update(state, fly, fw, dt, RATES);
  if (vaporCone) vaporCone.update(state);
  if (stage && sceneIndex === 0) applyRegion(fly.pos[2]);
  if (outpost) {
    outpost.update(fly.pos);
    outpost.setVisible(sceneIndex === 0);
    world.setRockFilter(sceneIndex === 0 ? (stage ? stage.rockKeep : outpost.rockKeep) : null);
  }
  world.update(fly, state, forwardOf(fly), dt);
  if (fleet && sceneIndex === 0) fleet.update(state, fly.pos, dt, SUN_DIR);
  // 爆雷の波は、敵の弾を動かす間だけ当たりの球として置く（自機の武器には当たらない）
  const sweeping = bomb && bomb.sweep.radius > 0.5;
  if (sweeping) world.targets.push(bomb.sweep);
  if (shipFx) enemies.update(state, shipInfo, shipFx, dt);
  if (sweeping) world.targets.splice(world.targets.indexOf(bomb.sweep), 1);
  if (shipFx && stage) stage.update(state, shipInfo, shipFx, dt);
  shieldFx.update(dt);
  if (TEST && stage) document.documentElement.dataset.stage = JSON.stringify(stage.info);
  if (TEST && ENEMY_ON) document.documentElement.dataset.enemy = JSON.stringify(enemies.info);
  const lv2 = power ? power.level : 1;
  if (twin) twin.update(state, shipInfo, wTwin, shipFx, dt, lv2);
  if (beam) beam.update(state, dt, shipInfo, wBeam, shipFx, puffs);
  if (lance) lance.update(state, shipInfo, wLance, shipFx, puffs, dt);
  const contacts = stage ? enemies.contacts().concat(stage.contacts()) : enemies.contacts();
  const blocked = combat.downT >= 0;
  if (salvo) {
    const list = [];
    for (const c of contacts) if (c.aim) list.push(c.aim);
    salvo.update(state, shipInfo, wSalvo, shipFx, puffs, dt, frameInput, list, blocked);
    for (const l of salvo.locks) hud.lockClock(l);
  }
  if (rocket) rocket.update(state, shipInfo, wRocket, shipFx, puffs, dt, frameInput, contacts, blocked);
  if (mounts) mounts.update(dt, { main: !!frameInput.twin });
  if (bomb) {
    bomb.update(state, shipInfo, wBomb, shipFx, puffs, camera, dt, frameInput, blocked, () => {
      feel.fire('bomb');
      state.cameraShake = Math.max(state.cameraShake || 0, 0.6);
    });
  }
  if (power) {
    const got = power.update(state, shipInfo, dt);
    if (got === 'P') { feel.fire('pickup'); hud.toast(`${WEAPONS.main[LOADOUT.main].name}強化  Lv.${power.level}`); }
    if (got === 'B') {
      bomb.add(1);
      const extra = [];
      if (subKey(LOADOUT, 'salvo')) { salvo.addAmmo(SALVO.resupply); extra.push(`誘導弾 +${SALVO.resupply}`); }
      if (subKey(LOADOUT, 'rocket')) { rocket.addAmmo(ROCKET.resupply); extra.push(`ロケット +${ROCKET.resupply}`); }
      if (beam.addAmmo) { const n = beam.addAmmo(); if (n) extra.push(`${WEAPONS.heavy[LOADOUT.heavy].name} +${n}`); }
      feel.fire('pickup'); hud.toast(`補給  爆雷 +1  ${extra.join('  ')}`);
    }
  }
  // 発射の反動：ツインは左右交互に細かく、ランスは機体が沈み、主砲は溜めの量に応じて大きく
  if (state.twinShots !== prevShots) {
    if (state.twinShots > prevShots) { feel.fire('twinShot', 1 + 0.25 * (lv2 - 1), state.twinShots % 2 ? 1 : -1); if (rig) rig.recoil(0.3); reticleKick = 1; }
    prevShots = state.twinShots;
  }
  if (state.lance.volleys !== prevVolleys) {
    if (state.lance.volleys > prevVolleys) { feel.fire('lanceShot'); reticleKick = 1; }
    prevVolleys = state.lance.volleys;
  }
  const firing = state.charge.firing;
  if (firing && !prevFiring) feel.fire('beamStart', 0.45 + 0.55 * state.charge.level);
  prevFiring = firing;
  const fullNow = state.charge.level >= 1 && !firing;
  if (fullNow && !prevFull) feel.fire('beamFull');
  prevFull = fullNow;
  reticleKick *= Math.exp(-realDt * 22);
  // 翼端の雲
  if (wingTrail && anchors && shipRoot) {
    const tiltK = Math.abs(fly.tilt || 0) / 1.3;
    const w = Math.max(tiltK > 0.45 ? (tiltK - 0.45) / 0.55 : 0, moves.pose.view, combat.dodgeT >= 0 ? 0.8 : 0);
    [anchors.wingR, anchors.wingL].forEach((a, i) => {
      if (w > 0.03 && combat.downT < 0) {
        _wing.copy(a).applyMatrix4(shipRoot.matrixWorld);
        wingTrail.head(i, [_wing.x + fly.pos[0], _wing.y + fly.pos[1], _wing.z + fly.pos[2]], w);
      } else wingTrail.release(i);
    });
    wingTrail.update(fly.pos, dt, 1.8);
  }
  // 急減速の間は翼端から細い火花（空気ではなく逆噴射の散り）
  if (moves.brake > 0.3 && anchors && puffs.rnd() < dt * 40) {
    const a = puffs.rnd() < 0.5 ? anchors.wingR : anchors.wingL;
    const R = puffs.rnd;
    puffs.spark(shipInfo.toWorld(a), [(R() - 0.5) * 6, (R() - 0.5) * 6, 18 + R() * 16], 0.2 + R() * 0.2, 0.025, 0.02, 1, 3, 0);
  }
  puffs.flush();
  if (TEST || KEYLOG) document.documentElement.dataset.weapon = JSON.stringify(weaponInfo());
  const wslots = power ? weaponSlots() : null;
  if (wslots) touchPad.update(wslots);
  hud.draw(state, shipInfo, contacts, realDt, {
    dodge: 1 - combat.cool / DODGE_COOL, downT: combat.downT, downTotal: DOWN_T,
    kick: reticleKick, charge: state.charge.firing ? 0 : state.charge.level,
    salvoHold: salvo ? salvo.holding : false, locks: salvo ? salvo.locks : null, lockMax: SALVO.max,
    items: power ? power.items : null,
    weapons: power && {
      power: power.level, charge: state.charge.level, firing: state.charge.firing,
      lanceCool: state.lance.cooldown / 1.5,
      locks: salvo.locks.length, lockMax: Math.min(SALVO.max, salvo.ammo), salvoCool: salvo.cool, salvoAmmo: salvo.ammo, salvoEmpty: salvo.emptyAge,
      bombs: bomb.count, bombMax: BOMB.max, bombEmpty: bomb.emptyAge,
      loopCool: moves.cool, brake: moves.brake,
      slots: wslots,
    },
  });

  if (bodyMaterial) {
    const flapGlow = state.flapClipTime;
    bodyMaterial.emissiveIntensity = 0.45 + 0.55 * boost + 0.15 * Math.max(0, flapGlow - 1.4);
  }

  bloomPass.strength.value = BLOOM_K * (0.14 + 0.05 * boost + (beam ? 0.10 * beam.recoil + 0.25 * beam.flash : 0) + feel.bloom);
  stats.flapTime = state.flapClipTime;
}

// 機体だけの奥行きを描く（効果が機体に刺さる所をぼかすのに使う）。影を受けない材質で描くので、影の描き直しは起きない
const depthOnly = new THREE.MeshBasicNodeMaterial({ colorWrite: false });
const drawSize = new THREE.Vector2();
function renderShipDepth() {
  renderer.getDrawingBufferSize(drawSize);
  if (shipDepth.width !== drawSize.x || shipDepth.height !== drawSize.y) shipDepth.setSize(drawSize.x, drawSize.y);
  softUniforms.uRes.value.copy(drawSize);
  softUniforms.uNear.value = camera.near;
  softUniforms.uFar.value = camera.far;
  const bg = scene.background;
  scene.background = null;
  scene.overrideMaterial = depthOnly;
  camera.layers.set(1);
  renderer.setRenderTarget(shipDepth);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  camera.layers.set(0);
  scene.overrideMaterial = null;
  scene.background = bg;
}

// three の WebGPU 版の後処理は、1コマ（requestAnimationFrame 1回）に1回しか場面を描き直さない。
// 確認用の入力（do=・__demo.step）で同じコマの中に何度も描くときは、コマを進めて描き直させる
let lastFrameId = -1;
function renderFrame() {
  const nodeFrame = renderer._nodes.nodeFrame;
  if (nodeFrame.frameId === lastFrameId) nodeFrame.update();
  lastFrameId = nodeFrame.frameId;
  shadowTick += 1;
  if (shadowTick % 2 === 0 || TEST) sun.shadow.needsUpdate = true;
  const t0 = PERF ? performance.now() : 0;
  if (outpost) outpost.cull(camera, sun); // 基地の物のうち、画面に入る物と太陽の影の箱に入る物だけを描く
  updateDistortion(0);
  renderShipDepth();
  const t1 = PERF ? performance.now() : 0;
  renderer.info.reset();
  if (look) look.update(state, fly, { boost: state.boostAmount, flash });
  const t2 = PERF ? performance.now() : 0;
  renderPipeline.render();
  if (PERF) { perfPart.pre.push(t1 - t0); perfPart.look.push(t2 - t1); perfPart.rp.push(performance.now() - t2); for (const k in perfPart) if (perfPart[k].length > 60) perfPart[k].shift(); }
  stats.calls = renderer.info.render.drawCalls;
  stats.triangles = renderer.info.render.triangles;
}

function warmUp() {
  const t0 = performance.now();
  const lit = new Set();
  scene.traverseVisible((o) => { if (o.isLight) lit.add(o); });
  const restore = [];
  scene.traverse((o) => {
    if (o.isLight) return;
    if (!o.visible) { restore.push([o, 'visible', false]); o.visible = true; }
    if (o.frustumCulled) { restore.push([o, 'frustumCulled', true]); o.frustumCulled = false; }
    if (o.isInstancedMesh && o.count === 0) { restore.push([o, 'count', 0]); o.count = 1; }
  });
  scene.traverseVisible((o) => { if (o.isLight && !lit.has(o)) { restore.push([o, 'visible', true]); o.visible = false; } });
  sun.shadow.needsUpdate = true;
  renderShipDepth();
  renderer.info.reset();
  renderPipeline.render();
  for (let i = restore.length - 1; i >= 0; i--) { const [o, k, v] = restore[i]; o[k] = v; }
  document.documentElement.dataset.warm = `${Math.round(performance.now() - t0)}ms ${restore.length}`;
}

// ---- 状態の操作 ----

function weaponInfo() {
  return {
    power: power ? power.level : 0, bombs: bomb ? bomb.count : 0, bombFired: bomb ? bomb.fired : 0,
    locks: salvo ? salvo.locks.length : 0, fired: salvo ? salvo.fired : 0, flying: salvo ? salvo.flying : 0,
    loadout: LOADOUT, rocketAmmo: rocket ? rocket.ammo : 0, rocketFired: rocket ? rocket.fired : 0,
    kills, loops: moves.state.loops, looping: moves.looping, brake: +moves.brake.toFixed(2), speed: +fly.speed.toFixed(1),
    trauma: +feel.trauma.toFixed(2), stops: feel.state.stops, log: feel.state.log,
  };
}

// 1コマ分を進める。止まる間は世界の時間だけを遅らせ、揺れ・反動・入力の受け付けは実時間で動かす
function advance(realDt, inp) {
  feel.update(realDt);
  const dt = realDt * feel.timeScale;
  let ci = combatInput(inp);
  // 宙返りの間は機体が別の向きを向くので、前へ撃つ武器は止める。溜め中は宙返りに入らない
  if (moves.looping) ci = { ...ci, twin: false, charge: false };
  const canLoop = combat.downT < 0 && combat.dodgeT < 0 && state.charge.level <= 0 && !state.charge.firing;
  for (const name of moves.step(dt, ci, canLoop, fly.tilt || 0)) feel.fire(name);
  frameInput = ci;
  // ツインは押した瞬間に1発目を出す（押してから次の間隔を待たない）
  if (ci.twin && !prevTwinKey) state.twinTimer = Math.max(state.twinTimer, TWIN_INTERVAL);
  prevTwinKey = !!ci.twin;
  const a0 = PERF ? performance.now() : 0;
  stepShip(state, dt, ci);
  stepFly(dt, ci);
  const a1 = PERF ? performance.now() : 0;
  combatStep(dt);
  guideStep(realDt);
  const a2 = PERF ? performance.now() : 0;
  applyFrame(dt, realDt);
  if (PERF) { perfAdvPart.fly = a1 - a0; perfAdvPart.combat = a2 - a1; perfAdvPart.apply = performance.now() - a2; }
}

function step(sec, input) {
  const frames = Math.max(1, Math.round(sec / DT));
  const inp = input || {};
  for (let i = 0; i < frames; i++) advance(DT, inp);
  renderFrame();
  return state;
}

function reset() {
  state = createShipState();
  fly = createFlightState();
  if (params.has('stagez')) fly.pos[2] = Number(params.get('stagez'));
  cameraQ.identity();
  beamView = 0;
  downView = 0;
  Object.assign(combat, { dodgeT: -1, dodgeDir: 0, cool: 0, downT: -1, safe: 0, grace: 0, queued: 0 });
  guideSeen.reset(); guide.hide(); guideShieldLow = false; guideBombWanted = false; guideCheckT = 0;
  if (shipRoot) {
    shipRoot.position.set(0, 0, 0);
    shipRoot.rotation.set(0, 0, 0);
  }
  puffs.reset();
  rig && rig.reset();
  shipFx && shipFx.reset();
  lance && lance.reset();
  twin && twin.reset && twin.reset();
  background.reset && background.reset();
  beam && beam.reset && beam.reset();
  feel.reset();
  moves.reset();
  salvo && salvo.reset();
  rocket && rocket.reset();
  bomb && bomb.reset(params.has('bombs') ? Number(params.get('bombs')) : undefined);
  power && power.reset(params.has('power') ? Number(params.get('power')) : 1);
  wingTrail && wingTrail.clear();
  hud.reset();
  kills = 0; prevShots = 0; prevFiring = false; prevVolleys = 0; prevFull = false; reticleKick = 0; frameInput = {}; prevTwinKey = false;
  applyFrame(0);
  renderFrame();
}

function anchorsOut() {
  return {
    nozzleR: anchors.nozzleR.toArray(),
    nozzleL: anchors.nozzleL.toArray(),
    wingR: anchors.wingR.toArray(),
    wingL: anchors.wingL.toArray(),
    nose: anchors.nose.toArray(),
  };
}

// ---- 外から見る口 ----

window.__demo = {
  ready: false,
  reset,
  step,
  stats: () => ({
    ...stats,
    material: { ...stats.material },
    shockCount: state.shockCount,
    flapTime: state.flapClipTime,
  }),
  anchors: anchorsOut,
  camera: () => ({
    position: camera.position.toArray(),
    forward: camera.getWorldDirection(new THREE.Vector3()).toArray(),
  }),
  debugFx: () => ({
    hinge: { aileron: rig.R.aileron.quaternion.angleTo(rig.R.aileron.userData.base), wing: rig.R.wing.rotation.z },
    flameOrigins: [anchors.nozzleR.toArray(), anchors.nozzleL.toArray()],
    flameDirection: [0, 0, -1],
    shockRings: state.shockwaves.map((w) => ({ radius: w.radius, strength: w.strength, age: w.age })),
    distortionStrength,
    twinVisible: state.twinBolts.length,
    twinOrigins: [weaponAnchors.main.wingR.toArray(), weaponAnchors.main.wingL.toArray()],
    beamVisible: beam ? beam.visible : false,
    beamOrigin: weaponAnchors.heavy.nose.toArray(),
    beamDirection: [0, 0, 1],
    beamLength: BEAM_LENGTH,
    ribbonsVisible: state.lance.ribbons.length,
  }),
};

// ---- 入力 ----

const keys = new Set();
// 一瞬だけ押して離したキーも、次のコマで1回は押されたことにする（コマの間に押して離すと取りこぼすため）
const tapped = new Set();
const HOLD_PLAN = (params.get('hold') || '').split(',').filter(Boolean).map((x) => { const [code, r] = x.split('@'); const [at, len] = r.split('~'); return { code, at: Number(at), len: Number(len), was: false }; });
const holdStart = performance.now();
// キーの押し下げ。キーボードとタッチの操作（src/touch.js）が同じ口を使う
function keyDown(code, repeat = false) {
  keys.add(code);
  if (!repeat) tapped.add(code);
  if (!repeat && code === 'KeyR' && stage && stage.cleared) location.reload();
  if (!repeat && (code === 'KeyQ' || code === 'KeyE')) {
    const now = performance.now();
    if (now - lastTap[code] < 280) { combat.queued = code === 'KeyE' ? 1 : -1; lastTap[code] = -9999; } else lastTap[code] = now;
  }
}
function keyUp(code) { keys.delete(code); }
// 一時停止（spec REQ-017）。読み込みの幕の間と確認用の起動（test=1）では止めない
const pauseGate = createPauseGate();
let gameRunning = false;
let pauseMenu = null;
let pausedRedraw = false;
function setPaused(on) {
  on = !!on;
  if (on === pauseGate.paused) return;
  if (on && !gameRunning) return;
  if (on) {
    pauseGate.pause();
    tapped.clear();
    touchPad.release();
    audio.setPaused(true);
    pauseMenu.open();
    document.documentElement.classList.add('paused');
    document.documentElement.dataset.paused = '1';
  } else {
    pauseGate.resume();
    tapped.clear();
    lastTap.KeyQ = lastTap.KeyE = -9999;
    lastTick = 0;
    fpsCount = 0;
    fpsStart = performance.now();
    if (look && look.resetClock) look.resetClock();
    audio.setPaused(false);
    pauseMenu.close();
    document.documentElement.classList.remove('paused');
    delete document.documentElement.dataset.paused;
  }
}
window.addEventListener('keydown', (e) => {
  const r = pauseGate.keyDown(e.code, e.repeat);
  if (r === 'toggle') {
    if (gameRunning) { e.preventDefault(); setPaused(!pauseGate.paused); }
    return;
  }
  if (r === 'drop') return;
  keyDown(e.code, e.repeat);
  if (e.code.indexOf('Arrow') === 0 || e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => { pauseGate.keyUp(e.code); keyUp(e.code); });
// タッチの端末の操作：左のスティックと右の4つのボタン（spec REQ-014）
const touchPad = createTouch({ down: (c) => { if (!pauseGate.paused) keyDown(c); }, up: keyUp, pause: () => setPaused(true), dodge: (d) => { if (!pauseGate.paused) combat.queued = d; } });
window.addEventListener('blur', () => { keys.clear(); pauseGate.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && gameRunning && !DEMO) setPaused(true); });

// 副武装のキー：構成で決まる（入っていない武装は押しても出ない）
const SUB_CODE = { lance: 'none', salvo: 'none', rocket: 'none' };
for (const w of Object.keys(SUB_CODE)) { const k = subKey(LOADOUT, w); if (k) SUB_CODE[w] = k[0]; }

// 画面の下の武装の列：構成の順に [キー, 名前, 右の数字, 線の長さ, 使えるか, 区切りの数]
function weaponSlots() {
  const out = [];
  const mainH = twin.hud ? twin.hud(state, power.level) : [`Lv.${power.level}`, power.level / 3, true, 3];
  out.push(['Z', WEAPONS.main[LOADOUT.main].name, ...mainH]);
  const lv = state.charge.level;
  const heavyH = beam.hud ? beam.hud(state) : [state.charge.firing ? '発射' : (lv >= 1 ? '最大' : ''), state.charge.firing ? 1 : lv, true, 0];
  out.push(['X', WEAPONS.heavy[LOADOUT.heavy].name, ...heavyH]);
  LOADOUT.subs.forEach((w, i) => {
    const key = SUB_KEYS[i][1];
    let h;
    if (w === 'lance') { const c = state.lance.cooldown / 1.5; h = ['', 1 - c, c <= 0, 0]; }
    else if (w === 'salvo') { const empty = salvo.ammo <= 0; h = [salvo.locks.length ? `${salvo.locks.length}/${Math.min(SALVO.max, salvo.ammo)}` : (empty ? 'EMPTY' : String(salvo.ammo)), empty ? 0 : 1 - salvo.cool, !empty && salvo.cool <= 0, 0]; }
    else { const r = rocket.hud(); h = [r[0], r[1], r[2], 0]; }
    out.push([key, WEAPONS.sub[w].name, ...h]);
  });
  out.push(['B', '爆雷', String(bomb.count), bomb.count / BOMB.max, bomb.count > 0, BOMB.max]);
  out.push(['F', '宙返り', '', 1 - moves.cool, moves.cool <= 0, 0]);
  return out;
}

function readInput() {
  // 確認用（?hold=KeyV@3~0.9,Space@9~0.7）: 起動からの秒で、そのキーを押し続けたことにする
  if (HOLD_PLAN.length) {
    const t = (performance.now() - holdStart) / 1000;
    for (const h of HOLD_PLAN) {
      const on = t >= h.at && t < h.at + h.len;
      if (on) keys.add(h.code); else if (h.was) keys.delete(h.code);
      h.was = on;
    }
  }
  const on = (c) => keys.has(c) || tapped.has(c);
  const inp = {
    boost: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    twin: on('KeyZ'),
    charge: keys.has('KeyX'),
    lance: on(SUB_CODE.lance),
    left: keys.has('ArrowLeft') || keys.has('KeyA'),
    right: keys.has('ArrowRight') || keys.has('KeyD'),
    up: keys.has('ArrowUp') || keys.has('KeyW'),
    down: keys.has('ArrowDown') || keys.has('KeyS'),
    rollLeft: keys.has('KeyQ'),
    rollRight: keys.has('KeyE'),
    salvo: keys.has(SUB_CODE.salvo),
    rocket: on(SUB_CODE.rocket),
    bomb: on('KeyB'),
    loop: on('KeyF'),
    brake: keys.has('Space'),
  };
  tapped.clear();
  return inp;
}

const DEMO_PLAN = [
  { dur: 2, input: {} },
  { dur: 4, input: { boost: true } },
  { dur: 2, input: {} },
  { dur: 2, input: { twin: true } },
  { dur: 3, input: { charge: true } },
  { dur: 2, input: { lance: true } },
];
const DEMO_TOTAL = DEMO_PLAN.reduce((a, p) => a + p.dur, 0);

function demoInput(t) {
  let rest = t % DEMO_TOTAL;
  for (const phase of DEMO_PLAN) {
    if (rest < phase.dur) return phase.input;
    rest -= phase.dur;
  }
  return {};
}

// ---- 起動 ----

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (TOUCH_PR) renderer.setPixelRatio(touchPixelRatio()); // 向き・Safari のバーで画面の大きさが変わったら描く画素比も合わせる
  renderer.setSize(w, h);
  if (pauseGate.paused) pausedRedraw = true;
}
window.addEventListener('resize', resize);

let lastTick = 0;
let fpsCount = 0;
let fpsStart = 0;
const liveInput = { boost: false, twin: false, charge: false, lance: false, left: false, right: false, up: false, down: false, rollLeft: false, rollRight: false, salvo: false, bomb: false, loop: false, brake: false };

// ?perf=1 の計測：描く呼び出しを場面ごとに計り、行列の更新の時間も計る
const perfR = { main: [], other: [], mat: [] };
if (PERF) {
  const r0 = renderer.render.bind(renderer);
  renderer.render = (sc, cam) => { const t = performance.now(); const v = r0(sc, cam); (sc === scene ? perfR.main : perfR.other).push(performance.now() - t); return v; };
  const u0 = scene.updateMatrixWorld.bind(scene);
  scene.updateMatrixWorld = (f) => { const t = performance.now(); u0(f); perfR.mat.push(performance.now() - t); };
  // 描画の作り（シェーダー）に 15ms 以上かかった物を、名前・材質・位置で data-slowpipe に残す（途中で作られて止まる物を探す）
  const PL = renderer._pipelines; const gfr = PL.getForRender.bind(PL); const slowPipe = [];
  PL.getForRender = (ro, ...rest) => {
    const t = performance.now(); const n0 = PL.caches.size; const v = gfr(ro, ...rest); const d = performance.now() - t;
    if (d > 15) { slowPipe.push(`${Math.round(d)}ms z${Math.round(fly.pos[2])} ${ro.object.name || ro.object.type}/${ro.material.name || ro.material.type}${PL.caches.size > n0 ? '(新)' : ''}`); if (slowPipe.length > 40) slowPipe.shift(); document.documentElement.dataset.slowpipe = slowPipe.join(' | '); }
    return v;
  };
  // 描く1回ごとに、場面の直下のどのまとまりか・どのカメラ（主・影・その他）かを数える
  const ro0 = renderer.renderObject.bind(renderer);
  const top = (o) => { while (o.parent && o.parent !== scene) o = o.parent; return o.parent === scene ? scene.children.indexOf(o) : -1; };
  window.__perfDraw = {};
  renderer.renderObject = (object, sc, cam, ...rest) => {
    const k = `${cam === camera ? '主' : cam.isOrthographicCamera ? '影' : '他'}${top(object)}`;
    window.__perfDraw[k] = (window.__perfDraw[k] || 0) + 1;
    return ro0(object, sc, cam, ...rest);
  };
  setInterval(() => { const d = window.__perfDraw; window.__perfDraw = {}; const tot = Number(document.documentElement.dataset.fpsn || 1); document.documentElement.dataset.draws = Object.entries(d).sort((x, y) => y[1] - x[1]).slice(0, 14).map(([k, v]) => `${k}:${Math.round(v / 2 / Math.max(1, Number(document.documentElement.dataset.fps || 1)))}`).join(' '); }, 2000);
  // 場面の直下ごとに、中の物の数（見えている数/全部）を一度だけ出す
  setTimeout(() => {
    const rows = [];
    for (const c of scene.children) {
      let n = 0, v = 0, sh = 0; c.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { n++; if (o.visible) v++; if (o.castShadow) sh++; } });
      const names = []; c.traverse((o) => { if (names.length < 4 && o !== c && (o.name || o.isMesh)) names.push(`${o.name || '-'}(${o.isInstancedMesh ? 'I' + o.count : o.isMesh ? 'M' : o.type})`); });
      const kids = c.children.length;
      if (n > 5) rows.push(`${c.name || c.type}[子${kids}]:${v}/${n}/影${sh} ${names.join(',')}`);
      if (n > 100 && n < 1000) for (const k of c.children) { let kn = 0, kv = 0; const nm = []; k.traverse((o) => { if (o.isMesh) { kn++; if (o.visible) kv++; if (nm.length < 3 && o.name) nm.push(o.name); } }); rows.push(`  ・${k.name || k.type}:${kv}/${kn} ${nm.join(',')}`); }
    }
    document.documentElement.dataset.tree = rows.join(' ');
    // 描く回数の多いまとまりの番号と中身の名前（data-draws の番号と合わせて読む）
    // 自機（shipRoot）の下にある光の数と名前（隠すと場面の光の数が変わる物）
    if (shipRoot) { const ls = []; shipRoot.traverse((o) => { if (o.isLight) ls.push(`${o.type}(${o.parent?.name || o.parent?.type})`); }); document.documentElement.dataset.shiplights = `${ls.length} ${ls.join(',')}`; }
    { const ls = []; flight.traverse((o) => { if (o.isLight) ls.push(o.type); }); document.documentElement.dataset.flightlights = String(ls.length); }
    document.documentElement.dataset.idx = scene.children.map((c, i) => { const nm = []; c.traverse((o) => { if (nm.length < 3 && (o.isMesh || o.isPoints || o.isSprite || o.isLine)) nm.push(`${o.name || o.material?.name || o.type}${o.isInstancedMesh ? '(I' + o.count + ')' : ''}`); }); return `${i}:${c.name || c.type}[${nm.join(',')}]`; }).join(' | ');
  }, 9000);
}
// ?perf=1 の計測：15コマごとに GPU の時間を読み、直近30回の中央値を data 属性へ出す
const perfGpu = []; const perfCpu = []; let perfN = 0; const perfHitch = []; let perfHitchN = 0; let perfLights = -1; let perfLightChg = 0; const perfLast = { adv: 0, rend: 0, aud: 0, fly: 0, combat: 0, apply: 0 }; const perfAdvPart = { fly: 0, combat: 0, apply: 0 };
const perfMed = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0; };
const perfAdv = []; const perfPart = { pre: [], look: [], rp: [] };
function perfSample(cpuMs, advMs) {
  perfCpu.push(cpuMs); if (perfCpu.length > 60) perfCpu.shift();
  perfAdv.push(advMs); if (perfAdv.length > 60) perfAdv.shift();
  if (++perfN % 15) return;
  const el = document.documentElement.dataset;
  el.cpu = perfMed(perfCpu).toFixed(2);
  el.adv = perfMed(perfAdv).toFixed(2);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  el.rend = `main ${(sum(perfR.main) / 15).toFixed(1)}ms/${(perfR.main.length / 15).toFixed(1)}回 other ${(sum(perfR.other) / 15).toFixed(1)}ms/${(perfR.other.length / 15).toFixed(1)}回 mat ${(sum(perfR.mat) / 15).toFixed(1)}ms/${(perfR.mat.length / 15).toFixed(1)}回`;
  for (const k in perfR) perfR[k].length = 0;
  el.parts = `pre ${perfMed(perfPart.pre).toFixed(1)} look ${perfMed(perfPart.look).toFixed(1)} rp ${perfMed(perfPart.rp).toFixed(1)} shadow ${scene.children.length}`;
  el.calls = String(renderer.info.render.drawCalls); el.tris = String(renderer.info.render.triangles);
  let meshes = 0, vis = 0; scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { meshes++; if (o.visible) vis++; } });
  el.objs = `${vis}/${meshes}`;
  renderer.resolveTimestampsAsync('render').then((ms) => {
    if (!(ms > 0)) return;
    perfGpu.push(ms); if (perfGpu.length > 30) perfGpu.shift();
    el.gpu = perfMed(perfGpu).toFixed(2);
  });
  renderer.resolveTimestampsAsync('compute').then((ms) => { if (ms > 0) el.gpucompute = ms.toFixed(2); });
}

function tick(now) {
  requestAnimationFrame(tick);
  // 止めている間は時間を進めない。大きさが変わったときだけ1回描き直す（spec REQ-017）
  if (pauseGate.paused) {
    lastTick = 0;
    // 描き直しの前に look の時計を合わせ、止めていた時間を1コマの長さ・重さに数えない（数えると描く解像度が下がっていた）
    if (pausedRedraw) { pausedRedraw = false; if (look && look.resetClock) look.resetClock(); renderFrame(); }
    return;
  }
  const ms = lastTick ? now - lastTick : 16.7;
  lastTick = now;
  // ?perf=1：引っかかり（50ms を超えたコマ）を、時刻・位置・長さで data-hitch に残す（直近20件）
  if (PERF && ms > 50 && fpsStart > 0) { perfHitch.push(`${(now / 1000).toFixed(1)}s z${Math.round(fly.pos[2])} ${Math.round(ms)}ms(進${Math.round(perfLast.adv)}[飛${Math.round(perfLast.fly)}戦${Math.round(perfLast.combat)}反${Math.round(perfLast.apply)}]/描${Math.round(perfLast.rend)}/音${Math.round(perfLast.aud)})`); if (perfHitch.length > 40) perfHitch.shift(); document.documentElement.dataset.hitch = perfHitch.join(' | '); document.documentElement.dataset.hitchn = String(++perfHitchN); }
  const dt = Math.min(1 / 20, ms / 1000);

  if (DEMO) {
    demoTimer += dt;
    Object.assign(liveInput, demoInput(demoTimer));
  } else {
    Object.assign(liveInput, readInput());
  }
  const cpu0 = PERF ? performance.now() : 0;
  advance(dt, liveInput);
  fpsCount++;
  if (now - fpsStart >= 1000) {
    document.documentElement.dataset.fps = String(Math.round(fpsCount * 1000 / (now - fpsStart)));
    fpsCount = 0;
    fpsStart = now;
  }
  window.__flight = { pos: fly.pos.slice(), q: fly.q.slice(), speed: fly.speed, mach: state.mach, shockCount: state.shockCount, twinShots: state.twinShots };
  if (PERF) { let n = 0; scene.traverseVisible((o) => { if (o.isLight) n++; }); if (n !== perfLights) { if (perfLights >= 0) document.documentElement.dataset.lightchg = String(++perfLightChg) + ` (${perfLights}→${n})`; perfLights = n; } }
  const cpu1 = PERF ? performance.now() : 0;
  renderFrame();
  const cpu2 = PERF ? performance.now() : 0;
  if (PERF) perfSample(cpu2 - cpu0, cpu1 - cpu0);
  audio.frame(dt, feel.timeScale, { state, boost: liveInput.boost ? 1 : 0, brake: liveInput.brake ? 1 : 0, downT: combat.downT, enemies: ENEMY_ON ? enemies : null, salvo, bomb, stage, z: fly.pos[2] });
  if (PERF) { perfLast.adv = cpu1 - cpu0; perfLast.rend = cpu2 - cpu1; perfLast.aud = performance.now() - cpu2; perfLast.fly = perfAdvPart.fly; perfLast.combat = perfAdvPart.combat; perfLast.apply = perfAdvPart.apply; }
}

// 最初のシーン（宣言がそろってから当てる）
applyScene(Math.max(0, Math.min(SCENES.length - 1, (Number(params.get('scene')) || 1) - 1)));

// 確認用: ?perf=1 で読み込みの段ごとの時刻（ページを開いてからの ms。main＝このモジュールを読み始めた時）を data-loadms に出す
const loadMark = (k) => { if (PERF) document.documentElement.dataset.loadms = `${document.documentElement.dataset.loadms || ''} ${k}:${Math.round(performance.now())}`.trim(); };
loadMark('main');
Promise.all([
  new Promise((resolve, reject) => loader.load(`${FRAME.base}.glb`, resolve, undefined, reject)),
  loadAirframeMaps(texLoader, FRAME),
  loadWeaponModels(loader).then((m) => { weaponModels = m; }),
  enemyReady,
  outpost ? outpost.ready : Promise.resolve(),
  stage ? stage.ready : Promise.resolve(),
  panoReady,
  background.starsReady || Promise.resolve(),
]).then(async ([gltf, maps]) => {
  loadMark('assets');
  setupShip(gltf, maps);
  audio.attach({ feel, shipFx, hud });
  // 確認用: ?killat=秒 で実時間のままその秒に敵を沈める（撃沈の重さを測る）
  // 確認用: ?pdownat=秒 で実時間のままその秒に自機を撃墜させる（撃墜の重さを測る）
  if (params.has('pdownat')) setTimeout(() => enemies.forceDown(), Number(params.get('pdownat')) * 1000);
  if (params.has('killat')) setTimeout(() => enemies.damage(1e6, state), Number(params.get('killat')) * 1000);
  if (TEST) window.__dbg = { enemies, scene, background, bloomPass, distortionPass, flame, renderer, renderPipeline, feel, moves, salvo, bomb, power, twin, beam, rocket, weaponInfo, get fly() { return fly; }, get state() { return state; } };
  // 実機で押されたキーを確かめるための控え（確認用: ?keylog=1）
  if (params.has('keylog')) window.addEventListener('keydown', (e) => { document.documentElement.dataset.keylog = (document.documentElement.dataset.keylog || '') + e.code + ' '; });
  // 途中で初めて出る物（重巡洋艦など）で止まらないよう、シェーダーと絵を先に用意する
  if (!TEST) {
    await renderer.compileAsync(scene, camera);
    loadMark('compile');
    const seen = new Set();
    scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        if (seen.has(m)) continue;
        seen.add(m);
        for (const v of Object.values(m)) if (v && v.isTexture) renderer.initTexture(v);
      }
    });
  }
  // 読み込みの幕の裏で、隠れている物（重巡洋艦・大蛇・敵の弾・効果・基地の別の細かさ）も1回だけ実際に描き、
  // ゲームで使うシェーダーを先に作る（compileAsync は画面に入っている物しか作らず、初めて映った瞬間に止まっていた）。
  // 光の数は変えない（隠れた物の中の光は消したまま）。確認用: ?warm=0 で切る
  // 最初の区間の映り込み・光を、下準備の前に当てておく（最初のコマで材質が組み直されないように）
  if (stage && sceneIndex === 0) applyRegion(fly.pos[2]);
  loadMark('tex');
  if (!TEST && params.get('warm') !== '0') warmUp();
  loadMark('warm');
  // 読み込み中に積んだ GPU の仕事（画像の転送・シェーダーの作成・下準備の描画）が終わるまで幕を残す。
  // 待たずに幕を開けると、最初のコマが GPU の待ちで 2〜3 秒固まっていた（11/8 の測定。spec REQ-013）
  const gpuQueue = !TEST && renderer.backend && renderer.backend.device && renderer.backend.device.queue;
  if (gpuQueue) { await gpuQueue.onSubmittedWorkDone(); loadMark('gpu'); }
  // iPhone などで GPU が落ちる（メモリ不足・アプリを裏へ回した）と、絵がそのまま固まる。気づいたら知らせ、触れたら読み直す（spec REQ-014）
  const showGpuLost = (why) => {
    if (document.getElementById('gpulost')) return;
    document.documentElement.dataset.gpulost = why;
    const el = document.createElement('div'); el.id = 'gpulost';
    el.textContent = '画面の処理が止まりました。タップすると読み直します';
    el.addEventListener('pointerup', () => location.reload());
    document.body.appendChild(el);
  };
  const gpuDev = renderer.backend && renderer.backend.device;
  if (gpuDev && gpuDev.lost) gpuDev.lost.then((info) => { if (info.reason !== 'destroyed') showGpuLost(info.reason || 'unknown'); });
  renderer.domElement.addEventListener('webglcontextlost', () => showGpuLost('webgl'));
  if (!TEST) {
    // 操作の一覧（一時停止のメニュー）：今の積み方の武装の名前と、ボタンが何をするか
    const MAIN_DO = { twin: '撃つ' };
    const HEAVY_DO = { cannon: '長押しで溜めて撃つ', rail: '長押しで溜めて撃つ' };
    const SUB_DO = { lance: '押して撃つ', salvo: '長押しで狙いを固め、離して撃つ', rocket: '押して撃つ' };
    const subAt = (i) => (LOADOUT.subs[i] ? [WEAPONS.sub[LOADOUT.subs[i]].name, SUB_DO[LOADOUT.subs[i]] || '押して撃つ'] : null);
    const [s0, s1, s2] = [0, 1, 2].map(subAt);
    const opsPc = [
      ['矢印 / WASD', '動く', '上下左右'],
      ['Z', WEAPONS.main[LOADOUT.main].name, MAIN_DO[LOADOUT.main] || '撃つ'],
      ['X', WEAPONS.heavy[LOADOUT.heavy].name, HEAVY_DO[LOADOUT.heavy] || '長押しで溜めて撃つ'],
      ...LOADOUT.subs.map((w, i) => [SUB_KEYS[i][1], WEAPONS.sub[w].name, SUB_DO[w] || '押して撃つ']),
      ['B', '爆雷', '周りの弾を消す'],
      ['F', '宙返り', '弾をくぐる'],
      ['Q / E', '回避', '2回押す'],
      ['Shift / Space', '加速・減速', ''],
    ];
    const opsTouch = [
      ['左のスティック', '動く', 'はじくと回避'],
      ['×', WEAPONS.main[LOADOUT.main].name, MAIN_DO[LOADOUT.main] || '撃つ'],
      ['□', WEAPONS.heavy[LOADOUT.heavy].name, HEAVY_DO[LOADOUT.heavy] || '長押しで溜めて撃つ'],
      ...(s0 ? [['○', s0[0], s0[1]]] : []),
      ...(s1 ? [['△', s1[0], s1[1]]] : []),
      ...(s2 ? [['小ボタン', s2[0], s2[1]]] : []),
      ['宙返り', '', '弾をくぐる'],
      ['爆雷', '', '周りの弾を消す'],
      ['回避', '', 'スティックの向きへ避ける'],
      ['BOOST / BRAKE', '', '加速・減速'],
    ];
    pauseMenu = createPauseMenu({ onResume: () => setPaused(false), onHangar: () => location.assign(hangarUrl(location.href)), getVolume: (k) => audio.volume[k], setVolume: (k, v) => audio.setVolume(k, v), opsPc, opsTouch });
    gameRunning = true;
    window.__demo.ready = true; requestAnimationFrame(tick);
  }
  else lastTick = 0;
  // 確認用: ?test=1&at=秒 で、音速を越えてからその秒数の絵に止める
  // 確認用: ?test=1&do=boost:2,charge:1.4,idle:0.2 のように入力と秒数を並べて、その時点の絵に止める
  if (TEST && params.has('do')) {
    for (const part of params.get('do').split(',')) {
      const [name, sec] = part.split(':');
      if (name === 'pdown') { enemies.forceDown(); continue; }
      // 確認用：前方に爆発（boom:大きさ）・自機の被弾（hurt:量）・前方から弾を1発（bolt:種類）
      if (name === 'boom') { shipFx.explode([14, 4, 80], Number(sec) || 3); continue; }
      if (name === 'hurt') { enemies.hurtPlayer(Number(sec) || 12, state, [0.4, 0.3, 0.8], shipFx); continue; }
      if (name === 'bolt') { enemies.fireBolt([6, 2, 70], fly.pos, (() => { const d = [-6, -2, -70]; const l = Math.hypot(...d); return d.map((v) => v / l); })(), 110, Number(sec) || 0); continue; }
      if (name === 'drop') { power.drop(sec === 'B' ? 'B' : 'P', [4, 2, 40], fly.pos); continue; }
      if (name === 'bossturrets') { stage.debugHit('turrets', 999); continue; }
      if (name === 'bosscore') { stage.debugHit('core', 999); continue; }
      if (name === 'aim') {
        const r = world.nearestAhead(forwardOf(fly), [], Number(sec) || 0);
        if (r) {
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), r.rel.clone().normalize());
          fly.q = [q.x, q.y, q.z, q.w];
          cameraQ.copy(q);
        }
        continue;
      }
      const inp = {};
      for (const k of name.split('+')) if (k !== 'idle') inp[k] = true;
      window.__demo.step(Number(sec), inp);
    }
  }
  // 確認用: ?cam=close で右の噴射口に寄る（機体が初期の向きのときだけ正しい）
  const VIEWS = { top: [[0, 3.2, 0], [0, 0, 0.001]], side: [[3.2, 0.2, 0], [0, 0.2, 0]], back: [[0, 0.25, -3], [0, 0.25, 0]], front: [[0, 0.25, 3], [0, 0.25, 0]], rear34: [[1.6, 1.2, -2.2], [0, 0.1, 0]] };
  if (VIEWS[params.get('cam')]) {
    const [a, b] = VIEWS[params.get('cam')];
    camera.position.set(...a); camera.up.set(0, 1, 0); if (params.get('cam') === 'top') camera.up.set(0, 0, 1);
    camera.lookAt(...b); camera.fov = 26; camera.updateProjectionMatrix();
    renderFrame();
  }
  if (params.get('cam') === 'close') {
    camera.position.set(-0.36, 0.42, -0.78);
    camera.lookAt(-0.2165, 0.3193, -0.4998);
    camera.fov = 40;
    camera.updateProjectionMatrix();
    renderFrame();
  }
  const applyView = () => {
    if (!VIEWS[params.get('cam')]) return;
    const [a, b] = VIEWS[params.get('cam')];
    camera.position.set(...a); camera.up.set(0, 1, 0); if (params.get('cam') === 'top') camera.up.set(0, 0, 1);
    camera.lookAt(...b); camera.fov = 26; camera.updateProjectionMatrix();
    renderFrame();
  };
  if (TEST && params.has('at')) {
    let n = 0;
    while (state.shockCount === 0 && n < 600) { stepShip(state, DT, { boost: true }); applyFrame(DT); n += 1; }
    window.__demo.step(Number(params.get('at')), { boost: true });
    applyView();
  }
}).catch((err) => {
  console.error(err);
  // LOADING のまま止めず、理由を幕に出す（spec REQ-013）
  const el = document.getElementById('loading');
  if (el) el.textContent = `読み込みに失敗しました。再読み込みしてください（${(err && err.message) || err}）`;
});
