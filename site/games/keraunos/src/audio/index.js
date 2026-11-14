// ゲームの音の口（1つだけ作る）。main.js は attach と frame だけを呼ぶ。
//   ?audio=0 で止める。確認用の ?test=1 では ?audio=1 を付けたときだけ動く。?audiolog=1 で鳴らした記録を audio.log に残す。
// 通信とノベルからは次を呼ぶ：
//   audio.cue('commIn') / audio.cue('commOut')     通信の入りと終わり
//   audio.cue('uiMove' | 'uiOk' | 'uiBack')        メニューの音
//   audio.playVoice(url, { gainDb })               声のファイル。{ duration, done(Promise), stop() } を返す。鳴る間 BGM を下げる
//   audio.setNovel(true | false)                   ノベルの間は BGM を下げ、効果音を止める
import { createEngine } from './engine.js';
import { createMusic } from './music.js';
import { GRAVE_Z, BASE_Z, TUNNEL_Z, LINE_Z } from '../course.js';
import { loadVolume, saveVolume, clampVolume, volumeDb } from '../pause.js';

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const ENABLED = typeof window !== 'undefined' && (params.has('audio') ? params.get('audio') !== '0' : params.get('test') !== '1');
const LOG = params.has('audiolog') ? [] : null;
const SOUNDCHECK = params.has('soundcheck');
// 確認用: ?perf=1 で音の段の時刻（ページを開いてからの ms）を data-audiot に出す（urgent＝すぐ要る音、all＝効果音全部、bgm:曲、voice＝最初の声）
const AT = params.has('perf') ? (k) => { const d = document.documentElement.dataset; if (!(` ${d.audiot || ''}`).includes(` ${k}:`)) d.audiot = `${d.audiot || ''} ${k}:${Math.round(performance.now())}`.trim(); } : () => {};

// feel.fire の名前 → 音の名前
const FEEL_CUE = { beamFull: 'chargeFull', beamStart: 'beamStart', beamHit: 'beamHit', twinShot: 'twinShot', twinHit: 'twinHit', lanceShot: 'lanceShot', lanceHit: 'lanceHit', salvoShot: 'salvoShot', salvoHit: 'salvoHit', rockBreak: 'rockBreak', kill: 'kill', killBig: 'killBig', bomb: 'bomb', hurt: 'hurt', deflect: 'deflect', dodge: 'dodge', loop: 'loop', boost: 'boost', brake: 'brake', pickup: 'pickup' };
const DUCK = { beamStart: [-7, 0.5, 1.2], bomb: [-10, 0.8, 1.6], killBig: [-5, 0.3, 0.9], playerDown: [-10, 1.0, 1.5], bossBlast: [-12, 1.5, 2.5], warning: [-5, 2.6, 0.8], hurt: [-3, 0.1, 0.4] };
const LOW_SHIELD = 30;
const REGIONS = [['asteroid', 0], ['grave', GRAVE_Z], ['outer', BASE_Z], ['tunnel', TUNNEL_Z], ['line', LINE_Z]];
const regionAt = (z) => { let id = REGIONS[0][0]; for (const [n, s] of REGIONS) if (z >= s) id = n; return id; };
const nextRegion = (id) => { const i = REGIONS.findIndex((r) => r[0] === id); return i >= 0 && i + 1 < REGIONS.length ? REGIONS[i + 1] : null; };
// 格納庫と通信ですぐ要る音。これだけ先にそろえ、残りの効果音は後ろで同時 6 本ずつ読む（spec REQ-013）
const URGENT = ['uiMove', 'uiOk', 'uiBack', 'equip', 'sortie', 'commIn', 'commOut', 'toast'];
const ATK = {
  missiles: [['missileLaunch', 1.0]], mines: [['mineDrop', 0]], sweep: [['sweepWarn', 0], ['laserHum', 1.4]], summon: [['summon', 0]],
  ram: [['ramWarn', 0], ['ramDash', 1.5]], beam: [['beamCharge', 0], ['bossBeam', 2.0]], ring: [['ringWarn', 0]],
};

