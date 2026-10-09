import assert from "node:assert/strict";
import test from "node:test";
import { observeAnnouncementHeight } from "../artifacts/10-bottle-value/src/announcement-height.js";

function fixture({ desktop = false, resizeObserver = true, legacyMedia = false } = {}) {
  const mediaListeners = new Set();
  const resizeListeners = new Set();
  const fontListeners = new Set();
  const frames = new Map();
  const observers = [];
  const mutations = [];
  const styleValues = new Map();
  let frameId = 0;
  let reads = 0;
  let height = 32;
  let fontsReady;
  const media = { matches: desktop };
  if (legacyMedia) {
    media.addListener = (fn) => mediaListeners.add(fn);
    media.removeListener = (fn) => mediaListeners.delete(fn);
  } else {
    media.addEventListener = (name, fn) => { assert.equal(name, "change"); mediaListeners.add(fn); };
    media.removeEventListener = (name, fn) => mediaListeners.delete(fn);
  }
  const bar = { getBoundingClientRect() { reads += 1; return { height }; } };
  const header = { style: { setProperty(name, value) { styleValues.set(name, value); } } };
  const view = {
    matchMedia(query) { assert.equal(query, "(min-width: 768px)"); return media; },
    addEventListener(name, fn) { assert.equal(name, "resize"); resizeListeners.add(fn); },
    removeEventListener(name, fn) { resizeListeners.delete(fn); },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    document: { fonts: {
      ready: new Promise((resolve) => { fontsReady = resolve; }),
      addEventListener(name, fn) { assert.equal(name, "loadingdone"); fontListeners.add(fn); },
      removeEventListener(name, fn) { fontListeners.delete(fn); },
    } },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; mutations.push(this); }
      observe(target, options) { assert.equal(target, bar); this.options = options; }
      disconnect() { this.disconnected = true; }
    },
  };
  if (resizeObserver) view.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { assert.equal(target, bar); }
    disconnect() { this.disconnected = true; }
  };
  return {
    bar, header, view, frames, observers, mutations, mediaListeners, resizeListeners, fontListeners,
    stop: () => {},
    mount() { this.stop = observeAnnouncementHeight(bar, header, view); },
    get reads() { return reads; },
    get value() { return styleValues.get("--tbv-announcement-height"); },
    set height(value) { height = value; },
    breakpoint(matches) { media.matches = matches; for (const fn of mediaListeners) fn({ matches }); },
    flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn()); },
    resize() { resizeListeners.forEach((fn) => fn()); },
    fontChanged() { fontListeners.forEach((fn) => fn()); },
    fontsReady() { fontsReady(); },
    emit(size, observer = observers.at(-1)) { observer.callback([{ target: bar, borderBoxSize: size }]); },
  };
}

test("mobile does no geometry reads, observation, or scheduled measurement", () => {
  const f = fixture();
  f.mount();
  f.resize();
  f.fontChanged();
  assert.equal(f.value, "32px");
  assert.equal(f.reads, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.observers.length, 0);
  assert.equal(f.resizeListeners.size, 0);
  f.stop();
  assert.equal(f.mediaListeners.size, 0);
});

test("desktop tracks wrapped and unwrapped border-box heights without layout reads", () => {
  const f = fixture({ desktop: true });
  f.mount();
  assert.equal(f.reads, 0);
  assert.equal(f.frames.size, 0);
  f.emit([{ blockSize: 49.2 }]);
  assert.equal(f.value, "50px");
  f.emit([{ blockSize: 31.1 }]);
  assert.equal(f.value, "32px");
  assert.equal(f.reads, 0);
  f.stop();
});

test("legacy ResizeObserver single-box shape is read without measuring DOM", () => {
  const f = fixture({ desktop: true });
  f.mount();
  f.emit({ blockSize: 44.4 });
  assert.equal(f.value, "45px");
  assert.equal(f.reads, 0);
  f.stop();
});

