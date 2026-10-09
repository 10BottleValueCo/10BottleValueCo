import { PassThrough } from 'node:stream';
import { createHmac } from 'node:crypto';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { readNowPaymentsPayment } from '../api/_nowpayments-provider.js';
let processed=[];
mock.module('../api/_nowpayments-shared.js',{namedExports:{processNowPaymentsStatus:async(data,options)=>{processed.push({data,options});return {received:true}}}});
const webhook=(await import('../api/nowpayments-webhook.js')).default;
const res=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const env={NOWPAYMENTS_API_KEY:'synthetic-key'};
const payment={payment_id:12345,order_id:'INV-VERIFIED1',payment_status:'finished',price_amount:100,price_currency:'usd'};

test('NOWPayments provider status requires service key, exact returned ID and bound order',async()=>{
  assert.equal((await readNowPaymentsPayment('12345',{env:{},fetcher:()=>assert.fail('no key')})).status,503);
  for(const body of [{...payment,payment_id:9},{...payment,order_id:''},[],null])assert.equal((await readNowPaymentsPayment('12345',{env,fetcher:async()=>json(body)})).status,503);
  const result=await readNowPaymentsPayment('12345',{env,fetcher:async(url,options)=>{assert.equal(options.headers['x-api-key'],'synthetic-key');assert.equal(url,'https://api.nowpayments.io/v1/payment/12345');return json(payment)}});assert.deepEqual(result.payment,payment);
});
test('NOWPayments callback body is a hint; only authenticated provider result is processed',async t=>{
  const previous=process.env.NOWPAYMENTS_API_KEY;process.env.NOWPAYMENTS_API_KEY=env.NOWPAYMENTS_API_KEY;t.after(()=>{if(previous===undefined)delete process.env.NOWPAYMENTS_API_KEY;else process.env.NOWPAYMENTS_API_KEY=previous});
  processed=[];t.mock.method(globalThis,'fetch',async()=>json({...payment,payment_status:'waiting'}));
  const response=res();await webhook({method:'POST',headers:{},body:{payment_id:'12345',payment_status:'finished',order_id:'INV-ATTACKER',order_description:'{"order_id":"INV-ATTACKER"}'}},response);
  assert.equal(response.statusCode,200);assert.equal(processed.length,1);assert.equal(processed[0].data.order_id,'INV-VERIFIED1');assert.equal(processed[0].data.payment_status,'waiting');assert.deepEqual(processed[0].options,{providerVerified:true});
});
test('NOWPayments invalid or unavailable provider lookup produces no payment processing',async t=>{
  const previous=process.env.NOWPAYMENTS_API_KEY;process.env.NOWPAYMENTS_API_KEY=env.NOWPAYMENTS_API_KEY;t.after(()=>{if(previous===undefined)delete process.env.NOWPAYMENTS_API_KEY;else process.env.NOWPAYMENTS_API_KEY=previous});
  for(const [body,status] of [[{},400],[{payment_id:'12345'},503]]){
    processed=[];t.mock.method(globalThis,'fetch',async()=>json({},503));const response=res();await webhook({method:'POST',headers:{},body},response);assert.equal(response.statusCode,status);assert.deepEqual(processed,[]);
  }
});
test('Catalyst callback refuses to read or trust body without configured signature verification',async t=>{
  const previous=process.env.CATALYSTPAY_WEBHOOK_SECRET;delete process.env.CATALYSTPAY_WEBHOOK_SECRET;t.after(()=>{if(previous!==undefined)process.env.CATALYSTPAY_WEBHOOK_SECRET=previous});
  const handler=(await import('../api/catalystpay-webhook.js?missing-verification-secret')).default;
  t.mock.method(globalThis,'fetch',()=>assert.fail('must not fetch'));const response=res();await handler({method:'POST',headers:{},get body(){assert.fail('must not read body')}},response);assert.equal(response.statusCode,503);
});

test('Catalyst authenticates bounded raw stream without invoking a lazy parsed-body getter',async t=>{
  const previous=process.env.CATALYSTPAY_WEBHOOK_SECRET;process.env.CATALYSTPAY_WEBHOOK_SECRET='synthetic-catalyst-secret';t.after(()=>{if(previous===undefined)delete process.env.CATALYSTPAY_WEBHOOK_SECRET;else process.env.CATALYSTPAY_WEBHOOK_SECRET=previous});
  const handler=(await import('../api/catalystpay-webhook.js?raw-stream-acceptance')).default;
  t.mock.method(console,'error',()=>{});t.mock.method(globalThis,'fetch',()=>assert.fail('non-payment event must not fetch'));
  const raw=Buffer.from('{ "type": "unpaid" }');const req=new PassThrough();req.method='POST';req.headers={'x-signature':createHmac('sha256','synthetic-catalyst-secret').update(raw).digest('hex')};
  Object.defineProperty(req,'body',{get(){assert.fail('parsed getter must not run')}});
  const response=res(),run=handler(req,response);req.end(raw);await run;assert.equal(response.statusCode,200);assert.equal(response.body.skipped,'not_settled');
  const large=res();await handler({method:'POST',headers:{'content-length':'65537'},body:raw},large);assert.equal(large.statusCode,400);
});
test('Catalyst accepts documented BTCPay-Sig sha256 signature and rejects malformed, duplicate or tampered signatures',async t=>{
 const previous=process.env.CATALYSTPAY_WEBHOOK_SECRET;process.env.CATALYSTPAY_WEBHOOK_SECRET='synthetic-catalyst-secret';t.after(()=>{if(previous===undefined)delete process.env.CATALYSTPAY_WEBHOOK_SECRET;else process.env.CATALYSTPAY_WEBHOOK_SECRET=previous});
 const handler=(await import('../api/catalystpay-webhook.js?official-signature-acceptance')).default;
 t.mock.method(console,'error',()=>{});t.mock.method(globalThis,'fetch',()=>assert.fail('non-payment event must not fetch'));
 const raw=Buffer.from('{ "type": "InvoiceExpired" }'),signature=createHmac('sha256','synthetic-catalyst-secret').update(raw).digest('hex');
 const valid=res();await handler({method:'POST',headers:{'btcpay-sig':`sha256=${signature}`},body:raw},valid);assert.equal(valid.statusCode,200);assert.equal(valid.body.skipped,'not_settled');
 for(const value of ['',signature,`sha1=${signature}`,`sha256=${'0'.repeat(64)}`,`sha256=${signature}, sha256=${signature}`,[`sha256=${signature}`]]){
  const invalid=res();await handler({method:'POST',headers:{'btcpay-sig':value,'x-signature':signature},body:raw},invalid);assert.equal(invalid.statusCode,401);
 }
 const tampered=res();await handler({method:'POST',headers:{'btcpay-sig':`sha256=${signature}`},body:Buffer.from('{"type":"InvoiceSettled"}')},tampered);assert.equal(tampered.statusCode,401);
});
