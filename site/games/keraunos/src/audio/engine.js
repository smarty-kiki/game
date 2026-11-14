// 音の再生の土台（Web Audio）。出口は1つ：bgm・sfx・ui・voice → master → リミッター → スピーカー。
// three.js とゲームの状態に依存しない。音のファイルと規則は assets/audio/manifest.json が持つ。
import { VoiceBook, pickVariation, variationOf } from './voiceBook.js';

const dbToGain = (d) => Math.pow(10, d / 20);
const BASE = new URL('../../assets/audio/', import.meta.url);

export function createEngine({ log = null } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  // iPhone の消音スイッチが入っていても鳴るように、音楽の再生として扱ってもらう（Safari 17 以降。spec REQ-014）
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* 済 */ }
  const ctx = new AC({ sampleRate: 48000, latencyHint: 'interactive' });
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6; limiter.knee.value = 4; limiter.ratio.value = 14; limiter.attack.value = 0.002; limiter.release.value = 0.14;
  const trim = ctx.createGain(); // リミッターの自動補正を打ち消す（実測して manifest の limiterTrimDb に書く）
  master.connect(limiter); limiter.connect(trim); trim.connect(ctx.destination);
  const buses = {};
  for (const n of ['bgm', 'sfx', 'ui', 'voice']) { buses[n] = ctx.createGain(); buses[n].connect(master); }
  // BGM だけの低音の残るフィルター（撃墜の間など）と、大きな音の間に下げる倍率
  const bgmFilter = ctx.createBiquadFilter(); bgmFilter.type = 'lowpass'; bgmFilter.frequency.value = 20000;
  const bgmDuck = ctx.createGain();
  buses.bgm.disconnect(); buses.bgm.connect(bgmFilter); bgmFilter.connect(bgmDuck); bgmDuck.connect(master);

  let manifest = null;
  const book = new VoiceBook();
  const buffers = new Map(); // ファイル名 → AudioBuffer
  const lastVar = new Map();
  const counts = {};

  const inflight = new Map(); // ファイル名 → 読んでいる途中の Promise（同じ音を二重に取りにいかない）
  function fetchBuffer(file) {
    if (buffers.has(file)) return Promise.resolve(buffers.get(file));
    if (inflight.has(file)) return inflight.get(file);
    const p = (async () => {
      const res = await fetch(new URL(file, BASE));
      if (!res.ok) throw new Error(`音が読めない: ${file} (${res.status})`);
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      buffers.set(file, buf);
      return buf;
    })().finally(() => inflight.delete(file));
    inflight.set(file, p);
    return p;
  }
  // 音の表を読む（バスの音量もここで当てる）
  async function loadManifest() {
    if (manifest) return manifest;
    const res = await fetch(new URL('manifest.json', BASE));
    manifest = await res.json();
    if (manifest.limiterTrimDb != null) trim.gain.value = dbToGain(manifest.limiterTrimDb);
    for (const [n, v] of Object.entries(manifest.buses || {})) if (buses[n]) buses[n].gain.value = dbToGain(v);
    return manifest;
  }
  const cueFiles = (names) => [...new Set(names.flatMap((n) => (manifest.cues[n] ? manifest.cues[n].files : [])))];
  const allCueFiles = () => cueFiles(Object.keys(manifest.cues));
  // 並べた順に、同時 conc 本まで読む（デコードは別スレッドなので描画を止めない）。1本の失敗で残りを止めない
  async function loadFiles(files, conc = 6) {
    const q = files.filter((f) => !buffers.has(f));
    let i = 0;
    const worker = async () => { while (i < q.length) { const f = q[i++]; try { await fetchBuffer(f); } catch (e) { console.error(e); } } };
    await Promise.all(Array.from({ length: Math.min(conc, q.length) }, worker));
  }
  // 前と同じ口：音の表と効果音を全部読む
  async function load() {
    await loadManifest();
    await loadFiles(allCueFiles(), 6);
    return manifest;
  }
  function makeOutput(busName, gainV, pan) {
    const g = ctx.createGain(); g.gain.value = gainV;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(buses[busName] || buses.sfx);
    } else g.connect(buses[busName] || buses.sfx);
    return g;
  }
  // 単発。opts: gainDb, rate, pan, at（AudioContext の時刻）
  function play(name, opts = {}) {
    if (!manifest || ctx.state !== 'running') return null;
    const c = manifest.cues[name];
    if (!c) { console.warn('知らない音', name); return null; }
    const nowMs = performance.now();
    const ok = book.admit(name, c, nowMs);
    if (!ok.ok) return null;
    if (ok.steal && ok.steal.stop) ok.steal.stop(0.008);
    const i = pickVariation(c.files.length, lastVar.get(name) ?? -1);
    lastVar.set(name, i);
    const buf = buffers.get(c.files[i]);
    if (!buf) return null;
    const v = variationOf(c);
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.playbackRate.value = v.playbackRate * (opts.rate || 1);
    const out = makeOutput(c.bus, dbToGain((c.gainDb || 0) + v.gainDb + (opts.gainDb || 0)), opts.pan);
    src.connect(out);
    const at = opts.at || 0;
    src.start(at);
    const voice = {
      end: nowMs + (buf.duration / src.playbackRate.value) * 1000,
      stop(sec = 0.03) { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, sec / 3); try { src.stop(t + sec); } catch { /* 済 */ } },
    };
    src.onended = () => { src.disconnect(); out.disconnect(); };
    book.started(name, voice);
    counts[name] = (counts[name] || 0) + 1;
    if (log) log.push({ cue: name, perf: nowMs, ctx: ctx.currentTime });
    return voice;
  }
  // 鳴り続ける音。戻り値の setGain・setRate で毎コマ動かす。止めるまで1本
  function loop(name) {
    const c = manifest && manifest.cues[name];
    if (!c || ctx.state !== 'running') return null;
    const buf = buffers.get(c.files[0]);
    if (!buf) return null;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    if (c.loopStart != null) { src.loopStart = c.loopStart; src.loopEnd = c.loopEnd; }
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 20000;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(filt); filt.connect(g); g.connect(buses[c.bus] || buses.sfx);
    src.start(0, c.loopStart || 0);
    const base = dbToGain(c.gainDb || 0);
    counts[name] = (counts[name] || 0) + 1;
    if (log) log.push({ cue: name, perf: performance.now(), ctx: ctx.currentTime });
    return {
      setGain(v, tc = 0.03) { g.gain.setTargetAtTime(v * base, ctx.currentTime, tc); },
      setRate(r) { src.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.05); },
      setCutoff(f) { filt.frequency.setTargetAtTime(f, ctx.currentTime, 0.05); },
      stop(sec = 0.12) { const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, sec / 3); try { src.stop(t + sec + 0.05); } catch { /* 済 */ } src.onended = () => { src.disconnect(); filt.disconnect(); g.disconnect(); }; },
    };
  }
  // 大きな音の間、BGM を一度だけ下げて戻す
  function duckBgm(db = -6, hold = 0.25, release = 0.9) {
    const t = ctx.currentTime; const p = bgmDuck.gain;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(dbToGain(db), t, 0.012);
    p.setTargetAtTime(1, t + hold, release / 3);
  }
  function setBgmCutoff(f, tc = 0.2) { bgmFilter.frequency.setTargetAtTime(f, ctx.currentTime, tc); }
  function setBusDb(name, d, tc = 0.2) { if (buses[name]) buses[name].gain.setTargetAtTime(dbToGain(d), ctx.currentTime, tc); }
  // 通信の声などを voice バスで鳴らす。url はページからの相対か絶対
  // 声のファイル（ogg のまま）を先に取って持っておく。鳴らすときに展開する（展開済みで持つとメモリが大きいため）
  const fileBytes = new Map(); // url → Promise<ArrayBuffer>
  function fetchBytes(url) {
    const key = new URL(url, location.href).href;
    if (!fileBytes.has(key)) {
      const p = fetch(key).then((r) => { if (!r.ok) throw new Error(`声が読めない: ${url} (${r.status})`); return r.arrayBuffer(); });
      p.catch(() => fileBytes.delete(key));
      fileBytes.set(key, p);
    }
    return fileBytes.get(key);
  }
  async function prefetchFiles(urls, conc = 3) {
    let i = 0;
    const worker = async () => { while (i < urls.length) { const u = urls[i++]; try { await fetchBytes(u); } catch { /* 無い声は鳴らさない */ } } };
    await Promise.all(Array.from({ length: Math.min(conc, urls.length) }, worker));
  }
  async function playFile(url, { bus = 'voice', gainDb = 0, pan = 0 } = {}) {
    if (ctx.state !== 'running') return null;
    // decodeAudioData は渡した入れ物を使えなくするので写しを渡す
    const buf = await ctx.decodeAudioData((await fetchBytes(url)).slice(0));
    const src = ctx.createBufferSource(); src.buffer = buf;
    const out = makeOutput(bus, dbToGain(gainDb), pan);
    src.connect(out); src.start();
    const done = new Promise((r) => { src.onended = () => { src.disconnect(); out.disconnect(); r(); }; });
    return { duration: buf.duration, done, stop() { try { src.stop(); } catch { /* 済 */ } } };
  }
  // 確認用：リミッターの前後の音量を比べ（自動補正の実測）、出口の音を録る
  function debugTap() {
    const pre = ctx.createAnalyser(); const post = ctx.createAnalyser();
    pre.fftSize = post.fftSize = 2048; master.connect(pre); trim.connect(post);
    const a = new Float32Array(2048); const b = new Float32Array(2048);
    const st = { sumPre: 0, sumPost: 0, n: 0, peak: 0 };
    return {
      sample() {
        pre.getFloatTimeDomainData(a); post.getFloatTimeDomainData(b);
        let x = 0; let y = 0; let pk = 0;
        for (let i = 0; i < 2048; i++) { x += a[i] * a[i]; y += b[i] * b[i]; const q = Math.abs(b[i]); if (q > pk) pk = q; }
        // リミッターが効いていない小さな区間だけ足す（補正の倍率が分かる）
        if (Math.sqrt(x / 2048) < 0.1 && x > 1e-6) { st.sumPre += x; st.sumPost += y; st.n += 1; }
        if (pk > st.peak) st.peak = pk;
      },
      get makeupDb() { return st.n ? 10 * Math.log10(st.sumPost / st.sumPre) : null; },
      get peakDb() { return st.peak ? 20 * Math.log10(st.peak) : null; },
      record() {
        const dest = ctx.createMediaStreamDestination(); trim.connect(dest);
        if (new URLSearchParams(location.search).has('audiomute')) trim.disconnect(ctx.destination); // 確認用：スピーカーへ出さず録るだけ
        const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
        const chunks = []; rec.ondataavailable = (e) => chunks.push(e.data); rec.start(1000);
        return () => new Promise((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'audio/webm' })); rec.stop(); });
      },
    };
  }
  return {
    debugTap, ctx, buses, load, loadManifest, loadFiles, cueFiles, allCueFiles, play, loop, duckBgm, setBgmCutoff, setBusDb, playFile, prefetchFiles, fetchBuffer, counts,
    get manifest() { return manifest; },
    forget(file) { buffers.delete(file); },
    master,
  };
}
