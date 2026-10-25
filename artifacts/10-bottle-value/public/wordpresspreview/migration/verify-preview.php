<?php
if (!defined('ABSPATH')) require '/wordpress/wp-load.php';
if (!defined('TBV_MIGRATION_PREVIEW') || !TBV_MIGRATION_PREVIEW) throw new RuntimeException('Preview verification must run in the isolated preview.');
$catalog = json_decode(file_get_contents(__DIR__ . '/public-catalog.json'), true, 512, JSON_THROW_ON_ERROR);
$failures = [];
$checks = 0;
function tbv_verify($condition, $message) { global $checks, $failures; $checks++; if (!$condition) $failures[] = $message; }
$php_files_parsed = 0;
foreach ([get_template_directory(), __DIR__] as $directory) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)) as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
            try { token_get_all(file_get_contents($file->getPathname()), TOKEN_PARSE); $php_files_parsed++; }
            catch (ParseError $e) { tbv_verify(false, 'PHP syntax: ' . $file->getFilename() . ': ' . $e->getMessage()); }
        }
    }
}
$parents = [];
$children = [];
$media = [];
$expected_rows = [];
foreach ($catalog['rows'] as $row) {
    $id = wc_get_product_id_by_sku($row['migrationKey']);
    $child = $id ? wc_get_product($id) : false;
    tbv_verify($child instanceof WC_Product_Variation, 'Missing variation: ' . $row['migrationKey']);
    if (!$child) continue;
    $children[] = $id;
    $parent = wc_get_product($child->get_parent_id());
    $parents[$child->get_parent_id()] = true;
    tbv_verify($parent && $parent->get_name() === $row['name'], 'Compound name mismatch: ' . $row['migrationKey']);
    tbv_verify($child->get_regular_price() === number_format((float)$row['price'], 2, '.', ''), 'Price mismatch: ' . $row['migrationKey']);
    tbv_verify($child->get_stock_status() === $row['stockStatus'] && !$child->get_manage_stock() && $child->get_stock_quantity('edit') === null && $child->get_backorders() === 'no', 'Source availability/quantity mismatch: ' . $row['migrationKey']);
    $attrs = $child->get_attributes();
    tbv_verify(($attrs['dosage'] ?? '') === $row['dose'] && ($attrs['pack-size'] ?? '') === (string)$row['packCount'] && ($attrs['warehouse'] ?? '') === $row['warehouse'], 'Dose, pack or warehouse mismatch: ' . $row['migrationKey']);
    if ($row['noteLabel']) tbv_verify(($attrs['formulation'] ?? '') === $row['noteLabel'], 'Formulation lost: ' . $row['migrationKey']);
    tbv_verify($child->get_meta('_tbv_source_commit') === $catalog['sourceCommit'], 'Missing version provenance: ' . $row['migrationKey']);
    tbv_verify($child->get_meta('_tbv_coa_images') === $row['coaImages'] && $child->get_meta('_tbv_coa_pdf') === ($row['coaPdf'] ?? ''), 'Certificate identity mismatch: ' . $row['migrationKey']);
    $available_variation = $parent->get_available_variation($child);
    $expected_image = tbv_asset($row['image']);
    tbv_verify(($available_variation['image']['src'] ?? '') === $expected_image && ($available_variation['image']['full_src'] ?? '') === $expected_image && ($available_variation['image']['thumb_src'] ?? '') === $expected_image, 'Rendered variation image mismatch: ' . $row['migrationKey']);
    if (($row['previewImageStatus'] ?? '') === 'source_compound_mismatch') {
        // WooCommerce's view getter inherits a parent's image when the stored
        // variation has none. Check raw storage, then the actual rendered paths.
        tbv_verify((int)$child->get_image_id('edit') === 0 && $child->get_meta('_tbv_preview_image_status') === 'source_compound_mismatch' && $child->get_meta('_tbv_source_image') === $row['sourceImage'] && is_file(get_template_directory() . '/assets/' . ltrim($row['image'], '/')), 'Wrong-compound placeholder/provenance missing: ' . $row['migrationKey']);
        $thumbnail = apply_filters('woocommerce_cart_item_thumbnail', $child->get_image(), ['data' => $child]);
        tbv_verify(strpos($thumbnail, esc_url($expected_image)) !== false && strpos($thumbnail, 'product image pending') !== false, 'Cart placeholder not rendered for the known source mismatch: ' . $row['migrationKey']);
    } else {
        tbv_verify($child->get_image_id() > 0 && is_file(get_attached_file($child->get_image_id())), 'Missing native media: ' . $row['migrationKey']);
        $media[$child->get_image_id()] = true;
    }
    $expected_rows[$row['migrationKey']] = $row;
    $matched = WC_Data_Store::load('product')->find_matching_product_variation($parent, $child->get_variation_attributes());
    tbv_verify((int)$matched === (int)$id, 'Native variation selection mismatch: ' . $row['migrationKey']);
}
tbv_verify(count($parents) === $catalog['counts']['uniqueNames'], 'Product group count mismatch.');
tbv_verify(count($children) === $catalog['counts']['offers'] && count(array_unique($children)) === count($children), 'Variation count/identity mismatch.');
$all_children = get_posts(['post_type'=>'product_variation', 'post_status'=>'publish', 'posts_per_page'=>-1, 'fields'=>'ids', 'meta_key'=>'_tbv_source_commit', 'meta_value'=>$catalog['sourceCommit']]);
tbv_verify(count($all_children) === count($children), 'Unexpected duplicate migration variations.');
if (!WC()->session) WC()->initialize_session();
if (!WC()->customer) WC()->customer = new WC_Customer(0, true);
if (!WC()->cart) WC()->cart = new WC_Cart();
tbv_verify(!array_filter(WC()->payment_gateways()->get_available_payment_gateways()), 'A payment gateway is available in preview.');
tbv_verify(apply_filters('pre_wp_mail', null, ['to'=>'nobody@example.invalid','subject'=>'preview check','message'=>'not sent']) === true, 'Outgoing email isolation is missing.');
$shipping_zones = WC_Shipping_Zones::get_zones();
$enabled_shipping_methods = [];
foreach (array_merge([['zone_id' => 0]], $shipping_zones) as $zone_data) {
    $zone = new WC_Shipping_Zone((int)$zone_data['zone_id']);
    foreach ($zone->get_shipping_methods(true) as $method) $enabled_shipping_methods[] = $method->id;
}
tbv_verify(!$enabled_shipping_methods, 'Unconfirmed shipping rates were enabled.');
tbv_verify(get_option('woocommerce_calc_taxes') === 'no', 'Unconfirmed tax calculation was enabled.');
tbv_verify(get_option('woocommerce_coming_soon') === 'no', 'WooCommerce coming-soon mode blocks anonymous preview pages.');
tbv_verify((int)get_option('blog_public') === 0, 'Search indexing is enabled in preview.');
$request = new WP_REST_Request('POST', '/wc/store/v1/checkout');
$blocked = apply_filters('rest_pre_dispatch', null, rest_get_server(), $request);
tbv_verify(is_wp_error($blocked) && $blocked->get_error_code() === 'tbv_preview_checkout_disabled', 'Store API order submission is not blocked.');
wc_clear_notices();
do_action('woocommerce_checkout_process');
tbv_verify(wc_notice_count('error') > 0, 'Classic checkout order submission is not blocked.');
wc_clear_notices();

