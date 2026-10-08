import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ServerResponse } from "node:http";
import handler from "../api/account-orders.js";

const originalFetch = globalThis.fetch;
const owner = { id: "00000000-0000-4000-8000-000000000001", email: "owner@example.invalid", email_confirmed_at: "2026-01-01T00:00:00Z" };
const foreignId = "00000000-0000-4000-8000-000000000002";
let calls;

beforeEach(() => {
  calls = [];
  Object.assign(process.env, {
    SUPABASE_URL: "https://database.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key",
    SUPABASE_ANON_KEY: "synthetic-public-key",
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
function item(overrides = {}) { return { name: "Fixture", dose: "5 mg", quantity: 1, price: 42.1, fromWarehouse: "us", noteLabel: "One vial", ...overrides }; }
function order(n = 1, overrides = {}) {
  return {
    id: `ORDER-${String(n).padStart(5, "0")}`, user_id: owner.id, email: owner.email,
    status: "paid", total: 42.1, created_at: "2026-10-01T12:00:00+00:00", paid_at: "2026-10-01T12:05:00+00:00",
    payment_provider: "card", items: [item()], metadata: {}, ...overrides,
  };
}
function installFetch({ user = owner, ordersPage } = {}) {
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, ...options });
    if (url.pathname === "/auth/v1/user") return json(user);
    assert.equal(url.pathname, "/rest/v1/orders");
    assert.equal(options.method, "GET");
    assert.equal(options.headers.apikey, "synthetic-service-key");
    assert.equal(options.headers.Authorization, "Bearer synthetic-service-key");
    assert.equal(options.headers.Prefer, "count=exact");
    assert.equal(url.searchParams.get("select"), "id,user_id,email,total,status,created_at,paid_at,payment_provider,items,metadata");
    assert.equal(url.searchParams.get("status"), "ilike.paid");
    assert.equal(url.searchParams.get("order"), "created_at.desc.nullslast,id.asc");
    assert.equal(url.searchParams.get("limit"), "200");
    return ordersPage ? ordersPage(url) : page([]);
  };
}
async function invoke(overrides = {}) {
  const res = response();
  await handler({ method: "GET", url: "/api/account-orders", headers: { authorization: "Bearer synthetic-token" }, query: {}, ...overrides }, res);
  assert.match(res.headers["Cache-Control"], /no-store/);
  if (res.statusCode < 400) assert.equal(res.headers["Cache-Control"], "private, no-store");
  assert.equal(res.headers.Vary, "Authorization");
  return res;
}

for (const [name, authenticated, status] of [["anonymous", false, 401], ["unconfirmed account", true, 403]]) {
  test(`history ${name} denial ends a real HTTP response without late headers or storage access`, async () => {
    installFetch({ user: { ...owner, email_confirmed_at: null } });
    const res = new ServerResponse({ method: "GET" });
    res.status = function status(value) { this.statusCode = value; return this; };
    res.json = function json(body) { this.setHeader("Content-Type", "application/json"); this.end(JSON.stringify(body)); return this; };
    try {
      await assert.doesNotReject(handler({ method: "GET", url: "/api/account-orders", headers: authenticated ? { authorization: "Bearer synthetic-token" } : {}, query: {} }, res));
      assert.equal(res.statusCode, status); assert.equal(res.headersSent, true); assert.equal(res.writableEnded, true);
      assert.match(res.getHeader("Cache-Control"), /no-store/); assert.equal(res.getHeader("Vary"), "Authorization");
      assert.equal(calls.length, authenticated ? 1 : 0);
      assert.ok(calls.every(call => call.url.pathname === "/auth/v1/user"));
      assert.throws(() => res.setHeader("example", "late"), { code: "ERR_HTTP_HEADERS_SENT" });
    } finally { res.destroy(); }
  });
}

test("anonymous history request cannot reach Auth or storage", async () => {
  installFetch();
  const res = await invoke({ headers: {} });
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});
test("expired token cannot reach order storage", async () => {
  globalThis.fetch = async url => { calls.push(String(url)); return json({}, 401); };
  const res = await invoke();
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 1);
});
test("history GET never accepts write methods", async () => {
  installFetch();
  const res = await invoke({ method: "POST", body: { email: owner.email } });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET");
  assert.equal(calls.length, 0);
});
for (const user of [
  { ...owner, email_confirmed_at: null }, { ...owner, email: null },
  { ...owner, id: "not-an-auth-uuid" }, { ...owner, email: "broken\nmail@example.invalid" },
]) {
  test(`unverified or malformed identity fails before storage: ${JSON.stringify(user)}`, async () => {
    installFetch({ user });
    assert.equal((await invoke()).statusCode, 403);
    assert.equal(calls.length, 1);
  });
}
for (const selector of [{ query: { email: "other@example.invalid" } }, { query: { user_id: foreignId } }, { query: { orderId: "OTHER" } }, { url: "/api/account-orders?offset=200" }]) {
  test(`caller selector is rejected: ${JSON.stringify(selector)}`, async () => {
    installFetch();
    assert.equal((await invoke(selector)).statusCode, 400);
    assert.equal(calls.length, 1);
  });
}
test("complete empty response is explicit and requires exact storage count", async () => {
  installFetch();
  assert.deepEqual((await invoke()).body, { ok: true, orders: [], total: 0, complete: true });
});
test("stored UUID ownership survives an email change and metadata cannot reassign it", async () => {
  installFetch({ ordersPage: () => page([order(1, { email: "old@example.invalid", metadata: { email: "forged@example.invalid", user_id: foreignId } })]) });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orders[0].email, "old@example.invalid");
  assert.ok(!("user_id" in res.body.orders[0]));
});
test("null-user-id legacy ownership supports mixed-case historical email", async () => {
  installFetch({ user: { ...owner, email: "OWNER@EXAMPLE.INVALID" }, ordersPage: () => page([order(1, { user_id: null, email: "Owner@Example.Invalid" })]) });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orders[0].email, "Owner@Example.Invalid");
});
for (const email of ["a_b%@example.invalid", "a*b@example.invalid", "a+b@example.invalid", 'quoted"mail,part(test)@example.invalid', "back\\slash@example.invalid"]) {
  test(`legacy email is a literal anchored filter: ${email}`, async () => {
    installFetch({ user: { ...owner, email }, ordersPage: url => {
      const filter = url.searchParams.get("or");
      const prefix = `(user_id.eq.${owner.id},and(user_id.is.null,email.imatch.`;
      assert.ok(filter.startsWith(prefix));
      assert.ok(filter.endsWith("))"));
      const pattern = JSON.parse(filter.slice(prefix.length, -2));
      const regex = new RegExp(pattern, "i");
      assert.ok(regex.test(email.toUpperCase()));
      assert.ok(!regex.test(`prefix${email}`));
      assert.ok(!regex.test(`${email}suffix`));
      assert.ok(!regex.test("other@example.invalid"));
      if (email.includes("_")) assert.ok(!regex.test(email.replace("_", "X")));
      if (email.includes("%")) assert.ok(!regex.test(email.replace("%", "ANY")));
      if (email.includes("*")) assert.ok(!regex.test(email.replace("*", "ANY")));
      return page([order(1, { user_id: null, email })]);
    } });
    assert.equal((await invoke()).statusCode, 200);
  });
}
for (const [name, row] of [
  ["different UUID with matching email", order(1, { user_id: foreignId })],
  ["different legacy email", order(1, { user_id: null, email: "other@example.invalid" })],
  ["missing ownership column", order(1, { user_id: undefined })],
  ["metadata-only ownership", order(1, { user_id: null, email: "other@example.invalid", metadata: { email: owner.email, user_id: owner.id } })],
]) {
  test(`foreign row is rejected despite storage response: ${name}`, async () => {
    installFetch({ ordersPage: () => page([row]) });
    const res = await invoke();
    assert.equal(res.statusCode, 502);
    assert.ok(!("orders" in res.body));
  });
}
test("recursive projection excludes private metadata and future secrets", async () => {
  const privateFields = { adminNote: "PRIVATE_ADMIN", supplierCost: "PRIVATE_COST", costSnapshot: "PRIVATE_SNAPSHOT", affiliateOwnerEmail: "PRIVATE_AFFILIATE", affiliateCommission: "PRIVATE_COMMISSION", affiliateCommissionAdjustment: "PRIVATE_ADJUSTMENT", purchaseAttestation: "PRIVATE_ATTESTATION", paymentId: "PRIVATE_PAYMENT", paymentPayload: "PRIVATE_CALLBACK", invoiceUrl: "PRIVATE_URL", futureSecret: "PRIVATE_FUTURE" };
  installFetch({ ordersPage: () => page([order(1, {
    ...privateFields,
    payment_id: "PRIVATE_PAYMENT_COLUMN",
    items: [item(privateFields)],
    metadata: {
      ...privateFields, total: 999, id: "FORGED_ID", status: "cancelled", paidAt: "FORGED_DATE",
      subtotal: 40, shipping: 2.1, firstName: "Customer", lastName: "Fixture",
      address: "Fixture address", address2: "Unit 2", city: "Fixture City", state: "AA", postalCode: "00000", country: "Fixtureland",
      phone: "customer-phone", taxId: "customer-tax-id", orderNotes: "customer note", shippingType: "standard", trackingNumber: "TRACK-1", trackingNumber2: "TRACK-2",
    },
  })]) });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  const result = res.body.orders[0];
  assert.equal(result.id, "ORDER-00001");
  assert.equal(result.status, "paid");
  assert.equal(result.total, 42.1);
  assert.equal(result.paidAt, "2026-10-01T12:05:00+00:00");
  assert.equal(result.phone, "customer-phone");
  assert.equal(result.taxId, "customer-tax-id");
  assert.equal(result.orderNotes, "customer note");
  assert.deepEqual(Object.keys(result.items[0]).sort(), ["name", "dose", "quantity", "price", "fromWarehouse", "noteLabel"].sort());
  assert.ok(!JSON.stringify(res.body).includes("PRIVATE_"));
  assert.ok(!("metadata" in result));
});
test("missing money and dates remain unknown instead of metadata totals or zero", async () => {
  installFetch({ ordersPage: () => page([order(1, { total: null, created_at: null, paid_at: null, items: [item({ price: null })], metadata: { total: 999, paidAt: "2026-10-01", createdAt: "2026-10-01" } })]) });
  const result = (await invoke()).body.orders[0];
  for (const key of ["total", "subtotal", "shipping", "createdAt", "paidAt"]) assert.equal(result[key], null);
  assert.equal(result.items[0].price, null);
});
test("structured item snapshot wins without cross-line warehouse merging", async () => {
  installFetch({ ordersPage: () => page([order(1, { items: [item({ fromWarehouse: "cn" }), item({ fromWarehouse: "us" })], metadata: { items: [item({ fromWarehouse: "WRONG", price: 1 })] } })]) });
  const result = (await invoke()).body.orders[0];
  assert.deepEqual(result.items.map(value => value.fromWarehouse), ["cn", "us"]);
  assert.deepEqual(result.items.map(value => value.price), [42.1, 42.1]);
});
test("legacy metadata items support qty and only allowed fields", async () => {
  installFetch({ ordersPage: () => page([order(1, { items: [], metadata: { items: [{ name: "Legacy", qty: "2", price: "0.29", futureSecret: "PRIVATE" }] } })]) });
  const result = (await invoke()).body.orders[0].items[0];
  assert.equal(result.quantity, 2);
  assert.equal(result.price, 0.29);
  assert.ok(!("futureSecret" in result));
});
test("markup-like customer strings remain plain scalar values", async () => {
  installFetch({ ordersPage: () => page([order(1, { items: [item({ name: "<script>literal</script>" })], metadata: { address: "<b>literal address</b>" } })]) });
  const result = (await invoke()).body.orders[0];
  assert.equal(result.items[0].name, "<script>literal</script>");
  assert.equal(result.address, "<b>literal address</b>");
});
for (const [name, override] of [
  ["non-paid", { status: "done" }], ["metadata array", { metadata: [] }],
  ["object customer field", { metadata: { firstName: {} } }], ["items object", { items: {} }],
  ["missing quantity", { items: [{ name: "Fixture" }] }], ["object item", { items: [item({ name: {} })] }],
  ["negative total", { total: -1 }], ["fractional cents", { total: 0.001 }],
  ["blank total", { total: "" }], ["invalid timestamp", { created_at: "not-a-date" }],
]) {
  test(`malformed history stays unavailable: ${name}`, async () => {
    installFetch({ ordersPage: () => page([order(1, override)]) });
    const res = await invoke();
    assert.equal(res.statusCode, 502);
    assert.ok(!("orders" in res.body));
    assert.ok(!("complete" in res.body));
  });
}
test("history reads a complete second page with stable tie-break order", async () => {
  installFetch({ ordersPage: url => {
    const offset = Number(url.searchParams.get("offset"));
    return offset === 0 ? page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 201) : page([order(201)], 201, 200);
  } });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.orders.length, 201);
  assert.equal(res.body.total, 201);
  assert.equal(res.body.complete, true);
  assert.equal(calls.length, 3);
});
for (const [name, ordersPage] of [
  ["missing count", () => json([order()])],
  ["unknown count", () => json([order()], 200, { "content-range": "0-0/*" })],
  ["short server-capped page", () => page([order()], 2)],
  ["wrong range", () => page([order()], 1, 1)],
  ["non-array response", () => json({ id: "fixture" }, 200, { "content-range": "0-0/1" })],
  ["duplicate rows", () => page([order(), order()])],
  ["out-of-order timestamp", () => page([order(1), order(2, { created_at: "2026-10-02T00:00:00Z" })])],
  ["out-of-order equal timestamp IDs", () => page([order(2), order(1)])],
  ["storage failure", () => json({ error: "secret database details" }, 403)],
  ["second-page failure", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 201) : json({}, 503)],
  ["changed count", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 201) : page([order(201), order(202)], 202, 200)],
  ["unexpected empty final page", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 201) : page([], 201, 200)],
  ["overlapping boundary", url => Number(url.searchParams.get("offset")) === 0 ? page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 201) : page([order(200)], 201, 200)],
]) {
  test(`pagination refuses a partial success: ${name}`, async () => {
    installFetch({ ordersPage });
    const res = await invoke();
    assert.equal(res.statusCode, 502);
    assert.ok(!("orders" in res.body));
    assert.ok(!JSON.stringify(res.body).includes("secret database details"));
  });
}
test("over-limit count fails before a second fetch", async () => {
  installFetch({ ordersPage: () => page(Array.from({ length: 200 }, (_, i) => order(i + 1)), 1001) });
  const res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, "ACCOUNT_ORDERS_TOO_LARGE");
  assert.equal(calls.length, 2);
});
test("exact 1000-order boundary is complete and bounded", async () => {
  installFetch({ ordersPage: url => {
    const offset = Number(url.searchParams.get("offset"));
    return page(Array.from({ length: 200 }, (_, i) => order(offset + i + 1)), 1000, offset);
  } });
  const res = await invoke();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1000);
  assert.equal(res.body.complete, true);
  assert.equal(calls.length, 6);
});
test("large customer payload fails unknown before exceeding response budget", async () => {
  installFetch({ ordersPage: url => {
    const offset = Number(url.searchParams.get("offset"));
    return page(Array.from({ length: 200 }, (_, i) => order(offset + i + 1, { metadata: { orderNotes: "n".repeat(4000) } })), 600, offset);
  } });
  const res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, "ACCOUNT_ORDERS_TOO_LARGE");
  assert.ok(!("orders" in res.body));
});
