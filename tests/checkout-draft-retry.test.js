import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/checkout-draft.js';
import {buildCheckoutDraft, normalizeCheckoutDraftInput} from '../api/_checkout-draft.js';
import {checkoutDraftRetry, signCheckoutDraft} from '../api/_checkout-draft-retry.js';
Object.assign(process.env,{SUPABASE_URL:'https://database.invalid',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',CHECKOUT_DRAFT_SIGNING_SECRET:'fixture-only-signing-key-not-a-secret-12345'});
const user={id:'11111111-1111-4111-8111-111111111111',email:'owner@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'};
const key='12345678-1234-4123-8123-123456789abc';
const flags={over21AndResearchUseOnly:true,qualifiedResearcherOrLicensedProfessional:true,noHumanOrAnimalUse:true,policiesAccepted:true};
const body=()=>({requestIdempotencyKey:key,firstName:'Fixture',lastName:'Customer',country:'United States',address:'Synthetic address',city:'Test city',postalCode:'00000',phone:'+1 234 567 8901',shippingType:'standard',purchaserAttestation:{...flags},items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:0.01}]});
const reply=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}});
async function run(input=body()){const res=reply();await handler({method:'POST',headers:{authorization:'Bearer fixture-session'},body:input},res);return res;}
function fixture({get,post,identity=user}={}) {
 const calls=[],rows=new Map();let reads=0,writes=0;
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),...options});
  if(String(url).endsWith('/auth/v1/user'))return Response.json(identity);
  const target=new URL(url);assert.equal(target.pathname,'/rest/v1/orders');assert.equal(options.headers.Authorization,'Bearer synthetic-service');assert.ok(options.signal);
  assert.equal(target.searchParams.get('select'),'id,user_id,email,status,total,items,metadata,created_at,payment_id,payment_provider,paid_at');
  assert.equal(target.searchParams.get('on_conflict'),null);
  if(options.method==='POST'){
   writes++;assert.equal(options.headers.Prefer,'return=representation');const row=JSON.parse(options.body);
   if(post)return post({row,rows,writes});
   if(rows.has(row.id))return Response.json({code:'23505'},{status:409});
   rows.set(row.id,row);return Response.json([row]);
  }
  reads++;assert.equal(target.searchParams.get('limit'),'2');
  const id=target.searchParams.get('id').slice(3);
  if(get)return get({id,rows,reads});
  return Response.json(rows.has(id)?[rows.get(id)]:[]);
 };
 return {calls,rows,get reads(){return reads;},get writes(){return writes;}};
}
test('same request reuses the signed original draft without another insert or internal proof disclosure',async()=>{
 const f=fixture();const a=await run(),b=await run();assert.equal(a.statusCode,201);assert.equal(b.statusCode,200);assert.deepEqual(a.body,b.body);assert.equal(f.writes,1);assert.equal(f.rows.size,1);assert.equal(a.body.order._draftRetry,undefined);assert.equal(a.body.order.total,null);
 const stored=[...f.rows.values()][0];assert.equal(stored.metadata._draftRetry.version,1);assert.match(stored.metadata._draftRetry.proof,/^[a-f0-9]{64}$/);for(const field of ['payment_id','payment_provider','paid_at'])assert.equal(stored[field],null);
});
test('lost INSERT acknowledgement recovers the committed row once',async()=>{
 const f=fixture({post:({row,rows})=>{rows.set(row.id,row);throw new Error('lost response');}});const r=await run();assert.equal(r.statusCode,200);assert.equal(f.writes,1);assert.equal(f.reads,2);assert.equal(r.body.order.id,[...f.rows.keys()][0]);
});
test('later manual retry after unreadable acknowledgement recovers the same ID',async()=>{
 const f=fixture({get:({id,rows,reads})=>reads===2?new Response('unavailable',{status:503}):Response.json(rows.has(id)?[rows.get(id)]:[]),post:({row,rows})=>{rows.set(row.id,row);throw new Error('lost');}});
 assert.equal((await run()).statusCode,503);const result=await run();assert.equal(result.statusCode,200);assert.equal(f.writes,1);assert.equal(f.rows.size,1);
});
test('concurrent same-key submissions converge under the unique order-ID contract',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve);let firstReads=0;
 const f=fixture({get:async({id,rows,reads})=>{if(reads<=2){if(++firstReads===2)release();await gate;return Response.json([]);}return Response.json(rows.has(id)?[rows.get(id)]:[]);}});
 const result=await Promise.all([run(),run()]);assert.deepEqual(result.map(r=>r.statusCode).sort(),[200,201]);assert.equal(result[0].body.order.id,result[1].body.order.id);assert.equal(f.rows.size,1);assert.equal(f.writes,2);
});
test('same key changed contact, cart, promo or shipping never overwrites the original',async()=>{
 const f=fixture();const original=await run();for(const changes of [{address:'Changed'},{items:[{...body().items[0],quantity:2}]},{promoCode:'NEW'},{shippingType:'express'}]){const r=await run({...body(),...changes});assert.equal(r.statusCode,409);}
 assert.equal(f.writes,1);assert.equal([...f.rows.values()][0].metadata.id,original.body.order.id);
});
test('ignored prices, caller IDs and local attestation timestamps do not change the retry input',async()=>{
 const f=fixture();const a=await run();const b=await run({...body(),id:'caller',total:1,createdAt:'caller',purchaserAttestation:{...flags,acceptedAt:'different'},items:[{...body().items[0],price:999}]});assert.deepEqual(a.body,b.body);assert.equal(b.statusCode,200);assert.equal(f.writes,1);
});
test('normalized blank fields, whitespace and worldwide default recover the same draft',async()=>{
 fixture();const a=await run();const b=await run({...body(),firstName:' Fixture ',address2:'',items:[{...body().items[0],fromWarehouse:'worldwide'}]});assert.equal(b.statusCode,200);assert.deepEqual(a.body,b.body);
});
test('different authenticated users and different keys derive separate draft IDs',async()=>{
 const f=fixture();const first=await run();const other=await run({...body(),requestIdempotencyKey:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});assert.notEqual(first.body.order.id,other.body.order.id);
 const input=normalizeCheckoutDraftInput(body());assert.notEqual(checkoutDraftRetry(key,user,input).id,checkoutDraftRetry(key,{...user,id:'22222222-2222-4222-8222-222222222222'},input).id);assert.equal(f.rows.size,2);
});
for(const value of [null,'',123,'caller-order-id','12345678-1234-1123-8123-123456789abc','12345678-1234-4123-7123-123456789abc'])test(`rejects invalid retry key ${JSON.stringify(value)} before DB access`,async()=>{const f=fixture();assert.equal((await run({...body(),requestIdempotencyKey:value})).statusCode,400);assert.equal(f.reads+f.writes,0);});
for(const secret of [undefined,'short'])test('keyed mode fails closed when its signing secret is unavailable or short',async()=>{const old=process.env.CHECKOUT_DRAFT_SIGNING_SECRET;const f=fixture();try{if(secret===undefined)delete process.env.CHECKOUT_DRAFT_SIGNING_SECRET;else process.env.CHECKOUT_DRAFT_SIGNING_SECRET=secret;assert.equal((await run()).statusCode,503);assert.equal(f.reads+f.writes,0);}finally{process.env.CHECKOUT_DRAFT_SIGNING_SECRET=old;}});
for(const [label,mutate] of [
 ['foreign owner',row=>row.user_id='foreign'],['foreign email',row=>row.email='foreign@example.invalid'],['paid state',row=>row.status='paid'],['provider quote',row=>{row.total=100;row.metadata.total=100;}],['provider attempt',row=>row.metadata.paymentProvider='stripe'],['unsigned legacy',row=>delete row.metadata._draftRetry],['modified contact',row=>row.metadata.address='changed'],['forged hash',row=>row.metadata._draftRetry.requestHash='a'.repeat(64)],['forged proof',row=>row.metadata._draftRetry.proof='a'.repeat(64)],['added metadata',row=>row.metadata.adminNotes='private'],['changed items',row=>row.items[0].price=1],['changed original timestamp',row=>row.metadata.createdAt='2026-10-09T00:00:00Z'],
 ['canonical payment ID',row=>row.payment_id='provider-attempt'],['canonical payment provider',row=>row.payment_provider='Stripe'],['canonical paid timestamp',row=>row.paid_at='2026-10-08T00:00:00Z'],['canonical created timestamp',row=>row.created_at='2027-01-01T00:00:00Z'],
 ['empty payment ID',row=>row.payment_id=''],['empty payment provider',row=>row.payment_provider=''],['pending payment provider',row=>row.payment_provider='pending'],['empty paid timestamp',row=>row.paid_at=''],
 ...['created_at','payment_id','payment_provider','paid_at'].map(field=>[`missing ${field}`,row=>delete row[field]]),
])test(`saved ${label} cannot be replayed or rewritten`,async()=>{const f=fixture();await run();mutate([...f.rows.values()][0]);const r=await run();assert.equal(r.statusCode,409);assert.equal(f.writes,1);assert.equal(JSON.stringify(r.body).includes('private'),false);});
test('equivalent database timestamp formatting preserves the original draft proof',async()=>{
 const f=fixture();const a=await run();const row=[...f.rows.values()][0];row.created_at=row.created_at.replace('Z','+00:00');const b=await run();assert.equal(b.statusCode,200);assert.deepEqual(b.body,a.body);assert.equal(f.writes,1);
});
for(const [field,value] of [['payment_id','provider-attempt'],['payment_provider','Stripe'],['paid_at','2026-10-08T00:00:00Z'],['created_at','2027-01-01T00:00:00Z']])test(`INSERT acknowledgement changed ${field} cannot be accepted as an untouched draft`,async()=>{
 const f=fixture({post:({row,rows})=>{row[field]=value;rows.set(row.id,row);return Response.json([row]);}});const r=await run();assert.equal(r.statusCode,409);assert.equal(f.writes,1);assert.equal(f.reads,2);assert.equal(r.body.code,'CHECKOUT_DRAFT_CHANGED');
});
test('JSONB key reordering preserves the proof and returns no database-only fields',async()=>{
 const f=fixture();const a=await run();const row=[...f.rows.values()][0];row.metadata=Object.fromEntries(Object.entries(row.metadata).reverse());row.items=row.items.map(item=>Object.fromEntries(Object.entries(item).reverse()));row.adminNotes='private';const b=await run();assert.equal(b.statusCode,200);assert.deepEqual(b.body,a.body);assert.equal(JSON.stringify(b.body).includes('private'),false);
});
test('signing-secret rotation does not silently allocate a replacement order',async()=>{const f=fixture();await run();const old=process.env.CHECKOUT_DRAFT_SIGNING_SECRET;try{process.env.CHECKOUT_DRAFT_SIGNING_SECRET='different-fixture-signing-key-123456789';assert.equal((await run()).statusCode,409);assert.equal(f.writes,1);}finally{process.env.CHECKOUT_DRAFT_SIGNING_SECRET=old;}});
test('signed saved snapshot is recovered before unavailable catalog selection is revalidated',async()=>{
 const input={...body(),items:[{name:'Retired fixture product',dose:'5 mg',quantity:1}]};const retry=checkoutDraftRetry(key,user,normalizeCheckoutDraftInput(input));const row=buildCheckoutDraft(body(),user,{id:retry.id});Object.assign(row,{payment_id:null,payment_provider:null,paid_at:null});row.items=[{name:'Retired fixture product',dose:'5 mg',quantity:1,price:79}];row.metadata.items=row.items;signCheckoutDraft(row,retry);
 const f=fixture({get:()=>Response.json([row])});const result=await run(input);assert.equal(result.statusCode,200);assert.equal(result.body.order.items[0].name,'Retired fixture product');assert.equal(f.writes,0);
});
for(const [label,get] of [['two rows',()=>Response.json([{},{}])],['malformed',()=>new Response('broken')],['failed',()=>new Response('no',{status:500})],['oversized',()=>new Response('x'.repeat(250001))]])test(`initial read ${label} prevents insertion`,async()=>{const f=fixture({get});assert.equal((await run()).statusCode,503);assert.equal(f.writes,0);});
test('failed insertion with no saved row stays unavailable and never automatically repeats INSERT',async()=>{const f=fixture({post:()=>Response.json({message:'private error'},{status:500})});const r=await run();assert.equal(r.statusCode,503);assert.equal(f.writes,1);assert.equal(f.reads,2);assert.equal(JSON.stringify(r.body).includes('private error'),false);});
test('malformed database URL fails with the generic unavailable response after verified authentication',async()=>{
 const old=process.env.SUPABASE_URL;const f=fixture();try{process.env.SUPABASE_URL='not a URL';const r=await run();assert.equal(r.statusCode,503);assert.equal(r.body.code,'CHECKOUT_DRAFT_UNAVAILABLE');assert.equal(f.reads+f.writes,0);}finally{process.env.SUPABASE_URL=old;}
});
