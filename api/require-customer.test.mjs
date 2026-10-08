import test from "node:test";
import assert from "node:assert/strict";
import { requireVerifiedCustomer } from "./_require-customer.js";

test("phone confirmation cannot authorize an unverified checkout email", async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, fetch: globalThis.fetch };
  process.env.SUPABASE_URL = "https://unit-test.invalid";
  process.env.SUPABASE_ANON_KEY = "unit-test-anon";
  const makeRes = () => ({ setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  try {
    globalThis.fetch = async () => Response.json({ id: "verified-user", email: "buyer@example.com", confirmed_at: "2026-10-08T00:00:00Z", phone_confirmed_at: "2026-10-08T00:00:00Z", email_confirmed_at: null });
    const res = makeRes();
    const customer = await requireVerifiedCustomer({ headers: { authorization: "Bearer test" } }, res, { purpose: "card checkout" });
    assert.equal(customer, null);
    assert.equal(res.code, 403);
    globalThis.fetch = async () => Response.json({ id: "verified-user", email: "BUYER@example.com", email_confirmed_at: "2026-10-08T00:00:00Z" });
    const valid = await requireVerifiedCustomer({ headers: { authorization: "Bearer test" } }, makeRes());
    assert.deepEqual(valid, { id: "verified-user", email: "buyer@example.com" });
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previous.key;
  }
});
