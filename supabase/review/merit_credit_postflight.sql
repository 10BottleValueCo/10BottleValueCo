-- Read-only catalog inspection for shared Store Credit accounting.
-- Returns no customer rows, function bodies, column-default literals or secrets.
WITH target AS (
  SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relowner
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('user_credits','orders','merit_payment_attempts','store_credit_ledger','store_credit_adjustments','merit_order_write_permits')
), roles AS (
  SELECT oid,rolname,rolbypassrls,rolsuper FROM pg_roles
  WHERE rolname IN ('anon','authenticated','service_role')
), functions AS (
  SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind='f'
    AND (p.proname ILIKE '%credit%' OR p.proname IN ('reserve_merit_checkout','bind_merit_checkout','finalize_merit_checkout'))
)
SELECT jsonb_build_object(
 'capturedAt',clock_timestamp(),
 'scope','Catalog only; no customer rows, function bodies or default literals',
 'tables',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'name',t.relname,'owner',pg_get_userbyid(t.relowner),'rls',t.relrowsecurity,'forceRls',t.relforcerowsecurity,
   'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull,'hasDefault',a.atthasdef) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped),
   'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated,'deferred',c.condeferrable)), '[]'::jsonb) FROM pg_constraint c WHERE c.conrelid=t.oid),
   'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'unique',i.indisunique,'valid',i.indisvalid,'definition',pg_get_indexdef(i.indexrelid))), '[]'::jsonb) FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=t.oid),
   'rolePrivileges',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'bypassRls',r.rolbypassrls,'select',has_table_privilege(r.oid,t.oid,'SELECT'),'insert',has_table_privilege(r.oid,t.oid,'INSERT'),'update',has_table_privilege(r.oid,t.oid,'UPDATE'),'delete',has_table_privilege(r.oid,t.oid,'DELETE'),'truncate',has_table_privilege(r.oid,t.oid,'TRUNCATE'))) FROM roles r),
   'columnPrivileges',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'column',a.attname,'select',has_column_privilege(r.oid,t.oid,a.attnum,'SELECT'),'insert',has_column_privilege(r.oid,t.oid,a.attnum,'INSERT'),'update',has_column_privilege(r.oid,t.oid,a.attnum,'UPDATE'))),'[]'::jsonb) FROM pg_attribute a CROSS JOIN roles r WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped),
   'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=t.oid),
   'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',g.tgname,'enabled',g.tgenabled,'typeBits',g.tgtype,'function',g.tgfoid::regprocedure::text,'constraintOid',g.tgconstraint,'deferrable',g.tgdeferrable,'initiallyDeferred',g.tginitdeferred)),'[]'::jsonb) FROM pg_trigger g WHERE g.tgrelid=t.oid AND NOT g.tgisinternal)
 ) ORDER BY t.relname) FROM target t),'[]'::jsonb),
 'creditFunctions',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,
   'language',(SELECT lanname FROM pg_language WHERE oid=p.prolang),'configuration',p.proconfig,
   'sourceMd5',md5(p.prosrc),'returns',pg_get_function_result(p.oid),
   'hasRowLock',p.prosrc ~* 'for[[:space:]]+(no[[:space:]]+key[[:space:]]+)?update',
   'hasAdvisoryLock',p.prosrc ILIKE '%pg_advisory_xact_lock%',
   'execution',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'allowed',has_function_privilege(r.oid,p.oid,'EXECUTE'))) FROM roles r)
 ) ORDER BY p.proname,p.oid) FROM functions p),'[]'::jsonb)
) AS merit_credit_postflight;
