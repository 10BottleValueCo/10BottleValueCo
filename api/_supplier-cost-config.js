const MAX_BYTES = 100_000;
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const money = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1_000_000;

function costMap(value) {
  if (!isRecord(value) || Object.keys(value).length > 2_000) return null;
  const result = Object.create(null);
  for (const [key, amount] of Object.entries(value)) {
    if (!key.includes("|") || key.length > 200 || /[\x00-\x1f]/.test(key) || !money(amount)) return null;
    result[key] = amount;
  }
  return result;
}

function shippingRule(value) {
  if (value == null || money(value)) return { valid: true, rule: value ?? null };
  if (!isRecord(value) || !["productSubtotalBeforeDiscounts", "supplierProductCost"].includes(value.basis)
    || !Array.isArray(value.tiers) || !value.tiers.length || value.tiers.length > 20) return { valid: false };
  const tiers = [];
  for (const tier of value.tiers) {
    if (!isRecord(tier) || !money(tier.min) || !money(tier.amount) || typeof tier.minInclusive !== "boolean") return { valid: false };
    if (tiers.length === 0 ? tier.min !== 0 || !tier.minInclusive : tier.min <= tiers.at(-1).min) return { valid: false };
    tiers.push({ min: tier.min, minInclusive: tier.minInclusive, amount: tier.amount });
  }
  return { valid: true, rule: { basis: value.basis, tiers } };
}

// No merchant costs or assumed processing rates belong in this public repository.
// Configure server-only SUPPLIER_COSTS_JSON through the host's environment UI.
export function parseSupplierCostConfig(raw) {
  if (typeof raw !== "string" || Buffer.byteLength(raw, "utf8") > MAX_BYTES) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!isRecord(data) || data.currency !== "USD" || typeof data.version !== "string" || !data.version.trim() || data.version.length > 80) return null;
  if (typeof data.effectiveAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(data.effectiveAt) || !Number.isFinite(Date.parse(data.effectiveAt))) return null;
  const worldwide = costMap(data.worldwide);
  const us = costMap(data.us);
  if (!worldwide || !us) return null;
  const supplierShipping = {};
  if (!isRecord(data.supplierShipping)) return null;
  for (const key of ["standard", "express", "us"]) {
    const parsed = shippingRule(data.supplierShipping[key]);
    if (!parsed.valid) return null;
    supplierShipping[key] = parsed.rule;
  }
  const processingFees = Object.create(null);
  if (!isRecord(data.processingFees)) return null;
  for (const [key, fee] of Object.entries(data.processingFees)) {
    if (key.length > 80 || !/^[a-z0-9 ()_.-]+$/.test(key) || !isRecord(fee)) return null;
    if (typeof fee.percent !== "number" || !Number.isFinite(fee.percent) || fee.percent < 0 || fee.percent > 1 || !money(fee.fixed)) return null;
    processingFees[key] = { percent: fee.percent, fixed: fee.fixed };
  }
  return { version: data.version, currency: "USD", effectiveAt: data.effectiveAt, worldwide, us, supplierShipping, processingFees };
}
