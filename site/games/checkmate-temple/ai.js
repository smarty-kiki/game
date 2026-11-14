// The other hand: a small alpha-beta search on top of chess.js, in a worker so the temple keeps rendering.
import { Chess } from './vendor/chess.js';

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
// piece-square tables from white's point of view, a8..h1
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

function evaluate(ch) {            // + is good for white
  let s = 0; const b = ch.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f]; if (!p) continue;
    const i = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
    const v = VAL[p.type] + PST[p.type][i];
    s += p.color === 'w' ? v : -v;
  }
  return s;
}
let nodes = 0, deadline = 0;
function order(ms) { return ms.sort((a, b) => (b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0) + (b.promotion ? 800 : 0) - ((a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0) + (a.promotion ? 800 : 0))); }
function quiesce(ch, a, b, sign, depth) {
  nodes++;
  const stand = sign * evaluate(ch);
  if (depth === 0) return stand;
  if (stand >= b) return b; if (stand > a) a = stand;
  for (const m of order(ch.moves({ verbose: true }).filter(m => m.captured))) {
    ch.move(m); const v = -quiesce(ch, -b, -a, -sign, depth - 1); ch.undo();
    if (v >= b) return b; if (v > a) a = v;
  }
  return a;
}
function search(ch, depth, a, b, sign, ply) {
  nodes++;
  const ms = ch.moves({ verbose: true });
  if (ms.length === 0) return ch.inCheck() ? -100000 + ply : 0;
  if (ch.isDraw()) return 0;
  if (depth === 0) return quiesce(ch, a, b, sign, 3);
  for (const m of order(ms)) {
    ch.move(m); const v = -search(ch, depth - 1, -b, -a, -sign, ply + 1); ch.undo();
    if (v > a) a = v; if (a >= b) break;
    if (performance.now() > deadline) break;
  }
  return a;
}
self.onmessage = (e) => {
  const { fen, depth = 3, id } = e.data;
  const ch = new Chess(fen); const sign = ch.turn() === 'w' ? 1 : -1;
  nodes = 0; deadline = performance.now() + 6000;
  let best = null, bestV = -Infinity;
  const ms = order(ch.moves({ verbose: true }));
  for (const m of ms) {
    ch.move(m); let v = -search(ch, depth - 1, -1e9, 1e9, -sign, 1); ch.undo();
    v += Math.random() * 14;                       // a little unpredictability; never enough to hang a piece
    if (v > bestV) { bestV = v; best = m; }
    if (performance.now() > deadline) break;
  }
  self.postMessage({ id, move: best ? { from: best.from, to: best.to, promotion: best.promotion } : null, nodes, score: bestV });
};
