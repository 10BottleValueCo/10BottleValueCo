import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import {
  createInfoPageImageWarmup,
  scheduleInfoPageWarmup,
} from "../artifacts/10-bottle-value/src/preloadInfoPageImages.js";

const flush = () => new Promise((resolve) => setImmediate(resolve));

function imageFixture(options = {}) {
  const calls = [];
  const pending = new Map();
  let running = 0;
  let peak = 0;
  const warmup = createInfoPageImageWarmup({
    baseUrl: "/",
    faqBackgroundImage: "/assets/faq-build-hash.webp",
    ...options,
    loadImage(src) {
      calls.push(src);
      running += 1;
      peak = Math.max(peak, running);
      return new Promise((resolve, reject) => {
        pending.set(src, {
          finish(error) {
            pending.delete(src);
            running -= 1;
            if (error) reject(error);
            else resolve({ src });
          },
        });
      });
    },
  });
  return {
    ...warmup, calls, pending,
    get peak() { return peak; },
    async finish(src, error) { pending.get(src).finish(error); await flush(); },
    async settle() {
      await flush();
      while (pending.size) {
        for (const value of [...pending.values()]) value.finish();
        await flush();
      }
    },
  };
}

test("all routes share two workers, deduplicate repeated intent, and retain completed URLs", async () => {
  const f = imageFixture();
  const all = f.warmAll();
  const shipping = f.warmRoute("bonuses");
  const affiliate = f.warmRoute("affiliate");
  const again = f.warmAll();
  await flush();
  assert.equal(f.pending.size, 2);
  assert.equal(f.calls.length, 2);
  await f.settle();
  const results = await Promise.all([all, shipping, affiliate, again]);
  assert.equal(f.peak, 2);
  assert.equal(f.calls.length, 17);
  assert.equal(new Set(f.calls).size, 17);
  assert.deepEqual(results.map((value) => value.length), [17, 9, 7, 17]);
  assert.ok(results.flat().every((value) => value.status === "fulfilled"));
  await f.warmAll();
  assert.equal(f.calls.length, 17);
  for (const src of f.calls.filter((src) => !src.startsWith("/assets/"))) {
    await access(new URL(`../artifacts/10-bottle-value/public${src}`, import.meta.url));
  }
});

test("automatic order starts all backdrops, then first shipping cards and affiliate hero", async () => {
  const f = imageFixture({ concurrency: 1 });
  const done = f.warmAll();
  await f.settle();
  await done;
  assert.equal(f.peak, 1);
  assert.deepEqual(f.calls.slice(0, 3), [
    "/images/shipping-prices-warehouse-background.webp",
    "/images/affiliate-lab-background.webp",
    "/assets/faq-build-hash.webp",
  ]);
  assert.ok(f.calls.slice(3, 6).every((src) => /shipping-(warehouse|worldwide|express)\.jpg$/.test(src)));
  assert.ok(f.calls.slice(6, 9).every((src) => src.startsWith("/vials-c/")));
});

test("foreground intent promotes queued images ahead of unrelated automatic work", async () => {
  const f = imageFixture({ concurrency: 1 });
  const all = f.warmAll();
  await flush();
  const faq = f.warmRoute("faq");
  await f.finish(f.calls[0]);
  assert.equal(f.calls[1], "/assets/faq-build-hash.webp");
  await f.finish(f.calls[1]);
  await faq;
  const affiliate = f.warmRoute("affiliate");
  await f.settle();
  await Promise.all([all, affiliate]);
  const affiliateHeroIndex = f.calls.indexOf("/vials-c/bpc-157-4a596acd979f.webp");
  const shippingCardIndex = f.calls.indexOf("/shipping/shipping-warehouse.jpg");
  assert.ok(affiliateHeroIndex < shippingCardIndex);
});

