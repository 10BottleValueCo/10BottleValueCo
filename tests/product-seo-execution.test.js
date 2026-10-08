import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as productNames from "../artifacts/10-bottle-value/src/productNames.js";
import * as selections from "../artifacts/10-bottle-value/src/product-selection.js";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../artifacts/10-bottle-value/src/useSEO.js", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  fileName: "useSEO.js",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const app = readFileSync(
  new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url),
  "utf8",
);
const catalog = new Function(
  `return (${app.match(/const PRODUCTS_BASE = (\[[\s\S]*?\]);\s*\/\/ CATALOG_DATA_END/)[1]});`,
)();

function harness() {
  const nodes = [];
  const document = {
    title: "",
    head: { appendChild: (node) => nodes.push(node) },
    createElement: (tag) => ({
      tag,
      setAttribute(name, value) {
        this[name] = value;
      },
      remove() {
        const at = nodes.indexOf(this);
        if (at >= 0) nodes.splice(at, 1);
      },
    }),
    querySelector(selector) {
      const [, tag, attribute, value] = selector.match(
        /^(\w+)\[([^=]+)="([^"]+)"\]$/,
      );
      return (
        nodes.find((node) => node.tag === tag && node[attribute] === value) ||
        null
      );
    },
  };
  const exports = {};
  const imports = (name) => {
    if (name === "react") return { useEffect: (callback) => callback() };
    if (name === "./productNames.js") return productNames;
    if (name === "./product-selection.js") return selections;
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function("require", "exports", "document", compiled)(
    imports,
    exports,
    document,
  );
  return {
    useSEO: exports.useSEO,
    document,
    json: (id) =>
      JSON.parse(
        document.querySelector(`script[data-seo-id="${id}"]`)?.textContent ||
          "null",
      ),
    meta: (name) => document.querySelector(`meta[name="${name}"]`)?.content,
  };
}

test("the real SEO effect executes for every catalog selection with matching SKU, offer and canonical", () => {
  const dom = harness();
  const skus = new Set();
  for (const entry of catalog) {
    const product = selections.resolveProductSelection(catalog, entry);
    assert.doesNotThrow(() => dom.useSEO({ page: "product", product }));
    const data = dom.json("product");
    const path = selections.productSelectionPath(product);
    assert.equal(data.sku, path.slice(1));
    assert.equal(data.url, `https://10bottlevalue.co${path}`);
    assert.equal(data.offers.url, data.url);
    assert.equal(data.offers.price, product.price);
    assert.equal(
      data.offers.availability.endsWith("/OutOfStock"),
      Boolean(product.outOfStock),
    );
    assert.equal(
      dom.document.querySelector('link[rel="canonical"]').href,
      data.url,
    );
    assert.equal(skus.has(data.sku), false, `SKU collision: ${data.sku}`);
    skus.add(data.sku);
  }
});

test("switching warehouses updates price, shipping description and SKU without stale structured data", () => {
  const dom = harness();
  const worldwide = selections.resolveProductRoute(
    catalog,
    new URL("https://fixture.test/bpc-157-10mg?warehouse=worldwide"),
  );
  const us = selections.resolveProductSelection(catalog, worldwide, "us");
  dom.useSEO({ page: "product", product: worldwide });
  const first = dom.json("product");
  assert.equal(first.offers.price, 139);
  assert.match(dom.meta("description"), /Ships worldwide/);
  dom.useSEO({ page: "product", product: us });
  const next = dom.json("product");
  assert.equal(next.offers.price, 179);
  assert.notEqual(next.sku, first.sku);
  assert.match(dom.meta("description"), /US warehouse to US addresses/);
  dom.useSEO({ page: "shop", product: us });
  assert.equal(dom.json("product"), null);
  assert.equal(dom.json("breadcrumb"), null);
});

test("an unavailable product selection cannot retain an indexed canonical or purchasable offer", () => {
  const dom = harness();
  const product = selections.resolveProductRoute(
    catalog,
    new URL("https://fixture.test/bpc-157-10mg?warehouse=us"),
  );
  dom.useSEO({ page: "product", product });
  assert.ok(dom.json("product"));
  dom.useSEO({ page: "product", product: null });
  assert.equal(dom.json("product"), null);
  assert.equal(dom.json("breadcrumb"), null);
  assert.equal(dom.json("webpage"), null);
  assert.equal(dom.document.querySelector('link[rel="canonical"]'), null);
  assert.equal(dom.document.querySelector('meta[property="og:url"]'), null);
  assert.equal(dom.meta("robots"), "noindex, follow");
  assert.match(dom.document.title, /Selection Unavailable/);
  dom.useSEO({ page: "shop", product: null });
  assert.equal(dom.meta("robots"), "index, follow");
  assert.equal(
    dom.document.querySelector('link[rel="canonical"]').href,
    "https://10bottlevalue.co/shop",
  );
});
