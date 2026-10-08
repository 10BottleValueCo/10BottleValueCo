import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ServerResponse } from "node:http";
import summaryHandler from "../api/affiliate-payout-summary.js";
import adminHandler from "../api/affiliate-payouts.js";

const originalFetch = globalThis.fetch;
const owner = { id: "owner-id", email: "owner@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z" };
const affiliate = { code: "OWNER_CODE", email: owner.email, active: true };
const admin = { id: "admin-id", email: "support@10bottlevalue.co", email_confirmed_at: "2026-01-01T00:00:00Z" };
let calls;

beforeEach(() => {
  calls = [];
  Object.assign(process.env, {
    SUPABASE_URL: "https://database.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
    SUPABASE_ANON_KEY: "synthetic-public-key",
    ADMIN_EMAILS: "support@10bottlevalue.co",
    ADMIN_USER_IDS: "",
  });
});
afterEach(() => { globalThis.fetch = originalFetch; });

function response() {
  return { statusCode: 200, headers: {}, ended: false, setHeader(k, v) { if (this.ended) throw new Error("ERR_HTTP_HEADERS_SENT"); this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; this.ended = true; return this; } };
}
function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } });
}
function page(rows, total = rows.length, offset = 0) {
  return json(rows, 200, { "content-range": `${rows.length ? `${offset}-${offset + rows.length - 1}` : "*"}/${total}` });
}
function payout(id, amount = "0.10", code = affiliate.code) { return { id, affiliate_code: code, amount }; }
function installFetch({ user = owner, ownerPage, codePage, payoutPage } = {}) {
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, ...options });
    if (url.pathname === "/auth/v1/user") return json(user);
    assert.equal(options.headers.apikey, "synthetic-service-key");
    assert.equal(options.headers.Authorization, "Bearer synthetic-service-key");
    if (url.pathname === "/rest/v1/affiliates") {
      assert.equal(url.searchParams.get("select"), "code,email,active");
      assert.equal(url.searchParams.get("limit"), "2");
      assert.equal(options.headers.Prefer, "count=exact");
      if (url.searchParams.has("email")) {
        assert.equal(url.searchParams.get("email"), `eq.${owner.email}`);
        return ownerPage ? ownerPage(url) : page([affiliate]);
      }
      assert.equal(url.searchParams.get("code"), "ilike.OWNER\\_CODE");
      return codePage ? codePage(url) : page([affiliate]);
    }
    assert.equal(url.pathname, "/rest/v1/affiliate_payouts");
    return payoutPage ? payoutPage(url, options) : page([]);
  };
}
async function invoke(handler = summaryHandler, overrides = {}) {
  const res = response();
  await handler({ method: "GET", url: "/api/affiliate-payout-summary", headers: { authorization: "Bearer synthetic-token" }, query: {}, ...overrides }, res);
  assert.match(res.headers["Cache-Control"], /no-store/);
  if (res.statusCode < 400) assert.equal(res.headers["Cache-Control"], "private, no-store");
  assert.equal(res.headers.Vary, "Authorization");
  return res;
}

for (const [name, handler, method, user] of [
  ["owner summary", summaryHandler, "GET", { ...owner, email_confirmed_at: null }],
  ["admin payouts GET", adminHandler, "GET", owner],
  ["admin payouts POST", adminHandler, "POST", owner],
]) {
  for (const [denial, authenticated, status] of [["anonymous", false, 401], ["forbidden account", true, 403]]) {
    test(`${name}: ${denial} denial ends a real HTTP response without late headers or storage access`, async () => {
      installFetch({ user });
      const res = new ServerResponse({ method });
      res.status = function status(value) { this.statusCode = value; return this; };
      res.json = function json(body) { this.setHeader("Content-Type", "application/json"); this.end(JSON.stringify(body)); return this; };
      try {
        await assert.doesNotReject(handler({ method, url: "/api/affiliate-payout-summary", headers: authenticated ? { authorization: "Bearer synthetic-token" } : {}, query: {}, body: { affiliate_code: affiliate.code, amount: 1 } }, res));
        assert.equal(res.statusCode, status); assert.equal(res.headersSent, true); assert.equal(res.writableEnded, true);
        assert.match(res.getHeader("Cache-Control"), /no-store/); assert.equal(res.getHeader("Vary"), "Authorization");
        assert.equal(calls.length, authenticated ? 1 : 0);
        assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"));
        assert.throws(() => res.setHeader("example", "late"), { code: "ERR_HTTP_HEADERS_SENT" });
      } finally { res.destroy(); }
    });
  }
}

