import assert from "node:assert/strict";
import { test } from "node:test";
import { PRODUCTS, findCatalogProduct, validateAndPriceItems } from "./_catalog.js";
import { legacyCheckoutQuote } from "./_legacy-checkout-quote.js";
import { normalizePackCount, normalizeWarehouse, resolveWarehouseOffer } from "../shared/warehouse-offer.js";

const item = overrides => ({ name: "BPC-157", dose: "10 mg", quantity: 1, ...overrides });

const worldwideOnlySupplierRows = [
  ["TB-500", "10 mg"],
  ["Retatrutide / GLP-3", "15 mg"],
  ["Tirzepatide / GLP-2", "15 mg"],
  ["Semax", "5 mg"],
  ["Selank", "5 mg"],
  ["Glutathione", "600 mg"],
  ["Glutathione", "1500 mg"],
];

test("supplier stock updates do not create US offers or borrow worldwide prices", () => {
  for (const [name, dose, noteLabel = ""] of worldwideOnlySupplierRows) {
    const selection = { name, dose, noteLabel, quantity: 1 };
    assert.ok(findCatalogProduct(selection), `${name} ${dose} remains in the worldwide catalog`);
    assert.doesNotThrow(() => validateAndPriceItems([selection]));
    assert.equal(
      findCatalogProduct({ ...selection, fromWarehouse: "us" }),
      null,
      `${name} ${dose} must not gain an unapproved US offer`,
    );
    assert.throws(
      () => validateAndPriceItems([{ ...selection, fromWarehouse: "us" }]),
      /no longer available/,
    );
  }
});

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

test("server keeps US-only strengths out of worldwide offers and enforces current US stock", () => {
  const dsip = { name: "DSIP", dose: "10 mg", quantity: 1 };
  for (const fromWarehouse of [undefined, ""]) {
    assert.equal(findCatalogProduct({ ...dsip, fromWarehouse }), null);
    assert.throws(() => validateAndPriceItems([{ ...dsip, fromWarehouse }]), /no longer available/);
  }
  assert.throws(() => validateAndPriceItems([{ ...dsip, fromWarehouse: "us" }]), /out of stock/);
  for (const fromWarehouse of [false, 0, null, "worldwide", "regular", "US", "eu", {}, []]) {
    assert.equal(findCatalogProduct(item({ fromWarehouse })), null);
    assert.throws(() => validateAndPriceItems([item({ fromWarehouse })]), /Invalid product warehouse/);
  }
});

test("missing or sold-out exact warehouse offers never borrow a different strength or stock flag", () => {
  assert.throws(() => validateAndPriceItems([item({ name: "AOD", dose: "10 mg", fromWarehouse: "us" })]), /no longer available/);
  const retatrutide = { name: "Retatrutide / GLP-3", dose: "5 mg", quantity: 1 };
  assert.equal(validateAndPriceItems([retatrutide]).subtotal, 109);
  for (const dose of ["5 mg", "20 mg", "40 mg"]) {
    assert.throws(
      () => validateAndPriceItems([{
        name: "Retatrutide / GLP-3",
        dose,
        quantity: 1,
        fromWarehouse: "us",
      }]),
      /out of stock/,
      `US Retatrutide ${dose} cannot be checked out`,
    );
  }
  for (const dose of ["50 mg", "60 mg"]) {
    assert.doesNotThrow(
      () => validateAndPriceItems([{
        name: "Retatrutide / GLP-3",
        dose,
        quantity: 1,
        fromWarehouse: "us",
      }]),
      `US Retatrutide ${dose} can be checked out`,
    );
  }
});

