// Mix: three buses (music, sfx, ambience), one shared synthetic reverb, master compressor and limiter.
//
//   voice -> bus.input(wet) -> pre -> duck, swell -> state -> tone -> toggle -----------> master
//                           -> send(wet) -> toggle ---> reverb in -> hp/lp -> convolver -> master
//   master -> rumble filter -> glue compressor -> limiter -> trim -> destination
//
// duck: short dips (a chime ducks the music). swell: the long dips of big gestures (win, reset); the two do not
// cancel each other. state: longer states (a panel is open). toggle: on/off switch.
import { dB } from './util.js';

export function createMix(ctx, assets, offline) {
  // Every node of the mix is fixed to two channels. Voices are a mixture of mono and stereo (panned)
  // sources that come and go; without this the channel count of the buses would switch between 1 and 2
  // while they play, and the convolver and the compressors click when that happens.
  const gain = (v) => {
    const g = ctx.createGain(); g.gain.value = v;
    g.channelCount = 2; g.channelCountMode = 'explicit'; g.channelInterpretation = 'speakers';
    return g;
  };
  const biquad = (type, f, q = 0.707) => {
    const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b;
  };

  const master = gain(dB(-2));
  const rumble = biquad('highpass', 32);
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20; glue.knee.value = 12; glue.ratio.value = 2; glue.attack.value = 0.03; glue.release.value = 0.32;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -7; limiter.knee.value = 4; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.14;
  const trim = gain(dB(-2));
  master.connect(rumble); rumble.connect(glue); glue.connect(limiter); limiter.connect(trim); trim.connect(ctx.destination);

  // Reverb: generated impulse response, kept out of the low mids (high-pass) and the top (low-pass).
  const revIn = gain(1);
  const revHp = biquad('highpass', 280, 0.6);
  const revLp = biquad('lowpass', 10500, 0.6);
  const conv = ctx.createConvolver();
  conv.normalize = false;
  const loadImpulse = () => {
    const [irL, irR] = assets.impulse(ctx.sampleRate);
    const ir = ctx.createBuffer(2, irL.length, ctx.sampleRate);
    ir.copyToChannel(irL, 0); ir.copyToChannel(irR, 1);
    conv.buffer = ir;
  };
  // Preparing the convolver takes around 10 ms; live, it happens just after the first tap, not inside it.
  if (offline) loadImpulse(); else setTimeout(loadImpulse, 0);
  const revOut = gain(0.95);
  revIn.connect(revHp); revHp.connect(revLp); revLp.connect(conv); conv.connect(revOut); revOut.connect(master);

  function makeBus(level) {
    const pre = gain(1), duck = gain(1), swell = gain(1), state = gain(1), tone = biquad('lowpass', 19000, 0.5), toggle = gain(level);
    const shelf = biquad('highshelf', 4500); shelf.gain.value = 0;
    const preSend = gain(1), toggleSend = gain(1);
    pre.connect(duck); duck.connect(swell); swell.connect(state); state.connect(shelf); shelf.connect(tone); tone.connect(toggle); toggle.connect(master);
    preSend.connect(toggleSend); toggleSend.connect(revIn);
    const inputs = new Map();
    let on = true;
    return {
      stateGain: state.gain, tone, tap: tone, shelf,
      // An input node with a fixed reverb send. Inputs are cached, so voices share them.
      input(wet = 0) {
        let n = inputs.get(wet);
        if (!n) {
          n = gain(1); n.connect(pre);
          if (wet > 0) { const s = gain(wet); n.connect(s); s.connect(preSend); }
          inputs.set(wet, n);
        }
        return n;
      },
      get on() { return on; },
      set(v, t) {
        on = !!v;
        toggle.gain.setTargetAtTime(on ? level : 0, t, 0.09);
        toggleSend.gain.setTargetAtTime(on ? 1 : 0, t, 0.09);
      },
      // Dip the bus to `depth` (linear), then let it come back.
      // slot 0: short dips; slot 1: long ones. A new dip replaces what its own slot still had planned.
      duck(t, depth, attack, hold, release, slot = 0) {
        const p = (slot ? swell : duck).gain;
        p.cancelScheduledValues(t);
        p.setTargetAtTime(depth, t, attack / 3);
        p.setTargetAtTime(1, t + attack + hold, release / 3);
      },
    };
  }

  const music = makeBus(dB(-3));
  const sfx = makeBus(dB(0));
  const amb = makeBus(dB(3.5));

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  music.tap.connect(analyser);

  return { master, out: trim, music, sfx, amb, analyser };
}
