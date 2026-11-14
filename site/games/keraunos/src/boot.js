// 起動：遊ぶときは先に機体選択の画面を開き、出撃でゲーム本体を読み込む。
// 確認用の URL（test=1・stage=0・stagez・do・hold・soundcheck・demo）と ?hangar=0 では、画面を飛ばして今の保存のまま始める。?hangar=1 で必ず開く。
import { TOUCH } from './touch.js';
import { initI18n } from './i18n.js';
// 端末の言語で画面の文字を出す（訳の表を読んでから画面を作る。spec REQ-016）
await initI18n();
// 指で触れる端末では <html class="touch"> にし、タッチの操作と画面の部品の置き直しを入れる（spec REQ-014）
if (TOUCH) document.documentElement.classList.add('touch');
// iPhone・iPad の Safari で開いたときは、上のタブ・アドレスバーをページから消せないので、「ホーム画面に追加」から開く案内を出す（閉じたら次から出さない）
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
const a2hs = document.getElementById('a2hs');
let a2hsOff = false; try { a2hsOff = localStorage.getItem('keraunos.a2hs') === 'off'; } catch { /* 済 */ }
if (a2hs && IOS && !STANDALONE && !a2hsOff) {
  a2hs.hidden = false;
  a2hs.querySelector('button').addEventListener('click', () => { a2hs.hidden = true; try { localStorage.setItem('keraunos.a2hs', 'off'); } catch { /* 済 */ } });
}
const q = new URLSearchParams(location.search);
const skip = q.get('hangar') === '0' || (q.get('hangar') !== '1' && (q.get('test') === '1' || q.get('stage') === '0' || ['stagez', 'do', 'hold', 'soundcheck', 'demo'].some((k) => q.has(k))));
if (!skip) {
  const { openHangar } = await import('./hangar.js');
  await openHangar();
}
if (a2hs) a2hs.hidden = true; // 遊び始めたら消す
await import('./main.js');
