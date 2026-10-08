// Real SQL execution in an isolated, in-memory PGlite/Postgres fixture.
// No production connection, provider call, or application dependency is needed.
// Run with MERIT_SQL_TEST_PGLITE pointing at an installed PGlite dist/index.js.
// PGlite has one connection: these checks prove transactions/replay/constraints,
// not independent-session lock scheduling on the deployed Postgres instance.
import assert from "node:assert/strict";
import fs, { readFile } from "node:fs/promises";
import { randomUUID, randomBytes, createHmac, createHash } from "node:crypto";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { test } from "node:test";

const orderAckFaults = [
  { name: "BEFORE item rewrite", timing: "BEFORE", mode: "rewrite" },
  { name: "BEFORE row suppression", timing: "BEFORE", mode: "suppress" },
  { name: "AFTER stored-row rewrite", timing: "AFTER", mode: "rewrite" },
];
function orderAckFaultSql(orderId, event, fault) {
  assert.ok(["INSERT", "UPDATE"].includes(event));
  assert.ok(orderAckFaults.includes(fault));
  const literal = value => `'${String(value).replaceAll("'", "''")}'`;
  return `
    CREATE FUNCTION public.fixture_order_ack_fault() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.id IS DISTINCT FROM TG_ARGV[0] OR pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
      IF TG_WHEN = 'BEFORE' THEN
        IF TG_ARGV[1] = 'suppress' THEN RETURN NULL; END IF;
        NEW.items := jsonb_set(NEW.items, '{0,quantity}', '999'::jsonb);
        RETURN NEW;
      END IF;
      UPDATE public.orders SET metadata = metadata || '{"fixtureAfterWrite":true}'::jsonb WHERE id = NEW.id;
      RETURN NEW;
    END $$;
    CREATE TRIGGER zz_fixture_order_ack ${fault.timing} ${event} ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.fixture_order_ack_fault(${literal(orderId)}, ${literal(fault.mode)});
  `;
}
const clearOrderAckFaultSql = "DROP TRIGGER zz_fixture_order_ack ON public.orders; DROP FUNCTION public.fixture_order_ack_fault();";

