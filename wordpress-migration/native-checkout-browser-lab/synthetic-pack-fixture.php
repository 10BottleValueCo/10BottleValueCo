<?php
/**
 * Non-production fixture. Invoke only after mounting a disposable database and
 * defining TBV_DISPOSABLE_FIXTURE and WP_ENVIRONMENT_TYPE=local. Do not publish.
 */
if (!defined('TBV_DISPOSABLE_FIXTURE') || TBV_DISPOSABLE_FIXTURE !== true || wp_get_environment_type() !== 'local') {
    throw new RuntimeException('Synthetic fixture requires an explicitly disposable local database');
}
function tbv_create_synthetic_pack_fixture() {
    if (!class_exists('WC_Product_Variable') || !class_exists('WC_Product_Variation')) throw new RuntimeException('WooCommerce required');
    $product = new WC_Product_Variable();
    $product->set_name('Synthetic Checkout Fixture Do Not Sell');
    $product->set_status('publish');
    $product->set_catalog_visibility('visible');
    $attributes=[];
    foreach ([
        'dosage'=>['10 mg'],
        'pack-size'=>['1','5','10'],
        'warehouse'=>['worldwide','us'],
        'formulation'=>['with/d','no/d'],
    ] as $name=>$options) {
        $attribute = new WC_Product_Attribute();
        $attribute->set_name($name);
        $attribute->set_options($options);
        $attribute->set_visible(true);
        $attribute->set_variation(true);
        $attributes[]=$attribute;
    }
    $product->set_attributes($attributes);
    $parentId=$product->save();
    $offers=[];
    foreach (['worldwide','us'] as $warehouse) {
        foreach (['with/d','no/d'] as $formula) {
            foreach ([1,5,10] as $pack) {
                // Unique price encodes every dimension; never from merchant data.
                $price = $pack*10 + ($warehouse === 'us' ? 3 : 0) + ($formula === 'with/d' ? 1 : 0);
                $variation=new WC_Product_Variation();
                $variation->set_parent_id($parentId);
                $variation->set_status('publish');
                $variation->set_attributes(['dosage'=>'10 mg','pack-size'=>(string)$pack,'warehouse'=>$warehouse,'formulation'=>$formula]);
                $variation->set_regular_price((string)$price);
                $variation->set_manage_stock(false);
                $variation->set_stock_status('instock');
                $variation->update_meta_data('_tbv_warehouse',$warehouse);
                $variation->update_meta_data('_tbv_dose','10 mg');
                $variation->update_meta_data('_tbv_pack_size',(string)$pack);
                $variation->update_meta_data('_tbv_note_label',$formula);
                $id=$variation->save();
                $offers[]=['id'=>$id,'parent_id'=>$parentId,'dose'=>'10 mg','pack'=>$pack,'warehouse'=>$warehouse,'formulation'=>$formula,'price'=>(string)$price];
            }
        }
    }
    WC_Product_Variable::sync($parentId);
    wc_delete_product_transients($parentId);
    return ['parent_id'=>$parentId,'offers'=>$offers];
}
