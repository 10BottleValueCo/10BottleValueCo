# tbv-legacy-migration: Supabase to WooCommerce data importer

A small WordPress plugin with WP-CLI commands. It imports **customers, orders, store credit and affiliate history** from a normalized JSON export of the legacy Supabase storefront into WooCommerce (HPOS). Source IDs and every financial amount are preserved in integer cents.

**Status: tested on synthetic data only.** The tests ran against the disposable `tbv_migration_test` database. Nothing has touched a real export, the production Supabase project, real customers or the `tbv_staging` site. See "What is NOT verified" below.

```
tbv-legacy-migration/          the plugin (copy or symlink into wp-content/plugins)
  tbv-legacy-migration.php     bootstrap, activation (creates tables), CLI registration
  includes/class-export.php    export loader/validator (format, credential scan, row parsing, exact cents)
  includes/class-importer.php  idempotent, resumable importer (per-row InnoDB transactions)
  includes/class-reconciler.php read-only source vs destination comparison
  includes/class-status-map.php explicit status table (unknown = fail closed)
  includes/class-catalog.php   line item to variation matching by catalog identity
  includes/class-guards.php    always-on stock/email guards for imported orders, admin box
  includes/class-cli.php       `wp tbv-migrate ...`
bin/generate-fixture.php       deterministic SYNTHETIC export (fictional people @example.test)
tests/run-tests.php            integration tests (real CLI subprocesses against tbv_migration_test)
tests/{setup,inspect,side-effect-probe}.php  test helpers
```

## Running it

```sh
# install (the tests do this automatically with a symlink)
ln -s "$PWD/tbv-legacy-migration" <wp>/wp-content/plugins/tbv-legacy-migration
wp --path=<wp> plugin activate tbv-legacy-migration

php bin/generate-fixture.php --out=/tmp/export.json            # synthetic export
wp --path=<wp> tbv-migrate import /tmp/export.json --dry-run    # plan only, writes nothing
wp --path=<wp> tbv-migrate import /tmp/export.json --report=import.json
wp --path=<wp> tbv-migrate reconcile /tmp/export.json --report=reconcile.json
wp --path=<wp> tbv-migrate status                                # runs + lock state
wp --path=<wp> tbv-migrate import /tmp/export.json --accept-changes=orders,credit_ledger  # after review only
```

Exit codes: `0` clean, `1` fatal (bad file, credential column, lock held, wrong environment), `2` finished but some rows need review (import) or mismatches exist (reconcile). `--format=json` prints the report. `--report=<path>` writes the same JSON to a file. Reports name source keys and Woo IDs, never emails in messages.

Preconditions are checked on every run: WooCommerce active, HPOS authoritative, store currency USD, 2 price decimals. The importer refuses `WP_ENVIRONMENT_TYPE=production` unless `TBV_LM_ALLOW_PRODUCTION` is defined true (owner-approved cutover only).

### Tests

```sh
TBV_MIGRATION_TEST_WP=/path/to/migration-test-site php tests/run-tests.php   # all scenarios, about 75 s
php tests/run-tests.php --only=validation,dry-run,first-import
```

Last run (2026-10-27, WooCommerce 11.2.1 HPOS, WP 7.1.3, PHP 8.5.12, MariaDB): **197 passed, 0 failed.** The scenarios run in order. `reconcile`, `reimport-noop`, `changed-conflict`, `missing-rows` and `lock` build on the state left by `first-import`. The others re-clone the database first.

| Scenario | What it proves |
|---|---|
| validation | An export containing a credential column (`checkout_access_hash`) aborts with exit 1. No tables, users or orders are written. |
| dry-run | Reports the same would-create counts and issues as a real import. `CHECKSUM TABLE` over the WP/Woo tables is identical before and after. No migration tables are created. |
| first-import | Exact created counts per entity, plus the exact issue set (2 email collisions, unknown status, 2 blocked dependents). Field-level checks cover 15 orders, customers and preserved records. Zero `wp_mail` calls, zero HTTP. No `woocommerce_order_status_*`, `payment_complete`, stock, refund or email hooks fire. Stock, `total_sales` and refund counts are unchanged. Probe liveness is shown by `woocommerce_new_order` = 13 and `user_register` = 8. |
| reconcile | Row-level mismatches are exactly the rows that were not imported or are extra. Order totals match the source to the cent, minus the 2 un-imported orders. Credit balance/hold/consumed/adjustment, payout and payment-attempt cents are exact. Per-customer credit and per-affiliate totals are checked. |
| reimport-noop | Identical re-run: 48 rows unchanged, 0 created or updated. `CHECKSUM TABLE` is identical across WP/Woo and migration tables. A dry-run afterwards writes nothing, not even a run row. |
| changed-conflict | Edited order total, payout, hold state and profile come back as `source_changed` conflicts and are not overwritten. A new order in the same export is still imported. `--accept-changes=orders,credit_ledger` updates those entities in place (same Woo ID), keeps revision history and fires no side-effect hooks. A repeat run is then a no-op. |
| missing-rows | A previously imported order missing from a later export is reported and not deleted. |
| interrupted-resume | Real `SIGKILL` at four points: mid-order (saved, not committed), between orders (committed), mid-customer, and mid-ledger-record (mapped, not committed). Each time there are no orphan or partial rows and the lock is released automatically. The resume reports the interrupted run, creates the remainder, and reconciliation is identical to an uninterrupted import. |
| tamper-detect | A 1-cent change to a Woo order total and a 5-cent change to a preserved payout are both caught by reconcile. A deleted Woo order is reported as `destination_missing` and is not recreated automatically. |
| lock | A second process is refused while another connection holds the migration lock, and the refused run writes nothing. |

