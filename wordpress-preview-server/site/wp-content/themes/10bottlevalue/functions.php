<?php
defined('ABSPATH') || exit;

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('woocommerce');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
    register_nav_menus(['primary' => __('Store navigation', 'ten-bottle-value')]);
});
add_action('wp_enqueue_scripts', function () {
    $uri = get_template_directory_uri();
    foreach (['HomePage', 'BpcCatalogCard', 'storefront'] as $sheet) {
        $path = '/assets/css/' . $sheet . '.css';
        wp_enqueue_style('tbv-' . strtolower($sheet), $uri . $path, [], (string) filemtime(get_template_directory() . $path));
    }
    wp_enqueue_script('tbv-storefront', $uri . '/assets/js/storefront.js', ['jquery'], (string) filemtime(get_template_directory() . '/assets/js/storefront.js'), true);
});
add_filter('woocommerce_enqueue_styles', '__return_empty_array');
add_filter('woocommerce_show_page_title', '__return_false');
add_filter('woocommerce_product_tabs', function ($tabs) { unset($tabs['reviews']); return $tabs; });
add_filter('woocommerce_available_variation', function ($data, $parent, $variation) {
    $path = $variation->get_meta('_tbv_vial_image') ?: $parent->get_meta('_tbv_vial_image');
    if ($path) {
        $url = tbv_asset($path);
        $data['image'] = array_merge($data['image'] ?? [], ['src' => $url, 'full_src' => $url, 'thumb_src' => $url, 'gallery_thumbnail_src' => $url, 'srcset' => '', 'sizes' => '', 'alt' => $parent->get_name()]);
    }
    $data['tbv_coa_images'] = array_values(array_filter(array_map('tbv_document_url', (array)($variation->get_meta('_tbv_coa_images') ?: []))));
    $data['tbv_coa_pdf'] = tbv_document_url($variation->get_meta('_tbv_coa_pdf') ?: '');
    return $data;
}, 10, 3);
add_filter('woocommerce_cart_item_thumbnail', function ($thumbnail, $cart_item) {
    $product = $cart_item['data'] ?? null;
    if (!$product || !is_a($product, 'WC_Product')) return $thumbnail;
    // A known source identity mismatch must never inherit another dosage's
    // parent thumbnail. This applies only to the explicitly marked preview asset.
    if (ltrim((string)$product->get_meta('_tbv_vial_image'), '/') !== 'images/vial-image-pending.svg') return $thumbnail;
    return '<img src="' . esc_url(tbv_asset('images/vial-image-pending.svg')) . '" alt="' . esc_attr($product->get_name() . ' — product image pending') . '" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" width="300" height="375">';
}, 10, 2);
remove_action('woocommerce_before_main_content', 'woocommerce_breadcrumb', 20);

