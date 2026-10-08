import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const appRequire = createRequire(
  new URL("../artifacts/10-bottle-value/package.json", import.meta.url),
);
const ts = require("typescript");
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const source = readFileSync(
  new URL(
    "../artifacts/10-bottle-value/src/components/AffiliateAccountPanel.jsx",
    import.meta.url,
  ),
  "utf8",
).replace('import "./AffiliateAccountPanel.css";', "");
const compiled = ts.transpileModule(source, {
  fileName: "AffiliateAccountPanel.jsx",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
  },
});
const moduleExports = {};
new Function("require", "exports", compiled.outputText)(
  appRequire,
  moduleExports,
);
const Panel = moduleExports.default;
const props = {
  profile: { code: "FIXTURE", commissionRate: 0.1 },
  orders: [
    {
      order_id: "synthetic-order",
      status: "paid",
      commissionEligible: true,
      commissionAvailable: true,
      commission_amount: 100,
      order_total: 1000,
    },
  ],
  tx: (english) => english,
  formatPrice: (value) => `$${value.toFixed(2)}`,
  onRefresh() {},
};
const render = (values) =>
  renderToStaticMarkup(React.createElement(Panel, { ...props, ...values }));
const metric = (html, kind) =>
  html.match(
    new RegExp(
      `class="lab-affiliate-stat lab-affiliate-stat--${kind}">[\\s\\S]*?<strong>(.*?)</strong>`,
    ),
  )?.[1];

test("unavailable payout history hides both payout-dependent balances and preserves commission", () => {
  for (const values of [
    { paidOut: null },
    { paidOut: 40, payoutError: true },
  ]) {
    const html = render(values);
    assert.equal(metric(html, "available"), "—");
    assert.equal(metric(html, "paid"), "—");
    assert.match(html, /Commission earned<\/span><strong>\$100\.00/);
    assert.match(
      html,
      /Use Refresh to verify your paid-out total and available balance/,
    );
  }
});

test("payout loading never displays a zero or an available withdrawal figure", () => {
  const html = render({ paidOut: null, loading: true });
  assert.equal(metric(html, "available"), "…");
  assert.equal(metric(html, "paid"), "…");
});

test("verified zero and recorded payouts produce the corresponding available balance", () => {
  const zero = render({ paidOut: 0 });
  assert.equal(metric(zero, "paid"), "$0.00");
  assert.equal(metric(zero, "available"), "$100.00");
  const paid = render({ paidOut: 40 });
  assert.equal(metric(paid, "paid"), "$40.00");
  assert.equal(metric(paid, "available"), "$60.00");
});

test("failed or partial order history hides derived amounts and preserves verified payout total", () => {
  for (const orders of [props.orders, []]) {
    const html = render({ orders, ordersError: true, paidOut: 40 });
    assert.equal(metric(html, "available"), "—");
    assert.equal(metric(html, "paid"), "$40.00");
    for (const label of ["Paid orders", "Paid sales", "Commission earned", "Pending"]) {
      assert.match(html, new RegExp(`${label}</span><strong>—</strong>`));
    }
    assert.match(html, /Order history is incomplete or unavailable/);
    assert.doesNotMatch(html, /Payout history is unavailable/);
    assert.doesNotMatch(html, /No referred orders have been recorded yet/);
  }
});
