import { requireUser } from "./_auth.js";
import { PayoutDataError, payoutConfig, payoutCode, readExactPage, readPayouts, sendPayoutError } from "./_affiliate-payouts.js";

function ownershipError() {
  return new PayoutDataError("AFFILIATE_OWNERSHIP_UNAVAILABLE", "Affiliate ownership could not be verified.", 409);
}

async function ownedCode(config, email) {
  const endpoint = new URL(`${config.url}/rest/v1/affiliates`);
  endpoint.searchParams.set("select", "code,email,active");
  // Affiliate issuance already normalizes email. An unmigrated/noncanonical
  // record must be corrected by the operator, never guessed into ownership.
  endpoint.searchParams.set("email", `eq.${email}`);
  endpoint.searchParams.set("order", "code.asc");
  const { rows, total } = await readExactPage(endpoint, config, { limit: 2 });
  if (total === 0) return null;
  if (total !== 1) throw ownershipError();
  const affiliate = rows[0];
  const code = payoutCode(affiliate?.code);
  if (!code || affiliate.email !== email || typeof affiliate.active !== "boolean") throw ownershipError();
  if (!affiliate.active) {
    throw new PayoutDataError("AFFILIATE_ACCESS_INACTIVE", "Affiliate access is inactive.", 403);
  }

  // Check global code ownership too. Case variants and duplicate assignments
  // must not allow one verified email to read another affiliate's payouts.
  endpoint.searchParams.delete("email");
  endpoint.searchParams.set("code", `ilike.${code.replace(/_/g, "\\_")}`);
  const matching = await readExactPage(endpoint, config, { limit: 2 });
  if (matching.total !== 1 || matching.rows[0]?.code !== code
    || matching.rows[0]?.email !== email || matching.rows[0]?.active !== true) throw ownershipError();
  return code;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  res.setHeader("Cache-Control", "private, no-store");
  // No account or affiliate selector is accepted, even if it matches the user.
  if (Object.keys(req.query || {}).length > 0
    || (req.url && new URL(req.url, "https://local.invalid").search)) {
    return res.status(400).json({ ok: false, code: "NO_ACCOUNT_SELECTOR", error: "Account selectors are not accepted." });
  }
  if (!user.email_confirmed_at || typeof user.email !== "string" || !user.email.trim()) {
    return res.status(403).json({ ok: false, code: "VERIFIED_EMAIL_REQUIRED", error: "A verified email is required." });
  }
  const config = payoutConfig();
  if (!config) return res.status(503).json({ ok: false, error: "Payout storage is not configured." });
  try {
    const code = await ownedCode(config, user.email.trim().toLowerCase());
    if (!code) return res.status(200).json({ ok: true, summaries: [] });
    const payouts = await readPayouts(config, code);
    const totalCents = payouts.reduce((total, row) => total + row.cents, 0);
    if (!Number.isSafeInteger(totalCents)) throw new PayoutDataError("PAYOUT_TOTAL_INVALID", "Payout total could not be calculated safely.");
    return res.status(200).json({ ok: true, summaries: [{ code, totalPaid: totalCents / 100, count: payouts.length }] });
  } catch (error) {
    return sendPayoutError(res, error);
  }
}
