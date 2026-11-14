// Shared shading for the whole garden. One Lambert-based material family with shader injection:
//  - lantern light from the light field texture (see lightfield.js): shadowed pools, sampled in front of wall faces
//  - a cool rim on the moon side, so dark things keep a readable edge at night
//  - baked ambient occlusion near walls
//  - height mist: everything below the floor dissolves into the backdrop that is drawn behind it
//  - procedural surface detail per kind (paver, hedge, curb, stone, earth, lantern paper, moth fuzz, grass)
//  - the hedge shape itself: a rounded block that fuses with its wall neighbours (see HEDGE_VERT)
// All materials share the uniform objects in `G`, so one write per frame updates every shader.
import * as THREE from 'three';
import { PALETTE, WALL } from '../config.js';

export const G = {
  uTime: { value: 0 },
  uLightMap: { value: null },
  uAoMap: { value: null },
  uFieldRect: { value: new THREE.Vector4(0, 0, 1, 1) },   // minX, minZ, 1/sizeX, 1/sizeZ
  uBackdrop: { value: null },                              // low-resolution backdrop (sqrt-encoded linear colour)
  uInvRes: { value: new THREE.Vector2(1, 1) },             // 1 / drawing buffer size
  uMistRange: { value: new THREE.Vector2(-3.4, -0.45) },   // fully dissolved below x, clear above y
  uWarm: { value: 0 },                                     // 0..1 share of lit lanterns
  uPulse: { value: new THREE.Vector4(0, 0, -10, 0) },      // x, z, radius, strength of the celebration wave
  uWind: { value: 1 },
  uMoth: { value: new THREE.Vector3(0, 0, 0) },            // moth x, z and 1 when it walks on the ground
  uMoonV: { value: new THREE.Vector3(-0.5, 0.6, 0.6) },    // direction to the moon in view space
  uRim: { value: new THREE.Color(PALETTE.rim) },
};

// The hedge is one grid-cube per wall cell. Its vertices are placed here: a rounded block that reaches into the
// neighbouring wall cells (so a run of walls is one continuous clipped hedge), with soft lumps in world space.
// The same code runs in the shadow pass, so the shadow matches the shape.
const HEDGE_VERT = /* glsl */`
attribute vec4 aNbr;     // +x, -x, +z, -z: 0 = open air, 1..2 = wall neighbour (1 + how much the tops are fused)
attribute float aH;      // height of this hedge above its curb
attribute vec4 aDiag;    // 1 when the diagonal neighbour (+x+z, -x+z, +x-z, -x-z) is a wall too
float hHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float hNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hHash(i), hHash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hHash(i + vec3(0.0, 1.0, 0.0)), hHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hHash(i + vec3(0.0, 0.0, 1.0)), hHash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hHash(i + vec3(0.0, 1.0, 1.0)), hHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
vec3 hedgeShape(vec3 c, vec3 faceN, vec3 origin, out vec3 n) {
  const float E0 = ${WALL.hedgeHalf.toFixed(3)}, R = 0.085;
  vec4 wall = step(0.5, aNbr), fuse = clamp(aNbr - 1.0, 0.0, 1.0);
  vec4 ext = mix(vec4(E0), vec4(0.515), wall), rad = R * (1.0 - fuse * wall);
  float rt = min(R, aH * 0.6);
  vec3 q = vec3(c.x * (c.x > 0.0 ? ext.x : ext.y), c.y * aH, c.z * (c.z > 0.0 ? ext.z : ext.w));
  // The inner corner of an L-shaped run stays at the hedge's own width: without this a small nub sticks out there.
  float dg = c.x > 0.0 ? (c.z > 0.0 ? aDiag.x : aDiag.z) : (c.z > 0.0 ? aDiag.y : aDiag.w);
  vec3 fn = faceN;
  if ((c.x > 0.0 ? wall.x : wall.y) > 0.5 && (c.z > 0.0 ? wall.z : wall.w) > 0.5 && dg < 0.5 && abs(q.x) > E0 - 1e-3 && abs(q.z) > E0 - 1e-3) {
    if (abs(q.x) > E0 + 1e-3 && abs(q.z) > E0 + 1e-3) q.xz = sign(q.xz) * E0;
    if (abs(faceN.y) < 0.5) fn = vec3(sign(c.x) * abs(faceN.z), 0.0, sign(c.z) * abs(faceN.x));   // the folded strip faces the other way
  }
  vec3 lo = vec3(-(ext.y - rad.y), 0.0, -(ext.w - rad.w)), hi = vec3(ext.x - rad.x, aH - rt, ext.z - rad.z);
  vec3 inner = clamp(q, lo, hi), d = q - inner;
  vec3 rv = vec3(max(c.x > 0.0 ? rad.x : rad.y, 1e-4), max(rt, 1e-4), max(c.z > 0.0 ? rad.z : rad.w, 1e-4));
  vec3 u = d / rv; float ul = length(u);
  vec3 p = inner; n = fn;
  if (ul > 1e-3) { vec3 dir = u / ul; p += dir * rv; n = normalize(dir / rv * min(rv.x, min(rv.y, rv.z))); }
  // Lumps: the same noise for every hedge, in world space, so fused neighbours meet without a seam.
  vec3 w = vec3(origin.x, 0.0, origin.z) + p;
  float lump = hNoise(w * vec3(3.1, 3.7, 3.1)) - 0.5, fine = hNoise(w * 8.3 + 5.0) - 0.5;
  float grow = smoothstep(0.0, 0.07, p.y);
  p += n * (lump * (0.024 + 0.05 * smoothstep(0.12, 0.5, aH)) + fine * 0.012) * grow;
  n = normalize(n + (vec3(hNoise(w * 6.1 + 3.0), hNoise(w * 6.1 + 11.0), hNoise(w * 6.1 + 19.0)) - 0.5) * 0.55 * grow);
  return p;
}
`;

