import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
const id='INV-LIFECYCLE1',email='buyer@example.test',userId='11111111-1111-4111-8111-111111111111';
let provider;
mock.module('stripe',{defaultExport:class{paymentIntents={retrieve:async()=>provider,search:async()=>({data:[provider]})}}});
const handler=(await import('../api/confirm-stripe-payment.js')).default;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
function fixture(t,{status='checkout',patchRace=false,intent={}}={}){
  const old={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY};Object.assign(process.env,{SUPABASE_URL:'https://local.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',STRIPE_SECRET_KEY:'sk_test_fixture'});
  t.after(()=>{for(const[k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}});
  const row={id,user_id:userId,email,status,total:100,payment_provider:null,metadata:{total:100,storeCreditUsed:0}};const calls=[];
  provider={id:'pi_fixture',status:'succeeded',currency:'usd',amount:10000,amount_received:10000,metadata:{orderId:id,email,total:'100.00',storeCreditUsed:'0'},...intent};
  t.mock.method(console,'log',()=>{});t.mock.method(console,'error',()=>{});
  t.mock.method(globalThis,'fetch',async(input,options={})=>{
    const url=new URL(input),method=options.method||'GET';calls.push({url,method,options});
    if(url.pathname==='/auth/v1/user')return json({id:userId,email,email_confirmed_at:'2026-10-09T00:00:00Z'});
    if(method==='GET'&&url.pathname==='/rest/v1/orders')return json([row]);
    if(method==='PATCH'&&url.pathname==='/rest/v1/orders'){
      assert.equal(url.searchParams.get('status'),`eq.${row.status}`);assert.equal(url.searchParams.get('email'),`eq.${email}`);assert.equal(url.searchParams.get('user_id'),`eq.${userId}`);assert.equal(url.searchParams.get('total'),'eq.100');
      if(patchRace)return json([]);Object.assign(row,JSON.parse(options.body));return json([row]);
    }
    assert.fail(`unexpected IO ${method} ${url.pathname}`);
  });
  const invoke=async()=>{const res=response();await handler({method:'POST',headers:{authorization:'Bearer fixture-session'},body:{orderId:id,paymentIntentId:'pi_fixture'}},res);return res};
  return {calls,row,invoke};
}
for(const status of ['refunded','cancelled','canceled'])test(`succeeded Stripe intent cannot restore ${status} order`,async t=>{const f=fixture(t,{status});const res=await f.invoke();assert.equal(res.statusCode,409);assert.equal(f.row.status,status);assert.equal(f.calls.some(c=>c.method!=='GET'),false)});
for(const status of ['paid','done','shipped','delivered'])test(`Stripe replay preserves ${status} fulfillment state`,async t=>{const f=fixture(t,{status});const res=await f.invoke();assert.equal(res.body.confirmed,true);assert.equal(res.body.dbUpdated,false);assert.equal(f.row.status,status);assert.equal(f.calls.some(c=>c.method!=='GET'),false)});
test('Stripe pending success acknowledges exactly saved row and conditions the write',async t=>{const f=fixture(t);const res=await f.invoke();assert.deepEqual(res.body,{confirmed:true,dbUpdated:true});assert.equal(f.row.status,'paid')});
test('Stripe stale state cannot produce a successful acknowledgement',async t=>{const f=fixture(t,{patchRace:true});const res=await f.invoke();assert.ok(res.statusCode>=500);assert.notEqual(res.body.confirmed,true)});
for(const intent of [{amount_received:9999},{currency:'eur'},{metadata:{orderId:id,email,total:'99.00'}},{metadata:{email,total:'100.00'}}])test(`Stripe zero-credit proof binds exact amount, currency and order ${JSON.stringify(intent)}`,async t=>{const f=fixture(t,{intent});const res=await f.invoke();assert.ok(res.statusCode>=400);assert.equal(f.calls.some(c=>c.method!=='GET'),false)});
