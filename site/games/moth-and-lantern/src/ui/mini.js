// Garden miniatures for the chooser: the real level shape, drawn as a small floating slab seen from above.
// One painter serves the path tiles (silhouette only) and the preview (every piece at its starting place).
// `rot` is the number of quarter turns the garden opens in (same sense as the camera: grid "up" shows toward
// screen direction `rot`), so a miniature can match what the player will see.
import { LEVELS } from '../levels-data.js';
import { parseLevel } from '../rules.js';

const cache = new Array(LEVELS.length);
export function levelOf(n) { return cache[n - 1] || (cache[n - 1] = parseLevel(LEVELS[n - 1])); }

const TAU = Math.PI * 2;
const DEPTH = 0.62;      // height of the earth under the slab, in cells
const LIFT = 0.24;       // how far a hedge stands above the paving, in cells

const TONE = {
  dark: { cliff: 'rgba(22, 27, 74, 0.92)', floorA: 'rgba(122, 136, 206, 0.46)', floorB: 'rgba(122, 136, 206, 0.38)', hedge: '#2c6f6c', hedgeSide: '#1c4a52', plinth: 'rgba(157, 220, 255, 0.75)' },
  lit: { cliff: 'rgba(58, 36, 62, 0.94)', floorA: 'rgba(214, 170, 140, 0.58)', floorB: 'rgba(214, 170, 140, 0.5)', hedge: '#4daf8c', hedgeSide: '#2b7763', plinth: '#ffd596' },
  plan: { cliff: 'rgba(20, 25, 70, 0.95)', floorA: 'rgba(150, 162, 220, 0.50)', floorB: 'rgba(150, 162, 220, 0.41)', hedge: '#3d9c82', hedgeSide: '#256a5c', plinth: 'rgba(157, 220, 255, 0.95)' },
};

// Size of the turned grid, and the grid cell shown at a place of the turned grid.
function turn(L, rot) {
  const r = ((rot % 4) + 4) % 4, odd = r & 1, w = odd ? L.h : L.w, h = odd ? L.w : L.h;
  const src = r === 0 ? (sx, sy) => sy * L.w + sx
    : r === 1 ? (sx, sy) => (L.h - 1 - sx) * L.w + sy
    : r === 2 ? (sx, sy) => (L.h - 1 - sy) * L.w + (L.w - 1 - sx)
    : (sx, sy) => sx * L.w + (L.w - 1 - sy);
  const place = r === 0 ? (x, y) => [x, y] : r === 1 ? (x, y) => [L.h - 1 - y, x] : r === 2 ? (x, y) => [L.w - 1 - x, L.h - 1 - y] : (x, y) => [y, L.w - 1 - x];
  return { w, h, src, place };
}

