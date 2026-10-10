import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env, { SUPABASE_URL: 'https://referral-fixture.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', SUPABASE_ANON_KEY: 'fixture-anon',
 NOWPAYMENTS_API_KEY: 'fixture-now', CATALYSTPAY_MERCHANT_ID: 'fixture-store', CATALYSTPAY_API_TOKEN: 'fixture-provider', CATALYSTPAY_WEBHOOK_SECRET: 'fixture-webhook' });
delete process.env.VITE_SUPABASE_URL;
const rules = { version: 'fixture-v2', source: 'operator approved active registry', status: 'operator_report', currency: 'USD', unit: 'basis_points',
 effectiveFrom: '2026-01-01', firstOrderDiscountBps: 500, commissionBps: 1000, approvalMode: 'active_registry', approvedCodes: ['OLD'] };
process.env.MERIT_AFFILIATE_RULES_JSON = JSON.stringify(rules);
mock.module('../api/_catalog.js', { namedExports: { validateAndPriceItems: items => ({ pricedItems: items, subtotal: 347, regularSubtotal: 347 }), getShippingPrice: () => 0, getAutomaticDiscountRate: () => 0 } });
const { legacyCheckoutQuote, assertExpectedTotal } = await import('../api/_legacy-checkout-quote.js');
const { affiliateCodeFilter, verifyAffiliateQuote } = await import('../api/_affiliate-quote.js');
const eligibility = (await import('../api/affiliate-eligibility.js')).default;
const catalyst = (await import('../api/create-catalystpay-session.js')).default;
const nowpayments = (await import('../api/create-payment.js')).default;
const buyer = '11111111-1111-4111-8111-111111111111', email = 'buyer@example.test';
const json = (body, status=200) => new Response(JSON.stringify(body), {status});
const response = () => ({ statusCode: 200, setHeader(){}, status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;} });
function fixture(t,{purchases=[],affiliate={code:'10bottle',email:'partner@example.test',active:true},historyFailure=false}={}) {
 const calls=[];
 t.mock.method(globalThis,'fetch',async(input,options={})=>{
  const url=new URL(input);calls.push({url,options});
  assert.equal(options.method || 'GET','GET','No provider creation or financial write expected');
  if(url.pathname==='/auth/v1/user')return json({id:buyer,email,email_confirmed_at:'2026-01-01'});
  if(url.pathname==='/rest/v1/paylio_payment_attempts')return json([]);
  if(url.pathname==='/rest/v1/affiliates') { assert.equal(url.searchParams.get('code'),'ilike.10BOTTLE');return json(affiliate?[affiliate]:[]); }
  if(url.pathname==='/rest/v1/affiliate_customers')return json([]);
  if(url.pathname==='/rest/v1/orders') {
   if(url.searchParams.has('status'))return json(purchases,historyFailure?503:200);
   return json([{id:'INV-REFERRAL',user_id:buyer,email,status:'checkout',total:329.65,metadata:{storeCreditUsed:0}}]);
  }
  assert.fail(`Unexpected fetch ${url.pathname}`);
 });return calls;
}
const body = { order_id:'INV-REFERRAL', customer_email:email, email, affiliateCode:'10BOTTLE',affiliateDiscount:17.35,expectedTotal:329.65,items:[{name:'Fixture',quantity:1,price:347}],shippingType:'standard',storeCreditUsed:0 };
test('lowercase active registry code receives the same first-order rate and verified owner for typed codes and links',async t=>{
 fixture(t);
 for(const affiliateCode of ['10BOTTLE','10bottle',' 10Bottle ']) {
  const quote=await legacyCheckoutQuote({...body,affiliateCode},email);
  assert.equal(quote.total,329.65);assert.equal(quote.finalAffiliateDiscount,17.35);assert.equal(quote.affiliateAttributionCode,'10BOTTLE');
  assert.equal(quote.affiliateCommission,34.7);assert.equal(quote.affiliateOwnerEmail,'partner@example.test');
 }
 const crypto=await legacyCheckoutQuote(body,email,{crypto:true});assert.equal(crypto.total,321.41);
});
test('eligibility returns no owner email, commission terms or registry',async t=>{
 fixture(t);const res=response();await eligibility({method:'POST',headers:{authorization:'Bearer fixture'},body:{code:'10bottle'}},res);
 assert.equal(res.statusCode,200);assert.deepEqual(res.body,{ok:true,code:'10BOTTLE',discountBps:500});
});
for(const status of ['paid','done','processing','shipped','delivered','refunded'])test(`${status} history removes first-order eligibility and prevents a higher-priced invoice`,async t=>{
 const calls=fixture(t,{purchases:[{id:'INV-OLD',metadata:{},status}]});
 for(const handler of [catalyst,nowpayments]) {
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{...body}},res);
  assert.equal(res.statusCode,409,JSON.stringify(res.body));assert.equal(res.body.code,'CHECKOUT_QUOTE_CHANGED');
 }
 assert.equal(calls.some(c=>c.options.method&&c.options.method!=='GET'),false);
});
test('failed history never grants a discount and never creates a provider invoice',async t=>{
 fixture(t,{historyFailure:true});for(const handler of [catalyst,nowpayments]) {
  const res=response();await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{...body}},res);assert.equal(res.statusCode,503);
 }
});
for(const affiliate of [null,{code:'10bottle',email,active:true},{code:'10bottle',email:'partner@example.test',active:false}])test(`missing, self and inactive registry entries are rejected: ${JSON.stringify(affiliate)}`,async t=>{
 fixture(t,{affiliate});await assert.rejects(legacyCheckoutQuote(body,email),{status:409});
});
test('case-insensitive lookup preserves literal underscores and rejects ambiguous registry matches',async()=>{
 assert.equal(affiliateCodeFilter('A_B'),'ilike.A\\_B');
 await assert.rejects(verifyAffiliateQuote({code:'10BOTTLE',email,supabaseUrl:'https://fixture.test',serviceRoleKey:'fixture',rules,fetcher:async input=>{
  const path=new URL(input).pathname;return json(path.endsWith('/affiliates')?[{code:'10bottle',email:'a@example.test',active:true},{code:'10BOTTLE',email:'b@example.test',active:true}]:[]);
 }}),{status:503});
});
test('missing or changed expected totals cannot authorize invoice creation',()=>{
 for(const value of [undefined,null,'329.65',NaN,0])assert.throws(()=>assertExpectedTotal(value,329.65),{code:'CHECKOUT_REFRESH_REQUIRED'});
 assert.throws(()=>assertExpectedTotal(329.65,347),{code:'CHECKOUT_QUOTE_CHANGED'});assertExpectedTotal(329.65,329.65);
});
