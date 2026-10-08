import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createCheckoutSession} from '../artifacts/10-bottle-value/src/checkout-session.js';

// Execute the actual three App checkout functions with synthetic React state,
// Supabase and provider boundaries; no live requests or rendered customer data.
const source=ts.createSourceFile('App.jsx',fs.readFileSync(new URL('../artifacts/10-bottle-value/src/App.jsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
const functions=new Map();
function visit(node) {
  if(ts.isFunctionDeclaration(node) && ['createNowPayment','createCatalystPayment','handleStripePayment','handleCheckout'].includes(node.name?.text)) functions.set(node.name.text,node.getText(source));
  ts.forEachChild(node,visit);
}
visit(source);
function context(route, valid=true) {
  const events=[]; const errors=[]; const links=[]; const values={};
  const fetcher=async(url,options)=>{
    events.push('provider'); assert.equal(url,route);
    assert.equal(options.headers.Authorization,'Bearer synthetic-session');
    const body=JSON.parse(options.body);
    assert.equal(body.email||body.customer_email,'owner@example.invalid');
    return new Response(JSON.stringify({invoice_url:'https://provider.invalid/pay',checkoutLink:'https://provider.invalid/pay',clientSecret:'synthetic-secret'}),{headers:{'Content-Type':'application/json'}});
  };
  const scope={
    console:{error:()=>{}},
    nowPaymentLoading:false,catalystPayLoading:false,stripeLoading:false,
    activeNetworkOption:{payCurrency:'btc'},currentUser:{email:'owner@example.invalid'},
    readCheckoutSnapshot:()=>({email:'stale@example.invalid',firstName:'Fixture'}),
    privateAccountState:{capture:()=>1,isCurrent:()=>true,getItem:()=>null,setItem:()=>{}},
    createCheckoutSession:options=>createCheckoutSession({...options,fetcher}),
    supabase:{auth:{getSession:async()=>{events.push('auth');return {data:{session:valid?{access_token:'synthetic-session',user:{id:'owner-id',email:'owner@example.invalid'}}:null}};}},from:()=>({upsert:async()=>{events.push('draft');return {error:null};}})},
    orderNumber:'synthetic-order',finalTotal:123,subtotal:100,shipping:23,shippingType:'standard',effectiveShippingType:'standard',
    automaticDiscount:0,promoDiscount:0,affiliateDiscount:0,cryptoDiscountAmount:0,affiliateCommission:0,storeCreditApplied:0,
    affiliateTrackingCode:'',affiliateTrackingOwnerEmail:'',appliedPromo:null,ownerFreeShippingActive:false,
    selectedCrypto:'BTC',selectedNetwork:'Bitcoin',paymentMethod:'crypto',
    cart:[{name:'BPC-157',dose:'5 mg',quantity:1,price:79}],getCheckoutOrderNotes:()=>'',
    window:{location:{origin:'https://store.invalid',assign:url=>links.push(url)}},sessionStorage:{setItem:()=>{}},
  };
  for(const name of ['NowPaymentLoading','NowPaymentError','NowPaymentData','NowPaymentStatus','PaymentTimer','CatalystPayLoading','CatalystPayError','StripeLoading','StripeError','StripeClientSecret']) {
    scope['set'+name]=value=>{values[name]=value;if(name.endsWith('Error') && value) errors.push(value);};
  }
  return {scope,events,errors,links,values};
}
for(const [name,route] of [['createNowPayment','/api/create-payment'],['createCatalystPayment','/api/create-catalystpay-session'],['handleStripePayment','/api/create-payment-intent']]) {
  test(`${name}: real caller authenticates without rewriting order state`,async()=>{
    const f=context(route); await vm.runInNewContext(`(${functions.get(name)})`,f.scope)();
    assert.deepEqual(f.errors,[]);assert.deepEqual(f.events,['auth','auth','provider']);
    if(name==='handleStripePayment')assert.equal(f.values.StripeClientSecret,'synthetic-secret');
    else assert.deepEqual(f.links,['https://provider.invalid/pay']);
  });
  test(`${name}: invalid session cannot write draft or start payment`,async()=>{
    const f=context(route,false);await vm.runInNewContext(`(${functions.get(name)})`,f.scope)();
    assert.deepEqual(f.events,['auth']);assert.equal(f.errors.length,1);assert.deepEqual(f.links,[]);
  });
}

function draftContext({fail=false,deferred=false,deferEach=false,guest=false,failOnce=false,existingOrders=[]}={}) {
 const f=context('/unused');f.analytics=[];const requests=[],releases=[];let release;const saved=new Promise(resolve=>{release=resolve;});let inserted;
 Object.assign(f.scope,{
  researchAccepted:true,qualifiedAccepted:true,termsAccepted:true,checkoutDraftPendingRef:{current:false},checkoutDraftAttemptRef:{current:null},
  tx:(english)=>english,t:key=>key,validateCheckoutForm:()=>({}),getPaidOrdersForEmail:()=>[],
  requestAnimationFrame:callback=>callback(),track:name=>f.analytics.push(name),
 });
 f.scope.window.scrollTo=()=>{};
 f.scope.privateAccountState.getItem=()=>JSON.stringify(existingOrders);
 for(const name of ['CheckoutForm','CountrySearch','CheckoutErrors','CheckoutMessage','OrderNumber','CurrentUser','RegisteredUsers','AllOrders','UserOrders','CheckoutStep','PaypalPaymentError','PendingCheckoutAfterAuth','AuthMode','AccountMessage','Page']) {
  f.scope['set'+name]=value=>{f.values[name]=value;if(name==='CheckoutStep')f.events.push('payment-view');};
 }
 f.scope.supabase.from=()=>{throw new Error('Direct draft table access must not occur');};
 f.scope.createCheckoutSession=options=>createCheckoutSession({...options,fetcher:async(url,request)=>{
  assert.equal(url,'/api/checkout-draft');inserted=JSON.parse(request.body);requests.push(inserted);f.events.push('server-draft');
  if(deferred)await saved;
  if(deferEach)await new Promise(resolve=>releases.push(resolve));
  return (fail || (failOnce && requests.length===1))?Response.json({error:'unavailable'},{status:503}):Response.json({ok:true,order:{
   id:'INV-AAAAAAAAAAAAAAAAAAAAAAAA',email:'owner@example.invalid',status:'pending',total:null,subtotal:79,
   items:[{name:'BPC-157',dose:'5 mg',quantity:1,price:79}],pricingState:'awaiting_provider_quote',createdAt:'2026-10-08T02:30:00Z',
  }});
 }});
 if(guest)f.scope.currentUser=null;
 return {...f,release,releaseRequest:index=>releases[index](),getInserted:()=>inserted,requests,run:()=>vm.runInNewContext(`(${functions.get('handleCheckout')})`,f.scope)()};
}
test('actual checkout waits for one saved draft before showing payment and ignores duplicate clicks',async()=>{
 const f=draftContext({deferred:true});const first=f.run();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.values.CheckoutStep,undefined);assert.equal(f.scope.checkoutDraftPendingRef.current,true);
 await f.run();assert.equal(f.events.filter(value=>value==='server-draft').length,1);
 f.release();await first;assert.equal(f.values.CheckoutStep,'payment');assert.equal(f.scope.checkoutDraftPendingRef.current,false);
 assert.equal(f.getInserted().user_id,undefined);assert.equal(f.getInserted().status,undefined);assert.equal(f.values.OrderNumber,'INV-AAAAAAAAAAAAAAAAAAAAAAAA');assert.equal(f.values.AllOrders[0].total,null);assert.ok(f.events.indexOf('server-draft')<f.events.indexOf('payment-view'));
});
test('actual checkout keeps payment screen closed when draft persistence fails',async()=>{
 const f=draftContext({fail:true});await f.run();assert.equal(f.values.CheckoutStep,undefined);assert.match(f.values.CheckoutMessage,/could not be saved/);assert.equal(f.scope.checkoutDraftPendingRef.current,false);
});
test('actual checkout still routes guests to registration without order writes',async()=>{
 const f=draftContext({guest:true});await f.run();assert.equal(f.values.AuthMode,'create');assert.equal(f.values.Page,'account');assert.equal(f.values.CheckoutStep,undefined);assert.deepEqual(f.events,[]);
});


test('actual checkout reuses its App-owned key after uncertain failure across helper recreation',async()=>{
 const f=draftContext({failOnce:true});await f.run();assert.equal(f.values.CheckoutStep,undefined);
 assert.ok(f.scope.checkoutDraftAttemptRef.current);await f.run();
 assert.equal(f.requests.length,2);assert.match(f.requests[0].requestIdempotencyKey,/^[0-9a-f-]{36}$/);
 assert.equal(f.requests[0].requestIdempotencyKey,f.requests[1].requestIdempotencyKey);
 assert.equal(f.scope.checkoutDraftAttemptRef.current,null);assert.equal(f.values.CheckoutStep,'payment');
});
test('actual checkout does not duplicate an already cached draft or its order event',async()=>{
 const f=draftContext({existingOrders:[{id:'INV-AAAAAAAAAAAAAAAAAAAAAAAA',status:'pending'}]});await f.run();
 assert.equal(f.values.AllOrders.length,1);assert.equal(f.analytics.filter(name=>name==='order_placed').length,0);
});
test('a stale account save cannot write checkout state or unlock the new account save',async()=>{
 const f=draftContext({deferEach:true});let scopeId=1;
 f.scope.privateAccountState.capture=()=>scopeId;
 f.scope.privateAccountState.isCurrent=scope=>scope===scopeId;
 const first=f.run();await new Promise(resolve=>setImmediate(resolve));
 // Match clearPrivateAccountView when a new account generation takes over.
 scopeId=2;f.scope.checkoutDraftPendingRef.current=false;f.scope.checkoutDraftAttemptRef.current=null;
 const second=f.run();await new Promise(resolve=>setImmediate(resolve));
 f.values.CheckoutMessage='New account state';
 f.releaseRequest(0);await first;
 assert.equal(f.scope.checkoutDraftPendingRef.current,true);
 assert.equal(f.scope.checkoutDraftAttemptRef.current.pending,true);
 assert.equal(f.values.CheckoutMessage,'New account state');
 assert.equal(f.values.CheckoutStep,undefined);assert.equal(f.values.OrderNumber,undefined);
 f.releaseRequest(1);await second;
 assert.equal(f.scope.checkoutDraftPendingRef.current,false);assert.equal(f.values.CheckoutStep,'payment');
});
