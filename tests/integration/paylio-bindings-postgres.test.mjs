import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const modulePath=process.env.MERIT_SQL_TEST_PGLITE;
test('Paylio private binding SQL privilege, immutable quote and acknowledged lifecycle acceptance',{skip:!modulePath},async t=>{
 const {PGlite}=await import(pathToFileURL(modulePath).href);const db=new PGlite();t.after(()=>db.close());
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE public.orders(id text PRIMARY KEY,user_id uuid,email text,status text,total numeric,metadata jsonb,items jsonb,payment_provider text,payment_id text,paid_at timestamptz);
 CREATE TABLE public.merit_payment_attempts(order_id text);CREATE TABLE public.store_credit_ledger(order_id text);
 CREATE TABLE public.affiliate_customers(email text PRIMARY KEY,affiliate_code text);
 CREATE TABLE public.affiliate_orders(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,order_id text UNIQUE,affiliate_code text,commission_amount numeric,shipping_type text,created_at timestamptz);
 CREATE TABLE public.user_promos(email text,code text,used boolean,PRIMARY KEY(email,code));
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 GRANT ALL ON public.orders TO authenticated,service_role;
 INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111','buyer@example.test',now()),('22222222-2222-4222-8222-222222222222','support@10bottlevalue.co',now());`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261009020000_paylio_payment_bindings.sql',import.meta.url),'utf8'));
 const buyer='11111111-1111-4111-8111-111111111111',support='22222222-2222-4222-8222-222222222222',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',order='INV-PAYLIO123',hash='a'.repeat(64),account='b'.repeat(64);
 const quote={total:100,storeCreditUsed:0,items:[{name:'Fixture',quantity:1,price:100}],subtotal:100,shipping:0,shippingType:'standard',affiliateAttributionCode:'ORIGINAL',affiliateCommission:10,promoCode:'PERSONAL',promoDiscount:10,promoUsageRequired:true};
 await db.query('INSERT INTO orders(id,user_id,email,status,total,metadata) VALUES($1,$2,$3,$4,$5,$6)',[order,buyer,'buyer@example.test','checkout',100,{storeCreditUsed:0}]);
 const run=(role,fn,sub=buyer)=>db.transaction(async tx=>{await tx.exec(`SET LOCAL ROLE ${role}`);await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[sub]);return fn(tx)});
 const rpc=(name,args)=>run('service_role',async tx=>(await tx.query(`SELECT public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS result`,args)).rows[0].result);
 const reserve=()=>rpc('reserve_paylio_checkout',[id,order,buyer,'buyer@example.test',hash,account,'0x'+'1'.repeat(40),10000,quote]);
 await t.test('private records and RPCs are unavailable to anonymous/customer; service has no direct writes',async()=>{
  for(const role of ['anon','authenticated']){await assert.rejects(run(role,tx=>tx.query('SELECT * FROM paylio_payment_attempts')));await assert.rejects(run(role,tx=>tx.query("SELECT reserve_paylio_checkout($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id,order,buyer,'buyer@example.test',hash,account,'0x'+'1'.repeat(40),10000,quote])))}
  await assert.rejects(run('service_role',tx=>tx.query("INSERT INTO paylio_order_write_permits VALUES(1,1,'x')")));
 });
 await t.test('missing quote fields and null statuses cannot reserve or bypass immutable retry checks',async()=>{
  for(const partial of [{...quote,total:undefined},{...quote,items:undefined},{...quote,items:null},{...quote,items:[]}])await assert.rejects(rpc('reserve_paylio_checkout',[id,order,buyer,'buyer@example.test',hash,account,'0x'+'1'.repeat(40),10000,partial]));
  await db.query("INSERT INTO orders(id,user_id,email,status,total,metadata) VALUES('INV-NULL',$1,'buyer@example.test',NULL,100,'{}')",[buyer]);
  await assert.rejects(rpc('reserve_paylio_checkout',[id,'INV-NULL',buyer,'buyer@example.test',hash,account,'0x'+'1'.repeat(40),10000,quote]));
 });
 await t.test('reserve freezes exact verified quote and replays without creating another attempt',async()=>{
  const first=await reserve();assert.equal(first.created,true);assert.equal(first.attempt.state,'reserved');
  const again=await reserve();assert.equal(again.created,false);assert.equal(again.attempt.id,id);
  await assert.rejects(rpc('reserve_paylio_checkout',[id,order,buyer,'buyer@example.test','f'.repeat(64),account,'0x'+'1'.repeat(40),10000,quote]));
  await assert.rejects(rpc('reserve_paylio_checkout',[id,order,buyer,'buyer@example.test',null,account,'0x'+'1'.repeat(40),10000,quote]));
  const row=(await db.query('SELECT * FROM orders WHERE id=$1',[order])).rows[0];assert.equal(Number(row.total),100);assert.deepEqual(row.items,quote.items);assert.equal(row.payment_provider,'Paylio Card');
 });
 await t.test('customer/admin/service cannot rewrite pending quote or forge paid; Merit and credit binding cannot be taken over',async()=>{
  for(const role of ['authenticated','service_role'])await assert.rejects(run(role,tx=>tx.query("UPDATE orders SET total=1,status='paid' WHERE id=$1",[order]),support));
  await assert.rejects(run('service_role',tx=>tx.query("UPDATE paylio_payment_attempts SET amount_cents=1 WHERE id=$1",[id])));
  for(const table of ['merit_payment_attempts','store_credit_ledger']){
   const next='INV-'+table.replaceAll('_','').toUpperCase();await db.query("INSERT INTO orders(id,user_id,email,status,total,metadata) VALUES($1,$2,'buyer@example.test','checkout',100,'{}')",[next,buyer]);await db.query(`INSERT INTO ${table} VALUES($1)`,[next]);
   await assert.rejects(rpc('reserve_paylio_checkout',[id,next,buyer,'buyer@example.test',hash,account,'0x'+'1'.repeat(40),10000,quote]));
  }
 });
 await t.test('bind is immutable, wrong verification fails and paid acknowledgement is replay-safe',async()=>{
  await assert.rejects(rpc('bind_paylio_checkout',[id,'pay_fixture','secret_fixture','https://paylio.org/pay/pay_fixture',null]));
  const binding=await rpc('bind_paylio_checkout',[id,'pay_fixture','secret_fixture','https://paylio.org/pay/pay_fixture',10000]);assert.equal(binding.state,'ready');
  await assert.rejects(rpc('bind_paylio_checkout',[id,'pay_other','secret_fixture','https://paylio.org/pay/pay_other',10000]));
  const paidAt=new Date().toISOString();
  await assert.rejects(rpc('finalize_paylio_checkout',[id,'pay_fixture',9999,'USD',account,paidAt]));
  const first=await rpc('finalize_paylio_checkout',[id,'pay_fixture',10000,'USD',account,paidAt]);assert.equal(first.transitioned,true);assert.equal(first.status,'paid');
  const next=await rpc('finalize_paylio_checkout',[id,'pay_fixture',10000,'USD',account,paidAt]);assert.equal(next.transitioned,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM paylio_order_write_permits')).rows[0].n,0);
 });
 await t.test('affiliate and personal promo effects fail atomically with durable retry and exact acknowledgement',async()=>{
  const failed=await rpc('apply_paylio_order_effects',[id]);assert.equal(failed.ok,false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM affiliate_orders')).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM affiliate_customers')).rows[0].n,0);
  const pending=(await db.query('SELECT state,effects_error,effects_applied_at FROM paylio_payment_attempts WHERE id=$1',[id])).rows[0];assert.equal(pending.state,'paid');assert.ok(pending.effects_error);assert.equal(pending.effects_applied_at,null);
  await db.query("INSERT INTO user_promos VALUES('buyer@example.test','PERSONAL',false)");
  const first=await rpc('apply_paylio_order_effects',[id]);assert.deepEqual(first,{ok:true,applied:true,orderId:order});
  assert.equal((await db.query('SELECT commission_amount FROM affiliate_orders')).rows[0].commission_amount,'10');
  assert.equal((await db.query('SELECT used FROM user_promos')).rows[0].used,true);
  assert.deepEqual(await rpc('apply_paylio_order_effects',[id]),{ok:true,applied:false,orderId:order});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM affiliate_orders')).rows[0].n,1);
 });
 await t.test('authorized support fulfillment works, refund is never revived by an old succeeded payment',async()=>{
  await assert.rejects(run('authenticated',tx=>tx.query("UPDATE orders SET status=NULL WHERE id=$1",[order]),support));
  await run('authenticated',tx=>tx.query("UPDATE orders SET status='shipped' WHERE id=$1",[order]),support);
  await run('authenticated',tx=>tx.query("UPDATE orders SET status='refunded' WHERE id=$1",[order]),support);
  await assert.rejects(rpc('finalize_paylio_checkout',[id,'pay_fixture',10000,'USD',account,new Date().toISOString()]));
  await assert.rejects(rpc('apply_paylio_order_effects',[id]));
  assert.equal((await db.query('SELECT status FROM orders WHERE id=$1',[order])).rows[0].status,'refunded');
 });
});
