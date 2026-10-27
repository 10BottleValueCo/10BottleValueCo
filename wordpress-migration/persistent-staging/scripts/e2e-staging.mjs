// End-to-end HTTP checks for the persistent WordPress staging site.
// Usage: node e2e-staging.mjs <baseUrl> [--accounts] [--phase=all|before-restart|after-restart]
// Credentialed account checks (--accounts) are meant for the loopback origin only.
// State shared between restart phases is kept in the private directory.
import fs from 'node:fs';
import path from 'node:path';
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
  const nativeCart = await a.req('/cart/');
  check('native_cart_shows_item', nativeCart.status === 200 && nativeCart.text.includes('cart_item') && nativeCart.text.includes(o1.product.split(' ')[0]), nativeCart.status);
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

async function register(c, email, password) {
  const page = await c.follow('/my-account/');
  const nonce = hidden(page.text, 'woocommerce-register-nonce');
  const r = await c.req('/my-account/', {method: 'POST', headers: {...formHeaders, origin: base}, body: form({email, password, 'woocommerce-register-nonce': nonce, _wp_http_referer: '/my-account/', register: 'Register'})});
  return {r, dash: await c.follow('/my-account/')};
}
async function login(c, username, password) {
  const page = await c.follow('/my-account/');
  const nonce = hidden(page.text, 'woocommerce-login-nonce');
  await c.req('/my-account/', {method: 'POST', headers: {...formHeaders, origin: base}, body: form({username, password, 'woocommerce-login-nonce': nonce, _wp_http_referer: '/my-account/', login: 'Log in', rememberme: 'forever'})});
  return c.follow('/my-account/');
}
const loggedIn = html => /woocommerce-MyAccount-navigation/.test(html) && /customer-logout/.test(html);

async function checkout(c, offer, email) {
  await cartApi(c, 'add-item', {id: offer.variation_id, quantity: 1});
  const page = await c.follow('/checkout/');
  const nonce = hidden(page.text, 'woocommerce-process-checkout-nonce');
  const ship = (page.text.match(/name="shipping_method\[0\]"[^>]*value="([^"]+)"/) || [])[1];
  const body = {billing_first_name: 'Test', billing_last_name: 'Researcher', billing_country: 'US', billing_address_1: '123 Example Lane', billing_city: 'Springfield', billing_state: 'IL', billing_postcode: '62701', billing_phone: '5550100', billing_email: email, payment_method: 'tbv_staging_test', 'woocommerce-process-checkout-nonce': nonce, _wp_http_referer: '/checkout/', ...(ship ? {'shipping_method[0]': ship} : {})};
  const r = await c.req('/?wc-ajax=checkout', {method: 'POST', headers: {...formHeaders, origin: base, 'x-requested-with': 'XMLHttpRequest'}, body: form(body)});
  let json = {}; try { json = JSON.parse(r.text); } catch {}
  return {page, json, nonceFound: !!nonce, ship, gatewayOffered: page.text.includes('payment_method_tbv_staging_test'), otherGateways: (page.text.match(/id="payment_method_([a-z0-9_]+)"/g) || []).filter(x => !x.includes('tbv_staging_test'))};
}

async function accountChecksBeforeRestart(offers) {
  const email = `e2e.${Date.now()}@example.test`;
  const c = new Client();
  const {dash} = await register(c, email, env.E2E_RUN_PASSWORD);
  check('register_logs_in', loggedIn(dash.text), 'not logged in after register');
  await c.req(new URL((dash.text.match(/href="([^"]*customer-logout[^"]*)"/) || [])[1]?.replace(/&amp;/g, '&') || '/my-account/customer-logout/', base).href);
  const out = await c.follow('/my-account/');
  check('logout_works', !loggedIn(out.text) && out.text.includes('woocommerce-login-nonce'), 'still logged in');
  const c2 = new Client();
  const back = await login(c2, email, env.E2E_RUN_PASSWORD);
  check('login_with_new_account', loggedIn(back.text), 'login failed');
  const bad = await login(new Client(), email, 'wrong-password-123');
  check('wrong_password_rejected', !loggedIn(bad.text));

  const offer = offers.find(o => o.warehouse === 'worldwide' && Number(o.price) < 300) || offers[0];
  const co = await checkout(c2, offer, email);
  check('checkout_only_staging_gateway', co.gatewayOffered && co.otherGateways.length === 0, JSON.stringify(co.otherGateways));
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

const offers = phase === 'after-restart' ? [] : await guestChecks();
if (phase !== 'after-restart') await guardChecks();
if (withAccounts && phase !== 'after-restart') await accountChecksBeforeRestart(offers);
if (withAccounts && phase !== 'before-restart') await accountChecksAfterRestart();
const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({base, phase, accounts: withAccounts, passed: results.length - failed.length, total: results.length, failed}, null, 1));
process.exit(failed.length ? 1 : 0);
