// The shared instrument palette. Music and sound effects use the same materials, so the game sounds like
// one family of objects in one garden:
//   felt     felt-hammer piano            glass    struck glass with slow beating (lantern chimes)
//   harp     plucked nylon string         kalimba  metal tine on a wooden box
//   wood     small wooden bar             paper    rustle noise          air     filtered noise sweeps, breath
//   pads     detuned reed/string/glass waves with a breath of noise at the pitch of each note
// Struck and plucked notes are played from rendered physical models (dsp.js); sustained sounds are oscillators.
import { clamp, mtof } from './util.js';
import { ASSET_RATE } from './assets.js';

const ftom = (f) => 69 + 12 * Math.log2(f / 440);
// Loudness trim per instrument, so that equal velocities sound equally loud.
const TRIM = { felt: 1.0, harp: 0.72, kalimba: 0.95, wood: 1.05, glass: 0.9 };

export function createSynth(ctx, rng, assets) {
  // Noise textures (generated in dsp.js). The sources resample them if the context rate differs.
  const buffers = {};
  for (const name of ['white', 'pink', 'pink2', 'rustle']) {
    const data = assets.noise(name);
    buffers[name] = ctx.createBuffer(1, data.length, ASSET_RATE);
    buffers[name].copyToChannel(data, 0);
  }

  const wave = (amps) => ctx.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps));
  const series = (n, fn) => { const a = [0]; for (let k = 1; k <= n; k++) a.push(fn(k)); return a; };
  const WAVES = {
    // bowed/reed-like: a full row of harmonics that falls off smoothly; the pad filter shapes the rest
    strings: wave(series(26, (k) => (k % 2 ? 1 : 0.8) / Math.pow(k, 1.3))),
    // hollow, clarinet-like: odd harmonics lead
    reed: wave(series(22, (k) => (k % 2 ? 1 : 0.28) / Math.pow(k, 1.45))),
    // rubbed glass: almost pure, with a soft octave and twelfth
    glass: wave([0, 1, 0.26, 0.11, 0.05, 0.03, 0.012, 0.008]),
    warm: wave([0, 1, 0.3, 0.2, 0.09, 0.08, 0.035, 0.03, 0.012]),
  };

  const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const filter = (type, f, q = 0.707) => {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b;
  };
  // Old Safari has no StereoPannerNode: fall back to a plain gain (centre).
  const panner = (p) => {
    if (!ctx.createStereoPanner) { const g = gain(1); g.pan = g.gain; return g; }
    const n = ctx.createStereoPanner(); n.pan.value = clamp(p, -1, 1); return n;
  };
  function osc(type, f, t0, t1) {
    const o = ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = f; o.start(t0); if (t1 != null) o.stop(t1); return o;
  }
  function noise(kind, t0, t1, rate = 1) {
    const s = ctx.createBufferSource(); s.buffer = buffers[kind]; s.loop = true; s.playbackRate.value = rate;
    s.start(t0, rng() * (s.buffer.duration - 0.1)); if (t1 != null) s.stop(t1); return s;
  }

  // Envelopes. Every gain starts at 0 and returns to 0, so nothing clicks.
  function perc(param, t, peak, attack, tau) {
    param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + attack); param.setTargetAtTime(0, t + attack, tau);
    return t + attack + tau * 7;
  }
  function swell(param, t, peak, attack, hold, tau) {
    param.setValueAtTime(0, t); param.linearRampToValueAtTime(peak, t + attack); param.setTargetAtTime(0, t + attack + hold, tau);
    return t + attack + hold + tau * 7;
  }
  // Rising "reversed" envelope: slow exponential rise, quick close.
  function reverse(param, t, peak, rise, tau = 0.014) {
    param.setValueAtTime(peak * 0.003, t); param.exponentialRampToValueAtTime(peak, t + rise); param.setTargetAtTime(0, t + rise, tau);
    return t + rise + tau * 7;
  }

  // Voice limiting: a pool fades out its oldest voice when it is full.
  function makePool(max) {
    const live = [];
    return {
      add(v, t) {
        for (let i = live.length - 1; i >= 0; i--) if (live[i].dead) live.splice(i, 1);
        while (live.length >= max) live.shift().kill(t);
        live.push(v);
      },
      get size() { return live.length; },
    };
  }

  // A voice is a level gain (and optional pan) in front of a bus input. Sources connect to v.in.
  function voice(dest, level = 1, pan = 0, pool = null, t = 0) {
    const g = gain(level);
    if (pan && ctx.createStereoPanner) { const p = panner(pan); g.connect(p); p.connect(dest); } else g.connect(dest);
    const v = { in: g, dead: false, kill(tk) { g.gain.setTargetAtTime(0, tk, 0.012); } };
    if (pool) pool.add(v, t);
    return v;
  }
  const release = (v, src) => { src.onended = () => { v.dead = true; try { v.in.disconnect(); } catch (e) { /* gone */ } }; };

  // --- sampled instruments ---------------------------------------------------------------------------
  const zones = new Map();          // key -> { buf, root }, least recently used first
  function zoneFor(inst, midi) {
    const z = assets.zone(inst, midi);
    let hit = zones.get(z.key);
    if (hit) { zones.delete(z.key); zones.set(z.key, hit); return hit; }
    const data = z.take();
    const buf = ctx.createBuffer(1, data.length, ASSET_RATE);
    buf.copyToChannel(data, 0);
    hit = { buf, root: z.root };
    zones.set(z.key, hit);
    assets.has(z.key);
    if (zones.size > 96) zones.delete(zones.keys().next().value);
    return hit;
  }
  // The first `seconds` of a zone, backwards: a note that swells and stops.
  function reversedFor(inst, midi, seconds) {
    const z = zoneFor(inst, midi);
    const key = `rev${Math.round(seconds * 100)}`;
    if (!z[key]) {
      const src = z.buf.getChannelData(0), n = Math.min(src.length, Math.floor(seconds * ASSET_RATE));
      const d = new Float32Array(n), fin = Math.floor(n * 0.35), fout = Math.floor(0.03 * ASSET_RATE);
      for (let i = 0; i < n; i++) d[i] = src[n - 1 - i] * (i < fin ? (i / fin) * (i / fin) : 1) * (i > n - fout ? Math.pow((n - i) / fout, 3) : 1);
      z[key] = ctx.createBuffer(1, n, ASSET_RATE);
      z[key].copyToChannel(d, 0);
    }
    return z;
  }

  // One note of a sampled instrument.
  //   o.bright  1 = as rendered; lower closes a low-pass (soft touch)      o.dur    damp the note after this time
  //   o.rel     time constant of the damping (default 0.12 s)              o.decay  extra decay from the start (muted note)
  //   o.detune  cents          o.pan          o.pool          o.reverse  seconds: play the start of the note backwards
  function tone(inst, dest, t, midi, vel, o = {}) {
    const z = o.reverse ? reversedFor(inst, midi, o.reverse) : zoneFor(inst, midi);
    const buf = o.reverse ? z[`rev${Math.round(o.reverse * 100)}`] : z.buf;
    const v = voice(dest, vel * (TRIM[inst] || 1), o.pan || 0, o.pool, t);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const rate = Math.pow(2, (midi - z.root) / 12 + (o.detune || 0) / 1200);
    src.playbackRate.value = rate;
    let node = src;
    const b = o.bright ?? 1;
    if (b < 0.97) {
      const lp = filter('lowpass', clamp(mtof(midi) * (1.6 + 12 * b * b), 420, 17000), 0.5);
      node.connect(lp); node = lp;
    }
    let end = t + buf.duration / rate;
    if (o.dur != null || o.decay != null) {
      const env = gain(1);
      if (o.decay != null) { env.gain.setValueAtTime(1, t); env.gain.setTargetAtTime(0, t + 0.004, o.decay); end = Math.min(end, t + 0.004 + o.decay * 7.5); }
      if (o.dur != null) { const rel = o.rel ?? 0.12; env.gain.setValueAtTime(1, t + o.dur); env.gain.setTargetAtTime(0, t + o.dur, rel); end = Math.min(end, t + o.dur + rel * 7.5); }
      node.connect(env); node = env;
    }
    node.connect(v.in);
    src.start(t); src.stop(end);
    release(v, src);
    v.end = end;
    return v;
  }
  const toneF = (inst, dest, t, f, vel, o) => tone(inst, dest, t, ftom(f), vel, o);

  // Glow: a slow, soft swell (sine with a little octave and gentle beating). Lantern light, bird calls.
  function glow(dest, t, f, vel, o = {}) {
    const v = voice(dest, vel, o.pan || 0, o.pool, t);
    const env = gain(0);
    const end = swell(env.gain, t, 1, o.attack ?? 0.25, o.hold ?? 0.3, o.release ?? 0.35);
    const o1 = osc('sine', f, t, end), o2 = osc('sine', f * 2.001, t, end), g2 = gain(o.harm ?? 0.12);
    if (o.glide) {
      for (const [osc1, k] of [[o1, 1], [o2, 2.001]]) {
        osc1.frequency.setValueAtTime(f * k * o.glide, t); osc1.frequency.exponentialRampToValueAtTime(f * k, t + (o.glideTime ?? 0.2));
      }
    }
    o1.connect(env); o2.connect(g2); g2.connect(env);
    if (o.breath) {       // a little air around the tone
      const n = noise('pink', t, end), bp = filter('bandpass', f * 2, 3), ng = gain(o.breath);
      n.connect(bp); bp.connect(ng); ng.connect(env);
    }
    env.connect(v.in);
    release(v, o1);
    return end;
  }

  // --- wood --------------------------------------------------------------------------------------
  // Soft thump: a falling sine. The body under feet, knocks and bumps.
  function thump(dest, t, f0, f1, vel, tau, o = {}) {
    const v = voice(dest, vel, o.pan || 0, o.pool, t);
    const env = gain(0);
    const end = perc(env.gain, t, 1, o.attack ?? 0.004, tau);
    const o1 = osc(o.type || 'sine', f0, t, end);
    o1.frequency.setValueAtTime(f0, t); o1.frequency.exponentialRampToValueAtTime(f1, t + tau * 2.2);
    o1.connect(env); env.connect(v.in);
    release(v, o1);
    return end;
  }

  // --- paper and air -----------------------------------------------------------------------------
  // Filtered noise with a moving filter and an arch or percussive envelope. Slides, puffs, whooshes.
  function air(dest, t, dur, o = {}) {
    const v = voice(dest, o.vel ?? 1, 0, o.pool, t);
    const type = o.type || 'bandpass';
    const f = filter(type, o.f0 ?? 800, o.q ?? 0.9), env = gain(0);
    const f0 = o.f0 ?? 800, f1 = o.f1 ?? f0;
    f.frequency.setValueAtTime(f0, t);
    if (o.fmid) { f.frequency.exponentialRampToValueAtTime(o.fmid, t + dur * (o.midAt ?? 0.5)); f.frequency.exponentialRampToValueAtTime(f1, t + dur); }
    else if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    let end;
    if (o.shape === 'perc') end = perc(env.gain, t, 1, o.attack ?? 0.003, o.tau ?? dur / 4);
    else if (o.shape === 'reverse') end = reverse(env.gain, t, 1, dur, o.tau ?? 0.02);
    else { const a = dur * (o.attackFrac ?? 0.4); end = swell(env.gain, t, 1, a, dur * (o.holdFrac ?? 0.1), (dur - a - dur * (o.holdFrac ?? 0.1)) / 3.2); }
    const src = noise(o.kind || 'pink', t, end + 0.02, o.rate ?? 1);
    src.connect(f);
    let tail = f;
    if (o.lp) { const lp = filter('lowpass', o.lp, 0.5); f.connect(lp); tail = lp; }
    tail.connect(env);
    if ((o.pan0 != null || o.pan1 != null) && ctx.createStereoPanner) {
      const p = panner(o.pan0 ?? 0);
      p.pan.setValueAtTime(clamp(o.pan0 ?? 0, -1, 1), t); p.pan.linearRampToValueAtTime(clamp(o.pan1 ?? o.pan0 ?? 0, -1, 1), t + dur);
      env.connect(p); p.connect(v.in);
    } else env.connect(v.in);
    release(v, src);
    return end;
  }

  // Flutter: noise chopped at wing-beat rate.
  function flutter(dest, t, dur, o = {}) {
    const v = voice(dest, o.vel ?? 1, o.pan || 0, o.pool, t);
    const f = filter('bandpass', o.f ?? 1100, 0.8), chop = gain(0), env = gain(0);
    const end = swell(env.gain, t, 1, dur * 0.25, dur * 0.3, dur * 0.14);
    const src = noise('pink', t, end + 0.02);
    const lfo = osc('sine', o.rate ?? 26, t, end + 0.02), lg = gain(0.5);
    lfo.frequency.setValueAtTime(o.rate ?? 26, t); lfo.frequency.linearRampToValueAtTime((o.rate ?? 26) * (o.rateEnd ?? 0.8), t + dur);
    chop.gain.value = 0.5; lfo.connect(lg); lg.connect(chop.gain);
    src.connect(f); f.connect(chop); chop.connect(env); env.connect(v.in);
    release(v, src);
    return end;
  }

  // --- sustained music voices --------------------------------------------------------------------
  // Pad note: three detuned oscillators spread over the stereo field, plus "breath": noise through narrow
  // resonators at the pitch of the note and its octave. Held until off(t), so common tones can tie.
  const PADS = {
    strings: { wave: 'strings', det: [-9, 2, 10], gain: 0.5, breath: 0.55, q: 16 },
    reed: { wave: 'reed', det: [-6, 0, 7], gain: 0.62, breath: 0.8, q: 22 },
    glass: { wave: 'glass', det: [-5, 0, 6], gain: 1.0, breath: 1.1, q: 30 },
  };
  function padNote(dest, t, f, level, o = {}) {
    const P = PADS[o.type] || PADS.strings;
    const env = gain(0);
    const oscs = P.det.map((d, i) => {
      const a = osc(WAVES[P.wave], f, t, null);
      a.detune.value = d + (o.detune ?? 0);
      const p = panner([-0.6, 0.05, 0.6][i]), g = gain(P.gain * (i === 1 ? 1 : 0.8));
      a.connect(g); g.connect(p); p.connect(env);
      return a;
    });
    env.connect(dest);
    env.gain.setValueAtTime(0, t); env.gain.setTargetAtTime(level, t, o.attack ?? 0.45);
    // breath
    let nsrc = null, benv = null;
    if (o.air) {
      nsrc = noise(f > 350 ? 'pink' : 'pink2', t, null, 0.8 + 0.4 * rng());
      benv = gain(0);
      const b1 = filter('bandpass', f, P.q), b2 = filter('bandpass', f * 2, P.q * 1.3), g2 = gain(0.7);
      nsrc.connect(b1); nsrc.connect(b2); b1.connect(benv); b2.connect(g2); g2.connect(benv);
      benv.connect(o.air);
      benv.gain.setValueAtTime(0, t); benv.gain.setTargetAtTime(level * P.breath * 22, t, (o.attack ?? 0.45) * 1.4);
    }
    let ended = false;
    return {
      f,
      level(tk, lv, tau = 0.6) { if (ended) return; env.gain.setTargetAtTime(lv, tk, tau); if (benv) benv.gain.setTargetAtTime(lv * P.breath * 22, tk, tau); },
      off(tk, tau = 0.75) {
        if (ended) return; ended = true;
        // a note that was scheduled ahead and is taken back before it sounds must not come up afterwards
        env.gain.cancelScheduledValues(tk); env.gain.setTargetAtTime(0, tk, tau);
        if (benv) { benv.gain.cancelScheduledValues(tk); benv.gain.setTargetAtTime(0, tk, tau * 0.8); }
        const stop = tk + tau * 7.5;
        for (const a of oscs) a.stop(stop);
        if (nsrc) nsrc.stop(stop);
        oscs[0].onended = () => { try { env.disconnect(); if (benv) benv.disconnect(); } catch (e) { /* gone */ } };
      },
    };
  }

  // Bass note: a low felt or harp note for the pitch (its harmonics carry on small speakers) over a sine
  // for the weight.
  function bass(dest, t, midi, vel, dur, o = {}) {
    const v0 = tone(o.inst || 'felt', dest, t, midi, vel * 1.3, { dur: dur * 0.9, rel: 0.3, bright: o.bright ?? 0.8, pan: o.pan || 0 });
    const v = voice(dest, vel * 0.26, 0, null, t);
    const env = gain(0), f = mtof(midi);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.05);
    env.gain.setTargetAtTime(0.5, t + 0.05, 0.8); env.gain.setTargetAtTime(0, t + dur, 0.25);
    const end = t + dur + 1.9;
    const o1 = osc('sine', f, t, end);
    o1.connect(env); env.connect(v.in);
    release(v, o1);
    return [v0, v];
  }

  return {
    ctx, rng, buffers, gain, filter, panner, osc, noise, perc, swell, reverse, makePool, voice, release,
    tone, toneF, glow, thump, air, flutter, padNote, bass, mtof, ftom, WAVES,
    want: (inst, lo, hi) => assets.want(inst, lo, hi),
  };
}
