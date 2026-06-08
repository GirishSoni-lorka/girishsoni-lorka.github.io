/* ============================================================
   Girish Soni — girish.os · script.js  (Vanilla JS, no deps)
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

  /* ---------- Platform-correct kbd hints ---------- */
  const kbdText = isMac ? '⌘K' : 'Ctrl K';
  ['#cmdkKbd', '#kbdHint'].forEach((sel) => { const el = $(sel); if (el) el.textContent = kbdText; });

  /* ---------- Loader ---------- */
  window.addEventListener('load', function () {
    const loader = $('#loader');
    if (loader) setTimeout(() => loader.classList.add('is-hidden'), 420);
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
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach((el) => obs.observe(el));
  } else { reveals.forEach((el) => el.classList.add('is-visible')); }

  /* ---------- Scroll spy ---------- */
  const sections = $$('main section[id]');
  const linkMap = new Map();
  $$('.nav__link').forEach((l) => linkMap.set(l.getAttribute('href').replace('#', ''), l));
  if (sections.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        linkMap.forEach((l, k) => l.classList.toggle('is-active', k === en.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach((s) => obs.observe(s));
  }

  /* ---------- Helpers: scroll + toast ---------- */
  function go(hash) {
    const t = $(hash);
    if (t) t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('is-on');
      setTimeout(() => { el.hidden = true; }, 320);
    }, 2200);
  }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(label || 'Copied'), () => toast('Copy failed'));
    } else { toast(text); }
  }

  /* ============================================================
     COMMAND PALETTE
     ============================================================ */
  const palette = $('#palette');
  const pInput = $('#paletteInput');
  const pList = $('#paletteList');
  const pScrim = $('#paletteScrim');
  let lastFocused = null;
  let selIndex = 0;
  let visibleItems = [];

  const COMMANDS = [
    { group: 'Navigate', ic: '~', title: 'Home', meta: 'top', run: () => go('#top') },
    { group: 'Navigate', ic: '~', title: 'Approach', sub: 'How I work', meta: '01', run: () => go('#approach') },
    { group: 'Navigate', ic: '~', title: 'Work', sub: 'Selected projects', meta: '02', run: () => go('#work') },
    { group: 'Navigate', ic: '~', title: 'Journey', sub: 'Experience', meta: '04', run: () => go('#journey') },
    { group: 'Navigate', ic: '~', title: 'Contact', meta: '05', run: () => go('#contact') },
    { group: 'Navigate', ic: '→', title: 'View all 8 projects', sub: 'Full build log', keywords: 'projects work portfolio all', run: () => { window.location.href = 'projects.html'; } },

    { group: 'Projects', ic: '#', title: 'EnerVenue HRMS', sub: 'Enterprise HRMS · US & China', keywords: 'hrms saml azure', run: () => go('#case-01') },
    { group: 'Projects', ic: '#', title: 'AI Enterprise Chatbot', sub: 'RAG · document intelligence', keywords: 'ai rag openai langchain milvus', run: () => go('#case-02') },
    { group: 'Projects', ic: '#', title: 'SendMePls', sub: 'Real-time logistics', keywords: 'logistics reverb twilio agora', run: () => go('#case-03') },
    { group: 'Projects', ic: '#', title: 'KaiFit', sub: 'Subscription fitness SaaS', keywords: 'revenuecat fcm mobile', run: () => { window.location.href = 'projects.html#proj-kaifit'; } },
    { group: 'Projects', ic: '#', title: 'Global Time Sheet', sub: 'Multi-tenant HRMS', keywords: 'payroll rbac tenant', run: () => { window.location.href = 'projects.html#proj-globaltimesheet'; } },
    { group: 'Projects', ic: '#', title: 'FedX · MaxMRJ · BIC', sub: 'More on the projects page', keywords: 'fintech healthcare ecommerce', run: () => { window.location.href = 'projects.html'; } },

    { group: 'Connect', ic: '@', title: 'Copy email', sub: 'Girish.soni.official@gmail.com', keywords: 'mail contact', run: () => copy('Girish.soni.official@gmail.com', 'Email copied to clipboard') },
    { group: 'Connect', ic: '@', title: 'Send email', keywords: 'mail mailto', run: () => { window.location.href = 'mailto:Girish.soni.official@gmail.com'; } },
    { group: 'Connect', ic: '@', title: 'Copy phone', sub: '+91 9928283765', keywords: 'call number', run: () => copy('+91 9928283765', 'Phone number copied') },
    { group: 'Connect', ic: '@', title: 'Open LinkedIn', keywords: 'social', run: () => window.open('https://www.linkedin.com/in/girishsoni20', '_blank', 'noopener') },
    { group: 'Connect', ic: '@', title: 'Open GitHub', keywords: 'code repo', run: () => window.open('https://github.com/GirishSoni-lorka', '_blank', 'noopener') },

    { group: 'Actions', ic: '$', title: 'Download résumé', sub: 'assets/resume.pdf', keywords: 'cv pdf', run: () => { const a = document.createElement('a'); a.href = 'assets/resume.pdf'; a.download = ''; a.click(); toast('Downloading résumé…'); } },
    { group: 'Actions', ic: '$', title: 'Toggle theme', sub: 'Light / dark', keywords: 'dark light mode', run: () => { const n = toggleTheme(); toast(n === 'light' ? 'Light mode' : 'Dark mode'); } },
    { group: 'Actions', ic: '$', title: 'Focus terminal', sub: 'Run commands', keywords: 'console shell', run: () => { go('#hero'); setTimeout(() => termInput && termInput.focus(), 400); } }
  ];

  function score(item, q) {
    if (!q) return 1;
    const hay = (item.title + ' ' + (item.sub || '') + ' ' + (item.keywords || '') + ' ' + item.group).toLowerCase();
    q = q.toLowerCase();
    if (hay.includes(q)) return 2;
    // subsequence
    let i = 0;
    for (const ch of hay) { if (ch === q[i]) i++; if (i === q.length) return 1; }
    return 0;
  }

  function renderPalette(q) {
    const matched = COMMANDS.map((c) => ({ c, s: score(c, q) })).filter((x) => x.s > 0);
    visibleItems = matched.map((x) => x.c);
    pList.innerHTML = '';
    if (!visibleItems.length) {
      pList.innerHTML = '<div class="palette__empty">no matches — try “work”, “email”, “theme”</div>';
      return;
    }
    let lastGroup = '';
    let idx = 0;
    visibleItems.forEach((c) => {
      if (c.group !== lastGroup) {
        const g = document.createElement('div');
        g.className = 'palette__group';
        g.textContent = c.group;
        pList.appendChild(g);
        lastGroup = c.group;
      }
      const row = document.createElement('div');
      row.className = 'palette__item';
      row.setAttribute('role', 'option');
      row.dataset.idx = String(idx);
      row.innerHTML =
        '<span class="palette__item-ic">' + c.ic + '</span>' +
        '<span class="palette__item-tx">' + c.title + (c.sub ? '<small>' + c.sub + '</small>' : '') + '</span>' +
        (c.meta ? '<span class="palette__item-meta">' + c.meta + '</span>' : '');
      row.addEventListener('mousemove', () => setSel(parseInt(row.dataset.idx, 10)));
      row.addEventListener('click', () => execItem(parseInt(row.dataset.idx, 10)));
      pList.appendChild(row);
      idx++;
    });
    selIndex = 0;
    paintSel();
  }

  function paintSel() {
    $$('.palette__item', pList).forEach((el) => {
      const on = parseInt(el.dataset.idx, 10) === selIndex;
      el.setAttribute('aria-selected', String(on));
      if (on) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function setSel(i) { selIndex = i; paintSel(); }
  function execItem(i) {
    const c = visibleItems[i];
    if (!c) return;
    closePalette();
    setTimeout(() => c.run(), 60);
  }

  function openPalette() {
    if (!palette.hidden) return;
    lastFocused = document.activeElement;
    palette.hidden = false;
    renderPalette('');
    pInput.value = '';
    setTimeout(() => pInput.focus(), 20);
    document.body.style.overflow = 'hidden';
  }
  function closePalette() {
    if (palette.hidden) return;
    palette.hidden = true;
    document.body.style.overflow = '';
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
    $('#cmdkTrigger') && $('#cmdkTrigger').addEventListener('click', openPalette);
    $('#openPaletteBtn') && $('#openPaletteBtn').addEventListener('click', openPalette);
  }

  // Global shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === 'Escape' && !palette.hidden) { closePalette(); }
    else if (e.key === '/' && palette.hidden && document.activeElement === document.body) { e.preventDefault(); openPalette(); }
  });

  /* ============================================================
     INTERACTIVE TERMINAL
     ============================================================ */
  const termWrap = $('#termWrap');
  const termOut = $('#termOut');
  const termLine = $('#termLine');
  const termInput = $('#termInput');
  const termScreen = $('#termScreen');

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function print(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    termOut.appendChild(div);
    termScreen.scrollTop = termScreen.scrollHeight;
  }
  function printPrompt(cmd) {
    print('<span class="t-prompt">girish@portfolio:~$</span> <span class="t-cmd">' + esc(cmd) + '</span>');
  }

  const RESP = {
    help() {
      return [
        '<span class="t-dim">available commands</span>',
        '  <span class="t-key">whoami</span>     who is Girish',
        '  <span class="t-key">work</span>       jump to selected projects',
        '  <span class="t-key">projects</span>   list everything shipped',
        '  <span class="t-key">open</span>       open the full projects page',
        '  <span class="t-key">stack</span>      tools I build with',
        '  <span class="t-key">resume</span>     download the PDF',
        '  <span class="t-key">contact</span>    how to reach me',
        '  <span class="t-key">theme</span>      toggle light / dark',
        '  <span class="t-key">clear</span>      clear the screen',
        '<span class="t-dim">tip: press <span class="t-key">' + (isMac ? '⌘K' : 'Ctrl+K') + '</span> for the command palette</span>'
      ];
    },
    whoami() {
      return [
        '<span class="t-ok">Girish Soni</span> — Senior Laravel Full Stack Developer',
        'I build enterprise SaaS, AI platforms and the cloud systems beneath them.',
        '4+ yrs · currently @ Maxaix · open to senior &amp; remote roles.'
      ];
    },
    work() { go('#work'); return ['<span class="t-ok">→</span> opening ~/work …']; },
    projects() {
      return [
        '<span class="t-dim">total 8</span>',
        '  <span class="t-key">EnerVenue HRMS</span>        enterprise hrms · us &amp; china',
        '  <span class="t-key">AI Enterprise Chatbot</span> rag · document intelligence',
        '  <span class="t-key">SendMePls</span>             real-time logistics',
        '  <span class="t-key">KaiFit</span>                subscription fitness saas',
        '  <span class="t-key">Global Time Sheet</span>     multi-tenant hrms',
        '  <span class="t-key">FedX</span>                  fintech · payroll-tax engine',
        '  <span class="t-key">MaxMRJ</span>                healthcare · referral platform',
        '  <span class="t-key">BIC</span>                   e-commerce · b2b catalog',
        '<span class="t-dim">run <span class="t-key">open</span> for the full project page →</span>'
      ];
    },
    open() { window.location.href = 'projects.html'; return ['<span class="t-ok">→</span> opening ~/projects …']; },
    stack() {
      return [
        '<span class="t-dim">backend</span>   laravel · php · redis · horizon · queues',
        '<span class="t-dim">frontend</span>  react · next.js · javascript',
        '<span class="t-dim">data</span>      mysql · postgres · milvus',
        '<span class="t-dim">cloud</span>     aws · docker · nginx · linux',
        '<span class="t-dim">ai</span>        openai · langchain · rag · vector-search'
      ];
    },
    resume() {
      const a = document.createElement('a'); a.href = 'assets/resume.pdf'; a.download = ''; a.click();
      return ['<span class="t-ok">→</span> downloading <a href="assets/resume.pdf" download>resume.pdf</a> …'];
    },
    contact() {
      return [
        'email     <a href="mailto:Girish.soni.official@gmail.com">Girish.soni.official@gmail.com</a>',
        'phone     +91 9928283765',
        'linkedin  <a href="https://www.linkedin.com/in/girishsoni20" target="_blank" rel="noopener">in/girishsoni20</a>',
        'github    <a href="https://github.com/GirishSoni-lorka" target="_blank" rel="noopener">GirishSoni-lorka</a>'
      ];
    },
    theme() { const n = toggleTheme(); return ['<span class="t-ok">→</span> switched to ' + n + ' mode']; },
    sudo() { return ['<span class="t-amber">nice try.</span> girish has no time for sudo — he ships in prod 😄']; },
    ls() { return this.projects(); },
    clear() { termOut.innerHTML = ''; return null; }
  };

  function runCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    printPrompt(raw.trim());
    if (cmd === 'clear') { RESP.clear(); return; }
    const fn = RESP[cmd];
    if (fn) {
      const lines = fn.call(RESP);
      if (lines) lines.forEach((l) => print(l));
    } else {
      print('<span class="t-amber">command not found:</span> ' + esc(cmd) + ' <span class="t-dim">— type <span class="t-key">help</span></span>');
    }
    print('');
  }

  // Boot sequence (auto-typed)
  const BOOT = [
    { p: true, cmd: 'whoami' },
    { lines: RESP.whoami() },
    { blank: true },
    { p: true, cmd: 'cat focus.txt' },
    { lines: ['enterprise-saas · multi-tenant · ai &amp; rag · cloud-architecture · real-time'] },
    { blank: true },
    { dim: 'type <span class="t-key">help</span> to explore — this terminal is real.' },
    { blank: true }
  ];

  function typeText(el, text, speed, done) {
    let i = 0;
    (function tick() {
      el.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) setTimeout(tick, speed);
      else done && done();
    })();
  }

  function runBoot(step) {
    if (step >= BOOT.length) {
      termLine.hidden = false;
      return;
    }
    const item = BOOT[step];
    if (item.blank) { print(''); return runBoot(step + 1); }
    if (item.dim) { print('<span class="t-dim">' + item.dim + '</span>'); return runBoot(step + 1); }
    if (item.lines) { item.lines.forEach((l) => print(l)); return runBoot(step + 1); }
    if (item.p) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<span class="t-prompt">girish@portfolio:~$</span> <span class="t-cmd"></span>';
      termOut.appendChild(wrap);
      const target = wrap.querySelector('.t-cmd');
      typeText(target, item.cmd, 55, () => setTimeout(() => runBoot(step + 1), 260));
      termScreen.scrollTop = termScreen.scrollHeight;
    }
  }

  if (termOut && termLine && termInput) {
    if (reduced) {
      // Print everything instantly
      BOOT.forEach((item) => {
        if (item.blank) print('');
        else if (item.dim) print('<span class="t-dim">' + item.dim + '</span>');
        else if (item.lines) item.lines.forEach((l) => print(l));
        else if (item.p) printPrompt(item.cmd);
      });
      termLine.hidden = false;
    } else {
      // Start boot once the terminal scrolls into view (or after load)
      let booted = false;
      const startBoot = () => { if (booted) return; booted = true; setTimeout(() => runBoot(0), 500); };
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((ents, o) => {
          ents.forEach((en) => { if (en.isIntersecting) { startBoot(); o.disconnect(); } });
        }, { threshold: 0.3 });
        io.observe(termWrap);
      } else { window.addEventListener('load', startBoot); }
    }

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = termInput.value;
        termInput.value = '';
        runCommand(val);
      }
    });
    // Click anywhere on screen focuses input
    termScreen.addEventListener('click', () => { if (!termLine.hidden) termInput.focus(); });
  }

  /* ---------- Smooth-scroll fallback ---------- */
  if (!('scrollBehavior' in document.documentElement.style)) {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const t = $(id);
        if (t) { e.preventDefault(); t.scrollIntoView(); }
      });
    });
  }
})();
