// Portfolio data and how it renders into panels. The data must match what
// the published pages say: these tests read index.html and projects.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { installDom, fragment } from './helpers/dom.mjs';

installDom();
const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const indexHtml = read('index.html'), projectsHtml = read('projects.html');

const { profile } = await import('../assets/game/data/profile.js');
const { experience } = await import('../assets/game/data/experience.js');
const { skillGroups, allSkills } = await import('../assets/game/data/skills.js');
const { projects } = await import('../assets/game/data/projects.js');
const { achievements, education, certifications } = await import('../assets/game/data/achievements.js');
const { contact } = await import('../assets/game/data/contact.js');
const { locations } = await import('../assets/game/data/locations.js');
const { renderPanel, PANEL_TYPES } = await import('../assets/game/ui/content.js');

const open = () => {};
const text = view => fragment(view.body).textContent;

test('profile: name, title and intro come from the site', () => {
  assert.equal(profile.name, 'Girish Soni');
  assert.match(profile.title, /Senior Laravel Full-Stack Developer/);
  assert.ok(indexHtml.includes(profile.intro), 'intro is the hero lead, word for word');
  assert.ok(indexHtml.includes(profile.statement.replace("'", "'")), 'statement is the manifesto line');
  for (const p of profile.principles) assert.ok(indexHtml.includes(p.title) && indexHtml.includes(p.text), p.title);
});

test('experience: the two employers on the site, newest first, nothing else', () => {
  assert.deepEqual(experience.map(e => e.company), ['Maxaix', 'Web Techno Software']);
  for (const e of experience) {
    assert.ok(indexHtml.includes(e.company), e.company);
    assert.ok(indexHtml.includes(e.summary), `${e.company} summary is the Journey text`);
    assert.ok(e.responsibilities.length >= 3 && e.achievements.length >= 1);
  }
});

test('skills: all twelve requested technologies, in sensible groups', () => {
  const wanted = ['PHP', 'Laravel', 'React', 'Next.js', 'JavaScript', 'Python', 'MySQL', 'Redis', 'Docker', 'AWS', 'AI / LLM Integration', 'Prompt Engineering'];
  assert.deepEqual(allSkills.map(s => s.name).sort(), wanted.sort());
  assert.equal(skillGroups.length, 4);
  assert.equal(new Set(allSkills.map(s => s.id)).size, allSkills.length, 'ids are unique');
  for (const g of skillGroups) assert.ok(['rack', 'screen', 'stack', 'core'].includes(g.shape), `${g.name} has a display shape`);
});

test('skills: every "used in" points at a real project that lists related tech', () => {
  const ids = new Set(projects.map(p => p.id));
  for (const s of allSkills) for (const id of s.usedIn) assert.ok(ids.has(id), `${s.name} -> ${id}`);
});

test('projects: all eight write-ups, matching projects.html', () => {
  assert.equal(projects.length, 8);
  for (const p of projects) {
    assert.ok(projectsHtml.includes(`>${p.name}</h2>`), `${p.name} title`);
    assert.ok(projectsHtml.includes(p.description), `${p.name} description is the published lead`);
    for (const line of p.highlights) assert.ok(projectsHtml.includes(line), `${p.name}: ${line.slice(0, 40)}`);
    assert.ok(projectsHtml.includes(p.stack.join(', ')), `${p.name} stack`);
    const [page, anchor] = p.page.split('#');
    assert.equal(page, 'projects.html');
    assert.ok(projectsHtml.includes(`id="${anchor}"`), `${p.page} exists`);
    assert.match(p.accent, /^#[0-9a-f]{6}$/);
  }
});

test('projects: no invented repository, demo or image URLs', () => {
  for (const p of projects) {
    assert.equal(p.github, undefined, `${p.name} github`);
    assert.equal(p.live, undefined, `${p.name} live`);
    if (p.image) assert.ok(fs.existsSync(new URL(p.image, root)), `${p.image} exists`);
  }
});

test('achievements: only what the résumé states; no certifications are made up', () => {
  assert.deepEqual(achievements.map(a => a.title), ['Out of the Box Performance Recognition']);
  assert.deepEqual(education.map(e => e.degree), ['Master of Computer Applications', 'Bachelor of Computer Applications']);
  assert.deepEqual(certifications, []);
});

test('contact: the same links as the site', () => {
  const by = Object.fromEntries(contact.methods.map(m => [m.id, m]));
  for (const id of ['email', 'linkedin', 'github', 'phone', 'resume']) {
    assert.ok(by[id], id);
    assert.ok(indexHtml.includes(`href="${by[id].href}"`), `${id}: ${by[id].href} is on the site`);
  }
  assert.match(by.email.href, /^mailto:/);
  assert.ok(by.linkedin.external && by.github.external);
  assert.ok(fs.existsSync(new URL(by.resume.href, root)), 'résumé file exists');
});

test('confidentiality: no client name or codename anywhere in the game', () => {
  const banned = [['Ener', 'Venue'].join(''), ['Pho', 'enix'].join('')].map(w => new RegExp(w, 'i'));
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)]);
  for (const file of [...walk(new URL('assets/game/', root)), new URL('assets/js/selector.js', root)]) {
    const body = fs.readFileSync(file, 'utf8');
    for (const re of banned) assert.ok(!re.test(body), `${file.pathname} is clean`);
  }
});

