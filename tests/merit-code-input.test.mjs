import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachMeritCodeCells, observeMeritCodeCells, normalizeMeritCode, pasteMeritCode } from '../artifacts/10-bottle-value/src/merit-code-input.js';
import { verifyMeritCheckoutBuyer } from '../artifacts/10-bottle-value/src/merit-checkout-client.js';

// First-party DOM/event fixture only: no provider SDK, endpoint, code-send or
// verification simulation. Browser layout and device autofill are separate QA.
class Node extends EventTarget {
  constructor(tag, doc) { super(); this.tagName = tag.toUpperCase(); this.ownerDocument = doc; this.attrs = new Map(); this.children = []; this.value = ''; this.selectionStart = this.selectionEnd = 0; }
  get type() { return this.getAttribute('type'); }
  get maxLength() { return Number(this.getAttribute('maxlength')); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, value); }
  hasAttribute(name) { return this.attrs.has(name); }
  removeAttribute(name) { this.attrs.delete(name); }
  toggleAttribute(name, yes) { if (yes) this.setAttribute(name, ''); else this.removeAttribute(name); }
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, before) { node.remove(); const at = before ? this.children.indexOf(before) : this.children.length; this.children.splice(at, 0, node); node.parentElement = this; return node; }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  querySelector(selector) { for (const child of this.children) { if (child.getAttribute('id') === selector.slice(1)) return child; const nested = child.querySelector(selector); if (nested) return nested; } return null; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  focus() { this.ownerDocument.activeElement = this; this.focused = true; }
  getBoundingClientRect() { return { left: this.parentElement.children.indexOf(this) * 56, width: 48 }; }
}
function fixture() {
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); }
    observe() { this.connected = true; }
    disconnect() { this.connected = false; }
  }
  const doc = new EventTarget();
  doc.defaultView = { Event, MutationObserver: Observer };
  doc.createElement = tag => new Node(tag, doc);
  doc.body = doc.createElement('body');
  doc.getElementById = id => doc.body.querySelector(`#${id}`);
  const host = doc.createElement('div'); host.setAttribute('id', 'attestly-vrp-host'); doc.body.appendChild(host);
  const root = host.shadowRoot = doc.createElement('shadow-root');
  const row = doc.createElement('div'); row.setAttribute('id', 'avrp-coderow'); root.appendChild(row);
  const input = doc.createElement('input');
  for (const [key, value] of Object.entries({ id: 'avrp-code', type: 'text', maxlength: '6', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', placeholder: '------' })) input.setAttribute(key, value);
  row.appendChild(input);
  const verify = doc.createElement('button'); verify.setAttribute('id', 'avrp-verify'); row.appendChild(verify);
  const event = (type, props = {}) => input.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), props));
  const focus = () => { root.activeElement = input; event('focus'); };
  const cells = () => row.children[0].children[0].children;
  return { doc, root, host, row, input, verify, event, focus, cells, observers };
}

test('normalization retains leading zeros and caret after removed non-digits', () => {
  assert.deepEqual(normalizeMeritCode('01x2-3456', 4, 7), { value: '012345', start: 3, end: 5 });
  assert.deepEqual(normalizeMeritCode('001234'), { value: '001234', start: 6, end: 6 });
  assert.deepEqual(pasteMeritCode('999999', '123 456', 2, 2), { value: '123456', start: 6, end: 6 });
  assert.deepEqual(pasteMeritCode('', '123-456', 0, 0), { value: '123456', start: 6, end: 6 });
  assert.deepEqual(pasteMeritCode('123456', '90', 2, 4), { value: '129056', start: 4, end: 4 });
});

test('six visual cells retain exactly the same native input and focus starts in cell one', () => {
  const f = fixture(); const dispose = attachMeritCodeCells(f.root);
  assert.equal(f.root.querySelector('#avrp-code'), f.input);
  assert.equal(f.cells().length, 6);
  assert.equal(f.input.getAttribute('autocomplete'), 'one-time-code');
  assert.equal(f.input.getAttribute('inputmode'), 'numeric');
  assert.equal(f.input.getAttribute('aria-label'), 'Six-digit verification code');
  f.focus();
  assert.equal(f.cells()[0].hasAttribute('data-caret'), true);
  assert.equal(f.cells().filter(cell => cell.hasAttribute('data-active')).length, 1);
  dispose();
});

