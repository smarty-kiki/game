// 通信の窓：顔窓（表情）・名前・1文字ずつの本文・声。配役と台詞は commCast.js の表を読む。
// say(text) は順に並べ、bark(kind) は手が空いているときだけ短い反応を出す（物語の台詞が来たら譲る）。
import { CAST, FACES, parseLine, lineById, barks } from './commCast.js';
import { tr } from './i18n.js'; // 字幕と名前を端末の言語にする（声は日本語のまま。spec REQ-016）

const FACE_URL = (who, f) => `./assets/portraits/${who}_${f}.webp`;
const VOICE_URL = (id) => `./assets/voice/${id}.ogg`;
const BARK_COOL = { hurt: 40, low: 30, kill: 45, down: 6, revive: 6 };
const BARK_GAP = 18; // 反応どうしの間を最低この秒あける（撃墜・復帰は除く）
const BARK_TTL = 1.5;
// 場面と合う間だけ出す（spec REQ-009）：頼まれてから LINE_WAIT 秒か、自機が LINE_REACH m 進むまでに出せなければ捨てる。
// 後の出来事の台詞が来たら、前の出来事の台詞は YIELD_AFTER 秒出した後なら打ち切って譲る（残りが YIELD_LEFT 秒未満なら言い切る）
const LINE_WAIT = 5;
const LINE_REACH = 450;
const YIELD_AFTER = 1.2;
const YIELD_LEFT = 1.0;
const PERF = new URLSearchParams(location.search).has('perf');

