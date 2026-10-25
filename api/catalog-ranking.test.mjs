import assert from "node:assert/strict";
import { test } from "node:test";

test("ranking combines original and GLP aliases under restored compound names without rewriting orders", async (t) => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://fixture.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-private-key";
  t.after(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
  const rows = [{
    created_at: "2026-04-02T00:00:00Z", metadata: { shippingType: "us-warehouse" },
    items: [
      { name: "Retatrutide / GLP-3", quantity: 2 }, { name: "GLP RT-3", quantity: 3 }, { name: "GLP-3-R", quantity: 1 },
      { name: "Tirzepatide / GLP-2", quantity: 1 }, { name: "GLP TZ-2", quantity: 2 }, { name: "GLP-2-T", quantity: 1 },
      { name: "Semaglutide", quantity: 1 }, { name: "GLP SG-1", quantity: 1 }, { name: "GLP-1-S", quantity: 1 },
      { name: "Cagrilintide + Semaglutide", quantity: 1 }, { name: "Cagrilintide + GLP SG-1", quantity: 1 },
      { name: "BAC Water", quantity: 1 },
    ],
  }];
  const before = structuredClone(rows);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push([url, options]);
    return Response.json(rows);
  });
  const { default: handler } = await import(`./catalog-ranking.js?restore-test=${Date.now()}`);
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.names, ["Retatrutide", "Tirzepatide", "Semaglutide", "Cagrilintide + Semaglutide", "Reconstitution Solution"]);
  assert.deepEqual(res.body.usNames, res.body.names);
  assert.deepEqual(rows, before);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].searchParams.get("status"), "in.(paid,done)");
  assert.equal(JSON.stringify(res.body).includes("fixture-private-key"), false);
});