The test harness only works with `DB_NAME=tbv_migration_test`. It resets with `mariadb-dump --single-transaction tbv_staging | mariadb tbv_migration_test`, which is read-only on staging, then drops the migration tables. It seeds one collision user and sets stock to 50 on every variation, so any stock change would show up.

## Export format (`tbv-supabase-export` v1)

```json
{ "format": "tbv-supabase-export", "format_version": 1,
  "source": { "project_ref": "...", "exported_at": "...", "synthetic": true },
  "tables": { "auth_users": [...], "orders": [...], "merit_payment_attempts": [...], "paylio_payment_attempts": [...],
              "user_credits": [...], "store_credit_ledger": [...], "store_credit_adjustments": [...],
              "affiliates": [...], "affiliate_customers": [...], "affiliate_orders": [...], "affiliate_payouts": [...] } }
```

Each table is the source table's rows, column names unchanged, as PostgREST/`to_jsonb` would emit them. `auth_users` is a projection of `auth.users`: `id, email, created_at, email_confirmed_at, last_sign_in_at, raw_user_meta_data`. `auth_users` and `orders` are required. Unknown tables abort the run so nothing is silently skipped. Unknown columns inside known tables are kept verbatim in the preserved source row and count toward the change hash.

**The export query must exclude credentials.** The importer aborts if any key anywhere matches `password|secret|token|access_hash|api_key` or is one of `publishable_key, ipn_token, checkout_url, checkout_access_hash, encrypted_password`. That covers `auth.users` password/token columns, `orders.checkout_access_hash`, Merit `client_secret`/`publishable_key`, and Paylio `ipn_token`/`checkout_url`. Money can be a JSON number or string. Values that are not exact cents are rejected, never rounded. Emitting `numeric` columns as strings is recommended.

## Behaviour and safety

- **Idempotence.** `wp_tbv_legacy_map` holds `(entity, source_key) -> destination, sha256(source row), revision`. Each run gives every row one outcome: `created | unchanged | updated | conflict | blocked | rejected | failed` (dry-run shows `would_create | would_update`). A changed source row is a **conflict** unless `--accept-changes=<entity,...>|all` names it. The previous source version is kept in a revision history: order meta `_tbv_source_revisions`, user meta `_tbv_source_revisions`, or `wp_tbv_legacy_records.revisions`. Rows missing from a later export are listed under `missing_from_source` and never deleted.
- **Atomic per row, resumable per run.** Each row's destination writes and its mapping row commit in one InnoDB transaction, so a killed process leaves the row either complete or absent. All Woo/WP tables here are InnoDB, and the Woo order-save path issues no nested transactions. The whole batch is deliberately not one transaction. A run killed mid-way stays `running` in `wp_tbv_legacy_runs`. The next run marks it `interrupted`, reports it and continues. Concurrency uses MariaDB `GET_LOCK('tbv_legacy_migration')`, which is connection-scoped and released automatically when a process dies. Orphan protection: if a Woo order, user or record already carries a source ID with no mapping row, the row is a `unmapped_destination_exists` conflict.
- **No side effects.** Orders are built as objects and saved with their historical status, with the status transition cleared. No `woocommerce_order_status_*` hooks fire, so there are no Woo emails, stock changes, payment-complete or refund automation. The importer never calls `payment_complete()` and never creates refunds. During a run it also short-circuits `pre_wp_mail` (and counts attempts), email-change/password-change notifications and the stock filters. **Always on** for imported orders (`_tbv_legacy_import=yes`), so a later admin status edit stays inert: stock reduce/restore is denied, Woo order emails are disabled (opt out with `TBV_LM_ALLOW_LEGACY_ORDER_EMAILS`), and the orders carry `order_stock_reduced`, `recorded_sales`, `recorded_coupon_usage_counts`, `new_order_email_sent` and `download_permissions_granted` = true. `created_via` is `tbv-legacy-migration`, so Woo's unpaid-order auto-cancel, which only applies to checkout/store-api orders, does not touch imported pending orders.
- **Customers.** Each customer becomes a WP user (role `customer`) keyed by `_tbv_source_user_id`. The login is `tbv_<first 16 hex of the UUID>`, not the email. The password is a fresh random 64-character value; **Supabase password hashes are never read**. Users are flagged `_tbv_auth_state=imported_without_password`. Matching uses the source ID only. An email already used by a WP user with no source ID, or with a different one, is a conflict and fails closed. Orders owned by that source user are then `blocked`. No identity is inferred from email.
- **Processor identity** (Merit, Stripe, Paylio, NOWPayments, CatalystPay, StoreCredit, ...) stays in internal underscore meta and the admin box. The customer-visible payment title is the neutral `Imported order`.

