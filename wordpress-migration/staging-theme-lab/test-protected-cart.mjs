import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const runtime=process.env.TBV_WP_TEST_RUNTIME;
if (!runtime || !path.isAbsolute(runtime)) throw Error('Set an absolute TBV_WP_TEST_RUNTIME');
const sourceDb=path.join(runtime,'package/site/wp-content/database/.ht.6d4c7d4750440d58559d3fd26ac1a1b1/.ht.sqlite');
if (createHash('sha256').update(fs.readFileSync(sourceDb)).digest('hex')!=='48fef91efa8b84088b7688eff319e924b7b1efd25e4819c0ff3078d6fb7144a9') throw Error('Unrecognized sanitized fixture database');
const here=path.dirname(fileURLToPath(import.meta.url));const repo=path.resolve(here,'../..');
const theme=process.env.TBV_THEME_DIRECTORY || path.join(here,'theme/10bottlevalue-react-proof');
const catalog=process.env.TBV_CATALOG_DIRECTORY || path.join(repo,'wordpress-preview-server/site/wp-content/plugins/tbv-public-woo-catalog');
if (!path.isAbsolute(theme) || !path.isAbsolute(catalog)) throw Error('Theme and catalog paths must be absolute');
const req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-protected-cart-lab-'));
fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});let handler;
try {
 handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:'http://127.0.0.1:9472',cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{WP_ENVIRONMENT_TYPE:'local',TBV_STAGING_PREVIEW:true,DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,DISALLOW_FILE_MODS:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false},hooks:{beforeWordPressFiles:async php=>{
  await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));
  await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(temp,'database')));
  await php.mount('/wordpress/wp-content/themes/10bottlevalue-react-proof',createNodeFsMountHandler(theme));
  await php.mount('/wordpress/wp-content/plugins/tbv-public-woo-catalog',createNodeFsMountHandler(catalog));
 }}});
 const php=await handler.getPrimaryPhp();const result=await php.run({code:`<?php
 require '/wordpress/wp-load.php';require '/wordpress/wp-content/plugins/tbv-public-woo-catalog/tbv-public-woo-catalog.php';require '/wordpress/wp-content/themes/10bottlevalue-react-proof/functions.php';
 $checks=[];function ck($key,$value){global $checks;$checks[$key]=(bool)$value;}
 wc_load_cart();$controller=new Automattic\\WooCommerce\\StoreApi\\Utilities\\CartController();$request=new WP_REST_Request('POST','/wc/store/v1/cart/add-item');
 function api_rejects($controller,$product,$request){try{$controller->validate_add_to_cart($product,$request);return false;}catch(Automattic\\WooCommerce\\StoreApi\\Exceptions\\RouteException $e){return true;}}
 $product=new WC_Product_Simple();$product->set_name('Synthetic protected fixture');$product->set_status('publish');$product->set_regular_price('12.00');$product->set_post_password('synthetic');$product->save();
 ck('protected_simple_not_purchasable',!$product->is_purchasable());ck('protected_simple_not_added',WC()->cart->add_to_cart($product->get_id(),1)===false);ck('protected_simple_api_rejected',api_rejects($controller,$product,$request));
 $product->set_post_password('');$product->save();$product=wc_get_product($product->get_id());ck('public_simple_purchasable',$product->is_purchasable());ck('public_simple_added',WC()->cart->add_to_cart($product->get_id(),1)!==false);
 $parent=new WC_Product_Variable();$parent->set_name('Synthetic protected parent');$parent->set_status('publish');$parent->set_post_password('synthetic');$parent->save();
 $variation=new WC_Product_Variation();$variation->set_parent_id($parent->get_id());$variation->set_status('publish');$variation->set_regular_price('15.00');$variation->save();
 ck('protected_parent_variation_not_purchasable',!$variation->is_purchasable());ck('protected_parent_variation_api_rejected',api_rejects($controller,$variation,$request));
 $parent->set_post_password('');$parent->save();$parent=wc_get_product($parent->get_id());$variation=wc_get_product($variation->get_id());ck('public_variation_purchasable',$variation->is_purchasable());
 wp_update_post(['ID'=>$variation->get_id(),'post_password'=>'synthetic']);clean_post_cache($variation->get_id());$variation=wc_get_product($variation->get_id());ck('protected_variation_not_purchasable',!$variation->is_purchasable());ck('protected_variation_api_rejected',api_rejects($controller,$variation,$request));
 echo wp_json_encode(['passed'=>count(array_filter($checks)),'total'=>count($checks),'checks'=>$checks]);`});
 if(result.exitCode!==0)throw Error(result.errors+' '+result.text);const report=JSON.parse(result.text);console.log(JSON.stringify(report));if(report.passed!==report.total)process.exitCode=1;
} finally {if(handler)await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});}
