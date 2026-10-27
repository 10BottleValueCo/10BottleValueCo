import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const packageRoot=process.env.TBV_WP_TEST_RUNTIME || path.resolve(dir,'../../../../../../../wordpress-server-preview-2026-10-25');
const requireFromPrototype=createRequire(path.join(packageRoot,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(requireFromPrototype.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(requireFromPrototype.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-public-catalog-test-'));
fs.cpSync(path.join(packageRoot,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});
let handler;
try {
 handler=await bootWordPressAndRequestHandler({
  createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,
  siteUrl:'http://127.0.0.1:9472',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',
  sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(packageRoot,'package/sqlite.zip'))],'sqlite.zip'),
  constants:{DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false,DISALLOW_FILE_MODS:true},
  hooks:{beforeWordPressFiles:async php=>{
    await php.mount('/wordpress',createNodeFsMountHandler(path.join(packageRoot,'package/site')));
    await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));
    await php.mount('/wordpress/wp-content/plugins/tbv-public-woo-catalog',createNodeFsMountHandler(path.dirname(dir)));
  }},
 });
 const php=await handler.getPrimaryPhp();
 const code=`<?php
 require '/wordpress/wp-load.php';
 require '/wordpress/wp-content/plugins/tbv-public-woo-catalog/tbv-public-woo-catalog.php';
 $tests=[];
 function check($name,$ok){global $tests;$tests[$name]=(bool)$ok;}
 function data_for($page,$per){$r=new WP_REST_Request('GET','/tbv-catalog/v1/products');$r->set_param('page',$page);$r->set_param('per_page',$per);$out=tbv_public_catalog_response($r);return is_wp_error($out)?$out:$out->get_data();}
 $routes=rest_get_server()->get_routes();
 $registered=$routes['/tbv-catalog/v1/products']??[];$getRoutes=array_filter($registered,function($entry){return isset($entry['methods']['GET'])&&isset($entry['permission_callback'])&&$entry['permission_callback']==='__return_true';});
 check('public_get_route_registered',count($getRoutes)===1);
 $httpGet=rest_do_request(new WP_REST_Request('GET','/tbv-catalog/v1/products'));
 $httpPost=rest_do_request(new WP_REST_Request('POST','/tbv-catalog/v1/products'));
 check('anonymous_rest_get_dispatch',$httpGet->get_status()===200&&isset($httpGet->get_data()['products']));
 check('rest_post_rejected',$httpPost->get_status()===404||$httpPost->get_status()===405);
 check('valid_pagination',tbv_public_catalog_validate_page(1)&&tbv_public_catalog_validate_page_size('100'));
 check('invalid_pagination',!tbv_public_catalog_validate_page('1.5')&&!tbv_public_catalog_validate_page(0)&&!tbv_public_catalog_validate_page_size(101));
 $bad=data_for(0,10);check('direct_invalid_rejected',is_wp_error($bad)&&$bad->get_error_code()==='invalid_pagination');
 $first=data_for(1,100);$second=data_for(1,3);check('returns_usd',!is_wp_error($first)&&$first['currency']==='USD');
 check('pagination_has_more',!is_wp_error($second)&&$second['has_more']===true);
 $rows=[];foreach($first['products'] as $product){foreach($product['offers'] as $offer){$rows[]=[$product,$offer];}}
 check('snapshot_count',count($first['products'])===66&&count($rows)===166);
 $sample=null;foreach($rows as $r){if($r[0]['name']==='Retatrutide'&&$r[1]['warehouse']==='worldwide'&&$r[1]['dose']==='5 mg'&&$r[1]['pack']===10){$sample=$r;break;}}
 check('correct_offer',!is_null($sample)&&$sample[1]['price']==='109.00');
 $keys=array_keys($sample[1]);sort($keys);$allowed=['dose','formulation','pack','price','purchasable','stock_status','variation_id','warehouse'];sort($allowed);check('strict_offer_allowlist',$keys===$allowed);
 $productKeys=array_keys($sample[0]);sort($productKeys);$productAllowed=['name','offers','product_id'];sort($productAllowed);check('strict_product_allowlist',$productKeys===$productAllowed);
 $var=wc_get_product($sample[1]['variation_id']);$parent=wc_get_product($sample[0]['product_id']);
 $var->update_meta_data('_private_supplier_secret','SHOULD_NOT_LEAK');$var->save();
 $withPrivate=data_for(1,100);check('private_metadata_omitted',strpos(wp_json_encode($withPrivate),'SHOULD_NOT_LEAK')===false);
 $var->update_meta_data('_tbv_warehouse','not-a-warehouse');$var->save();$invalid=tbv_public_catalog_offer(wc_get_product($var->get_id()),$parent);check('unknown_warehouse_omitted',$invalid===null);
 $var->update_meta_data('_tbv_warehouse','us');$var->update_meta_data('_tbv_dose','');$var->update_meta_data('_tbv_pack_size','invalid');$var->save();$invalid=tbv_public_catalog_offer(wc_get_product($var->get_id()),$parent);check('invalid_pack_omitted',$invalid===null);
 $parent->set_catalog_visibility('hidden');$parent->save();$hidden=data_for(1,100);$ids=array_column($hidden['products'],'product_id');check('hidden_product_omitted',!in_array($parent->get_id(),$ids,true));
 echo wp_json_encode(['passed'=>count(array_filter($tests)),'total'=>count($tests),'tests'=>$tests]);
 `;
 const r=await php.run({code});
 if(r.exitCode!==0)throw Error('PHP exited '+r.exitCode+': '+r.errors+' '+r.text);
 const result=JSON.parse(r.text);console.log(JSON.stringify(result));
 if(result.passed!==result.total)process.exitCode=1;
} finally {if(handler) await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
