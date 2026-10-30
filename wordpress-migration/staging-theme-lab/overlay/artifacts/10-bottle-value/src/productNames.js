// Keep prior customer-facing names searchable and addressable after restoring
// compound names. Catalog selectors and stored order items retain their identity.
const compoundNames = {
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

const compoundAliases = {
  Semaglutide: ["Semaglutide", "GLP-1-S", "GLP SG-1"],
  Tirzepatide: ["Tirzepatide", "Tirzepatide / GLP-2", "GLP-2-T", "GLP TZ-2"],
  Retatrutide: ["Retatrutide", "Retatrutide / GLP-3", "GLP-3-R", "GLP RT-3"],
  "Cagrilintide + Semaglutide": ["Cagrilintide + Semaglutide", "Cagrilintide + GLP-1-S", "Cagrilintide + GLP SG-1"],
};

const labelNames = {
  "bac water": "Reconstitution Solution",
  "ara290 (cibinetide)": "ARA290",
  epitalon: "Epithalon",
};

const catalogNames = {
  "mt-2": "Melanotan-2",
  mt2: "Melanotan-2",
  melanotan2: "Melanotan-2",
  "melanotan 2": "Melanotan-2",
  "mt-1": "Melanotan-1",
  mt1: "Melanotan-1",
  "mt 1": "Melanotan-1",
  "melanotan i": "Melanotan-1",
  "reconstitution solution": "BAC Water",
  ara290: "ARA290 (Cibinetide)",
  "cagrilintide + glp sg-1": "Cagrilintide + Semaglutide",
  "glp sg-1": "Semaglutide",
  "glp tz-2": "Tirzepatide / GLP-2",
  "glp rt-3": "Retatrutide / GLP-3",
  epithalon: "Epitalon",
  "glp-1-s": "Semaglutide",
  "glp-2-t": "Tirzepatide / GLP-2",
  "glp-3-r": "Retatrutide / GLP-3",
  "cagrilintide + glp-1-s": "Cagrilintide + Semaglutide",
  tirzepatide: "Tirzepatide / GLP-2",
  retatrutide: "Retatrutide / GLP-3",
};

export function publicProductName(name) {
  const original = String(name || "");
  const key = original.trim().toLowerCase();
  return compoundNames[key] || labelNames[key] || original;
}

export function catalogProductName(name) {
  const original = String(name || "");
  return catalogNames[original.trim().toLowerCase()] || original;
}

export function productSlug(product, legacy = false) {
  const original = String(product.name || "");
  const name = legacy
    ? original
    : compoundNames[original.trim().toLowerCase()] || original;
  return slugForName(name, product.dose);
}

function slugForName(name, dose) {
  return `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(dose || "").toLowerCase().replace(/\s+/g, "")}`;
}

export function productSlugs(product) {
  const compound = compoundNames[String(product.name || "").trim().toLowerCase()];
  return [...new Set([
    productSlug(product),
    productSlug(product, true),
    ...(compoundAliases[compound] || []).map((name) => slugForName(name, product.dose)),
  ])];
}

export function matchesProductSearch(product, searchTerm) {
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
  const aliases = {
    mt: "melanotan",
    mt1: "melanotan1",
    "mt-1": "melanotan1",
    mt2: "melanotan2",
    "mt-2": "melanotan2",
    "melanotan-2": "melanotan2",
  };
  const query = aliases[normalize(searchTerm)] || normalize(searchTerm);
  const publicName = publicProductName(product.name);
  const oldDisplayNames = compoundAliases[publicName] || [];
  const searchValues = [
    `${publicName} ${product.dose}`,
    ...oldDisplayNames.map((name) => `${name} ${product.dose}`),
    `${product.name} ${product.dose}`,
    publicName,
    ...oldDisplayNames,
    product.name,
    product.dose,
    product.total,
    product.note,
  ];
  if (product.name === "Melanotan-1") searchValues.push("Melanotan1", "Melanotan I", "MT1", "MT-1");
  if (product.name === "Melanotan-2") searchValues.push("Melanotan2", "MT-2");
  return searchValues.some((value) => normalize(value).includes(query));
}
