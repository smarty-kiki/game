// 音を1つずつゲームの中で聞く画面（?soundcheck=1）。↑↓で選ぶとすぐ鳴る。Enter でもう一度。
const FIRST = ['twinShot', 'chargeUp', 'chargeHold', 'chargeFull', 'beamStart', 'beamLoop', 'beamEnd', 'salvoLock', 'boost', 'pickup'];
const TRACK_NAME = { asteroid: '曲：小惑星帯', grave: '曲：沈没艦の墓場', outer: '曲：基地の外周', tunnel: '曲：内部通路', line: '曲：防衛線', boss1: '曲：ボス 第1段階', boss2: '曲：ボス 第2段階', boss3: '曲：ボス 第3段階', clear: '曲：クリア' };

export function startSoundCheck(engine, music) {
  const m = engine.manifest;
  const items = [];
  const add = (id) => { const c = m.cues[id]; if (c) items.push({ id, label: c.name, when: c.when, kind: c.loop || /Loop|Hold$/.test(id) ? 'loop' : 'one' }); };
  for (const list of Object.values(m.trial || {})) for (const t of list) items.push({ id: t.file, loop: t.loop, seq: t.seq, label: t.label, when: '聞いて番号を教えてください', kind: 'file' });
  add('twinShot');
  items.push({ id: 'twinShot', label: '通常弾（連射）', when: '押し続けたときの毎秒11発', kind: 'burst' });
  for (const id of FIRST.slice(1)) add(id);
  for (const id of Object.keys(m.cues)) if (!FIRST.includes(id)) add(id);
  for (const id of Object.keys(m.tracks)) items.push({ id, label: TRACK_NAME[id] || id, when: '', kind: 'track' });

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0e14;color:#e8e6df;font:15px/1.5 -apple-system,sans-serif;display:flex;flex-direction:column;padding:16px 24px;box-sizing:border-box';
  box.innerHTML = '<div style="font-size:18px;margin-bottom:8px">音を1つずつ聞く　<span style="opacity:.65;font-size:14px">↑↓で次の音（すぐ鳴る）・Enterでもう一度・クリックでも鳴る</span></div><div id="scList" style="flex:1;overflow:auto;columns:3;column-gap:20px"></div>';
  document.body.append(box);
  const list = box.querySelector('#scList');
  const rows = items.map((it, i) => {
    const r = document.createElement('div');
    r.style.cssText = 'padding:3px 8px;border-radius:4px;cursor:pointer;break-inside:avoid';
    r.innerHTML = `<b style="font-weight:600">${i + 1}. ${it.label}</b><div style="opacity:.55;font-size:12px">${it.when || ''}</div>`;
    r.addEventListener('click', () => select(i));
    list.append(r);
    return r;
  });
  let cur = -1; let loopV = null; let loopT = 0; let burstT = 0;
  function stopAll() {
    if (loopV) { loopV.stop(0.1); loopV = null; }
    clearTimeout(loopT); clearInterval(burstT);
    music.stop(0.15);
  }
  async function fire(it) {
    stopAll();
    if (engine.ctx.state !== 'running') await engine.ctx.resume();
    if (it.kind === 'loop') {
      loopV = engine.loop(it.id);
      if (loopV) { loopV.setGain(1, 0.02); loopT = setTimeout(() => { if (loopV) { loopV.stop(0.2); loopV = null; } }, 3500); }
    } else if (it.kind === 'burst') {
      let n = 0;
      burstT = setInterval(() => { engine.play(it.id, { pan: n % 2 ? 0.12 : -0.12 }); n += 1; if (n >= 20) clearInterval(burstT); }, 90);
    } else if (it.kind === 'track') {
      setTimeout(() => music.go(it.id, { now: true, boom: false, fade: 0.05 }), 200);
    } else if (it.kind === 'file') {
      if (it.seq) {
        // ゲームと同じ：0.15秒ごとに付き、付くほど音程が上がる
        const b = await engine.fetchBuffer(it.id); const c = engine.ctx;
        for (let k = 0; k < it.seq; k++) { const src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = 1 + k * 0.075; src.connect(engine.buses.sfx); src.start(c.currentTime + k * 0.15); }
        return;
      }
      engine.playFile(new URL(`../../assets/audio/${it.id}`, import.meta.url).href, { bus: 'sfx' });
      if (it.loop) {
        // 押している間：点火に続けて推進の音を2.5秒鳴らす
        const b = await engine.fetchBuffer(it.loop);
        const c = engine.ctx; const src = c.createBufferSource(); src.buffer = b; src.loop = true;
        const g = c.createGain(); src.connect(g); g.connect(engine.buses.sfx);
        const t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.15);
        g.gain.setValueAtTime(0.5, t + 2.5); g.gain.linearRampToValueAtTime(0, t + 2.9);
        src.start(t); src.stop(t + 3);
      }
    } else engine.play(it.id);
  }
  function select(i) {
    if (cur >= 0) rows[cur].style.background = '';
    cur = (i + items.length) % items.length;
    rows[cur].style.background = '#c8552b';
    rows[cur].scrollIntoView({ block: 'nearest' });
    fire(items[cur]);
    document.documentElement.dataset.soundcheck = items[cur].label;
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowDown') select(cur + 1);
    else if (e.code === 'ArrowUp') select(cur - 1);
    else if (e.code === 'Enter' && cur >= 0) fire(items[cur]);
    else return;
    e.preventDefault(); e.stopImmediatePropagation();
  }, { capture: true });
  return { count: items.length };
}
