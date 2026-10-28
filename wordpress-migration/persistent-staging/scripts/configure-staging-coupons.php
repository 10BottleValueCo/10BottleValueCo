<?php
// Staging-only promo code fixture. REVIEW10 mirrors the public 10% code in the
// live storefront's promoCatalog (App.jsx). Affiliate codes and customer promo
// codes are not migrated or connected. Idempotent: updates the coupon in place.
$code = 'review10';
$id = wc_get_coupon_id_by_code($code);
$coupon = new WC_Coupon($id ?: 0);
$coupon->set_code($code);
$coupon->set_description('Staging fixture: live public REVIEW10 (10% review discount).');
$coupon->set_discount_type('percent');
$coupon->set_amount(10);
$coupon->set_individual_use(true);
$coupon->set_usage_limit_per_user(0);
$coupon->update_meta_data('_tbv_staging_fixture', 'promo-2026-10-28');
$coupon->save();
echo json_encode(['coupon' => $coupon->get_code(), 'id' => $coupon->get_id(), 'type' => $coupon->get_discount_type(), 'amount' => $coupon->get_amount()]), "\n";
