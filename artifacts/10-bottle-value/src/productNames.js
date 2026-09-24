const displayNames = {
  semaglutide: "GLP-1-S",
  "tirzepatide / glp-2": "GLP-2-T",
  tirzepatide: "GLP-2-T",
  "retatrutide / glp-3": "GLP-3-R",
  retatrutide: "GLP-3-R",
  "cagrilintide + semaglutide": "Cagrilintide + GLP-1-S",
};

const catalogNames = {
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