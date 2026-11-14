// 公開版の中継（Service Worker）。tools/build_dist.py が 37acd932dec07e5c5bcf433f67b4ad63 と {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ktx2": "image/ktx2", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".flac": "audio/flac", ".wav": "audio/wav", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".hdr": "application/octet-stream"} を埋めて dist/sw.js に書く（spec REQ-012・REQ-013）。
// ゲームからの assets/… の読み込みを受け、並べ替えて置いた d/<16進>.bin を取りにいき、元に戻して渡す。
// - 取ってきた d/*.bin（並べ替えたまま）は Cache Storage に残し、2回目からは通信しない。版（鍵）が変わったら古い保存を消す。
// - 鍵を据え置いた組み立てで中身が変わった素材は、REV の印で住所（d/<名前>.bin）だけ変える。端末に残った古い保存を使わせないため（11/10、声を差し替えても前に遊んだ端末で古い声が鳴る）。
// - 同時に同じ素材を頼まれたら1回だけ取る。通信が失敗したら取り直す（4回まで）。
// - ページから { type: 'prefetch', list } が来たら、格納庫にいる間に一覧の素材を保存へ先に取る（{ type: 'prefetch-stop' } で止める）。
// - 模型・音の表・効果音（DEFLATE の拡張子）は、build_dist.py が並べ替える前に zlib で縮めている。戻した後に展開する。
const SALT = '37acd932dec07e5c5bcf433f67b4ad63';
const MIME = {".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ktx2": "image/ktx2", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".flac": "audio/flac", ".wav": "audio/wav", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".hdr": "application/octet-stream"};
const DEFLATE = [];
const CACHE = `keraunos-${SALT}`;
// スマホの版（tools/mobile_variants.py が縮めた画像・模型）がある素材の名前。登録の住所に m=1 があるときだけ使う（spec REQ-014）
const MOBILE = new Set(["01e6a286d5739cb0", "02cb890ae988fe30", "0430b7c846130879", "04a233ad7e7b80d6", "0609e56de9d37f09", "0680d79521675afe", "06d82dc72d8b67eb", "0db0dbafb1d57b79", "110df2c7396bd863", "11da17c4eda267b4", "133858fa5fca9c31", "1526f44bdfe3f2ac", "1603217bec12d8c0", "190665dc487d1fc6", "191ad602246ca52b", "199c60780edd5a74", "19db7571dbf84642", "20ac10a2cdc479b7", "246c19cbad507c76", "26c3f91b47965ee7", "27171442d302a4ed", "2cabd6a5b8b7b47c", "2e62817ef0e0b09b", "38f13470174d4358", "3a6225aa46e4a961", "3d9f7ca0a991531c", "3f55a56d9abe9e97", "40abd42e6099debf", "44aca1cc1279bae2", "44eef74eed43d723", "475d0db937d0a764", "4799389c72f5e5da", "49bcb32c0a405e3d", "4c66ad790287d2d9", "515adb790adbb060", "55e83c7a9cd83de8", "59d4c4d6712b5ce9", "5aa150173942ff24", "5b3b997e6a5e1e0e", "5d71eff7d6eb92d4", "5dade934b83fcebd", "5ef1ce288592a637", "61538268b5a80484", "635c1fee7ad15844", "642f2aa02b9f5b10", "657c9919dacb5f30", "659c666e8e69d74f", "66e32f6a3e86ea78", "6909c9c64b83bf74", "6a133c8415f5728b", "6a3523bf74f500cb", "6e784e8d3e13eb45", "6f49832560d0f007", "717ded88d34428d6", "737a5a29237288b2", "73867266c40f9763", "756ea1ccbfef7c12", "76550722c3eefc92", "788fae8cd19fb308", "794c629686fc142b", "81ad59b99e8cb96e", "836b1640570290ef", "83c8ae3c1f6681d8", "853a88fee349f073", "8a3b359c1e39f0d2", "8a41afd706785ee2", "8cead68aa2ef242e", "8eb7c38ff56f7db0", "91626980a17fff20", "920eaec479d18537", "927c5ada35e43a59", "938ecec2687dcd07", "941efaf943e2274c", "9716f02ff5a526c3", "9886706cde8da835", "993f05a4b2f559f1", "9e3acd4d00e7ab61", "9e59b67e90bef7e1", "a20e93e22f13d629", "a3742183495f2d8b", "a42deb68146f47a0", "a4b2afdb7d41612e", "a8ec6c1639a041b4", "a90dbf8fe9b5e46f", "ab95c5bb3e82f864", "ade0aa2766bf68bd", "af336795ca0a320c", "b4c6fc40aa79f55a", "b4ddd32a1348c40c", "b78a87951e18475c", "b82c037b7176fbeb", "ba5c5852d09e3b4a", "bbb556b8e73899ac", "bd71c5292cebbfe4", "bde6f3a0c48e86a2", "bf8ce71fd52a2211", "c2539c3c8c662b5b", "c5dfaea7ed02284d", "c80e0548abbab425", "ca11fd880c4d28c3", "ccef376dc94bf98c", "cd07c2803e5833f5", "d0be97f550b05ba1", "d3deea945361a9a5", "dca2ea0962f73cfe", "dee0f59c78c9e344", "e768d9236cefe4c1", "e84e581ab723f1f3", "edce4cee3b5c809c", "f3e6cc35b1ece509", "f56ae0ed21b02066", "f6edebdee43e5aec", "f7d184946d8e5395", "fb50f2d6a0fedde0", "fc62a22e026be895", "fccf3ea228c5c393", "fda5fe7560be6b4f"]);
// 鍵を据え置いたまま中身が変わった素材の印（assets/… → '#<中身の sha1 の頭>'）。名前を作るときだけ足す（戻す鍵は変えない）
const REV = {"assets/voice/k_hit1.ogg": "#c20203d1", "assets/voice/l_out.ogg": "#87bc9f3c", "assets/voice/o_bulkD.ogg": "#1cd3da20", "assets/voice/o_bulkM.ogg": "#861cf5fc", "assets/voice/o_bulkU.ogg": "#cdbdac2e", "assets/voice/o_bulkhit.ogg": "#b3a8a4df", "assets/voice/o_coreboom.ogg": "#dc16f913", "assets/voice/o_cruiser.ogg": "#d3780250", "assets/voice/o_down.ogg": "#5b466c10", "assets/voice/o_gate.ogg": "#b3f3fe36", "assets/voice/o_line.ogg": "#825f6c1a", "assets/voice/o_mast.ogg": "#a1c5dcf8", "assets/voice/o_pillar.ogg": "#23e5a7e5", "assets/voice/o_snk_turretall.ogg": "#9acea3cd"};
const MOBILE_ON = new URL(self.location.href).searchParams.get('m') === '1';