const PARS_VERT = /* glsl */`
varying vec3 vWPos; varying vec3 vWNormal; varying vec3 vLPos;
uniform float uTime; uniform float uWind; uniform vec3 uMoth;
#ifdef LANTERN
attribute float aLit; varying float vLit;
#endif
#ifdef HEDGE
${HEDGE_VERT}
varying float vHedgeH;
#endif
`;

const NORMAL_VERT = /* glsl */`
#ifdef HEDGE
vec3 hedgeN; vec3 hedgeP = hedgeShape(position, normal, instanceMatrix[3].xyz, hedgeN);
objectNormal = hedgeN;
#endif
`;

const BEGIN_VERT = /* glsl */`
#ifdef HEDGE
{
  transformed = hedgeP; vHedgeH = aH;
  // Leaves breathe a little in the wind. Stronger at the top of the hedge.
  vec3 ip = instanceMatrix[3].xyz + hedgeP;
  float k = smoothstep(0.05, 0.6, hedgeP.y) * 0.02 * uWind;
  transformed.x += sin(uTime * 1.3 + ip.x * 1.9 + ip.z * 2.3 + hedgeP.y * 5.0) * k;
  transformed.z += cos(uTime * 1.1 + ip.z * 2.1 - ip.x * 1.7 + hedgeP.y * 4.0) * k;
}
#endif
vLPos = transformed;
#ifdef GRASS
{
  // Blades sway in the wind and lean away from the moth when it walks by.
  vec4 ip = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  ip = instanceMatrix * ip;
  #endif
  float k = position.y * position.y * 22.0;
  vec2 away = ip.xz - uMoth.xy; float dm = length(away);
  vec2 bend = away / max(dm, 1e-3) * (1.0 - smoothstep(0.2, 0.8, dm)) * 0.11 * uMoth.z;
  transformed.x += (sin(uTime * 1.9 + ip.x * 3.1 + ip.z * 2.3) * 0.03 * uWind + bend.x) * k;
  transformed.z += (cos(uTime * 1.6 + ip.z * 2.9 - ip.x * 1.3) * 0.03 * uWind + bend.y) * k;
}
#endif
#ifdef LANTERN
vLit = aLit;
#endif
`;

const WORLD_VERT = /* glsl */`
{
  vec4 gWP = vec4(transformed, 1.0); vec3 gN = objectNormal;
  #ifdef USE_INSTANCING
  gWP = instanceMatrix * gWP; gN = mat3(instanceMatrix) * gN;
  #endif
  gWP = modelMatrix * gWP; vWPos = gWP.xyz; vWNormal = normalize(mat3(modelMatrix) * gN);
}
`;

