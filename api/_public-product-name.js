// Email display only. Catalog lookups, pricing, and stored order items keep their original names.
const displayNames = {
  semaglutide: "GLP-1-S",
  "tirzepatide / glp-2": "GLP-2-T",
  tirzepatide: "GLP-2-T",
  "retatrutide / glp-3": "GLP-3-R",
  retatrutide: "GLP-3-R",
  "cagrilintide + semaglutide": "Cagrilintide + GLP-1-S",
};

export function publicProductName(name) {
  const original = String(name || "");
  return displayNames[original.trim().toLowerCase()] || original;
}