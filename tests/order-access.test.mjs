import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { orderIdentity, ownsOrder, requireLegacyOrderAccess } from '../api/_order-access.js';
const customerId='11111111-1111-4111-8111-111111111111', otherId='22222222-2222-4222-8222-222222222222';
const email='buyer@example.test', orderId='INV-ACCESS123';
const identity={id:customerId,email};
const user={...identity,email_confirmed_at:'2026-10-08T00:00:00Z'};
const row={id:orderId,user_id:customerId,email,status:'pending',total:100,metadata:{storeCreditUsed:0},payment_provider:null};
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function fixture(t,{auth=user,orders=[row],readStatus=200,bindings=[]}={}){
  const env={SUPABASE_URL:'https://fixture.example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'};
  const prev=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
  t.after(()=>{for(const [k,v] of Object.entries(prev)){if(v===undefined)delete process.env[k];else process.env[k]=v}});
  const calls=[];
  t.mock.method(globalThis,'fetch',async(input,options={})=>{
    const url=new URL(input);calls.push({url,options});
    if(url.pathname==='/auth/v1/user')return json(auth);
    if(url.pathname==='/rest/v1/orders')return json(orders,readStatus);
    if(url.pathname==='/rest/v1/paylio_payment_attempts')return json(bindings);
    assert.fail(`unexpected network request: ${url.pathname}`);
  });
  return calls;
}
const request=()=>({method:'POST',headers:{authorization:'Bearer fixture-session'},body:{orderId,email}});

test('verified identity rejects missing UUID or confirmation; nonnull UUID wins over matching email',()=>{
  assert.deepEqual(orderIdentity(user),identity);
  for(const bad of [{...user,id:''},{...user,email_confirmed_at:null},{...user,email:'invalid'},{...user,id:undefined}])assert.equal(orderIdentity(bad),null);
  assert.equal(ownsOrder({...row,user_id:otherId},identity),false);
  assert.equal(ownsOrder({...row,user_id:null},identity),true);
  assert.equal(ownsOrder({...row,user_id:undefined},identity),false);
});
test('missing bearer is rejected before order storage or any provider IO',async t=>{
  const calls=fixture(t);const res=response();await requireLegacyOrderAccess({body:{orderId},headers:{}},res,{orderId});
  assert.equal(res.statusCode,401);assert.equal(calls.length,0);
});
test('unconfirmed or mismatched claimed email cannot query orders',async t=>{
  for(const options of [{auth:{...user,email_confirmed_at:null}},{auth:user}]){
    const calls=fixture(t,options);const res=response(),req=request();if(options.auth===user)req.body.customer_email='foreign@example.test';
    await requireLegacyOrderAccess(req,res,{orderId});assert.equal(res.statusCode,403);assert.equal(calls.length,1);
  }
});
test('foreign and missing orders have equivalent responses; no email override of another UUID',async t=>{
  const responses=[];
  for(const orders of [[],[{...row,user_id:otherId}]]){fixture(t,{orders});const res=response();await requireLegacyOrderAccess(request(),res,{orderId});assert.equal(res.statusCode,404);responses.push(res.body)}
  assert.deepEqual(...responses);
});
test('strict service-role lookup is bounded and binds exact owner/id',async t=>{
  const calls=fixture(t);const res=response();const result=await requireLegacyOrderAccess(request(),res,{orderId});
  assert.equal(result.order.id,orderId);assert.deepEqual(result.identity,identity);
  const query=calls[1];assert.equal(query.options.headers.apikey,'fixture-service');assert.equal(query.url.searchParams.get('limit'),'2');assert.equal(query.url.searchParams.get('id'),`eq.${orderId}`);
});
test('completed, wrong-email and Merit orders cannot start a legacy provider',async t=>{
  for(const change of [{status:'paid'},{status:'refunded'},{email:'other@example.test'},{payment_provider:'Merit'},{metadata:{paymentProvider:'Merit'}}]){
    fixture(t,{orders:[{...row,...change}]});const res=response();assert.equal(await requireLegacyOrderAccess(request(),res,{orderId}),null);assert.equal(res.statusCode,409);
  }
});
test('ambiguous or failed order storage fails closed',async t=>{
  for(const options of [{orders:[row,row]},{orders:{}},{orders:[row],readStatus:503}]){
    fixture(t,options);const res=response();assert.equal(await requireLegacyOrderAccess(request(),res,{orderId}),null);assert.equal(res.statusCode,503);
  }
});
test('only a confirmed server-recognized support identity can reconcile another order',async t=>{
  fixture(t,{auth:{...user,email:'support@10bottlevalue.co'},orders:[{...row,user_id:otherId,status:'paid'}]});const req=request();req.body={orderId};const res=response();
  assert.ok(await requireLegacyOrderAccess(req,res,{orderId,payable:false,allowAdmin:true}));
  fixture(t,{auth:{...user,email:'support@10bottlevalue.co',email_confirmed_at:null}});const denied=response();assert.equal(await requireLegacyOrderAccess(req,denied,{orderId,payable:false,allowAdmin:true}),null);assert.equal(denied.statusCode,403);
});