export function createComm({ root, audio }) {
  root.innerHTML = '<div class="face"><img alt=""><i class="scan"></i></div><div class="body"><div class="row"><span class="who"></span><span class="lvl"><i></i><i></i><i></i></span></div><span class="say"></span></div>';
  const img = root.querySelector('img');
  const whoEl = root.querySelector('.who');
  const sayEl = root.querySelector('.say');
  // 絵は先に読んでおく（切り替えでちらつかないように）
  const cache = [];
  for (const k of Object.keys(CAST)) for (const f of FACES) { const im = new Image(); im.src = FACE_URL(k, f); cache.push(im); }

  const queue = [];
  let cur = null; // { who, text, line, shown, t, rate, voice, bark }
  let lastFace = '';
  let commT = 0;
  const lastBark = {};
  let barkTurn = 0;
  let lastAnyBark = -99;
  let clock = 0;
  let zNow = 0; // 自機のコースの上の位置（update で受け取る）
  let group = 0; let groupClock = -1; // 同じ時刻に頼まれた台詞は同じ出来事（掛け合い）
  const lastSaid = {}; // 台詞id → 最後に出した時刻
  // 1回の出撃で同じ文を2度言わない（spec REQ-008）。話し手が違っても同じ文なら出さない。数の入る台詞は数が違えば別の文
  const spoken = new Set();
  const said = [];
  const textKey = (item) => item.text.trim();
  // 並べる：同じ台詞が待っていれば1つにまとめ（数の入る台詞は新しい文に差し替え）、冷めていなければ捨てる
  function enqueue(item) {
    if (spoken.has(textKey(item))) return;
    if (queue.some((q) => textKey(q) === textKey(item))) return;
    const id = item.line?.id;
    if (id) {
      const same = queue.find((q) => q.line?.id === id);
      if (same) { same.text = item.text; return; }
      if (cur && cur.line?.id === id && item.line.re) return;
      const cool = item.line.cool || 0;
      if (cool && clock - (lastSaid[id] ?? -999) < cool) return;
    }
    item.t0 = clock; item.z0 = zNow; item.tReq = clock; item.zReq = zNow;
    if (groupClock !== clock) { group++; groupClock = clock; }
    item.group = group;
    item.ttl = item.bark ? BARK_TTL : (item.line?.ttl ?? LINE_WAIT);
    queue.push(item);
    if (cur && cur.bark) commT = Math.min(commT, 0.15); // 反応の声は次の台詞に譲る
    // 後の出来事の台詞が来たら、流れている前の出来事の台詞を打ち切って譲る（短い反応は譲らせない側にしない）
    else if (!item.bark && cur && !cur.bark && cur.group !== item.group && clock - cur.started >= YIELD_AFTER && commT > YIELD_LEFT) commT = Math.min(commT, 0.2);
  }

  function show(item) {
    const c = CAST[item.who];
    cur = item;
    cur.started = clock;
    // 同じ出来事の続きの台詞は、この台詞が始まった時から待ちを数え直す（掛け合いの2つ目が捨てられないように）
    for (const q of queue) if (q.group === item.group) { q.t0 = clock; q.z0 = zNow; }
    // 字幕は1字ずつ出すので、出す前に訳す。打ち出しの速さは元の日本語の長さで同じ時間に終わるようにする
    cur.disp = tr(item.text); cur.shown = 0; cur.shownN = 0; cur.rate = 34 * Math.max(1, cur.disp.length / Math.max(1, item.text.length));
    const face = item.face || item.line?.face || 'n';
    const faceUrl = FACE_URL(item.who, face);
    if (faceUrl !== lastFace) { lastFace = faceUrl; img.src = faceUrl; }
    whoEl.textContent = tr(c.name);
    whoEl.dataset.i18n = 'off'; sayEl.dataset.i18n = 'off'; // 訳してから入れるので、画面の置き換え（src/i18n.js）は飛ばす
    root.dataset.side = c.side;
    root.dataset.who = item.who;
    // 開く動きをやり直す。offsetWidth を読むと再レイアウトを強制するので、次のコマで付け直す（spec REQ-013）
    root.classList.remove('open'); requestAnimationFrame(() => { if (cur === item) root.classList.add('open'); });
    sayEl.textContent = '';
    commT = 2.4 + item.text.length * 0.07;
    if (audio) audio.cue('commIn');
    if (item.line && !item.line.noVoice && audio && (audio.canVoice ?? audio.ready)) {
      const mine = cur;
      audio.playVoice(VOICE_URL(item.line.id)).then((h) => {
        if (!h) return;
        if (PERF) document.documentElement.dataset.voicelog = `${document.documentElement.dataset.voicelog || ''} ${item.line.id}`.trim(); // 確認用：鳴った声の台詞id
        if (cur !== mine) { h.stop(); return; }
        mine.voice = h;
        root.classList.add('talk');
        // 本文は声の長さに合わせて送り、声が終わってから少し残す
        mine.rate = Math.max(14, Math.min(42, mine.text.length / Math.max(0.4, h.duration * 0.85)));
        commT = Math.max(commT, h.duration + 0.7);
        h.done.then(() => { if (cur === mine) root.classList.remove('talk'); });
      }).catch(() => {});
    }
  }

  function end() {
    if (cur && cur.voice) cur.voice.stop();
    root.classList.remove('talk');
    cur = null;
  }

  return {
    say(raw) { enqueue(parseLine(raw)); },
    /** 台詞の表のidで直接話させる（物語の出来事用） */
    line(id) { const l = lineById(id); if (l) enqueue({ who: l.who, text: l.text, line: l }); },
    /** 短い反応。手が空いていて、同じ種類が冷めているときだけ */
    bark(kind, time) {
      // 撃墜の呼びかけだけは、ほかの台詞が流れていても割り込む
      if (kind !== 'down' && (queue.length || (cur && commT > 0.3))) return false;
      if (time - (lastBark[kind] ?? -99) < (BARK_COOL[kind] ?? 6)) return false;
      if (kind !== 'down' && kind !== 'revive' && time - lastAnyBark < BARK_GAP) return false;
      lastAnyBark = time;
      // まだ言っていない台詞だけから選ぶ。使い切った種類はもう出さない（REQ-008）
      const list = barks(kind).filter((x) => !spoken.has(x.text.trim()));
      if (!list.length) return false;
      lastBark[kind] = time;
      const l = list[barkTurn++ % list.length];
      enqueue({ who: l.who, text: l.text, line: l, bark: true });
      if (kind === 'down' && queue.length > 1) { queue.unshift(queue.pop()); commT = Math.min(commT, 0.2); }
      return true;
    },
    /** z：自機のコースの上の位置（場面と合わない古い台詞を捨てるのに使う） */
    update(dt, z) {
      clock += dt;
      if (typeof z === 'number') zNow = z;
      commT -= dt;
      if (commT <= 0) {
        if (cur) end();
        // 待ちすぎた台詞・自機が先へ進みすぎた台詞（もう場面に合わない）は捨てる
        while (queue.length && (clock - queue[0].t0 > queue[0].ttl || (!queue[0].bark && zNow - queue[0].z0 > LINE_REACH))) queue.shift();
        if (queue.length) {
          const it = queue.shift();
          if (it.line) lastSaid[it.line.id] = clock;
          spoken.add(textKey(it)); said.push(`${it.who}:${it.text}@頼${Math.round(it.zReq)}→始${Math.round(zNow)}/${(clock - it.tReq).toFixed(1)}s`);
          if (PERF) document.documentElement.dataset.commlog = said.join(' | '); // 確認用：出した台詞の一覧（?perf=1）
          show(it);
        }
        else if (root.classList.contains('open')) { root.classList.remove('open'); if (audio) audio.cue('commOut'); }
      }
      if (cur && cur.shown < cur.disp.length) {
        cur.shown = Math.min(cur.disp.length, cur.shown + dt * cur.rate);
        const n = Math.ceil(cur.shown);
        if (n !== cur.shownN) { cur.shownN = n; sayEl.textContent = cur.disp.slice(0, n); }
      }
    },
    get busy() { return !!cur || queue.length > 0; },
    get current() { return cur ? { who: cur.who, text: cur.text, id: cur.line?.id || null } : null; },
  };
}
