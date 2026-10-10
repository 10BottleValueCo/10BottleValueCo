// Provider response bodies can contain customer details and payment tokens.
// Emit only fixed categories; never copy provider text, codes, URLs or headers.
export function summarizePaylioResponse(raw) {
  const bytes = Buffer.byteLength(raw);
  if (bytes > 50000) return { bodyFormat: "oversized", bodyBytes: bytes, errorCategory: "unknown" };
  if (!raw.trim()) return { bodyFormat: "empty", bodyBytes: bytes, errorCategory: "unknown" };
  let bodyFormat = "text";
  let diagnostic = "";
  try {
    const body = JSON.parse(raw);
    bodyFormat = "json";
    if (body && typeof body === "object" && !Array.isArray(body)) {
      diagnostic = [body.error, body.message, body.code].filter(value => typeof value === "string").join(" ");
    }
  } catch {
    bodyFormat = /^\s*(?:<!doctype\s+html|<html)/i.test(raw) ? "html" : "text";
    diagnostic = raw;
  }
  // These labels describe the returned error text, not a proven root cause.
  const categories = [
    ["rate_limit", /rate.?limit|too many requests/i],
    ["authentication", /unauthori[sz]ed|invalid.{0,20}api.?key|revoked.{0,20}key|authentication/i],
    ["wallet_validation", /invalid.{0,30}(?:wallet|address)|(?:wallet|address).{0,30}invalid/i],
    ["provider_selection", /(?:unsupported|invalid|unavailable).{0,30}provider|provider.{0,30}(?:unsupported|unavailable)/i],
    ["upstream_timeout", /(?:upstream|gateway|rpc).{0,40}(?:timeout|timed out)|(?:timeout|timed out).{0,40}(?:upstream|gateway|rpc)/i],
    ["upstream_failure", /bad gateway|upstream|rpc|cloudflare/i],
    ["input_validation", /validation|missing.{0,20}(?:field|amount|currency)|invalid.{0,20}(?:amount|currency|callback)/i],
  ];
  return { bodyFormat, bodyBytes: bytes,
    errorCategory: categories.find(([, pattern]) => pattern.test(diagnostic))?.[0] || "unknown" };
}
