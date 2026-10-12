// Only fixed diagnostic labels and standard database codes are displayed.
// Never render upstream messages, hints, URLs, request bodies or credentials.
const STAGES = new Set([
  "ORDER_LOOKUP", "ORDER_CREATE", "ORDER_UPDATE", "PAYMENT_BINDING_LOOKUP",
]);
const MISSING = { url: "Supabase URL", service_key: "service-role key" };

export function checkoutFailureMessage(result, fallback = "Could not save this checkout.") {
  const message = typeof result?.error === "string" && result.error ? result.error : fallback;
  if (!/^CHECKOUT_[A-Z_]{1,50}$/.test(result?.code || "")) return message;
  const details = [`Code: ${result.code}`];
  const diagnostic = result?.diagnostic;
  if (STAGES.has(diagnostic?.stage)) details.push(`Step: ${diagnostic.stage}`);
  if (Number.isInteger(diagnostic?.storageStatus)
    && diagnostic.storageStatus >= 100 && diagnostic.storageStatus <= 599) {
    details.push(`Supabase HTTP: ${diagnostic.storageStatus}`);
  }
  if (/^(?:PGRST\d{3}|[0-9A-Z]{5})$/.test(diagnostic?.storageCode || "")) {
    details.push(`Supabase code: ${diagnostic.storageCode}`);
  }
  if (Array.isArray(diagnostic?.missing)) {
    const names = [...new Set(diagnostic.missing.filter(key => Object.hasOwn(MISSING, key)))].map(key => MISSING[key]);
    if (names.length) details.push(`Missing: ${names.join(", ")}`);
  }
  return `${message} [${details.join(" · ")}]`;
}
