/* ============================================================
   Girish Soni — projects.js  (Vanilla JS, no deps)
   Powers projects.html: theme, nav, filtering, command palette
   ============================================================ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeBtn = $('#themeToggle');
  const themeMeta = $('meta[name="theme-color"]');
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(theme === 'light'));
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#F3F6F2' : '#07090B');
  }
  setTheme(root.getAttribute('data-theme') || 'dark');
  function toggleTheme() {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    return next;
  }
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
    try { if (localStorage.getItem('theme')) return; } catch (err) {}
    setTheme(e.matches ? 'light' : 'dark');
  });

  const kbdText = isMac ? '⌘K' : 'Ctrl K';
  const kbdEl = $('#cmdkKbd'); if (kbdEl) kbdEl.textContent = kbdText;

  /* ---------- Loader ---------- */
  window.addEventListener('load', function () {
    const loader = $('#loader');
    if (loader) setTimeout(() => loader.classList.add('is-hidden'), 320);
  });

  /* ---------- Navbar + progress ---------- */
  const navbar = $('#navbar');
  const progress = $('#scrollProgress');
  function onScroll() {
    const y = window.scrollY;
    if (navbar) navbar.classList.toggle('is-scrolled', y > 20);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const burger = $('#navToggle');
  const links = $('#navLinks');
  function closeMenu() {
    if (!links) return;
    links.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && links) {
    burger.addEventListener('click', function () {
      const open = links.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__link', links).forEach((l) => l.addEventListener('click', closeMenu));
  }

  /* ---------- Reveal ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); o.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => obs.observe(el));
  } else { reveals.forEach((el) => el.classList.add('is-visible')); }

  /* ---------- Toast / copy ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg; el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('is-on'); setTimeout(() => { el.hidden = true; }, 320); }, 2200);
  }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(label || 'Copied'), () => toast('Copy failed'));
    } else { toast(text); }
  }

  /* ---------- Project filtering ---------- */
  const filterBtns = $$('.filter-btn');
  const sheets = $$('.sheet');
  const countEl = $('#filterCount');
  const empty = $('#pempty');

  function applyFilter(filter) {
    let shown = 0;
    sheets.forEach((s) => {
      const tags = (s.dataset.tags || '').split(' ');
      const show = filter === 'all' || tags.includes(filter);
      s.classList.toggle('is-hidden', !show);
      if (show) {
        shown++;
        if (!reduced) { s.classList.remove('is-visible'); void s.offsetWidth; s.classList.add('is-visible'); }
      }
    });
    if (countEl) countEl.textContent = shown + ' / ' + sheets.length;
    if (empty) empty.classList.toggle('is-on', shown === 0);
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', function () {
      filterBtns.forEach((b) => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', String(on)); });
      applyFilter(btn.dataset.filter);
    });
  });

  function setFilterByName(name) {
    const btn = filterBtns.find((b) => b.dataset.filter === name);
    if (btn) btn.click();
  }

  /* ---------- Helpers ---------- */
  function goTo(sel) {
    const t = $(sel);
    if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  /* ============================================================
     COMMAND PALETTE
     ============================================================ */
  const palette = $('#palette');
  const pInput = $('#paletteInput');
  const pList = $('#paletteList');
  const pScrim = $('#paletteScrim');
  let lastFocused = null, selIndex = 0, visibleItems = [];

  const COMMANDS = [
    { group: 'Jump to project', ic: '#', title: 'EnerVenue HRMS', sub: 'Enterprise HRMS · US & China', keywords: 'saml azure trinet hrms', run: () => goTo('#proj-enervenue') },
    { group: 'Jump to project', ic: '#', title: 'AI Enterprise Chatbot', sub: 'RAG · document intelligence', keywords: 'ai openai langchain milvus', run: () => goTo('#proj-chatbot') },
    { group: 'Jump to project', ic: '#', title: 'SendMePls', sub: 'Real-time logistics', keywords: 'logistics reverb twilio agora', run: () => goTo('#proj-sendmepls') },
    { group: 'Jump to project', ic: '#', title: 'KaiFit', sub: 'Subscription fitness SaaS', keywords: 'revenuecat fcm mobile', run: () => goTo('#proj-kaifit') },
    { group: 'Jump to project', ic: '#', title: 'Global Time Sheet', sub: 'Multi-tenant HRMS', keywords: 'payroll tenant rbac', run: () => goTo('#proj-globaltimesheet') },
    { group: 'Jump to project', ic: '#', title: 'FedX Tax Reconciliation', sub: 'Fintech · payroll tax', keywords: 'tax excel dompdf fintech', run: () => goTo('#proj-fedx') },
    { group: 'Jump to project', ic: '#', title: 'MaxMRJ', sub: 'Healthcare referral platform', keywords: 'react healthcare referral pcc', run: () => goTo('#proj-maxmrj') },
    { group: 'Jump to project', ic: '#', title: 'BIC Industrial Catalog', sub: 'B2B e-commerce catalog', keywords: 'ecommerce catalog parts', run: () => goTo('#proj-bic') },

    { group: 'Filter', ic: '/', title: 'Show all', keywords: 'reset', run: () => setFilterByName('all') },
    { group: 'Filter', ic: '/', title: 'Filter: Enterprise SaaS', keywords: 'saas', run: () => setFilterByName('saas') },
    { group: 'Filter', ic: '/', title: 'Filter: AI', keywords: 'ai', run: () => setFilterByName('ai') },
    { group: 'Filter', ic: '/', title: 'Filter: HRMS', keywords: 'hrms', run: () => setFilterByName('hrms') },
    { group: 'Filter', ic: '/', title: 'Filter: Fintech', keywords: 'fintech', run: () => setFilterByName('fintech') },
    { group: 'Filter', ic: '/', title: 'Filter: Healthcare', keywords: 'healthcare', run: () => setFilterByName('healthcare') },
    { group: 'Filter', ic: '/', title: 'Filter: Logistics', keywords: 'logistics', run: () => setFilterByName('logistics') },
    { group: 'Filter', ic: '/', title: 'Filter: E-commerce', keywords: 'ecommerce', run: () => setFilterByName('ecommerce') },

    { group: 'Navigate', ic: '~', title: 'Home', keywords: 'index back', run: () => { window.location.href = 'index.html'; } },
    { group: 'Navigate', ic: '~', title: 'Approach', keywords: 'how i work', run: () => { window.location.href = 'index.html#approach'; } },
    { group: 'Navigate', ic: '~', title: 'Journey', keywords: 'experience', run: () => { window.location.href = 'index.html#journey'; } },
    { group: 'Navigate', ic: '~', title: 'Contact', keywords: 'reach hire', run: () => { window.location.href = 'index.html#contact'; } },

    { group: 'Actions', ic: '@', title: 'Copy email', sub: 'Girish.soni.official@gmail.com', keywords: 'mail', run: () => copy('Girish.soni.official@gmail.com', 'Email copied to clipboard') },
    { group: 'Actions', ic: '@', title: 'Open LinkedIn', keywords: 'social', run: () => window.open('https://www.linkedin.com/in/girishsoni20', '_blank', 'noopener') },
    { group: 'Actions', ic: '@', title: 'Open GitHub', keywords: 'code', run: () => window.open('https://github.com/GirishSoni-lorka', '_blank', 'noopener') },
    { group: 'Actions', ic: '$', title: 'Download résumé', sub: 'assets/resume.pdf', keywords: 'cv pdf', run: () => { const a = document.createElement('a'); a.href = 'assets/resume.pdf'; a.download = ''; a.click(); toast('Downloading résumé…'); } },
    { group: 'Actions', ic: '$', title: 'Toggle theme', keywords: 'dark light', run: () => { const n = toggleTheme(); toast(n === 'light' ? 'Light mode' : 'Dark mode'); } }
  ];

  function score(item, q) {
    if (!q) return 1;
    const hay = (item.title + ' ' + (item.sub || '') + ' ' + (item.keywords || '') + ' ' + item.group).toLowerCase();
    q = q.toLowerCase();
    if (hay.includes(q)) return 2;
    let i = 0;
    for (const ch of hay) { if (ch === q[i]) i++; if (i === q.length) return 1; }
    return 0;
  }

  function renderPalette(q) {
    visibleItems = COMMANDS.map((c) => ({ c, s: score(c, q) })).filter((x) => x.s > 0).map((x) => x.c);
    pList.innerHTML = '';
    if (!visibleItems.length) { pList.innerHTML = '<div class="palette__empty">no matches</div>'; return; }
    let lastGroup = '', idx = 0;
    visibleItems.forEach((c) => {
      if (c.group !== lastGroup) {
        const g = document.createElement('div'); g.className = 'palette__group'; g.textContent = c.group;
        pList.appendChild(g); lastGroup = c.group;
      }
      const row = document.createElement('div');
      row.className = 'palette__item'; row.setAttribute('role', 'option'); row.dataset.idx = String(idx);
      row.innerHTML = '<span class="palette__item-ic">' + c.ic + '</span><span class="palette__item-tx">' + c.title + (c.sub ? '<small>' + c.sub + '</small>' : '') + '</span>';
      row.addEventListener('mousemove', () => setSel(parseInt(row.dataset.idx, 10)));
      row.addEventListener('click', () => execItem(parseInt(row.dataset.idx, 10)));
      pList.appendChild(row); idx++;
    });
    selIndex = 0; paintSel();
  }
  function paintSel() {
    $$('.palette__item', pList).forEach((el) => {
      const on = parseInt(el.dataset.idx, 10) === selIndex;
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function setSel(i) { selIndex = i; paintSel(); }
  function execItem(i) { const c = visibleItems[i]; if (!c) return; closePalette(); setTimeout(() => c.run(), 60); }

  function openPalette() {
    if (!palette.hidden) return;
    lastFocused = document.activeElement;
    palette.hidden = false; renderPalette(''); pInput.value = '';
    setTimeout(() => pInput.focus(), 20);
    document.body.style.overflow = 'hidden';
  }
  function closePalette() {
    if (palette.hidden) return;
    palette.hidden = true; document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (palette) {
    pInput.addEventListener('input', () => renderPalette(pInput.value.trim()));
    pInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selIndex = Math.min(selIndex + 1, visibleItems.length - 1); paintSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); paintSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); execItem(selIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    pScrim.addEventListener('click', closePalette);
    const trig = $('#cmdkTrigger'); if (trig) trig.addEventListener('click', openPalette);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === 'Escape' && !palette.hidden) { closePalette(); }
    else if (e.key === '/' && palette.hidden && document.activeElement === document.body) { e.preventDefault(); openPalette(); }
  });

  /* ---------- Deep-link: open a filter via ?filter= or #proj- ---------- */
  try {
    const params = new URLSearchParams(window.location.search);
    const f = params.get('filter');
    if (f) setFilterByName(f);
  } catch (e) {}
})();
