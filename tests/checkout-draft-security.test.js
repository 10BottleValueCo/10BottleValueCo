import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/checkout-draft.js';
import { validateAndPriceItems } from '../api/_catalog.js';

Object.assign(process.env,{SUPABASE_URL:'https://database.invalid',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'});
const identity={id:'11111111-1111-4111-8111-111111111111',email:'OWNER@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z'};
const flags={over21AndResearchUseOnly:true,qualifiedResearcherOrLicensedProfessional:true,noHumanOrAnimalUse:true,policiesAccepted:true};
const body=()=>({firstName:'Fixture',lastName:'Customer',country:'United States',address:'Synthetic address',city:'Test city',postalCode:'00000',phone:'+1 234 567 8901',shippingType:'standard',purchaserAttestation:{...flags},items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:0.01}]});
const reply=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
function network({user=identity,authStatus=200,insert}={}) {
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),...options});
  if(String(url).endsWith('/auth/v1/user'))return json(user,authStatus);
  assert.equal(new URL(url).pathname,'/rest/v1/orders');assert.equal(options.method,'POST');
  assert.equal(options.headers.Authorization,'Bearer synthetic-service');assert.ok(options.signal);
  const record=JSON.parse(options.body);
  return insert?insert(record,options):json([{...record,adminNotes:'MUST NOT RETURN',privateCost:99}]);
 };
 return calls;
}
async function run(value=body(),changes={}){const res=reply();await handler({method:'POST',headers:{authorization:'Bearer synthetic-session'},body:value,...changes},res);return res;}

