import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const vars=['TBV_WP_TEST_RUNTIME','TBV_THEME_DIRECTORY','TBV_CATALOG_DIRECTORY','TBV_HOMEPAGE_DIRECTORY','TBV_IMPORTER_DIRECTORY'];
for(const key of vars)if(!process.env[key]||!path.isAbsolute(process.env[key]))throw Error(`Set absolute ${key}`);
const runtime=process.env.TBV_WP_TEST_RUNTIME,theme=process.env.TBV_THEME_DIRECTORY,catalog=process.env.TBV_CATALOG_DIRECTORY,home=process.env.TBV_HOMEPAGE_DIRECTORY,importer=process.env.TBV_IMPORTER_DIRECTORY;
const sourceDb=path.join(runtime,'package/site/wp-content/database/.ht.6d4c7d4750440d58559d3fd26ac1a1b1/.ht.sqlite');
if(createHash('sha256').update(fs.readFileSync(sourceDb)).digest('hex')!=='48fef91efa8b84088b7688eff319e924b7b1efd25e4819c0ff3078d6fb7144a9')throw Error('Unrecognized sanitized fixture database');
const lab=path.dirname(fileURLToPath(import.meta.url)),req=createRequire(path.join(runtime,'probe.mjs'));
const {loadNodeRuntime,createNodeFsMountHandler}=await import(pathToFileURL(req.resolve('@php-wasm/node')));
const {bootWordPressAndRequestHandler}=await import(pathToFileURL(req.resolve('@wp-playground/wordpress')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tbv-import-browser-'));fs.cpSync(path.join(runtime,'package/site/wp-content/database'),path.join(temp,'database'),{recursive:true});fs.mkdirSync(path.join(temp,'uploads'));
const origin='http://127.0.0.1:9476',prefix=process.env.TBV_SITE_PREFIX==='root'?'':'/wordpresspreview';
const handler=await bootWordPressAndRequestHandler({createPhpRuntime:()=>loadNodeRuntime('8.3',{extensions:[],emscriptenOptions:{processId:process.pid}}),phpVersion:'8.3',maxPhpInstances:1,siteUrl:origin+prefix,cookieStore:false,wordpressInstallMode:'do-not-attempt-installing',sqliteIntegrationPluginZip:new File([fs.readFileSync(path.join(runtime,'package/sqlite.zip'))],'sqlite.zip'),constants:{WP_ENVIRONMENT_TYPE:'local',TBV_DISPOSABLE_FIXTURE:true,TBV_STAGING_PREVIEW:true,TBV_CATALOG_IMPORT_STAGING:true,DISABLE_WP_CRON:true,WP_HTTP_BLOCK_EXTERNAL:true,DISALLOW_FILE_MODS:true,WP_DEBUG:false,WP_DEBUG_DISPLAY:false},hooks:{beforeWordPressFiles:async php=>{
 await php.mount('/wordpress',createNodeFsMountHandler(path.join(runtime,'package/site')));
 for(const [target,source] of [['database',path.join(temp,'database')],['uploads',path.join(temp,'uploads')],['themes/10bottlevalue-react-proof',theme],['plugins/tbv-public-woo-catalog',catalog],['plugins/tbv-local-homepage-proof',home],['plugins/tbv-catalog-import',importer]])await php.mount('/wordpress/wp-content/'+target,createNodeFsMountHandler(source));
}}});
const php=await handler.getPrimaryPhp(),fixture=fs.readFileSync(path.join(lab,'browser-fixture.php'),'utf8').replace(/^<\?php\s*/,'');
const init=await php.run({code:`<?php require '/wordpress/wp-load.php';update_option('template','10bottlevalue-react-proof');update_option('stylesheet','10bottlevalue-react-proof');update_option('active_plugins',['woocommerce/woocommerce.php','tbv-public-woo-catalog/tbv-public-woo-catalog.php','tbv-local-homepage-proof/tbv-local-homepage-proof.php']);update_option('woocommerce_currency','USD');update_option('woocommerce_price_num_decimals',2);${fixture} echo wp_json_encode($synthetic_fixture);`});
const synthetic=JSON.parse(init.text);if(!Array.isArray(synthetic.offers)||synthetic.offers.length!==12)throw Error('Invalid synthetic fixture');const allowedIds=new Set(synthetic.offers.map(o=>o.id));
const assets=path.join(theme,'public'),assetPrefix='/wp-content/themes/10bottlevalue-react-proof/public/';
const mime={'.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
let tail=Promise.resolve();
const server=http.createServer(async(request,response)=>{
 const url=new URL(request.url,origin);if(request.headers.host!=='127.0.0.1:9476'||(prefix&&!url.pathname.startsWith(prefix+'/')&&url.pathname!==prefix)){response.writeHead(403).end();return;}
 const pathname=url.pathname.slice(prefix.length)||'/';
 if(request.method==='GET'&&pathname==='/__test/fixture'){response.setHeader('content-type','application/json');response.end(JSON.stringify(synthetic));return;}
 if(/%(?:2f|5c|00)/i.test(url.pathname)||url.pathname.includes('//')||url.pathname.includes('\\')||/^\/(?:api|wp-admin|wp-login\.php|my-account|account|checkout|wc-api|order-pay)(?:\/|$)/i.test(pathname)||url.searchParams.has('wc-ajax')||url.searchParams.has('rest_route')||url.searchParams.has('add-to-cart')){response.writeHead(403).end();return;}
 const action=pathname==='/wp-json/wc/store/v1/cart/add-item';
 if(!['GET','HEAD'].includes(request.method)&&!(request.method==='POST'&&action)){response.writeHead(403).end();return;}
 if(pathname.startsWith('/wp-json/')&&!['/wp-json/wc/store/v1/cart','/wp-json/wc/store/v1/cart/add-item'].includes(pathname)){response.writeHead(403).end();return;}
 let body;
 if(action&&request.method==='POST'){
  if(request.headers.origin!==origin||!String(request.headers['content-type']||'').startsWith('application/json')){response.writeHead(403).end();return;}
  let chunks=[],size=0;for await(const chunk of request){size+=chunk.length;if(size>2048){response.writeHead(413).end();return;}chunks.push(chunk);}body=Buffer.concat(chunks);
  try{const data=JSON.parse(body.toString());if(!allowedIds.has(data.id)||!Number.isSafeInteger(data.quantity)||data.quantity<1||data.quantity>20||Object.keys(data).some(k=>!['id','quantity'].includes(k)))throw Error();}catch{response.writeHead(400).end();return;}
 }
 if(pathname.startsWith('/wp-includes/js/')){
  const includes=path.join(runtime,'site/wp-includes/js');let relative;
  try{relative=decodeURIComponent(pathname.slice('/wp-includes/js/'.length));}catch{response.writeHead(400).end();return;}
  const file=path.resolve(includes,relative);if(!file.startsWith(includes+path.sep)||!mime[path.extname(file)]||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){response.writeHead(404).end();return;}
  response.setHeader('content-type',mime[path.extname(file)]);if(request.method==='HEAD'){response.end();return;}fs.createReadStream(file).pipe(response);return;
 }
 if(pathname.startsWith(assetPrefix)){
  let relative;try{relative=decodeURIComponent(pathname.slice(assetPrefix.length));}catch{response.writeHead(400).end();return;}
  const file=path.resolve(assets,relative);if(!file.startsWith(assets+path.sep)||!mime[path.extname(file)]||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){response.writeHead(404).end();return;}
  response.setHeader('content-type',mime[path.extname(file)]);if(request.method==='HEAD'){response.end();return;}fs.createReadStream(file).pipe(response);return;
 }
 const old=tail;let done;tail=new Promise(resolve=>done=resolve);await old;
 try{const result=await handler.request({url:origin+url.pathname+url.search,method:request.method==='HEAD'?'GET':request.method,headers:{host:'127.0.0.1:9476','user-agent':'TBV local import proof',...(request.headers.cookie?{cookie:request.headers.cookie}:{}),...(request.headers.nonce?{nonce:request.headers.nonce}:{}),...(request.headers['cart-token']?{'cart-token':request.headers['cart-token']}:{}),...(body?{'content-type':request.headers['content-type']}:{})},...(body?{body:new Uint8Array(body)}:{})});response.statusCode=result.httpStatusCode;for(const [key,value] of Object.entries(result.headers))if(['content-type','content-security-policy','x-robots-tag','cache-control','location','cart-token','nonce','set-cookie'].includes(key.toLowerCase()))response.setHeader(key,value);response.end(request.method==='HEAD'?undefined:Buffer.from(result.bytes));}
 catch(error){console.error(error);response.writeHead(500).end();}finally{done();}
});
server.listen(9476,'127.0.0.1',()=>console.log('SYNTHETIC_IMPORTED_FIXTURE_READY '+origin+prefix));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await handler[Symbol.asyncDispose]();fs.rmSync(temp,{recursive:true,force:true});process.exit(0);}));