for (const [name, handler] of [["owner summary", summaryHandler], ["admin payouts", adminHandler]]) {
  test(`${name}: anonymous calls cannot reach storage`, async () => {
    installFetch();
    const res = await invoke(handler, { headers: {} });
    assert.equal(res.statusCode, 401);
    assert.equal(calls.length, 0);
  });
}
test("summary rejects unconfirmed email and ignores ownership metadata", async () => {
  installFetch({ user: { ...owner, email_confirmed_at: null, user_metadata: { affiliateCode: affiliate.code } } });
  const res = await invoke();
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 1);
});
test("summary authenticates the session remotely rather than trusting the token text", async () => {
  globalThis.fetch = async () => { calls.push(1); return json({}, 401); };
  const res = await invoke();
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 1);
});
for (const selector of [{ query: { code: "OTHER" } }, { query: { email: "other@example.invalid" } }, { url: "/api/affiliate-payout-summary?affiliate_code=OTHER" }]) {
  test(`summary rejects caller account selector ${JSON.stringify(selector)}`, async () => {
    installFetch();
    const res = await invoke(summaryHandler, selector);
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 1);
  });
}
test("verified identity with no affiliate mapping receives no invented summary", async () => {
  installFetch({ ownerPage: () => page([]) });
  const res = await invoke();
  assert.deepEqual(res.body, { ok: true, summaries: [] });
  assert.equal(calls.length, 2);
});
test("owned active code with completely empty history returns a real zero", async () => {
  installFetch({ payoutPage: (url, options) => {
    assert.equal(url.searchParams.get("affiliate_code"), "ilike.OWNER\\_CODE");
    assert.equal(url.searchParams.get("select"), "id,affiliate_code,amount");
    assert.equal(options.headers.Prefer, "count=exact");
    return page([]);
  } });
  const res = await invoke();
  assert.deepEqual(res.body, { ok: true, summaries: [{ code: affiliate.code, totalPaid: 0, count: 0 }] });
});
test("summary sums cents exactly and returns neither email, notes nor payout rows", async () => {
  installFetch({ user: { ...owner, email: "OWNER@EXAMPLE.INVALID" }, payoutPage: () => page([payout(1, "0.10"), payout(2, 0.2)]) });
  const res = await invoke();
  assert.deepEqual(res.body, { ok: true, summaries: [{ code: affiliate.code, totalPaid: 0.3, count: 2 }] });
  assert.ok(!JSON.stringify(res.body).includes(owner.email));
});
for (const [name, ownerRows, codeRows, status] of [
  ["inactive owner", [{ ...affiliate, active: false }], null, 403],
  ["ambiguous owner", [affiliate, { ...affiliate, code: "SECOND" }], null, 409],
  ["returned different owner", [{ ...affiliate, email: "other@example.invalid" }], null, 409],
  ["noncanonical code", [{ ...affiliate, code: "owner_code" }], null, 409],
  ["missing active flag", [{ code: affiliate.code, email: owner.email }], null, 409],
  ["shared code", null, [affiliate, { ...affiliate, email: "other@example.invalid" }], 409],
  ["case variant code", null, [affiliate, { ...affiliate, code: "owner_code", email: "other@example.invalid" }], 409],
  ["ownership changed", null, [{ ...affiliate, email: "other@example.invalid" }], 409],
]) {
  test(`summary denies ${name} before payout access`, async () => {
    installFetch({ ownerPage: ownerRows ? () => page(ownerRows) : undefined, codePage: codeRows ? () => page(codeRows) : undefined });
    const res = await invoke();
    assert.equal(res.statusCode, status);
    assert.ok(!("summaries" in res.body));
    assert.ok(calls.every(call => call.url.pathname !== "/rest/v1/affiliate_payouts"));
  });
}
for (const amount of [null, "", " ", false, -1, 0, "NaN", "1.005", "1e2", 100000000, {}]) {
  test(`summary leaves malformed amount ${JSON.stringify(amount)} unknown`, async () => {
    installFetch({ payoutPage: () => page([payout(1, amount)]) });
    const res = await invoke();
    assert.equal(res.statusCode, 502);
    assert.ok(!("summaries" in res.body));
  });
}
test("summary refuses a cross-account row even if the storage filter is violated", async () => {
  installFetch({ payoutPage: () => page([payout(1, "1.00", "OTHER")]) });
  assert.equal((await invoke()).statusCode, 502);
});
test("case-variant historical payouts are included in lookup and fail unknown instead of disappearing", async () => {
  installFetch({ payoutPage: url => {
    assert.equal(url.searchParams.get("affiliate_code"), "ilike.OWNER\\_CODE");
    return page([payout(1, "1.00", "owner_code")]);
  } });
  const res = await invoke();
  assert.equal(res.statusCode, 502);
  assert.ok(!("summaries" in res.body));
});
test("summary follows a complete second page instead of truncating at 1000 rows", async () => {
  installFetch({ payoutPage: url => {
    const offset = Number(url.searchParams.get("offset"));
    assert.equal(url.searchParams.get("order"), "id.asc");
    return offset === 0 ? page(Array.from({ length: 1000 }, (_, i) => payout(i + 1)), 1001) : page([payout(1001)], 1001, 1000);
  } });
  const res = await invoke();
  assert.deepEqual(res.body.summaries, [{ code: affiliate.code, totalPaid: 100.1, count: 1001 }]);
  assert.equal(calls.filter(call => call.url.pathname.includes("affiliate_payouts")).length, 2);
});
for (const [name, payoutPage] of [
  ["missing count", () => json([payout(1)])],
  ["unknown count", () => json([payout(1)], 200, { "content-range": "0-0/*" })],
  ["short server-capped page", () => page([payout(1)], 2)],
  ["wrong range", () => page([payout(1)], 1, 1)],
  ["non-array payload", () => json({ amount: 1 }, 200, { "content-range": "0-0/1" })],
  ["unsafe numeric ID", () => page([payout(Number.MAX_SAFE_INTEGER + 1)])],
  ["duplicate ID", () => page([payout(1), payout(1)])],
  ["storage failure", () => json({ error: "permission denied" }, 403)],
  ["second-page failure", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 1000 }, (_, i) => payout(i + 1)), 1001) : json({}, 503)],
  ["count changes between pages", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 1000 }, (_, i) => payout(i + 1)), 1001) : page([payout(1001), payout(1002)], 1002, 1000)],
  ["overlapping pages", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 1000 }, (_, i) => payout(i + 1)), 1001) : page([payout(1000)], 1001, 1000)],
]) {
  test(`summary fails closed on ${name}`, async () => {
    installFetch({ payoutPage });
    const res = await invoke();
    assert.equal(res.statusCode, 502);
    assert.ok(!("summaries" in res.body));
  });
}
test("summary rejects count overflow immediately instead of returning a partial total", async () => {
  installFetch({ payoutPage: () => page(Array.from({ length: 1000 }, (_, i) => payout(i + 1)), 20001) });
  const res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, "PAYOUT_HISTORY_TOO_LARGE");
  assert.equal(calls.filter(call => call.url.pathname.includes("affiliate_payouts")).length, 1);
});
test("summary accepts an exact 20000-row boundary without another unbounded fetch", async () => {
  installFetch({ payoutPage: url => {
    const offset = Number(url.searchParams.get("offset"));
    return page(Array.from({ length: 1000 }, (_, i) => payout(offset + i + 1)), 20000, offset);
  } });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.summaries[0].count, 20000);
  assert.equal(res.body.summaries[0].totalPaid, 2000);
  assert.equal(calls.filter(call => call.url.pathname.includes("affiliate_payouts")).length, 20);
});
for (const method of ["GET", "POST"]) {
  test(`admin ${method} denies customer role metadata and unconfirmed admin email`, async () => {
    for (const user of [{ ...owner, user_metadata: { role: "admin" } }, { ...admin, email_confirmed_at: null }]) {
      installFetch({ user });
      const before = calls.length;
      const res = await invoke(adminHandler, { method, body: { affiliate_code: affiliate.code, amount: 1 } });
      assert.equal(res.statusCode, 403);
      assert.equal(calls.length - before, 1);
    }
  });
}
test("admin uses configured user-ID policy in preference to email fallback", async () => {
  process.env.ADMIN_USER_IDS = "specific-admin";
  installFetch({ user: admin });
  assert.equal((await invoke(adminHandler)).statusCode, 403);
  installFetch({ user: { ...owner, id: "specific-admin" } });
  const res = await invoke(adminHandler);
  assert.deepEqual(res.body, { payouts: [] });
});
test("verified admin can record a valid payout through the service role", async () => {
  installFetch({ user: admin, payoutPage: (url, options) => {
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.affiliate_code, affiliate.code);
    assert.equal(body.amount, 0.29);
    assert.ok(body.note.startsWith("Admin payout "));
    return new Response(null, { status: 201 });
  } });
  const res = await invoke(adminHandler, { method: "POST", body: { affiliate_code: "owner_code", amount: 0.29 } });
  assert.equal(res.statusCode, 201);
});
test("admin POST rejects out-of-range or fractional amounts before writing", async () => {
  installFetch({ user: admin });
  for (const amount of [100000000, 0.001, -1, null, "1.00"]) {
    const res = await invoke(adminHandler, { method: "POST", body: { affiliate_code: affiliate.code, amount } });
    assert.equal(res.statusCode, 400);
  }
  assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"));
});
