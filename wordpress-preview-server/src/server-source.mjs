import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomBytes} from 'node:crypto';
import {loadNodeRuntime,createNodeFsMountHandler} from '@php-wasm/node';
import {bootWordPressAndRequestHandler} from '@wp-playground/wordpress';

const PREFIX='/wordpresspreview';
const here=typeof __dirname==='string'?__dirname:path.dirname(new URL(import.meta.url).pathname);
let instance,queued=0,tail=Promise.resolve();
export function allowedPath(p){return /^\/(?:|shop\/?|product\/[a-z0-9-]+\/?|cart\/?|about\/?|contact\/?|faq\/?|track-order\/?|shipping-policy\/?|refund-policy\/?|privacy-policy\/?|terms-and-conditions\/?|shipping-prices\/?)$/.test(p);}
const queryKeys=new Set(['warehouse','s','post_type','paged','product-page','attribute_dosage','attribute_pack-size','attribute_warehouse','attribute_formulation','variation_id','product_id','add-to-cart','quantity','remove_item','undo_item','_wpnonce','wc-ajax']);
const cartCookie=/^(?:wp_woocommerce_session_[a-z0-9]+|woocommerce_items_in_cart|woocommerce_cart_hash)$/i;
function safeCookies(input=''){return input.split(';').map(x=>x.trim()).filter(x=>cartCookie.test(x.split('=')[0])).join('; ').slice(0,6000);}
function reply(res,status,body,type='text/plain; charset=utf-8'){res.statusCode=status;res.setHeader('Content-Type',type);res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(body);}
async function boot(origin){
 if(instance?.origin===origin)return instance;
 if(instance){await instance.handler[Symbol.asyncDispose]();fs.rmSync(instance.tmp,{recursive:true,force:true});instance=null;}
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-wp-preview-'));
 fs.cpSync(path.join(here,'site/wp-content/database'),path.join(tmp,'database'),{recursive:true});
 const salts=Object.fromEntries(['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT'].map(key=>[key,randomBytes(32).toString('hex')]));
 const handler=await bootWordPressAndRequestHandler({
  createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),
  phpVersion:'8.3',maxPhpInstances:1,siteUrl:origin+PREFIX,cookieStore:false,
  wordpressInstallMode:'do-not-attempt-installing',
  sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(here,'sqlite.zip'))],'sqlite.zip'),
  constants:{...salts,WP_MEMORY_LIMIT:'512M',WP_MAX_MEMORY_LIMIT:'512M',DISABLE_WP_CRON:true,AUTOMATIC_UPDATER_DISABLED:true,WP_HTTP_BLOCK_EXTERNAL:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false,DISALLOW_FILE_MODS:true,DISALLOW_FILE_EDIT:true},
  phpIniEntries:{memory_limit:'512M',display_errors:'0',log_errors:'1',allow_url_fopen:'0',allow_url_include:'0'},
  hooks:{beforeWordPressFiles:async php=>{
   await php.mount('/wordpress',createNodeFsMountHandler(path.join(here,'site')));
   await php.mount('/wordpress/wp-content/database',createNodeFsMountHandler(path.join(tmp,'database')));
  }},
 });
 const php=await handler.getPrimaryPhp();
 const check=await php.run({code:"<?php require '/wordpress/wp-load.php'; echo json_encode(['wp'=>$GLOBALS['wp_version'],'woo'=>defined('WC_VERSION')?WC_VERSION:null,'preview'=>defined('TBV_MIGRATION_PREVIEW'),'products'=>(int)wp_count_posts('product')->publish]);"});
 const facts=JSON.parse(check.text);
 if(check.exitCode!==0||facts.wp!=='7.1.3'||facts.woo!=='11.2.1'||!facts.preview||facts.products!==66)throw Error('Preview snapshot check failed');
 instance={origin,handler,tmp,facts};return instance;
}
async function bodyParams(req){
 let raw=req.body;
 if(raw===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)throw Error('Request too large');chunks.push(chunk);}raw=Buffer.concat(chunks);}
 if(Buffer.isBuffer(raw))raw=raw.toString('utf8');
 if(raw&&typeof raw==='object')return new URLSearchParams(Object.entries(raw).map(([k,v])=>[k,String(v)]));
 if(String(raw||'').length>16384)throw Error('Request too large');
 return new URLSearchParams(raw||'');
}
export default async function preview(req,res){
 const host=String(req.headers.host||'').toLowerCase();
 const local=!process.env.VERCEL&&/^127\.0\.0\.1:\d+$/.test(host);
 if(!local&&!/^(?:10bottlevalue\.co|www\.10bottlevalue\.co|10-bottle-value-[a-z0-9]+-10bottlevaluecos-projects\.vercel\.app)$/.test(host))return reply(res,400,'Invalid preview host');
 const origin=(local?'http://':'https://')+host;
 let input;try{input=new URL(req.url,origin);}catch{return reply(res,400,'Invalid request');}
 const routed=input.pathname===PREFIX||input.pathname.startsWith(PREFIX+'/');
 const route=routed?(input.pathname.slice(PREFIX.length)||'/'):(input.searchParams.get('path')||'/');
 input.searchParams.delete('path');
 if(['/my-account','/my-account/','/account','/account/'].includes(route)){res.statusCode=302;res.setHeader('Location',PREFIX+'/shop/');res.setHeader('Cache-Control','no-store');res.end();return;}
 if(!allowedPath(route))return reply(res,404,'Preview page not found');
 for(const [k,v]of input.searchParams){if(!queryKeys.has(k)||v.length>160)return reply(res,400,'Unsupported preview query');}
 if(input.searchParams.has('wc-ajax')&&!['get_variation','get_refreshed_fragments'].includes(input.searchParams.get('wc-ajax')))return reply(res,403,'Ordering is disabled in this preview');
 if(input.searchParams.has('quantity')&&(!/^\d+$/.test(input.searchParams.get('quantity'))||Number(input.searchParams.get('quantity'))>20))return reply(res,400,'Preview quantity is limited to 20 kits');
 if(input.searchParams.has('post_type')&&input.searchParams.get('post_type')!=='product')return reply(res,400,'Unsupported preview search');
 if(!['GET','HEAD','POST'].includes(req.method))return reply(res,405,'Method not allowed');
 let params;
 if(req.method==='POST'){
  if(req.headers.origin&&req.headers.origin!==origin)return reply(res,403,'Preview origin rejected');
  if(!String(req.headers['content-type']||'').startsWith('application/x-www-form-urlencoded'))return reply(res,415,'Form requests only');
  try{params=await bodyParams(req);}catch{return reply(res,413,'Preview request too large');}
  const ajax=input.searchParams.get('wc-ajax');
  const safeAjax=['get_variation','get_refreshed_fragments'].includes(ajax);
  const adding=/^\d{1,8}$/.test(params.get('add-to-cart')||'');
  const updating=route.replace(/\/$/,'')==='/cart'&&params.has('update_cart');
  if(!safeAjax&&!adding&&!updating)return reply(res,403,'Ordering and account changes are disabled in this preview');
  for(const [k,v]of params){
   if(v.length>250||!(/^(?:add-to-cart|product_id|variation_id|quantity|attribute_(?:dosage|pack-size|warehouse|formulation)|update_cart|woocommerce-cart-nonce|_wp_http_referer|cart\[[a-f0-9]{32}\]\[qty\])$/.test(k)))return reply(res,400,'Unsupported preview form');
   if((k==='quantity'||k.endsWith('[qty]'))&&(!/^\d+$/.test(v)||Number(v)>20))return reply(res,400,'Preview quantity is limited to 20 kits');
  }
 }
 if(queued>=8)return reply(res,429,'Preview busy. Please retry shortly.');
 queued++;
 const before=tail;let done;tail=new Promise(resolve=>done=resolve);
 await before;
 try{
  const runtime=await boot(origin);
  const target=origin+PREFIX+route+(input.search?'?'+input.searchParams.toString():'');
  const result=await runtime.handler.request({url:target,method:req.method==='HEAD'?'GET':req.method,headers:{'host':host,'cookie':safeCookies(req.headers.cookie),'content-type':'application/x-www-form-urlencoded','user-agent':'10BottleValue anonymous WordPress preview'},...(params?{body:new TextEncoder().encode(params.toString())}:{})});
  if(result.exitCode!==0)throw Error('WordPress preview render failed');
  res.statusCode=result.httpStatusCode||200;
  for(const [name,values]of Object.entries(result.headers)){
   const key=name.toLowerCase();
   if(key==='set-cookie'){
    const safe=values.filter(v=>cartCookie.test(v.split('=')[0])).map(v=>v.replace(/;\s*Domain=[^;]*/ig,'').replace(/;\s*Path=[^;]*/ig,'')+'; Path='+PREFIX+'/');
    if(safe.length)res.setHeader('Set-Cookie',safe);
   }else if(['content-type','location','link','vary'].includes(key))res.setHeader(name,values);
  }
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-TBV-Preview-Engine','WordPress '+runtime.facts.wp+'; WooCommerce '+runtime.facts.woo);
  res.end(req.method==='HEAD'?undefined:Buffer.from(result.bytes));
 }catch(error){console.error('WordPress preview render error:',error.message);reply(res,503,'The WordPress preview is temporarily unavailable. Please reload.');}
 finally{queued--;done();}
}
