<?php
/** Run after WordPress, WooCommerce, theme and tbv-preview-isolation.php exist. */
if (!defined('ABSPATH')) require '/wordpress/wp-load.php';
if (!defined('TBV_MIGRATION_PREVIEW') || TBV_MIGRATION_PREVIEW !== true) {
    throw new RuntimeException('Refusing catalog import outside the isolated migration preview.');
}
if (!class_exists('WC_Product_Variable')) throw new RuntimeException('WooCommerce must be active before the preview import.');

$catalog_path = __DIR__ . '/public-catalog.json';
$catalog = json_decode(file_get_contents($catalog_path), true, 512, JSON_THROW_ON_ERROR);
if (($catalog['customerDataIncluded'] ?? true) !== false || ($catalog['supplierDataIncluded'] ?? true) !== false) throw new RuntimeException('Only the public catalog snapshot may be imported.');
$rows = $catalog['rows'] ?? [];
if (count($rows) !== (int) ($catalog['counts']['offers'] ?? 0) || !$rows) throw new RuntimeException('Catalog offer count mismatch.');
$groups = [];
$seen = [];
$tuples = [];
foreach ($rows as $row) {
    foreach (['migrationKey', 'name', 'dose', 'packCount', 'warehouse', 'price', 'stockStatus', 'currency'] as $field) {
        if (!array_key_exists($field, $row)) throw new RuntimeException('Missing catalog field: ' . $field);
    }
    if (isset($seen[$row['migrationKey']])) throw new RuntimeException('Duplicate migration identity.');
    if (!in_array($row['warehouse'], ['us', 'worldwide'], true) || $row['currency'] !== 'USD' || !is_numeric($row['price']) || $row['price'] <= 0 || (int) $row['packCount'] <= 0 || !in_array($row['stockStatus'], ['instock', 'outofstock'], true)) throw new RuntimeException('Invalid source offer.');
    $tuple = json_encode([$row['name'], $row['dose'], $row['packCount'], $row['warehouse'], $row['noteLabel'] ?? '']);
    if (isset($tuples[$tuple])) throw new RuntimeException('Duplicate compound, dose, pack, warehouse and formulation.');
    $seen[$row['migrationKey']] = true;
    $tuples[$tuple] = true;
    $groups[$row['name']][] = $row;
}
if (count($groups) !== (int) $catalog['counts']['uniqueNames']) throw new RuntimeException('Catalog product count mismatch.');

function tbv_preview_image_id($relative) {
    static $cache = [];
    $relative = ltrim((string) wp_parse_url($relative, PHP_URL_PATH), '/');
    if (!$relative || strpos($relative, '..') !== false || !preg_match('#^vials-c/[a-zA-Z0-9._-]+\.webp$#', $relative)) return 0;
    if (isset($cache[$relative])) return $cache[$relative];
    $source = get_template_directory() . '/assets/' . $relative;
    if (!is_file($source)) throw new RuntimeException('Missing packaged vial image: ' . $relative);
    $existing = get_posts(['post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_tbv_preview_image', 'meta_value' => $relative]);
    if ($existing) return $cache[$relative] = (int) $existing[0];
    $uploads = wp_upload_dir();
    $subpath = 'tbv-preview-vials/' . basename($relative);
    $destination = $uploads['basedir'] . '/' . $subpath;
    wp_mkdir_p(dirname($destination));
    if (!copy($source, $destination)) throw new RuntimeException('Cannot copy preview vial.');
    $id = wp_insert_attachment(['post_title' => pathinfo($relative, PATHINFO_FILENAME), 'post_mime_type' => 'image/webp', 'post_status' => 'inherit'], $destination, 0, true);
    if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
    $size = getimagesize($destination);
    wp_update_attachment_metadata($id, ['width' => $size[0] ?? 0, 'height' => $size[1] ?? 0, 'file' => $subpath, 'sizes' => []]);
    update_post_meta($id, '_tbv_preview_image', $relative);
    return $cache[$relative] = (int) $id;
}

