import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import Stripe from 'stripe';

// All provider and database calls below are intercepted. No live I/O.
let intentFixture;
class StripeDouble extends Stripe {
  constructor() {
    super('sk_test_synthetic');
    this.paymentIntents = { retrieve: async () => structuredClone(intentFixture) };
  }
}
mock.module('stripe', { defaultExport: StripeDouble });
Object.assign(process.env, {
  SUPABASE_URL: 'https://database.invalid', VITE_SUPABASE_URL: 'https://database.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key', SUPABASE_ANON_KEY: 'synthetic-public-key',
  STRIPE_SECRET_KEY: 'sk_test_synthetic', RESEND_API_KEY: 'synthetic-email-key',
  NOWPAYMENTS_API_KEY: 'synthetic-provider-key', INTERNAL_API_SECRET: 'synthetic-internal-key',
});
const modules = {};
for (const name of ['supabase/orders', 'supabase/orders/[id]', 'supabase/orders/[id]/paid', 'supabase/affiliate-orders', 'supabase/send-tracking-email', 'nowpayments-webhook', 'catalystpay-webhook', 'paylio-callback', 'create-paylio-payment', 'send-payment-confirmed-email', 'send-registration-email', 'create-payment-intent', 'create-stripe-session', 'create-payment', 'create-catalystpay-session', 'confirm-stripe-payment']) {
  modules[name] = (await import(`../api/${name}.js`)).default;
}
function response() {
  return { statusCode: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.statusCode=n; return this; }, json(v) { this.body=v; return this; }, end(v) { this.body=v; return this; }, send(v) { this.body=v; return this; } };
}
function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers: {'content-type':'application/json'} }); }
function fixtureFetch(fn) {
  const calls=[];
  globalThis.fetch = async (url, options={}) => { calls.push({url:String(url), ...options}); return fn(String(url), options); };
  return calls;
}
function noNetwork() { return fixtureFetch(() => { throw new Error('Unexpected external call'); }); }
const admin = {id:'admin-id', email:'support@10bottlevalue.co', email_confirmed_at:'2026-01-01T00:00:00Z'};
const protectedRoutes = [
  ['supabase/orders','GET',{}], ['supabase/orders','POST',{id:'test',status:'paid'}],
  ['supabase/orders/[id]','PATCH',{status:'paid'}], ['supabase/orders/[id]/paid','PATCH',{}],
  ['supabase/affiliate-orders','POST',{}], ['supabase/send-tracking-email','POST',{email:'fixture@example.invalid',orderId:'test',trackingNumber:'test'}],
];
for (const [route,method,body] of protectedRoutes) {
  test(`${route} ${method}: anonymous cannot reach privileged storage`, async()=>{
    const calls=noNetwork(); const res=response();
    await modules[route]({method,headers:{},query:{id:'test'},body},res);
    assert.equal(res.statusCode,401); assert.equal(calls.length,0);
  });
  test(`${route} ${method}: authenticated non-admin cannot mutate`, async()=>{
    const calls=fixtureFetch(url=> { assert.ok(url.endsWith('/auth/v1/user')); return json({id:'customer',email:'fixture@example.invalid',email_confirmed_at:'now',user_metadata:{role:'admin'}}); });
    const res=response(); await modules[route]({method,headers:{authorization:'Bearer test-token'},query:{id:'test'},body},res);
    assert.equal(res.statusCode,403); assert.equal(calls.length,1);
  });
  test(`${route} ${method}: verified admin retains permitted behavior`, async()=>{
    const calls=fixtureFetch(url=>url.endsWith('/auth/v1/user') ? json(admin) : json(url.includes('/emails') ? {id:'message'} : []));
    const res=response(); await modules[route]({method,headers:{authorization:'Bearer test-token'},query:{id:'test'},body},res);
    assert.ok(res.statusCode>=200 && res.statusCode<300); assert.ok(calls.length>=2);
  });
}
test('unconfirmed admin email is denied',async()=>{
  const calls=fixtureFetch(()=>json({...admin,email_confirmed_at:null})); const res=response();
  await modules['supabase/orders']({method:'GET',headers:{authorization:'Bearer test-token'}},res);
  assert.equal(res.statusCode,403); assert.equal(calls.length,1);
});
for (const route of ['create-payment-intent','create-stripe-session','create-payment','create-catalystpay-session']) {
  test(`${route}: claimed credit is rejected before provider I/O`,async()=>{
    const calls=noNetwork(); const res=response(); await modules[route]({method:'POST',body:{storeCreditUsed:999},headers:{}},res);
    assert.equal(res.statusCode,409); assert.equal(res.body.code,'STORE_CREDIT_REQUIRES_SERVER_LEDGER'); assert.equal(calls.length,0);
  });
}
test('NOWPayments rejects unsigned body without database/provider I/O',async()=>{
  process.env.NOWPAYMENTS_IPN_SECRET='synthetic-ipn-secret'; const calls=noNetwork(); const res=response();
  await modules['nowpayments-webhook']({method:'POST',headers:{},body:{payment_id:1,order_id:'test',payment_status:'finished'}},res);
  assert.equal(res.statusCode,401); assert.equal(calls.length,0);
});
test('NOWPayments fails closed without IPN configuration',async()=>{
  delete process.env.NOWPAYMENTS_IPN_SECRET; delete process.env.NOWPAYMENTS_IPN_SECRET_KEY;
  const calls=noNetwork(); const res=response(); await modules['nowpayments-webhook']({method:'POST',headers:{},body:{}},res);
  assert.equal(res.statusCode,503); assert.equal(calls.length,0);
});
test('NOWPayments ignores signed callback status when provider is still waiting',async()=>{
  process.env.NOWPAYMENTS_IPN_SECRET='synthetic-ipn-secret';
  const body={payment_id:1,order_id:'test',payment_status:'finished'};
  const signature=createHmac('sha512',process.env.NOWPAYMENTS_IPN_SECRET).update(JSON.stringify(body,Object.keys(body).sort())).digest('hex');
  const calls=fixtureFetch(url=>{assert.ok(url.startsWith('https://api.nowpayments.io/v1/payment/'));return json({...body,payment_status:'waiting'});});
  const res=response(); await modules['nowpayments-webhook']({method:'POST',headers:{'x-nowpayments-sig':signature},body},res);
  assert.equal(res.statusCode,200); assert.equal(res.body.skipped,'not_relevant'); assert.equal(calls.length,1);
});
test('CatalystPay fails closed with absent secret or signature',async()=>{
  delete process.env.CATALYSTPAY_WEBHOOK_SECRET; const calls=noNetwork(); let res=response();
  await modules['catalystpay-webhook']({method:'POST',headers:{},body:'{}'},res); assert.equal(res.statusCode,503);
  process.env.CATALYSTPAY_WEBHOOK_SECRET='synthetic-catalyst-secret'; res=response();
  await modules['catalystpay-webhook']({method:'POST',headers:{},body:'{"type":"InvoiceSettled"}'},res);
  assert.equal(res.statusCode,401); assert.equal(calls.length,0);
});
test('CatalystPay accepts documented BTCPay signature format',async()=>{
  const body='{"type":"InvoiceExpired"}'; const secret=process.env.CATALYSTPAY_WEBHOOK_SECRET;
  const signature='sha256='+createHmac('sha256',secret).update(body).digest('hex'); const calls=noNetwork(); const res=response();
  await modules['catalystpay-webhook']({method:'POST',headers:{'btcpay-sig':signature},body},res);
  assert.equal(res.statusCode,200); assert.equal(res.body.skipped,'not_settled'); assert.equal(calls.length,0);
});
for (const route of ['paylio-callback','create-paylio-payment']) test(`${route} cannot charge or trust an unbound callback`,async()=>{
  const calls=noNetwork(); const res=response(); await modules[route]({method:'POST',headers:{},body:{status:'paid',order_id:'test'}},res);
  assert.equal(res.statusCode,503); assert.equal(calls.length,0);
});
test('public payment receipt endpoint cannot send email',async()=>{
  const calls=noNetwork(); const res=response(); await modules['send-payment-confirmed-email']({method:'POST',headers:{},body:{email:'fixture@example.invalid',orderId:'test'}},res);
  assert.equal(res.statusCode,401); assert.equal(calls.length,0);
});
test('internal verified payment receipt still sends',async()=>{
  const calls=fixtureFetch(url=>{assert.equal(url,'https://api.resend.com/emails');return json({id:'message'});}); const res=response();
  await modules['send-payment-confirmed-email']({method:'POST',headers:{'x-internal-api-secret':process.env.INTERNAL_API_SECRET},body:{email:'fixture@example.invalid',orderId:'test',total:100}},res);
  assert.equal(res.statusCode,200); assert.equal(calls.length,1);
});
function succeededIntent(overrides={}) { return { id:'pi_fixture',status:'succeeded',currency:'usd',amount:10000,amount_received:10000,metadata:{orderId:'test',email:'fixture@example.invalid'},...overrides }; }
for (const [label,fixture,expected] of [ ['missing binding',succeededIntent({metadata:{}}),409],['wrong currency',succeededIntent({currency:'eur'}),409],['wrong amount',succeededIntent({amount_received:1}),409],['valid pending',succeededIntent(),200] ]) {
  test(`Stripe read-only confirmation: ${label}`,async()=>{
    intentFixture=fixture; const calls=fixtureFetch((url,options)=>{assert.equal(options.method,'GET');return json([{id:'test',email:'fixture@example.invalid',total:100,status:'checkout'}]);});
    const res=response(); await modules['confirm-stripe-payment']({method:'POST',headers:{},body:{orderId:'test',paymentIntentId:'pi_fixture'}},res);
    assert.equal(res.statusCode,expected); assert.equal(res.body.dbUpdated,false); assert.ok(calls.every(call=>call.method==='GET'));
  });
}
test('Stripe read-only confirmation reports committed webhook result',async()=>{
  intentFixture=succeededIntent(); const calls=fixtureFetch((url,options)=>{assert.equal(options.method,'GET');return json([{id:'test',email:'fixture@example.invalid',total:100,status:'paid',payment_id:'pi_fixture'}]);});
  const res=response(); await modules['confirm-stripe-payment']({method:'POST',headers:{},body:{orderId:'test',paymentIntentId:'pi_fixture'}},res);
  assert.equal(res.statusCode,200); assert.equal(res.body.confirmed,true); assert.equal(res.body.dbUpdated,true); assert.equal(calls.length,1);
});
const processNowPaymentsStatus = (await import('../api/_nowpayments-shared.js')).processNowPaymentsStatus;
const paidProviderFixture = {payment_id:'synthetic-payment',order_id:'test',payment_status:'finished',price_amount:100,price_currency:'usd',pay_currency:'btc'};
function orderFixture(status='checkout') {return {id:'test',status,email:'fixture@example.invalid',total:100,metadata:{total:100,subtotal:100,items:[],catalystpay_invoice_id:'invoice-fixture'}};}
test('NOWPayments terminal order is never resurrected by a paid notification',async()=>{
  const calls=fixtureFetch((url,options)=>{assert.equal(options.method,undefined);return json([orderFixture('refunded')]);});
  const result=await processNowPaymentsStatus(paidProviderFixture);
  assert.equal(result.skipped,'terminal_order'); assert.equal(calls.length,1);
});
test('NOWPayments amount mismatch causes no writes',async()=>{
  const calls=fixtureFetch((url,options)=>{assert.equal(options.method,undefined);return json([orderFixture()]);});
  const result=await processNowPaymentsStatus({...paidProviderFixture,price_amount:1});
  assert.equal(result.dbWriteError,'payment_order_mismatch'); assert.equal(calls.length,1);
});
test('NOWPayments sends confirmation only after a successful conditional paid transition',async()=>{
  const calls=fixtureFetch((url,options)=>{
    if(url.includes('/affiliate_customers')) return json([]);
    if(url.includes('/send-payment-confirmed-email')) return json({ok:true});
    if(options.method==='PATCH') return json([{id:'test',status:'paid'}]);
    return json([orderFixture()]);
  });
  const result=await processNowPaymentsStatus(paidProviderFixture);
  assert.equal(result.dbMarkedPaid,true);
  const paidIndex=calls.findIndex(c=>c.method==='PATCH' && JSON.parse(c.body).status==='paid');
  const emailIndex=calls.findIndex(c=>c.url.includes('/send-payment-confirmed-email'));
  assert.ok(paidIndex>=0 && emailIndex>paidIndex);
  assert.equal(JSON.parse(calls[paidIndex].body).total,100);
  assert.ok(decodeURIComponent(calls[paidIndex].url).includes('status=in.(pending,checkout,"checkout (clicked pay)")'));
});
test('NOWPayments rejected paid write has no email or accounting effects',async()=>{
  const calls=fixtureFetch((url,options)=>{
    if(url.includes('/affiliate_customers')) return json([]);
    if(options.method==='PATCH') return json({error:'synthetic unavailable'},503);
    return json([orderFixture()]);
  });
  const result=await processNowPaymentsStatus(paidProviderFixture);
  assert.equal(result.dbMarkedPaid,false); assert.ok(result.dbWriteError);
  assert.ok(calls.every(c=>!c.url.includes('/send-payment-confirmed-email') && !c.url.includes('/user_credits')));
});
test('CatalystPay signed settled invoice must match the stored invoice',async()=>{
  const body=JSON.stringify({type:'InvoiceSettled',invoiceId:'wrong-invoice',metadata:{OrderId:'test'}});
  const signature='sha256='+createHmac('sha256',process.env.CATALYSTPAY_WEBHOOK_SECRET).update(body).digest('hex');
  const calls=fixtureFetch((url,options)=>{assert.equal(options.method,undefined);return json([orderFixture()]);}); const res=response();
  await modules['catalystpay-webhook']({method:'POST',headers:{'btcpay-sig':signature},body},res);
  assert.equal(res.statusCode,409); assert.equal(calls.length,1);
});
test('CatalystPay valid settled invoice follows conditional paid write before email',async()=>{
  const body=JSON.stringify({type:'InvoiceSettled',invoiceId:'invoice-fixture',metadata:{OrderId:'test'}});
  const signature='sha256='+createHmac('sha256',process.env.CATALYSTPAY_WEBHOOK_SECRET).update(body).digest('hex');
  const calls=fixtureFetch((url,options)=>{
    if(url.includes('/send-payment-confirmed-email'))return json({ok:true});
    if(options.method==='PATCH')return json([{id:'test',status:'paid'}]);
    return json([orderFixture()]);
  }); const res=response(); await modules['catalystpay-webhook']({method:'POST',headers:{'btcpay-sig':signature},body},res);
  assert.equal(res.statusCode,200);assert.equal(res.body.dbMarkedPaid,true);
  const paidWrite=calls.find(c=>c.method==='PATCH' && JSON.parse(c.body).status==='paid');
  assert.equal(JSON.parse(paidWrite.body).total,100);
  assert.ok(calls.findIndex(c=>c.url.includes('/send-payment-confirmed-email'))>calls.findIndex(c=>c.method==='PATCH' && JSON.parse(c.body).status==='paid'));
});
