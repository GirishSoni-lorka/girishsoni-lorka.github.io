/* The experience selector: a full-screen choice between the three modes,
   opened by a link to the home page with ?mode=choose. Everyone else goes
   straight to Classic (or the mode they chose last) and uses the switch, or
   the game's menu, to change it. */

import { detectSupport } from './game-launcher.js';

const ART_CLASSIC = `
<svg viewBox="0 0 320 150" aria-hidden="true">
  <g stroke="currentColor" stroke-linecap="round" opacity=".5">
    <path d="M24 34h118" stroke-width="9"/>
    <path d="M24 60h170M24 74h150M24 88h96" stroke-width="3" opacity=".55"/>
  </g>
  <path d="M24 122h150c20 0 20-34 44-34h34" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="266" cy="88" r="9" fill="var(--signal)"/>
  <g fill="currentColor" opacity=".28">
    <circle cx="232" cy="30" r="1.6"/><circle cx="252" cy="42" r="1.6"/><circle cx="276" cy="28" r="1.6"/>
    <circle cx="292" cy="50" r="1.6"/><circle cx="244" cy="58" r="1.6"/><circle cx="270" cy="52" r="1.6"/>
    <circle cx="296" cy="30" r="1.6"/><circle cx="222" cy="48" r="1.6"/>
  </g>
</svg>`;

const ART_GAME = `
<svg viewBox="0 0 320 150" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M40 118 160 58l120 60-120 26z" opacity=".35"/>
    <path d="M96 100V62l28-12 28 12v38l-28 12z" opacity=".8"/>
    <path d="M96 62l28 12 28-12M124 74v38" opacity=".8"/>
    <path d="M176 94V34l24-10 24 10v60l-24 10z"/>
    <path d="M176 34l24 10 24-10M200 44v60"/>
    <path d="M236 108V78l18-8 18 8v30l-18 8z" opacity=".6"/>
    <path d="M236 78l18 8 18-8M254 86v30" opacity=".6"/>
  </g>
  <path d="M70 124l60 13 44-22" fill="none" stroke="var(--signal)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 9"/>
  <circle cx="70" cy="124" r="7" fill="var(--signal)"/>
</svg>`;

export function openSelector({ onChoose }) {
  const support = detectSupport();
  const root = document.createElement('div');
  root.className = 'xp';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'xp-title');
  root.tabIndex = -1;
  root.innerHTML = `
    <div class="xp__in">
      <p class="xp__eyebrow">Girish Soni <span aria-hidden="true">/</span> Senior Laravel full-stack engineer</p>
      <h2 class="xp__title" id="xp-title">Choose your way in</h2>
      <p class="xp__lead">One portfolio, read three ways. You can switch at any time.</p>
      <div class="xp__cards">
        <button type="button" class="xp-card" data-mode="classic">
          <span class="xp-card__art">${ART_CLASSIC}</span>
          <span class="xp-card__kind">Scroll</span>
          <span class="xp-card__name">Classic</span>
          <span class="xp-card__text">The original portfolio. Scroll through the work, the build log and the journey.</span>
          <span class="xp-card__go">Open the portfolio</span>
        </button>
        <button type="button" class="xp-card xp-card--game" data-mode="game" ${support.webgl ? '' : 'disabled'}>
          <span class="xp-card__art">${ART_GAME}</span>
          <span class="xp-card__kind">Play <i>3D</i></span>
          <span class="xp-card__name">Game</span>
          <span class="xp-card__text">${support.webgl
            ? 'A small open-world city. Walk through six districts and discover the same story on foot.'
            : 'A small open-world city to explore on foot. It needs WebGL 2, which this browser or device does not provide.'}</span>
          <span class="xp-card__go">${support.webgl ? 'Enter the world' : 'Not available here'}</span>
        </button>
      </div>
      <button type="button" class="xp__alt" data-mode="agents">
        <span>Or watch AI agents build the page in front of you</span>
      </button>
    </div>`;

  const page = [...document.body.children];
  for (const el of page) el.inert = true;
  document.body.appendChild(root);
  document.documentElement.classList.add('xp-open');

  const choices = [...root.querySelectorAll('[data-mode]:not(:disabled)')];
  const close = mode => {
    root.removeEventListener('keydown', onKey);
    for (const el of page) el.inert = false;
    document.documentElement.classList.remove('xp-open');
    root.classList.add('is-leaving');
    setTimeout(() => root.remove(), 450);
    onChoose(mode);
  };
  const onKey = e => {
    if (e.key !== 'Tab') return;
    const i = choices.indexOf(document.activeElement);
    e.preventDefault();
    const next = i < 0 ? (e.shiftKey ? choices.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + choices.length) % choices.length;
    choices[next].focus();
  };
  root.addEventListener('keydown', onKey);
  for (const c of choices) c.addEventListener('click', () => close(c.dataset.mode));

  requestAnimationFrame(() => { root.classList.add('is-in'); root.focus({ preventScroll: true }); });
}

/* a short, dismissible message at the bottom of the page */
export function notice(text) {
  const el = document.createElement('div');
  el.className = 'xp-notice';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const close = () => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 400); };
  el.addEventListener('click', close);
  setTimeout(close, 9000);
}
