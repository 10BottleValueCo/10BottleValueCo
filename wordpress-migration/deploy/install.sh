#!/usr/bin/env bash
# Install the 10BottleValueCo WordPress store from a bundle built by
# build-bundle.sh, on an empty database. Run from the unpacked bundle:
#
#   ./install.sh <settings.env>
#
# settings.env (keep it private; it holds the database password):
#   TBV_ROOT=/srv/10bottlevalue          # new directory: wordpress/ is the web root inside it
#   TBV_SITE_URL=https://store.example   # public origin, no trailing slash
#   TBV_MODE=staging|production
#   TBV_ADMIN_EMAIL=you@example          # first WordPress administrator
#   TBV_STORE_EMAIL=support@10bottlevalue.co   # customer emails come from this address
#   DB_NAME=... DB_USER=... DB_PASSWORD=... DB_HOST=127.0.0.1
#   TBV_LOOPBACK_HOST=127.0.0.1:8088     # optional: host:port for checks run on the server
#
# The script never prints passwords. Generated ones go to $TBV_ROOT/private/.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
settings="${1:?usage: install.sh <settings.env>}"
set -a; . "$settings"; set +a
: "${TBV_ROOT:?}" "${TBV_SITE_URL:?}" "${TBV_MODE:?}" "${TBV_ADMIN_EMAIL:?}" "${DB_NAME:?}" "${DB_USER:?}" "${DB_PASSWORD:?}"
DB_HOST="${DB_HOST:-127.0.0.1}"; TBV_STORE_EMAIL="${TBV_STORE_EMAIL:-support@10bottlevalue.co}"; TBV_LOOPBACK_HOST="${TBV_LOOPBACK_HOST:-}"
TBV_SITE_URL="${TBV_SITE_URL%/}"
step() { printf '\n== %s\n' "$*"; }
fail() { echo "install: $*" >&2; exit 1; }
[[ "$TBV_MODE" == staging || "$TBV_MODE" == production ]] || fail "TBV_MODE must be staging or production"
[[ "$TBV_SITE_URL" =~ ^https?://[A-Za-z0-9.:-]+$ ]] || fail "TBV_SITE_URL must be an origin like https://store.example"
[[ "$TBV_MODE" == production && "$TBV_SITE_URL" != https://* && -z "${TBV_ALLOW_HTTP:-}" ]] && fail "production needs an https:// site URL"

step "Preflight"
command -v php >/dev/null || fail "php not found"
command -v wp >/dev/null || fail "wp-cli not found (https://wp-cli.org)"
php -r 'exit(version_compare(PHP_VERSION, "8.1", ">=") ? 0 : 1);' || fail "PHP 8.1+ required (found $(php -r 'echo PHP_VERSION;'))"
mods="$(php -m)"; missing=""
for ext in mysqli curl mbstring intl zip xml openssl json; do grep -qix "$ext" <<<"$mods" || missing+=" $ext"; done
grep -qiE '^(gd|imagick)$' <<<"$mods" || missing+=" gd/imagick"
[[ -z "$missing" ]] || fail "missing PHP extensions:$missing"
[[ -e "$TBV_ROOT/wordpress" ]] && fail "$TBV_ROOT/wordpress already exists; refusing to overwrite an install"
(cd "$here" && shasum -a 256 -c MANIFEST.sha256 --quiet) || fail "bundle files do not match MANIFEST.sha256"
echo "php $(php -r 'echo PHP_VERSION;'), wp-cli $(wp --version --allow-root 2>/dev/null | awk '{print $2}'), bundle $(jq -r .source 2>/dev/null < "$here/BUNDLE.json" || head -c 200 "$here/BUNDLE.json")"

step "Files"
mkdir -p "$TBV_ROOT"/{private,logs,backups,support-attachments,scripts}
chmod 700 "$TBV_ROOT/private" "$TBV_ROOT/support-attachments"
cp -R "$here/wordpress" "$TBV_ROOT/wordpress"
cp "$here"/scripts/* "$TBV_ROOT/scripts/"
if [[ "$TBV_MODE" == staging ]]; then
  cp "$here/staging/tbv-persistent-staging.php" "$TBV_ROOT/wordpress/wp-content/mu-plugins/"
fi
wpc() { wp --path="$TBV_ROOT/wordpress" "$@"; }

step "Secrets and wp-config.php"
umask 077
php -r '
  [$_, $out, $name, $user, $pass, $host] = $argv;
  $s = ["DB_NAME" => $name, "DB_USER" => $user, "DB_PASSWORD" => $pass, "DB_HOST" => $host];
  foreach (["AUTH_KEY","SECURE_AUTH_KEY","LOGGED_IN_KEY","NONCE_KEY","AUTH_SALT","SECURE_AUTH_SALT","LOGGED_IN_SALT","NONCE_SALT"] as $k) $s[$k] = bin2hex(random_bytes(32));
  file_put_contents($out, "<?php\n// PRIVATE. Database credentials and fixed salts for this install.\nreturn " . var_export($s, true) . ";\n");
' "$TBV_ROOT/private/wp-secrets.php" "$DB_NAME" "$DB_USER" "$DB_PASSWORD" "$DB_HOST"
umask 022
if [[ "$TBV_MODE" == staging ]]; then
  env_type=staging
  mode_constants="define('TBV_STAGING_PREVIEW', true);       // synthetic data only; staging guard mu-plugin is installed
define('TBV_STAGING_COMMERCE_TEST', true);
define('DISABLE_WP_CRON', true);
define('WP_HTTP_BLOCK_EXTERNAL', true);"
else
  env_type=production
  mode_constants="define('TBV_STORE_MODE', 'production');
// Gateway IDs checkout may offer, set by the payment integration. Empty: no online payment yet.
define('TBV_PRODUCTION_GATEWAYS', []);
define('DISABLE_WP_CRON', true);         // run 'wp cron event run --due-now' every minute from the system cron"
fi
php -r '
  [$_, $tpl, $out, $mode, $url, $loop, $env, $consts] = $argv;
  $c = strtr(file_get_contents($tpl), ["{{MODE}}" => $mode, "{{SITE_URL}}" => $url, "{{LOOPBACK_HOST}}" => $loop, "{{ENVIRONMENT}}" => $env, "{{MODE_CONSTANTS}}" => $consts]);
  file_put_contents($out, $c);
' "$here/config/wp-config.template.php" "$TBV_ROOT/wordpress/wp-config.php" "$TBV_MODE" "$TBV_SITE_URL" "$TBV_LOOPBACK_HOST" "$env_type" "$mode_constants"
chmod 640 "$TBV_ROOT/wordpress/wp-config.php"

step "Database"
tables="$(wpc db query "SHOW TABLES" --skip-column-names 2>/dev/null | wc -l | tr -d ' ')" || fail "cannot connect to database $DB_NAME"
[[ "$tables" == 0 ]] || fail "database $DB_NAME is not empty ($tables tables); use a new, empty database"
wpc db import "$here/seed.sql" >/dev/null
wpc search-replace 'https://seed.tbv.invalid' "$TBV_SITE_URL" --all-tables --precise --quiet
wpc option update admin_email "$TBV_ADMIN_EMAIL" >/dev/null
wpc option update woocommerce_email_from_address "$TBV_STORE_EMAIL" >/dev/null
wpc option update woocommerce_stock_email_recipient "$TBV_ADMIN_EMAIL" >/dev/null
wpc option update blog_public "$([[ "$TBV_MODE" == production ]] && echo 1 || echo 0)" >/dev/null

step "Code integrity"
wpc core verify-checksums
wpc plugin verify-checksums woocommerce

step "Store settings"
wpc eval-file "$here/scripts/configure-store.php"

step "Administrator"
admin_user="${TBV_ADMIN_USER:-tbv-admin}"
admin_pass="$(php -r 'echo rtrim(strtr(base64_encode(random_bytes(18)), "+/", "-_"), "=");')"
wpc user create "$admin_user" "$TBV_ADMIN_EMAIL" --role=administrator --user_pass="$admin_pass" --porcelain >/dev/null
printf "# PRIVATE. WordPress administrator for %s. Never share in chat.\nWP_ADMIN_USER=%s\nWP_ADMIN_PASSWORD=%s\nWP_ADMIN_EMAIL=%s\n" "$TBV_SITE_URL" "$admin_user" "$admin_pass" "$TBV_ADMIN_EMAIL" > "$TBV_ROOT/private/admin.env"
chmod 600 "$TBV_ROOT/private/admin.env"; unset admin_pass

if [[ "$TBV_MODE" == staging ]]; then
  step "Staging test customers and fixtures"
  {
    echo "# PRIVATE synthetic staging test customers (fictional). Staging only."
    for i in 1 2 3; do
      pass="$(php -r 'echo rtrim(strtr(base64_encode(random_bytes(12)), "+/", "-_"), "=");')"
      wpc user create "test.customer$i" "test.customer$i@example.test" --role=customer --first_name="Test" --last_name="Customer $i" --user_pass="$pass" --porcelain >/dev/null
      wpc user meta update "test.customer$i@example.test" _tbv_staging_synthetic 1 >/dev/null
      printf "TEST_CUSTOMER_%s_EMAIL=test.customer%s@example.test\nTEST_CUSTOMER_%s_PASSWORD=%s\nTEST_CUSTOMER_%s_NAME=Test Customer %s\n" "$i" "$i" "$i" "$pass" "$i" "$i"
    done
    echo "E2E_RUN_PASSWORD=$(php -r 'echo bin2hex(random_bytes(9));')"
  } > "$TBV_ROOT/private/test-accounts.env"
  chmod 600 "$TBV_ROOT/private/test-accounts.env"
  cp "$TBV_ROOT/private/admin.env" "$TBV_ROOT/private/staging.env"
  wpc eval-file "$here/scripts/configure-staging-coupons.php" >/dev/null
fi

step "Finish"
wpc rewrite flush --hard >/dev/null 2>&1 || wpc rewrite flush >/dev/null
wpc cache flush >/dev/null
mode_seen="$(wpc eval 'echo function_exists("tbv_store_mode") ? tbv_store_mode() : "no-theme";' 2>/dev/null)"
[[ "$mode_seen" == "$TBV_MODE" ]] || fail "store mode is '$mode_seen', expected '$TBV_MODE' (check wp-config.php)"
echo "{\"root\":\"$TBV_ROOT\",\"site\":\"$TBV_SITE_URL\",\"mode\":\"$mode_seen\",\"products\":$(wpc post list --post_type=product --format=count),\"variations\":$(wpc post list --post_type=product_variation --format=count),\"plugins\":\"$(wpc plugin list --status=active --field=name | tr '\n' ' ')\"}"
cat <<NEXT

Next:
  1. Point the web server's document root at $TBV_ROOT/wordpress (samples in config/), PHP-FPM 8.1+.
     Block /wp-admin and /wp-login.php behind an extra login (see the samples); keep admin-ajax.php public.
  2. System cron, every minute:  wp --path=$TBV_ROOT/wordpress cron event run --due-now
  3. Check it:  $TBV_ROOT/scripts/verify.sh $TBV_SITE_URL
  Administrator login is in $TBV_ROOT/private/admin.env (private; do not paste it into chat).
NEXT
