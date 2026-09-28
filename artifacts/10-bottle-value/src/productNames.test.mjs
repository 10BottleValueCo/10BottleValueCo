import assert from "node:assert/strict";
import { test } from "node:test";
import { catalogProductName, matchesProductSearch, matchesProductSlug, productSlug, publicProductName } from "./productNames.js";

const renamed = [
  ["BAC Water", "Reconstitution Solution", "3 ml", "bac-water-3ml", "reconstitution-solution-3ml"],
  ["BAC Water", "Reconstitution Solution", "10 ml", "bac-water-10ml", "reconstitution-solution-10ml"],
  ["Semaglutide", "GLP-1-S", "5 mg", "semaglutide-5mg", "glp-1-s-5mg"],
  ["Tirzepatide / GLP-2", "GLP-2-T", "20 mg", "tirzepatide-glp-2-20mg", "glp-2-t-20mg"],
  ["Retatrutide / GLP-3", "GLP-3-R", "10 mg", "retatrutide-glp-3-10mg", "glp-3-r-10mg"],
  ["Cagrilintide + Semaglutide", "Cagrilintide + GLP-1-S", "10 mg", "cagrilintide-semaglutide-10mg", "cagrilintide-glp-1-s-10mg"],
];

for (const [catalogName, displayName, dose, oldSlug, newSlug] of renamed) {
  test(`${catalogName} keeps its catalog identity while displaying ${displayName}`, () => {
    assert.equal(publicProductName(catalogName), displayName);
    assert.equal(catalogProductName(displayName), catalogName);
    assert.equal(productSlug({ name: catalogName, dose }), newSlug);
    assert.equal(productSlug({ name: catalogName, dose }, true), oldSlug);
  });
}

test("the blend's old each URLs still resolve to the corrected 10 mg product", () => {
  const blend = { name: "Cagrilintide + Semaglutide", dose: "10 mg" };
  assert.equal(matchesProductSlug(blend, "cagrilintide-glp-1-s-10mg"), true);
  assert.equal(matchesProductSlug(blend, "cagrilintide-semaglutide-10mg"), true);
  assert.equal(matchesProductSlug(blend, "cagrilintide-glp-1-s-10mgeach"), true);
  assert.equal(matchesProductSlug(blend, "cagrilintide-semaglutide-10mgeach"), true);
  assert.equal(matchesProductSlug(blend, "cagrilintide-glp-1-s-5mg"), false);
});

test("legacy short names and unrelated products remain compatible", () => {
  assert.equal(publicProductName("Bacteriostatic Water"), "Reconstitution Solution");
  assert.equal(publicProductName("Retatrutide"), "GLP-3-R");
  assert.equal(catalogProductName("Retatrutide"), "Retatrutide / GLP-3");
  assert.equal(catalogProductName("Tirzepatide"), "Tirzepatide / GLP-2");
  assert.equal(publicProductName("BPC-157"), "BPC-157");
});

test("search matches the displayed GLP name immediately followed by the dose", () => {
  const reta = { name: "Retatrutide / GLP-3", dose: "50 mg", total: "500 mg total" };
  assert.equal(matchesProductSearch(reta, "GLP-3-R 50 mg"), true);
  assert.equal(matchesProductSearch(reta, "GLP-3-R 5 mg"), false);
  assert.equal(matchesProductSearch(reta, "Retatrutide / GLP-3 50 mg"), true);
  assert.equal(matchesProductSearch({ name: "Semaglutide", dose: "5 mg" }, "GLP-1-S 5 mg"), true);
  assert.equal(matchesProductSearch({ name: "Tirzepatide / GLP-2", dose: "20 mg" }, "GLP-2-T 20 mg"), true);
  assert.equal(matchesProductSearch({ name: "Melanotan2", dose: "10 mg" }, "mt2"), true);
});

test("reconstitution solution can be found by its new and former names", () => {
  const solution = { name: "BAC Water", dose: "3 ml", total: "30 ml total" };
  assert.equal(matchesProductSearch(solution, "Reconstitution Solution 3 ml"), true);
  assert.equal(matchesProductSearch(solution, "BAC Water 3 ml"), true);
  assert.equal(matchesProductSearch(solution, "Reconstitution Solution 10 ml"), false);
});