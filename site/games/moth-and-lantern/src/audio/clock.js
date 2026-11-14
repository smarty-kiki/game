// Scheduler that runs on the audio context clock. It works the same way for a live AudioContext
// (a timer calls tick()) and for an OfflineAudioContext (the context is suspended every STEP frames and
// tick() runs inside the suspension), so an offline render is faithful to what a player hears.
//
// - at(t, fn): run fn(t) just before context time t. Inside fn, now() returns t, so sounds that fn
//   starts are sample-accurate even though tick() itself runs on a coarse grid.
// - onTick(fn): fn(now, horizon) is called on every tick; generators schedule everything that starts
//   before `horizon`.
export const OFFLINE_STEP_FRAMES = 2048;

export function createClock(ctx, offline) {
  const queue = [];
  const tickers = [];
  const step = offline ? OFFLINE_STEP_FRAMES / ctx.sampleRate : 0.04;
  const look = offline ? step * 1.5 : 0.28;
  let virtualNow = -1;
  let timer = null;
  const stats = { ticks: 0, maxMs: 0, sumMs: 0 };      // main-thread cost of the scheduler, for the lab

  const now = () => (virtualNow >= 0 ? Math.max(virtualNow, ctx.currentTime) : ctx.currentTime + (offline ? 0 : 0.006));

  function at(t, fn) {
    let lo = 0, hi = queue.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (queue[mid].t <= t) lo = mid + 1; else hi = mid; }
    queue.splice(lo, 0, { t, fn });
  }

  function tick() {
    if (ctx.state === 'closed') return;
    const started = typeof performance !== 'undefined' ? performance.now() : 0;
    const t0 = ctx.currentTime;
    const due = offline ? t0 + step : t0 + 0.012;
    while (queue.length && queue[0].t < due) {
      const e = queue.shift();
      virtualNow = Math.max(e.t, t0);
      try { e.fn(virtualNow); } catch (err) { console.error('audio clock callback failed', err); }
    }
    virtualNow = -1;
    const horizon = t0 + look;
    for (const fn of tickers) {
      try { fn(t0, horizon); } catch (err) { console.error('audio ticker failed', err); }
    }
    if (started) { const ms = performance.now() - started; stats.ticks++; stats.sumMs += ms; if (ms > stats.maxMs) stats.maxMs = ms; }
  }

  return {
    now, at, tick, step, look, offline, stats,
    onTick(fn) { tickers.push(fn); },
    start() { if (!offline && timer == null) timer = setInterval(tick, step * 1000); },
    stop() { if (timer != null) { clearInterval(timer); timer = null; } },
    get running() { return timer != null; },
  };
}
