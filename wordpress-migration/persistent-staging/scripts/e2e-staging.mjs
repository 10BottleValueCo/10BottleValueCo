// End-to-end HTTP checks for the persistent WordPress staging site.
// Usage: node e2e-staging.mjs <baseUrl> [--accounts] [--phase=all|before-restart|after-restart]
// Credentialed account checks (--accounts) are meant for the loopback origin only.
// State shared between restart phases is kept in the private directory.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const privateDir = path.join(here, '..', 'private');
const base = (process.argv[2] || 'http://127.0.0.1:8088').replace(/\/+$/, '');
const withAccounts = process.argv.includes('--accounts');
const phase = (process.argv.find(a => a.startsWith('--phase=')) || '--phase=all').slice(8);
const statePath = path.join(privateDir, 'e2e-restart-state.json');
const env = Object.fromEntries(fs.readFileSync(path.join(privateDir, 'test-accounts.env'), 'utf8')
  .split('\n').filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^'|'$/g, '')]; }));
if (withAccounts && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error('Refusing credentialed checks on a non-loopback origin'); process.exit(2); }

const results = [];
function check(name, ok, detail = '') { results.push({name, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 300)}); }

class Client {
  constructor(jar = {}) { this.jar = jar; }
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';'); const i = pair.indexOf('='); const k = pair.slice(0, i).trim(); const v = pair.slice(i + 1);
      if (/expires=Thu, 01[- ]Jan[- ]1970/i.test(c) || v === 'deleted' || /max-age=0/i.test(c)) delete this.jar[k]; else this.jar[k] = v;
    }
  }
  async req(p, opt = {}) {
    const headers = {'ngrok-skip-browser-warning': '1', 'user-agent': 'tbv-staging-e2e', ...(opt.headers || {})};
    if (Object.keys(this.jar).length) headers.cookie = this.cookie();
    const res = await fetch(p.startsWith('http') ? p : base + p, {method: opt.method || 'GET', headers, body: opt.body, redirect: 'manual'});
    this.store(res);
    const text = await res.text();
    return {status: res.status, headers: res.headers, text, location: res.headers.get('location') || ''};
  }
  async follow(p, opt = {}) {
    let r = await this.req(p, opt); let hops = 0;
    while ([301, 302, 303, 307].includes(r.status) && hops++ < 5) r = await this.req(new URL(r.location, base).href);
    return r;
  }
}
const hidden = (html, name) => (html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`)) || html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`)) || [])[1];
const form = o => new URLSearchParams(o).toString();
const formHeaders = {'content-type': 'application/x-www-form-urlencoded'};

async function cartApi(c, route = '', body) {
  const g = await c.req('/wp-json/wc/store/v1/cart');
  const nonce = g.headers.get('nonce');
  if (!route) return {status: g.status, json: JSON.parse(g.text || '{}'), nonce};
  const r = await c.req('/wp-json/wc/store/v1/cart/' + route, {method: 'POST', headers: {'content-type': 'application/json', nonce, origin: base}, body: JSON.stringify(body)});
  let json = {}; try { json = JSON.parse(r.text); } catch {}
  return {status: r.status, json};
}

async function pickOffers() {
  const r = await new Client().req('/wp-json/tbv-catalog/v1/products?per_page=100');
  const body = JSON.parse(r.text);
  const offers = body.products.flatMap(p => p.offers.map(o => ({...o, product: p.name}))).filter(o => o.purchasable && o.price && o.stock_status !== 'outofstock');
  return {status: r.status, offers, products: body.products.length};
}

