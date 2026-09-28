/* X-ray: every .xr block gets a "bone" layer cloned from its skin. In the
   bone, headings are outlines with inspector labels, prose becomes skeleton
   bars and anything with data-bone shows its spec. A band of bone follows
   the cursor; blocks marked data-build are built by one scan pass on entry. */

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const spec = text => text.trim().split('\n').map(line => {
  const m = line.match(/^\s*([\w .]+):(.*)$/);
  return m ? `<span class="k">${esc(m[1])}:</span>${esc(m[2])}` : esc(line);
}).join('\n');

function skeleton(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.nodeValue.trim() && !n.parentElement.closest('.insp, .spec') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) { const s = document.createElement('span'); s.className = 'sk'; n.replaceWith(s); s.appendChild(n); }
}

function setup(el) {
  const skin = el.querySelector(':scope > .xr__skin');
  if (!skin) return null;
  const bone = skin.cloneNode(true);
  bone.className = 'xr__bone';
  bone.setAttribute('aria-hidden', 'true');
  bone.inert = true;
  bone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  bone.querySelectorAll('[data-node]').forEach(n => n.removeAttribute('data-node'));

  bone.querySelectorAll('[data-bone]').forEach(n => {
    n.innerHTML = `<code class="spec">${spec(n.dataset.bone)}</code>`;
    n.removeAttribute('data-bone');
  });
  bone.querySelectorAll('p, li, .btn').forEach(n => { if (!n.querySelector('.spec')) skeleton(n); });

  // inspector labels, like a devtools overlay
  const labels = [];
  const skinTargets = [...skin.querySelectorAll('h1, h2, h3, .btn')];
  [...bone.querySelectorAll('h1, h2, h3, .btn')].forEach((n, k) => {
    const tag = document.createElement('span'); tag.className = 'insp';
    n.prepend(tag); labels.push({ tag, src: skinTargets[k] });
  });

  if (el.dataset.boneNote) {
    const note = document.createElement('span'); note.className = 'note';
    note.innerHTML = spec(el.dataset.boneNote); bone.appendChild(note);
  }

  const beam = document.createElement('span'); beam.className = 'xr__beam'; beam.setAttribute('aria-hidden', 'true');
  el.append(bone, beam);

  return {
    el, labels,
    horizontal: el.classList.contains('xr--h'),
    build: el.dataset.build, scanMode: el.dataset.scan,
    w: 0, h: 0, top: 0,
    c: 0, half: 0, targetC: 0, targetHalf: 0, hovering: false,
    state: 'idle', scan: 0, last: '',
  };
}

export function initXray({ fine, reduce, gsap }) {
  const blocks = [...document.querySelectorAll('.xr')].map(setup).filter(Boolean);
  const HALF = 66;

  const set = (b, xt, xb) => {
    const key = `${xt}|${xb}`;
    if (key === b.last) return;
    b.last = key;
    b.el.style.setProperty('--xt', xt); b.el.style.setProperty('--xb', xb);
  };
  const show = (b, on) => b.el.classList.toggle('is-xray', on);

  // blocks waiting to be built start as their spec
  for (const b of blocks) {
    if (b.build === 'intro' || b.build === '') {
      if (reduce) continue;
      b.state = 'spec'; show(b, true); set(b, '0px', '0px'); b.el.classList.add('is-spec');
    }
    if (b.scanMode === 'scroll' && !reduce) { b.state = 'scroll'; show(b, true); }
  }

  function runBuild(b, delay = 0) {
    if (b.state !== 'spec') return;
    b.state = 'building';
    b.el.classList.remove('is-spec'); b.el.classList.add('is-building');
    const proxy = { s: 0 };
    gsap.to(proxy, {
      s: 1, duration: Math.min(1.5, .75 + b.h / 1200), delay, ease: 'power2.inOut',
      onUpdate: () => set(b, `${Math.round(proxy.s * b.h)}px`, '0px'),
      onComplete: () => {
        b.state = 'idle'; b.el.classList.remove('is-building'); show(b, false); set(b, '100%', '0px');
      },
    });
  }

  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const b = blocks.find(x => x.el === en.target);
        if (b) { runBuild(b, .05); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0 });
    blocks.filter(b => b.build === '').forEach(b => io.observe(b.el));
  }

  // hover band
  if (fine) {
    for (const b of blocks) {
      if (b.scanMode === 'scroll') continue;
      b.el.addEventListener('pointerenter', e => { if (b.state === 'idle' || b.state === 'hover') { b.hovering = true; b.state = 'hover'; b.targetC = e.clientY - b.el.getBoundingClientRect().top; if (b.half < 1) b.c = b.targetC; b.targetHalf = Math.min(HALF, b.h / 2 + 8); show(b, true); } });
      b.el.addEventListener('pointermove', e => { if (b.state === 'hover') b.targetC = e.clientY - b.el.getBoundingClientRect().top; });
      b.el.addEventListener('pointerleave', () => { b.hovering = false; b.targetHalf = 0; });
    }
  }

  return {
    blocks,
    measure(sy) {
      for (const b of blocks) {
        const r = b.el.getBoundingClientRect();
        b.w = r.width; b.h = r.height; b.top = r.top + sy;
        for (const l of b.labels) {
          if (!l.src) continue;
          const rr = l.src.getBoundingClientRect();
          const name = l.src.classList.contains('btn') ? 'a.btn' : l.src.tagName.toLowerCase();
          l.tag.textContent = `${name} ${Math.round(rr.width)}×${Math.round(rr.height)}`;
        }
      }
    },
    /* the hero's intro pass is driven from outside */
    drive(b, scanPx) {
      if (!b) return;
      if (scanPx >= b.h) { if (b.state !== 'idle' && b.state !== 'hover') { b.state = 'idle'; b.el.classList.remove('is-spec', 'is-building'); show(b, false); set(b, '100%', '0px'); } return; }
      if (b.state === 'spec' && scanPx > 0) { b.state = 'intro'; b.el.classList.remove('is-spec'); b.el.classList.add('is-building'); }
      if (b.state === 'intro' || b.state === 'spec') set(b, `${Math.max(0, Math.round(scanPx))}px`, '0px');
    },
    frame(state) {
      const k = reduce ? 1 : 1 - Math.exp(-state.dt * 16);
      for (const b of blocks) {
        if (b.state === 'hover') {
          b.c += (b.targetC - b.c) * k; b.half += (b.targetHalf - b.half) * k;
          if (!b.hovering && b.half < .6) { b.half = 0; b.state = 'idle'; show(b, false); set(b, '100%', '0px'); continue; }
          set(b, `${Math.max(0, Math.round(b.c - b.half))}px`, `${Math.max(0, Math.round(b.h - (b.c + b.half)))}px`);
        } else if (b.state === 'scroll') {
          // the statement is built left to right as its pinned section scrolls by
          const sec = b.el.closest('section'), r = sec.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - state.vh)));
          const x = Math.min(1, Math.max(0, (p - .1) / .6));
          if (x >= 1) { if (b.el.classList.contains('is-xray')) show(b, false); }
          else { if (!b.el.classList.contains('is-xray')) show(b, true); }
          const v = `${Math.round(x * (b.w + 2))}px`;
          if (v !== b.last) { b.last = v; b.el.style.setProperty('--xl', v); }
        }
      }
    },
  };
}