test("crossing the breakpoint disconnects the desktop observer and ignores stale callbacks", () => {
  const f = fixture();
  f.mount();
  f.breakpoint(true);
  const firstObserver = f.observers[0];
  f.emit([{ blockSize: 48 }]);
  assert.equal(f.value, "48px");
  f.breakpoint(false);
  assert.equal(firstObserver.disconnected, true);
  assert.equal(f.value, "32px");
  f.emit([{ blockSize: 99 }], firstObserver);
  assert.equal(f.value, "32px");
  f.breakpoint(true);
  assert.equal(f.observers.length, 2);
  f.emit([{ blockSize: 42 }]);
  f.emit([{ blockSize: 99 }], firstObserver);
  assert.equal(f.value, "42px");
  assert.equal(f.reads, 0);
  f.stop();
});

test("missing observer box data falls back to one deferred read, canceled on mobile", () => {
  const f = fixture({ desktop: true });
  f.mount();
  f.height = 52.1;
  f.emit(undefined);
  f.emit(undefined);
  assert.equal(f.frames.size, 1);
  assert.equal(f.reads, 0);
  f.flush();
  assert.equal(f.value, "53px");
  assert.equal(f.reads, 1);
  f.emit(undefined);
  f.breakpoint(false);
  assert.equal(f.frames.size, 0);
  f.flush();
  assert.equal(f.reads, 1);
  f.stop();
});

test("observer callbacks for a different target cannot alter the header", () => {
  const f = fixture({ desktop: true });
  f.mount();
  f.observers[0].callback([{ target: {}, borderBoxSize: [{ blockSize: 99 }] }]);
  assert.equal(f.value, "32px");
  assert.equal(f.frames.size, 0);
  f.stop();
});

test("without ResizeObserver, resize, text changes and fonts update the measured height", async () => {
  const f = fixture({ desktop: true, resizeObserver: false });
  f.height = 44.2;
  f.mount();
  assert.equal(f.reads, 0);
  assert.equal(f.frames.size, 1);
  f.resize();
  f.mutations[0].callback();
  f.fontChanged();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(f.value, "45px");
  assert.equal(f.reads, 1);
  f.height = 67.2;
  f.fontsReady();
  await Promise.resolve();
  f.flush();
  assert.equal(f.value, "68px");
  f.height = 40;
  f.mutations[0].callback();
  f.flush();
  assert.equal(f.value, "40px");
  f.stop();
  assert.equal(f.resizeListeners.size, 0);
  assert.equal(f.fontListeners.size, 0);
  assert.equal(f.mutations[0].disconnected, true);
});

test("fallback cleanup cancels queued work and late fonts after unmount", async () => {
  const f = fixture({ desktop: true, resizeObserver: false });
  f.mount();
  f.stop();
  f.fontsReady();
  await Promise.resolve();
  f.mutations[0].callback();
  f.flush();
  assert.equal(f.frames.size, 0);
  assert.equal(f.reads, 0);
  assert.equal(f.value, "32px");
  assert.equal(f.mediaListeners.size, 0);
});

test("page replacement cleans up the old observer before wiring a new header", () => {
  const f = fixture({ desktop: true });
  f.mount();
  const previous = f.observers[0];
  f.emit([{ blockSize: 48 }]);
  f.stop();
  f.mount();
  f.emit([{ blockSize: 36 }]);
  f.emit([{ blockSize: 99 }], previous);
  assert.equal(previous.disconnected, true);
  assert.equal(f.value, "36px");
  f.stop();
});

test("older media-query listeners receive matching cleanup", () => {
  const f = fixture({ legacyMedia: true });
  f.mount();
  f.breakpoint(true);
  f.emit([{ blockSize: 40 }]);
  assert.equal(f.value, "40px");
  f.stop();
  assert.equal(f.mediaListeners.size, 0);
  assert.equal(f.observers[0].disconnected, true);
});

test("missing DOM refs are safe during mounting or teardown", () => {
  assert.doesNotThrow(() => observeAnnouncementHeight(null, {}, {})());
  assert.doesNotThrow(() => observeAnnouncementHeight({}, null, {})());
});
