// Browser QA for the persistent staging site (Playwright/Chromium, headless).
// node browser-qa.mjs <outDir>
// - Visual: same routes on production (view-only) and staging (public tunnel) at iPhone and desktop sizes.
// - Flow: real UI add-to-cart, native cart, registration, test checkout and order history on the
//   LOOPBACK origin only (test credentials never leave this machine).
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
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
check('sign-up card has the live fields', await page.locator('#reg_password_confirm').isVisible() && await page.locator('#reg_tbv_code').isVisible() && await page.locator('.tbv-auth form.register').getByText(/privacy policy/i).count() === 0);
await page.locator('#reg_password_confirm').pressSequentially(env.E2E_RUN_PASSWORD, {delay: 15});
check('sign-up card shows no password strength warning', await page.locator('.woocommerce-password-strength, .woocommerce-password-hint').count() === 0 && !/very weak/i.test(await page.locator('body').innerText()));
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

// Affiliates and store credit (desktop, loopback; synthetic credit via WP-CLI).
const wp = (...args) => execFileSync('wp', [...args, `--path=${new URL('../wordpress', import.meta.url).pathname}`], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
async function registerUI(pg, email) {
  await pg.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
  await pg.getByRole('button', {name: /^create account$/i}).click();
  await pg.locator('#reg_email').fill(email);
  await pg.locator('#reg_password').fill(env.E2E_RUN_PASSWORD);
  await pg.locator('#reg_password_confirm').fill(env.E2E_RUN_PASSWORD);
  await Promise.all([pg.waitForNavigation({timeout: 15000}).catch(() => {}), pg.locator('button[name="register"]').click()]);
  await pg.waitForLoadState('networkidle');
}
async function fillShipping(pg) {
  const f = (re) => pg.getByPlaceholder(re).first();
  await f(/First name/).fill('Test'); await f(/Last name/).fill('Researcher');
  await f(/Country/).click(); await f(/Country/).fill('United States'); await pg.waitForTimeout(300);
  await pg.getByRole('button', {name: /^United States$/}).first().click();
  await f(/Street address/).fill('123 Example Lane'); await f(/City/).fill('Springfield'); await f(/Postal code/).fill('62701');
  await f(/State/).fill('Illinois'); await f(/Phone/i).fill('5550100');
  await pg.waitForTimeout(1500);
}
const affCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
const affPage = await affCtx.newPage();
const affErrors = []; affPage.on('pageerror', e => affErrors.push(String(e)));
const referred = `ui.referred.${Date.now()}@example.test`;
await registerUI(affPage, referred);
wp('tbv-credit', 'adjust', referred, 'add', '1000.00', 'browser QA synthetic credit');
await affPage.goto(LOCAL + '/?c=reviewaff', {waitUntil: 'networkidle'});
await affPage.goto(LOCAL + '/retatrutide-5mg', {waitUntil: 'networkidle'});
await affPage.getByRole('button', {name: /add to cart/i}).first().click(); await affPage.waitForTimeout(1500);
await affPage.goto(LOCAL + '/cart', {waitUntil: 'networkidle'}); await affPage.waitForTimeout(2500);
let affText = await affPage.locator('body').innerText();
check('referral link gives the affiliate discount line in the cart', /Affiliate discount \(REVIEWAFF\)/i.test(affText), affText.slice(0, 200));
check('cart shows store credit covering the order', /Store credit/i.test(affText) && await affPage.getByRole('button', {name: /pay with credits/i}).count() >= 1);
await fillShipping(affPage);
await affPage.screenshot({path: path.join(out, 'flow-desktop-credit-cart.png'), fullPage: true});
await affPage.getByRole('button', {name: /pay with credits/i}).first().click();
await affPage.waitForURL(/order-received/, {timeout: 20000}).catch(() => {});
check('pay with credits reaches order-received', /order-received/.test(affPage.url()), affPage.url());
const creditOrder = (affPage.url().match(/order-received\/(\d+)/) || [])[1] || '';
check('credit order is paid with store credit', creditOrder !== '' && wp('eval', `$o = wc_get_order(${creditOrder}); echo $o->get_status() . '|' . $o->get_payment_method();`) === 'processing|tbv_store_credit');
await affPage.screenshot({path: path.join(out, 'flow-desktop-credit-received.png'), fullPage: true});
// Track Order page finds the signed-in customer's order and its tracking number.
if (creditOrder) wp('eval', `$o = wc_get_order(${creditOrder}); $o->update_meta_data('_tbv_tracking_number', '1Z999AA10123456784'); $o->save();`);
await affPage.goto(LOCAL + '/track-order', {waitUntil: 'networkidle'});
await affPage.getByPlaceholder(/order/i).first().fill(creditOrder);
await affPage.getByRole('button', {name: /check/i}).first().click();
await affPage.getByText('1Z999AA10123456784').first().waitFor({timeout: 10000}).catch(() => {});
const trackText = await affPage.locator('body').innerText();
check('track order page shows the order and tracking number', creditOrder !== '' && trackText.includes('1Z999AA10123456784') && trackText.includes(creditOrder), trackText.slice(0, 300));
await affPage.screenshot({path: path.join(out, 'flow-desktop-track-order.png'), fullPage: true});
// Typed affiliate code in the promo box (fresh customer, no referral link).
const typedCtx = await browser.newContext({viewport: {width: 1440, height: 900}});
const typedPage = await typedCtx.newPage();
await registerUI(typedPage, `ui.typed.${Date.now()}@example.test`);
await typedPage.goto(LOCAL + '/retatrutide-5mg', {waitUntil: 'networkidle'});
await typedPage.getByRole('button', {name: /add to cart/i}).first().click(); await typedPage.waitForTimeout(1500);
await typedPage.goto(LOCAL + '/cart', {waitUntil: 'networkidle'}); await typedPage.waitForTimeout(2000);
await typedPage.getByPlaceholder('Enter code').first().fill('reviewaff');
await typedPage.getByRole('button', {name: /^apply$/i}).first().click(); await typedPage.waitForTimeout(2500);
check('promo box accepts an affiliate code', /Affiliate discount \(REVIEWAFF\)/i.test(await typedPage.locator('body').innerText()));
await typedCtx.close();
// The affiliate's own panel in My Account.
await affPage.goto(LOCAL + '/my-account/customer-logout/', {waitUntil: 'networkidle'}).catch(() => {});
await affCtx.clearCookies();
await affPage.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
await affPage.locator('#username').fill(env.TEST_CUSTOMER_3_EMAIL);
await affPage.locator('#password').fill(env.TEST_CUSTOMER_3_PASSWORD);
await Promise.all([affPage.waitForNavigation({timeout: 15000}).catch(() => {}), affPage.locator('button[name="login"]').click()]);
await affPage.waitForLoadState('networkidle'); await affPage.waitForTimeout(1500);
await affPage.getByRole('button', {name: /^affiliate$/i}).first().click();
await affPage.getByText(/Commission earned/i).first().waitFor({timeout: 10000}).catch(() => {});
await affPage.waitForTimeout(1500);
affText = await affPage.locator('body').innerText();
check('affiliate panel shows code and earnings', /REVIEWAFF/.test(affText) && /Commission earned/i.test(affText) && /Available balance/i.test(affText) && /Paid out/i.test(affText), affText.slice(0, 300));
const affLinks = await affPage.evaluate(() => [...document.querySelectorAll('input')].map(i => i.value).filter(v => v.includes('?c=')));
check('affiliate link points at this site', affLinks.includes(LOCAL + '/?c=reviewaff'), affLinks.join(' '));
check('affiliate panel lists the credit order', creditOrder !== '' && affText.includes(creditOrder), creditOrder);
await affPage.screenshot({path: path.join(out, 'flow-desktop-affiliate-panel.png'), fullPage: true});
check('affiliate/credit flow no JS errors', affErrors.length === 0, affErrors.join(' | '));
await affCtx.close();

// The live admin panel for a WooCommerce shop manager (staging admin account).
const stagingEnv = Object.fromEntries(fs.readFileSync(new URL('../private/staging.env', import.meta.url), 'utf8').split('\n').filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^'|'$/g, '')]));
const adminOrder = wp('eval', `$v = wc_get_products(['limit' => 1, 'type' => 'variation'])[0]; $o = wc_create_order(); $o->add_product($v, 1); $o->set_billing_email('admin.qa@example.test'); $o->set_billing_first_name('Admin'); $o->set_billing_last_name('QA'); $o->set_billing_country('US'); $o->set_payment_method('tbv_staging_test'); $o->update_meta_data('_tbv_staging_test_order', '1'); $o->calculate_totals(false); $o->save(); echo $o->get_id();`);
const adminCtx = await browser.newContext({viewport: {width: 1440, height: 1000}});
const adminPage = await adminCtx.newPage();
const adminErrors = []; adminPage.on('pageerror', e => adminErrors.push(String(e))); adminPage.on('dialog', d => d.accept());
await adminPage.goto(LOCAL + '/my-account/', {waitUntil: 'networkidle'});
await adminPage.locator('#username').fill(stagingEnv.WP_ADMIN_USER);
await adminPage.locator('#password').fill(stagingEnv.WP_ADMIN_PASSWORD);
await Promise.all([adminPage.waitForNavigation({timeout: 15000}).catch(() => {}), adminPage.locator('button[name="login"]').click()]);
await adminPage.goto(LOCAL + '/shop', {waitUntil: 'networkidle'});
check('storefront hides the WordPress toolbar', await adminPage.locator('#wpadminbar').count() === 0);
await adminPage.getByText(/^ADMIN$/).first().dispatchEvent('click');
await adminPage.getByText(/^ALL \(\d+\)$/).first().waitFor({timeout: 15000}).catch(() => {});
let adminText = await adminPage.locator('body').innerText();
check('admin panel shows the live tabs', ['ORDERS', 'CHARTS', 'INBOX', 'PROMO', 'TOOLS', 'AFFILIATES', 'ANALYTICS', 'FUNNEL'].every(t => adminText.includes(t)), adminText.slice(0, 300));
await adminPage.getByPlaceholder('Search orders…').fill(adminOrder); await adminPage.waitForTimeout(1500);
adminText = await adminPage.locator('body').innerText();
check('admin orders list includes WooCommerce orders', adminText.includes('admin.qa@example.test') && adminText.includes('Admin QA'), adminOrder);
await adminPage.locator('select:has(option[value="refunded"])').first().selectOption('done'); await adminPage.waitForTimeout(2000);
check('admin status change updates WooCommerce', wp('eval', `echo wc_get_order(${adminOrder})->get_status();`) === 'completed');
await adminPage.getByPlaceholder('e.g. 1Z999AA10123456784').first().fill('1ZADMINQA0001');
await adminPage.getByPlaceholder('e.g. 1Z999AA10123456784').first().press('Tab'); await adminPage.waitForTimeout(2500);
check('admin tracking number saved to the order', wp('eval', `echo wc_get_order(${adminOrder})->get_meta('_tbv_tracking_number');`) === '1ZADMINQA0001');
check('tracking email honestly not sent on staging', /Tracking email not sent: Staging/i.test(await adminPage.locator('body').innerText()));
await adminPage.screenshot({path: path.join(out, 'flow-desktop-admin-orders.png')});
await adminPage.getByRole('button', {name: /^affiliates$/i}).first().click(); await adminPage.waitForTimeout(2500);
check('admin affiliates tab lists REVIEWAFF', (await adminPage.locator('body').innerText()).includes('REVIEWAFF'));
await adminPage.screenshot({path: path.join(out, 'flow-desktop-admin-affiliates.png')});
const adminApi = await adminPage.evaluate(async () => {
  const a = window.TBV_COMMERCE.admin; const h = {'X-WP-Nonce': a.nonce, 'Content-Type': 'application/json'};
  const j = async (path, opt = {}) => { const r = await fetch(a.endpoint + '/' + path, {credentials: 'same-origin', headers: h, ...opt}); return {status: r.status, body: await r.json().catch(() => null)}; };
  const code = 'QAPROMO' + Date.now().toString().slice(-6);
  const created = await j('promos', {method: 'POST', body: JSON.stringify({code, rate: 7})});
  const listed = await j('promos');
  const removed = created.body?.id ? await j('promos/' + created.body.id, {method: 'DELETE'}) : {status: 0};
  const credit = await j('credit?email=' + encodeURIComponent('test.customer3@example.test'));
  return {code, created: created.status, listed: (listed.body || []).some(p => p.code === code && p.rate === 0.07), removed: removed.status, credit: credit.status === 200 && typeof credit.body?.amount === 'number'};
});
check('admin promo codes are WooCommerce coupons', adminApi.created === 200 && adminApi.listed && adminApi.removed === 200, JSON.stringify(adminApi));
check('admin store credit lookup', adminApi.credit, JSON.stringify(adminApi));
check('admin panel no JS errors', adminErrors.length === 0, adminErrors.join(' | '));
await adminCtx.close();
await browser.close();

const failed = results.filter(r => !r.ok);
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
console.log(JSON.stringify({passed: results.filter(r => r.ok && !r.info).length, checks: results.filter(r => !r.info).length, failed, timing: results.filter(r => r.info).map(r => `${r.name}: prod ${r.info.prodMs}ms(${r.info.prodStatus}) stage ${r.info.stageMs}ms`)}, null, 1));
