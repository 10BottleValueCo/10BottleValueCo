import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { generateInvoiceNumber, invoiceNumberFromUuid, matchesCheckoutInvoice, COMPATIBLE_INVOICE_PATTERN } from "./_invoice-number.js";
import { createLegacyAttemptManager } from "../artifacts/10-bottle-value/src/legacy-checkout-attempt.js";
import { readMeritOrderId } from "./_merit-core.js";
import { meritOrderIdFromCheckoutKey, readMeritAttempt, saveMeritAttempt, createMeritApiClient } from "../artifacts/10-bottle-value/src/merit-checkout-client.js";

const key = "12345678-abcd-4abc-8abc-123456789abc";
test("new invoice numbers always have eight uppercase alphanumeric characters after INV-", () => {
  for (let i = 0; i < 1000; i++) assert.match(generateInvoiceNumber(), /^INV-[A-Z0-9]{8}$/);
  assert.equal(invoiceNumberFromUuid("00000000-0000-0000-0000-000000000000"), "INV-00000000");
  assert.match(invoiceNumberFromUuid("ffffffff-ffff-ffff-ffff-ffffffffffff"), /^INV-[A-Z0-9]{8}$/);
  assert.equal(invoiceNumberFromUuid(key), invoiceNumberFromUuid(key.toUpperCase()));
});
test("CSPRNG fallback works without UUID support; insecure random fallback is forbidden", () => {
  const fallback = { getRandomValues: bytes => bytes.fill(255) };
  assert.equal(generateInvoiceNumber(fallback), invoiceNumberFromUuid("f".repeat(32)));
  assert.throws(() => generateInvoiceNumber({}), /Secure invoice generation/);
  for (const invalid of [null, "", "not-a-uuid", "1".repeat(31), "g".repeat(32)]) {
    assert.throws(() => invoiceNumberFromUuid(invalid));
  }
});
test("existing UUID invoices still bind to exactly their original checkout key", () => {
  const old = "INV-" + key.replaceAll("-", "").toUpperCase();
  assert.equal(matchesCheckoutInvoice(old, key), true);
  assert.equal(matchesCheckoutInvoice(invoiceNumberFromUuid(key), key), true);
  assert.equal(matchesCheckoutInvoice("INV-OTHER123", key), false);
  assert.equal(readMeritOrderId(old), old);
  assert.equal(readMeritOrderId(invoiceNumberFromUuid(key)), invoiceNumberFromUuid(key));
  for (const invalid of ["INV-1234567", "INV-123456789", "INV-" + "A".repeat(16), "INV-<script>"]) {
    assert.equal(COMPATIBLE_INVOICE_PATTERN.test(invalid), false);
    assert.throws(() => readMeritOrderId(invalid));
  }
});
test("Merit browser predicts short numbers but keeps already-started long attempts unchanged", () => {
  assert.equal(meritOrderIdFromCheckoutKey(key), invoiceNumberFromUuid(key));
  let serialized;
  const storage = { setItem(_key, value) { serialized = value; }, getItem() { return serialized; } };
  for (const orderId of [invoiceNumberFromUuid(key), "INV-" + key.replaceAll("-", "").toUpperCase()]) {
    saveMeritAttempt(storage, { key, digest: "a".repeat(64), submitted: true, orderId });
    assert.equal(readMeritAttempt(storage).orderId, orderId);
  }
});
test("Merit browser consumes new and existing receipts but rejects another checkout's invoice", async () => {
  const short = invoiceNumberFromUuid(key), old = "INV-" + key.replaceAll("-", "").toUpperCase();
  for (const id of [short, old, "INV-OTHER123"]) {
    const client = createMeritApiClient({
      getAccessToken: async () => "fixture-bearer",
      fetchImpl: async (_url, options) => {
        assert.equal(options.headers.Authorization, "Bearer fixture-bearer");
        assert.equal(JSON.parse(options.body).checkoutKey, key);
        return Response.json({ ok: true, order: { id, items: [{ name: "Fixture", dose: "1mg", price: 100, quantity: 1 }],
          subtotal: 100, shipping: 0, automaticDiscount: 0, promoDiscount: 0, affiliateDiscount: 0,
          total: 103, customerCardSurcharge: 3, customerCardSurchargeBps: 300 },
          session: { orderId: id, amountCents: 10300, baseAmountCents: 10000, surchargeCents: 300,
            currency: "usd", clientSecret: "pi_fixture_secret_fixture", publishableKey: "pk_live_fixture", stripeAccount: "acct_fixture" } });
      },
    });
    const pending = client.create({ checkoutKey: key, payload: {}, proof: {} });
    if (id === "INV-OTHER123") await assert.rejects(pending, /Secure payment/);
    else assert.equal((await pending).order.id, id);
  }
});
test("Paylio, Cash App and crypto replay one eight-character invoice per unchanged checkout", async () => {
  const manager = createLegacyAttemptManager({ cryptoApi: webcrypto });
  manager.begin("journey", "verified-customer");
  const first = await manager.prepare("paylio", "paypal", { amount: 100 }, "verified-customer");
  const replay = await manager.prepare("paylio", "paypal", { amount: 100 }, "verified-customer");
  const cash = await manager.prepare("paylio", "cashapp", { amount: 100 }, "verified-customer");
  const crypto = await manager.prepare("catalystpay", "btc", { amount: 100 }, "verified-customer");
  assert.equal(first, replay);
  for (const attempt of [first, cash, crypto]) assert.match(attempt.orderId, /^INV-[A-Z0-9]{8}$/);
  assert.equal(new Set([first.orderId, cash.orderId, crypto.orderId]).size, 3);
  manager.begin("different-journey", "different-customer");
  await assert.rejects(manager.prepare("paylio", "paypal", {}, "verified-customer"), /Sign in again/);
});

