<?php
defined('ABSPATH') || exit;

// This is an isolated staging review, never a live commerce integration.
function tbv_staging_preview_enabled() {
    return defined('TBV_STAGING_PREVIEW') && TBV_STAGING_PREVIEW === true
        && function_exists('wp_get_environment_type')
        && in_array(wp_get_environment_type(), ['local', 'staging'], true)
        && defined('DISABLE_WP_CRON') && DISABLE_WP_CRON === true
        && defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL === true;
}
add_action('admin_notices', function () {
    if (!tbv_staging_preview_enabled()) echo '<div class="notice notice-error"><p>10BottleValue staging preview is disabled. Use an isolated staging installation and configure TBV_STAGING_PREVIEW.</p></div>';
    elseif (!function_exists('wc_get_product') || !function_exists('tbv_public_catalog_response')) echo '<div class="notice notice-error"><p>10BottleValue staging preview requires WooCommerce and the public Woo catalog plugin.</p></div>';
});
// Store API dispatch does not run template_redirect. Block every REST call except
// the review catalog and cookie-session cart routes, including checkout.
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (!tbv_staging_preview_enabled()) return new WP_Error('tbv_preview_disabled', 'Staging preview is disabled.', ['status' => 503]);
    $route = rtrim($request->get_route(), '/');
    $method = strtoupper($request->get_method());
    $read = $method === 'GET' && in_array($route, ['/wc/store/v1/cart', '/tbv-catalog/v1/products'], true);
    $write = $method === 'POST' && in_array($route, ['/wc/store/v1/cart/add-item', '/wc/store/v1/cart/update-item', '/wc/store/v1/cart/remove-item'], true);
    return ($read || $write) ? $result : new WP_Error('tbv_preview_blocked', 'This action is unavailable in the staging review.', ['status' => 403]);
}, 0, 3);
add_action('init', function () {
    if (isset($_GET['wc-ajax'])) wp_die('WooCommerce AJAX is unavailable in this preview.', 'Staging preview', ['response' => 403]);
}, 0);
add_filter('pre_wp_mail', '__return_false', PHP_INT_MAX);
add_filter('woocommerce_payment_gateways', '__return_empty_array', PHP_INT_MAX);
add_filter('woocommerce_available_payment_gateways', '__return_empty_array', PHP_INT_MAX);
add_filter('woocommerce_valid_order_statuses_for_payment', '__return_empty_array', PHP_INT_MAX);
// The review catalog excludes password-protected products. Also enforce that
// boundary when a visitor supplies a WooCommerce product ID directly to cart.
function tbv_react_proof_cart_product_is_public($product) {
    if (!function_exists('tbv_public_catalog_unprotected') || !is_a($product, 'WC_Product')) return false;
    if (!tbv_public_catalog_unprotected($product)) return false;
    $parent_id = $product->get_parent_id();
    if (!$parent_id) return true;
    $parent = wc_get_product($parent_id);
    return $parent && tbv_public_catalog_unprotected($parent);
}
add_filter('woocommerce_is_purchasable', function ($purchasable, $product) {
    return $purchasable && tbv_react_proof_cart_product_is_public($product);
}, PHP_INT_MAX, 2);
add_filter('woocommerce_variation_is_purchasable', function ($purchasable, $product) {
    return $purchasable && tbv_react_proof_cart_product_is_public($product);
}, PHP_INT_MAX, 2);
add_action('wp', function () {
    remove_action('woocommerce_proceed_to_checkout', 'woocommerce_button_proceed_to_checkout', 20);
    add_action('woocommerce_proceed_to_checkout', function () { echo '<p>Checkout is unavailable in this WordPress preview.</p>'; }, 20);
});
add_action('template_redirect', function () {
    if (!tbv_staging_preview_enabled()) wp_die('Staging preview is disabled.', 'Staging preview', ['response' => 503]);
    $req_path = (string)wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $site_path = rtrim((string)wp_parse_url(home_url('/'), PHP_URL_PATH), '/');
    if ($site_path !== '' && ($req_path === $site_path || strpos($req_path, $site_path . '/') === 0)) $req_path = substr($req_path, strlen($site_path)) ?: '/';
    $path = strtolower(trim(rawurldecode($req_path), '/'));
    if (preg_match('#^(?:checkout|my-account|account)(?:/|$)#D', $path) || isset($_GET['order-pay']) || isset($_GET['wc-api'])) wp_die('Checkout and accounts are unavailable in this preview.', 'Staging preview', ['response' => 403]);
    $cart_form = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && in_array($req_path, ['/cart', '/cart/'], true) && str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/x-www-form-urlencoded');
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true) && !$cart_form) wp_die('Only review cart changes are available in this preview.', 'Staging preview', ['response' => 403]);
    $cart_api = esc_url_raw(rest_url('wc/store/v1/cart'));
    $native_cart = esc_url_raw(function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/'));
    header("Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src " . $cart_api . ' ' . trailingslashit($cart_api) . ' ' . $native_cart . "; frame-src 'none'; worker-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'");
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
}, 0);
add_action('after_setup_theme', function () { add_theme_support('woocommerce'); add_theme_support('title-tag'); });
remove_action('wp_head', 'print_emoji_detection_script', 7);

