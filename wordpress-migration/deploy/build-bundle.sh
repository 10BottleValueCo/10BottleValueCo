#!/usr/bin/env bash
# Assemble the deployable bundle (everything install.sh needs, nothing private):
#
#   deploy/build-bundle.sh <theme-build-dir> <reference-wordpress-docroot> <seed.sql> <out-dir>
#
# <theme-build-dir>   output of staging-theme-lab/build-local.mjs (theme, homepage, catalog ZIPs)
# <reference docroot> a WordPress 7.1.3 + WooCommerce 11.2.1 install whose core and
#                     WooCommerce files pass checksum verification (they are copied as is)
# <seed.sql>          from make-seed.sh
set -euo pipefail
build="${1:?theme build dir}"; ref="${2:?reference docroot}"; seed="${3:?seed.sql}"; out="${4:?output dir}"
[[ -e "$out" ]] && { echo "Refusing: $out exists" >&2; exit 1; }
here="$(cd "$(dirname "$0")" && pwd)"; mig="$(cd "$here/.." && pwd)"; repo="$(cd "$mig/.." && pwd)"
wp --path="$ref" core verify-checksums >/dev/null 2>&1 || { echo "reference core fails checksums" >&2; exit 1; }
wp --path="$ref" plugin verify-checksums woocommerce >/dev/null 2>&1 || { echo "reference WooCommerce fails checksums" >&2; exit 1; }
[[ "$(wp --path="$ref" core version 2>/dev/null)" == 7.1.3 ]] || { echo "reference core is not 7.1.3" >&2; exit 1; }

mkdir -p "$out"/{wordpress,scripts,staging,config}
# WordPress core, no wp-config.php and an empty wp-content.
rsync -a --exclude=/wp-config.php --exclude=/wp-content/ "$ref/" "$out/wordpress/"
mkdir -p "$out/wordpress/wp-content"/{plugins,themes,mu-plugins,uploads}
cp "$ref/wp-content/index.php" "$out/wordpress/wp-content/"
cp "$ref/wp-content/plugins/index.php" "$out/wordpress/wp-content/plugins/"
rsync -a "$ref/wp-content/plugins/woocommerce" "$out/wordpress/wp-content/plugins/"
# Our plugins, from source.
rsync -a "$mig/woo-storefront-rules/tbv-storefront-rules" "$mig/woo-affiliates-credit/tbv-affiliates-credit" \
  "$mig/woo-storefront-admin/tbv-storefront-admin" "$mig/shipping-lab/tbv-warehouse-shipping" "$out/wordpress/wp-content/plugins/"
# Theme, homepage adapter and catalog plugin, from the theme build.
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
unzip -q "$build/10bottlevalue-woo-staging-review-0.2.0.zip" -d "$tmp/theme"
unzip -q "$build/tbv-homepage-staging-review-0.2.0.zip" -d "$tmp/home"
unzip -q "$build/tbv-public-woo-catalog-0.1.0.zip" -d "$tmp/catalog"
rsync -a "$tmp/theme/10bottlevalue-react-proof" "$out/wordpress/wp-content/themes/"
rsync -a "$tmp/home/tbv-local-homepage-proof" "$out/wordpress/wp-content/mu-plugins/"
rsync -a --exclude=tests "$tmp/catalog/tbv-public-woo-catalog" "$out/wordpress/wp-content/plugins/"
printf "<?php\nrequire __DIR__ . '/tbv-local-homepage-proof/tbv-local-homepage-proof.php';\n" > "$out/wordpress/wp-content/mu-plugins/tbv-local-homepage-loader.php"
# Product media (catalog images referenced by the seed); no logs or WooCommerce uploads.
rsync -a --exclude=wc-logs --exclude=woocommerce_uploads "$ref/wp-content/uploads/" "$out/wordpress/wp-content/uploads/"
# Staging-only guard, scripts, config samples, seed.
cp "$mig/persistent-staging/mu-plugins/tbv-persistent-staging.php" "$out/staging/"
cp "$here/install.sh" "$here/settings.example.env" "$out/"
cp "$here/configure-store.php" "$mig/persistent-staging/scripts/configure-staging-coupons.php" \
   "$mig/persistent-staging/scripts/e2e-staging.mjs" "$mig/persistent-staging/scripts/browser-qa.mjs" \
   "$mig/persistent-staging/scripts/audit-staging.php" "$here/verify-production.mjs" "$here/catalog-parity.mjs" "$here/verify.sh" "$out/scripts/"
cp -R "$here/config/." "$out/config/"
cp "$here/README.md" "$out/README.md"
cp "$seed" "$out/seed.sql"
commit="$(git -C "$repo" rev-parse HEAD)"; dirty="$(git -C "$repo" status --porcelain -- wordpress-migration | wc -l | tr -d ' ')"
printf '{"source":"%s","uncommittedFiles":%s,"themeBuild":"%s","wordpress":"7.1.3","woocommerce":"%s","seedSha256":"%s","builtAt":"%s"}\n' \
  "$commit" "$dirty" "$(basename "$build")" "$(wp --path="$ref" plugin get woocommerce --field=version 2>/dev/null)" "$(shasum -a 256 "$seed" | cut -d' ' -f1)" "$(date -u +%FT%TZ)" > "$out/BUNDLE.json"
(cd "$out" && find . -type f ! -name MANIFEST.sha256 -print0 | sort -z | xargs -0 shasum -a 256 > MANIFEST.sha256)
# Nothing private may ship.
if grep -rIl -E 'BEGIN (RSA|OPENSSH) PRIVATE KEY|DB_PASSWORD['"'"'"]?\s*[,=>]+\s*['"'"'"][^'"'"'"{]' "$out" --exclude=install.sh --exclude=README.md --exclude=*.template.php --exclude=wp-config-sample.php | grep .; then echo "bundle contains secrets (above)" >&2; exit 1; fi
[[ -z "$(find "$out" \( -name 'wp-config.php' -o \( -name '*.env' ! -name settings.example.env \) -o -name 'wp-secrets*.php' \) | head -1)" ]] || { echo "bundle contains config/env files" >&2; exit 1; }
du -sh "$out" | cut -f1 | xargs -I{} echo "{\"bundle\":\"$out\",\"size\":\"{}\",\"files\":$(wc -l < "$out/MANIFEST.sha256" | tr -d ' ')}"
