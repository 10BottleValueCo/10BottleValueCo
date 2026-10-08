import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/analytics.js';
process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.ADMIN_USER_IDS = 'admin-id';
const sid = '123e4567-e89b-42d3-a456-426614174000';
function res() { return { statusCode: 200, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(v){this.statusCode=v;return this;}, json(v){this.body=v;return this;} }; }
function response(body,status=200){ return {ok:status<400,status,json:async()=>body}; }
test('private analytics rejects anonymous access without touching database', async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw Error('Unexpected network');};
  try { const r=res();await handler({method:'GET',headers:{},query:{}},r);assert.equal(r.statusCode,401);assert.equal(r.headers['Cache-Control'],'no-store'); }
  finally{globalThis.fetch=original;}
});
test('event IDs deduplicate retries, referrer paths are removed, sensitive properties dropped',async()=>{
  const original=globalThis.fetch;let sent;
  globalThis.fetch=async(url,opts)=>{sent={url:String(url),...opts};return response(null,201);};
  try {
    const r=res();await handler({method:'POST',headers:{},body:{schema_version:2,event_id:sid,session_id:sid,event_type:'order_placed',page:'checkout?email=a@example.com',referrer:'https://example.com/customer/private?token=x',properties:{email:'customer@example.com',total:15,device_type:'phone'},occurred_at:new Date().toISOString()}},r);
    assert.equal(r.statusCode,202);const event=JSON.parse(sent.body);assert.equal(event.id,sid);assert.equal(event.referrer,'https://example.com');assert.equal(event.page,'checkout');assert.equal(event.properties.email,undefined);assert.equal(event.properties.schema_version,2);assert.match(sent.headers.Prefer,/resolution=ignore-duplicates/);assert.match(sent.url,/on_conflict=id/);
  } finally{globalThis.fetch=original;}
});
test('v2 events cannot silently omit their idempotency ID',async()=>{const r=res();await handler({method:'POST',headers:{},body:{schema_version:2,session_id:sid,event_type:'page_view'}},r);assert.equal(r.statusCode,400);});
test('5000-event read cap exposes a sentinel-backed partial coverage warning',async()=>{
  const original=globalThis.fetch;let reads=0;
  globalThis.fetch=async(url)=>{if(String(url).includes('/auth/'))return response({id:'admin-id'});reads++;const u=new URL(url);assert.match(u.searchParams.get('and'),/created_at.lte/);return response(Array.from({length:Number(u.searchParams.get('limit'))},(_,i)=>({id:`${reads}-${i}`,properties:{schema_version:reads===1?1:2},event_type:'page_view'})));};
  try{const r=res();await handler({method:'GET',headers:{authorization:'Bearer valid'},query:{days:'7'}},r);assert.equal(r.statusCode,200);assert.equal(reads,6);assert.equal(r.body.events.length,5000);assert.equal(r.body.metadata.truncated,true);assert.equal(r.body.metadata.legacy_events,1000);assert.equal(r.body.metadata.source,'browser_events_untrusted');}finally{globalThis.fetch=original;}
});
test('small result declares its period and browser-only provenance',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async(url)=>response(String(url).includes('/auth/')?{id:'admin-id'}:[]);
  try{const r=res();await handler({method:'GET',headers:{authorization:'Bearer valid'},query:{days:'30'}},r);assert.equal(r.body.metadata.truncated,false);assert.equal(r.body.metadata.returned_events,0);assert.match(r.body.metadata.orders_definition,/not verified payment/);}finally{globalThis.fetch=original;}
});
test('browser session rotates after inactivity but stays stable when storage is blocked',async()=>{
 const originalWindow=globalThis.window;const originalNow=Date.now;let now=1000000;
 globalThis.window={localStorage:{removeItem(){throw Error('blocked');}},sessionStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},addEventListener(){}};Date.now=()=>now;
 try{const {getSessionId}=await import('../artifacts/10-bottle-value/src/analytics.js');const first=getSessionId();assert.equal(getSessionId(),first);now+=31*60*1000;assert.equal(getSessionId(false),first);const next=getSessionId();assert.notEqual(next,first);assert.equal(getSessionId(),next);}finally{globalThis.window=originalWindow;Date.now=originalNow;}
});

test('auth and selection events retain only bounded non-identifying properties',async()=>{
 const original=globalThis.fetch;const events=[];
 globalThis.fetch=async(url,opts)=>{events.push(JSON.parse(opts.body));return response(null,201);};
 try {
  for(const event_type of ['auth_started','auth_code_sent','auth_verified','auth_failed','product_selection_changed']) {
   const r=res();await handler({method:'POST',headers:{},body:{schema_version:2,event_id:sid,session_id:sid,event_type,properties:{method:'email_code',stage:'verify',warehouse:'us',strength:'10 mg',product_name:'BPC-157',email:'person@example.invalid',token:'private-token',code:'123456',error:'private-error'}}},r);
   assert.equal(r.statusCode,202);const props=events.at(-1).properties;
   assert.equal(props.method,'email_code');assert.equal(props.stage,'verify');assert.equal(props.warehouse,'us');assert.equal(props.strength,'10 mg');
   for(const key of ['email','token','code','error'])assert.equal(props[key],undefined);
  }
  for (const method of ['google','apple']) {
   const r=res();await handler({method:'POST',headers:{},body:{schema_version:2,event_id:sid,session_id:sid,event_type:'auth_verified',properties:{method,stage:'verify',provider_token:'private',email:'person@example.invalid'}}},r);
   assert.equal(r.statusCode,202);assert.equal(events.at(-1).properties.method,method);
   assert.equal(events.at(-1).properties.provider_token,undefined);assert.equal(events.at(-1).properties.email,undefined);
  }
  const r=res();await handler({method:'POST',headers:{},body:{session_id:sid,event_type:'auth_failed',properties:{method:'person@example.invalid',stage:'secret-token',warehouse:'private-address'}}},r);
  const props=events.at(-1).properties;for(const key of ['method','stage','warehouse'])assert.equal(props[key],undefined);
 } finally {globalThis.fetch=original;}
});
