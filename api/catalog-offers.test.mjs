import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTS, findCatalogProduct, validateAndPriceItems } from "./_catalog.js";
import { normalizePackCount, normalizeWarehouse, resolveWarehouseOffer } from "../shared/warehouse-offer.js";

const item = overrides => ({ name: "BPC-157", dose: "10 mg", quantity: 1, ...overrides });

test("shared offer resolution requires the same product, strength, option, pack and warehouse", () => {
  const catalog = [
    { name: "Example", dose: "5 mg", noteLabel: "A", price: 11 },
    { name: "Example", dose: "10 mg", noteLabel: "A", price: 22 },
    { name: "Example", dose: "10 mg", noteLabel: "B", price: 33 },
    { name: "Example", dose: "10 mg", noteLabel: "A", warehouse: "us", price: 44, outOfStock: true },
    { name: "Example", dose: "10 mg", noteLabel: "A", warehouse: "us", vials: 5, price: 55 },
  ].map(Object.freeze);
  const selection = { name: " example ", dose: "10mg", noteLabel: "a", warehouse: "worldwide", vials: 10 };
  assert.equal(resolveWarehouseOffer(catalog, selection), catalog[1]);
  assert.equal(resolveWarehouseOffer(catalog, { ...selection, warehouse: "us" }), catalog[3], "stock remains the caller's decision");
  assert.equal(resolveWarehouseOffer(catalog, { ...selection, warehouse: "us", vials: 5 }), catalog[4]);
  for (const changed of [
    { name: "Other" }, { dose: "20 mg" }, { noteLabel: "C" }, { vials: 5 },
    { dose: "5 mg", warehouse: "us" }, { noteLabel: "B", warehouse: "us" },
  ]) assert.equal(resolveWarehouseOffer(catalog, { ...selection, ...changed }), null);
  assert.equal(resolveWarehouseOffer(catalog, { ...selection, warehouse: undefined }), catalog[1]);
  assert.equal(resolveWarehouseOffer(catalog, { ...selection, warehouse: undefined, fromWarehouse: "us" }), catalog[3]);
});

test("shared selectors reject malformed warehouses and packs without coercing them", () => {
  for (const value of [undefined, "", "worldwide"]) assert.equal(normalizeWarehouse(value), "worldwide");
  assert.equal(normalizeWarehouse("us"), "us");
  for (const value of [null, false, 0, "US", "eu", {}, []]) {
    assert.equal(normalizeWarehouse(value), null);
    assert.equal(resolveWarehouseOffer(PRODUCTS, { ...item(), warehouse: value }), null);
  }
  assert.equal(normalizePackCount(undefined), 10);
  assert.equal(normalizePackCount(10), 10);
  for (const value of [null, false, 0, -1, 1.5, "10", "", {}, [], NaN, Infinity]) {
    assert.equal(normalizePackCount(value), null);
    assert.equal(resolveWarehouseOffer(PRODUCTS, { ...item(), vials: value }), null);
  }
});

test("server cannot turn a US-only strength into a worldwide offer", () => {
  const dsip = { name: "DSIP", dose: "10 mg", quantity: 1 };
  for (const fromWarehouse of [undefined, ""]) {
    assert.equal(findCatalogProduct({ ...dsip, fromWarehouse }), null);
    assert.throws(() => validateAndPriceItems([{ ...dsip, fromWarehouse }]), /no longer available/);
  }
  const result = validateAndPriceItems([{ ...dsip, fromWarehouse: "us" }]);
  assert.equal(result.usSubtotal, 175);
  assert.equal(result.regularSubtotal, 0);
  assert.equal(result.pricedItems[0].fromWarehouse, "us");
  for (const fromWarehouse of [false, 0, null, "worldwide", "regular", "US", "eu", {}, []]) {
    assert.equal(findCatalogProduct(item({ fromWarehouse })), null);
    assert.throws(() => validateAndPriceItems([item({ fromWarehouse })]), /Invalid product warehouse/);
  }
});

test("missing or sold-out exact warehouse offers never borrow a different strength or stock flag", () => {
  assert.throws(() => validateAndPriceItems([item({ dose: "5 mg", fromWarehouse: "us" })]), /no longer available/);
  const retatrutide = { name: "Retatrutide / GLP-3", dose: "5 mg", quantity: 1 };
  assert.equal(validateAndPriceItems([retatrutide]).subtotal, 109);
  assert.throws(() => validateAndPriceItems([{ ...retatrutide, fromWarehouse: "us" }]), /out of stock/);
});

test("server rejects unsupported packs and preserves old ten-vial snapshot shape", () => {
  const original = item({ price: 0.01 });
  const before = structuredClone(original);
  const expected = validateAndPriceItems([original]);
  assert.deepEqual(validateAndPriceItems([{ ...original, vials: 10 }]), expected);
  assert.equal(Object.hasOwn(expected.pricedItems[0], "vials"), false, "open invoice item snapshots remain compatible");
  assert.deepEqual(original, before);
  for (const vials of [1, 5, 20, null, false, "10", 0, -1, 1.5, {}, []]) {
    assert.equal(findCatalogProduct(item({ vials })), null);
    assert.throws(() => validateAndPriceItems([item({ vials })]), /pack size|no longer available/);
  }
});

test("prices stay authoritative and product option aliases retain their existing meaning", () => {
  assert.equal(validateAndPriceItems([item({ price: 0.01 })]).subtotal, 139);
  assert.equal(validateAndPriceItems([item({ price: 0.01, fromWarehouse: "us" })]).subtotal, 179);
  const cjc = { name: "CJC-1295", dose: "5 mg", quantity: 1, price: 0.01 };
  assert.equal(validateAndPriceItems([{ ...cjc, noteLabel: "with/d" }]).subtotal, 319);
  assert.equal(validateAndPriceItems([{ ...cjc, noteLabel: "no/d" }]).subtotal, 169);
  assert.throws(() => validateAndPriceItems([cjc]), /no longer available/);
  assert.equal(findCatalogProduct({ name: "Tirzepatide", dose: "10mg" })?.name, "Tirzepatide / GLP-2");
});
