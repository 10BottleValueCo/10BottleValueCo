import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

// Reuse the app's existing React/Vite toolchain; no test-only browser or Stripe
// network request is needed to verify its session/account binding and markup.
const appRequire = createRequire(new URL("../artifacts/10-bottle-value/package.json", import.meta.url));
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const viteRequire = createRequire(appRequire.resolve("vite/package.json"));
const { build } = viteRequire("esbuild");
const compiled = await build({
  entryPoints: [fileURLToPath(new URL("../artifacts/10-bottle-value/src/components/MeritCheckoutPanel.jsx", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  external: ["react", "react/jsx-runtime", "@stripe/react-stripe-js", "@stripe/stripe-js"],
});
const session = {
  clientSecret: "pi_Test123_secret_Secret123", publishableKey: "pk_live_Public123",
  stripeAccount: "acct_Merchant123", orderId: "INV-ABC123456789", amountCents: 17899, currency: "usd",
};

function componentFixture() {
  const calls = { stripe: [], elements: [], payment: [], wallet: [] };
  const stripe = {};
  const mockedRequire = name => {
    if (name === "@stripe/stripe-js") return {
      loadStripe: (...args) => { calls.stripe.push(args); return Promise.resolve(stripe); },
    };
    if (name === "@stripe/react-stripe-js") return {
      Elements: ({ children, options }) => { calls.elements.push(options); return children; },
      useStripe: () => stripe, useElements: () => ({}),
      PaymentElement: props => { calls.payment.push(props); return React.createElement("div", { "data-card-element": "true" }); },
      ExpressCheckoutElement: props => { calls.wallet.push(props); return React.createElement("div", { "data-wallet-element": "true" }); },
    };
    return appRequire(name);
  };
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports) { ${compiled.outputFiles[0].text}\n})`, {
    URL, URLSearchParams, Intl, Promise,
  })(mockedRequire, module, module.exports);
  return { Panel: module.exports.default, calls };
}

test("panel binds Elements to the session's connected account and both card/wallet elements", async () => {
  const { Panel, calls } = componentFixture();
  const html = renderToStaticMarkup(React.createElement(Panel, { session, onReconcile: async () => ({ ok: true, paid: false }) }));
  await Promise.resolve();
  assert.equal(calls.stripe.length, 1);
  assert.equal(calls.stripe[0][0], session.publishableKey);
  assert.equal(calls.stripe[0][1].stripeAccount, session.stripeAccount);
  assert.equal(calls.elements[0].clientSecret, session.clientSecret);
  assert.equal(calls.elements[0].locale, "en");
  assert.equal(calls.payment.length, 1);
  assert.equal(calls.wallet.length, 1);
  assert.equal(typeof calls.wallet[0].onConfirm, "function");
  assert.equal(calls.payment[0].options.wallets.applePay, "never");
  assert.equal(calls.payment[0].options.wallets.googlePay, "never");
  assert.match(html, /Secure payment/);
  assert.match(html, /\$178\.99/);
  assert.match(html, /INV-ABC123456789/);
  assert.match(html, /type="submit" disabled/);
  assert.doesNotMatch(html, /Secret123|pk_live|acct_Merchant|Payment confirmed/);
});

test("invalid session or missing reconciliation callback cannot mount a payment form", async () => {
  for (const props of [{ session: { ...session, stripeAccount: "" }, onReconcile: () => {} }, { session }]) {
    const { Panel, calls } = componentFixture();
    const html = renderToStaticMarkup(React.createElement(Panel, props));
    await Promise.resolve();
    assert.match(html, /role="alert"/);
    assert.match(html, /Secure payment is unavailable/);
    assert.equal(calls.stripe.length, 0);
    assert.equal(calls.payment.length, 0);
    assert.equal(calls.wallet.length, 0);
  }
});

test("Russian panel keeps identical amount, connected account and safe pending behavior", async () => {
  const { Panel, calls } = componentFixture();
  const html = renderToStaticMarkup(React.createElement(Panel, { session, language: "ru", onReconcile: async () => ({ ok: true, paid: false }) }));
  await Promise.resolve();
  assert.equal(calls.elements[0].locale, "ru");
  assert.equal(calls.stripe[0][1].stripeAccount, session.stripeAccount);
  assert.match(html, /Безопасная оплата/);
  assert.match(html, /178,99/);
  assert.match(html, /Оплатить/);
  assert.doesNotMatch(html, /Оплата подтверждена|Secret123/);
});

test("mixed credit panel shows server amounts and keeps the card button disabled until Elements is ready", () => {
  const mixed = { ...session, baseAmountCents: 6000, storeCreditUsedCents: 5000,
    cardBaseAmountCents: 1000, surchargeCents: 30, amountCents: 1030 };
  for (const language of ["en", "ru"]) {
    const { Panel } = componentFixture();
    const html = renderToStaticMarkup(React.createElement(Panel, { session: mixed, language, onReconcile: async () => ({ ok: true, paid: false }) }));
    assert.match(html, language === "en" ? /Store credit applied/ : /Использованный кредит магазина/);
    assert.match(html, language === "en" ? /Remaining before card surcharge/ : /Остаток до доплаты за карту/);
    assert.match(html, language === "en" ? /\$10\.30/ : /10,30/);
    assert.match(html, language === "en" ? /-\$50\.00/ : /-50,00/);
    assert.match(html, /type="submit" disabled/);
  }
  const { Panel, calls } = componentFixture();
  const invalid = renderToStaticMarkup(React.createElement(Panel, { session: { ...mixed, storeCreditUsedCents: 4999 }, onReconcile: async () => ({}) }));
  assert.match(invalid, /role="alert"/);
  assert.equal(calls.payment.length, 0);
});