$parent_ids = [];
$variation_ids = [];
$route_map = [];
$route_conflicts = [];
foreach ($groups as $name => $offers) {
    $parent_sku = 'tbv-group-' . substr(hash('sha256', $name), 0, 16);
    $parent_id = wc_get_product_id_by_sku($parent_sku);
    $parent = $parent_id ? wc_get_product($parent_id) : new WC_Product_Variable();
    if (!$parent instanceof WC_Product_Variable) throw new RuntimeException('Existing product type conflicts with source group.');
    $parent->set_name($name);
    $parent->set_sku($parent_sku);
    $parent->set_slug(sanitize_title($name));
    $parent->set_status('publish');
    $parent->set_catalog_visibility('visible');
    $parent->set_menu_order(min(array_column($offers, 'sourceIndex')));
    $parent->set_short_description(esc_html($offers[0]['note'] ?? ''));
    $parent->set_description('<p>' . esc_html($offers[0]['note'] ?? '') . '</p><p>For laboratory research use only. Not for human or animal use.</p>');
    $options = ['dosage' => [], 'pack-size' => [], 'warehouse' => []];
    $has_formulation = (bool) array_filter(array_column($offers, 'noteLabel'));
    if ($has_formulation) $options['formulation'] = [];
    foreach ($offers as $row) {
        $options['dosage'][] = $row['dose'];
        $options['pack-size'][] = (string) $row['packCount'];
        $options['warehouse'][] = $row['warehouse'];
        if ($has_formulation) $options['formulation'][] = ($row['noteLabel'] ?? '') ?: 'Standard';
    }
    $attributes = [];
    foreach ($options as $attribute_name => $values) {
        $attribute = new WC_Product_Attribute();
        $attribute->set_name($attribute_name);
        $attribute->set_options(array_values(array_unique($values)));
        $attribute->set_visible(true);
        $attribute->set_variation(true);
        $attributes[] = $attribute;
    }
    $parent->set_attributes($attributes);
    $parent->set_image_id(tbv_preview_image_id($offers[0]['image'] ?? ''));
    $parent->update_meta_data('_tbv_preview_source_commit', $catalog['sourceCommit']);
    $parent->update_meta_data('_tbv_preview_extracted_at', $catalog['extractedAt']);
    $parent->update_meta_data('_tbv_aliases', implode(' ', array_unique(array_column($offers, 'currentDisplayName'))));
    $parent->update_meta_data('_tbv_vial_image', ltrim($offers[0]['image'] ?? '', '/'));
    $parent_id = $parent->save();
    $parent_ids[] = $parent_id;
    foreach ($offers as $row) {
        $id = wc_get_product_id_by_sku($row['migrationKey']);
        $variation = $id ? wc_get_product($id) : new WC_Product_Variation();
        if (!$variation instanceof WC_Product_Variation || ($id && $variation->get_parent_id() !== $parent_id)) throw new RuntimeException('Existing offer identity conflicts with the source product.');
        $attrs = ['dosage' => $row['dose'], 'pack-size' => (string) $row['packCount'], 'warehouse' => $row['warehouse']];
        if ($has_formulation) $attrs['formulation'] = ($row['noteLabel'] ?? '') ?: 'Standard';
        $variation->set_parent_id($parent_id);
        $variation->set_sku($row['migrationKey']);
        $variation->set_status('publish');
        $variation->set_attributes($attrs);
        $variation->set_regular_price(number_format((float) $row['price'], 2, '.', ''));
        $variation->set_sale_price('');
        $variation->set_manage_stock(false); // A source boolean is not a physical quantity.
        $variation->set_stock_status($row['stockStatus']);
        $variation->set_backorders('no');
        $variation->set_image_id(tbv_preview_image_id($row['image'] ?? ''));
        foreach (['_tbv_migration_key' => $row['migrationKey'], '_tbv_warehouse' => $row['warehouse'], '_tbv_dose' => $row['dose'], '_tbv_pack_size' => $row['packCount'], '_tbv_note_label' => $row['noteLabel'] ?? '', '_tbv_vial_image' => ltrim($row['image'] ?? '', '/'), '_tbv_source_stock_evidence' => $row['stockEvidence'], '_tbv_source_commit' => $catalog['sourceCommit'], '_tbv_source_extracted_at' => $catalog['extractedAt'], '_tbv_source_catalog_name' => $row['catalogName'], '_tbv_source_display_alias' => $row['currentDisplayName'], '_tbv_source_current_slug' => $row['currentSlug'], '_tbv_coa_pdf' => $row['coaPdf'], '_tbv_coa_images' => $row['coaImages']] as $key => $value) $variation->update_meta_data($key, $value);
        $variation->update_meta_data('_tbv_preview_image_status', $row['previewImageStatus'] ?? 'source_asset');
        $variation->update_meta_data('_tbv_source_image', $row['sourceImage'] ?? $row['image']);
        $variation_ids[] = $variation->save();
        $route = ['productId' => $parent_id, 'dose' => $row['dose'], 'packCount' => $row['packCount'], 'warehouse' => $row['warehouse'], 'formulation' => $row['noteLabel'] ?? ''];
        foreach (array_unique(array_filter([$row['currentSlug'], $row['legacyCanonicalSlug'], $row['restoredSlug']])) as $slug) {
            if (isset($route_map[$slug]) && $route_map[$slug] !== $route) { $route_conflicts[$slug] = true; continue; }
            $route_map[$slug] = $route;
        }
    }
    WC_Product_Variable::sync($parent_id);
    wc_delete_product_transients($parent_id);
}
// Ambiguous source URLs must not silently select a different warehouse/formulation.
foreach (array_keys($route_conflicts) as $slug) unset($route_map[$slug]);
update_option('tbv_preview_legacy_routes', $route_map, false);
update_option('tbv_preview_ambiguous_legacy_routes', array_keys($route_conflicts), false);

