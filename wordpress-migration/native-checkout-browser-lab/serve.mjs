import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=process.env.TBV_FIXTURE_ROOT, proto=process.env.TBV_WP_TEST_RUNTIME;
if (!root || !proto || !path.isAbsolute(root) || !path.isAbsolute(proto)) throw new Error('TBV_FIXTURE_ROOT and TBV_WP_TEST_RUNTIME must be absolute paths');
if (fs.realpathSync(path.dirname(root)) !== fs.realpathSync(os.tmpdir()) || fs.realpathSync(root) !== path.join(fs.realpathSync(os.tmpdir()),path.basename(root)) || !fs.existsSync(path.join(root,'.tbv-synthetic-checkout-lab'))) throw new Error('A prepared disposable temporary fixture is required');
const sourceDb=path.join(proto,'package/site/wp-content/database/.ht.6d4c7d4750440d58559d3fd26ac1a1b1/.ht.sqlite');
const expectedDbHash='48fef91efa8b84088b7688eff319e924b7b1efd25e4819c0ff3078d6fb7144a9';
if (createHash('sha256').update(fs.readFileSync(sourceDb)).digest('hex')!==expectedDbHash) throw new Error('Unrecognized sanitized fixture database; do not use real data');
const lab=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(lab,'../..');
const requireFromPrototype=createRequire(path.join(proto,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(requireFromPrototype.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(requireFromPrototype.resolve('@wp-playground/wordpress')));
const db=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-wp-react-proof-'));
fs.cpSync(path.join(proto,'package/site'),path.join(db,'site'),{recursive:true});
fs.mkdirSync(path.join(db,'mu-plugins'));
const origin='http://127.0.0.1:9475', sitePrefix=process.env.TBV_SITE_PREFIX === 'root' ? '' : '/wordpresspreview';
const synthetic=true;
fs.copyFileSync(path.join(repo,'wordpress-migration/checkout-lab/tbv-synthetic-gateway.php'),path.join(db,'mu-plugins/tbv-synthetic-gateway.php'));
fs.copyFileSync(path.join(repo,'wordpress-migration/shipping-lab/tbv-warehouse-shipping/tbv-warehouse-shipping.php'),path.join(db,'mu-plugins/tbv-warehouse-shipping.php'));
const fixtureSource=synthetic ? fs.readFileSync(path.join(lab,'synthetic-pack-fixture.php'),'utf8').replace(/^<\?php\s*/, '') : '';
const handler=await bootWordPressAndRequestHandler({
 createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:origin+sitePrefix,cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',
 sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(proto,'package/sqlite.zip'))],'sqlite.zip'),
 constants:{WP_MEMORY_LIMIT:'512M',...(synthetic?{WP_ENVIRONMENT_TYPE:'local',TBV_DISPOSABLE_FIXTURE:true,TBV_DISPOSABLE_CHECKOUT:true,TBV_STAGING_PREVIEW:true}:{}),DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false,DISALLOW_FILE_MODS:true},
 hooks:{beforeWordPressFiles:async php=>{
  await php.mount('/wordpress',createNodeFsMountHandler(path.join(db,'site')));
  await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(db,'site/wp-content/database')));
  await php.mount('/wordpress/wp-content/mu-plugins',createNodeFsMountHandler(path.join(db,'mu-plugins')));
  await php.mount('/wordpress/wp-content/plugins/tbv-local-homepage-proof',createNodeFsMountHandler(path.join(root,'plugins/tbv-local-homepage-proof')));
  await php.mount('/wordpress/wp-content/themes/10bottlevalue-react-proof',createNodeFsMountHandler(path.join(root,'theme/10bottlevalue-react-proof')));
  await php.mount('/wordpress/wp-content/plugins/tbv-public-woo-catalog',createNodeFsMountHandler(path.join(root,'plugins/tbv-public-woo-catalog')));
 }},
});
const php=await handler.getPrimaryPhp();
const init=await php.run({code:`<?php require '/wordpress/wp-load.php'; update_option('template','10bottlevalue-react-proof'); update_option('stylesheet','10bottlevalue-react-proof'); $active=['woocommerce/woocommerce.php','tbv-public-woo-catalog/tbv-public-woo-catalog.php','tbv-local-homepage-proof/tbv-local-homepage-proof.php']; update_option('active_plugins',$active); ${fixtureSource} $synthetic = tbv_create_synthetic_pack_fixture(); update_option('woocommerce_currency','USD'); update_option('woocommerce_enable_guest_checkout','yes'); update_option('woocommerce_calc_taxes','no'); update_option('woocommerce_hold_stock_minutes',0); update_option('woocommerce_default_country','US:WA'); $checkout=wp_insert_post(['post_title'=>'Synthetic Checkout','post_name'=>'checkout','post_status'=>'publish','post_type'=>'page','post_content'=>'[woocommerce_checkout]']);update_option('woocommerce_checkout_page_id',$checkout); $zone=new WC_Shipping_Zone(); $zone->set_zone_name('Synthetic US');$zone->set_zone_order(0);$zone->add_location('US','country');$zone->save();$instance=$zone->add_shipping_method('tbv_warehouse_shipping');$cfg=['currency'=>'USD','metadata'=>['source'=>'synthetic fixture','status'=>'synthetic only','version'=>'ui-checkout-fixture-1'],'us_warehouse_countries'=>['US'],'express_countries'=>['US'],'tiers'=>['standard'=>[['min_subtotal'=>'0','price'=>'3.00']]]];update_option('woocommerce_tbv_warehouse_shipping_'.$instance.'_settings',['enabled'=>'yes','title'=>'Synthetic delivery','service'=>'standard','configuration'=>wp_json_encode($cfg),'tax_status'=>'none']);echo json_encode(['theme'=>get_option('stylesheet'),'fixture'=>$synthetic,'gateway'=>class_exists('TBV_Synthetic_Gateway')]);`});
if(init.exitCode!==0)throw Error(init.errors);
const setup=JSON.parse(init.text); if(!setup.gateway)throw Error('synthetic gateway did not register'); const allowedIds=new Set(setup.fixture.offers.map(o=>o.id));
console.log('Activated synthetic checkout only in disposable local database');
if(synthetic)console.log('SYNTHETIC_FIXTURE_READY');
const assetRoot=path.join(root,'theme/10bottlevalue-react-proof/public');
const prefix='/wp-content/themes/10bottlevalue-react-proof/public/';
const mime={'.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.pdf':'application/pdf','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
let tail=Promise.resolve();
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,origin);
 if (sitePrefix && !url.pathname.startsWith(sitePrefix+'/') && url.pathname!==sitePrefix){res.writeHead(404).end('Outside test subdirectory');return;}
 const sitePath=url.pathname.slice(sitePrefix.length)||'/';
 const cartActions=['/wp-json/wc/store/v1/cart/add-item','/wp-json/wc/store/v1/cart/update-item','/wp-json/wc/store/v1/cart/remove-item','/wp-json/wc/store/v1/cart/update-customer','/wp-json/wc/store/v1/checkout'];
 const cartPost=req.method==='POST'&&cartActions.includes(sitePath);
 const cartForm=req.method==='POST'&&['/cart','/cart/'].includes(sitePath);
 const ajaxAction=url.searchParams.get('wc-ajax'); const labAjax=req.method==='POST' && ['update_order_review','checkout'].includes(ajaxAction);
 if(req.headers.host!=='127.0.0.1:9475'){res.writeHead(403).end('Local proof only');return;}
 if (req.method==='GET' && sitePath==='/__test/order') {
  const id=Number(url.searchParams.get('id'));if (!Number.isSafeInteger(id) || id<1) {res.writeHead(400).end();return;}
  const inspected=await php.run({code:`<?php require '/wordpress/wp-load.php'; $o=wc_get_order(${id}); if(!$o || $o->get_meta('_tbv_lab_no_payment')!=='true'){echo '{}';return;} $ship=$o->get_items('shipping');$items=$o->get_items();$orders=wc_get_orders(['limit'=>-1,'meta_key'=>'_tbv_lab_no_payment','meta_value'=>'true']);echo wp_json_encode(['status'=>$o->get_status(),'paid'=>$o->is_paid(),'total'=>$o->get_total(),'shipping'=>$o->get_shipping_total(),'shippingVersion'=>count($ship)?current($ship)->get_meta('tbv_rule_version',true):null,'productId'=>count($items)?current($items)->get_variation_id():null,'quantity'=>count($items)?current($items)->get_quantity():null,'markedOrders'=>count($orders),'paymentComplete'=>(int)get_option('tbv_lab_payment_complete',0),'stockReduced'=>(int)get_option('tbv_lab_stock_reduced',0),'mailIntercepted'=>(int)get_option('tbv_lab_mail_attempts',0)]);`});
  res.setHeader('content-type','application/json');res.end(inspected.text);return;
 }

 // Fail closed before WordPress initializes: only this disposable preview may
 // run here. Account, checkout, admin, payment and legacy app APIs stay off.
 if(/%(?:2f|5c|00)/i.test(req.url)||url.pathname.includes('//')||url.pathname.includes('\\')){res.writeHead(400).end('Invalid preview path');return;}
 if(/^\/(?:api|wp-admin|wp-login\.php|my-account|account|wc-api|order-pay)(?:\/|$)/i.test(sitePath)||(url.searchParams.has('wc-ajax')&&!labAjax)||url.searchParams.has('rest_route')||url.searchParams.has('add-to-cart')){res.writeHead(403).end('Not available in local proof');return;}
 if(!['GET','HEAD'].includes(req.method)&&!cartPost&&!cartForm&&!labAjax){res.writeHead(403).end('Only synthetic cart operations allowed');return;}
 if(cartPost&&(req.headers.origin!==origin||!String(req.headers['content-type']||'').startsWith('application/json'))){res.writeHead(403).end('Invalid cart origin or content type');return;}
 if(labAjax&&(req.headers.origin!==origin||!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))){res.writeHead(403).end('Invalid lab AJAX origin');return;}
 if(cartForm&&(req.headers.origin!==origin||!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))){res.writeHead(403).end('Invalid cart form origin or content type');return;}
 let payload;
 if(cartPost){let chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413).end();return;}chunks.push(chunk);}payload=Buffer.concat(chunks);try{const parsed=JSON.parse(payload.toString());const adding=sitePath.endsWith('/add-item'),updating=sitePath.endsWith('/update-item'),removing=sitePath.endsWith('/remove-item');if (sitePath.endsWith('/add-item') && !allowedIds.has(parsed.id)) throw Error(); if(sitePath.endsWith('/checkout') && (!String(parsed.billing_address?.email||'').endsWith('@example.invalid') || parsed.payment_method!=='tbv_synthetic_only')) throw Error(); const validKey=typeof parsed.key==='string'&&/^[a-f0-9]{32}$/.test(parsed.key);const validQty=Number.isSafeInteger(parsed.quantity)&&parsed.quantity>=1&&parsed.quantity<=20;if(adding&&(!Number.isSafeInteger(parsed.id)||parsed.id<1||!validQty||Object.keys(parsed).some(x=>!['id','quantity'].includes(x))))throw Error();if(updating&&(!validKey||!validQty||Object.keys(parsed).some(x=>!['key','quantity'].includes(x))))throw Error();if(removing&&(!validKey||Object.keys(parsed).some(x=>x!=='key')))throw Error();}catch{res.writeHead(400).end('Invalid synthetic item');return;}}
 if(labAjax){let chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413).end();return;}chunks.push(chunk);}payload=Buffer.concat(chunks);const form=new URLSearchParams(payload.toString());if(ajaxAction==='checkout'&&(!String(form.get('billing_email')||'').endsWith('@example.invalid')||form.get('payment_method')!=='tbv_synthetic_only')){res.writeHead(400).end('Synthetic checkout only');return;}}
 if(cartForm){let chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413).end();return;}chunks.push(chunk);}payload=Buffer.concat(chunks);const form=new URLSearchParams(payload.toString());if(!form.has('update_cart')||!form.has('woocommerce-cart-nonce')){res.writeHead(400).end('Invalid cart form');return;}for(const [key,val] of form){if(/^(?:update_cart|woocommerce-cart-nonce|_wp_http_referer)$/.test(key)){if(val.length>500){res.writeHead(400).end();return;}continue;}if(!/^cart\[[a-f0-9]{32}\]\[qty\]$/.test(key)||!/^\d+$/.test(val)||Number(val)>20){res.writeHead(400).end('Invalid cart quantity');return;}}}
 if(sitePath.startsWith('/wp-json/')&&!['/wp-json/wc/store/v1/cart',...cartActions].includes(sitePath)){res.writeHead(403).end('Not available in local proof');return;}
 if(sitePath.startsWith('/wp-includes/js/')){
  const includeRoot=path.join(proto,'site/wp-includes/js'); let relative;try{relative=decodeURIComponent(sitePath.slice('/wp-includes/js'.length));}catch{res.writeHead(400).end();return;}
  const f=path.resolve(includeRoot,'.'+relative); if(!f.startsWith(includeRoot+path.sep)||!mime[path.extname(f)]||!fs.statSync(f,{throwIfNoEntry:false})?.isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(f)]);res.setHeader('Cache-Control','no-store');if(req.method==='HEAD'){res.end();return;}fs.createReadStream(f).pipe(res);return;
 }
 if(sitePath.startsWith(prefix)){
  let decoded;try{decoded=decodeURIComponent(sitePath.slice(prefix.length-1));}catch{res.writeHead(400).end();return;}
  const f=path.resolve(assetRoot,'.'+decoded);
  if(!f.startsWith(assetRoot+path.sep)||!mime[path.extname(f)]||!fs.statSync(f,{throwIfNoEntry:false})?.isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(f)]);res.setHeader('Cache-Control','no-store');if(req.method==='HEAD'){res.end();return;}fs.createReadStream(f).pipe(res);return;
 }
 if(sitePath.startsWith('/api/')||sitePath==='/api'){res.writeHead(403).end('Live APIs disabled');return;}
 const old=tail;let done;tail=new Promise(resolve=>done=resolve);await old;
 try{const r=await handler.request({url:origin+url.pathname+url.search,method:req.method==='HEAD'?'GET':req.method,headers:{host:'127.0.0.1:9475','user-agent':'TBV local proof',...(req.headers.cookie?{cookie:req.headers.cookie}:{}),...(req.headers['cart-token']?{'cart-token':req.headers['cart-token']}:{}),...(req.headers.nonce?{nonce:req.headers.nonce}:{}),...((cartPost||cartForm||labAjax)?{'content-type':req.headers['content-type']}:{} )},...(payload?{body:new Uint8Array(payload)}:{})});res.statusCode=r.httpStatusCode;for(const [k,v] of Object.entries(r.headers))if(['content-type','content-security-policy','x-robots-tag','cache-control','location','cart-token','nonce','set-cookie'].includes(k.toLowerCase()))res.setHeader(k,v);res.end(req.method==='HEAD'?undefined:Buffer.from(r.bytes));}
 catch(e){console.error(e);res.writeHead(500).end('Local proof error');}finally{done();}
});
server.listen(9475,'127.0.0.1',()=>console.log('Local proof http://127.0.0.1:9475'));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(async()=>{await handler[Symbol.asyncDispose]();fs.rmSync(db,{recursive:true,force:true});process.exit(0);}));
