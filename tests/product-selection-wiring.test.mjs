import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { test } from "node:test";
import {
  productSelectionFromProduct, productSelectionUrl, readProductSelection,
  resolveSelectedProduct, toStorefrontOffer,
} from "../artifacts/10-bottle-value/src/product-selection.js";
import { catalogProductName } from "../artifacts/10-bottle-value/src/productNames.js";
import { buildMeritCheckoutPayload, meritCartMatchesOrder } from "../artifacts/10-bottle-value/src/merit-checkout-client.js";

// Run the actual App handlers and inline selector callbacks with isolated state.
// No provider SDK, authentication, network request or real order is involved.
const appRequire = createRequire(new URL("../artifacts/10-bottle-value/package.json", import.meta.url));
const pluginRequire = createRequire(appRequire.resolve("@vitejs/plugin-react"));
const babelRequire = createRequire(pluginRequire.resolve("@babel/core"));
const { parse } = babelRequire("@babel/parser");
const source = readFileSync(new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url), "utf8");
const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
const appBody = ast.program.body.find(node => node.type === "ExportDefaultDeclaration" && node.declaration.id?.name === "App").declaration.body.body;
const declarations = nodes => nodes.filter(node => node.type === "VariableDeclaration").flatMap(node => node.declarations);
const catalogNode = declarations(ast.program.body).find(node => node.id.name === "PRODUCTS_BASE");
const catalog = vm.runInNewContext(`(${source.slice(catalogNode.init.start, catalogNode.init.end)})`);
const plain = value => JSON.parse(JSON.stringify(value));
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const nodes = [];
visit(ast.program, node => nodes.push(node));
const evaluate = (node, context) => vm.runInContext(`(${source.slice(node.start, node.end)})`, context);
const handler = (name, context) => {
  const node = appBody.find(node => node.type === "FunctionDeclaration" && node.id.name === name);
  assert.ok(node, `App handler ${name} exists`);
  return evaluate(node, context);
};
const initializer = (name, context) => {
  const node = declarations(appBody).find(node => node.id.name === name);
  assert.ok(node, `App value ${name} exists`);
  return evaluate(node.init, context);
};
const offer = (name, dose, warehouse = "worldwide", noteLabel = "") => {
  const result = catalog.find(product => product.name === name && product.dose === dose
    && (product.warehouse ?? "worldwide") === warehouse && (product.noteLabel ?? "") === noteLabel);
  assert.ok(result, `Catalog contains ${name} ${dose} ${warehouse} ${noteLabel}`);
  return result;
};

