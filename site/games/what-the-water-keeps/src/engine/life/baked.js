// Baked animation: any number of copies of a rigged creature, each in its own clip and at its own moment, in ONE draw
// call a form. The clips are baked in Blender into a texture of point positions (tools/blender_lib/qc_vat.py); here
// every copy says which clip it is in, when it began, how fast it runs and which clip it is leaving, as instanced
// attributes, and the vertex shader reads the two rows of the texture either side of its moment. The CPU does nothing
// for a copy that only stands in a loop: it is written once, when the copy is placed or changes clip.
//
//   import { makeBaked } from '../engine/life/baked.js';
//   const birds = await makeBaked(ctx, { file: 'models/life/flamingo_vat.json', count: 300, lod: [34] });
//   birds.set(i, { x, y, z, heading, scale: 1, mirror: false });      // place a copy (realm coordinates; y = where its feet are)
//   birds.play(i, 'sleep', { phase: 0.4, fade: 0 });                  // its clip; a change of clip cross-fades (0.3 s)
//   birds.play(i, 'untuck');  ...  birds.play(i, 'untuck', { reverse: true });      // a clip can be played backward
//   const t = birds.time(i), done = birds.finished(i);                // where it is in its clip (seconds); a once-clip ended
//   birds.clips.takeoff.travel(t, out);                               // where a clip that travels has carried its root by t
//
// It wears the ride's gouache (through `extend`), so a copy takes the realm's light, fog and veil, and is in the mirror.
// What the family page says of it: docs/life/flamingo.md ("Baked animation"). The flamingo's own runtime is flamingo.js.
//
// The files (qc_vat.bake): <stem>_vat.json (the manifest), <stem>_<form>.glb (the mesh without bones; its uv.x is each
// point's column in the texture, uv.y the thickness of the part it belongs to: metres; negative for a blade that is
// part of the trunk while folded; 1 where none was given), <stem>_<form>.vat (the texture, raw
// unsigned 16-bit: r, g, b the point's place across the form's box, a its normal on an octahedron).
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cache = new Map();           // manifest url -> { promise, refs, man, tex: { form: DataTexture } }
const _v = new THREE.Vector3(), _size = new THREE.Vector2();

/** Fetch a manifest and its textures once, however many flocks and realms use them. */
function load(url) {
  const key = url.startsWith('/') || url.startsWith('assets/') || url.startsWith('http') ? url : 'assets/' + url;
  let rec = cache.get(key);
  if (!rec) {
    const dir = key.slice(0, key.lastIndexOf('/') + 1);
    rec = { key, refs: 0, man: null, tex: {}, bytes: 0 };
    rec.promise = fetch(key).then((r) => { if (!r.ok) throw new Error(`baked: ${key}: ${r.status}`); return r.json(); }).then(async (man) => {
      rec.man = man;
      await Promise.all(Object.entries(man.forms).map(async ([name, f]) => {
        const r = await fetch(dir + f.vat);
        if (!r.ok) throw new Error(`baked: ${dir + f.vat}: ${r.status}`);
        const data = new Uint16Array(await r.arrayBuffer());
        if (data.length !== f.width * f.height * 4) throw new Error(`baked: ${f.vat} holds ${data.length} numbers, the manifest says ${f.width} x ${f.height} x 4`);
        const t = new THREE.DataTexture(data, f.width, f.height, THREE.RGBAIntegerFormat, THREE.UnsignedShortType);
        t.internalFormat = 'RGBA16UI'; t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.unpackAlignment = 1;
        t.userData.shared = true;                  // (several realms may hold it: it is freed here, when the last one lets go)
        t.needsUpdate = true;
        rec.tex[name] = t; rec.bytes += data.byteLength;
      }));
      return rec;
    });
    cache.set(key, rec);
    rec.promise.catch(() => { if (cache.get(key) === rec) cache.delete(key); });
  }
  return rec.promise;
}

