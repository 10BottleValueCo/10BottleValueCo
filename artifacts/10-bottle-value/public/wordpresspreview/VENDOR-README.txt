WordPress Playground vendor runtime — private migration preview

Source build: 16a098b0e927b8fb3525ced104f0157344894802, observed 2026-10-24.
Most assets retain the exact official bytes. A documented canonical-routing
compatibility fork modifies five files: the client path validator, its entry,
the service worker, the remote boot module and remote HTML. It accepts /remote
alongside /remote.html without changing the origin allowlist, uses a separate
SW cache namespace, and fingerprints each modified script. provenance.json
records exact upstream/derived hashes and the source-only upstream patch path.
Original upstream files are retained under the source repository upstream/ tree,
outside dist. The project license and original script notices are retained.
See LICENSE-WordPress-Playground.txt.

This deliberately limited tree supports remote.html, its service worker, the
matching client, PHP 8.3 JSPI and Asyncify backends, SQLite and the current review
blueprint. It does not bundle the full Playground website or every PHP version.
The exact official optimized WordPress bundle is vendored locally. Selector 7.1
maps to installed WordPress 7.1.3 in this pinned distribution; startup verifies
the actual version. WooCommerce 11.2.1 is also served from the same site. The
derived static archive omits only the default-theme subtree; every retained
file remains byte-identical to the official archive. Its detailed verification
manifest is in derivations/. Supported writeFile/unzip steps install these
static assets before plugin/theme import and navigation. No boot-critical
WordPress or WooCommerce download uses an external CORS proxy.

assets-required-for-offline-mode.json is generated metadata listing only the
runtime assets included here. It is not the full official website's 101-item
offline cache list. Vendor executable files are unchanged. The custom launcher,
theme, catalog and preview plugin remain separate first-party files.

The local fork uses canonical same-origin /remote. Sites redirects /remote.html
to that route; the development server reproduces that redirect. Keep the remote
HTML, fingerprinted SW/boot modules, worker entry and /assets at the site root.
The derived static archive is served at /wp-7.1/wordpress-static.zip, the exact
native hydration path. Optional PHP networking is disabled and WP HTTP external
requests are blocked; browser asset fetches remain available. HTTPS, service-worker execution and correct .wasm MIME
types are required. This remains a browser-session review, not durable hosting
of a production WordPress database or operational payments.
