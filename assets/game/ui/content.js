/* Turns portfolio data into panel content. One function per panel type;
   each returns { eyebrow, title, accent, body, back? }. `open` navigates to
   another panel. Everything shown comes from assets/game/data/. */

import { h, icon } from './dom.js';
import { profile } from '../data/profile.js';
import { experience, journeyNote } from '../data/experience.js';
import { skillGroups, allSkills, findSkill } from '../data/skills.js';
import { projects, findProject } from '../data/projects.js';
import { achievements, education, certifications, milestones } from '../data/achievements.js';
import { contact } from '../data/contact.js';
import { locations, findLocation } from '../data/locations.js';
import { drawPoster } from '../core/poster.js';

const section = (title, ...kids) => h('section', { class: 'gp-sec' }, h('h3', { class: 'gp-sec__title', text: title }), kids);
const list = items => h('ul', { class: 'gp-list' }, items.map(t => h('li', { text: t })));
const chips = items => h('ul', { class: 'gp-chips' }, items.map(t => h('li', { text: t })));
const go = (label, onclick, solid) => h('button', { class: `gbtn${solid ? ' gbtn--solid' : ''}`, type: 'button', onclick }, label);
const link = (label, href, o = {}) => h('a', {
  class: `gbtn${o.solid ? ' gbtn--solid' : ''}`, href,
  target: o.external ? '_blank' : null, rel: o.external ? 'noopener noreferrer' : null, download: o.download || null,
}, label, o.external ? icon('out', 13) : null);

function poster(project) {
  if (project.image) return h('img', { class: 'gp-poster', src: project.image, alt: `${project.name} preview`, loading: 'lazy' });
  const canvas = h('canvas', { class: 'gp-poster', role: 'img', 'aria-label': `${project.name} poster` });
  drawPoster(canvas, project, projects.indexOf(project));
  return canvas;
}

