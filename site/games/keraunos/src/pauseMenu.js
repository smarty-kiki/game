// 一時停止と設定のメニュー（spec REQ-017）。画面の部品だけを持ち、止める・再開する決まりは main.js と src/pause.js が持つ。
// 中身は「再開」・BGM と効果音の音量（0〜100 を 10 刻み）・「格納庫へ戻る」（2回押しで確かめる）だけ。
// 文字は日本語で書き、src/i18n.js が出た時点で端末の言語へ置き換える（spec REQ-016）。見た目は index.html の「一時停止のメニュー」。
import { tr } from './i18n.js';
import { TOUCH } from './touch.js';
const STEP = 10;
const SEGS = 10;
// 操作の一覧（REQ-019）。中身は main.js が今の積み方から作って渡す：[キー or ボタン, 武装の名前（無ければ空）, 何をするか]
const opsHtml = (rows) => `<div class="p-ops"><b class="p-ops-t">${tr('操作')}</b>${rows.map(([k, name, desc]) => `<div class="p-op"><i>${tr(k)}</i><span>${name ? `<b>${tr(name)}</b>` : ''}${desc ? `<em>${tr(desc)}</em>` : ''}</span></div>`).join('')}</div>`;

/**
 * @param {{ onResume: () => void, onHangar: () => void, getVolume: (kind: 'bgm'|'sfx') => number, setVolume: (kind: 'bgm'|'sfx', v: number) => void }} o
 */
export function createPauseMenu({ onResume, onHangar, getVolume, setVolume, opsPc = [], opsTouch = [] }) {
  const root = document.createElement('div');
  root.id = 'pause';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'PAUSE');
  const segs = '<i></i>'.repeat(SEGS);
  // 音量の1行：名前・−・区切りの帯・＋・数字。行に合わせて矢印のキーでも変えられる
  const row = (kind, label, sub) => `
    <div class="p-vol" data-kind="${kind}" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="100">
      <span class="p-label">${label}${sub ? `<em>${sub}</em>` : ''}</span>
      <button type="button" class="p-step" data-d="-1" tabindex="-1" aria-hidden="true">&minus;</button>
      <span class="p-track">${segs}</span>
      <button type="button" class="p-step" data-d="1" tabindex="-1" aria-hidden="true">+</button>
      <b class="p-num"></b>
    </div>`;
  root.innerHTML = `
    <div class="p-wrap"><div class="p-panel">
      <b class="p-title">PAUSE</b><span class="p-jp">一時停止</span>
      <button type="button" class="p-btn p-resume"><span>RESUME</span><em>再開</em></button>
      ${row('bgm', 'BGM', '')}
      ${row('sfx', 'SFX', '効果音')}
      <button type="button" class="p-btn p-hangar"><span>HANGAR</span><em>格納庫へ戻る</em></button>
      <span class="p-confirm">もう一度押すと戻ります（進行は残りません）</span>
      <div class="p-keys"><b>ESC</b> / <b>P</b> <span>再開</span></div>
    </div>${opsHtml(TOUCH ? opsTouch : opsPc)}</div>`;
  document.body.append(root);

  const rows = {};
  for (const el of root.querySelectorAll('.p-vol')) rows[el.dataset.kind] = el;
  const clamp = (v) => Math.max(0, Math.min(100, Math.round(v / STEP) * STEP));
  function paint(kind) {
    const el = rows[kind];
    const v = clamp(getVolume(kind));
    el.querySelectorAll('.p-track i').forEach((s, i) => s.classList.toggle('on', i < v / STEP));
    el.querySelector('.p-num').textContent = String(v);
    el.setAttribute('aria-valuenow', String(v));
  }
  function change(kind, v) {
    const next = clamp(v);
    if (next !== clamp(getVolume(kind))) setVolume(kind, next);
    paint(kind);
  }
  for (const [kind, el] of Object.entries(rows)) {
    for (const b of el.querySelectorAll('.p-step')) {
      b.addEventListener('click', () => change(kind, getVolume(kind) + Number(b.dataset.d) * STEP));
    }
    // 帯に触れた所・なぞった所の値にする（左の端の少し内側までは 0）
    const track = el.querySelector('.p-track');
    const at = (x) => { const r = track.getBoundingClientRect(); const f = (x - r.left) / Math.max(1, r.width); return f < 0.04 ? 0 : Math.ceil(f * SEGS) * STEP; };
    let dragId = null;
    track.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragId = e.pointerId;
      try { track.setPointerCapture(e.pointerId); } catch { /* 済 */ }
      el.classList.add('drag');
      change(kind, at(e.clientX));
    });
    track.addEventListener('pointermove', (e) => { if (e.pointerId === dragId) change(kind, at(e.clientX)); });
    const end = (e) => { if (e.pointerId !== dragId) return; dragId = null; el.classList.remove('drag'); };
    // 帯も押せる部品として扱わせる（Android の Chrome は、触れた所の近くの押せる部品へ指を寄せるので、端に触れると隣の ＋・− に吸われていた）
    track.addEventListener('click', (e) => e.preventDefault());
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('lostpointercapture', end);
    el.addEventListener('keydown', (e) => {
      const v = getVolume(kind);
      const next = { ArrowLeft: v - STEP, ArrowDown: v - STEP, ArrowRight: v + STEP, ArrowUp: v + STEP, Home: 0, End: 100 }[e.code];
      if (next === undefined) return;
      e.preventDefault();
      change(kind, next);
    });
  }

  root.querySelector('.p-resume').addEventListener('click', () => onResume());
  // 格納庫へ戻る：1回目は確かめるだけ（進行が消えるので、触れ間違いで戻らないように）
  root.querySelector('.p-hangar').addEventListener('click', () => {
    if (root.classList.contains('armed')) onHangar();
    else root.classList.add('armed');
  });

  return {
    el: root,
    get isOpen() { return !root.hidden; },
    open() {
      for (const kind of Object.keys(rows)) paint(kind);
      root.classList.remove('armed');
      root.hidden = false;
      try { root.querySelector('.p-resume').focus({ preventScroll: true }); } catch { /* 済 */ }
    },
    close() {
      root.hidden = true;
      root.classList.remove('armed');
      if (root.contains(document.activeElement)) document.activeElement.blur();
    },
  };
}
