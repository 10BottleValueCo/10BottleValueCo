import assert from "node:assert/strict";
import { test } from "node:test";
import { startVisiblePolling } from "../artifacts/10-bottle-value/src/visible-poll.js";

function harness(hidden = false) {
  let time = 0;
  let serial = 0;
  const queue = new Map();
  const listeners = new Set();
  const visibility = {
    hidden,
    addEventListener: (_, listener) => listeners.add(listener),
    removeEventListener: (_, listener) => listeners.delete(listener),
  };
  return {
    options: {
      visibility,
      now: () => time,
      schedule: (run, delay) => { const id = ++serial; queue.set(id, { run, delay }); return id; },
      unschedule: id => queue.delete(id),
    },
    visibility,
    queue,
    listeners,
    async flush() { await Promise.resolve(); await Promise.resolve(); },
    async next() {
      const [id, task] = [...queue.entries()][0] || [];
      assert.ok(task, "expected scheduled poll");
      queue.delete(id);
      time += task.delay;
      await task.run();
      return task.delay;
    },
    setHidden(value) { visibility.hidden = value; for (const listener of listeners) listener(); },
  };
}

test("hidden tabs issue no request and visible polls cannot overlap", async () => {
  const h = harness(true);
  let count = 0;
  let release;
  const stop = startVisiblePolling(() => { count += 1; return new Promise(resolve => { release = resolve; }); }, { ...h.options, intervalMs: 1000 });
  assert.equal(count, 0);
  h.setHidden(false);
  h.setHidden(true);
  h.setHidden(false);
  assert.equal(count, 1);
  release();
  await h.flush();
  assert.equal(h.queue.size, 1);
  stop();
  assert.equal(h.queue.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("payment polling backs off and has a hard attempt limit", async () => {
  const h = harness();
  let count = 0;
  startVisiblePolling(() => { count += 1; }, { ...h.options, intervalMs: 1000, maxIntervalMs: 3000, maxAttempts: 4, backoff: true });
  await h.flush();
  assert.equal(await h.next(), 1000);
  assert.equal(await h.next(), 2000);
  assert.equal(await h.next(), 3000);
  assert.equal(count, 4);
  assert.equal(h.queue.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("failed polling backs off; success resets delay and terminal state stops", async () => {
  const h = harness();
  let count = 0;
  startVisiblePolling(() => {
    count += 1;
    if (count < 3) throw new Error("Unavailable");
    if (count === 4) return false;
  }, { ...h.options, intervalMs: 1000, maxIntervalMs: 4000 });
  await h.flush();
  assert.equal(await h.next(), 2000);
  assert.equal(await h.next(), 4000);
  assert.equal(await h.next(), 1000);
  assert.equal(h.queue.size, 0);
  assert.equal(h.listeners.size, 0);
});

test("cleanup aborts in-flight fetch and prevents it scheduling again", async () => {
  const h = harness();
  let release;
  let signal;
  const stop = startVisiblePolling(context => { signal = context.signal; return new Promise(resolve => { release = resolve; }); }, { ...h.options, intervalMs: 1000 });
  stop();
  assert.equal(signal.aborted, true);
  release();
  await h.flush();
  assert.equal(h.queue.size, 0);
});
