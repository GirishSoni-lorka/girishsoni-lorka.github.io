/* Tiny DOM helper. Text always goes in as text nodes, never as markup, so
   portfolio data can never be interpreted as HTML. */

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

/* fixed, hand-written icons only: never called with data */
const ICONS = {
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
  back: '<path d="M9.5 3.5 5 8l4.5 4.5"/>',
  menu: '<path d="M3 4.5h10M3 8h10M3 11.5h10"/>',
  exit: '<path d="M6.5 3H3.5v10h3M7 8h6.5M11 5.5 13.5 8 11 10.5"/>',
  arrow: '<path d="M8 13V3M4 7l4-4 4 4"/>',
  out: '<path d="M6 4h6v6M12 4l-7.5 7.5"/>',
  pin: '<path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 0 0-9 0C3.500 10 8 14 8 14z"/><circle cx="8" cy="6.500" r="1.500"/>',
  jump: '<path d="M8 12.500V4M4.500 7.500 8 4l3.500 3.500"/>',
  run: '<path d="M3 8h4M9 4l4 4-4 4M3 4.500h2M3 11.500h2"/>',
  hand: '<path d="M8 2.500v6M5 6v3.500a3 3 0 0 0 6 0V5"/>',
  route: '<circle cx="3.500" cy="12.500" r="1.500"/><circle cx="12.500" cy="3.500" r="1.500"/><path d="M5 12.500h5a2.250 2.250 0 0 0 0-4.500H6a2.250 2.250 0 0 1 0-4.500h5"/>',
  moon: '<path d="M13.200 9.600A5.600 5.600 0 0 1 6.400 2.800a5.600 5.600 0 1 0 6.800 6.800z"/>',
  sun: '<circle cx="8" cy="8" r="2.800"/><path d="M8 1.500V3M8 13v1.500M1.500 8H3M13 8h1.500M3.400 3.400l1.100 1.100M11.500 11.500l1.100 1.100M3.400 12.600l1.100-1.100M11.500 4.500l1.100-1.100"/>',
  sound: '<path d="M2.500 6.200h2.200L8 3.500v9L4.700 9.800H2.500z"/><path d="M10.500 6a3 3 0 0 1 0 4M12.200 4.300a5.400 5.400 0 0 1 0 7.400"/>',
  mute: '<path d="M2.500 6.200h2.200L8 3.500v9L4.700 9.800H2.500z"/><path d="M10.800 6.300l3 3.400M13.800 6.300l-3 3.400"/>',
  link: '<path d="M6.900 9.100a2.600 2.600 0 0 0 3.700 0l2-2a2.600 2.600 0 0 0-3.700-3.700l-.7.700"/><path d="M9.100 6.900a2.600 2.600 0 0 0-3.700 0l-2 2a2.600 2.600 0 0 0 3.700 3.700l.7-.7"/>',
  skip: '<path d="M3.500 4l4 4-4 4M8.500 4l4 4-4 4"/>',
  flag: '<path d="M4 14V2.500M4 3h8l-1.800 2.800L12 8.500H4"/>',
};

export function icon(name, size = 16) {
  const span = document.createElement('span');
  span.className = 'gi';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 16 16" width="${Number(size)}" height="${Number(size)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}