const PARS_FRAG = /* glsl */`
varying vec3 vWPos; varying vec3 vWNormal; varying vec3 vLPos;
uniform sampler2D uLightMap; uniform sampler2D uAoMap; uniform vec4 uFieldRect;
uniform sampler2D uBackdrop; uniform vec2 uInvRes;
uniform vec2 uMistRange; uniform float uTime; uniform float uWarm; uniform vec4 uPulse;
uniform vec3 uMoonV; uniform vec3 uRim;
#ifdef LANTERN
varying float vLit;
#endif
#ifdef HEDGE
varying float vHedgeH;
#endif
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y); }
// Small round leaves: x = how close to a leaf centre (1 at the centre), y = a random value per leaf.
vec2 gLeaves(vec2 p) { vec2 gi = floor(p), gf = fract(p); float md = 4.0, id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)), h = gi + o;
    vec2 r = o + vec2(gHash(h), gHash(h + 17.3)) - gf; float d = dot(r, r); if (d < md) { md = d; id = gHash(h + 5.1); } }
  return vec2(1.0 - smoothstep(0.0, 0.62, sqrt(md)), id); }
`;

const SURFACE_FRAG = /* glsl */`
#ifdef PAVER
{
  // Old flagstones: soft blotches, fine grain, worn darker edges, moss creeping in from the joints.
  float blot = gNoise(vWPos.xz * 1.7 + 7.0), grain = gNoise(vWPos.xz * 34.0), mid = gNoise(vWPos.xz * 7.0 + 2.0);
  diffuseColor.rgb *= 0.86 + 0.16 * blot + 0.07 * grain + 0.06 * mid;
  vec2 c = abs(vLPos.xz);
  float edge = smoothstep(0.33, 0.475, max(c.x, c.y));
  diffuseColor.rgb *= 1.0 - 0.22 * edge * (0.5 + 0.5 * mid);
  float moss = edge * smoothstep(0.5, 0.82, gNoise(vWPos.xz * 5.0 + 3.0) * 0.6 + gNoise(vWPos.xz * 21.0) * 0.4) * step(0.5, vWNormal.y);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${col(PALETTE.paverMoss)}) * (0.85 + 0.3 * grain), moss * 0.6);
  // A hairline crack on some stones.
  vec2 tile = floor(vWPos.xz - vLPos.xz + 0.5); float th = gHash(tile + 3.0), tq = gHash(tile + 11.0);
  vec2 cp = tq > 0.5 ? vLPos.xz : vLPos.zx; cp.x *= th > 0.86 ? -1.0 : 1.0;
  float crack = 1.0 - smoothstep(0.0, 0.008, abs(cp.x * (0.5 + tq) + cp.y * (0.9 - tq) + 0.06 * sin(cp.y * (7.0 + 9.0 * tq) + th * 40.0) - 0.25 * (tq - 0.5)));
  diffuseColor.rgb *= 1.0 - 0.2 * crack * step(0.78, th);
}
#endif
#ifdef HEDGE
{
  // Clipped box foliage: many small leaves, darker between them, paler where they face the sky, dark at the foot.
  vec3 an = abs(vWNormal);
  vec2 uvw = an.y > 0.62 ? vWPos.xz : (an.x > an.z ? vWPos.zy : vWPos.xy);
  vec2 lf = gLeaves(uvw * 17.0 + gNoise(uvw * 7.0) * 0.9), lf2 = gLeaves(uvw * 7.0 + 31.0);
  float sky = smoothstep(-0.1, 1.0, vWNormal.y);
  float foot = mix(0.55, 1.0, smoothstep(0.0, 0.3, vLPos.y)) * mix(0.8, 1.0, smoothstep(0.0, 0.09, vLPos.y));
  float tone = 0.86 + 0.28 * gNoise(vWPos.xz * 1.1 + vWPos.y * 0.7 + 4.0);
  vec3 c = diffuseColor.rgb * tone * (0.6 + 0.4 * lf.x) * (0.84 + 0.32 * lf.y) * (0.88 + 0.2 * lf2.x);
  c = mix(c, vec3(${col(PALETTE.hedgeTip)}), lf.x * lf.x * sky * sky * (0.02 + 0.13 * lf.y * lf.y));
  diffuseColor.rgb = c * foot * mix(0.7, 1.06, sky);
}
#endif
#ifdef CURB
{
  // Cut stone coping under every hedge: pale blocks with a worn grain and lichen along the top.
  float grain = gNoise(vWPos.xz * 31.0 + vWPos.y * 43.0), blot = gNoise(vWPos.xz * 2.1 + vWPos.y * 3.0 + 3.0);
  vec3 stone = diffuseColor.rgb * (0.84 + 0.2 * blot + 0.08 * grain);
  float course = 1.0 - smoothstep(0.0, 0.012, abs(vLPos.y + 0.075));
  stone *= 1.0 - 0.25 * course * (1.0 - step(0.5, vWNormal.y));
  float lichen = smoothstep(0.55, 0.8, gNoise(vWPos.xz * 6.0 + vWPos.y * 9.0)) * smoothstep(-0.12, 0.0, vLPos.y);
  diffuseColor.rgb = mix(stone, vec3(${col(PALETTE.paverMoss)}) * (0.8 + 0.3 * grain), lichen * 0.45);
}
#endif
#ifdef STONE
{
  // Carved granite: speckle, a soft blotch, and darker cut grooves around the dish.
  float grain = gNoise(vWPos.xz * 47.0 + vWPos.y * 61.0), blot = gNoise(vWPos.xz * 3.3 + 9.0);
  diffuseColor.rgb *= 0.84 + 0.16 * blot + 0.12 * grain;
  float rr = length(vLPos.xz);
  float groove = (1.0 - smoothstep(0.0, 0.011, abs(rr - 0.297))) * step(0.5, vWNormal.y);
  float notch = (1.0 - smoothstep(0.0, 0.012, abs(vLPos.y - 0.048))) * (1.0 - step(0.5, vWNormal.y));
  diffuseColor.rgb *= 1.0 - 0.45 * max(groove, notch);
  diffuseColor.rgb *= mix(0.8, 1.0, smoothstep(0.0, 0.05, vLPos.y));
}
#endif
#ifdef EARTH
{
  // Hanging basalt under the garden: a pale footing course, then fractured rock that darkens with depth.
  vec3 an = abs(vWNormal);
  float along = an.x > an.z ? vWPos.z : vWPos.x;
  float strata = gNoise(vec2(vWPos.y * 4.2 + gNoise(vec2(along * 1.3, 2.0)) * 1.6, along * 0.55));
  float crackV = 1.0 - smoothstep(0.0, 0.035, abs(fract(along * 2.0 + 0.35 * gNoise(vec2(vWPos.y * 2.3, floor(along * 2.0)))) - 0.5));
  float grain = gNoise(vec2(along * 23.0, vWPos.y * 23.0));
  float depth = 1.0 - smoothstep(-2.6, -0.2, vWPos.y);
  vec3 rock = mix(diffuseColor.rgb, vec3(${col(PALETTE.earthDeep)}), 0.1 + 0.7 * depth);
  rock *= 0.72 + 0.4 * strata + 0.1 * grain; rock *= 1.0 - 0.4 * crackV * (0.4 + 0.6 * depth);
  float footing = smoothstep(-0.44, -0.4, vWPos.y);
  vec3 course = vec3(${col(PALETTE.footing)}) * (0.85 + 0.2 * grain) * (1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.02, abs(fract(along + 0.5) - 0.5))));
  diffuseColor.rgb = mix(rock, course, footing);
}
#endif
`;

