// cue ごとの同時発音数と再発火間隔の帳簿、直前と同じ変種を避ける選び方。
export function pickVariation(count, last = -1, random = Math.random) {
  if (count <= 1) return 0;
  let i = Math.floor(random() * (count - 1));
  if (i >= last && last >= 0) i++;
  return Math.min(count - 1, i);
}

/** 同時発音数と再発火間隔の帳簿。時刻（ms）は呼ぶ側が与える（試験で決定的にするため）。 */
export class VoiceBook {
  constructor() { this.last = new Map(); this.voices = new Map(); }
  /**
   * 鳴らしてよいか。retriggerMs より短い連打は {ok:false, reason:'retrigger'}。
   * 鳴っている声が maxVoices（既定 2）に達していれば、一番古い声を steal に入れて返す（呼ぶ側が止める）。
   */
  admit(cue, rule, nowMs) {
    const last = this.last.get(cue);
    if (last != null && nowMs - last < (rule.retriggerMs ?? 0)) return {ok: false, reason: 'retrigger'};
    const list = (this.voices.get(cue) || []).filter(v => v.end > nowMs);
    let steal = null;
    if (list.length >= (rule.maxVoices ?? 2)) steal = list.shift();
    this.voices.set(cue, list); this.last.set(cue, nowMs);
    return {ok: true, steal};
  }
  /** 鳴らし始めた声を記録する。voice.end は鳴り終わる時刻（ms）。 */
  started(cue, voice) { (this.voices.get(cue) || this.voices.set(cue, []).get(cue)).push(voice); }
}

/** 音程と音量の揺らぎ（台帳の pitchCents・volDb の幅で一様に揺らす）。戻り値は再生速度の倍率と dB。 */
export function variationOf(rule, random = Math.random) {
  const cents = (random() * 2 - 1) * (rule.pitchCents || 0), db = (random() * 2 - 1) * (rule.volDb || 0);
  return {playbackRate: Math.pow(2, cents / 1200), gainDb: db};
}
