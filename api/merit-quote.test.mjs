import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMeritQuote, meritCreditSnapshot, MeritQuoteError } from "./_merit-quote.js";

const EMAIL = "buyer@example.org";
const fixture = overrides => ({
  orderId: "INV-0123456789ABCDEF0123456789ABCDEF",
  items: [{ name: "BPC-157", dose: "10 mg", quantity: 1, price: 0.01 }],
  checkoutForm: {
    firstName: "Alex", lastName: "Example", country: "United States",
    address: "10 Example Street", address2: "", city: "Boston", state: "MA",
    postalCode: "02108", phone: "+1 212 555 1212", taxId: "",
  },
  shippingType: "standard", promoCode: "", affiliateCode: "", storeCreditUsed: 0,
  purchaserAttestation: {
    over21AndResearchUseOnly: true, qualifiedResearcherOrLicensedProfessional: true,
    noHumanOrAnimalUse: true, policiesAccepted: true,
  },
  ...overrides,
});
const noNetwork = { fetcher: async () => { throw new Error("Unexpected network request"); } };
const quote = (body = fixture(), email = EMAIL, options = noNetwork) => buildMeritQuote(body, email, options);
const withForm = overrides => { const body = fixture(); Object.assign(body.checkoutForm, overrides); return body; };
const withQuantity = quantity => fixture({ items: [{ name: "BPC-157", dose: "10 mg", quantity }] });
const isError = (status, code) => error => error instanceof MeritQuoteError && error.status === status && (!code || error.code === code);

function service(respond) {
  const calls = [];
  return {
    calls,
    options: {
      supabaseUrl: "https://private-supabase.test", serviceRoleKey: "test-server-service-key",
      fetcher: async (url, init) => {
        const parsed = new URL(url);
        calls.push({ url: parsed, init });
        assert.equal(parsed.origin, "https://private-supabase.test");
        assert.equal(init.method, "GET");
        assert.equal(init.body, undefined);
        assert.equal(init.headers.Authorization, "Bearer test-server-service-key");
        assert.equal(init.headers.apikey, "test-server-service-key");
        assert.ok(init.signal instanceof AbortSignal);
        const result = await respond(parsed, init);
        return result instanceof Response ? result : new Response(JSON.stringify(result), { status: 200 });
      },
    },
  };
}
test("quotes canonical USD cents and strips all client financial/payment authority", async () => {
  const body = fixture({ total: 0.01, shipping: 0, promoDiscount: 9999, affiliateDiscount: 9999,
    cryptoDiscount: 9999, paymentMethod: "crypto", surchargeBps: 750, merchantFee: 0.075,
    otpToken: "never-persist", metadata: { status: "paid", paymentId: "forged" } });
  const before = structuredClone(body);
  const result = await quote(body, " BUYER@EXAMPLE.ORG ");
  assert.equal(result.currency, "usd");
  assert.equal(result.subtotalCents, 13900);
  assert.equal(result.shippingCents, 3999);
  assert.equal(result.amountCents, 17899);
  assert.equal(result.surchargeCents, 0);
  assert.equal(result.snapshot.total, 178.99);
  assert.equal(result.snapshot.items[0].price, 139);
  assert.equal(result.snapshot.cryptoDiscount, 0);
  assert.equal(result.snapshot.email, EMAIL);
  assert.equal(result.userPromoId, null);
  assert.deepEqual(body, before);
  assert.doesNotMatch(JSON.stringify(result), /never-persist|forged|merchantFee|"status"|"paymentId"/);
});

test("only explicit private surcharge configuration can change the card total", async () => {
  const result = await quote(fixture(), EMAIL, { ...noNetwork, surchargeBps: 295 });
  assert.equal(result.preSurchargeTotalCents, 17899);
  assert.equal(result.surchargeCents, 528);
  assert.equal(result.amountCents, 18427);
  assert.equal(result.snapshot.customerCardSurcharge, 5.28);
  assert.equal(result.snapshot.customerCardSurchargeBps, 295);
  assert.equal(result.snapshot.storeCreditUsed, 0);
  for (const surchargeBps of [-1, 1.5, "295", 10001, NaN]) {
    await assert.rejects(quote(fixture(), EMAIL, { ...noNetwork, surchargeBps }), isError(503));
  }
});