// Native WooCommerce cart must preserve two warehouse offers as separate lines.
WC()->cart->empty_cart();
$bpc = array_values(array_filter($catalog['rows'], function ($r) { return $r['name'] === 'BPC-157' && $r['dose'] === '10 mg' && $r['packCount'] === 10 && $r['stockStatus'] === 'instock'; }));
$expected_subtotal = 0;
$warehouses = [];
foreach ($bpc as $row) {
    if (isset($warehouses[$row['warehouse']])) continue;
    $warehouses[$row['warehouse']] = true;
    $child = wc_get_product(wc_get_product_id_by_sku($row['migrationKey']));
    $key = WC()->cart->add_to_cart($child->get_parent_id(), 1, $child->get_id(), $child->get_variation_attributes());
    tbv_verify((bool)$key, 'Native cart rejected an available warehouse offer.');
    $expected_subtotal += $row['price'];
}
WC()->cart->calculate_totals();
tbv_verify(count($warehouses) === 2 && count(WC()->cart->get_cart()) === 2, 'Two warehouses collapsed into one cart line.');
tbv_verify(abs((float)WC()->cart->get_subtotal() - $expected_subtotal) < 0.001, 'Native warehouse cart subtotal mismatch.');
$sold_out = array_values(array_filter($catalog['rows'], function ($r) { return $r['stockStatus'] === 'outofstock'; }));
if ($sold_out) {
    $child = wc_get_product(wc_get_product_id_by_sku($sold_out[0]['migrationKey']));
    $key = WC()->cart->add_to_cart($child->get_parent_id(), 1, $child->get_id(), $child->get_variation_attributes());
    tbv_verify($key === false && count(WC()->cart->get_cart()) === 2, 'Sold-out offer was accepted into the cart.');
}
WC()->cart->empty_cart();
wc_clear_notices();
tbv_verify((int)wc_orders_count('completed') === 0 && (int)wc_orders_count('processing') === 0, 'Unexpected completed/processing orders in isolated preview.');
$report = ['passed' => !$failures, 'checks' => $checks, 'failures' => $failures, 'phpFilesParsed' => $php_files_parsed, 'verifiedProducts' => count($parents), 'verifiedOffers' => count($children), 'nativeMedia' => count($media), 'nativeWarehouseSubtotal' => $expected_subtotal, 'enabledShippingMethods' => $enabled_shipping_methods, 'realPaymentPerformed' => false, 'customerEmailSent' => false, 'browserVisualParityVerified' => false, 'sourceCommit' => $catalog['sourceCommit']];
file_put_contents(__DIR__ . '/verification.json', wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
echo wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
if ($failures) throw new RuntimeException('Preview verification failed: ' . count($failures) . ' checks.');
