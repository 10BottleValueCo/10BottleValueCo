// Private payment economics. Call only with the canonical service-role attempt,
// never browser order metadata or the current environment's fee configuration.
// A recorded rate can estimate a fee; it cannot establish settlement or profit.
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.trim().length > 0 && value.length <= 500;
const date = value => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value));
const paidOrderStates = new Set(["paid", "done", "processing", "shipped", "delivered"]);
const refundStates = new Set(["refunded", "partially_refunded", "partially refunded", "chargeback", "disputed", "cancelled", "canceled"]);

function cents(value) {
  if (!["number", "string"].includes(typeof value) || !/^(?:0|[1-9]\d*)$/.test(String(value))) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}

function money(value) {
  if (!["number", "string"].includes(typeof value) || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value))) return null;
  const [whole, fraction = ""] = String(value).split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}

function rate(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 10_000;
}

function percentage(amount, bps) {
  const result = (BigInt(amount) * BigInt(bps) + 5_000n) / 10_000n;
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}

function boundRecord(value, attempt, statuses) {
  return record(value) && text(attempt?.id) && value.attemptId === attempt.id
    && value.currency === "usd" && text(value.version) && text(value.source)
    && date(value.recordedAt) && statuses.includes(value.status);
}

/**
 * Optional settlement/cost records must come from trusted private storage and
 * identify this exact attempt. No such records are invented from current rates.
 * processorExpenseCents in a settlement record is the verified total expense,
 * so it REPLACES the percentage estimate rather than being added to it.
 */
