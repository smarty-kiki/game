// 開いた人の端末の言語で、画面の文字を出す（spec REQ-016）。声は日本語のまま。
// 訳の正本は src/i18n/<言語>.json（日本語の文字列をそのまま鍵にした表。使う言語の1つだけ読む）。数の入る文は {0} {1} の置き場で書く。
// 鍵の一覧は tools/i18n_extract.py がソースから抜き出す（src/i18n/source.json）。表の欠けは tools/i18n_check.py が見る。
// 画面の文字（DOM）は出た時点で置き換える。通信の字幕（1字ずつ出す）と HUD のキャンバスの文字は、出す側が tr() を呼ぶ。

export const LANGS = ['ja', 'en', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'fr', 'de', 'pt'];

// 端末の言語の並びから、対応する言語を選ぶ（どれでもなければ英語）。中国語は台湾・香港・マカオ・Hant を繁体、それ以外を簡体
export function pickLang(list) {
  for (const raw of list || []) {
    const l = String(raw || '').toLowerCase();
    if (!l) continue;
    if (l.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(l) ? 'zh-Hant' : 'zh-Hans';
    const base = l.split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return 'en';
}

const QL = new URLSearchParams(location.search).get('lang'); // 確認用：?lang=de などで固定
// 中文镜像：默认固定简体中文，不受设备语言影响（仍可用 ?lang= 查看其他语言）
export const LANG = QL && LANGS.includes(QL) ? QL : 'zh-Hans';

const JP = /[぀-ヿ㐀-鿿]/;
// 画面の文字の書体（漢字の字形とハングルを言語に合わせる。index.html の html[lang] の --ui-jp と同じ並び）
const FONTS = {
  'zh-Hans': '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
  'zh-Hant': '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif',
  ko: '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif',
};
export const UI_FONT = FONTS[LANG] || '"Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
let table = null;
let patterns = [];
let outputs = new Set(); // 訳した後の文字（中国語は漢字なので、訳した文字をもう一度訳しに行かないように）
const misses = new Set();

// 「砲台撃破　残り {0}」のような鍵を、文字列全体に当たる正規表現にする（置き場は何にでも当たる）
function compile(key, out) {
  const names = [...key.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
  if (!names.length) return null;
  const src = key.split(/\{\d+\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]+?)');
  return { re: new RegExp(`^${src}$`), names, out, len: key.length };
}

// 日本語の文字列を、今の言語の文字にする（表に無ければそのまま返す）。前後の空白は残す
export function tr(s) {
  if (!table || typeof s !== 'string' || !JP.test(s)) return s;
  const core = s.trim();
  if (outputs.has(core)) return s;
  let v = table[core];
  if (v == null) {
    for (const p of patterns) {
      const m = p.re.exec(core);
      if (m) { v = p.out.replace(/\{(\d+)\}/g, (_, n) => { const k = p.names.indexOf(n); return k < 0 ? '' : tr(m[k + 1]); }); break; }
    }
  }
  if (v == null) { if (misses.size < 400) misses.add(core); return s; }
  return s.slice(0, s.indexOf(core)) + v + s.slice(s.indexOf(core) + core.length);
}

// 訳し終えた文（部品を訳して組み立てた文）を、もう一度訳しに行かないように印を付ける（tr.done）。
// 組み立てた文は表に無いので、画面の監視が訳せなかった文字として数えてしまう。
tr.done = (s) => { if (table && typeof s === 'string') outputs.add(s.trim()); return s; };

// ---- 画面の文字（DOM）を出た時点で置き換える ----
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
const done = new WeakMap(); // 置き換えた後の値（中国語は漢字なので、置き換えた文字をもう一度訳しに行かないように）
function textNode(n) {
  const v = n.nodeValue;
  const p = n.parentNode;
  if (!v || done.get(n) === v || !JP.test(v) || !p || SKIP.has(p.nodeName) || (p.dataset && p.dataset.i18n === 'off')) return;
  const t = tr(v);
  done.set(n, t);
  if (t !== v) n.nodeValue = t;
}
function element(el) {
  if (SKIP.has(el.nodeName)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v && JP.test(v)) { const t = tr(v); if (t !== v) el.setAttribute(a, t); }
  }
}
function walk(root) {
  if (root.nodeType === 3) { textNode(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
  element(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && SKIP.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = it.nextNode(); n; n = it.nextNode()) { if (n.nodeType === 3) textNode(n); else element(n); }
}

export async function initI18n() {
  document.documentElement.lang = LANG; // 漢字の字形を言語に合わせる
  document.documentElement.dataset.lang = LANG;
  if (LANG === 'ja') return;
  try {
    const r = await fetch(new URL(`./i18n/${LANG}.json`, import.meta.url));
    if (!r.ok) throw new Error(String(r.status));
    table = await r.json();
  } catch (e) {
    console.warn('i18n: 訳の表を読めない', LANG, e);
    table = null;
    return;
  }
  // 置き場のある鍵は、長い（具体的な）物から当てる
  patterns = Object.entries(table).map(([k, v]) => compile(k, v)).filter(Boolean).sort((a, b) => b.len - a.len);
  outputs = new Set(Object.values(table));
  walk(document.documentElement);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') textNode(m.target);
      else if (m.type === 'attributes') element(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // 確認用：表に無かった日本語（tools/i18n_scan で見る）
  window.__i18n = { lang: LANG, misses: () => [...misses] };
}
