import assert from "node:assert/strict";
import { after, test } from "node:test";
import { Readable } from "node:stream";
import Stripe from "stripe";

// Real Stripe signature verification, synthetic fixtures, intercepted I/O only.
process.env.STRIPE_SECRET_KEY = "sk_test_synthetic";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_synthetic_fixture";
process.env.SUPABASE_URL = "https://database.invalid";
process.env.VITE_SUPABASE_URL = "https://database.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
process.env.RESEND_API_KEY = "synthetic-email-key";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const handler = (await import("../api/stripe-webhook.js")).default;
const previousFetch = globalThis.fetch;
after(() => { globalThis.fetch = previousFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function order(overrides = {}) {
  return {
    id: "TEST-fixture", email: "fixture@example.invalid", status: "checkout", total: 100, payment_id: null,
    metadata: { total: 999, subtotal: 100, storeCreditUsed: 99, items: [{ name: "Fixture", quantity: 1, price: 100 }] },
    ...overrides,
  };
}
function payment(type, overrides = {}) {
  return {
    id: type === "session" ? "cs_fixture" : "pi_fixture", currency: "usd",
    metadata: { orderId: "TEST-fixture", email: "fixture@example.invalid", subtotal: "100", storeCreditUsed: "0" },
    ...(type === "session"
      ? { payment_status: "paid", amount_total: 10000, customer_email: "fixture@example.invalid", payment_intent: "pi_fixture" }
      : { status: "succeeded", amount: 10000, amount_received: 10000 }),
    ...overrides,
  };
}
async function invoke(type, object, existing, { changed = true, signatureValid = true } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), ...options });
    if (String(url) === "https://api.resend.com/emails") return json({ id: "synthetic-receipt" });
    assert.ok(String(url).startsWith("https://database.invalid/rest/v1/orders?"));
    if (options.method === "PATCH") return json(changed ? [{ id: "TEST-fixture", status: "paid" }] : []);
    assert.equal(options.method, undefined);
    return json(existing ? [existing] : []);
  };
  const payload = JSON.stringify({ id: "evt_fixture", type: type === "session" ? "checkout.session.completed" : "payment_intent.succeeded", data: { object } });
  const req = Readable.from([Buffer.from(payload)]);
  req.method = "POST";
  req.headers = { "stripe-signature": signatureValid
    ? stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET }) : "invalid" };
  const res = {
    statusCode: 200,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    end(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
  };
  await handler(req, res);
  return { res, calls };
}

for (const type of ["session", "intent"]) {
  for (const status of ["done", "refunded", "cancelled"]) {
    test(`Stripe ${type}: ${status} order cannot be resurrected`, async () => {
      const { res, calls } = await invoke(type, payment(type), order({ status }));
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.skipped, "terminal_order");
      assert.equal(calls.length, 1);
    });
  }
  test(`Stripe ${type}: missing order cannot be recreated`, async () => {
    const { res, calls } = await invoke(type, payment(type), null);
    assert.equal(res.statusCode, 503);
    assert.equal(calls.length, 1);
  });
  test(`Stripe ${type}: wrong amount, currency, email or payment binding cannot mutate`, async () => {
    const amountChange = type === "session" ? { amount_total: 1 } : { amount: 1, amount_received: 1 };
    for (const [object, row] of [
      [payment(type, amountChange), order()],
      [payment(type, { currency: "eur" }), order()],
      [payment(type), order({ email: "another@example.invalid" })],
      [payment(type), order({ payment_id: "pi_other" })],
    ]) {
      const { res, calls } = await invoke(type, object, row);
      assert.equal(res.statusCode, 409);
      assert.equal(calls.length, 1);
    }
  });
  test(`Stripe ${type}: duplicate shares the payment intent identity and sends nothing`, async () => {
    const { res, calls } = await invoke(type, payment(type), order({ status: "paid", payment_id: "pi_fixture" }));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.skipped, "already_processed");
    assert.equal(calls.length, 1);
  });
  test(`Stripe ${type}: verified transition records charged amount before receipt`, async () => {
    const { res, calls } = await invoke(type, payment(type), order());
    assert.equal(res.statusCode, 200);
    const paidWrite = calls.find(call => call.method === "PATCH");
    assert.ok(paidWrite);
    assert.match(decodeURIComponent(paidWrite.url), /status=in\.\(pending,checkout,"checkout \(clicked pay\)"\)/);
    assert.match(paidWrite.url, /total=eq\.100/);
    assert.match(paidWrite.url, /payment_id=is.null/);
    const body = JSON.parse(paidWrite.body);
    assert.equal(body.total, 100);
    assert.equal(body.metadata.total, 100);
    assert.equal(body.payment_id, "pi_fixture");
    const receiptIndex = calls.findIndex(call => call.url === "https://api.resend.com/emails");
    assert.ok(receiptIndex > calls.indexOf(paidWrite));
    const receipt = JSON.parse(calls[receiptIndex].body);
    assert.equal(receipt.to, "fixture@example.invalid");
    assert.ok(!receipt.html.includes("$999.00"));
  });
  test(`Stripe ${type}: losing the conditional transition sends no receipt`, async () => {
    const { res, calls } = await invoke(type, payment(type), order(), { changed: false });
    assert.equal(res.statusCode, 500);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.url !== "https://api.resend.com/emails"));
  });
}
test("Stripe completed but unpaid checkout cannot become paid", async () => {
  const { res, calls } = await invoke("session", payment("session", { payment_status: "unpaid" }), order());
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.skipped, "payment_not_paid");
  assert.equal(calls.length, 1);
});
test("Stripe unsigned payload cannot reach storage", async () => {
  const { res, calls } = await invoke("intent", payment("intent"), order(), { signatureValid: false });
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});
