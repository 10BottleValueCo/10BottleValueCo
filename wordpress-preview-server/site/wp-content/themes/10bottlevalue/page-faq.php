<?php
defined('ABSPATH') || exit;
// This content is derived from the current storefront's faqData.js, not the
// generic review placeholder. Customer-facing business terms still require
// confirmation before any production cutover.
$faq_json = file_get_contents(get_template_directory() . '/assets/data/faq-en.json');
$faqs = json_decode($faq_json, true);
if (!is_array($faqs)) $faqs = [];
$sections = [
    ['shipping', 'SHIPPING', 'Delivery & tracking', 'Fast worldwide delivery, tracking details, and what to expect if a shipment slows down.', ['ship-worldwide','shipping-time','track-order','tracking-stops']],
    ['orders', 'ORDERS', 'Changes & support', 'Order changes, wrong addresses, confirmation emails, and support-related questions.', ['modify-cancel-order','wrong-shipping-address','confirmation-email','order-issue','billing-descriptor']],
    ['product', 'PRODUCT', 'Quality, reports & pricing', 'Quality, reports, pricing, and discount-related details.', ['lyophilized','high-quality','cheapest','ten-vial-kits','combine-discounts','usage-instructions','coa','not-all-products-in-catalog']],
];
get_header(); ?>
<main id="main-content" class="tbv-faq" data-faq>
  <div class="tbv-faq__intro">
    <div><h1>Common Questions</h1><p>Clear answers about shipping, orders and product details.</p></div>
    <label class="tbv-faq__search"><span aria-hidden="true">⌕</span><input type="search" data-faq-search aria-label="Search questions and answers" placeholder="Search questions and answers..."></label>
  </div>
  <p class="tbv-faq__empty" data-faq-empty role="status" hidden>No matching questions. Try a different search.</p>
  <?php foreach ($sections as [$key,$title,$label,$description,$ids]):
      $items = array_values(array_filter($faqs, fn($faq) => in_array($faq['id'] ?? '', $ids, true))); ?>
    <section class="tbv-faq__section" data-faq-section>
      <div class="tbv-faq__section-head"><div><div class="tbv-faq__eyebrow"><?php echo esc_html($label); ?></div><h2><?php echo esc_html($title); ?></h2><p><?php echo esc_html($description); ?></p></div><span data-faq-count><?php echo count($items); ?> questions</span></div>
      <div class="tbv-faq__items">
      <?php foreach ($items as $item): ?>
        <details class="tbv-faq__item" data-faq-item data-faq-search-text="<?php echo esc_attr($item['q'] . ' ' . $item['a']); ?>">
          <summary><?php echo esc_html($item['q']); ?><span aria-hidden="true">+</span></summary>
          <div class="tbv-faq__answer"><?php echo wpautop(esc_html($item['a'])); ?></div>
        </details>
      <?php endforeach; ?>
      </div>
    </section>
  <?php endforeach; ?>
</main>
<?php get_footer(); ?>
