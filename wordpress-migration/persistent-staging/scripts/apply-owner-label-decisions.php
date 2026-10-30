<?php
// Staging-only catalog update for the owner's 2026-10-28 decisions:
// named blue-label vials (no GLP codes), Melanotan-1/-2 artwork, and no
// research-use line in product descriptions. Run with `wp eval-file`.
// Idempotent: rows already updated are left alone.
global $wpdb;
$named = [];
foreach (['tirzepatide-glp-2' => 'tirzepatide', 'retatrutide-glp-3' => 'retatrutide', 'semaglutide' => 'semaglutide'] as $old => $new)
    foreach (glob(get_template_directory() . "/public/vials-c/{$new}-label-*.webp") as $file) {
        $hash = substr(basename($file, '.webp'), strlen("{$new}-label-"));
        $named["vials-c/{$old}-{$hash}.webp"] = "vials-c/{$new}-label-{$hash}.webp";
    }
$named['vials-c/cagrilintide-semaglutide-ee9e1cd7aef4.webp'] = 'vials-c/cagrilintide-semaglutide-label-ee9e1cd7aef4.webp';
$named['vials-c/melanotan-2-mt2-10mg.webp'] = 'vials-c/melanotan-2-0e2065c9b893.webp';
$named['vials-c/melanotan-1-mt1-10mg.webp'] = 'vials-c/melanotan-1-label-mt1-10mg.webp';
// The live manifest reuses the GLP TZ-2 20 mg vial for these two products.
$by_product = ['MOTS-C' => 'vials-c/mots-c-20mg-label-3c2452bfd7b4.webp', 'Tesamorelin' => 'vials-c/tesamorelin-20mg-label-3c2452bfd7b4.webp'];

$images = 0;
$rows = $wpdb->get_results("SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta} WHERE meta_key IN ('_tbv_vial_image','_tbv_source_image')");
foreach ($rows as $row) {
    $slash = str_starts_with($row->meta_value, '/') ? '/' : '';
    $path = strtok(ltrim($row->meta_value, '/'), '?');
    $post = get_post($row->post_id);
    $title = $post ? ($post->post_parent ? get_the_title($post->post_parent) : $post->post_title) : '';
    $new = ($path === 'vials-c/tirzepatide-glp-2-3c2452bfd7b4.webp' && isset($by_product[$title])) ? $by_product[$title] : ($named[$path] ?? null);
    // ...and the BPC-157 5 mg vial for KPV 5 mg.
    if ($path === 'vials-c/bpc-157-f4e551bb3098.webp' && $title === 'KPV') $new = 'vials-c/kpv-5mg-label-f4e551bb3098.webp';
    if (!$new) continue;
    if (!file_exists(get_template_directory() . '/public/' . $new)) { fwrite(STDERR, "missing $new\n"); exit(1); }
    $wpdb->update($wpdb->postmeta, ['meta_value' => $slash . $new], ['meta_id' => $row->meta_id]);
    clean_post_cache($row->post_id);
    $images++;
}

$ruo = '<p>For laboratory research use only. Not for human or animal use.</p>';
$descriptions = 0;
foreach ($wpdb->get_results($wpdb->prepare("SELECT ID, post_content FROM {$wpdb->posts} WHERE post_type = 'product' AND post_content LIKE %s", '%' . $wpdb->esc_like($ruo) . '%')) as $p) {
    $wpdb->update($wpdb->posts, ['post_content' => str_replace($ruo, '', $p->post_content)], ['ID' => $p->ID]);
    clean_post_cache($p->ID);
    $descriptions++;
}
if (function_exists('wc_delete_product_transients')) wc_delete_product_transients();
echo json_encode(['image_meta_updated' => $images, 'descriptions_updated' => $descriptions]), "\n";