// ---------------------------------------------------------------------------------------------------- the shader
// (no backticks inside: these are template strings)
const PARS_V = /* glsl */`
  uniform highp usampler2D tVat; uniform vec3 uVatMin, uVatStep; uniform vec2 uVatDim; uniform float uBakedTime, uBakedNeck; uniform vec4 uBakedPx;
  attribute vec4 iPlace, iPose, iClipA, iClipB, iFade;
  centroid varying float vBakedThin; varying float vBakedTint; varying float vBakedCover; varying float vBakedFold;
  #ifdef USE_COLOR
    centroid varying vec3 vBakedInk;
  #endif
  // one point of one baked frame: its place (the creature's own space, metres) and its normal
  void vatRead(float row, float col, out vec3 p, out vec3 n) {
    int c = int(col + 0.5), w = int(uVatDim.x + 0.5);
    uvec4 t = texelFetch(tVat, ivec2(c % w, int(row + 0.5) * int(uVatDim.y + 0.5) + c / w), 0);
    p = uVatMin + vec3(t.rgb) * uVatStep;
    vec2 e = vec2(float(t.a & 255u), float(t.a >> 8u)) / 127.5 - 1.0;
    n = vec3(e, 1.0 - abs(e.x) - abs(e.y));
    float k = max(-n.z, 0.0); n.x += n.x >= 0.0 ? -k : k; n.y += n.y >= 0.0 ? -k : k;
  }
  // a copy's clip at this moment: clip = first row, frame steps (negative: played once and held), the time it began, rows a second
  void vatClip(vec4 clip, float col, out vec3 p, out vec3 n) {
    float steps = abs(clip.y), f = (uBakedTime - clip.z) * clip.w;
    f = clip.y > 0.0 ? mod(f, steps) : clamp(f, 0.0, steps);
    float f0 = min(floor(f), steps - 1.0), k = f - f0;
    vec3 p0, n0, p1, n1; vatRead(clip.x + f0, col, p0, n0); vatRead(clip.x + f0 + 1.0, col, p1, n1);
    p = mix(p0, p1, k); n = mix(n0, n1, k);
  }
  // heading (about the upright: 0 looks toward +z), pitch (nose up), bank (its left wing down). The creature's own space: z forward,
  // y up, x to its left. (The matrices are written column by column: these are a turn of h about y, of -pch about x, of -bnk about z.)
  mat3 bakedTurn(float h, float pch, float bnk) {
    float ch = cos(h), sh = sin(h), cp = cos(pch), sp = sin(pch), cb = cos(bnk), sb = sin(bnk);
    mat3 Ry = mat3(ch, 0.0, -sh, 0.0, 1.0, 0.0, sh, 0.0, ch);
    mat3 Rx = mat3(1.0, 0.0, 0.0, 0.0, cp, -sp, 0.0, sp, cp);
    mat3 Rz = mat3(cb, -sb, 0.0, sb, cb, 0.0, 0.0, 0.0, 1.0);
    return Ry * Rx * Rz;
  }
`;
const LOCAL_V = /* glsl */`
  float bkThin = uv.y == 0.0 ? 1.0 : uv.y, bkMir = iPose.z < 0.0 ? -1.0 : 1.0, bkScale = abs(iPose.z);      // (no thickness given: a broad thing, never treated as thin)
  {
    vec3 pa, na; vatClip(iClipA, uv.x, pa, na);
    float kf = iFade.y > 0.0 ? smoothstep(0.0, iFade.y, uBakedTime - iFade.x) : 1.0;
    if (kf < 0.999) { vec3 pb, nb; vatClip(iClipB, uv.x, pb, nb); pa = mix(pb, pa, kf); na = mix(nb, na, kf); }
    pa.x *= bkMir; na.x *= bkMir;
    mat3 R = bakedTurn(iPlace.w, iPose.x, iPose.y);
    transformed = iPlace.xyz + R * (pa * bkScale);
    // (a mirrored copy is drawn inside out; its normals are turned over here so that the two-sided rule turns them back)
    objectNormal = R * normalize(na + vec3(0.0, 1e-5, 0.0)) * bkMir;
    float open = mix(iFade.w, iFade.z, kf);
    vBakedThin = (bkThin < 0.0 ? mix(0.14, -bkThin, open) : bkThin) * bkScale;
    vBakedFold = bkThin < 0.0 ? 1.0 - open : 0.0;
    vBakedTint = iPose.w;
  }
`;
// a limb is never drawn thinner than most of a pixel (legs, toes, the bill, the upper neck: parts under 6 cm are swollen
// along their normals): thinner, anti-aliasing turns it into a row of dots. But a leg a third of a pixel wide that is
// drawn a whole pixel wide carries three times its ink, and three hundred pairs of them are a pink fence that
// outweighs the birds standing on it. So the swollen limb keeps only the share of its colour that its true width
// would have put in the pixel (vBakedCover); the rest is the air's (the fog's colour: far water and far sky are that).
// Legs dissolve with distance as they do in life, and a far flock is its bodies. Paint is read inside the triangle (centroid).
const WORLD_V = /* glsl */`
  if (!(dot(wn, wn) > 1e-6)) wn = uCameraPos - wp.xyz;
  vBakedCover = 1.0;
  if (bkThin > 0.0 && bkThin < 0.06) {
    float bkDist = max(distance(wp.xyz, uCameraPos), 0.1);
    float bkTrue = bkThin * bkScale * uBakedPx.x / bkDist, bkDrawn = max(bkTrue, uBakedPx.w);
    wp.xyz += normalize(wn) * bkMir * (bkDrawn - bkTrue) * 0.5 * bkDist / uBakedPx.x;
    vBakedCover = mix(bkTrue / bkDrawn, 1.0, smoothstep(0.022, 0.03, bkThin) * uBakedNeck);
  }
  #ifdef USE_COLOR
    vBakedInk = vColor.rgb;
  #endif
`;
const PARS_F = /* glsl */`
  centroid varying float vBakedThin; varying float vBakedTint; varying float vBakedCover; varying float vBakedFold;
  uniform vec4 uBakedPx, uBakedEdge; uniform vec3 uBakedUnder; uniform vec2 uBakedFold; uniform float uBakedCrisp, uBakedNeck; float bkSmall; vec3 bkN0;
  #ifdef USE_COLOR
    centroid varying vec3 vBakedInk;
  #endif
`;
// What is small in the picture is lit as one touch: lit facet by facet a body four pixels long is a scatter of specks
// (at night, of white, blue and black). A limb's normal is turned to the eye. A trunk gets one normal for the whole of
// it (see below): it keeps the dark of standing against the light and loses its facets; its own shade (the lilac of
// its underside) is in its paint and in `under`, so a pale bird far off against a pale ground is still seen by its
// underside. A folded wing shows a blush of its rose (option `fold`), and small in the picture none of its ink:
// never a red dot on every far bird.
const ALBEDO_F = /* glsl */`
  #ifdef USE_COLOR
    albedo = uColor * clamp(vBakedInk, 0.0, 1.0);
  #endif
  albedo *= vBakedTint;
  bkSmall = 1.0 - smoothstep(uBakedPx.y, uBakedPx.z, vBakedThin * uBakedPx.x / max(length(vViewPos), 0.1));
  albedo = mix(albedo, uColor * vBakedTint * vec3(0.70, 0.60, 0.62), vBakedFold * mix(uBakedFold.x, uBakedFold.y, bkSmall));
  bkN0 = N;
  {
    vec3 bkEye = normalize(uCameraPos - vWPos);
    float bkLimb = 1.0 - smoothstep(0.045, 0.10, vBakedThin);
    albedo *= mix(vec3(1.0), uBakedUnder, bkSmall * (1.0 - bkLimb) * smoothstep(0.6, -0.2, N.y));      // what faces down keeps its shade when the light no longer models it
    // a neck that is a pixel wide or less is one stroke. Where the air is pale (the fog's colour: a white mist, a bright day,
    // first light) it takes most of that shade all along it: a far neck drawn in its light is a white hair on a white sky, which
    // is no neck, and the long line of a flying bird is its neck. Where the air is dark (dusk, night) it stays in its light
    float bkPx = vBakedThin * uBakedPx.x / max(length(vViewPos), 0.1);
    albedo *= mix(vec3(1.0), uBakedUnder, uBakedNeck * bkLimb * smoothstep(0.022, 0.03, vBakedThin) * (1.0 - smoothstep(1.0, 2.4, bkPx)) * smoothstep(0.25, 0.6, dot(uFogColor, vec3(0.3, 0.6, 0.1))));
    // the one touch of a trunk: where it faces the light it is mostly its own colour with a breath of the light's (what the
    // lit and unlit facets of a near bird come to, taken together: the ramp's middle step), and where it stands against
    // the light it is in the ramp's shade. The normal is BUILT to land on those steps, whatever the realm's ramp is
    vec3 bkK = -normalize(uKeyDir), bkCalm = normalize(vec3(bkEye.x, 0.0, bkEye.z) * 0.6 + vec3(0.0, 0.8, 0.0));
    float bkD = mix(-0.75, 0.4, smoothstep(-0.5, 0.3, dot(bkCalm, bkK)));
    vec3 bkUp = vec3(0.0, 1.0, 0.0) - bkK * bkK.y;
    bkUp = dot(bkUp, bkUp) > 1e-4 ? normalize(bkUp) : vec3(1.0, 0.0, 0.0);
    N = normalize(mix(N, mix(bkK * bkD + bkUp * sqrt(1.0 - bkD * bkD), bkEye, bkLimb), bkSmall * 0.92));
  }
`;
// near by, where a form turns away from the eye it takes a breath of shade: the soft edge a painter gives a pale thing on a pale ground
const LIGHT_F = /* glsl */`
  c *= mix(vec3(1.0), uBakedEdge.rgb, uBakedEdge.a * (1.0 - bkSmall) * pow(1.0 - clamp(abs(dot(bkN0, V)), 0.0, 1.0), 2.0));
`;
const FOG_F = /* glsl */`
  fog = 1.0 - (1.0 - fog) * vBakedCover;
`;
// and keeps out of the painter's filter by as much (the engine's mark in the picture's alpha: src/engine/gouache.js, post.js)
const FINAL_F = /* glsl */`
  if (uBakedCrisp > 0.5 && bkSmall > 0.0) gl_FragColor.a = bkSmall > 0.995 ? -15.0 : 0.5 - 1.55 * bkSmall;
`;

