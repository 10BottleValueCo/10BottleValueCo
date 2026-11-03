import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.TBV_PLAYWRIGHT_MODULE,chrome=process.env.TBV_CHROME_BIN;
if(!modulePath||!chrome||!path.isAbsolute(modulePath)||!path.isAbsolute(chrome))throw Error('Set absolute TBV_PLAYWRIGHT_MODULE and TBV_CHROME_BIN');
const {chromium}=await import(pathToFileURL(modulePath));const origin='http://127.0.0.1:9476',prefix=process.env.TBV_SITE_PREFIX==='root'?'':'/wordpresspreview';
const viewport=process.env.TBV_TEST_DESKTOP==='1'?{width:1440,height:900}:{width:390,height:844};
const browser=await chromium.launch({executablePath:chrome,headless:true});let passed=0;
try{
 for(const formulation of ['', 'with/d']){
  const context=await browser.newContext({viewport});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),path:new URL(r.url()).pathname})});
  try{
   const fixture=await (await page.request.get(origin+prefix+'/__test/fixture')).json();const expected=fixture.offers.find(o=>o.warehouse==='us'&&o.formulation===formulation&&o.pack===5);assert.ok(expected);
   await page.goto(origin+prefix+'/us-warehouse',{waitUntil:'domcontentloaded'});await page.getByPlaceholder('Search peptides').fill('SYNTHETIC IMPORT FIXTURE');
   const candidates=page.locator('.bpc-catalog-card').filter({hasText:'SYNTHETIC IMPORT FIXTURE - DO NOT SELL'});
   const card=formulation?candidates.filter({hasText:formulation}).first():candidates.filter({hasNotText:'with/d'}).first();await card.waitFor();await card.locator('button[data-vials="5"]').click();
   await card.locator('.bpc-catalog-card__product-link').click();await page.waitForURL(/synthetic-import-fixture-do-not-sell-5mg/);
   const verify=async()=>{
    const title=await page.locator('h1').first().innerText();if(formulation)assert.match(title,/with\/d/);else assert.doesNotMatch(title,/with\/d/);
    assert.equal(await page.getByRole('button',{name:'US',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByRole('region',{name:'Choose your quantity'}).getByRole('button',{name:`5 vials, $${expected.price}`}).getAttribute('aria-pressed'),'true');
   };
   await verify();await page.reload({waitUntil:'domcontentloaded'});await verify();
   const pending=page.waitForResponse(r=>r.url().includes('/cart/add-item')&&r.request().method()==='POST');
   await page.getByRole('button',{name:/Add to Cart/i}).filter({visible:true}).first().click();const added=await pending;assert.equal(added.status(),201);assert.equal(added.request().postDataJSON().id,expected.id);assert.equal((await added.json()).items[0].id,expected.id);
   await page.locator('a[aria-label=Cart]').first().click();await page.waitForURL(origin+prefix+'/cart/');
   const link=page.locator('.woocommerce-cart-form a').filter({hasText:'SYNTHETIC IMPORT FIXTURE'}).first();await link.waitFor();await link.click();await page.waitForLoadState('domcontentloaded');await verify();
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);passed++;
  }finally{await context.close();}
 }
 console.log(JSON.stringify({passed,total:2,scope:prefix||'/',viewport,checks:'card, reload and native-cart link preserve empty and named option, warehouse, pack, fixture price and variation ID'}));
}finally{await browser.close();}