async function guestChecks() {
  const home = await new Client().req('/');
  check('home_200', home.status === 200, home.status);
  check('home_banner', home.text.includes('WordPress preview — staging'), 'banner missing');
  check('home_noindex', /noindex/.test(home.headers.get('x-robots-tag') || '') && home.text.includes("noindex"), 'robots');
  const {status, offers} = await pickOffers();
  check('catalog_api_200', status === 200 && offers.length > 10, `${status} ${offers.length}`);
  const product = await new Client().req('/retatrutide-5mg');
  check('product_route_200', product.status === 200 && product.text.includes('TBV_WOO_CATALOG'), product.status);

  const a = new Client(), b = new Client();
  const [o1, o2] = [offers.find(o => o.warehouse === 'worldwide'), offers.find(o => o.warehouse === 'us')];
  const add = await cartApi(a, 'add-item', {id: o1.variation_id, quantity: 2});
  check('guest_add_variation', add.status === 201 && add.json.items?.[0]?.id === o1.variation_id && add.json.items?.[0]?.quantity === 2, `${add.status} ${JSON.stringify(add.json).slice(0, 200)}`);
  const persisted = await cartApi(a);
  check('guest_cart_persists_next_request', persisted.json.items?.length === 1 && persisted.json.items[0].quantity === 2, JSON.stringify(persisted.json.items));
  const cartPage = await a.req('/cart/');
  check('cart_page_is_storefront_cart', cartPage.status === 200 && cartPage.text.includes('TBV_WOO_CATALOG') && cartPage.text.includes('TBV_COMMERCE'), cartPage.status);
  check('native_checkout_page_redirects_to_cart', /\/cart\/?$/.test((await a.req('/checkout/')).location || ''), 'no redirect');
  const upd = await cartApi(a, 'update-item', {key: persisted.json.items[0].key, quantity: 3});
  check('guest_update_quantity', upd.status === 200 && upd.json.items?.[0]?.quantity === 3, upd.status);
  const other = await cartApi(b);
  check('guest_sessions_isolated', other.json.items?.length === 0, JSON.stringify(other.json.items));
  await cartApi(b, 'add-item', {id: o2.variation_id, quantity: 1});
  const aAgain = await cartApi(a);
  check('second_guest_does_not_change_first', aAgain.json.items?.length === 1 && aAgain.json.items[0].id === o1.variation_id, JSON.stringify(aAgain.json.items));
  const rm = await cartApi(a, 'remove-item', {key: aAgain.json.items[0].key});
  check('guest_remove_item', rm.status === 200 && rm.json.items?.length === 0, rm.status);
  const totals = await cartApi(b);
  check('cart_total_matches_price', Number(totals.json.totals?.total_items) / 100 === Number(o2.price), `${totals.json.totals?.total_items} vs ${o2.price}`);

  // Storefront rules: automatic discount tiers, shipping service choice.
  const d = new Client();
  const qty = Math.ceil(1000 / Number(o1.price));
  const big = await cartApi(d, 'add-item', {id: o1.variation_id, quantity: qty});
  const sub = Number(big.json.totals?.total_items);
  const fee = big.json.fees?.find(f => /Automatic discount \(10%\)/.test(f.name));
  check('automatic_discount_10_percent', fee && Number(fee.totals.total) === -Math.round(sub * 0.1), JSON.stringify(big.json.fees));
  const rates = big.json.shipping_rates?.[0]?.shipping_rates || [];
  const express = rates.find(r => r.meta_data?.some(m => m.key === 'tbv_service' && m.value === 'express'));
  const picked = express ? await cartApi(d, 'select-shipping-rate', {package_id: 0, rate_id: express.rate_id}) : {status: 0, json: {}};
  check('select_express_rate', picked.status === 200 && picked.json.shipping_rates?.[0]?.shipping_rates?.find(r => r.selected)?.rate_id === express?.rate_id, picked.status);
  // Promo codes are WooCommerce coupons; like the live cart, a promo code
  // replaces the automatic discount instead of stacking with it.
  const promo = await cartApi(d, 'apply-coupon', {code: 'REVIEW10'});
  check('promo_code_applies_10_percent', promo.status === 200 && Number(promo.json.totals?.total_discount) === Math.round(sub * 0.1), `${promo.status} ${promo.json.totals?.total_discount}`);
  check('promo_code_replaces_automatic_discount', promo.status === 200 && !(promo.json.fees || []).some(f => /Automatic discount/.test(f.name)), JSON.stringify(promo.json.fees));
  const bogus = await cartApi(d, 'apply-coupon', {code: 'NOT-A-REAL-CODE'});
  check('unknown_promo_code_rejected', bogus.status >= 400 && bogus.status < 500, bogus.status);
  const unpromo = await cartApi(d, 'remove-coupon', {code: 'review10'});
  check('removing_promo_restores_automatic_discount', unpromo.status === 200 && (unpromo.json.fees || []).some(f => /Automatic discount \(10%\)/.test(f.name)), unpromo.status);
  const small = await cartApi(new Client(), 'add-item', {id: o1.variation_id, quantity: 1});
  check('no_discount_below_threshold', !(small.json.fees || []).length || Number(o1.price) >= 1000, JSON.stringify(small.json.fees));
  return offers;
}