// Draws level L inside the box (x, y, w, h) of context c (units: whatever the context is scaled to).
// opts: rot 0..3, lit (solved look: every plinth carries a glowing lantern), detail (starting pieces and the moth),
// maxCell (cap on the cell size so small gardens stay small next to big ones).
export function drawMini(c, L, { x = 0, y = 0, w, h, rot = 0, lit = false, detail = false, maxCell = 99 }) {
  const T = turn(L, rot), tone = detail ? TONE.plan : lit ? TONE.lit : TONE.dark;
  const s = Math.min(w / T.w, h / (T.h + DEPTH + LIFT), maxCell);
  const ox = x + (w - T.w * s) / 2, oy = y + (h - (T.h + DEPTH - LIFT) * s) / 2;
  const lift = s * LIFT, gap = detail ? Math.min(1, s * 0.05) : 0, rad = detail ? s * 0.16 : 0;
  const solid = (i) => L.wall[i] || L.floor[i];

  // earth under the slab
  c.fillStyle = tone.cliff;
  for (let sy = 0; sy < T.h; sy++) for (let sx = 0; sx < T.w; sx++) {
    if (solid(T.src(sx, sy))) c.fillRect(ox + sx * s - 0.3, oy + sy * s + s * 0.4, s + 0.6, s * (0.6 + DEPTH));
  }
  // paving, then hedges, row by row so that a hedge overlaps the row behind it
  for (let sy = 0; sy < T.h; sy++) {
    for (let sx = 0; sx < T.w; sx++) {
      const i = T.src(sx, sy); if (!L.floor[i]) continue;
      c.fillStyle = (sx + sy) & 1 ? tone.floorA : tone.floorB;
      if (detail) { c.beginPath(); c.roundRect(ox + sx * s + gap, oy + sy * s + gap, s - gap * 2, s - gap * 2, rad * 0.7); c.fill(); }
      else c.fillRect(ox + sx * s, oy + sy * s, s + 0.4, s + 0.4);
    }
    for (let sx = 0; sx < T.w; sx++) {
      if (!L.wall[T.src(sx, sy)]) continue;
      const px = ox + sx * s, py = oy + sy * s - lift;
      c.fillStyle = tone.hedgeSide; c.fillRect(px - 0.2, py + s * 0.5, s + 0.4, s * 0.5 + lift);
      c.fillStyle = tone.hedge;
      if (detail) { c.beginPath(); c.roundRect(px + gap * 0.5, py, s - gap, s, rad); c.fill(); }
      else c.fillRect(px - 0.2, py, s + 0.4, s);
    }
  }
  const centre = (gx, gy) => { const [sx, sy] = T.place(gx, gy); return [ox + (sx + 0.5) * s, oy + (sy + 0.5) * s]; };
  const glow = (cx, cy, r, a) => {
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 196, 110, ${a})`); g.addColorStop(0.45, `rgba(255, 170, 80, ${a * 0.42})`); g.addColorStop(1, 'rgba(255, 170, 80, 0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.fill();
  };

  // plinths
  for (let gy = 0; gy < L.h; gy++) for (let gx = 0; gx < L.w; gx++) {
    if (!L.goal[gy * L.w + gx]) continue;
    const [cx, cy] = centre(gx, gy);
    if (detail) { c.strokeStyle = tone.plinth; c.lineWidth = Math.max(1.2, s * 0.085); c.beginPath(); c.arc(cx, cy, s * 0.3, 0, TAU); c.stroke(); }
    else if (lit) {
      c.globalCompositeOperation = 'lighter'; glow(cx, cy, Math.max(s * 1.7, 5), 0.34); c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#fff1cf'; c.beginPath(); c.arc(cx, cy, Math.max(s * 0.3, 1.25), 0, TAU); c.fill();
    } else { c.fillStyle = tone.plinth; c.beginPath(); c.arc(cx, cy, Math.max(s * 0.2, 1), 0, TAU); c.fill(); }
  }
  if (!detail) return s;

  // lanterns at their starting places, then the moth
  for (const b of L.boxes) {
    const on = L.goal[b.y * L.w + b.x], [cx, cy] = centre(b.x, b.y);
    if (on) { c.globalCompositeOperation = 'lighter'; glow(cx, cy, s * 1.25, 0.6); c.globalCompositeOperation = 'source-over'; }
    c.fillStyle = 'rgba(8, 10, 34, 0.35)'; c.beginPath(); c.ellipse(cx, cy + s * 0.2, s * 0.26, s * 0.13, 0, 0, TAU); c.fill();
    c.fillStyle = on ? '#ffd690' : '#e2ddd6'; c.beginPath(); c.ellipse(cx, cy - s * 0.04, s * 0.23, s * 0.28, 0, 0, TAU); c.fill();
    c.fillStyle = on ? '#fff6dc' : 'rgba(90, 61, 82, 0.55)'; c.fillRect(cx - s * 0.13, cy - s * 0.34, s * 0.26, s * 0.07);
  }
  const [mx, my] = centre(L.start.x, L.start.y), u = s * 0.46;
  c.fillStyle = '#fbf0dc';
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(mx, my - u * 0.15);
    c.bezierCurveTo(mx + side * u * 0.5, my - u * 0.95, mx + side * u * 1.05, my - u * 0.5, mx + side * u * 0.82, my + u * 0.08);
    c.bezierCurveTo(mx + side * u * 0.95, my + u * 0.55, mx + side * u * 0.35, my + u * 0.6, mx, my + u * 0.25);
    c.closePath(); c.fill();
  }
  c.fillStyle = '#b9643f'; c.beginPath(); c.ellipse(mx, my + u * 0.04, u * 0.13, u * 0.42, 0, 0, TAU); c.fill();
  return s;
}

// Gives a canvas a backing store for the device's pixel density and returns a context scaled to CSS pixels.
export function fitCanvas(cv, cssW, cssH, maxDpr = 2) {
  const dpr = Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
  const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cssW, cssH);
  return c;
}