const NORMAL_FRAG = /* glsl */`
#ifdef EARTH
{
  // Fractured rock: every facet leans its own way, so the moon picks out planes instead of one flat wall.
  vec3 an = abs(vWNormal);
  float along = an.x > an.z ? vWPos.z : vWPos.x;
  vec2 fp = vec2(along * 2.3, vWPos.y * 1.5), gi = floor(fp), gf = fract(fp); float md = 4.0; vec2 cell = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)), h = gi + o;
    vec2 r = o + vec2(gHash(h), gHash(h + 17.3)) - gf; float d = dot(r, r); if (d < md) { md = d; cell = h; } }
  vec3 tilt = vec3(gHash(cell + 1.7), gHash(cell + 5.3), gHash(cell + 9.1)) - 0.5;
  normal = normalize(normal + tilt * 0.85 * smoothstep(-0.36, -0.5, vWPos.y) * (1.0 - an.y));
  // The lower edge breaks off unevenly.
  float edge = vLPos.y + 1.0;                                    // 0 at the bottom of the column
  if (an.y < 0.5 && edge < 0.05 + 0.17 * gNoise(vec2(along * 3.1, 7.0)) + 0.08 * gNoise(vec2(along * 9.0, 3.0))) discard;
}
#endif
`;

const EMISSIVE_FRAG = /* glsl */`
#ifdef LANTERN
{
  // vColor.r marks paper (1) against wood (0); vColor.g tints the wood. Lit paper glows from the inside: hot core, orange rim.
  float paper = step(0.5, vColor.r);
  float rib = smoothstep(0.34, 0.5, abs(fract((vLPos.y - 0.075) * 17.3) - 0.5));
  float core = pow(clamp(normal.z, 0.0, 1.0), 1.5);
  float vert = 1.0 - smoothstep(0.06, 0.3, abs(vLPos.y - 0.3));
  vec3 glow = mix(vec3(${col(PALETTE.flameEdge)}), vec3(${col(PALETTE.flame)}), core);
  glow = mix(glow, vec3(${col(PALETTE.flameCore)}), core * core * (0.3 + 0.7 * vert));
  glow *= (0.55 + 0.75 * core) * (1.0 - 0.4 * rib) * (0.7 + 0.45 * vert);
  totalEmissiveRadiance += glow * vLit * paper * 1.35;
  // The lid and foot catch a little of their own light.
  totalEmissiveRadiance += vec3(${col(PALETTE.flame)}) * vLit * (1.0 - paper) * 0.1;
  vec3 wood = mix(vec3(${col(PALETTE.wood)}), vec3(${col(PALETTE.lacquer)}), clamp(vColor.g * 3.0, 0.0, 1.0));
  vec3 unlit = mix(wood, vec3(${col(PALETTE.paper)}) * (1.0 - 0.42 * rib), paper);
  diffuseColor.rgb = unlit * mix(1.0, 0.5, vLit * paper);
}
#endif
`;