/**
 * Copies of a baked creature.
 *
 * options:
 *   file          the manifest, under assets/ ('models/life/flamingo_vat.json')
 *   count         how many copies there may be (each is hidden until it is set)
 *   forms         which of the file's forms to use, nearest first (default: all of them, in the file's order)
 *   lod           [metres, ...]: where the eye is nearer than lod[0] a copy wears the first form, beyond it the second,
 *                 and so on (default: every copy wears the first form). A copy changes form with a little slack
 *                 either way (hysteresis 0.1), at most `lodBatch` copies looked at a frame (96)
 *   material      gouache options (color, brush, shade, rim, ...) and `extend` (your own GLSL, placed after this
 *                 file's vertex work and paint and before its last word on the picture's alpha)
 *   gouache       (options) => material: make the material yourself (an area with a light of its own: sky.paint);
 *                 it must pass the options it is given on to kit.gouache
 *   under         a colour that multiplies whatever faces DOWN on a trunk that is small in the picture ('#a9a4c8': a lilac
 *                 underside for a pale creature, which far off is seen by its underside and nothing else); default none
 *   neck          0..1 (0.85): a limb between 3 and 10 cm thick (a neck, a head) keeps its whole ink however thin it is in the
 *                 picture (legs, toes and bills dissolve with distance; a neck is the line a far bird is known by), and once
 *                 it is a pixel wide or less it takes this much of `under` all along it wherever the air is pale (the fog's
 *                 colour lighter than a mid grey): a pale neck on a pale sky is drawn by its shade. 0: neither
 *   fold          [near, far]: how far the paint of a FOLDED wing (and tail) is taken toward a pale rose-white, near by and
 *                 when it is small in the picture ([0.35, 0.8] for the flamingo: folded, its wing is a blush and never a
 *                 red patch; open, it is itself); default [0, 0]
 *   edge          true or { color: '#c8c2e0', strength: 0.5 }: near by, where a form turns away from the eye its light is
 *                 multiplied toward this colour: a soft edge for a pale thing on a pale ground; default none
 *   crisp         true (default): parts that are small in the picture keep out of the painter's filter, by their size
 *   open          names of the clips in which wings are spread (their feathers are then blades, not part of the trunk);
 *                 default: the manifest's own flags
 *   prePass       true (default), false, or one a form ([true, false]): whether it is drawn in the engine's picture
 *                 of the scene without the water (a third less to draw; a far thing that is left out is not seen
 *                 through the water and is never painted, which is right for a small far bird)
 *   only          'mirror' | 'direct' (ctx.only);  parent: a group of the realm's (unmoved) to put it in
 *
 * The handle:
 *   set(i, { x, y, z, heading, pitch, bank, scale, mirror, tint, hidden, form })    place copy i (what is left out stays)
 *   move(i, x, y, z, heading, pitch, bank)                                         the same, quickly, for a copy that travels
 *   play(i, clip, { fade = 0.3, at (seconds), phase (0..1), rate = 1, reverse })   change its clip
 *   clipOf(i), time(i), finished(i), rate(i, r)                                    its clip's name; seconds into it; a
 *                                                                                  once-clip has ended; change its speed
 *   clips[name]   { seconds, loop, fps, frames, events, tracks, travel(t, out), track(marker, t, out), end }
 *   now           the clock every clip runs on (seconds; it advances with the realm)
 *   count, object, meshes, formOf(i), stats(), memory
 */
