import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';

// Execute the actual startup effect and worker with synthetic image I/O. This
// catches accidental whole-catalog downloads without a browser or credentials.
const appRequire = createRequire(new URL('../artifacts/10-bottle-value/package.json', import.meta.url));
const pluginRequire = createRequire(appRequire.resolve('@vitejs/plugin-react'));
const babelRequire = createRequire(pluginRequire.resolve('@babel/core'));
const { parse } = babelRequire('@babel/parser');
const source = await readFile(new URL('../artifacts/10-bottle-value/src/App.jsx', import.meta.url), 'utf8');
const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
const appBody = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration' && node.declaration.id?.name === 'App').declaration.body.body;
const warmingEffect = appBody.find(node => node.type === 'ExpressionStatement' && node.expression.callee?.name === 'useEffect' && source.slice(node.start, node.end).includes('const routeBackgrounds'))?.expression;
assert.ok(warmingEffect, 'current-route image warming effect exists');
const functionSource = name => {
  const node = ast.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === name);
  assert.ok(node, `${name} exists`);
  return source.slice(node.start, node.end).replaceAll('import.meta.env.BASE_URL', '"/"');
};

function fixture({ page = 'home', mobile = false, gate = false, language = 'EN' } = {}) {
  const calls = [];
  const scheduled = [];
  const states = [];
  const cancelled = [];
  const context = vm.createContext({
    page, language, researcherEntryGateActive: gate,
    worldwideCatalogBackground: '/catalog.webp', faqBackgroundImage: '/faq.webp',
    laboratoryBackgroundImage: '/lab.webp', legalPolicyBackgroundImage: '/legal.webp',
    cashAppLogo: '/cash-app.svg', bitcoinLogo: '/bitcoin.svg', paypalMark: '/paypal.svg',
    // Sentinels must never be consulted by an explicit current-page warmup.
    vialCManifest: { unused: 'unrelated-vial.webp' },
    publicImagePaths: ['unrelated-coa.png'],
    preloadImage: async src => { calls.push(src); },
    setPublicImagesState: state => { states.push(state); },
    console: { error() {}, warn() {} },
    window: {
      matchMedia: query => { assert.equal(query, '(max-width: 640px)'); return { matches: mobile }; },
      requestIdleCallback: callback => { scheduled.push(callback); return scheduled.length; },
      cancelIdleCallback: id => { cancelled.push(id); },
      clearTimeout() {},
    },
  });
  context.preloadPublicImages = vm.runInContext(`(${functionSource('preloadPublicImages')})`, context);
  const effect = vm.runInContext(`(${source.slice(warmingEffect.arguments[0].start, warmingEffect.arguments[0].end).replaceAll('import.meta.env.BASE_URL', '"/"')})`, context);
  return { calls, states, scheduled, cancelled, context, effect };
}

test('image worker loads only explicitly supplied sources, never either manifest', async () => {
  const f = fixture();
  await f.context.preloadPublicImages();
  assert.deepEqual(f.calls, []);
  await f.context.preloadPublicImages(['/visible.webp', '/visible.webp']);
  assert.deepEqual(f.calls, ['/visible.webp']);
});

test('current-route warmup uses native image URLs without fetch/blob retention', async () => {
  const imageSources = [];
  let decodes = 0;
  let fetches = 0;
  class NativeImage {
    complete = false;
    naturalWidth = 0;
    set src(value) {
      imageSources.push(value);
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = 100;
        this.onload();
      });
    }
    async decode() { decodes += 1; }
  }
  const context = vm.createContext({
    window: { location: { href: 'https://example.test/' } },
    URL,
    Image: NativeImage,
    fetch: async () => { fetches += 1; throw new Error('Warmup must use native Image loading'); },
    publicImageLoads: new Map(),
    pendingPublicImageLoads: new Map(),
    preloadedDisplayImageUrls: new Map(),
    originalImageSourcesByObjectUrl: new Map(),
  });
  for (const name of ['canonicalImageUrl', 'preloadImage', 'preloadPublicImages']) {
    vm.runInContext(functionSource(name), context);
  }
  await context.preloadPublicImages(['/hero.webp', '/lower.webp', '/hero.webp']);
  await context.preloadPublicImages(['/hero.webp']);
  assert.deepEqual(imageSources.sort(), ['/hero.webp', '/lower.webp']);
  assert.equal(decodes, 2);
  assert.equal(fetches, 0);
  assert.equal(context.pendingPublicImageLoads.size, 0);
  assert.equal(context.preloadedDisplayImageUrls.size, 0);
  assert.equal(context.originalImageSourcesByObjectUrl.size, 0);
});

for (const mobile of [false, true]) {
  test(`homepage warming selects only its ${mobile ? 'mobile' : 'desktop'} hero and lower background`, async () => {
    const f = fixture({ mobile });
    f.effect();
    assert.equal(f.scheduled.length, 1);
    await f.scheduled[0]();
    assert.deepEqual(f.calls, [
      `/images/${mobile ? 'homepage-hero-mobile-vial' : 'homepage-hero-background'}.webp`,
      '/images/homepage-lower-background.webp',
    ]);
    assert.equal(f.states.at(-1), 'ready');
  });
}

test('localized mobile homepage warms the desktop backdrop actually rendered by its hero', async () => {
  const f = fixture({ mobile: true, language: 'RU' });
  f.effect();
  await f.scheduled[0]();
  assert.deepEqual(f.calls, ['/images/homepage-hero-background.webp', '/images/homepage-lower-background.webp']);
  const dependencies = warmingEffect.arguments[1].elements.map(node => node.name);
  assert.ok(dependencies.includes('language'), 'changing locale replaces the hero warmup');
});

test('other routes warm only their own rendered background and no speculative vials or payment logos', async () => {
  const routes = {
    shop: ['/catalog.webp'], product: ['/catalog.webp'], 'us-warehouse': ['/catalog.webp'], cart: ['/catalog.webp'],
    faq: ['/faq.webp'], account: ['/lab.webp'], contact: ['/lab.webp'], track: ['/lab.webp'], admin: ['/lab.webp'],
    terms: ['/legal.webp'], privacy: ['/legal.webp'], shipping: ['/legal.webp'], refund: ['/legal.webp'], attestation: ['/legal.webp'],
    affiliate: ['/images/affiliate-lab-background.webp'], bonuses: ['/images/shipping-prices-warehouse-background.webp'],
    about: [], 'payment-return': [],
  };
  for (const [page, expected] of Object.entries(routes)) {
    const f = fixture({ page });
    f.effect();
    await f.scheduled[0]();
    assert.deepEqual(f.calls, expected, page);
  }
  const dependencies = warmingEffect.arguments[1].elements.map(node => node.name);
  assert.ok(dependencies.includes('page'), 'navigation replaces the current-route warmup');
});

test('entry gate prevents background warmup until acceptance', () => {
  const f = fixture({ gate: true });
  assert.equal(f.effect(), undefined);
  assert.deepEqual(f.scheduled, []);
  assert.deepEqual(f.calls, []);
});

test('navigation cleanup cancels queued work and cannot start requests for the previous route', async () => {
  const f = fixture();
  const cleanup = f.effect();
  cleanup();
  await f.scheduled[0]();
  assert.deepEqual(f.cancelled, [1]);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.states, []);
});