function tbv_preview_page($slug, $title, $content) {
    $page = get_page_by_path($slug);
    $data = ['post_title' => $title, 'post_name' => $slug, 'post_content' => $content, 'post_type' => 'page', 'post_status' => 'publish'];
    if ($page) $data['ID'] = $page->ID;
    $id = wp_insert_post($data, true);
    if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
    return $id;
}
$home = tbv_preview_page('home', '10BottleValueCo', '');
$shop = tbv_preview_page('shop', 'Shop', '');
$cart = tbv_preview_page('cart', 'Cart', '[woocommerce_cart]');
$checkout = tbv_preview_page('checkout', 'Checkout', '[woocommerce_checkout]');
$account = tbv_preview_page('my-account', 'My account', '[woocommerce_my_account]');
tbv_preview_page('shipping-prices', 'Shipping Prices', '<p>Worldwide and US warehouse offers remain separate. Shipping rates and destination availability are awaiting confirmation for the new store.</p><p>No shipping charge in this preview is a live quote.</p>');
tbv_preview_page('faq', 'Frequently Asked Questions', '<h2>How many vials are included?</h2><p>The migrated catalog snapshot lists ten-vial kits. Select the dosage and warehouse on the product page to see the corresponding offer.</p><h2>Can I place an order here?</h2><p>This is a review preview. Payments and real order submission are disabled.</p><h2>Are the listed stock amounts live?</h2><p>Availability comes from a dated source-code catalog snapshot. Physical stock quantities are unknown.</p>');
tbv_preview_page('contact', 'Contact', '<p>Customer support and message delivery are not connected in this review preview. Existing support conversations remain with the current store.</p>');
tbv_preview_page('affiliate', 'Affiliate', '<p>Existing affiliate links, commissions and balances remain in the current system. Their migration has not been applied in this review preview.</p>');
tbv_preview_page('track-order', 'Track Order', '<p>Existing orders and tracking remain in the current store. This isolated preview contains no customer orders.</p>');
foreach (['about' => 'About', 'shipping-policy' => 'Shipping Policy', 'refund-policy' => 'Refund Policy', 'privacy-policy' => 'Privacy Policy', 'terms-and-conditions' => 'Terms and Conditions'] as $slug => $title) {
    tbv_preview_page($slug, $title, '<p>This page is awaiting the owner’s approved company and policy details for the new store.</p><p>The company name and policy text shown in the existing store have not been replaced or re-approved through this preview.</p>');
}
// Keep anonymous review pages visible; noindex and checkout isolation remain enabled.
foreach (['woocommerce_shop_page_id' => $shop, 'woocommerce_cart_page_id' => $cart, 'woocommerce_checkout_page_id' => $checkout, 'woocommerce_myaccount_page_id' => $account, 'page_on_front' => $home, 'show_on_front' => 'page', 'permalink_structure' => '/%postname%/', 'blogname' => '10BottleValueCo', 'blogdescription' => 'WordPress and WooCommerce migration review preview', 'blog_public' => 0, 'woocommerce_currency' => 'USD', 'woocommerce_enable_guest_checkout' => 'yes', 'woocommerce_enable_signup_and_login_from_checkout' => 'no', 'woocommerce_calc_taxes' => 'no', 'woocommerce_coming_soon' => 'no', 'woocommerce_allow_tracking' => 'no', 'woocommerce_store_address' => '', 'woocommerce_store_address_2' => '', 'woocommerce_store_city' => '', 'woocommerce_store_postcode' => '', 'tbv_preview_environment' => true] as $key => $value) update_option($key, $value);
// The tentative umbrella LLC name stays undecided; no legal entity is substituted.
update_option('woocommerce_enable_myaccount_registration', 'yes');
update_option('tbv_proposed_legal_entity', ['name' => 'Elite 10 Management Group LLC', 'status' => 'owner_considering_not_confirmed'], false);
flush_rewrite_rules(false);
$report = ['sourceCommit' => $catalog['sourceCommit'], 'sourceExtractedAt' => $catalog['extractedAt'], 'products' => count($parent_ids), 'offers' => count($variation_ids), 'uniqueOfferIds' => count(array_unique($variation_ids)), 'stockSource' => 'dated source boolean; not physical inventory', 'customerDataImported' => false, 'supplierDataImported' => false, 'ordersImported' => false, 'paymentsEnabled' => false, 'outgoingEmailEnabled' => false, 'ambiguousLegacyRoutes' => array_keys($route_conflicts), 'unambiguousLegacyRoutes' => count($route_map), 'previewImageOverrides' => $catalog['previewImageOverrides'] ?? []];
update_option('tbv_preview_import_report', $report, false);
echo wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
