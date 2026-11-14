// 操作の案内（spec REQ-019）。使いどころの手前で約2秒だけ出す。
// 同じ出撃で同じ案内は1度だけ（createGuideState の want は1回目だけ true。出撃し直したら reset）。
// 置き場所は実際の位置を測って決める：攻撃名・警告・ボスの体力・通信の窓・シールド・スコア・レーダー・武装の並び・ボタン・照準の周りを避ける。
// 一時停止中は出さず、時間も進めない（main.js は止めている間に update を呼ばない）。
// 読み込みは three.js・ブラウザの場所に依らない（試験で node から読めるように）。訳す関数と端末の種類は呼び出し側が渡す。

const SHOW_S = 2.2; // 出している秒数（最後の 0.45 秒で消える）
const GAP = 6; // 置き場所の周りの空き（px）
// 避ける DOM（表示していなくても位置は取る。通信の窓は出さない時も同じ所に置かれているので、そこも避ける）
const AVOID = ['#uiAlert', '#uiWarn', '.ui-bossbar > div', '#uiComm', '#uiShield', '#uiScore', '#touch .t-btn', '#touch .t-pause', '#touch .t-pill', '#touch .t-stick'];
// 確認用：true で置き場所の検査を外し、先頭の候補を使う（.work/sol の試験が、重なりの検出を確かめるために使う）
export const FORCE_FIRST = false;

export function createGuideState() {
  let seen = new Set();
  return {
    want(id) { if (seen.has(id)) return false; seen.add(id); return true; },
    reset() { seen = new Set(); },
  };
}

// 出す文。PC はキー（ある物だけ）と文、スマホは回避・主砲などのボタンの名前で言い分ける
export function guideText(id, { tr, touch, salvoKey = 'V' }) {
  const done = tr.done || ((s) => s); // 部品を訳して組み立てた文は、画面の監視が訳し直さないように印を付ける（i18n.js）
  if (touch) {
    if (id === 'beam') return tr('主砲のボタンを長押しで溜めて、撃ち返す');
    if (id === 'dodge') return tr('回避のボタンで避ける');
    if (id === 'salvo') return tr('誘導弾のボタンを長押しで狙いを固め、離して撃つ');
    if (id === 'bomb') return tr('爆雷のボタンで周りの弾を消す');
    return '';
  }
  if (id === 'beam') return done(`X ${tr('長押しで溜めて、撃ち返す')}`);
  if (id === 'dodge') return tr('Q / E を2回で回避');
  if (id === 'salvo') return done(`${salvoKey} ${tr('長押しで狙いを固め、離して撃つ')}`);
  if (id === 'bomb') return done(`B ${tr('爆雷で周りの弾を消す')}`);
  return '';
}

// 画面の中で、案内を置いてはいけない四角（canvas で描く照準・レーダー・武装の並び）
function canvasAvoid(touch) {
  const W = window.innerWidth; const H = window.innerHeight;
  const out = [{ l: W / 2 - 90, t: H / 2 - 90, r: W / 2 + 90, b: H / 2 + 90 }]; // 照準の周り（照準は画面の中ほどで動く。大きめに取る）
  if (touch) out.push({ l: W - 110, t: 0, r: W, b: 96 }); // 右上のレーダー（おおよそ）
  else {
    const L = window.__hudLayout;
    if (L) {
      out.push({ l: L.radar.left, t: L.radar.top, r: L.radar.right, b: L.radar.bottom });
      out.push({ l: L.x0 - 4, t: L.top - 4, r: L.right + 4, b: L.bottom + 4 });
    }
  }
  return out;
}

function rectsOf(sel) {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  }
  return out;
}

const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > -GAP && Math.min(a.b, b.b) - Math.max(a.t, b.t) > -GAP;

export function createGuide({ touch }) {
  const el = document.createElement('div');
  el.id = 'guide';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  document.body.append(el);
  let left = 0;
  // 置き場所を探す：好みの高さ（PC は武装の並びの上、スマホは攻撃名の下）から近い順に、横は真ん中から近い順に、
  // 避ける物のどれにもかからない最初の所へ置く。入らない時は幅を狭めて2行にする（PC の通信の窓の右など）
  function place() {
    const W = window.innerWidth; const H = window.innerHeight;
    const avoid = [...AVOID.flatMap((s) => rectsOf(s)), ...canvasAvoid(touch)];
    let pref;
    if (touch) {
      const alert = rectsOf('#uiAlert')[0];
      pref = alert ? alert.b + GAP : H * 0.2;
    } else {
      const L = window.__hudLayout;
      pref = L ? L.top - 8 - 30 : H - 96 - 30;
    }
    el.style.bottom = ''; el.style.transform = 'none';
    el.style.whiteSpace = 'nowrap'; el.style.maxWidth = '';
    const set = (x, y) => { el.style.left = `${Math.max(0, x)}px`; el.style.top = `${Math.max(0, y)}px`; };
    const free = (x, y, w, h) => { const r = { l: x, t: y, r: x + w, b: y + h }; return r.l >= 0 && r.r <= W && r.t >= 0 && r.b <= H && !avoid.some((a) => hit(r, a)); };
    const ys = []; for (let y = 0; y <= H - 20; y += 6) ys.push(y);
    ys.sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref));
    let best = null;
    if (!FORCE_FIRST) {
      for (const maxW of [null, W * 0.6, W * 0.45]) {
        if (maxW) { el.style.whiteSpace = 'normal'; el.style.maxWidth = `${Math.round(maxW)}px`; } else { el.style.whiteSpace = 'nowrap'; el.style.maxWidth = ''; }
        set(0, 0);
        const w = el.offsetWidth; const h = el.offsetHeight;
        const xs = []; for (let x = 0; x <= W - w; x += 8) xs.push(x);
        xs.sort((a, b) => Math.abs(a - (W - w) / 2) - Math.abs(b - (W - w) / 2));
        for (const y of ys) { for (const x of xs) if (free(x, y, w, h)) { best = { x, y }; break; } if (best) break; }
        if (best) break;
      }
    }
    if (FORCE_FIRST && !best) best = { x: (W - el.offsetWidth) / 2, y: pref }; // 確認用：検査を外して好みの所へ置く
    // 置ける所が無い画面（低い画面で警告の帯と通信の窓が場所を取る）では、重ねずに出さない
    if (!best) return false;
    set(best.x, best.y);
    return true;
  }
  function hide() { left = 0; el.hidden = true; el.classList.remove('out'); }
  return {
    get busy() { return left > 0; },
    show(text) {
      if (!text) return;
      el.textContent = text;
      el.classList.remove('out');
      el.hidden = false;
      if (!place()) { hide(); return; }
      left = SHOW_S;
    },
    // 毎コマ、実時間で進める（呼ぶのは動いている間だけ）
    update(dt) {
      if (left <= 0) return;
      left -= dt;
      if (left <= 0) hide();
      else el.classList.toggle('out', left < 0.45);
    },
    hide,
  };
}