test("failure frees a worker, leaves other images running, and retries only failed URLs", async () => {
  const f = imageFixture();
  const first = f.warmAll();
  await flush();
  const failed = f.calls[0];
  await f.finish(failed, new Error("offline"));
  assert.equal(f.calls.length, 3);
  const retry = f.warmRoute("bonuses");
  await f.settle();
  const [firstResults, retryResults] = await Promise.all([first, retry]);
  assert.equal(firstResults.filter((result) => result.status === "rejected").length, 1);
  assert.ok(retryResults.every((result) => result.status === "fulfilled"));
  assert.equal(f.calls.filter((src) => src === failed).length, 2);
  assert.equal(f.calls.length, 18);
  assert.equal(f.peak, 2);
});

test("synchronous loader errors settle and can retry without stranding the queue", async () => {
  let attempts = 0;
  const f = createInfoPageImageWarmup({
    faqBackgroundImage: "/faq.webp",
    loadImage() { attempts += 1; if (attempts === 1) throw new Error("not ready"); },
  });
  assert.equal((await f.warmRoute("faq"))[0].status, "rejected");
  assert.equal((await f.warmRoute("faq"))[0].status, "fulfilled");
  assert.equal(attempts, 2);
});

test("canceling background work settles queued jobs and leaves running loads reusable", async () => {
  const f = imageFixture();
  const all = f.warmAll();
  await flush();
  assert.equal(f.calls.length, 2);
  assert.equal(f.cancelBackground(), 15);
  assert.equal(f.cancelBackground(), 0);
  assert.equal(f.pending.size, 2);
  await f.settle();
  const results = await all;
  assert.equal(f.calls.length, 2);
  assert.equal(results.length, 17);
  assert.ok(results.every((result) => result.status === "fulfilled"));
  assert.equal(results.filter((result) => result.value === undefined).length, 15);

  const retry = f.warmAll();
  await f.settle();
  assert.ok((await retry).every((result) => typeof result.value === "string"));
  assert.equal(f.calls.length, 17);
  assert.equal(new Set(f.calls).size, 17);
  assert.equal(f.peak, 2);
});

test("background cancellation preserves promoted intent and canceled URLs can receive later intent", async () => {
  const f = imageFixture();
  const all = f.warmAll();
  await flush();
  const affiliate = f.warmRoute("affiliate");
  assert.equal(f.cancelBackground(), 9);
  await f.settle();
  const [allResults, affiliateResults] = await Promise.all([all, affiliate]);
  assert.equal(allResults.filter((result) => result.value === undefined).length, 9);
  assert.ok(affiliateResults.every((result) => typeof result.value === "string"));
  assert.equal(f.calls.length, 8);
  assert.equal(f.calls.includes("/assets/faq-build-hash.webp"), false);
  assert.equal(f.calls.includes("/shipping/shipping-warehouse.jpg"), false);

  const faq = f.warmRoute("faq");
  assert.equal(f.cancelBackground(), 0);
  await f.settle();
  assert.equal((await faq)[0].value, "/assets/faq-build-hash.webp");
  assert.equal(f.calls.length, 9);
  assert.equal(f.peak, 2);
});

test("the hard concurrency ceiling remains two and unsupported routes do not enqueue", async () => {
  const f = imageFixture({ concurrency: 100 });
  assert.deepEqual(await f.warmRoute("shop"), []);
  assert.deepEqual(await f.warmRoute("constructor"), []);
  const all = f.warmAll();
  await f.settle();
  await all;
  assert.equal(f.peak, 2);
});

test("public base paths are normalized while the FAQ build import is passed through", async () => {
  const calls = [];
  const f = createInfoPageImageWarmup({
    baseUrl: "/preview", faqBackgroundImage: "/assets/real-faq-hash.webp",
    loadImage: (src) => { calls.push(src); },
  });
  await f.warmRoute("affiliate");
  await f.warmRoute("faq");
  assert.equal(calls.length, 8);
  assert.ok(calls.slice(0, 7).every((src) => src.startsWith("/preview/") && !src.includes("//")));
  assert.equal(calls[7], "/assets/real-faq-hash.webp");
});