## Field mapping

### Customers: `auth.users` to WP user

| Source | Destination |
|---|---|
| `id` | user meta `_tbv_source_user_id` (identity key) |
| `email` (lower/trim) | `user_email`, `billing_email` |
| `created_at` | `user_registered` (UTC) and `_tbv_source_created_at` (raw) |
| `email_confirmed_at` | `_tbv_source_email_confirmed_at` |
| `raw_user_meta_data.firstName/lastName` | `first_name`, `last_name`, `display_name`, `billing_/shipping_first/last_name` |
| `raw_user_meta_data.address, address2, city, state, postalCode, phone` | `billing_*` / `shipping_*` (`phone` billing only) |
| `raw_user_meta_data.country` | `billing_country`/`shipping_country` as a Woo code, matched by exact country name, name without Woo's "(XX)" suffix, or code. Unmatched values stay blank and the raw value goes in `_tbv_source_country`. States are matched to Woo codes where the country has a state list, otherwise the raw value is kept. |
| whole row | `_tbv_source_row` (canonical JSON), `_tbv_source_hash` |
| password | never imported. Random password, `_tbv_auth_state=imported_without_password` |

### Orders: `public.orders` to HPOS order

| Source | Destination |
|---|---|
| `id` (`INV-XXXXXXXX` or legacy `INV-<32 hex>`) | meta `_tbv_source_order_id`. Also `_tbv_invoice_number` when it matches an invoice pattern. Shown as the **order number** (filter `woocommerce_order_number`; disable with `TBV_LM_SHOW_SOURCE_ORDER_NUMBER=false`) and admin-searchable |
| `metadata.invoiceId` | `_tbv_source_invoice_id` |
| `user_id` | `customer_id` (via the customer map). `null` means guest (`customer_id 0`) even if the email matches a customer. An unknown or un-imported owner means `blocked`. |
| `email` | billing email, `_tbv_source_email` |
| `status` | Woo status via the table below. Original string kept in `_tbv_source_status` |
| `created_at` / `paid_at` / `updated_at` | `date_created` / `date_paid` (UTC), raw strings kept in `_tbv_source_*_at`. `date_completed` is not set |
| `items` (else `metadata.items`): `name, dose, quantity (or qty, default 1), price, fromWarehouse, vials, noteLabel` | Product line items. Subtotal = total = `price x quantity` in exact cents. Mapped to a variation by catalog identity (below), otherwise kept as a named line with `_tbv_unmapped_line=yes`. Visible meta `Dose`. Internal `_tbv_source_item`, `_tbv_unit_price_cents`, `_tbv_line_cents`, `_tbv_catalog_match` |
| `metadata.shipping`, `shippingType` | Shipping line "Shipping (type)", `shipping_total` |
| `metadata.automaticDiscount`, `promoDiscount` (+`promoCode`), `affiliateDiscount` (+`affiliateCode`), `cryptoDiscount`, `storeCreditUsed` | Negative fee lines ("Automatic discount", "Promo discount (CODE)", "Referral discount (CODE)", "Payment-method discount", "Store credit applied") with `_tbv_component`. `_tbv_store_credit_used_cents` |
| `metadata.customerCardSurcharge`, `paypalFee` | Positive fee lines ("Card surcharge", "Payment fee") |
| `total` | `total` (authoritative). `_tbv_source_total_cents`, `_tbv_component_sum_cents`, `_tbv_total_mismatch_cents`. If components do not add up to `total`, a `total_component_mismatch` warning is raised and the recorded total is kept. |
| `payment_provider` (else `metadata.paymentProvider`), `payment_id` (else `metadata.paymentId`) | `_tbv_payment_provider`, `_tbv_payment_id`. Woo `payment_method=tbv_legacy_import`, title `Imported order` |
| payment attempts for this order | `_tbv_payment_attempt_refs` (`merit:<uuid>`, `paylio:<uuid>`) |
| `metadata.affiliateCode`, `affiliateCommission`; column `affiliate_commission_adjustment` | `_tbv_affiliate_code` (upper), `_tbv_affiliate_commission`, `_tbv_affiliate_commission_adjustment` |
| `tracking_number`, `tracking_number_2`, `tracking_number_sent_at`, `admin_note`, `metadata.orderNotes` | `_tbv_tracking_number`, `_tbv_tracking_number_2`, `_tbv_tracking_number_sent_at`, `_tbv_admin_note`, customer note |
| whole row | `_tbv_source_row`, `_tbv_source_hash` |
| currency | USD (the orders table has no currency column. Attempts are `usd`/`USD`) |

