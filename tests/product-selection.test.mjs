import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  productSelectionFromProduct,
  productSelectionUrl,
  readProductSelection,
  resolveSelectedProduct,
  toStorefrontOffer,
} from "../artifacts/10-bottle-value/src/product-selection.js";
import { productSlug } from "../artifacts/10-bottle-value/src/productNames.js";

const source = readFileSync(new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url), "utf8");
const start = source.indexOf("[", source.indexOf("const PRODUCTS_BASE = ["));
const end = source.indexOf("\n];", start);
assert.ok(start >= 0 && end > start, "actual storefront catalog is present");
const catalog = Function(`return (${source.slice(start, end + 2)})`)();
const offer = (name, dose, warehouse = "worldwide", noteLabel = "") => catalog.find((product) =>
  product.name === name && product.dose === dose
  && (product.warehouse ?? "worldwide") === warehouse
  && (product.noteLabel ?? "") === noteLabel);
const read = (url) => readProductSelection(catalog, new URL(url, "https://10bottlevalue.co"));
const resolveUrl = (url) => resolveSelectedProduct(catalog, read(url));

// Exercise the actual catalog, including every current note, stock and price
// combination. This catches an offer omitted from either direction of routing.
for (const product of catalog) {
  const warehouse = product.warehouse ?? "worldwide";
  test(`catalog URL round trip: ${product.name} ${product.dose} ${product.noteLabel ?? ""} ${warehouse}`, () => {
    const selection = productSelectionFromProduct(product);
    const restored = read(productSelectionUrl(selection));
    assert.deepEqual(restored, selection);
    const selected = resolveSelectedProduct(catalog, restored);
    assert.equal(selected.name, product.name);
    assert.equal(selected.dose, product.dose);
    assert.equal(selected.noteLabel ?? "", product.noteLabel ?? "");
    assert.equal(selected.fromWarehouse === "us", warehouse === "us");
    assert.equal(selected.price, warehouse === "us" ? (product.usPriceBase ?? product.price) + 5 : product.price);
    assert.equal(Boolean(selected.outOfStock), Boolean(product.outOfStock));
    assert.equal(selected.unavailableReason, product.outOfStock ? "stock" : undefined);
    assert.deepEqual(selected.coaImages, product.coaImages);
  });
}

test("BPC-157 10 mg changes both ways without changing its dose or pack", () => {
  const initial = productSelectionFromProduct(offer("BPC-157", "10 mg"));
  assert.equal(resolveSelectedProduct(catalog, initial).price, 139);
  const usSelection = { ...initial, warehouse: "us" };
  const us = resolveSelectedProduct(catalog, usSelection);
  assert.equal(us.price, 179);
  assert.equal(us.fromWarehouse, "us");
  assert.deepEqual(read(productSelectionUrl(usSelection)), usSelection);
  const worldwide = resolveSelectedProduct(catalog, { ...usSelection, warehouse: "worldwide" });
  assert.equal(worldwide.price, 139);
  assert.equal(Object.hasOwn(worldwide, "fromWarehouse"), false);
  assert.equal(worldwide.dose, "10 mg");
});

test("missing BPC-157 5 mg US remains 5 mg and keeps artwork without borrowing COA or price", () => {
  const product = resolveUrl("/bpc-157-5mg?warehouse=us");
  assert.equal(product.name, "BPC-157");
  assert.equal(product.dose, "5 mg");
  assert.equal(product.vials, 10);
  assert.equal(product.fromWarehouse, "us");
  assert.equal(product.price, null);
  assert.equal(product.outOfStock, true);
  assert.equal(product.unavailableReason, "configuration");
  assert.deepEqual(product.coaImages, []);
  assert.equal(product.coaPdf, undefined);
  assert.equal(product.total, "");
  const template = { name: "Synthetic", dose: "5 mg", price: 79, image: "/exact-vial.png", coaImages: ["other-coa.png"] };
  const missing = resolveSelectedProduct([template], productSelectionFromProduct(template, "us"));
  assert.equal(missing.image, "/exact-vial.png");
  assert.deepEqual(missing.coaImages, []);
});

test("US-only DSIP 10 mg never becomes a Worldwide offer without an explicit US URL", () => {
  const selection = read("/dsip-10mg");
  assert.equal(selection.warehouse, "worldwide");
  const worldwide = resolveSelectedProduct(catalog, selection);
  assert.equal(worldwide.dose, "10 mg");
  assert.equal(worldwide.price, null);
  assert.equal(worldwide.unavailableReason, "configuration");
  assert.equal(Object.hasOwn(worldwide, "fromWarehouse"), false);
  assert.equal(resolveUrl("/dsip-10mg?warehouse=us").price, 175);
  assert.equal(productSelectionUrl(selection), "/dsip-10mg");
});

test("US GHK-CU dose changes use the actual US prices and survive reload", () => {
  const current = read("/ghk-cu-50mg?warehouse=us");
  assert.equal(resolveSelectedProduct(catalog, current).price, 119);
  const next = { ...current, dose: "100 mg" };
  assert.equal(productSelectionUrl(next), "/ghk-cu-100mg?warehouse=us");
  const reloaded = resolveUrl(productSelectionUrl(next));
  assert.equal(reloaded.dose, "100 mg");
  assert.equal(reloaded.price, 155);
  assert.equal(reloaded.fromWarehouse, "us");
});

