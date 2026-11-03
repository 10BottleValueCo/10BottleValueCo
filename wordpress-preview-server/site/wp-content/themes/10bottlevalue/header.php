<?php defined('ABSPATH') || exit; ?><!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" type="image/svg+xml" href="<?php echo esc_url(tbv_asset('images/favicon.svg')); ?>"><?php wp_head(); ?></head>
<body <?php body_class('tbv-app-shell ' . (is_front_page() ? 'tbv-app-shell--home' : (is_page('faq') ? 'tbv-app-shell--faq' : 'tbv-app-shell--catalog-background'))); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="tbv-announcement"><span>For laboratory research use only. Not for human or animal use.</span><i>|</i><span>Worldwide & US warehouse</span><i>|</i><span>Shipping configuration pending migration</span></div>
<header class="tbv-header" <?php if(is_front_page()) echo 'data-home-header="true"'; ?>>
<div class="tbv-header__inner">
<a class="tbv-brand" href="<?php echo esc_url(home_url('/')); ?>"><img src="<?php echo esc_url(tbv_asset('images/header-vial-264.webp')); ?>" alt=""><span>10BottleValueCo</span></a>
<nav class="tbv-nav" aria-label="Main navigation"><?php tbv_navigation(); ?></nav>
<div class="tbv-header__actions"><a class="tbv-account" href="<?php echo esc_url(tbv_shop_url()); ?>" aria-label="Browse catalog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg></a><a class="tbv-cart-pill" href="<?php echo esc_url(function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/')); ?>">Cart<span data-cart-count><?php $count = function_exists('WC') && WC()->cart ? WC()->cart->get_cart_contents_count() : 0; echo $count ? ' (' . esc_html($count) . ')' : ''; ?></span></a><button class="tbv-menu-trigger" type="button" aria-label="Open menu" aria-controls="tbv-mobile-menu" aria-expanded="false"><svg viewBox="0 0 24 24" width="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>
</div></header>
<dialog id="tbv-mobile-menu" class="tbv-mobile-menu"><div><strong>Menu</strong><button type="button" aria-label="Close menu" data-close-menu>×</button></div><nav aria-label="Mobile navigation"><?php tbv_navigation(); ?><button type="button" class="tbv-menu-account" disabled title="Accounts are not available in the preview">My Account</button><a href="<?php echo esc_url(function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/')); ?>">Cart<?php $count = function_exists('WC') && WC()->cart ? WC()->cart->get_cart_contents_count() : 0; echo $count ? ' (' . esc_html($count) . ')' : ''; ?></a></nav></dialog>