async function guardChecks() {
  const c = new Client();
  const g = await c.req('/wp-json/wc/store/v1/cart'); const nonce = g.headers.get('nonce');
  const sc = await c.req('/wp-json/wc/store/v1/checkout', {method: 'POST', headers: {'content-type': 'application/json', nonce, origin: base}, body: '{}'});
  check('store_api_checkout_blocked', sc.status === 403, sc.status);
  check('users_api_blocked', (await c.req('/wp-json/wp/v2/users')).status === 403);
  check('order_pay_blocked', (await c.req('/checkout/order-pay/1/?pay_for_order=true&key=x&order-pay=1')).status === 403);
  check('wc_api_blocked', (await c.req('/?wc-api=wc_gateway_paypal')).status === 403);
  check('other_wc_ajax_blocked', (await c.req('/?wc-ajax=apply_coupon', {method: 'POST', headers: formHeaders, body: 'coupon_code=x'})).status === 403);
  check('xmlrpc_404', (await c.req('/xmlrpc.php')).status === 404);
  check('wp_config_404', (await c.req('/wp-config.php')).status === 404);
  check('wp_admin_requires_gate', (await c.req('/wp-admin/')).status === 401);
  check('wp_login_requires_gate', (await c.req('/wp-login.php')).status === 401);
  check('admin_ajax_not_gated', (await c.req('/wp-admin/admin-ajax.php')).status !== 401);
  check('legacy_account_redirects_to_my_account', /\/my-account\/?$/.test((await c.req('/account')).location));
}

async function register(c, email, password, extra = {}) {
  const page = await c.follow('/my-account/');
  const nonce = hidden(page.text, 'woocommerce-register-nonce');
  const r = await c.req('/my-account/', {method: 'POST', headers: {...formHeaders, origin: base}, body: form({email, password, password_confirm: password, 'woocommerce-register-nonce': nonce, _wp_http_referer: '/my-account/', register: 'Register', ...extra})});
  return {r, dash: await c.follow('/my-account/')};
}
async function login(c, username, password) {
  const page = await c.follow('/my-account/');
  const nonce = hidden(page.text, 'woocommerce-login-nonce');
  await c.req('/my-account/', {method: 'POST', headers: {...formHeaders, origin: base}, body: form({username, password, 'woocommerce-login-nonce': nonce, _wp_http_referer: '/my-account/', login: 'Log in', rememberme: 'forever'})});
  return c.follow('/my-account/');
}
// Signed in: the native account navigation, or the storefront dashboard config
// WordPress embeds for the signed-in customer (with its logout link).
const accountLogoutUrl = html => { const m = html.match(/"logoutUrl":"([^"]+)"/); return m ? JSON.parse(`"${m[1]}"`) : ''; };
const loggedIn = html => (/woocommerce-MyAccount-navigation/.test(html) && /customer-logout/.test(html)) || /customer-logout/.test(accountLogoutUrl(html));

// The storefront cart page is the checkout; it posts to Woo's classic checkout
// with the nonce WordPress publishes in TBV_COMMERCE.
async function checkout(c, offer, email, overrides = {}) {
  if (offer) await cartApi(c, 'add-item', {id: offer.variation_id, quantity: 1});
  const page = await c.follow('/cart/');
  const config = JSON.parse((page.text.match(/window\.TBV_COMMERCE = (\{.*?\});<\/script>/) || [])[1] || '{}');
  const cart = await cartApi(c);
  const ship = cart.json.shipping_rates?.[0]?.shipping_rates?.find(r => r.selected)?.rate_id;
  const body = {billing_first_name: 'Test', billing_last_name: 'Researcher', billing_country: 'US', billing_address_1: '123 Example Lane', billing_city: 'Springfield', billing_state: 'IL', billing_postcode: '62701', billing_phone: '5550100', billing_email: email, payment_method: config.gatewayId || '', tbv_carrier_preference: 'USPS', 'woocommerce-process-checkout-nonce': config.checkoutNonce || '', _wp_http_referer: '/cart/', ...(ship ? {'shipping_method[0]': ship} : {}), ...overrides};
  for (const [k, v] of Object.entries(body)) if (v === null) delete body[k];
  const r = await c.req('/?wc-ajax=checkout', {method: 'POST', headers: {...formHeaders, origin: base, 'x-requested-with': 'XMLHttpRequest'}, body: form(body)});
  let json = {}; try { json = JSON.parse(r.text); } catch {}
  return {page, json, config, ship};
}