test("standard and express shipping use the existing worldwide subtotal tiers", async () => {
  assert.equal((await quote(fixture({ items: [{ name: "BPC-157", dose: "5 mg", quantity: 1 }] }))).amountCents, 13899);
  assert.equal((await quote(withQuantity(2))).shippingCents, 3999);
  assert.equal((await quote(withQuantity(3))).shippingCents, 0);
  assert.equal((await quote({ ...withQuantity(1), shippingType: "express" })).shippingCents, 9999);
  assert.equal((await quote({ ...withQuantity(3), shippingType: "express" })).shippingCents, 1999);
  assert.equal((await quote({ ...withQuantity(4), shippingType: "express" })).shippingCents, 0);
});

test("US inventory prices, free all-US shipping and mixed warehouse shipping remain separate", async () => {
  const us = { name: "BPC-157", dose: "10 mg", quantity: 1, fromWarehouse: "us", price: 0.01 };
  const allUs = await quote(fixture({ items: [us], shippingType: "us-warehouse" }));
  assert.equal(allUs.amountCents, 17900);
  assert.equal(allUs.shippingCents, 0);
  assert.equal(allUs.snapshot.items[0].fromWarehouse, "us");
  const mixed = await quote(fixture({ items: [us, ...fixture().items] }));
  assert.equal(mixed.subtotalCents, 31800);
  assert.equal(mixed.shippingCents, 3999);
  assert.equal(mixed.amountCents, 35799);
  await assert.rejects(quote(fixture({ items: [us, ...fixture().items], shippingType: "us-warehouse" })), isError(400));
  const international = fixture({ items: [us] });
  international.checkoutForm.country = "Canada";
  await assert.rejects(quote(international), isError(400));
});

test("US-only SKU cannot become worldwide by omitting or forging its warehouse", async () => {
  for (const country of ["Canada", "United States"]) {
    for (const fromWarehouse of [undefined, "", false, "worldwide", "regular"]) {
      const body = fixture({ items: [{ name: "DSIP", dose: "10 mg", quantity: 1, fromWarehouse }] });
      body.checkoutForm.country = country;
      await assert.rejects(quote(body), isError(400));
    }
  }
  const actualUs = fixture({ items: [{ name: "DSIP", dose: "10mg", quantity: 1, fromWarehouse: "us" }], shippingType: "us-warehouse" });
  const result = await quote(actualUs);
  assert.equal(result.amountCents, 17500);
  assert.equal(result.shippingCents, 0);
  assert.equal(result.snapshot.items[0].fromWarehouse, "us");
  actualUs.checkoutForm.country = "Canada";
  await assert.rejects(quote(actualUs), isError(400));
});

test("quote validation retains explicit pack and warehouse selectors without changing ten-vial fingerprints", async () => {
  const original = await quote();
  const explicitTen = await quote(fixture({ items: [{ ...fixture().items[0], vials: 10 }] }));
  assert.deepEqual(explicitTen.snapshot, original.snapshot);
  assert.equal(explicitTen.quoteFingerprint, original.quoteFingerprint);
  for (const vials of [1, 5, null, false, "10", 0, -1, 1.5]) {
    await assert.rejects(quote(fixture({ items: [{ ...fixture().items[0], vials }] })), isError(400));
  }
  for (const fromWarehouse of [false, 0, null, "worldwide", "backup"]) {
    await assert.rejects(quote(fixture({ items: [{ ...fixture().items[0], fromWarehouse }] })), isError(400));
  }
});