function schedulerFixture({ ready = false, idle = true, connection = {}, hidden = false } = {}) {
  const listeners = new Set();
  const timers = new Map();
  const idles = new Map();
  let nextId = 0;
  let warms = 0;
  const view = {
    document: { readyState: ready ? "complete" : "loading", hidden, visibilityState: hidden ? "hidden" : "visible" },
    navigator: { connection },
    addEventListener(name, fn) { assert.equal(name, "load"); listeners.add(fn); },
    removeEventListener(name, fn) { assert.equal(name, "load"); listeners.delete(fn); },
    setTimeout(fn, delay) { const id = nextId++; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  if (idle) {
    view.requestIdleCallback = (fn) => { const id = nextId++; idles.set(id, fn); return id; };
    view.cancelIdleCallback = (id) => { idles.delete(id); };
  }
  return {
    view, listeners, timers, idles,
    get warms() { return warms; },
    schedule(options = {}) { return scheduleInfoPageWarmup({ view, onWarm: () => { warms += 1; }, ...options }); },
    load() { view.document.readyState = "complete"; [...listeners].forEach((fn) => fn()); },
    delay() { const values = [...timers.values()]; timers.clear(); values.forEach(({ fn }) => fn()); },
    idle() { const values = [...idles.values()]; idles.clear(); values.forEach((fn) => fn()); },
  };
}

test("scheduler waits for window load, 2500 ms, and idle before running once", () => {
  const f = schedulerFixture();
  f.schedule();
  assert.equal(f.listeners.size, 1);
  assert.equal(f.timers.size, 0);
  assert.equal(f.warms, 0);
  f.load();
  assert.equal(f.listeners.size, 0);
  assert.equal([...f.timers.values()][0].delay, 2500);
  f.delay();
  assert.equal(f.warms, 0);
  assert.equal(f.idles.size, 1);
  f.idle();
  f.load(); f.delay(); f.idle();
  assert.equal(f.warms, 1);
});

test("already-loaded pages use the delay, with a working no-idle fallback", () => {
  const f = schedulerFixture({ ready: true, idle: false });
  f.schedule({ delayMs: 1500 });
  assert.equal(f.listeners.size, 0);
  assert.equal([...f.timers.values()][0].delay, 1500);
  assert.equal(f.warms, 0);
  f.delay();
  assert.equal(f.warms, 1);
});

for (const stage of ["load", "delay", "idle"]) {
  test(`cleanup cancels the pending ${stage} and ignores an already-captured callback`, () => {
    const f = schedulerFixture();
    const stop = f.schedule();
    if (stage !== "load") f.load();
    if (stage === "idle") f.delay();
    const callback = stage === "load" ? [...f.listeners][0]
      : stage === "delay" ? [...f.timers.values()][0].fn : [...f.idles.values()][0];
    stop();
    assert.equal(f.listeners.size + f.timers.size + f.idles.size, 0);
    callback();
    f.delay(); f.idle();
    assert.equal(f.warms, 0);
  });
}

for (const options of [
  { connection: { saveData: true } },
  { connection: { effectiveType: "2g" } },
  { connection: { effectiveType: "slow-2g" } },
  { hidden: true },
]) {
  test(`automatic warming skips ${JSON.stringify(options)} without registering work`, () => {
    const f = schedulerFixture(options);
    f.schedule();
    assert.equal(f.listeners.size + f.timers.size + f.idles.size, 0);
    f.load(); f.delay(); f.idle();
    assert.equal(f.warms, 0);
  });
}

test("visibility and connection are checked again when delayed work is about to start", () => {
  const hidden = schedulerFixture({ ready: true });
  hidden.schedule();
  hidden.view.document.hidden = true;
  hidden.delay();
  assert.equal(hidden.idles.size, 0);
  assert.equal(hidden.warms, 0);

  const metered = schedulerFixture({ ready: true });
  metered.schedule(); metered.delay();
  metered.view.navigator.connection.saveData = true;
  metered.idle();
  assert.equal(metered.warms, 0);
});

test("a rejected optional warmup does not create an unhandled rejection", async () => {
  const f = schedulerFixture({ ready: true, idle: false });
  f.schedule({ onWarm: () => Promise.reject(new Error("offline")) });
  f.delay();
  await flush();
});
