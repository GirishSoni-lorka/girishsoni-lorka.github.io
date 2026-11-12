// Static-hosting safety: everything the pages and modules reference must
// exist, with exactly the same letter case (GitHub Pages is case-sensitive),
// and nothing may assume the site is served from the domain root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out); else out.push(f);
  }
  return out;
}

/* exists, and every path segment matches the directory listing exactly */
function existsExact(file) {
  let dir = ROOT;
  for (const part of path.relative(ROOT, file).split(path.sep)) {
    if (!fs.existsSync(dir) || !fs.readdirSync(dir).includes(part)) return false;
    dir = path.join(dir, part);
  }
  return true;
}

const files = walk(ROOT);
const modules = files.filter(f => /assets[\\/](js|game)[\\/].*\.js$/.test(f));
const pages = files.filter(f => /\.html$/.test(f) && path.dirname(f) === ROOT);

test('CNAME and custom domain are untouched', () => {
  assert.equal(fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim(), 'girish.lorka.in');
});

test('no build step or server requirement was introduced', () => {
  for (const f of ['package.json', 'vite.config.js', 'webpack.config.js', '.nojekyll']) assert.ok(!fs.existsSync(path.join(ROOT, f)), `${f} should not exist`);
  assert.ok(!fs.existsSync(path.join(ROOT, '.github', 'workflows')), 'deployment is still "publish the branch"');
});

test('both pages still exist with their SEO metadata', () => {
  assert.deepEqual(pages.map(rel).sort(), ['index.html', 'projects.html']);
  for (const p of pages) {
    const html = fs.readFileSync(p, 'utf8');
    for (const needle of ['<link rel="canonical" href="https://girish.lorka.in/', 'property="og:title"', 'name="description"', 'assets/js/main.js']) assert.ok(html.includes(needle), `${rel(p)}: ${needle}`);
  }
  assert.ok(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('application/ld+json'));
});

test('every section anchor the site links to still exists', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const projects = fs.readFileSync(path.join(ROOT, 'projects.html'), 'utf8');
  for (const id of ['top', 'main', 'work', 'log', 'journey', 'contact', 'email']) assert.ok(index.includes(`id="${id}"`), `index.html#${id}`);
  for (const m of index.matchAll(/href="projects\.html#([\w-]+)"/g)) assert.ok(projects.includes(`id="${m[1]}"`), `projects.html#${m[1]}`);
});

test('pages reference local assets with relative, existing, exact-case paths', () => {
  for (const p of pages) {
    const html = fs.readFileSync(p, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="([^"#:]+?)(?:#[^"]*)?"/g)) {
      const ref = m[1];
      if (!ref || ref.startsWith('//')) continue;
      assert.ok(!ref.startsWith('/'), `${rel(p)}: "${ref}" is root-absolute and would break under a sub-path`);
      assert.ok(existsExact(path.join(ROOT, ref)), `${rel(p)}: "${ref}" does not exist with that exact case`);
    }
  }
});

test('every module import resolves to a file with exactly that case', () => {
  let checked = 0;
  for (const f of [...modules, ...files.filter(x => /vendor[\\/]three[\\/]addons[\\/].*\.js$/.test(x))]) {
    const src = fs.readFileSync(f, 'utf8');
    const specs = [...src.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(m => m[1]);
    for (const s of specs) {
      assert.ok(existsExact(path.resolve(path.dirname(f), s)), `${rel(f)} imports "${s}", which does not exist with that exact case`);
      checked++;
    }
    assert.ok(!/from\s+['"]three['"]/.test(src), `${rel(f)} uses a bare "three" import, which needs a bundler or import map`);
  }
  assert.ok(checked > 80, `checked ${checked} imports`);
});

test('assets loaded by URL are resolved from the module, not from the site root', () => {
  for (const f of modules) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(!/['"`]\/assets\//.test(src), `${rel(f)} has a root-absolute /assets/ path`);
    for (const m of src.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) {
      assert.ok(existsExact(path.resolve(path.dirname(f), m[1])), `${rel(f)}: ${m[1]} exists`);
    }
  }
});

test('the 3D engine and model are shipped with the site and nothing starts with an underscore', () => {
  for (const f of ['assets/vendor/three/three.module.min.js', 'assets/vendor/three/LICENSE', 'assets/vendor/three/addons/GLTFLoader.js', 'assets/models/explorer.glb', 'assets/game/game.css']) {
    assert.ok(existsExact(path.join(ROOT, f)), f);
  }
  // GitHub Pages' default Jekyll build drops files and folders that start with "_"
  for (const f of files.filter(x => x.includes(`${path.sep}assets${path.sep}`))) assert.ok(!rel(f).split('/').some(s => s.startsWith('_')), rel(f));
  assert.ok(fs.statSync(path.join(ROOT, 'assets/models/explorer.glb')).size < 600 * 1024, 'character stays under 600 KB');
});

test('the classic site never statically imports the game or the 3D engine', () => {
  // follow static imports only, starting from the entry the pages load
  const seen = new Set();
  const visit = f => {
    if (seen.has(f)) return;
    seen.add(f);
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/^\s*import\s[^'"]*?['"](\.{1,2}\/[^'"]+)['"]/gm)) visit(path.resolve(path.dirname(f), m[1]));
    for (const m of src.matchAll(/^\s*export\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) visit(path.resolve(path.dirname(f), m[1]));
  };
  visit(path.join(ROOT, 'assets/js/main.js'));
  const loaded = [...seen].map(rel);
  assert.ok(loaded.includes('assets/js/game-launcher.js'));
  for (const f of loaded) assert.ok(!f.startsWith('assets/game/') && !f.includes('vendor/'), `${f} is loaded up front`);
});