test("retains existing destination, contact and attestation validation", async () => {
  const canada = withForm({ country: "Canada" });
  assert.equal((await quote(canada)).amountCents, 17899);
  await assert.rejects(quote({ ...canada, shippingType: "express" }), isError(400));
  await assert.rejects(quote(withForm({ country: "Mexico" })), isError(400));
  assert.equal((await quote(withForm({ country: "Mexico", taxId: "123456789012" }))).amountCents, 17899);
  for (const form of [{ firstName: "" }, { address: "x".repeat(251) }, { phone: "1111111111" }, { postalCode: "" }]) {
    await assert.rejects(quote(withForm(form)), isError(400));
  }
  for (const field of Object.keys(fixture().purchaserAttestation)) {
    const body = fixture();
    body.purchaserAttestation[field] = "true";
    await assert.rejects(quote(body), isError(400));
  }
});

test("identity and explicit credit selection are required before discount lookups", async () => {
  for (const email of ["", "not-an-email", null]) await assert.rejects(quote(fixture(), email), isError(403));
  await assert.rejects(quote(fixture({ email: "other@example.org" })), isError(403, "MERIT_QUOTE_IDENTITY_MISMATCH"));
  await assert.rejects(quote(withForm({ email: "other@example.org" })), isError(403));
  for (const credit of [0.01, 1, "12.34"]) {
    await assert.rejects(quote(fixture({ storeCreditUsed: credit, promoCode: "DYNAMIC" })), isError(409, "MERIT_CREDIT_SELECTION_REQUIRED"));
  }
  for (const credit of [-1, "garbage", Infinity]) await assert.rejects(quote(fixture({ storeCreditUsed: credit })), isError(400));
  assert.equal((await quote(fixture({ storeCreditUsed: undefined }))).snapshot.storeCreditUsed, 0);
});

test("catalog rejects missing, unavailable, over-quantity and invalid warehouse entries", async () => {
  for (const items of [[], [null], [{ name: "unknown", dose: "5 mg", quantity: 1 }],
    [{ name: "TB-500 + BPC-157", dose: "20 mg", quantity: 1, fromWarehouse: "us" }],
    [{ ...fixture().items[0], quantity: 51 }], [{ ...fixture().items[0], quantity: 1.5 }],
    [{ ...fixture().items[0], fromWarehouse: "backup" }]]) {
    await assert.rejects(quote(fixture({ items })), isError(400));
  }
});

test("automatic tier amounts remain 10, 15 and 20 percent", async () => {
  for (const [quantity, discount, total] of [[8, 11120, 100080], [15, 31275, 177225], [29, 80620, 322480]]) {
    const result = await quote(withQuantity(quantity));
    assert.equal(result.automaticDiscountCents, discount);
    assert.equal(result.amountCents, total);
  }
});

test("static promo supersedes automatic discount and owner shipping stays owner-only", async () => {
  const review = await quote({ ...withQuantity(29), promoCode: " review10 " });
  assert.equal(review.automaticDiscountCents, 0);
  assert.equal(review.promoDiscountCents, 40310);
  assert.equal(review.amountCents, 362790);
  assert.equal((await quote(fixture({ promoCode: "REVIEW10" }))).amountCents, 16509);
  await assert.rejects(quote(fixture({ promoCode: "OWNERFREESHIP" })), isError(409));
  await assert.rejects(quote(fixture({ ownerFreeShipping: true })), isError(400));
  const owner = await quote(fixture({ promoCode: "OWNERFREESHIP" }), "support@10bottlevalue.co");
  assert.equal(owner.shippingCents, 0);
  assert.equal(owner.amountCents, 13900);
  assert.equal((await quote(fixture({ ownerFreeShipping: true }), "support@10bottlevalue.co")).amountCents, 13900);
});

test("malformed private promo rows are rejected without granting a discount", async () => {
  for (const promoCode of ["PERSONAL", "SALE", "toString", "constructor"]) {
    const db = service(() => [{ id: "forged", email: EMAIL, code: promoCode, rate: 1, used: false }]);
    await assert.rejects(quote(fixture({ promoCode }), EMAIL, db.options), isError(409, "MERIT_PROMO_UNVERIFIED"));
    assert.equal(db.calls.length, 1);
  }
});

