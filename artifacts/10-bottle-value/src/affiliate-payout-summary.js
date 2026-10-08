// The server derives ownership. The requested UI code is never sent as authority.
export async function loadOwnedPayoutSummary({
  supabase,
  code,
  isCurrent = () => true,
  fetcher = fetch,
}) {
  const { data, error } = await supabase.auth.getSession();
  if (!isCurrent()) return null;
  const token = data?.session?.access_token;
  if (error || !token) throw new Error("Sign in again to load payout history.");
  const response = await fetcher("/api/affiliate-payout-summary", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!isCurrent()) return null;
  if (!response.ok)
    throw new Error("Payout history is unavailable. Please retry.");
  const body = await response.json();
  if (!isCurrent()) return null;
  const expectedCode = String(code || "")
    .trim()
    .toUpperCase();
  const matches =
    body?.ok === true && Array.isArray(body.summaries)
      ? body.summaries.filter(
          (summary) =>
            typeof summary?.code === "string" &&
            summary.code.trim().toUpperCase() === expectedCode,
        )
      : [];
  if (!expectedCode || matches.length !== 1)
    throw new Error("Payout history could not be verified for this account.");
  const { totalPaid, count } = matches[0];
  if (
    typeof totalPaid !== "number" ||
    !Number.isFinite(totalPaid) ||
    totalPaid < 0 ||
    !Number.isSafeInteger(Math.round(totalPaid * 100)) ||
    Math.abs(totalPaid * 100 - Math.round(totalPaid * 100)) > 0.000001 ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    throw new Error("Payout history returned an invalid summary.");
  }
  return { code: expectedCode, totalPaid, count };
}
