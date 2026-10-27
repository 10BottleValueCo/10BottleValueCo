<?php
// This script is mounted only in an isolated local test runtime. It creates one
// synthetic user and order in a throwaway SQLite copy; it is not a WP plugin.
require '/wordpress/wp-load.php';
if (!function_exists('wc_create_order')) throw new Exception('WooCommerce is unavailable');
$tests=[]; function check($key,$ok) {global $tests; $tests[$key]=(bool)$ok;}
$mail=0;$payments=0;
add_filter('pre_wp_mail',function($result)use(&$mail){$mail++;return true;},9999);
add_action('woocommerce_payment_complete',function()use(&$payments){$payments++;});
$email='synthetic-data-proof@example.invalid';
if (email_exists($email)) throw new Exception('Synthetic fixture user already exists');
$customer_id=wp_insert_user(['user_login'=>'tbv-synthetic-data-proof','user_email'=>$email,'user_pass'=>wp_generate_password(40,true,true),'role'=>'customer']);
if (is_wp_error($customer_id)) throw new Exception('Synthetic user creation failed');
update_user_meta($customer_id,'_tbv_source_customer_id','sample-customer-a');
$order=wc_create_order(['customer_id'=>$customer_id,'status'=>'pending','created_via'=>'tbv_synthetic_proof']);
if (is_wp_error($order)) throw new Exception('Synthetic order creation failed');
$order->set_currency('USD');
$order->set_billing_email($email);
$order->set_date_created('2026-01-01T10:00:00+00:00');
$line=new WC_Order_Item_Product();$line->set_name('Synthetic product');$line->set_quantity(2);$line->set_subtotal('20.00');$line->set_total('20.00');$order->add_item($line);
$shipping=new WC_Order_Item_Shipping();$shipping->set_method_title('Synthetic shipping');$shipping->set_total('4.00');$order->add_item($shipping);
$order->set_shipping_total('4.00');$order->set_total('24.00');
$order->update_meta_data('_tbv_source_order_id','sample-order-a');
$order->update_meta_data('_tbv_source_status','paid');
$order->update_meta_data('_tbv_source_provider','sample-provider');
$order->update_meta_data('_tbv_source_payment_reference','sample-payment-a');
$order->update_meta_data('_tbv_source_payment_evidence_verified','no');
$order_id=$order->save();$copy=wc_get_order($order_id);$items=$copy->get_items();$item=reset($items);
check('real_wordpress_customer',get_userdata($customer_id)->user_email===$email && get_user_meta($customer_id,'_tbv_source_customer_id',true)==='sample-customer-a');
check('real_woo_order_persisted',(bool)$order_id && $copy instanceof WC_Order);
check('customer_relationship',$copy->get_customer_id()===$customer_id);
check('historical_order_id_preserved',$copy->get_meta('_tbv_source_order_id')==='sample-order-a');
check('historical_timestamp_preserved',$copy->get_date_created()->date('Y-m-d\\TH:i:sP')==='2026-01-01T10:00:00+00:00');
check('historical_payment_reference_preserved',$copy->get_meta('_tbv_source_provider')==='sample-provider' && $copy->get_meta('_tbv_source_payment_reference')==='sample-payment-a');
check('unverified_historical_paid_not_promoted',$copy->get_meta('_tbv_source_status')==='paid' && $copy->get_meta('_tbv_source_payment_evidence_verified')==='no' && $copy->get_status()==='pending' && !$copy->get_date_paid());
check('line_and_quantity_preserved',$item && $item->get_name()==='Synthetic product' && $item->get_quantity()===2 && wc_format_decimal($item->get_total(),2)==='20.00');
check('shipping_and_total_preserved',wc_format_decimal($copy->get_shipping_total(),2)==='4.00' && wc_format_decimal($copy->get_total(),2)==='24.00');
check('no_payment_completion',$payments===0);
check('no_email_sent',$mail===0);
echo wp_json_encode(['passed'=>count(array_filter($tests)),'total'=>count($tests),'tests'=>$tests,'observed'=>['line_qty'=>$item->get_quantity(),'line_total'=>$item->get_total(),'shipping'=>$copy->get_shipping_total(),'total'=>$copy->get_total()]]);
