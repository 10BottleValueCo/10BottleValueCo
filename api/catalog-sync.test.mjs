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
