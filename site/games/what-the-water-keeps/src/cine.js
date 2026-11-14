// The film camera: one shot of the film, stepped frame by frame (film/README.md; the shots are written in film/shots.py).
//
//   /?realm=<id>&s=..&d=..&cine=film/shots/<shot>.json&name=<shot>&frames=90&out=1&shotw=1920&shoth=1080
//
// Nothing here is a screen recording. The page steps the ride itself by one frame of film at a time (1 / fps seconds),
// moves the camera along the shot's keys, draws, and sends every frame to the dev server as .shots/film_<shot>_<n>.jpg;
// when the shot is complete it sends film_<shot>_done.json (where the boat was on the first and last frame), which is
// what tools/shot.py waits for. tools/film.py runs it for every shot of the cut.
//
// A shot (all optional but cam):
//   { "at": "realm=sea&s=45&d=0",                                    (read by tools/film.py: the address the shot starts from)
//     "fps": 30, "frames": 90, "t": 3,                               frames of film (or &frames=); seconds the area runs before the first
//     "boat": { "drift": true, "speed": 1.3, "current": 0.7, "hide": false, "lit": 1 },
//                                                                    drift: it travels (speed: metres a second through the water, which
//                                                                    makes its wake; current: what the water adds, the same everywhere);
//                                                                    hide: not drawn; lit: its lantern
//     "cam": { "in": "path" | "boat" | "world" | "seat",             what the keys' numbers mean (see below)
//              "lookIn": ...,                                        the same choice for "look" (a camera on the bank that follows the boat:
//                                                                    "in": "path", "lookIn": "boat")
//              "ease": 0.5,                                          0 = even speed through the shot, 1 = eased in and out
//              "keys": [ { "u": 0, "pos": [..], "look": [..], "fov": 42, "roll": 0 }, { "u": 1, ... } ] },   two keys: a straight move;
//                                                                    more: a smooth curve through them
//     "paint": 0.8,                                                  the painter's filter, if not the area's own
//     "fade": { "in": 40, "out": 80, "color": "#05060a",            frames from and to the dark (or to "color")
//               "under": false, "to": 1 },                           under: the lettering stays over the fade; to: how far the fade goes (1 = wholly)
//     "title": { "text", "from": 45, "in": 50, "y": 0.33, "size": 0.082, "color": "#2a1b14", "weight": 400, "shade": 0, "shadow": 0 },
//              or { "mark": true, "from", "in", "y": where its waterline lies, "width": 0.62, "color", "lamp" }: the drawn mark (src/logo.js)
//                                                                    the ride's name, lettered as the title screen letters it
//     "sub": 1, "shutter": 0.5 }                                     motion blur: each frame the average of `sub` pictures (off at 1)
//   in "path":  pos and look are [metres along the waterway, metres to the right of its centre line, height above the water]
//   in "boat":  [metres to the boat's right, height above the water, metres ahead of the boat], moving with the boat
//   in "world": [x, y, z] of the area
//   in "seat":  the rider's own eye; keys give { "yaw", "pitch" } in degrees (left and up are positive) and "fov"
//
// Address switches: &stills=0,45,89 draws only those frames (the storyboard; not &only=, which the areas use for their
// modules); &sub=4&shutter=0.5 motion blur; &probe=1 notes, for every frame, the numbers that colour the whole picture
// (in the done file: to find what makes a shot's light step).
import * as THREE from 'three';
import { drawLogo } from './logo.js';

const DEG = Math.PI / 180;
const smooth = (u) => u * u * (3 - 2 * u);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** The value of a keyed quantity (a number or an array of numbers) at u in 0..1: straight between two keys, a smooth curve through more. */
function keyed(keys, field, u) {
  const ks = keys.filter((k) => k[field] !== undefined);
  if (!ks.length) return undefined;
  if (ks.length === 1) return ks[0][field];
  let i = 0;
  while (i < ks.length - 2 && u > ks[i + 1].u) i++;
  const a = ks[i], b = ks[i + 1], t = Math.min(1, Math.max(0, (u - a.u) / Math.max(1e-6, b.u - a.u)));
  const p0 = ks[Math.max(0, i - 1)], p3 = ks[Math.min(ks.length - 1, i + 2)];
  const one = (get) => (ks.length === 2 ? get(a) + (get(b) - get(a)) * t : catmull(get(p0), get(a), get(b), get(p3), t));
  return Array.isArray(a[field]) ? a[field].map((_, j) => one((k) => k[field][j])) : one((k) => k[field]);
}

