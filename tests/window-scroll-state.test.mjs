import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';

const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const pluginRequire = createRequire(appRequire.resolve('@vitejs/plugin-react'));
const babelRequire = createRequire(pluginRequire.resolve('@babel/core'));
const { parse } = babelRequire('@babel/parser');
const source = await readFile(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const appBody = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration' && node.declaration.id?.name === 'App').declaration.body.body;
const scrollEffects = appBody
  .filter(node => node.type === 'ExpressionStatement' && node.expression.callee?.name === 'useEffect')
  .map(node => node.expression.arguments[0])
  .map(node => source.slice(node.start, node.end))
  .filter(callback => callback.includes('window.addEventListener("scroll"'));
assert.ok(scrollEffects.length, 'App has window scroll effects to exercise');

// Execute every actual window-scroll effect, with dropdowns closed as on a
// normal storefront page. Observe App state notifications rather than copies
// of the threshold logic. A mobile-only header flag would fail the first test.
function fixture({ width = 390, scrollY = 0 } = {}) {
  const listeners = new Map();
  const updates = [];
  const context = vm.createContext({ isCountryDropdownOpen: false });
  for (const callback of scrollEffects) {
    for (const name of callback.match(/\bset[A-Z]\w*/g) ?? []) {
      context[name] = value => updates.push([name, value]);
    }
  }
  const view = {
    scrollY,
    matchMedia: query => {
      assert.equal(query, '(max-width: 767px)');
      return { get matches() { return width <= 767; } };
    },
    addEventListener: (type, callback) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener: (type, callback) => listeners.get(type)?.delete(callback),
  };
  context.window = view;
  const cleanups = scrollEffects.map(callback => vm.runInContext(`(${callback})()`, context));
  const emit = type => listeners.get(type)?.forEach(callback => callback({ type }));
  return {
    updates,
    scroll(value) { view.scrollY = value; emit('scroll'); },
    resize(value) { width = value; emit('resize'); },
    cleanup() { cleanups.forEach(cleanup => cleanup?.()); },
    get listenerCount() { return [...listeners.values()].reduce((total, group) => total + group.size, 0); },
  };
}

for (const width of [390, 767, 768, 1536]) {
  test(`scrolling below the button threshold does not notify App at ${width}px`, () => {
    const f = fixture({ width });
    f.updates.length = 0;
    for (const y of [1, 200, 400, 200, 0]) f.scroll(y);
    assert.deepEqual(f.updates, []);
    f.cleanup();
    assert.equal(f.listenerCount, 0);
  });
}

test('scroll-to-top still appears above 400px, updates only on crossings, and cleans up', () => {
  const f = fixture();
  assert.deepEqual(f.updates, [['setShowScrollTop', false]]);
  f.updates.length = 0;
  for (const y of [400, 401, 700, 500, 400, 200, 1000, 0]) f.scroll(y);
  assert.deepEqual(f.updates, [
    ['setShowScrollTop', true], ['setShowScrollTop', false],
    ['setShowScrollTop', true], ['setShowScrollTop', false],
  ]);
  f.cleanup();
  f.updates.length = 0;
  f.scroll(800);
  assert.deepEqual(f.updates, []);
  assert.equal(f.listenerCount, 0);
});

test('restored scroll position initializes the button and resize adds no header state updates', () => {
  const f = fixture({ scrollY: 700 });
  assert.deepEqual(f.updates, [['setShowScrollTop', true]]);
  f.updates.length = 0;
  for (const width of [767, 768, 1536, 390]) f.resize(width);
  assert.deepEqual(f.updates, []);
  f.cleanup();
});
