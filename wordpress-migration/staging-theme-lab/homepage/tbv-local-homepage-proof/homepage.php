<?php
defined('ABSPATH') || exit;
if (!tbv_local_homepage_proof_matches_request()) { status_header(403); exit; }
$assets = tbv_local_homepage_proof_assets();
$catalog = tbv_react_proof_woo_catalog();
$base = trailingslashit(get_template_directory_uri()) . 'public/';
?><!doctype html>
<html <?php language_attributes(); ?>><head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<base href="<?php echo esc_url($base); ?>">
<?php wp_head(); ?>
<link rel="stylesheet" href="<?php echo esc_url($base . $assets['style']); ?>">
<script>window.TBV_SITE_BASE = <?php echo wp_json_encode(home_url('/'), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>; window.TBV_CART_API = <?php echo wp_json_encode(rest_url('wc/store/v1/cart'), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>; window.TBV_WOO_CATALOG = <?php echo wp_json_encode($catalog ?: [], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
<script type="module" src="<?php echo esc_url($base . $assets['script']); ?>"></script>
</head><body <?php body_class(); ?>><?php wp_body_open(); ?>
<div role="note" style="position:relative;z-index:2147483646;padding:7px;background:#ffe486;color:#111;text-align:center;font:600 12px Arial,sans-serif">WORDPRESS PREVIEW · No orders or payments</div>
<?php if ($catalog === null): ?><p role="alert" style="position:relative;z-index:2147483646;background:#fff3dc;color:#111;padding:10px">Preview catalog unavailable or uses unsupported currency or precision; no product data loaded.</p><?php endif; ?>
<div id="root" data-tbv-homepage-plugin="staging-review"></div><?php wp_footer(); ?></body></html>
