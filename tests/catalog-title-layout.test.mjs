import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../artifacts/10-bottle-value/src/catalog-title-layout.js', import.meta.url), 'utf8');

function fixture({ observers = true } = {}) {
  const frames = new Map();
  const events = [];
  const resize = [];
  const visibility = [];
  const listeners = new Set();
  let sequence = 0;
  let fontsReady;
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = new Set(); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); this.disconnected = true; }
  }
  const context = vm.createContext({
    requestAnimationFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    getComputedStyle: () => ({ fontSize: '20px' }),
    window: {
      addEventListener: (type, fn) => listeners.add(fn),
      removeEventListener: (type, fn) => listeners.delete(fn),
    },
    document: { fonts: { ready: { then: callback => { fontsReady = callback; } } } },
    ...(observers ? {
      ResizeObserver: class extends Observer { constructor(callback) { super(callback); resize.push(this); } },
      IntersectionObserver: class extends Observer { constructor(callback) { super(callback); visibility.push(this); } },
    } : {}),
  });
  vm.runInContext(source.replace('export function', 'function'), context);
  function add(name, available = 180, needed = 200) {
    const card = { name };
    const title = { get clientWidth() { events.push(`width:${name}`); return available; } };
    const measure = { getBoundingClientRect() { events.push(`measure:${name}`); return { width: needed }; } };
    const sizes = [];
    const stop = context.observeCatalogTitle(card, title, measure, value => { events.push(`apply:${name}`); sizes.push(value); });
    return { card, sizes, stop };
  }
  function flush() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback());
  }
  return { add, events, frames, resize, visibility, listeners, flush, fonts: () => fontsReady() };
}

test('55 catalog cards share observers and batch all geometry reads before any updates', () => {
  const f = fixture();
  const cards = Array.from({ length: 55 }, (_, index) => f.add(String(index)));
  assert.equal(f.resize.length, 1);
  assert.equal(f.visibility.length, 1);
  assert.equal(f.listeners.size, 1);
  f.visibility[0].callback(cards.map(({ card }) => ({ target: card, isIntersecting: true })));
  f.fonts();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.events.filter(event => event.startsWith('measure:')).length, 55);
  assert.equal(f.events.findIndex(event => event.startsWith('apply:')), 110);
  assert.ok(cards.every(({ sizes }) => sizes[0] === 18));
});

test('offscreen cards do not force descendant layout and fit on approaching the viewport', () => {
  const f = fixture();
  const visible = f.add('visible');
  const distant = f.add('distant');
  f.visibility[0].callback([{ target: visible.card, isIntersecting: true }, { target: distant.card, isIntersecting: false }]);
  f.fonts();
  f.flush();
  assert.deepEqual(distant.sizes, []);
  assert.equal(f.events.includes('measure:distant'), false);
  f.visibility[0].callback([{ target: distant.card, isIntersecting: true }]);
  f.flush();
  assert.deepEqual(distant.sizes, [18]);
});

test('height-only ResizeObserver notifications do not cause refit loops', () => {
  const f = fixture();
  const { card, sizes } = f.add('one');
  f.visibility[0].callback([{ target: card, isIntersecting: true }]);
  f.resize[0].callback([{ target: card, contentRect: { width: 200, height: 600 } }]);
  f.flush();
  f.resize[0].callback([{ target: card, contentRect: { width: 200, height: 620 } }]);
  assert.equal(f.frames.size, 0);
  f.resize[0].callback([{ target: card, contentRect: { width: 180, height: 620 } }]);
  f.flush();
  assert.equal(sizes.length, 2);
});

test('viewport font breakpoints refit visible titles even when card width is unchanged', () => {
  const f = fixture();
  const visible = f.add('visible');
  const distant = f.add('distant');
  f.visibility[0].callback([{ target: visible.card, isIntersecting: true }]);
  f.flush();
  for (const listener of f.listeners) listener();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(visible.sizes.length, 2);
  assert.deepEqual(distant.sizes, []);
});

test('long titles retain wrapping instead of shrinking below the existing minimum', () => {
  const f = fixture();
  const long = f.add('long', 100, 200);
  const short = f.add('short', 200, 100);
  const hidden = f.add('hidden', 0, 100);
  f.visibility[0].callback([long, short, hidden].map(({ card }) => ({ target: card, isIntersecting: true })));
  f.flush();
  assert.deepEqual(long.sizes, [null]);
  assert.deepEqual(short.sizes, [null]);
  assert.deepEqual(hidden.sizes, []);
});

test('unmount removes pending work and disconnects the shared observers', () => {
  const f = fixture();
  const card = f.add('one');
  f.visibility[0].callback([{ target: card.card, isIntersecting: true }]);
  card.stop();
  f.flush();
  f.fonts();
  assert.equal(f.frames.size, 0);
  assert.deepEqual(card.sizes, []);
  assert.equal(f.resize[0].disconnected, true);
  assert.equal(f.visibility[0].disconnected, true);
  assert.equal(f.listeners.size, 0);
});

test('older browsers retain title fitting with one removable resize listener', () => {
  const f = fixture({ observers: false });
  const a = f.add('a');
  const b = f.add('b');
  assert.equal(f.listeners.size, 1);
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.deepEqual(a.sizes, [18]);
  assert.deepEqual(b.sizes, [18]);
  a.stop();
  b.stop();
  assert.equal(f.listeners.size, 0);
});