const LIGHT_FRAG = /* glsl */`
{
  vec3 wn = normalize(vWNormal);
  float side = 1.0 - abs(wn.y);
  #ifdef WALLISH
  // A wall face takes the light that reaches the floor in front of it (the wall itself blocks the light field).
  vec2 fuv = (vWPos.xz + wn.xz * 0.46 - uFieldRect.xy) * uFieldRect.zw;
  vec3 lm = texture2D(uLightMap, fuv).rgb;
  float facing = mix(1.0, 0.85, side);
  #else
  vec2 fuv = (vWPos.xz - uFieldRect.xy) * uFieldRect.zw;
  vec3 lm = texture2D(uLightMap, fuv).rgb;
  vec2 fe = uFieldRect.zw * 0.45;
  vec3 lw = vec3(0.45, 0.45, 0.1);
  float lx = dot(texture2D(uLightMap, fuv + vec2(fe.x, 0.0)).rgb - texture2D(uLightMap, fuv - vec2(fe.x, 0.0)).rgb, lw);
  float lz = dot(texture2D(uLightMap, fuv + vec2(0.0, fe.y)).rgb - texture2D(uLightMap, fuv - vec2(0.0, fe.y)).rgb, lw);
  vec2 lg = vec2(lx, lz); float lgl = length(lg);
  float facing = mix(1.0, clamp(0.5 + 0.8 * dot(wn.xz, lg / max(lgl, 1e-5)), 0.06, 1.3), side * smoothstep(0.0, 0.012, lgl));
  #endif
  facing *= mix(1.0, 0.3, step(wn.y, -0.5));
  float below = smoothstep(-1.1, -0.15, vWPos.y);
  // Many lanterns together stay amber instead of burning out to white.
  lm *= 1.0 / (1.0 + 0.22 * max(lm.r, lm.g));
  // The celebration wave: a ring of warm light travelling outward.
  float pd = length(vWPos.xz - uPulse.xy) - uPulse.z;
  float ring = exp(-pd * pd * 1.6) * uPulse.w;
  lm += vec3(1.0, 0.62, 0.3) * ring;
  reflectedLight.indirectDiffuse += diffuseColor.rgb * lm * facing * below * LIGHT_GAIN;
  // A solved garden is warmer everywhere, not only inside the pools.
  reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.10, 0.055, 0.022) * uWarm * below * (0.35 + 0.65 * clamp(wn.y, 0.0, 1.0));
  float ao = texture2D(uAoMap, (vWPos.xz - uFieldRect.xy) * uFieldRect.zw).r * AO_GAIN * (1.0 - smoothstep(0.03, 0.55, vWPos.y));
  reflectedLight.directDiffuse *= 1.0 - ao; reflectedLight.indirectDiffuse *= 1.0 - ao * 0.8;
  // Moon rim: a thin cool edge on the side that faces the moon.
  float rimK = pow(1.0 - clamp(normal.z, 0.0, 1.0), 3.0) * smoothstep(-0.15, 0.7, dot(normal, uMoonV));
  reflectedLight.indirectDiffuse += uRim * rimK * RIM_GAIN * (0.35 + 0.65 * diffuseColor.rgb) * smoothstep(-0.6, 0.0, vWPos.y);
  #ifdef FUZZ
  float rim = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.0);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * rim * (0.22 + lm * 0.5);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(0.20, 0.22, 0.34);   // the moth's own faint glow
  #endif
}
`;

