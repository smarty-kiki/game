// 公開版で、格納庫にいる間に出撃後の素材を中継（dist/sw.js）に先に取らせておく（spec REQ-013）。
// 一覧 assetOrder.json は tools/record_assets.py が、確認用の配信で起動から準備完了までに読んだ順に記録したもの。
// 中継は保存（Cache Storage）に入れるだけで、遊ぶときに保存から戻す。中継が受け持っていないとき（確認用の配信）は何もしない。
let started = false;
export function startPrefetch() {
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  if (!sw || started) return;
  started = true;
  fetch(new URL('./assetOrder.json', import.meta.url))
    .then((r) => r.json())
    .then((list) => sw.postMessage({ type: 'prefetch', list }))
    .catch(() => {});
}
// 出撃したら新しく取り始めない（取っている途中の物は保存まで済ませる）
export function stopPrefetch() {
  const sw = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  if (sw) sw.postMessage({ type: 'prefetch-stop' });
}
