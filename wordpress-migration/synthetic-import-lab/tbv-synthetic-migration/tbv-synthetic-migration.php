<?php
/**
 * Plugin Name: 10BottleValue Synthetic Migration Lab
 * Description: Isolated customer/order migration rehearsal. Never use real records.
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) exit;

// Development code only. This plugin registers no routes, forms, cron or hooks.
// An explicitly marked isolated WordPress test runtime must call these functions.
function tbvsm_guard() {
    if (!defined('TBV_SYNTHETIC_WOO_TEST') || TBV_SYNTHETIC_WOO_TEST !== true ||
        !defined('WP_HTTP_BLOCK_EXTERNAL') || WP_HTTP_BLOCK_EXTERNAL !== true ||
        !defined('DISABLE_WP_CRON') || DISABLE_WP_CRON !== true ||
        !function_exists('wc_create_order')) return new WP_Error('test_runtime_required');
    return true;
}
function tbvsm_id($s) { return is_string($s) && preg_match('/^sample-[a-z0-9-]{1,47}$/D', $s); }
function tbvsm_email($s) { return is_string($s) && preg_match('/^[a-z0-9][a-z0-9._+-]*@example\.invalid$/D', $s); }
function tbvsm_cents($s) {
    if (!is_string($s) || !preg_match('/^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,2}))?$/D', $s, $m)) return false;
    return ((int)$m[1])*100 + (int)str_pad($m[2] ?? '', 2, '0');
}
function tbvsm_fingerprint($row) { return hash('sha256', wp_json_encode($row)); }
function tbvsm_users_for($id) {
    return get_users(['meta_key'=>'_tbvsm_source_id','meta_value'=>$id,'fields'=>'ids','number'=>3]);
}
function tbvsm_orders_for($id) {
    global $wpdb;
    if (class_exists('Automattic\\WooCommerce\\Utilities\\OrderUtil') && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()) {
        $orders=$wpdb->prefix.'wc_orders'; $meta=$wpdb->prefix.'wc_orders_meta';
        return $wpdb->get_col($wpdb->prepare("SELECT o.id FROM {$orders} o INNER JOIN {$meta} m ON m.order_id=o.id WHERE o.type='shop_order' AND m.meta_key='_tbvsm_source_id' AND m.meta_value=%s LIMIT 3",$id));
    }
    // Explicit postmeta lookup includes trash and unusual statuses; Woo's
    // default order queries can omit them and cause accidental re-creation.
    return $wpdb->get_col($wpdb->prepare("SELECT p.ID FROM {$wpdb->posts} p INNER JOIN {$wpdb->postmeta} m ON m.post_id=p.ID WHERE p.post_type='shop_order' AND m.meta_key='_tbvsm_source_id' AND m.meta_value=%s LIMIT 3",$id));
}
function tbvsm_customer_matches($uid,$row) {
    $u=get_userdata($uid);
    return $u && $u->user_email===$row['email'] && get_user_meta($uid,'_tbvsm_source_id',true)===$row['id'] && get_user_meta($uid,'_tbvsm_fingerprint',true)===tbvsm_fingerprint($row);
}
function tbvsm_order_matches($oid,$row,$uid) {
    $o=wc_get_order($oid); if (!$o || $o->get_customer_id()!==(int)$uid || $o->get_status()!=='pending' || $o->get_date_paid() || $o->get_currency()!=='USD') return false;
    $items=array_values($o->get_items()); $ship=array_values($o->get_items('shipping'));
    return count($items)===1 && count($ship)===1 && $items[0]->get_name()===$row['itemName'] && $items[0]->get_quantity()===$row['quantity'] &&
      tbvsm_cents(wc_format_decimal($items[0]->get_total(),2))===tbvsm_cents($row['subtotal']) &&
      tbvsm_cents(wc_format_decimal($o->get_shipping_total(),2))===tbvsm_cents($row['shipping']) &&
      tbvsm_cents(wc_format_decimal($o->get_total(),2))===tbvsm_cents($row['total']) &&
      $o->get_meta('_tbvsm_source_id')===$row['id'] && $o->get_meta('_tbvsm_fingerprint')===tbvsm_fingerprint($row) &&
      $o->get_meta('_tbvsm_historical_status')===$row['historicalStatus'] && $o->get_meta('_tbvsm_payment_reference')===$row['paymentReference'] &&
      $o->get_date_created() && $o->get_date_created()->getTimestamp()===strtotime($row['createdAt']);
}
function tbvsm_plan($data) {
    $guard=tbvsm_guard(); if (is_wp_error($guard)) return $guard;
    if (!is_array($data) || array_keys($data)!==['synthetic','customers','orders'] || $data['synthetic']!==true || !is_array($data['customers']) || !is_array($data['orders']) || count($data['customers'])>25 || count($data['orders'])>25) return new WP_Error('invalid_fixture');
    $seen=[];$emails=[];$resolved=[];$ops=[];
    foreach ($data['customers'] as $c) {
        if (!is_array($c) || array_keys($c)!==['id','email'] || !tbvsm_id($c['id']) || !tbvsm_email($c['email']) || isset($seen['c'.$c['id']]) || isset($emails[$c['email']])) return new WP_Error('invalid_customer');
        $seen['c'.$c['id']]=true; $emails[$c['email']]=true; $ids=tbvsm_users_for($c['id']); $byemail=email_exists($c['email']); $bylogin=username_exists('tbvsm-'.$c['id']);
        if ($bylogin && (count($ids)!==1 || (int)$ids[0]!== (int)$bylogin)) return new WP_Error('customer_identity_conflict');
        if (count($ids)>1 || ($byemail && (count($ids)!==1 || (int)$ids[0]!== (int)$byemail))) return new WP_Error('customer_identity_conflict');
        if ($ids && !tbvsm_customer_matches($ids[0],$c)) return new WP_Error('customer_edited');
        $resolved[$c['id']]=$ids ? (int)$ids[0] : null; $ops[]=['kind'=>'customer','id'=>$c['id'],'action'=>$ids?'unchanged':'create'];
    }
    foreach ($data['orders'] as $o) {
        if (!is_array($o) || array_keys($o)!==['id','customerId','createdAt','historicalStatus','paymentReference','itemName','quantity','subtotal','shipping','total'] || !tbvsm_id($o['id']) || isset($seen['o'.$o['id']]) || !tbvsm_id($o['customerId']) || !array_key_exists($o['customerId'],$resolved) || !tbvsm_id($o['paymentReference']) || !in_array($o['historicalStatus'],['pending','paid','cancelled','refunded'],true) || !is_string($o['itemName']) || !preg_match('/^Synthetic [A-Za-z0-9 -]{1,60}$/D',$o['itemName']) || !is_int($o['quantity']) || $o['quantity']<1 || $o['quantity']>100) return new WP_Error('invalid_order');
        if (!is_string($o['createdAt'])) return new WP_Error('invalid_timestamp');
        $seen['o'.$o['id']]=true; $time=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z',$o['createdAt']);
        if (!$time || $time->format('Y-m-d\TH:i:s\Z')!==$o['createdAt']) return new WP_Error('invalid_timestamp');
        $sub=tbvsm_cents($o['subtotal']);$shipping=tbvsm_cents($o['shipping']);$total=tbvsm_cents($o['total']);
        if ($sub===false || $shipping===false || $total===false || $sub+$shipping!==$total) return new WP_Error('invalid_total');
        $ids=tbvsm_orders_for($o['id']); if(count($ids)>1) return new WP_Error('order_identity_conflict');
        if ($ids && (!$resolved[$o['customerId']] || !tbvsm_order_matches($ids[0],$o,$resolved[$o['customerId']]))) return new WP_Error('order_edited');
        $ops[]=['kind'=>'order','id'=>$o['id'],'action'=>$ids?'unchanged':'create'];
    }
    return ['operations'=>$ops,'customers'=>$resolved];
}
function tbvsm_apply($data) {
    $guard=tbvsm_guard(); if(is_wp_error($guard)) return $guard;
    if(!add_option('_tbvsm_lab_lock','held','','no')) return new WP_Error('locked');
    try {
        $plan=tbvsm_plan($data); if(is_wp_error($plan)) return $plan;
        // Explicitly suppress wp_mail for this local test only; external HTTP and
        // cron are already blocked by the runtime guard. No payment_complete.
        $suppress=function(){return true;}; add_filter('pre_wp_mail',$suppress,PHP_INT_MAX);
        try {
            $ids=$plan['customers'];
            foreach($data['customers'] as $c) if(!$ids[$c['id']]) {
                $uid=wp_insert_user(['user_login'=>'tbvsm-'.$c['id'],'user_email'=>$c['email'],'user_pass'=>wp_generate_password(40,true,true),'role'=>'customer']);
                if(is_wp_error($uid)) return $uid;
                update_user_meta($uid,'_tbvsm_source_id',$c['id']); update_user_meta($uid,'_tbvsm_fingerprint',tbvsm_fingerprint($c)); $ids[$c['id']]=(int)$uid;
            }
            foreach($data['orders'] as $o) if(!tbvsm_orders_for($o['id'])) {
                $order=wc_create_order(['customer_id'=>$ids[$o['customerId']],'status'=>'pending','created_via'=>'tbv_synthetic_migration']);
                if(is_wp_error($order)) return $order;
                $order->set_currency('USD'); $order->set_date_created($o['createdAt']);
                $item=new WC_Order_Item_Product(); $item->set_name($o['itemName']); $item->set_quantity($o['quantity']); $item->set_subtotal($o['subtotal']); $item->set_total($o['subtotal']); $order->add_item($item);
                $ship=new WC_Order_Item_Shipping(); $ship->set_method_title('Synthetic shipping'); $ship->set_total($o['shipping']); $order->add_item($ship);
                $order->set_shipping_total($o['shipping']); $order->set_total($o['total']);
                $order->update_meta_data('_tbvsm_source_id',$o['id']); $order->update_meta_data('_tbvsm_fingerprint',tbvsm_fingerprint($o));
                $order->update_meta_data('_tbvsm_historical_status',$o['historicalStatus']); $order->update_meta_data('_tbvsm_payment_reference',$o['paymentReference']);
                $order->save();
            }
        } finally {remove_filter('pre_wp_mail',$suppress,PHP_INT_MAX);}
        return $plan['operations'];
    } finally {delete_option('_tbvsm_lab_lock');}
}
