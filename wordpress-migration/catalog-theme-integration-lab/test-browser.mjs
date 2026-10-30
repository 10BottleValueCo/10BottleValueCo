import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.TBV_PLAYWRIGHT_MODULE,chrome=process.env.TBV_CHROME_BIN;
if(!modulePath||!chrome||!path.isAbsolute(modulePath)||!path.isAbsolute(chrome))throw Error('Set absolute TBV_PLAYWRIGHT_MODULE and TBV_CHROME_BIN');
const {chromium}=await import(pathToFileURL(modulePath));
const origin='http://127.0.0.1:9476',prefix=process.env.TBV_SITE_PREFIX==='root'?'':'/wordpresspreview';
const viewport=process.env.TBV_TEST_DESKTOP==='1'?{width:1440,height:900}:{width:390,height:844};
const browser=await chromium.launch({executablePath:chrome,headless:true});let passed=0;
try{
 const bootstrap=await browser.newContext();const fixture=await (await bootstrap.request.get(origin+prefix+'/__test/fixture')).json();await bootstrap.close();
 assert.equal(fixture.offers.length,12);
 for(const offer of fixture.offers){
  const context=await browser.newContext({viewport});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),path:new URL(r.url()).pathname})});
  try {
   await page.goto(origin+prefix+(offer.warehouse==='us'?'/us-warehouse':'/shop'),{waitUntil:'domcontentloaded'});
   await page.getByPlaceholder('Search peptides').fill('SYNTHETIC IMPORT FIXTURE');
   const exact=page.locator('.bpc-catalog-card').filter({hasText:'SYNTHETIC IMPORT FIXTURE - DO NOT SELL'}).filter({hasNotText:offer.formulation?'__never_matches__':'with/d'});
   const selected=offer.formulation?exact.filter({hasText:offer.formulation}).first():exact.first();
   await selected.waitFor({state:'visible'});await selected.locator(`button[data-vials="${offer.pack}"]`).click();
   const pending=page.waitForResponse(r=>r.url().includes('/wp-json/wc/store/v1/cart/add-item')&&r.request().method()==='POST');
   await selected.getByRole('button',{name:/Add to Cart/i}).click();const result=await pending;
   assert.equal(result.status(),201);const data=await result.json(),sent=result.request().postDataJSON();
   assert.equal(sent.id,offer.id);assert.equal(data.items.length,1);assert.equal(data.items[0].id,offer.id);assert.equal(data.items[0].prices.price,String(offer.price*100));assert.equal(data.items[0].quantity,1);
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);passed++;
  }finally{await context.close();}
 }
 console.log(JSON.stringify({passed,total:12,scope:prefix||'/',viewport,checks:'imported synthetic offer selection, posted and returned variation ID, quantity and fixture price'}));
}finally{await browser.close();}
