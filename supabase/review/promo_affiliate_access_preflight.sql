-- Bounded catalog-only audit: no business records, secrets, or function bodies.
BEGIN TRANSACTION READ ONLY;
WITH targets(name) AS (
  VALUES ('user_promos'),('affiliates'),('affiliate_orders'),('affiliate_payouts')
), relations AS (
  SELECT t.name,c.oid,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relacl
  FROM targets t LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||t.name)
), relevant_functions AS (
  SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND (
    p.proname IN ('can_access_order_record','apply_affiliate','guard_user_promo_customer_update')
    OR p.oid IN (SELECT tgfoid FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM relations))
    OR (p.prosecdef AND p.prosrc ~ '(user_promos|affiliate_orders|affiliate_payouts|public[.]affiliates)')
  )
)
SELECT jsonb_build_object(
  'scope','Catalog only: four promo/affiliate tables and their relevant functions; no business rows',
  'checkedAt',clock_timestamp(),
  'serverVersion',current_setting('server_version'),
  'roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'bypassRls',rolbypassrls,'inherit',rolinherit) ORDER BY rolname)
    FROM pg_roles WHERE rolname IN('anon','authenticated','service_role')),
  'relations',(SELECT jsonb_agg(jsonb_build_object(
    'name',r.name,'exists',r.oid IS NOT NULL,'owner',pg_get_userbyid(r.relowner),
    'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'acl',r.relacl,
    'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
      'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl,
      'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped),
    'policies',(SELECT jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY x) FROM unnest(p.polroles) x),
      'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)
      FROM pg_policy p WHERE p.polrelid=r.oid),
    'privileges',(SELECT jsonb_agg(jsonb_build_object('role',role_name,
      'select',has_table_privilege(role_name,r.oid,'SELECT'),'insert',has_table_privilege(role_name,r.oid,'INSERT'),
      'update',has_table_privilege(role_name,r.oid,'UPDATE'),'delete',has_table_privilege(role_name,r.oid,'DELETE'),
      'truncate',has_table_privilege(role_name,r.oid,'TRUNCATE'),'references',has_table_privilege(role_name,r.oid,'REFERENCES'),
      'trigger',has_table_privilege(role_name,r.oid,'TRIGGER'),'maintain',has_table_privilege(role_name,r.oid,'MAINTAIN')) ORDER BY role_name)
      FROM unnest(ARRAY['anon','authenticated','service_role']) role_name),
    'constraints',(SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid,true)) ORDER BY conname)
      FROM pg_constraint WHERE conrelid=r.oid),
    'triggers',(SELECT jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
      'definition',pg_get_triggerdef(t.oid,true),'function',t.tgfoid::regprocedure::text,
      'functionMd5',md5(p.prosrc),'definer',p.prosecdef,'settings',p.proconfig) ORDER BY t.tgname)
      FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid=r.oid AND NOT t.tgisinternal)
  ) ORDER BY r.name) FROM relations r),
  'functionMetadata',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,
    'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'settings',p.proconfig,'acl',p.proacl,
    'sourceMd5',md5(p.prosrc),'returnType',pg_get_function_result(p.oid),
    'execute',(SELECT jsonb_object_agg(role_name,has_function_privilege(role_name,p.oid,'EXECUTE'))
      FROM unnest(ARRAY['anon','authenticated','service_role']) role_name)) ORDER BY p.oid::regprocedure::text)
    FROM relevant_functions p)
) AS promo_affiliate_access_preflight;
COMMIT;