const modulePath = process.env.MERIT_SQL_TEST_PGLITE;
test("Merit SQL transaction and privilege acceptance", { skip: !modulePath }, async t => {
  const { PGlite } = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb ->> 'sub','')::uuid $$;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    CREATE TABLE public.orders (
      id text PRIMARY KEY, email text, status text, total numeric,
      metadata jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz,
      items jsonb, payment_provider text, payment_id text, paid_at timestamptz,
      admin_note text, tracking_number text, tracking_number_2 text,
      tracking_number_sent_at timestamptz, affiliate_commission_adjustment numeric
    );
    CREATE TABLE public.user_promos (
      id text PRIMARY KEY, email text, code text, rate numeric, used boolean DEFAULT false,
      updated_at timestamptz DEFAULT now()
    );
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.orders, public.user_promos TO anon, authenticated, service_role;
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY legacy_public_orders ON public.orders FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
    ALTER TABLE public.user_promos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY legacy_public_promos ON public.user_promos FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
  `);
  await db.exec(await readFile(new URL("../../supabase/migrations/20261008180000_merit_checkout.sql", import.meta.url), "utf8"));
  const customerId = "a0000000-0000-4000-8000-000000000001";
  const supportId = "a0000000-0000-4000-8000-000000000002";
  const unconfirmedSupportId = "a0000000-0000-4000-8000-000000000003";
  const siblingId = "a0000000-0000-4000-8000-000000000004";
  await db.query("INSERT INTO auth.users VALUES ($1,'buyer@example.test',now()),($2,'support@10bottlevalue.co',now()),($3,'support@10bottlevalue.co',NULL),($4,'buyer@example.test',now())", [customerId, supportId, unconfirmedSupportId, siblingId]);
  const run = (role, fn, sub = customerId) => db.transaction(async tx => {
    await tx.exec(`SET LOCAL ROLE ${role}`);
    await tx.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role, sub })]);
    return fn(tx);
  });
  const service = fn => run("service_role", fn);
  const support = fn => run("authenticated", fn, supportId);
  const rpc = async (tx, name, args) => (await tx.query(`SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) AS result`, args)).rows[0].result;
  const quote = (patch = {}) => ({
    key: randomUUID(), email: "buyer@example.test", customerId, fingerprint: "a".repeat(64),
    amount: 12000, currency: "usd", account: "acct_fixture", live: false, promoId: null,
    snapshot: {
      email: "buyer@example.test", total: 120, subtotal: 100, shipping: 20,
      storeCreditUsed: 0, promoDiscount: 0, promoCode: "", affiliateCode: "PARTNER",
      affiliateOwnerEmail: "private-affiliate@example.test", affiliateCommission: 10,
      paymentRules: { merchantFeeBps: 750, source: "private fixture" },
      costSnapshot: { supplierId: "synthetic-private", productCostCents: 4400 },
      items: [{ name: "Fixture", dose: "10 mg", quantity: 1, price: 100 }],
    }, ...patch,
  });
  const reserve = (q, tx) => rpc(tx, "reserve_merit_checkout", [q.key, q.email, q.customerId, q.fingerprint, q.amount, q.currency, q.snapshot, q.account, q.live, q.promoId]);
  const binding = a => [a.id, `pi_${a.id.replaceAll("-", "")}`, a.expected_account, a.expected_live];
  const bind = (a, tx, change = {}) => {
    const [id, intent, account, live] = binding(a);
    const b = { id, intent, account, live, secret: `${intent}_secret_fixture`, key: "pk_test_fixture", ...change };
    return rpc(tx, "bind_merit_checkout", [b.id, b.intent, b.account, b.live, b.secret, b.key]);
  };
  const finalize = (a, tx, change = {}) => {
    const p = { id: a.id, intent: a.intent_id, amount: a.amount_cents, currency: a.currency,
      email: a.email, order: a.order_id, account: a.expected_account, live: a.expected_live, ...change };
    return rpc(tx, "finalize_merit_checkout", [p.id, p.intent, p.amount, p.currency, p.email, p.order, p.account, p.live]);
  };
  const row = async id => (await db.query("SELECT * FROM public.orders WHERE id=$1", [id])).rows[0];
  const errorIs = code => e => e.code === code;
  let mainQuote, attempt, ready;

  await t.test("anonymous/customer callers cannot read attempts or execute checkout RPCs", async () => {
    for (const role of ["anon", "authenticated"]) {
      await assert.rejects(run(role, tx => tx.query("SELECT * FROM public.merit_payment_attempts")), errorIs("42501"));
      await assert.rejects(run(role, tx => reserve(quote(), tx)), errorIs("42501"));
    }
  });
  await t.test("reservation creates one canonical order with private identity and removes sensitive mirror fields", async () => {
    mainQuote = quote();
    const result = await service(tx => reserve(mainQuote, tx));
    assert.equal(result.created, true);
    attempt = result.attempt;
    assert.equal(attempt.customer_id, customerId);
    assert.equal(attempt.order_id, `INV-${mainQuote.key.replaceAll("-", "").toUpperCase()}`);
    assert.deepEqual(attempt.snapshot, mainQuote.snapshot);
    const order = await row(attempt.order_id);
    assert.equal(order.status, "checkout");
    assert.equal(Number(order.total), 120);
    assert.equal(order.metadata.paymentProvider, "Merit");
    assert.equal(order.metadata.paymentRules, undefined);
    assert.equal(order.metadata.costSnapshot, undefined);
    assert.equal(order.metadata.affiliateOwnerEmail, undefined);
  });
  await t.test("restrictive order reads allow only the confirmed owner and actual support identity", async () => {
    const visible = (role, sub) => run(role, tx => tx.query("SELECT * FROM orders WHERE id=$1", [attempt.order_id]), sub);
    for (const [role, sub] of [["anon", customerId], ["anon", supportId], ["authenticated", siblingId],
      ["authenticated", unconfirmedSupportId], ["authenticated", randomUUID()]]) {
      assert.deepEqual((await visible(role, sub)).rows, []);
    }
    for (const [role, sub] of [["authenticated", customerId], ["authenticated", supportId], ["service_role", customerId]]) {
      assert.equal((await visible(role, sub)).rows[0].id, attempt.order_id);
    }
    assert.equal((await db.query("SELECT polpermissive FROM pg_policy WHERE polname='merit_order_read_privacy'")).rows[0].polpermissive, false);
    for (const role of ["anon", "authenticated"]) {
      assert.equal((await run(role, tx => tx.query("SELECT public.can_read_merit_order($1) AS allowed", [attempt.order_id]), siblingId)).rows[0].allowed, false);
      await assert.rejects(run(role, tx => tx.query("SELECT * FROM auth.users")), errorIs("42501"));
    }
  });
  await t.test("owner email changes or revoked confirmation cannot read the immutable Merit snapshot", async () => {
    for (const mutation of ["email='changed@example.test'", "email_confirmed_at=NULL"]) {
      await db.query(`UPDATE auth.users SET ${mutation} WHERE id=$1`, [customerId]);
      try {
        assert.deepEqual((await run("authenticated", tx => tx.query("SELECT * FROM orders WHERE id=$1", [attempt.order_id]))).rows, []);
      } finally { await db.query("UPDATE auth.users SET email='buyer@example.test',email_confirmed_at=now() WHERE id=$1", [customerId]); }
    }
  });
  await t.test("same-key queued retries return created=false and the same private attempt", async () => {
    const replies = await Promise.all(Array.from({ length: 8 }, () => service(tx => reserve(mainQuote, tx))));
    assert.ok(replies.every(x => x.ok && !x.created && x.attempt.id === attempt.id));
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.merit_payment_attempts")).rows[0].n, 1);
  });
  await t.test("same key cannot change quote, identity, email or return another customer's attempt", async () => {
    for (const patch of [{ fingerprint: "b".repeat(64) }, { account: "acct_other" }, { live: true },
      { snapshot: { ...mainQuote.snapshot, shipping: 19 } }]) {
      const result = await service(tx => reserve({ ...mainQuote, ...patch }, tx));
      assert.equal(result.error, "MERIT_CHECKOUT_KEY_REUSED");
      assert.equal(result.attempt, undefined);
    }
    const stranger = { ...mainQuote, customerId: randomUUID() };
    assert.equal((await service(tx => reserve(stranger, tx))).error, "MERIT_ORDER_ID_CONFLICT");
    const changedEmail = { ...mainQuote, email: "other@example.test", snapshot: { ...mainQuote.snapshot, email: "other@example.test" } };
    assert.equal((await service(tx => reserve(changedEmail, tx))).error, "MERIT_CHECKOUT_KEY_REUSED");
  });
  await t.test("non-USD quotes, inconsistent totals and partial credit reserve nothing", async () => {
    for (const q of [quote({ currency: "eur" }), quote({ amount: 11999 }),
      quote({ snapshot: { ...mainQuote.snapshot, storeCreditUsed: 1 } })]) {
      assert.equal((await service(tx => reserve(q, tx))).error, "INVALID_MERIT_QUOTE");
    }
  });
  await t.test("all public and legacy-service financial edits to reserved orders are rejected", async () => {
    const original = await row(attempt.order_id);
    for (const role of ["anon", "authenticated", "service_role"]) {
      for (const sql of ["UPDATE orders SET status='paid' WHERE id=$1", "UPDATE orders SET total=1 WHERE id=$1",
        "UPDATE orders SET metadata=metadata || '{\"paymentProvider\":\"Stripe\"}'::jsonb WHERE id=$1",
        "UPDATE orders SET status='paid',payment_provider='Stripe',payment_id='pi_forged',metadata='{\"paymentProvider\":\"Stripe\",\"status\":\"paid\"}' WHERE id=$1",
        "UPDATE orders SET id='INV-RENAMED' WHERE id=$1", "DELETE FROM orders WHERE id=$1"]) {
        if (role === "anon") assert.deepEqual((await run(role, tx => tx.query(`${sql} RETURNING id`, [attempt.order_id]))).rows, []);
        else await assert.rejects(run(role, tx => tx.query(sql, [attempt.order_id])), errorIs("23514"));
      }
    }
    await assert.rejects(support(tx => tx.query("UPDATE orders SET status='paid' WHERE id=$1", [attempt.order_id])), errorIs("23514"));
    assert.deepEqual(await row(attempt.order_id), original);
  });
  await t.test("an anonymous forged local write setting cannot bypass the guard", async () => {
    const result = await run("anon", async tx => {
      await tx.query("SELECT set_config('app.merit_order_write_id',$1,true)", [attempt.order_id]);
      return tx.query("UPDATE orders SET status='paid' WHERE id=$1 RETURNING id", [attempt.order_id]);
    });
    assert.deepEqual(result.rows, []);
  });
  await t.test("forging both role claims and the old GUC cannot manufacture a private permit", async () => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      const forged = () => run(role, async tx => {
        await tx.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify({ role: "service_role" })]);
        await tx.query("SELECT set_config('app.merit_order_write_id',$1,true)", [attempt.order_id]);
        return tx.query("UPDATE orders SET status='paid' WHERE id=$1 RETURNING id", [attempt.order_id]);
      });
      if (role === "service_role") await assert.rejects(forged(), errorIs("23514"));
      else assert.deepEqual((await forged()).rows, []);
      await assert.rejects(run(role, tx => tx.query("INSERT INTO merit_order_write_permits VALUES (txid_current(),pg_backend_pid(),$1)", [attempt.order_id])), errorIs("42501"));
    }
    assert.equal((await db.query("SELECT count(*)::int n FROM merit_order_write_permits")).rows[0].n, 0);
  });
  await t.test("unbound Merit labels cannot be forged while unrelated legacy order behavior remains intact", async () => {
    await assert.rejects(run("service_role", tx => tx.query("INSERT INTO orders(id,metadata) VALUES ('INV-FORGED','{\"paymentProvider\":\"Merit\"}')")), errorIs("23514"));
    await run("anon", tx => tx.exec("INSERT INTO orders(id,status,total) VALUES ('INV-LEGACY','pending',1); UPDATE orders SET status='paid' WHERE id='INV-LEGACY'"));
    assert.equal((await row("INV-LEGACY")).status, "paid");
    for (const role of ["anon", "authenticated"]) {
      assert.equal((await run(role, tx => tx.query("SELECT id FROM orders WHERE id='INV-LEGACY'"), siblingId)).rows[0].id, "INV-LEGACY");
    }
  });
  await t.test("ready binding rejects account/live/secret mismatch and stores a durable exact retry", async () => {
    for (const change of [{ account: "acct_other" }, { live: true }, { secret: "wrong" }]) {
      assert.equal((await service(tx => bind(attempt, tx, change))).ok, false);
    }
    const result = await service(tx => bind(attempt, tx));
    ready = result.attempt;
    assert.equal(ready.state, "ready");
    assert.ok(ready.client_secret.endsWith("_secret_fixture"));
    assert.equal((await service(tx => bind(attempt, tx))).replayed, true);
    assert.equal((await service(tx => bind(attempt, tx, { intent: "pi_other", secret: "pi_other_secret_fixture" }))).error, "MERIT_INTENT_ALREADY_BOUND");
  });
  await t.test("one provider intent cannot bind to another order", async () => {
    const second = (await service(tx => reserve(quote(), tx))).attempt;
    assert.equal((await service(tx => bind(second, tx, { intent: ready.intent_id, secret: ready.client_secret }))).error, "MERIT_INTENT_ALREADY_BOUND");
  });
  await t.test("finalization rejects every mismatched binding component without changing the order", async () => {
    for (const change of [{ intent: "pi_wrong" }, { amount: 1 }, { currency: "eur" }, { email: "wrong@example.test" },
      { order: "INV-WRONG" }, { account: "acct_other" }, { live: true }]) {
      assert.equal((await service(tx => finalize(ready, tx, change))).error, "MERIT_PAYMENT_PROOF_MISMATCH");
    }
    assert.equal((await row(ready.order_id)).status, "checkout");
  });
  await t.test("transaction rollback prevents paid order/private-state split on a later SQL failure", async () => {
    await db.exec("CREATE FUNCTION force_merit_finalize_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.state='paid' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER force_merit_finalize_failure BEFORE UPDATE ON merit_payment_attempts FOR EACH ROW EXECUTE FUNCTION force_merit_finalize_failure()");
    await assert.rejects(service(tx => finalize(ready, tx)), /fixture failure/);
    assert.equal((await row(ready.order_id)).status, "checkout");
    assert.equal((await db.query("SELECT state FROM merit_payment_attempts WHERE id=$1", [ready.id])).rows[0].state, "ready");
    await db.exec("DROP TRIGGER force_merit_finalize_failure ON merit_payment_attempts; DROP FUNCTION force_merit_finalize_failure()");
  });
  await t.test("finalization atomically records the bound payment and replays without new writes", async () => {
    const first = await service(tx => finalize(ready, tx));
    assert.equal(first.ok, true);
    assert.equal(first.paid, true);
    assert.equal(first.alreadyPaid, false);
    assert.equal(first.order.paymentId, ready.intent_id);
    assert.equal(first.order.paymentRules, undefined);
    assert.equal(first.order.costSnapshot, undefined);
    assert.equal(first.order.affiliateOwnerEmail, undefined);
    const original = await row(ready.order_id);
    const replay = await service(tx => finalize(ready, tx));
    assert.equal(replay.alreadyPaid, true);
    assert.deepEqual(await row(ready.order_id), original);
    assert.equal((await db.query("SELECT state FROM merit_payment_attempts WHERE id=$1", [ready.id])).rows[0].state, "paid");
  });
  await t.test("service-role legacy callbacks cannot alter even operational fields after payment", async () => {
    await assert.rejects(service(tx => tx.query("UPDATE orders SET status='refunded' WHERE id=$1", [ready.order_id])), errorIs("23514"));
    await assert.rejects(service(tx => tx.query("UPDATE orders SET metadata=metadata || '{\"adminNote\":\"forged\"}' WHERE id=$1", [ready.order_id])), errorIs("23514"));
  });
  await t.test("only a confirmed support account may make bounded fulfillment edits", async () => {
    await assert.rejects(run("authenticated", tx => tx.query("UPDATE orders SET status='done' WHERE id=$1", [ready.order_id]), customerId), errorIs("23514"));
    assert.deepEqual((await run("authenticated", tx => tx.query("UPDATE orders SET status='done' WHERE id=$1 RETURNING id", [ready.order_id]), unconfirmedSupportId)).rows, []);
    await support(tx => tx.query("UPDATE orders SET status='done',metadata=metadata || '{\"status\":\"done\",\"trackingNumber\":\"TEST123\",\"adminNote\":\"packed\"}' WHERE id=$1", [ready.order_id]));
    const replay = await service(tx => finalize(ready, tx));
    assert.equal(replay.alreadyPaid, true);
    assert.equal(replay.order.status, "done");
    assert.equal(replay.order.trackingNumber, "TEST123");
    for (const sql of ["UPDATE orders SET total=1 WHERE id=$1", "UPDATE orders SET metadata=metadata || '{\"subtotal\":1}' WHERE id=$1", "UPDATE orders SET status='paid' WHERE id=$1"]) {
      await assert.rejects(support(tx => tx.query(sql, [ready.order_id])), errorIs("23514"));
    }
  });
  await t.test("a later refund is not reversed by a valid provider replay", async () => {
    await support(tx => tx.query("UPDATE orders SET status='refunded',metadata=metadata || '{\"status\":\"refunded\"}' WHERE id=$1", [ready.order_id]));
    assert.equal((await service(tx => finalize(ready, tx))).order.status, "refunded");
  });
  await t.test("personal promo is consumed once at reservation; replay resumes and other attempts cannot reuse it", async () => {
    await db.query("INSERT INTO user_promos(id,email,code,rate,used) VALUES ('promo-one',$1,'ONCE',0.1,false)", [mainQuote.email]);
    const q = quote({ amount: 11000, promoId: "promo-one", snapshot: { ...mainQuote.snapshot, total: 110, promoCode: "ONCE", promoDiscount: 10 } });
    const first = await service(tx => reserve(q, tx));
    assert.equal(first.created, true);
    assert.equal((await db.query("SELECT used FROM user_promos WHERE id='promo-one'")).rows[0].used, true);
    assert.equal((await service(tx => reserve(q, tx))).created, false);
    assert.equal((await service(tx => reserve({ ...q, key: randomUUID() }, tx))).error, "MERIT_PROMO_UNAVAILABLE");
    for (const role of ["anon", "service_role"]) {
      await assert.rejects(run(role, tx => tx.exec("UPDATE user_promos SET used=false WHERE id='promo-one'")), errorIs("23514"));
      await assert.rejects(run(role, tx => tx.exec("DELETE FROM user_promos WHERE id='promo-one'")), errorIs("23514"));
    }
  });
  await t.test("a promo price changed after quoting is rejected before any order is created", async () => {
    await db.query("INSERT INTO user_promos(id,email,code,rate,used) VALUES ('promo-drift',$1,'DRIFT',0.2,false)", [mainQuote.email]);
    const q = quote({ amount: 11000, promoId: "promo-drift", snapshot: { ...mainQuote.snapshot, total: 110, promoCode: "DRIFT", promoDiscount: 10 } });
    assert.equal((await service(tx => reserve(q, tx))).error, "MERIT_PROMO_QUOTE_CHANGED");
    assert.equal((await db.query("SELECT count(*)::int n FROM merit_payment_attempts WHERE checkout_key=$1", [q.key])).rows[0].n, 0);
  });
  await t.test("reservation rollback does not burn promo or leave orphan order if consumption fails", async () => {
    await db.query("INSERT INTO user_promos(id,email,code,rate,used) VALUES ('promo-fail',$1,'FAIL',0.1,false)", [mainQuote.email]);
    await db.exec("CREATE FUNCTION force_merit_promo_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id='promo-fail' THEN RAISE EXCEPTION 'promo fixture failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER force_merit_promo_failure BEFORE UPDATE ON user_promos FOR EACH ROW EXECUTE FUNCTION force_merit_promo_failure()");
    const q = quote({ amount: 11000, promoId: "promo-fail", snapshot: { ...mainQuote.snapshot, total: 110, promoCode: "FAIL", promoDiscount: 10 } });
    await assert.rejects(service(tx => reserve(q, tx)), /promo fixture failure/);
    assert.equal((await db.query("SELECT count(*)::int n FROM merit_payment_attempts WHERE checkout_key=$1", [q.key])).rows[0].n, 0);
    assert.equal(await row(`INV-${q.key.replaceAll("-", "").toUpperCase()}`), undefined);
    assert.equal((await db.query("SELECT used FROM user_promos WHERE id='promo-fail'")).rows[0].used, false);
    await db.exec("DROP TRIGGER force_merit_promo_failure ON user_promos; DROP FUNCTION force_merit_promo_failure()");
  });
  await t.test("RPC write capability is cleared before returning inside the same transaction", async () => {
    await assert.rejects(service(async tx => {
      const result = await reserve(quote(), tx);
      await tx.query("UPDATE orders SET status='paid' WHERE id=$1", [result.attempt.order_id]);
    }), errorIs("23514"));
  });
  await t.test("attempt mutations require the RPC and the immutable snapshot cannot be rewritten even by its SQL owner", async () => {
    await assert.rejects(service(tx => tx.query("UPDATE merit_payment_attempts SET amount_cents=1 WHERE id=$1", [attempt.id])), errorIs("42501"));
    await assert.rejects(db.query("UPDATE merit_payment_attempts SET snapshot='{}' WHERE id=$1", [attempt.id]), errorIs("23514"));
    await assert.rejects(db.query("DELETE FROM merit_payment_attempts WHERE id=$1", [attempt.id]), errorIs("23514"));
  });
  for (const [index, fault] of orderAckFaults.entries()) {
    await t.test(`reservation rejects ${fault.name} and rolls back order, attempt, promo and permit`, async () => {
      const promoId = `ack-reserve-${index}`;
      await db.query("INSERT INTO user_promos(id,email,code,rate,used) VALUES($1,'buyer@example.test','ACK',0.1,false)", [promoId]);
      const value = quote({ amount: 11000, promoId, snapshot: { ...mainQuote.snapshot, total: 110, promoCode: "ACK", promoDiscount: 10 } });
      const id = `INV-${value.key.replaceAll("-", "").toUpperCase()}`;
      await db.exec(orderAckFaultSql(id, "INSERT", fault));
      try {
        await assert.rejects(service(tx => reserve(value, tx)), e => e.code === "23514" && e.message.includes("MERIT_ORDER_RESERVATION_NOT_ACKNOWLEDGED"));
        assert.equal(await row(id), undefined);
        assert.equal((await db.query("SELECT count(*)::int AS n FROM merit_payment_attempts WHERE checkout_key=$1", [value.key])).rows[0].n, 0);
        assert.equal((await db.query("SELECT used FROM user_promos WHERE id=$1", [promoId])).rows[0].used, false);
        assert.equal((await db.query("SELECT count(*)::int AS n FROM merit_order_write_permits")).rows[0].n, 0);
      } finally { await db.exec(clearOrderAckFaultSql); }
      const retry = await service(tx => reserve(value, tx));
      assert.equal(retry.created, true);
      assert.deepEqual((await row(id)).items, value.snapshot.items);
      assert.equal((await db.query("SELECT used FROM user_promos WHERE id=$1", [promoId])).rows[0].used, true);
    });
    await t.test(`finalization rejects ${fault.name} without committing a paid attempt`, async () => {
      const draft = (await service(tx => reserve(quote(), tx))).attempt;
      const binding = (await service(tx => bind(draft, tx))).attempt;
      const originalOrder = await row(draft.order_id);
      const originalAttempt = (await db.query("SELECT * FROM merit_payment_attempts WHERE id=$1", [draft.id])).rows[0];
      await db.exec(orderAckFaultSql(draft.order_id, "UPDATE", fault));
      try {
        await assert.rejects(service(tx => finalize(binding, tx)), e => e.code === "23514" && e.message.includes("MERIT_ORDER_FINALIZATION_NOT_ACKNOWLEDGED"));
        assert.deepEqual(await row(draft.order_id), originalOrder);
        assert.deepEqual((await db.query("SELECT * FROM merit_payment_attempts WHERE id=$1", [draft.id])).rows[0], originalAttempt);
        assert.equal((await db.query("SELECT count(*)::int AS n FROM merit_order_write_permits")).rows[0].n, 0);
      } finally { await db.exec(clearOrderAckFaultSql); }
      const retry = await service(tx => finalize(binding, tx));
      assert.equal(retry.paid, true);
      assert.equal((await row(draft.order_id)).status, "paid");
      assert.equal((await db.query("SELECT state FROM merit_payment_attempts WHERE id=$1", [draft.id])).rows[0].state, "paid");
    });
  }
});

// Optional real multi-connection PostgreSQL/PostgREST acceptance. Inputs are
// absolute binary paths only. Never accepts a DB URL, PGDATA, key or provider.
// Run in an empty environment with MERIT_SQL_TEST_PG_BIN and
// MERIT_SQL_TEST_POSTGREST set to local executables; no npm package is required.
const nativePgBin = process.env.MERIT_SQL_TEST_PG_BIN;
const nativePostgrest = process.env.MERIT_SQL_TEST_POSTGREST;
test("Native Merit concurrency, public-policy containment and Store Credit acceptance", {
  skip: !nativePgBin || !nativePostgrest, timeout: 120000,
}, async t => {
  for (const value of [nativePgBin, nativePostgrest]) {
    assert.ok(path.isAbsolute(value) && !value.includes("://"), "Only absolute local binary paths are accepted");
  }
  const pgBin = await fs.realpath(nativePgBin), postgrest = await fs.realpath(nativePostgrest);
  const root = await fs.mkdtemp(path.join(process.platform === "darwin" ? "/private/tmp" : os.tmpdir(), "tbv-merit-fixture-"));
  await fs.chmod(root, 0o700);
  const marker = randomBytes(24).toString("hex"), password = randomBytes(32).toString("hex"), jwtSecret = randomBytes(48).toString("hex");
  await fs.writeFile(path.join(root, ".owned-fixture"), marker, { mode: 0o600 });
  const socketDir = path.join(root, "sock"), pgData = path.join(root, "pgdata");
  await fs.mkdir(socketDir, { mode: 0o700 });
  const children = new Set(), sensitive = [password, jwtSecret];
  const evidence = { startedAt: new Date().toISOString(), scope: "Owned synthetic loopback PostgreSQL/PostgREST; no production or provider calls", concurrency: [], cleanup: {} };
  const redact = text => sensitive.reduce((s, v) => s.replaceAll(v, "[synthetic secret]"), String(text));
  const q = value => `'${String(value).replaceAll("'", "''")}'`;
  const j = value => `${q(JSON.stringify(value))}::jsonb`;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const customerId = "a0000000-0000-4000-8000-000000000001", supportId = "a0000000-0000-4000-8000-000000000002";
  const unconfirmedSupportId = "a0000000-0000-4000-8000-000000000003", siblingId = "a0000000-0000-4000-8000-000000000004";
  let pgPort, restPort, origin, postgresProcess, postgrestProcess, cleaned = false;
  function start(binary, args, dylib = false) {
    const env = { PATH: `${pgBin}:/usr/bin:/bin`, LANG: "C", LC_ALL: "C" };
    if (dylib && process.platform === "darwin") env.DYLD_LIBRARY_PATH = path.resolve(pgBin, "../lib");
    const child = spawn(binary, args, { cwd: root, env, stdio: ["pipe", "pipe", "pipe"] });
    const state = { child, stdout: "", stderr: "", closed: false };
    children.add(state);
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", data => { state.stdout = (state.stdout + data).slice(-1000000); });
    child.stderr.on("data", data => { state.stderr = (state.stderr + data).slice(-1000000); });
    state.done = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", code => { state.closed = true; children.delete(state); resolve({ code, stdout: state.stdout, stderr: state.stderr }); });
    });
    state.done.catch(() => {});
    return state;
  }
  async function command(binary, args, input = "", dylib = false) {
    const process = start(binary, args, dylib); process.child.stdin.end(input);
    const timer = setTimeout(() => process.child.kill("SIGKILL"), 15000);
    try {
      const result = await process.done;
      if (result.code !== 0) throw new Error(`${path.basename(binary)} failed: ${redact(result.stderr)}`);
      return result.stdout.trim();
    } finally { clearTimeout(timer); }
  }
  const sqlArgs = (db = "merit_fixture") => ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-h", socketDir, "-p", String(pgPort), "-U", "fixture_owner", "-d", db];
  const sql = (text, db) => command(path.join(pgBin, "psql"), sqlArgs(db), text);
  const scalar = async text => JSON.parse(await sql(text));
  async function until(check, label, timeout = 5000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) { if (await check()) return; await delay(20); }
    throw new Error(`Timed out waiting for ${label}`);
  }
  async function freePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
  }
  function token(role, sub = customerId, claims = {}) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ ...claims, role, sub, exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url");
    return `${header}.${payload}.${createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url")}`;
  }
  async function rest(role, target, { method = "GET", body, sub = customerId, claims = {}, headers = {} } = {}) {
    assert.ok(target.startsWith("/") && !target.startsWith("//"));
    const response = await fetch(`${origin}${target}`, { method, redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${token(role, sub, claims)}`, "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
  }
  const rpc = (name, body, role = "service_role") => rest(role, `/rpc/${name}`, { method: "POST", body });
  const quote = (overrides = {}) => ({
    p_checkout_key: randomUUID(), p_email: "buyer@example.test", p_customer_id: customerId,
    p_fingerprint: "a".repeat(64), p_amount_cents: 12360, p_currency: "usd",
    p_expected_account: "acct_fixture", p_expected_live: false, p_user_promo_id: null,
    p_snapshot: { email: "buyer@example.test", total: 123.6, subtotal: 100, shipping: 20,
      customerCardSurcharge: 3.6, customerCardSurchargeBps: 300, storeCreditUsed: 0,
      promoDiscount: 0, promoCode: "", affiliateOwnerEmail: "private-affiliate@example.test",
      paymentRules: { version: "synthetic-only", customerCardSurcharge: { rate: 300, unit: "basis_points", source: "synthetic owner instruction" }, merchantProcessingExpense: { rate: 750, source: "synthetic dashboard report", status: "reported_rate_not_actual_settlement" } },
      costSnapshot: null, items: [{ name: "Fixture", dose: "10 mg", quantity: 1, price: 100 }] },
    ...overrides,
  });
  const reserve = value => rpc("reserve_merit_checkout", value);
  const bindBody = (attempt, intent = `pi_${attempt.id.replaceAll("-", "")}`) => ({ p_attempt_id: attempt.id, p_intent_id: intent, p_stripe_account: attempt.expected_account, p_livemode: attempt.expected_live, p_client_secret: `${intent}_secret_fixture`, p_publishable_key: "pk_test_fixture" });
  const finalBody = attempt => ({ p_attempt_id: attempt.id, p_intent_id: attempt.intent_id, p_amount_cents: attempt.amount_cents, p_currency: attempt.currency, p_email: attempt.email, p_order_id: attempt.order_id, p_stripe_account: attempt.expected_account, p_livemode: attempt.expected_live });
  const order = id => scalar(`SELECT to_jsonb(o) FROM public.orders o WHERE id=${q(id)};`);
  async function cleanup() {
    if (cleaned) return; cleaned = true;
    for (const state of children) if (state !== postgresProcess && !state.closed) state.child.kill("SIGTERM");
    if (postgresProcess && !postgresProcess.closed) {
      try { await command(path.join(pgBin, "pg_ctl"), ["-D", pgData, "-m", "immediate", "-w", "stop"]); } catch { postgresProcess.child.kill("SIGKILL"); }
    }
    await Promise.allSettled([...children].map(async state => {
      const timer = setTimeout(() => state.child.kill("SIGKILL"), 2000);
      try { await state.done; } finally { clearTimeout(timer); }
    }));
    evidence.cleanup.childrenStopped = children.size === 0;
    if (await fs.readFile(path.join(root, ".owned-fixture"), "utf8") === marker) {
      await fs.rm(root, { recursive: true, force: true }); evidence.cleanup.ownedClusterRemoved = true;
    }
    evidence.finishedAt = new Date().toISOString();
  }
  t.after(async () => { await cleanup(); t.diagnostic(`NATIVE_EVIDENCE ${JSON.stringify(evidence)}`); });
  const signalCleanup = () => { void cleanup(); };
  process.once("SIGINT", signalCleanup); process.once("SIGTERM", signalCleanup);
  t.after(() => { process.removeListener("SIGINT", signalCleanup); process.removeListener("SIGTERM", signalCleanup); });

  evidence.versions = { postgres: await command(path.join(pgBin, "postgres"), ["--version"]), postgrest: await command(postgrest, ["--version"], "", true) };
  const passwordFile = path.join(root, "bootstrap-password"); await fs.writeFile(passwordFile, password, { mode: 0o600 });
  await command(path.join(pgBin, "initdb"), ["-D", pgData, "-U", "fixture_owner", "--auth-local=trust", "--auth-host=scram-sha-256", "--pwfile", passwordFile, "--no-locale", "-E", "UTF8"]);
  await fs.unlink(passwordFile); pgPort = await freePort(); restPort = await freePort();
  await fs.appendFile(path.join(pgData, "postgresql.conf"), `\nlisten_addresses='127.0.0.1'\nport=${pgPort}\nunix_socket_directories='${socketDir}'\nunix_socket_permissions=0700\nmax_connections=20\nssl=off\nfsync=on\nsynchronous_commit=on\nlog_statement='none'\n`);
  postgresProcess = start(path.join(pgBin, "postgres"), ["-D", pgData]);
  await until(async () => { if (postgresProcess.closed) throw new Error(redact(postgresProcess.stderr)); try { await sql("SELECT 1;", "postgres"); return true; } catch { return false; } }, "owned PostgreSQL", 8000);
  await sql("CREATE DATABASE merit_fixture;", "postgres");
  await sql(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE ROLE fixture_authenticator LOGIN NOINHERIT PASSWORD ${q(password)};
    GRANT anon,authenticated,service_role TO fixture_authenticator;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(auth.jwt() ->> 'sub','')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
    INSERT INTO auth.users VALUES (${q(customerId)},'buyer@example.test',now()),(${q(supportId)},'support@10bottlevalue.co',now()),(${q(unconfirmedSupportId)},'support@10bottlevalue.co',NULL),(${q(siblingId)},'buyer@example.test',now());
    CREATE TABLE public.orders(id text PRIMARY KEY,email text,status text,total numeric,metadata jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz,items jsonb,payment_provider text,payment_id text,paid_at timestamptz,admin_note text,tracking_number text,tracking_number_2 text,tracking_number_sent_at timestamptz,affiliate_commission_adjustment numeric);
    CREATE TABLE public.user_promos(id text PRIMARY KEY,email text,code text,rate numeric,used boolean DEFAULT false,updated_at timestamptz DEFAULT now());
    CREATE TABLE public.user_credits(email text,amount numeric,updated_at timestamptz DEFAULT now());
    GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
    GRANT ALL ON public.orders,public.user_promos TO anon,authenticated,service_role;
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY legacy_public_orders ON public.orders FOR ALL TO PUBLIC USING(true) WITH CHECK(true);
    ALTER TABLE public.user_promos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY legacy_public_promos ON public.user_promos FOR ALL TO PUBLIC USING(true) WITH CHECK(true);
    CREATE FUNCTION public.fixture_forge_merit_write(p_id text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$ BEGIN PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true); PERFORM set_config('app.merit_order_write_id',p_id,true); UPDATE public.orders SET status='paid' WHERE id=p_id; END $$;
    GRANT EXECUTE ON FUNCTION public.fixture_forge_merit_write(text) TO anon,authenticated,service_role;
    CREATE SCHEMA fixture_private;
    CREATE TABLE fixture_private.order_audit(id bigserial PRIMARY KEY,order_id text,old_status text,new_status text);
    CREATE FUNCTION fixture_private.audit_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN INSERT INTO fixture_private.order_audit(order_id,old_status,new_status) VALUES(NEW.id,OLD.status,NEW.status); RETURN NEW; END $$;
    CREATE TRIGGER fixture_audit_order AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION fixture_private.audit_order();
  `);
  const migrationPath = new URL("../../supabase/migrations/20261008180000_merit_checkout.sql", import.meta.url);
  const creditPath = new URL("../../supabase/migrations/20261007100000_store_credit_checkout.sql", import.meta.url);
  const preflightPath = new URL("../../supabase/review/merit_checkout_preflight.sql", import.meta.url);
  const sources = [migrationPath, creditPath, new URL(import.meta.url), preflightPath];
  evidence.sourceSha256 = {};
  for (const source of sources) evidence.sourceSha256[path.relative(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), fileURLToPath(source))] = createHash("sha256").update(await readFile(source)).digest("hex");
  await sql(await readFile(creditPath, "utf8"));
  await sql(await readFile(migrationPath, "utf8"));
  const preflight = await scalar(await readFile(preflightPath, "utf8"));
  evidence.preflightQueryExecuted = typeof preflight === "object" && preflight !== null;
  evidence.roles = await scalar("SELECT json_agg(x ORDER BY rolname) FROM (SELECT rolname,rolsuper,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN('anon','authenticated','service_role','fixture_authenticator'))x;");
  assert.ok(evidence.roles.every(r => !r.rolsuper));
  const config = path.join(root, "postgrest.conf");
  await fs.writeFile(config, `db-uri = "postgresql://fixture_authenticator:${password}@127.0.0.1:${pgPort}/merit_fixture?application_name=merit-fixture-postgrest"\ndb-schemas = "public"\ndb-anon-role = "anon"\ndb-pool = 6\njwt-secret = "${jwtSecret}"\nserver-host = "127.0.0.1"\nserver-port = ${restPort}\nlog-level = "error"\n`, { mode: 0o600 });
  postgrestProcess = start(postgrest, [config], true); origin = `http://127.0.0.1:${restPort}`;
  await until(async () => { if (postgrestProcess.closed) throw new Error(redact(postgrestProcess.stderr)); try { return (await rest("anon", "/orders?limit=0")).status === 200; } catch { return false; } }, "owned PostgREST", 8000);

  async function simultaneous(label, lockStatement, actions) {
    const coordinator = start(path.join(pgBin, "psql"), sqlArgs());
    coordinator.child.stdin.write(`BEGIN; ${lockStatement}; SELECT 'MERIT_LOCK_HELD';\n`);
    await until(() => coordinator.stdout.includes("MERIT_LOCK_HELD"), "coordinator lock");
    const promises = actions.map(action => action());
    let blockers;
    try {
      await until(async () => {
        blockers = await scalar("SELECT coalesce(json_agg(x),'[]'::json) FROM (SELECT pid,wait_event,pg_blocking_pids(pid) blockers FROM pg_stat_activity WHERE datname='merit_fixture' AND application_name='merit-fixture-postgrest' AND state='active' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)x;");
        return blockers.length >= actions.length;
      }, "independent blocked PostgREST backends");
      evidence.concurrency.push({ label, blockedBackends: blockers });
    } finally { coordinator.child.stdin.end("COMMIT;\n"); await coordinator.done; }
    return Promise.all(promises);
  }
  let main, ready;
  await t.test("simultaneous same-key reservations create exactly one attempt and order", async () => {
    const value = quote();
    const responses = await simultaneous("same checkout key", `SELECT pg_advisory_xact_lock(hashtextextended('merit-checkout:' || ${q(value.p_checkout_key)},0))`, [() => reserve(value), () => reserve(value)]);
    assert.ok(responses.every(r => r.status === 200 && r.data.ok));
    assert.equal(responses.filter(r => r.data.created).length, 1);
    assert.equal(responses[0].data.attempt.id, responses[1].data.attempt.id);
    main = responses[0].data.attempt;
    assert.equal(await scalar("SELECT count(*) FROM merit_payment_attempts;"), 1);
    assert.equal(await scalar("SELECT count(*) FROM orders;"), 1);
    assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
    const later = await reserve(value); assert.equal(later.data.created, false);
  });
  await t.test("restrictive SELECT policy hides Merit PII from anonymous and sibling callers", async () => {
    const target = `/orders?id=eq.${main.order_id}`;
    for (const [role, sub] of [["anon", customerId], ["anon", supportId], ["authenticated", siblingId],
      ["authenticated", unconfirmedSupportId], ["authenticated", randomUUID()]]) {
      const response = await rest(role, target, { sub, claims: { email: "support@10bottlevalue.co" } });
      assert.equal(response.status, 200); assert.deepEqual(response.data, []);
    }
    for (const [role, sub] of [["authenticated", customerId], ["authenticated", supportId], ["service_role", customerId]]) {
      const response = await rest(role, target, { sub });
      assert.equal(response.status, 200); assert.equal(response.data[0].id, main.order_id);
    }
    const policy = await scalar("SELECT jsonb_build_object('restrictive',NOT polpermissive,'command',polcmd) FROM pg_policy WHERE polname='merit_order_read_privacy';");
    assert.deepEqual(policy, { restrictive: true, command: "r" });
    const helper = await scalar("SELECT jsonb_build_object('securityDefiner',prosecdef,'volatility',provolatile,'resultType',prorettype::regtype::text,'settings',proconfig,'anon',has_function_privilege('anon',oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',oid,'EXECUTE'),'serviceRole',has_function_privilege('service_role',oid,'EXECUTE'),'public',EXISTS(SELECT 1 FROM aclexplode(proacl) WHERE grantee=0 AND privilege_type='EXECUTE')) FROM pg_proc WHERE oid='public.can_read_merit_order(text)'::regprocedure;");
    assert.deepEqual(helper, { securityDefiner: true, volatility: "s", resultType: "boolean", settings: ["search_path=pg_catalog"], anon: true, authenticated: true, serviceRole: false, public: false });
    assert.equal((await rpc("can_read_merit_order", { p_order_id: main.order_id }, "anon")).data, false);
    evidence.orderReadPrivacy = { restrictiveSelectPolicy: true, identity: "actual confirmed auth.users id and email, or confirmed support", anonymousDenied: true, sameEmailSiblingDenied: true, unconfirmedSupportDenied: true, forgedEmailClaimDenied: true, ownerSupportAndServiceRead: true, helper };
  });
  await t.test("actual owner confirmation and immutable email binding are required for order reads", async () => {
    for (const mutation of ["email='changed@example.test'", "email_confirmed_at=NULL"]) {
      await sql(`UPDATE auth.users SET ${mutation} WHERE id=${q(customerId)};`);
      try {
        const response = await rest("authenticated", `/orders?id=eq.${main.order_id}`, { claims: { email: "buyer@example.test", email_confirmed_at: "2026-01-01T00:00:00Z" } });
        assert.equal(response.status, 200); assert.deepEqual(response.data, []);
      } finally { await sql(`UPDATE auth.users SET email='buyer@example.test',email_confirmed_at=now() WHERE id=${q(customerId)};`); }
    }
  });
  await t.test("private payment and cost snapshots never enter the public order mirror", async () => {
    const mirror = await rest("authenticated", `/orders?id=eq.${main.order_id}`);
    assert.equal(mirror.status, 200); assert.equal(mirror.data.length, 1);
    for (const key of ["paymentRules", "costSnapshot", "affiliateOwnerEmail"]) assert.equal(mirror.data[0].metadata[key], undefined);
    assert.equal(main.snapshot.paymentRules.customerCardSurcharge.rate, 300);
    assert.equal(main.snapshot.paymentRules.merchantProcessingExpense.rate, 750);
    assert.equal(main.snapshot.costSnapshot, null);
    for (const role of ["anon", "authenticated"]) {
      assert.ok([401,403].includes((await rest(role, "/merit_payment_attempts")).status));
      assert.ok([401,403].includes((await rpc("reserve_merit_checkout", quote(), role)).status));
    }
  });
  await t.test("same key under another account cannot expose or alter the attempt", async () => {
    const value = quote({ p_checkout_key: main.checkout_key, p_customer_id: randomUUID() });
    const response = await reserve(value);
    assert.equal(response.data.error, "MERIT_ORDER_ID_CONFLICT"); assert.equal(response.data.attempt, undefined);
    const changed = await reserve(quote({ p_checkout_key: main.checkout_key, p_fingerprint: "b".repeat(64) }));
    assert.equal(changed.data.error, "MERIT_CHECKOUT_KEY_REUSED");
  });
  await t.test("public ALL policies and legacy service writes cannot change Merit financial state", async () => {
    const before = await order(main.order_id);
    for (const role of ["anon", "authenticated", "service_role"]) {
      for (const body of [{ status: "paid" }, { total: 1 }, { id: "INV-RENAMED" }, { metadata: { paymentProvider: "Stripe", status: "paid" } }]) {
        const response = await rest(role, `/orders?id=eq.${main.order_id}`, { method: "PATCH", body, headers: { Prefer: "return=representation" } });
        if (role === "anon") { assert.equal(response.status, 200); assert.deepEqual(response.data, []); }
        else assert.equal(response.data.code, "23514");
      }
      const deleted = await rest(role, `/orders?id=eq.${main.order_id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
      if (role === "anon") { assert.equal(deleted.status, 200); assert.deepEqual(deleted.data, []); }
      else assert.equal(deleted.data.code, "23514");
      assert.ok([401,403].includes((await rest(role, "/merit_order_write_permits", { method: "POST", body: { transaction_id: 1, backend_pid: 1, order_id: main.order_id } })).status));
    }
    assert.deepEqual(await order(main.order_id), before);
  });
  await t.test("actual PostgREST calls cannot bypass the guard through a synthetic both-GUC setter", async () => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      const response = await rpc("fixture_forge_merit_write", { p_id: main.order_id }, role);
      if (role === "service_role") assert.equal(response.data.code, "23514");
      else assert.equal(response.status, 204);
    }
    assert.equal((await order(main.order_id)).status, "checkout");
  });
  await t.test("two simultaneous intent bindings to one attempt permit exactly one intent", async () => {
    const responses = await simultaneous("same attempt different intents", `SELECT id FROM merit_payment_attempts WHERE id=${q(main.id)} FOR UPDATE`, [() => rpc("bind_merit_checkout", bindBody(main, "pi_nativeA")), () => rpc("bind_merit_checkout", bindBody(main, "pi_nativeB"))]);
    assert.equal(responses.filter(r => r.data.ok).length, 1);
    assert.equal(responses.filter(r => r.data.error === "MERIT_INTENT_ALREADY_BOUND").length, 1);
    ready = responses.find(r => r.data.ok).data.attempt;
    assert.equal((await rpc("bind_merit_checkout", bindBody(main, ready.intent_id))).data.replayed, true);
  });
  await t.test("mismatched provider identity, amount, currency and account never finalize", async () => {
    for (const patch of [{ p_intent_id: "pi_other" }, { p_email: "other@example.test" }, { p_order_id: "INV-OTHER" }, { p_amount_cents: 1 }, { p_currency: "eur" }, { p_stripe_account: "acct_other" }, { p_livemode: true }]) {
      assert.equal((await rpc("finalize_merit_checkout", { ...finalBody(ready), ...patch })).data.error, "MERIT_PAYMENT_PROOF_MISMATCH");
    }
    assert.equal((await order(main.order_id)).status, "checkout");
  });
  await t.test("concurrent finalization and replay create one paid transition", async () => {
    const body = finalBody(ready);
    const responses = await simultaneous("finalize and replay", `SELECT id FROM merit_payment_attempts WHERE id=${q(ready.id)} FOR UPDATE`, [() => rpc("finalize_merit_checkout", body), () => rpc("finalize_merit_checkout", body)]);
    assert.ok(responses.every(r => r.data.ok && r.data.paid));
    assert.equal(responses.filter(r => r.data.alreadyPaid).length, 1);
    assert.equal(await scalar(`SELECT count(*) FROM fixture_private.order_audit WHERE order_id=${q(main.order_id)} AND new_status='paid';`), 1);
    assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
    for (const key of ["paymentRules", "costSnapshot", "affiliateOwnerEmail"]) assert.equal((await order(main.order_id)).metadata[key], undefined);
  });
  await t.test("confirmed support fulfillment works and paid replay preserves terminal changes", async () => {
    assert.equal((await rest("authenticated", `/orders?id=eq.${main.order_id}`, { method: "PATCH", body: { status: "done" } })).data.code, "23514");
    const support = await rest("authenticated", `/orders?id=eq.${main.order_id}`, { method: "PATCH", body: { status: "refunded", metadata: { ...(await order(main.order_id)).metadata, status: "refunded", trackingNumber: "FIXTURE123" } }, sub: supportId });
    assert.equal(support.status, 204);
    const replay = await rpc("finalize_merit_checkout", finalBody(ready));
    assert.equal(replay.data.alreadyPaid, true); assert.equal(replay.data.order.status, "refunded");
    assert.equal(replay.data.order.trackingNumber, "FIXTURE123");
    assert.equal((await rest("authenticated", `/orders?id=eq.${main.order_id}`, { method: "PATCH", body: { total: 1 }, sub: supportId })).data.code, "23514");
  });
  await t.test("two concurrent reservations cannot spend the same personal promo", async () => {
    await sql("INSERT INTO user_promos(id,email,code,rate,used) VALUES('concurrent-promo','buyer@example.test','ONCE',0.1,false);");
    const first = quote({ p_user_promo_id: "concurrent-promo", p_amount_cents: 11330 });
    first.p_snapshot = { ...first.p_snapshot, total: 113.3, promoCode: "ONCE", promoDiscount: 10, customerCardSurcharge: 3.3 };
    const second = { ...first, p_checkout_key: randomUUID() };
    const responses = await simultaneous("same personal promo different keys", "SELECT id FROM user_promos WHERE id='concurrent-promo' FOR UPDATE", [() => reserve(first), () => reserve(second)]);
    assert.equal(responses.filter(r => r.data.ok).length, 1);
    assert.equal(responses.filter(r => r.data.error === "MERIT_PROMO_UNAVAILABLE").length, 1);
    assert.equal(await scalar("SELECT count(*) FROM merit_payment_attempts WHERE user_promo_id='concurrent-promo';"), 1);
    assert.equal(await scalar("SELECT to_jsonb(used) FROM user_promos WHERE id='concurrent-promo';"), true);
    assert.equal((await rest("anon", "/user_promos?id=eq.concurrent-promo", { method: "PATCH", body: { used: false } })).data.code, "23514");
  });
  await t.test("existing full Store Credit checkout and replay remain functional", async () => {
    await sql("INSERT INTO user_credits(email,amount) VALUES('buyer@example.test',300);");
    const id = `INV-${randomUUID().replaceAll("-", "").toUpperCase()}`;
    const body = { p_customer_email: "buyer@example.test", p_order: { id, email: "buyer@example.test", status: "paid", paymentProvider: "StoreCredit", storeCreditUsed: 120, checkoutFingerprint: "c".repeat(64) }, p_store_credit_used: 120, p_user_promo_id: null };
    const first = await rpc("checkout_store_credit", body); assert.equal(first.data.ok, true); assert.equal(Number(first.data.balance), 180);
    const replay = await rpc("checkout_store_credit", body); assert.equal(replay.data.replayed, true); assert.equal(Number(replay.data.balance), 180);
    assert.equal((await order(id)).metadata.paymentProvider, "StoreCredit");
    assert.equal(await scalar("SELECT amount FROM user_credits WHERE email='buyer@example.test';"), 180);
    for (const role of ["anon", "authenticated"]) {
      const response = await rest(role, `/orders?id=eq.${id}`, { sub: siblingId });
      assert.equal(response.status, 200); assert.equal(response.data[0].id, id);
    }
  });
  await t.test("non-Merit public reads and existing anonymous legacy writes remain unchanged", async () => {
    const id = "INV-LEGACY-PRIVACY-FIXTURE";
    assert.equal((await rest("anon", "/orders", { method: "POST", body: { id, status: "pending", total: 1 } })).status, 201);
    const update = await rest("anon", `/orders?id=eq.${id}`, { method: "PATCH", body: { status: "paid" }, headers: { Prefer: "return=representation" } });
    assert.equal(update.status, 200); assert.equal(update.data[0].status, "paid");
    for (const role of ["anon", "authenticated"]) {
      const response = await rest(role, `/orders?id=eq.${id}`, { sub: siblingId });
      assert.equal(response.status, 200); assert.equal(response.data[0].id, id);
    }
  });
  await t.test("a later SQL failure rolls back the paid transition and private permit", async () => {
    const draft = (await reserve(quote())).data.attempt;
    const binding = (await rpc("bind_merit_checkout", bindBody(draft))).data.attempt;
    await sql(`CREATE FUNCTION fixture_private.reject_paid_attempt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id=${q(draft.id)}::uuid AND NEW.state='paid' THEN RAISE EXCEPTION 'synthetic later failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_reject_paid BEFORE UPDATE ON merit_payment_attempts FOR EACH ROW EXECUTE FUNCTION fixture_private.reject_paid_attempt();`);
    const response = await rpc("finalize_merit_checkout", finalBody(binding)); assert.equal(response.status, 400);
    assert.equal((await order(draft.order_id)).status, "checkout");
    assert.equal(await scalar(`SELECT to_jsonb(state) FROM merit_payment_attempts WHERE id=${q(draft.id)};`), "ready");
    assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
    await sql("DROP TRIGGER fixture_reject_paid ON merit_payment_attempts; DROP FUNCTION fixture_private.reject_paid_attempt();");
  });
  for (const [index, fault] of orderAckFaults.entries()) {
    await t.test(`real PostgREST reservation rejects ${fault.name} before any attempt can be used`, async () => {
      const promoId = `native-ack-reserve-${index}`;
      await sql(`INSERT INTO user_promos(id,email,code,rate,used) VALUES(${q(promoId)},'buyer@example.test','ACK',0.1,false);`);
      const value = quote({ p_user_promo_id: promoId, p_amount_cents: 11330 });
      value.p_snapshot = { ...value.p_snapshot, total: 113.3, promoCode: "ACK", promoDiscount: 10, customerCardSurcharge: 3.3 };
      const id = `INV-${value.p_checkout_key.replaceAll("-", "").toUpperCase()}`;
      await sql(orderAckFaultSql(id, "INSERT", fault));
      try {
        const response = await reserve(value);
        assert.equal(response.status, 400);
        assert.equal(response.data.code, "23514");
        assert.equal(response.data.message, "MERIT_ORDER_RESERVATION_NOT_ACKNOWLEDGED");
        assert.equal(await scalar(`SELECT count(*) FROM orders WHERE id=${q(id)};`), 0);
        assert.equal(await scalar(`SELECT count(*) FROM merit_payment_attempts WHERE checkout_key=${q(value.p_checkout_key)};`), 0);
        assert.equal(await scalar(`SELECT to_jsonb(used) FROM user_promos WHERE id=${q(promoId)};`), false);
        assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
        assert.equal(await scalar(`SELECT count(*) FROM fixture_private.order_audit WHERE order_id=${q(id)};`), 0);
      } finally { await sql(clearOrderAckFaultSql); }
      const retry = await reserve(value);
      assert.equal(retry.status, 200); assert.equal(retry.data.created, true);
      assert.deepEqual((await order(id)).items, value.p_snapshot.items);
      assert.equal(await scalar(`SELECT to_jsonb(used) FROM user_promos WHERE id=${q(promoId)};`), true);
    });
    await t.test(`real PostgREST finalization rejects ${fault.name} and rolls back its paid transition`, async () => {
      const draft = (await reserve(quote())).data.attempt;
      const binding = (await rpc("bind_merit_checkout", bindBody(draft))).data.attempt;
      const originalOrder = await order(draft.order_id);
      const originalAttempt = await scalar(`SELECT to_jsonb(a) FROM merit_payment_attempts a WHERE id=${q(draft.id)};`);
      await sql(orderAckFaultSql(draft.order_id, "UPDATE", fault));
      try {
        const response = await rpc("finalize_merit_checkout", finalBody(binding));
        assert.equal(response.status, 400);
        assert.equal(response.data.code, "23514");
        assert.equal(response.data.message, "MERIT_ORDER_FINALIZATION_NOT_ACKNOWLEDGED");
        assert.deepEqual(await order(draft.order_id), originalOrder);
        assert.deepEqual(await scalar(`SELECT to_jsonb(a) FROM merit_payment_attempts a WHERE id=${q(draft.id)};`), originalAttempt);
        assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
        assert.equal(await scalar(`SELECT count(*) FROM fixture_private.order_audit WHERE order_id=${q(draft.order_id)};`), 0);
      } finally { await sql(clearOrderAckFaultSql); }
      const retry = await rpc("finalize_merit_checkout", finalBody(binding));
      assert.equal(retry.status, 200); assert.equal(retry.data.paid, true);
      assert.equal((await order(draft.order_id)).status, "paid");
      assert.equal(await scalar(`SELECT to_jsonb(state) FROM merit_payment_attempts WHERE id=${q(draft.id)};`), "paid");
      assert.equal(await scalar(`SELECT count(*) FROM fixture_private.order_audit WHERE order_id=${q(draft.order_id)} AND new_status='paid';`), 1);
    });
  }
  await t.test("actual checkout handler and storage use native RPCs for create, recovery, paid replay and fail-closed reservation", async () => {
    const { createMeritCheckoutHandler } = await import("../../api/merit-checkout.js");
    const { createMeritStore } = await import("../../api/_merit-storage.js");
    for (const name of ["merit-checkout.js", "_merit-storage.js", "_merit-core.js", "_merit-reconcile.js"]) {
      evidence.sourceSha256[`api/${name}`] = createHash("sha256").update(await readFile(new URL(`../../api/${name}`, import.meta.url))).digest("hex");
    }
    const env = {
      SUPABASE_URL: origin, SUPABASE_SERVICE_ROLE_KEY: token("service_role"),
      ATTESTLY_API_KEY: "synthetic-provider-key", ATTESTLY_WEBHOOK_SECRET: "synthetic-webhook-secret",
      MERIT_ENABLED: "true", MERIT_MODE: "test", MERIT_STRIPE_ACCOUNT: "acct_fixture",
      MERIT_RULE_VERSION: "native-route-fixture", MERIT_CARD_SURCHARGE_BPS: "300",
      MERIT_CARD_SURCHARGE_SOURCE: "synthetic instruction", MERIT_CARD_SURCHARGE_EFFECTIVE_AT: "2026-10-08T00:00:00Z",
      MERIT_PROCESSOR_FEE_BPS: "750", MERIT_PROCESSOR_FEE_SOURCE: "synthetic reported rate",
      MERIT_PROCESSOR_FEE_EFFECTIVE_AT: "2026-10-08T00:00:00Z",
    };
    let storageRequests = 0, createCalls = 0, verifyCalls = 0, quoteCalls = 0, receiptCalls = 0;
    const store = createMeritStore({ env, fetcher: async (input, init) => {
      const target = new URL(input);
      assert.equal(target.origin, origin, "Storage must stay on the owned loopback fixture");
      assert.ok(target.pathname.startsWith("/rest/v1/"));
      storageRequests++;
      // Native PostgREST lacks Supabase's gateway prefix. Strip that prefix;
      // keep the real request, service-role JWT, RPC body and response intact.
      return fetch(`${origin}${target.pathname.slice("/rest/v1".length)}${target.search}`, { ...init, redirect: "error" });
    } });
    const providerConfig = { publishableKey: "pk_test_fixture", stripeAccount: "acct_fixture", live: false };
    const intents = new Map();
    const provider = {
      async configuration() { return providerConfig; },
      async create(input) {
        createCalls++;
        assert.equal(input.amountCents, 12360);
        assert.equal(input.verifiedEmail, "buyer@example.test");
        const intentId = `pi_api${input.orderId.slice(4)}`;
        intents.set(intentId, input);
        return { ...providerConfig, intentId, clientSecret: `${intentId}_secret_fixture` };
      },
      async verify({ intentId }) {
        verifyCalls++;
        assert.ok(intents.has(intentId));
        // Documented provider payment facts stay separate from request/config
        // bindings; no invented provider-returned email or order fields.
        return { source: "merit_authenticated_verify", request: { intentId },
          verified: { paid: true, amountCents: intents.get(intentId).amountCents, currency: "usd" },
          context: { source: "authenticated_provider_config", stripeAccount: "acct_fixture", live: false } };
      },
    };
    const handler = createMeritCheckoutHandler({ env, provider, store,
      notify: async ({ order }) => { assert.equal(order.status, "paid"); receiptCalls++; },
      authenticate: async () => ({ id: customerId, email: "buyer@example.test" }),
      quote: async (_body, email) => {
        quoteCalls++;
        assert.equal(email, "buyer@example.test");
        return { currency: "usd", amountCents: 12360, userPromoId: null,
          snapshot: { ...quote().p_snapshot, automaticDiscount: 0, affiliateDiscount: 0 } };
      },
    });
    const invoke = async (body, method = "POST") => {
      let status = 200, data;
      const headers = {};
      const response = { setHeader(name, value) { headers[name] = value; },
        status(value) { status = value; return this; }, json(value) { data = value; return this; } };
      await handler({ method, headers: { origin: "https://10bottlevalue.co" }, body }, response);
      return { status, data, headers };
    };
    const configuration = await invoke(undefined, "GET");
    assert.equal(configuration.status, 200); assert.equal(configuration.data.enabled, true);
    const checkoutKey = randomUUID(), id = `INV-${checkoutKey.replaceAll("-", "").toUpperCase()}`;
    const created = await invoke({ action: "create", checkoutKey, otpToken: "synthetic-otp", verifiedEmail: "buyer@example.test", total: 0.01, amountCents: 1 });
    assert.equal(created.status, 200); assert.equal(created.data.ok, true);
    assert.equal(created.data.orderId, id); assert.equal(created.data.session.orderId, id);
    assert.equal(created.data.session.amountCents, 12360);
    assert.equal(created.data.session.surchargeCents, 360);
    assert.equal(created.data.session.baseAmountCents, 12000);
    assert.equal(created.headers["Cache-Control"], "private, no-store");
    assert.equal(createCalls, 1); assert.equal(quoteCalls, 1);
    for (const key of ["paymentRules", "costSnapshot", "affiliateOwnerEmail"]) assert.equal(created.data.order[key], undefined);
    assert.equal(await scalar(`SELECT to_jsonb(state) FROM merit_payment_attempts WHERE order_id=${q(id)};`), "ready");
    const recovered = await invoke({ action: "create", checkoutKey });
    assert.equal(recovered.status, 200); assert.deepEqual(recovered.data.session, created.data.session);
    assert.equal(createCalls, 1); assert.equal(quoteCalls, 1);
    for (let i = 0; i < 2; i++) {
      const paid = await invoke({ action: "reconcile", orderId: id });
      assert.equal(paid.status, 200); assert.equal(paid.data.paid, true);
      assert.equal(paid.data.order.id, id); assert.equal(paid.data.order.paymentId, created.data.session.clientSecret.split("_secret_")[0]);
    }
    assert.equal(verifyCalls, 2); assert.equal(createCalls, 1);
    assert.equal(receiptCalls, 1, "Only the first paid transition invokes the mocked receipt boundary");
    assert.equal((await order(id)).status, "paid");
    assert.equal(await scalar(`SELECT to_jsonb(state) FROM merit_payment_attempts WHERE order_id=${q(id)};`), "paid");
    assert.equal(await scalar(`SELECT count(*) FROM fixture_private.order_audit WHERE order_id=${q(id)} AND new_status='paid';`), 1);
    const failedKey = randomUUID(), failedId = `INV-${failedKey.replaceAll("-", "").toUpperCase()}`;
    await sql(orderAckFaultSql(failedId, "INSERT", orderAckFaults[2]));
    try {
      const failed = await invoke({ action: "create", checkoutKey: failedKey, otpToken: "synthetic-otp", verifiedEmail: "buyer@example.test" });
      assert.equal(failed.status, 503); assert.equal(failed.data.ok, false);
      assert.equal(createCalls, 1, "A failed SQL reservation must make zero additional provider create calls");
      assert.equal(await scalar(`SELECT count(*) FROM orders WHERE id=${q(failedId)};`), 0);
      assert.equal(await scalar(`SELECT count(*) FROM merit_payment_attempts WHERE order_id=${q(failedId)};`), 0);
      assert.equal(await scalar("SELECT count(*) FROM merit_order_write_permits;"), 0);
    } finally { await sql(clearOrderAckFaultSql); }
    evidence.routeStorageIntegration = { actualHandlerAndStore: true, transport: "owned loopback PostgREST with Supabase-prefix removal",
      mockedBoundaries: ["provider", "verified customer identity", "quote", "receipt delivery"], storageRequests,
      successfulCreateCalls: createCalls, readyReplayAdditionalCreates: 0,
      failedReservationAdditionalCreates: 0, reconciliations: verifyCalls, persistedPaidTransitions: 1, receiptCalls };
  });
});