function tbv_react_proof_image_exists($path) {
    if (is_file(get_template_directory() . '/public/' . $path)) return true;
    if (!defined('TBV_ISOLATED_REVIEW') || TBV_ISOLATED_REVIEW !== true) return false;
    static $manifest = null;
    if ($manifest === null) {
        $data = json_decode((string)@file_get_contents(get_template_directory() . '/preview-public-image-manifest.json'), true);
        $manifest = is_array($data) ? array_fill_keys(array_filter($data, 'is_string'), true) : [];
    }
    return isset($manifest[$path]);
}

/** Isolate only verified image mismatches in this disposable snapshot. */
function tbv_react_proof_pending_image($id, $name, $dose, $warehouse) {
    return (strtolower(trim($name)) === 'tesamorelin' && strtolower(preg_replace('/\s+/', '', $dose)) === '20mg' && strtolower(trim($warehouse)) === 'us')
        || (strtolower(trim($name)) === 'kpv' && strtolower(preg_replace('/\s+/', '', $dose)) === '5mg' && strtolower(trim($warehouse)) === 'us')
        || (strtolower(trim($name)) === 'mots-c' && strtolower(preg_replace('/\s+/', '', $dose)) === '20mg' && strtolower(trim($warehouse)) === 'us');
}

/** Use only the selected variation's validated local image in the local cart. */
add_filter('woocommerce_cart_item_thumbnail', function ($thumbnail, $cart_item) {
    $product = $cart_item['data'] ?? null;
    if (!$product || !is_a($product, 'WC_Product')) return $thumbnail;
    foreach (tbv_react_proof_woo_catalog() ?: [] as $offer) {
        if ((int)$offer['wooVariationId'] === (int)$product->get_id() && !empty($offer['imagePending'])) {
            return '<span class="tbv-image-pending" role="img" aria-label="Product image pending">Image pending</span>';
        }
    }
    $image = (string)$product->get_meta('_tbv_source_image');
    if ($image === '') $image = (string)$product->get_meta('_tbv_vial_image');
    if ($image === '' && $product->get_parent_id()) {
        $parent = wc_get_product($product->get_parent_id());
        if ($parent) $image = (string)($parent->get_meta('_tbv_source_image') ?: $parent->get_meta('_tbv_vial_image'));
    }
    $image = ltrim((string)wp_parse_url($image, PHP_URL_PATH), '/');
    if (!preg_match('#^(?:vials-c|images)/[a-zA-Z0-9/_-]+\.(?:png|webp|jpe?g|svg)$#D', $image) || !tbv_react_proof_image_exists($image)) return '';
    return '<img src="' . esc_url(trailingslashit(get_template_directory_uri()) . 'public/' . $image) . '" alt="' . esc_attr($product->get_name()) . '" width="76" height="96">';
}, 10, 2);

/** Restore selected public compound names only while rendering the cart.
 * Do not change the Woo product or historical order records. */
add_filter('woocommerce_cart_item_name', function ($rendered, $cart_item) {
    $product = $cart_item['data'] ?? null;
    if (!is_a($product, 'WC_Product')) return $rendered;
    $parent = $product->get_parent_id() ? wc_get_product($product->get_parent_id()) : $product;
    if (!$parent) return $rendered;
    $raw = trim((string)$parent->get_name());
    $labels = [
        'glp-1-s' => 'Semaglutide', 'glp sg-1' => 'Semaglutide',
        'tirzepatide / glp-2' => 'Tirzepatide', 'glp-2-t' => 'Tirzepatide', 'glp tz-2' => 'Tirzepatide',
        'retatrutide / glp-3' => 'Retatrutide', 'glp-3-r' => 'Retatrutide', 'glp rt-3' => 'Retatrutide',
        'cagrilintide + glp-1-s' => 'Cagrilintide + Semaglutide', 'cagrilintide + glp sg-1' => 'Cagrilintide + Semaglutide',
    ];
    $label = $labels[strtolower($raw)] ?? null;
    if (!$label || html_entity_decode(trim(wp_strip_all_tags((string)$rendered)), ENT_QUOTES | ENT_HTML5, 'UTF-8') !== $raw) return $rendered;
    if (strpos((string)$rendered, '<') === false) return esc_html($label);
    if (preg_match('#^<a href="([^"]*)">[^<]*</a>$#D', (string)$rendered, $match)) return '<a href="' . esc_url($match[1]) . '">' . esc_html($label) . '</a>';
    return $rendered;
}, 10, 2);

