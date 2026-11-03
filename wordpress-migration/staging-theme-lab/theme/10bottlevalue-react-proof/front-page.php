<?php
defined('ABSPATH') || exit;
$catalog = tbv_react_proof_woo_catalog();
$base = trailingslashit(get_template_directory_uri()) . 'public/';
?><!doctype html>
<html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="<?php echo esc_url($base); ?>">
<?php wp_head(); ?>
<style>html,body,#root{min-height:100%;margin:0;background:#111}</style>
<link rel="stylesheet" href="<?php echo esc_url($base . 'assets/index-CO1GC1yX.css'); ?>">
<script>window.TBV_SITE_BASE = <?php echo wp_json_encode(home_url("/"), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>; window.TBV_CART_API = <?php echo wp_json_encode(rest_url("wc/store/v1/cart"), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>; window.TBV_WOO_CATALOG = <?php echo wp_json_encode($catalog ?: [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
<?php if (tbv_commerce_enabled()): ?><script>window.TBV_COMMERCE = <?php echo wp_json_encode(tbv_react_proof_commerce_config(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script><?php endif; ?>
<script type="module" src="<?php echo esc_url($base . 'assets/index-BiJmecvp.js'); ?>"></script>
</head><body <?php body_class(); ?>><?php wp_body_open(); ?>
<?php if (tbv_store_mode() === 'preview'): ?><div role="note" style="position:relative;z-index:2147483646;padding:7px;background:#ffe486;color:#111;text-align:center;font:600 12px Arial,sans-serif">WORDPRESS PREVIEW · No orders or payments</div><?php endif; ?>
<?php if ($catalog === null): ?><p role="alert" style="position:relative;z-index:2147483646;background:#fff3dc;color:#111;padding:10px">Preview catalog unavailable or uses unsupported currency or precision; no product data loaded.</p><?php endif; ?>
<div id="root"></div><?php wp_footer(); ?></body></html>
