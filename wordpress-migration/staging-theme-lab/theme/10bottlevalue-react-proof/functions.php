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
// Persistent staging only: native test accounts and a no-payment test checkout.
// Requires an explicit opt-in plus the staging guard's offline test gateway.
function tbv_staging_commerce_test_enabled() {
    return tbv_staging_preview_enabled() && defined('TBV_STAGING_COMMERCE_TEST') && TBV_STAGING_COMMERCE_TEST === true
        && defined('TBV_STAGING_TEST_GATEWAY_ID');
}
add_action('admin_notices', function () {
    if (!tbv_staging_preview_enabled()) echo '<div class="notice notice-error"><p>10BottleValue staging preview is disabled. Use an isolated staging installation and configure TBV_STAGING_PREVIEW.</p></div>';
    elseif (!function_exists('wc_get_product') || !function_exists('tbv_public_catalog_response')) echo '<div class="notice notice-error"><p>10BottleValue staging preview requires WooCommerce and the public Woo catalog plugin.</p></div>';
});
// Store API dispatch does not run template_redirect. Block every REST call except
// the review catalog and cookie-session cart routes, including checkout.
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (!tbv_staging_preview_enabled()) return new WP_Error('tbv_preview_disabled', 'Staging preview is disabled.', ['status' => 503]);
    if (tbv_staging_commerce_test_enabled() && current_user_can('manage_woocommerce')) return $result;
    $route = rtrim($request->get_route(), '/');
    $method = strtoupper($request->get_method());
    $read = $method === 'GET' && in_array($route, ['/wc/store/v1/cart', '/tbv-catalog/v1/products'], true);
    $write = $method === 'POST' && in_array($route, ['/wc/store/v1/cart/add-item', '/wc/store/v1/cart/update-item', '/wc/store/v1/cart/remove-item'], true);
    // The storefront cart page picks the shipping service and destination country
    // and applies WooCommerce coupons from its promo box.
    if (tbv_staging_commerce_test_enabled() && $method === 'POST' && in_array($route, ['/wc/store/v1/cart/select-shipping-rate', '/wc/store/v1/cart/update-customer', '/wc/store/v1/cart/apply-coupon', '/wc/store/v1/cart/remove-coupon'], true)) $write = true;
    // Affiliate codes typed in the promo box (tbv-affiliates-credit's cart extension only)
    // and the affiliate panel / public code lookup.
    if (tbv_staging_commerce_test_enabled() && $method === 'POST' && $route === '/wc/store/v1/cart/extensions' && $request->get_param('namespace') === 'tbv-affiliate') $write = true;
    if (tbv_staging_commerce_test_enabled() && $method === 'GET' && $route === '/tbv-affiliates/v1/account') $read = true;
    // Support inbox: the endpoint itself limits visitors to sending and their own thread.
    if (tbv_staging_commerce_test_enabled() && $method === 'POST' && $route === '/tbv-messages/v1/query') $write = true;
    // The storefront account dashboard reads the customer's own orders and saves the avatar.
    if (tbv_staging_commerce_test_enabled() && is_user_logged_in()) {
        if ($method === 'GET' && $route === '/tbv-account/v1/orders') $read = true;
        if ($method === 'POST' && $route === '/tbv-account/v1/avatar') $write = true;
    }
    return ($read || $write) ? $result : new WP_Error('tbv_preview_blocked', 'This action is unavailable in the staging review.', ['status' => 403]);
}, 0, 3);
add_action('init', function () {
    $test_ajax = ['update_order_review', 'checkout', 'update_shipping_method'];
    if (isset($_GET['wc-ajax']) && tbv_staging_commerce_test_enabled() && in_array($_GET['wc-ajax'], $test_ajax, true)) return;
    if (isset($_GET['wc-ajax'])) wp_die('WooCommerce AJAX is unavailable in this preview.', 'Staging preview', ['response' => 403]);
}, 0);
add_filter('pre_wp_mail', '__return_false', PHP_INT_MAX);
// Only the staging offline test gateway may ever be offered; never a real processor.
add_filter('woocommerce_payment_gateways', function ($gateways) {
    if (!tbv_staging_commerce_test_enabled()) return [];
    $allowed = ['TBV_Staging_Test_Gateway', 'TBV_Store_Credit_Gateway'];
    return array_values(array_filter((array)$gateways, function ($g) use ($allowed) { return in_array(is_object($g) ? get_class($g) : $g, $allowed, true); }));
}, PHP_INT_MAX);
add_filter('woocommerce_available_payment_gateways', function ($gateways) {
    return tbv_staging_commerce_test_enabled() ? array_intersect_key((array)$gateways, [TBV_STAGING_TEST_GATEWAY_ID => true, 'tbv_store_credit' => true]) : [];
}, PHP_INT_MAX);
// Review package: nothing is payable. Commerce test mode keeps Woo's statuses so
// checkout routes through the offline test gateway; order-pay stays route-blocked.
add_filter('woocommerce_valid_order_statuses_for_payment', function ($statuses) {
    return tbv_staging_commerce_test_enabled() ? $statuses : [];
}, PHP_INT_MAX);
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
    if (tbv_staging_commerce_test_enabled()) return;
    remove_action('woocommerce_proceed_to_checkout', 'woocommerce_button_proceed_to_checkout', 20);
    add_action('woocommerce_proceed_to_checkout', function () { echo '<p>Checkout is unavailable in this WordPress preview.</p>'; }, 20);
});
add_action('template_redirect', function () {
    if (!tbv_staging_preview_enabled()) wp_die('Staging preview is disabled.', 'Staging preview', ['response' => 503]);
    $req_path = (string)wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    $site_path = rtrim((string)wp_parse_url(home_url('/'), PHP_URL_PATH), '/');
    if ($site_path !== '' && ($req_path === $site_path || strpos($req_path, $site_path . '/') === 0)) $req_path = substr($req_path, strlen($site_path)) ?: '/';
    $path = strtolower(trim(rawurldecode($req_path), '/'));
    $commerce_test = tbv_staging_commerce_test_enabled();
    if ($commerce_test && preg_match('#^account(?:/|$)#D', $path)) { wp_safe_redirect(wc_get_page_permalink('myaccount')); exit; }
    // As on the live storefront, the cart page is the checkout. Order-received
    // and other checkout endpoints stay native.
    $read_request = in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true) && !isset($_GET['wc-ajax']);
    if ($commerce_test && $read_request && ($path === 'cart/confirmation' || (function_exists('is_checkout') && is_checkout() && !is_wc_endpoint_url()))) { wp_safe_redirect(wc_get_cart_url()); exit; }
    $account_or_checkout = (bool)preg_match('#^(?:checkout|my-account)(?:/|$)#D', $path);
    if (isset($_GET['order-pay']) || isset($_GET['wc-api']) || (!$commerce_test && ($account_or_checkout || preg_match('#^account(?:/|$)#D', $path)))) wp_die('Checkout and accounts are unavailable in this preview.', 'Staging preview', ['response' => 403]);
    $cart_form = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && in_array($req_path, ['/cart', '/cart/'], true) && str_starts_with((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/x-www-form-urlencoded');
    $account_form = $commerce_test && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
        && ($account_or_checkout || in_array($_GET['wc-ajax'] ?? '', ['update_order_review', 'checkout', 'update_shipping_method'], true));
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true) && !$cart_form && !$account_form) wp_die('Only review cart changes are available in this preview.', 'Staging preview', ['response' => 403]);
    $cart_api = esc_url_raw(rest_url('wc/store/v1/cart'));
    $native_cart = esc_url_raw(function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/'));
    header("Content-Security-Policy: default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src " . ($commerce_test ? "'self' " : '') . $cart_api . ' ' . trailingslashit($cart_api) . ' ' . $native_cart . "; frame-src 'none'; worker-src 'none'; object-src 'none'; form-action 'self'; base-uri 'self'");
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
    if ($path === 'cart' && tbv_staging_commerce_test_enabled()) return $cached = true;
    // Signed-in customers get the storefront account dashboard; the sign-in
    // form and every account endpoint stay native WooCommerce pages.
    if ($path === 'my-account' && tbv_staging_commerce_test_enabled() && is_user_logged_in() && !$_GET) return $cached = true;
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
    return tbv_react_proof_recognized_route() || tbv_react_proof_received_order() ? get_template_directory() . '/front-page.php' : $template;
}, PHP_INT_MAX);
/** The signed-in customer's own order on its order-received page (commerce test), or null. */
function tbv_react_proof_received_order() {
    static $order = false;
    if ($order !== false) return $order;
    $order = null;
    if (!tbv_staging_commerce_test_enabled() || !is_user_logged_in() || !function_exists('is_wc_endpoint_url') || !is_wc_endpoint_url('order-received')) return null;
    $candidate = wc_get_order(absint(get_query_var('order-received')));
    $key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
    if ($candidate && $key !== '' && $candidate->key_is_valid($key) && $candidate->get_customer_id() === get_current_user_id()) $order = $candidate;
    return $order;
}