/** Keep cart product links inside the proof storefront and preserve the selected offer. */
add_filter('woocommerce_cart_item_permalink', function ($permalink, $cart_item) {
    $variation_id = (int)($cart_item['variation_id'] ?? 0);
    $catalog = tbv_react_proof_woo_catalog();
    if (!is_array($catalog) || !$variation_id) return home_url('/shop');
    foreach ($catalog as $offer) {
        if ((int)$offer['wooVariationId'] !== $variation_id) continue;
        $name = strtolower(trim($offer['name']));
        $canonical = [
            'glp-1-s' => 'semaglutide', 'glp sg-1' => 'semaglutide',
            'tirzepatide / glp-2' => 'tirzepatide', 'glp-2-t' => 'tirzepatide', 'glp tz-2' => 'tirzepatide',
            'retatrutide / glp-3' => 'retatrutide', 'glp-3-r' => 'retatrutide', 'glp rt-3' => 'retatrutide',
            'cagrilintide + glp-1-s' => 'cagrilintide + semaglutide', 'cagrilintide + glp sg-1' => 'cagrilintide + semaglutide',
        ];
        $name = $canonical[$name] ?? $name;
        $slug = preg_replace('/[^a-z0-9]+/', '-', $name) . '-' . preg_replace('/\s+/', '', strtolower(trim($offer['dose'])));
        $params = [];
        if ($offer['warehouse'] === 'us') $params['warehouse'] = 'us';
        if ((int)$offer['pack'] !== 10) $params['pack'] = (int)$offer['pack'];
        if ($offer['noteLabel'] !== '') $params['option'] = $offer['noteLabel'];
        else $params['tbv_option'] = 'empty';
        $url = home_url('/' . $slug);
        return $params ? add_query_arg($params, $url) : $url;
    }
    return home_url('/shop');
}, 10, 2);

/** Map only the separate plugin's allowlisted public values to the original UI's shape. */
function tbv_react_proof_woo_catalog() {
    if (!function_exists('tbv_public_catalog_response') || !function_exists('wc_get_product')) return null;
    // The inherited presentation renders USD with two decimal places. Do not
    // show a different Woo currency or precision as if it were USD.
    if (!function_exists('wc_get_price_decimals') || wc_get_price_decimals() !== 2) return null;
    $out = [];
    for ($page = 1; $page <= 1000; $page++) {
        $request = new WP_REST_Request('GET', '/tbv-catalog/v1/products');
        $request->set_param('page', $page);
        $request->set_param('per_page', 100);
        $response = tbv_public_catalog_response($request);
        if (is_wp_error($response)) return null;
        $body = $response->get_data();
        if (!is_array($body) || ($body['currency'] ?? null) !== 'USD' || !isset($body['products']) || !is_array($body['products'])) return null;
        foreach ($body['products'] as $product) {
            foreach ($product['offers'] as $offer) {
                if ($offer['price'] === null || !in_array((int)$offer['pack'], [1, 5, 10], true)) continue;
                if (!is_string($offer['price']) || !preg_match('/^(?:0|[1-9][0-9]{0,12})(?:\.[0-9]{1,2})?$/D', $offer['price'])) return null;
                $variation = wc_get_product((int)$offer['variation_id']);
                if (!$variation) continue;
                $img = (string)$variation->get_meta('_tbv_source_image');
                if (!$img) $img = (string)$variation->get_meta('_tbv_vial_image');
                $img = ltrim((string)wp_parse_url($img, PHP_URL_PATH), '/');
                if (!preg_match('#^(?:vials-c|images)/[a-zA-Z0-9/_-]+\.(?:png|webp|jpe?g|svg)$#D', $img) || !tbv_react_proof_image_exists($img)) $img = '';
                $pending = tbv_react_proof_pending_image($offer['variation_id'], $product['name'], $offer['dose'], $offer['warehouse']);
                if ($pending) $img = '';
                $out[] = [
                    'imagePending' => $pending,
                    'wooVariationId' => (int)$offer['variation_id'], 'wooProductId' => (int)$product['product_id'],
                    'name' => (string)$product['name'], 'dose' => (string)$offer['dose'],
                    'noteLabel' => (string)$offer['formulation'], 'warehouse' => (string)$offer['warehouse'],
                    'pack' => (int)$offer['pack'], 'price' => (float)$offer['price'],
                    'outOfStock' => !$offer['purchasable'] || $offer['stock_status'] === 'outofstock',
                    'image' => $img ? trailingslashit(get_template_directory_uri()) . 'public/' . $img : '',
                ];
            }
        }
        if (empty($body['has_more'])) return $out;
    }
    return null;
}

