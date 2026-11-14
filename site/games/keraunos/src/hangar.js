import * as THREE from 'three';
import {
  Fn, pass, positionWorld, positionView, instancedBufferAttribute, viewportSize, screenDPR,
  vec3, vec4, float, abs, fract, smoothstep, step, max, length, exp, atan, mix,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { smoothstepR } from './fx/soft.js';
import { AIRFRAMES } from './airframes.js';
import { WEAPONS, PAINT_PRESETS, PAINT_SWATCHES, SUB_KEYS, loadLoadout, saveLoadout, normalize, frameStats, loadoutWeight } from './loadout.js';
import { loadAirframeMaps, makeShipMaterial, repairTangents } from './materials.js';
import { loadWeaponModels, createWeaponMounts, mountLoadout } from './weaponMounts.js';
import { audio } from './audio/index.js';
import { startPrefetch, stopPrefetch } from './prefetch.js';
import { TOUCH, touchPixelRatio } from './touch.js';

// 出撃前の機体選択。格納庫の中で機体を見ながら、機体・武装・塗装を順に決める。
// 武装は枠を選ぶと、機体のその場所へカメラが寄り、候補に触れるだけで模型が付け替わる。
// ゲーム本体（main.js）はこの画面が閉じてから読み込む。

const CSS = `
#hangar { position: fixed; inset: 0; z-index: 20; color: var(--ui-ink); font-family: var(--ui-jp); background: #04060a; user-select: none; overflow: hidden; --hg-panel: rgba(7,10,15,.62); --hg-good: #7fe3b4; --hg-bad: #ff7a66; }
#hangar canvas.hg-view { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
#hangar canvas.hg-view:active { cursor: grabbing; }
#hangar svg.hg-lines { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
#hangar .hg-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(3,5,8,.72) 0, rgba(3,5,8,0) 30%, rgba(3,5,8,0) 70%, rgba(3,5,8,.72) 100%), linear-gradient(180deg, rgba(3,5,8,.7) 0, rgba(3,5,8,0) 16%, rgba(3,5,8,0) 78%, rgba(3,5,8,.75) 100%); }

#hangar .hg-head { position: absolute; left: 40px; right: 40px; top: 26px; display: flex; align-items: center; justify-content: space-between; }
#hangar .hg-title span { display: block; font: 400 12px/1 var(--ui-num); letter-spacing: .34em; color: var(--ui-amber); }
#hangar .hg-title b { display: block; margin-top: 7px; font-size: 21px; font-weight: 600; letter-spacing: .2em; }
#hangar .hg-tabs { position: absolute; left: 50%; top: 0; transform: translateX(-50%); display: flex; gap: 6px; }
#hangar .hg-tab { position: relative; min-width: 148px; padding: 10px 22px 12px; background: none; border: none; color: var(--ui-dim); font: 600 15px var(--ui-jp); letter-spacing: .24em; cursor: pointer; transition: color .15s; }
#hangar .hg-tab i { display: block; font: 400 12px/1 var(--ui-num); font-style: normal; letter-spacing: .2em; margin-bottom: 5px; opacity: .7; }
#hangar .hg-tab::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: 0; height: 2px; background: var(--ui-amber); transform: scaleX(0); transition: transform .22s cubic-bezier(.2,.8,.2,1); }
#hangar .hg-tab:hover { color: var(--ui-ink); }
#hangar .hg-tab.on { color: var(--ui-ink); }
#hangar .hg-tab.on::after { transform: scaleX(1); }
#hangar .hg-tab.on i { color: var(--ui-amber); opacity: 1; }
#hangar .hg-name { text-align: right; }
#hangar .hg-name span { display: block; font: 400 12px/1 var(--ui-num); letter-spacing: .34em; color: var(--ui-dim); }
#hangar .hg-name b { display: block; margin-top: 7px; font-size: 21px; font-weight: 600; letter-spacing: .2em; }

#hangar .hg-col { position: absolute; top: 104px; bottom: 124px; width: 348px; display: flex; flex-direction: column; overflow-y: auto; scrollbar-width: none; animation: hgIn .28s cubic-bezier(.2,.8,.2,1); }
#hangar .hg-col.l { left: 40px; }
#hangar .hg-col.r { right: 40px; --hg-from: 18px; }
@keyframes hgIn { from { opacity: 0; transform: translateX(var(--hg-from, -18px)); } to { opacity: 1; transform: none; } }
#hangar h3 { flex: none; margin: 0 0 10px; font: 400 12px/1 var(--ui-jp); letter-spacing: .2em; color: var(--ui-dim); display: flex; justify-content: space-between; align-items: baseline; }
#hangar h3 em { font-style: normal; font-size: 11px; letter-spacing: .06em; }
#hangar .hg-tile { flex: none; position: relative; display: block; width: 100%; text-align: left; color: inherit; font: inherit; border: none; background: var(--hg-panel); backdrop-filter: blur(10px); cursor: pointer; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%); transition: background .14s, transform .14s; }
#hangar .hg-tile::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background .14s; }
#hangar .hg-tile:hover { background: rgba(26,32,42,.82); transform: translateX(3px); }
#hangar .hg-tile.on { background: linear-gradient(90deg, rgba(76,56,28,.82), rgba(34,28,20,.72)); }
#hangar .hg-tile.on::before { background: var(--ui-amber); }
#hangar .hg-tile:focus-visible { outline: 1px solid var(--ui-amber); outline-offset: 1px; }

#hangar .hg-slot { display: grid; grid-template-columns: 34px 1fr 92px; align-items: center; gap: 10px; padding: 9px 14px; margin-bottom: 6px; min-height: 52px; }
#hangar .hg-slot .key { font: 400 26px/1 var(--ui-num); color: var(--ui-amber); text-align: center; }
#hangar .hg-slot .t small { display: block; font-size: 11px; letter-spacing: .14em; color: var(--ui-dim); margin-bottom: 3px; }
#hangar .hg-slot .t b { font-size: 16px; font-weight: 600; letter-spacing: .06em; }
#hangar .hg-slot img { width: 92px; height: 42px; object-fit: contain; opacity: .92; }
#hangar .hg-slot.fixed { cursor: default; opacity: .62; }
#hangar .hg-slot.fixed:hover { transform: none; background: var(--hg-panel); }

#hangar .hg-opt { padding: 9px 14px 11px 16px; margin-bottom: 6px; }
#hangar .hg-opt .top { display: grid; grid-template-columns: 1fr 128px; gap: 8px; align-items: center; }
#hangar .hg-opt .nm b { display: block; font-size: 17px; font-weight: 600; letter-spacing: .08em; }
#hangar .hg-opt .nm span { display: inline-block; margin-top: 5px; padding: 2px 7px 3px; font-size: 11px; letter-spacing: .08em; color: var(--ui-amber); border: 1px solid rgba(233,184,114,.45); }
#hangar .hg-opt img { width: 128px; height: 50px; object-fit: contain; }
#hangar .hg-opt p { margin: 5px 0 7px; font-size: 11.5px; line-height: 1.55; color: rgba(232,236,239,.72); }
#hangar .hg-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
#hangar .hg-spec { display: grid; grid-template-columns: 46px 1fr auto; align-items: center; gap: 6px; font-size: 10px; color: var(--ui-dim); }
#hangar .hg-spec i { position: relative; display: block; height: 5px; background: rgba(232,236,239,.1); transform: skewX(-24deg); overflow: hidden; }
#hangar .hg-spec i u { position: absolute; left: 0; top: 0; bottom: 0; background: var(--ui-ink); transition: width .22s; }
#hangar .hg-spec em { min-width: 26px; font: 400 14px/1 var(--ui-num); font-style: normal; color: var(--ui-ink); text-align: right; font-variant-numeric: tabular-nums; }
#hangar .hg-spec em s { text-decoration: none; margin-left: 5px; font-size: 13px; }
#hangar .up { color: var(--hg-good); } #hangar .down { color: var(--hg-bad); }

#hangar .hg-frames { position: absolute; left: 50%; bottom: 122px; transform: translateX(-50%); display: flex; gap: 10px; animation: hgUp .28s cubic-bezier(.2,.8,.2,1); }
@keyframes hgUp { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }
#hangar .hg-frame { width: 250px; padding: 10px 16px 13px 18px; }
#hangar .hg-frame img { display: block; width: 100%; height: 74px; object-fit: contain; margin-bottom: 4px; }
#hangar .hg-frame .n { display: flex; align-items: baseline; gap: 10px; }
#hangar .hg-frame .n i { font: 400 24px/1 var(--ui-num); font-style: normal; color: var(--ui-amber); }
#hangar .hg-frame .n b { font-size: 17px; font-weight: 600; letter-spacing: .08em; }
#hangar .hg-frame p { margin: 5px 0 0; font-size: 12px; line-height: 1.6; color: rgba(232,236,239,.7); }

#hangar .hg-region { display: grid; grid-template-columns: 40px 1fr auto; gap: 12px; align-items: center; padding: 10px 14px 10px 16px; margin-bottom: 6px; }
#hangar .hg-region s { display: block; width: 40px; height: 26px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); clip-path: polygon(0 0, 100% 0, 100% 70%, 80% 100%, 0 100%); }
#hangar .hg-region b { font-size: 15px; font-weight: 600; letter-spacing: .1em; }
#hangar .hg-region code { font: 400 15px/1 var(--ui-num); letter-spacing: .08em; color: var(--ui-dim); }
#hangar .hg-sw { flex: none; display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; padding: 12px; background: var(--hg-panel); backdrop-filter: blur(10px); }
#hangar .hg-sw button { aspect-ratio: 1; border: none; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); transition: transform .1s; }
#hangar .hg-sw button:hover { transform: scale(1.14); }
#hangar .hg-sw button.on { outline: 2px solid var(--ui-amber); outline-offset: 1px; }
#hangar .hg-custom { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; margin-top: 6px; background: var(--hg-panel); font-size: 13px; letter-spacing: .08em; cursor: pointer; }
#hangar .hg-custom input { width: 44px; height: 24px; padding: 0; border: none; background: none; cursor: pointer; }
#hangar .hg-custom input::-webkit-color-swatch-wrapper { padding: 0; }
#hangar .hg-custom input::-webkit-color-swatch { border: 1px solid rgba(255,255,255,.3); }
#hangar .hg-preset { display: grid; grid-template-columns: 1fr auto; align-items: center; padding: 8px 14px 8px 16px; margin-bottom: 5px; font-size: 14px; font-weight: 600; letter-spacing: .1em; }
#hangar .hg-preset span { display: flex; gap: 2px; }
#hangar .hg-preset span s { display: block; width: 16px; height: 16px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }

#hangar .hg-foot { position: absolute; left: 40px; right: 40px; bottom: 28px; height: 78px; display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }
#hangar .hg-sum { display: flex; gap: 30px; }
#hangar .hg-sum .it { width: 132px; }
#hangar .hg-sum small { display: block; font-size: 11px; letter-spacing: .12em; color: var(--ui-dim); }
#hangar .hg-sum b { display: block; margin: 5px 0 6px; font: 400 32px/1 var(--ui-num); font-variant-numeric: tabular-nums; }
#hangar .hg-sum b s { text-decoration: none; font-size: 15px; margin-left: 6px; }
#hangar .hg-sum i { position: relative; display: block; height: 5px; background: rgba(232,236,239,.1); transform: skewX(-24deg); overflow: hidden; }
#hangar .hg-sum i u { position: absolute; left: 0; top: 0; bottom: 0; background: var(--ui-ink); transition: width .25s; }
#hangar .hg-right { display: flex; align-items: flex-end; gap: 22px; }
#hangar .hg-keys { font-size: 11px; line-height: 1.9; letter-spacing: .08em; color: var(--ui-dim); text-align: right; }
#hangar .hg-keys b { font: 400 13px var(--ui-num); color: var(--ui-ink); margin: 0 3px; }
#hangar .hg-go { position: relative; min-width: 270px; height: 74px; background: var(--ui-amber); border: none; color: #120d06; cursor: pointer; clip-path: polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%); transition: filter .12s, transform .12s; }
#hangar .hg-go:hover { filter: brightness(1.14); transform: translateY(-1px); }
#hangar .hg-go b { display: block; font: 400 30px/1 var(--ui-num); letter-spacing: .42em; text-indent: .42em; }
#hangar .hg-go small { display: block; margin-top: 5px; font: 600 11px var(--ui-jp); letter-spacing: .3em; }
#hangar .hg-cover { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; transition: opacity .55s ease-in; }
#hangar.leaving .hg-cover { opacity: 1; }
#hangar .hg-load { position: absolute; inset: 0; display: grid; place-items: center; background: #04060a; font: 400 13px var(--ui-num); letter-spacing: .5em; color: var(--ui-dim); transition: opacity .5s; pointer-events: none; }
#hangar[data-ready] .hg-load { opacity: 0; }

/* スマホの横画面など低い画面（spec REQ-014）：同じ部品を詰めて並べ、切り欠きを避け、キーボードの操作説明は隠す */
@media (max-height: 560px) {
  #hangar { --hg-sl: env(safe-area-inset-left, 0px); --hg-sr: env(safe-area-inset-right, 0px); }
  #hangar .hg-head { left: calc(var(--hg-sl) + 16px); right: calc(var(--hg-sr) + 16px); top: 10px; }
  #hangar .hg-title span { font-size: 9px; letter-spacing: .26em; }
  #hangar .hg-title b { margin-top: 4px; font-size: 15px; letter-spacing: .14em; }
  #hangar .hg-tabs { gap: 2px; }
  #hangar .hg-tab { min-width: 0; padding: 3px 14px 7px; font-size: 12px; letter-spacing: .16em; }
  #hangar .hg-tab i { font-size: 9px; margin-bottom: 3px; }
  #hangar .hg-tab::after { left: 8px; right: 8px; }
  #hangar .hg-name span { font-size: 9px; letter-spacing: .26em; }
  #hangar .hg-name b { margin-top: 4px; font-size: 15px; letter-spacing: .14em; }
  #hangar .hg-col { top: 56px; bottom: 74px; width: min(300px, 37vw); }
  #hangar .hg-col.l { left: calc(var(--hg-sl) + 16px); }
  #hangar .hg-col.r { right: calc(var(--hg-sr) + 16px); }
  #hangar h3 { margin-bottom: 6px; font-size: 10px; }
  #hangar .hg-slot { grid-template-columns: 24px 1fr 64px; gap: 8px; padding: 5px 10px; margin-bottom: 4px; min-height: 38px; }
  #hangar .hg-slot .key { font-size: 19px; }
  #hangar .hg-slot .t small { font-size: 9px; margin-bottom: 1px; }
  #hangar .hg-slot .t b { font-size: 13px; }
  #hangar .hg-slot img { width: 64px; height: 30px; }
  #hangar .hg-opt { padding: 6px 10px 8px 12px; margin-bottom: 4px; }
  #hangar .hg-opt .top { grid-template-columns: 1fr 88px; }
  #hangar .hg-opt .nm b { font-size: 14px; }
  #hangar .hg-opt .nm span { margin-top: 3px; font-size: 9px; }
  #hangar .hg-opt img { width: 88px; height: 34px; }
  #hangar .hg-opt p { margin: 3px 0 5px; font-size: 10px; line-height: 1.45; }
  #hangar .hg-spec { grid-template-columns: 40px 1fr auto; font-size: 9px; }
  #hangar .hg-spec em { font-size: 12px; }
  #hangar .hg-frames { bottom: 74px; gap: 6px; }
  #hangar .hg-frame { width: min(196px, 26vw); padding: 6px 10px 8px 12px; }
  #hangar .hg-frame img { height: 46px; margin-bottom: 2px; }
  #hangar .hg-frame .n { gap: 7px; }
  #hangar .hg-frame .n i { font-size: 18px; }
  #hangar .hg-frame .n b { font-size: 13px; }
  #hangar .hg-frame p { margin-top: 3px; font-size: 10px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  #hangar .hg-region { grid-template-columns: 30px 1fr auto; gap: 8px; padding: 6px 10px; margin-bottom: 4px; }
  #hangar .hg-region s { width: 30px; height: 20px; }
  #hangar .hg-region b, #hangar .hg-region code { font-size: 12px; }
  #hangar .hg-sw { gap: 4px; padding: 8px; }
  #hangar .hg-preset { padding: 6px 10px 6px 12px; font-size: 12px; }
  #hangar .hg-custom { padding: 7px 10px; font-size: 11px; }
  #hangar .hg-foot { left: calc(var(--hg-sl) + 16px); right: calc(var(--hg-sr) + 16px); bottom: 10px; height: 54px; gap: 14px; }
  #hangar .hg-sum { gap: 14px; }
  #hangar .hg-sum .it { width: 82px; }
  #hangar .hg-sum small { font-size: 9px; letter-spacing: .08em; }
  #hangar .hg-sum b { margin: 3px 0 4px; font-size: 20px; }
  #hangar .hg-sum b s { font-size: 11px; }
  #hangar .hg-keys { display: none; }
  #hangar .hg-go { min-width: 176px; height: 52px; clip-path: polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%); }
  #hangar .hg-go b { font-size: 21px; }
  #hangar .hg-go small { margin-top: 3px; font-size: 9px; }
}
/* iPhone の Safari（タブ・アドレスバーで高さ約 280px）：機体のカードを左に縦に並べ、説明を外して、真ん中の機体を空ける（11/9、カードの後ろに機体が隠れていた） */
@media (max-height: 360px) {
  #hangar .hg-head { top: 6px; }
  #hangar .hg-title span, #hangar .hg-name span { font-size: 8px; }
  #hangar .hg-title b, #hangar .hg-name b { margin-top: 3px; font-size: 13px; }
  #hangar .hg-tab { padding: 2px 10px 5px; font-size: 11px; }
  #hangar .hg-tab i { display: none; }
  #hangar .hg-col { top: 40px; bottom: 56px; width: min(250px, 31vw); }
  #hangar .hg-frames { left: calc(var(--hg-sl) + 16px); top: 40px; bottom: auto; transform: none; flex-direction: column; gap: 4px; width: min(220px, 27vw); animation: none; }
  #hangar .hg-frame { width: auto; padding: 4px 8px 5px 10px; display: grid; grid-template-columns: 52px 1fr; align-items: center; gap: 6px; }
  #hangar .hg-frame img { width: 52px; height: 26px; margin: 0; }
  #hangar .hg-frame p { display: none; }
  #hangar .hg-frame .n i { font-size: 15px; }
  #hangar .hg-frame .n b { font-size: 12px; }
  #hangar .hg-foot { bottom: 6px; height: 44px; }
  #hangar .hg-sum { gap: 10px; }
  #hangar .hg-sum .it { width: 68px; }
  #hangar .hg-sum small { font-size: 8px; }
  #hangar .hg-sum b { margin: 2px 0 3px; font-size: 16px; }
  #hangar .hg-go { min-width: 140px; height: 42px; }
  #hangar .hg-go b { font-size: 18px; }
  #hangar .hg-go small { margin-top: 2px; font-size: 8px; }
}
`;

const FRAME_DESC = {
  a: '低い楔形の基準機。どの武装でも癖が出ない',
  b: '針の機首と単発エンジン。速いが盾が薄く、重い武装は積みにくい',
  c: '幅広の翼に双発。遅いが盾が厚く、副武装を3つ積める',
};
const PAINT_LABELS = ['主塗装', '差し色', '地金', '発光'];
const SPECS = [
  ['dps', '持続火力', (w) => String(Math.round(w.dps)), 1],
  ['burst', '一撃', (w) => String(Math.round(w.burst)), 1],
  ['range', '射程', (w) => String(Math.round(w.range)), 1],
  ['ammo', '弾数', (w) => (w.ammo === null ? '∞' : String(w.ammo)), 1],
  ['weight', '重さ', (w) => String(w.weight), -1],
];

// 格納庫：床（映り込みの上に薄く重ねる）・壁の柱・天井の光の列・舞うほこり
function buildBay(scene) {
  const g = new THREE.Group();
  // 床は霧を使わない（遠くの床も模様の色のまま、半透明で下の鏡像を透かす）
  const floorMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  floorMat.fragmentNode = Fn(() => {
    const p = positionWorld.xz;
    const r = length(p);
    const line = (v, w) => smoothstep(float(0.5).sub(w), 0.5, abs(fract(v).sub(0.5)));
    const tile = max(line(p.x.mul(1.25), 0.012), line(p.y.mul(1.25), 0.012));
    const base = vec3(0.018, 0.022, 0.03).add(vec3(0.02, 0.024, 0.03).mul(exp(r.mul(r).mul(-0.35))));
    const c = base.add(vec3(0.012, 0.015, 0.02).mul(tile)).toVar();
    const ring = smoothstepR(0.006, 0.0, abs(r.sub(0.86))).mul(0.9).add(smoothstepR(0.003, 0.0, abs(r.sub(0.92))).mul(0.35));
    // 真ん中（0, 0）で atan が値を持たず NaN になって発光で広がらないよう、x をわずかにずらす
    const seg = step(0.5, fract(atan(p.y, p.x.add(1e-6)).div(6.2832).mul(48.0)));
    c.addAssign(vec3(0.95, 0.68, 0.36).mul(ring).mul(mix(0.35, 1.0, seg)));
    const hazard = step(0.5, fract(p.x.add(p.y).mul(3.0))).mul(smoothstepR(0.08, 0.0, abs(p.y.add(2.6)).sub(0.06)));
    c.addAssign(vec3(0.5, 0.36, 0.1).mul(hazard).mul(0.35));
    const a = mix(0.74, 0.96, smoothstep(0.2, 3.5, r));
    return vec4(c, a);
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1;
  g.add(floor);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowNodeMaterial({ opacity: 0.6, depthWrite: false }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = 0.002; shadowFloor.receiveShadow = true; shadowFloor.renderOrder = 2;
  g.add(shadowFloor);

  const wall = new THREE.MeshStandardNodeMaterial({ color: 0x2a3038, roughness: 0.62, metalness: 0.55 });
  const dark = new THREE.MeshStandardNodeMaterial({ color: 0x151920, roughness: 0.72, metalness: 0.45 });
  const add = (w, h, d, x, y, z, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };
  const HW = 5.2; const H = 3.4; const L = 9;
  add(HW * 2, 0.1, L * 2, 0, H, 0, dark);
  add(0.1, H, L * 2, -HW, H / 2, 0, dark); add(0.1, H, L * 2, HW, H / 2, 0, dark);
  add(HW * 2, H, 0.1, 0, H / 2, L, dark); add(HW * 2, H, 0.1, 0, H / 2, -L, dark);
  const strip = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(1.6, 1.75, 2.0) });
  const warm = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(2.2, 1.45, 0.7) });
  for (let i = -3; i <= 3; i++) {
    const z = i * 2.4;
    for (const s of [-1, 1]) {
      add(0.34, H, 0.5, s * (HW - 0.2), H / 2, z, wall);
      add(0.04, 1.3, 0.08, s * (HW - 0.4), 1.5, z, i % 2 ? strip : warm);
    }
    add(HW * 2, 0.26, 0.42, 0, H - 0.2, z, wall);
    for (const x of [-2.2, 2.2]) add(1.5, 0.03, 0.09, x, H - 0.36, z + 1.2, strip);
  }
  for (let i = -5; i <= 5; i++) add(0.86, H - 0.5, 0.2, i * 0.95, (H - 0.5) / 2, L - 0.2, i % 2 ? wall : dark);
  add(0.1, H - 0.5, 0.05, 0, (H - 0.5) / 2, L - 0.32, warm);
  const pl = new THREE.PointLight(0xffc98a, 2.2, 9); pl.position.set(0, 2.6, 0.5); g.add(pl);
  // 壁を照らす光（柱の光の列の代わりに少数で）
  for (const [x, z, c] of [[-4.2, -3, 0x9cc4ff], [4.2, -3, 0x9cc4ff], [-4.2, 3.5, 0xffc08a], [4.2, 3.5, 0xffc08a]]) {
    const w = new THREE.PointLight(c, 9, 8, 1.6); w.position.set(x, 1.6, z); g.add(w);
  }
  const N = 260; const pos = new Float32Array(N * 3); const R = () => Math.random();
  for (let i = 0; i < N; i++) { pos[i * 3] = (R() - 0.5) * 7; pos[i * 3 + 1] = R() * 2.6; pos[i * 3 + 2] = (R() - 0.5) * 7; }
  // ほこりの点。WebGPU の点は常に1画素なので、カメラへ向く四角を粒の数だけ並べて描く（描画は1回）。
  // 今の版の点は大きさ 0.008（遠いほど小さい）で、1画素に満たない粒は1画素に切り上がっていた。同じ大きさにそろえる
  const dustMat = new THREE.PointsNodeMaterial({ color: 0xa8b4c4, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false });
  dustMat.positionNode = instancedBufferAttribute(new THREE.InstancedBufferAttribute(pos, 3));
  dustMat.sizeNode = max(viewportSize.y.mul(0.5 * 0.008).div(positionView.z.negate()), 1.0).div(screenDPR);
  const dust = new THREE.Sprite(dustMat);
  dust.count = N;
  dust.frustumCulled = false; // 粒は原点から ±3.5 に散っているので、原点の小さな囲みで外さない
  g.add(dust);
  scene.add(g);
  return { dust };
}