test("an exact out-of-stock US offer retains its price and differs from missing configuration", () => {
  const product = resolveUrl("/tb-500-bpc-157-20mg?warehouse=us");
  assert.equal(product.price, 319);
  assert.equal(product.outOfStock, true);
  assert.equal(product.unavailableReason, "stock");
  assert.equal(resolveUrl("/tb-500-bpc-157-20mg").price, 299);
});

test("CJC-1295 note option survives reload while old ambiguous URL keeps its default", () => {
  const noD = productSelectionFromProduct(offer("CJC-1295", "5 mg", "worldwide", "no/d"));
  const url = productSelectionUrl(noD);
  assert.match(url, /option=no%2Fd/);
  assert.equal(resolveUrl(url).noteLabel, "no/d");
  assert.equal(resolveUrl(url).price, 169);
  assert.equal(resolveUrl("/cjc-1295-5mg").noteLabel, "with/d");
  assert.equal(resolveUrl("/cjc-1295-5mg").price, 319);
  assert.equal(resolveUrl("/cjc-1295-5mg?option=").noteLabel, "with/d");
  const unknown = resolveUrl("/cjc-1295-5mg?option=unknown");
  assert.equal(unknown.noteLabel, "unknown");
  assert.equal(unknown.price, null);
});

for (const pack of ["1", "5", "0", "-1", "1.5", "1e1", "010", "", "abc", "9007199254740992"]) {
  test(`unsupported or malformed pack cannot become ten vials: ${JSON.stringify(pack)}`, () => {
    const selection = read(`/bpc-157-10mg?pack=${encodeURIComponent(pack)}`);
    const product = resolveSelectedProduct(catalog, selection);
    assert.equal(product.unavailableReason, "configuration");
    assert.equal(product.price, null);
    assert.equal(product.outOfStock, true);
    assert.deepEqual(read(productSelectionUrl(selection)), selection);
  });
}

test("explicit ten-vial URLs resolve and serialize to the canonical default", () => {
  const selection = read("/bpc-157-10mg?pack=10");
  assert.equal(selection.vials, 10);
  assert.equal(resolveSelectedProduct(catalog, selection).price, 139);
  assert.equal(productSelectionUrl(selection), "/bpc-157-10mg");
});

test("unknown warehouse remains unavailable and preserved in the URL", () => {
  const selection = read("/bpc-157-10mg?warehouse=moon");
  assert.equal(selection.warehouse, "moon");
  assert.equal(resolveSelectedProduct(catalog, selection).price, null);
  assert.equal(productSelectionUrl(selection), "/bpc-157-10mg?warehouse=moon");
  assert.equal(resolveUrl("/bpc-157-10mg?warehouse=worldwide").price, 139);
});

test("existing uppercase US links retain their warehouse", () => {
  const selection = read("/bpc-157-10mg?warehouse=US");
  assert.equal(selection.warehouse, "us");
  assert.equal(resolveSelectedProduct(catalog, selection).price, 179);
  assert.equal(productSelectionUrl(selection), "/bpc-157-10mg?warehouse=us");
});

test("URL updates preserve affiliate and campaign parameters while replacing only product identity", () => {
  const selection = productSelectionFromProduct(offer("BPC-157", "10 mg", "us"));
  const url = new URL(productSelectionUrl(selection,
    "?c=partner&utm_source=telegram&utm_campaign=fall&product=old&warehouse=worldwide&pack=5&option=old"), "https://10bottlevalue.co");
  assert.equal(url.pathname, "/bpc-157-10mg");
  assert.equal(url.searchParams.get("warehouse"), "us");
  assert.equal(url.searchParams.get("c"), "partner");
  assert.equal(url.searchParams.get("utm_source"), "telegram");
  assert.equal(url.searchParams.get("utm_campaign"), "fall");
  for (const key of ["product", "pack", "option"]) assert.equal(url.searchParams.has(key), false);
});

test("legacy query and both known GLP slug names resolve; unknown paths do not", () => {
  const product = offer("Retatrutide / GLP-3", "10 mg");
  for (const legacy of [false, true]) {
    const slug = productSlug(product, legacy);
    assert.equal(resolveUrl(`/?product=${encodeURIComponent(slug)}`).price, 159);
    assert.equal(resolveUrl(`/${slug}/?warehouse=us`).price, 199);
  }
  assert.equal(read("/unknown-product-10mg"), null);
  assert.equal(read("/shop?product=bpc-157-10mg"), null);
  assert.equal(read("/"), null);
  assert.equal(resolveSelectedProduct(catalog, null), null);
});

test("offer normalization is immutable and applies the established US price exactly once", () => {
  const raw = Object.freeze({ name: "Synthetic", dose: "10 mg", price: 100, warehouse: "us" });
  const first = toStorefrontOffer(raw);
  const second = toStorefrontOffer(first);
  assert.equal(raw.price, 100);
  assert.equal(first.price, 105);
  assert.equal(second.price, 105);
  assert.equal(second.originalPrice, 105);
  assert.equal(first.fromWarehouse, "us");
  const worldwide = toStorefrontOffer({ name: "Synthetic", dose: "10 mg", price: 100, warehouse: "worldwide", fromWarehouse: "us" });
  assert.equal(worldwide.price, 100);
  assert.equal(Object.hasOwn(worldwide, "fromWarehouse"), false);
});
