import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.TBV_PLAYWRIGHT_MODULE,chrome=process.env.TBV_CHROME_BIN;
if(!modulePath||!chrome||!path.isAbsolute(modulePath)||!path.isAbsolute(chrome))throw Error('Set absolute TBV_PLAYWRIGHT_MODULE and TBV_CHROME_BIN');
const {chromium}=await import(pathToFileURL(modulePath));const origin='http://127.0.0.1:9476',prefix=process.env.TBV_SITE_PREFIX==='root'?'':'/wordpresspreview';
const viewport=process.env.TBV_TEST_DESKTOP==='1'?{width:1440,height:900}:{width:390,height:844};const browser=await chromium.launch({executablePath:chrome,headless:true});let passed=0;
try{
 const context=await browser.newContext({viewport});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),path:new URL(r.url()).pathname})});
 for(const slug of ['bpc-157-10mg','tb-500-bpc-157-10mg'])for(const pack of [1,5,10]){
  const query=pack===10?'?tbv_option=empty':`?pack=${pack}&tbv_option=empty`;const response=await page.goto(origin+prefix+'/'+slug+query,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.locator('h1').first().waitFor();const value=await page.getByText('Kit total',{exact:true}).locator('..').innerText();
  if(pack===10)assert.match(value,/100 mg total/i);else {assert.match(value,/—/);assert.doesNotMatch(value,/100 mg/i);}
  const selector=page.getByRole('region',{name:'Choose your quantity'});assert.equal(await selector.getByRole('button',{name:new RegExp(`^${pack} vials?,`)}).getAttribute('aria-pressed'),'true');passed++;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await context.close();console.log(JSON.stringify({passed,total:6,scope:prefix||'/',viewport,checks:'10-pack historical total only; smaller imported test packs display unknown; selected pack preserved'}));
}finally{await browser.close();}