let providerCalls=0;
mock.module('stripe',{defaultExport:class{checkout={sessions:{create:async()=>{providerCalls++;return {}}}};paymentIntents={create:async()=>{providerCalls++;return {}},retrieve:async()=>{providerCalls++;return {}}}}});
for(const name of ['create-payment','create-paylio-payment','create-catalystpay-session','create-stripe-session','create-payment-intent','confirm-stripe-payment','verify-nowpayments-payment']){
  const handler=(await import(`../api/${name}.js`)).default;
  test(`${name}: no session or foreign owner cannot reach provider or mutate storage`,async t=>{
    for(const anonymous of [true,false]){
      providerCalls=0;const calls=fixture(t,{orders:[{...row,user_id:otherId}]});const req=request();req.body={orderId,order_id:orderId,email,items:[]};if(anonymous)req.headers={};
      const res=response();await handler(req,res);assert.equal(res.statusCode,anonymous?401:404,JSON.stringify(res.body));assert.equal(providerCalls,0);assert.ok(calls.every(c=>!c.options.method||c.options.method==='GET'));
    }
  });
}

test('private Paylio reservation blocks alternate provider even if public metadata has no payment label',async t=>{
  fixture(t,{bindings:[{order_id:orderId}]});const blocked=response();assert.equal(await requireLegacyOrderAccess(request(),blocked,{orderId}),null);assert.equal(blocked.statusCode,409);assert.equal(blocked.body.code,'PAYMENT_ALREADY_RESERVED');
  const allowed=response();assert.ok(await requireLegacyOrderAccess(request(),allowed,{orderId,provider:'paylio'}));
});

test('authorized order and reservation reads overlap without dropping either guard', async t => {
  fixture(t);
  const started = [], releases = new Map();
  t.mock.method(globalThis, 'fetch', async input => {
    const path = new URL(input).pathname;
    if (path === '/auth/v1/user') return json(user);
    started.push(path);
    return new Promise(resolve => releases.set(path, resolve));
  });
  const res = response();
  const pending = requireLegacyOrderAccess(request(), res, { orderId });
  for (let tries = 0; started.length < 2 && tries < 100; tries++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.deepEqual(started, ['/rest/v1/orders', '/rest/v1/paylio_payment_attempts']);
  releases.get('/rest/v1/orders')(json([row]));
  releases.get('/rest/v1/paylio_payment_attempts')(json([{ order_id: orderId }]));
  assert.equal(await pending, null);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'PAYMENT_ALREADY_RESERVED');
});

test('reservation read failures stay closed and do not reveal foreign order state', async t => {
  fixture(t);
  let own = true;
  t.mock.method(globalThis, 'fetch', async input => {
    const path = new URL(input).pathname;
    if (path === '/auth/v1/user') return json(user);
    if (path === '/rest/v1/orders') return json([{ ...row, user_id: own ? customerId : otherId }]);
    throw new Error('reservation store unavailable');
  });
  const unavailable = response();
  assert.equal(await requireLegacyOrderAccess(request(), unavailable, { orderId }), null);
  assert.equal(unavailable.statusCode, 503);
  own = false;
  const hidden = response();
  assert.equal(await requireLegacyOrderAccess(request(), hidden, { orderId }), null);
  assert.equal(hidden.statusCode, 404);
});

test('read-only order access never queries payment reservations', async t => {
  const calls = fixture(t);
  assert.ok(await requireLegacyOrderAccess(request(), response(), { orderId, payable: false }));
  assert.deepEqual(calls.map(x => x.url.pathname), ['/auth/v1/user', '/rest/v1/orders']);
});
