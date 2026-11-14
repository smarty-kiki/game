// Inline icons, drawn on a 24 x 24 grid with one stroke weight. No icon font, no image files.
// Each control has its own silhouette: undo is the only hooked arrow, "start over" is a bar and a triangle
// (back to the beginning), and the two view turns are an arc over a floor tile.
const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
const turn = '<path d="M5 9.4C6.3 6.1 8.9 4.2 12 4.2c2.9 0 5.400 1.600 6.800 4.300"/><path d="M19.4 4.400v4.300h-4.300"/><path d="M12 11.200l5.800 3.400-5.800 3.400-5.800-3.400z"/>';
const finger = (x, y, r = 2.7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" fill-opacity="0.22"/>`;

export const ICONS = {
  undo: svg('<path d="M8.5 5.500 4 10l4.500 4.500"/><path d="M4.500 10H14a5.500 5.500 0 1 1 0 11h-3"/>'),
  reset: svg('<path d="M6.200 5.500v13"/><path d="M18.300 5.800v12.400L9.600 12z"/>'),
  rotr: svg(turn),
  rotl: svg(`<g transform="matrix(-1 0 0 1 24 0)">${turn}</g>`),
  view: svg('<path d="M12 3.600 19.400 7.600v8.800L12 20.400 4.600 16.400V7.600z"/><path d="M4.600 7.600 12 11.600l7.400-4M12 11.600v8.800"/>'),
  zoomin: svg('<circle cx="10.500" cy="10.500" r="6"/><path d="M15 15l4.600 4.600M10.500 8v5M8 10.500h5"/>'),
  zoomout: svg('<circle cx="10.500" cy="10.500" r="6"/><path d="M15 15l4.600 4.600M8 10.500h5"/>'),
  prev: svg('<path d="M14.500 5.500 8 12l6.500 6.500"/>'),
  next: svg('<path d="M9.500 5.500 16 12l-6.500 6.500"/>'),
  down: svg('<path d="M5.500 9.200 12 15.700l6.500-6.500"/>'),
  levels: svg('<rect x="4" y="4" width="6.600" height="6.600" rx="1.900"/><rect x="13.400" y="4" width="6.600" height="6.600" rx="1.900"/><rect x="4" y="13.400" width="6.600" height="6.600" rx="1.900"/><rect x="13.400" y="13.400" width="6.600" height="6.600" rx="1.900" fill="currentColor" fill-opacity="0.85"/>'),
  sound: svg('<path d="M4.500 9.600v4.800h3.100l4.400 3.700V5.900L7.600 9.600z"/><path d="M15.400 9.200a4 4 0 0 1 0 5.600M17.900 6.600a7.600 7.600 0 0 1 0 10.800"/>'),
  soundOff: svg('<path d="M4.500 9.600v4.800h3.100l4.400 3.700V5.900L7.600 9.600z"/><path d="M16 9.600l4.800 4.800M20.800 9.600 16 14.400"/>'),
  help: svg('<circle cx="12" cy="12" r="8.300"/><path d="M9.500 9.700a2.600 2.600 0 1 1 3.800 2.300c-.9.500-1.300 1-1.300 2"/><path d="M12 16.900v.1"/>'),
  more: svg('<path d="M6 12h.01M12 12h.01M18 12h.01"/>', 'style="stroke-width:2.8"'),
  close: svg('<path d="M6.500 6.500l11 11M17.500 6.500l-11 11"/>'),
  // touch gestures (help panel): a soft dot is a fingertip
  gFlick: svg(`${finger(7.5, 16)}<circle cx="7.500" cy="16" r="2.700"/><path d="M11.500 12 17.500 6M13 6h4.500v4.500"/>`),
  gDrag: svg(`${finger(5.7, 12)}<circle cx="5.700" cy="12" r="2.700"/><path d="M10.800 12h7.400" stroke-dasharray="0.100 3.200"/><path d="M17.800 8.800 21 12l-3.200 3.200"/>`),
  gTap: svg(`${finger(12, 12, 2.6)}<circle cx="12" cy="12" r="2.600"/><circle cx="12" cy="12" r="6.400" stroke-opacity="0.6"/><circle cx="12" cy="12" r="9.600" stroke-opacity="0.25"/>`),
  gPan: svg(`${finger(8.3, 15.5)}${finger(15.7, 15.5)}<circle cx="8.300" cy="15.500" r="2.700"/><circle cx="15.700" cy="15.500" r="2.700"/><path d="M5 7.200h14M16.200 4.400 19 7.200 16.200 10M7.800 4.400 5 7.200 7.800 10"/>`),
  gPinch: svg(`${finger(8.6, 15.4)}${finger(15.4, 8.600)}<circle cx="8.600" cy="15.400" r="2.700"/><circle cx="15.400" cy="8.600" r="2.700"/><path d="M3.800 16.400v3.800h3.800M20.200 7.600V3.800h-3.800"/>`),
};
