// The notice is an estimate, not an automatic reopening schedule.
// An owner must explicitly set MERIT_CHECKOUT_PAUSED=false to reopen checkout.
export const MERIT_REOPEN_MESSAGE = "Merit card payments are temporarily closed. Expected reopening: October 22–25.";

export function meritCheckoutPaused(env = process.env) {
  return env.MERIT_CHECKOUT_PAUSED !== "false";
}
