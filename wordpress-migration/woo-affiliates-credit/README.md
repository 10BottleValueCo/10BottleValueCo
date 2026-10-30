# tbv-affiliates-credit: referral program and store credit on WooCommerce

A WordPress plugin that carries the live storefront's affiliate (referral) program and store credit over to WooCommerce, rule for rule. The staging storefront's account dashboard and cart (the React overlay in `../staging-theme-lab`) show it with the same screens as the live site.

**Status: running on the persistent staging site with synthetic data only.** No real affiliates, customers, balances or payouts have been imported. Historical records come from `../woo-legacy-migration` once a real export is authorized, then `wp tbv-affiliates import-legacy` seeds the live tables from them (tested on the synthetic fixture only).

## Rules (from the live source)

| Rule | Live source | Here |
|---|---|---|
| Buyer discount: 5% of the item subtotal, first paid order only | `api/_affiliate-quote.js` (rejects anything but 500 bps / 1000 bps) | `TBV_AC_DISCOUNT_BPS`, applied as the fee `Affiliate discount (CODE)` |
| Larger of the automatic (volume) and affiliate discount; any promo code removes both | `api/_legacy-checkout-quote.js` | `tbv_storefront_affiliate_discount` filter in `tbv-storefront-rules` |
| Commission: 10% of the item subtotal on every paid order from the referred customer, not reduced by discounts, shipping or credit | `_legacy-checkout-quote.js`, payment webhooks | `TBV_AC_COMMISSION_BPS`, recorded when the order reaches processing/completed |
| Cancelled or refunded order: commission withdrawn | `api/supabase/orders/[id].js` | row status `reversed` |
| Hold: US warehouse 6 days, express 10, standard 15, from the paid date | `App.jsx` | `TBV_AC_HOLD_DAYS` (admin totals); the account panel uses the live client logic |
| Code sources: `?s=` (base64), `?c=`, `?via=`, `?ref=`, `?affiliate=`; typed in the cart code box (promo first, then affiliate); sign-up code | `App.jsx` | cookie `tbv_affiliate`, Woo session, user meta `tbv_affiliate_code` |
| First paid referred order locks the customer to that affiliate; a locked affiliate overrides new codes | `_affiliate-quote.js`, Paylio SQL | table `tbv_ac_customers` |
| Repeat buyer without a lock: code ignored. Self-referral: no discount, no attribution | `_affiliate-quote.js` | `tbv_ac_attribution()` |
| Declining the discount keeps attribution and commission | `affiliateDiscountDisabled` | Store API `remove` action |
| Becoming an affiliate: admin issues a code to an email; one code per email; a code can't move to another owner; revoke/restore | `api/affiliate-profile-admin.js` | WooCommerce → Affiliates, `wp tbv-affiliates issue` |
| Payouts: recorded by an admin; available = released commission − payouts | `api/affiliate-payouts.js` | WooCommerce → Affiliates → Record payout |
| Store credit: admin add/subtract/set with a log; pays only when it covers the whole order (no partial use) | `adjust_store_credit`, `checkout_store_credit` RPCs | WooCommerce → Store credit; gateway `tbv_store_credit` (row-locked debit, idempotent per order) |

Not carried over: the 2.5% crypto discount (no crypto payment method on WordPress yet) and the per-order commission adjustment field (migrated orders that have one are reported for review).

## Data

Tables (prefix `wp_tbv_ac_`): `affiliates`, `customers` (locks), `commissions` (one row per order), `payouts`, `credit_balances`, `credit_ledger` (every change with the balance it produced). Money is integer cents. Orders also carry `_tbv_affiliate_code`, `_tbv_affiliate_owner_email`, `_tbv_affiliate_commission`, `_tbv_affiliate_rule_version`, `_tbv_shipping_type` and, for credit orders, `_tbv_store_credit_used`.

## Interfaces

- Store API cart response: `extensions["tbv-affiliate"]` = `affiliateCode`, `affiliateLocked`, `storeCredit` (cents), `storeCreditCovers`, `creditGatewayId`.
- Store API update: `POST /wc/store/v1/cart/extensions` with `{"namespace":"tbv-affiliate","data":{"action":"apply","code":"X"}}` or `{"action":"remove"}`.
- REST `GET /wp-json/tbv-affiliates/v1/account?orders=1&offset=N` (signed in) and `?code=X` (public lookup), same JSON shape as live `/api/affiliate-account`.
- WP-CLI: `wp tbv-affiliates issue|revoke|payout|totals|import-legacy`, `wp tbv-credit adjust|balance`.

## Seeding from migrated history

`wp tbv-affiliates import-legacy [--dry-run] [--report=<file>]` reads the rows `tbv-legacy-migration` preserved (`wp_tbv_legacy_records`; that importer writes orders without status hooks, so no commission was recorded for them). It creates:
- affiliates, with code, owner and active state;
- customer locks;
- commissions, one per imported order. These come from the `affiliate_orders` ledger first, then from order metadata (live's own fallback), with historical cents kept and refunded or cancelled orders marked reversed;
- payouts, including those for codes missing from the affiliates table (reported);
- opening store-credit balances.

It is idempotent. Source keys link every row, and a rerun creates nothing. A live value that differs from the source is reported as a conflict and left alone.

**WooCommerce sign-up does not verify email ownership.** A migrated balance is therefore applied only to the account the migration itself created for that customer. Balances for emails with no account, or whose account the migration did not create, are reported and not applied. Admin credit changes (page and `wp tbv-credit adjust`) therefore require an existing account with that email. The same caveat applies to affiliate panels for emails with no account. On a production install (`TBV_STORE_MODE='production'`), a new sign-up gets a confirmation link by email and sees no credit or affiliate panel until it is used (`tbv_ac_email_verified()`; signed 7-day links, resend from My Account). Migrated accounts and shop managers count as confirmed. The store-credit gateway always debits the signed-in account's balance, not the checkout billing email.

`tests/legacy-bridge-test.php` runs it on the disposable `tbv_migration_test` copy with the synthetic fixture, 14/14:
- the dry run writes nothing (table checksums);
- the rows are exact, the CORA10 totals are released $14.90 minus $12.50 paid, and the issue list is exact;
- a rerun is a no-op;
- a changed payout is reported and left as found.

The existing `tbv-legacy-migration` suite still passes 197/197 with this plugin present.

## Tests (staging, 2026-10-29)

`persistent-staging/scripts/e2e-staging.mjs --accounts` adds 27 affiliate/credit checks (83/83 total), including:
- the 5% referral discount, promo replacement, self-referral, typed and unknown codes, and declining the discount;
- the volume discount winning, partial credit refused, and the full-credit order paid and debited exactly;
- 10% commission, the repeat order (no discount, still attributed), commission when marked paid and reversed on cancel;
- the account endpoint shape, login requirement, public lookup and payout totals.

`browser-qa.mjs` adds UI checks (228/228 total), including:
- the referral line and "Pay with Credits" in the cart;
- the credit order reaching order-received;
- an affiliate code typed in the promo box;
- the affiliate dashboard in My Account showing this site's link.

## Production notes

- On staging, `mu-plugins/tbv-persistent-staging.php` lets only store-credit orders complete payment (all balances are synthetic). Stock reduction and email stay blocked there.
- Production needs the real processor's paid status to drive commissions. The hook is `woocommerce_order_status_changed` → processing/completed.
- Refunds of credit orders do not return credit automatically (same as live). The admin adjusts the balance.
