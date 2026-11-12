// A very small stand-in for the DOM: just enough for the game's `h()` helper
// and panel renderers to run under Node, so data rendering can be tested
// without a browser or any dependency.

class Node {
  constructor(tag) {
    this.tagName = (tag || '#text').toUpperCase();
    this.nodeType = tag ? 1 : 3;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.style = { cssText: '', setProperty() {} };
    this.dataset = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.text = '';
    this.width = 0; this.height = 0;
  }
  set className(v) { this.attributes.class = v; }
  get className() { return this.attributes.class || ''; }
  set textContent(v) { this.children = []; this.text = String(v); }
  get textContent() { return this.text + this.children.map(c => c.textContent).join(' '); }
  set innerHTML(v) { this.html = v; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  append(...kids) { this.children.push(...kids); }
  appendChild(kid) { this.children.push(kid); return kid; }
  click() { for (const fn of this.listeners.click || []) fn({ currentTarget: this, target: this }); }
  // canvas: every drawing call is accepted and ignored
  getContext() {
    return new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}), set: () => true });
  }
  /* depth-first search helpers */
  all(test, out = []) { if (test(this)) out.push(this); for (const c of this.children) if (c.all) c.all(test, out); return out; }
  byTag(tag) { return this.all(n => n.tagName === tag.toUpperCase()); }
  byClass(name) { return this.all(n => n.className.split(' ').includes(name)); }
}

export function installDom() {
  globalThis.document = {
    baseURI: 'https://girish.lorka.in/',
    createElement: tag => new Node(tag),
    createTextNode: text => { const n = new Node(); n.text = text; return n; },
  };
}

/* wrap a list of nodes so the helpers above can search all of them */
export function fragment(nodes) {
  const root = new Node('div');
  root.children = [nodes].flat(Infinity).filter(Boolean);
  return root;
}
