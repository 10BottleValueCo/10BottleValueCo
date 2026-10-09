const shippingBackground = "images/shipping-prices-warehouse-background.webp";
const affiliateBackground = "images/affiliate-lab-background.webp";
const shippingCards = [
  "shipping/shipping-warehouse.jpg",
  "shipping/shipping-worldwide.jpg",
  "shipping/shipping-express.jpg",
];
const affiliateVials = [
  "vials-c/tb-500-bpc-157-3ab3e8693952.webp",
  "vials-c/bpc-157-4a596acd979f.webp",
  "vials-c/retatrutide-glp-3-0efb04b0071d.webp",
];
const shippingDetails = [
  "shipping/shipping-community-reference.jpg",
  "shipping/shipping-order-bonus-lab.jpg",
  "vials-c/kpv-3bda87926280.webp",
  "vials-c/mots-c-ead676f909ff.webp",
  "vials-c/dsip-0f74d3cf1e6a.webp",
];
const affiliateDetails = [
  "affiliate/commission-photo.jpg",
  "affiliate/lifetime-earnings-photo.jpg",
  "affiliate/creators.jpg",
];

// Reuse App's native image loader/cache. This queue retains URLs and completion
// promises only; it never fetches blobs or creates a second image cache.
export function createInfoPageImageWarmup({
  baseUrl = "/",
  faqBackgroundImage,
  loadImage,
  concurrency = 2,
}) {
  if (typeof loadImage !== "function") {
    throw new TypeError("Image warmup requires the shared native image loader.");
  }
  const base = String(baseUrl).replace(/\/?$/, "/");
  const publicUrl = (path) => `${base}${path}`;
  const faqUrls = faqBackgroundImage ? [faqBackgroundImage] : [];
  const routes = {
    bonuses: [shippingBackground, ...shippingCards, ...shippingDetails].map(publicUrl),
    affiliate: [affiliateBackground, ...affiliateVials, ...affiliateDetails].map(publicUrl),
    faq: faqUrls,
  };
  const allUrls = [
    publicUrl(shippingBackground),
    publicUrl(affiliateBackground),
    ...faqUrls,
    ...shippingCards.map(publicUrl),
    ...affiliateVials.map(publicUrl),
    ...shippingDetails.map(publicUrl),
    ...affiliateDetails.map(publicUrl),
  ];
  // Even a misconfigured caller must not open more than two speculative loads.
  const limit = Number.isFinite(concurrency)
    ? Math.max(1, Math.min(2, Math.floor(concurrency)))
    : 2;
  const jobs = new Map();
  const queue = [];
  let running = 0;
  let sequence = 0;

  function drain() {
    queue.sort((left, right) => right.priority - left.priority || left.sequence - right.sequence);
    while (running < limit && queue.length) {
      const job = queue.shift();
      job.state = "running";
      running += 1;
      Promise.resolve()
        .then(() => loadImage(job.src))
        .then(
          () => {
            job.state = "complete";
            job.resolve(job.src);
          },
          (error) => {
            jobs.delete(job.src);
            job.reject(error);
          },
        )
        .finally(() => {
          running -= 1;
          drain();
        });
    }
  }

  function enqueue(urls, priority) {
    const pending = [...new Set(urls)].map((src) => {
      let job = jobs.get(src);
      if (!job) {
        job = { src, priority, sequence: sequence++, state: "queued" };
        job.promise = new Promise((resolve, reject) => {
          job.resolve = resolve;
          job.reject = reject;
        });
        jobs.set(src, job);
        queue.push(job);
      } else if (job.state === "queued") {
        job.priority = Math.max(job.priority, priority);
      }
      return job.promise;
    });
    // Best-effort warmup never rejects the caller or prevents other images from
    // loading. Failed entries are removed above so the next intent can retry.
    const completion = Promise.allSettled(pending);
    drain();
    return completion;
  }

  return {
    warmRoute: (page) => enqueue(Object.hasOwn(routes, page) ? routes[page] : [], 1),
    warmAll: () => enqueue(allUrls, 0),
    cancelBackground() {
      let cancelledCount = 0;
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        const job = queue[index];
        if (job.priority !== 0) continue;
        queue.splice(index, 1);
        jobs.delete(job.src);
        job.state = "cancelled";
        job.resolve(undefined);
        cancelledCount += 1;
      }
      return cancelledCount;
    },
  };
}

// Automatic warming runs only after load, a quiet delay and an idle opportunity.
// The caller controls which page mounts this scheduler (currently home only).
export function scheduleInfoPageWarmup({ view, onWarm, delayMs = 2500 }) {
  if (!view || typeof onWarm !== "function") return () => {};

  let cancelled = false;
  let warmed = false;
  let waitingForLoad = false;
  let timer = null;
  let idle = null;
  const delay = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 2500;
  const eligible = () => {
    const connection = view.navigator?.connection;
    return !view.document?.hidden
      && view.document?.visibilityState !== "hidden"
      && !connection?.saveData
      && connection?.effectiveType !== "2g"
      && connection?.effectiveType !== "slow-2g";
  };

  function runWarm() {
    idle = null;
    if (cancelled || warmed || !eligible()) return;
    warmed = true;
    try {
      Promise.resolve(onWarm()).catch(() => {});
    } catch {
      // Optional warming must not interrupt a usable page or navigation.
    }
  }

  function beginDelay() {
    if (waitingForLoad) {
      view.removeEventListener("load", beginDelay);
      waitingForLoad = false;
    }
    if (cancelled || warmed || timer !== null || idle !== null || !eligible()) return;
    timer = view.setTimeout(() => {
      timer = null;
      if (cancelled || !eligible()) return;
      if (typeof view.requestIdleCallback === "function") {
        idle = view.requestIdleCallback(runWarm, { timeout: 2000 });
      } else {
        runWarm();
      }
    }, delay);
  }

  if (eligible()) {
    if (view.document?.readyState === "complete") {
      beginDelay();
    } else {
      waitingForLoad = true;
      view.addEventListener("load", beginDelay, { once: true });
    }
  }

  return () => {
    cancelled = true;
    if (waitingForLoad) view.removeEventListener("load", beginDelay);
    if (timer !== null) view.clearTimeout(timer);
    if (idle !== null) view.cancelIdleCallback?.(idle);
  };
}
