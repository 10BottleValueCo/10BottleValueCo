// Browser QA for the persistent staging site (Playwright/Chromium, headless).
// node browser-qa.mjs <outDir>
// - Visual: same routes on production (view-only) and staging (public tunnel) at iPhone and desktop sizes.
// - Flow: real UI add-to-cart, native cart, registration, test checkout and order history on the
//   LOOPBACK origin only (test credentials never leave this machine).
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium, devices} = require(process.env.TBV_PLAYWRIGHT || 'playwright');

const out = process.argv[2]; fs.mkdirSync(out, {recursive: true});
const PROD = 'https://10bottlevalue.co', STAGE = process.env.TBV_STAGING_PUBLIC_URL || 'https://staging.example.invalid', LOCAL = 'http://127.0.0.1:8088';
const routes = ['/', '/shop', '/us-warehouse', '/retatrutide-5mg', '/tirzepatide-10mg', '/shipping-prices', '/faq', '/affiliate', '/track-order', '/contact', '/cart'];
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 300)});
const env = Object.fromEntries(fs.readFileSync(new URL('../private/test-accounts.env', import.meta.url), 'utf8').split('\n').filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

const browser = await chromium.launch();
const profiles = {mobile: devices['iPhone 13'], desktop: {viewport: {width: 1440, height: 900}}};

async function visit(ctx, origin, label, route) {
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).origin === origin) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  const t0 = Date.now();
  const res = await page.goto(origin + route, {waitUntil: 'networkidle', timeout: 60000}).catch(e => ({status: () => 0, e}));
  const ms = Date.now() - t0;
  await page.waitForTimeout(800);
  const gate = await page.getByText(/researcher verification/i).count().catch(() => 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => -1);
  const file = `${label}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`;
  await page.screenshot({path: path.join(out, file)});
  await page.close();
  return {status: res.status(), ms, overflow, errors, failed, file, gate};
}

for (const [pname, profile] of Object.entries(profiles)) {
  const prod = await browser.newContext({...profile});
  const stage = await browser.newContext({...profile, extraHTTPHeaders: {'ngrok-skip-browser-warning': '1'}});
  for (const route of routes) {
    const p = await visit(prod, PROD, `${pname}-prod`, route);
    const s = await visit(stage, STAGE, `${pname}-stage`, route);
    check(`${pname} ${route} staging 200`, s.status === 200, s.status);
    // Owner decision 2026-10-28: the WordPress store has no researcher verification.
    check(`${pname} ${route} staging has no researcher gate`, s.gate === 0, `stage ${s.gate}`);
    check(`${pname} ${route} staging no horizontal overflow`, s.overflow <= 1, `overflow ${s.overflow}px`);
    check(`${pname} ${route} staging no JS errors`, s.errors.length === 0, s.errors.join(' | '));
    check(`${pname} ${route} staging no failed same-origin requests`, s.failed.length === 0, s.failed.join(', '));
    results.push({name: `${pname} ${route} timing`, ok: true, info: {prodStatus: p.status, prodMs: p.ms, stageMs: s.ms, prodOverflow: p.overflow, prodErrors: p.errors.length}});
  }
  await prod.close(); await stage.close();
}

