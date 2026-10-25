import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import middleware from "../middleware.js";
import { PRODUCT_SEO_PATHS } from "../seo-product-routes.js";
import { productSlugs } from "../artifacts/10-bottle-value/src/productNames.js";

const families = [
  ["Semaglutide", "5 mg", "/semaglutide-5mg"],
  ["Tirzepatide / GLP-2", "20 mg", "/tirzepatide-20mg"],
  ["Retatrutide / GLP-3", "50 mg", "/retatrutide-50mg"],
  ["Cagrilintide + Semaglutide", "10 mg each", "/cagrilintide-semaglutide-10mgeach"],
];

test("every restored compound and prior label route shares one canonical destination", async () => {
  for (const [name, dose, canonical] of families) {
    for (const slug of productSlugs({ name, dose })) {
      const path = `/${slug}`;
      assert.equal(PRODUCT_SEO_PATHS.has(path), true, `generated edge routes include ${path}`);
      if (path === canonical) continue;
      const result = await middleware(new Request(`https://10bottlevalue.co${path}?warehouse=us&pack=2&c=friend`));
      assert.equal(result.status, 308);
      assert.equal(result.headers.get("location"), `https://10bottlevalue.co${canonical}?warehouse=us&pack=2&c=friend`);
    }
  }
});

test("legacy query URLs and trailing slashes retain selection and referral parameters", async () => {
  for (const source of ["/?product=glp-tz-2-20mg&warehouse=us&c=friend", "/tirzepatide-glp-2-20mg/?warehouse=us&c=friend"]) {
    const result = await middleware(new Request(`https://10bottlevalue.co${source}`));
    assert.equal(result.status, 308);
    assert.equal(result.headers.get("location"), "https://10bottlevalue.co/tirzepatide-20mg?warehouse=us&c=friend");
  }
});

test("compound pages inject compound canonicals without another alias redirect", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    return new Response('<html><head><link rel="canonical" href="https://10bottlevalue.co/" /></head></html>');
  });
  for (const [, , canonical] of families) {
    const result = await middleware(new Request(`https://10bottlevalue.co${canonical}`));
    assert.equal(result.status, 200);
    assert.match(await result.text(), new RegExp(`href="https://10bottlevalue\\.co${canonical}"`));
  }
  assert.deepEqual(calls, Array(families.length).fill("https://10bottlevalue.co/index.html"));
});

test("sitemap publishes restored compound URLs and generated edge routes retain all sitemap entries", () => {
  const xml = readFileSync(new URL("../artifacts/10-bottle-value/public/sitemap.xml", import.meta.url), "utf8");
  const paths = [...xml.matchAll(/<loc>https:\/\/10bottlevalue\.co([^<]*)<\/loc>/g)].map(match => match[1]);
  for (const [, , canonical] of families) assert.ok(paths.includes(canonical), canonical);
  for (const path of paths.filter(path => path !== "/")) assert.ok(PRODUCT_SEO_PATHS.has(path), path);
  assert.doesNotMatch(xml, /\/(?:glp-(?:1-s|2-t|3-r|sg-1|tz-2|rt-3)|tirzepatide-glp-2|retatrutide-glp-3|cagrilintide-glp-(?:1-s|sg-1))-/);
});
