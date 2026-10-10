import test from 'node:test';
import assert from 'node:assert/strict';
import payment from '../api/send-payment-confirmed-email.js';
import tracking from '../api/supabase/send-tracking-email.js';
import registration from '../api/send-registration-email.js';
import { renderPaymentConfirmationEmail } from '../api/_payment-confirmation-email.js';

function setEnv(t, key, value) { const old = process.env[key]; process.env[key] = value; t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; }); }
const response = () => ({ statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
  status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const body = { email: 'recipient@example.test', orderId: 'INV-<img src=x onerror=evil()>',
  trackingNumber: '<a href="https://bad.example.test">CLICK</a>', total: 100, items: [] };

test('anonymous mail requests and retired registration never invoke auth or delivery', async t => {
  let calls = 0; t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Unexpected network'); });
  for (const handler of [payment, tracking, registration]) {
    const res = response(); await handler({ method: 'POST', headers: {}, body }, res);
    assert.equal(res.statusCode, handler === registration ? 410 : 401);
  }
  assert.equal(calls, 0);
});

test('unconfirmed support and ordinary customers cannot send merchant mail', async t => {
  setEnv(t, 'SUPABASE_URL', 'https://auth.example.test'); setEnv(t, 'SUPABASE_ANON_KEY', 'fixture-anon');
  setEnv(t, 'ADMIN_USER_IDS', ''); setEnv(t, 'ADMIN_EMAILS', 'support@10bottlevalue.co');
  let user, deliveries = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(new URL(url).pathname, '/auth/v1/user');
    if (new URL(url).hostname === 'api.resend.com') deliveries++;
    return json(user);
  });
  for (user of [{ id: 'fixture', email: 'support@10bottlevalue.co' },
    { id: 'fixture', email: 'customer@example.test', email_confirmed_at: '2026-01-01' }]) {
    for (const handler of [payment, tracking]) {
      const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body }, res);
      assert.equal(res.statusCode, 403);
    }
  }
  assert.equal(deliveries, 0);
});

test('confirmed admin mail is authenticated and HTML escaped before mocked delivery', async t => {
  for (const [key, value] of Object.entries({ SUPABASE_URL: 'https://auth.example.test', SUPABASE_ANON_KEY: 'fixture-anon',
    ADMIN_USER_IDS: '', ADMIN_EMAILS: 'support@10bottlevalue.co', RESEND_API_KEY: 'fixture-mail' })) setEnv(t, key, value);
  const deliveries = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (new URL(url).pathname === '/auth/v1/user') return json({ id: 'fixture', email: 'support@10bottlevalue.co', email_confirmed_at: '2026-01-01' });
    assert.equal(url, 'https://api.resend.com/emails'); deliveries.push(JSON.parse(options.body)); return json({ id: 'fixture-delivery' });
  });
  for (const handler of [payment, tracking]) {
    const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body }, res);
    assert.equal(res.statusCode, 200);
  }
  assert.equal(deliveries.length, 2);
  for (const delivery of deliveries) {
    assert.equal(delivery.to, body.email); assert.doesNotMatch(delivery.html, /<img src=x|href="https:\/\/bad/);
    assert.match(delivery.html, /INV-&lt;img/);
  }
});

test('all receipt providers escape interpolated content by default', () => {
  const html = renderPaymentConfirmationEmail({ ...body, firstName: '<script>bad</script>', items: [{ name: '<img src=x>', quantity: 1, price: 100 }] });
  assert.doesNotMatch(html, /<script>|<img src=x/); assert.match(html, /&lt;script&gt;/);
});
