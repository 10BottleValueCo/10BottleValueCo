import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";

function renderComponent(filename, props) {
  const url = new URL(`../artifacts/10-bottle-value/src/components/${filename}`, import.meta.url);
  const componentRequire = createRequire(url);
  const viteRequire = createRequire(componentRequire.resolve("vite"));
  const { transformSync } = viteRequire("esbuild");
  const compiled = transformSync(readFileSync(url, "utf8"), {
    loader: "jsx", format: "cjs", jsx: "automatic",
    define: { "import.meta.env.BASE_URL": '"/"' },
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require(name) {
      if (name.endsWith(".css")) return {};
      if (name === "react") return {
        ...componentRequire("react"),
        useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
      };
      return componentRequire(name);
    },
  });
  return module.exports.default({ tx: (en) => en, ...props });
}

function images(tree) {
  if (Array.isArray(tree)) return tree.flatMap(images);
  if (!tree || typeof tree !== "object" || !tree.props) return [];
  return [...(tree.type === "img" ? [tree] : []), ...images(tree.props.children)];
}

test("Affiliate hero retains native artwork, priority and retry without load-time recaching", () => {
  const retry = () => {};
  const tree = renderComponent("AffiliateProgramPage.jsx", {
    onVialImageLoad: () => assert.fail("Successful image load must not recache"),
    onVialImageError: retry,
  });
  const hero = images(tree).filter((image) => image.props["data-original-src"]);
  assert.deepEqual(hero.map((image) => image.props.src), [
    "/vials-c/tb-500-bpc-157-3ab3e8693952.webp",
    "/vials-c/bpc-157-4a596acd979f.webp",
    "/vials-c/retatrutide-glp-3-0efb04b0071d.webp",
  ]);
  for (const image of hero) {
    assert.equal(image.props.decoding, "async");
    assert.equal(image.props.fetchPriority, "high");
    assert.equal(image.props.loading, "eager");
    assert.equal(image.props["data-original-src"], image.props.src);
    assert.equal(image.props.onError, retry);
    assert.equal(image.props.onLoad, undefined);
  }
});

test("Shipping bonus retains all three vial images with async decode and no recache handler", () => {
  const tree = renderComponent("ShippingPricesPage.jsx", {
    onVialImageLoad: () => assert.fail("Successful image load must not recache"),
  });
  const vials = images(tree);
  assert.deepEqual(vials.map((image) => [image.props.alt, image.props.src]), [
    ["KPV", "/vials-c/kpv-3bda87926280.webp"],
    ["MOTS-C", "/vials-c/mots-c-ead676f909ff.webp"],
    ["DSIP", "/vials-c/dsip-0f74d3cf1e6a.webp"],
  ]);
  for (const image of vials) {
    assert.equal(image.props.decoding, "async");
    assert.equal(image.props.onLoad, undefined);
  }
});
