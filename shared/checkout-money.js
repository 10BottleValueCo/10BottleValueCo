// Shared money arithmetic only. Business rates still come from their existing
// configuration. Keep line sums and percentage rounding identical in every UI/API.
export const toCents = value => Math.round(Number(value) * 100);
export const fromCents = value => value / 100;
export const lineAmountCents = (price, quantity) => toCents(price) * Number(quantity);
export const sumLineAmounts = items => fromCents(items.reduce((sum, item) => sum + lineAmountCents(item.price, item.quantity ?? item.qty ?? 1), 0));
export const discountAmount = (amount, rate) => fromCents(Math.round(toCents(amount) * Math.round(Number(rate) * 1000000) / 1000000));
export const addAmounts = (...amounts) => fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0));
