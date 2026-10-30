#!/usr/bin/env node
// Checks for a store installed in production mode (deploy/install.sh TBV_MODE=production).
//
//   node verify-production.mjs <origin> [--wp-path=/srv/x/wordpress] [--expect-admin-gate]
//        [--test-account] [--gateway=<id>] [--mail-log=<file>]
//
// Without flags it only reads public pages and uses guest carts, which is safe on
// the real store. --test-account registers a throwaway customer and places an order
// through --gateway (rehearsal installs only, never the real store's database).
// --mail-log reads emails captured by deploy/rehearsal/tbv-mail-capture.php.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) { console.error('usage: node verify-production.mjs <origin> [flags]'); process.exit(2); }
const flag = name => process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
const value = name => (flag(name) || '').split('=').slice(1).join('=');
const wpPath = value('wp-path'), gateway = value('gateway'), mailLog = value('mail-log');

const results = [];
const check = (name, ok, detail = '') => results.push({name, ok: !!ok, detail: ok ? '' : String(detail).slice(0, 300)});
class Client {
  constructor() { this.jar = {}; }
  store(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';'); const i = pair.indexOf('='); const k = pair.slice(0, i).trim(); const v = pair.slice(i + 1);
      if (/expires=Thu, 01[- ]Jan[- ]1970/i.test(c) || v === 'deleted' || /max-age=0/i.test(c)) delete this.jar[k]; else this.jar[k] = v;
    }
  }
  async req(p, opt = {}) {
    const headers = {'user-agent': 'tbv-verify-production', ...(opt.headers || {})};
    if (Object.keys(this.jar).length) headers.cookie = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(p.startsWith('http') ? p : base + p, {method: opt.method || 'GET', headers, body: opt.body, redirect: 'manual'});
    this.store(res);
    return {status: res.status, headers: res.headers, text: await res.text(), location: res.headers.get('location') || ''};
  }
  async follow(p, opt = {}) {
    let r = await this.req(p, opt); let hops = 0;
    while ([301, 302, 303, 307, 308].includes(r.status) && hops++ < 5) r = await this.req(new URL(r.location, base).href);
    return r;
  }
}
const hidden = (html, name) => (html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`)) || html.match(new RegExp(`value="([^"]*)"[^>]*name="${name}"`)) || [])[1];
const form = o => new URLSearchParams(o).toString();
const formHeaders = {'content-type': 'application/x-www-form-urlencoded'};
async function cartApi(c, route = '', body) {
  const g = await c.req('/wp-json/wc/store/v1/cart');
  if (!route) return {status: g.status, json: JSON.parse(g.text || '{}')};
  const r = await c.req('/wp-json/wc/store/v1/cart/' + route, {method: 'POST', headers: {'content-type': 'application/json', nonce: g.headers.get('nonce'), origin: base}, body: JSON.stringify(body)});
  let json = {}; try { json = JSON.parse(r.text); } catch {}
  return {status: r.status, json};
}
const commerceConfig = html => JSON.parse((html.match(/window\.TBV_COMMERCE = (\{.*?\});<\/script>/) || [])[1] || 'null');
const wp = (...args) => execFileSync('wp', [...args, `--path=${wpPath}`], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();

// Public pages: the real store, not the staging review.
const home = await new Client().req('/');
check('home_200', home.status === 200, home.status);
check('no_staging_banner', !/WordPress preview|WORDPRESS PREVIEW/.test(home.text), 'staging/preview banner present');
check('indexable', !/noindex/i.test(home.headers.get('x-robots-tag') || '') && !/<meta[^>]+robots[^>]+noindex/i.test(home.text), home.headers.get('x-robots-tag'));
check('csp_header', /default-src 'none'/.test(home.headers.get('content-security-policy') || ''), 'no CSP');
check('home_has_commerce_config', !!commerceConfig(home.text), 'TBV_COMMERCE missing on home');
const catalog = JSON.parse((await new Client().req('/wp-json/tbv-catalog/v1/products?per_page=100')).text || '{}');
const offers = (catalog.products || []).flatMap(p => p.offers.map(o => ({...o, product: p.name}))).filter(o => o.purchasable && o.stock_status === 'instock');
check('catalog_api', offers.length > 50, offers.length);
for (const path of ['/shop', '/us-warehouse', '/faq', '/retatrutide-5mg', '/track-order']) {
  const r = await new Client().req(path);
  check(`page_200 ${path}`, r.status === 200 && r.text.includes('TBV_WOO_CATALOG'), r.status);
}
const ranking = JSON.parse((await new Client().req('/wp-json/tbv-storefront/v1/ranking')).text || '{}');
check('ranking_endpoint', Array.isArray(ranking.names) && Array.isArray(ranking.usNames), JSON.stringify(ranking).slice(0, 120));

// Guest cart: persistence, isolation, totals, discount and promo rules.
const a = new Client(), b = new Client();
const o1 = offers.find(o => o.warehouse === 'worldwide');
const add = await cartApi(a, 'add-item', {id: o1.variation_id, quantity: 2});
check('guest_add_to_cart', add.status === 201 && add.json.items?.[0]?.quantity === 2, add.status);
check('guest_cart_persists', (await cartApi(a)).json.items?.[0]?.quantity === 2);
check('guest_carts_isolated', (await cartApi(b)).json.items?.length === 0);
const cartPage = await a.req('/cart/');
check('cart_page_storefront', cartPage.status === 200 && !!commerceConfig(cartPage.text), cartPage.status);
const d = new Client();
const big = await cartApi(d, 'add-item', {id: o1.variation_id, quantity: Math.ceil(1000 / Number(o1.price))});
check('automatic_discount_10', (big.json.fees || []).some(f => /Automatic discount \(10%\)/.test(f.name)), JSON.stringify(big.json.fees));
const promo = await cartApi(d, 'apply-coupon', {code: 'REVIEW10'});
check('promo_review10', promo.status === 200 && !(promo.json.fees || []).some(f => /Automatic discount/.test(f.name)), promo.status);
check('promo_unknown_rejected', (await cartApi(d, 'apply-coupon', {code: 'NOT-A-REAL-CODE'})).status >= 400);
const free = await cartApi(new Client(), 'apply-coupon', {code: 'OWNERFREESHIP'});
check('promo_ownerfreeship_exists', free.status === 200 || /email|restricted|not valid for/i.test(JSON.stringify(free.json)), JSON.stringify(free.json).slice(0, 160));

// Boundaries that stay closed on the real store.
const g = new Client(); const gc = await g.req('/wp-json/wc/store/v1/cart');
check('store_api_checkout_blocked', (await g.req('/wp-json/wc/store/v1/checkout', {method: 'POST', headers: {'content-type': 'application/json', nonce: gc.headers.get('nonce'), origin: base}, body: '{}'})).status === 403);
check('users_api_blocked', (await g.req('/wp-json/wp/v2/users')).status === 403);
check('other_wc_ajax_blocked', (await g.req('/?wc-ajax=apply_coupon', {method: 'POST', headers: formHeaders, body: 'coupon_code=x'})).status === 403);
check('wc_api_open_for_payment_callbacks', (await g.req('/?wc-api=tbv_verify_probe')).status !== 403);
check('xmlrpc_404', (await g.req('/xmlrpc.php')).status === 404);
check('wp_config_not_served', ![200].includes((await g.req('/wp-config.php')).status) || !(await g.req('/wp-config.php')).text.includes('DB_'));
if (flag('expect-admin-gate')) {
  check('wp_admin_gated', (await g.req('/wp-admin/')).status === 401);
  check('wp_login_gated', (await g.req('/wp-login.php')).status === 401);
  check('admin_ajax_not_gated', (await g.req('/wp-admin/admin-ajax.php')).status !== 401);
}

// Rehearsal only: a throwaway customer, sign-up, and an order through --gateway.
if (flag('test-account')) {
  const email = `verify.${Date.now()}@example.test`, password = `Vp-${Date.now()}`;
  const c = new Client();
  const page = await c.follow('/my-account/');
  await c.req('/my-account/', {method: 'POST', headers: {...formHeaders, origin: base}, body: form({email, password, password_confirm: password, 'woocommerce-register-nonce': hidden(page.text, 'woocommerce-register-nonce'), _wp_http_referer: '/my-account/', register: 'Register'})});
  const dash = await c.follow('/my-account/');
  check('register_logs_in', /customer-logout/.test(dash.text), 'not signed in after register');
  check('no_staging_signup_notice', !/Staging site/.test(page.text), 'staging notice on sign-in page');
  // Email ownership: credit stays hidden until the confirmation link is used.
  if (wpPath && mailLog) {
    wp('tbv-credit', 'adjust', email, 'add', '5000.00', 'verify-production rehearsal');
    const before = commerceConfig((await c.follow('/cart/')).text) || {};
    check('unverified_account_flagged', before.user?.emailVerified === false, JSON.stringify(before.user || {}).slice(0, 160));
    check('unverified_account_sees_no_credit', Number(before.user?.storeCredit) === 0, before.user?.storeCredit);
    const mails = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    const confirm = mails.reverse().find(m => [].concat(m.to).join(',').includes(email) && /confirm your email/i.test(m.subject));
    const link = (confirm?.message.match(/https?:\/\/\S*tbv_verify=\S+/) || [])[0];
    check('confirmation_email_sent', !!link, mails.map(m => m.subject).join(' | '));
    const forged = await new Client().req('/my-account/?tbv_verify=1.9999999999.deadbeef');
    check('forged_confirmation_link_rejected', wp('user', 'meta', 'get', email, '_tbv_email_verified') === '0', forged.status);
    if (link) await new Client().follow(link);
    const after = commerceConfig((await c.follow('/cart/')).text) || {};
    check('confirmed_account_sees_credit', after.user?.emailVerified === true && Number(after.user?.storeCredit) === 5000, JSON.stringify(after.user || {}).slice(0, 160));
    wp('tbv-credit', 'adjust', email, 'set', '0.00', 'verify-production rehearsal cleanup');
  }
  const offer = offers.find(o => o.warehouse === 'worldwide' && Number(o.price) < 300) || o1;
  await cartApi(c, 'add-item', {id: offer.variation_id, quantity: 1});
  const cp = await c.follow('/cart/'); const config = commerceConfig(cp.text) || {};
  check('checkout_gateway_config', (config.gatewayId || '') === gateway, `gatewayId=${config.gatewayId}`);
  const ship = (await cartApi(c)).json.shipping_rates?.[0]?.shipping_rates?.find(r => r.selected)?.rate_id;
  const body = {billing_first_name: 'Verify', billing_last_name: 'Customer', billing_country: 'US', billing_address_1: '1 Example Way', billing_city: 'Springfield', billing_state: 'IL', billing_postcode: '62701', billing_phone: '5550100', billing_email: email, payment_method: config.gatewayId || 'tbv_staging_test', 'woocommerce-process-checkout-nonce': config.checkoutNonce || '', _wp_http_referer: '/cart/', ...(ship ? {'shipping_method[0]': ship} : {})};
  const r = await c.req('/?wc-ajax=checkout', {method: 'POST', headers: {...formHeaders, origin: base, 'x-requested-with': 'XMLHttpRequest'}, body: form(body)});
  let json = {}; try { json = JSON.parse(r.text); } catch {}
  if (!gateway) {
    check('checkout_refused_without_gateway', json.result !== 'success', JSON.stringify(json).slice(0, 200));
    check('staging_test_gateway_absent', !/tbv_staging_test/.test(cp.text), 'staging gateway offered');
  } else {
    check('checkout_success', json.result === 'success' && /order-received/.test(json.redirect || ''), JSON.stringify(json).slice(0, 200));
    const id = Number((json.redirect || '').match(/order-received\/(\d+)/)?.[1]);
    const received = id ? await c.follow(json.redirect) : {text: ''};
    check('order_received_page', received.text.includes(String(id)), id);
    if (wpPath && id) {
      check('order_not_marked_staging', wp('eval', `echo wc_get_order(${id})->get_meta('_tbv_staging_test_order') ?: 'none';`) === 'none');
      check('order_status_awaiting_payment', ['on-hold', 'pending'].includes(wp('eval', `echo wc_get_order(${id})->get_status();`)));
    }
  }
  if (mailLog) {
    const mails = fs.existsSync(mailLog) ? fs.readFileSync(mailLog, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
    const to = m => [].concat(m.to).join(',');
    check('mail_new_account_email', mails.some(m => to(m).includes(email) && /account/i.test(m.subject)), mails.map(m => m.subject).join(' | '));
    if (gateway) {
      check('mail_customer_order_email', mails.some(m => to(m).includes(email) && /order/i.test(m.subject)), mails.map(m => m.subject).join(' | '));
      check('mail_admin_new_order', mails.some(m => !to(m).includes(email) && /new order/i.test(m.subject)), mails.map(m => m.subject).join(' | '));
    }
  }
}

// Server-side settings (run on the server, or against a local rehearsal).
if (wpPath) {
  check('mode_production', wp('eval', 'echo tbv_store_mode();') === 'production');
  check('staging_guard_absent', !fs.existsSync(`${wpPath}/wp-content/mu-plugins/tbv-persistent-staging.php`));
  check('search_engines_allowed', wp('option', 'get', 'blog_public') === '1');
  check('no_staging_test_users', wp('user', 'list', '--meta_key=_tbv_staging_synthetic', '--format=count') === '0');
  check('debug_display_off', wp('eval', 'echo WP_DEBUG_DISPLAY ? "on" : "off";') === 'off');
  check('file_mods_disabled', wp('eval', 'echo DISALLOW_FILE_MODS ? "yes" : "no";') === 'yes');
  check('mail_not_blocked_by_theme', wp('eval', 'echo apply_filters("pre_wp_mail", null, []) === false ? "blocked" : "open";') === 'open');
  const gateways = JSON.parse(wp('eval', 'echo wp_json_encode(array_keys(WC()->payment_gateways()->get_available_payment_gateways()));') || '[]');
  check('only_configured_gateways', gateways.every(id => [gateway, 'tbv_store_credit'].includes(id)), gateways.join(','));
}

const failed = results.filter(r => !r.ok);
console.log(JSON.stringify({base, passed: results.length - failed.length, total: results.length, failed}, null, 1));
process.exit(failed.length ? 1 : 0);
