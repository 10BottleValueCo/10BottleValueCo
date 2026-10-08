import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Synthetic fixtures; all auth, database and provider I/O is intercepted.
const providerCalls = [];
mock.module('stripe', { defaultExport: class {
  constructor() {
    this.paymentIntents = { create: async payload => { providerCalls.push(payload); return {client_secret:'synthetic-secret'}; } };
    this.checkout = {sessions: {create: async payload => {providerCalls.push(payload); return {client_secret:'synthetic-secret',id:'session-fixture'};}}};
  }
} });
Object.assign(process.env, {
  SUPABASE_URL:'https://database.invalid', VITE_SUPABASE_URL:'https://database.invalid',
  SUPABASE_ANON_KEY:'synthetic-public-key', SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key',
  STRIPE_SECRET_KEY:'sk_test_synthetic', NOWPAYMENTS_API_KEY:'synthetic-key',
  CATALYSTPAY_MERCHANT_ID:'synthetic-merchant', CATALYSTPAY_API_TOKEN:'synthetic-token',
});
const routes = ['create-payment','create-catalystpay-session','create-payment-intent','create-stripe-session'];
const handlers = Object.fromEntries(await Promise.all(routes.map(async route => [route,(await import(`../api/${route}.js`)).default])));
const user = {id:'11111111-1111-4111-8111-111111111111', email:'Owner@Example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'};
const body = () => ({orderId:'synthetic-order',order_id:'synthetic-order',items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:0.01}]});
const response = () => ({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function network(identity=user, authStatus=200) {
  const calls=[]; providerCalls.length=0;
  let order={id:"synthetic-order",user_id:null,email:"owner@example.invalid",status:"checkout",metadata:{}};
  globalThis.fetch = async (url, options={}) => {
    calls.push({url:String(url),...options});
    if (String(url).endsWith('/auth/v1/user')) {
      assert.equal(options.headers.Authorization,'Bearer synthetic-session');
      return json(identity,authStatus);
    }
    if (String(url).includes('/rest/v1/orders')) {
      if (String(url).includes('select=id&limit=1')) return json([]);
      if(options.method==='PATCH') order={...order,...JSON.parse(options.body)};
      return json([order]);
    }
    if (String(url).startsWith('https://api.nowpayments.io/') || String(url).startsWith('https://api-staging.paidlyinteractive.com/')) {
      providerCalls.push(JSON.parse(options.body));
      return json({id:'invoice-fixture',invoice_url:'https://provider.invalid/pay',checkoutLink:'https://provider.invalid/pay'});
    }
    throw new Error('Unexpected network destination');
  };
  return calls;
}
for (const route of routes) {
  const run=async(requestBody=body(),headers={authorization:'Bearer synthetic-session'})=>{
    const res=response(); await handlers[route]({method:'POST',headers,body:requestBody},res); return res;
  };
  test(`${route}: anonymous requests perform no provider or database I/O`,async()=>{
    const calls=network(); const res=await run(body(),{});
    assert.equal(res.statusCode,401); assert.equal(calls.length,0); assert.equal(providerCalls.length,0);
  });
  test(`${route}: invalid session stops at authentication`,async()=>{
    const calls=network({},401); const res=await run();
    assert.equal(res.statusCode,401); assert.equal(calls.length,1); assert.equal(providerCalls.length,0);
  });
  test(`${route}: unavailable auth does not create a payment`,async()=>{
    const calls=network({},503); const res=await run();
    assert.equal(res.statusCode,503); assert.equal(calls.length,1); assert.equal(providerCalls.length,0);
  });
  test(`${route}: unconfirmed email and forged role are insufficient`,async()=>{
    const calls=network({...user,email_confirmed_at:null,user_metadata:{role:'admin',email_confirmed_at:'now'}}); const res=await run();
    assert.equal(res.statusCode,403); assert.equal(calls.length,1); assert.equal(providerCalls.length,0);
  });
  test(`${route}: malformed verified identity fails closed`,async()=>{
    const calls=network({...user,id:'not-a-uuid'}); const res=await run();
    assert.equal(res.statusCode,403); assert.equal(calls.length,1);
  });
  for (const claim of [{email:'other@example.invalid'},{customer_email:'other@example.invalid'},{metadata:{email:'other@example.invalid'}},{email:{value:user.email}}]) {
    test(`${route}: rejects conflicting identity ${JSON.stringify(claim)}`,async()=>{
      const calls=network(); const res=await run({...body(),...claim});
      assert.equal(res.statusCode,403); assert.equal(res.body.code,'CHECKOUT_IDENTITY_MISMATCH');
      assert.equal(calls.length,1); assert.equal(providerCalls.length,0);
    });
  }
  test(`${route}: server identity reaches real pricing and mocked provider`,async()=>{
    const calls=network(); const res=await run({...body(),email:' OWNER@example.invalid ',customer_email:'owner@example.invalid'});
    assert.equal(res.statusCode,200,JSON.stringify(res.body)); assert.equal(providerCalls.length,1);
    assert.equal(calls[0].url,'https://database.invalid/auth/v1/user');
    const payload=providerCalls[0];
    if (route==='create-catalystpay-session') assert.equal(payload.metadata.CustomerId,'owner_example_invalid');
    else if (route==='create-payment') assert.equal(payload.customer_email,'owner@example.invalid');
    else { assert.equal(payload.metadata.email,'owner@example.invalid'); assert.ok(Number(payload.metadata.total)>0.01); }
    assert.equal(res.headers['Cache-Control'],'no-store');
  });
  test(`${route}: missing client email derives from verified session`,async()=>{
    network(); const res=await run();
    assert.equal(res.statusCode,200); assert.equal(providerCalls.length,1);
  });
  test(`${route}: body validation follows auth before provider I/O`,async()=>{
    const calls=network(); const res=await run([]);
    assert.equal(res.statusCode,400); assert.equal(calls.length,1); assert.equal(providerCalls.length,0);
  });
}
