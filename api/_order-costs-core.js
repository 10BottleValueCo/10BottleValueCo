const record = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function parseCostAmount(raw) {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) {
    throw new Error("Enter a non-negative amount with up to 2 decimal places.");
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > 1000000) {
    throw new Error("Enter an amount between 0 and 1,000,000.");
  }
  return Math.round(amount * 100) / 100;
}

export function unitCostToLineCost(amount, quantity) {
  const unitCost = parseCostAmount(amount);
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("This order has an invalid quantity.");
  return parseCostAmount((Math.round(unitCost * 100) * qty / 100).toFixed(2));
}

export function validateCostChange(orderId, change) {
  if (typeof orderId !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(orderId) ||
      !["line", "shipping"].includes(change?.kind)) {
    throw Object.assign(new Error("Invalid cost change."), { status: 400 });
  }
  if (change.kind === "line" &&
      (!Number.isSafeInteger(change.index) || change.index < 0 || change.index > 9999)) {
    throw Object.assign(new Error("Invalid order line."), { status: 400 });
  }
  try { return parseCostAmount(change.amount); }
  catch (error) { throw Object.assign(error, { status: 400 }); }
}

