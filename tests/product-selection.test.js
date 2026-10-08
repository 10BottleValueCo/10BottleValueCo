import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  resolveProductRoute,
  resolveProductSelection,
  productSelectionPath,
  isProductRoute,
} from "../artifacts/10-bottle-value/src/product-selection.js";

const app = readFileSync(
  new URL("../artifacts/10-bottle-value/src/App.jsx", import.meta.url),
  "utf8",
);
const catalogLiteral = app.match(
  /const PRODUCTS_BASE = (\[[\s\S]*?\]);\s*\/\/ CATALOG_DATA_END/,
)[1];
const catalog = new Function(`return (${catalogLiteral});`)();
const route = (path) => new URL(path, "https://fixture.test");

test("US warehouse, dose, price and COA identity survive link copy and reload", () => {
  for (const entry of catalog) {
    const selected = resolveProductSelection(catalog, entry);
    assert.ok(selected, `${entry.name} ${entry.dose}`);
    const reopened = resolveProductRoute(
      catalog,
      route(productSelectionPath(selected)),
    );
    assert.deepEqual(reopened, selected);
  }
  const us = resolveProductRoute(catalog, route("/bpc-157-10mg?warehouse=us"));
  assert.equal(us.fromWarehouse, "us");
  assert.equal(us.price, 179);
  assert.equal(
    resolveProductRoute(catalog, route("/bpc-157-10mg?warehouse=worldwide"))
      .price,
    139,
  );
});

test("dose and warehouse switches resolve fresh catalog prices rather than stale selected values", () => {
  const us = resolveProductRoute(catalog, route("/glp-3-r-10mg?warehouse=us"));
  const higherDose = resolveProductSelection(catalog, {
    ...us,
    dose: "20 mg",
    price: 1,
  });
  assert.equal(higherDose.price, 285);
  assert.equal(higherDose.fromWarehouse, "us");
  const worldwide = resolveProductSelection(catalog, higherDose, "worldwide");
  assert.equal(worldwide.price, 259);
  assert.equal(worldwide.fromWarehouse, undefined);
});

test("explicit invalid or unavailable warehouse, dose, variant and pack never silently fall back", () => {
  for (const url of [
    "/bpc-157-5mg?warehouse=us",
    "/bpc-157-10mg?warehouse=moon",
    "/bpc-157-10mg?warehouse=us&variant=wrong",
    "/bpc-157-10mg?warehouse=worldwide&vials=1",
    "/bpc-157-10mg?vials=bad",
  ]) {
    assert.equal(resolveProductRoute(catalog, route(url)), null, url);
    assert.equal(isProductRoute(catalog, route(url)), true);
  }
});

test("CJC note variants remain distinct even where the old slug collides", () => {
  for (const noteLabel of ["with/d", "no/d"]) {
    const selected = resolveProductSelection(catalog, {
      name: "CJC-1295",
      dose: "5 mg",
      noteLabel,
    });
    assert.ok(selected);
    assert.equal(
      resolveProductRoute(catalog, route(productSelectionPath(selected)))
        .noteLabel,
      noteLabel,
    );
  }
});

test("legacy query and historical name links resolve while attribution survives canonical links", () => {
  const legacy = resolveProductRoute(
    catalog,
    route("/?product=retatrutide-glp-3-10mg&c=fixture"),
  );
  assert.equal(legacy.name, "Retatrutide / GLP-3");
  assert.equal(legacy.fromWarehouse, undefined);
  const url = route(
    productSelectionPath(
      legacy,
      "?c=fixture&utm_source=mail&payment=success&price=1",
    ),
  );
  assert.equal(url.searchParams.get("c"), "fixture");
  assert.equal(url.searchParams.get("utm_source"), "mail");
  assert.equal(url.searchParams.has("payment"), false);
  assert.equal(url.searchParams.has("price"), false);
  assert.equal(url.searchParams.get("warehouse"), "worldwide");
});

test("out-of-stock selections retain their catalog availability after reload", () => {
  const selected = resolveProductRoute(
    catalog,
    route("/sermorelin-5mg?warehouse=worldwide"),
  );
  assert.equal(selected.outOfStock, true);
  assert.equal(
    resolveProductRoute(catalog, route(productSelectionPath(selected)))
      .outOfStock,
    true,
  );
});

test("BPC-157 5 mg cannot display the known 10 mg certificate as its own", () => {
  const five = resolveProductRoute(
    catalog,
    route("/bpc-157-5mg?warehouse=worldwide"),
  );
  assert.deepEqual(five.coaImages, []);
  assert.equal(five.coaPdf, undefined);
  const ten = resolveProductRoute(
    catalog,
    route("/bpc-157-10mg?warehouse=worldwide"),
  );
  assert.equal(ten.coaPdf, "coa-bpc157-10mg.pdf");
  assert.deepEqual(ten.coaImages, ["coa-bpc157-10mg-p1.png"]);
});

test("verified 50 mg Epitalon and 500 mg NAD reports are suppressed on weaker selections only", () => {
  for (const path of [
    "/epitalon-10mg?warehouse=worldwide",
    "/epitalon-10mg?warehouse=us",
    "/nad--100mg?warehouse=worldwide",
  ]) {
    const selected = resolveProductRoute(catalog, route(path));
    assert.ok(selected, path);
    assert.deepEqual(selected.coaImages, [], path);
    assert.equal(selected.coaPdf, undefined, path);
  }
  for (const [path, file] of [
    ["/epitalon-50mg?warehouse=worldwide", "coa-epitalon-50mg.pdf"],
    ["/nad--500mg?warehouse=worldwide", "coa-nad-500mg.pdf"],
    ["/nad--500mg?warehouse=us", "coa-nad-500mg.pdf"],
  ]) {
    const selected = resolveProductRoute(catalog, route(path));
    assert.equal(selected.coaPdf, file, path);
    assert.ok(selected.coaImages.length, path);
  }
});

test("narrow COA containment preserves a later correctly supplied strength report", () => {
  const replacement = {
    name: "Epitalon",
    dose: "10 mg",
    price: 95,
    coaPdf: "coa-epitalon-10mg.pdf",
    coaImages: ["coa-epitalon-10mg-p1.png"],
  };
  const selected = resolveProductSelection([replacement], replacement);
  assert.equal(selected.coaPdf, replacement.coaPdf);
  assert.deepEqual(selected.coaImages, replacement.coaImages);
});
