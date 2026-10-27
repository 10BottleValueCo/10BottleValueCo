import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const browserModule=process.env.TBV_PLAYWRIGHT_MODULE, chrome=process.env.TBV_CHROME_BIN;
if (!browserModule || !chrome || !path.isAbsolute(browserModule) || !path.isAbsolute(chrome)) throw Error('Set absolute TBV_PLAYWRIGHT_MODULE and TBV_CHROME_BIN paths');
const {chromium}=await import(pathToFileURL(browserModule));
const origin='http://127.0.0.1:9475', base=process.env.TBV_SITE_PREFIX==='root'?'':'/wordpresspreview';
const browser=await chromium.launch({executablePath:chrome,headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),path:new URL(r.url()).pathname})});
 await page.goto(origin+base+'/shop',{waitUntil:'domcontentloaded'});
 const matching=await page.evaluate(()=>window.TBV_WOO_CATALOG.filter(x=>x.name==='Synthetic Checkout Fixture Do Not Sell' && x.warehouse==='worldwide' && x.pack===5 && x.noteLabel==='with/d'));
 assert.equal(matching.length,1);const expectedId=matching[0].wooVariationId;assert.ok(Number.isSafeInteger(expectedId));
 await page.getByPlaceholder('Search peptides').fill('Synthetic Checkout Fixture');
 const card=page.locator('.bpc-catalog-card').filter({hasText:'Synthetic Checkout Fixture Do Not Sell with/d'}).first();await card.waitFor();
 await card.locator('button[data-vials="5"]').click();const add=page.waitForResponse(r=>r.url().includes('/cart/add-item')&&r.request().method()==='POST');
 await card.getByRole('button',{name:/Add to Cart/i}).click();assert.equal((await add).status(),201);
 console.log('Synthetic variation added');
 await page.locator('a[aria-label=Cart]').first().click();await page.waitForURL(origin+base+'/cart/');await page.getByRole('link',{name:/proceed to checkout/i}).click();
 console.log('Native checkout opened');
 await page.locator('#billing_first_name').fill('Synthetic');await page.locator('#billing_last_name').fill('Tester');await page.locator('#billing_country').selectOption('US');
 await page.locator('#billing_address_1').fill('1 Example Street');await page.locator('#billing_city').fill('Seattle');await page.locator('#billing_state').selectOption('WA');await page.locator('#billing_postcode').fill('98101');
 await page.locator('#billing_phone').fill('2065550100');await page.locator('#billing_email').fill('checkout@example.invalid');const ship=page.locator('#ship-to-different-address-checkbox');if(await ship.isChecked())await ship.uncheck();
 await page.waitForTimeout(3000);const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));assert.ok(overflow.scroll<=overflow.width+1);
 let finish,posted,targetUrl;const response=new Promise(resolve=>{finish=resolve});
 await page.route('**/*wc-ajax=checkout*',async route=>{posted=route.request().postData();targetUrl=route.request().url();const r=await route.fetch();const raw=await r.text();await route.fulfill({response:r,body:raw});finish({status:r.status(),raw})});
 await page.locator('#place_order').click();let result, timeout;
 try {result=await Promise.race([response,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Synthetic checkout request did not arrive')),20000)})]);}
 catch (error) {const notices=await page.locator('.woocommerce-error, .woocommerce-notices-wrapper').allTextContents();throw new Error(`${error.message}; synthetic notices: ${JSON.stringify(notices)}; page errors: ${JSON.stringify(errors)}`);}
 finally {clearTimeout(timeout);}
 const body=JSON.parse(result.raw);assert.equal(result.status,200);assert.equal(body.result,'success');
 const match=body.redirect.match(/order-received\/(\d+)/);assert.ok(match);const inspected=await (await page.request.get(origin+base+'/__test/order?id='+match[1])).json();
 assert.equal(inspected.status,'pending');assert.equal(inspected.paid,false);assert.equal(inspected.total,'54.00');assert.match(String(inspected.shipping),/^3(?:\.0{1,2})?$/);assert.equal(inspected.shippingVersion,'ui-checkout-fixture-1');assert.equal(inspected.productId,expectedId);assert.equal(inspected.quantity,1);assert.equal(inspected.markedOrders,1);
 assert.equal(inspected.paymentComplete,0);assert.equal(inspected.stockReduced,0);assert.equal(inspected.mailIntercepted,0);
 const replay=await page.request.post(targetUrl,{headers:{origin,'content-type':'application/x-www-form-urlencoded; charset=UTF-8'},data:posted});const replayBody=await replay.json();const after=await (await page.request.get(origin+base+'/__test/order?id='+match[1])).json();
 assert.notEqual(replayBody.result,'success');assert.equal(after.markedOrders,1);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log(JSON.stringify({scope:base||'/',result:'synthetic checkout submitted; order pending and unpaid',checks:'variation, quantity, total, shipping version, no payment/stock/mail hooks, replay and overflow'}));
} finally {await browser.close();}
