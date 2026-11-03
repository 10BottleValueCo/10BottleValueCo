<?php
/**
 * Plugin Name: 10BottleValue Staging Homepage Review
 * Description: Staging-only homepage adapter for the 10BottleValue theme and public WooCommerce catalog plugin.
 * Version: 0.2.0
 * Requires PHP: 8.1
 * Requires Plugins: woocommerce, tbv-public-woo-catalog
 */
defined('ABSPATH') || exit;

/** Return verified asset paths. The manifest is deliberately explicit: a stale
 * build must not quietly serve an arbitrary old hash from the theme. */
function tbv_local_homepage_proof_assets() {
    $file = __DIR__ . '/assets.json';
    $info = is_readable($file) ? json_decode((string) file_get_contents($file), true) : null;
    if (!is_array($info)) return null;
    $root = trailingslashit(get_template_directory()) . 'public/';
    $out = [];
    foreach (['script' => 'js', 'style' => 'css'] as $key => $extension) {
        $path = $info[$key] ?? '';
        if (!is_string($path) || !preg_match('#^assets/index-[A-Za-z0-9_-]+\.' . $extension . '$#D', $path) || !is_file($root . $path)) return null;
        $out[$key] = $path;
    }
    return $out;
}
/** Dependency checks are intentionally fail-closed: this staging adapter requires an explicit isolated environment and a matching build. */
function tbv_local_homepage_proof_ready() {
    return function_exists('tbv_store_mode') && tbv_store_mode() !== 'off'
        && get_stylesheet() === '10bottlevalue-react-proof'
        && function_exists('wc_get_product') && function_exists('tbv_public_catalog_response')
        && function_exists('tbv_react_proof_woo_catalog') && function_exists('tbv_react_proof_requested_path')
        && tbv_local_homepage_proof_assets() !== null;
}
function tbv_local_homepage_proof_matches_request() {
    if (!tbv_local_homepage_proof_ready() || !in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) return false;
    // Leave searches, extension actions, attribution and other query-bearing
    // requests to WordPress and the theme, rather than guessing their intent.
    if (!empty($_GET)) return false;
    return tbv_react_proof_requested_path() === '';
}
add_action('after_setup_theme', function () {
    // Add after the theme has registered its catchment filter. Do not replace
    // its cart, checkout, account, API, admin or product routing.
    add_filter('template_include', function ($template) {
        return tbv_local_homepage_proof_matches_request() ? __DIR__ . '/homepage.php' : $template;
    }, PHP_INT_MAX);
}, PHP_INT_MAX);