test("affiliate code cannot establish discount or commission through public-write rows", async () => {
  for (const overrides of [{}, { affiliateDiscountDisabled: true }, { promoCode: "REVIEW10" }]) {
    const db = service(() => [{ code: "PARTNER", email: "claimed-owner@example.org", active: true }]);
    await assert.rejects(quote(fixture({ ...overrides, affiliateCode: "PARTNER" }), EMAIL, db.options), isError(409, "MERIT_AFFILIATE_UNVERIFIED"));
    assert.equal(db.calls.length, 0);
  }
});

test("rejected dynamic benefits are never silently dropped or replaced with an undiscounted quote", async () => {
  await assert.rejects(quote(fixture({ promoCode: "PERSONAL" }), EMAIL, service(() => []).options), error => {
    assert.match(error.message, /Remove it or contact support/);
    return isError(409, "MERIT_PROMO_UNVERIFIED")(error);
  });
  await assert.rejects(quote(fixture({ affiliateCode: "PARTNER" })), error => {
    assert.match(error.message, /Remove the code or contact support/);
    return isError(409, "MERIT_AFFILIATE_UNVERIFIED")(error);
  });
  const plain = await quote();
  assert.equal(plain.affiliateDiscountCents, 0);
  assert.equal(plain.snapshot.affiliateCommission, 0);
  assert.equal(plain.userPromoId, null);
});

test("stable snapshot fingerprint ignores untrusted totals but detects contact, item and surcharge changes", async () => {
  const first = await quote();
  const repeat = await quote(fixture({ total: 99999, paymentMethod: "crypto", metadata: { secret: "ignore" } }));
  assert.match(first.quoteFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.quoteFingerprint, repeat.quoteFingerprint);
  assert.notEqual(first.quoteFingerprint, (await quote(withForm({ address: "11 Example Street" }))).quoteFingerprint);
  assert.notEqual(first.quoteFingerprint, (await quote(withQuantity(2))).quoteFingerprint);
  assert.notEqual(first.quoteFingerprint, (await quote(fixture(), EMAIL, { ...noNetwork, surchargeBps: 295 })).quoteFingerprint);
  const withoutId = await quote(fixture({ orderId: undefined }));
  assert.equal(Object.hasOwn(withoutId.snapshot, "id"), false);
});


test("credit opt-in never treats a browser amount as the available balance", async () => {
  const first = await quote(fixture({ useStoreCredit: true, storeCreditUsed: 1 }), EMAIL, { surchargeBps: 300 });
  const forged = await quote(fixture({ useStoreCredit: true, storeCreditUsed: 99999999 }), EMAIL, { surchargeBps: 300 });
  assert.deepEqual(first, forged);
  assert.equal(first.useStoreCredit, true);
  assert.equal(first.snapshot.storeCreditUsed, 0);
  assert.equal(first.amountCents, 18436);
  const split = meritCreditSnapshot(first.snapshot, 17800);
  assert.equal(split.orderBaseAmountCents, 17899);
  assert.equal(split.cardBaseAmountCents, 99);
  assert.equal(split.customerCardSurcharge, 5.37);
  assert.equal(split.storeCreditUsed, 178);
  assert.equal(split.total, 6.36);
  assert.equal(split.customerCardSurchargeBasis, "order_before_credit");
  for (const useStoreCredit of [1, "true", {}]) await assert.rejects(quote(fixture({ useStoreCredit })), isError(400));
});