test("the first payment keeps the displayed draft invoice; retries cannot replace or mutate it", async () => {
  for (const [provider, selection, url] of [
    ["paylio", "paypal", "https://paylio.org/fixture-paypal"],
    ["paylio", "cashapp", "https://paylio.org/fixture-cashapp"],
    ["catalystpay", "lightning", "https://example.com/fixture-lightning"],
    ["nowpayments", "usdtrx", "https://nowpayments.io/fixture-crypto"],
  ]) {
    const manager = createLegacyAttemptManager({ cryptoApi: webcrypto });
    const displayed = generateInvoiceNumber(webcrypto);
    manager.begin(displayed, "buyer");
    const first = await manager.prepare(provider, selection, { total: 297.99 }, "buyer");
    assert.equal(first.orderId, displayed);
    manager.remember(first, url);
    const retry = await manager.prepare(provider, selection, { total: 297.99 }, "buyer");
    assert.equal(retry, first);
    assert.equal(retry.url, url);
    const changed = await manager.prepare(provider, selection, { total: 298.99 }, "buyer");
    assert.notEqual(changed.orderId, displayed);
    assert.equal(first.orderId, displayed);
    assert.equal(first.url, url);
    const otherInvoice = generateInvoiceNumber(webcrypto);
    manager.begin(otherInvoice, "other-buyer");
    await assert.rejects(manager.prepare(provider, selection, {}, "buyer"), /Sign in again/);
    assert.equal((await manager.prepare(provider, selection, {}, "other-buyer")).orderId, otherInvoice);
  }
});

