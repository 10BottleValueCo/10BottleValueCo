// Browser Network tools can distinguish our checks from the provider wait.
// Only fixed phase names and elapsed milliseconds are exposed, never order data.
const requestTimings = new WeakMap();
export function checkoutTiming(res, now = () => performance.now()) {
  if (requestTimings.has(res)) return requestTimings.get(res);
  const started = now();
  let previous = started;
  const phases = [];
  const mark = name => {
    const current = now();
    phases.push(`${name};dur=${Math.max(0, current - previous).toFixed(1)}`);
    previous = current;
    res.setHeader("Server-Timing", phases.join(", "));
  };
  mark.report = method => {
    console.info("Checkout timing", { method, phases: [...phases], totalMs: Number(Math.max(0, now() - started).toFixed(1)) });
  };
  requestTimings.set(res, mark);
  return mark;
}
