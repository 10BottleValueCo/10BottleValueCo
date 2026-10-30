# Server-rendered WordPress review

WordPress 7.1.3 and WooCommerce 11.2.1 execute in PHP 8.3 on the server. The site and SQLite seed contain the existing 66-product/166-offer public-catalog preview, no customer orders, and a scrubbed dummy user. Only anonymous catalog/cart forms are allowed. Accounts, administration, checkout, email, updates, and provider access are disabled.

The generated server.cjs bundles the official @php-wasm/node and @wp-playground/wordpress 3.1.60 libraries. vendor/php-8-3 contains the official PHP 8.3 runtime, with its feature-detect import made relative. Other PHP versions are excluded. Licenses are retained.

The site directory is private function data, never a static-public directory. Each warm function copies only the SQLite directory to a unique temporary folder. Runtime PHP mounts only this site and its temporary database; host filesystem and environment are not exposed. Browser cookies are limited to preview WooCommerce cart cookies and scoped to /wordpresspreview/.

This is an ephemeral review snapshot, not a durable production WordPress/MySQL migration. Carts may reset across function instances/cold starts. Existing storefront APIs and customer/financial records are unchanged. A normal persistent WordPress host and migration are separate work.

Current source implementation is src/server-source.mjs and src/preview-banner.php; server.cjs is its bundled runtime. The public WordPress CSS/JS/images are under artifacts/10-bottle-value/public/wordpresspreview/wp-*.
