<?php
/**
 * 10BottleValueCo persistent WordPress STAGING. Synthetic data only.
 * Never point this install at production data, a live payment processor,
 * fulfillment or customer email. Secrets live outside the web root.
 */
$tbv_secrets = require dirname(__DIR__) . '/private/wp-secrets.php';

define('DB_NAME', $tbv_secrets['DB_NAME']);
define('DB_USER', $tbv_secrets['DB_USER']);
define('DB_PASSWORD', $tbv_secrets['DB_PASSWORD']);
define('DB_HOST', '127.0.0.1');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');
foreach (['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'] as $tbv_key) define($tbv_key, $tbv_secrets[$tbv_key]);
unset($tbv_secrets, $tbv_key);

$table_prefix = 'wp_';

// The public tunnel terminates TLS; only trust the forwarded scheme from it.
define('TBV_STAGING_PUBLIC_ORIGIN', 'https://staging.example.invalid');
if (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') $_SERVER['HTTPS'] = 'on';
// Loopback requests (local QA on this machine) use the loopback origin.
$tbv_loopback = in_array($_SERVER['HTTP_HOST'] ?? '', ['127.0.0.1:8088', 'localhost:8088'], true) && in_array($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '', ['', '127.0.0.1'], true);
$tbv_origin = $tbv_loopback ? 'http://' . $_SERVER['HTTP_HOST'] : TBV_STAGING_PUBLIC_ORIGIN;
define('WP_HOME', $tbv_origin);
define('WP_SITEURL', $tbv_origin);
define('FORCE_SSL_ADMIN', !$tbv_loopback);
unset($tbv_loopback, $tbv_origin);

define('WP_ENVIRONMENT_TYPE', 'staging');
define('TBV_STAGING_PREVIEW', true);
define('TBV_STAGING_COMMERCE_TEST', true);
define('DISABLE_WP_CRON', true);
define('AUTOMATIC_UPDATER_DISABLED', true);
define('WP_HTTP_BLOCK_EXTERNAL', true);
define('DISALLOW_FILE_EDIT', true);
define('DISALLOW_FILE_MODS', true);
define('WP_MEMORY_LIMIT', '512M');
define('WP_DEBUG', true);
define('WP_DEBUG_DISPLAY', false);
define('WP_DEBUG_LOG', dirname(__DIR__) . '/logs/wp-debug.log');

if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');
require_once ABSPATH . 'wp-settings.php';