// Real UI flow on loopback, mobile.
const ctx = await browser.newContext({...devices['iPhone 13']});
const page = await ctx.newPage();
const jsErrors = []; page.on('pageerror', e => jsErrors.push(e.message));
await page.goto(LOCAL + '/retatrutide-5mg', {waitUntil: 'networkidle'});
check('fresh visit has no researcher gate', await page.getByText(/researcher verification/i).count() === 0);
const addBtn = page.getByRole('button', {name: /add to cart/i}).first();
await addBtn.scrollIntoViewIfNeeded(); await addBtn.click();
await page.waitForTimeout(1500);
const cartLabel = await page.getByText(/cart\s*\(\d+\)/i).first().textContent().catch(() => '');
check('mobile UI add-to-cart updates header count', /\(1\)/.test(cartLabel || ''), cartLabel);
// The header CART button opens the storefront cart page (as on the live site).
await page.getByRole('link', {name: /^cart/i}).first().click();
await page.waitForTimeout(2500);
const cartText = await page.locator('main').innerText().catch(() => '');
check('mobile cart page is the storefront cart', /\/cart\/?$/.test(new URL(page.url()).pathname) && /Your cart/i.test(cartText) && /SHIPPING METHOD/i.test(cartText) && /STANDARD/.test(cartText) && /EXPRESS/.test(cartText), cartText.slice(0, 200));
check('mobile cart lists UI-added item', /Retatrutide|GLP RT-3/i.test(cartText), cartText.slice(0, 200));
check('mobile cart has sticky total + proceed bar', await page.locator('.fixed.bottom-0').filter({hasText: /proceed to checkout/i}).count() === 1);
check('signed-out cart asks to sign in', /available only for signed-in customers/i.test(cartText));
await page.screenshot({path: path.join(out, 'flow-mobile-cart.png'), fullPage: true});
// Sign in from the cart, register through the real form, return to the cart.
await page.getByRole('button', {name: /^sign in$/i}).first().click();
await page.waitForURL(/my-account\/\?tbv_return=cart/, {timeout: 10000}).catch(() => {});
check('cart sign-in opens My Account with return to cart', /tbv_return=cart/.test(page.url()), page.url());
await page.screenshot({path: path.join(out, 'flow-mobile-account-logged-out.png'), fullPage: true});
check('signed-out account page uses the storefront card', await page.locator('.tbv-auth h1').filter({hasText: /sign in/i}).count() === 1 && await page.locator('header a[aria-label="Cart"]').count() === 1);
await page.getByRole('button', {name: /^create account$/i}).click();
const email = `ui.${Date.now()}@example.test`;
await page.locator('#reg_email').pressSequentially(email, {delay: 15});
await page.locator('#reg_password').pressSequentially(env.E2E_RUN_PASSWORD, {delay: 15});
await page.waitForTimeout(500);
await Promise.all([page.waitForNavigation({timeout: 15000}).catch(() => {}), page.locator('button[name="register"]').click()]);
await page.waitForLoadState('networkidle'); await page.waitForTimeout(2000);
check('mobile UI registration returns to cart', /\/cart\/?$/.test(new URL(page.url()).pathname), page.url());
check('cart shows signed-in account email', await page.locator(`input[value="${email}"]`).count() === 1);
// Shipping details, purchaser attestation, test order.
const field = (re) => page.getByPlaceholder(re).first();
await field(/First name/).fill('Test'); await field(/Last name/).fill('Researcher');
await field(/Country/).click(); await field(/Country/).fill('United States'); await page.waitForTimeout(300);
await page.getByRole('button', {name: /^United States$/}).first().click();
await field(/Street address/).fill('123 Example Lane'); await field(/City/).fill('Springfield'); await field(/Postal code/).fill('62701');
await field(/State/).fill('Illinois'); await field(/Phone/i).fill('5550100');
await page.waitForTimeout(1500);
await page.screenshot({path: path.join(out, 'flow-mobile-checkout.png'), fullPage: true});
await page.getByRole('button', {name: /proceed to checkout/i}).last().click();
await page.waitForURL(/order-received/, {timeout: 20000}).catch(() => {});
check('mobile UI test order reaches order-received', /order-received/.test(page.url()), page.url());
check('order uses staging test payment', /Test order — no payment \(staging\)/.test(await page.locator('body').innerText()));
await page.screenshot({path: path.join(out, 'flow-mobile-order-received.png'), fullPage: true});
// Account icon in the React header leads to native My Account.
await page.goto(LOCAL + '/', {waitUntil: 'networkidle'});
const acctLinks = await page.evaluate(() => [...document.querySelectorAll('a[href]')].filter(a => /\/account\/?$/.test(new URL(a.href).pathname)).length);
check('storefront exposes account links', acctLinks > 0, 'none');
await page.locator('a[href$="/account"]').first().dispatchEvent('click');
await page.waitForURL(/my-account/, {timeout: 8000}).catch(() => {});
check('header account link opens native My Account', /\/my-account\/?/.test(page.url()), page.url());
await page.screenshot({path: path.join(out, 'flow-mobile-account-dashboard.png'), fullPage: true});
await page.goto(LOCAL + '/my-account/orders/', {waitUntil: 'networkidle'});
check('mobile UI order appears in My Account', await page.locator('.woocommerce-orders-table__row, tr.order').count() >= 1);
await page.screenshot({path: path.join(out, 'flow-mobile-orders.png'), fullPage: true});
check('flow no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
await browser.close();

const failed = results.filter(r => !r.ok);
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify({passed: results.filter(r => r.ok && !r.info).length, checks: results.filter(r => !r.info).length, failed, timing: results.filter(r => r.info).map(r => `${r.name}: prod ${r.info.prodMs}ms(${r.info.prodStatus}) stage ${r.info.stageMs}ms`)}, null, 1));
