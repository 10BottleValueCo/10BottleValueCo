<?php
/** Plugin Name: TBV Synthetic Checkout Lab. Disposable testing only. */
defined('ABSPATH') || exit;
function tbv_checkout_lab_allowed(){return defined('TBV_DISPOSABLE_CHECKOUT') && TBV_DISPOSABLE_CHECKOUT === true && defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL === true && defined('DISABLE_WP_CRON') && DISABLE_WP_CRON === true && wp_get_environment_type() === 'local' && wp_parse_url(home_url(),PHP_URL_HOST)==='127.0.0.1';}
if (!tbv_checkout_lab_allowed()) return;
add_filter('pre_wp_mail', function(){update_option('tbv_lab_mail_attempts',(int)get_option('tbv_lab_mail_attempts',0)+1,false);return true;}, PHP_INT_MAX);
add_action('woocommerce_payment_complete',function(){update_option('tbv_lab_payment_complete',(int)get_option('tbv_lab_payment_complete',0)+1,false);});
add_action('woocommerce_reduce_order_stock',function(){update_option('tbv_lab_stock_reduced',(int)get_option('tbv_lab_stock_reduced',0)+1,false);});
add_action('plugins_loaded',function(){
 if (!class_exists('WC_Payment_Gateway')) return;
 class TBV_Synthetic_Gateway extends WC_Payment_Gateway {
  public function __construct(){ $this->id='tbv_synthetic_only';$this->title='Synthetic test — no payment';$this->method_title='Synthetic test only';$this->enabled='yes';$this->has_fields=false;$this->supports=['products'];}
  public function is_available(){return tbv_checkout_lab_allowed() && parent::is_available();}
  public function process_payment($order_id){
   $order=wc_get_order($order_id);if(!tbv_checkout_lab_allowed() || !$order || !str_ends_with($order->get_billing_email(),'@example.invalid')) return ['result'=>'failure'];
   foreach($order->get_items() as $item){if(!str_starts_with($item->get_name(),'Synthetic '))return ['result'=>'failure'];}
   $order->update_meta_data('_tbv_lab_no_payment', 'true');$order->save();WC()->cart->empty_cart();
   return ['result'=>'success','redirect'=>$this->get_return_url($order)];
  }
 }
 add_filter('woocommerce_payment_gateways',function($methods){$methods[]='TBV_Synthetic_Gateway';return $methods;});
},20);
