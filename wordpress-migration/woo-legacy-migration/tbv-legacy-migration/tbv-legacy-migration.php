<?php
/**
 * Plugin Name: 10BottleValue legacy data migration
 * Description: WP-CLI importer for the legacy Supabase storefront export (customers, orders, store credit, affiliates). Imports are idempotent, never send mail, never take payments and never change stock. Admin-only metadata; no customer-facing UI.
 * Version: 0.1.0
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce
 */

defined('ABSPATH') || exit;

define('TBV_LM_VERSION', '0.1.0');
define('TBV_LM_SCHEMA_VERSION', '1');
define('TBV_LM_CREATED_VIA', 'tbv-legacy-migration');
define('TBV_LM_DIR', __DIR__);

require_once __DIR__ . '/includes/class-util.php';
require_once __DIR__ . '/includes/class-schema.php';
require_once __DIR__ . '/includes/class-status-map.php';
require_once __DIR__ . '/includes/class-export.php';
require_once __DIR__ . '/includes/class-catalog.php';
require_once __DIR__ . '/includes/class-importer.php';
require_once __DIR__ . '/includes/class-reconciler.php';
require_once __DIR__ . '/includes/class-guards.php';

register_activation_hook(__FILE__, ['TBV_LM_Schema', 'install']);

TBV_LM_Guards::register();

if (defined('WP_CLI') && WP_CLI) {
    require_once __DIR__ . '/includes/class-cli.php';
    WP_CLI::add_command('tbv-migrate', 'TBV_LM_CLI');
}