function createAudio() {
  let engine = null; let music = null; let started = false; let loaded = false; let allLoaded = false;
  let clock = 0;
  const pendingNow = [];
  const later = []; // 描画の時計（ヒットストップで止まる）で鳴らす予約 {at, name, opts}
  const prev = { bolts: 0, shield: 100, down: false, firing: false, locks: 0, salvoEmpty: 9, bombEmpty: null, phase: -1, atk: '', cleared: false, lowT: 0 };
  let lastKillPerf = -1e9;
  let novel = false; let loadP = null; let menu = false;
  let paused = false; let pausedAt = 0;
  let storage = null;
  try { storage = globalThis.localStorage || null; } catch { storage = null; }
  const vol = loadVolume(storage);
  const fireAt = {}; const syncRec = []; const switchRec = [];

  // 音量は音の表のバスに足す。効果音は sfx と ui。声は変えない。ノベルの -8 もここ
  function applyVolume(tc) {
    if (!engine || !engine.manifest) return;
    const buses = engine.manifest.buses || {};
    engine.setBusDb('bgm', (buses.bgm || 0) + (novel ? -8 : 0) + volumeDb(vol.bgm), tc);
    engine.setBusDb('sfx', (buses.sfx || 0) + volumeDb(vol.sfx), tc);
    engine.setBusDb('ui', (buses.ui || 0) + volumeDb(vol.sfx), tc);
  }
  // 音を動かし始める。iPhone の Safari は「指を離した」操作（pointerup・touchend・click）でないと始まらず、触れた瞬間（pointerdown）では始まらない（spec REQ-014）。
  // 古い iOS は操作の中で音を1つ鳴らさないと始まらないので、無音を1つ鳴らす
  // 止めている間は、画面の操作で音の文脈を動かし始めない（spec REQ-017）
  function unlock() {
    if (paused || !engine) return;
    if (engine.ctx.state === 'running') return;
    engine.ctx.resume().catch(() => {});
    try { const b = engine.ctx.createBuffer(1, 1, engine.ctx.sampleRate); const s = engine.ctx.createBufferSource(); s.buffer = b; s.connect(engine.ctx.destination); s.start(0); } catch { /* 済 */ }
  }

  function ensure() {
    if (engine || !ENABLED) return;
    engine = createEngine({ log: LOG });
    music = createMusic(engine, { onSwitch: (id, delay, boom, hadTrack) => { AT(`bgm:${id}`); if (LOG) switchRec.push([id, +(performance.now() / 1000).toFixed(2), +delay.toFixed(2)]); if (boom && hadTrack && id !== 'clear') later.push({ real: performance.now() + delay * 1000, name: 'transBoom', opts: {} }); } });
    // 音の表 → すぐ要る音（格納庫の曲は並べて読む）。読めた音から鳴らし、全部そろうのは待たない
    loadP = (async () => {
      await engine.loadManifest();
      applyVolume(0.01);
      if (menu) music.preload('hangar');
      await engine.loadFiles(engine.cueFiles(URGENT), 8);
    })();
    loadP.then(() => {
      loaded = true; AT('urgent');
      if (menu) music.preload('asteroid'); // 出撃して最初の区間の曲
      return engine.loadFiles(engine.allCueFiles(), 6).then(async () => { allLoaded = true; AT('all'); if (SOUNDCHECK) { const m = await import('./soundCheck.js'); m.startSoundCheck(engine, music); } });
    }).catch((e) => console.error(e));
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) engine.ctx.suspend(); else if (!paused) unlock(); });
    window.__audio = api;
  }
  const running = () => engine && loaded && engine.ctx.state === 'running';

  function cue(name, opts = {}) {
    if (!engine) return;
    pendingNow.push({ name, opts });
  }
  function playNow(name, opts) {
    const v = engine.play(name, opts);
    if (LOG && v && fireAt[name] != null) { syncRec.push([name, +(performance.now() - fireAt[name]).toFixed(1)]); fireAt[name] = null; }
    if (v && DUCK[name]) engine.duckBgm(...DUCK[name]);
    if (v && (name === 'kill' || name === 'killBig' || name === 'rockBreak' || name === 'bomb')) lastKillPerf = performance.now();
    return v;
  }
  function attach(g) {
    ensure();
    if (!engine) return;
    // feel.fire を包む：手応えの名前が音の名前になる（描き終えた後に鳴らす）
    const origFire = g.feel.fire.bind(g.feel);
    g.feel.fire = (name, k = 1, side = 1) => {
      origFire(name, k, side);
      if (LOG) fireAt[name] = performance.now();
      const c = FEEL_CUE[name];
      if (!c) return;
      if (name === 'twinShot') cue(c, { pan: side * 0.12 });
      else if (name === 'salvoShot') cue(c, { pan: side * 0.3 });
      else if (name === 'beamStart') cue(c, { gainDb: 20 * Math.log10(0.65 + 0.35 * Math.min(1, k)) });
      else cue(c, k < 1 && name !== 'beamFull' ? { gainDb: 20 * Math.log10(Math.max(0.35, k)) } : {});
    };
    if (g.shipFx) wrapExplode(g.shipFx);
    if (g.hud && g.hud.toast) { const t = g.hud.toast.bind(g.hud); g.hud.toast = (...a) => { cue('toast'); return t(...a); }; }
  }
  function wrapExplode(fx) {
    const orig = fx.explode;
    fx.explode = (rel, size, space = 1) => {
      orig(rel, size, space);
      const d = Math.hypot(rel[0], rel[1], rel[2]) || 1;
      if (size >= 20) { cue('bossBlast'); return; }
      if (performance.now() - lastKillPerf < 80 && size < 20) return; // 撃破の音が鳴った直後は重ねない
      const pan = -(rel[0] / d) * 0.6;
      const atten = -Math.min(24, Math.max(0, (d - 40) / 22));
      if (d > 700) return;
      if (size >= 4) cue('explodeMid', { pan, gainDb: atten });
      else cue('explodeFar', { pan, gainDb: atten - 6 + Math.min(6, size * 2) });
    };
  }
  function schedule(name, delay, opts = {}) { later.push({ at: clock + delay, name, opts }); }

  function setLoop(has, make, drive) {
    if (has && !make.v) make.v = engine.loop(make.name);
    if (make.v) { if (has) drive(make.v); else { make.v.stop(); make.v = null; } }
  }
  let chargeVoice = null; const chargeL = { name: 'chargeHold', v: null }; const beamL = { name: 'beamLoop', v: null }; const engL = { name: 'engineLoop', v: null }; const boostL = { name: 'boostLoop', v: null }; const brakeL = { name: 'brakeLoop', v: null };

  // 毎コマ、描き終えた後に呼ぶ。realDt は実時間、timeScale はヒットストップの倍率
  let dbgT = 0; let tap = null;
  function debugOut(realDt) {
    dbgT -= realDt;
    if (dbgT > 0) return;
    dbgT = 0.5;
    const c = engine.ctx;
    document.documentElement.dataset.audio = JSON.stringify({ state: c.state, sr: c.sampleRate, base: c.baseLatency, out: c.outputLatency, loaded, allLoaded, cur: music.current, want: music.want, counts: engine.counts, sync: syncRec.slice(-200), switches: switchRec, makeupDb: tap && tap.makeupDb, peakDb: tap && tap.peakDb });
  }
  function frame(realDt, timeScale, snap) {
    if (!engine) return;
    if (LOG) {
      debugOut(realDt);
      if (!tap && running()) {
        tap = engine.debugTap();
        if (params.has('audiorec')) {
          const stop = tap.record();
          window.addEventListener('audiorec-stop', async () => {
            const blob = await stop();
            const fr = new FileReader();
            fr.onload = () => { const t = document.createElement('textarea'); t.id = 'audioRec'; t.style.display = 'none'; t.value = fr.result; document.body.append(t); };
            fr.readAsDataURL(blob);
          });
        }
      }
      if (tap) tap.sample();
      if (snap) api.dbgStage = snap.stage;
    }
    if (!running()) { pendingNow.length = 0; return; }
    clock += realDt * timeScale;
    // 描画の時計が来た予約を鳴らす
    for (let i = later.length - 1; i >= 0; i--) {
      const l = later[i];
      if ((l.at != null && clock >= l.at - 1e-6) || (l.real != null && performance.now() >= l.real)) {
        later.splice(i, 1);
        if (l.name === '_clear') music.go('clear', { now: true, boom: false, fade: 0.5 });
        else pendingNow.push({ name: l.name, opts: l.opts });
      }
    }
    for (const p of pendingNow) playNow(p.name, p.opts);
    pendingNow.length = 0;
    music.update();
    if (!snap || novel || SOUNDCHECK) return;
    const { state, boost, brake, downT, enemies, salvo, bomb, stage, z } = snap;
    const down = downT >= 0;
    // 溜めと照射と推進の音
    const lv = state.charge.level; const firing = state.charge.firing;
    // 溜め：押した瞬間に上がる音を鳴らし、溜めきったら保持の音へ。離す・撃つ・撃墜で切る
    const charging = lv > 0 && !firing && !down;
    if (charging && !chargeVoice && lv < 1) chargeVoice = engine.play('chargeUp', { rate: 1.25 / 1.2 });
    if (!charging && chargeVoice) { chargeVoice.stop(firing ? 0.02 : 0.07); chargeVoice = null; }
    setLoop(lv >= 1 && !firing && !down, chargeL, (v) => { v.setGain(1, 0.06); });
    setLoop(firing && !down, beamL, (v) => { v.setGain(1, 0.02); });
    if (prev.firing && !firing) cue('beamEnd');
    prev.firing = firing;
    setLoop(boost > 0 && !down, boostL, (v) => { v.setGain(1, 0.05); });
    setLoop(brake > 0 && !down, brakeL, (v) => { v.setGain(1, 0.05); });
    setLoop(!down, engL, (v) => { v.setRate(0.92 + 0.3 * boost); v.setGain(0.55 + 0.45 * boost, 0.08); });
    // 撃墜と再出撃
    if (down && !prev.down) { cue('playerDown'); engine.setBgmCutoff(420, 0.12); later.length = 0; }
    if (!down && prev.down) { cue('revive'); engine.setBgmCutoff(20000, 0.4); }
    prev.down = down;
    // 敵の弾の予告と発射
    const inf = enemies && enemies.info;
    if (inf) {
      if (inf.bolts > prev.bolts && !down) cue('boltFire');
      prev.bolts = inf.bolts;
    }
    // シールド
    if (enemies) {
      const sh = enemies.shield;
      if (sh - prev.shield >= 5 && !(prev.down || down)) cue('shieldHeal');
      prev.shield = sh;
      if (sh < LOW_SHIELD && !down) { prev.lowT -= realDt; if (prev.lowT <= 0) { cue('shieldLow'); prev.lowT = 1.6; } } else prev.lowT = 0;
    }
    // 誘導弾と爆雷
    if (salvo) {
      const n = salvo.locks.length;
      if (n > prev.locks) cue('salvoLock', { rate: 1 + (n - 1) * 0.075 });
      prev.locks = n;
      const e = salvo.emptyAge;
      if (e < prev.salvoEmpty && e < 0.1) cue('salvoEmpty');
      prev.salvoEmpty = e;
    }
    if (bomb) {
      const e = bomb.emptyAge;
      // 爆雷の emptyAge は空打ちした時刻（増えたら空打ち）
      if (prev.bombEmpty !== null && e > prev.bombEmpty && e > 0) cue('bombEmpty');
      prev.bombEmpty = e;
    }
    // 曲と面の出来事
    if (stage) {
      const si = stage.info;
      const ph = si.phase ?? -1;
      if (ph !== prev.phase) {
        if (ph === 0) { cue('warning'); schedule('bossArrive', 3.0); music.go('boss1', { now: true, boom: false, fade: 0.8 }); }
        if (ph === 1 && prev.phase !== 0) music.go('boss1', { now: true, boom: false, fade: 0.5 });
        if (ph === 2) { cue('phaseShift'); later.length = 0; music.go('boss2', { boom: false }); }
        if (ph === 3) { cue('phaseShift'); later.length = 0; music.go('boss3', { boom: false }); }
        if (ph === 4) { cue('bossChain'); later.length = 0; music.stop(4.0); }
        prev.phase = ph;
      }
      if ((si.atk || '') !== prev.atk) {
        prev.atk = si.atk || '';
        for (const [n, d] of ATK[prev.atk] || []) { if (d === 0) cue(n); else schedule(n, d); }
      }
      if (stage.cleared && !prev.cleared) { prev.cleared = true; schedule('_clear', 2.5); }
      if (ph < 0 && si.mode === 'rail') {
        const id = regionAt(z);
        music.go(id);
        const nx = nextRegion(id);
        if (nx && nx[1] - z < 800) music.preload(nx[0]); // 先に読んでおく
        if (ph < 0 && nx && nx[0] !== music.current) music.forgetExcept([id, nx[0]]);
      }
    } else music.go('asteroid');
    music.update();
    for (const p of pendingNow) playNow(p.name, p.opts);
    pendingNow.length = 0;
  }
  const api = {
    attach, frame, cue, log: LOG,
    // 出撃準備の画面：曲を流し、操作の音をすぐ鳴らす（ゲームの毎コマの処理はまだ動いていない）
    async startMenu() {
      menu = true;
      ensure();
      if (!engine) { menu = false; return; }
      await loadP;
      music.preload('hangar');
      await new Promise((r) => { const w = () => (music.current === 'hangar' || !menu ? r() : (music.go('hangar', { now: true, boom: false, fade: 1.2 }), music.update(), setTimeout(w, 200))); w(); });
    },
    ui(name) {
      if (paused) return;
      if (engine && loaded) {
        if (engine.ctx.state === 'running') engine.play(name);
        else {
          // 最初の操作では音の文脈がまだ止まっている。動き出した直後（0.4 秒以内）なら、その操作の音を鳴らす
          const t = performance.now();
          engine.ctx.resume().then(() => { if (performance.now() - t < 400) engine.play(name); }).catch(() => {});
        }
      }
      if (LOG && engine) debugOut(1);
    },
    endMenu() { menu = false; if (music) music.stop(0.8); },
    // ノベルの間：BGM を下げ、鳴り続ける音を止める
    setNovel(on) {
      novel = !!on;
      if (!engine) return;
      applyVolume(0.3);
      if (on) { for (const l of [chargeL, beamL, engL, boostL, brakeL]) if (l.v) { l.v.stop(); l.v = null; } }
    },
    // 声。鳴る間だけ BGM を下げる
    async playVoice(url, opts = {}) {
      if (!engine) return null;
      engine.duckBgm(-7, 60, 0.3);
      const h = await engine.playFile(url, { gainDb: opts.gainDb || 0 });
      if (h) AT('voice');
      if (h) h.done.then(() => engine.duckBgm(0, 0, 0.4));
      return h;
    },
    get engine() { return engine; },
    get music() { return music; },
    get ready() { return running(); },
    // 声を鳴らせるか（効果音がそろうのは待たない。spec REQ-013）
    get canVoice() { return !!engine && engine.ctx.state === 'running'; },
    // 声のファイルを先に取っておく（並べた順に同時 3 本）
    prefetchVoices(urls) { ensure(); if (engine) engine.prefetchFiles(urls, 3); },
    setPaused(on) {
      on = !!on;
      if (on === paused) return;
      paused = on;
      if (!engine) return;
      if (paused) {
        pausedAt = performance.now();
        engine.ctx.suspend().catch(() => {});
      } else {
        const dt = performance.now() - pausedAt;
        for (const l of later) if (l.real != null) l.real += dt;
        unlock();
      }
    },
    get paused() { return paused; },
    get volume() { return { bgm: vol.bgm, sfx: vol.sfx }; },
    setVolume(kind, v) {
      if (kind !== 'bgm' && kind !== 'sfx') return;
      vol[kind] = clampVolume(v);
      saveVolume(storage, vol);
      applyVolume(0.05);
    },
  };
  return api;
}

export const audio = createAudio();
