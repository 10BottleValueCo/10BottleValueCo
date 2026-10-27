<?php
/**
 * Plugin Name: 10BottleValue Public WooCommerce Catalog
 * Description: Read-only, allowlisted WooCommerce catalog data for storefront integration.
 * Version: 0.1.0
 * Requires Plugins: woocommerce
 * Requires PHP: 7.4
 */

defined('ABSPATH') || exit;

add_action('rest_api_init', function () {
    register_rest_route('tbv-catalog/v1', '/products', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => 'tbv_public_catalog_response',
        'args' => [
            'page' => [
                'default' => 1,
                'validate_callback' => 'tbv_public_catalog_validate_page',
                'sanitize_callback' => 'absint',
            ],
            'per_page' => [
                'default' => 50,
                'validate_callback' => 'tbv_public_catalog_validate_page_size',
                'sanitize_callback' => 'absint',
            ],
        ],
    ]);
});

function tbv_public_catalog_is_integer_in_range($value, $min, $max) {
    if (!is_int($value) && !(is_string($value) && preg_match('/^[0-9]+$/D', $value))) return false;
    $number = (int)$value;
    return $number >= $min && $number <= $max;
}
function tbv_public_catalog_validate_page($value) { return tbv_public_catalog_is_integer_in_range($value, 1, 100000); }
function tbv_public_catalog_validate_page_size($value) { return tbv_public_catalog_is_integer_in_range($value, 1, 100); }

function tbv_public_catalog_clean_text($value) {
    if (!is_scalar($value)) return '';
    $value = sanitize_text_field((string)$value);
    return strlen($value) <= 160 ? $value : '';
}

/** Read configured metadata or matching public variation attribute, without guesses. */
function tbv_public_catalog_field($product, $parent, $meta_key, $attribute_keys) {
    $value = $product->get_meta($meta_key, true, 'edit');
    if (is_scalar($value) && trim((string)$value) !== '') return tbv_public_catalog_clean_text($value);
    foreach ($attribute_keys as $key) {
        $value = $product->get_attribute($key);
        if (is_scalar($value) && trim((string)$value) !== '') return tbv_public_catalog_clean_text($value);
    }
    $value = $parent->get_meta($meta_key, true, 'edit');
    return is_scalar($value) && trim((string)$value) !== '' ? tbv_public_catalog_clean_text($value) : '';
}

/** The public endpoint never exposes password-protected WordPress products,
 * regardless of the current visitor's password cookie. */
function tbv_public_catalog_unprotected($product) {
    if (!is_a($product, 'WC_Product')) return false;
    $post = get_post($product->get_id());
    return $post instanceof WP_Post && (string)$post->post_password === '';
}

function tbv_public_catalog_offer($item, $parent) {
    if (!is_a($item, 'WC_Product') || $item->get_status('edit') !== 'publish' || !tbv_public_catalog_unprotected($parent) || !tbv_public_catalog_unprotected($item)) return null;
    $warehouse = strtolower(tbv_public_catalog_field($item, $parent, '_tbv_warehouse', ['warehouse', 'pa_warehouse']));
    $warehouse_aliases = ['us' => 'us', 'usa' => 'us', 'us-warehouse' => 'us', 'us warehouse' => 'us', 'worldwide' => 'worldwide'];
    if (!isset($warehouse_aliases[$warehouse])) return null;
    $dose = tbv_public_catalog_field($item, $parent, '_tbv_dose', ['dosage', 'dose', 'pa_dosage']);
    $pack = tbv_public_catalog_field($item, $parent, '_tbv_pack_size', ['pack-size', 'pack', 'pa_pack-size']);
    if ($dose === '' || !preg_match('/^[1-9][0-9]{0,5}$/D', $pack)) return null;
    $formulation = tbv_public_catalog_field($item, $parent, '_tbv_note_label', ['formulation', 'pa_formulation']);
    $price = (string)$item->get_price('view');
    if ($price === '') $price = null;
    elseif (!preg_match('/^[0-9]+(?:\.[0-9]+)?$/D', $price)) return null;
    $stock = $item->get_stock_status('view');
    if (!in_array($stock, ['instock', 'outofstock', 'onbackorder'], true)) return null;
    return [
        'variation_id' => (int)$item->get_id(),
        'warehouse' => $warehouse_aliases[$warehouse],
        'dose' => $dose,
        'pack' => (int)$pack,
        'formulation' => $formulation,
        'price' => $price,
        'stock_status' => $stock,
        'purchasable' => (bool)$item->is_purchasable(),
    ];
}

function tbv_public_catalog_response($request) {
    if (!function_exists('wc_get_products') || !class_exists('WC_Product')) {
        return new WP_Error('woocommerce_unavailable', 'WooCommerce is unavailable.', ['status' => 503]);
    }
    $page = (int)$request->get_param('page');
    $per_page = (int)$request->get_param('per_page');
    // Defense in depth for callers that bypass the REST parameter validators.
    if (!tbv_public_catalog_validate_page($page) || !tbv_public_catalog_validate_page_size($per_page)) {
        return new WP_Error('invalid_pagination', 'Invalid catalog pagination.', ['status' => 400]);
    }
    $query = wc_get_products([
        'status' => 'publish', 'type' => ['simple', 'variable'],
        'limit' => $per_page, 'page' => $page, 'paginate' => true,
        'orderby' => 'ID', 'order' => 'ASC',
    ]);
    $products = [];
    foreach ($query->products as $product) {
        if (!is_a($product, 'WC_Product') || $product->get_status('edit') !== 'publish' || !tbv_public_catalog_unprotected($product)) continue;
        if (!in_array($product->get_catalog_visibility('edit'), ['visible', 'catalog', 'search'], true) || !$product->is_visible()) continue;
        $items = $product->is_type('variable') ? array_map('wc_get_product', $product->get_children()) : [$product];
        $offers = [];
        foreach ($items as $item) {
            $offer = tbv_public_catalog_offer($item, $product);
            if ($offer !== null) $offers[] = $offer;
        }
        if (!$offers) continue;
        $name = tbv_public_catalog_clean_text($product->get_name('view'));
        if ($name === '') continue;
        $products[] = ['product_id' => (int)$product->get_id(), 'name' => $name, 'offers' => $offers];
    }
    $response = rest_ensure_response([
        'currency' => get_woocommerce_currency(),
        'page' => $page,
        'has_more' => $page < (int)$query->max_num_pages,
        'products' => $products,
    ]);
    $response->header('Cache-Control', 'private, no-store');
    $response->header('X-Content-Type-Options', 'nosniff');
    return $response;
}
