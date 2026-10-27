<?php
require '/wordpress/wp-load.php';
if (defined('TBV_TEST_CLASSIC') && TBV_TEST_CLASSIC) update_option('woocommerce_custom_orders_table_enabled','no');
require '/wordpress/wp-content/plugins/tbv-synthetic-migration/tbv-synthetic-migration.php';
$checks=[];function ck($key,$v){global $checks;$checks[$key]=(bool)$v;}
function code($x,$code){return is_wp_error($x)&&$x->get_error_code()===$code;}
$fixture=['synthetic'=>true,'customers'=>[['id'=>'sample-c1','email'=>'tbvsm-a@example.invalid'],['id'=>'sample-c2','email'=>'tbvsm-b@example.invalid']],'orders'=>[['id'=>'sample-o1','customerId'=>'sample-c1','createdAt'=>'2026-01-02T03:04:05Z','historicalStatus'=>'paid','paymentReference'=>'sample-pay1','itemName'=>'Synthetic item','quantity'=>2,'subtotal'=>'20.00','shipping'=>'4.00','total'=>'24.00']]];
$mail=0;$payment=0;$status=0;$refund=0;$stock=0;add_action('woocommerce_order_refunded',function()use(&$refund){$refund++;});add_action('woocommerce_reduce_order_stock',function()use(&$stock){$stock++;});add_filter('pre_wp_mail',function($x)use(&$mail){$mail++;return true;},0);add_action('woocommerce_payment_complete',function()use(&$payment){$payment++;});add_action('woocommerce_order_status_changed',function()use(&$status){$status++;});
$p=tbvsm_plan($fixture);ck('dry_run_three_creates',!is_wp_error($p)&&count($p['operations'])===3 && count(array_filter($p['operations'],fn($x)=>$x['action']==='create'))===3);
ck('dry_run_no_writes',!email_exists('tbvsm-a@example.invalid') && count(tbvsm_orders_for('sample-o1'))===0);
$bad=$fixture;$bad['customers'][1]['id']='sample-c1';ck('duplicate_customer',code(tbvsm_plan($bad),'invalid_customer'));
$bad=$fixture;$bad['orders'][]=$bad['orders'][0];ck('duplicate_order',code(tbvsm_plan($bad),'invalid_order'));
$bad=$fixture;$bad['customers'][0]['email']='real@example.com';ck('real_email_rejected',code(tbvsm_plan($bad),'invalid_customer'));
$bad=$fixture;$bad['customers'][0]['id']='real-identity';ck('real_id_rejected',code(tbvsm_plan($bad),'invalid_customer'));
$bad=$fixture;$bad['synthetic']=false;ck('synthetic_flag_required',code(tbvsm_plan($bad),'invalid_fixture'));
$bad=$fixture;$bad['orders'][0]['customerId']=[];ck('nonstring_owner_refused',code(tbvsm_plan($bad),'invalid_order'));
$bad=$fixture;$bad['orders'][0]['customerId']='sample-missing';ck('unknown_owner_refused',code(tbvsm_plan($bad),'invalid_order'));
$bad=$fixture;$bad['orders'][0]['total']='24.01';ck('unbalanced_refused',code(tbvsm_plan($bad),'invalid_total'));
$bad=$fixture;$bad['orders'][0]['total']=24;ck('floating_money_refused',code(tbvsm_plan($bad),'invalid_total'));
$bad=$fixture;$bad['orders'][0]['createdAt']=[];ck('nonstring_date_refused',code(tbvsm_plan($bad),'invalid_timestamp'));
$bad=$fixture;$bad['orders'][0]['createdAt']='2026-02-30T03:04:05Z';ck('invalid_date_refused',code(tbvsm_plan($bad),'invalid_timestamp'));
add_option('_tbvsm_lab_lock','held','','no');ck('concurrent_lock',code(tbvsm_apply($fixture),'locked'));delete_option('_tbvsm_lab_lock');
$taken=wp_insert_user(['user_login'=>'tbvsm-sample-c1','user_email'=>'tbvsm-taken@example.invalid','user_pass'=>wp_generate_password(),'role'=>'customer']);ck('occupied_username_preflight',code(tbvsm_apply($fixture),'customer_identity_conflict') && !email_exists('tbvsm-b@example.invalid'));require_once ABSPATH.'wp-admin/includes/user.php';wp_delete_user($taken);
$a=tbvsm_apply($fixture);ck('apply_success',!is_wp_error($a));
$uid=email_exists('tbvsm-a@example.invalid');$orderids=tbvsm_orders_for('sample-o1');$order=count($orderids)===1?wc_get_order($orderids[0]):null;
ck('customer_and_order_saved',$uid && $order && tbvsm_customer_matches($uid,$fixture['customers'][0]) && tbvsm_order_matches($orderids[0],$fixture['orders'][0],$uid));
ck('historical_paid_not_verified',$order && $order->get_status()==='pending' && !$order->get_date_paid() && $order->get_meta('_tbvsm_historical_status')==='paid');
ck('identity_and_payment_ref_preserved',$order && $order->get_meta('_tbvsm_source_id')==='sample-o1' && $order->get_meta('_tbvsm_payment_reference')==='sample-pay1');
$p=tbvsm_plan($fixture);ck('repeated_plan_unchanged',!is_wp_error($p)&&count(array_filter($p['operations'],fn($x)=>$x['action']==='unchanged'))===3);
$r=tbvsm_apply($fixture);ck('repeat_no_duplicates',!is_wp_error($r) && count(tbvsm_users_for('sample-c1'))===1 && count(tbvsm_orders_for('sample-o1'))===1);
$changed=$fixture;$changed['orders'][0]['total']='25.00';$changed['orders'][0]['shipping']='5.00';$changed['customers'][]=['id'=>'sample-c3','email'=>'tbvsm-c@example.invalid'];ck('changed_source_blocks_entire_batch',code(tbvsm_apply($changed),'journal_conflict') && !email_exists('tbvsm-c@example.invalid'));
ck('no_order_status_transition',$status===0);$order->delete(false);ck('trashed_order_detected',code(tbvsm_plan($fixture),'order_edited'));$order=wc_get_order($orderids[0]);$order->set_status('pending');$order->save();
$order->set_total('99.00');$order->save();ck('operator_edit_refused',code(tbvsm_plan($fixture),'order_edited'));$order->set_total('24.00');$order->save();
$items=$order->get_items();$item=reset($items);$item->set_subtotal('21.00');$item->save();ck('edited_item_subtotal_refused',code(tbvsm_plan($fixture),'order_edited'));$item->set_subtotal('20.00');$item->save();
$shippingItems=$order->get_items('shipping');$shipping=reset($shippingItems);$shipping->set_total('3.00');$shipping->save();ck('edited_shipping_line_refused',code(tbvsm_plan($fixture),'order_edited'));$shipping->set_total('4.00');$shipping->save();
$fee=new WC_Order_Item_Fee();$fee->set_name('Synthetic fee');$fee->set_total('1.00');$order->add_item($fee);$order->save();ck('unexpected_fee_refused',code(tbvsm_plan($fixture),'order_edited'));$order->remove_item($fee->get_id());$order->save();
$tax=new WC_Order_Item_Tax();$tax->set_label('Synthetic tax');$tax->set_tax_total('1.00');$order->add_item($tax);$order->save();ck('unexpected_tax_line_refused',code(tbvsm_plan($fixture),'order_edited'));$order->remove_item($tax->get_id());$order->save();
$order->set_discount_total('1.00');$order->save();ck('unexpected_discount_refused',code(tbvsm_plan($fixture),'order_edited'));$order->set_discount_total('0.00');$order->save();
$extraRefund=new WC_Order_Refund();$extraRefund->set_parent_id($order->get_id());$extraRefund->set_amount('1.00');$extraRefund->set_total('-1.00');$extraRefund->save();ck('unexpected_refund_record_refused',code(tbvsm_plan($fixture),'order_edited'));$extraRefund->delete(true);
ck('restored_fixture_unchanged',!is_wp_error(tbvsm_plan($fixture)));
$addressFixture=['synthetic'=>true,'customers'=>[['id'=>'sample-address-c','email'=>'tbvsm-address@example.invalid']],'orders'=>[['id'=>'sample-address-o','customerId'=>'sample-address-c','createdAt'=>'2026-02-03T04:05:06Z','historicalStatus'=>'paid','paymentReference'=>'sample-address-pay','itemName'=>'Synthetic address item','quantity'=>1,'subtotal'=>'12.00','shipping'=>'3.00','total'=>'15.00','addresses'=>[
 'billing'=>['first_name'=>'Synthetic Billing','last_name'=>'Synthetic Tester','company'=>'Synthetic Company','address_1'=>'Synthetic 1 Example Street','address_2'=>'Synthetic Suite 2','city'=>'Synthetic City','state'=>'WA','postcode'=>'00000','country'=>'US','email'=>'billing@example.invalid','phone'=>'0000000000'],
 'shipping'=>['first_name'=>'Synthetic Shipping','last_name'=>'Synthetic Tester','company'=>'','address_1'=>'Synthetic 2 Example Street','address_2'=>'','city'=>'Synthetic City','state'=>'WA','postcode'=>'00000','country'=>'US','phone'=>'0000000000'],
]]]];
$addressPlan=tbvsm_plan($addressFixture);ck('synthetic_address_dry_run',!is_wp_error($addressPlan)&&!email_exists('tbvsm-address@example.invalid')&&!tbvsm_orders_for('sample-address-o'));
$badAddress=$addressFixture;$badAddress['orders'][0]['addresses']['billing']['address_1']='1 Real Street';ck('non_synthetic_address_refused',code(tbvsm_plan($badAddress),'invalid_synthetic_address'));
$badAddress=$addressFixture;$badAddress['orders'][0]['addresses']['billing']['email']='real@example.com';ck('non_synthetic_address_email_refused',code(tbvsm_plan($badAddress),'invalid_synthetic_address'));
$badAddress=$addressFixture;$badAddress['orders'][0]['addresses']['shipping']['unexpected']='Synthetic secret';ck('unknown_address_field_refused',code(tbvsm_plan($badAddress),'invalid_synthetic_address'));
$addressApplied=tbvsm_apply($addressFixture);$addressIds=tbvsm_orders_for('sample-address-o');$addressOrder=count($addressIds)===1?wc_get_order($addressIds[0]):null;
ck('synthetic_address_import',!is_wp_error($addressApplied)&&$addressOrder&&tbvsm_addresses_match($addressOrder,$addressFixture['orders'][0]['addresses']));
ck('synthetic_address_repeat_idempotent',!is_wp_error(tbvsm_apply($addressFixture))&&count(tbvsm_orders_for('sample-address-o'))===1);
$addressOrder->set_billing_address_1('Synthetic Changed Address');$addressOrder->save();ck('edited_billing_refused',code(tbvsm_plan($addressFixture),'order_edited'));$addressOrder->set_billing_address_1('Synthetic 1 Example Street');$addressOrder->save();
$addressOrder->set_shipping_city('Synthetic Changed City');$addressOrder->save();ck('edited_shipping_refused',code(tbvsm_plan($addressFixture),'order_edited'));$addressOrder->set_shipping_city('Synthetic City');$addressOrder->save();
ck('restored_addresses_unchanged',!is_wp_error(tbvsm_plan($addressFixture)));
$multi=['synthetic'=>true,'customers'=>[['id'=>'sample-multi-c','email'=>'tbvsm-multi@example.invalid']],'orders'=>[['id'=>'sample-multi-o','customerId'=>'sample-multi-c','createdAt'=>'2026-03-04T05:06:07Z','historicalStatus'=>'paid','paymentReference'=>'sample-multi-payment','items'=>[
 ['id'=>'sample-line-a','name'=>'Synthetic first item','quantity'=>2,'subtotal'=>'20.00','total'=>'20.00'],
 ['id'=>'sample-line-b','name'=>'Synthetic second item','quantity'=>1,'subtotal'=>'7.50','total'=>'7.50'],
 ],'shipping'=>'4.00','total'=>'31.50','addresses'=>$addressFixture['orders'][0]['addresses']]]];