/** Explicit local-proof routes. Native WooCommerce/payment/admin paths stay native. */
function tbv_react_proof_requested_path() {
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
    $rawPath = (string)wp_parse_url($uri, PHP_URL_PATH);
    if (preg_match('/%(?:2f|5c)/i', $rawPath)) return null;
    $base = (string)wp_parse_url(home_url('/'), PHP_URL_PATH);
    $base = rtrim($base, '/');
    if ($base !== '' && $rawPath !== $base && strpos($rawPath, $base . '/') !== 0) return null;
    $relative = $base === '' ? $rawPath : substr($rawPath, strlen($base));
    $relative = trim(rawurldecode($relative), '/');
    if (strpos($relative, '/') !== false || strpos($relative, '\\') !== false || strpos($relative, '..') !== false) return null;
    return strtolower($relative);
}
function tbv_react_proof_recognized_route() {
    static $cached = null;
    if ($cached !== null) return $cached;
    $cached = false;
    foreach (['rest_route','wc-ajax','add-to-cart','payment','order-pay','key','wc-api'] as $reserved) if (isset($_GET[$reserved])) return false;
    $path = tbv_react_proof_requested_path();
    if ($path === null) return false;
    $reserved = ['cart','checkout','account','my-account','wp-admin','wp-json','wc-api','wp-login.php','wp-cron.php'];
    if (in_array($path, $reserved, true)) return false;
    $pages = ['', 'shop', 'us-warehouse', 'shipping-prices', 'affiliate', 'about', 'faq', 'contact', 'track-order', 'terms-and-conditions', 'privacy-policy', 'shipping-policy', 'refund-policy'];
    if (in_array($path, $pages, true)) return $cached = true;
    $catalog = tbv_react_proof_woo_catalog();
    if (!is_array($catalog)) return false;
    $aliases = [
        'semaglutide' => ['Semaglutide', 'GLP-1-S', 'GLP SG-1'],
        'tirzepatide' => ['Tirzepatide', 'Tirzepatide / GLP-2', 'GLP-2-T', 'GLP TZ-2'],
        'tirzepatide / glp-2' => ['Tirzepatide', 'Tirzepatide / GLP-2', 'GLP-2-T', 'GLP TZ-2'],
        'retatrutide' => ['Retatrutide', 'Retatrutide / GLP-3', 'GLP-3-R', 'GLP RT-3'],
        'retatrutide / glp-3' => ['Retatrutide', 'Retatrutide / GLP-3', 'GLP-3-R', 'GLP RT-3'],
        'cagrilintide + semaglutide' => ['Cagrilintide + Semaglutide', 'Cagrilintide + GLP-1-S', 'Cagrilintide + GLP SG-1'],
    ];
    // A catalog may itself still use any historical label. Expand the lookup
    // for every alias so the restored compound URL and historical URLs work
    // regardless of the stored spelling. Keep the original identity below so
    // distinct matching products still fail closed as ambiguous.
    $aliasesByName = [];
    foreach ($aliases as $group) {
        foreach ($group as $alias) $aliasesByName[strtolower(trim($alias))] = $group;
    }
    $slugs = [];
    foreach ($catalog as $item) {
        $name = strtolower(trim($item['name']));
        $dose = strtolower(trim($item['dose']));
        $identity = $name . '|' . preg_replace('/\s+/', '', $dose);
        foreach ($aliasesByName[$name] ?? [$name] as $display) {
            $slug = preg_replace('/[^a-z0-9]+/', '-', strtolower($display)) . '-' . preg_replace('/\s+/', '', $dose);
            if (isset($slugs[$slug]) && $slugs[$slug] !== $identity) $slugs[$slug] = false;
            elseif (!array_key_exists($slug, $slugs)) $slugs[$slug] = $identity;
        }
    }
    return $cached = isset($slugs[$path]) && $slugs[$path] !== false;
}
add_filter('redirect_canonical', function ($redirect) { return tbv_react_proof_recognized_route() ? false : $redirect; }, 10, 1);
add_action('template_redirect', function () {
    if (!tbv_react_proof_recognized_route()) return;
    global $wp_query;
    if ($wp_query->is_404()) { $wp_query->is_404 = false; status_header(200); }
}, 1);
add_filter('template_include', function ($template) {
    return tbv_react_proof_recognized_route() ? get_template_directory() . '/front-page.php' : $template;
}, PHP_INT_MAX);
