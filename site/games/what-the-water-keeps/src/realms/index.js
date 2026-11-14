// The ride, in order. The waterway loops: after the last realm the boat comes back to the first.
// `veil` is the colour of the mist or darkness a realm is entered through (the passage before it takes this colour).
// Test realms (lab, lifetest, modeltest, watertest ...) are not listed: open them with ?realm=<file name>.
export const REALMS = [
  { id: 'landing', name: "渡口", load: () => import('./landing.js') },
  { id: 'reach', name: "染坊河段", veil: '#f3ddb0', load: () => import('./reach.js') },
  { id: 'orchard', name: "水漫果园", veil: '#0b0d1e', load: () => import('./orchard.js') },
  { id: 'town', name: "山下小镇", veil: '#8e8aa8', load: () => import('./town.js') },
  { id: 'theatre', name: "落叶剧场", veil: '#140f18', load: () => import('./theatre.js') },
  { id: 'sea', name: "海之回响", veil: '#05070f', load: () => import('./sea.js') },
  { id: 'snow', name: "雪覆果园", veil: '#11111a', load: () => import('./snow.js') },
  { id: 'sky', name: "静立天空", veil: '#aab4d6', load: () => import('./sky.js') },
];