export function computeMeritMargin(attempt, { settlement = null, costs = null } = {}) {
  const result = {
    schemaVersion: 1, currency: "usd", status: "unavailable", reason: "invalid_attempt",
    chargedAmountCents: null, storeCreditUsedCents: null, orderValueCents: null, customerCardSurchargeCents: null, customerShippingCollectedCents: null,
    processorExpenseCents: null, processorExpenseKind: "unknown", processorExpenseScope: "unknown",
    merchantFeeBurdenCents: null, otherProcessorFeesCents: null,
    supplierProductCostCents: null, supplierShippingPaidCents: null, otherOrderCostsCents: null,
    contributionCents: null, contributionKind: "unknown", netProfitCents: null,
    ruleVersion: null,
  };
  if (!record(attempt) || attempt.currency !== "usd" || attempt.expected_live !== true) return result;
  if (attempt.state !== "paid") return { ...result, reason: "payment_not_confirmed" };
  const orderStatus = typeof attempt.orderStatus === "string" ? attempt.orderStatus.trim().toLowerCase() : "";
  if (refundStates.has(orderStatus)) return { ...result, reason: "refund_or_reversal" };
  if (!paidOrderStates.has(orderStatus)) return { ...result, reason: "order_status_unverified" };
  const snapshot = attempt.snapshot;
  const amount = cents(attempt.amount_cents);
  const total = money(snapshot?.total);
  const surcharge = money(snapshot?.customerCardSurcharge);
  const shipping = money(snapshot?.shipping);
  const credit = snapshot?.storeCreditUsed === undefined ? 0 : money(snapshot.storeCreditUsed);
  const orderValue = amount !== null && credit !== null ? amount + credit : null;
  if (!record(snapshot) || amount === null || amount <= 0 || total !== amount
    || surcharge === null || surcharge > amount || credit === null || !Number.isSafeInteger(orderValue)
    || ((credit > 0 || attempt.credit_reserved_cents !== undefined) && cents(attempt.credit_reserved_cents) !== credit)
    || shipping === null || shipping > orderValue - surcharge) {
    return { ...result, reason: "invalid_quote_snapshot" };
  }

  const rules = snapshot.paymentRules;
  const customerRule = rules?.customerCardSurcharge;
  if (!record(rules) || rules.currency !== "usd" || !text(rules.version)
    || !record(customerRule) || customerRule.unit !== "basis_points" || !rate(customerRule.rate)
    || !text(customerRule.source) || !date(customerRule.effectiveAt)
    || snapshot.customerCardSurchargeBps !== customerRule.rate
    || percentage(customerRule.basis === "order_before_credit" ? orderValue - surcharge : amount - surcharge, customerRule.rate) !== surcharge) {
    return { ...result, reason: "invalid_customer_rule_snapshot" };
  }
  Object.assign(result, {
    status: "fee_unknown", reason: "processing_fee_unverified", chargedAmountCents: amount,
    storeCreditUsedCents: credit, orderValueCents: orderValue,
    customerCardSurchargeCents: surcharge, customerShippingCollectedCents: shipping, ruleVersion: rules.version,
  });

  // Invalid or conflicting actual records may not silently fall back to an
  // attractive estimate. A refund also invalidates the original-sale margin.
  if (settlement !== null) {
    if (!boundRecord(settlement, attempt, ["settlement_verified"])
      || cents(settlement.chargedAmountCents) !== amount || cents(settlement.processorExpenseCents) === null
      || cents(settlement.refundedAmountCents) === null) {
      return { ...result, reason: "invalid_settlement_record" };
    }
    if (settlement.refundedAmountCents > 0) return { ...result, status: "unavailable", reason: "refund_or_reversal" };
    result.processorExpenseCents = Number(settlement.processorExpenseCents);
    result.processorExpenseKind = "settlement_actual";
    result.processorExpenseScope = "verified_total_processing_expense";
  } else {
    const fee = rules.merchantProcessingExpense;
    if (!record(fee) || fee.unit !== "basis_points" || !rate(fee.rate)
      || !text(fee.source) || !date(fee.effectiveAt)
      || !["reported_rate_not_actual_settlement", "contract_rate_not_actual_settlement"].includes(fee.status)) return result;
    if (fee.basis !== "charged_amount") return { ...result, reason: "processing_fee_basis_unknown" };
    result.processorExpenseCents = percentage(amount, fee.rate);
    result.processorExpenseKind = "reported_rate_estimate";
    result.processorExpenseScope = "percentage_component_only";
  }
  if (result.processorExpenseCents === null) return { ...result, reason: "processing_fee_overflow" };
  Object.assign(result, {
    status: result.processorExpenseKind === "settlement_actual" ? "actual_fee_known" : "estimated_fee_known",
    reason: null, merchantFeeBurdenCents: result.processorExpenseCents - surcharge,
  });

  if (costs !== null && boundRecord(costs, attempt, ["operator_report", "invoice_verified"])) {
    result.supplierProductCostCents = cents(costs.supplierProductCostCents);
    result.supplierShippingPaidCents = cents(costs.supplierShippingPaidCents);
    result.otherOrderCostsCents = cents(costs.otherOrderCostsCents);
    if (credit > 0) result.contributionKind = "store_credit_funding_unknown";
    if (credit === 0 && [result.supplierProductCostCents, result.supplierShippingPaidCents, result.otherOrderCostsCents].every(value => value !== null)) {
      // Customer shipping is already in amount. Supplier shipping is paid out
      // once here; neither shipping nor surcharge is added to amount again.
      const contribution = BigInt(amount) - BigInt(result.processorExpenseCents)
        - BigInt(result.supplierProductCostCents) - BigInt(result.supplierShippingPaidCents) - BigInt(result.otherOrderCostsCents);
      if (contribution >= BigInt(Number.MIN_SAFE_INTEGER) && contribution <= BigInt(Number.MAX_SAFE_INTEGER)) {
        result.contributionCents = Number(contribution);
        result.contributionKind = costs.status === "invoice_verified" && result.processorExpenseKind === "settlement_actual"
          ? "verified_recorded_components" : "estimated_recorded_components";
      }
    }
  }
  // Missing operating costs and tax/settlement completeness cannot become zero.
  // This helper reports a contribution for supplied components, never net profit.
  return result;
}
