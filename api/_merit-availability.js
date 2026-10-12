// Reopen at midnight on October 15, 2026, in Europe/Riga.
export const MERIT_REOPENS_AT = "2026-10-15T00:00:00+03:00";
export const MERIT_REOPEN_MESSAGE = "Merit card payments will reopen on October 15.";

export function meritCheckoutPaused(now = Date.now()) {
  return !Number.isFinite(now) || now < Date.parse(MERIT_REOPENS_AT);
}