// Optional real PostgreSQL-engine check without any connection to customer data.
// Run: node api/invoice-number.test.mjs --pglite=/absolute/path/to/pglite/dist/index.js
const sqlModule = process.argv.find(value => value.startsWith("--pglite="))?.slice(9);
test("SQL migration agrees with JS, keeps old bindings/ACLs and rejects collisions and bad keys", { skip: !sqlModule }, async () => {
  const { PGlite } = await import(sqlModule);
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE public.orders(id text PRIMARY KEY, metadata jsonb);
      CREATE TABLE public.merit_payment_attempts(checkout_key uuid PRIMARY KEY,
        order_id text UNIQUE REFERENCES public.orders(id), amount integer CHECK (amount > 0),
        CHECK (order_id = 'INV-' || upper(replace(checkout_key::text, '-', ''))));
      CREATE FUNCTION public.reserve_merit_checkout(p_checkout_key uuid) RETURNS text
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
      DECLARE v_order_id text := 'INV-' || upper(replace(p_checkout_key::text, '-', ''));
      BEGIN RETURN v_order_id; END; $$;
      CREATE FUNCTION public.reserve_merit_checkout_with_credit(p_checkout_key uuid) RETURNS text
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
      DECLARE v_order_id text := 'INV-' || upper(replace(p_checkout_key::text, '-', ''));
      BEGIN RETURN v_order_id; END; $$;
      CREATE FUNCTION public.checkout_store_credit(p_order_id text) RETURNS boolean
      LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
      BEGIN RETURN p_order_id ~ '^INV-[A-Fa-f0-9]{32}$'; END; $$;
      REVOKE ALL ON FUNCTION public.reserve_merit_checkout(uuid),public.reserve_merit_checkout_with_credit(uuid),public.checkout_store_credit(text) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.reserve_merit_checkout(uuid),public.reserve_merit_checkout_with_credit(uuid),public.checkout_store_credit(text) TO service_role;
    `);
    const old = "INV-" + key.replaceAll("-", "").toUpperCase();
    await db.query("INSERT INTO orders VALUES ($1,$2)", [old, JSON.stringify({ immutable: "payment fixture" })]);
    await db.query("INSERT INTO merit_payment_attempts VALUES ($1,$2,100)", [key, old]);
    const aclQuery = "SELECT oid,proname,prosecdef,proconfig,proacl::text FROM pg_proc WHERE proname IN ('reserve_merit_checkout','reserve_merit_checkout_with_credit','checkout_store_credit') ORDER BY proname";
    const beforeACL = await db.query(aclQuery);
    const beforeOrders = await db.query("SELECT * FROM orders");
    const migration = await readFile(new URL("../supabase/migrations/20261014010000_short_invoice_numbers.sql", import.meta.url), "utf8");
    await db.exec(migration);
    assert.deepEqual(await db.query(aclQuery), beforeACL);
    assert.deepEqual(await db.query("SELECT * FROM orders"), beforeOrders);
    assert.equal((await db.query("SELECT order_id FROM merit_payment_attempts")).rows[0].order_id, old);
    for (let i = 0; i < 100; i++) {
      const uuid = randomUUID();
      const result = await db.query("SELECT short_invoice_number($1::uuid) AS n, reserve_merit_checkout($1::uuid) AS r, reserve_merit_checkout_with_credit($1::uuid) AS c", [uuid]);
      for (const value of Object.values(result.rows[0])) assert.equal(value, invoiceNumberFromUuid(uuid));
    }
    const short = invoiceNumberFromUuid(key);
    assert.equal((await db.query("SELECT checkout_store_credit($1) AS ok", [short])).rows[0].ok, true);
    assert.equal((await db.query("SELECT checkout_store_credit($1) AS ok", [old])).rows[0].ok, true);
    assert.equal((await db.query("SELECT checkout_store_credit('INV-TOO-LONG-INVALID') AS ok")).rows[0].ok, false);
    const other = randomUUID(), otherNumber = invoiceNumberFromUuid(other);
    await db.query("INSERT INTO orders VALUES ($1,'{}')", [otherNumber]);
    await db.query("INSERT INTO merit_payment_attempts VALUES ($1,$2,100)", [other, otherNumber]);
    const collisionHex = (BigInt("0x" + other.replaceAll("-", "")) + 36n ** 8n).toString(16).padStart(32, "0");
    const collision = collisionHex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    assert.equal(invoiceNumberFromUuid(collision), otherNumber);
    await assert.rejects(db.query("INSERT INTO merit_payment_attempts VALUES ($1,$2,100)", [collision, otherNumber]), error => error.code === "23505");
    await db.query("INSERT INTO orders VALUES ('INV-ZZZZZZZZ','{}')");
    await assert.rejects(db.query("INSERT INTO merit_payment_attempts VALUES ($1,'INV-ZZZZZZZZ',100)", [randomUUID()]), error => error.code === "23514");
    await db.exec(migration); // safe to rerun
    await db.exec("SET ROLE anon");
    await assert.rejects(db.query("SELECT public.short_invoice_number($1::uuid)", [key]), error => error.code === "42501");
    await db.exec("RESET ROLE");
  } finally { await db.close(); }
});
