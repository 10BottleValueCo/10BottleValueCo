<?php defined('ABSPATH') || exit; get_header(); ?>
<main id="main-content" class="tbv-tracking">
  <section class="tbv-tracking__card"><div class="tbv-tracking__icon" aria-hidden="true">#</div><div>
    <h1>Order Information</h1>
    <form class="tbv-tracking__form" onsubmit="return false">
      <input type="text" placeholder="Order ID / Invoice number" aria-label="Order ID / Invoice number" disabled>
      <button type="submit" disabled>Check Status</button>
    </form><p class="tbv-tracking__notice">Order lookup will be available after customer accounts and order history are connected.</p>
  </div></section>
  <?php foreach ([
    ['17track','17 TRACK','Track Your Order (17TRACK)','Enter tracking number (e.g. GLY60503213136SZ)','',''],
    ['fedex','FedEx','Track Your Order (FedEx)','Enter FedEx tracking number','Opens FedEx tracking in a new tab','While your package is in transit between countries, FedEx may not show any tracking updates. This is completely normal. During this stage, the shipment is handled by partner carriers, so tracking information will only appear once the package arrives in the destination country and receives its first scan in the FedEx system.'],
    ['usps','USPS','Track Your Order (USPS)','Enter USPS tracking number','Opens USPS tracking in a new tab',''],
    ['ups','UPS','Track Your Order (UPS)','Enter UPS tracking number','Opens UPS tracking in a new tab',''],
  ] as [$carrier,$label,$heading,$placeholder,$subtitle,$footer]): ?>
    <section class="tbv-tracking__card"><div class="tbv-tracking__icon" aria-hidden="true"><?php echo esc_html($label); ?></div><div>
      <h2><?php echo esc_html($heading); ?></h2>
      <?php if($subtitle): ?><p class="tbv-tracking__subtitle"><?php echo esc_html($subtitle); ?></p><?php endif; ?>
      <form class="tbv-tracking__form" data-carrier="<?php echo esc_attr($carrier); ?>">
        <input type="text" aria-label="<?php echo esc_attr($placeholder); ?>" placeholder="<?php echo esc_attr($placeholder); ?>" autocomplete="off" spellcheck="false" maxlength="200">
        <button type="submit" disabled>Track</button>
      </form>
      <?php if($carrier === '17track'): ?><div data-tracking-result hidden></div><?php endif; ?>
      <?php if($footer): ?><p class="tbv-tracking__footnote"><?php echo esc_html($footer); ?></p><?php endif; ?>
    </div></section>
  <?php endforeach; ?>
</main>
<?php get_footer(); ?>
