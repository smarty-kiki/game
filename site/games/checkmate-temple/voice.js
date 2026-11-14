// Recorded voices (optional): whispers in the air, the man behind the grate, and the player's own few lines.
// Reads voice/manifest.json = { whisper: {pool: [file,...]}, prisoner: {...}, player: {...}, trim: {file: gain}, subs: {file: text} }.
// If it is missing the temple is simply quieter.
const SUBS = { wake: '……喂？', where: '这是哪里？', door: '不。不，不。', board: '一盘棋？', lift: '天啊……真沉。', unseen: '……是谁动了它？', hourglass: '这沙漏已经走了多久？',
  stakes: '等沙子流完……不。一定有出去的办法。', shatter: '老天。', read: '有人刻下了这些。', button: '那块松了。', loop: '……又是这个房间。', grate: '里面有人吗？', last: '不……还没到时候。',
  idols: '看看它们有多大。', check: '小心。' };
const WHISPER_VOL = 0.6;        // one place to turn every whisper up or down. At 1.0 they measured as loud as the spoken voices; 0.6 leaves them 10 to 17 dB clear of the soundscape in their own band
const PRISONER_VOL = 0.56;      // and the man in the wall. At 1.0 he measured -12 LUFS at the grate, the loudest thing in the temple bar a shatter
const PLAYER_VOL = 0.42;        // the player's own lines: level with the man at the grate
const EXIT_CARRIES = true;      // his last line is the one thing heard across the hall (faint, all echo). false = grate only, like everything else
const CLUE_AFTER = 270;         // seconds of play before any whisper may carry a clue (and then only once the player has found something)
const CLUE_ANYWAY = 600;        // after this long a clue whisper may come even to a player who has found nothing
export class Voices {
  constructor(audio) { this.audio = audio; this.ok = false; this.buf = {}; this.sw = {}; this.bags = {}; this.once = {}; this.nextWhisper = 30; this.nextMutter = 6; this.linger = 0; this.altar = 0; this.busyP = 0; this.busyW = 0;
    this.noticed = false; this.t = 0; this.said = {}; this.sayFree = 0; this.wasMoving = 0; this.log = []; }
  async start(data) {
    this.grate = [data.grate[0], data.grate[2], -data.grate[1] - 0.3];
    this.crack = [14.75, 3.0, -12.2];
    try { const r = await fetch('./voice/manifest.json'); if (!r.ok) return; this.m = await r.json(); this.ok = true; } catch (e) { return; }
    this.say('wake', 2.5);
    const ctx = this.audio.ctx;
    // the prisoner's chain: muffled by the wall, opening as you come close. All of the distance law is in throughWall(); the panner only gives direction.
    this.pLow = ctx.createBiquadFilter(); this.pLow.type = 'lowpass'; this.pLow.frequency.value = 260; this.pLow.Q.value = -3;      // -3 dB = no resonance: the cutoff is the -3 dB point
    this.pGain = ctx.createGain(); this.pGain.gain.value = 0;
    this.pPan = this.audio._panner(this.grate, 1.2, 0);
    this.pLow.connect(this.pGain); this.pGain.connect(this.pPan); this.pPan.connect(this.audio.dry);
    const w = ctx.createGain(); w.gain.value = 0.25; this.pGain.connect(w); w.connect(this.audio.wet);
    // the one line that carries: low, far, almost all hall
    this.cLow = ctx.createBiquadFilter(); this.cLow.type = 'lowpass'; this.cLow.frequency.value = 1100; this.cLow.Q.value = 0.7;
    const cg = ctx.createGain(); cg.gain.value = 0.22; const cp = this.audio._panner(this.grate, 6, 1); const cw = ctx.createGain(); cw.gain.value = 1.6;
    this.cLow.connect(cg); cg.connect(cp); cp.connect(this.audio.dry); cg.connect(cw); cw.connect(this.audio.wet);
  }
  // How much of him gets through, by distance from the grate in metres: [gain, low-pass Hz].
  // Open inside 1 m; 5.5 dB quieter per metre; nothing at all from 9.5 m. The wall closes over the top end faster than the level drops.
  static throughWall(d) {
    const m = Math.max(0, d - 1);
    return [Math.pow(10, -5.5 * m / 20) * Math.min(1, Math.max(0, (9.5 - d) / 3)), 260 + 6240 * Math.pow(2, -m / 0.95)];
  }
  _pick(kind, pool) {
    const list = this.m[kind] && this.m[kind][pool]; if (!list || !list.length) return null;
    const k = kind + pool; if (!this.bags[k] || !this.bags[k].length) { this.bags[k] = list.slice().sort(() => Math.random() - 0.5); if (this.bags[k][0] === this.last && list.length > 1) this.bags[k].reverse(); }
    return this.last = this.bags[k].shift();
  }
  async _buffer(file) {
    if (!this.buf[file]) this.buf[file] = fetch('./voice/' + file).then(r => r.arrayBuffer()).then(a => this.audio.ctx.decodeAudioData(a)).catch(() => null);
    return this.buf[file];
  }
  // Reversed pre-echo: the hall's echo of the first word, turned round so it swells up out of nothing and ends where the word begins.
  async _swell(file, b) {
    if (this.sw[file] !== undefined) return this.sw[file];
    try {
      const sr = b.sampleRate, head = Math.min(0.8, b.duration), lead = 1.5, n = Math.ceil((head + lead) * sr), hn = Math.floor(head * sr);
      const oc = new OfflineAudioContext(2, n, sr), hb = oc.createBuffer(1, hn, sr), src = b.getChannelData(0), d = hb.getChannelData(0);
      let pk0 = 0; for (let i = 0; i < hn; i++) { d[i] = src[hn - 1 - i]; pk0 = Math.max(pk0, Math.abs(d[i])); }
      const s = oc.createBufferSource(); s.buffer = hb; const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200; hp.Q.value = 0.5;
      const cv = oc.createConvolver(); cv.buffer = this.audio.rev.buffer; s.connect(hp); hp.connect(cv); cv.connect(oc.destination); s.start();
      const r = await oc.startRendering(); const L = Math.floor(lead * sr); let pk = 1e-9;
      for (let c = 0; c < 2; c++) { const x = r.getChannelData(c); x.reverse(); for (let i = 0; i < n; i++) { const e = i < L ? i / L : (n - i) / (n - L); x[i] *= e * e; pk = Math.max(pk, Math.abs(x[i])); } }
      for (let c = 0; c < 2; c++) { const x = r.getChannelData(c); for (let i = 0; i < n; i++) x[i] *= pk0 / pk; }      // peak of the swell = peak of the word
      this.sw[file] = { buf: r, lead };
    } catch (e) { this.sw[file] = null; }
    return this.sw[file];
  }
  _sub(text, sec, whisper = false) {
    if (!text || (this.cfg && this.cfg.subtitles === false)) return; const e = document.getElementById('sub'); if (!e) return;
    if (whisper && this.audio.ctx.currentTime < this.subUntil) return;             // never over the player's own line
    e.textContent = whisper ? '……' + text.replace(/[.。]$/, '') + '……' : text; e.style.opacity = whisper ? 0.62 : 1; e.style.letterSpacing = whisper ? '0.22em' : '';
    if (!whisper) this.subUntil = this.audio.ctx.currentTime + sec; clearTimeout(this._st); this._st = setTimeout(() => e.style.opacity = 0, sec * 1000);
  }
  // A whisper. pos = a place in the hall (it then passes behind the head), or null = inside the head, in one ear.
  // opt.pre: reversed swell before it (default: some). opt.mode: 'drift' | 'snap' | 'still' (default: random). opt.must: never dropped, waits for the air to clear.
  async whisper(pool, pos = null, vol = 0.42, opt = {}) {
    if (!this.ok) return false;
    // Scheduling only: a whisper that carries a clue waits until the player has had time to explore (CLUE_AFTER seconds) and has found
    // something (read a tablet or scratch, pressed the loose stone, walked the passage); CLUE_ANYWAY seconds in, it may come regardless.
    if (pool === 'clue' && !(this.t > CLUE_AFTER && (this.found || this.t > CLUE_ANYWAY))) pool = 'liturgy';
    if (this.busyW > 0) { if (opt.must && !opt.tried) setTimeout(() => { this.busyW = Math.min(this.busyW, 0); this.whisper(pool, pos, vol, { ...opt, tried: 1 }); }, (this.busyW + 0.4) * 1000); return false; }   // one said to the player waits its turn
    const f = this._pick('whisper', pool); if (!f) return false;
    this.busyW = 6; const b = await this._buffer(f); if (!b) return false;
    const lite = document.documentElement.classList.contains('touch');             // phones: one source per whisper, no swell, no double
    const R = 0.94, dur = b.duration / R, pre = opt.pre !== undefined ? opt.pre : Math.random() < 0.55, sw = pre && !lite ? await this._swell(f, b) : null;
    const ctx = this.audio.ctx, t = ctx.currentTime + 0.05, t1 = t + (sw ? sw.lead / R : 0), v = vol * WHISPER_VOL * ((this.m.trim && this.m.trim[f]) || 1);
    this.busyW = (t1 - t) + dur + 4;
    // all air: nothing below 1.5 kHz; a very quiet copy a fourth lower under it; a short pre-delay into the long hall
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = R;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; hp.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = v * 0.8; s.connect(hp); hp.connect(g);
    const s2 = ctx.createBufferSource(); s2.buffer = b; s2.playbackRate.value = R * 0.75; const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 0.6;
    const g2 = ctx.createGain(); g2.gain.value = v * 0.16; if (!lite) { s2.connect(lp); lp.connect(g2); }
    const bus = ctx.createGain(); g.connect(bus); g2.connect(bus);
    const dl = ctx.createDelay(0.5); dl.delayTime.value = 0.09; const w = ctx.createGain(); w.gain.value = 1.8; bus.connect(dl); dl.connect(w); w.connect(this.audio.wet);
    if (sw) { const x = ctx.createBufferSource(); x.buffer = sw.buf; x.playbackRate.value = R; const xg = ctx.createGain(); xg.gain.value = v * 0.8 * 0.5; x.connect(xg); xg.connect(bus); x.start(t); }
    const mode = opt.mode || ['drift', 'drift', 'snap', 'still'][Math.floor(Math.random() * 4)], side = Math.random() < 0.5 ? -1 : 1, end = t1 + dur;
    if (pos) {                                                                    // in the hall: it slides past behind you, or stays put
      const p = this.audio._panner(pos, 2.5, 1); bus.connect(p); p.connect(this.audio.dry);
      if (mode !== 'still' && this.player) { const yaw = this.player.yaw, k = (mode === 'snap' ? 5 : 3) * side, dx = Math.cos(yaw) * k, dz = -Math.sin(yaw) * k;       // across the line of sight
        p.positionX.setValueAtTime(pos[0] - dx, t); p.positionZ.setValueAtTime(pos[2] - dz, t);
        if (mode === 'snap') { p.positionX.setValueAtTime(pos[0] + dx, t1 + dur * 0.5); p.positionZ.setValueAtTime(pos[2] + dz, t1 + dur * 0.5); }
        else { p.positionX.linearRampToValueAtTime(pos[0] + dx, end + 0.5); p.positionZ.linearRampToValueAtTime(pos[2] + dz, end + 0.5); } }
    } else {                                                                      // in the head: one ear, a slow crossing, or a jump to the other ear
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(side * 0.95, t);
      if (mode === 'drift') p.pan.linearRampToValueAtTime(-side * 0.7, end + 1); else if (mode === 'snap') p.pan.setValueAtTime(-side * 0.95, t1 + dur * (0.4 + Math.random() * 0.2));
      bus.connect(p); p.connect(this.audio.dry);
    }
    s.start(t1); if (!lite) s2.start(t1 + 0.02);
    if (this.m.subs && this.m.subs[f]) setTimeout(() => this._sub(this.m.subs[f], dur + 1.6, true), (t1 - ctx.currentTime) * 1000);
    this.lastWhisper = f; this.log.push(['w', f, +this.t.toFixed(1), mode, !!sw, pos ? 'hall' : 'head']); return true;
  }
  // the player's own voice: dry, close, each line once, never two at a time. Switch it off with "playerVoice": false in site.json
  async say(pool, delay = 0) {
    if (!this.ok || !this.cfg || this.cfg.playerVoice === false || this.said[pool] || !this.m.player || !this.m.player[pool]) return; this.said[pool] = 1;
    const b = await this._buffer(this.m.player[pool][0]); if (!b) return;
    const ctx = this.audio.ctx, at = Math.max(ctx.currentTime + delay, this.sayFree + 0.7); this.sayFree = at + b.duration;
    setTimeout(() => { const s = ctx.createBufferSource(); s.buffer = b; const g = ctx.createGain(); g.gain.value = PLAYER_VOL; s.connect(g); g.connect(this.audio.master);
      const w = ctx.createGain(); w.gain.value = pool === 'wake' ? 0.9 : 0.08; g.connect(w); w.connect(this.audio.wet); s.start();
      this.log.push(['x', pool, +this.t.toFixed(1)]); this._sub(SUBS[pool] || '', b.duration + 1.4); }, (at - ctx.currentTime) * 1000);
  }
  // the man in the wall. force = he says it even if he is mid-sentence (it waits for him to finish); carry = the one line heard across the hall
  async prisoner(pool, force = false, carry = false) {
    if (!this.ok || (this.busyP > 0 && !force)) return false;
    if (!force && !carry && this.pGain.gain.value < 0.004 * PRISONER_VOL) return false;           // nobody near enough to hear: do not spend the line
    const f = this._pick('prisoner', pool); if (!f) return false;
    const wait = Math.max(0, this.busyP); this.busyP = wait + 5; const b = await this._buffer(f); if (!b) return false; this.busyP = wait + b.duration / 0.93 + 1.2;
    const s = this.audio.ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = 0.93; s.connect(this.pLow);
    if (carry && EXIT_CARRIES && this.pGain.gain.value < 0.05 * PRISONER_VOL) s.connect(this.cLow);
    s.start(this.audio.ctx.currentTime + wait); this.lastPrisoner = f; this.log.push(['p', f, +this.t.toFixed(1), pool]); return true;
  }
  near(player, p, r) { return Math.hypot(player.x - p[0], player.z - p[2]) < r; }
  behind(player, d = 5) { const a = player.yaw + Math.PI + (Math.random() - 0.5) * 1.6; return [player.x - Math.sin(a) * d, 1.6 + Math.random() * 2, player.z - Math.cos(a) * d]; }
  event(type, d) {
    if (!this.ok) return; const r = Math.random();
    if (type === 'button' || type === 'loop_return' || (type === 'read' && d !== 'hourglass')) this.found = (this.found || 0) + 1;
    if (type === 'grab') this.say('lift', 0.9); if (type === 'unseen') this.say('unseen', 1.2); if (type === 'shatter') this.say('shatter', 0.5); if (type === 'button') this.say('button'); if (type === 'loop_return') this.say('loop', 2.5);
    if (type === 'read') this.say(d === 'hourglass' ? 'hourglass' : d === 'grate' ? 'grate' : 'read', 1.0); if (type === 'check' && d === 'w') this.say('check', 2.0);
    if (type === 'shatter') setTimeout(() => this.prisoner('shatter'), 1500);
    else if (type === 'unseen') { if (r < 0.3) this.prisoner('unseen'); else if (r < 0.5) this.whisper('liturgy', this.player ? this.behind(this.player, 7) : null, 0.45); }
    else if (type === 'check') { this.whisper('check', null, 0.6, { pre: true }); setTimeout(() => this.prisoner('check'), 4000); }
    else if (type === 'grab') { if (!this.once.grab) { this.once.grab = 1; this.whisper('direct_board', null, 0.6, { pre: true, mode: 'still', must: 1 }); } else if (r < 0.15) this.whisper('liturgy', this.behind(this.player, 6), 0.4); }
    else if (type === 'button') setTimeout(() => this.prisoner('loop', true), 3500);
    else if (type === 'loop_return') { setTimeout(() => this.prisoner('laugh', true), 1200); setTimeout(() => this.whisper('loop', null, 0.6), 6000); }
    else if (type === 'read') { if (d === 'relief' && !this.once.rel) { this.once.rel = 1; this.whisper('direct_study', null, 0.55, { pre: true, must: 1 }); }
      if (d === 'hourglass' && !this.once.hg) { this.once.hg = 1; setTimeout(() => this.whisper('direct_hourglass', null, 0.55, { pre: true, must: 1 }), 2600); } if (d === 'shame' || d === 'ledger') { if (r < 0.7) this.whisper('clue', null, 0.5); } }
    else if (type === 'exit') { setTimeout(() => this.prisoner('exit', true, true), 6000); }
    else if (type === 'mate') this.whisper('check', null, 0.7, { pre: true });
    else if (type === 'aside') setTimeout(() => this.whisper('aside', null, 0.55, { pre: true, mode: 'still', must: 1 }), 1800);      // the unseen hand clears the square for the king
  }
  update(dt, player, S, game) {
    this.player = player; if (!this.ok || !S.started || S.ended) return; this.t += dt; this.busyP -= dt; this.busyW -= dt;
    if (this.t > 5.5) this.say('where'); if (player.z > 23.5) this.say('door'); if (this.t > 10 && player.z < 9.8 && Math.abs(player.x) < 7) this.say('board'); if (player.z < -18.5) this.say('idols'); if (S.timeLeft < 60) this.say('last'); if (Math.hypot(player.x - 3.5, player.z + 11.75) < 3.2) this.say('hourglass');
    if (Math.hypot(player.x - this.grate[0], player.z - this.grate[2]) < 2.2 && !this.noticed) this.say('grate');
    // how much of him gets through the wall
    const dg = Math.hypot(player.x - this.grate[0], player.z - this.grate[2]); const dc = Math.hypot(player.x - this.crack[0], player.z - this.crack[2]);
    const atCrack = S.inLoop && dc < 2.6, [gw, fw] = Voices.throughWall(dg);
    const tt = this.audio.ctx.currentTime;
    this.pLow.frequency.setTargetAtTime(atCrack ? 7500 : fw, tt, 0.2);
    this.pGain.gain.setTargetAtTime((atCrack ? 1.25 : gw) * PRISONER_VOL, tt, 0.2);
    const p = atCrack ? this.crack : this.grate; this.pPan.positionX.value = p[0]; this.pPan.positionY.value = p[1]; this.pPan.positionZ.value = p[2];
    const late = S.timeLeft < 28 * 60 * 0.25;
    // he mutters to himself whether or not anyone is there; he notices if you stay
    if (dg < 2.6 || atCrack) this.linger += dt; else { this.linger = 0; if (dg > 8) this.noticed = false; }
    this.nextMutter -= dt;
    if (this.linger > 3 && !this.noticed) { this.noticed = true; if (this.said.wake && !this.once.hello && this.m.prisoner.hello) { this.once.hello = 1; this.prisoner('hello', true); } else this.prisoner('notice', true); this.nextMutter = 9; this.talk = 0; }
    else if (this.nextMutter < 0 && this.busyP <= 0) {
      if (this.noticed && this.linger > 0) { this.talk++; const r = Math.random(); this.prisoner(late && r < 0.3 ? 'late' : this.talk % 3 === 1 ? 'clue' : this.talk % 5 === 0 ? 'false' : r < 0.5 ? 'clue' : r < 0.7 ? 'false' : 'mutter'); this.nextMutter = 5 + Math.random() * 6; }
      else if (dg < 9 || atCrack) { this.prisoner(late && Math.random() < 0.3 ? 'late' : Math.random() < 0.12 ? 'laugh' : Math.random() < 0.3 && this.m.prisoner.breath ? 'breath' : 'mutter'); this.nextMutter = 7 + Math.random() * 13; }
      else this.nextMutter = 2;
    }
    // whispers: rare, and placed
    this.nextWhisper -= dt * (late ? 2.5 : 1);
    // sometimes one comes just after you stop walking, close, in one ear
    const sp = Math.hypot(player.vx, player.vz);
    if (this.wasMoving > 4 && sp < 0.1 && this.t > 40 && this.nextWhisper < 30 && this.busyW <= 0 && Math.random() < 0.5) { this.stopHit = 0.7; this.nextWhisper = Math.max(this.nextWhisper, 0) + 40 + Math.random() * 50; }
    this.wasMoving = sp > 1 ? this.wasMoving + dt : sp < 0.1 ? 0 : this.wasMoving;
    if (this.stopHit > 0 && (this.stopHit -= dt) <= 0) this.whisper(Math.random() < 0.5 ? 'short' : 'breath', null, 0.4, { pre: Math.random() < 0.7, mode: 'still' });
    if (this.near(player, [0, 0, -12.6], 2.2)) { this.altar += dt; if (this.altar > 6 && !this.once.altar) { this.once.altar = 1; this.whisper('direct_altar', [0, 3, -23], 0.7, { pre: true, mode: 'still', must: 1 }); } } else this.altar = 0;
    if (this.nextWhisper < 0) { const r = Math.random(); this.whisper(late && r < 0.35 ? 'late' : r < 0.15 ? 'breath' : r < 0.35 ? 'short' : r < 0.55 ? 'saying' : r < 0.85 ? 'liturgy' : 'clue', Math.random() < 0.75 ? this.behind(player, 4 + Math.random() * 6) : null, 0.42); this.nextWhisper = 45 + Math.random() * 70; }
  }
}
