// 一時停止の決まり（spec REQ-017）。画面も音も持たず、止める・キーの渡し方・音量・格納庫の URL だけを返す。
export const PAUSE_CODES = ['Escape', 'KeyP'];

export function createPauseGate() {
  let paused = false;
  const again = new Set(); // 止めている間に押し始めたキー。離すまでゲームへ渡さない
  return {
    get paused() { return paused; },
    pause() {
      if (paused) return false;
      paused = true;
      return true;
    },
    resume() {
      if (!paused) return false;
      paused = false;
      return true;
    },
    keyDown(code, repeat = false) {
      if (PAUSE_CODES.includes(code)) return repeat ? 'drop' : 'toggle';
      if (paused) { again.add(code); return 'drop'; }
      if (again.has(code)) return 'drop';
      return 'pass';
    },
    keyUp(code) { again.delete(code); },
    clear() { again.clear(); },
  };
}

export const VOLUME_KEY = 'keraunos.volume';

// null・空・数にならない値は 100。それ以外は 10 刻みで 0〜100
export function clampVolume(v) {
  if (v == null || v === '') return 100;
  const n = Number(v);
  if (!Number.isFinite(n)) return 100;
  return Math.max(0, Math.min(100, Math.round(n / 10) * 10));
}

// 振幅で (値/100)^2。0 は無音
export function volumeDb(v) {
  const n = clampVolume(v);
  if (n === 0) return -Infinity;
  return 40 * Math.log10(n / 100);
}

function freshVolume() { return { bgm: 100, sfx: 100 }; }

function oneVolume(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return 100;
  return clampVolume(x);
}

export function loadVolume(storage) {
  if (storage == null) return freshVolume();
  let raw;
  try { raw = storage.getItem(VOLUME_KEY); } catch { return freshVolume(); }
  if (raw == null || raw === '') return freshVolume();
  let data;
  try { data = JSON.parse(raw); } catch { return freshVolume(); }
  if (!data || typeof data !== 'object') return freshVolume();
  return { bgm: oneVolume(data.bgm), sfx: oneVolume(data.sfx) };
}

export function saveVolume(storage, vol) {
  if (storage == null) return;
  try {
    const bgm = clampVolume(vol && vol.bgm);
    const sfx = clampVolume(vol && vol.sfx);
    storage.setItem(VOLUME_KEY, JSON.stringify({ bgm, sfx }));
  } catch { /* 書けない */ }
}

// 格納庫を飛ばす判定は src/boot.js と同じ。飛ばしているときだけ hangar=1 を足す
const HANGAR_SKIP_KEYS = ['stagez', 'do', 'hold', 'soundcheck', 'demo'];
export function hangarUrl(href) {
  const u = new URL(href);
  const q = u.searchParams;
  const hangar = q.get('hangar');
  const skip = hangar === '0' || (hangar !== '1' && (q.get('test') === '1' || q.get('stage') === '0' || HANGAR_SKIP_KEYS.some((k) => q.has(k))));
  if (!skip) return href;
  q.set('hangar', '1');
  return u.toString();
}
