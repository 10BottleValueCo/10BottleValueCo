# WordPress / WooCommerce staging theme source

This directory captures the source for an isolated review prototype, **not a finished storefront migration**. It includes the staging theme, its homepage adapter, and an overlay of the existing React presentation. The theme and adapter require WooCommerce and the separate public catalog plugin from `wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog`. The theme uses Woo's guest cart; checkout, accounts and gateways are deliberately disabled. Do not install it on a live store or a site holding real customer records, payment credentials or fulfillment/email integrations.

## Build an isolated review package

Use a checkout that contains commit `83336ce3caceb54ace8944204eb6307bad818a07` and has this repository's workspace dependencies installed. The builder uses that pinned Git baseline, overlays the source in this directory, and extracts only the 220 public assets listed with SHA-256 hashes in `public-assets.json`. It does not copy the current live database, customer records, environment files or credentials. Asset contents are checked before building. The target directory must not exist, and its parent must exist.

```sh
node wordpress-migration/staging-theme-lab/build-local.mjs /absolute/path/to/new-output-directory
```

The builder runs Vite with a relative base, removes inherited `VITE_*` environment values, writes a theme ZIP, homepage plugin ZIP and public catalog plugin ZIP, and does not install or deploy them. It needs Node, Git, `tar`, `zip`, the repository's installed workspace dependencies and a compatible local esbuild binary. On a system where the workspace uses a platform-specific esbuild override, set the usual `ESBUILD_BINARY_PATH`/`NODE_PATH` before running. The pinned commit must be present locally; shallow clones may need more history. `front-page.php` and the homepage adapter's asset manifest are generated for that build; do not hand-edit their hashed asset names.

Install only into a separate disposable local or staging WordPress instance, with a separate database and files, no real data or credentials, no payment/email/fulfillment plugins, and server-level network and scheduler isolation. Set `WP_ENVIRONMENT_TYPE` to `local` or `staging`, `TBV_STAGING_PREVIEW` to true, `DISABLE_WP_CRON` to true, and `WP_HTTP_BLOCK_EXTERNAL` to true. These settings and the theme guard are not a security boundary against arbitrary PHP or infrastructure access.

## Evidence and limitations

The captured source built locally from the pinned Git baseline and manifest. The resulting theme ZIP had the same file contents as the earlier tested local candidate; the homepage asset manifest was semantically identical, and catalog plugin contents matched. Programmatic installation through WordPress upgraders passed 9/9 checks and selected route/cart/session checks passed 27/27 at both `/` and `/wordpresspreview` in a disposable PHP-WASM/SQLite runtime. Five Node tests cover ambiguous offer filtering. Earlier browser tests exercised selected navigation, names and carts against mounted candidate files; those are not a browser installation test or full parity assessment.

The bundle retains legacy payment/account/admin code and inherited presentation. It is not a production security boundary, a Stripe integration, a migration importer, a complete native Woo theme, or proof of current inventory, pricing, product identities, customer data, accessibility or visual parity. The review-only checkout design exists in the package but checkout cannot run with the staging guard. Real PHP/MySQL hosting, complete checkout, shipping/tax configuration, order/credit/affiliate preservation and reconciliation, and the payment team's integration still require work. No production cutover is implied.
