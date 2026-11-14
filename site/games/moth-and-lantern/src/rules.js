// Pure puzzle rules: level parsing, moves, pushes, unlimited undo, reset, win detection.
// No rendering, no timing, no DOM. Grid directions are in level coordinates (row 0 is "up").

export const DIRS = ['up', 'right', 'down', 'left'];           // clockwise, index 0..3
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const dirIndex = (name) => DIRS.indexOf(name);

// Turns the raw rows into typed grids. "floor" is every non-wall cell that is not connected to the outside
// of the bounding box, so closed decorative rooms (level 155) still count as garden.
export function parseLevel(def) {
  const h = def.rows.length;
  const w = Math.max(...def.rows.map((r) => r.length));
  const wall = new Uint8Array(w * h), goal = new Uint8Array(w * h), floor = new Uint8Array(w * h);
  const boxes = [];
  let start = { x: 0, y: 0 };
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    for (let x = 0; x < w; x++) {
      const c = row[x] || ' ', i = y * w + x;
      if (c === '#') wall[i] = 1;
      if (c === '.' || c === '*' || c === '+') goal[i] = 1;
      if (c === '$' || c === '*') boxes.push({ x, y });
      if (c === '@' || c === '+') start = { x, y };
    }
  }
  // Flood the outside through non-wall cells, starting from the border.
  const outside = new Uint8Array(w * h), stack = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (wall[i] || outside[i]) return; outside[i] = 1; stack.push(i); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) { const i = stack.pop(), x = i % w, y = (i / w) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  let goals = 0;
  for (let i = 0; i < w * h; i++) { floor[i] = !wall[i] && !outside[i] ? 1 : 0; goals += goal[i]; }
  return { n: def.n, title: def.title || '', w, h, wall, goal, floor, start, boxes, goals };
}

export class Puzzle {
  constructor(level) {
    this.level = level;
    this.history = [];
    this._place(level.start, level.boxes);
    this.moves = 0; this.pushes = 0; this.facing = 2;
  }

  _place(player, boxes) {
    const { w, h } = this.level;
    this.player = { x: player.x, y: player.y };
    this.boxes = boxes.map((b, id) => ({ id, x: b.x, y: b.y }));
    this.boxAt = new Int16Array(w * h).fill(-1);
    for (const b of this.boxes) this.boxAt[b.y * w + b.x] = b.id;
  }

  isWall(x, y) { const { w, h, wall } = this.level; return x < 0 || y < 0 || x >= w || y >= h || wall[y * w + x] === 1; }
  isGoal(x, y) { return this.level.goal[y * this.level.w + x] === 1; }
  goalsDone() { let n = 0; for (const b of this.boxes) n += this.isGoal(b.x, b.y) ? 1 : 0; return n; }
  get solved() { return this.goalsDone() === this.boxes.length && this.boxes.length > 0; }

  // Returns a record describing what happened. type: 'step' | 'push' | 'bump'.
  move(d) {
    const { w } = this.level;
    const fx = this.player.x, fy = this.player.y, tx = fx + DX[d], ty = fy + DY[d];
    const prevFacing = this.facing;
    if (this.isWall(tx, ty)) { this.facing = d; return { type: 'bump', kind: 'wall', dir: d, from: { x: fx, y: fy } }; }
    const id = this.boxAt[ty * w + tx];
    if (id >= 0) {
      const bx = tx + DX[d], by = ty + DY[d];
      if (this.isWall(bx, by) || this.boxAt[by * w + bx] >= 0) { this.facing = d; return { type: 'bump', kind: 'box', dir: d, from: { x: fx, y: fy }, box: id }; }
      const b = this.boxes[id], wasOn = this.isGoal(tx, ty), nowOn = this.isGoal(bx, by);
      this.boxAt[ty * w + tx] = -1; this.boxAt[by * w + bx] = id; b.x = bx; b.y = by;
      this.player.x = tx; this.player.y = ty; this.moves++; this.pushes++; this.facing = d;
      this.history.push({ t: 'm', d, box: id, f: prevFacing });
      return { type: 'push', dir: d, from: { x: fx, y: fy }, to: { x: tx, y: ty }, box: id, boxFrom: { x: tx, y: ty }, boxTo: { x: bx, y: by }, wasOn, nowOn, goalsDone: this.goalsDone() };
    }
    this.player.x = tx; this.player.y = ty; this.moves++; this.facing = d;
    this.history.push({ t: 'm', d, box: -1, f: prevFacing });
    return { type: 'step', dir: d, from: { x: fx, y: fy }, to: { x: tx, y: ty } };
  }

  // Undo one history entry. Returns null when there is nothing to undo.
  undo() {
    const e = this.history.pop();
    if (!e) return null;
    const { w } = this.level;
    if (e.t === 'r') {            // undo a reset: restore the snapshot
      this._place(e.player, e.boxes); this.moves = e.moves; this.pushes = e.pushes; this.facing = e.facing;
      return { type: 'unreset', goalsDone: this.goalsDone() };
    }
    const d = e.d, px = this.player.x, py = this.player.y;
    const rec = { type: 'undo', dir: d, from: { x: px, y: py }, to: { x: px - DX[d], y: py - DY[d] }, box: e.box, wasPush: e.box >= 0, facing: e.f };
    if (e.box >= 0) {
      const b = this.boxes[e.box];
      rec.boxFrom = { x: b.x, y: b.y }; rec.boxTo = { x: px, y: py };
      rec.wasOn = this.isGoal(b.x, b.y); rec.nowOn = this.isGoal(px, py);
      this.boxAt[b.y * w + b.x] = -1; this.boxAt[py * w + px] = e.box; b.x = px; b.y = py; this.pushes--;
    }
    this.player.x = rec.to.x; this.player.y = rec.to.y; this.moves--; this.facing = e.f;
    rec.goalsDone = this.goalsDone();
    return rec;
  }

  // Reset to the start position. The reset itself can be undone.
  reset() {
    if (this.moves === 0 && this.history.length === 0) return null;
    this.history.push({ t: 'r', player: { ...this.player }, boxes: this.boxes.map((b) => ({ x: b.x, y: b.y })), moves: this.moves, pushes: this.pushes, facing: this.facing });
    this._place(this.level.start, this.level.boxes);
    this.moves = 0; this.pushes = 0; this.facing = 2;
    return { type: 'reset', goalsDone: this.goalsDone() };
  }

  // Test helper: put every lantern on a plinth (keeps the ones that already sit on one).
  forceSolve() {
    const { w, h, goal } = this.level, free = [];
    for (let i = 0; i < w * h; i++) if (goal[i] && this.boxAt[i] < 0) free.push(i);
    for (const b of this.boxes) {
      if (this.isGoal(b.x, b.y)) continue;
      const i = free.shift(); if (i === undefined) break;
      this.boxAt[b.y * w + b.x] = -1; b.x = i % w; b.y = (i / w) | 0; this.boxAt[i] = b.id;
    }
    // The moth must not stand inside a lantern.
    if (this.boxAt[this.player.y * w + this.player.x] >= 0) {
      for (let i = 0; i < w * h; i++) if (this.level.floor[i] && this.boxAt[i] < 0 && !goal[i]) { this.player.x = i % w; this.player.y = (i / w) | 0; break; }
    }
  }
}
