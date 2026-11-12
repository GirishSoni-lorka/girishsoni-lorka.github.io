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
};

export function icon(name, size = 16) {
  const span = document.createElement('span');
  span.className = 'gi';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 16 16" width="${Number(size)}" height="${Number(size)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}