const PANELS = {
  about({ open }) {
    const loc = findLocation('plaza');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: profile.name, accent: loc.accent,
      body: [
        h('p', { class: 'gp-role', text: profile.title }),
        h('p', { class: 'gp-status' }, h('span', { class: 'gp-status__dot' }), profile.status),
        h('p', { class: 'gp-lead', text: profile.intro }),
        h('dl', { class: 'gp-facts' }, profile.facts.map(f => h('div', null, h('dt', { text: f.label }), h('dd', { text: f.value })))),
        h('blockquote', { class: 'gp-quote', text: profile.statement }),
        section('About', h('p', { text: profile.summary }), h('p', { class: 'gp-dim', text: `Based in ${profile.location}.` })),
        section('How I work', h('ul', { class: 'gp-cards' }, profile.principles.map(p =>
          h('li', null, h('h4', { text: p.title }), h('p', { text: p.text }))))),
        h('div', { class: 'gp-actions' },
          go('See my experience', () => open({ type: 'experience' }), true),
          go('Get in touch', () => open({ type: 'contact' })),
          link('Download résumé', 'assets/resume.pdf', { download: true })),
      ],
    };
  },

  experience({ open }) {
    const loc = findLocation('hq');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: 'Four years, two teams', accent: loc.accent,
      body: [
        h('p', { class: 'gp-lead', text: journeyNote.replace(/^Four years, two teams\.\s*/, '') }),
        h('ol', { class: 'gp-timeline' }, experience.map(e => h('li', null,
          h('p', { class: 'gp-when', text: e.period }),
          h('h3', { class: 'gp-where', text: e.company }),
          h('p', { class: 'gp-role', text: `${e.role} / ${e.place}` }),
          h('p', { text: e.summary }),
          chips(e.keywords),
          h('h4', { class: 'gp-sub', text: 'Key responsibilities' }), list(e.responsibilities),
          h('h4', { class: 'gp-sub', text: 'Highlights' }), list(e.achievements)))),
        h('div', { class: 'gp-actions' },
          go('See the projects', () => open({ type: 'projects' }), true),
          go('Skills', () => open({ type: 'skills' }))),
      ],
    };
  },

  skills({ open }) {
    const loc = findLocation('tech');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: 'What I build with', accent: loc.accent,
      body: [
        h('p', { class: 'gp-lead', text: `${allSkills.length} technologies in ${skillGroups.length} groups. Each one has a display in the zone; pick any for the detail.` }),
        skillGroups.map(g => section(g.name,
          h('p', { class: 'gp-dim', text: g.blurb }),
          h('div', { class: 'gp-picks' }, g.skills.map(s => go(s.name, () => open({ type: 'skill', id: s.id })))))),
      ],
    };
  },

  skill({ id, open }) {
    const s = findSkill(id), loc = findLocation('tech');
    if (!s) return PANELS.skills({ open });
    const used = s.usedIn.map(findProject).filter(Boolean);
    return {
      eyebrow: `${loc.name} / ${s.groupName}`, title: s.name, accent: loc.accent, back: { type: 'skills' },
      body: [
        h('p', { class: 'gp-lead', text: s.detail }),
        section('In practice', list(s.points)),
        used.length ? section('Used in', h('div', { class: 'gp-picks' }, used.map(p => go(p.name, () => open({ type: 'project', id: p.id }))))) : null,
      ],
    };
  },

  projects({ open }) {
    const loc = findLocation('garage');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: 'The build log', accent: loc.accent,
      body: [
        h('p', { class: 'gp-lead', text: `${projects.length} production systems. For each one: the problem it solved, how it was built and the stack behind it.` }),
        h('ul', { class: 'gp-projects' }, projects.map((p, i) => h('li', null,
          h('button', { type: 'button', class: 'gp-project', style: `--accent:${p.accent}`, onclick: () => open({ type: 'project', id: p.id }) },
            h('span', { class: 'gp-project__no', text: String(i + 1).padStart(2, '0') }),
            h('span', { class: 'gp-project__name', text: p.name }),
            h('span', { class: 'gp-project__kind', text: p.kind }))))),
      ],
    };
  },

  project({ id, open }) {
    const p = findProject(id), loc = findLocation('garage');
    if (!p) return PANELS.projects({ open });
    const links = [
      p.live ? link('Live demo', p.live, { external: true, solid: true }) : null,
      p.github ? link('GitHub repository', p.github, { external: true }) : null,
      link('Full write-up', p.page, { external: true, solid: !p.live }),
    ];
    return {
      eyebrow: `${loc.name} / ${p.kind}`, title: p.name, accent: p.accent, back: { type: 'projects' },
      body: [
        poster(p),
        h('p', { class: 'gp-when', text: p.meta }),
        h('p', { class: 'gp-lead', text: p.description }),
        section('What it does', list(p.highlights)),
        section('Technologies', chips(p.stack)),
        h('div', { class: 'gp-actions' }, links),
        !p.live && !p.github ? h('p', { class: 'gp-dim gp-note', text: 'Client work: there is no public repository or demo for this project.' }) : null,
      ],
    };
  },

  achievements({ open }) {
    const loc = findLocation('achievements');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: 'Milestones', accent: loc.accent,
      body: [
        section('Recognition', h('ul', { class: 'gp-cards' }, achievements.map(a => h('li', null, h('h4', { text: a.title }), h('p', { text: a.text }))))),
        section('Education', h('ul', { class: 'gp-cards' }, education.map(e => h('li', null,
          h('h4', { text: e.degree }), h('p', { text: e.school }), h('p', { class: 'gp-when', text: e.period }))))),
        section('Certifications', certifications.length
          ? h('ul', { class: 'gp-cards' }, certifications.map(c => h('li', null, h('h4', { text: c.name }), h('p', { text: [c.issuer, c.year].filter(Boolean).join(', ') }))))
          : h('p', { class: 'gp-dim', text: 'None on record. The work in the Project Garage is the evidence.' })),
        section('Professional milestones', h('ol', { class: 'gp-steps' }, milestones.map(m => h('li', null, h('span', { class: 'gp-when', text: m.when }), h('span', { text: m.text }))))),
        h('div', { class: 'gp-actions' }, go('See the projects', () => open({ type: 'projects' }), true)),
      ],
    };
  },

  /* shown when every district has been found, or the guided tour ends */
  complete({ open }) {
    const email = contact.methods.find(m => m.primary), linkedin = contact.methods.find(m => m.id === 'linkedin');
    return {
      eyebrow: `${locations.length} of ${locations.length} districts`, title: 'City explored', accent: '#ff5a1f',
      body: [
        h('p', { class: 'gp-lead', text: profile.intro }),
        h('p', { class: 'gp-status' }, h('span', { class: 'gp-status__dot' }), profile.status),
        h('dl', { class: 'gp-facts' }, profile.facts.map(f => h('div', null, h('dt', { text: f.label }), h('dd', { text: f.value })))),
        h('div', { class: 'gp-actions' },
          link('Email me', email.href, { solid: true }),
          link('LinkedIn', linkedin.href, { external: true }),
          link('Download résumé', 'assets/resume.pdf', { download: true })),
        section('Look again', h('div', { class: 'gp-picks' }, locations.map(l => go(l.name, () => open({ type: l.panel }))))),
      ],
    };
  },

  contact() {
    const loc = findLocation('mission');
    return {
      eyebrow: `${loc.name} / ${loc.topic}`, title: contact.headline, accent: loc.accent,
      body: [
        h('p', { class: 'gp-lead', text: contact.lead }),
        h('ul', { class: 'gp-contact' }, contact.methods.map(m => h('li', null,
          h('a', {
            class: `gp-method${m.primary ? ' gp-method--primary' : ''}`, href: m.href, 'data-method': m.id,
            target: m.external ? '_blank' : null, rel: m.external ? 'noopener noreferrer' : null, download: m.download || null,
          },
            h('span', { class: 'gp-method__label', text: m.label }),
            h('span', { class: 'gp-method__value', text: m.value }),
            icon(m.external ? 'out' : 'arrow', 14))))),
      ],
    };
  },
};

export const PANEL_TYPES = Object.keys(PANELS);

export function renderPanel(panel, open) {
  const make = PANELS[panel.type];
  return make ? make({ ...panel, open }) : null;
}
