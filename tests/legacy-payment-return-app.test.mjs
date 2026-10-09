import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { legacyCheckoutHeaders, syncVerifiedLegacyOrder, isLegacyPaidStatus } from '../artifacts/10-bottle-value/src/legacy-payment-return.js';
import { meritCartMatchesOrder } from '../artifacts/10-bottle-value/src/merit-checkout-client.js';

const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const pluginRequire = createRequire(appRequire.resolve('@vitejs/plugin-react'));
const babelRequire = createRequire(pluginRequire.resolve('@babel/core'));
const { parse } = babelRequire('@babel/parser');
const source = readFileSync(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const app = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration' && node.declaration.id?.name === 'App').declaration.body.body;
const effect = app.find(node => node.type === 'ExpressionStatement' && node.expression.callee?.name === 'useEffect' && source.slice(node.start, node.end).includes('await checkLegacyPaymentReturn'));
assert.ok(effect, 'actual payment return polling effect exists');
const effectText = source.slice(effect.expression.arguments[0].start, effect.expression.arguments[0].end);
const handler = (name, context) => {
  const node = app.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
  return vm.runInNewContext(`(${source.slice(node.start, node.end)})`, context);
};
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function fixture({ email = 'owner@example.invalid', stored = [], check = async () => ({ status: 'pending', order: null }) } = {}) {
  const account = email ? { email } : null;
  const paymentReturn = { origin: 'provider-return', status: 'pending', order: 'INV-ABC123', provider: 'stripe' };
  const writes = []; let poll; let settings; let stopped = 0;
  const cart = [{ name: 'Fixture', dose: '5mg', quantity: 1 }];
  const context = {
    currentUser: account, page: 'payment-return', paymentReturn,
    legacyReturnContextRef: { current: { account, page: 'payment-return', order: paymentReturn.order, provider: paymentReturn.provider } },
    normalizeEmail: value => String(value || '').trim().toLowerCase(),
    supabase: { from: () => assert.fail('unexpected direct financial write') },
    checkLegacyPaymentReturn: check, syncVerifiedLegacyOrder, meritCartMatchesOrder, isLegacyPaidStatus,
    startVisiblePolling: (work, options) => { poll = work; settings = options; return () => stopped++; },
    setPaymentReturnOrder: value => writes.push(['receipt', value]),
    setLegacyReturnReadStatus: value => writes.push(['status', value]),
    setPaymentReturn: update => writes.push(['return', update(paymentReturn)]),
    setCart: update => writes.push(['cart', update(cart)]),
    getStoredOrders: () => stored, saveStoredOrders: value => writes.push(['cache', value]),
    setAllOrders: value => writes.push(['orders', value]), setUserOrders: value => writes.push(['userOrders', value]),
    getPaidOrdersForEmail: (owner, orders) => orders.filter(order => order.email === owner && order.status === 'paid'),
    markOrderPaidById: () => assert.fail('URL return used legacy paid side effects'),
    sendPaymentConfirmedEmail: () => assert.fail('URL return sent email'),
    loadStoreCredit: () => assert.fail('URL return refreshed through an unguarded closure'),
    setStoreCredit: () => assert.fail('URL return changed store credit'),
  };
  const cleanup = vm.runInNewContext(`(${effectText})`, context)();
  return { writes, context, cleanup, settings, get stopped() { return stopped; }, run: attempt => poll({ attempt, signal: new AbortController().signal }) };
}

test('actual App return effect stops guests before polling and starts bounded authenticated checks', () => {
  const guest = fixture({ email: '' });
  assert.equal(guest.settings, undefined); assert.deepEqual(guest.writes, [['receipt', null], ['status', 'signin']]);
  const owner = fixture();
  assert.equal(owner.settings.maxAttempts, 8); assert.equal(owner.settings.backoff, true);
  owner.cleanup(); assert.equal(owner.stopped, 1);
});

test('actual App success synchronizes only owned local history and clears only a matching cart', async () => {
  const foreign = { id: 'INV-ABC123', email: 'foreign@example.invalid', status: 'pending', secret: 'must not display' };
  const own = { id: 'INV-ABC123', email: 'owner@example.invalid', status: 'pending', items: [{ name: 'Fixture', dose: '5mg', quantity: 1 }] };
  const f = fixture({ stored: [foreign, own], check: async () => ({ status: 'paid', order: { id: 'INV-ABC123', status: 'paid' } }) });
  assert.equal(await f.run(1), false);
  assert.equal(f.writes.find(([kind, value]) => kind === 'receipt' && value)[1].email, own.email);
  assert.equal(f.writes.find(([kind]) => kind === 'cache')[1][0], foreign);
  assert.equal(f.writes.find(([kind]) => kind === 'cart')[1].length, 0);
  assert.equal(f.writes.find(([kind]) => kind === 'return')[1].confirmedForEmail, own.email);
  const missing = fixture({ stored: [foreign], check: async () => ({ status: 'paid', order: { id: 'INV-ABC123', status: 'paid' } }) });
  await missing.run(1);
  assert.equal(missing.writes.some(([kind]) => kind === 'cart'), false);
  assert.equal(missing.writes.some(([kind, value]) => kind === 'receipt' && value), false);
  const changed = fixture({ stored: [{ ...own, items: [{ name: 'Other', dose: '5mg', quantity: 1 }] }], check: async () => ({ status: 'paid', order: { id: 'INV-ABC123', status: 'paid' } }) });
  await changed.run(1); assert.equal(changed.writes.find(([kind]) => kind === 'cart')[1].length, 1);
});

test('actual App effect suppresses stale account, order, navigation and unmount results', async () => {
  for (const change of ['account', 'order', 'page', 'unmount']) {
    const gate = deferred(); const f = fixture({ check: () => gate.promise });
    const work = f.run(1);
    if (change === 'unmount') f.cleanup();
    else f.context.legacyReturnContextRef.current[change] = change === 'account' ? { email: 'other@example.invalid' } : 'other';
    gate.resolve({ status: 'paid', order: { id: 'INV-ABC123', status: 'paid' } });
    assert.equal(await work, false);
    assert.deepEqual(f.writes, [['receipt', null], ['status', 'checking']]);
  }
});

test('terminal and exhausted App states never confirm, erase carts or infer cancellation from a URL', async () => {
  for (const status of ['signin', 'not-found', 'unconfirmed']) {
    const f = fixture({ check: async () => ({ status, order: null }) });
    assert.equal(await f.run(1), false); assert.equal(f.writes.at(-1)[1], status);
    assert.equal(f.writes.some(([kind]) => ['return', 'cart', 'cache'].includes(kind)), false);
  }
  const f = fixture(); assert.equal(await f.run(8), false); assert.equal(f.writes.at(-1)[1], 'exhausted');
});

test('actual persistence passes Bearer ownership and cannot send a mismatched checkout', async () => {
  const requests = [];
  const context = {
    deferredLegacyOrderRef: { current: null }, legacyCheckoutHeaders,
    supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token', user: { id: 'owner-id', email: 'owner@example.invalid' } } } }) } },
    fetch: async (url, options) => { requests.push([url, options]); return { ok: true, json: async () => ({ ok: true }) }; },
    JSON,
  };
  await handler('persistOrderToServer', context)({ id: 'INV-ABC123', email: 'owner@example.invalid', status: 'pending' });
  assert.equal(requests.length, 1); assert.equal(requests[0][1].headers.Authorization, 'Bearer fixture-token');
  await assert.rejects(handler('persistOrderToServer', context)({ id: 'INV-ABC123', email: 'foreign@example.invalid' }));
  assert.equal(requests.length, 1);
});

const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
const compiledComponent = name => {
  const raw = readFileSync(new URL(`../artifacts/10-bottle-value/src/components/${name}.jsx`, import.meta.url), 'utf8');
  const code = ts.transpileModule(raw, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('React', 'exports', 'require', code)(React, exports, id => id.endsWith('.css') ? {} : { default: compiledComponent('PaymentReturnHeader') });
  return exports.default;
};
const Status = compiledComponent('PaymentReturnReadStatus');
const render = (status, tx = en => en) => renderToStaticMarkup(React.createElement(Status, { status, tx, orderId: 'INV-ABC123' }));

test('pending UI distinguishes sign-in, unavailable and exhausted without claiming paid or cancelled', () => {
  for (const state of ['checking', 'pending', 'signin', 'not-found', 'unavailable', 'unconfirmed', 'exhausted']) {
    const html = render(state);
    assert.doesNotMatch(html, /Order Confirmed|Checkout Cancelled|Payment received|try again.*cart/i);
    assert.match(html, /payment-return-card/);
  }
  assert.match(render('signin'), /account used for this order/);
  assert.match(render('unavailable'), /does not mean the payment failed/);
  assert.match(render('exhausted'), /Automatic checking has stopped/);
  assert.match(render('pending'), /Checking automatically/);
  assert.doesNotMatch(render('exhausted'), /Checking automatically/);
});

test('Russian status copy preserves the same uncertainty', () => {
  const ru = (en, russian) => russian;
  assert.match(render('unavailable', ru), /не означает, что платёж отклонён/);
  assert.match(render('signin', ru), /аккаунт, с которого оформлен заказ/);
  assert.match(render('exhausted', ru), /Автоматическая проверка остановлена/);
});