const MIST_FRAG = /* glsl */`
{
  // Below the floor everything sinks into the mist: it takes the colour of the backdrop behind it.
  float mistK = max(1.0 - smoothstep(uMistRange.x, uMistRange.y, vWPos.y + MIST_LIFT), HAZE);
  if (mistK > 0.001) {
    vec3 bg = texture2D(uBackdrop, gl_FragCoord.xy * uInvRes).rgb; bg *= bg;
    outgoingLight = mix(outgoingLight, bg, mistK * mistK * (3.0 - 2.0 * mistK));
  }
}
`;

const DITHER_FRAG = /* glsl */`
gl_FragColor.rgb += (gHash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
`;

function col(hex) {
  const c = new THREE.Color(hex);   // converted to linear working space
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}

const DEFS = { paver: 'PAVER', hedge: 'HEDGE', earth: 'EARTH', lantern: 'LANTERN', fuzz: 'FUZZ', grass: 'GRASS', curb: 'CURB', stone: 'STONE' };
const WALLISH = { hedge: true, curb: true };

// kind: 'plain' | 'paver' | 'hedge' | 'curb' | 'stone' | 'earth' | 'lantern' | 'fuzz' | 'grass'
export function gardenMaterial({ kind = 'plain', color = 0xffffff, vertexColors = false, flatShading = false, lightGain = 1, aoGain = 0.55, rimGain = 0.5, mistLift = 0, haze = 0, side = THREE.FrontSide, emissive = 0x000000 } = {}) {
  const m = new THREE.MeshLambertMaterial({ color, vertexColors, flatShading, side, emissive });
  const def = DEFS[kind];
  m.onBeforeCompile = (shader) => {
    for (const k of Object.keys(G)) shader.uniforms[k] = G[k];
    const defs = `${def ? `#define ${def}\n` : ''}${WALLISH[kind] ? '#define WALLISH\n' : ''}#define LIGHT_GAIN ${lightGain.toFixed(3)}\n#define AO_GAIN ${aoGain.toFixed(3)}\n#define RIM_GAIN ${rimGain.toFixed(3)}\n#define MIST_LIFT ${mistLift.toFixed(3)}\n#define HAZE ${haze.toFixed(3)}\n`;
    shader.vertexShader = defs + shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + PARS_VERT)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + NORMAL_VERT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + BEGIN_VERT)
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + WORLD_VERT);
    shader.fragmentShader = defs + shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS_FRAG)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + SURFACE_FRAG)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + NORMAL_FRAG)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + EMISSIVE_FRAG)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + LIGHT_FRAG)
      .replace('#include <opaque_fragment>', MIST_FRAG + '\n#include <opaque_fragment>')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + DITHER_FRAG);
  };
  m.customProgramCacheKey = () => `garden-${kind}-${lightGain}-${aoGain}-${rimGain}-${mistLift}-${haze}`;
  return m;
}

// Depth material for the hedge shadow pass: same vertex placement as the visible hedge.
export function hedgeDepthMaterial() {
  const m = new THREE.MeshDepthMaterial();
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + HEDGE_VERT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 hedgeN; transformed = hedgeShape(position, vec3(0.0, 1.0, 0.0), instanceMatrix[3].xyz, hedgeN); }');
  };
  m.customProgramCacheKey = () => 'garden-hedge-depth';
  return m;
}

export const colorGLSL = col;
