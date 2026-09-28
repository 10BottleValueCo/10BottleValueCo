const displayNames = {
  "bac water": "Reconstitution Solution",
  "bacteriostatic water": "Reconstitution Solution",
  semaglutide: "GLP-1-S",
  "tirzepatide / glp-2": "GLP-2-T",
  tirzepatide: "GLP-2-T",
  "retatrutide / glp-3": "GLP-3-R",
  retatrutide: "GLP-3-R",
  "cagrilintide + semaglutide": "Cagrilintide + GLP-1-S",
};

const catalogNames = {
  "reconstitution solution": "BAC Water",
  "glp-1-s": "Semaglutide",
  "glp-2-t": "Tirzepatide / GLP-2",
  "glp-3-r": "Retatrutide / GLP-3",
  "cagrilintide + glp-1-s": "Cagrilintide + Semaglutide",
  tirzepatide: "Tirzepatide / GLP-2",
  retatrutide: "Retatrutide / GLP-3",
};

export function publicProductName(name) {
  const original = String(name || "");
  return displayNames[original.trim().toLowerCase()] || original;
}

export function catalogProductName(name) {
  const original = String(name || "");
  return catalogNames[original.trim().toLowerCase()] || original;
}

export function productSlug(product, legacy = false) {
  const name = legacy ? product.name : publicProductName(product.name);
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${product.dose.toLowerCase().replace(/\s+/g, "")}`;
}

export function matchesProductSlug(product, slug) {
  if (slug === productSlug(product) || slug === productSlug(product, true)) return true;
  // Both pre-correction URLs remain valid for previously shared links.
  return product.name === "Cagrilintide + Semaglutide" &&
    product.dose === "10 mg" &&
    (slug === "cagrilintide-glp-1-s-10mgeach" ||
      slug === "cagrilintide-semaglutide-10mgeach");
}

export function matchesProductSearch(product, searchTerm) {
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
  const aliases = { mt: "melanotan", mt1: "melanotan1", mt2: "melanotan2" };
  const query = aliases[normalize(searchTerm)] || normalize(searchTerm);
  const publicName = publicProductName(product.name);
  return [
    `${publicName} ${product.dose}`,
    `${product.name} ${product.dose}`,
    publicName,
    product.name,
    product.dose,
    product.total,
    product.note,
  ].some((value) => normalize(value).includes(query));
}