**Catalog identity.** An explicit `migrationKey` on the item, if an exporter adds one, matches variation meta `_tbv_migration_key`. Otherwise the importer uses the exact, case-insensitive tuple (parent product title, `_tbv_dose`, `_tbv_warehouse` ("us" when `fromWarehouse=="us"`, else "worldwide"), `_tbv_pack_size` (`vials`, default 10), `_tbv_note_label`). There is no fuzzy, SKU or price matching. Zero or several candidates leave the line unmapped. The historical price is always kept, whatever the current price.

### Store credit, affiliates, payment attempts: `wp_tbv_legacy_records`

These are inactive history. Nothing reads this table to grant spendable credit or to pay commissions. Every row keeps its full source payload, hash and revision history.

| Source table | entity / source_key | Typed columns |
|---|---|---|
| `user_credits` (no id in source) | `credit_balances` / lower(email) | `email`, `wp_user_id` (email of an imported customer, else NULL), `amount_cents`, `occurred_at`=`updated_at` |
| `store_credit_ledger` | `credit_ledger` / `order_id` | `source_customer_id`, `email`, `wp_user_id`, `source_order_id`, `wc_order_id`, `amount_cents`=`credit_cents`, `provider`, `state` (`held`/`consumed`), `occurred_at` |
| `store_credit_adjustments` | `credit_adjustments` / `request_id` | `email`, `kind`=`mode`, `amount_cents`, `before_cents`, `balance_cents` (`admin_id`, `note` in payload) |
| `affiliates` | `affiliates` / upper(code) | `affiliate_code`, `email`, `wp_user_id`, `state` (`active`/`inactive`/`unknown`) |
| `affiliate_customers` | `affiliate_customers` / email\|CODE | `email`, `affiliate_code`, `wp_user_id` |
| `affiliate_orders` | `affiliate_orders` / `order_id` | `affiliate_code`, `amount_cents`=`commission_amount`, `kind`=`shipping_type`, `wc_order_id` |
| `affiliate_payouts` | `affiliate_payouts` / `id` | `affiliate_code`, `amount_cents`, `occurred_at` (`note` in payload). Nothing is executed |
| `merit_payment_attempts` | `payment_attempts` / `merit:<id>` | `state`, `amount_cents`, `wc_order_id`, `source_customer_id`; `intent_id`, `credit_reserved_cents` and the snapshot are in the payload |
| `paylio_payment_attempts` | `payment_attempts` / `paylio:<id>` | `state`, `amount_cents`, `wc_order_id`; `payment_id` is in the payload |

Rows that reference an order (ledger, attempts, affiliate_orders) stay `blocked` until that order is imported. Customer links resolved later are filled in by a relink pass. Codes or emails that match nothing are kept unlinked and a warning is raised.

**Reconciliation balances** are reported per email: `balance_cents` (the `user_credits` snapshot), `held_cents`, `consumed_cents` and `adjustments_net_cents`, each source vs destination. The importer **does not** derive a spendable balance or subtract holds again: per `merit_store_credit.sql`, holds and debits have already reduced `user_credits.amount`. Per affiliate code it reports attributed orders, commission cents, payouts and payout cents. It does not compute liability.

## Status mapping

Matching is case-insensitive, because the source SQL compares `lower(status)`. Whitespace is not trimmed. The table can be filtered with `tbv_lm_status_map`.

