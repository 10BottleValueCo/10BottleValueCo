import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const pluginRequire = createRequire(appRequire.resolve('@vitejs/plugin-react'));
const { parse } = createRequire(pluginRequire.resolve('@babel/core'))('@babel/parser');
const source = await readFile(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const node = ast.program.body.find(item => item.type === 'FunctionDeclaration' && item.id.name === 'importLazyPageWithRecovery');
assert.ok(node, 'Upstream shipping chunk recovery helper is preserved');
const recover = browser => vm.runInNewContext(`(${source.slice(node.start, node.end)})`, { window: browser, Promise, String });
const key = 'synthetic-shipping-reload';
const fixture = () => {
  const values = new Map(); let reloads = 0;
  const browser = { sessionStorage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }, location: { reload: () => { reloads += 1; } } };
  return { browser, values, reloads: () => reloads, load: recover(browser) };
};

test('successful shipping import clears the previous reload marker', async () => {
  const f = fixture(); f.values.set(key, '1');
  const module = { default: 'synthetic page' };
  assert.equal(await f.load(() => module, key), module);
  assert.equal(f.values.has(key), false); assert.equal(f.reloads(), 0);
});

test('one stale shipping chunk triggers a reload; repeated failure surfaces the fallback', async () => {
  const f = fixture(); const failure = new Error('Failed to fetch dynamically imported module');
  let settled = false;
  f.load(() => { throw failure; }, key).finally(() => { settled = true; });
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
  assert.equal(f.reloads(), 1); assert.equal(f.values.get(key), '1'); assert.equal(settled, false);
  await assert.rejects(f.load(() => { throw failure; }, key), error => error === failure);
  assert.equal(f.reloads(), 1); assert.equal(f.values.has(key), false);
});

test('ordinary module errors and unavailable storage never cause an automatic reload', async () => {
  const f = fixture(); const ordinary = new Error('Component initialization failed');
  await assert.rejects(f.load(() => { throw ordinary; }, key), error => error === ordinary);
  assert.equal(f.reloads(), 0);
  const chunk = new Error('Loading chunk failed');
  f.browser.sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
  await assert.rejects(f.load(() => { throw chunk; }, key), error => error === chunk);
  assert.equal(f.reloads(), 0);
});
