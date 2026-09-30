const legacySlugNames = {
  semaglutide: "GLP-1-S",
  "tirzepatide / glp-2": "GLP-2-T",
  tirzepatide: "GLP-2-T",
  "retatrutide / glp-3": "GLP-3-R",
  retatrutide: "GLP-3-R",
  "cagrilintide + semaglutide": "Cagrilintide + GLP-1-S",
};

const labelNames = {
  "bac water": "Reconstitution Solution",
  "ara290 (cibinetide)": "ARA290",
  "cagrilintide + semaglutide": "Cagrilintide + GLP SG-1",
  semaglutide: "GLP SG-1",
  "tirzepatide / glp-2": "GLP TZ-2",
  tirzepatide: "GLP TZ-2",
  "retatrutide / glp-3": "GLP RT-3",
  retatrutide: "GLP RT-3",
};

const catalogNames = {
  "reconstitution solution": "BAC Water",
  ara290: "ARA290 (Cibinetide)",
  "cagrilintide + glp sg-1": "Cagrilintide + Semaglutide",
  "glp sg-1": "Semaglutide",
  "glp tz-2": "Tirzepatide / GLP-2",
  "glp rt-3": "Retatrutide / GLP-3",
  "glp-1-s": "Semaglutide",
  "glp-2-t": "Tirzepatide / GLP-2",
  "glp-3-r": "Retatrutide / GLP-3",
  "cagrilintide + glp-1-s": "Cagrilintide + Semaglutide",
  tirzepatide: "Tirzepatide / GLP-2",
  retatrutide: "Retatrutide / GLP-3",
};

export function publicProductName(name) {
  const original = String(name || "");
  return labelNames[original.trim().toLowerCase()] || original;
}

export function catalogProductName(name) {
  const original = String(name || "");
  return catalogNames[original.trim().toLowerCase()] || original;
}

export function productSlug(product, legacy = false) {
  const name = legacy
    ? product.name
    : legacySlugNames[String(product.name || "").trim().toLowerCase()] || product.name;
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${product.dose.toLowerCase().replace(/\s+/g, "")}`;
}

export function matchesProductSearch(product, searchTerm) {
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
  const aliases = { mt: "melanotan", mt1: "melanotan1", mt2: "melanotan2" };
  const query = aliases[normalize(searchTerm)] || normalize(searchTerm);
  const publicName = publicProductName(product.name);
  const oldDisplayName = legacySlugNames[String(product.name || "").trim().toLowerCase()];
  return [
    `${publicName} ${product.dose}`,
    oldDisplayName && `${oldDisplayName} ${product.dose}`,
    `${product.name} ${product.dose}`,
    publicName,
    oldDisplayName,
    product.name,
    product.dose,
    product.total,
    product.note,
  ].some((value) => normalize(value).includes(query));
}