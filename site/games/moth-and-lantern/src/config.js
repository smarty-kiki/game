// Every tunable constant of the game in one place: palette, camera angles, timings, sizes.
// Colours are sRGB hex. Angles are degrees unless a name says otherwise.

export const PALETTE = {
  // night: a moonlit cloud sea under a deep indigo sky
  abyss: 0x04061a, cloudDark: 0x0d1338, cloudMid: 0x1f2c66, cloudLit: 0x5f78c8, cloudSilver: 0xb4c9f4,
  horizon: 0x4460b4, skyTop: 0x070a22, moonDisc: 0xf2f5ff, moonHalo: 0x8fa9f0,
  mistPool: 0x7088d2, mistWarm: 0xf09a62,
  mistDeep: 0x04061a,
  moon: 0xa9c0ff, skyAmbient: 0x40509c, groundAmbient: 0x1a1538, rim: 0xa9c8ff,
  // garden: worn flagstones, pale cut stone, clipped box hedges
  paverA: 0x8a85a8, paverB: 0x7e799f, paverMoss: 0x3f8f7a,
  curb: 0xb2b6d4, hedge: 0x2c9272, hedgeTip: 0xa8ecb4,
  earthTop: 0x595a8e, earthDeep: 0x14122e, footing: 0x7e82ac,
  plinth: 0xa6a8c4, plinthRingIdle: 0x8fb0e0, plinthRingLit: 0xffb45e,
  // lantern
  paper: 0xe6dfd2, wood: 0x4a3246, lacquer: 0xb0524a, flame: 0xffac42, flameCore: 0xfff0c2, flameEdge: 0xff6626,
  wisp: 0x8fb4e6,
  // moth
  mothBody: 0xfbf0dc, mothWing: 0xedc9a0, mothBand: 0xb9643f, mothEye: 0x18122a, mothLeg: 0x6a4a52,
  mothAura: 0xc4d0ff,
  // ambience
  firefly: 0xd4ff7a, fireflyWarm: 0xffd98a, blossom: 0xffe3ee, blossomWarm: 0xffc7a8,
};

export const VIEW = {
  // "iso": three-quarter view. The yaw is 27 (not 45) so that W is unambiguously "up" on screen.
  iso:   { yaw: 27, elev: 50 },
  // "ortho": frontal low-angle diorama.
  ortho: { yaw: 0, elev: 37 },
  // "top": straight from above.
  top:   { yaw: 0, elev: 90 },
  order: ['iso', 'ortho', 'top'],
  names: { iso: '等距', ortho: '立体', top: '俯视' },
};

export const CAM = {
  // Zoom: 100% shows the whole level. The top of the range is 180%, except on a screen where 180% would still
  // leave cells smaller than `cellPxFloor`: there the range (and the default) rise just far enough to reach it.
  zoomMin: 1.0, zoomMax: 1.8, zoomStep: 0.2, cellPxFloor: 40,
  // Big levels start above 100% so that a cell is at least this many CSS pixels wide.
  minCellPx: 46, minCellPxTouch: 40,
  fitSlack: 0.85,              // ... but a level whose cells reach this share of that at 100% simply opens at 100%
  // Small levels never grow beyond this cell size at 100% (keeps air around the island on big screens).
  maxCellPx: 132,
  marginFrac: 0.07,            // free border around the level at 100%, as a fraction of the short side
  // Every camera move runs on a clock and ends dead on time (seconds). No tails on big levels.
  turnTime: 0.72, viewTime: 0.8, zoomTime: 0.42, levelTime: 0.9, pinchTime: 0.09, homeTime: 0.55,
  stageTime: 0.9,              // the staged zoom of a build-in or a celebration (rig.extra)
  liftTime: 0.6,               // making room for the win banner
  skyTilt: 54, skyTiltTime: 1.3,   // the last celebration seen from above: the camera leans back to this elevation
  settlePower: 3.5,            // shape of the glide: fast start, long soft landing (see camera.js `settle`)
  springFocus: [60, 15.5],     // soft follow of the moth between camera moves
  springYaw: [48, 12.6], springElev: [48, 13], springZoom: [90, 19],
  // Zoomed in, the moth may roam this fraction of the free screen (from its middle) before the view follows.
  window: 0.42, windowOuter: 0.7, coverPull: 2,   // ... and up to the outer share when that shows more garden (slanted views, level edges)
  distance: 60,
};

// Touch and mouse gestures on the garden (CSS pixels, milliseconds). See input.js.
export const TOUCH = {
  slop: 10,                    // a finger that travels less than this has not moved: tap or hold
  lock: 26,                    // the flick direction is read after this much travel (ignores the hook at the end of a thumb arc)
  restMs: 140,                 // a flick fires when the finger lifts, or after it has rested this long
  capMs: 300,                  // ... or this long after it started to move, for a slow continuous drag
  holdMs: 280,                 // holding still this long brings up the walk ring
  ringDead: 20, ringOut: 26,   // walk ring: the centre zone that means "stand", and the travel that starts a walk
  walkDelay: 0.24,             // seconds before a walk repeats its first step
  tapMs: 420,                  // a tap is shorter than this
};

export const WALL = {
  curbH: 0.10,                 // cut stone coping under every hedge
  lowH: 0.11,                  // hedge height above the coping when a taller hedge would hide something
  hedgeH: 0.58,                // hedge height above the coping when it hides nothing
  hedgeHalf: 0.43,             // half-width of a hedge on a side with no wall neighbour
  inner: 0.40,                 // half-size of the part of a cell that must stay visible
};

export const TIME = {
  stepSpeed: 8.6,              // cells per second while walking
  pushSpeed: 6.9,              // cells per second while pushing
  undoStep: 0.085,             // seconds per undone move (shorter when Z is held)
  bump: 0.26,                  // a blocked move, start to finish
  bumpHit: 0.066,              // seconds from the start of a bump to the hit
  reset: 0.5,
  // The big sequences. A pair is [small garden, huge garden]; the game blends between them by size.
  sink: [0.56, 0.82],           // seconds for a leaving garden to sink into the mist
  swap: [0.5, 0.72],           // the next garden starts to rise this far into the sinking (they overlap); later before a huge garden, so the camera has arrived
  ripple: [0.26, 0.86],        // seconds for the build ripple to travel from the moth's cell to the farthest cell
  ready: 0.36,                 // input unlocks this long after the ripple has reached the farthest cell
  mashQuiet: 0.5,              // seconds without an ignored key press before presses are kept again (see game.js holdMove)
  moveBuffer: 3,               // move keys pressed while a garden builds are kept (the last few) and played when it is ready
  breath: 0.3,                 // the held breath between the last lantern landing and the first answer
  answer: [0.05, 0.17],       // seconds between two lanterns answering: many lanterns, few lanterns
  answerSpan: 0.6,            // all answers of a garden fit in this
  holdDelay: 0.2,              // seconds before a held move key repeats
  undoHoldDelay: 0.28, undoRepeat: 0.066,
  maxQueue: 3,                 // buffered key presses
};

export const QUALITY = {
  maxPixelRatio: 2, maxPixelRatioTouch: 1.75,
  shadowSize: 2048, shadowSizeTouch: 1024,
  fireflies: 30, firefliesTouch: 16,
  backdropScale: 0.5, backdropScaleTouch: 0.34,   // the cloud sea is drawn small and stretched: it is soft anyway
  lightTexels: 8, lightTexelsTouch: 6,            // light field texels per cell
};

export const GAME_TITLE = '飞蛾与灯 · Moth & Lantern';
