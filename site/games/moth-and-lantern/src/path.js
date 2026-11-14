// Path-finding for tap-to-walk. Pure: reads a Puzzle (rules.js), changes nothing.
import { DX, DY } from './rules.js';

// The shortest walk from the moth to the cell (tx, ty) that pushes nothing: a list of grid directions (0..3),
// [] when the moth already stands there, null when the cell is a wall, holds a lantern or cannot be reached.
// Among the shortest walks it prefers the one that keeps going straight, so the moth does not zigzag.
export function findPath(puzzle, tx, ty) {
  const { w, h } = puzzle.level, px = puzzle.player.x, py = puzzle.player.y;
  const open = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !puzzle.isWall(x, y) && puzzle.boxAt[y * w + x] < 0;
  if (!open(tx, ty)) return null;
  if (tx === px && ty === py) return [];
  // Distance to the target from every cell the moth could stand on.
  const dist = new Int32Array(w * h).fill(-1), list = [ty * w + tx];
  dist[ty * w + tx] = 0;
  for (let k = 0; k < list.length && dist[py * w + px] < 0; k++) {
    const i = list[k], x = i % w, y = (i / w) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d], j = ny * w + nx;
      if (open(nx, ny) && dist[j] < 0) { dist[j] = dist[i] + 1; list.push(j); }
    }
  }
  if (dist[py * w + px] < 0) return null;
  // Walk downhill; on a tie keep the current heading.
  const path = []; let x = px, y = py, heading = puzzle.facing;
  while (x !== tx || y !== ty) {
    const here = dist[y * w + x]; let pick = -1;
    for (const d of [heading, (heading + 1) & 3, (heading + 3) & 3, (heading + 2) & 3]) {
      const nx = x + DX[d], ny = y + DY[d];
      if (open(nx, ny) && dist[ny * w + nx] === here - 1) { pick = d; break; }
    }
    if (pick < 0) return null;
    path.push(pick); x += DX[pick]; y += DY[pick]; heading = pick;
  }
  return path;
}