function fixture({ products = catalog, page = "us-warehouse", url = "/us-warehouse?c=friend&utm_source=test" } = {}) {
  const calls = [];
  const listeners = new Map();
  const sandbox = {
    URLSearchParams, products, PRODUCTS_BASE: catalog, catalogProductName,
    productSelectionFromProduct, productSelectionUrl, readProductSelection, resolveSelectedProduct, toStorefrontOffer,
    publicPathToPage: { shop: "shop", "us-warehouse": "us-warehouse", cart: "cart" },
    page, cart: [], productSelection: null, currentAffiliateProfile: { code: "FRIEND" },
    productOriginPage: { current: "shop" }, savedShopScrollY: { current: 0 }, savedSidebarScrollTop: { current: 0 },
    shopSidebarScrollRef: { current: { scrollTop: 91 } },
    useMemo: callback => callback(),
    setCoaPage: value => calls.push(["coaPage", value]),
    setCoaLightbox: value => calls.push(["coaLightbox", value]),
    setCartHighlight: value => calls.push(["highlight", value]),
    track: (...args) => calls.push(["track", ...args]),
  };
  const window = {
    location: new URL(url, "https://10bottlevalue.co"), scrollY: 417,
    clearTimeout() {}, setTimeout: () => 1,
    scrollTo: value => calls.push(["scroll", value]),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  window.history = Object.fromEntries(["pushState", "replaceState"].map(method => [method, (state, title, path) => {
    calls.push([method, path]);
    window.location = new URL(path, window.location.origin);
  }]));
  sandbox.window = window;
  sandbox.setPage = value => { sandbox.page = value; calls.push(["page", value]); };
  sandbox.setProductSelection = value => { sandbox.productSelection = value; calls.push(["selection", value]); };
  sandbox.setCart = update => { sandbox.cart = typeof update === "function" ? update(sandbox.cart) : update; };
  const context = vm.createContext(sandbox);
  for (const name of ["getProductId", "isCartOfferAvailable", "changeProductSelection", "openProduct", "addToCart", "migrateCartItem"]) {
    context[name] = handler(name, context);
  }
  return { context, calls, listeners, window };
}

const selectorCallbacks = nodes.filter(node => node.type === "JSXAttribute" && node.name.name === "onClick")
  .map(node => node.value?.expression).filter(Boolean);
function selectionArgument(callback) {
  let argument;
  visit(callback, node => {
    if (node.type === "CallExpression" && node.callee.name === "changeProductSelection") argument = node.arguments[0];
  });
  return argument;
}
const hasMember = (object, name) => object?.properties?.some(property => property.key?.name === name && property.value?.type === "MemberExpression");
const doseCallback = selectorCallbacks.find(callback => hasMember(selectionArgument(callback), "warehouse") && hasMember(selectionArgument(callback), "vials"));
const warehouseCallback = selectorCallbacks.find(callback => selectionArgument(callback)?.properties?.some(property => property.key?.name === "warehouse" && property.shorthand));
const packElement = nodes.find(node => node.type === "JSXElement" && node.openingElement.name.name === "ProductPackSelector");
const packCallback = packElement.openingElement.attributes.find(attribute => attribute.name?.name === "onSelectPack").value.expression;
assert.ok(doseCallback && warehouseCallback && packCallback, "App exposes all three actual selector callbacks");

test("opening a US offer binds its price, route and originating catalog", () => {
  const { context, calls, window } = fixture();
  context.openProduct(offer("BPC-157", "10 mg", "us"));
  const selected = initializer("selectedProduct", context);
  assert.equal(selected.price, 179);
  assert.equal(selected.fromWarehouse, "us");
  assert.equal(window.location.pathname, "/bpc-157-10mg");
  assert.equal(window.location.searchParams.get("warehouse"), "us");
  assert.equal(window.location.searchParams.get("c"), "friend");
  assert.equal(context.productOriginPage.current, "us-warehouse");
  assert.equal(context.savedShopScrollY.current, 417);
  assert.equal(context.savedSidebarScrollTop.current, 91);
  assert.equal(context.page, "product");
  assert.equal(calls.filter(([name]) => name === "replaceState").length, 1);
});

test("the actual US dose button updates URL and US price without overwriting navigation origin", () => {
  const { context, calls, window } = fixture();
  context.openProduct(offer("Retatrutide / GLP-3", "10 mg", "us"));
  assert.equal(initializer("selectedProduct", context).price, 199);
  const initialNavigation = calls.filter(([name]) => name === "scroll" || name === "page").length;
  context.v = offer("Retatrutide / GLP-3", "20 mg", "us");
  context.isActive = false;
  evaluate(doseCallback, context)();
  const selected = initializer("selectedProduct", context);
  assert.equal(selected.dose, "20 mg");
  assert.equal(selected.price, 285, "use US base plus the existing adjustment, not the raw $259 row price");
  assert.equal(selected.fromWarehouse, "us");
  assert.equal(window.location.pathname, "/glp-3-r-20mg");
  assert.equal(window.location.searchParams.get("warehouse"), "us");
  assert.equal(window.location.searchParams.get("utm_source"), "test");
  assert.equal(context.productOriginPage.current, "us-warehouse");
  assert.equal(context.savedShopScrollY.current, 417);
  assert.equal(context.savedSidebarScrollTop.current, 91);
  assert.equal(calls.filter(([name]) => name === "scroll" || name === "page").length, initialNavigation);
  assert.equal(resolveSelectedProduct(catalog, readProductSelection(catalog, window.location)).price, 285);
});

test("warehouse and dose callbacks keep an unavailable pack selected until the pack callback changes it", () => {
  const { context, window } = fixture();
  context.openProduct({ ...offer("BPC-157", "5 mg"), vials: 5 });
  context.active = false;
  context.warehouse = "us";
  evaluate(warehouseCallback, context)();
  assert.equal(context.productSelection.vials, 5);
  assert.equal(context.productSelection.dose, "5 mg");
  assert.equal(window.location.searchParams.get("pack"), "5");
  assert.equal(initializer("selectedProduct", context).price, null);
  context.v = offer("BPC-157", "10 mg", "us");
  context.isActive = false;
  evaluate(doseCallback, context)();
  assert.equal(context.productSelection.vials, 5);
  assert.equal(context.productSelection.warehouse, "us");
  assert.equal(initializer("selectedProduct", context).price, null);
  evaluate(packCallback, context)(10);
  assert.equal(context.productSelection.vials, 10);
  assert.equal(initializer("selectedProduct", context).price, 179);
  assert.equal(window.location.searchParams.has("pack"), false);
});

test("selection changes reset COA state without rewriting an unchanged route or catalog origin", () => {
  const { context, calls } = fixture();
  context.openProduct(offer("CJC-1295", "5 mg", "worldwide", "no/d"));
  const selection = plain(context.productSelection);
  const navigationCount = calls.filter(([name]) => /State$/.test(name)).length;
  context.changeProductSelection(selection);
  assert.equal(calls.filter(([name]) => /State$/.test(name)).length, navigationCount);
  assert.equal(calls.at(-2)[0], "coaPage");
  assert.equal(calls.at(-2)[1], 0);
  assert.deepEqual(calls.at(-1), ["coaLightbox", false]);
  assert.equal(context.productOriginPage.current, "us-warehouse");
  assert.equal(context.savedShopScrollY.current, 417);
});

test("addToCart resolves the exact offer and refreshes stale existing prices while keeping warehouses separate", () => {
  const { context, calls } = fixture();
  const worldwide = offer("BPC-157", "10 mg");
  const us = offer("BPC-157", "10 mg", "us");
  assert.equal(context.addToCart({ ...worldwide, price: 0.01 }, "product"), true);
  assert.equal(context.addToCart({ ...us, price: 0.01 }, "product"), true);
  assert.equal(context.cart.length, 2);
  assert.equal(context.cart[0].price, 139);
  assert.equal(context.cart[1].price, 179);
  assert.notEqual(context.getProductId(context.cart[0]), context.getProductId(context.cart[1]));
  context.cart[1].price = 0.01;
  assert.equal(context.addToCart({ ...us, price: 9999 }, "product"), true);
  assert.equal(context.cart[1].price, 179);
  assert.equal(context.cart[1].quantity, 2);
  assert.equal(context.cart[0].quantity, 1);
  assert.equal(calls.filter(([name]) => name === "track").at(-1)[2].product_price, 179);
});

test("addToCart rejects missing warehouse offers, unsupported or malformed packs, and exact sold-out rows", () => {
  const { context, calls } = fixture();
  const missing = [
    { ...offer("BPC-157", "5 mg"), fromWarehouse: "us" },
    { ...offer("DSIP", "10 mg", "us"), warehouse: "worldwide" },
    offer("Retatrutide / GLP-3", "5 mg", "us"),
    ...[1, 5, null, false, "10", 0].map(vials => ({ ...offer("BPC-157", "10 mg"), vials })),
  ];
  for (const product of missing) assert.equal(context.addToCart(product), false, JSON.stringify(product));
  assert.equal(context.cart.length, 0);
  assert.equal(calls.length, 0);
});

test("cart identities include warehouse, pack and product option, and stock does not leak between warehouses", () => {
  const products = [
    { name: "Fixture", dose: "10 mg", price: 100, outOfStock: true },
    { name: "Fixture", dose: "10 mg", price: 100, usPriceBase: 110, warehouse: "us", outOfStock: false },
  ];
  const { context } = fixture({ products });
  const us = toStorefrontOffer(products[1]);
  context.cart = [us];
  assert.equal(initializer("hasOutOfStockInCart", context), false);
  context.cart = [products[0]];
  assert.equal(initializer("hasOutOfStockInCart", context), true);
  products[0].outOfStock = false;
  products[1].outOfStock = true;
  assert.equal(initializer("hasOutOfStockInCart", context), false);
  context.cart = [us];
  assert.equal(initializer("hasOutOfStockInCart", context), true);
  assert.notEqual(context.getProductId(products[0]), context.getProductId(us));
  assert.notEqual(context.getProductId(products[0]), context.getProductId({ ...products[0], vials: 5 }));
  assert.notEqual(context.getProductId(products[0]), context.getProductId({ ...products[0], noteLabel: "option" }));
});

test("saved-cart migration reprices the exact warehouse and option and blocks unavailable saved packs", () => {
  const { context } = fixture();
  const us = context.migrateCartItem({ name: "retatrutide", dose: "20mg", fromWarehouse: "us", quantity: 2, price: 1 });
  assert.equal(us.name, "Retatrutide / GLP-3");
  assert.equal(us.dose, "20 mg");
  assert.equal(us.price, 285);
  assert.equal(us.fromWarehouse, "us");
  const noD = context.migrateCartItem({ name: "CJC-1295", dose: "5mg", noteLabel: "no/d", quantity: 1, price: 1 });
  assert.equal(noD.price, 169);
  const unavailable = context.migrateCartItem({ name: "BPC-157", dose: "10 mg", vials: 5, quantity: 1, price: 1 });
  assert.equal(unavailable.vials, 5);
  assert.equal(context.isCartOfferAvailable(unavailable), false);
});

test("the actual popstate listener restores warehouse selection, price and public navigation", () => {
  const effect = appBody.find(node => node.type === "ExpressionStatement" && node.expression.callee?.name === "useEffect"
    && nodes.some(child => child.start >= node.start && child.end <= node.end && child.type === "CallExpression"
      && child.callee.property?.name === "addEventListener" && child.arguments[0]?.value === "popstate"))?.expression.arguments[0];
  assert.ok(effect, "App registers browser history restoration");
  const { context, listeners, window } = fixture();
  const cleanup = evaluate(effect, context)();
  for (const [url, price, warehouse] of [["/bpc-157-10mg?warehouse=us", 179, "us"], ["/bpc-157-10mg", 139, "worldwide"]]) {
    window.location = new URL(url, window.location.origin);
    listeners.get("popstate")();
    assert.equal(context.productSelection.warehouse, warehouse);
    assert.equal(initializer("selectedProduct", context).price, price);
    assert.equal(context.page, "product");
  }
  window.location = new URL("/shop", window.location.origin);
  listeners.get("popstate")();
  assert.equal(context.page, "shop");
  cleanup();
  assert.equal(listeners.has("popstate"), false);
});

test("every App checkout item serializer retains option and non-default pack for authoritative rejection", () => {
  const serializers = nodes.filter(node => node.type === "ObjectProperty" && node.key.name === "items"
    && node.value.type === "CallExpression" && node.value.callee.object?.name === "cart" && node.value.callee.property?.name === "map");
  assert.ok(serializers.length > 0, "checkout item serializers are found through their AST");
  const cart = [{ name: "CJC-1295", dose: "5 mg", noteLabel: "no/d", fromWarehouse: "us", vials: 5, quantity: 2, price: 1 }];
  const context = vm.createContext({ cart });
  for (const serializer of serializers) {
    const result = evaluate(serializer.value, context);
    for (const key of ["name", "dose", "noteLabel", "fromWarehouse", "vials", "quantity"]) {
      assert.equal(result[0][key], cart[0][key], `selector ${key}, App line ${serializer.loc.start.line}`);
    }
    cart[0].vials = 10;
    assert.equal(Object.hasOwn(evaluate(serializer.value, context)[0], "vials"), false, "default pack keeps old payment snapshots");
    cart[0].vials = 5;
  }
});

test("Merit client preserves pack identity without changing default-ten payloads or clearing another pack", () => {
  const line = { name: "BPC-157", dose: "10 mg", fromWarehouse: "us", noteLabel: "option", quantity: 1 };
  const payload = buildMeritCheckoutPayload({ items: [line] });
  assert.deepEqual(buildMeritCheckoutPayload({ items: [{ ...line, vials: 10 }] }), payload);
  const changed = buildMeritCheckoutPayload({ items: [{ ...line, vials: 5 }] });
  assert.equal(changed.items[0].vials, 5);
  assert.equal(changed.items[0].noteLabel, "option");
  assert.equal(meritCartMatchesOrder([{ ...line, vials: 10 }], { items: [line] }), true);
  assert.equal(meritCartMatchesOrder([{ ...line, vials: 5 }], { items: [line] }), false);
});
