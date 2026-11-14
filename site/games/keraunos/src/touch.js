// タッチの端末の操作（spec REQ-014）。左はスティック、右は4つのボタン（下 ×・左 □・右 ○・上 △）。
// キーボードと同じキーの押し下げとしてゲームへ渡す（down(code) / up(code)）。ゲームの処理は変えない。
// 見た目は今の画面の部品（白の細い線・琥珀・DIN 系の数字・斜めの帯・半透明の暗い面）にそろえる。CSS は index.html の「タッチの操作」。
import { tr } from './i18n.js'; // ボタンの名前を端末の言語にする（spec REQ-016）

/** 指で触れる端末か。確認用 ?touch=1 で PC でも出し、?touch=0 で出さない */
export const TOUCH = (() => {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '1') return true;
  if (q === '0') return false;
  return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
})();

/** タッチの端末の描く画素比：画面の大きさから、描く画素が約 130 万に収まる範囲で決める（最大 2.5、最小 1.25）。
 *  一律 1.25 だと画素比 3 の iPhone で 1 画素を約 2.4 倍に引き伸ばし、模型の多い場面がガタガタに見えていた（11/9、spec REQ-014）。
 *  iPhone の画面は PC より小さいので、PC の既定（約 144 万画素）より少ない量で済む */
export function touchPixelRatio() {
  const area = Math.max(1, innerWidth * innerHeight);
  return Math.min(window.devicePixelRatio || 1, 2.5, Math.max(1.25, Math.sqrt(1.3e6 / area)));
}

// 切り欠き（safe-area）の幅を px で返す。HUD のキャンバスの置き場所に使う
let insets = null;
export function safeInsets() {
  if (insets) return insets;
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);top:env(safe-area-inset-top,0px);bottom:env(safe-area-inset-bottom,0px)';
  document.body.append(p);
  const cs = getComputedStyle(p);
  insets = { l: parseFloat(cs.left) || 0, r: parseFloat(cs.right) || 0, t: parseFloat(cs.top) || 0, b: parseFloat(cs.bottom) || 0 };
  p.remove();
  return insets;
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => { insets = null; });

// 記号：形だけを細い線で描く（色や意匠は借りない）
const GLYPH = {
  cross: '<path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"/>',
  square: '<rect x="6.2" y="6.2" width="11.6" height="11.6"/>',
  circle: '<circle cx="12" cy="12" r="6.4"/>',
  tri: '<path d="M12 5.4 18.9 17.6H5.1Z"/>',
};
const RING_R = 35;
const RING_C = 2 * Math.PI * RING_R;
const face = (pos, glyph) => `
  <button class="t-btn t-${pos}" data-pos="${pos}" aria-label="">
    <svg class="t-ring" viewBox="0 0 76 76"><circle class="t-track" cx="38" cy="38" r="${RING_R}"/><circle class="t-gauge" cx="38" cy="38" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="0"/></svg>
    <svg class="t-glyph" viewBox="0 0 24 24">${GLYPH[glyph]}</svg>
    <span class="t-name"></span><span class="t-note"></span>
  </button>`;
const mini = (pos) => `<button class="t-btn t-mini t-${pos}" data-pos="${pos}"><span class="t-name"></span><span class="t-note"></span></button>`;
// 回避：押すとスティックの左右の向きへ回避する（向きが無ければ右）。ゲームのキーは使わない（REQ-019）
const dodgeMini = () => `<button class="t-btn t-mini t-dodge" data-pos="dodge" aria-label="${tr('回避')}"><span class="t-name">${tr('回避')}</span><span class="t-note"></span></button>`;

