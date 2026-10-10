// Browser Network tools can distinguish our checks from the provider wait.
// Only fixed phase names and elapsed milliseconds are exposed, never order data.
export function checkoutTiming(res, now = () => performance.now()) {
  let previous = now();
  const phases = [];
  return name => {
    const current = now();
    phases.push(`${name};dur=${Math.max(0, current - previous).toFixed(1)}`);
    previous = current;
    res.setHeader("Server-Timing", phases.join(", "));
  };
}