test('wrapping an already focused provider field restores focus and selection', () => {
  const f = fixture(); f.focus(); f.input.value = '1234'; f.input.setSelectionRange(2, 3);
  const dispose = attachMeritCodeCells(f.root);
  assert.equal(f.input.focused, true);
  assert.equal(f.input.selectionStart, 2); assert.equal(f.input.selectionEnd, 3);
  dispose();
});

test('native typing, deletion, selection and autofill render without a second input or submission', () => {
  const f = fixture(); const dispose = attachMeritCodeCells(f.root); f.focus();
  let providerInputs = 0; let providerEnters = 0;
  f.input.addEventListener('input', () => providerInputs++);
  f.input.addEventListener('keydown', event => { if (event.key === 'Enter') providerEnters++; });
  f.input.value = '01'; f.input.setSelectionRange(2, 2); f.event('input');
  assert.equal(f.cells()[2].hasAttribute('data-caret'), true);
  // Backspace is native; the adapter renders the resulting selection/value.
  f.input.value = '0'; f.input.setSelectionRange(1, 1); f.event('input');
  assert.equal(f.cells()[1].hasAttribute('data-caret'), true);
  f.input.value = '001234'; f.input.setSelectionRange(6, 6); f.event('input');
  assert.equal(f.cells().map(cell => cell.textContent).join(''), '001234');
  f.input.setSelectionRange(1, 4); f.event('select');
  assert.equal(f.cells().filter(cell => cell.hasAttribute('data-selected')).length, 3);
  f.event('keydown', { key: 'Enter' });
  assert.equal(providerInputs, 3); assert.equal(providerEnters, 1);
  dispose();
});

test('pointer chooses the visual digit and keyboard click preserves native selection', () => {
  const f = fixture(); const dispose = attachMeritCodeCells(f.root);
  f.input.value = '123456'; f.event('click', { detail: 1, clientX: 136 });
  assert.equal(f.input.selectionStart, 2); assert.equal(f.input.selectionEnd, 3);
  f.event('click', { detail: 0, clientX: 0 });
  assert.equal(f.input.selectionStart, 2); dispose();
});

test('paste and formatted replacement normalize before maxlength and emit the native input event', () => {
  for (const pasted of ['123 456', '123-456', '001234']) {
    const f = fixture(); const dispose = attachMeritCodeCells(f.root); let seen;
    f.input.addEventListener('input', () => { seen = f.input.value; });
    assert.equal(f.event('paste', { clipboardData: { getData: () => pasted } }), false);
    assert.equal(seen, pasted.replace(/[^0-9]/g, ''));
    assert.equal(f.input.selectionStart, 6);
    assert.equal(f.event('beforeinput', { inputType: 'insertReplacementText', data: '987 654' }), false);
    assert.equal(f.input.value, '987654');
    dispose();
  }
});

test('provider DOM drift leaves its original field and button untouched', () => {
  for (const change of [f => f.input.setAttribute('maxlength', '8'), f => f.input.setAttribute('type', 'number'), f => f.input.setAttribute('pattern', '[0-9]*'), f => f.verify.remove()]) {
    const f = fixture(); change(f); const before = [...f.row.children];
    assert.equal(attachMeritCodeCells(f.root), null);
    assert.deepEqual(f.row.children, before);
    assert.equal(f.input.getAttribute('placeholder'), '------');
  }
});

test('partial appearance attachment rolls back if a DOM operation fails', () => {
  const f = fixture();
  f.input.addEventListener = () => { throw new Error('Unsupported DOM'); };
  assert.equal(attachMeritCodeCells(f.root), null);
  assert.deepEqual(f.row.children, [f.input, f.verify]);
  assert.equal(f.root.children.length, 1);
  assert.equal(f.input.getAttribute('placeholder'), '------');
  assert.equal(f.input.getAttribute('aria-label'), null);
});

