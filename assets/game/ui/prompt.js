/* "Press E to ..." — shown while something interactive is in reach. It is a
   real button, so it also works with a mouse click or a tap. */

import { h } from './dom.js';

export function createPrompt({ parent, onInteract }) {
  const key = h('kbd', { class: 'gprompt__key', text: 'E' });
  const lead = h('span', { class: 'gprompt__lead', text: 'Press' });
  const text = h('span', { class: 'gprompt__text' });
  const root = h('button', { class: 'gprompt', type: 'button', hidden: true, onclick: onInteract }, lead, key, text);
  parent.appendChild(root);
  let timer = 0;
  return {
    set(prompt, touch) {
      clearTimeout(timer);
      if (!prompt) {
        root.classList.remove('is-in');
        timer = setTimeout(() => { root.hidden = true; }, 220);
        return;
      }
      lead.textContent = touch ? 'Tap' : 'Press';
      text.textContent = `to ${prompt.text}`;
      root.hidden = false;
      void root.offsetWidth;
      root.classList.add('is-in');
    },
  };
}