test('draft requires POST without authenticating other methods',async()=>{const calls=network();const res=await run(body(),{method:'GET'});assert.equal(res.statusCode,405);assert.equal(res.headers.Allow,'POST');assert.equal(calls.length,0);});
test('anonymous draft request writes nothing',async()=>{const calls=network();const res=await run(body(),{headers:{}});assert.equal(res.statusCode,401);assert.equal(calls.length,0);});
for(const [label,user,status,expected] of [['expired',{},401,401],['auth unavailable',{},503,503],['unconfirmed',{...identity,email_confirmed_at:null},200,403],['invalid UUID',{...identity,id:'owner'},200,403]])test(`${label} session cannot insert a draft`,async()=>{const calls=network({user,authStatus:status});assert.equal((await run()).statusCode,expected);assert.equal(calls.length,1);});
test('conflicting identity claim is denied',async()=>{const calls=network();assert.equal((await run({...body(),email:'other@example.invalid'})).statusCode,403);assert.equal(calls.length,1);});
test('missing service key never falls back to anonymous writes',async()=>{const calls=network();const key=process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;try{assert.equal((await run()).statusCode,503);assert.equal(calls.length,1);}finally{process.env.SUPABASE_SERVICE_ROLE_KEY=key;}});
test('server controls identity, ID and pending state; catalog price wins; total remains unknown',async()=>{
 const calls=network();const input={...body(),id:'INV-VICTIM',user_id:'victim',status:'paid',total:0.01,paymentId:'fake',paidAt:'fake',affiliateCommission:9000,affiliateOwnerEmail:'other@example.invalid',metadata:{status:'paid',admin:true},purchaserAttestation:{...flags,acceptedAt:'forged'}};
 const res=await run(input);assert.equal(res.statusCode,201);const sent=JSON.parse(calls[1].body);
 assert.match(sent.id,/^INV-[A-F0-9]{24}$/);assert.equal(sent.user_id,identity.id);assert.equal(sent.email,'owner@example.invalid');assert.equal(sent.status,'pending');assert.equal(sent.total,null);assert.equal(sent.items[0].price,79);
 assert.equal(sent.metadata.total,null);assert.equal(sent.metadata.subtotal,79);assert.equal(sent.metadata.pricingState,'awaiting_provider_quote');assert.equal(sent.metadata.purchaserAttestation.acceptedAt,sent.created_at);
 for(const key of ['paidAt','paymentId','affiliateCommission','affiliateOwnerEmail','admin','user_id'])assert.equal(sent.metadata[key],undefined);
 assert.equal(new URL(calls[1].url).searchParams.get('on_conflict'),null);assert.equal(calls[1].headers.Prefer,'return=representation');
 assert.deepEqual(res.body,{ok:true,order:sent.metadata});assert.equal(JSON.stringify(res.body).includes('MUST NOT RETURN'),false);assert.equal(res.headers.Vary,'Authorization');assert.match(res.headers['Cache-Control'],/no-store/);
});
test('repeated submissions receive distinct server IDs without overwriting an existing row',async()=>{const calls=network();const a=await run(),b=await run();assert.notEqual(a.body.order.id,b.body.order.id);assert.equal(calls.filter(c=>c.method==='POST').length,2);});
test('contact notes and existing confirmations survive the bounded projection',async()=>{network();const res=await run({...body(),address2:'Unit 2',state:'Test state',orderNotes:'Line one\nLine two',taxId:'fixture',promoCode:'TEST',affiliateCode:'REF'});assert.equal(res.statusCode,201);assert.equal(res.body.order.orderNotes,'Line one\nLine two');assert.equal(res.body.order.address2,'Unit 2');assert.equal(res.body.order.affiliateCode,'REF');assert.equal(res.body.order.promoCode,'TEST');});
const cases=[
 ['empty cart',{items:[]}],['too many lines',{items:Array.from({length:101},()=>body().items[0])}],
 ['unknown product',{items:[{name:'No such product',dose:'5 mg',quantity:1}]}],['out of stock',{items:[{name:'BAC Water',dose:'10 ml',quantity:1}]}],
 ['fractional quantity',{items:[{...body().items[0],quantity:1.5}]}],['string quantity',{items:[{...body().items[0],quantity:'1'}]}],['boolean quantity',{items:[{...body().items[0],quantity:true}]}],
 ['unknown warehouse',{items:[{...body().items[0],fromWarehouse:'alternate'}]}],['duplicate lines exceed SKU limit',{items:[{...body().items[0],quantity:30},{...body().items[0],quantity:30}]}],
 ['missing name',{firstName:''}],['long field',{address:'a'.repeat(301)}],['contact object',{city:{value:'City'}}],['control in name',{firstName:'A\nB'}],['invalid phone',{phone:'11111111111'}],['missing Mexico tax ID',{country:'Mexico'}],
 ['US item to foreign destination',{country:'Canada',items:[{name:'BPC-157',dose:'10 mg',quantity:1,fromWarehouse:'us'}]}],['unknown shipping',{shippingType:'teleport'}],['missing confirmations',{purchaserAttestation:null}],
 ...Object.keys(flags).map(key=>[`missing ${key}`,{purchaserAttestation:{...flags,[key]:false}}]),
];
for(const [label,changes] of cases)test(`rejects ${label} before inserting`,async()=>{const calls=network();const res=await run({...body(),...changes});assert.equal(res.statusCode,400,label);assert.equal(calls.length,1);});
test('positive store credit remains unavailable',async()=>{const calls=network();const res=await run({...body(),storeCreditUsed:1});assert.equal(res.statusCode,409);assert.equal(calls.length,1);});
test('oversized ignored fields cannot bypass the request limit',async()=>{const calls=network();const res=await run({...body(),ignored:'x'.repeat(64001)});assert.equal(res.statusCode,400);assert.equal(calls.length,1);});
test('catalog variant note survives pricing and re-pricing',async()=>{
 network();const input={...body(),items:[{name:'CJC-1295',dose:'5 mg',noteLabel:'no/d',quantity:1},{name:'CJC-1295',dose:'5 mg',noteLabel:'with/d',quantity:1}]};
 const res=await run(input);assert.equal(res.statusCode,201);const items=res.body.order.items;assert.equal(items[0].noteLabel,'no/d');assert.equal(items[1].noteLabel,'with/d');assert.equal(items[0].price,169);assert.equal(items[1].price,319);assert.deepEqual(validateAndPriceItems(items).pricedItems,items);
});
for(const [label,insert] of [
 ['DB rejection',()=>json({message:'private database error'},500)],['duplicate ID',()=>json({},409)],['timeout',()=>{throw new Error('Timeout');}],['missing row',()=>json([])],['two rows',row=>json([row,row])],['wrong owner',row=>json([{...row,user_id:'foreign'}])],['changed status',row=>json([{...row,status:'paid'}])],['changed total',row=>json([{...row,total:1}])],['changed item',row=>json([{...row,items:[]}])],['changed contact',row=>json([{...row,metadata:{...row.metadata,email:'other@example.invalid'}}])],['malformed JSON',()=>new Response('bad json')],['oversized response',()=>new Response('x'.repeat(250001))],
])test(`ambiguous draft ${label} fails without automatic retry or payment creation`,async()=>{const calls=network({insert});const res=await run();assert.equal(res.statusCode,503);assert.equal(res.body.code,'CHECKOUT_DRAFT_UNAVAILABLE');assert.equal(calls.length,2);assert.equal(JSON.stringify(res.body).includes('private database error'),false);});
