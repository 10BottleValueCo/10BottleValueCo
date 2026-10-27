<?php
/**
 * Plugin Name: 10BottleValue WooCommerce Catalog Import (Development)
 * Description: Admin-only dry-run and draft catalog import using a source-attributed public snapshot.
 * Version: 0.1.0
 * Requires Plugins: woocommerce
 * Requires PHP: 8.1
 */
defined('ABSPATH') || exit;

// This development importer must only write to an isolated staging fixture.
function tbvi_staging_enabled() {
    return defined('TBV_CATALOG_IMPORT_STAGING') && TBV_CATALOG_IMPORT_STAGING === true
        && function_exists('wp_get_environment_type')
        && in_array(wp_get_environment_type(), ['local', 'staging'], true)
        && defined('DISABLE_WP_CRON') && DISABLE_WP_CRON === true
        && defined('WP_HTTP_BLOCK_EXTERNAL') && WP_HTTP_BLOCK_EXTERNAL === true;
}
function tbvi_staging_error() {
    return new WP_Error('staging_required', 'The development catalog importer requires an isolated staging environment.');
}
function tbvi_valid_text($value, $max = 160, $allow_empty = false) {
    if (!is_string($value)) return false;
    return strlen($value) <= $max && ($allow_empty || trim($value) !== '') && sanitize_text_field($value) === $value;
}
function tbvi_parent_key($catalog_name) { return 'tbv-p-' . substr(hash('sha256', $catalog_name), 0, 24); }
function tbvi_casefold($text) { return mb_convert_case((string)$text, MB_CASE_FOLD, 'UTF-8'); }
function tbvi_offer_identity($parent,$dose,$pack,$warehouse,$note) {
    return wp_json_encode([$parent,sanitize_title($dose),(int)$pack,sanitize_title($warehouse),sanitize_title($note!==''?$note:'Standard')]);
}
function tbvi_product_ids($meta_key, $value) {
    return get_posts(['post_type'=>['product','product_variation'],'post_status'=>['publish','draft','pending','private','future','trash','inherit'],'numberposts'=>3,'fields'=>'ids','meta_key'=>$meta_key,'meta_value'=>$value]);
}
/** Resolve only bundled files; never retrieve customer-provided URLs. */
function tbvi_asset_path($relative) {
    $base=realpath(__DIR__.'/assets');$path=realpath(__DIR__.'/assets/'.$relative);
    if(!$base || !$path || strpos($path,$base.DIRECTORY_SEPARATOR)!==0 || !is_file($path))return false;
    return $path;
}
function tbvi_verify_existing_asset($relative) {
    $source=tbvi_asset_path($relative);if(!$source)return new WP_Error('missing_asset','Bundled media is missing: '.$relative);
    $assetKey=hash('sha256',$relative);$ids=get_posts(['post_type'=>'attachment','post_status'=>['inherit','private','trash'],'numberposts'=>3,'fields'=>'ids','meta_key'=>'_tbvi_asset_key','meta_value'=>$assetKey]);
    if(count($ids)>1)return new WP_Error('duplicate_asset','Multiple attachments have the same importer identity: '.$relative);
    if($ids){if(!get_post($ids[0]) || get_post($ids[0])->post_status!=='inherit')return new WP_Error('asset_edited','A previously imported attachment is no longer active: '.$relative);$file=get_attached_file($ids[0]);$sourceHash=get_post_meta($ids[0],'_tbvi_asset_sha256',true);$attachedHash=get_post_meta($ids[0],'_tbvi_attached_sha256',true);
        if(!$file || !is_file($file) || !$sourceHash || !$attachedHash || !hash_equals($sourceHash,hash_file('sha256',$source)) || !hash_equals($attachedHash,hash_file('sha256',$file)))return new WP_Error('asset_edited','Previously imported media is missing or edited: '.$relative);
    }
    return true;
}
function tbvi_asset_id($relative,$parent_id) {
    $source=tbvi_asset_path($relative);if(!$source)throw new Exception('Bundled media is missing: '.$relative);
    $assetKey=hash('sha256',$relative);$ids=get_posts(['post_type'=>'attachment','post_status'=>['inherit','private','trash'],'numberposts'=>3,'fields'=>'ids','meta_key'=>'_tbvi_asset_key','meta_value'=>$assetKey]);
    if(count($ids)>1)throw new Exception('Duplicate imported media identity: '.$relative);
    if($ids){if(!get_post($ids[0]) || get_post($ids[0])->post_status!=='inherit')throw new Exception('Previously imported media is no longer active: '.$relative);$file=get_attached_file($ids[0]);if(!$file || !is_file($file))throw new Exception('Previously imported media is missing: '.$relative);$sourceHash=get_post_meta($ids[0],'_tbvi_asset_sha256',true);$attachedHash=get_post_meta($ids[0],'_tbvi_attached_sha256',true);if(!$sourceHash || !$attachedHash || !hash_equals($sourceHash,hash_file('sha256',$source)) || !hash_equals($attachedHash,hash_file('sha256',$file)))throw new Exception('Previously imported media differs from this source: '.$relative);return (int)$ids[0];}
    $name=basename($source);$type=wp_check_filetype($name);if(empty($type['type']))throw new Exception('Unsupported bundled media type: '.$name);
    $bytes=file_get_contents($source);if($bytes===false)throw new Exception('Unable to read bundled media.');
    $upload=wp_upload_bits($name,null,$bytes);if(!empty($upload['error']))throw new Exception('Unable to copy media: '.$upload['error']);
    $id=wp_insert_attachment(['post_mime_type'=>$type['type'],'post_title'=>sanitize_file_name(pathinfo($name,PATHINFO_FILENAME)),'post_status'=>'inherit'],$upload['file'],$parent_id,true);
    if(is_wp_error($id) || !$id){wp_delete_file($upload['file']);throw new Exception('Unable to register media: '.$name);}
    update_post_meta($id,'_tbvi_asset_key',$assetKey);update_post_meta($id,'_tbvi_asset_relative_path',$relative);update_post_meta($id,'_tbvi_asset_sha256',hash_file('sha256',$source));
    // Original files work even where image editors are unavailable. Generate
    // WP image metadata when the environment supports it.
    require_once ABSPATH.'wp-admin/includes/image.php';$metadata=wp_generate_attachment_metadata($id,$upload['file']);if(is_array($metadata))wp_update_attachment_metadata($id,$metadata);
    $attached=get_attached_file($id);if(!$attached || !is_file($attached))throw new Exception('Registered media file is missing: '.$name);update_post_meta($id,'_tbvi_attached_sha256',hash_file('sha256',$attached));
    return (int)$id;
}
function tbvi_parent_snapshot($product) {
    $saved=['name'=>$product->get_name('edit'),'image_id'=>(int)$product->get_image_id('edit'),'attributes'=>[],'meta'=>[]];$attrs=$product->get_attributes('edit');
    foreach(['dosage','pack-size','warehouse','formulation'] as $key){$a=$attrs[$key]??null;$saved['attributes'][$key]=$a && is_a($a,'WC_Product_Attribute')?['name'=>$a->get_name(),'options'=>$a->get_options(),'visible'=>$a->get_visible(),'variation'=>$a->get_variation(),'taxonomy'=>$a->is_taxonomy()]:null;}
    foreach(['_tbvi_parent_key','_tbvi_source_catalog_name','_tbvi_source_commit','_tbvi_source_extracted_at'] as $key)$saved['meta'][$key]=$product->get_meta($key,true,'edit');
    return $saved;
}
function tbvi_variation_snapshot($variation) {
    $attrs=$variation->get_attributes('edit');ksort($attrs);
    $saved=['status'=>$variation->get_status('edit'),'regular_price'=>wc_format_decimal($variation->get_regular_price('edit'),2),'image_id'=>(int)$variation->get_image_id('edit'),'manage_stock'=>(bool)$variation->get_manage_stock('edit'),'stock_status'=>$variation->get_stock_status('edit'),'attributes'=>$attrs,'meta'=>[]];
    foreach(['_tbv_migration_key','_tbv_warehouse','_tbv_dose','_tbv_pack_size','_tbv_note_label','_tbv_vial_image','_tbv_coa_images','_tbv_coa_pdf','_tbvi_coa_image_ids','_tbvi_coa_pdf_id','_tbvi_stock_evidence','_tbvi_source_commit','_tbvi_source_extracted_at','_tbvi_source_index','_tbvi_currentSlug','_tbvi_legacyCanonicalSlug','_tbvi_restoredSlug','_tbvi_currentUrl'] as $key)$saved['meta'][$key]=$variation->get_meta($key,true,'edit');
    return $saved;
}
/** Validate the entire input and discover conflicts before writing any record. */
function tbvi_plan($data) {
    if (!function_exists('wc_get_products') || !class_exists('WC_Product_Variable')) return new WP_Error('woocommerce_missing', 'WooCommerce must be active.');
    if (!function_exists('mb_convert_case') || !defined('MB_CASE_FOLD')) return new WP_Error('mbstring_required', 'PHP mbstring with Unicode case-folding is required for safe product-name collision checks.');
    if (!is_array($data) || ($data['schemaVersion'] ?? null) !== 1 || ($data['customerDataIncluded'] ?? null) !== false || ($data['supplierDataIncluded'] ?? null) !== false || !is_array($data['rows'] ?? null) || count($data['rows']) < 1 || count($data['rows']) > 1000) return new WP_Error('bad_document', 'Invalid catalog document or privacy flags.');
    if (!is_string($data['sourceCommit']??null) || !preg_match('/^[a-f0-9]{40}$/D',$data['sourceCommit']) || !is_string($data['extractedAt']??null) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/D',$data['extractedAt']) || strtotime($data['extractedAt'])===false) return new WP_Error('bad_provenance', 'A source commit and UTC extraction time are required.');
    if(get_woocommerce_currency()!=='USD')return new WP_Error('currency_mismatch','The source prices are USD; the WooCommerce store currency must match.');
    $groups=[]; $keys=[]; $identities=[]; $assetPaths=[]; $sourceIndices=[];
    foreach ($data['rows'] as $row) {
        if (!is_array($row) || !is_string($row['migrationKey'] ?? null) || !preg_match('/^tbv-[a-f0-9]{16}$/D', $row['migrationKey'])) return new WP_Error('bad_key', 'Each offer needs a valid migration key.');
        $key=$row['migrationKey']; if (isset($keys[$key])) return new WP_Error('duplicate_key', 'Duplicate migration key: ' . $key); $keys[$key]=true;
        foreach (['catalogName','name','dose'] as $field) if (!tbvi_valid_text($row[$field] ?? null)) return new WP_Error('bad_field', 'Invalid offer field: ' . $field);
        if (!tbvi_valid_text($row['noteLabel'] ?? '', 160, true)) return new WP_Error('bad_field','Invalid formulation.');
        if (!is_int($row['packCount'] ?? null) || $row['packCount'] < 1 || $row['packCount'] > 1000 || !in_array($row['warehouse'] ?? null, ['us','worldwide'], true) || ($row['currency'] ?? '') !== 'USD') return new WP_Error('bad_offer', 'Invalid warehouse, pack or currency.');
        if(!is_int($row['sourceIndex']??null) || $row['sourceIndex']<0)return new WP_Error('bad_source_index','Invalid source index.');
        if(isset($sourceIndices[$row['sourceIndex']]))return new WP_Error('duplicate_source_index','Duplicate source index.');$sourceIndices[$row['sourceIndex']]=true;
        foreach(['currentSlug','legacyCanonicalSlug','restoredSlug'] as $slugKey)if(!is_string($row[$slugKey]??null)||!preg_match('/^[a-z0-9][a-z0-9.-]{0,179}$/D',$row[$slugKey])||strpos($row[$slugKey],'..')!==false)return new WP_Error('bad_slug','Invalid source slug.');
        $sourceUrl=$row['currentUrl']??null;$parsed=is_string($sourceUrl)?wp_parse_url($sourceUrl):false;
        if(!$parsed || ($parsed['scheme']??'')!=='https' || ($parsed['host']??'')!=='10bottlevalue.co' || ($parsed['path']??'')!=='/'.$row['currentSlug'] || isset($parsed['user']) || isset($parsed['pass']) || isset($parsed['port']) || isset($parsed['query']) || isset($parsed['fragment']))return new WP_Error('bad_source_url','Invalid source URL.');
        $price=$row['price'] ?? null; if ((!is_int($price) && !is_float($price) && !is_string($price)) || !preg_match('/^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/D', (string)$price)) return new WP_Error('bad_price', 'Invalid price for ' . $key);
        if (!in_array($row['stockStatus'] ?? null, ['instock','outofstock'],true) || ($row['stockQuantity'] ?? null) !== null || !tbvi_valid_text($row['stockEvidence'] ?? null, 240)) return new WP_Error('bad_stock', 'Stock must include explicit source evidence and unknown physical quantity.');
        $image=ltrim((string)($row['image'] ?? ''),'/'); if ($image !== '' && !preg_match('#^(?:vials-c/[a-zA-Z0-9_-]+\.(?:webp|png|jpg|jpeg)(?:\?label=[a-zA-Z0-9_-]+)?|images/vial-image-pending\.svg)$#D',$image)) return new WP_Error('bad_image','Invalid local image reference.');
        if($image!=='' && !tbvi_asset_path(explode('?',$image,2)[0]))return new WP_Error('missing_image','A referenced image is not bundled.');
        if($image!=='' && explode('?',$image,2)[0]!=='images/vial-image-pending.svg')$assetPaths[explode('?',$image,2)[0]]=true;
        if(!is_array($row['coaImages']??null) || count($row['coaImages'])>20)return new WP_Error('bad_documents','Invalid COA image list.');
        foreach($row['coaImages'] as $document)if(!is_string($document)||!preg_match('/^coa-[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/D',$document)||!tbvi_asset_path('documents/'.$document))return new WP_Error('bad_documents','Invalid or missing COA image.');
        $pdf=$row['coaPdf']??null;if($pdf!==null && (!is_string($pdf)||!preg_match('/^coa-[a-zA-Z0-9_-]+\.pdf$/D',$pdf)||!tbvi_asset_path('documents/'.$pdf)))return new WP_Error('bad_documents','Invalid or missing COA PDF.');
        foreach($row['coaImages'] as $document)$assetPaths['documents/'.$document]=true;if($pdf!==null)$assetPaths['documents/'.$pdf]=true;
        $note=$row['noteLabel'] ?? ''; $parent=tbvi_parent_key($row['catalogName']);
        // WooCommerce matches custom-attribute slugs; catch identities that
        // differ as text but normalize to the same selectable variant.
        $identity=tbvi_offer_identity($parent,$row['dose'],$row['packCount'],$row['warehouse'],$note);
        if(isset($identities[$identity])) return new WP_Error('duplicate_offer', 'Duplicate offer identity.');$identities[$identity]=true;
        if(isset($groups[$parent]) && $groups[$parent]['name'] !== $row['name']) return new WP_Error('conflicting_name','Conflicting names under one source identity.');
        $groups[$parent]['catalogName']=$row['catalogName']; $groups[$parent]['name']=$row['name'];$groups[$parent]['rows'][]=$row;
    }
    foreach(array_keys($assetPaths) as $asset){$check=tbvi_verify_existing_asset($asset);if(is_wp_error($check))return $check;}
    // Never claim a pre-existing store product or an offer created by another importer.
    $known=wc_get_products(['status'=>['publish','draft','pending','private','future','trash'],'type'=>['simple','variable'],'limit'=>-1]);$existing_names=[];
    foreach($known as $p) $existing_names[tbvi_casefold($p->get_name())]=true;
    $counts=['new_products'=>0,'existing_products'=>0,'new_variations'=>0,'existing_variations'=>0,'offers'=>count($keys),'products'=>count($groups)];
    foreach($groups as $parentKey=>&$group){
        $parentIds=tbvi_product_ids('_tbvi_parent_key',$parentKey);if(count($parentIds)>1)return new WP_Error('duplicate_parent','Multiple products have source identity ' . $parentKey);
        $parentId=$parentIds ? (int)$parentIds[0] : 0;
        if(!$parentId && isset($existing_names[tbvi_casefold($group['name'])])) return new WP_Error('unowned_collision','A product with this name already exists under a different identity: '.$group['name']);
        if($parentId){$parent=wc_get_product($parentId);if(!$parent || !$parent->is_type('variable'))return new WP_Error('wrong_parent_type','An owned parent is not a variable product.');if($parent->get_status('edit')!=='draft')return new WP_Error('published_parent','Only draft products can be updated by this development importer.');$baseline=$parent->get_meta('_tbvi_last_parent_snapshot',true,'edit');if(!is_array($baseline)||wp_json_encode($baseline)!==wp_json_encode(tbvi_parent_snapshot($parent)))return new WP_Error('parent_edited','An imported parent name or managed attribute was edited; review it before re-importing.');$counts['existing_products']++;}else $counts['new_products']++;
        $group['parentId']=$parentId;$existingIdentities=[];
        if($parentId){$childIds=get_posts(['post_type'=>'product_variation','post_parent'=>$parentId,'post_status'=>['publish','draft','pending','private','future','trash','inherit'],'numberposts'=>-1,'fields'=>'ids']);foreach($childIds as $childId){
            $child=wc_get_product($childId);if(!$child || !$child->is_type('variation') || $child->get_meta('_tbvi_managed',true)!=='yes')return new WP_Error('unowned_child','An imported parent has a variation not owned by this importer.');
            $dose=(string)$child->get_meta('_tbv_dose',true,'edit');$pack=(int)$child->get_meta('_tbv_pack_size',true,'edit');$warehouse=(string)$child->get_meta('_tbv_warehouse',true,'edit');$note=(string)$child->get_meta('_tbv_note_label',true,'edit');
            if($dose===''||$pack<1||!in_array($warehouse,['us','worldwide'],true))return new WP_Error('invalid_existing_identity','An existing offer is missing identity fields.');
            $identity=tbvi_offer_identity($parentKey,$dose,$pack,$warehouse,$note);if(isset($existingIdentities[$identity]))return new WP_Error('duplicate_existing_identity','Existing offers have the same selector identity.');$existingIdentities[$identity]=(int)$childId;
        }}
        foreach($group['rows'] as &$row){
            $ids=tbvi_product_ids('_tbv_migration_key',$row['migrationKey']);if(count($ids)>1)return new WP_Error('duplicate_existing_offer','More than one existing variation uses ' . $row['migrationKey']);
            $id=$ids ? (int)$ids[0] : 0;$identity=tbvi_offer_identity($parentKey,$row['dose'],$row['packCount'],$row['warehouse'],$row['noteLabel']??'');
            if(isset($existingIdentities[$identity]) && $existingIdentities[$identity]!==$id)return new WP_Error('existing_variant_identity','An existing offer has the same selector identity under a different source key: '.$row['migrationKey']);
            if($id){$variation=wc_get_product($id);if(!$variation || !$variation->is_type('variation') || !$parentId || $variation->get_parent_id() !== $parentId || $variation->get_meta('_tbvi_managed',true)!=='yes')return new WP_Error('unowned_offer_collision','Existing offer is not owned by this importer: '.$row['migrationKey']);if($variation->get_manage_stock('edit'))return new WP_Error('managed_inventory','An existing variation has managed inventory; it will not be overwritten.');$baseline=$variation->get_meta('_tbvi_last_snapshot',true,'edit');if(!is_array($baseline)||wp_json_encode($baseline)!==wp_json_encode(tbvi_variation_snapshot($variation)))return new WP_Error('variation_edited','An imported variation was edited; review it before re-importing: '.$row['migrationKey']);
                $oldImage=(string)$variation->get_meta('_tbv_vial_image',true,'edit');$newImage=ltrim((string)($row['image']??''),'/');if($oldImage!==$newImage)return new WP_Error('source_image_changed','An imported offer image changed in the source; review it before re-importing: '.$row['migrationKey']);
                $oldDocs=(array)$variation->get_meta('_tbv_coa_images',true,'edit');if(array_diff($oldDocs,$row['coaImages']))return new WP_Error('source_documents_removed','A previously imported COA image is absent from the new source: '.$row['migrationKey']);$oldPdf=(string)$variation->get_meta('_tbv_coa_pdf',true,'edit');if($oldPdf!==''&&empty($row['coaPdf']))return new WP_Error('source_documents_removed','A previously imported COA PDF is absent from the new source: '.$row['migrationKey']);
                $counts['existing_variations']++;}else $counts['new_variations']++;
            $row['existingId']=$id;
        }unset($row);
    }unset($group);
    return ['groups'=>$groups,'counts'=>$counts,'sourceCommit'=>$data['sourceCommit'],'extractedAt'=>$data['extractedAt']];
}
function tbvi_make_attribute($name,$options) {
    $a=new WC_Product_Attribute();$a->set_id(0);$a->set_name($name);$a->set_options(array_values(array_unique($options)));$a->set_visible(true);$a->set_variation(true);return $a;
}
/** Apply a validated plan. New products stay drafts; removed rows are never deleted. */
function tbvi_apply($data,$jobId=null) {
    if(!tbvi_staging_enabled())return tbvi_staging_error();
    $active=(string)get_option('_tbvi_active_job','');
    if($active!=='' && (!is_string($jobId) || !hash_equals($active,$jobId)))return new WP_Error('job_active','A catalog import job is active. Resume or cancel it before starting another import.');
    // An option is a database-unique lock, unlike a check-then-set transient.
    // No automatic expiration: after an interrupted import an operator must
    // inspect partial records before deliberately clearing the lock.
    if(!add_option('_tbvi_import_lock', time(), '', false))return new WP_Error('import_locked','Another import or an interrupted import holds the lock. Inspect it before retrying.');
    $processed=0;
    try {
        $plan=tbvi_plan($data);if(is_wp_error($plan))return $plan;
        foreach($plan['groups'] as $parentKey=>$group){
            $parent=$group['parentId'] ? wc_get_product($group['parentId']) : new WC_Product_Variable();
            if(!$parent || !$parent->is_type('variable')) throw new Exception('Parent unavailable');
            $isNew=!$group['parentId'];$parent->set_name($group['name']);if($isNew)$parent->set_status('draft');
            $parent->update_meta_data('_tbvi_parent_key',$parentKey);$parent->update_meta_data('_tbvi_source_catalog_name',$group['catalogName']);
            $parent->update_meta_data('_tbvi_source_commit',$plan['sourceCommit']);$parent->update_meta_data('_tbvi_source_extracted_at',$plan['extractedAt']);
            // Merge existing attributes to avoid removing previously imported options or custom fields.
            $attributes=$parent->get_attributes('edit');
            foreach(['dosage','pack-size','warehouse','formulation'] as $field){
                $options=[];foreach($group['rows'] as $row){$options[]=$field==='dosage'?$row['dose']:($field==='pack-size'?(string)$row['packCount']:($field==='warehouse'?$row['warehouse']:(($row['noteLabel']??'')!==''?$row['noteLabel']:'Standard')));}
                $existing=$attributes[$field]??null;if($existing && is_a($existing,'WC_Product_Attribute'))$options=array_merge($existing->get_options(),$options);
                $attributes[$field]=tbvi_make_attribute($field,$options);
            }
            $parent->set_attributes($attributes);$parentId=$parent->save();if(!$parentId)throw new Exception('Unable to save parent');
            $parent=wc_get_product($parentId);$parent->update_meta_data('_tbvi_last_parent_snapshot',tbvi_parent_snapshot($parent));$parent->save();
            foreach($group['rows'] as $row){
                $v=$row['existingId']?wc_get_product($row['existingId']):new WC_Product_Variation();
                if(!$v || !$v->is_type('variation'))throw new Exception('Variation unavailable');
                $v->set_parent_id($parentId);$v->set_status('publish');$v->set_regular_price((string)$row['price']);
                $v->set_manage_stock(false);$v->set_stock_status($row['stockStatus']);
                $form=($row['noteLabel']??'')!==''?$row['noteLabel']:'Standard';
                $v->set_attributes(['dosage'=>$row['dose'],'pack-size'=>(string)$row['packCount'],'warehouse'=>$row['warehouse'],'formulation'=>$form]);
                $v->update_meta_data('_tbv_migration_key',$row['migrationKey']);$v->update_meta_data('_tbvi_managed','yes');
                $v->update_meta_data('_tbv_warehouse',$row['warehouse']);$v->update_meta_data('_tbv_dose',$row['dose']);$v->update_meta_data('_tbv_pack_size',$row['packCount']);
                $v->update_meta_data('_tbv_note_label',$row['noteLabel']??'');$v->update_meta_data('_tbvi_stock_evidence',$row['stockEvidence']);
                $v->update_meta_data('_tbvi_source_commit',$plan['sourceCommit']);$v->update_meta_data('_tbvi_source_extracted_at',$plan['extractedAt']);
                $v->update_meta_data('_tbvi_source_index',$row['sourceIndex']);
                foreach(['currentSlug','legacyCanonicalSlug','restoredSlug','currentUrl'] as $sourceField)$v->update_meta_data('_tbvi_'.$sourceField,$row[$sourceField]);
                $image=ltrim((string)($row['image']??''),'/');if($image!==''){
                    $v->update_meta_data('_tbv_vial_image',$image);
                    $baseImage=explode('?',$image,2)[0];
                    // The pending SVG is a placeholder, never a product photo.
                    if($baseImage!=='images/vial-image-pending.svg'){
                        $imageId=tbvi_asset_id($baseImage,$parentId);if(!$v->get_image_id('edit'))$v->set_image_id($imageId);
                        if(!$parent->get_image_id('edit')){$parent->set_image_id($imageId);$parent->save();}
                    }
                }
                $documentIds=[];foreach($row['coaImages'] as $document)$documentIds[]=tbvi_asset_id('documents/'.$document,$parentId);
                $v->update_meta_data('_tbv_coa_images',$row['coaImages']);$v->update_meta_data('_tbvi_coa_image_ids',$documentIds);
                $pdf=$row['coaPdf']??null;if($pdf!==null){$v->update_meta_data('_tbv_coa_pdf',$pdf);$v->update_meta_data('_tbvi_coa_pdf_id',tbvi_asset_id('documents/'.$pdf,$parentId));}
                $variationId=$v->save();if(!$variationId)throw new Exception('Unable to save variation');
                $v=wc_get_product($variationId);$v->update_meta_data('_tbvi_last_snapshot',tbvi_variation_snapshot($v));$v->save();$processed++;
            }
            WC_Product_Variable::sync($parentId);wc_delete_product_transients($parentId);
            // The first product image can be set during the variation loop;
            // capture the authoritative parent baseline after every write.
            $parent=wc_get_product($parentId);$parent->update_meta_data('_tbvi_last_parent_snapshot',tbvi_parent_snapshot($parent));$parent->save();
        }
    } catch (Throwable $e) { return new WP_Error('import_partial','Import stopped after '.$processed.' offers. Re-run a dry run before retrying. '.$e->getMessage()); }
    finally { delete_option('_tbvi_import_lock'); }
    return ['counts'=>$plan['counts'],'processed_offers'=>$processed,'sourceCommit'=>$plan['sourceCommit'],'extractedAt'=>$plan['extractedAt']];
}

/** Retain only the public fields the importer actually consumes. */
function tbvi_job_catalog($data) {
    $out=['schemaVersion'=>1,'sourceCommit'=>$data['sourceCommit'],'extractedAt'=>$data['extractedAt'],'customerDataIncluded'=>false,'supplierDataIncluded'=>false,'rows'=>[]];
    $keys=array_flip(['migrationKey','sourceIndex','catalogName','name','dose','packCount','warehouse','noteLabel','currency','price','stockStatus','stockQuantity','stockEvidence','image','coaImages','coaPdf','currentSlug','legacyCanonicalSlug','restoredSlug','currentUrl']);
    foreach($data['rows'] as $row)$out['rows'][]=array_intersect_key($row,$keys);
    return $out;
}
function tbvi_job_option($id) { return '_tbvi_job_'.$id; }
function tbvi_job_lock_option($id) { return '_tbvi_job_lock_'.$id; }
function tbvi_job_public($job) { return ['id'=>$job['id'],'status'=>$job['status'],'cursor'=>(int)$job['cursor'],'total'=>count($job['catalog']['rows']),'last_error'=>(string)($job['last_error']??'')]; }
function tbvi_job_start($data,$ownerId) {
    if(!tbvi_staging_enabled())return tbvi_staging_error();
    if(!is_int($ownerId) || $ownerId<1)return new WP_Error('invalid_owner','A signed-in WooCommerce manager is required.');
    $plan=tbvi_plan($data);if(is_wp_error($plan))return $plan;
    $catalog=tbvi_job_catalog($data);try{$id=bin2hex(random_bytes(16));}catch(Throwable $e){return new WP_Error('random_unavailable','Could not create a secure job identifier.');}
    if(!add_option('_tbvi_active_job',$id,'',false))return new WP_Error('job_active','Another catalog import job is active. Resume or cancel it first.');
    $job=['id'=>$id,'owner'=>$ownerId,'catalog'=>$catalog,'digest'=>hash('sha256',wp_json_encode($catalog)),'cursor'=>0,'status'=>'ready','last_error'=>'','created_at'=>time()];
    if(!add_option(tbvi_job_option($id),$job,'',false)){if(get_option('_tbvi_active_job','')===$id)delete_option('_tbvi_active_job');return new WP_Error('job_save_failed','Could not save import job.');}
    return tbvi_job_public($job);
}
function tbvi_job_load($id,$ownerId) {
    if(!is_string($id)||!preg_match('/^[a-f0-9]{32}$/D',$id))return new WP_Error('invalid_job','Invalid job identifier.');
    $job=get_option(tbvi_job_option($id));
    if(!is_array($job)||($job['id']??'')!==$id)return new WP_Error('job_not_found','Import job not found.');
    if(!is_int($ownerId)||$ownerId<1||($job['owner']??0)!==$ownerId)return new WP_Error('job_owner','This import job belongs to another manager.');
    if(!is_array($job['catalog']??null)||!is_array($job['catalog']['rows']??null)||!is_string($job['digest']??null)||!hash_equals($job['digest'],hash('sha256',wp_json_encode($job['catalog']))))return new WP_Error('job_corrupt','Saved import data failed its integrity check.');
    if(!is_int($job['cursor']??null)||$job['cursor']<0||$job['cursor']>count($job['catalog']['rows']))return new WP_Error('job_corrupt','Saved import cursor is invalid.');
    if(!in_array($job['status']??null,['ready','running','needs_review','complete','cancelled'],true))return new WP_Error('job_corrupt','Saved import status is invalid.');
    return $job;
}
/** Each request applies at most two offers and revalidates against current data. */
function tbvi_job_step($id,$ownerId) {
    if(!tbvi_staging_enabled())return tbvi_staging_error();
    $job=tbvi_job_load($id,$ownerId);if(is_wp_error($job))return $job;
    if(!add_option(tbvi_job_lock_option($id),time(),'',false))return new WP_Error('job_locked','This job is already running or an interrupted step requires inspection.');
    try {
        $job=tbvi_job_load($id,$ownerId);if(is_wp_error($job))return $job;
        if($job['status']==='cancelled')return new WP_Error('job_cancelled','This job was cancelled.');
        if($job['status']==='complete'){
            if(get_option('_tbvi_active_job','')===$id)delete_option('_tbvi_active_job');
            return tbvi_job_public($job);
        }
        if(get_option('_tbvi_active_job','')!==$id)return new WP_Error('job_not_active','This job is not the active import.');
        $part=$job['catalog'];$part['rows']=array_slice($job['catalog']['rows'],$job['cursor'],2);
        if(!$part['rows'])return new WP_Error('job_corrupt','Saved import cursor has no remaining offers.');
        $result=tbvi_apply($part,$id);
        if(is_wp_error($result)){
            $job['status']='needs_review';$job['last_error']=$result->get_error_message();update_option(tbvi_job_option($id),$job,false);
            return $result;
        }
        $job['cursor']+=count($part['rows']);$job['last_error']='';$job['status']=$job['cursor']===count($job['catalog']['rows'])?'complete':'running';
        if(!update_option(tbvi_job_option($id),$job,false))return new WP_Error('job_save_failed','The batch was applied but its progress could not be saved. Inspect and resume; imported identities are idempotent.');
        if($job['status']==='complete' && get_option('_tbvi_active_job','')===$id)delete_option('_tbvi_active_job');
        return tbvi_job_public($job);
    } finally { delete_option(tbvi_job_lock_option($id)); }
}
function tbvi_job_cancel($id,$ownerId) {
    if(!tbvi_staging_enabled())return tbvi_staging_error();
    $job=tbvi_job_load($id,$ownerId);if(is_wp_error($job))return $job;
    if(!add_option(tbvi_job_lock_option($id),time(),'',false))return new WP_Error('job_locked','The current step must finish or be inspected before cancellation.');
    try {
        $job=tbvi_job_load($id,$ownerId);if(is_wp_error($job))return $job;
        if(get_option('_tbvi_import_lock',false)!==false)return new WP_Error('import_locked','An import step is active or requires inspection.');
        if(in_array($job['status'],['complete','cancelled'],true))return tbvi_job_public($job);
        $job['status']='cancelled';$job['last_error']='Cancelled by the manager; already-created drafts and media remain.';
        if(!update_option(tbvi_job_option($id),$job,false))return new WP_Error('job_save_failed','Could not save the cancelled status. Inspect the job before retrying.');if(get_option('_tbvi_active_job','')===$id)delete_option('_tbvi_active_job');
        return tbvi_job_public($job);
    } finally {delete_option(tbvi_job_lock_option($id));}
}
add_action('admin_menu',function(){add_submenu_page('woocommerce','Catalog import','Catalog import','manage_woocommerce','tbv-catalog-import','tbvi_admin_page');});
function tbvi_admin_page(){
    if (!tbvi_staging_enabled()) wp_die('This development importer requires an isolated staging environment.');
    if(!current_user_can('manage_woocommerce'))wp_die('Not permitted.');
    $result=get_transient('tbvi_result_'.get_current_user_id());delete_transient('tbvi_result_'.get_current_user_id());
    echo '<div class="wrap"><h1>10BottleValue catalog import</h1><p>Dry run first. The bundled catalog is an October 22, 2026 source snapshot; prices and physical stock have not been verified. Newly imported products are drafts. No customer data is imported and existing unowned products are never changed.</p>';
    if($result)echo '<pre>'.esc_html($result).'</pre>';
    $active=(string)get_option('_tbvi_active_job','');if($active!==''){
        $activeJob=tbvi_job_load($active,get_current_user_id());
        if(is_wp_error($activeJob))echo '<p>An import job is active or requires inspection. Another manager may own it.</p>';
        else echo '<p><a href="'.esc_url(add_query_arg('job',$active,admin_url('admin.php?page=tbv-catalog-import'))).'">Resume active import job</a></p>';
    }
    echo '<form action="'.esc_url(admin_url('admin-post.php')).'" method="post" enctype="multipart/form-data">';wp_nonce_field('tbvi_catalog_import');echo '<input type="hidden" name="action" value="tbvi_catalog_import"><p><label><input type="radio" name="catalog_source" value="bundled" checked> Bundled public snapshot</label><br><label><input type="radio" name="catalog_source" value="upload"> Upload compatible JSON</label> <input type="file" name="catalog" accept="application/json,.json"></p><button class="button" type="submit" name="mode" value="dry-run">Dry run</button> <button class="button button-primary" type="submit" name="mode" value="import">Start draft import</button></form>';
    $id=isset($_GET['job'])&&is_string($_GET['job'])?sanitize_key(wp_unslash($_GET['job'])):'';
    if($id!==''){
        $job=tbvi_job_load($id,get_current_user_id());
        if(is_wp_error($job))echo '<p>'.esc_html($job->get_error_message()).'</p>';
        else {
            $public=tbvi_job_public($job);echo '<h2>Import progress</h2><p id="tbvi-progress">'.esc_html($public['cursor'].' / '.$public['total'].' offers — '.$public['status']).'</p><p id="tbvi-message">'.esc_html($public['last_error']).'</p><p>Keep this page open while processing. If interrupted, reopen the same job URL and select Resume. A failed or interrupted step may require inspecting draft records and locks before retrying.</p><button type="button" class="button button-primary" id="tbvi-resume">Resume</button> <button type="button" class="button" id="tbvi-cancel">Stop job (keep drafts)</button>';
            wp_enqueue_script('tbvi-admin',plugins_url('admin-batch.js',__FILE__),[], '0.1.0',true);
            wp_add_inline_script('tbvi-admin','window.tbviJob = '.wp_json_encode(['url'=>admin_url('admin-ajax.php'),'id'=>$id,'nonce'=>wp_create_nonce('tbvi_batch_'.$id),'status'=>$public['status']]).';','before');
        }
    }
    echo '</div>';
}
add_action('admin_post_tbvi_catalog_import',function(){
    if(!current_user_can('manage_woocommerce'))wp_die('Not permitted.');
    if(!tbvi_staging_enabled())wp_die('This development importer requires an isolated staging environment.');
    check_admin_referer('tbvi_catalog_import');
    $source=isset($_POST['catalog_source'])&&is_string($_POST['catalog_source'])?sanitize_key(wp_unslash($_POST['catalog_source'])):'';$mode=isset($_POST['mode'])&&is_string($_POST['mode'])?sanitize_key(wp_unslash($_POST['mode'])):'';
    if(!in_array($source,['bundled','upload'],true)||!in_array($mode,['dry-run','import'],true))wp_die('Invalid request.');
    if($source==='bundled'){$file=__DIR__.'/public-catalog.json';}else{$upload=$_FILES['catalog']??null;if(!$upload || ($upload['error']??-1)!==UPLOAD_ERR_OK || ($upload['size']??0)>2097152 || !is_uploaded_file($upload['tmp_name']))wp_die('Invalid upload.');$file=$upload['tmp_name'];}
    $raw=file_get_contents($file);$data=json_decode($raw,true);$result=$mode==='dry-run'?tbvi_plan($data):tbvi_job_start($data,get_current_user_id());
    if(is_wp_error($result))$report='Error: '.$result->get_error_message();elseif($mode==='dry-run')$report=wp_json_encode(['mode'=>$mode,'counts'=>$result['counts'],'sourceCommit'=>$result['sourceCommit'],'extractedAt'=>$result['extractedAt']],JSON_PRETTY_PRINT);else $report='Import job created. Processing occurs in small, resumable batches.';
    set_transient('tbvi_result_'.get_current_user_id(),$report,5*MINUTE_IN_SECONDS);$target=admin_url('admin.php?page=tbv-catalog-import');if(!is_wp_error($result)&&$mode==='import')$target=add_query_arg('job',$result['id'],$target);wp_safe_redirect($target);exit;
});
function tbvi_ajax_job($cancel=false){
    if(!current_user_can('manage_woocommerce'))wp_send_json_error(['message'=>'Not permitted.'],403);
    $id=isset($_POST['job_id'])&&is_string($_POST['job_id'])?sanitize_key(wp_unslash($_POST['job_id'])):'';if(!preg_match('/^[a-f0-9]{32}$/D',$id))wp_send_json_error(['message'=>'Invalid job identifier.'],400);
    check_ajax_referer('tbvi_batch_'.$id,'nonce');
    $result=$cancel?tbvi_job_cancel($id,get_current_user_id()):tbvi_job_step($id,get_current_user_id());
    if(is_wp_error($result))wp_send_json_error(['message'=>$result->get_error_message()],409);wp_send_json_success($result);
}
add_action('wp_ajax_tbvi_batch',function(){tbvi_ajax_job(false);});
add_action('wp_ajax_tbvi_cancel',function(){tbvi_ajax_job(true);});