async function accountChecksBeforeRestart(offers) {
  const email = `e2e.${Date.now()}@example.test`;
  const c = new Client();
  const {dash} = await register(c, email, env.E2E_RUN_PASSWORD);
  check('register_logs_in', loggedIn(dash.text), 'not logged in after register');
  await c.req(new URL(accountLogoutUrl(dash.text) || (dash.text.match(/href="([^"]*customer-logout[^"]*)"/) || [])[1]?.replace(/&amp;/g, '&') || '/my-account/customer-logout/', base).href);
  const out = await c.follow('/my-account/');
  check('logout_works', !loggedIn(out.text) && out.text.includes('woocommerce-login-nonce'), 'still logged in');
  const c2 = new Client();
  const back = await login(c2, email, env.E2E_RUN_PASSWORD);
  check('login_with_new_account', loggedIn(back.text), 'login failed');
  const bad = await login(new Client(), email, 'wrong-password-123');
  check('wrong_password_rejected', !loggedIn(bad.text));
  // Live sign-up card: confirm password and affiliate code (fixture REVIEWAFF).
  const mismatch = await register(new Client(), `e2e.mismatch.${Date.now()}@example.test`, env.E2E_RUN_PASSWORD, {password_confirm: env.E2E_RUN_PASSWORD + 'x'});
  check('register_password_mismatch_rejected', !loggedIn(mismatch.dash.text) && /Passwords do not match/.test(mismatch.r.text + mismatch.dash.text), 'mismatch accepted');
  const unknownCode = await register(new Client(), `e2e.badcode.${Date.now()}@example.test`, env.E2E_RUN_PASSWORD, {tbv_registration_code: 'NOSUCHCODE'});
  check('register_unknown_affiliate_code_rejected', !loggedIn(unknownCode.dash.text) && /Invalid affiliate code/.test(unknownCode.r.text + unknownCode.dash.text), 'unknown code accepted');
  // Live rule: any password of 6+ characters, no strength requirement.
  const short = await register(new Client(), `e2e.short.${Date.now()}@example.test`, 'abc12');
  check('register_password_under_6_rejected', !loggedIn(short.dash.text) && /at least 6 characters/.test(short.r.text + short.dash.text), 'short password accepted');
  const weak = await register(new Client(), `e2e.weak.${Date.now()}@example.test`, 'aaaaaa');
  check('register_weak_6_char_password_accepted', loggedIn(weak.dash.text), 'weak 6-character password refused');
  const withCode = await register(new Client(), `e2e.affiliate.${Date.now()}@example.test`, env.E2E_RUN_PASSWORD, {tbv_registration_code: 'reviewaff'});
  check('register_with_affiliate_code', loggedIn(withCode.dash.text), 'not logged in');

  const offer = offers.find(o => o.warehouse === 'worldwide' && Number(o.price) < 300) || offers[0];
  const guest = new Client();
  const guestTry = await checkout(guest, offer, `e2e.guest.${Date.now()}@example.test`);
  check('guest_checkout_requires_login', guestTry.json.result !== 'success' && guestTry.config.user === null, JSON.stringify(guestTry.json).slice(0, 200));
  await cartApi(c2, 'add-item', {id: offer.variation_id, quantity: 1});
  const otherGateway = await checkout(c2, null, email, {payment_method: 'cod'});
  check('checkout_rejects_other_gateway', otherGateway.json.result !== 'success', JSON.stringify(otherGateway.json).slice(0, 200));
  const co = await checkout(c2, null, email);
  check('checkout_config_for_signed_in_customer', co.config.user?.email === email && co.config.gatewayId === 'tbv_staging_test', JSON.stringify(co.config.user));
  check('checkout_shipping_rate_offered', !!co.ship, 'no shipping rate');
  check('test_checkout_success', co.json.result === 'success' && /order-received/.test(co.json.redirect || ''), JSON.stringify(co.json).slice(0, 300));
  const orderId = Number((co.json.redirect || '').match(/order-received\/(\d+)/)?.[1]);
  const received = orderId ? await c2.follow(co.json.redirect) : {text: ''};
  check('order_received_page', received.text.includes('order') && received.text.includes(String(orderId)), 'order-received');
  const orders = await c2.follow('/my-account/orders/');
  check('order_listed_in_account', orders.text.includes(`#${orderId}`) || orders.text.includes(`view-order/${orderId}`), 'not listed');
  check('order_status_pending_payment', /Pending payment/i.test(orders.text), 'status');
  const cart = await cartApi(c2);
  check('cart_emptied_after_test_order', cart.json.items?.length === 0);
  const stranger = new Client(); await register(stranger, `e2e.other.${Date.now()}@example.test`, env.E2E_RUN_PASSWORD);
  const peek = await stranger.follow(`/my-account/view-order/${orderId}/`);
  check('other_customer_cannot_view_order', !peek.text.includes(offer.product) || /Invalid order/i.test(peek.text), 'order visible to other customer');
  // Track Order: the customer's own order by number, with admin-entered tracking.
  wp('eval', `$o = wc_get_order(${orderId}); $o->update_meta_data('_tbv_tracking_number', '9400100000000000000001'); $o->save();`);
  const ownNonce = restNonce((await c2.follow('/my-account/')).text);
  const own = JSON.parse((await c2.req(`/wp-json/tbv-account/v1/orders?number=${orderId}`, {headers: {'x-wp-nonce': ownNonce}})).text || '[]');
  check('track_order_finds_own_order_with_tracking', own.length === 1 && own[0].id === String(orderId) && own[0].trackingNumber === '9400100000000000000001', JSON.stringify(own).slice(0, 200));
  const strangerNonce = restNonce((await stranger.follow('/my-account/')).text);
  const foreign = JSON.parse((await stranger.req(`/wp-json/tbv-account/v1/orders?number=${orderId}`, {headers: {'x-wp-nonce': strangerNonce}})).text || 'null');
  check('track_order_hides_other_customers_orders', Array.isArray(foreign) && foreign.length === 0, JSON.stringify(foreign).slice(0, 200));

  // Leave a cart item and a logged-in session to verify after a service restart.
  const keep = offers.find(o => o.warehouse === 'us') || offers[1];
  await cartApi(c2, 'add-item', {id: keep.variation_id, quantity: 1});
  fs.writeFileSync(statePath, JSON.stringify({jar: c2.jar, orderId, keepId: keep.variation_id, email}), {mode: 0o600});
}