export async function makeBaked(ctx, options = {}) {
  const o = { count: 1, lod: [], hysteresis: 0.1, lodBatch: 96, material: {}, crisp: true, prePass: true, ...options };
  if (!o.file) throw new Error('makeBaked: give the manifest (file)');
  const engine = ctx.engine, rec = await load(o.file), man = rec.man;
  rec.refs++;
  ctx.onDispose(() => { if (--rec.refs <= 0) { cache.delete(rec.key); for (const t of Object.values(rec.tex)) t.dispose(); } });
  const names = (o.forms || Object.keys(man.forms)).filter((n) => man.forms[n]);
  if (!names.length) throw new Error(`makeBaked: ${o.file} has none of the forms asked for`);
  const n = Math.max(1, Math.floor(o.count)), dir = rec.key.slice(0, rec.key.lastIndexOf('/') + 1);
  const group = new THREE.Group(); group.name = `baked:${names.join('+')} x${n}`;
  (o.parent || ctx.group).add(group);
  const clock = { value: 0 };
  const opens = new Set(o.open || Object.keys(man.clips).filter((c) => man.clips[c].open));

  // ---- the clips, as the ride reads them
  const clips = {};
  for (const [name, c] of Object.entries(man.clips)) {
    const tr = c.travel, rows = c.frames + 1;
    const lerpRow = (list, t, out) => {
      const f = clamp(t * c.fps, 0, c.frames), i = Math.min(c.frames - 1, Math.floor(f)), k = f - i, a = list[i], b = list[i + 1];
      return out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    };
    clips[name] = {
      name, row: c.row, frames: c.frames, fps: c.fps, seconds: c.seconds, loop: !!c.loop, open: opens.has(name), events: c.events || [], tracks: c.tracks || {}, rows,
      travels: !!tr, end: tr ? new THREE.Vector3(...tr[tr.length - 1]) : new THREE.Vector3(),
      /** Where the clip has carried the creature's root by t seconds, in the creature's own space (x to its left, y up, z forward). */
      travel(t, out = new THREE.Vector3()) { return tr ? lerpRow(tr, t, out) : out.set(0, 0, 0); },
      /** Where a marker (a bone named when the clip was baked: the bill's tip, a foot) is at t seconds, in the creature's own space. */
      track(marker, t, out = new THREE.Vector3()) { const list = c.tracks && c.tracks[marker]; return list ? lerpRow(list, t, out) : out.set(0, 0, 0); },
    };
  }

  // ---- every copy's state (the master copy), and for each form its own packed lists
  const place = new Float32Array(n * 4), pose = new Float32Array(n * 4), clipA = new Float32Array(n * 4), clipB = new Float32Array(n * 4), fade = new Float32Array(n * 4);
  const formOf = new Int8Array(n).fill(-1), slot = new Int32Array(n).fill(-1), forced = new Int8Array(n).fill(-1), shown = new Uint8Array(n), clipName = new Array(n).fill(null);
  for (let i = 0; i < n; i++) { pose[i * 4 + 2] = 0; pose[i * 4 + 3] = 1; clipA[i * 4 + 1] = -1; clipB[i * 4 + 1] = -1; clipA[i * 4 + 3] = 1; clipB[i * 4 + 3] = 1; }
  const calm = !!ctx.reducedMotion, low = (ctx.quality && ctx.quality.density || 1) < 0.7;
  const lodAt = o.lod.map((d) => d * (low ? 0.6 : 1));
  const forms = [];
  const sharedU = { uBakedTime: clock };
  const baseOf = async (f) => {
    // (kit.model fetches and parses the file once, counts it, and frees it with the last realm that used it)
    const m = await ctx.kit.model(dir + f.glb, { name: 'baked:' + f.glb });
    m.group.removeFromParent();
    return m.body.geometry;
  };
  const inPre = (k) => (Array.isArray(o.prePass) ? o.prePass[k] !== false : o.prePass !== false);
  const edge = o.edge ? (o.edge === true ? {} : o.edge) : null, edgeC = new THREE.Color(edge && edge.color || '#c8c2e0');
  for (let k = 0; k < names.length; k++) {
    const f = man.forms[names[k]], base = await baseOf(f);
    if (!base.attributes.uv) throw new Error(`makeBaked: ${f.glb} has no UVs (qc_vat writes each point's number there)`);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    for (const a of ['position', 'normal', 'color', 'uv']) if (base.attributes[a]) geo.setAttribute(a, base.attributes[a]);
    const arr = {};
    for (const a of ['iPlace', 'iPose', 'iClipA', 'iClipB', 'iFade']) { arr[a] = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); arr[a].setUsage(THREE.DynamicDrawUsage); geo.setAttribute(a, arr[a]); }
    geo.instanceCount = 0;
    const uniforms = {
      ...sharedU, tVat: { value: rec.tex[names[k]] }, uVatMin: { value: new THREE.Vector3(...f.min) },
      uVatStep: { value: new THREE.Vector3((f.max[0] - f.min[0]) / 65535, (f.max[1] - f.min[1]) / 65535, (f.max[2] - f.min[2]) / 65535) },
      uVatDim: { value: new THREE.Vector2(f.width, f.rowsPerFrame) }, uBakedPx: { value: new THREE.Vector4(935, 5, 9, 0.85) }, uBakedCrisp: { value: 0 },
      uBakedNeck: { value: o.neck ?? 0.85 }, uBakedUnder: { value: new THREE.Color(o.under ?? '#ffffff') }, uBakedFold: { value: new THREE.Vector2(...(o.fold || [0, 0])) }, uBakedEdge: { value: new THREE.Vector4(edgeC.r, edgeC.g, edgeC.b, edge ? edge.strength ?? 0.5 : 0) },
    };
    const { extend: more, ...paint } = o.material || {};
    const opts = { brush: 0.35, ...paint, vertexColors: true, side: THREE.DoubleSide,
      extend: [{ uniforms, vertexPars: PARS_V, vertexLocal: LOCAL_V, vertexWorld: WORLD_V, fragmentPars: PARS_F, albedo: ALBEDO_F, light: LIGHT_F, fog: FOG_F }, ...[].concat(more || []), { final: FINAL_F }] };
    const mat = o.gouache ? o.gouache(opts) : ctx.kit.gouache(opts);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `baked:${names[k]}`; mesh.frustumCulled = false;
    const F = { name: names[k], mesh, geo, mat, arr, list: new Int32Array(n), len: 0, dirty: false, triangles: f.triangles, points: f.points, pre: inPre(k) };
    mesh.onBeforeRender = (renderer, scene, camera, geometry, material) => {
      const rt = renderer.getRenderTarget(), h = rt ? rt.height : renderer.getDrawingBufferSize(_size).y, u = material.uniforms;
      const picture = !engine.reflecting && !(rt && rt === engine.pre), brush = (engine.paintRadius || 4.5) * h / 1080;
      u.uBakedPx.value.set(h * 0.5 * camera.projectionMatrix.elements[5], brush * 1.1, brush * 2, ctx.quality && ctx.quality.samples === 0 ? 1.25 : 0.85);
      u.uBakedCrisp.value = o.crisp && picture && (engine.paintAmount || 0) > 0.01 && !material.transparent ? 1 : 0;
      material.uniformsNeedUpdate = true;
      geometry.instanceCount = !F.pre && rt && rt === engine.pre ? 0 : F.len;
    };
    group.add(mesh);
    forms.push(F);
  }
  if (o.only) ctx.only(group, o.only);

  const writeTo = (F, s, i) => {
    const a = i * 4, b = s * 4;
    for (let k = 0; k < 4; k++) { F.arr.iPlace.array[b + k] = place[a + k]; F.arr.iPose.array[b + k] = pose[a + k]; F.arr.iClipA.array[b + k] = clipA[a + k]; F.arr.iClipB.array[b + k] = clipB[a + k]; F.arr.iFade.array[b + k] = fade[a + k]; }
    F.dirty = true;
  };
  const leave = (i) => {
    const k = formOf[i]; if (k < 0) return;
    const F = forms[k], s = slot[i], last = F.list[F.len - 1];
    if (s !== F.len - 1) { F.list[s] = last; slot[last] = s; writeTo(F, s, last); }
    F.len--; formOf[i] = -1; slot[i] = -1; F.dirty = true;
  };
  const enter = (i, k) => { const F = forms[k]; F.list[F.len] = i; slot[i] = F.len; formOf[i] = k; F.len++; writeTo(F, slot[i], i); };
  const sync = (i) => { const k = formOf[i]; if (k >= 0) writeTo(forms[k], slot[i], i); };
  const eye = new THREE.Vector3();
  const wanted = (i, was) => {
    if (forced[i] >= 0) return Math.min(forms.length - 1, forced[i]);
    if (forms.length < 2 || !lodAt.length) return 0;
    const d = Math.hypot(place[i * 4] - eye.x, place[i * 4 + 1] - eye.y, place[i * 4 + 2] - eye.z);
    let k = 0;
    while (k < lodAt.length && k < forms.length - 1 && d > lodAt[k] * (was > k ? 1 - o.hysteresis : 1 + o.hysteresis)) k++;
    return k;
  };
  const show = (i) => {
    const want = shown[i] ? wanted(i, formOf[i]) : -1;
    if (want === formOf[i]) return;
    leave(i); if (want >= 0) enter(i, want);
  };

  // ---- every frame: the clock; a few copies looked at for their form; what changed is sent to the GPU
  let cursor = 0;
  ctx.onUpdate((dt) => {
    clock.value += dt;
    eye.copy(engine.shared.uCameraPos.value); ctx.group.worldToLocal(eye);
    if (forms.length > 1) for (let c = Math.min(n, o.lodBatch); c > 0; c--) { cursor = (cursor + 1) % n; if (shown[cursor]) show(cursor); }
    for (const F of forms) if (F.dirty) { F.dirty = false; for (const a of Object.values(F.arr)) { a.clearUpdateRanges(); a.addUpdateRange(0, Math.max(4, F.len * 4)); a.needsUpdate = true; } }
  });

  const frameOf = (i) => {                               // rows into its clip, as the shader has it
    const a = i * 4, steps = Math.abs(clipA[a + 1]); let f = (clock.value - clipA[a + 2]) * clipA[a + 3];
    return clipA[a + 1] > 0 ? ((f % steps) + steps) % steps : clamp(f, 0, steps);
  };
  const handle = {
    object: group, meshes: forms.map((F) => F.mesh), forms: forms.map((F) => F.name), count: n, clips, manifest: man, uniforms: sharedU,
    get now() { return clock.value; },
    /** Place copy i, or change something about it: { x, y, z, heading, pitch, bank, scale, mirror, tint, hidden, form }. */
    set(i, s) {
      const a = i * 4;
      if (s.x != null) place[a] = s.x; if (s.y != null) place[a + 1] = s.y; if (s.z != null) place[a + 2] = s.z; if (s.heading != null) place[a + 3] = s.heading;
      if (s.pitch != null) pose[a] = s.pitch; if (s.bank != null) pose[a + 1] = s.bank;
      let sc = Math.abs(pose[a + 2]) || 1, mir = pose[a + 2] < 0;
      if (s.scale != null) sc = s.scale; if (s.mirror != null) mir = !!s.mirror;
      pose[a + 2] = mir ? -sc : sc;
      if (s.tint != null) pose[a + 3] = s.tint;
      if (s.form !== undefined) forced[i] = s.form == null ? -1 : typeof s.form === 'number' ? s.form : Math.max(0, forms.findIndex((F) => F.name === s.form));
      if (s.hidden != null) shown[i] = s.hidden ? 0 : 1; else if (s.x != null) shown[i] = 1;          // (a copy is hidden until it is first given a place)
      show(i); sync(i);
      return handle;
    },
    /** The same for a copy that travels, every frame: where it is, its heading, its pitch (nose up) and bank (left wing down), radians. */
    move(i, x, y, z, heading, pitch = 0, bank = 0) {
      const a = i * 4; place[a] = x; place[a + 1] = y; place[a + 2] = z; place[a + 3] = heading; pose[a] = pitch; pose[a + 1] = bank;
      const k = formOf[i];
      if (k >= 0) { const F = forms[k], b = slot[i] * 4, P = F.arr.iPlace.array, Q = F.arr.iPose.array; P[b] = x; P[b + 1] = y; P[b + 2] = z; P[b + 3] = heading; Q[b] = pitch; Q[b + 1] = bank; F.dirty = true; }
    },
    hide(i) { shown[i] = 0; show(i); return handle; },
    /** Change copy i's clip. fade: seconds of cross-fade from what it was doing (0.3); at: seconds into the clip to begin at; phase: the same as
     *  0..1 of its length; rate: its speed (1); reverse: played backward, from its end (or from `at`). */
    play(i, name, p = {}) {
      const c = clips[name];
      if (!c) { console.error(`INVALID_CLIP baked: ${o.file} has no clip "${name}" (it has: ${Object.keys(clips).join(', ')})`); return handle; }
      const a = i * 4, now = clock.value, rate = c.fps * (p.rate ?? 1) * (p.reverse ? -1 : 1);
      const f0 = p.at != null ? p.at * c.fps : p.phase != null ? p.phase * c.frames : p.reverse ? c.frames : 0;
      const had = clipName[i] != null;
      for (let k = 0; k < 4; k++) clipB[a + k] = clipA[a + k];
      fade[a] = now; fade[a + 1] = had ? (p.fade ?? 0.3) : 0; fade[a + 3] = had ? fade[a + 2] : (c.open ? 1 : 0); fade[a + 2] = c.open ? 1 : 0;
      clipA[a] = c.row; clipA[a + 1] = c.loop ? c.frames : -c.frames; clipA[a + 2] = now - f0 / rate; clipA[a + 3] = rate;
      clipName[i] = name;
      sync(i);
      return handle;
    },
    /** Change the speed of copy i's clip from now on (1 = as baked), keeping its place in the clip. */
    rate(i, r) {
      const a = i * 4, c = clips[clipName[i]]; if (!c) return handle;
      const f = (clock.value - clipA[a + 2]) * clipA[a + 3], rate = c.fps * r * (clipA[a + 3] < 0 ? -1 : 1);
      clipA[a + 2] = clock.value - f / rate; clipA[a + 3] = rate; sync(i);
      return handle;
    },
    clipOf(i) { return clipName[i]; },
    /** Seconds into its clip (of the clip's own time, as baked). */
    time(i) { const c = clips[clipName[i]]; return c ? frameOf(i) / c.fps : 0; },
    /** A clip that is played once has reached its end (or, played backward, its beginning). */
    finished(i) { const a = i * 4; if (clipA[a + 1] > 0) return false; const f = (clock.value - clipA[a + 2]) * clipA[a + 3]; return clipA[a + 3] > 0 ? f >= -clipA[a + 1] : f <= 0; },
    formOf(i) { return formOf[i] < 0 ? null : forms[formOf[i]].name; },
    position(i, out = new THREE.Vector3()) { return out.set(place[i * 4], place[i * 4 + 1], place[i * 4 + 2]); },
    heading(i) { return place[i * 4 + 3]; },
    /** How many copies wear each form now, and the triangles that makes in one pass. */
    stats() { const out = { triangles: 0 }; for (const F of forms) { out[F.name] = F.len; out.triangles += F.len * F.triangles; } return out; },
    /** What the baked textures hold on the GPU, megabytes (eight bytes a point a row), and what the per-copy attributes hold. */
    memory: { textureMB: +(rec.bytes / 1048576).toFixed(2), instanceMB: +(n * 80 * forms.length / 1048576).toFixed(3), rows: man.rows, points: Object.fromEntries(names.map((k) => [k, man.forms[k].points])) },
    calm,
  };
  return handle;
}
