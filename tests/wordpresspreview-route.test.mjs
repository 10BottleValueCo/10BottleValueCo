import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const publicRoot = new URL('../artifacts/10-bottle-value/public/', import.meta.url);
const previewRules = config.rewrites.filter(rule => rule.source.startsWith('/wordpresspreview'));
const spa = config.rewrites.find(rule => rule.destination === '/index.html');
const previewBase = '/wordpresspreview/';

function html(relative) { return readFileSync(new URL(relative, publicRoot), 'utf8'); }
function baseHref(document) {
  const tags = [...document.matchAll(/<base\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
  assert.equal(tags.length, 1, 'one explicit base per copied document');
  return tags[0][1];
}

test('preview documents and scoped asset identity resolve before the storefront SPA', () => {
  assert.deepEqual(previewRules, [
    { source: '/wordpresspreview', destination: '/wordpresspreview/index.html' },
    { source: '/wordpresspreview/', destination: '/wordpresspreview/index.html' },
    { source: '/wordpresspreview/:path*', destination: '/wordpresspreview/:path*' },
  ]);
  for (const rule of previewRules) assert.ok(config.rewrites.indexOf(rule) < config.rewrites.indexOf(spa));
});

test('unknown preview paths are excluded from the existing storefront fallback', () => {
  const fallback = new RegExp(`^${spa.source}$`);
  for (const path of ['/wordpresspreview', '/wordpresspreview/', '/wordpresspreview/missing.js', '/wordpresspreview/assets/missing.webp', '/wordpresspreview/storefront-review/missing.json', '/api/orders']) {
    assert.equal(fallback.test(path), false, path);
  }
  for (const path of ['/', '/shop', '/us-warehouse', '/cart', '/account', '/bpc-157-10mg', '/wordpresspreview-extra']) {
    assert.equal(fallback.test(path), true, path);
  }
});

test('preview response policy is scoped and does not replace production build or API settings', () => {
  const scoped = config.headers.filter(rule => rule.source.startsWith('/wordpresspreview'));
  assert.deepEqual(scoped, [{source:'/wordpresspreview/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'},{key:'Cache-Control',value:'no-store'}]}]);
  assert.equal(config.buildCommand, 'pnpm --filter @workspace/10-bottle-value run build');
  assert.equal(config.outputDirectory, 'artifacts/10-bottle-value/dist/public');
  assert.ok(config.rewrites.some(rule => rule.source === '/api/:path*' && rule.destination === '/api/:path*'));
  assert.ok(config.rewrites.some(rule => rule.source === '/operations' && rule.destination === '/operations.html'));
});

test('copied launcher resolves its script under the prefix from the exact no-slash URL', () => {
  const document = html('wordpresspreview/index.html');
  assert.equal(baseHref(document), previewBase);
  const script = document.match(/<script[^>]+src=["']([^"']+\.js)["']/i)?.[1];
  assert.ok(script);
  for (const request of ['https://10bottlevalue.co/wordpresspreview', 'https://10bottlevalue.co/wordpresspreview/']) {
    const resolved = new URL(script, new URL(baseHref(document), request));
    assert.ok(resolved.pathname.startsWith('/wordpresspreview/preview-'));
    assert.ok(existsSync(new URL(resolved.pathname.slice(1), publicRoot)));
  }
});

test('copied review iframe resolves relative code and styles under its own subdirectory', () => {
  const document = html('wordpresspreview/storefront-review/index.html');
  assert.equal(baseHref(document), '/wordpresspreview/storefront-review/');
  const references = [...document.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(match => match[1]);
  const local = references.filter(value => value.startsWith('./') && /\.(js|css)(?:\?|$)/.test(value));
  assert.ok(local.length > 0);
  for (const reference of local) {
    const resolved = new URL(reference, new URL(baseHref(document), 'https://10bottlevalue.co/wordpresspreview/storefront-review/index.html'));
    assert.ok(resolved.pathname.startsWith('/wordpresspreview/storefront-review/'));
    assert.ok(existsSync(new URL(resolved.pathname.slice(1), publicRoot)), resolved.pathname);
  }
});

const origin = process.env.WORDPRESSPREVIEW_ROUTE_ORIGIN;
test('candidate HTTP serves prefixed documents and refuses missing preview assets', {skip: !origin}, async () => {
  for (const path of ['/wordpresspreview', '/wordpresspreview/', '/wordpresspreview/storefront-review/index.html']) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    assert.match(await response.text(), /<base href="\/wordpresspreview\//);
  }
  for (const path of ['/wordpresspreview/missing.js', '/wordpresspreview/assets/missing.webp', '/wordpresspreview/storefront-review/missing.json']) {
    const response = await fetch(new URL(path, origin));
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(await response.text(), /storefront-[A-Za-z0-9_-]+\.js|index-ME5vzbmC\.js/);
  }
});
