import { productSlug } from "./productNames.js";

export function productWarehouse(product) {
  return product?.fromWarehouse === "us" || product?.warehouse === "us"
    ? "us"
    : "worldwide";
}

function selectCatalogEntry(product) {
  if (!product) return null;
  // Suppress only known strength-mismatched files. The Epitalon and NAD+
  // PDF label claims were read and visually verified; replacements must be
  // real certificates supplied for the selected strength, never guessed.
  const mismatchedCoaFile = {
    "BPC-157|5 mg": /^coa-bpc157-10mg(?:-p\d+)?\.(?:png|pdf)$/i,
    "Epitalon|10 mg": /^coa-epitalon-50mg(?:-p\d+)?\.(?:png|pdf)$/i,
    "NAD+|100 mg": /^coa-nad-500mg(?:-p\d+)?\.(?:png|pdf)$/i,
  }[`${product.name}|${product.dose}`];
  if (mismatchedCoaFile) {
    const wrongStrengthFile = (path) =>
      mismatchedCoaFile.test(String(path || ""));
    product = {
      ...product,
      coaImages: (product.coaImages || []).filter(
        (path) => !wrongStrengthFile(path),
      ),
      coaPdf: wrongStrengthFile(product.coaPdf) ? undefined : product.coaPdf,
    };
  }
  if (product.warehouse === "us") {
    // Preserve the established public catalog price rule used by checkout.
    const price = (product.usPriceBase ?? product.price) + 5;
    return { ...product, price, originalPrice: price, fromWarehouse: "us" };
  }
  const { fromWarehouse: _warehouse, ...selected } = product;
  return selected;
}

function matchingIdentity(product, selection) {
  return (
    product.name === selection.name &&
    product.dose === selection.dose &&
    (product.noteLabel || "") === (selection.noteLabel || "") &&
    Number(product.vials || 10) === Number(selection.vials || 10)
  );
}

export function resolveProductSelection(
  catalog,
  selection,
  warehouse = productWarehouse(selection),
) {
  if (!selection || !["us", "worldwide"].includes(warehouse)) return null;
  const product = catalog.find(
    (entry) =>
      matchingIdentity(entry, selection) &&
      productWarehouse(entry) === warehouse,
  );
  return selectCatalogEntry(product);
}

function routeParts(location) {
  const params = new URLSearchParams(location.search || "");
  const path = String(location.pathname || "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
  return {
    params,
    slug:
      path ||
      String(params.get("product") || "")
        .trim()
        .toLowerCase(),
  };
}

export function isProductRoute(catalog, location) {
  const { slug } = routeParts(location);
  return Boolean(
    slug &&
    catalog.some(
      (product) =>
        slug === productSlug(product) || slug === productSlug(product, true),
    ),
  );
}

export function resolveProductRoute(catalog, location) {
  const { params, slug } = routeParts(location);
  if (!slug) return null;
  const warehouse = params.get("warehouse");
  if (warehouse !== null && !["worldwide", "us"].includes(warehouse))
    return null;
  const pack = params.get("vials");
  if (pack !== null && !/^[1-9]\d*$/.test(pack)) return null;
  const matches = catalog.filter(
    (product) =>
      (slug === productSlug(product) || slug === productSlug(product, true)) &&
      (warehouse === null || productWarehouse(product) === warehouse) &&
      (!params.has("variant") ||
        (product.noteLabel || "") === params.get("variant")) &&
      Number(product.vials || 10) === Number(pack || 10),
  );
  // Older shared links omitted the warehouse and note variant. Keep their
  // worldwide-first behavior, then write the complete selection into the URL.
  const selected =
    warehouse === null
      ? matches.find((product) => productWarehouse(product) === "worldwide") ||
        matches[0]
      : matches[0];
  return selectCatalogEntry(selected);
}

export function productSelectionPath(product, search = "", affiliateCode = "") {
  const previous = new URLSearchParams(search);
  const params = new URLSearchParams();
  for (const key of [
    "c",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ]) {
    if (previous.has(key)) params.set(key, previous.get(key));
  }
  params.set("warehouse", productWarehouse(product));
  if (product.noteLabel) params.set("variant", product.noteLabel);
  if (Number(product.vials || 10) !== 10)
    params.set("vials", String(product.vials));
  if (affiliateCode)
    params.set("c", String(affiliateCode).trim().toLowerCase());
  return `/${productSlug(product)}?${params.toString()}`;
}
