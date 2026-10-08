import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const appRequire = createRequire(
  new URL("../artifacts/10-bottle-value/package.json", import.meta.url),
);
const ts = require("typescript");
const React = appRequire("react");
const { renderToStaticMarkup } = appRequire("react-dom/server");
const modules = new Map();
function loadComponent(path) {
  if (modules.has(path)) return modules.get(path);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  modules.set(path, exports);
  new Function("require", "exports", compiled.outputText)((specifier) => {
    if (specifier.endsWith(".css")) return {};
    if (specifier.startsWith("@assets/")) return specifier;
    return specifier.startsWith(".")
      ? loadComponent(resolve(dirname(path), specifier))
      : appRequire(specifier);
  }, exports);
  return exports;
}
const Dashboard = loadComponent(
  fileURLToPath(
    new URL(
      "../artifacts/10-bottle-value/src/components/AccountDashboard.jsx",
      import.meta.url,
    ),
  ),
).default;
const props = {
  user: { email: "fixture@example.invalid" },
  tx: (english) => english,
  formatPrice: (amount) => {
    assert.notEqual(amount, null);
    return `$${amount.toFixed(2)}`;
  },
};
const order = {
  id: "synthetic-visible-order",
  status: "paid",
  total: null,
  items: [],
  shippingType: "",
  createdAt: null,
  paidAt: null,
};
const render = (values) =>
  renderToStaticMarkup(React.createElement(Dashboard, { ...props, ...values }));

test("loading and failed reads cannot be presented as empty or stale complete history", () => {
  for (const ordersReadStatus of ["idle", "loading", "error"]) {
    const html = render({ orders: [order], ordersReadStatus });
    assert.doesNotMatch(html, /No orders yet|synthetic-visible-order/);
    assert.match(
      html,
      ordersReadStatus === "error"
        ? /Order history is unavailable/
        : /Loading your orders/,
    );
  }
});

test("only complete empty history shows the no-orders message", () => {
  assert.match(
    render({ orders: [], ordersReadStatus: "complete" }),
    /No orders yet/,
  );
});

test("known history displays unknown total and shipping without inventing zero or Standard", () => {
  const html = render({ orders: [order], ordersReadStatus: "complete" });
  assert.match(html, /synthetic-visible-order/);
  assert.match(html, /lab-order-card__total">—</);
  assert.match(html, /lab-order-card__date">—</);
  assert.doesNotMatch(html, /1970|Invalid Date/);
  assert.match(html, /Shipping method unavailable/);
  assert.doesNotMatch(html, /standard shipping/);
  const free = render({
    orders: [{ ...order, total: 0 }],
    ordersReadStatus: "complete",
  });
  assert.match(free, /lab-order-card__total">\$0\.00</);
});
