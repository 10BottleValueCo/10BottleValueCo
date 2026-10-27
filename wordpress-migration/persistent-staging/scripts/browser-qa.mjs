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
const routes = ['/', '/shop', '/us-warehouse', '/retatrutide-5mg', '/tirzepatide-10mg', '/shipping-prices', '/faq', '/affiliate', '/track-order', '/contact'];
const results = [];
const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 300)});
const env = Object.fromEntries(fs.readFileSync(new URL('../private/test-accounts.env', import.meta.url), 'utf8').split('\n').filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

const browser = await chromium.launch();
const profiles = {mobile: devices['iPhone 13'], desktop: {viewport: {width: 1440, height: 900}}};

// Complete the first-visit researcher verification through its real controls.
async function acceptGate(page) {
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  if (!(await dialog.count())) return false;
  await dialog.locator('select').selectOption('laboratory');
  for (const box of await dialog.locator('input[type="checkbox"]').all()) await box.check();
  await dialog.locator('button[type="submit"]').click();
  await page.waitForTimeout(500);
  return (await dialog.count()) === 0;
}

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
    check(`${pname} ${route} researcher gate matches production`, (p.gate > 0) === (s.gate > 0), `prod ${p.gate} stage ${s.gate}`);
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
check('fresh visit shows researcher gate', await page.getByText(/researcher verification/i).count() > 0);
check('researcher gate accepts through real controls', await acceptGate(page));
await page.reload({waitUntil: 'networkidle'});
check('researcher acceptance remembered on reload', await page.getByText(/researcher verification/i).count() === 0);
const addBtn = page.getByRole('button', {name: /add to cart/i}).first();
await addBtn.scrollIntoViewIfNeeded(); await addBtn.click();
await page.waitForTimeout(1500);
const cartLabel = await page.getByText(/cart\s*\(\d+\)/i).first().textContent().catch(() => '');
check('mobile UI add-to-cart updates header count', /\(1\)/.test(cartLabel || ''), cartLabel);
await page.goto(LOCAL + '/cart/', {waitUntil: 'networkidle'});
check('mobile native cart lists UI-added item', await page.locator('.cart_item, .woocommerce-cart-form__cart-item').count() >= 1);
await page.screenshot({path: path.join(out, 'flow-mobile-cart.png')});
// Account icon in the React header leads to native My Account.
await page.goto(LOCAL + '/', {waitUntil: 'networkidle'});
const acctLinks = await page.evaluate(() => [...document.querySelectorAll('a[href]')].filter(a => /\/account\/?$/.test(new URL(a.href).pathname)).map(a => a.textContent.trim() || a.getAttribute('aria-label') || 'icon'));
check('storefront exposes account/register links', acctLinks.length > 0, 'none');
await page.locator('a[href$="/account"]').first().dispatchEvent('click');
await page.waitForURL(/my-account/, {timeout: 8000}).catch(() => {});
check('header account link opens native My Account', /\/my-account\/?/.test(page.url()), page.url());
// Register through the real form.
await page.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
await page.screenshot({path: path.join(out, 'flow-mobile-account-logged-out.png'), fullPage: true});
const email = `ui.${Date.now()}@example.test`;
await page.locator('#reg_email').pressSequentially(email, {delay: 15});
await page.locator('#reg_password').pressSequentially(env.E2E_RUN_PASSWORD, {delay: 15});
await page.waitForTimeout(500);
await Promise.all([page.waitForNavigation({timeout: 15000}).catch(() => {}), page.locator('button[name="register"]').click()]);
await page.waitForLoadState('networkidle');
check('mobile UI registration logs in', await page.locator('.woocommerce-MyAccount-navigation').count() > 0);
await page.screenshot({path: path.join(out, 'flow-mobile-account-dashboard.png'), fullPage: true});
// Checkout through the real form with fictional data.
await page.goto(LOCAL + '/checkout/', {waitUntil: 'networkidle'});
for (const [sel, val] of [['#billing_first_name', 'Test'], ['#billing_last_name', 'Researcher'], ['#billing_address_1', '123 Example Lane'], ['#billing_city', 'Springfield'], ['#billing_postcode', '62701'], ['#billing_phone', '5550100']]) await page.fill(sel, val);
await page.selectOption('#billing_state', 'IL').catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({path: path.join(out, 'flow-mobile-checkout.png'), fullPage: true});
check('checkout shows only staging test payment', (await page.locator('input[name="payment_method"]').count()) === 1 && (await page.locator('#payment_method_tbv_staging_test').count()) === 1);
await page.click('#place_order');
await page.waitForURL(/order-received/, {timeout: 20000}).catch(() => {});
check('mobile UI test order reaches order-received', /order-received/.test(page.url()), page.url());
await page.screenshot({path: path.join(out, 'flow-mobile-order-received.png'), fullPage: true});
await page.goto(LOCAL + '/my-account/orders/', {waitUntil: 'networkidle'});
check('mobile UI order appears in My Account', await page.locator('.woocommerce-orders-table__row, tr.order').count() >= 1);
await page.screenshot({path: path.join(out, 'flow-mobile-orders.png'), fullPage: true});
check('flow no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
await browser.close();

const failed = results.filter(r => !r.ok);
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify({passed: results.filter(r => r.ok && !r.info).length, checks: results.filter(r => !r.info).length, failed, timing: results.filter(r => r.info).map(r => `${r.name}: prod ${r.info.prodMs}ms(${r.info.prodStatus}) stage ${r.info.stageMs}ms`)}, null, 1));
