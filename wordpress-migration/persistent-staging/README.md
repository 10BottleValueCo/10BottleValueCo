# Persistent WordPress/WooCommerce staging

A durable staging install of the WordPress storefront for stakeholder review: real PHP-FPM, MariaDB and a web server, so carts, sessions and test accounts survive across requests and restarts. The earlier serverless preview copied a SQLite file into each function instance and generated new salts per boot, so cart cookies and nonces did not carry between instances.

**Synthetic data only.** This is not production, not a completed migration, and not connected to any payment processor, fulfillment, customer email or production database.

## What runs

| Layer | Staging setup |
|---|---|
| WordPress | 7.1.3 (official core, checksums verified) |
| WooCommerce | 11.2.1, HPOS enabled |
| Theme | `staging-theme-lab` build with `TBV_STAGING_COMMERCE_TEST` opt-in |
| Catalog | Dated public snapshot: 66 products / 166 variations (prices and stock not live) |
| Database | MariaDB, copied from the v17 preview snapshot with `scripts/sqlite-to-mariadb.php` (row counts verified per table) |
| Guard | `mu-plugins/tbv-persistent-staging.php` |

## Staging guard (mu-plugin)

Active only when `WP_ENVIRONMENT_TYPE=staging` and `TBV_STAGING_COMMERCE_TEST=true`.

- Visible "WordPress preview — staging" banner; noindex everywhere.
- **No email:** `pre_wp_mail` returns false; attempts are logged by subject only.
- **No payments:** one offline gateway (`tbv_staging_test`) creates *pending, unpaid* orders marked `_tbv_staging_test_order=1`. `payment_complete` status transitions and stock reduction are disabled; `wc-api` callbacks and order-pay links return 403.
- **No outbound HTTP:** `WP_HTTP_BLOCK_EXTERNAL`, cron disabled, file mods disabled.
- Native WooCommerce My Account (register/login/orders/addresses). Password reset and order-linking emails are unavailable by design.
- The storefront's account icon and `/account` route go to native My Account.

## Storefront cart and checkout

As on the live site, `/cart` is the storefront's own cart page and is also the checkout: items, Standard/Express cards, totals, free-shipping and discount progress, shipping details, then the order. (Owner decision 2026-10-28: no researcher entry gate or purchaser attestation on the WordPress store.) The page is the live cart's React markup backed by WooCommerce: items, shipping rates, destination and totals come from the Store API (`select-shipping-rate` and `update-customer` are allowed in commerce mode), and placing the order posts to the classic checkout (`?wc-ajax=checkout`) with the nonce WordPress publishes in `window.TBV_COMMERCE`. WooCommerce recalculates every amount server-side. Checkout requires a signed-in customer (guest checkout off), like the live site; the cart's Sign in button returns to the cart. The native `/checkout/` page redirects to `/cart/`; order-received stays native.

`../woo-storefront-rules/tbv-storefront-rules` carries the live checkout rules, with values in the editable `tbv_storefront_rules` option: automatic 10/15/20% discount at $1,000/$2,000/$4,000 (negative fee, not combined with coupons), optional purchaser attestation (off by default per the owner; when switched on it is required server-side and stored as order meta), carrier preference and the $350 worldwide order-bonus marker. Promo codes are WooCommerce coupons applied from the storefront promo box (`scripts/configure-staging-coupons.php` creates `REVIEW10`, mirroring the live public 10% code); a promo code replaces the automatic discount, as on the live cart. Affiliates and store credit come from `../woo-affiliates-credit/tbv-affiliates-credit` (live rules: 5% first-order referral discount, the larger of it and the automatic discount, 10% commission on paid orders, admin payouts, store credit that pays only the whole order); `configure-staging-coupons.php` issues the synthetic affiliate `REVIEWAFF` to seeded test customer 3. Customer-specific promo codes are not connected. Orders have a "Tracking numbers" box (two numbers, as on live; `_tbv_tracking_number`, `_tbv_tracking_number_2`), shown on the storefront Track Order page, which looks up the signed-in customer's own order by WooCommerce number or migrated INV- number. Tracking emails are not sent (staging suppresses mail).

The theme's existing review restrictions stay in force unless the commerce-test opt-in and the guard's gateway are both present. Checkout uses the classic shortcode; the Store API checkout endpoint stays blocked.

## Setup outline

1. PHP 8.3+ with `mysqli`, `pdo_mysql`, `gd`, `intl`, `zip`, OPcache; MariaDB 10.11+; a web server with PHP-FPM (`config/Caddyfile.sample`).
2. Install WordPress 7.1.3 core, then copy the theme, `tbv-public-woo-catalog`, `tbv-warehouse-shipping`, the homepage mu-plugin and this guard.
3. Create `wp-config.php` from `config/wp-config.staging-sample.php`. Keep DB credentials and **fixed** salts in a file outside the web root.
4. `wp core install`, activate WooCommerce, create the HPOS tables, then copy the snapshot with `php scripts/sqlite-to-mariadb.php <snapshot.sqlite> <secrets.php>` (refuses any database not named `tbv_staging` or `tbv_migration_test`).
5. `wp eval-file scripts/configure-staging-shipping.php` — rates and express destinations copied from the live storefront's own rules, **not verified** against carrier/supplier terms. Activate `tbv-storefront-rules` and `tbv-affiliates-credit`; set `woocommerce_enable_guest_checkout` to `no`.
6. Protect `/wp-admin` and `/wp-login.php` with an extra server-level gate (`admin-ajax.php` and `wp-admin/{js,css,images}` must stay public for storefront pages).

## Checks

```sh
node scripts/e2e-staging.mjs http://127.0.0.1:8088 --accounts --phase=before-restart   # loopback only for credentialed checks
# restart PHP-FPM, MariaDB and the web server
node scripts/e2e-staging.mjs http://127.0.0.1:8088 --accounts --phase=after-restart
node scripts/e2e-staging.mjs https://<public staging origin> --phase=before-restart       # guest + guard checks
TBV_STAGING_PUBLIC_URL=https://<public staging origin> node scripts/browser-qa.mjs <outDir>  # Playwright, mobile + desktop, vs production (view-only)
wp eval-file scripts/audit-staging.php                                                   # safety audit
```

E2E covers catalog, variation add/update/remove, cart persistence, guest isolation, totals, automatic discount, express selection, registration, logout/login, wrong password, guest-checkout refusal, other-gateway refusal, test checkout, order-received, order history, cross-customer order access, restart persistence and the guard endpoints. Browser QA compares 11 routes (including `/cart`) on production and staging at iPhone 13 and 1440×900 (status, overflow, JS errors, failed requests, no researcher gate) and drives the real UI: add to cart, header CART, storefront cart, Sign in → storefront account card → register → back to cart, shipping details, test order, account link.

## Moving to another server

`../deploy/` builds a bundle from this staging site (code, catalog, pages and settings; no orders, accounts or messages) and installs it on any server with one command, as staging or as the real store. Rehearsed 2026-10-29 on fresh databases: staging mode E2E 94/94, browser 290/290, audit pass; production mode 48/48 (49/49 with a stand-in gateway). See `../deploy/README.md`.

## Not done here

Confirmed shipping rates and destinations, taxes, coupons, real payment processor, customer/order/credit/affiliate data migration and reconciliation, auth migration from Supabase, production hosting, DNS and cutover. See `PAYMENT_INTEGRATION_POINTS.md`.