export function createTouch({ down, up, pause, dodge = () => {} }) {
  if (!TOUCH) return { update() {}, release() {}, el: null };
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="t-zone"></div>
    <div class="t-stick idle"><i class="t-dir"></i><i class="t-knob"></i></div>
    <button class="t-pill t-brake" data-pos="brake"><span>BRAKE</span><em>減速</em></button>
    <button class="t-pill t-boost" data-pos="boost"><span>BOOST</span><em>加速</em></button>
    <div class="t-pad">${face('s', 'cross')}${face('w', 'square')}${face('e', 'circle')}${face('n', 'tri')}</div>
    <div class="t-minis">${mini('sub3')}${mini('loop')}${mini('bomb')}${dodgeMini()}</div>
    <button class="t-pause" type="button" aria-label="一時停止"><i></i><i></i></button>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const btn = {};
  for (const el of root.querySelectorAll('[data-pos]')) btn[el.dataset.pos] = { el, code: null, shown: '' };
  btn.brake.code = 'Space';
  btn.boost.code = 'ShiftLeft';
  btn.s.code = 'KeyZ';
  btn.w.code = 'KeyX';

  // ---- ボタン：押している指ごとに覚える。指を滑らせて隣のボタンへ移れる ----
  const held = new Map(); // pointerId → ボタンの位置
  function press(pos) { const b = btn[pos]; if (!b || !b.code || b.el.hidden) return; b.n = (b.n || 0) + 1; if (b.n === 1) { b.el.classList.add('on'); down(b.code); } }
  function release(pos) { const b = btn[pos]; if (!b || !b.n) return; b.n -= 1; if (b.n === 0) { b.el.classList.remove('on'); up(b.code); } }
  const posAt = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('#touch [data-pos]'); return b ? b.dataset.pos : null; };
  root.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-pos]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.pos === 'dodge') {
      // 回避は押した時の向きで出す。ゲームへは回避の口（dodge）だけを渡す
      b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 140);
      dodge(stickSide || 1);
      return;
    }
    try { b.setPointerCapture(e.pointerId); } catch { /* 済 */ }
    held.set(e.pointerId, b.dataset.pos);
    press(b.dataset.pos);
    // 面を出し終えた後は、どのボタンでもやり直し（R）にする（ゲームは面を終えたときだけ R を受ける）
    down('KeyR'); up('KeyR');
  });
  root.addEventListener('pointermove', (e) => {
    if (!held.has(e.pointerId)) return;
    const was = held.get(e.pointerId);
    if (was === 'brake' || was === 'boost') return;
    const now = posAt(e.clientX, e.clientY);
    if (now && now !== was && now !== 'brake' && now !== 'boost') { release(was); held.set(e.pointerId, now); press(now); }
  });
  const end = (e) => { if (!held.has(e.pointerId)) return; release(held.get(e.pointerId)); held.delete(e.pointerId); };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
  root.addEventListener('lostpointercapture', end);
  // 一時停止。data-pos は付けない（付けると上の pointerdown が R を送る）。click は iOS では来ない
  const pauseBtn = $('.t-pause');
  pauseBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); });
  pauseBtn.addEventListener('pointerup', (e) => { e.preventDefault(); if (pause) pause(); });
  // 置き場所：シールドの右。ボス・重巡洋艦の体力バーに見える輪がかかる幅（狭い画面・左の切り欠き）では、シールドの下（.low）へ移す。
  // 体力バーの実際の位置を測って決める（画面の幅だけで決めると、切り欠きのある画面で重なっていた）
  let placeDirty = true;
  function placePause() {
    const bars = [...document.querySelectorAll('.ui-bossbar > div')].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
    if (!bars.length) return false;
    pauseBtn.classList.remove('low');
    const ring = pauseBtn.getBoundingClientRect().right - 7; // 見える輪は内側 7px
    pauseBtn.classList.toggle('low', ring + 4 > Math.min(...bars.map((r) => r.left)));
    return true;
  }
  window.addEventListener('resize', () => { placeDirty = true; });

  // ---- スティック：左側のどこに触れても、そこに出る ----
  const stick = $('.t-stick'); const knob = $('.t-knob'); const dir = $('.t-dir'); const zone = $('.t-zone');
  // 大きさの倍率：画面の高さに合わせる（Safari のバーで低くなっても指の下と上の部品が重ならないように。spec REQ-014）
  let ts = 0.75;
  const fit = () => { ts = Math.max(0.58, Math.min(0.76, innerHeight / 520)); root.style.setProperty('--ts', ts.toFixed(3)); };
  fit();
  window.addEventListener('resize', fit);
  const R0 = 52; // 倒しきる距離（px、倍率 1 のとき）
  const TH = 0.32; // 向きのキーを押すしきい値
  let sp = null; // { id, cx, cy }
  const dirs = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
  const setDir = (code, on) => { if (dirs[code] === on) return; dirs[code] = on; if (on) down(code); else up(code); };
  let flick = { side: 0, t: -1e9, lastSide: 0, lastT: -1e9 };
  let stickSide = 0; // 今スティックが左右のどちらへ倒れているか（-1 / 0 / 1）。回避のボタンが使う
  function moveStick(x, y) {
    const R = R0 * ts;
    let dx = x - sp.cx; let dy = y - sp.cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    const nx = dx / R; const ny = dy / R; const m = Math.min(1, d / R);
    stickSide = nx < -TH ? -1 : nx > TH ? 1 : 0;
    dir.style.opacity = (m * 0.9).toFixed(2);
    dir.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
    setDir('ArrowLeft', nx < -TH); setDir('ArrowRight', nx > TH);
    setDir('ArrowUp', ny < -TH); setDir('ArrowDown', ny > TH);
    // 左右に素早く2回はじくと回避（Q・E を 280ms 以内に2回押したことにする）
    const side = nx < -0.85 ? -1 : nx > 0.85 ? 1 : (Math.abs(nx) < 0.4 ? 0 : flick.side);
    const t = performance.now();
    if (side !== 0 && flick.side === 0) {
      if (side === flick.lastSide && t - flick.lastT < 340) {
        const code = side < 0 ? 'KeyQ' : 'KeyE';
        down(code); up(code); down(code); up(code);
        flick.lastSide = 0; flick.lastT = -1e9;
        stick.classList.add('dodge'); setTimeout(() => stick.classList.remove('dodge'), 260);
      } else { flick.lastSide = side; flick.lastT = t; }
    }
    flick.side = side;
  }
  function resetStick() {
    sp = null; stickSide = 0;
    for (const c of Object.keys(dirs)) setDir(c, false);
    stick.classList.add('idle'); stick.style.left = ''; stick.style.top = '';
    knob.style.transform = ''; dir.style.opacity = '0';
    flick.side = 0;
  }
  zone.addEventListener('pointerdown', (e) => {
    if (sp) return;
    e.preventDefault();
    try { zone.setPointerCapture(e.pointerId); } catch { /* 済 */ }
    // 輪が画面の外へはみ出さないように寄せる
    const half = stick.offsetWidth / 2;
    const cx = Math.max(half + 8, Math.min(innerWidth * 0.5 - half, e.clientX));
    const cy = Math.max(half + 8, Math.min(innerHeight - half - 8, e.clientY));
    sp = { id: e.pointerId, cx, cy };
    stick.classList.remove('idle');
    stick.style.left = `${cx - half}px`; stick.style.top = `${cy - half}px`;
    moveStick(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (sp && e.pointerId === sp.id) moveStick(e.clientX, e.clientY); });
  const zEnd = (e) => { if (sp && e.pointerId === sp.id) resetStick(); };
  zone.addEventListener('pointerup', zEnd);
  zone.addEventListener('pointercancel', zEnd);
  zone.addEventListener('lostpointercapture', zEnd);
  // iOS の拡大・スクロール・長押しのメニューを止める
  for (const ev of ['touchstart', 'touchmove', 'gesturestart', 'contextmenu']) root.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  function releaseAll() { resetStick(); for (const p of [...held.keys()]) end({ pointerId: p }); }
  window.addEventListener('blur', () => releaseAll());

  // ---- 毎コマ：武装の列（main.js の weaponSlots）から名前・キー・輪を当てる。変わったときだけ書く ----
  function paint(b, slot) {
    if (!slot) {
      if (b.n) { b.n = 1; release(b.el.dataset.pos); }
      b.code = null; b.shown = '';
      // 菱形の4つは形を保つため空のまま残し、小さいボタンは隠す
      if (b.el.classList.contains('t-mini')) b.el.hidden = true;
      else { b.el.classList.add('empty'); b.el.querySelector('.t-name').textContent = ''; b.el.querySelector('.t-note').textContent = ''; }
      return;
    }
    const [key, name, note, k, ready] = slot;
    b.el.hidden = false; b.el.classList.remove('empty');
    b.code = `Key${key}`;
    const g = Math.max(0, Math.min(1, Number(k) || 0));
    const sig = `${name}|${note}|${g.toFixed(2)}|${ready}`;
    if (sig === b.shown) return;
    b.shown = sig;
    // 名前は訳してから入れ、丸に収まらないときは折らずに字を小さくする（spec REQ-016）
    const nm = b.el.querySelector('.t-name'); const label = tr(name);
    if (nm.textContent !== label) {
      nm.dataset.i18n = 'off'; nm.style.fontSize = ''; nm.textContent = label;
      const w = nm.scrollWidth; const base = parseFloat(getComputedStyle(nm).fontSize) || 9;
      if (w > 58) nm.style.fontSize = `${Math.max(6, base * 58 / w).toFixed(1)}px`;
    }
    b.el.querySelector('.t-note').textContent = note || '';
    b.el.setAttribute('aria-label', label);
    const gauge = b.el.querySelector('.t-gauge');
    if (gauge) gauge.style.strokeDashoffset = (RING_C * (1 - g)).toFixed(2);
    b.el.classList.toggle('wait', !ready);
    b.el.classList.toggle('full', ready && g >= 0.999);
  }
  return {
    el: root,
    release() { releaseAll(); },
    update(slots) {
      if (placeDirty && placePause()) placeDirty = false;
      if (!slots) return;
      const by = (k) => slots.find((s) => s[0] === k);
      const subs = slots.filter((s) => !['Z', 'X', 'B', 'F'].includes(s[0]));
      paint(btn.s, by('Z'));
      paint(btn.w, by('X'));
      paint(btn.e, subs[0]);
      paint(btn.n, subs[1]);
      paint(btn.sub3, subs[2]);
      paint(btn.bomb, by('B'));
      paint(btn.loop, by('F'));
    },
  };
}
