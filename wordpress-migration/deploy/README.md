# Deploying the 10BottleValueCo WordPress store

This directory turns the tested staging store into a bundle that installs on any server in one command, as a staging copy or as the real store.

## What the server needs

| Need | Detail |
|---|---|
| OS access | SSH (or a shell) as a user that can write the install directory and run `wp` |
| PHP | 8.1+ (tested on 8.5) with FPM; extensions mysqli, curl, mbstring, intl, zip, xml, openssl, json, gd or imagick; `memory_limit` 512M; `upload_max_filesize`/`post_max_size` 30M |
| Database | MariaDB 10.6+ or MySQL 8; one **new, empty** database plus a user with full rights on it |
| Web server | nginx, Caddy or Apache serving `<install>/wordpress` as the document root (samples in `config/`) |
| HTTPS | A certificate for the store's domain (Let's Encrypt is fine) |
| Tools | [WP-CLI](https://wp-cli.org) 2.10+; `shasum`; Node 20+ only for the check scripts |
| Cron | One system cron line (printed by the installer) |
| Email | An SMTP or transactional-email service for order and password emails (production only) |
| Disk | About 1 GB including backups |

## Install

```sh
# on the server, from the unpacked bundle
cp settings.example.env /srv/private-settings.env   # fill it in; keep it private
./install.sh /srv/private-settings.env
```

The installer:
1. checks PHP, extensions, WP-CLI, and that the database is empty and the bundle files match `MANIFEST.sha256`;
2. copies WordPress 7.1.3, WooCommerce 11.2.1, the store's plugins and theme (all verified against official checksums or the manifest);
3. writes `wp-config.php` with fresh salts, keeping database credentials in `<install>/private/` (outside the web root);
4. loads the seed: the catalog (66 products, 166 options, images), pages, shipping and store settings. It holds **no orders, customers, accounts or messages**;
5. creates the administrator (password saved to `private/admin.env`, never printed) and the two live promo codes;
6. staging only: the safety guard (banner, no email, no real payments, test-order gateway) and three synthetic test customers.

Then point the web server at `<install>/wordpress`, add the cron line, and run `scripts/verify.sh https://<domain>`.

## Modes

| | staging | production |
|---|---|---|
| Banner, noindex | yes | no |
| Email | blocked | sent (needs a mail service) |
| Checkout gateways | staging test order (unpaid) + synthetic store credit | the IDs in `TBV_PRODUCTION_GATEWAYS` in `wp-config.php` + store credit; empty until a processor is connected, and the cart then says online payment is not available yet |
| Payment callbacks (`wc-api`, order-pay) | blocked | open for the payment integration |
| Outbound HTTP, WP cron | blocked | allowed; WP cron runs from the system cron |

A production install with no gateway is a complete store without online payment: browsing, carts, accounts, store-credit orders, the admin panel, affiliates and support chat all work.

## Moving or updating

- **Code update:** build a new bundle, then replace `wordpress/wp-content/{themes,plugins,mu-plugins}` from it (the database is untouched). `DISALLOW_FILE_MODS` stops changes from wp-admin, so the bundle is the only source of code.
- **Move to another server:** `wp db export`, copy `<install>/` (including `private/`, `support-attachments/` and `wordpress/wp-content/uploads/`), import, then `wp search-replace <old-origin> <new-origin>` and update `TBV_SITE_URL` in `wp-config.php`.
- **Real data:** customers, orders, credit and affiliates come from the migration tools (`../woo-legacy-migration`, `wp tbv-affiliates import-legacy`) after an authorized export, first on a staging install.

## Rehearsal (2026-10-29)

The same bundle was installed twice on this Mac, each on a new empty database behind its own web server:
- **staging mode:** E2E 94/94, browser QA 290/290 (mobile and desktop, live comparison), safety audit pass;
- **production mode:** `verify-production.mjs` 48/48. That covers no banner, indexable pages, carts, discounts, promo codes, closed API boundaries and the admin gate; sign-up with email confirmation before credit appears; and checkout saying online payment is not available yet. With WooCommerce's Check payments as a stand-in processor it was 49/49: order placed, customer and admin order emails.

## Building a bundle (developers)

```sh
deploy/make-seed.sh tbv_staging /tmp/seed.sql
deploy/build-bundle.sh <theme-build-dir> <staging-docroot> /tmp/seed.sql /tmp/tbv-bundle
```

`node deploy/catalog-parity.mjs <production-source> <store-origin>` compares every offer's price and stock with the live storefront's own table.