self.addEventListener('install', () => self.skipWaiting());
// 次の版が見つかったら先読みを打ち切る（先読みの間はブラウザが新しい版へ入れ替えないため。11/9）
self.registration.addEventListener('updatefound', () => stopPrefetch());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('keraunos-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
// 強制再読み込みのページは受け持たれないので、ページから頼まれたら受け持つ
self.addEventListener('message', (e) => { if (e.data === 'claim') e.waitUntil(self.clients.claim()); });

function fnv1a64(text) {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(text)) { h ^= BigInt(b); h = (h * 0x100000001b3n) & 0xFFFFFFFFFFFFFFFFn; }
  return h;
}

// 4バイトごとに、位置と鍵から murmur3 の仕上げの式で作った数を XOR して元に戻す（build_dist.py の keystream_xor と同じ式）
function unscramble(buf, seed) {
  const n = buf.length;
  const full = n & ~3;
  const u32 = new Uint32Array(buf.buffer, buf.byteOffset, full >> 2);
  for (let i = 0, len = u32.length; i < len; i++) {
    let z = (Math.imul(i, 0x9E3779B9) + seed) >>> 0;
    z ^= z >>> 16; z = Math.imul(z, 0x85EBCA6B); z ^= z >>> 13; z = Math.imul(z, 0xC2B2AE35); z ^= z >>> 16;
    u32[i] ^= z; // リトルエンディアンで、下の桁から1バイトずつ
  }
  if (full < n) {
    let z = (Math.imul(full >> 2, 0x9E3779B9) + seed) >>> 0;
    z ^= z >>> 16; z = Math.imul(z, 0x85EBCA6B); z ^= z >>> 13; z = Math.imul(z, 0xC2B2AE35); z ^= z >>> 16; z >>>= 0;
    for (let j = 0; full + j < n; j++) buf[full + j] ^= (z >>> (8 * j)) & 0xFF;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cacheP = null;
const openCache = () => (cacheP ||= caches.open(CACHE).catch(() => null));
// 通信が失敗したら取り直す（4回まで）。404 は null
async function fetchRetry(binUrl, signal) {
  let err = null;
  for (let i = 0; i < 4; i++) {
    if (signal && signal.aborted) throw new Error('打ち切り');
    try {
      const res = await fetch(binUrl, signal ? { signal } : undefined);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) { err = e; await sleep(500 * (i + 1)); }
  }
  throw err;
}
const netInflight = new Map(); // d/*.bin → 先読みが取って保存し終わるまでの Promise
// 並べ替えたままの中身を、保存か通信から得る。無ければ null
async function getRaw(binUrl) {
  const cache = await openCache();
  const hit = cache && await cache.match(binUrl).catch(() => null);
  if (hit) { ST.hit++; return hit.arrayBuffer(); }
  if (netInflight.has(binUrl)) { // 先読みが取っている途中なら、それを待って保存から読む
    await netInflight.get(binUrl).catch(() => {});
    const again = cache && await cache.match(binUrl).catch(() => null);
    if (again) return again.arrayBuffer();
  }
  const res = await fetchRetry(binUrl);
  if (!res) return null;
  ST.net++;
  if (cache) cache.put(binUrl, res.clone()).catch(() => {});
  return res.arrayBuffer();
}
// 格納庫にいる間の先読み：保存に入れるだけ（戻さない）。出撃したら新しく取り始めない
let prefetchStop = false;
let prefetchAbort = new AbortController(); // 取っている途中の先読みも打ち切れるように
function stopPrefetch() { prefetchStop = true; prefetchAbort.abort(); }
async function prefetchOne(binUrl) {
  const cache = await openCache();
  if (!cache || await cache.match(binUrl).catch(() => null)) return;
  if (netInflight.has(binUrl)) return netInflight.get(binUrl);
  const p = (async () => { const res = await fetchRetry(binUrl, prefetchAbort.signal); if (res) await cache.put(binUrl, res); })();
  netInflight.set(binUrl, p);
  p.then(() => netInflight.delete(binUrl), () => netInflight.delete(binUrl));
  return p;
}
async function prefetch(list, scope) {
  prefetchStop = false;
  prefetchAbort = new AbortController();
  let i = 0;
  const worker = async () => {
    while (!prefetchStop && i < list.length) {
      const rel = list[i++];
      try { await prefetchOne(new URL(`d/${binFor(rel).name}.bin`, scope).href); } catch { /* 遊ぶときに取り直す */ }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}
self.addEventListener('message', (e) => {
  const d = e.data;
  if (d && d.type === 'prefetch' && Array.isArray(d.list)) e.waitUntil(prefetch(d.list.filter((x) => typeof x === 'string' && x.startsWith('assets/')), self.registration.scope));
  if (d && d.type === 'prefetch-stop') stopPrefetch();
  if (d && d.type === 'stats' && e.source) e.source.postMessage({ type: 'stats', stats: { ...ST, tGet: Math.round(ST.tGet), tXor: Math.round(ST.tXor), tInf: Math.round(ST.tInf) } });
});

// 確認用：中継の中の時間の合計（ページから { type: 'stats' } を送ると返す）
const ST = { n: 0, hit: 0, net: 0, tGet: 0, tXor: 0, tInf: 0, bytes: 0 };
const hex = (h) => h.toString(16).padStart(16, '0');
// 素材の置き場所（d/<名前>.bin）と戻す鍵。スマホで縮めた版があればそちら
function binFor(rel) {
  const v = REV[rel] || '';
  if (MOBILE_ON) {
    const m = hex(fnv1a64(SALT + 'm:' + rel + v));
    if (MOBILE.has(m)) return { name: m, seed: Number(fnv1a64('m:' + rel + SALT) & 0xFFFFFFFFn) };
  }
  return { name: hex(fnv1a64(SALT + rel + v)), seed: Number(fnv1a64(rel + SALT) & 0xFFFFFFFFn) };
}
const inflight = new Map(); // assets/… → 戻した中身の Promise
function restore(rel, scope) {
  if (inflight.has(rel)) return inflight.get(rel);
  const p = (async () => {
    const { name, seed } = binFor(rel);
    const t0 = performance.now();
    const raw = await getRaw(new URL(`d/${name}.bin`, scope).href);
    const t1 = performance.now();
    if (!raw) return null;
    const buf = new Uint8Array(raw);
    unscramble(buf, seed);
    const t2 = performance.now();
    ST.n++; ST.tGet += t1 - t0; ST.tXor += t2 - t1; ST.bytes += buf.length;
    const ext = (rel.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
    if (!DEFLATE.includes(ext)) return buf;
    const out = new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    ST.tInf += performance.now() - t2;
    return out;
  })();
  inflight.set(rel, p);
  p.then(() => inflight.delete(rel), () => inflight.delete(rel));
  return p;
}

self.addEventListener('fetch', (e) => {
  const scope = self.registration.scope;
  const url = e.request.url.split('#')[0].split('?')[0];
  if (!url.startsWith(scope)) return;
  const rel = decodeURIComponent(url.slice(scope.length));
  if (!rel.startsWith('assets/')) return;
  e.respondWith((async () => {
    try {
      const buf = await restore(rel, scope);
      if (!buf) return new Response('', { status: 404 });
      const ext = (rel.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
      return new Response(buf, { headers: { 'Content-Type': MIME[ext] || 'application/octet-stream' } });
    } catch (err) {
      return new Response(String(err && err.message || err), { status: 503 });
    }
  })());
});
