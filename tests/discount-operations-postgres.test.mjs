import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
const command=promisify(execFile), bin=process.env.MERIT_SQL_TEST_PG_BIN;
test('discount migration and existing guards run together in isolated native PostgreSQL',{skip:!bin,timeout:60000},async t=>{
 assert.ok(path.isAbsolute(bin));
 const root=await mkdtemp(path.join(os.tmpdir(),'tbv-discounts-')),data=path.join(root,'data'),sock=path.join(root,'sock');
 await mkdir(sock,{mode:0o700});
 const run=(name,args)=>command(path.join(bin,name),args,{maxBuffer:2000000});
 await run('initdb',['-D',data,'-U','fixture_owner','--auth-local=trust','--no-locale','-E','UTF8']);
 let started=false;
 t.after(async()=>{if(started)await run('pg_ctl',['-D',data,'-m','immediate','stop']);await rm(root,{recursive:true,force:true});});
 await run('pg_ctl',['-D',data,'-l',path.join(root,'postgres.log'),'-o',`-c listen_addresses='' -k ${sock}`,'-w','start']);started=true;
 const sql=async statement=>(await run('psql',['-h',sock,'-U','fixture_owner','-d','postgres','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c',statement])).stdout.trim();
 const owner='11111111-1111-4111-8111-111111111111',buyer='22222222-2222-4222-8222-222222222222';
 await sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 INSERT INTO auth.users VALUES('${owner}','support@example.test',now()),('${buyer}','buyer@example.test',now());
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE public.user_promos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL,code text NOT NULL,rate numeric NOT NULL,used boolean DEFAULT false,created_at timestamptz DEFAULT now());
 CREATE TABLE public.merit_payment_attempts(user_promo_id text);
 CREATE TABLE public.orders(id text PRIMARY KEY, total numeric,metadata jsonb); INSERT INTO public.orders VALUES('historical',123.45,'{"discount":5}');
 CREATE FUNCTION public.can_access_order_record(uuid,text,boolean) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT CASE WHEN $3 THEN auth.uid()='${owner}'::uuid ELSE EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email=$2 AND email_confirmed_at IS NOT NULL) END$$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role; GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_promos TO authenticated,service_role;
 INSERT INTO public.user_promos(id,email,code,rate) VALUES('33333333-3333-4333-8333-333333333333','__PUBLIC__','CARD5',0.05);`);
 for(const [filename,name,trigger] of [
  ['20261008180000_merit_checkout.sql','guard_merit_reserved_promo','merit_reserved_promo_guard'],
  ['20261009040000_promo_affiliate_access_containment.sql','guard_user_promo_customer_update','user_promos_verified_update_guard']]){
  const source=await readFile(new URL(`../supabase/migrations/${filename}`,import.meta.url),'utf8');
  const start=source.indexOf(`CREATE FUNCTION public.${name}()`),end=source.indexOf(';',source.indexOf(`FOR EACH ROW EXECUTE FUNCTION public.${name}();`,start))+1;
  assert.ok(start>=0&&end>start);await sql(source.slice(start,end));
 }
 const before=await sql(`SELECT jsonb_build_object('promos',(SELECT jsonb_agg(to_jsonb(p)) FROM user_promos p),'orders',(SELECT jsonb_agg(to_jsonb(o)) FROM orders o),'guards',(SELECT jsonb_agg(pg_get_functiondef(oid) ORDER BY proname) FROM pg_proc WHERE proname IN ('guard_user_promo_customer_update','guard_merit_reserved_promo')));`);
 await sql(await readFile(new URL('../supabase/migrations/20261009180000_discount_operations.sql',import.meta.url),'utf8'));
 await t.test('legacy records, financial records and old guard definitions are preserved',async()=>{
  const old=JSON.parse(before),after=JSON.parse(await sql(`SELECT jsonb_build_object('promos',(SELECT jsonb_agg(to_jsonb(p)-ARRAY['active','title','starts_at','ends_at','minimum_subtotal_cents','revision','updated_at']) FROM user_promos p),'orders',(SELECT jsonb_agg(to_jsonb(o)) FROM orders o),'guards',(SELECT jsonb_agg(pg_get_functiondef(oid) ORDER BY proname) FROM pg_proc WHERE proname IN ('guard_user_promo_customer_update','guard_merit_reserved_promo')));`));
  assert.deepEqual(after,old);assert.equal(await sql('SELECT count(*) FROM discount_change_log'),'0');
 });
 const call=(id='NULL',rev='NULL',code='CAMPAIGN',email='__PUBLIC__',rate='.05',active='true')=>`SELECT public.save_operations_discount(${id},${rev},'${owner}','${code}','${email}',${rate},${active},'Test',NULL,'2030-01-01',1000)`;
 let saved;
 await t.test('only the private service can create, and exact saved revision is returned',async()=>{
  for(const role of ['anon','authenticated'])await assert.rejects(sql(`SET ROLE ${role}; ${call()}`),/permission denied/);
  saved=JSON.parse(await sql(`SET ROLE service_role; ${call()}`));assert.equal(saved.rate,.05);assert.equal(saved.revision,1);assert.equal(saved.minimum_subtotal_cents,1000);
  assert.equal(await sql(`SELECT actor_id FROM discount_change_log WHERE promo_id='${saved.id}'`),owner);
  for(const role of ['anon','authenticated','service_role']){
   assert.equal(await sql(`SELECT has_table_privilege('${role}','discount_change_log','INSERT')`),'f');
   assert.equal(await sql(`SELECT has_table_privilege('${role}','discount_change_log','DELETE')`),'f');
  }
 });
 await t.test('stale edits, duplicate active identity and changed identities fail without overwriting',async()=>{
  await assert.rejects(sql(`SET ROLE service_role; ${call()}`),/DISCOUNT_ALREADY_EXISTS/);
  const id=`'${saved.id}'`;
  await assert.rejects(sql(`SET ROLE service_role; ${call(id,'8')}`),/DISCOUNT_REVISION_CONFLICT/);
  await assert.rejects(sql(`SET ROLE service_role; ${call(id,'1','CHANGED')}`),/DISCOUNT_IDENTITY_OR_USAGE_LOCKED/);
  saved=JSON.parse(await sql(`SET ROLE service_role; ${call(id,'1','CAMPAIGN','__PUBLIC__','.06')}`));assert.equal(saved.revision,2);
  await assert.rejects(sql(`SET ROLE service_role; ${call(id,'1')}`),/DISCOUNT_REVISION_CONFLICT/);
  assert.equal(await sql(`SELECT count(*) FROM discount_change_log WHERE promo_id=${id}`),'2');
 });
 await t.test('customer mark-used still works but cannot alter any new rule field',async()=>{
  const personal=JSON.parse(await sql(`SET ROLE service_role; ${call('NULL','NULL','PERSONAL','buyer@example.test')}`));
  for(const assignment of ['active=false','minimum_subtotal_cents=0','revision=99',"ends_at='2031-01-01'",'rate=1'])await assert.rejects(sql(`SET ROLE authenticated; SET request.jwt.claim.sub='${buyer}'; UPDATE user_promos SET used=true,${assignment} WHERE id='${personal.id}'`),/CUSTOMER_PROMO_UPDATE_REQUIRES_IMMUTABLE_MARK_USED/);
  await sql(`SET ROLE authenticated; SET request.jwt.claim.sub='${buyer}'; UPDATE user_promos SET used=true WHERE id='${personal.id}'`);
  assert.equal(await sql(`SELECT used AND revision=1 FROM user_promos WHERE id='${personal.id}'`),'t');
 });
 await t.test('an existing card reservation still blocks operator rule edits and deletion',async()=>{
  const held=JSON.parse(await sql(`SET ROLE service_role; ${call('NULL','NULL','HELD','buyer@example.test')}`));
  await sql(`INSERT INTO merit_payment_attempts VALUES('${held.id}')`);
  await assert.rejects(sql(`SET ROLE service_role; ${call(`'${held.id}'`,'1','HELD','buyer@example.test','.1')}`),/MERIT_PROMO_RESERVED/);
  await assert.rejects(sql(`SET ROLE service_role; DELETE FROM user_promos WHERE id='${held.id}'`),/MERIT_PROMO_RESERVED/);
  await sql(`SET ROLE service_role; UPDATE user_promos SET used=true WHERE id='${held.id}'`);
  assert.equal(await sql(`SELECT used FROM user_promos WHERE id='${held.id}'`),'t');
 });
 await t.test('invalid schedule is rejected and simultaneous revisions cannot both win',async()=>{
  await assert.rejects(sql(`SET ROLE service_role; SELECT public.save_operations_discount(NULL,NULL,'${owner}','INVALID','__PUBLIC__',.05,true,'','2030-01-02','2030-01-01',0)`),/DISCOUNT_INVALID/);
  const edits=await Promise.allSettled([sql(`SET ROLE service_role; ${call(`'${saved.id}'`,'2','CAMPAIGN','__PUBLIC__','.07')}`),sql(`SET ROLE service_role; ${call(`'${saved.id}'`,'2','CAMPAIGN','__PUBLIC__','.08')}`)]);
  assert.equal(edits.filter(x=>x.status==='fulfilled').length,1);assert.match(edits.find(x=>x.status==='rejected').reason.message,/DISCOUNT_REVISION_CONFLICT/);
 });
});
