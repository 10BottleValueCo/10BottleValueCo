<?php defined('ABSPATH') || exit; get_header();
// Preserve App.jsx at 5672c65: curated home order and ascending dosage defaults,
// not a measured sales ranking. WW order follows the observed 2026-10-24 live
// home, with BAC Water last; catalog availability and pricing are unchanged.
$home_orders = [
    'worldwide' => ['Retatrutide', 'GHK-CU', 'TB-500 + BPC-157', 'MOTS-C', 'Tirzepatide', '10-GH', 'KLOW80', 'CJC-1295 + Ipamorelin', 'NAD+', 'BPC-157', 'Tesamorelin', 'Semax', 'Selank', 'SS-31', 'KPV', 'HCG', '5-Amino-1MQ', 'Epitalon', 'DSIP', 'BAC Water'],
    'us' => ['Retatrutide', 'BAC Water', 'GHK-CU', 'TB-500 + BPC-157', 'BPC-157', 'MOTS-C', 'Tirzepatide', '10-GH', 'KLOW80', 'CJC-1295 + Ipamorelin', 'NAD+', 'Tesamorelin', 'Semax', 'Selank', 'TB-500', 'SS-31', 'KPV', 'Epitalon', 'CJC-1295', 'HCG', '5-Amino-1MQ'],
];
$home_variant_order = static function ($ids) {
    usort($ids, static function ($a, $b) { return (float)wc_get_product($a)->get_meta('_tbv_dose') <=> (float)wc_get_product($b)->get_meta('_tbv_dose'); });
    return $ids;
};
add_filter('woocommerce_get_children', $home_variant_order);
$home_products = [];
foreach ($home_orders as $location => $order) {
    $rank = array_flip($order);
    $home_products[$location] = array_values(array_filter(tbv_products($location), static function ($product) use ($location, $rank) {
        return ($location === 'us' || isset($rank[$product->get_name()])) && count(array_filter(tbv_variants($product, $location), static function ($variant) { return $variant['pack'] === 10 && $variant['available']; })) > 0;
    }));
    usort($home_products[$location], static function ($a, $b) use ($rank) { return (($rank[$a->get_name()] ?? PHP_INT_MAX) <=> ($rank[$b->get_name()] ?? PHP_INT_MAX)) ?: strnatcasecmp($a->get_name(), $b->get_name()); });
}
?>
<main id="main-content" class="tbv-home">
<section class="tbv-home__hero tbv-home__hero--reference" aria-labelledby="tbv-home-heading">
<picture class="tbv-home__hero-reference-picture"><source media="(max-width:640px)" srcset="<?php echo esc_url(tbv_asset('images/homepage-hero-mobile-vial.webp')); ?>"><img class="tbv-home__hero-reference-image" src="<?php echo esc_url(tbv_asset('images/homepage-hero-background.webp')); ?>" alt="" fetchpriority="high"></picture>
<div class="tbv-home__hero-reference-content"><div class="tbv-home__hero-reference-copy"><h1 id="tbv-home-heading"><span>Peptides.</span><span>Better Prices.</span></h1></div><div class="tbv-home__hero-reference-actions"><div class="tbv-home__hero-reference-shop-actions"><a class="tbv-home__button tbv-home__button--primary tbv-home__hero-reference-action" href="<?php echo esc_url(tbv_shop_url()); ?>"><span aria-hidden="true">◎</span><span>Shop worldwide</span><span class="tbv-home__arrow" aria-hidden="true">→</span></a><a class="tbv-home__button tbv-home__button--secondary tbv-home__hero-reference-action" href="<?php echo esc_url(tbv_shop_url('us')); ?>"><span aria-hidden="true">🇺🇸</span><span>Shop US warehouse</span><span class="tbv-home__arrow" aria-hidden="true">→</span></a></div><a class="tbv-home__button tbv-home__button--secondary tbv-home__hero-reference-action tbv-home__hero-register-action" href="<?php echo esc_url(tbv_shop_url()); ?>"><span aria-hidden="true">♙</span><span>Explore catalog</span><span aria-hidden="true">→</span></a></div></div>
</section>
<section class="tbv-home__section" aria-labelledby="featured-heading"><div class="tbv-home__container tbv-home__container--featured"><div class="tbv-home__section-head"><h2 id="featured-heading">Popular research peptides</h2><div class="tbv-home__section-actions"><button class="tbv-home__text-link tbv-home__text-link--warehouse-switch" type="button" data-featured-switch aria-label="Switch to US products" aria-pressed="false"><span class="tbv-home__warehouse-switch-label--full" data-featured-label-full>Switch to US products ↻</span><span class="tbv-home__warehouse-switch-label--short" data-featured-label-short>Switch to US ↻</span></button><a class="tbv-home__text-link" href="<?php echo esc_url(tbv_shop_url()); ?>">Show all products<span class="tbv-home__arrow tbv-home__arrow--show-all" aria-hidden="true">→</span></a></div></div>
<?php foreach (['worldwide','us'] as $location): ?><div class="tbv-home__products-shell" data-featured-warehouse="<?php echo esc_attr($location); ?>" <?php if($location==='us') echo 'hidden'; ?>><button class="tbv-home__products-scroll-button tbv-home__products-scroll-button--left" type="button" data-scroll="-1" aria-label="Scroll products left">←</button><div class="tbv-home__products" tabindex="0" aria-label="Featured <?php echo esc_attr($location); ?> products"><?php foreach($home_products[$location] as $product): ?><div class="tbv-home__product-slot"><?php tbv_card($product, $location); ?></div><?php endforeach; ?></div><button class="tbv-home__products-scroll-button tbv-home__products-scroll-button--right" type="button" data-scroll="1" aria-label="Scroll products right">→</button></div><?php endforeach; remove_filter('woocommerce_get_children', $home_variant_order); ?>
</div></section>
<?php get_template_part('template-parts/social'); ?>
</main><?php get_footer(); ?>
