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
const routes = ['/', '/shop', '/us-warehouse', '/retatrutide-5mg', '/tirzepatide-10mg', '/melanotan-2-10mg', '/melanotan-1-10mg?warehouse=us', '/shipping-prices', '/faq', '/affiliate', '/track-order', '/contact', '/cart'];
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
  const ruo = await page.getByText(/research use only|not for human or animal use/i).count().catch(() => 0);
  const images = await page.evaluate(() => [...document.images].map(i => i.currentSrc || i.src)).catch(() => []);
  const mt1Price = await page.evaluate(() => /\$135\b/.test(document.body.innerText)).catch(() => false);
  const mt1Name = await page.evaluate(() => /melanotan-1/i.test(document.body.innerText) && !/\bMT1\b/.test(document.body.innerText)).catch(() => false);
  const file = `${label}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`;
  await page.screenshot({path: path.join(out, file)});
  await page.close();
  return {status: res.status(), ms, overflow, errors, failed, file, gate, ruo, images, mt1Name, mt1Price};
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
    // Owner decisions 2026-10-28: no research-use banner; vials carry the product names.
    check(`${pname} ${route} staging has no research-use wording`, s.ruo === 0, `stage ${s.ruo}`);
    const oldArt = s.images.filter(src => /vials-c\/(tirzepatide-glp-2|retatrutide-glp-3|semaglutide-[0-9a-f]{12}|cagrilintide-semaglutide-[0-9a-f]{12}|melanotan-2-mt2|melanotan-1-mt1)/.test(src));
    check(`${pname} ${route} staging shows no GLP-code vial art`, oldArt.length === 0, oldArt.join(', '));
    if (route.startsWith('/melanotan-1-10mg')) check(`${pname} ${route} staging shows the Melanotan-1 name, vial and price`, s.mt1Name && s.mt1Price && s.images.some(src => src.includes('vials-c/melanotan-1-label-')), s.images.join(', '));
    if (/^\/(retatrutide|tirzepatide)-/.test(route)) check(`${pname} ${route} staging shows the named vial`, s.images.some(src => src.includes(`vials-c/${route.split('-')[0].slice(1)}-label-`)), s.images.join(', '));
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
const orderNumber = (page.url().match(/order-received\/(\d+)/) || [])[1] || '';
await page.locator('.payment-return-card').waitFor({timeout: 10000}).catch(() => {});
const receivedText = await page.locator('body').innerText();
check('order uses staging test payment', /Test order — no payment \(staging\)/i.test(receivedText));
check('order-received is the storefront confirmation page', await page.locator('.payment-return-card').count() === 1 && receivedText.includes(orderNumber), orderNumber);
check('order-received never claims payment', !/payment received|payment confirmed|total paid/i.test(receivedText));
await page.screenshot({path: path.join(out, 'flow-mobile-order-received.png'), fullPage: true});
// Account icon in the React header opens the storefront account dashboard.
await page.goto(LOCAL + '/', {waitUntil: 'networkidle'});
const acctLinks = await page.evaluate(() => [...document.querySelectorAll('a[href]')].filter(a => /\/account\/?$/.test(new URL(a.href).pathname)).length);
check('storefront exposes account links', acctLinks > 0, 'none');
await page.locator('a[href$="/account"]').first().dispatchEvent('click');
await page.waitForURL(/my-account/, {timeout: 8000}).catch(() => {});
check('header account link opens My Account', /\/my-account\/?/.test(page.url()), page.url());
await page.locator('.lab-order-card').first().waitFor({timeout: 10000}).catch(() => {});
check('signed-in My Account is the storefront dashboard', await page.locator('.lab-dashboard .lab-welcome h1').count() === 1);
check('dashboard lists the new test order', orderNumber !== '' && await page.locator('.lab-order-card__id', {hasText: new RegExp(`^${orderNumber}$`)}).count() === 1, orderNumber);
await page.screenshot({path: path.join(out, 'flow-mobile-account-dashboard.png'), fullPage: true});
await page.getByRole('button', {name: /^avatars$/i}).first().click();
await page.locator('.lab-avatar-option').first().click();
await page.getByText(/avatar saved to your account/i).waitFor({timeout: 8000}).catch(() => {});
await page.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
await page.waitForTimeout(1500);
check('direct load of My Account serves the dashboard', await page.locator('.lab-dashboard .lab-welcome h1').count() === 1);
check('saved avatar persists across requests', await page.locator('a[href$="/account"] img').count() >= 1);
await page.goto(LOCAL + '/my-account/orders/', {waitUntil: 'networkidle'});
check('mobile UI order appears in My Account', await page.locator('.woocommerce-orders-table__row, tr.order').count() >= 1);
check('native account pages use the dashboard shell', await page.locator('.lab-sidebar .lab-sidenav__item').count() >= 4 && await page.locator('.tbv-native-panel').count() === 1);
await page.goto(LOCAL + '/my-account/edit-account/', {waitUntil: 'networkidle'});
check('edit-account form keeps WooCommerce fields in the shell', await page.locator('.tbv-native-panel #account_email').count() === 1 && await page.locator('.lab-sidenav__item.is-active', {hasText: /security/i}).count() === 1);
await page.screenshot({path: path.join(out, 'flow-mobile-orders.png'), fullPage: true});
await page.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
// Mobile hides the sidebar Sign out (as on the live dashboard); use its logout link.
const logoutUrl = await page.evaluate(() => window.TBV_COMMERCE?.account?.logoutUrl || '');
check('dashboard logout link uses the WooCommerce endpoint', /\/my-account\/customer-logout\/\?_wpnonce=/.test(logoutUrl), logoutUrl);
await page.goto(logoutUrl || LOCAL + '/my-account/', {waitUntil: 'networkidle'});
check('dashboard sign out returns to the storefront sign-in card', await page.locator('.tbv-auth h1').filter({hasText: /sign in/i}).count() === 1, page.url());
await page.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
check('signed out after dashboard sign out', await page.locator('.lab-dashboard').count() === 0 && await page.locator('.tbv-auth').count() === 1);
await page.goto(LOCAL + '/my-account/lost-password/', {waitUntil: 'networkidle'});
check('lost-password uses the storefront card', await page.locator('.tbv-native-card #user_login').count() === 1);
check('flow no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
// Promo box applies a WooCommerce coupon (desktop, fresh guest cart).
const promoCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
const promoPage = await promoCtx.newPage();
await promoPage.goto(LOCAL + '/retatrutide-5mg', {waitUntil: 'networkidle'});
await promoPage.getByRole('button', {name: /add to cart/i}).first().click(); await promoPage.waitForTimeout(1500);
await promoPage.goto(LOCAL + '/cart', {waitUntil: 'networkidle'}); await promoPage.waitForTimeout(1500);
await promoPage.getByPlaceholder('Enter code').first().fill('review10');
await promoPage.getByRole('button', {name: /^apply$/i}).first().click(); await promoPage.waitForTimeout(2000);
check('cart promo box applies REVIEW10 as a WooCommerce coupon', /PROMO CODE\s*REVIEW10/i.test(await promoPage.locator('body').innerText()));
await promoPage.getByRole('button', {name: /remove code/i}).first().click(); await promoPage.waitForTimeout(1500);
check('cart promo code can be removed', await promoPage.getByRole('button', {name: /remove code/i}).count() === 0);
await promoCtx.close();
await browser.close();

const failed = results.filter(r => !r.ok);
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify({passed: results.filter(r => r.ok && !r.info).length, checks: results.filter(r => !r.info).length, failed, timing: results.filter(r => r.info).map(r => `${r.name}: prod ${r.info.prodMs}ms(${r.info.prodStatus}) stage ${r.info.stageMs}ms`)}, null, 1));
