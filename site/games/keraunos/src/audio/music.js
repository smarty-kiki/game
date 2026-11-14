// BGM の切り替え。区間の曲はテンポをそろえ、次の小節の頭で重ねて移る。ボスは段階ごとに同じ拍で移る。
// 曲の情報は manifest.tracks（file, bpm, barBeats, loopStart, loopEnd, parts）。重要な予告はここを待たない（効果音は別に鳴る）。
const BAR_FADE = 1.0; // 重ねる小節数

export function createMusic(engine, { onSwitch = null } = {}) {
  const ctx = engine.ctx;
  let cur = null; // { id, src, gain, startAt, bar }
  let want = null;
  let pending = null;
  const ready = new Set();
  const loading = new Map();

  function info(id) { return engine.manifest.tracks[id]; }
  function preload(id) {
    if (!id || ready.has(id) || loading.has(id)) return;
    const t = info(id);
    if (!t) return;
    loading.set(id, engine.fetchBuffer(t.file).then(() => { ready.add(id); loading.delete(id); if (want === id) tick(false, true, null); }).catch((e) => { loading.delete(id); console.error(e); }));
  }
  function startVoice(id, at, offset, fadeIn) {
    const t = info(id);
    return engine.fetchBuffer(t.file).then((b) => {
      const src = ctx.createBufferSource(); src.buffer = b;
      if (t.loopEnd) { src.loop = true; src.loopStart = t.loopStart; src.loopEnd = t.loopEnd; }
      const gain = ctx.createGain();
      src.connect(gain); gain.connect(engine.buses.bgm);
      const when = Math.max(at, ctx.currentTime + 0.01);
      gain.gain.setValueAtTime(fadeIn > 0 ? 0.0001 : 1, when);
      if (fadeIn > 0) gain.gain.setTargetAtTime(1, when, fadeIn / 3);
      src.start(when, offset);
      return { id, src, gain, startAt: when - offset, bar: (60 / t.bpm) * (t.barBeats || 4) };
    });
  }
  function fadeOutVoice(v, at, sec) {
    const t = Math.max(at, ctx.currentTime);
    v.gain.gain.setValueAtTime(v.gain.gain.value, t);
    v.gain.gain.setTargetAtTime(0, t, sec / 3);
    try { v.src.stop(t + sec * 2); } catch { /* 済 */ }
    v.src.onended = () => { v.src.disconnect(); v.gain.disconnect(); };
  }
  function nextBar(v) {
    const pos = ctx.currentTime - v.startAt;
    return v.startAt + (Math.floor(pos / v.bar) + 1) * v.bar;
  }
  // 曲を替える。now=true は小節を待たない（ボス登場）
  function go(id, { now = false, boom = true, fade = null } = {}) {
    if (want === id) return;
    want = id;
    preload(id);
    tick(now, boom, fade);
  }
  function tick(now, boom, fade) {
    if (!want || pending || (cur && cur.id === want) || !ready.has(want)) return;
    const id = want;
    pending = id;
    const t = info(id);
    const at = cur ? (now ? ctx.currentTime + 0.03 : nextBar(cur)) : ctx.currentTime + 0.03;
    const offset = t.offset || 0;
    const fin = fade ?? (cur ? 0.25 : 0.8);
    startVoice(id, at, offset, fin).then((v) => {
      const had = !!cur;
      if (cur) fadeOutVoice(cur, v.startAt + offset, fade ?? (cur.bar * BAR_FADE));
      cur = v; pending = null;
      if (onSwitch) onSwitch(id, Math.max(0, at - ctx.currentTime), !!boom, had);
    }).catch((e) => { pending = null; console.error(e); });
  }
  return {
    go, preload,
    // 毎コマ：読み終わった曲へ移る
    update() { if (want && !pending && (!cur || cur.id !== want)) tick(false, true, null); },
    stop(sec = 1.2) { if (cur) { fadeOutVoice(cur, ctx.currentTime, sec); cur = null; } want = null; },
    get current() { return cur ? cur.id : null; },
    get dbg() { return { pending, ready: [...ready], loading: [...loading.keys()] }; },
    get want() { return want; },
    forgetExcept(keep) { for (const id of ready) if (!keep.includes(id)) { engine.forget(info(id).file); ready.delete(id); } },
  };
}
