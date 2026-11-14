// Procedural soundscape: everything is synthesized with the Web Audio API, no samples.
const NOISE_SEC = 24, OUT_TRIM = 0.9;       // the limiter adds 2.3 dB of make-up of its own; 0.9 leaves the loudest moment measured (a shatter at your feet under the last bell) near -1.6 dBTP
const DRONE = 0.2;        // the low drone. It was 0.5, which alone measured -16.7 LUFS and sat on the compressor the whole time
// The pieces (see "the pieces" at the end of the class). Two level knobs, then the recipe tables.
const PIECE_VOL = 1.0;    // every sound a piece makes: lift, set-down, knocks, slide, roll, carry, the other hand
const SLIDE_VOL = 1.0;    // the continuous ones only: slide, crunch, roll, graze
const CARRY_VOL = 1.0;    // the piece in the player's hands: the weight hum, the grit, the shifts and creaks as it travels
const UNSEEN_VOL = 1.0;   // the other hand's moves: the tell, its lift, the glide tone, its set-down
const TELL_VOL = 1.0;      // only the tell before the other hand lifts (the intake of air, the swell, the glassy ring)
const UNSEEN_TONE = 0.14; // the rising tone under the other hand's lift
const PIECE_SUB = 0.5;    // how much of an impact goes into the floor below 100 Hz (it costs headroom and small speakers cannot play it)
// The pieces have their own fall-off with distance (the rest of the game uses the browser's 1/distance): full level out to PIECE_NEAR metres,
// then (PIECE_NEAR / d) ^ PIECE_FAR. With 2.2 and 0.5: 3 m -1.3 dB, 8 m -5.6 dB, 12 m -7.4 dB, 15 m -8.3 dB. PIECE_FAR 1 would be 1/distance; 0 none.
const PIECE_NEAR = 2.2, PIECE_FAR = 0.5;
const R = (a, b) => a + Math.random() * (b - a), clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const MODES = [1, 1.83, 2.71, 4.12], MODE_G = [1, 0.6, 0.4, 0.25];      // the stone's own modes: ratios to the lowest, and their levels
// how much of each layer a kind of impact gets. floor: a piece set down or fallen. piece: stone on stone. rock: the rim of the base knocking as it rocks.
// chip: a fragment. tick: the last touch as a piece comes to rest. strike: the blow that breaks a piece.
const HIT = {
  floor: { click: 0.45, mode: 0.36, body: 0.33, thump: 0.8, low: 0.5, bright: 1, wet: 0.8, modes: 4 },
  piece: { click: 0.6, mode: 0.5, body: 0.15, thump: 0.18, low: 0.22, bright: 1.25, wet: 0.7, modes: 4 },
  rock: { click: 0.5, mode: 0.45, body: 0.25, thump: 0.3, low: 0.3, bright: 1.1, wet: 0.7, modes: 3 },
  chip: { click: 0.6, mode: 0.7, thump: 0, low: 0.2, bright: 1.0, wet: 0.7, modes: 2 },
  tick: { click: 0.8, mode: 0.5, thump: 0, low: 0, bright: 1.8, wet: 0.6, modes: 1 },
  strike: { click: 0.9, mode: 0.8, body: 0.5, thump: 0.7, low: 0.6, bright: 1.1, wet: 0.9, modes: 4 },
};
const MV = { hi: 2.4, lo: 3.4, md: 4.2, cr: 2.2, rl: 0.45, rm: 0.6, pr: 0.15, pr2: 0.2, cg: 0.11, gl: 0.14, os: 0.08, o2: 0.012 };      // levels of the continuous layers
export class TempleAudio {
  constructor() { this.ctx = null; this.muted = false; this.tension = 0; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.4;
    // a limiter after it, so a shatter beside the player or the last bell can never clip the output
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
    const trim = ctx.createGain(); trim.gain.value = OUT_TRIM;
    this.master.connect(comp); comp.connect(lim); lim.connect(trim); trim.connect(ctx.destination); this.comp = comp; this.out = trim;
    this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);
    // big stone hall reverb
    this.rev = ctx.createConvolver(); this.rev.buffer = this._impulse(6.5, 2.2);
    const revGain = ctx.createGain(); revGain.gain.value = 0.9;
    this.rev.connect(revGain); revGain.connect(this.master);
    this.dry = ctx.createGain(); this.dry.connect(this.master);
    this.wet = ctx.createGain(); this.wet.connect(this.rev);
    this.noiseBuf = this._noise(NOISE_SEC);
    this._drone(); this._wind(); this._fires = [];
    this._schedule(() => this._drip(), 3, 9, 0.3);          // last number: how much sooner they come as the tension rises
    this._schedule(() => this._rumble(), 18, 45, 0.5);
    this._schedule(() => this._presence(), 40, 95, 0.5);
    this._schedule(() => this._crackle(), 0.05, 0.4);
    setTimeout(() => this._pieceBufs(), 400);          // the piece sounds' three small buffers, made once, off the first frame
  }

  setMuted(m) { this.muted = m; if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1); }

  _noise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _impulse(sec, decay) {
    const sr = this.ctx.sampleRate, n = sr * sec, b = this.ctx.createBuffer(2, n, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const k = 0.25 + 0.7 * Math.pow(1 - t, 2);                 // highs die first
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.02 ? i / (sr * 0.02) : 1);
      }
      for (let e = 0; e < 14; e++) {                               // a few early reflections
        const i = Math.floor(sr * (0.02 + Math.random() * 0.22));
        d[i] += (Math.random() * 2 - 1) * 0.6;
      }
    }
    return b;
  }
  // every repeating thing waits a random time, never a fixed one
  _schedule(fn, min, max, tense = 0) {
    const wait = () => (min + Math.random() * (max - min)) * (1 - tense * Math.min(1, this.tension)) * 1000;
    const go = () => { if (this.ctx.state === 'running' && !document.hidden) { try { fn(); } catch (e) { console.warn(e); } } setTimeout(go, wait()); };
    setTimeout(go, wait());
  }
  // a slow random wander for a gain or a frequency (noise played very slowly), in place of a sine that would come round again
  _wobble(param, depth, hz = 4) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = 2 * hz / this.ctx.sampleRate;
    const g = this.ctx.createGain(); g.gain.value = depth; s.connect(g); g.connect(param); s.start(0, Math.random() * (NOISE_SEC - 1));      // no filter: one that low drifts
  }
  _panner(pos, ref = 4, roll = 1) {
    const p = this.ctx.createPanner(); p.panningModel = document.documentElement.classList.contains('touch') ? 'equalpower' : 'HRTF';      // phones: the cheap panner p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 80;
    if (pos) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; }
    return p;
  }
  // route a node to the room: dry + reverb send, optionally positioned
  _out(node, pos, wet = 0.5, ref = 4) {
    let n = node;
    if (pos) { const p = this._panner(pos, ref); node.connect(p); n = p; }
    n.connect(this.dry);
    const w = this.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.wet);
  }
  // noise. Each looping bed gets its own stretch of the buffer, 11 to 21 s long, so no two beds share a period and none is short enough to hear come round
  _src(dur, loop = false) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop;
    if (loop) { s.loopStart = Math.random() * 2.5; s.loopEnd = s.loopStart + 11 + Math.random() * 10; }
    const st = s.start.bind(s); s.start = (when = 0, off) => st(when, off !== undefined ? off : loop ? s.loopStart + Math.random() * 8 : Math.random() * (NOISE_SEC - 8));
    return s;
  }
  _env(g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }

  setListener(p, f) {
    if (!this.ctx) return;
    this._lp = { x: p.x, y: p.y, z: p.z };
    try { this._piecesFrame(); } catch (e) { if (!this._pfErr) { this._pfErr = 1; console.warn('piece sounds', e); } }      // called every frame: the pieces are listened to from here
    const l = this.ctx.listener, t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.05); l.positionY.setTargetAtTime(p.y, t, 0.05); l.positionZ.setTargetAtTime(p.z, t, 0.05);
      l.forwardX.setTargetAtTime(f.x, t, 0.05); l.forwardY.setTargetAtTime(f.y, t, 0.05); l.forwardZ.setTargetAtTime(f.z, t, 0.05);
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
  }

  // ---------------------------------------------------------------- beds
  _drone() {
    const ctx = this.ctx, t = ctx.currentTime;
    const bus = ctx.createGain(); bus.gain.value = 0.0; bus.gain.linearRampToValueAtTime(DRONE, t + 8);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.Q.value = 0.4;
    lp.connect(bus); bus.connect(this.dry); const w = ctx.createGain(); w.gain.value = 0.5; bus.connect(w); w.connect(this.wet); this.droneLp = lp;
    for (const [f, g, type] of [[36.71, 0.5, 'sine'], [36.95, 0.35, 'sine'], [55.0, 0.22, 'triangle'], [73.6, 0.10, 'sawtooth'], [110.3, 0.04, 'sawtooth']]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const gg = ctx.createGain(); gg.gain.value = g;
      this._wobble(gg.gain, g * 0.55, 0.04 + Math.random() * 0.06);      // each partial swells and sinks on its own, at random (was a sine: it came round every 12 to 50 s)
      this._wobble(o.frequency, f * 0.004, 0.05);          // the beating between them drifts instead of throbbing at one fixed rate
      o.connect(gg); gg.connect(lp); o.start();
    }
    // the dissonance that comes up with tension (check)
    this.tenseGain = ctx.createGain(); this.tenseGain.gain.value = 0;
    for (const f of [38.9, 51.9, 77.8, 103.8]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0.16; o.connect(g); g.connect(this.tenseGain); o.start(); }
    const tl = ctx.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 260; this.tenseGain.connect(tl); tl.connect(this.dry); tl.connect(this.wet);
    // room air
    const n = this._src(0, true); const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 220;
    const ng = ctx.createGain(); ng.gain.value = 0.05; n.connect(bp); bp.connect(ng); ng.connect(this.dry); n.start();
    // a thin ringing in the air that only exists under tension: three narrow bands of noise, a little out of tune with each other
    this.ringGain = ctx.createGain(); this.ringGain.gain.value = 0; this._out(this.ringGain, null, 1.2);
    for (const f of [2637, 2794, 3520]) { const r = this._src(0, true); const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f; b1.Q.value = 60;
      const rg = ctx.createGain(); rg.gain.value = 0.5; this._wobble(rg.gain, 0.6, 0.4); r.connect(b1); b1.connect(rg); rg.connect(this.ringGain); r.start(); }
  }
  // 0 = at rest. 0.35 to 0.75 through the last quarter of the sand. 1 = the king is in check.
  // More of the dissonant layer, the drone opens up (more of its harmonics), the ringing comes in, and rumbles, drips and presences come sooner.
  setTension(v) {
    this.tension = v; if (!this.ctx) return; const t = this.ctx.currentTime;
    this.tenseGain.gain.setTargetAtTime(v * 0.55, t, 1.5); this.droneLp.frequency.setTargetAtTime(170 + 240 * v, t, 2.5); this.ringGain.gain.setTargetAtTime(0.09 * v * v, t, 2.5);
  }

  _wind() {
    const ctx = this.ctx;
    this.windGains = [];
    for (const pos of [[0, 13, 0], [0, 16, -23]]) {
      const n = this._src(0, true); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.6;
      const g = ctx.createGain(); g.gain.value = 0.05;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05; const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
      const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.031 + Math.random() * 0.03; const lg2 = ctx.createGain(); lg2.gain.value = 0.025; lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start();
      this._wobble(g.gain, 0.03, 0.5); this._wobble(bp.frequency, 120, 0.3);          // gusts that never repeat
      n.connect(bp); bp.connect(g); this._out(g, pos, 0.8, 6); n.start(); this.windGains.push(g);
    }
  }
  setFires(list) {       // [[x,y,z],...] steady low fire roar at each brazier
    if (!this.ctx) return; this.firePos = list;
    for (const pos of list) {
      const n = this._src(0, true); const lp = this.ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 260; lp.Q.value = 0.5;
      const g = this.ctx.createGain(); g.gain.value = 0.10;
      this._wobble(g.gain, 0.09, 5 + Math.random() * 3);                              // the flame flutters at random, not at a fixed rate
      n.connect(lp); lp.connect(g); this._out(g, pos, 0.25, 1.6); n.start();
    }
  }
  _crackle() {
    if (!this.firePos || !this.firePos.length) return;
    const ctx = this.ctx, t = ctx.currentTime, pos = this.firePos[Math.floor(Math.random() * this.firePos.length)];
    const n = this._src(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 4000; bp.Q.value = 2;
    const g = ctx.createGain(); this._env(g, t, 0.002, 0.12 + Math.random() * 0.25, 0.02 + Math.random() * 0.05);
    n.connect(bp); bp.connect(g); this._out(g, pos, 0.2, 1.4); n.start(t); n.stop(t + 0.2);
  }
  _drip() {
    const ctx = this.ctx, t = ctx.currentTime;
    const site = Math.floor(Math.random() * 4), p0 = [[-17, 0.2, 2.5], [11, 0.2, 15], [-11.5, 0.2, -7], [0, 1, 21]][site];
    const pos = [p0[0] + (Math.random() - 0.5) * 1.2, p0[1], p0[2] + (Math.random() - 0.5) * 1.2];
    const k = Math.random() < 0.3 ? 2 : Math.random() < 0.08 ? 3 : 1;
    for (let i = 0; i < k; i++) {
      const tt = t + i * (0.18 + Math.random() * 0.1);
      const o = ctx.createOscillator(); const f = (800 + site * 170) * (0.8 + Math.random() * 0.5);      // each place has its own pitch, roughly
      o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f * 1.9, tt + 0.045);
      const g = ctx.createGain(); this._env(g, tt, 0.003, 0.22, 0.07);
      o.connect(g); this._out(g, pos, 1.2, 3); o.start(tt); o.stop(tt + 0.2);
    }
  }
  _rumble() {
    const ctx = this.ctx, t = ctx.currentTime;
    const a = Math.random() * 6.28, pos = [Math.cos(a) * 22, 6 + Math.random() * 8, Math.sin(a) * 22];
    const scrape = Math.random() < 0.3;
    const n = this._src(); const f = ctx.createBiquadFilter();
    const g = ctx.createGain(); const dur = scrape ? 1.6 + Math.random() : 3 + Math.random() * 3;
    if (scrape) { f.type = 'bandpass'; f.frequency.value = 240 + Math.random() * 160; f.Q.value = 3;
      const am = ctx.createOscillator(); am.frequency.value = 14 + Math.random() * 10; const ag = ctx.createGain(); ag.gain.value = 0.5; am.connect(ag); ag.connect(g.gain); am.start(t); am.stop(t + dur + 0.5);
    } else { f.type = 'lowpass'; f.frequency.value = 70 + Math.random() * 40; }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(scrape ? 0.25 : 0.9, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); this._out(g, pos, 1.0, 9); n.start(t); n.stop(t + dur + 0.1);
    if (!scrape && Math.random() < 0.6) { for (let i = 0; i < 3; i++) this._clack([pos[0] * 0.7, 0.2, pos[2] * 0.7], 0.12, t + dur * 0.5 + Math.random() * 1.5, 500); }   // grit falling
  }
  _presence() {
    const ctx = this.ctx, t = ctx.currentTime, r = Math.random();
    if (r < 0.45) this.chant(0.16, 7 + Math.random() * 4, [[0, 3, -22], [-17, 2, 0], [0, 4, 22]][Math.floor(Math.random() * 3)]);
    else if (r < 0.75) {                    // a breath of air past the ear
      const n = this._src(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + 1.5);
      const p = ctx.createStereoPanner(); const side = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-side * 0.9, t); p.pan.linearRampToValueAtTime(side * 0.9, t + 1.4);
      n.connect(bp); bp.connect(g); g.connect(p); p.connect(this.dry); n.start(t); n.stop(t + 1.6);
    } else this._rumble();
  }
  chant(vol = 0.16, dur = 8, pos = [0, 3, -22], freq = 73.42) {
    const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(vol, t + dur * 0.4); out.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const det of [0, 0.004, -0.006]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq * (1 + det);
      const vib = ctx.createOscillator(); vib.frequency.value = 4.3 + Math.random(); const vg = ctx.createGain(); vg.gain.value = 0.5; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur);
      for (const [ff, q, gg] of [[420, 6, 1.0], [800, 8, 0.35], [2400, 9, 0.06]]) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; const g = ctx.createGain(); g.gain.value = gg;
        o.connect(bp); bp.connect(g); g.connect(out);
      }
      o.start(t); o.stop(t + dur + 0.1);
    }
    this._out(out, pos, 1.5, 8);
  }

  sandHiss(pos) {
    const n = this._src(0, true); const hp = this.ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 5200; hp.Q.value = 0.7;
    const g = this.ctx.createGain(); g.gain.value = 0.11; n.connect(hp); hp.connect(g);
    const p = this._panner(pos, 0.9, 2.2); g.connect(p); p.connect(this.dry); n.start(); this.sandGain = g;
  }
  nearVoid(k) {             // at an opening: colder, larger air, and now and then something falling a long way off
    if (!this.ctx) return;
    if (!this.voidGain) { const n = this._src(0, true); const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 210; bp.Q.value = 0.9; this.voidGain = this.ctx.createGain(); this.voidGain.gain.value = 0;
      n.connect(bp); bp.connect(this.voidGain); this.voidGain.connect(this.dry); const w = this.ctx.createGain(); w.gain.value = 2.2; this.voidGain.connect(w); w.connect(this.wet); n.start(); this._vk = 0; }
    this.voidGain.gain.setTargetAtTime(k * 0.3, this.ctx.currentTime, 0.4);
    if (k > 0.5 && this._vk <= 0.5) setTimeout(() => { this.thud([0, -40, 60], 0.5); }, 2500 + Math.random() * 3000);
    this._vk = k;
  }
  loopAir(inside) {        // in the passage the hall falls away: thinner drone, more draught
    if (this._in === inside) return; this._in = inside; const t = this.ctx.currentTime;
    this.dry.gain.setTargetAtTime(inside ? 0.55 : 1, t, 1.5); this.windGains.forEach(w => w.gain.setTargetAtTime(inside ? 0.2 : 0.05, t, 1.5));
  }
  // ---------------------------------------------------------------- events
  footstep(surface, vol = 1) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const marble = surface === 'marble';
    const n = this._src(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = (marble ? 1700 : surface === 'stair' ? 800 : 480) * (0.85 + Math.random() * 0.3); bp.Q.value = marble ? 1.4 : 0.8;
    const g = ctx.createGain(); this._env(g, t, 0.003, (marble ? 0.16 : 0.2) * vol, marble ? 0.05 : 0.09);
    n.connect(bp); bp.connect(g); g.connect(this.dry); const w = ctx.createGain(); w.gain.value = marble ? 0.9 : 0.5; g.connect(w); w.connect(this.wet);
    n.start(t); n.stop(t + 0.25);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(marble ? 130 : 95, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.07);
    const og = ctx.createGain(); this._env(og, t, 0.002, 0.16 * vol, 0.07); o.connect(og); og.connect(this.dry); o.start(t); o.stop(t + 0.2);
  }
  _clack(pos, vol = 0.4, when = null, freq = 1300) {
    const ctx = this.ctx, t = when || ctx.currentTime;
    const n = this._src(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * (0.7 + Math.random() * 0.6); bp.Q.value = 2.5;
    const g = ctx.createGain(); this._env(g, t, 0.001, vol, 0.05);
    n.connect(bp); bp.connect(g); this._out(g, pos, 0.8, 3); n.start(t); n.stop(t + 0.2);
  }
  clack(pos, vol = 0.2) { if (this.ctx) this._stoneHit(pos, { kind: 'chip', amp: Math.min(vol, 0.5), hard: clamp(vol * 2.5), size: 0 }); }      // a fragment of a shattered piece striking the floor or another stone
  thud(pos, strength = 1, piece) {          // a heavy stone set down. The game's piece calls all come at y = 0.2 (or pass the piece): those go to the stone model below
    if (!this.ctx) return; if (piece || (pos && pos[1] === 0.2)) return this._pieceThud(pos, strength, piece);
    const ctx = this.ctx, t = ctx.currentTime, s = Math.min(strength, 2);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(64, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.3);
    const g = ctx.createGain(); this._env(g, t, 0.004, 0.9 * s, 0.4); o.connect(g); this._out(g, pos, 0.7, 5); o.start(t); o.stop(t + 0.6);
    const n = this._src(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const ng = ctx.createGain(); this._env(ng, t, 0.002, 0.5 * s, 0.12); n.connect(lp); lp.connect(ng); this._out(ng, pos, 0.9, 5); n.start(t); n.stop(t + 0.3);
    this._clack(pos, 0.3 * s, t, 1100);
  }
  scrape(pos, dur = 0.5, vol = 0.2, piece) {     // a piece taken up off the marble: the player's grab (vol 0.25), or a lighter one as a piece is shuffled onto its square (0.12)
    if (!this.ctx) return; this._pieceBufs(); const s = this._pstate(piece, pos); this._lift(pos, { size: s ? s.size : 0.5, tune: s ? s.tune : 1, light: vol < 0.2 }); this._plog(vol < 0.2 ? 'nudge' : 'lift', s);
  }
  unseenLift(pos, dur = 1.6, piece) {            // the other hand takes hold. For a black piece: the tell first (unless unseenCue('tell') already gave it), then the lift and the rising tone
    if (!this.ctx) return; this._pieceBufs(); const now = this.ctx.currentTime, s = this._pstate(piece, pos), key = s || this;
    if (now - (key._liftT || -9) < 1.2) return; key._liftT = now;                           // unseenCue('lift') has just done this
    const told = now - (key._tellT || -9) < 4, black = !s || s.p.color !== 'w', lead = told || !black ? 0 : 0.3;
    if (lead) { key._tellT = now; this._tell(pos, { lead, sharp: !!(piece && piece.tw && piece.tw.victim), s }); }
    this._unseenRise(pos, dur, s, now + lead);
  }
  // The other hand's move, phase by phase, for the game to call: 'tell' (just before it lifts), 'lift', 'travel', 'land'. Every argument but the phase may be missing.
  // o (the game sends { from, to, dur, tell, capture }): capture (or sharp) true for a capture's sharper tell, tell = seconds from the tell to the lift, dur of the whole move, strength of the landing.
  // Safe to call alongside unseenLift() and thud(): whichever comes first plays, the other is dropped.
  unseenCue(phase, pos, piece, o) {
    if (!this.ctx) return;
    try { this._pieceBufs(); const now = this.ctx.currentTime; o = o === true ? { sharp: true } : o || {};
      if (pos && pos.x !== undefined) pos = [pos.x, pos.y === undefined ? 0.6 : pos.y, pos.z];
      if (!pos && piece && piece.body) { const t = piece.body.translation(); pos = [t.x, 0.6, t.z]; }
      if (!pos) pos = this._lp ? [this._lp.x, 0.6, this._lp.z - 4] : [0, 0.6, 0];
      const s = this._pstate(piece, pos), key = s || this, sharp = !!(o.sharp || o.capture || (piece && piece.tw && piece.tw.victim));
      if (phase === 'tell') { if (now - (key._tellT || -9) < 1.5) return; key._tellT = now; this._tell(pos, { lead: o.tell || o.lead || 0.45, sharp, s }); }
      else if (phase === 'lift') { if (now - (key._liftT || -9) < 1.2) return; key._liftT = now; this._unseenRise(pos, Math.min((o.dur || 2) * 0.8, 2.2), s, now); }
      else if (phase === 'travel') { if (!s) this._glideOnce(pos, o.dur || 1.6); }          // a tracked piece's glide follows the physics by itself
      else if (phase === 'land') { if (s) { if (now - s.hitT > 0.3) this._pieceThud(pos, o.strength || 0.5 + Math.pow(s.p.h || 1, 3) * 0.35, s.p, true); }
        else if (now - (this._landT || -9) > 0.3) { this._landT = now; this._stoneHit(pos, { kind: 'floor', amp: 0.6 * UNSEEN_VOL, hard: 0.35, wet: 0.9, free: true }); } }
    } catch (e) { if (!this._ucErr) { this._ucErr = 1; console.warn('unseenCue', e); } }
  }
  // the tell: something draws breath before the stone moves. An intake of air that stops dead as the piece lifts, a low swell, a faint glassy ring.
  // Never the same twice (pitch, length and balance wander), sharper and quicker before a capture.
  _tell(pos, o = {}) {
    const ctx = this.ctx, t = ctx.currentTime, sharp = !!o.sharp, D = Math.max(0.2, o.lead || 0.45), z = o.s ? o.s.size : 0.5, lite = this._touch;
    const bus = ctx.createGain(); bus.gain.value = PIECE_VOL * UNSEEN_VOL * TELL_VOL * (sharp ? 1.25 : 1); this._pout(bus, pos, 0.9);
    // the intake: a band of air that climbs and swells, then is cut off
    { const n = this._src(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = sharp ? 3.2 : 2.4;
      const f0 = R(420, 560) * (sharp ? 1.5 : 1); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f0 * (sharp ? 3.6 : 2.7) * R(0.9, 1.1), t + D);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(R(0.8, 1.1), t + D); g.gain.setTargetAtTime(0.0001, t + D, 0.012);
      n.connect(bp); bp.connect(g); g.connect(bus); n.start(t); n.stop(t + D + 0.2); }
    // the swell: two low notes a hair apart, so it beats once or twice as it comes up
    { const f = R(98, 118) * (1.1 - 0.2 * z), g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + D); g.gain.setTargetAtTime(0.0001, t + D + 0.02, 0.14); g.connect(bus);
      for (const [m, lv] of [[1, 1], [1.013, 0.9], [2.006, 0.5], [3.01, 0.22]]) { const os = ctx.createOscillator(), og = ctx.createGain(); os.frequency.setValueAtTime(f * m, t); os.frequency.linearRampToValueAtTime(f * m * (sharp ? 1.12 : 1.04), t + D); og.gain.value = lv; os.connect(og); og.connect(g); os.start(t); os.stop(t + D + 1); } }
    // the ring: thin, cold, not in tune with itself. It comes in slowly (at once before a capture) and outlasts the lift
    { const f = R(1650, 2350) * (sharp ? 1.3 : 1), a = sharp ? 0.012 : D * R(0.5, 0.8), dec = R(0.5, 0.8) * (sharp ? 0.7 : 1);
      for (const [m, lv] of (lite ? [[1, 1], [1.483, 0.6]] : [[1, 1], [1.004, 0.7], [1.483, 0.6], [2.09, 0.35], [2.68, 0.18]])) { const os = ctx.createOscillator(), og = ctx.createGain(); os.frequency.value = f * m * R(0.997, 1.003);
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(lv * (sharp ? 0.085 : 0.06), t + a); og.gain.setTargetAtTime(0.0001, t + Math.max(a, D * 0.8), dec / 2.3); os.connect(og); og.connect(bus); os.start(t); os.stop(t + D + dec * 2.5); } }
    this._plog(sharp ? 'tell-sharp' : 'tell', o.s);
  }
  // the lift by the other hand and the tone that rises under it, starting at ctx time t
  _unseenRise(pos, dur, s, t) {
    const ctx = this.ctx; this._lift(pos, { size: s ? s.size : 0.5, tune: s ? s.tune : 1, unseen: true, when: t }); this._plog('lift-unseen', s); if (!s) this._glideOnce(pos, dur / 0.8);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(UNSEEN_TONE * UNSEEN_VOL * PIECE_VOL, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
    // (the two lowest are the old tone, at half; the rest carry it on speakers that have no bass)
    for (const [f, d] of [[41, 0.5], [41.7, 0.5], [82.5, 0.3], [123.4, 0.22], [164.3, 0.2], [165.6, 0.14], [247.4, 0.1], [330.5, 0.04]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
      const og = ctx.createGain(); og.gain.value = d; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.6);
    }
    const n = this._src(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(200, t); bp.frequency.exponentialRampToValueAtTime(700, t + dur); bp.Q.value = 4;
    const ng = ctx.createGain(); ng.gain.value = 0.36; n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t); n.stop(t + dur + 0.6);
    this._pout(g, pos, 1.0);
  }
  refuse(pos) {                           // an illegal move is taken back
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const g = ctx.createGain(); this._env(g, t, 0.05, 0.4, 1.2);
    for (const f of [58, 61.5]) { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 1.5); }
    this._out(g, pos, 1.0, 6);
  }
  shatter(pos, closeness = 1) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.04;
    this._stoneHit(pos, { kind: 'strike', amp: 0.45, hard: 1, size: 0.75, wet: 0.9, free: true }); this._plog('strike');          // the blow itself, 40 ms before the piece gives way
    const n = this._src(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const g = ctx.createGain(); this._env(g, t, 0.001, 1.0, 0.16); n.connect(hp); hp.connect(g); this._out(g, pos, 1.0, 6); n.start(t); n.stop(t + 0.4);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(82, t); o.frequency.exponentialRampToValueAtTime(27, t + 1.1);
    const og = ctx.createGain(); this._env(og, t, 0.006, 1.2, 1.5); o.connect(og); this._out(og, pos, 0.8, 8); o.start(t); o.stop(t + 1.8);
    const n2 = this._src(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(90, t + 1.2);
    const g2 = ctx.createGain(); this._env(g2, t, 0.004, 0.8, 1.3); n2.connect(lp); lp.connect(g2); this._out(g2, pos, 1.0, 8); n2.start(t); n2.stop(t + 1.6);
    for (let i = 0; i < 9; i++) this._clack([pos[0] + (Math.random() - 0.5) * 5, 0.1, pos[2] + (Math.random() - 0.5) * 5], 0.1 + Math.random() * 0.25, t + 0.25 + Math.random() * 1.4, 700 + Math.random() * 900);
  }
  bell(vol = 0.5, base = 98, dur = 7, pos = [0, 6, -10]) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = vol;
    for (const [m, a, d] of [[1, 1, 1], [2.0, 0.6, 0.8], [2.76, 0.45, 0.55], [5.4, 0.25, 0.3], [8.9, 0.12, 0.15], [0.5, 0.7, 1.2]]) {
      const o = ctx.createOscillator(); o.frequency.value = base * m * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain(); this._env(g, t, 0.005, a * 0.3, dur * d); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur * d + 0.2);
    }
    this._out(out, pos, 1.4, 10);
  }
  check() { this.bell(0.5, 87.3, 6); this.setTension(1); }
  checkmate() {
    if (!this.ctx) return;
    this.bell(0.9, 55, 11); setTimeout(() => this.bell(0.6, 51.9, 12), 1400);
    this.chant(0.3, 12, [0, 4, -22], 55); this.chant(0.2, 12, [0, 4, -22], 82.4);
    const ctx = this.ctx, t = ctx.currentTime; const o = ctx.createOscillator(); o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(24, t + 5);
    const g = ctx.createGain(); this._env(g, t, 0.4, 0.9, 6); o.connect(g); g.connect(this.dry); o.start(t); o.stop(t + 7);
  }
  grind(pos, dur = 7) {                   // the door: stone on stone, long
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime;
    const n = this._src(0, true); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 150; bp.Q.value = 1.0;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.6); g.gain.setValueAtTime(0.9, t + dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const am = ctx.createOscillator(); am.type = 'sawtooth'; am.frequency.value = 9; const ag = ctx.createGain(); ag.gain.value = 0.5; am.connect(ag); ag.connect(g.gain); am.start(t); am.stop(t + dur);
    n.connect(bp); bp.connect(g); this._out(g, pos, 1.2, 12); n.start(t); n.stop(t + dur + 0.1);
    const o = ctx.createOscillator(); o.frequency.value = 31; const og = ctx.createGain(); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.6, t + 1); og.gain.linearRampToValueAtTime(0.0001, t + dur + 1);
    o.connect(og); og.connect(this.dry); o.start(t); o.stop(t + dur + 1.2);
    setTimeout(() => { this.thud(pos, 2); this.windGains.forEach(w => w.gain.setTargetAtTime(0.16, ctx.currentTime, 3)); this.setTension(0); }, dur * 1000);
  }

  // ================================================================ the pieces: heavy stone on polished marble
  // Every piece sound is built from the same few layers: a sharp click, a few short modes of the stone itself (lower for a king than a pawn),
  // a low thump through the floor, and grains of grit. The game's calls (thud, scrape, clack, unseenLift, shatter) are routed here, and the
  // continuous sounds (slide, roll, graze, the weight in the hands, the unseen glide) come from _piecesFrame(), which reads the physics once a frame.
  // Knobs: PIECE_VOL (all of it) and SLIDE_VOL (the continuous ones) at the top of this file. Set audio.plog = [] to get a log of what fired.
  trackPieces(game) { this._game = game; }
  // The pieces' own road to the room: the panner only places the sound (its distance fall-off is switched off), the level follows PIECE_NEAR / PIECE_FAR.
  // The hall (reverb) send is not turned down with distance, so a far piece is more hall and less stone, as it would be.
  _pgain(pos) { const l = this._lp; if (!l || !pos) return 1; const d = Math.hypot(pos[0] - l.x, pos[1] - l.y, pos[2] - l.z); return d <= PIECE_NEAR ? 1 : Math.pow(PIECE_NEAR / d, PIECE_FAR); }
  _ppan(pos) { const p = this.ctx.createPanner(); p.panningModel = document.documentElement.classList.contains('touch') ? 'equalpower' : 'HRTF'; p.distanceModel = 'inverse'; p.rolloffFactor = 0;
    if (pos) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; } return p; }
  _pout(node, pos, wet = 0.6) { const ctx = this.ctx, d = ctx.createGain(), p = this._ppan(pos), w = ctx.createGain(); d.gain.value = this._pgain(pos); w.gain.value = wet;
    node.connect(d); d.connect(p); p.connect(this.dry); node.connect(w); w.connect(this.wet); }           // optional: without it the game is found at window.__g.game
  // Optional, for real contact events from the physics (Rapier contact-force events). p: the piece. other: the other piece, 'rubble', or anything else for the floor.
  // dv: the change of speed the contact caused, in m/s (total force magnitude x timestep / the piece's mass). Once this is called, the tracker stops guessing small knocks itself.
  pieceContact(p, other, dv) {
    this._contacts = true; const s = this._pst && this._pst.get(p); if (!this.ctx || !s || !(dv > 0.08) || this.ctx.currentTime - s.hitT < 0.07) return;
    this._pieceHit(s, other && other.body ? 'piece' : other === 'rubble' ? 'chip' : s.lying || s.tilt < 0.03 ? 'floor' : 'rock', clamp(dv * 0.35, 0.03, 1.3), clamp(dv * 0.5));
  }
  _plog(what, s, amp) { if (this.plog) this.plog.push([+this.ctx.currentTime.toFixed(3), what, s && s.p ? s.p.type + (s.p.color || '') : '', amp === undefined ? '' : +amp.toFixed(3)]); }
  _pieceBufs() {
    if (this.gritBuf || !this.ctx) return; const ctx = this.ctx, sr = ctx.sampleRate;
    this._touch = document.documentElement.classList.contains('touch'); this._mvN = 0; this._mvMax = this._touch ? 2 : 5;
    const make = (sec, fill) => { const b = ctx.createBuffer(1, Math.floor(sr * sec * (this._touch ? 0.5 : 1)), sr), d = b.getChannelData(0), n = d.length; fill(d, n);
      let e = 0; for (let i = 0; i < n; i++) e += d[i] * d[i]; const k = 0.2 / Math.sqrt(e / n || 1), f = Math.floor(sr * 0.004);
      for (let i = 0; i < n; i++) d[i] = 0.45 * Math.tanh(d[i] * k / 0.45) * Math.min(1, i / f, (n - 1 - i) / f); return b; };      // level it, and keep the rare big grain from being a spike
    // (phones get half the length: half the work on the first frame after Enter, about 60 ms on a desktop for the full set)
    const gap = (rate) => Math.floor(-Math.log(1 - Math.random()) * sr / rate) + 1;
    // grit: stone dragged on stone is not a hiss but thousands of small catches. Short noise grains at random times, a few of them much larger than the rest,
    // under a slow uneven envelope (the stick and slip). Played faster or slower with the slide speed.
    this.gritBuf = make(6, (d, n) => { const env = new Float32Array(n); let e = 0.5, et = 0.5; const hop = Math.floor(sr / 9);
      for (let j = 0; j < n; j++) { if (j % hop === 0) et = Math.pow(Math.random(), 1.6); e += (et - e) * (30 / sr); env[j] = 0.4 + 0.8 * e; }
      for (let i = 0; i < n; i += gap(300)) { const len = Math.floor(sr * (0.0004 + Math.pow(Math.random(), 2) * 0.006)), a = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? -1 : 1), dec = len / 3;
        for (let j = 0; j < len && i + j < n; j++) d[i + j] += a * (Math.random() * 2 - 1) * Math.exp(-j / dec) * env[i]; }
      for (let j = 0; j < n; j++) d[j] += (Math.random() * 2 - 1) * 0.02 * env[j]; });
    // crunch: rubble and grit under a moving piece. Fewer, larger grains, each a tiny stone ringing for a few milliseconds, in clusters.
    this.crunchBuf = make(6, (d, n) => { let dense = false;
      for (let i = 0; i < n; i += gap(dense ? 170 : 26)) { if (Math.random() < 0.12) dense = !dense;
        const w = 6.283 * 700 * Math.pow(8, Math.random()) / sr, tau = sr * (0.0008 + Math.random() * 0.004), a = Math.pow(Math.random(), 2.2), len = Math.floor(tau * 6), ph = Math.random() * 6.283;
        for (let j = 0; j < len && i + j < n; j++) d[i + j] += a * (Math.sin(w * j + ph) * 0.7 + (Math.random() * 2 - 1) * 0.6) * Math.exp(-j / tau); } });
    // roll: a low rumble with bumps in it, for a piece rolling on its side. Played faster or slower with the angular speed.
    this.rollBuf = make(8, (d, n) => { let a = 0, b = 0; for (let j = 0; j < n; j++) { a += 0.03 * ((Math.random() * 2 - 1) - a); b += 0.2 * (a - b); d[j] = b * 5; }
      for (let i = 0; i < n; i += gap(11)) { const len = Math.floor(sr * (0.003 + Math.random() * 0.009)), am = Math.pow(Math.random(), 2) * 1.5 * (Math.random() < 0.5 ? -1 : 1), cl = Math.floor(sr * 0.0015);
        for (let j = 0; j < len && i + j < n; j++) { const s = Math.sin(Math.PI * j / len); d[i + j] += am * s * s + (j < cl ? am * 0.25 * (Math.random() * 2 - 1) * (1 - j / cl) : 0); } } });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this._pst) for (const s of this._pst.values()) if (s.v) this._mvFree(s); });      // nothing may drone on while the tab is away
  }
  _psize(p) { let m = 0; try { m = p.body.mass(); } catch (e) { } if (!(m > 0)) m = { p: 181, n: 448, b: 410, r: 450, q: 796, k: 965 }[p.type] || 420; return clamp(Math.log(m / 181) / Math.log(965 / 181)); }      // 0 = pawn, 1 = king
  _pstate(piece, pos) {
    const st = this._pst; if (!st) return null; if (piece && st.has(piece)) return st.get(piece);
    let best = null, bd = 0.6; for (const s of st.values()) { const d = Math.hypot(s.x - pos[0], s.z - pos[2]); if (d < bd) { bd = d; best = s; } } return best;
  }
  _ptouch(s, reach = 0.06) {            // the nearest other piece, if it is close enough to be touching (or within reach)
    let best = null, bd = 1e9; for (const o of this._pst.values()) { if (o === s) continue; const d = Math.hypot(o.x - s.x, o.z - s.z) - o.ext - s.ext; if (d < bd) { bd = d; best = o; } }
    s.gap = bd; return best && bd < reach && s.y < best.p.h + 0.05 ? best : null;
  }
  _pgrit(game, s) {       // how much rubble and grit is under and around this piece, 0 to 1
    let g = 0; const x = s.x, z = s.z, r = s.ext;
    for (const w of game.wrecks || []) if (Math.hypot(w.x - x, w.z - z) < r + 0.7) g += 0.3;
    for (const d of game.debris || []) { const t = d.body.translation(); if (t.y < 0.5 && Math.hypot(t.x - x, t.z - z) < r + 0.22) g += 0.3; }
    const ch = game.chips || []; for (let i = 0; i < ch.length; i++) { const t = ch[i].body.translation(); if (Math.hypot(t.x - x, t.z - z) < r + 0.1) g += 0.07; }
    return clamp(g);
  }

  // ---- one frame of listening to the physics
  _piecesFrame() {
    const ctx = this.ctx, game = this._game || (typeof window !== 'undefined' && window.__g && window.__g.game); if (!ctx || !game || !game.pieces) return;
    // (frame time from the wall clock: on real hardware the audio clock moves in steps as long as the sound card's buffer, which can be longer than a frame)
    const now = ctx.currentTime, wall = ctx.baseLatency !== undefined && typeof performance !== 'undefined' ? performance.now() / 1000 : now, dt = wall - (this._pfT === undefined ? wall : this._pfT); this._pfT = wall; if (dt < 0.002) return;
    this._pieceBufs(); const fdt = Math.min(dt, 0.1), st = this._pst || (this._pst = new Map()), N = this._pfN = (this._pfN || 0) + 1;
    for (const p of game.pieces) {
      if (p.dead || !p.body) continue;
      const t = p.body.translation(), q = p.body.rotation(); let s = st.get(p);
      if (!s) st.set(p, s = { p, x: t.x, y: t.y, z: t.z, vx: 0, vy: 0, vz: 0, sp: 0, tilt: 0, n: 0, hitT: -9, twT: -9, twU: false, quiet: 9, armed: false, grit: 0, gritT: 0, lying: false, ext: p.r, size: this._psize(p), tune: R(0.93, 1.07), v: null });
      s.seen = N; s.n++;
      const kin = !!p.tw || !!p.aloft, held = game.held === p; let vx, vy, vz, ws = 0, w = null;
      if (kin) { vx = (t.x - s.x) / dt; vy = (t.y - s.y) / dt; vz = (t.z - s.z) / dt; if (p.tw) { s.twT = now; s.twU = !!p.tw.unseen; } }
      else if (p.body.isSleeping && p.body.isSleeping()) vx = vy = vz = 0;
      else { const v = p.body.linvel(); w = p.body.angvel(); vx = v.x; vy = v.y; vz = v.z; ws = Math.hypot(w.x, w.y, w.z); }
      const tilt = Math.acos(clamp(1 - 2 * (q.x * q.x + q.z * q.z), -1, 1)), lying = tilt > 1.05, hs = Math.hypot(vx, vz);
      s.sp += (Math.min(Math.hypot(vx, vy, vz), 4) - s.sp) * Math.min(1, fdt * 10);
      // is it on the floor, and how fast is the point that touches the floor actually moving across it? (A piece tipping about its rim, or rolling, moves without sliding.)
      let contact, sl = hs;
      if (kin) contact = !!p.tw && !p.tw.unseen && t.y < 0.16;                  // the player's piece being shuffled onto its square: it never really leaves the floor
      else if (!w) contact = true;                                              // asleep
      else { const c = p.body.worldCom(); let rx, ry, rz;
        if (lying) { contact = c.y < p.r * 1.15 + 0.06; rx = 0; ry = -c.y; rz = 0; }
        else { contact = t.y - p.r * Math.sin(tilt) < 0.035; const ux = 2 * (q.x * q.y - q.w * q.z), uy = 1 - 2 * (q.x * q.x + q.z * q.z), uz = 2 * (q.y * q.z + q.w * q.x), dl = Math.hypot(uy * ux, uy * uy - 1, uy * uz);
          const e = dl > 0.03 ? p.r / dl : 0; rx = t.x + uy * ux * e - c.x; ry = t.y + (uy * uy - 1) * e - c.y; rz = t.z + uy * uz * e - c.z; }
        sl = Math.hypot(vx + w.y * rz - w.z * ry, vz + w.x * ry - w.y * rx); }
      // ---- knocks the game does not report (it only calls thud above 0.5 m/s of change)
      if (!kin && s.n > 2) {
        if (!held) {
          const since = now - s.hitT, rim = (s.tilt - tilt) / fdt * p.r;
          if (!lying && contact && s.tilt > 0.02 && tilt <= 0.02 && rim > 0.035 && since > 0.09) this._pieceHit(s, 'rock', clamp(rim * 0.4, 0.03, 0.6), 0.3);            // the base slapping flat as it rocks
          else if (!this._contacts) { const dv = Math.hypot(vx - s.vx, vz - s.vz, Math.max(0, vy - s.vy)) - 9 * fdt;                                          // (9 m/s2: friction alone must not count as a knock)
            if (dv > 0.12 && since > 0.09) { const o = this._ptouch(s); if (contact || o) this._pieceHit(s, o && !lying ? 'piece' : lying ? 'floor' : 'rock', clamp(dv * 0.35, 0.04, 0.5), clamp(dv * 0.6)); } }
          if (Math.hypot(vx, vy, vz) > 0.07 || ws > 0.22) s.quiet = 0;
          else { s.quiet += fdt; if (s.armed && s.quiet > 0.2 && contact) { s.armed = false; this._plog('tick', s);                     // the last small tick as it comes to rest
            this._stoneHit([t.x, 0.1, t.z], { kind: 'tick', amp: R(0.07, 0.12) * (0.7 + 0.5 * s.size), size: s.size, tune: s.tune, free: true }); } }
        } else if (contact && vy - s.vy > 0.12 && s.vy < -0.1 && now - s.hitT > 0.12) this._pieceHit(s, 'floor', clamp((vy - s.vy) * 0.35, 0.05, 0.4), 0.2);      // a carried piece touching down
      }
      // ---- what the continuous voice should be doing
      // (a resting body still jitters at a few cm/s in the solver: a slide has to be faster than that, and last more than a couple of frames, before it is heard)
      s.slT = contact && sl > 0.14 ? (s.slT || 0) + fdt : 0;
      const d = { sc: 0, k: 0, g: 0, rl: 0, wr: 0, pr: 0, gl: 0, pitch: 1, ring: 1 }, k = clamp((sl - 0.1) / 1.6), w8 = 0.65 + 0.5 * s.size, sliding = s.slT > 0.04;
      if (!lying && (kin ? contact && hs > 0.05 : sliding)) { d.k = kin ? clamp(hs / 1.6) : k; d.sc = Math.pow(d.k, 0.6) * w8 * (kin ? 0.5 : 1); }
      if (contact && lying) { d.wr = clamp(ws / 3.5); if (ws > 0.3) d.rl = Math.pow(d.wr, 0.7) * w8; if (sliding) { d.k = k; d.sc = Math.pow(k, 0.6) * 0.5 * w8; } }
      if (held) {            // in the player's hands, off the floor: the weight hums and the grit works with the speed; nearly nothing when the player stands still
        const ck = d.ck = clamp((s.sp - 0.05) / 1.2), acc = Math.hypot(vx - s.vx, vz - s.vz) / fdt; s.acc = (s.acc || 0) + (acc - (s.acc || 0)) * Math.min(1, fdt * 10);
        d.pr = 0.05 + 0.95 * Math.pow(ck, 0.8); d.cg = Math.pow(ck, 1.3);
        // it shifts in the hands when the pace or the direction changes, and creaks now and then as it sways
        if (s.v && s.n > 8 && now - (s.ckT || -9) > 0.32 && ((s.acc > 2.4 && s.sp > 0.1) || Math.random() < fdt * 1.2 * ck)) { s.ckT = now; this._creak(s, clamp(0.3 + 0.5 * ck + s.acc * 0.04, 0.2, 1)); }
        // passing close to another piece: stone on stone, no floor under it. Faint at a hand's width, full when they touch
        if (!contact) { const o = this._ptouch(s, 0.22); if (o) { const rel = Math.hypot(vx - o.vx, vz - o.vz), near = clamp(1 - s.gap / 0.22); if (rel > 0.06) { d.k = clamp(rel / 1.4); d.sc = Math.pow(d.k, 0.6) * 0.32 * (0.3 + 0.7 * near * near); d.pitch = 1.5; d.ring = 2; } } } }      // grazing another piece: stone on stone, no floor under it
      if (kin && (p.aloft || (p.tw && p.tw.unseen))) d.gl = clamp(s.sp / 1.4);
      if (d.sc > 0 || d.rl > 0) { if (N % 5 === 0) s.gritT = this._pgrit(game, s); s.grit += (s.gritT - s.grit) * Math.min(1, fdt * 8); d.g = s.grit; if (!kin && !held && (d.sc > 0.15 || d.rl > 0.15)) s.armed = true; }
      if (!s.v && d.sc + d.rl + d.gl + (held ? 0.01 : 0) > 0.008 && (this._mvN < this._mvMax || held)) this._mvNew(s);
      s.x = t.x; s.y = t.y; s.z = t.z; s.vx = vx; s.vy = vy; s.vz = vz; s.tilt = tilt; s.lying = lying; s.ext = lying ? p.h * 0.55 : p.r;
      if (s.v) this._mvSet(s, d, now, fdt);
    }
    for (const [p, s] of st) if (s.seen !== N) { if (s.v) this._mvFree(s); st.delete(p); }
  }
  _pieceHit(s, kind, a, hard) {
    s.hitT = this.ctx.currentTime; s.armed = true; const amp = a * (0.45 + 0.75 * s.size);
    this._stoneHit([s.x, 0.12, s.z], { kind, amp, hard, size: s.size, tune: s.tune, free: amp > 0.2 }); this._plog(kind, s, amp);
  }
  // the game's thud() for a piece: a tween landing, or any change of speed over 0.5 m/s
  _pieceThud(pos, strength, piece, cue) {
    this._pieceBufs(); const now = this.ctx.currentTime, s = this._pstate(piece, pos); let amp = Math.min(strength, 1.9); if (amp > 0.8) amp = 0.8 + (amp - 0.8) * 0.4;          // the heaviest blows are eased, so a dropped king cannot lean on the limiter
    if (!s) { this._stoneHit(pos, { kind: 'floor', amp, hard: clamp(strength * 0.6), wet: 0.9 }); if (strength > 0.45 && now - (this._setT || -9) > 0.6) { this._setT = now; this._settle(pos, { amp: amp * 0.7, size: 0.5 }); } return; }
    const since = now - s.hitT; if (since < 0.07 || (!cue && now - (s.landT || -9) < 0.4)) return; if (since < 0.3) amp *= 0.7; if (cue) { s.landT = now; s.twU = true; }                    // a pile of small contacts must not machine-gun
    const m = Math.pow(s.p.h, 3), land = !!cue || now - s.twT < 0.15; let kind = 'floor', hard;
    if (land) { hard = s.twU ? 0.4 : 0.3; amp *= s.twU ? 0.8 * UNSEEN_VOL : 0.55; }          // the game gives every landing the same strength; a piece shuffled a hand's width is a gentle one
    else { hard = clamp(strength / (0.5 + m * 0.3) / 1.3); if (!s.lying && s.vy > -0.6 && this._ptouch(s)) kind = 'piece'; }
    s.hitT = now; s.armed = !land;
    this._stoneHit(pos, { kind, amp, hard, size: s.size, tune: s.tune, wet: 0.9, long: s.lying, free: true });
    // a piece shuffled onto its square by the player's side rocks once or twice and ticks. One set down by the other hand does not: it is simply there.
    if (land && !s.twU) this._settle(pos, { amp: amp * 0.7, size: s.size, tune: s.tune, n: Math.random() < 0.6 ? 1 : 2, r: s.p.r });
    this._plog(land ? (s.twU ? 'land-unseen' : 'land') : 'thud-' + kind, s, amp);
  }

  // ---- one stone impact. amp: overall level (the game's "strength", 0 to 1.9). hard: 0 soft and dull to 1 fast and bright. size: 0 pawn to 1 king.
  _stoneHit(pos, o = {}) {
    this._pieceBufs(); const ctx = this.ctx, now = ctx.currentTime, t = Math.max(o.when || 0, now), kind = o.kind || 'floor', K = HIT[kind], lite = this._touch;
    const amp = o.amp === undefined ? 0.6 : o.amp; if (amp < 0.012) return;
    const hl = this._hits || (this._hits = []); while (hl.length && hl[0] < now - 0.15) hl.shift();
    if (!o.free && !o.when && (hl.length >= (lite ? 3 : 6) || (hl.length >= 3 && amp < 0.25))) return;
    if (!o.when) hl.push(now);
    const size = clamp(o.size === undefined ? 0.5 : o.size), hard = clamp(o.hard === undefined ? 0.5 : o.hard), tune = (o.tune || 1) * R(0.965, 1.035), ring = (o.ring || 1) * (o.long ? 1.5 : 1);
    const bus = ctx.createGain(); bus.gain.value = PIECE_VOL * amp; this._pout(bus, pos, o.wet === undefined ? K.wet : o.wet);
    // 1. the click: a few milliseconds of bright noise, brighter the harder the hit
    { const n = this._src(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = (1100 + 2600 * hard) * R(0.85, 1.2) * K.bright; f.Q.value = 0.5;
      this._env(g, t, 0.0006, K.click * (0.6 + 0.6 * hard), R(0.03, 0.05) * (1 + 0.5 * size)); n.connect(f); f.connect(g); g.connect(bus); n.start(t); n.stop(t + 0.14); }
    // 2. the stone itself: a few modes, not in tune with each other, gone in tens of milliseconds
    const f1 = (kind === 'chip' ? R(1500, 3600) : kind === 'tick' ? R(1900, 3000) * (1.2 - 0.4 * size) : (820 - 420 * size) * K.bright) * tune, tau = (0.011 + 0.016 * size) * ring * (kind === 'chip' || kind === 'tick' ? 0.5 : 1);
    for (let i = 0, nm = Math.min(K.modes, lite ? 2 : 4); i < nm; i++) { const osc = ctx.createOscillator(), g = ctx.createGain(), f = f1 * MODES[i] * R(0.97, 1.03), d = tau * Math.pow(0.72, i) * 8;
      osc.frequency.setValueAtTime(f * 1.03, t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.012);
      this._env(g, t, 0.0008, K.mode * MODE_G[i] * (i ? 0.5 + 0.7 * hard : 1), d); osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + d + 0.02); }
    // 3. the weight: a low thump through the floor, lower and longer for a bigger piece
    if (K.thump > 0) { const osc = ctx.createOscillator(), g = ctx.createGain(), f = (84 - 30 * size) * R(0.93, 1.07) * (kind === 'piece' || kind === 'rock' ? 1.5 : 1);
      osc.frequency.setValueAtTime(f, t); osc.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.26);
      this._env(g, t, 0.004, K.thump * PIECE_SUB * (0.75 + 0.35 * size), 0.4 + 0.4 * size); osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.7); }
    // 3b. the knock: the same weight an octave or two up, where a laptop can play it. A short dull "tok", lower for a bigger piece
    if (K.body > 0) { const osc = ctx.createOscillator(), g = ctx.createGain(), f = (300 - 110 * size) * tune * (kind === 'piece' || kind === 'rock' ? 1.35 : 1); osc.type = 'triangle';
      osc.frequency.setValueAtTime(f * 1.3, t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      this._env(g, t, 0.0015, K.body * (0.7 + 0.5 * hard), 0.1 + 0.09 * size); osc.connect(g); g.connect(bus); osc.start(t); osc.stop(t + 0.4); }
    // 4. the dull body of the blow
    if (K.low > 0 && !(lite && amp < 0.3)) { const n = this._src(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = (300 + 350 * hard - 100 * size) * R(0.9, 1.1);
      this._env(g, t, 0.002, K.low * 1.6, (0.3 + 0.2 * size) * (o.long ? 1.5 : 1)); n.connect(f); f.connect(g); g.connect(bus); n.start(t); n.stop(t + 0.4); }
    // 5. grit jumping under a hard set-down
    if ((kind === 'floor' || kind === 'strike') && hard > 0.45 && !lite) for (let i = 0, k = 2 + Math.floor(Math.random() * 3); i < k; i++) this._grain(bus, t + R(0.03, 0.26), R(2200, 6000), R(0.02, 0.07), 0.03);
  }
  _grain(dest, when, f, vol, d = 0.03) {
    const ctx = this.ctx, n = this._src(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 2.2;
    this._env(g, when, 0.0006, vol, d); n.connect(bp); bp.connect(g); g.connect(dest); n.start(when); n.stop(when + d + 0.03);
  }
  // the settle: a piece put down off-level rocks, each knock smaller and sooner than the last, then one small tick
  _settle(pos, o = {}) {
    const now = this.ctx.currentTime, size = o.size === undefined ? 0.5 : o.size, r = o.r || 0.3, n = o.n || (Math.random() < 0.5 ? 2 : 3);
    let gap = R(0.11, 0.17) * (0.8 + 0.5 * size), t = (o.when || now) + gap, a = (o.amp === undefined ? 0.6 : o.amp) * R(0.3, 0.42), side = Math.random() * 6.283;
    for (let i = 0; i < n; i++) { this._stoneHit([pos[0] + Math.cos(side) * r * 0.8, 0.1, pos[2] + Math.sin(side) * r * 0.8], { kind: 'rock', amp: a, hard: R(0.2, 0.4), size, tune: o.tune, when: t });
      side += Math.PI + R(-0.5, 0.5); gap *= R(0.55, 0.7); t += gap; a *= R(0.45, 0.6); }
    this._stoneHit([pos[0], 0.1, pos[2]], { kind: 'tick', amp: R(0.07, 0.12) * (0.7 + 0.5 * size), size, tune: o.tune, when: t + R(0.02, 0.07) });
  }
  // the lift: the base breaks contact with the marble (a short low grind, then the release), the weight is taken up, grit falls from under it
  _lift(pos, o = {}) {
    this._pieceBufs(); const ctx = this.ctx, t = Math.max(ctx.currentTime, o.when || 0), size = o.size === undefined ? 0.5 : o.size, un = !!o.unseen, lite = this._touch;
    const dur = un ? R(0.17, 0.22) : R(0.22, 0.34) * (0.8 + 0.5 * size), k = (o.light ? 0.45 : un ? UNSEEN_VOL : 0.55) * (0.95 + 0.6 * size);
    const bus = ctx.createGain(); bus.gain.value = PIECE_VOL * k; this._pout(bus, pos, 0.6);
    const s = ctx.createBufferSource(); s.buffer = this.gritBuf; s.playbackRate.setValueAtTime(un ? 0.9 : R(0.45, 0.6), t); if (!un) s.playbackRate.linearRampToValueAtTime(R(0.8, 1.1), t + dur);      // it gives, slowly, then goes
    const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(un ? 0.5 : 1, t + dur * (un ? 0.5 : 0.8)); e.gain.setTargetAtTime(0.0001, t + dur, 0.012);
    for (const [f, q, g] of [[R(220, 340) * (1.2 - 0.35 * size), 1.4, 1.5], [R(700, 1100) * (1.2 - 0.3 * size), 1.0, 2.4]]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; s.connect(b); b.connect(gg); gg.connect(e); }
    e.connect(bus); s.start(t, R(0, 5)); s.stop(t + dur + 0.2);
    this._stoneHit([pos[0], 0.1, pos[2]], { kind: 'rock', amp: (un ? 0.1 : 0.16) * k, hard: 0.25, size, tune: o.tune, when: t + dur });                 // the release
    if (!un) {                                                                                                                                 // the strain: only a hand has to take the weight
      const n = ctx.createBufferSource(); n.buffer = this.rollBuf; n.playbackRate.value = R(0.5, 0.7); const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = R(170, 230) * (1.15 - 0.3 * size); b.Q.value = 2.5;
      const g = ctx.createGain(), t0 = t + dur * 0.5; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.22); g.gain.setTargetAtTime(0.0001, t0 + 0.25, 0.16);
      n.connect(b); b.connect(g); g.connect(bus); n.start(t0, R(0, 6)); n.stop(t0 + 1.2); }
    for (let i = 0, c = lite ? 2 : 3 + Math.floor(Math.random() * 5); i < c; i++) { const tt = t + dur + R(0.1, 0.8) * (un ? 1.6 : 1), f = R(2500, 7000), v = R(0.015, 0.05);                 // grit falling back onto the marble
      this._grain(bus, tt, f, v, 0.025); if (Math.random() < 0.4) this._grain(bus, tt + R(0.03, 0.07), f * R(0.9, 1.2), v * 0.5, 0.02); }
  }

  // ---- the continuous voice of one moving piece: scrape, crunch, roll, the weight in the hands, the unseen glide
  _mvNew(s) {
    const ctx = this.ctx, v = s.v = { src: [], idle: 0 }; this._mvN++;
    const G = (x = 0) => { const g = ctx.createGain(); g.gain.value = x; return g; };
    const F = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const L = (buf) => { const b = ctx.createBufferSource(); b.buffer = buf; b.loop = true; b.start(0, Math.random() * (buf.duration - 0.3)); v.src.push(b); return b; };
    const chain = (...n) => { for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i]); };
    v.bus = G(PIECE_VOL); v.dg = G(this._pgain([s.x, 0.15, s.z])); v.pan = this._ppan([s.x, 0.15, s.z]); v.send = G(0.55); chain(v.bus, v.dg, v.pan, this.dry); chain(v.bus, v.send, this.wet);
    const f1 = (820 - 420 * s.size) * s.tune;
    v.grit = L(this.gritBuf); v.hi = F('bandpass', 1200, 0.8); v.gHi = G(); chain(v.grit, v.hi, v.gHi, v.bus);                  // the scrape itself
    v.lo = F('bandpass', 200, 1.4); v.gLo = G(); chain(v.grit, v.lo, v.gLo, v.bus);                                              // the mass behind it
    v.m1 = F('bandpass', f1, 14); v.m2 = F('bandpass', f1 * 2.37, 18); v.gMd = G(); chain(v.grit, v.m1, v.gMd, v.bus); chain(v.grit, v.m2, v.gMd);      // the piece chattering at its own pitch
    v.crunch = L(this.crunchBuf); v.cf = F('highpass', 500, 0.5); v.gCr = G(); chain(v.crunch, v.cf, v.gCr, v.bus);              // rubble under it
    v.roll = L(this.rollBuf); v.rl = F('lowpass', 200, 0.7); v.gRl = G(); chain(v.roll, v.rl, v.gRl, v.bus);                      // rolling on its side
    v.rm = F('bandpass', 700, 1.5); v.gRm = G(); chain(v.roll, v.rm, v.gRm, v.bus);
    v.pr = F('bandpass', 190, 1.1); v.gPr = G(); chain(v.roll, v.pr, v.gPr, v.bus); v.pr2 = F('bandpass', 480, 1.4); v.gPr2 = G(); chain(v.roll, v.pr2, v.gPr2, v.bus);      // the weight, carried
    v.cg = F('bandpass', 1200, 0.9); v.gCg = G(); chain(v.grit, v.cg, v.gCg, v.bus);                                              // the grit working under the hands as it travels
  }
  // a carried piece shifting in the hands: a short dry creak at the stone's own pitch
  _creak(s, a) {
    const v = s.v; if (!v) return; const ctx = this.ctx, t = ctx.currentTime + R(0, 0.02), n = ctx.createBufferSource(), g = ctx.createGain(), dur = R(0.07, 0.16), f1 = (520 - 220 * s.size) * s.tune * R(0.85, 1.2);
    n.buffer = this.gritBuf; n.playbackRate.value = R(0.22, 0.4); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(a * CARRY_VOL, t + dur * 0.4); g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    for (const [f, q, lv] of [[f1, 7, 1.5], [f1 * 2.3, 9, 0.8]]) { const b = ctx.createBiquadFilter(), bg = ctx.createGain(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; bg.gain.value = lv; n.connect(b); b.connect(bg); bg.connect(g); }
    g.connect(v.bus); n.start(t, R(0, 5)); n.stop(t + dur + 0.3); if (Math.random() < 0.35) this._grain(v.bus, t + dur + R(0.02, 0.1), R(2500, 5000), a * 0.08, 0.02); this._plog('creak', s, a);
  }
  _mvGlide(s) {           // the other hand carries it: one narrow band of air and one low note, both perfectly steady
    const ctx = this.ctx, v = s.v; v.air = this._src(0, true); v.gb = ctx.createBiquadFilter(); v.gb.type = 'bandpass'; v.gb.frequency.value = 300; v.gb.Q.value = 9; v.gGl = ctx.createGain(); v.gGl.gain.value = 0;
    v.air.connect(v.gb); v.gb.connect(v.gGl); v.gGl.connect(v.bus); v.air.start(); v.src.push(v.air);
    v.os = ctx.createOscillator(); v.os.frequency.value = (62 - 14 * s.size) * s.tune; v.gOs = ctx.createGain(); v.gOs.gain.value = 0; v.os.connect(v.gOs); v.gOs.connect(v.bus); v.os.start(); v.src.push(v.os);
    // the same note two octaves up, twice, a hair apart: a cold tone that beats slowly and can be heard, and placed, across the hall
    v.gO2 = ctx.createGain(); v.gO2.gain.value = 0; v.gO2.connect(v.bus); for (const m of [4, 4.018, 6.01]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = (62 - 14 * s.size) * s.tune * m; og.gain.value = m > 5 ? 0.35 : 1; o.connect(og); og.connect(v.gO2); o.start(); v.src.push(o); }
  }
  _mvSet(s, d, now, fdt) {
    const v = s.v, z = s.size, T = (p, x, tau = 0.035) => p.setTargetAtTime(x, now, tau);
    T(v.pan.positionX, s.x, 0.03); T(v.pan.positionZ, s.z, 0.03); T(v.dg.gain, this._pgain([s.x, 0.15, s.z]), 0.05); const ck = d.ck || 0, U = UNSEEN_VOL, SV = SLIDE_VOL;
    if (this.plog) { const m = d.sc > 0.05 ? (d.pitch > 1 ? 'graze' : d.g > 0.3 ? 'slide-rubble' : 'slide') : d.rl > 0.05 ? 'roll' : d.gl > 0.05 ? 'glide' : ''; if (m !== (v.was || '')) { this._plog(m ? m + ' starts' : v.was + ' stops', s, d.sc + d.rl + d.gl); v.was = m; } }
    if (d.sc + d.rl + d.gl < 0.004 && d.pr === 0) { v.idle += fdt; if (v.idle > 1.2) { this._mvFree(s); return; } } else v.idle = 0;
    T(v.grit.playbackRate, (0.32 + 1.5 * Math.max(d.k, ck * 0.3)) * (1.12 - 0.3 * z) * d.pitch, 0.05); T(v.hi.frequency, (650 + 2100 * d.k) * (1.25 - 0.45 * z) * d.pitch, 0.05); T(v.lo.frequency, (150 + 150 * d.k) * (1.2 - 0.35 * z) * d.pitch, 0.05);
    T(v.gHi.gain, SV * d.sc * MV.hi * (1 - 0.45 * d.g)); T(v.gLo.gain, SV * d.sc * MV.lo * (d.pitch > 1 ? 0.3 : 1)); T(v.gMd.gain, SV * d.sc * MV.md * d.ring);
    T(v.crunch.playbackRate, 0.5 + 1.1 * Math.max(d.k, d.wr * 0.6), 0.05); T(v.gCr.gain, SV * (d.sc + d.rl * 0.6) * d.g * MV.cr);
    T(v.roll.playbackRate, d.rl > 0 ? 0.35 + 1.6 * d.wr : 0.6 + 0.5 * ck, 0.06); T(v.rl.frequency, 110 + 260 * d.wr, 0.06); T(v.rm.frequency, 500 + 900 * d.wr, 0.06); T(v.gRl.gain, SV * d.rl * MV.rl); T(v.gRm.gain, SV * d.rl * MV.rm);
    { const c = d.rl > 0 ? 0 : d.pr * (0.7 + 0.6 * z) * CARRY_VOL; T(v.pr.frequency, (170 + 80 * ck) * (1.15 - 0.3 * z), 0.1); T(v.pr2.frequency, (420 + 240 * ck) * (1.15 - 0.3 * z), 0.1); T(v.gPr.gain, c * MV.pr, 0.12); T(v.gPr2.gain, c * MV.pr2, 0.12);
      T(v.cg.frequency, (900 + 900 * ck) * (1.2 - 0.35 * z), 0.1); T(v.gCg.gain, (d.cg || 0) * MV.cg * CARRY_VOL, 0.08); }
    if (d.gl > 0.01 && !v.air) this._mvGlide(s);
    if (v.air) { T(v.gb.frequency, 240 + 260 * d.gl, 0.2); T(v.gGl.gain, U * d.gl * MV.gl, 0.18); T(v.gOs.gain, U * Math.min(1, d.gl * 2.5) * MV.os, 0.25); T(v.gO2.gain, U * Math.min(1, d.gl * 2.5) * MV.o2, 0.2); }
    // the chatter: single grains knocked loose, more of them the faster it goes and many more over rubble
    if (d.sc > 0.04 && Math.random() < fdt * (3 + 14 * d.k) * (1 + 2.5 * d.g)) this._grain(v.bus, now + R(0, 0.02), d.g > 0.4 && Math.random() < 0.6 ? R(500, 2400) : R(1800, 5200) * d.pitch, d.sc * Math.pow(Math.random(), 2) * 0.22 + 0.006, R(0.02, 0.04));
    if (d.g > 0.25 && d.sc + d.rl > 0.1 && Math.random() < fdt * 5 * d.g) this._stoneHit([s.x + R(-0.3, 0.3), 0.08, s.z + R(-0.3, 0.3)], { kind: 'chip', amp: (d.sc + d.rl) * R(0.08, 0.25), hard: R(0.3, 0.8), size: 0 });      // a fragment knocked aside
  }
  _mvFree(s) { const v = s.v; if (!v) return; s.v = null; this._mvN--; for (const b of v.src) { try { b.stop(); } catch (e) { } } for (const n of [v.bus, v.dg, v.pan, v.send]) n.disconnect(); }
  // without the physics to follow (nothing tracked): a glide of a fixed length where the lift happened
  _glideOnce(pos, dur) {
    const ctx = this.ctx, t = ctx.currentTime, n = this._src(0, true), b = ctx.createBiquadFilter(), g = ctx.createGain(); b.type = 'bandpass'; b.frequency.value = 380; b.Q.value = 9;
    g.gain.setValueAtTime(0.0001, t + 0.2); g.gain.linearRampToValueAtTime(PIECE_VOL * UNSEEN_VOL * MV.gl * 0.7, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(b); b.connect(g); this._pout(g, pos, 0.55); n.start(t); n.stop(t + dur + 0.1);
  }
}