function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicNodeMaterial({ color: 0x06080c, side: THREE.BackSide })));
  const box = (w, h, c, pos, rot, tint = [1, 1, 1.05]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(c * tint[0], c * tint[1], c * tint[2]), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  for (let i = -3; i <= 3; i++) box(5, 0.5, 4.2, [0, 8, i * 2.6], [Math.PI / 2, 0, 0]);
  box(1.0, 9, 3.4, [-9, 2, 2], [0, Math.PI / 2, 0]);
  box(1.0, 9, 2.0, [9, 2, -3], [0, -Math.PI / 2, 0]);
  box(14, 0.5, 1.8, [0, 1.2, -10], [0, 0, 0], [1.3, 0.9, 0.5]);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.015).texture;
  pm.dispose();
  env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return tex;
}

export async function openHangar() {
  // 音は描画の準備を待たずに読み始める（格納庫の曲・操作音を早く鳴らす。spec REQ-013）
  audio.startMenu();
  // WebGPU で描く（使えないブラウザでは three.js が WebGL2 に切り替える）。確認用: ?webgl=1 で WebGL2 の経路を強制する。
  // 描画先の確保（init）を待ってから画面を組み立てる。縁のぎざぎざは描画の段（pass の samples）で消すので、画面の側では取らない
  const renderer = new THREE.WebGPURenderer({ antialias: false, forceWebGL: new URLSearchParams(location.search).has('webgl') });
  renderer.domElement.className = 'hg-view';
  // スマホは画面の大きさから描く画素比を決める（touch.js の touchPixelRatio。PC は 1.75 のまま。spec REQ-014）
  renderer.setPixelRatio(TOUCH ? touchPixelRatio() : Math.min(1.75, devicePixelRatio));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  await renderer.init();
  // 札の絵の読み戻しは、WebGL2 では下の行から、WebGPU では上の行から並んで返る
  const readsBottomUp = !renderer.backend.isWebGPUBackend;

  // ?look=1 の見え方の段（src/render/look.js）を待つため、中身を async で包む。旗なしは await を通らないので今までと同じ順に動き、
  // 組み立ての途中の失敗は今までどおりこの Promise の失敗になる
  return new Promise((resolve, reject) => { (async () => {
    let L = loadLoadout();
    let tab = 'frame';
    let slotSel = 'main';
    let regionSel = 0;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    const root = document.createElement('div'); root.id = 'hangar';
    document.body.appendChild(root);
    root.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060a);
    scene.fog = new THREE.Fog(0x05070c, 7, 24);
    const env = studioEnvironment(renderer);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    const key = new THREE.DirectionalLight(0xfff1e0, 1.5);
    key.position.set(-1.8, 3.4, 1.4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cc8ff, 1.4); rim.position.set(2.5, 1.2, -3); scene.add(rim);
    const under = new THREE.DirectionalLight(0xffb060, 0.35); under.position.set(0, -2, 1); scene.add(under);
    const hemiL = new THREE.HemisphereLight(0x324058, 0x0a0806, 0.3); scene.add(hemiL);
    const bay = buildBay(scene);
    const FLOAT = 0.3;
    const craft = new THREE.Group(); craft.position.y = FLOAT; scene.add(craft);
    // 床の映り込み：機体の鏡像を床の下に置き、半透明の床を重ねる
    const mirror = new THREE.Group(); mirror.scale.y = -1; mirror.position.y = -FLOAT; scene.add(mirror);

    // 場面を描く（半精度・4倍の縁取り）→ 発光を足す → 色の仕上げ（ACES と sRGB は RenderPipeline が最後に掛ける）
    // 発光の強さは今の版の 0.32 の3倍。r186 の UnrealBloomPass は合成で強さを3倍していたが、BloomNode は掛けないため
    const scenePass = pass(scene, camera, { samples: 4 });
    // 見え方の底上げ（src/render/、担当は別セッション）：?look=1 のときだけ読み込む（格納庫は暗く変な影が出ると國松の指摘を受け、元の見た目に戻した）
    const LQ = new URLSearchParams(location.search);
    const look = LQ.get('look') === '1' ? await (await import('./render/look.js')).createLook({ renderer, scene, camera, scenePass, sun: key, hemi: hemiL, params: LQ, preset: 'hangar' }) : null;
    const sceneColor = look ? look.sceneColor : scenePass.getTextureNode('output');
    const bloomPass = bloom(sceneColor, 0.32 * 3, 0.7, 0.95);
    const pipeline = new THREE.RenderPipeline(renderer);
    if (look) look.attach(pipeline);
    pipeline.outputNode = look ? look.finish(sceneColor, bloomPass) : sceneColor.add(bloomPass);

    const loader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();
    const cache = {};
    let models = null;
    let mounts = null;
    let mirrorMounts = null;
    function loadFrame(id) {
      if (cache[id]) return cache[id];
      const f = AIRFRAMES[id];
      cache[id] = Promise.all([
        new Promise((res, rej) => loader.load(`${f.base}.glb`, res, undefined, rej)),
        loadAirframeMaps(texLoader, f),
      ]).then(([gltf, maps]) => {
        const mat = makeShipMaterial({ maps, envMap: env, part: id, paint: L.paint, gain: 0.85 });
        mat.envMapIntensity = 0.9;
        mat.emissiveIntensity = 1.2;
        gltf.scene.traverse((o) => { if (o.isMesh) { repairTangents(o.geometry); o.material = mat; o.castShadow = true; o.receiveShadow = true; } });
        return { obj: gltf.scene, mat, ghost: gltf.scene.clone(true) };
      });
      return cache[id];
    }
    let shown = null;
    let want = null;
    function refit() {
      if (!shown || !mounts) return;
      mountLoadout(mounts, AIRFRAMES[L.frame], L, shown.obj);
      mountLoadout(mirrorMounts, AIRFRAMES[L.frame], L, shown.ghost);
    }
    async function show(id) {
      want = id;
      const s = await loadFrame(id);
      if (want !== id) return;
      if (shown) {
        craft.remove(shown.obj); mirror.remove(shown.ghost);
        for (const m of [mounts, mirrorMounts]) if (m) for (const k of [...m.built.keys()]) m.remove(k);
      }
      shown = s;
      s.mat.userData.setPaint(L.paint);
      craft.add(s.obj);
      mirror.add(s.ghost);
      refit();
      if (mounts) { root.dataset.ready = id; startPrefetch(); if (new URLSearchParams(location.search).has('perf') && !document.documentElement.dataset.hangart) document.documentElement.dataset.hangart = String(Math.round(performance.now())); } // 格納庫が出たら、出撃後の素材を先に取り始める
      pulse = 1;
    }
    const equippedOf = (slot) => (slot === 'main' ? L.main : slot === 'heavy' ? L.heavy : L.subs[Number(slot.slice(3))]);
    const slotGroup = (slot) => (slot === 'main' || slot === 'heavy' ? slot : 'sub');
    const hpOf = (slot) => { const f = AIRFRAMES[L.frame]; return slot === 'main' ? f.hp.main : slot === 'heavy' ? f.hp.heavy : f.hp.sub[Number(slot.slice(3))]; };
    // 触れている候補を、その枠にだけ試しに付ける
    function preview(slot, weapon) {
      if (!mounts || !shown) return;
      const pair = slot !== 'heavy';
      mounts.mount(slot, weapon, hpOf(slot), pair, shown.obj);
      mirrorMounts.mount(slot, weapon, hpOf(slot), pair, shown.ghost);
      mounts.kick(slot, 0.8); pulse = 1;
    }

    // カメラ：段と枠で寄る場所を変える。ドラッグで回せる
    const cam = { yaw: 2.5, pitch: 0.26, dist: 3.0, tx: 0, ty: 0.12, tz: 0 };
    const goal = { ...cam };
    let auto = true; let drag = null; let idle = 0; let pulse = 0;
    function aim() {
      if (tab === 'weapon') {
        auto = false;
        const hp = hpOf(slotSel);
        if (slotSel === 'heavy') Object.assign(goal, { yaw: 2.65, pitch: 0.5, dist: 1.95, tx: 0, ty: FLOAT + hp[1] + 0.02, tz: hp[2] + 0.08 });
        else Object.assign(goal, { yaw: 2.35, pitch: 0.42, dist: 1.55, tx: hp[0] * 0.8, ty: FLOAT + hp[1], tz: hp[2] });
      } else if (tab === 'paint') {
        auto = true;
        Object.assign(goal, { pitch: 0.34, dist: 2.3, tx: 0, ty: FLOAT + 0.08, tz: 0 });
      } else {
        auto = true;
        Object.assign(goal, { pitch: 0.26, dist: 3.0, tx: 0, ty: 0.12, tz: 0 });
      }
    }
    const view = renderer.domElement;
    view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', (e) => {
      if (!drag) return;
      goal.yaw = cam.yaw = drag.yaw + (e.clientX - drag.x) * 0.008;
      goal.pitch = cam.pitch = Math.max(0.03, Math.min(1.25, drag.pitch + (e.clientY - drag.y) * 0.005));
      idle = 0;
    });
    view.addEventListener('pointerup', () => { drag = null; });
    view.addEventListener('wheel', (e) => { goal.dist = Math.max(1.1, Math.min(4, goal.dist * (1 + e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });

    function resize() {
      const w = innerWidth; const h = innerHeight;
      if (TOUCH) renderer.setPixelRatio(touchPixelRatio());
      renderer.setSize(w, h, false); // 描画の段（pass・発光）は描画の大きさに自動で合わせる
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    addEventListener('resize', resize); resize();

    root.insertAdjacentHTML('beforeend', `
      <div class="hg-shade"></div>
      <svg class="hg-lines"><path id="hgLine" fill="none" stroke="#e9b872" stroke-width="1.2"/><circle id="hgDot" r="5" fill="none" stroke="#e9b872" stroke-width="1.5"/><circle id="hgDot2" r="1.8" fill="#e9b872"/></svg>
      <div class="hg-head">
        <div class="hg-title"><span>KERAUNOS　/　SORTIE PREPARATION</span><b>出撃準備</b></div>
        <nav class="hg-tabs" id="hgTabs">
          <button class="hg-tab" data-tab="frame"><i>01</i>機体</button>
          <button class="hg-tab" data-tab="weapon"><i>02</i>武装</button>
          <button class="hg-tab" data-tab="paint"><i>03</i>塗装</button>
        </nav>
        <div class="hg-name"><span id="hgCode"></span><b id="hgName"></b></div>
      </div>
      <div id="hgBody"></div>
      <div class="hg-foot">
        <div class="hg-sum" id="hgSum"></div>
        <div class="hg-right">
          <div class="hg-keys" id="hgKeys"></div>
          <button class="hg-go" id="hgGo"><b>SORTIE</b><small>${document.documentElement.classList.contains('touch') ? '出撃' : '出撃　ENTER'}</small></button>
        </div>
      </div>
      <div class="hg-cover"></div>
      <div class="hg-load">LOADING</div>`);
    const $ = (id) => root.querySelector(`#${id}`);

    // 札の絵：模型を1回ずつ撮って画像にする。読み戻しは GPU を待つので、画像の URL を Promise で返す
    const thumbs = {};
    function snap(obj, w, h, dir, fit) {
      if (!alive) return Promise.resolve('');
      const s = new THREE.Scene();
      const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-1, 2, 1); s.add(sun);
      s.add(new THREE.AmbientLight(0xffffff, 0.45));
      s.add(obj);
      const box = new THREE.Box3().setFromObject(obj);
      const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
      const r = Math.max(sz.x, sz.y, sz.z) * fit;
      const ca = new THREE.OrthographicCamera(-r * w / h, r * w / h, r, -r, 0.01, 20);
      ca.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(5));
      ca.lookAt(c);
      // 描画先の画像へ描くときは、トーンマップも sRGB への変換も掛からない（今の版と同じ線形の値のまま札にする）。
      // 札の場面には影を落とす光がないので、影の設定は切り替えない
      const rt = new THREE.RenderTarget(w, h, { samples: 4 });
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.render(s, ca);
      // 読み戻しの命令は描いた直後に積む。待っている間に格納庫の描画が描画先を戻しても、札の画像は描いた時のまま読める
      const read = renderer.readRenderTargetPixelsAsync(rt, 0, 0, w, h);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 1);
      return read.then((px) => {
        rt.dispose();
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const x = cv.getContext('2d'); const id = x.createImageData(w, h);
        for (let yy = 0; yy < h; yy++) {
          const src = readsBottomUp ? h - 1 - yy : yy;
          id.data.set(px.subarray(src * w * 4, (src + 1) * w * 4), yy * w * 4);
        }
        x.putImageData(id, 0, 0);
        return cv.toDataURL('image/png');
      }).catch(() => ''); // 読み戻しの途中で出撃して GPU を手放したときは、札の絵を諦める
    }
    async function makeWeaponThumbs() {
      const tmp = createWeaponMounts({ models, envMap: env, paint: ['c8c6c0', 'e0501a', '4a4c50', '66d8ff'] });
      const jobs = [];
      for (const group of Object.values(WEAPONS)) for (const w of Object.keys(group)) jobs.push(snap(tmp.instance(w), 280, 110, [1, 0.42, -0.25], 0.27).then((url) => { thumbs[w] = url; }));
      await Promise.all(jobs);
    }
    async function makeFrameThumb(id) {
      const s = await loadFrame(id);
      const base = s.ghost.clone(false);
      s.ghost.children.forEach((c) => { if (!(c.name || '').startsWith('w_')) base.add(c.clone(true)); });
      const url = await snap(base, 460, 150, [0.7, 0.8, -1], 0.33);
      if (!alive) return;
      thumbs[`f_${id}`] = url;
      render();
    }

    function setL(next, opt = {}) {
      const prev = L;
      L = normalize(next);
      saveLoadout(L);
      if (L.frame !== prev.frame) show(L.frame);
      else if (shown) {
        shown.mat.userData.setPaint(L.paint);
        if (mounts) { mounts.setPaint(L.paint); mirrorMounts.setPaint(L.paint); }
        if (!opt.keepMount && mounts) refit();
      }
      if (slotSel.startsWith('sub') && !L.subs[Number(slotSel.slice(3))]) slotSel = 'sub0';
      render();
    }

    function specMax(key) {
      let m = 0;
      for (const g of Object.values(WEAPONS)) for (const w of Object.values(g)) if (w[key] !== null) m = Math.max(m, w[key]);
      return m || 1;
    }
    function fmtDelta(d, sign) {
      if (!d) return '';
      return `<s class="${d * sign > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${Math.round(d)}</s>`;
    }
    function sumHtml(hoverL) {
      const a = frameStats(L); const b = frameStats(hoverL || L);
      const wa = loadoutWeight(L); const wb = loadoutWeight(hoverL || L);
      const items = [
        ['横の速さ', b.lateral.toFixed(1), b.lateral / 36, b.lateral - a.lateral, 1],
        ['シールド', String(b.shield), b.shield / 160, b.shield - a.shield, 1],
        ['回避の待ち', `${b.dodgeCool.toFixed(1)}s`, 1 - (b.dodgeCool - 0.6) / 2.2, b.dodgeCool - a.dodgeCool, -1],
        ['積んだ重さ', String(wb), wb / 16, wb - wa, -1],
      ];
      return items.map(([n, v, k, d, sign]) => {
        const ds = Math.abs(d) < 0.05 ? '' : `<s class="${d * sign > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${Number.isInteger(d) ? d : d.toFixed(1)}</s>`;
        return `<div class="it"><small>${n}</small><b>${v}${ds}</b><i><u style="width:${Math.max(4, Math.min(100, k * 100))}%"></u></i></div>`;
      }).join('');
    }
    function slotsHtml() {
      const rows = [['main', '主武装', 'Z'], ['heavy', '重火器', 'X'], ...L.subs.map((_, i) => [`sub${i}`, `副武装 ${i + 1}`, SUB_KEYS[i][1]])];
      const html = rows.map(([slot, label, key]) => {
        const w = equippedOf(slot); const def = WEAPONS[slotGroup(slot)][w];
        return `<button class="hg-tile hg-slot ${slotSel === slot ? 'on' : ''}" data-slot="${slot}"><span class="key">${key}</span><span class="t"><small>${label}</small><b>${def.name}</b></span>${thumbs[w] ? `<img src="${thumbs[w]}" alt="">` : '<span></span>'}</button>`;
      }).join('');
      return `<h3>取り付け位置<em>↑ ↓ で選ぶ</em></h3>${html}<div class="hg-tile hg-slot fixed"><span class="key">B</span><span class="t"><small>特殊（どの機体も同じ）</small><b>爆雷</b></span><span></span></div>`;
    }
    function optsHtml() {
      const group = slotGroup(slotSel); const cur = equippedOf(slotSel); const curDef = WEAPONS[group][cur];
      const label = { main: '主武装', heavy: '重火器', sub: '副武装' }[group];
      const cards = Object.entries(WEAPONS[group]).map(([k, w]) => {
        const usedAt = group === 'sub' ? L.subs.indexOf(k) : -1;
        const elsewhere = usedAt >= 0 && `sub${usedAt}` !== slotSel;
        const specs = SPECS.map(([key, name, fmt, sign]) => {
          const v = w[key] === null ? 1 : w[key] / specMax(key);
          const d = (w[key] === null || curDef[key] === null || k === cur) ? 0 : w[key] - curDef[key];
          return `<div class="hg-spec">${name}<i><u style="width:${Math.max(3, v * 100)}%"></u></i><em>${fmt(w)}${fmtDelta(d, sign)}</em></div>`;
        }).join('');
        return `<button class="hg-tile hg-opt ${k === cur ? 'on' : ''}" data-w="${k}">
          <div class="top"><div class="nm"><b>${w.name}</b><span>${w.role}</span></div>${thumbs[k] ? `<img src="${thumbs[k]}" alt="">` : '<span></span>'}</div>
          <p>${w.desc}${elsewhere ? `　<span style="color:var(--ui-amber)">副武装 ${usedAt + 1} と入れ替え</span>` : ''}</p><div class="hg-specs">${specs}</div></button>`;
      }).join('');
      return `<h3>${label}の候補<em>← → で替える</em></h3>${cards}`;
    }
    function render() {
      const f = AIRFRAMES[L.frame];
      $('hgCode').textContent = `TYPE-${f.id.toUpperCase()}`;
      $('hgName').textContent = f.name;
      root.querySelectorAll('.hg-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      $('hgSum').innerHTML = sumHtml();
      const keys = { frame: '<b>← →</b>機体を選ぶ', weapon: '<b>↑ ↓</b>枠　<b>← →</b>武装', paint: '<b>↑ ↓</b>場所　色を押して塗る' }[tab];
      $('hgKeys').innerHTML = `${keys}<br><b>Q E</b>段階　ドラッグで回す　ホイールで寄る`;
      const body = $('hgBody');
      if (tab === 'frame') {
        body.innerHTML = `<div class="hg-frames">${Object.values(AIRFRAMES).map((a) => `
          <button class="hg-tile hg-frame ${a.id === L.frame ? 'on' : ''}" data-frame="${a.id}">
            ${thumbs[`f_${a.id}`] ? `<img src="${thumbs[`f_${a.id}`]}" alt="">` : '<div style="height:78px"></div>'}
            <div class="n"><i>${a.id.toUpperCase()}</i><b>${a.name}</b></div><p>${FRAME_DESC[a.id]}</p></button>`).join('')}</div>`;
      } else if (tab === 'weapon') {
        body.innerHTML = `<div class="hg-col l" id="hgSlots">${slotsHtml()}</div><div class="hg-col r" id="hgOpts">${optsHtml()}</div>`;
      } else {
        const cur = L.paint[regionSel];
        body.innerHTML = `<div class="hg-col l"><h3>塗る場所<em>↑ ↓ で選ぶ</em></h3>${L.paint.map((c, i) => `
            <button class="hg-tile hg-region ${i === regionSel ? 'on' : ''}" data-region="${i}"><s style="background:#${c}"></s><b>${PAINT_LABELS[i]}</b><code>#${c.toUpperCase()}</code></button>`).join('')}
            <h3 style="margin-top:16px">塗装の型</h3>${PAINT_PRESETS.map((p, i) => `<button class="hg-tile hg-preset ${p.paint.join() === L.paint.join() ? 'on' : ''}" data-preset="${i}">${p.name}<span>${p.paint.map((c) => `<s style="background:#${c}"></s>`).join('')}</span></button>`).join('')}</div>
          <div class="hg-col r"><h3>${PAINT_LABELS[regionSel]}の色</h3>
            <div class="hg-sw">${PAINT_SWATCHES.map((c) => `<button class="${c === cur ? 'on' : ''}" data-swatch="${c}" style="background:#${c}" aria-label="#${c}"></button>`).join('')}</div>
            <label class="hg-custom">好きな色を選ぶ<input type="color" value="#${cur}" id="hgPick"></label></div>`;
      }
      aim();
    }

    function setTab(t) { if (t !== tab) audio.ui('uiOk'); tab = t; render(); }
    function paintWith(c) {
      const paint = L.paint.slice(); paint[regionSel] = c;
      setL({ ...L, paint }, { keepMount: true });
    }
    function equip(w) {
      const g = slotGroup(slotSel);
      if (g === 'main') setL({ ...L, main: w });
      else if (g === 'heavy') setL({ ...L, heavy: w });
      else {
        const subs = L.subs.slice(); const i = Number(slotSel.slice(3));
        const j = subs.indexOf(w);
        if (j >= 0) subs[j] = subs[i]; // 別の枠に入っていれば入れ替える
        subs[i] = w;
        setL({ ...L, subs });
      }
      if (mounts) mounts.kick(slotSel, 1);
      audio.ui('equip');
      pulse = 1;
    }
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab],[data-frame],[data-preset],[data-w],[data-slot],[data-region],[data-swatch]');
      if (!t) return;
      const d = t.dataset;
      if (d.tab) setTab(d.tab);
      else if (d.frame) { if (d.frame !== L.frame) audio.ui('uiOk'); setL({ ...L, frame: d.frame }); }
      else if (d.preset) setL({ ...L, paint: PAINT_PRESETS[Number(d.preset)].paint.slice() }, { keepMount: true });
      else if (d.slot) { slotSel = d.slot; audio.ui('uiMove'); render(); }
      else if (d.region) { regionSel = Number(d.region); render(); }
      else if (d.swatch) paintWith(d.swatch);
      else if (d.w) equip(d.w);
    });
    // 候補に触れたら試しに付け、性能の差を下に出す。離れたら戻す
    let hovering = null;
    root.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-w]');
      const w = t ? t.dataset.w : null;
      if (w === hovering) return;
      hovering = w;
      if (w) audio.ui('uiMove');
      if (!w || w === equippedOf(slotSel)) { refit(); $('hgSum').innerHTML = sumHtml(); return; }
      preview(slotSel, w);
      const g = slotGroup(slotSel); const trial = { ...L, subs: L.subs.slice() };
      if (g === 'main') trial.main = w; else if (g === 'heavy') trial.heavy = w; else trial.subs[Number(slotSel.slice(3))] = w;
      $('hgSum').innerHTML = sumHtml(trial);
    });
    root.addEventListener('input', (e) => {
      if (e.target.id !== 'hgPick') return;
      const paint = L.paint.slice(); paint[regionSel] = e.target.value.slice(1).toLowerCase();
      L = normalize({ ...L, paint });
      if (shown) shown.mat.userData.setPaint(L.paint);
      if (mounts) { mounts.setPaint(L.paint); mirrorMounts.setPaint(L.paint); }
    });
    root.addEventListener('change', (e) => { if (e.target.id === 'hgPick') { saveLoadout(L); render(); } });
    const onKey = (e) => {
      const TABS = ['frame', 'weapon', 'paint'];
      if (e.code === 'Enter') { go(); return; }
      if (e.code === 'KeyQ' || e.code === 'KeyE') { const i = TABS.indexOf(tab) + (e.code === 'KeyE' ? 1 : -1); setTab(TABS[(i + 3) % 3]); return; }
      if (/^Digit[123]$/.test(e.code)) { setTab(TABS[Number(e.code[5]) - 1]); return; }
      if (!e.code.startsWith('Arrow')) return;
      e.preventDefault();
      const dx = e.code === 'ArrowRight' ? 1 : e.code === 'ArrowLeft' ? -1 : 0;
      const dy = e.code === 'ArrowDown' ? 1 : e.code === 'ArrowUp' ? -1 : 0;
      if (tab === 'frame' && dx) {
        audio.ui('uiOk');
        const ids = Object.keys(AIRFRAMES); setL({ ...L, frame: ids[(ids.indexOf(L.frame) + dx + ids.length) % ids.length] });
      } else if (tab === 'weapon') {
        const slots = ['main', 'heavy', ...L.subs.map((_, i) => `sub${i}`)];
        if (dy) { slotSel = slots[(slots.indexOf(slotSel) + dy + slots.length) % slots.length]; audio.ui('uiMove'); render(); }
        if (dx) { const opts = Object.keys(WEAPONS[slotGroup(slotSel)]); equip(opts[(opts.indexOf(equippedOf(slotSel)) + dx + opts.length) % opts.length]); }
      } else if (tab === 'paint' && dy) { regionSel = (regionSel + dy + 4) % 4; audio.ui('uiMove'); render(); }
    };
    addEventListener('keydown', onKey);

    const v3 = new THREE.Vector3();
    let last = performance.now(); let alive = true; let launching = 0;
    // 導線：選んでいる枠の行から、機体の取り付け位置まで
    function drawLine() {
      const line = $('hgLine'); const d1 = $('hgDot'); const d2 = $('hgDot2');
      const row = tab === 'weapon' && root.querySelector(`[data-slot="${slotSel}"]`);
      if (!row || !shown) { line.style.display = d1.style.display = d2.style.display = 'none'; return; }
      const hp = hpOf(slotSel);
      const side = Math.sin(cam.yaw) >= 0 ? 1 : -1;
      v3.set(side * hp[0], hp[1] + 0.03, hp[2]);
      shown.obj.localToWorld(v3).project(camera);
      const x = (v3.x * 0.5 + 0.5) * innerWidth; const y = (-v3.y * 0.5 + 0.5) * innerHeight;
      const r = row.getBoundingClientRect();
      const x0 = r.right + 6; const y0 = r.top + r.height / 2;
      const mid = x0 + Math.max(18, (x - x0) * 0.35);
      line.setAttribute('d', `M${x0} ${y0} L${mid} ${y0} L${x} ${y}`);
      d1.setAttribute('cx', x); d1.setAttribute('cy', y); d2.setAttribute('cx', x); d2.setAttribute('cy', y);
      line.style.display = d1.style.display = d2.style.display = '';
    }
    function frame(now) {
      if (!alive) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      idle += dt;
      if (auto && !drag && idle > 1.2) goal.yaw += dt * 0.22;
      const k = 1 - Math.exp(-dt * 5);
      for (const n of Object.keys(cam)) cam[n] += (goal[n] - cam[n]) * k;
      camera.position.set(cam.tx + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cam.ty + Math.sin(cam.pitch) * cam.dist, cam.tz + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
      camera.lookAt(cam.tx, cam.ty, cam.tz);
      const t = now / 1000;
      const bob = Math.sin(t * 0.9) * 0.010;
      craft.position.y = FLOAT + bob;
      craft.rotation.z = Math.sin(t * 0.6) * 0.016;
      mirror.position.y = -FLOAT - bob;
      mirror.rotation.z = craft.rotation.z;
      if (launching > 0) {
        launching += dt;
        const a = Math.min(1, launching / 0.6);
        craft.position.z += dt * (1 + a * a * 22);
        mirror.position.z = craft.position.z;
      }
      pulse *= Math.exp(-dt * 3.5);
      rim.intensity = 1.4 + pulse * 2.0;
      bay.dust.rotation.y += dt * 0.012;
      if (mounts) { mounts.update(dt, { main: true }); mirrorMounts.update(dt, { main: true }); }
      drawLine();
      if (look) look.update(null, null, {});
      pipeline.render();
    }
    requestAnimationFrame(frame);

    function go() {
      if (launching) return;
      saveLoadout(L);
      removeEventListener('keydown', onKey);
      launching = 0.001;
      audio.ui('sortie'); audio.endMenu();
      stopPrefetch();
      goal.pitch = 0.1;
      root.classList.add('leaving');
      setTimeout(async () => {
        alive = false;
        removeEventListener('resize', resize);
        // 遊ぶ画面（main.js）は別の描画器を作る。格納庫の描画の段・描画先・GPU（WebGPU の端末、WebGL2 の文脈）を手放してから進む。
        // 機体の材質の共通の画像（細かい傷）は遊ぶ画面も使うので、材質と画像は消さず、描画器ごと手放す
        pipeline.dispose(); bloomPass.dispose(); scenePass.dispose();
        if (look && look.dispose) look.dispose();
        for (const k of Object.keys(cache)) cache[k].then((s) => s.obj.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }));
        env.dispose();
        await renderer.dispose();
        root.remove(); style.remove();
        resolve(L);
      }, 620);
    }
    $('hgGo').addEventListener('click', go);
    // 通信の声を、格納庫にいる間に台詞の表の順で先に取っておく（出撃後の最初の台詞から声が乗るように）
    import('./commCast.js').then(({ LINES }) => audio.prefetchVoices(LINES.filter((l) => !l.noVoice).map((l) => `./assets/voice/${l.id}.ogg`))).catch(() => {});

    render();
    loadWeaponModels(loader).then((m) => {
      models = m;
      mounts = createWeaponMounts({ models, envMap: env, paint: L.paint, gain: 0.85 });
      mirrorMounts = createWeaponMounts({ models, envMap: env, paint: L.paint, gain: 0.85 });
      return makeWeaponThumbs();
    }).then(() => {
      return show(L.frame);
    }).then(() => {
      render();
      // 他の2機も先に読み、札の絵を撮る
      for (const id of Object.keys(AIRFRAMES)) makeFrameThumb(id);
    });
    window.__hangar = {
      get loadout() { return L; },
      get material() { return shown && shown.mat; },
      view(y, p, d) { Object.assign(goal, { yaw: y, pitch: p, dist: d }); auto = false; },
      set: (l) => setL(l), tab: setTab, slot: (s) => { slotSel = s; render(); }, region: (r) => { regionSel = r; render(); }, preview, go,
    };
  })().catch(reject); });
}