test('every district opens a panel type that exists', () => {
  for (const l of locations) assert.ok(PANEL_TYPES.includes(l.panel), `${l.id} -> ${l.panel}`);
});

test('render: About panel introduces Girish Soni', () => {
  const v = renderPanel({ type: 'about' }, open);
  assert.equal(v.title, 'Girish Soni');
  const t = text(v);
  assert.ok(t.includes('Senior Laravel Full-Stack Developer') && t.includes(profile.intro) && t.includes('Available for senior and remote roles'));
  const resume = fragment(v.body).byTag('a').find(a => a.getAttribute('href') === 'assets/resume.pdf');
  assert.ok(resume && resume.getAttribute('download') !== null);
});

test('render: Experience panel has timeline, responsibilities and highlights', () => {
  const t = text(renderPanel({ type: 'experience' }, open));
  for (const e of experience) {
    assert.ok(t.includes(e.company) && t.includes(e.period) && t.includes(e.role));
    for (const r of e.responsibilities) assert.ok(t.includes(r));
    for (const a of e.achievements) assert.ok(t.includes(a));
  }
});

test('render: Skills overview lists every skill as a button that opens it', () => {
  const opened = [];
  const v = renderPanel({ type: 'skills' }, p => opened.push(p));
  const buttons = fragment(v.body).byTag('button');
  assert.equal(buttons.length, allSkills.length);
  buttons[1].click();
  assert.deepEqual(opened, [{ type: 'skill', id: allSkills[1].id }]);
});

test('render: each skill panel shows its detail and links back to the overview', () => {
  for (const s of allSkills) {
    const v = renderPanel({ type: 'skill', id: s.id }, open);
    assert.equal(v.title, s.name);
    assert.deepEqual(v.back, { type: 'skills' });
    const t = text(v);
    assert.ok(t.includes(s.detail));
    for (const id of s.usedIn) assert.ok(t.includes(projects.find(p => p.id === id).name));
  }
});

test('render: project list and each project panel', () => {
  const opened = [];
  const listView = renderPanel({ type: 'projects' }, p => opened.push(p));
  const cards = fragment(listView.body).byClass('gp-project');
  assert.equal(cards.length, projects.length);
  cards[3].click();
  assert.deepEqual(opened, [{ type: 'project', id: projects[3].id }]);

  for (const p of projects) {
    const v = renderPanel({ type: 'project', id: p.id }, open);
    assert.equal(v.title, p.name);
    const t = text(v);
    assert.ok(t.includes(p.description));
    for (const s of p.stack) assert.ok(t.includes(s), `${p.name} shows ${s}`);
    const links = fragment(v.body).byTag('a');
    assert.deepEqual(links.map(a => a.getAttribute('href')), [p.page], 'only the real write-up link');
    assert.equal(links[0].getAttribute('target'), '_blank');
    assert.match(links[0].getAttribute('rel'), /noopener/);
    assert.equal(fragment(v.body).byClass('gp-poster').length, 1, 'has a preview');
  }
});

test('render: repository and demo links appear only when the data has them', () => {
  projects.push({ ...projects[0], id: 'tmp', github: 'https://github.com/example/repo', live: 'https://example.com' });
  try {
    const hrefs = fragment(renderPanel({ type: 'project', id: 'tmp' }, open).body).byTag('a').map(a => a.getAttribute('href'));
    assert.ok(hrefs.includes('https://github.com/example/repo') && hrefs.includes('https://example.com'));
  } finally { projects.pop(); }
});

test('render: Achievement panel covers recognition, education, certifications, milestones', () => {
  const t = text(renderPanel({ type: 'achievements' }, open));
  assert.ok(t.includes('Out of the Box Performance Recognition'));
  assert.ok(t.includes('Master of Computer Applications') && t.includes('Lachoo Memorial College, Jodhpur'));
  assert.ok(t.includes('None on record'), 'says plainly that there are no certifications');
});

test('render: Contact panel links work as real links', () => {
  const links = fragment(renderPanel({ type: 'contact' }, open).body).byTag('a');
  const by = Object.fromEntries(links.map(a => [a.getAttribute('data-method'), a]));
  assert.equal(by.email.getAttribute('href'), 'mailto:Girish.soni.official@gmail.com');
  for (const id of ['linkedin', 'github']) {
    assert.match(by[id].getAttribute('href'), /^https:\/\//);
    assert.equal(by[id].getAttribute('target'), '_blank');
    assert.match(by[id].getAttribute('rel'), /noopener/);
  }
  assert.equal(by.email.getAttribute('target'), null);
  assert.notEqual(by.resume.getAttribute('download'), null);
});

test('render: unknown panels and ids fail safely', () => {
  assert.equal(renderPanel({ type: 'nope' }, open), null);
  assert.equal(renderPanel({ type: 'skill', id: 'cobol' }, open).title, 'What I build with');
  assert.equal(renderPanel({ type: 'project', id: 'missing' }, open).title, 'The build log');
});

test('render: data is inserted as text, never as markup', () => {
  projects.push({ ...projects[0], id: 'xss', name: '<img src=x onerror=alert(1)>' });
  try {
    const v = renderPanel({ type: 'project', id: 'xss' }, open);
    assert.equal(v.title, '<img src=x onerror=alert(1)>');
    assert.equal(fragment(v.body).all(n => n.html && n.html.includes('onerror')).length, 0);
  } finally { projects.pop(); }
});
