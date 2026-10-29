// Email display only. Catalog lookups, pricing, and stored order items keep their original names.
const displayNames = {
  semaglutide: "Semaglutide",
  "glp-1-s": "Semaglutide",
  "glp sg-1": "Semaglutide",
  "tirzepatide / glp-2": "Tirzepatide",
  tirzepatide: "Tirzepatide",
  "glp-2-t": "Tirzepatide",
  "glp tz-2": "Tirzepatide",
  "retatrutide / glp-3": "Retatrutide",
  retatrutide: "Retatrutide",
  "glp-3-r": "Retatrutide",
  "glp rt-3": "Retatrutide",
  "cagrilintide + semaglutide": "Cagrilintide + Semaglutide",
  "cagrilintide + glp-1-s": "Cagrilintide + Semaglutide",
  "cagrilintide + glp sg-1": "Cagrilintide + Semaglutide",
};

export function publicProductName(name) {
  const original = String(name || "");
  return displayNames[original.trim().toLowerCase()] || original;
}
