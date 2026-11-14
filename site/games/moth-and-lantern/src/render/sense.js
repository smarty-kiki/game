// What the moth and the garden know about each other, in one plain object, so the modules that react to the
// moth (grass, fireflies, lanterns, wisps) do not need a reference to it and it does not need one to them.
// Written once per frame by its owner; read by everyone else. Events are counters: a reader keeps the last
// value it saw and reacts when the counter has moved on.
export const SENSE = {
  // ---- written by the moth (render/moth.js) ----
  x: 0, z: 0, y: 0,            // body position on the ground plane, height above the floor
  hx: 0, hy: 0.4, hz: 0,       // head position in the world
  vx: 0, vz: 0, speed: 0,      // ground velocity in cells per second
  heading: 0,
  ground: 0,                   // 1 on its feet, 0 in the air
  still: 0,                    // seconds since it last moved (0 while it walks, pushes, flies)
  asleep: false,
  gust: 0, gustX: 0, gustZ: 0, gustPower: 0,     // event: a puff of air (wing flutter, hop, landing, bump)
  snap: 0, snapFly: -1,                          // event: it snapped at firefly number `snapFly`
  // ---- written by the game (game.js) ----
  idle: false,                 // input is live and nothing is playing
  camYaw: 0,                   // where the camera stands, so the moth can look at the player
  pushable: null,              // a lantern item next to the moth, or null
  nearLit: null,               // the nearest lit lantern item within reach, or null
  // ---- written by the fireflies (render/ambient.js) ----
  fly: -1, flyX: 0, flyY: 0, flyZ: 0, flyD: 99,   // the nearest glowing firefly and its distance to the head
};
