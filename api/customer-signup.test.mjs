import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from './customer-signup.js';

test('retired signup never creates or pre-confirms an arbitrary email identity', async () => {
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('Unexpected privileged auth request'); };
  try {
    for (const method of ['POST', 'GET']) {
      let status, body;
      const headers = {};
      const res = { setHeader: (key, value) => { headers[key] = value; },
        status: value => { status = value; return res; }, json: value => { body = value; return res; } };
      await handler({ method, body: { email: 'victim@example.test', password: 'not-a-real-password' } }, res);
      assert.equal(status, 410);
      assert.equal(body.code, 'signup_flow_updated');
      assert.equal(headers['Cache-Control'], 'no-store');
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = previous; }
});
