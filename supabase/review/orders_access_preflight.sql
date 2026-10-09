-- READ ONLY: metadata only, no customer rows, tokens or configuration values.
-- Capture before applying orders_access_containment, and compare the unchanged
-- Merit/credit policy + function + trigger definitions after application.
SELECT jsonb_build_object(
  'checkedAt', now(),
  'database', current_database(),
  'ordersColumns', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull) ORDER BY a.attnum),'[]') FROM pg_attribute a WHERE a.attrelid=to_regclass('public.orders') AND a.attnum>0 AND NOT a.attisdropped),
  'ordersRls', (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.orders')),
  'ordersPolicies', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.policyname),'[]') FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders'),
  'ordersPrivileges', (SELECT jsonb_agg(jsonb_build_object('role',r,'select',has_table_privilege(r,'public.orders','SELECT'),'insert',has_table_privilege(r,'public.orders','INSERT'),'update',has_table_privilege(r,'public.orders','UPDATE'),'delete',has_table_privilege(r,'public.orders','DELETE'),'truncate',has_table_privilege(r,'public.orders','TRUNCATE'),'references',has_table_privilege(r,'public.orders','REFERENCES'),'trigger',has_table_privilege(r,'public.orders','TRIGGER'))) FROM unnest(ARRAY['anon','authenticated','service_role']) r),
  'ordersColumnGrants', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.grantee,c.column_name,c.privilege_type),'[]') FROM information_schema.column_privileges c WHERE c.table_schema='public' AND c.table_name='orders' AND c.grantee IN ('PUBLIC','anon','authenticated')),
  'ordersTriggers', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.orders') AND NOT t.tgisinternal),
  'protectedFunctions', (SELECT coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'sourceMd5',md5(p.prosrc),'securityDefiner',p.prosecdef,'acl',p.proacl::text) ORDER BY p.proname),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE '%merit%' OR p.proname LIKE '%store_credit%' OR p.proname IN ('debit_legacy_order_credit','can_access_order_record'))),
  'roleMemberships', (SELECT coalesce(jsonb_agg(jsonb_build_object('member',m.rolname,'parent',r.rolname)),'[]') FROM pg_auth_members a JOIN pg_roles m ON m.oid=a.member JOIN pg_roles r ON r.oid=a.roleid WHERE m.rolname IN ('anon','authenticated','service_role'))
) AS orders_access_preflight;