| Source status | Woo status | Evidence |
|---|---|---|
| `pending`, `checkout`, `checkout (clicked pay)`, `wire_pending` | `pending` | paylio `reserve_paylio_checkout` payable states. Admin selector |
| `paid`, `processing` | `processing` | merit/paylio guards. Admin selector |
| `done`, `shipped`, `delivered`, `completed` | `completed` | `has_pending_legacy_credit` terminal list. Admin selector |
| `refunded` | `refunded` (no refund objects are created) | guards. Admin selector |
| `cancelled` | `cancelled` | guards. Admin selector |
| anything else, or null | **rejected** (`unknown_status`) | fail closed |

A source `paid` is a historical label, not a payment verification. Evidence lives in `_tbv_payment_*` meta and the attempt records.

## Open schema questions (need source owner or read-only real-schema inspection)

1. **Base DDL is not in the repo** for `orders`, `user_credits`, `affiliates`, `affiliate_orders` and `affiliate_customers`. The migrations only alter them. Columns here were inferred from code. Types of `orders.total` and `affiliate_commission_adjustment`, and nullability throughout, are unconfirmed. App.jsx also falls back to top-level `row.subtotal`, `row.shipping`, `row.promo_discount`, `row.affiliate_code` and `row.shipping_type`, which suggests older rows may carry component columns. The importer only reads components from `metadata`. Such columns would be preserved in `_tbv_source_row`, but they would produce `total_component_mismatch` warnings until the mapping is extended.
2. **`public.profiles`**, named in the brief, has no migration or code reference in this checkout. Profile data comes from `auth.users.raw_user_meta_data`. Does a profiles table exist in production?
3. **Authoritative total:** `orders.total` vs `metadata.total`. The tracker prefers metadata. The importer uses the column and warns on any difference. Same question for `created_at` vs `metadata.createdAt`.
4. **Status semantics:** what separates `done`, `shipped`, `delivered` and `completed`? Should old `paid` orders that were fulfilled but never advanced really show as `processing`? Real data may also hold statuses not listed here. Those fail closed and need an owner-approved addition.
5. **Refunds:** the schema has no refund amount or date, only the `refunded` status and `metadata.refundCommissionDeduction`/`affiliateCommissionDeduction`. Partial refunds can't be represented. Are refund amounts recorded anywhere, such as processor statements?
6. **`user_credits` has no id.** It is keyed by email, and the checkout RPC fails closed on duplicates. The importer rejects duplicate emails. Are there duplicates in production? Email changes rewrite `email` across tables (`account-email-change.js`), so history under old emails is not recoverable from the source.
7. **Legacy credit claims:** orders with `metadata.storeCreditUsed` and no ledger row (pre-ledger) are imported as order fee lines only. Accounting treatment needs a decision.
8. **Keys:** `affiliate_orders` is keyed by `order_id`, because writers upsert `on_conflict=order_id`. The type of `affiliate_orders.id` and the uniqueness of `affiliate_customers` (email, code) are unconfirmed.
9. **Guest vs legacy-registered orders:** registered customers' orders from before `orders.user_id` existed will import as unlinked. Linking by email needs an explicit owner decision. It is intentionally not automatic.
10. **Payment evidence for other providers** (legacy Stripe webhooks, NOWPayments, CatalystPay, cash/crypto) exists only as `payment_provider`/`payment_id`/metadata such as `catalystpay_invoice_id` and `legacyInvoiceAttempt`. No attempt tables exist for them.
11. **Out of scope / not migrated:** `user_promos` and `discount_change_log`, `order_cost_overrides` (private accounting corrections that affect historical margin), `contact_messages`, support attachments, analytics.

## What is NOT verified

- **Real export access and consistency.** No real export exists yet and no export query has been written or run. Snapshot consistency (one transaction), row counts, real value shapes (`items` variants, numeric vs string, timestamps, nulls) and real volumes are untested. The exporter must also strip credentials.
- **Auth migration.** Users get random passwords and no notification. The claim/reset flow, email-confirmation carry-over, MFA (`email_login_mfa.sql`) and pending email-change state are open items.
- **Real data reconciliation.** Totals were only reconciled on the synthetic fixture. The fixture's amount semantics come from reading source code, not real rows.
- Other: classic (non-HPOS) storage is refused, not tested. Only the plugins on the migration-test site were present, so third-party extension hooks on the final host are untested. The admin meta box was rendered directly in the test, and HPOS admin search by source ID was not browser-tested. Performance at real volume is untested (the importer loads all mapping rows, and reconcile loads every imported order). `--accept-changes` for orders rebuilds line items, so item IDs change. Showing the source invoice as the Woo order number and disabling Woo emails for imported orders are owner-reviewable defaults. Store credit is not spendable and commissions are not payable in WooCommerce. Those need separate, approved features.