test("US stock matches the supplied warehouse table and cutoff; GLOW70 stays excluded", () => {
  const usOffer = (name, dose, noteLabel = "") =>
    PRODUCTS.find(
      (product) =>
        product.name === name &&
        product.dose === dose &&
        product.warehouse === "us" &&
        (product.noteLabel ?? "") === noteLabel,
    );

  const inventoryRows = [
    ["GHK-CU", "50 mg", 180],
    ["GHK-CU", "100 mg", 169],
    ["Retatrutide / GLP-3", "60 mg", 163],
    ["Retatrutide / GLP-3", "10 mg", 69],
    ["Retatrutide / GLP-3", "15 mg", 164],
    ["Retatrutide / GLP-3", "20 mg", 0],
    ["Retatrutide / GLP-3", "30 mg", 60],
    ["BPC-157", "10 mg", 137],
    ["BPC-157", "5 mg", 187],
    ["Glutathione", "600 mg", 197],
    ["Glutathione", "1500 mg", 151],
    ["KLOW80", "80 mg", 86],
    ["Tirzepatide / GLP-2", "10 mg", 139],
    ["Tirzepatide / GLP-2", "30 mg", 134],
    ["Tirzepatide / GLP-2", "60 mg", 157],
    ["MOTS-C", "10 mg", 158],
    ["MOTS-C", "20 mg", 72],
    ["MOTS-C", "40 mg", 183],
    ["Tesamorelin", "10 mg", 110],
    ["Tesamorelin", "20 mg", 154],
    ["Selank", "5 mg", 194],
    ["Selank", "10 mg", 180],
    ["Melanotan-1", "10 mg", 195],
    ["MOTS-C", "10 mg", 193],
    ["Semax", "5 mg", 194],
    ["Semax", "10 mg", 131],
    ["TB-500 + BPC-157", "10 mg", 177],
    ["TB-500 + BPC-157", "20 mg", 171],
    ["CJC-1295 + Ipamorelin", "10 mg each", 106, "no/d"],
    ["NAD+", "500 mg", 162],
    ["NAD+", "1000 mg", 164],
    ["Ipamorelin", "5 mg", 185],
    ["TB-500", "10 mg", 181],
    ["5-Amino-1MQ", "50 mg", 185],
    ["SS-31", "10 mg", 170],
    ["CJC-1295", "5 mg", 199, "with/d"],
    ["PT-141", "10 mg", 157],
    ["KPV", "5 mg", 186],
    ["CJC-1295", "10 mg", 195, "no/d"],
    ["BAC Water", "10 ml", 344],
    ["Tirzepatide / GLP-2", "15 mg", 173],
    ["Retatrutide / GLP-3", "40 mg", 31],
    ["Retatrutide / GLP-3", "50 mg", 175],
    ["Tirzepatide / GLP-2", "20 mg", 163],
    ["Tirzepatide / GLP-2", "40 mg", 174],
    ["Tirzepatide / GLP-2", "50 mg", 180],
  ];
  const expectedInStock = new Set();
  for (const [name, dose, count, noteLabel = ""] of inventoryRows) {
    const product = usOffer(name, dose, noteLabel);
    const hasNoApprovedUsOffer = worldwideOnlySupplierRows.some(
      ([worldwideName, worldwideDose, worldwideNoteLabel = ""]) =>
        name === worldwideName && dose === worldwideDose && noteLabel === worldwideNoteLabel,
    );
    if (hasNoApprovedUsOffer) {
      assert.equal(product, undefined, `${name} ${dose} must not be added from the supplier table`);
      continue;
    }
    assert.ok(product, `${name} ${dose} has a US offer`);
    assert.equal(
      Boolean(product.outOfStock),
      count < 50,
      `${name} ${dose} with ${count} units follows the 50-unit cutoff`,
    );
    if (count > 50) expectedInStock.add(`${name}|${dose}|${noteLabel}`);
  }

  const explicitlyRestoredHcg = usOffer("HCG", "5000 iu");
  assert.ok(explicitlyRestoredHcg, "HCG 5000 IU has an exact US offer");
  assert.equal(explicitlyRestoredHcg.outOfStock ?? false, false, "HCG 5000 IU was explicitly restored");
  expectedInStock.add("HCG|5000 iu|");

  const actualInStock = new Set(
    PRODUCTS
      .filter((product) => product.warehouse === "us" && !product.outOfStock)
      .map((product) => `${product.name}|${product.dose}|${product.noteLabel ?? ""}`),
  );
  assert.deepEqual([...actualInStock].sort(), [...expectedInStock].sort(), "unlisted US offers remain out of stock");

  const cjcIpaUs = usOffer("CJC-1295 + Ipamorelin", "10 mg each", "no/d");
  assert.ok(cjcIpaUs, "CJC + IPA has an exact US offer");
  assert.equal(cjcIpaUs.outOfStock ?? false, false, "the supplied image confirms this US kit is in stock");
  assert.equal(
    validateAndPriceItems([{
      name: "CJC-1295 + Ipamorelin",
      dose: "10 mg each",
      noteLabel: "no/d",
      quantity: 1,
      fromWarehouse: "us",
    }]).usSubtotal,
    239,
  );
  assert.equal(PRODUCTS.some((product) => /glow70/i.test(product.name)), false, "GLOW70 still needs a storefront price");
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

test("new US warehouse offers stay available at the supplied prices", () => {
  const additions = [
    ["MOTS-C", "20 mg", 215],
    ["Tesamorelin", "20 mg", 515],
    ["Melanotan-1", "10 mg", 135],
    ["KPV", "5 mg", 125],
    ["NAD+", "1000 mg", 283],
    ["BPC-157", "5 mg", 133],
    ["Tirzepatide / GLP-2", "20 mg", 189],
    ["Tirzepatide / GLP-2", "50 mg", 309],
    ["5-Amino-1MQ", "50 mg", 249],
    ["CJC-1295", "5 mg", 329, "with/d"],
    ["CJC-1295", "10 mg", 315, "no/d"],
    ["PT-141", "10 mg", 165],
  ];

  for (const [name, dose, expectedPrice, noteLabel = ""] of additions) {
    const offer = PRODUCTS.find(
      (product) =>
        product.name === name &&
        product.dose === dose &&
        product.warehouse === "us" &&
        (product.noteLabel ?? "") === noteLabel,
    );
    assert.ok(offer, `${name} ${dose} has a US offer`);
    assert.equal(offer.outOfStock ?? false, false, `${name} ${dose} is in stock`);
    assert.equal(
      validateAndPriceItems([{ name, dose, noteLabel, quantity: 1, fromWarehouse: "us" }]).usSubtotal,
      expectedPrice,
      `${name} ${dose} uses the requested checkout price`,
    );
  }
});

test("explicitly restored US HCG 5000 IU can be checked out at its catalog price", () => {
  const quote = validateAndPriceItems([{
    name: "HCG",
    dose: "5000 iu",
    quantity: 1,
    fromWarehouse: "us",
  }]);
  assert.equal(quote.usSubtotal, 209);
  assert.equal(quote.pricedItems[0].price, 209);
});

test("US Reconstitution Solution checkout quote matches its storefront price", () => {
  const quote = validateAndPriceItems([{
    name: "BAC Water",
    dose: "10 ml",
    quantity: 1,
    fromWarehouse: "us",
  }]);
  assert.equal(quote.subtotal, 49.99);
  assert.equal(quote.usSubtotal, 49.99);
  assert.equal(quote.pricedItems[0].price, 49.99);
});

test("legacy US checkout total matches the displayed Reconstitution Solution total", async () => {
  const quote = await legacyCheckoutQuote({
    items: [{ name: "BAC Water", dose: "10 ml", quantity: 1, fromWarehouse: "us" }],
    shippingType: "standard",
  }, "", { crypto: false });
  assert.equal(quote.total, 49.99);
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
