import test from 'node:test';
import assert from 'node:assert/strict';
import {createCheckoutSession} from '../artifacts/10-bottle-value/src/checkout-session.js';
const owner={id:'owner-id',email:'owner@example.invalid'};
const session=(changes={})=>({access_token:'synthetic-token',user:owner,...changes});
function fixture({read=async()=>({data:{session:session()}}),isCurrent=()=>true,fetcher=async()=>new Response('{"ok":true}')}={}) {
  return {supabase:{auth:{getSession:read}},expectedEmail:owner.email,isCurrent,fetcher};
}
test('expired initial session stops before caller can write an order draft',async()=>{
  await assert.rejects(createCheckoutSession(fixture({read:async()=>({data:{session:null}})})),/session/);
});
test('different session email cannot start the checkout',async()=>{
  await assert.rejects(createCheckoutSession(fixture({read:async()=>({data:{session:session({user:{...owner,email:'other@example.invalid'}})}})})),/session/);
});
test('missing expected account is not guest checkout',async()=>{
  await assert.rejects(createCheckoutSession({...fixture(),expectedEmail:''}),/session/);
});
test('account switching during session resolution is rejected',async()=>{
  let current=true;
  await assert.rejects(createCheckoutSession(fixture({isCurrent:()=>current,read:async()=>{current=false;return {data:{session:session()}};}})),/session/);
});
test('initial auth check has a hard ten-second deadline and ignores late success',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const holder={current:null};let release,calls=0,accepted=false;
  const pending=createCheckoutSession({...fixture({
    read:()=>new Promise(resolve=>{release=resolve;}),
    fetcher:async()=>{calls++;return Response.json({ok:true});},
  }),draftAttemptRef:holder}).then(client=>{accepted=true;return client;});
  await new Promise(resolve=>setImmediate(resolve));
  t.mock.timers.tick(9_999);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(accepted,false);assert.equal(calls,0);
  t.mock.timers.tick(1);await assert.rejects(pending,/session/);
  release({data:{session:session()}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(accepted,false);assert.equal(calls,0);assert.equal(holder.current,null);
});
test('refreshes token before provider request and injects canonical email',async()=>{
  let reads=0; const calls=[];
  const client=await createCheckoutSession(fixture({
    read:async()=>({data:{session:session({access_token:++reads===1?'old-token':'fresh-token'})}}),
    fetcher:async(url,options)=>{calls.push({url,...options});return new Response('{"clientSecret":"synthetic"}');},
  }));
  const res=await client.post('/api/create-payment-intent',{email:'spoof@example.invalid',items:[]});
  assert.equal(calls[0].headers.Authorization,'Bearer fresh-token');
  assert.equal(JSON.parse(calls[0].body).email,owner.email);
  assert.equal(calls[0].cache,'no-store'); assert.deepEqual(await res.json(),{clientSecret:'synthetic'});
});
test('NOWPayments and CatalystPay receive customer_email plus Bearer',async()=>{
  for(const route of ['/api/create-payment','/api/create-catalystpay-session']) {
    const client=await createCheckoutSession(fixture({fetcher:async(url,options)=>{
      assert.equal(url,route); assert.equal(JSON.parse(options.body).customer_email,owner.email);
      assert.equal(options.headers.Authorization,'Bearer synthetic-token');return new Response('{}');
    }})); await client.post(route,{});
  }
});
test('NOWPayments retains content-type and text response handling',async()=>{
  const client=await createCheckoutSession(fixture({fetcher:async()=>new Response('{"invoice_url":"https://provider.invalid/pay"}',{headers:{'Content-Type':'application/json'}})}));
  const res=await client.post('/api/create-payment',{});
  assert.ok(res.headers.get('content-type').includes('application/json'));
  assert.equal(JSON.parse(await res.text()).invoice_url,'https://provider.invalid/pay');
});
test('changed UUID with the same email cannot reuse draft session',async()=>{
  let reads=0,calls=0;
  const client=await createCheckoutSession(fixture({read:async()=>({data:{session:session({user:++reads===1?owner:{...owner,id:'other-id'}})}}),fetcher:async()=>{calls++;}}));
  await assert.rejects(client.post('/api/create-payment-intent',{}),/session/);assert.equal(calls,0);
});
test('a session lost after draft persistence creates no provider request',async()=>{
  let reads=0,calls=0;
  const client=await createCheckoutSession(fixture({read:async()=>({data:{session:++reads===1?session():null}}),fetcher:async()=>{calls++;}}));
  await assert.rejects(client.post('/api/create-payment-intent',{}),/session/);assert.equal(calls,0);
});
test('token cannot be sent to an arbitrary destination',async()=>{
  let calls=0;const client=await createCheckoutSession(fixture({fetcher:async()=>{calls++;}}));
  await assert.rejects(client.post('https://foreign.invalid/api/create-payment',{}),/Unknown/);assert.equal(calls,0);
});
test('an account switch during provider I/O does not display its response',async()=>{
  let current=true;
  const client=await createCheckoutSession(fixture({isCurrent:()=>current,fetcher:async()=>{current=false;return new Response('{}');}}));
  await assert.rejects(client.post('/api/create-payment-intent',{}),/session/);
});
test('an account switch during response parsing discards client secret',async()=>{
  let current=true;
  const client=await createCheckoutSession(fixture({isCurrent:()=>current,fetcher:async()=>({ok:true,status:200,json:async()=>{current=false;return {clientSecret:'synthetic'};}})}));
  const response=await client.post('/api/create-payment-intent',{});
  await assert.rejects(response.json(),/session/);
});

const draftId='INV-AAAAAAAAAAAAAAAAAAAAAAAA';
const savedOrder=()=>({id:draftId,email:owner.email,status:'pending',total:null,subtotal:79,items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:79}],pricingState:'awaiting_provider_quote',createdAt:'2026-10-08T02:30:00Z'});
test('draft uses authenticated server endpoint and transmits no price, ownership or paid state',async()=>{
 let sent;const options=fixture({fetcher:async(url,request)=>{assert.equal(url,'/api/checkout-draft');sent=request;return Response.json({ok:true,order:savedOrder()});}});
 options.supabase.from=()=>{throw new Error('Direct database access must not occur');};
 const client=await createCheckoutSession(options);const result=await client.saveDraft({id:'INV-SPOOF',user_id:'other',email:'spoof@example.invalid',status:'paid',total:0.01,items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:0.01}],firstName:'Fixture'});
 const body=JSON.parse(sent.body);assert.equal(sent.headers.Authorization,'Bearer synthetic-token');assert.equal(sent.cache,'no-store');assert.ok(sent.signal instanceof AbortSignal);assert.equal(body.email,owner.email);assert.equal(body.firstName,'Fixture');assert.equal(body.items[0].price,undefined);
 for(const key of ['id','user_id','status','total'])assert.equal(body[key],undefined);
 assert.equal(result.id,draftId);assert.equal(result.total,null);
});
for(const [label,payload,status] of [['unavailable',{error:'unavailable'},503],['missing order',{ok:true},200],['foreign identity',{ok:true,order:{...savedOrder(),email:'foreign@example.invalid'}},200],['paid state',{ok:true,order:{...savedOrder(),status:'paid'}},200],['client-selected ID',{ok:true,order:{...savedOrder(),id:'INV-VICTIM'}},200],['payable draft',{ok:true,order:{...savedOrder(),total:100}},200]])test(`draft rejects ${label}`,async()=>{
 const client=await createCheckoutSession(fixture({fetcher:async()=>Response.json(payload,{status})}));await assert.rejects(client.saveDraft({items:[]}),/could not be saved/);
});
test('account switch during server draft creation suppresses success',async()=>{
 let current=true;const client=await createCheckoutSession(fixture({isCurrent:()=>current,fetcher:async()=>{current=false;return Response.json({ok:true,order:savedOrder()});}}));await assert.rejects(client.saveDraft({items:[]}),/session/);
});
test('account switch during draft response parsing suppresses success',async()=>{
 let current=true;const client=await createCheckoutSession(fixture({isCurrent:()=>current,fetcher:async()=>({ok:true,json:async()=>{current=false;return {ok:true,order:savedOrder()};}})}));await assert.rejects(client.saveDraft({items:[]}),/session/);
});
test('draft cannot be created after losing its verified session',async()=>{
 let reads=0,writes=0;const client=await createCheckoutSession(fixture({read:async()=>({data:{session:++reads===1?session():null}}),fetcher:async()=>{writes++;}}));await assert.rejects(client.saveDraft({items:[]}),/session/);assert.equal(writes,0);
});
test('slow draft creation aborts after ten seconds without automatically retrying',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal,calls=0;
 const client=await createCheckoutSession(fixture({fetcher:async(url,options)=>{calls++;signal=options.signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));}}));
 const pending=client.saveDraft({items:[]});await new Promise(resolve=>setImmediate(resolve));assert.equal(signal.aborted,false);t.mock.timers.tick(10_000);
 await assert.rejects(pending,/could not be saved/);assert.equal(signal.aborted,true);assert.equal(calls,1);
});

