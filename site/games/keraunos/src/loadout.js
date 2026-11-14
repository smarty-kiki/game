import { AIRFRAMES } from './airframes.js';
import { BALANCE } from './weaponBalance.js';

// 出撃の構成：機体・配色・武装。機体選択の画面で決め、ブラウザに保存する。換装は出撃前だけ。
// 確認用の URL: ?frame=b&wmain=gun&wheavy=rail&wsub=lance,rocket&paint=d8d6d0,e0501a,3a3c40,66d8ff

// 武装の名前と、画面に出す値（重さ・火力など）の正本は src/weaponBalance.js
const NAMES = {
  main: { twin: 'ツイン', gun: '機関砲', spread: '散弾' },
  heavy: { cannon: '主砲', rail: 'レールガン' },
  sub: { lance: 'ランス', salvo: '誘導弾', rocket: 'ロケット' },
};
export const WEAPONS = Object.fromEntries(Object.entries(NAMES).map(([g, list]) => [g, Object.fromEntries(Object.entries(list).map(([k, name]) => [k, { name, ...BALANCE[g][k] }]))]));

export const SUB_KEYS = [['KeyC', 'C'], ['KeyV', 'V'], ['KeyG', 'G']];

// 配色：主塗装・差し色・地金・発光
export const PAINT_PRESETS = [
  { name: '標準', paint: ['a8a6a0', 'd84a18', '3a3c40', '66d8ff'] },
  { name: '夜間', paint: ['2c3038', 'c9a03a', '15171b', 'ffb347'] },
  { name: '艦隊', paint: ['c9d3df', '2f6fd6', '3b4350', '7ad0ff'] },
  { name: '砂漠', paint: ['b8a07c', '6e4a2a', '4a4238', 'ffd27a'] },
  { name: '迷彩', paint: ['5f6b4e', '2f3527', '33372e', 'b8ff7a'] },
  { name: '赤', paint: ['8e1c1c', 'e6e1d6', '2b2b2e', 'ff6a3d'] },
];

// 色の候補（無彩色・寒色・暖色・緑と茶・鮮やかな色）
export const PAINT_SWATCHES = [
  'e6e4de', 'b8b6b0', 'a8a6a0', '7c7e82', '55585e', '3a3c40', '24262a', '121316',
  'c9d3df', '8fa6bf', '5a7796', '2f6fd6', '1e3f7a', '16263f', '2fa9c4', '66d8ff',
  'e0501a', 'd84a18', 'c9a03a', 'e9b872', 'ffb347', '8e1c1c', 'b02a30', 'ff6a3d',
  'b8a07c', '8a7350', '6e4a2a', '5f6b4e', '3d4a32', '2f3527', 'b8ff7a', 'a64dff',
];

const KEY = 'loadout.v1';

// 積んだ武装の重さの合計
export function loadoutWeight(l) {
  return WEAPONS.main[l.main].weight + WEAPONS.heavy[l.heavy].weight + l.subs.reduce((n, s) => n + WEAPONS.sub[s].weight, 0);
}
// 重さの基準。これより重いと機体が鈍くなり、軽いと機敏になる
const WEIGHT_BASE = 8; // 標準の構成（ツイン・主砲・ランス・誘導弾）
export function frameStats(l) {
  const f = AIRFRAMES[l.frame] || AIRFRAMES.a;
  const over = loadoutWeight(l) - WEIGHT_BASE;
  return {
    lateral: f.stats.lateral * (1 - 0.018 * over),
    shield: f.stats.shield,
    dodgeCool: 1.5 * f.stats.dodgeCool * (1 + 0.025 * over),
    subSlots: f.stats.subSlots || 2,
  };
}

export function defaultLoadout(frame = 'a') {
  const f = AIRFRAMES[frame] || AIRFRAMES.a;
  const subs = ['lance', 'salvo', 'rocket'].slice(0, f.stats.subSlots || 2);
  return { frame: f.id, paint: PAINT_PRESETS[0].paint.slice(), main: 'twin', heavy: 'cannon', subs };
}

// 枠の数や候補に合わない値を直す（機体を変えると副武装の枠の数が変わる）
export function normalize(l) {
  const f = AIRFRAMES[l.frame] || AIRFRAMES.a;
  const d = defaultLoadout(f.id);
  const out = { frame: f.id, paint: d.paint, main: d.main, heavy: d.heavy, subs: [] };
  if (Array.isArray(l.paint) && l.paint.length === 4 && l.paint.every((c) => /^[0-9a-f]{6}$/i.test(c))) out.paint = l.paint.map((c) => c.toLowerCase());
  if (WEAPONS.main[l.main]) out.main = l.main;
  if (WEAPONS.heavy[l.heavy]) out.heavy = l.heavy;
  const n = f.stats.subSlots || 2;
  for (const s of (l.subs || [])) if (WEAPONS.sub[s] && !out.subs.includes(s) && out.subs.length < n) out.subs.push(s);
  for (const s of Object.keys(WEAPONS.sub)) if (out.subs.length < n && !out.subs.includes(s)) out.subs.push(s);
  return out;
}

export function loadLoadout(search = (typeof location !== 'undefined' ? location.search : '')) {
  let l = defaultLoadout();
  try {
    const s = localStorage.getItem(KEY);
    if (s) l = { ...l, ...JSON.parse(s) };
  } catch { /* 保存が使えない環境では既定 */ }
  const q = new URLSearchParams(search);
  if (q.get('frame')) { l.frame = q.get('frame'); if (!q.get('wsub')) l.subs = defaultLoadout(l.frame).subs; }
  if (q.get('wmain')) l.main = q.get('wmain');
  if (q.get('wheavy')) l.heavy = q.get('wheavy');
  if (q.get('wsub')) l.subs = q.get('wsub').split(',');
  if (q.get('paint')) l.paint = q.get('paint').split(',');
  return normalize(l);
}

export function saveLoadout(l) {
  try { localStorage.setItem(KEY, JSON.stringify(normalize(l))); } catch { /* 保存できなくても出撃はする */ }
}

// 副武装のキー（無ければ null）
export function subKey(l, weapon) {
  const i = l.subs.indexOf(weapon);
  return i >= 0 ? SUB_KEYS[i] : null;
}

export const LOADOUT = loadLoadout();