$multiPlan=tbvsm_plan($multi);ck('multi_line_dry_run_no_writes',!is_wp_error($multiPlan)&&!email_exists('tbvsm-multi@example.invalid')&&!tbvsm_orders_for('sample-multi-o'));
$badMulti=$multi;$badMulti['orders'][0]['items'][1]['id']='sample-line-a';ck('duplicate_source_line_refused',code(tbvsm_plan($badMulti),'invalid_lines'));
$badMulti=$multi;$badMulti['orders'][0]['items'][0]['name']='Real item';ck('non_synthetic_line_refused',code(tbvsm_plan($badMulti),'invalid_lines'));
$badMulti=$multi;$badMulti['orders'][0]['items'][0]['unexpected']='Synthetic data';ck('unknown_line_field_refused',code(tbvsm_plan($badMulti),'invalid_lines'));
$badMulti=$multi;$badMulti['orders'][0]['items'][0]['total']='19.00';ck('line_discount_not_guessed',code(tbvsm_plan($badMulti),'invalid_total'));
$badMulti=$multi;$badMulti['orders'][0]['total']='31.51';ck('multi_total_mismatch_refused',code(tbvsm_plan($badMulti),'invalid_total'));
$multiResult=tbvsm_apply($multi);$multiIds=tbvsm_orders_for('sample-multi-o');$multiOrder=count($multiIds)===1?wc_get_order($multiIds[0]):null;$multiUid=email_exists('tbvsm-multi@example.invalid');
ck('multi_line_import',!is_wp_error($multiResult)&&$multiOrder&&tbvsm_order_matches($multiIds[0],$multi['orders'][0],$multiUid)&&count($multiOrder->get_items())===2);
ck('multi_line_repeat_idempotent',!is_wp_error(tbvsm_apply($multi))&&count(tbvsm_orders_for('sample-multi-o'))===1);
$multiItems=array_values($multiOrder->get_items());ck('line_matching_independent_of_item_order',tbvsm_lines_match(array_reverse($multiItems),$multi['orders'][0]));
$multiItems[0]->set_quantity(3);$multiItems[0]->save();ck('edited_line_quantity_refused',code(tbvsm_plan($multi),'order_edited'));$multiItems[0]->set_quantity(2);$multiItems[0]->save();
$multiItems[0]->update_meta_data('_tbvsm_source_line_id','sample-line-b');$multiItems[0]->save();ck('duplicate_destination_line_id_refused',code(tbvsm_plan($multi),'order_edited'));$multiItems[0]->update_meta_data('_tbvsm_source_line_id','sample-line-a');$multiItems[0]->save();
$multiItems[1]->set_total('7.51');$multiItems[1]->save();ck('edited_line_total_refused',code(tbvsm_plan($multi),'order_edited'));$multiItems[1]->set_total('7.50');$multiItems[1]->set_subtotal('7.50');$multiItems[1]->save();
ck('restored_multi_order_unchanged',!is_wp_error(tbvsm_plan($multi)));
$other=wp_insert_user(['user_login'=>'tbvsm-existing','user_email'=>'tbvsm-other@example.invalid','user_pass'=>wp_generate_password(),'role'=>'customer']);update_user_meta($other,'_tbvsm_source_id','sample-c1');ck('duplicate_destination_identity_refused',code(tbvsm_plan($fixture),'journal_target_conflict'));
ck('no_email_event',$mail===0);ck('no_payment_complete_event',$payment===0);ck('no_refund_event',$refund===0);ck('no_stock_reduction_event',$stock===0);echo wp_json_encode(['passed'=>count(array_filter($checks)),'total'=>count($checks),'checks'=>$checks,'hpos'=>\Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()]);