async function accountChecksAfterRestart() {
  const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const c = new Client(s.jar);
  const dash = await c.follow('/my-account/');
  check('session_survives_restart', loggedIn(dash.text), 'logged out after restart');
  const cart = await cartApi(c);
  check('cart_survives_restart', cart.json.items?.some(i => i.id === s.keepId), JSON.stringify(cart.json.items));
  const orders = await c.follow('/my-account/orders/');
  check('order_survives_restart', orders.text.includes(`view-order/${s.orderId}`), 'order missing');
  const again = await login(new Client(), s.email, env.E2E_RUN_PASSWORD);
  check('fresh_login_after_restart', loggedIn(again.text));
  for (let i = 1; i <= 3; i++) {
    const t = await login(new Client(), env[`TEST_CUSTOMER_${i}_EMAIL`], env[`TEST_CUSTOMER_${i}_PASSWORD`]);
    check(`seeded_test_customer_${i}_login`, loggedIn(t.text));
  }
}

// Synthetic store credit and order-status changes are admin actions; the
// loopback-only account run makes them through WP-CLI on this staging install.
const wp = (...args) => execFileSync('wp', [...args, `--path=${path.join(here, '..', 'wordpress')}`], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
const feeCents = (cart, prefix) => (cart.json.fees || []).filter(f => String(f.name).startsWith(prefix)).reduce((sum, f) => sum - Number(f.totals?.total || 0), 0);
const subtotalCents = cart => Number(cart.json.totals?.total_items || 0);
const affiliateExt = cart => cart.json.extensions?.['tbv-affiliate'] || {};
const restNonce = html => JSON.parse((html.match(/window\.TBV_COMMERCE = (\{.*?\});<\/script>/) || [])[1] || '{}').account?.restNonce || '';

async function affiliateChecks(offers) {
  const offer = offers.find(o => o.warehouse === 'worldwide' && Number(o.price) >= 100 && Number(o.price) < 300) || offers[0];
  const stamp = Date.now();
  // Referral link, then first order: 5% of the item subtotal.
  const buyer = new Client(); const buyerEmail = `e2e.referred.${stamp}@example.test`;
  await register(buyer, buyerEmail, env.E2E_RUN_PASSWORD);
  await buyer.follow('/?c=reviewaff');
  check('referral_link_sets_cookie', buyer.jar.tbv_affiliate === 'REVIEWAFF', JSON.stringify(Object.keys(buyer.jar)));
  await cartApi(buyer, 'add-item', {id: offer.variation_id, quantity: 1});
  let cart = await cartApi(buyer);
  check('referral_first_order_discount_5pct', feeCents(cart, 'Affiliate discount (REVIEWAFF)') === Math.round(subtotalCents(cart) * 0.05) && feeCents(cart, 'Automatic discount') === 0, JSON.stringify(cart.json.fees));
  check('cart_reports_affiliate', affiliateExt(cart).affiliateCode === 'REVIEWAFF', JSON.stringify(affiliateExt(cart)));
  // Any promo code replaces the affiliate discount (attribution stays).
  await cartApi(buyer, 'apply-coupon', {code: 'review10'});
  cart = await cartApi(buyer);
  check('promo_code_replaces_affiliate_discount', feeCents(cart, 'Affiliate discount') === 0 && (cart.json.coupons || []).length === 1 && affiliateExt(cart).affiliateCode === 'REVIEWAFF', JSON.stringify(cart.json.fees));
  await cartApi(buyer, 'remove-coupon', {code: 'review10'});
  // Self-referral never discounts.
  const owner = new Client();
  await login(owner, env.TEST_CUSTOMER_3_EMAIL, env.TEST_CUSTOMER_3_PASSWORD);
  await owner.follow('/?c=reviewaff');
  await cartApi(owner, 'add-item', {id: offer.variation_id, quantity: 1});
  cart = await cartApi(owner);
  check('self_referral_no_discount', feeCents(cart, 'Affiliate discount') === 0 && !affiliateExt(cart).affiliateCode, JSON.stringify(cart.json.fees));
  for (const item of cart.json.items || []) await cartApi(owner, 'remove-item', {key: item.key});
  // Typed in the cart's code box; unknown codes are refused.
  const typed = new Client();
  await register(typed, `e2e.typed.${stamp}@example.test`, env.E2E_RUN_PASSWORD);
  await cartApi(typed, 'add-item', {id: offer.variation_id, quantity: 1});
  const unknown = await cartApi(typed, 'extensions', {namespace: 'tbv-affiliate', data: {action: 'apply', code: 'NOSUCHCODE'}});
  check('typed_unknown_code_rejected', unknown.status === 400, unknown.status);
  const applied = await cartApi(typed, 'extensions', {namespace: 'tbv-affiliate', data: {action: 'apply', code: 'reviewaff'}});
  check('typed_affiliate_code_applies', applied.status === 200 && feeCents({json: applied.json}, 'Affiliate discount (REVIEWAFF)') > 0, applied.status);
  const removed = await cartApi(typed, 'extensions', {namespace: 'tbv-affiliate', data: {action: 'remove'}});
  check('declining_discount_keeps_attribution', feeCents({json: removed.json}, 'Affiliate discount') === 0 && removed.json.extensions?.['tbv-affiliate']?.affiliateCode === 'REVIEWAFF', JSON.stringify(removed.json.fees));
  // At $1,000+ the 10% automatic discount is larger and wins.
  const big = new Client();
  await register(big, `e2e.bigorder.${stamp}@example.test`, env.E2E_RUN_PASSWORD);
  await big.follow('/?c=reviewaff');
  await cartApi(big, 'add-item', {id: offer.variation_id, quantity: Math.ceil(1000 / Number(offer.price))});
  cart = await cartApi(big);
  check('volume_discount_wins_over_affiliate', feeCents(cart, 'Automatic discount') === Math.round(subtotalCents(cart) * 0.10) && feeCents(cart, 'Affiliate discount') === 0, JSON.stringify(cart.json.fees));

  // Store credit pays only when it covers the whole order.
  const short = new Client(); const shortEmail = `e2e.shortcredit.${stamp}@example.test`;
  await register(short, shortEmail, env.E2E_RUN_PASSWORD);
  wp('tbv-credit', 'adjust', shortEmail, 'add', '1.00', 'e2e partial');
  let noAccount = ''; try { wp('tbv-credit', 'adjust', `e2e.noaccount.${stamp}@example.test`, 'add', '5.00'); } catch (e) { noAccount = 'refused'; }
  check('credit_requires_existing_account', noAccount === 'refused' && wp('tbv-credit', 'balance', `e2e.noaccount.${stamp}@example.test`) === '0.00', noAccount);
  await cartApi(short, 'add-item', {id: offer.variation_id, quantity: 1});
  cart = await cartApi(short);
  check('partial_credit_not_offered', affiliateExt(cart).storeCredit === 100 && affiliateExt(cart).storeCreditCovers === false, JSON.stringify(affiliateExt(cart)));
  const shortTry = await checkout(short, null, shortEmail, {payment_method: 'tbv_store_credit'});
  check('partial_credit_checkout_rejected', shortTry.json.result !== 'success' && wp('tbv-credit', 'balance', shortEmail) === '1.00', JSON.stringify(shortTry.json).slice(0, 200));

  wp('tbv-credit', 'adjust', buyerEmail, 'add', '1000.00', 'e2e synthetic credit');
  cart = await cartApi(buyer);
  const totalCents = Number(cart.json.totals?.total_price || 0);
  const itemsCents = subtotalCents(cart);
  check('full_credit_offered', affiliateExt(cart).storeCreditCovers === true, JSON.stringify(affiliateExt(cart)));
  const page = await buyer.follow('/cart/');
  const config = JSON.parse((page.text.match(/window\.TBV_COMMERCE = (\{.*?\});<\/script>/) || [])[1] || '{}');
  check('storefront_config_has_credit', config.creditGatewayId === 'tbv_store_credit' && config.user?.storeCredit === 1000, JSON.stringify({g: config.creditGatewayId, c: config.user?.storeCredit}));
  const paid = await checkout(buyer, null, buyerEmail, {payment_method: 'tbv_store_credit'});
  const paidId = Number((paid.json.redirect || '').match(/order-received\/(\d+)/)?.[1]);
  check('pay_with_credit_success', paid.json.result === 'success' && paidId > 0, JSON.stringify(paid.json).slice(0, 300));
  const status = paidId ? wp('eval', `echo wc_get_order(${paidId})->get_status();`) : '';
  check('credit_order_is_paid', status === 'processing', status);
  check('credit_debited_exactly', wp('tbv-credit', 'balance', buyerEmail) === ((100000 - totalCents) / 100).toFixed(2), wp('tbv-credit', 'balance', buyerEmail));
  const row = paidId ? JSON.parse(wp('eval', `global $wpdb; echo wp_json_encode($wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}tbv_ac_commissions WHERE order_id = %d", ${paidId}), ARRAY_A));`) || 'null') : null;
  check('commission_10pct_of_items', row && row.affiliate_code === 'REVIEWAFF' && Number(row.commission_cents) === Math.round(itemsCents * 0.10) && row.status === 'active', JSON.stringify(row));

  // Second order: no discount, but the customer stays with the affiliate.
  await cartApi(buyer, 'add-item', {id: offer.variation_id, quantity: 1});
  cart = await cartApi(buyer);
  check('repeat_order_no_discount', feeCents(cart, 'Affiliate discount') === 0 && affiliateExt(cart).affiliateCode === 'REVIEWAFF' && affiliateExt(cart).affiliateLocked === true, JSON.stringify(affiliateExt(cart)));
  const second = await checkout(buyer, null, buyerEmail);
  const secondId = Number((second.json.redirect || '').match(/order-received\/(\d+)/)?.[1]);
  check('repeat_order_attributed', secondId > 0 && wp('eval', `echo wc_get_order(${secondId})->get_meta('_tbv_affiliate_code');`) === 'REVIEWAFF', secondId);
  const commissionStatus = id => wp('eval', `global $wpdb; echo (string)$wpdb->get_var($wpdb->prepare("SELECT status FROM {$wpdb->prefix}tbv_ac_commissions WHERE order_id = %d", ${id}));`);
  check('unpaid_order_earns_nothing', secondId > 0 && commissionStatus(secondId) === '', commissionStatus(secondId));
  if (secondId) wp('eval', `$o = wc_get_order(${secondId}); $o->update_meta_data('_tbv_staging_admin_marked_paid', '1'); $o->save(); $o->update_status('processing', 'e2e: marked paid by admin');`);
  check('commission_when_marked_paid', secondId > 0 && commissionStatus(secondId) === 'active', commissionStatus(secondId));
  if (secondId) wp('eval', `wc_get_order(${secondId})->update_status('cancelled', 'e2e: cancelled');`);
  check('commission_reversed_on_cancel', secondId > 0 && commissionStatus(secondId) === 'reversed', commissionStatus(secondId));

  // Account panel data (same shape as live /api/affiliate-account).
  const ownerDash = await owner.follow('/my-account/');
  const nonce = restNonce(ownerDash.text);
  const acct = await owner.req('/wp-json/tbv-affiliates/v1/account?orders=1', {headers: {'x-wp-nonce': nonce}});
  let data = {}; try { data = JSON.parse(acct.text); } catch {}
  const ledger = (data.ledgerRows || []).find(r => r.order_id === String(paidId));
  check('affiliate_account_endpoint', data.ok && data.affiliate?.code === 'REVIEWAFF' && ledger && Math.round(Number(ledger.commission_amount) * 100) === Math.round(itemsCents * 0.10), acct.text.slice(0, 300));
  const buyerDash = await buyer.follow('/my-account/');
  const notAffiliate = JSON.parse((await buyer.req('/wp-json/tbv-affiliates/v1/account?orders=1', {headers: {'x-wp-nonce': restNonce(buyerDash.text)}})).text || '{}');
  check('non_affiliate_gets_no_panel', notAffiliate.ok && notAffiliate.affiliate === null, JSON.stringify(notAffiliate).slice(0, 200));
  // The admin panel API is for shop managers only.
  const custAdmin = await buyer.req('/wp-json/tbv-admin/v1/orders', {headers: {'x-wp-nonce': restNonce(buyerDash.text)}});
  const anonAdmin = await new Client().req('/wp-json/tbv-admin/v1/orders');
  check('admin_api_refuses_customers_and_guests', [401, 403].includes(custAdmin.status) && [401, 403].includes(anonAdmin.status), `${custAdmin.status}/${anonAdmin.status}`);
  const anon = await new Client().req('/wp-json/tbv-affiliates/v1/account?orders=1');
  check('affiliate_orders_require_login', anon.status === 401 || anon.status === 403, anon.status);
  const lookup = JSON.parse((await new Client().req('/wp-json/tbv-affiliates/v1/account?code=reviewaff')).text || '{}');
  check('public_code_lookup', lookup.ok && lookup.affiliate?.code === 'REVIEWAFF' && lookup.affiliate.active === true, JSON.stringify(lookup));
  const before = JSON.parse(wp('tbv-affiliates', 'totals', 'REVIEWAFF'));
  wp('tbv-affiliates', 'payout', 'REVIEWAFF', '0.01', 'e2e payout');
  const after = JSON.parse(wp('tbv-affiliates', 'totals', 'REVIEWAFF'));
  check('payout_recorded', after.paid === before.paid + 1 && after.pending === before.pending, JSON.stringify({before, after}));
}

const offers = phase === 'after-restart' ? [] : await guestChecks();
if (phase !== 'after-restart') await guardChecks();
if (withAccounts && phase !== 'after-restart') await accountChecksBeforeRestart(offers);
if (withAccounts && phase !== 'after-restart') await affiliateChecks(offers);
if (withAccounts && phase !== 'before-restart') await accountChecksAfterRestart();
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({base, phase, accounts: withAccounts, passed: results.length - failed.length, total: results.length, failed}, null, 1));
process.exit(failed.length ? 1 : 0);