const inputDraft=()=>({firstName:' Fixture ',shippingType:'standard',storeCreditUsed:0,
 purchaserAttestation:{over21AndResearchUseOnly:true,qualifiedResearcherOrLicensedProfessional:true,noHumanOrAnimalUse:true,policiesAccepted:true,acceptedAt:'old'},
 items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:79}]});

test('same account/scope and normalized payload retain one strong key across helpers and failed saves',async()=>{
 const holder={current:null}, sent=[];
 const options={...fixture({fetcher:async(url,req)=>{sent.push(JSON.parse(req.body));return Response.json({}, {status:503});}}),draftAttemptRef:holder,accountScope:7};
 await assert.rejects((await createCheckoutSession(options)).saveDraft(inputDraft()));
 const changed={...inputDraft(),firstName:'Fixture',id:'local-new',createdAt:'new',total:999,items:[{...inputDraft().items[0],price:1,fromWarehouse:'worldwide'}],purchaserAttestation:{...inputDraft().purchaserAttestation,acceptedAt:'new'}};
 await assert.rejects((await createCheckoutSession(options)).saveDraft(changed));
 assert.equal(sent[0].requestIdempotencyKey,sent[1].requestIdempotencyKey);
 assert.match(sent[0].requestIdempotencyKey,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(sent[0].purchaserAttestation.acceptedAt,undefined);assert.equal(sent[0].items[0].price,undefined);
 assert.equal(holder.current.pending,false);
});
test('contact, quantity, warehouse, variant, shipping, promo, flags and credit changes get new keys',async()=>{
 for(const change of [{address:'New address'},{items:[{...inputDraft().items[0],quantity:2}]},{items:[{...inputDraft().items[0],fromWarehouse:'us'}]},{items:[{...inputDraft().items[0],noteLabel:'with/d'}]},{shippingType:'express'},{promoCode:'OTHER'},{storeCreditUsed:1},{purchaserAttestation:{...inputDraft().purchaserAttestation,policiesAccepted:false}}]) {
  const holder={current:null};const keys=[];const options={...fixture({fetcher:async(url,req)=>{keys.push(JSON.parse(req.body).requestIdempotencyKey);return Response.json({}, {status:503});}}),draftAttemptRef:holder};
  const client=await createCheckoutSession(options);await assert.rejects(client.saveDraft(inputDraft()));await assert.rejects(client.saveDraft({...inputDraft(),...change}));assert.notEqual(keys[0],keys[1]);
 }
});
test('holder cannot cross a scope or actual UUID even with the same email',async()=>{
 const holder={current:null};const keys=[];
 const make=async(scope,id)=>createCheckoutSession({...fixture({read:async()=>({data:{session:session({user:{...owner,id}})}}),fetcher:async(url,req)=>{keys.push(JSON.parse(req.body).requestIdempotencyKey);return Response.json({}, {status:503});}}),draftAttemptRef:holder,accountScope:scope});
 for(const [scope,id] of [[1,'first-id'],[2,'first-id'],[2,'second-id']])await assert.rejects((await make(scope,id)).saveDraft(inputDraft()));
 assert.equal(new Set(keys).size,3);
});
test('only an accepted success clears the retry holder; a later intentional order gets a new key',async()=>{
 const holder={current:null};const keys=[];let valid=false;
 const client=await createCheckoutSession({...fixture({fetcher:async(url,req)=>{keys.push(JSON.parse(req.body).requestIdempotencyKey);return Response.json(valid?{ok:true,order:savedOrder()}:{ok:true,order:{...savedOrder(),status:'paid'}});}}),draftAttemptRef:holder});
 await assert.rejects(client.saveDraft(inputDraft()));assert.ok(holder.current);valid=true;
 await client.saveDraft(inputDraft());assert.equal(holder.current,null);await client.saveDraft(inputDraft());
 assert.equal(keys[0],keys[1]);assert.notEqual(keys[1],keys[2]);
});
test('unavailable strong UUID generation fails before a request and does not invent a weak fallback',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');let calls=0;
 try {
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{}});
  const client=await createCheckoutSession(fixture({fetcher:async()=>{calls++;}}));
  await assert.rejects(client.saveDraft(inputDraft()),/could not be saved/);assert.equal(calls,0);
 } finally {Object.defineProperty(globalThis,'crypto',descriptor);}
});
test('hard deadline covers body parsing even when the response ignores abort',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});const holder={current:null};let signal;
 const client=await createCheckoutSession({...fixture({fetcher:async(url,req)=>{signal=req.signal;return {ok:true,json:()=>new Promise(()=>{})};}}),draftAttemptRef:holder});
 const pending=client.saveDraft(inputDraft());await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(10000);
 await assert.rejects(pending,/could not be saved/);assert.equal(signal.aborted,true);assert.ok(holder.current?.key);assert.equal(holder.current.pending,false);
});
test('ignored abort still meets deadline and a late response cannot clear or unlock a newer retry',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});const holder={current:null};const releases=[],keys=[];
 const client=await createCheckoutSession({...fixture({fetcher:async(url,req)=>{keys.push(JSON.parse(req.body).requestIdempotencyKey);return new Promise(resolve=>releases.push(resolve));}}),draftAttemptRef:holder});
 const first=client.saveDraft(inputDraft());await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(10000);await assert.rejects(first,/could not be saved/);
 const second=client.saveDraft(inputDraft());await new Promise(resolve=>setImmediate(resolve));assert.equal(keys[0],keys[1]);assert.equal(holder.current.pending,true);
 releases[0](Response.json({ok:true,order:savedOrder()}));await new Promise(resolve=>setImmediate(resolve));assert.equal(holder.current.pending,true);
 releases[1](Response.json({ok:true,order:savedOrder()}));await second;assert.equal(holder.current,null);
});
test('same-email UUID replacement during parsing is rejected before accepting or clearing a draft',async()=>{
 const holder={current:null};let switched=false;
 const client=await createCheckoutSession({...fixture({read:async()=>({data:{session:session({user:switched?{...owner,id:'different-id'}:owner})}}),fetcher:async()=>({ok:true,json:async()=>{switched=true;return {ok:true,order:savedOrder()};}})}),draftAttemptRef:holder});
 await assert.rejects(client.saveDraft(inputDraft()),/session/);assert.ok(holder.current?.key);
});