/** Storefront checkout settings for the React cart page (commerce test only). */
function tbv_react_proof_commerce_config() {
    $user = wp_get_current_user();
    return [
        'checkoutEndpoint' => add_query_arg('wc-ajax', 'checkout', home_url('/')),
        'checkoutNonce' => wp_create_nonce('woocommerce-process_checkout'),
        'gatewayId' => TBV_STAGING_TEST_GATEWAY_ID,
        'creditGatewayId' => function_exists('tbv_ac_credit_balance') ? 'tbv_store_credit' : '',
        'affiliateLookupEndpoint' => esc_url_raw(rest_url('tbv-affiliates/v1/account')),
        'accountUrl' => wc_get_page_permalink('myaccount'),
        'user' => $user->exists() ? tbv_react_proof_account_user($user) : null,
        'account' => $user->exists() ? [
            // WooCommerce's own logout endpoint; wp-login.php sits behind the admin edge gate.
            'logoutUrl' => html_entity_decode(wp_nonce_url(wc_get_account_endpoint_url('customer-logout'), 'customer-logout')),
            'editAddressUrl' => wc_get_endpoint_url('edit-address', 'billing', wc_get_page_permalink('myaccount')),
            'editAccountUrl' => wc_get_endpoint_url('edit-account', '', wc_get_page_permalink('myaccount')),
            'ordersEndpoint' => esc_url_raw(rest_url('tbv-account/v1/orders')),
            'avatarEndpoint' => esc_url_raw(rest_url('tbv-account/v1/avatar')),
            'affiliateEndpoint' => esc_url_raw(rest_url('tbv-affiliates/v1/account')),
            'restNonce' => wp_create_nonce('wp_rest'),
        ] : null,
        // Support inbox (live contact_messages): visitors send, shop managers answer.
        'messages' => function_exists('tbv_sa_messages_table') ? ['endpoint' => esc_url_raw(rest_url('tbv-messages/v1/query')), 'nonce' => wp_create_nonce('wp_rest')] : null,
        // The live admin panel, for shop managers only (tbv-storefront-admin).
        'admin' => $user->exists() && current_user_can('manage_woocommerce') && function_exists('tbv_sa_order') ? ['endpoint' => esc_url_raw(rest_url('tbv-admin/v1')), 'nonce' => wp_create_nonce('wp_rest')] : null,
        'receivedOrder' => ($received = tbv_react_proof_received_order()) ? tbv_react_proof_received_order_data($received) : null,
        'countries' => array_map(fn($name) => html_entity_decode($name, ENT_QUOTES, 'UTF-8'), WC()->countries->get_shipping_countries()),
    ];
}
/** Country label without WooCommerce's " (US)" suffix, as the storefront shows it. */
function tbv_react_proof_country_name($label) {
    return trim(preg_replace('/\s*\([^)]*\)\s*$/', '', html_entity_decode((string)$label, ENT_QUOTES, 'UTF-8')));
}
/** The signed-in customer as the storefront account dashboard expects it. */
function tbv_react_proof_account_user($user) {
    $c = new WC_Customer($user->ID);
    $countries = WC()->countries->get_countries();
    $country = $c->get_billing_country();
    return [
        'id' => $user->ID, 'email' => $user->user_email,
        'firstName' => $c->get_billing_first_name() ?: $c->get_first_name(), 'lastName' => $c->get_billing_last_name() ?: $c->get_last_name(),
        'phone' => $c->get_billing_phone(), 'address' => $c->get_billing_address_1(), 'address2' => $c->get_billing_address_2(),
        'city' => $c->get_billing_city(), 'state' => $c->get_billing_state(), 'postalCode' => $c->get_billing_postcode(),
        'country' => $country ? tbv_react_proof_country_name($countries[$country] ?? $country) : '',
        'avatarId' => (string)get_user_meta($user->ID, 'tbv_avatar_id', true),
        'storeCredit' => function_exists('tbv_ac_credit_balance') ? tbv_ac_credit_balance($user->user_email) / 100 : 0,
    ];
}
/** One order in the storefront dashboard's shape (customer's own orders only). */
function tbv_react_proof_account_order($order) {
    $countries = WC()->countries->get_countries();
    $items = [];
    $warehouses = [];
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $dose = $product ? (string)($product->get_meta('_tbv_dose') ?: '') : '';
        $items[] = ['id' => $item->get_id(), 'name' => $product && $product->get_parent_id() ? get_the_title($product->get_parent_id()) : $item->get_name(), 'dose' => $dose, 'quantity' => $item->get_quantity()];
        if (function_exists('tbv_storefront_warehouse')) $warehouses[] = tbv_storefront_warehouse($product);
    }
    $service = '';
    foreach ($order->get_shipping_methods() as $method) $service = (string)$method->get_meta('tbv_service') ?: $service;
    $notes = trim((string)$order->get_customer_note());
    if ($carrier = $order->get_meta('_tbv_carrier_preference')) $notes = trim($notes . "\nCarrier preference: " . $carrier);
    $country = $order->get_billing_country();
    return [
        'id' => (string)$order->get_order_number(),
        'createdAt' => $order->get_date_created() ? $order->get_date_created()->format(DATE_ATOM) : null,
        'paidAt' => $order->get_date_paid() ? $order->get_date_paid()->format(DATE_ATOM) : null,
        'status' => wc_get_order_status_name($order->get_status()),
        'statusKey' => $order->get_status(),
        'sourceId' => (string)$order->get_meta('_tbv_source_order_id'),
        'total' => (float)$order->get_total(),
        'subtotal' => (float)$order->get_subtotal(),
        'shipping' => (float)$order->get_shipping_total(),
        'paymentMethod' => $order->get_payment_method_title(),
        'trackingNumber' => (string)$order->get_meta('_tbv_tracking_number'),
        'trackingNumber2' => (string)$order->get_meta('_tbv_tracking_number_2'),
        'items' => $items,
        'shippingType' => $warehouses && !array_diff($warehouses, ['us']) ? 'us-warehouse' : ($service ?: 'standard'),
        'email' => $order->get_billing_email(), 'firstName' => $order->get_billing_first_name(), 'lastName' => $order->get_billing_last_name(),
        'address' => $order->get_billing_address_1(), 'address2' => $order->get_billing_address_2(), 'city' => $order->get_billing_city(),
        'state' => $order->get_billing_state(), 'postalCode' => $order->get_billing_postcode(),
        'country' => $country ? tbv_react_proof_country_name($countries[$country] ?? $country) : '',
        'phone' => $order->get_billing_phone(), 'taxId' => (string)$order->get_meta('_tbv_tax_id'), 'orderNotes' => $notes,
        'confirmationUrl' => $order->get_checkout_order_received_url(),
    ];
}
/** Order-received data for the storefront confirmation page: line prices and warehouse. */
function tbv_react_proof_received_order_data($order) {
    $data = tbv_react_proof_account_order($order);
    $data['items'] = [];
    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        $qty = max(1, (int)$item->get_quantity());
        $data['items'][] = [
            'name' => $product && $product->get_parent_id() ? get_the_title($product->get_parent_id()) : $item->get_name(),
            'dose' => $product ? (string)$product->get_meta('_tbv_dose') : '',
            'quantity' => $qty,
            'price' => round((float)$item->get_subtotal() / $qty, 2),
            'fromWarehouse' => function_exists('tbv_storefront_warehouse') && tbv_storefront_warehouse($product) === 'us' ? 'us' : null,
        ];
    }
    $data['subtotal'] = (float)$order->get_subtotal();
    $data['shipping'] = (float)$order->get_shipping_total();
    $data['paymentMethodTitle'] = $order->get_payment_method_title();
    return $data;
}
add_action('rest_api_init', function () {
    if (!function_exists('tbv_staging_commerce_test_enabled') || !tbv_staging_commerce_test_enabled()) return;
    $signed_in = fn() => is_user_logged_in();
    register_rest_route('tbv-account/v1', '/orders', ['methods' => 'GET', 'permission_callback' => $signed_in, 'callback' => function ($request) {
        // ?number= looks up one of the customer's own orders (Track Order page): the
        // WooCommerce number, or a migrated order's original INV- number.
        $number = strtoupper(trim((string)$request->get_param('number')));
        if ($number !== '') {
            $plain = ltrim($number, '#');
            $found = ctype_digit($plain) ? wc_get_order((int)$plain) : null;
            if (!$found && preg_match('/^INV-[A-Z0-9]{1,40}$/', $plain)) $found = wc_get_orders(['customer_id' => get_current_user_id(), 'limit' => 1, 'type' => 'shop_order', 'meta_key' => '_tbv_source_order_id', 'meta_value' => $plain])[0] ?? null;
            return $found && $found->get_type() === 'shop_order' && $found->get_customer_id() === get_current_user_id() ? [tbv_react_proof_account_order($found)] : [];
        }
        $orders = wc_get_orders(['customer_id' => get_current_user_id(), 'limit' => 50, 'orderby' => 'date', 'order' => 'DESC', 'type' => 'shop_order']);
        return array_map('tbv_react_proof_account_order', $orders);
    }]);
    register_rest_route('tbv-account/v1', '/avatar', ['methods' => 'POST', 'permission_callback' => $signed_in, 'callback' => function ($request) {
        $id = (string)$request->get_param('avatarId');
        if ($id !== '' && !preg_match('/^[a-z0-9-]{1,64}$/', $id)) return new WP_Error('tbv_avatar_invalid', 'Unknown avatar.', ['status' => 400]);
        update_user_meta(get_current_user_id(), 'tbv_avatar_id', $id);
        return ['avatarId' => $id];
    }]);
});
// Live sign-up card: confirm password, and an optional affiliate code that
// locks the new account to that affiliate (live: affiliateCode/promoLockedAt
// user metadata). Active codes come from the tbv_affiliate_codes option until
// the affiliate program is migrated; unknown codes are rejected as on live.
function tbv_react_proof_registration_code() {
    return strtoupper(trim(sanitize_text_field(wp_unslash($_POST['tbv_registration_code'] ?? ''))));
}
function tbv_react_proof_affiliate_code_active($code) {
    if (function_exists('tbv_ac_active_affiliate')) return $code !== '' && (bool)tbv_ac_active_affiliate($code);
    return $code !== '' && in_array($code, array_map('strtoupper', (array)get_option('tbv_affiliate_codes', [])), true);
}
// Live accepts any password of at least 6 characters: no strength meter or
// "very weak" warning (Ilja, 2026-10-29), same minimum on sign-up, change and reset.
add_action('wp_enqueue_scripts', function () {
    wp_dequeue_script('wc-password-strength-meter');
}, 100);
add_filter('woocommerce_min_password_strength', '__return_zero');
function tbv_react_proof_password_too_short($password) {
    return mb_strlen(wp_unslash((string)$password)) < 6;
}
add_action('woocommerce_save_account_details_errors', function ($errors) {
    $password = (string)($_POST['password_1'] ?? '');
    if ($password !== '' && tbv_react_proof_password_too_short($password)) {
        $errors->add('tbv_password_short', 'Min. 6 characters.');
    }
});
add_action('validate_password_reset', function ($errors) {
    if (isset($_POST['password_1']) && tbv_react_proof_password_too_short($_POST['password_1'])) {
        $errors->add('tbv_password_short', 'Password must be at least 6 characters.');
    }
});
add_filter('woocommerce_process_registration_errors', function ($errors, $username, $password) {
    if ('no' === get_option('woocommerce_registration_generate_password') && tbv_react_proof_password_too_short($password)) {
        $errors->add('tbv_password_short', 'Password must be at least 6 characters.');
    }
    if ('no' === get_option('woocommerce_registration_generate_password') && wp_unslash((string)$password) !== wp_unslash((string)($_POST['password_confirm'] ?? ''))) {
        $errors->add('tbv_password_mismatch', 'Passwords do not match.');
    }
    $code = tbv_react_proof_registration_code();
    if ($code !== '' && !tbv_react_proof_affiliate_code_active($code)) $errors->add('tbv_affiliate_code', 'Invalid affiliate code.');
    return $errors;
}, 10, 3);
add_action('woocommerce_created_customer', function ($customer_id) {
    if (!isset($_POST['register'])) return; // My Account sign-up only, not checkout
    $code = tbv_react_proof_registration_code();
    if (!tbv_react_proof_affiliate_code_active($code)) return;
    update_user_meta($customer_id, 'tbv_affiliate_code', $code);
    update_user_meta($customer_id, 'tbv_promo_locked_at', gmdate('c'));
});
// Return to the cart page after signing in or registering from it.
function tbv_react_proof_cart_return_field() {
    if (tbv_staging_commerce_test_enabled() && ($_GET['tbv_return'] ?? '') === 'cart') echo '<input type="hidden" name="redirect" value="' . esc_url(wc_get_cart_url()) . '">';
}
add_action('woocommerce_login_form_end', 'tbv_react_proof_cart_return_field');
add_action('woocommerce_register_form_end', 'tbv_react_proof_cart_return_field');
add_filter('woocommerce_registration_redirect', function ($redirect) {
    $requested = isset($_POST['redirect']) ? esc_url_raw(wp_unslash($_POST['redirect'])) : '';
    return $requested && wp_validate_redirect($requested, false) ? $requested : $redirect;
});
/** URL of a lazily loaded bundle chunk's stylesheet (e.g. AccountDashboard), or ''. */
function tbv_react_proof_asset_css($chunk) {
    $files = glob(get_template_directory() . '/public/assets/' . $chunk . '-*.css') ?: [];
    return count($files) === 1 ? trailingslashit(get_template_directory_uri()) . 'public/assets/' . rawurlencode(basename($files[0])) : '';
}
/** URL of the React bundle stylesheet (one hashed file per build), or ''. */
function tbv_react_proof_bundle_css() {
    $files = glob(get_template_directory() . '/public/assets/index-*.css') ?: [];
    return count($files) === 1 ? trailingslashit(get_template_directory_uri()) . 'public/assets/' . basename($files[0]) : '';
}
/** The storefront's catalog background photo from the React build, or ''. */
function tbv_react_proof_catalog_background() {
    $files = glob(get_template_directory() . '/public/assets/ChatGPT_Image_3_*18_33_27_*.webp') ?: [];
    return count($files) === 1 ? trailingslashit(get_template_directory_uri()) . 'public/assets/' . rawurlencode(basename($files[0])) : '';
}

// The storefront shows no WordPress toolbar (live has none); /wp-admin keeps it.
add_filter('show_admin_bar', fn($show) => is_admin() ? $show : false);
