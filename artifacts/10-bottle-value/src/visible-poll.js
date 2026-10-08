// One request at a time. Hidden tabs stop polling; failures back off.
export function startVisiblePolling(run, {
  intervalMs,
  maxIntervalMs = intervalMs * 4,
  maxAttempts = Infinity,
  backoff = false,
  visibility = globalThis.document,
  schedule = globalThis.setTimeout,
  unschedule = globalThis.clearTimeout,
  now = Date.now,
} = {}) {
  let stopped = false;
  let running = false;
  let attempts = 0;
  let failures = 0;
  let nextRunAt = 0;
  let timer;
  const controller = new AbortController();
  const stop = () => {
    stopped = true;
    unschedule(timer);
    controller.abort();
    visibility?.removeEventListener("visibilitychange", onVisibility);
  };
  const tick = async () => {
    unschedule(timer);
    if (stopped || running || visibility?.hidden) return;
    const remaining = nextRunAt - now();
    if (remaining > 0) { timer = schedule(tick, remaining); return; }
    if (attempts >= maxAttempts) { stop(); return; }
    running = true;
    attempts += 1;
    try {
      const result = await run({ attempt: attempts, signal: controller.signal });
      failures = 0;
      if (result === false) { stop(); return; }
    } catch {
      failures += 1;
    } finally {
      running = false;
    }
    if (stopped) return;
    if (attempts >= maxAttempts) { stop(); return; }
    const exponent = Math.min(backoff ? attempts - 1 : failures, 10);
    const delay = Math.min(maxIntervalMs, intervalMs * (2 ** exponent));
    nextRunAt = now() + delay;
    if (!visibility?.hidden) timer = schedule(tick, delay);
  };
  function onVisibility() {
    unschedule(timer);
    if (!visibility?.hidden) void tick();
  }
  visibility?.addEventListener("visibilitychange", onVisibility);
  void tick();
  return stop;
}
