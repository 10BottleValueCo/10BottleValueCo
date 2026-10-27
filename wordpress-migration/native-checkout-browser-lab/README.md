# Local-only native WooCommerce checkout browser lab

This is a disposable **test harness**, not a payment gateway, production theme or hosted preview. It takes the staging review ZIPs from `../staging-theme-lab`, extracts them into a new direct child of the operating system temporary directory, and replaces the theme's staging guard **only in that extracted copy** with a localhost-only guard for the synthetic checkout experiment. Never repackage, deploy or use that modified copy on a real host or with real data. The original theme ZIP remains unchanged and continues to block checkout, accounts and payment gateways.

The harness requires a trusted local WordPress/PHP-WASM runtime in the layout used by the previous isolated preview, the specifically recognized sanitized test-database hash, a Playwright installation, and Chrome or Chromium. It refuses unrecognized fixture databases; this is deliberately narrower than a general WordPress setup tool. It copies the sanitized site and database into a disposable temporary runtime, mounts only the synthetic gateway and warehouse-shipping development plugin, blocks WordPress HTTP and cron, and listens on `127.0.0.1` only. The gateway permits only `.invalid` email addresses and synthetic products and never calls a real provider or `payment_complete`. A fixed test fixture and isolated server are necessary: these checks do not make arbitrary plugins or other runtimes safe.

For a local test, first build the three staging ZIPs, then provide a **new** direct child of the OS temp directory and those ZIP paths to:

```sh
python3 wordpress-migration/native-checkout-browser-lab/prepare.py NEW_TEMP_DIR THEME_ZIP HOMEPAGE_ZIP CATALOG_ZIP
TBV_FIXTURE_ROOT=NEW_TEMP_DIR TBV_WP_TEST_RUNTIME=ABSOLUTE_RUNTIME_PATH node wordpress-migration/native-checkout-browser-lab/serve.mjs
```

In another terminal, set `TBV_PLAYWRIGHT_MODULE` to the absolute path of `playwright-core/index.mjs` and `TBV_CHROME_BIN` to the absolute browser executable, then run:

```sh
node wordpress-migration/native-checkout-browser-lab/test-native-form.mjs
```

The default path is `/wordpresspreview`; set `TBV_SITE_PREFIX=root` on **both** server and test to use `/`. Stop the server after the test. It disposes of its copied test database, but the deliberately modified extracted fixture remains in the chosen temporary directory; do not distribute it. The test does not log the checkout response or order key.

With the UTF-8 ZIP build, the local browser selected a fictional 5-pack, used the real Woo guest cart and classic checkout form, submitted fictional billing data, and verified one pending, unpaid order with the selected variation, fixture total and shipping rule version. No observed payment-complete, stock-reduction or mail hook fired; replay did not create another order. The selected 390px viewport had no horizontal overflow or observed HTTP/JavaScript errors. Both root and subdirectory passed in PHP-WASM/SQLite with external browser traffic blocked. This is not a Stripe test, payment confirmation, full accessibility/visual parity, tax/coupon test, or proof that extensions are safe. Stock holds are disabled because SQLite lacks the MySQL locking query; real MySQL/MariaDB stock contention, real rates, accounts, real records and the final host remain unverified.
