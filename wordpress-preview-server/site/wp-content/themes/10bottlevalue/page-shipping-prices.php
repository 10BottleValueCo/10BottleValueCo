<?php
defined('ABSPATH') || exit;
// Display-only copy of the current storefront's public page. This separate
// preview option is not connected to WooCommerce checkout or shipping rates.
$data = json_decode((string)get_option('tbv_shipping_display_snapshot', '{}'), true);
if (!is_array($data)) $data = [];
$icons = json_decode((string)file_get_contents(get_template_directory() . '/assets/data/shipping-icons.json'), true);
$icon = fn($name) => $icons[$name] ?? '';
$asset = fn($path) => tbv_asset('public/' . $path);
$table = function ($rows) {
    if (!is_array($rows)) return;
    echo '<div class="shipping-rate-table"><div class="shipping-rate-heading"><span>Order value</span><span>Price</span></div>';
    foreach ($rows as $row) {
        if (!is_array($row) || count($row) !== 2) continue;
        echo '<div class="shipping-rate-row"><span>' . esc_html($row[0]) . '</span><strong>' . esc_html($row[1]) . '</strong></div>';
    }
    echo '</div>';
};
get_header(); ?>
<link rel="stylesheet" href="<?php echo esc_url(tbv_asset('css/shipping-page.css')); ?>">
<main id="main-content" class="shipping-page" style="--shipping-background:url('<?php echo esc_url($asset('images/shipping-prices-warehouse-background.webp')); ?>')">
 <header class="shipping-page-title"><h1>SHIPPING &amp; DISCOUNTS</h1></header>
 <section class="shipping-cards" aria-label="Shipping options">
  <article class="shipping-card shipping-card--warehouse" style="--card-bg:url('<?php echo esc_url($asset('shipping/shipping-warehouse.jpg')); ?>')">
   <div class="shipping-card-heading"><span class="shipping-icon shipping-icon--red" aria-hidden="true"><?php echo $icon('Truck'); ?></span><div><h2>US Warehouse Shipping</h2><small>(US WAREHOUSE)</small></div></div>
   <div class="shipping-warehouse-stats"><div><small>Delivery</small><strong>2–5</strong><span>business days</span></div><div><small>Ships from</small><strong>USA</strong></div><div><small>Shipping cost</small><strong><?php echo esc_html($data['us_shipping'] ?? ''); ?></strong></div></div>
   <div class="shipping-info"><span aria-hidden="true"><?php echo $icon('Info'); ?></span><p>Select the <strong>"SHOP (US WAREHOUSE)"</strong> tab to get free delivery from our U.S. warehouse in 2–5 business days.</p></div>
  </article>
  <article class="shipping-card" style="--card-bg:url('<?php echo esc_url($asset('shipping/shipping-worldwide.jpg')); ?>')">
   <div class="shipping-card-heading"><span class="shipping-icon shipping-icon--blue" aria-hidden="true"><?php echo $icon('Globe'); ?></span><div><h2>Standard Shipping</h2><small>(worldwide)</small></div></div>
   <?php $table($data['standard'] ?? []); ?>
   <div class="shipping-info"><span aria-hidden="true"><?php echo $icon('Truck'); ?></span><p>Standard worldwide shipping takes approximately 8–12 business days depending on location.</p></div>
  </article>
  <article class="shipping-card" style="--card-bg:url('<?php echo esc_url($asset('shipping/shipping-express.jpg')); ?>')">
   <div class="shipping-card-heading"><span class="shipping-icon shipping-icon--amber" aria-hidden="true"><?php echo $icon('Zap'); ?></span><div><h2>Express Shipping</h2><small>(worldwide)</small></div></div>
   <?php $table($data['express'] ?? []); ?>
   <div class="shipping-info"><span aria-hidden="true"><?php echo $icon('Zap'); ?></span><p>Express worldwide shipping takes approximately 5–7 business days depending on location.</p></div>
  </article>
 </section>
 <section class="shipping-benefits" aria-label="Shipping benefits">
  <?php foreach ([
   ['PackageCheck','green','Tracking Included','Tracking is available 1–3 business days after payment. We’ll email you the tracking number, and it will also be in your account.'],
   ['ShieldCheck','purple','Discreet Packaging','Plain, unbranded packaging for your privacy.'],
   ['Settings','neutral','Order Processing','Delivery time starts once payment is received. The delivery address cannot be changed after your order has shipped.'],
   ['FileText','blue','Customs & Import Fees','No customs duties are due. If any customs duties become payable, we’ll inform you in advance.'],
   ['Headphones','amber','Delivery Support','Package delayed, damaged or lost? Contact our support team and we’ll help.'],
  ] as [$iconName,$tone,$title,$description]): ?>
   <article><span class="shipping-icon shipping-icon--<?php echo esc_attr($tone); ?>" aria-hidden="true"><?php echo $icons[$iconName] ?? ''; ?></span><div><h3><?php echo esc_html($title); ?></h3><p><?php echo esc_html($description); ?></p><?php if ($title === 'Delivery Support'): ?><a href="mailto:support@10bottlevalue.co">Contact Support →</a><?php endif; ?></div></article>
  <?php endforeach; ?>
 </section>
 <section class="shipping-bonuses" aria-label="Bonuses and discounts">
  <article class="shipping-bonus shipping-bonus--community" style="--card-bg:url('<?php echo esc_url($asset('shipping/shipping-community-reference.jpg')); ?>')">
   <div class="shipping-bonus-content"><div class="shipping-bonus-heading"><span class="shipping-icon shipping-icon--green" aria-hidden="true"><?php echo $icon('Star'); ?></span><span>Community Bonus</span></div><h2>Get <?php echo esc_html($data['community_discount'] ?? ''); ?> OFF<br><span>Your Next Order</span></h2>
    <ol><li>Receive your order</li><li>Leave a review on Trustpilot</li><li>Email us to get your <?php echo esc_html($data['community_discount'] ?? ''); ?> promo code within 24h</li></ol>
    <a href="https://www.trustpilot.com/review/10bottlevalue.co" target="_blank" rel="noopener noreferrer">★ &nbsp; Write a review on Trustpilot &nbsp; →</a>
   </div>
  </article>
  <article class="shipping-bonus shipping-bonus--order" style="--card-bg:url('<?php echo esc_url($asset('shipping/shipping-order-bonus-lab.jpg')); ?>')">
   <div class="shipping-bonus-vials" aria-hidden="true"><img src="<?php echo esc_url($asset('vials-c/kpv-3bda87926280.webp')); ?>" alt=""><img src="<?php echo esc_url($asset('vials-c/mots-c-ead676f909ff.webp')); ?>" alt=""><img src="<?php echo esc_url($asset('vials-c/dsip-0f74d3cf1e6a.webp')); ?>" alt=""></div>
   <div class="shipping-bonus-content"><div class="shipping-bonus-heading"><span class="shipping-icon shipping-icon--amber" aria-hidden="true"><?php echo $icon('Gift'); ?></span><span>Order Bonus</span></div><h2>Save More<br><span>on Larger Orders</span></h2><p>Automatic discounts at checkout. No code needed.</p>
    <div class="shipping-discounts"><?php foreach (($data['discounts'] ?? []) as $row): if (!is_array($row) || count($row)!==2) continue; ?><div><small>Order from</small><strong><?php echo esc_html($row[0]); ?></strong><small>Discount</small><b><?php echo esc_html($row[1]); ?></b></div><?php endforeach; ?></div>
    <p class="shipping-discount-note">Discounts do not stack. The highest eligible discount applies.</p><div class="shipping-bonus-gift"><span aria-hidden="true"><?php echo $icon('Gift'); ?></span><p><strong>Orders above <?php echo esc_html($data['free_bonus_threshold'] ?? ''); ?> receive a FREE <?php echo esc_html($data['free_bonus_name'] ?? ''); ?> bonus</strong><br>(<?php echo esc_html($data['free_bonus_contents'] ?? ''); ?>). Applies to Shop Worldwide tab only.</p></div>
   </div>
  </article>
 </section>
</main>
<?php get_footer(); ?>
