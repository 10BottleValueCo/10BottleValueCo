# 10BottleValue WordPress / WooCommerce isolated staging review

This is an installable engineering preview, **not a complete migration, launch candidate, payment integration, or data importer**. It packages the existing React presentation inside a WordPress theme with a separate homepage adapter and a public WooCommerce catalog adapter. The Woo Store API and native cart use the same cookie-backed WooCommerce session. Checkout, accounts and payment are intentionally unavailable. The dated catalog used in tests is synthetic/isolated and does not establish current stock, prices or product identities.

## Packages

- `10bottlevalue-woo-staging-review-0.2.0.zip`: theme, including the compiled storefront and local image assets.
- `tbv-homepage-staging-review-0.2.0.zip`: homepage adapter plugin for this exact theme build.
- `tbv-public-woo-catalog-0.1.0.zip`: public read-only catalog adapter. Its Woo product metadata contract must be met; it does not import products.
- WooCommerce itself is a separate prerequisite and is not bundled here.

## Required isolation and configuration

Use a **separate, disposable WordPress installation**, its own database and files, and synthetic data. Never activate this theme on the current store or on a WordPress site containing actual customer, order, payment, affiliate, credit, or provider credentials. Do not install payment, fulfillment, shipping-provider, email, webhook, or synchronization integrations in this preview. Disable server-level scheduled tasks separately. WordPress's HTTP setting does not stop arbitrary direct network calls by third-party PHP or infrastructure; the preview controls are not an isolation boundary and must not be relied on to protect a connected production site.

Configure the separate installation in `wp-config.php` before activation:

```php
define('WP_ENVIRONMENT_TYPE', 'staging'); // 'local' also works for a local lab.
define('TBV_STAGING_PREVIEW', true);
define('DISABLE_WP_CRON', true);
define('WP_HTTP_BLOCK_EXTERNAL', true);
```

Install/activate WooCommerce and the catalog adapter, install and activate the theme and homepage plugin, and create or import **only synthetic** Woo products with compatible public metadata. The theme ZIP is large; host upload limits and server resources must be checked. The theme fails frontend and REST requests closed if the opt-in, staging/local environment, cron setting, or WordPress external-HTTP setting is missing. Missing catalog dependencies show a storefront notice and an admin notice; the homepage plugin falls back when its prerequisites or asset manifest are missing. These are engineering checks, not production protection. Keep WordPress admin authentication enabled and protect admin access. `noindex` is not access control; a public review must not contain confidential information.

The theme's endpoint guards allow the public catalog and guest cart Store API routes, reject checkout and other REST routes, reject Woo AJAX and arbitrary frontend writes, suppress WordPress mail, and expose no payment gateways while active. The browser CSP restricts connections to the site's Woo cart API and native cart. The compiled asset bundle still contains legacy relative `/api/merit` and `/api/analytics` paths and Stripe JavaScript chunks, along with links to the existing storefront; they have not been removed. The source preview client for Supabase is inert and a scan found no literal production `/api` or Supabase host URL in the JS assets. CSP and checkout routing are defensive controls, not proof that every possible browser action or outbound attempt was tested. This intentionally prevents ordinary account, checkout, integrations and admin REST editing; it is not an architecture for the final store. Server network restrictions, host configuration, reverse proxies, other plugins, and all possible WordPress execution paths have not been independently audited.

## Tested

`node install-theme-test.mjs` and `TBV_SUBDIRECTORY=1 node install-theme-test.mjs` install the theme and both plugin ZIPs via actual WordPress upgrader classes in a disposable PHP-WASM WordPress/WooCommerce instance with SQLite. The host is `staging.example.invalid` rather than localhost; no network service or public domain is contacted. The script explicitly removes the old proof's two must-use preview plugins, so tests do not depend on their behavior. Both root and `/wordpresspreview` test routing, asset and catalog bootstrap URLs, product route, cart mutations and isolation of two guest cookie sessions, wrong nonce rejection, blocked checkout/account/REST actions, and the disabled cart checkout link. `TBV_TEST_DISABLED=1`, `TBV_TEST_PRODUCTION=1`, and `TBV_TEST_NO_CATALOG=1` exercise missing opt-in, production environment and missing catalog behavior. All test data lives in a disposable copy, which is removed afterward.

These are server-side programmatic install and HTTP-handler tests, **not** browser JavaScript tests, wp-admin ZIP upload tests, a persistent PHP/MySQL deployment, network/firewall assessment, real domain verification, complete visual/accessibility assessment, load test, or payment integration. Assets contain inherited old labels, including baked-in hero art; three mismatched product photos are shown as pending. Product mapping, homepage copy/art, catalog completeness, aliases, stock, prices, cart appearance, all account flows, tax and shipping, Stripe, real-record preservation and migration/reconciliation remain to be completed and reviewed. See the private engineering handoff for the current broader project status.
