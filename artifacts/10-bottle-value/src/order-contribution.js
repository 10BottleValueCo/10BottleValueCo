const amount = value => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const own = (object, key) => object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : null;
const normName = name => String(name || "").replace(/\s*\/\s*GLP-\d+/i, "").trim();
const normDose = dose => String(dose || "").trim().replace(/(\d)\s+([a-zA-Z])/g, "$1$2");

function shippingFromRule(rule, order, supplierProductCost) {
  const flat = amount(rule);
  if (flat !== null) return flat;
  if (!rule || !Array.isArray(rule.tiers)) return null;
  const basis = rule.basis === "productSubtotalBeforeDiscounts" ? amount(order.subtotal)
    : rule.basis === "supplierProductCost" ? supplierProductCost : null;
  if (basis === null) return null;
  const tier = [...rule.tiers].reverse().find(candidate => candidate.minInclusive ? basis >= candidate.min : basis > candidate.min);
  return amount(tier?.amount);
}

export function calculateOrderContribution(order, config, scenario = {}, displayName = value => value) {
  const orderDate = Date.parse(order.paidAt || order.createdAt || "");
  const effectiveDate = Date.parse(config?.effectiveAt || "");
  const configApplies = config?.currency === "USD" && Number.isFinite(orderDate) && Number.isFinite(effectiveDate) && orderDate >= effectiveDate;
  const recorded = order.lineCostOverrides || order.metadata?.lineCostOverrides || {};
  const overrides = { ...recorded, ...(scenario.lineCosts || {}) };
  let cogs = 0;
  let hasUnknown = false;
  let hasWorldwideItem = false;
  let hasUSItem = false;
  const lines = (Array.isArray(order.items) ? order.items : []).map((item, index) => {
    const qty = amount(item.quantity ?? item.qty ?? 1);
    const isUS = String(item.fromWarehouse || "").toLowerCase() === "us";
    if (!isUS) hasWorldwideItem = true;
    else hasUSItem = true;
    const key = `${normName(item.name)}|${normDose(item.dose)}`;
    const unitCost = configApplies ? amount(own(isUS ? config.us : config.worldwide, key)) : null;
    const override = amount(own(overrides, index));
    const hasOverride = override !== null;
    const lineCost = hasOverride ? override : unitCost !== null && qty !== null ? unitCost * qty : null;
    if (lineCost === null) hasUnknown = true;
    else cogs += lineCost;
    return { name: displayName(item.name), dose: normDose(item.dose), qty, isUS, unitCost, lineCost, hasOverride, salePrice: amount(item.price) ?? 0 };
  });
  if (!lines.length) hasUnknown = true;
  const isExpress = String(order.shippingType || "").toLowerCase().includes("express");
  const shippingOverride = scenario.supplierShipping ?? order.supplierShippingOverride ?? order.metadata?.supplierShippingOverride;
  const supplierShipping = amount(shippingOverride) ?? (configApplies && !(hasWorldwideItem && hasUSItem)
    ? shippingFromRule(config.supplierShipping?.[hasWorldwideItem ? isExpress ? "express" : "standard" : "us"], order, hasUnknown ? null : cogs)
    : null);
  const customerShipping = amount(order.shipping);
  const revenue = amount(order.total);
  const affiliateCode = String(order.affiliateCode || "").trim();
  const adjustment = amount(order.affiliateCommissionAdjustment);
  const commission = amount(order.affiliateCommission);
  const affiliatePayout = affiliateCode ? commission === null ? null : Math.max(0, commission - (adjustment ?? 0)) : 0;
  const fee = configApplies ? own(config.processingFees, String(order.paymentProvider || "").trim().toLowerCase()) : null;
  const recordedFee = amount(order.actualPaymentFee ?? order.metadata?.actualPaymentFee);
  const paymentFeeRate = fee?.percent ?? null;
  // A configured fee is an estimate for one charge, never a substitute for a statement.
  const paymentFee = recordedFee ?? (fee && revenue !== null ? Math.round((revenue * fee.percent + fee.fixed) * 100) / 100 : null);
  if (supplierShipping === null || affiliatePayout === null || paymentFee === null || revenue === null || (order.currency && order.currency !== "USD")) hasUnknown = true;
  const totalCogs = hasUnknown ? null : cogs + supplierShipping + affiliatePayout + paymentFee;
  const profit = totalCogs === null ? null : revenue - totalCogs;
  return { lines, cogs: lines.some(line => line.lineCost === null) ? null : cogs, supplierShipping, customerShipping, isExpress, affiliateCode, affiliatePayout, paymentFee, paymentFeeRate, totalCogs, revenue, profit, hasUnknown, isScenario: Object.keys(scenario).length > 0 };
}
