import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const base = process.env.TBV_TEST_BASE_URL, modulePath = process.env.TBV_PLAYWRIGHT_MODULE, browserPath = process.env.TBV_CHROME_BIN;
if (!base || !modulePath || !browserPath || !path.isAbsolute(modulePath) || !path.isAbsolute(browserPath)) throw Error('Set TBV_TEST_BASE_URL, absolute TBV_PLAYWRIGHT_MODULE and TBV_CHROME_BIN');
const origin = new URL(base);
if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1') throw Error('This visual test is restricted to a local fixture');
const {chromium} = await import(pathToFileURL(modulePath));
const browser = await chromium.launch({executablePath:browserPath,headless:true});
let passed=0;
try {
  for (const viewport of [{width:390,height:844},{width:1440,height:900}]) {
    const page=await browser.newPage({viewport});
    const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.status())});
    await page.route('**/*',route=>new URL(route.request().url()).origin===origin.origin?route.continue():route.abort());
    for (const route of ['', 'shop', 'retatrutide-5mg', 'cart/']) {
      const response=await page.goto(new URL(route,base.endsWith('/')?base:base+'/').href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
      const banner=route==='cart/'?page.locator('.tbv-native-proof'):page.locator('[role="note"]').filter({hasText:'WORDPRESS PREVIEW'});
      assert.match(await banner.innerText(),/WORDPRESS PREVIEW/);assert.equal((await banner.boundingBox()).y,0);
      await page.waitForTimeout(500);
      const screenshot=(await page.screenshot()).toString('base64');
      const pixel=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);return Array.from(context.getImageData(4,4,1,1).data);},screenshot);
      assert.deepEqual(pixel,[255,228,134,255],`Preview banner not painted above page: ${route||'home'}`);passed++;
    }
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await page.close();
  }
} finally {await browser.close();}
console.log(JSON.stringify({passed,scope:base,checks:'Preview banner text and painted pixels at page top on home, shop, product and cart, mobile and desktop'}));