function tbv_asset($path) { return get_template_directory_uri() . '/assets/' . ltrim($path, '/'); }
function tbv_document_url($path) {
    $path = ltrim((string)$path, '/');
    if (!$path || strpos($path, '..') !== false || !preg_match('#^[a-zA-Z0-9/_-]+\.(png|webp|jpe?g|pdf)$#i', $path)) return '';
    return is_file(get_template_directory() . '/assets/public/' . $path) ? tbv_asset('public/' . $path) : '';
}
function tbv_shop_url($warehouse = 'worldwide') { return add_query_arg('warehouse', $warehouse, function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/')); }
function tbv_warehouse() { return isset($_GET['warehouse']) && sanitize_key(wp_unslash($_GET['warehouse'])) === 'us' ? 'us' : 'worldwide'; }
function tbv_money($amount) { return function_exists('wc_price') ? wc_price($amount, ['decimals' => floor((float)$amount) == (float)$amount ? 0 : 2]) : '$' . number_format((float)$amount, 2); }
function tbv_navigation() {
    $items = [
        [home_url('/'), 'Home'], [tbv_shop_url(), 'Shop <small>(Worldwide)</small>'],
        [tbv_shop_url('us'), 'Shop <small>(US warehouse)</small>'], [home_url('/shipping-prices/'), 'Shipping <small>Prices</small>'],
        [home_url('/affiliate/'), 'Affiliate'], [home_url('/faq/'), 'FAQ'], [home_url('/contact/'), 'Contact'],
        [home_url('/track-order/'), 'Track <small>Order</small>'],
    ];
    foreach ($items as [$url, $label]) echo '<a href="' . esc_url($url) . '">' . wp_kses_post($label) . '</a>';
}
function tbv_variants($product, $warehouse = null) {
    if (!$product || !is_a($product, 'WC_Product')) return [];
    $variants = [];
    $children = $product->is_type('variable') ? $product->get_children() : [$product->get_id()];
    foreach ($children as $id) {
        $child = wc_get_product($id);
        if (!$child) continue;
        $attrs = $child->get_attributes();
        $location = $child->get_meta('_tbv_warehouse') ?: ($attrs['warehouse'] ?? $attrs['pa_warehouse'] ?? $product->get_meta('_tbv_warehouse') ?: 'worldwide');
        $location = in_array(strtolower($location), ['us', 'usa', 'us-warehouse', 'us warehouse'], true) ? 'us' : 'worldwide';
        if ($warehouse !== null && $warehouse !== $location) continue;
        $dose = $child->get_meta('_tbv_dose') ?: ($attrs['dosage'] ?? $attrs['dose'] ?? $attrs['pa_dosage'] ?? $product->get_meta('_tbv_dose'));
        $pack = (int)($child->get_meta('_tbv_pack_size') ?: ($attrs['pack-size'] ?? $attrs['pack'] ?? $attrs['pa_pack-size'] ?? $product->get_meta('_tbv_pack_size') ?: 10));
        $image = $child->get_meta('_tbv_vial_image') ?: $product->get_meta('_tbv_vial_image');
        $image = $image ? tbv_asset($image) : wp_get_attachment_image_url($child->get_image_id() ?: $product->get_image_id(), 'large');
        $formulation = $child->get_meta('_tbv_note_label') ?: ($attrs['formulation'] ?? $attrs['pa_formulation'] ?? '');
        $variants[] = ['id' => $child->get_id(), 'dose' => $dose ?: 'Standard', 'formulation' => $formulation, 'pack' => $pack, 'warehouse' => $location, 'price' => (float)$child->get_price(), 'available' => $child->is_in_stock() && $child->is_purchasable(), 'attributes' => $attrs, 'image' => $image, 'url' => get_permalink($product->get_id())];
    }
    return $variants;
}
function tbv_initial_variant($variants) {
    foreach ($variants as $variant) {
        $requested = false;
        $matches = true;
        foreach ($variant['attributes'] as $attribute => $value) {
            $key = 'attribute_' . $attribute;
            if (!isset($_GET[$key]) || !is_scalar($_GET[$key])) continue;
            $requested = true;
            if (sanitize_text_field(wp_unslash($_GET[$key])) !== (string)$value) $matches = false;
        }
        if ($requested && $matches) return $variant;
    }
    return $variants[0] ?? null;
}
function tbv_products($warehouse = 'worldwide', $limit = -1) {
    if (!function_exists('wc_get_products')) return [];
    $products = wc_get_products(['status' => 'publish', 'limit' => -1, 'orderby' => 'menu_order', 'order' => 'ASC', 'type' => ['simple', 'variable']]);
    $products = array_values(array_filter($products, function ($product) use ($warehouse) { return count(tbv_variants($product, $warehouse)) > 0; }));
    return $limit > 0 ? array_slice($products, 0, $limit) : $products;
}
function tbv_card($product, $warehouse = 'worldwide') { set_query_var('tbv_card_product', $product); set_query_var('tbv_card_warehouse', $warehouse); get_template_part('template-parts/product-card'); }

// Preview isolation is installed by the runtime as an MU plugin. This theme
// does not replace payment verification or authorize payment/order mutation.
