// Procedural geometry helpers. Everything in the game is built from these and from three.js primitives.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from '../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';

export { mergeGeometries, mergeVertices, RoundedBoxGeometry };

function fromQuads(quads) {
  // quads: arrays of 4 corner points (counter-clockwise seen from outside). Flat shaded.
  const pos = [];
  for (const [a, b, c, d] of quads) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A box whose top edges are chamfered. Top face at y = 0, bottom at y = -h. No bottom face.
export function chamferBox(w, h, d, c) {
  const x = w / 2, z = d / 2, xi = x - c, zi = z - c;
  const B = [[-x, -h, -z], [x, -h, -z], [x, -h, z], [-x, -h, z]];
  const R = [[-x, -c, -z], [x, -c, -z], [x, -c, z], [-x, -c, z]];
  const T = [[-xi, 0, -zi], [xi, 0, -zi], [xi, 0, zi], [-xi, 0, zi]];
  const q = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; q.push([B[j], B[i], R[i], R[j]], [R[j], R[i], T[i], T[j]]); }
  q.push([T[3], T[2], T[1], T[0]]);
  return fromQuads(q);
}

// A column that narrows toward the bottom. Top at y = 0 (1 x 1), bottom at y = -1 (taper x taper).
export function taperColumn(taper = 0.72) {
  const t = taper / 2;
  const T = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const B = [[-t, -1, -t], [t, -1, -t], [t, -1, t], [-t, -1, t]];
  const q = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; q.push([B[j], B[i], T[i], T[j]]); }
  q.push([T[3], T[2], T[1], T[0]]);
  return fromQuads(q);
}

// A straight square column. Top at y = 0 (w x w), bottom at y = -1. No bottom face.
export function boxColumn(w = 1) {
  const t = w / 2;
  const T = [[-t, 0, -t], [t, 0, -t], [t, 0, t], [-t, 0, t]], B = T.map(([x, , z]) => [x, -1, z]);
  const q = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; q.push([B[j], B[i], T[i], T[j]]); }
  q.push([T[3], T[2], T[1], T[0]]);
  return fromQuads(q);
}

// The hedge block before shaping: the top and the four sides of a cube as vertex grids, in unit coordinates
// (x, z in -1..1, y in 0..1). The hedge shader turns it into a rounded, lumpy block (see materials.js).
export function hedgeGrid() {
  // 0.835: on a side that is fused with a neighbour (half-width 0.515) this grid line lies exactly at the free
  // half-width 0.43, which is where the inner corner of an L-shaped run folds.
  const H = [-1, -0.9, -0.43 / 0.515, -0.3, 0.3, 0.43 / 0.515, 0.9, 1], V = [0, 0.4, 0.78, 0.87, 0.94, 1];
  const pos = [], nor = [], idx = [];
  const face = (A, B, at, n) => {
    const base = pos.length / 3;
    for (let j = 0; j < B.length; j++) for (let i = 0; i < A.length; i++) { pos.push(...at(A[i], B[j])); nor.push(...n); }
    for (let j = 0; j < B.length - 1; j++) for (let i = 0; i < A.length - 1; i++) {
      const a = base + j * A.length + i, b = a + 1, c = a + A.length, d = c + 1;
      // Orient every triangle outward.
      const p = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], pa = p(a), pb = p(b), pc = p(c);
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
      const out = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] > 0;
      if (out) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  };
  face(H, H, (x, z) => [x, 1, z], [0, 1, 0]);
  face(H, V, (z, y) => [1, y, z], [1, 0, 0]); face(H, V, (z, y) => [-1, y, z], [-1, 0, 0]);
  face(H, V, (x, y) => [x, y, 1], [0, 0, 1]); face(H, V, (x, y) => [x, y, -1], [0, 0, -1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// Paints every vertex of a geometry with one colour (adds the attribute when missing).
export function paint(geo, r, g, b) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = g; a[i * 3 + 2] = b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// Paints with a function of the vertex position: fn(x, y, z, out) writes rgb into out.
export function paintBy(geo, fn) {
  const p = geo.attributes.position, a = new Float32Array(p.count * 3), o = [0, 0, 0];
  for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), o); a[i * 3] = o[0]; a[i * 3 + 1] = o[1]; a[i * 3 + 2] = o[2]; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// Merges geometries after making their attribute sets compatible (position, normal, color only).
export function merge(list) {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.color) paint(n, 1, 1, 1);
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  return mergeGeometries(clean, false);
}

// Writes translate + scale (no rotation) into an instance matrix array.
export function writeTS(arr, i, x, y, z, sx, sy, sz) {
  const o = i * 16;
  arr[o] = sx; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0;
  arr[o + 4] = 0; arr[o + 5] = sy; arr[o + 6] = 0; arr[o + 7] = 0;
  arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = sz; arr[o + 11] = 0;
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
}

// Writes translate + rotation about Y + tilt (x, z small angles) + scale into an instance matrix array.
export function writeTRS(arr, i, x, y, z, yaw, tiltX, tiltZ, sx, sy, sz) {
  const cy = Math.cos(yaw), syw = Math.sin(yaw), cx = Math.cos(tiltX), sxn = Math.sin(tiltX), cz = Math.cos(tiltZ), szn = Math.sin(tiltZ);
  // R = Rz(tiltZ) * Rx(tiltX) * Ry(yaw)
  const a00 = cy, a02 = syw, a20 = -syw, a22 = cy;                        // Ry
  const b00 = a00, b01 = 0, b02 = a02, b10 = sxn * syw, b11 = cx, b12 = -sxn * a22, b20 = cx * a20, b21 = sxn, b22 = cx * a22; // Rx * Ry
  const m00 = cz * b00 - szn * b10, m01 = cz * b01 - szn * b11, m02 = cz * b02 - szn * b12;
  const m10 = szn * b00 + cz * b10, m11 = szn * b01 + cz * b11, m12 = szn * b02 + cz * b12;
  const o = i * 16;
  arr[o] = m00 * sx; arr[o + 1] = m10 * sx; arr[o + 2] = b20 * sx; arr[o + 3] = 0;
  arr[o + 4] = m01 * sy; arr[o + 5] = m11 * sy; arr[o + 6] = b21 * sy; arr[o + 7] = 0;
  arr[o + 8] = m02 * sz; arr[o + 9] = m12 * sz; arr[o + 10] = b22 * sz; arr[o + 11] = 0;
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
}
