import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const appRequire = createRequire(new URL("../artifacts/10-bottle-value/package.json", import.meta.url));
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const viteRequire = createRequire(appRequire.resolve("vite/package.json"));
const { build } = viteRequire("esbuild");
const compiled = await build({
  entryPoints: [fileURLToPath(new URL("../artifacts/10-bottle-value/src/components/MeritFeesPanel.jsx", import.meta.url))],
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react/jsx-runtime"],
});
const module = { exports: {} };
vm.runInNewContext(`(function(require,module,exports) { ${compiled.outputFiles[0].text}\n})`, { Intl, Date })(appRequire, module, module.exports);
const Panel = module.exports.default;
const source = () => ({
  status: "ready", value: {
    summary: {
      recordedPaidAttempts: 2, eligibleAttempts: 1, excludedRefundOrReversal: 1, excludedUnknown: 0,
      feeUnknownAttempts: 0, chargedAmountCents: 10300, customerCardSurchargeCents: 300,
      processorExpenseEstimateCents: 773, merchantFeeBurdenEstimateCents: 473, netProfitCents: null,
    },
    metadata: { since: "2026-10-01T21:00:00Z", until: "2026-10-08T21:00:00Z", fetchedAt: "2026-10-08T21:00:01Z" },
  },
});
const render = (value, language = "en") => renderToStaticMarkup(React.createElement(Panel, { source: value, language }));

test("fee panel shows the customer offset and estimated expense separately without claiming profit", () => {
  const html = render(source());
  for (const amount of ["$103.00", "$3.00", "$7.73", "$4.73"]) assert.ok(html.includes(amount));
  assert.match(html, /Estimated processing expense/); assert.match(html, /Net profit remains unknown/);
  assert.match(html, /Excluded refund/); assert.match(html, /not settlement fees/);
  assert.doesNotMatch(html, /MERIT_PROCESSOR_FEE_BPS|paymentRules|privateMeritConfig/);
});

test("unknown expenses render as unknown instead of zero in both languages", () => {
  const value = source(); value.value.summary.processorExpenseEstimateCents = null;
  value.value.summary.merchantFeeBurdenEstimateCents = null; value.value.summary.feeUnknownAttempts = 1;
  const en = render(value); const ru = render(value, "ru");
  assert.match(en, /<strong>Unknown<\/strong>/); assert.match(ru, /<strong>Неизвестно<\/strong>/);
  assert.doesNotMatch(en, /\$0\.00/); assert.doesNotMatch(ru, /0,00/);
  assert.match(ru, /Чистая прибыль неизвестна/); assert.match(ru, /а не комиссии из взаиморасчётов/);
});

test("explicit known zero fees and negative balances remain visible", () => {
  const value = source(); value.value.summary.processorExpenseEstimateCents = 0; value.value.summary.merchantFeeBurdenEstimateCents = -300;
  const html = render(value); assert.match(html, /\$0\.00/); assert.match(html, /-\$3\.00/);
});

test("an unavailable record source displays no example amounts", () => {
  const html = render({ status: "error", error: "unavailable" });
  assert.match(html, /role="alert"/); assert.match(html, /Fee amounts remain unknown/);
  assert.doesNotMatch(html, /\$[0-9]|7\.5%|3%/);
});

test("complete zero activity is described separately from unavailable amounts", () => {
  const value = source(); value.value.summary.recordedPaidAttempts = 0;
  const html = render(value); assert.match(html, /No completed live Merit payments/); assert.match(html, /Net profit remains unknown/);
  assert.doesNotMatch(html, /\$0\.00|<strong>Unknown/);
});