test('disposal restores native layout and attributes and is idempotent', () => {
  const f = fixture(); f.input.setAttribute('aria-label', 'Existing label');
  const dispose = attachMeritCodeCells(f.root); dispose(); dispose();
  assert.deepEqual(f.row.children, [f.input, f.verify]);
  assert.equal(f.root.children.length, 1);
  assert.equal(f.input.getAttribute('aria-label'), 'Existing label');
  assert.equal(f.input.getAttribute('placeholder'), '------');
  assert.equal(f.input.getAttribute('aria-describedby'), null);
  assert.equal(f.event('paste', { clipboardData: { getData: () => '123 456' } }), true);
});

test('observer attaches to asynchronously created card, disconnects immediately, and abort restores UI', () => {
  const f = fixture(); f.host.remove(); const controller = new AbortController();
  const stop = observeMeritCodeCells({ document: f.doc, signal: controller.signal });
  assert.equal(f.observers[0].connected, true);
  f.doc.body.appendChild(f.host); f.observers[0].callback();
  assert.equal(f.observers[0].connected, false);
  assert.equal(f.row.hasAttribute('data-tbv-code-cells'), true);
  controller.abort(); stop();
  assert.deepEqual(f.row.children, [f.input, f.verify]);
});

test('already aborted signal creates no observer or DOM changes', () => {
  const f = fixture(); const controller = new AbortController(); controller.abort();
  observeMeritCodeCells({ document: f.doc, signal: controller.signal })();
  assert.equal(f.observers.length, 0);
  assert.deepEqual(f.row.children, [f.input, f.verify]);
});

test('a missing provider card stops observation after ten seconds', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture(); f.host.remove();
  const stop = observeMeritCodeCells({ document: f.doc });
  assert.equal(f.observers[0].connected, true);
  context.mock.timers.tick(10000);
  assert.equal(f.observers[0].connected, false);
  stop();
});

test('observer setup failure keeps verification available with the original UI', () => {
  const f = fixture(); f.doc.defaultView.MutationObserver = class { constructor() { throw new Error('Unavailable'); } };
  observeMeritCodeCells({ document: f.doc })();
  assert.deepEqual(f.row.children, [f.input, f.verify]);
});

test('aborting appearance does not resolve or reject the pending SDK verification', async () => {
  const previous = globalThis.document;
  const f = fixture(); globalThis.document = f.doc;
  try {
    const controller = new AbortController(); let finish; let settled = false;
    const verifying = verifyMeritCheckoutBuyer('buyer@example.test', { verify: () => new Promise(resolve => { finish = resolve; }) }, { signal: controller.signal });
    verifying.then(() => { settled = true; });
    controller.abort(); await Promise.resolve();
    assert.equal(settled, false);
    assert.deepEqual(f.row.children, [f.input, f.verify]);
    finish({ verified: false });
    assert.equal(await verifying, null);
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});

test('client cleans up appearance after SDK resolution or rejection and preserves proof checks', async () => {
  const previous = globalThis.document;
  try {
    for (const rejected of [false, true]) {
      const f = fixture(); globalThis.document = f.doc;
      const verifying = verifyMeritCheckoutBuyer('buyer@example.test', { verify: async options => {
        assert.deepEqual(options, { email: 'buyer@example.test' });
        assert.equal(f.row.hasAttribute('data-tbv-code-cells'), true);
        if (rejected) throw new Error('SDK rejected');
        return { verified: true, email: options.email, token: 'fixture-proof' };
      } });
      if (rejected) await assert.rejects(verifying, /SDK rejected/);
      else assert.deepEqual(await verifying, { otpToken: 'fixture-proof', verifiedEmail: 'buyer@example.test' });
      assert.deepEqual(f.row.children, [f.input, f.verify]);
      assert.equal(f.observers[0].connected, false);
    }
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; }
});
