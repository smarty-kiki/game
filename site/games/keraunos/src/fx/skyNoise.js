import * as THREE from 'three';

// 空と惑星で共有する3次元の雑音。繰り返しても継ぎ目が出ないように作る。
// R・G・B は別々の雲模様（4段重ね）、A は泡のような粒の模様（恒星の表面や星雲の明るい塊に使う）
const N = 64;
let tex = null;
export function noise3D() {
  if (tex) return tex;
  let seed = 90127;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const data = new Uint8Array(N * N * N * 4);
  const fade = (x) => x * x * (3 - 2 * x);
  const layer = (period) => {
    const g = new Float32Array(period * period * period);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y, z) => {
      const fx = x * period; const fy = y * period; const fz = z * period;
      const ix = Math.floor(fx); const iy = Math.floor(fy); const iz = Math.floor(fz);
      const tx = fade(fx - ix); const ty = fade(fy - iy); const tz = fade(fz - iz);
      const at = (a, b, c) => g[(a % period) + (b % period) * period + (c % period) * period * period];
      const l = (a, b, t) => a + (b - a) * t;
      return l(
        l(l(at(ix, iy, iz), at(ix + 1, iy, iz), tx), l(at(ix, iy + 1, iz), at(ix + 1, iy + 1, iz), tx), ty),
        l(l(at(ix, iy, iz + 1), at(ix + 1, iy, iz + 1), tx), l(at(ix, iy + 1, iz + 1), at(ix + 1, iy + 1, iz + 1), tx), ty),
        tz,
      );
    };
  };
  const chans = [0, 1, 2].map(() => [layer(4), layer(8), layer(16), layer(32)]);
  // 泡の模様：格子の点までの距離
  const WC = 11;
  const pts = new Float32Array(WC * WC * WC * 3);
  for (let i = 0; i < pts.length; i++) pts[i] = rnd();
  const worley = (x, y, z) => {
    const fx = x * WC; const fy = y * WC; const fz = z * WC;
    const ix = Math.floor(fx); const iy = Math.floor(fy); const iz = Math.floor(fz);
    let best = 9;
    for (let c = -1; c <= 1; c++) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const px = (ix + a + WC) % WC; const py = (iy + b + WC) % WC; const pz = (iz + c + WC) % WC;
      const k = (px + py * WC + pz * WC * WC) * 3;
      const dx = ix + a + pts[k] - fx; const dy = iy + b + pts[k + 1] - fy; const dz = iz + c + pts[k + 2] - fz;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) best = d;
    }
    return 1 - Math.min(1, Math.sqrt(best));
  };
  let o = 0;
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / N; const y = j / N; const z = k / N;
    for (let c = 0; c < 3; c++) {
      const L = chans[c];
      // 雲模様は 0.5 のまわりに集まるので、広げて使いやすくする
      const v = (L[0](x, y, z) * 0.5 + L[1](x, y, z) * 0.25 + L[2](x, y, z) * 0.15 + L[3](x, y, z) * 0.1 - 0.5) * 1.9 + 0.5;
      data[o++] = Math.max(0, Math.min(255, v * 255));
    }
    data[o++] = worley(x, y, z) * 255;
  }
  tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

// 大きな画像を GPU へ前もって送る（初めて映る瞬間に止まらないように）。
// 読み込み画面の間に届いた分はまとめて送り、遊び始めてから届いた分だけ1コマに1枚にする
const pending = [];
let started = 0;
export const queueTexture = (t) => pending.push(t);
export function flushTextures(renderer) {
  started += 1;
  if (started === 1) { while (pending.length) renderer.initTexture(pending.shift()); return; }
  const t = pending.shift();
  if (t) renderer.initTexture(t);
}

// 確認用：?boot=1 で起動の経過と長く止まった処理を <html data-boot> に書く
if (new URLSearchParams(location.search).has('boot')) {
  const log = { long: [] };
  const write = () => { document.documentElement.dataset.boot = JSON.stringify(log); };
  log.moduleAt = Math.round(performance.now());
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) log.long.push([Math.round(e.startTime), Math.round(e.duration)]); write(); }).observe({ entryTypes: ['longtask'] });
  } catch (e) { log.err = String(e); }
  // 区切りごとに、前回からの積み上げを残す
  const first = () => { log.firstFrameAfterLoad = Math.round(performance.now()); write(); };
  const wait = setInterval(() => { if (document.documentElement.dataset.fps) { clearInterval(wait); first(); } }, 50);
  // GL の呼び出しごとの合計時間
  log.gl = {};
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...a) {
    const gl = orig.apply(this, a);
    if (gl && a[0] === 'webgl2' && !gl.__timed) {
      gl.__timed = true;
      const all = []; for (const n in gl) { try { if (typeof gl[n] === 'function') all.push(n); } catch (e) {} }
      for (const n of all) {
        const f = gl[n].bind(gl);
        gl[n] = (...x) => { const t = performance.now(); const r = f(...x); const d = performance.now() - t;
          if (n === 'texSubImage2D' && d > 12) { const im = x[x.length - 1]; (log.big = log.big || []).push([Math.round(d), Math.round(t), im && im.src ? im.src.split('/').slice(-2).join('/') : (im && im.constructor ? im.constructor.name : ''), im && (im.width || im.naturalWidth)]); } if (d < 0.5 && !log.gl[n]) return r; const e = log.gl[n] || (log.gl[n] = [0, 0, 0]); e[0] += d; e[1]++; e[2] = Math.max(e[2], d); if (d > 20 && performance.now() > 4000) (log.late = log.late || []).push([n, Math.round(t), Math.round(d)]); return r; };
      }
    }
    return gl;
  };
  setInterval(write, 500);
  write();
}
