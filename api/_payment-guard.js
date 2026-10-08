// Until credit has an authenticated, transactional reservation/ledger, a
// submitted number is not evidence of a balance. Preserve ordinary registered checkout.
export function rejectUnverifiedStoreCredit(body, res) {
  if (body?.storeCreditUsed === undefined || body?.storeCreditUsed === null) return false;
  const credit = Number(body.storeCreditUsed);
  if (!Number.isFinite(credit) || credit < 0) {
    res.status(400).json({ error: "Invalid store credit amount." });
    return true;
  }
  if (credit > 0) {
    res.status(409).json({
      error: "Store credit checkout is temporarily unavailable. Remove store credit to continue or contact support.",
      code: "STORE_CREDIT_REQUIRES_SERVER_LEDGER",
    });
    return true;
  }
  return false;
}
