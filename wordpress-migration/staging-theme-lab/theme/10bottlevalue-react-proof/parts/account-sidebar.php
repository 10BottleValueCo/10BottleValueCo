<?php
// Live account dashboard sidebar for native WooCommerce account endpoints.
defined('ABSPATH') || exit;
$tbv_account = wc_get_page_permalink('myaccount');
$tbv_active = is_wc_endpoint_url('edit-address') ? 'shipping' : (is_wc_endpoint_url('edit-account') ? 'security' : 'overview');
$tbv_icon = static function ($paths) {
    return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $paths . '</svg>';
};
$tbv_items = [
    'overview' => ['Overview', $tbv_account, '<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>'],
    'messages' => ['Messages', home_url('/contact'), '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>'],
    'shipping' => ['Shipping Details', wc_get_endpoint_url('edit-address', 'billing', $tbv_account), '<path d="M3 6h11v12H3z"/><path d="M14 10h4l3 3v5h-7z"/><circle cx="7.5" cy="19" r="1.8"/><circle cx="17.5" cy="19" r="1.8"/>'],
    'security' => ['Security', wc_get_endpoint_url('edit-account', '', $tbv_account), '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/>'],
];
?><aside class="lab-sidebar"><div class="lab-sidebar__eyebrow">My account</div><nav class="lab-sidenav" aria-label="Account navigation"><?php foreach ($tbv_items as $id => [$label, $href, $paths]): ?><a class="lab-sidenav__item<?php echo $id === $tbv_active ? ' is-active' : ''; ?>" href="<?php echo esc_url($href); ?>"<?php echo $id === $tbv_active ? ' aria-current="page"' : ''; ?>><?php echo $tbv_icon($paths); ?><span><?php echo esc_html($label); ?></span></a><?php endforeach; ?></nav><div class="lab-sidebar__rule"></div><a class="lab-sidenav__item lab-signout" href="<?php echo esc_url(wp_nonce_url(wc_get_account_endpoint_url('customer-logout'), 'customer-logout')); ?>"><?php echo $tbv_icon('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>'); ?><span>Sign out</span></a></aside>