for (const audience of ['__PUBLIC__', EMAIL]) test(`private ${audience==='__PUBLIC__'?'public':'personal'} promo prices card checkout and retains its rule`, async()=>{
  const id='33333333-3333-4333-8333-333333333333';
  const db=service(url => url.searchParams.get('email')===`eq.${audience}`?[{id,email:audience,code:'CARD5',rate:.05,used:false,active:true,revision:2}]:[]);
  const result=await quote(fixture({promoCode:'CARD5',promoDiscount:999}),EMAIL,{...db.options,surchargeBps:300});
  assert.equal(result.promoDiscountCents,695);assert.equal(result.amountCents,17720);assert.equal(result.snapshot.discountRule.revision,2);
  assert.equal(result.userPromoId,audience==='__PUBLIC__'?null:id);
});

const affiliateRules = { version: 'fixture-referral-v1', source: 'fixture existing referral terms', status: 'operator_report',
  unit: 'basis_points', currency: 'USD', approvedCodes: ['PARTNER', 'ORIGINAL'], effectiveFrom: '2026-01-01T00:00:00Z', firstOrderDiscountBps: 500, commissionBps: 1000 };
function affiliateDb({ affiliate = { code: 'PARTNER', email: 'partner@example.org', active: true }, purchases = [], attribution = [] } = {}) {
  const db = service(url => {
    if (url.pathname.endsWith('/affiliates')) return affiliate ? [affiliate] : [];
    if (url.pathname.endsWith('/affiliate_customers')) return attribution;
    if (url.pathname.endsWith('/orders')) return purchases;
    throw new Error('Unexpected table');
  });
  db.options.affiliateRules = affiliateRules;
  return db;
}
test('verified referral calculates first-order discount and frozen commission from private rules', async () => {
  const db = affiliateDb();
  const result = await quote(fixture({ affiliateCode: 'PARTNER', affiliateCommission: 9999, affiliateDiscount: 9999 }), EMAIL, db.options);
  assert.equal(result.affiliateDiscountCents, 695);
  assert.equal(result.snapshot.affiliateCommission, 13.9);
  assert.equal(result.snapshot.affiliateCode, 'PARTNER');
  assert.equal(result.affiliateRule.version, affiliateRules.version);
  assert.equal(result.snapshot.affiliateRule, undefined);
  assert.equal(result.amountCents, 17204);
});
test('referral keeps larger volume discount, and never gives repeat buyers a first-order discount', async () => {
  const large = await quote({ ...withQuantity(10), affiliateCode: 'PARTNER' }, EMAIL, affiliateDb().options);
  assert.equal(large.affiliateDiscountCents, 0); assert.equal(large.automaticDiscountCents, 13900);
  for (const row of [{ id: 'prior', metadata: {} }, { id: 'prior', metadata: { affiliateCode: 'ORIGINAL' } }]) {
    const result = await quote(fixture({ affiliateCode: 'PARTNER' }), EMAIL, affiliateDb({ purchases: [row] }).options);
    assert.equal(result.affiliateDiscountCents, 0);
    assert.equal(result.snapshot.affiliateCode, row.metadata.affiliateCode || 'PARTNER');
  }
  const disabled = await quote(fixture({ affiliateCode: 'PARTNER', affiliateDiscountDisabled: true }), EMAIL, affiliateDb().options);
  assert.equal(disabled.affiliateDiscountCents, 0);
});
test('referral rejects inactive, missing, self-referral and unavailable purchase history', async () => {
  for (const affiliate of [null, { code: 'PARTNER', email: EMAIL, active: true }, { code: 'PARTNER', email: 'partner@example.org', active: false }]) {
    await assert.rejects(quote(fixture({ affiliateCode: 'PARTNER' }), EMAIL, affiliateDb({ affiliate }).options), isError(409));
  }
  const db = affiliateDb(); db.options.fetcher = async () => { throw new Error('offline'); };
  await assert.rejects(quote(fixture({ affiliateCode: 'PARTNER' }), EMAIL, db.options), isError(503));
  await assert.rejects(quote(fixture({ affiliateCode: 'PARTNER' }), EMAIL, affiliateDb({ purchases: [{ bad: true }] }).options), isError(503));
});