export async function film(engine, realms, inst, canvas, params) {
  const spec = await (await fetch(params.get('cine'), { cache: 'no-store' })).json();
  const name = params.get('name') || spec.name || 'shot';
  const fps = spec.fps || 30, frames = Math.max(1, Math.round(+params.get('frames') || spec.frames || 90)), dt = 1 / fps;
  // &stills=0,45,89: step through the whole shot but draw and send only these frames (the storyboard: tools/film.py board)
  const only = params.has('stills') ? new Set(params.get('stills').split(',').map((x) => Math.min(frames - 1, Math.max(0, Math.round(+x))))) : null;
  const B = spec.boat || {}, C = spec.cam, mode = C.in || 'path', lookMode = C.lookIn || mode;
  const boat = engine.boat, cam = engine.camera;
  const drifting = !!B.drift;
  engine.frozen = !drifting;
  if (B.speed != null) engine.devSpeed = B.speed;
  // "current": the water carries the boat at this many metres a second everywhere (the ride's own current changes with the
  // channel's width), so that a shot's boat is where the shot list says: it travels at speed + current
  if (B.current != null) Object.defineProperties(engine, { currentWide: { get: () => B.current, set() {}, configurable: true }, currentNarrow: { get: () => B.current, set() {}, configurable: true } });
  if (!drifting) realms.lookAhead = false;
  if (spec.paint != null) engine.paintOverride = spec.paint;
  const step = async (seconds, hz) => {                                 // (as src/main.js does for a drifting picture)
    if (!drifting) { engine.simulate(seconds, hz); return; }
    for (let left = seconds; left > 1e-6; left -= 1) { engine.simulate(Math.min(1, left), hz); if (realms.building.size || realms.holding) await realms.settled(); }
  };
  const dress = () => {
    if (B.hide) { boat.model.group.visible = false; boat.model.lit = 0; engine.lanternTarget = 0; }
    else if (B.lit != null) { boat.model.lit = B.lit; engine.lanternTarget = B.lit; }
  };
  dress();
  // "stroke": where the rower is in her stroke on the first frame (0..1 of her clip; 0 is the catch, the blade about to
  // go in; about 0.36 the release). She is started that far before it, so that her oar and the water it has worked
  // agree by the time the film begins, and set exactly on the frame before the first (the stroke's pace follows the
  // boat's speed, which rises and falls with the stroke: the start alone would leave her a twentieth of a stroke out).
  const rower = boat.model && boat.model.rower;
  if (B.stroke != null && rower && rower.setPhase) rower.setPhase(B.stroke, (spec.t ?? 2) + 0.2, B.speed ?? 0);
  await step(spec.t ?? 2, 30);
  engine.simulate(0.2, 60);
  if (B.stroke != null && rower && rower.setPhase) { let off = B.stroke - rower.phase; off -= Math.round(off); if (Math.abs(off) < 0.2) rower.setPhase(rower.phase + off); }
  const from = { s: +boat.s.toFixed(2), d: +boat.d.toFixed(2) };

  const _p = {}, v = new THREE.Vector3(), target = new THREE.Vector3(), M = new THREE.Matrix4(), inv = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  const s3 = new THREE.Vector3(), q = new THREE.Quaternion();
  const place = (how, a, out) => {
    if (how === 'world') return out.set(a[0], a[1], a[2]);
    if (how === 'boat') {
      const h = boat.heading, fx = -Math.sin(h), fz = -Math.cos(h), rx = -fz, rz = fx;
      return out.set(boat.x + rx * a[0] + fx * a[2], a[1], boat.z + rz * a[0] + fz * a[2]);
    }
    const path = realms.current.path, L = path.length, s = a[0], c = Math.min(L, Math.max(0, s)), p = path.at(c, _p), over = s - c;      // past an end: straight on
    return out.set(p.x + p.rx * a[1] + p.tx * over, a[2], p.z + p.rz * a[1] + p.tz * over);
  };
  const aim = (i) => {
    let u = frames > 1 ? Math.min(1, i / (frames - 1)) : 0;
    const e = C.ease ?? 0;
    u = u * (1 - e) + smooth(u) * e;
    const fov = keyed(C.keys, 'fov', u);
    if (mode === 'seat') {
      const yaw = (keyed(C.keys, 'yaw', u) || 0) * DEG, pitch = (keyed(C.keys, 'pitch', u) || 0) * DEG;
      engine.input.lookYaw = yaw; engine.input.lookPitch = pitch;
      cam.position.set(0, 0, 0); cam.rotation.set(pitch, yaw, 0);
    } else {
      place(mode, keyed(C.keys, 'pos', u), v);
      place(lookMode, keyed(C.keys, 'look', u), target);
      M.lookAt(v, target, up); M.setPosition(v);
      const roll = keyed(C.keys, 'roll', u);
      if (roll) M.multiply(inv.makeRotationZ(roll * DEG));
      cam.parent.updateMatrixWorld(true);
      inv.copy(cam.parent.matrixWorld).invert();
      M.premultiply(inv);                                              // the camera hangs from the rider's head: say the pose in that frame
      M.decompose(cam.position, q, s3); cam.quaternion.copy(q);
    }
    if (fov && Math.abs(cam.fov - fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
    cam.getWorldPosition(engine.shared.uCameraPos.value);
  };
  const fade = spec.fade || {}, veil = document.createElement('canvas');
  veil.width = canvas.width; veil.height = canvas.height;
  const g = veil.getContext('2d');
  // The ride's name, lettered as the title screen letters it (src/style.css: .title__name and its small wave), drawn over
  // the picture: "title": { "text", "from": first frame, "in": frames to arrive, "y": 0.4 of the height, "size": 0.09 of it,
  // "color": "#f4efe6", "shade": 0.35 (a soft dark ground behind the lettering, for contrast over a bright sky) }
  const T = spec.title || null, W = veil.width, H = veil.height;
  if (T) { try { await document.fonts.load(`300 ${Math.round(H * (T.size || 0.09))}px "Cormorant Garamond"`, T.text); } catch (e) {} }
  let markTime = 0;
  const letter = (a) => {
    const px = Math.round(H * (T.size || 0.09)), cx = W / 2, cy = H * (T.y ?? 0.4), col = T.color || '#f4efe6';
    // "mark": true draws the ride's drawn mark (src/logo.js) instead of a line of type: its waterline at y, "width" of the picture's width
    if (T.mark) { const w = W * (T.width || 0.62); drawLogo(g, { x: cx - w / 2, y: cy, width: w, ink: col, lamp: T.lamp || '#ffb45e', alpha: a, time: T.still ? 0 : markTime }); return; }
    g.save();
    if (T.shade) {                                                     // a soft oval of the warm black, wide and low
      const rx = px * 6.4, ry = px * 1.9, grd = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grd.addColorStop(0, `rgba(13,11,12,${T.shade * a})`); grd.addColorStop(0.55, `rgba(13,11,12,${T.shade * a * 0.55})`); grd.addColorStop(1, 'rgba(13,11,12,0)');
      g.translate(cx, cy + px * 0.12); g.scale(1, ry / rx); g.translate(-cx, -cy);
      g.fillStyle = grd; g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.globalAlpha = a; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = `${T.weight || 300} ${px}px "Cormorant Garamond", "Iowan Old Style", Palatino, Georgia, serif`;
    try { g.letterSpacing = `${(px * 0.01).toFixed(2)}px`; } catch (e) {}
    g.shadowColor = `rgba(13,11,12,${T.shadow ?? 0.55})`; g.shadowBlur = px * 0.22; g.shadowOffsetY = px * 0.02;
    g.fillText(T.text, cx, cy);
    // the wave under the name: M2 6c5.5-4.6 10.5-4.6 16 0s10.5 4.6 16 0 10.5-4.6 16 0 10.5 4.6 16 0 in a 68 x 12 box, 4.25rem wide under a 4.75rem name
    const w = px * 0.9, k = w / 68, x0 = cx - w / 2, y0 = cy + px * 0.36;
    g.globalAlpha = a * 0.78; g.strokeStyle = col; g.lineWidth = Math.max(1.5, k * 1.3); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0 + 2 * k, y0 + 6 * k);
    let x = 2, y = 6;
    for (const [c1x, c1y, c2x, c2y, ex, ey] of [[5.5, -4.6, 10.5, -4.6, 16, 0], [5.5, 4.6, 10.5, 4.6, 16, 0], [5.5, -4.6, 10.5, -4.6, 16, 0], [5.5, 4.6, 10.5, 4.6, 16, 0]]) {
      g.bezierCurveTo(x0 + (x + c1x) * k, y0 + (y + c1y) * k, x0 + (x + c2x) * k, y0 + (y + c2y) * k, x0 + (x + ex) * k, y0 + (y + ey) * k); x += ex; y += ey;
    }
    g.stroke();
    g.restore();
  };
  // Motion blur: a frame of film is the average of SUB pictures taken through the first SHUTTER of its thirtieth of a second
  // (a half-open shutter, as a film camera's), so rain, snow, petals and the passing water are drawn as they move.
  // &sub=4&shutter=0.5 or "sub" and "shutter" in the shot; 1 = a single sharp picture.
  const SUB = Math.max(1, Math.min(16, Math.round(+(params.get('sub') ?? spec.sub ?? 1)))), SHUTTER = Math.min(1, Math.max(0, +(params.get('shutter') ?? spec.shutter ?? 0.5)));
  const gap = SUB > 1 ? dt * SHUTTER / SUB : 0;                          // seconds between two of a frame's pictures
  const expose = (i) => {                                                // leaves the frame's picture on the veil canvas
    g.globalAlpha = 1; g.fillStyle = fade.color || '#05060a'; g.fillRect(0, 0, W, H);
    for (let j = 0; j < SUB; j++) {
      if (j) { engine.update(gap); dress(); aim(i + j * SHUTTER / SUB); }
      engine.render();
      g.globalAlpha = 1 / (j + 1); g.drawImage(canvas, 0, 0);
    }
    g.globalAlpha = 1;
  };
  const send = async (i) => {
    if (SUB > 1) expose(i); else engine.render();
    let k = 1;
    if (fade.in && i < fade.in) k = Math.min(k, smooth(i / fade.in));
    if (fade.out && i >= frames - fade.out) k = Math.min(k, smooth((frames - 1 - i) / fade.out));
    const ta = T ? smooth(Math.min(1, Math.max(0, (i - (T.from || 0)) / Math.max(1, T.in || 45)))) : 0;
    let source = SUB > 1 ? veil : canvas;
    if (k < 0.999 || ta > 0.001) {
      if (SUB <= 1) { g.globalAlpha = 1; g.fillStyle = fade.color || '#05060a'; g.fillRect(0, 0, W, H); g.drawImage(canvas, 0, 0); }
      // "under": true puts the fade under the lettering: the picture goes to the fade's colour and the name stays on it
      // (the film ends as the ride does, on pale paper with the name)
      const wash = () => { if (k < 0.999) { g.globalAlpha = (1 - k) * (fade.to ?? 1); g.fillStyle = fade.color || '#05060a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } };
      if (fade.under) wash();
      if (ta > 0.001) { markTime = i / fps; letter(ta); }
      if (!fade.under) wash();
      source = veil;
    }
    const blob = await new Promise((r) => source.toBlob(r, 'image/jpeg', 0.95));
    await fetch(`/__shot/film_${name}_${String(i).padStart(4, '0')}.jpg`, { method: 'POST', body: blob });
  };
  aim(0);
  engine.update(1e-4); aim(0);                                           // (the first update eases the head toward the look: say it again)
  engine.render();                                                       // the mirror lags a frame behind a new view
  let drawn = -1;
  // &probe=1: note, for every frame, the numbers that colour the whole picture (to find what makes a shot's light step)
  const probe = params.has('probe') ? [] : null;
  const note = (i) => {
    const sh = engine.shared, pu = engine.post.u, r3 = (c) => (c && c.isColor ? [c.r, c.g, c.b].map((x) => +x.toFixed(4)) : c && c.isVector3 ? [c.x, c.y, c.z].map((x) => +x.toFixed(4)) : typeof c === 'number' ? +c.toFixed(4) : null);
    const o = { i, s: +boat.s.toFixed(2) };
    for (const k of Object.keys(sh)) { const v = sh[k] && sh[k].value; const q = r3(v); if (q !== null && !/Time|CameraPos|Boat|LanternPos/.test(k)) o[k] = q; }
    for (const k of Object.keys(pu)) { const v = pu[k] && pu[k].value; const q = r3(v); if (q !== null && !/Time|time/.test(k)) o['post.' + k] = q; }
    probe.push(o);
  };
  for (let i = 0; i < frames; i++) {
    if (i) {                                                             // the rest of the last frame's thirtieth of a second
      const rest = dt - (drawn === i - 1 ? gap * (SUB - 1) : 0);
      engine.update(rest / 2); aim(i); engine.update(rest / 2);
      if (drifting && (realms.building.size || realms.holding)) await realms.settled();
    }
    dress(); aim(i);
    if (probe) note(i);
    if (only && !only.has(i)) continue;
    if (drawn !== i - 1) engine.render();                                // (the mirror again, after frames that were not drawn)
    await send(i); drawn = i;
  }
  await fetch(`/__shot/film_${name}_done.json`, { method: 'POST', body: JSON.stringify({ name, frames, fps, realm: realms.current.id, from, boat: { s: +boat.s.toFixed(2), d: +boat.d.toFixed(2) }, probe: probe || undefined }) });
  document.title = 'shot done';
}
