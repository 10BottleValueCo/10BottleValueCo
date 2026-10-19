import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "./_catalog.js";

test("server catalog matches current storefront prices and stock", () => {
  const appPath = fileURLToPath(
    new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url),
  );
  const source = readFileSync(appPath, "utf8");
  const marker = "const PRODUCTS_BASE = [";
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, "PRODUCTS_BASE source marker exists");
  const start = source.indexOf("[", markerIndex);
  const end = source.indexOf("\n];", start);
  assert.notEqual(end, -1, "PRODUCTS_BASE array closes");
  const storefrontProducts = Function(
    `return (${source.slice(start, end + 2)})`,
  )();
  const usInStockOffers = new Set([
    "GHK-CU|50 mg",
    "GHK-CU|100 mg",
    "Retatrutide / GLP-3|10 mg",
    "Retatrutide / GLP-3|30 mg",
    "Retatrutide / GLP-3|50 mg",
    "Retatrutide / GLP-3|60 mg",
    "BPC-157|10 mg",
    "BPC-157|5 mg",
    "KLOW80|80 mg",
    "Tirzepatide / GLP-2|10 mg",
    "Tirzepatide / GLP-2|20 mg",
    "Tirzepatide / GLP-2|30 mg",
    "Tirzepatide / GLP-2|40 mg",
    "Tirzepatide / GLP-2|50 mg",
    "Tirzepatide / GLP-2|60 mg",
    "MOTS-C|10 mg",
    "MOTS-C|20 mg",
    "MOTS-C|40 mg",
    "Tesamorelin|10 mg",
    "Tesamorelin|20 mg",
    "Selank|10 mg",
    "Melanotan-1|10 mg",
    "Semax|10 mg",
    "5-Amino-1MQ|50 mg",
    "CJC-1295|5 mg|with/d",
    "CJC-1295|10 mg|no/d",
    "PT-141|10 mg",
    "TB-500 + BPC-157|10 mg",
    "TB-500 + BPC-157|20 mg",
    "CJC-1295 + Ipamorelin|10 mg each|no/d",
    "NAD+|500 mg",
    "NAD+|1000 mg",
    "Ipamorelin|5 mg",
    "SS-31|10 mg",
    "KPV|5 mg",
    "BAC Water|10 ml",
  ]);
  for (const product of storefrontProducts) {
    if (product.warehouse === "us") {
      const offerKey = `${product.name}|${product.dose}${product.noteLabel ? `|${product.noteLabel}` : ""}`;
      product.outOfStock = !usInStockOffers.has(offerKey);
    }
  }

  const tuple = (product) => [
    product.name,
    product.dose,
    product.price,
    product.usPriceBase ?? null,
    product.warehouse ?? "",
    product.noteLabel ?? "",
    Boolean(product.outOfStock),
  ];
  assert.deepEqual(PRODUCTS.map(tuple), storefrontProducts.map(tuple));
});
