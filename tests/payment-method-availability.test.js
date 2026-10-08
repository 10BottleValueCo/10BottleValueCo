import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual App closures/JSX so a stale selector or modal cannot
// reach the disabled provider through a separate path. No external I/O.
const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const React = appRequire('react');
const {renderToStaticMarkup} = appRequire('react-dom/server');
const source = ts.createSourceFile('App.jsx', readFileSync(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
const variables = new Map();
const functions = new Map();
const effects = [];
const selectors = [];
const gatedViews = [];
let cashAppPanel;
let cashAppNotice;
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) variables.set(node.name.text, node.initializer?.getText(source));
  if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(source));
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && node.arguments[0]?.getText(source).includes('setPaymentMethod')) effects.push(node);
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'button' && node.openingElement.attributes.getText(source).includes('disabled={paylioTemporarilyDisabled}')) selectors.push(node.getText(source));
  if (ts.isJsxExpression(node) && node.expression) {
    const text = node.expression.getText(source);
    if (text.startsWith('!paylioTemporarilyDisabled &&')) gatedViews.push(text);
    if (text.startsWith('paymentMethod === "cashapp" && !cashAppOverLimit')) cashAppPanel = text;
    if (text.startsWith('cashAppOverLimit &&') && text.includes('Cash App is limited')) cashAppNotice = text;
  }
  ts.forEachChild(node, visit);
}
visit(source);
const tx = (english) => english;
function evaluateJsx(expression, scope = {}) {
  const compiled = ts.transpileModule(`globalThis.result = (${expression});`, {compilerOptions: {target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React}}).outputText;
  const context = {React, tx, ...scope};
  vm.runInNewContext(compiled, context);
  return context.result;
}
function reconcile(method, amount) {
  const selected = [];
  const effect = effects.find(node => node.arguments[1]?.getText(source).includes('paymentMethod'));
  assert.ok(effect, 'actual selection reconciliation must exist');
  const cashAppOverLimit = vm.runInNewContext(variables.get('cashAppOverLimit'), {cashAppEligibleAmount: amount, CASHAPP_LIMIT: vm.runInNewContext(variables.get('CASHAPP_LIMIT'))});
  vm.runInNewContext(`(${effect.arguments[0].getText(source)})`, {paymentMethod: method, cashAppOverLimit, paylioTemporarilyDisabled: true, setPaymentMethod: value => selected.push(value)})();
  return selected;
}

test('Cash App keeps the existing inclusive $999 boundary and routes larger orders to Crypto', () => {
  assert.deepEqual(reconcile('cashapp', 999), []);
  assert.deepEqual(reconcile('cashapp', 999.01), ['crypto']);
  assert.deepEqual(reconcile('cashapp', 1500), ['crypto']);
});

test('stale PayLio state resolves to an available method without overriding valid choices', () => {
  assert.deepEqual(reconcile('paylio', 100), ['crypto']);
  assert.deepEqual(reconcile('paylio', 1500), ['crypto']);
  assert.deepEqual(reconcile('wire', 1500), []);
  assert.deepEqual(reconcile('crypto', 1500), []);
  assert.deepEqual(reconcile('cashapp', 100), []);
});

test('entering the payment screen immediately picks an eligible method', () => {
  const effect = effects.find(node => node.arguments[1]?.getText(source) === '[checkoutStep]');
  assert.ok(effect);
  for (const [overLimit, expected] of [[false, 'cashapp'], [true, 'crypto']]) {
    const selected = [];
    vm.runInNewContext(`(${effect.arguments[0].getText(source)})`, {checkoutStep: 'payment', finalTotalRef: {current: 1000}, cashAppOverLimit: overLimit, setPaymentMethod: value => selected.push(value)})();
    assert.deepEqual(selected, [expected]);
  }
});

test('both actual PayLio selectors render disabled with an unavailable label and no action', () => {
  assert.equal(vm.runInNewContext(variables.get('paylioTemporarilyDisabled')), true);
  assert.equal(vm.runInNewContext(variables.get('stripeTemporarilyDisabled')), true);
  assert.equal(selectors.length, 2);
  for (const selector of selectors) {
    const element = evaluateJsx(selector, {paylioTemporarilyDisabled: true, getPreloadedDisplayImageUrl: value => value, paypalMark: '/test-logo.svg'});
    assert.equal(element.props.disabled, true);
    assert.equal(element.props.onClick, undefined);
    assert.match(renderToStaticMarkup(element), /Temporarily unavailable/);
  }
});

test('unavailable PayLio panels and stale modals do not mount', () => {
  assert.equal(gatedViews.length, 3, 'payment panel, guide and global provider warning must all be gated');
  for (const expression of gatedViews) {
    assert.equal(evaluateJsx(expression, {paylioTemporarilyDisabled: true, paymentMethod: 'paylio', showPaylioGuide: true, showProviderWarning: true}), false);
  }
});

test('Cash App over-limit view shows the choice notice without mounting its payment action', () => {
  assert.ok(cashAppPanel);
  assert.equal(evaluateJsx(cashAppPanel, {paymentMethod: 'cashapp', cashAppOverLimit: true}), false);
  const html = renderToStaticMarkup(evaluateJsx(cashAppNotice, {cashAppOverLimit: true}));
  assert.match(html, /Cash App is limited to \$999/);
  assert.match(html, /choose Crypto or Wire/);
});

test('stale PayLio submissions cannot read checkout, change an order, fetch or redirect', async () => {
  const events = [];
  const forbidden = () => {throw new Error('Disabled PayLio must not perform I/O or read checkout state');};
  const scope = {
    paylioUnavailableMessage: 'Temporarily unavailable',
    setPaylioPaymentError: value => events.push(['error', value]),
    setShowProviderWarning: value => events.push(['warning', value]),
    setShowPaylioGuide: value => events.push(['guide', value]),
    setPaymentMethod: value => events.push(['method', value]),
    fetch: forbidden, readCheckoutSnapshot: forbidden, markOrderCheckoutStartedById: forbidden,
    supabase: {from: forbidden}, window: {location: {assign: forbidden}},
    setPaylioPaymentLoading: forbidden,
  };
  const submit = vm.runInNewContext(`(${functions.get('createPaylioPayment')})`, scope);
  await submit('stale-modal-provider');
  assert.deepEqual(events, [['error', 'Temporarily unavailable'], ['warning', false], ['guide', false], ['method', 'crypto']]);
});
