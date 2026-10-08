-- READ-ONLY catalog snapshot for BOTH payout migration stages.
-- Run separately in an authorized environment; SAVE FULL RESULT before each
-- stage. This reads no customer/payout rows or secrets and changes no state.
-- Preserve raw ACL NULL separately from default ACL expansion. Expanded ACLs
-- retain grantor/grantee/grant option for exact, narrowly scoped rollback.
WITH RECURSIVE target_roles AS (
  SELECT oid, rolname FROM pg_roles
  WHERE rolname IN ('anon', 'authenticated', 'service_role')
), inherited_roles(role_oid) AS (
  SELECT oid FROM target_roles
  UNION
  SELECT m.roleid FROM pg_auth_members m
  JOIN inherited_roles i ON i.role_oid = m.member
), target_relations AS (
  SELECT c.oid, c.relname, c.relkind, c.relowner, c.relacl,
         c.relrowsecurity, c.relforcerowsecurity, n.nspname
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE (n.nspname = 'public' AND c.relname IN ('affiliates', 'affiliate_payouts'))
     OR c.oid = to_regclass(pg_get_serial_sequence('public.affiliate_payouts', 'id'))
)
SELECT jsonb_pretty(jsonb_build_object(
  'captured_at', current_timestamp, 'database', current_database(),
  'server_version', current_setting('server_version'),
  'execution_role', current_user, 'session_role', session_user,
  'schema', (SELECT jsonb_build_object(
    'name', n.nspname, 'owner', pg_get_userbyid(n.nspowner),
    'raw_acl', to_jsonb(n.nspacl),
    'expanded_acl', (SELECT jsonb_agg(jsonb_build_object(
      'grantor', pg_get_userbyid(a.grantor),
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'privilege', a.privilege_type, 'grantable', a.is_grantable
    ) ORDER BY a.grantee, a.privilege_type)
    FROM aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) a)
  ) FROM pg_namespace n WHERE n.nspname = 'public'),
  'relations', (SELECT jsonb_agg(jsonb_build_object(
    'schema', t.nspname, 'name', t.relname, 'kind', t.relkind,
    'owner', pg_get_userbyid(t.relowner),
    'rls_enabled', t.relrowsecurity, 'rls_forced', t.relforcerowsecurity,
    'raw_acl', to_jsonb(t.relacl),
    'expanded_acl', (SELECT jsonb_agg(jsonb_build_object(
      'grantor', pg_get_userbyid(a.grantor),
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'privilege', a.privilege_type, 'grantable', a.is_grantable
    ) ORDER BY a.grantee, a.privilege_type)
    FROM aclexplode(COALESCE(t.relacl,
      acldefault(CASE WHEN t.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END, t.relowner))) a),
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', c.attname, 'number', c.attnum, 'raw_acl', to_jsonb(c.attacl),
      'expanded_acl', (SELECT jsonb_agg(jsonb_build_object(
        'grantor', pg_get_userbyid(a.grantor),
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'privilege', a.privilege_type, 'grantable', a.is_grantable
      ) ORDER BY a.grantee, a.privilege_type) FROM aclexplode(c.attacl) a),
      'effective_roles', (SELECT jsonb_agg(jsonb_build_object(
        'role', r.rolname,
        'select', has_column_privilege(r.oid, t.oid, c.attnum, 'SELECT'),
        'insert', has_column_privilege(r.oid, t.oid, c.attnum, 'INSERT'),
        'update', has_column_privilege(r.oid, t.oid, c.attnum, 'UPDATE')
      ) ORDER BY r.rolname) FROM target_roles r)
    ) ORDER BY c.attnum) FROM pg_attribute c
    WHERE c.attrelid = t.oid AND c.attnum > 0 AND NOT c.attisdropped AND t.relkind <> 'S'),
    'effective_roles', (SELECT jsonb_agg(jsonb_build_object(
      'role', r.rolname, 'schema_usage', has_schema_privilege(r.oid, t.nspname, 'USAGE'),
      'select', CASE WHEN t.relkind <> 'S' THEN has_table_privilege(r.oid, t.oid, 'SELECT') ELSE NULL END,
      'insert', CASE WHEN t.relkind <> 'S' THEN has_table_privilege(r.oid, t.oid, 'INSERT') ELSE NULL END,
      'update', CASE WHEN t.relkind <> 'S' THEN has_table_privilege(r.oid, t.oid, 'UPDATE') ELSE NULL END,
      'delete', CASE WHEN t.relkind <> 'S' THEN has_table_privilege(r.oid, t.oid, 'DELETE') ELSE NULL END,
      'sequence_usage', CASE WHEN t.relkind = 'S' THEN has_sequence_privilege(r.oid, t.oid, 'USAGE') ELSE NULL END,
      'sequence_select', CASE WHEN t.relkind = 'S' THEN has_sequence_privilege(r.oid, t.oid, 'SELECT') ELSE NULL END,
      'sequence_update', CASE WHEN t.relkind = 'S' THEN has_sequence_privilege(r.oid, t.oid, 'UPDATE') ELSE NULL END
    ) ORDER BY r.rolname) FROM target_roles r),
    'policies', (SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.policyname), '[]'::jsonb)
      FROM pg_policies p WHERE p.schemaname = t.nspname AND p.tablename = t.relname),
    'constraints', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', c.conname, 'definition', pg_get_constraintdef(c.oid, true)
    ) ORDER BY c.conname), '[]'::jsonb) FROM pg_constraint c WHERE c.conrelid = t.oid)
  ) ORDER BY t.nspname, t.relname) FROM target_relations t),
  'role_attributes', (SELECT jsonb_agg(jsonb_build_object(
    'role', r.rolname, 'inherit', r.rolinherit,
    'bypass_rls', r.rolbypassrls, 'superuser', r.rolsuper
  ) ORDER BY r.rolname) FROM pg_roles r JOIN inherited_roles i ON i.role_oid = r.oid),
  'role_memberships', (SELECT COALESCE(jsonb_agg(
    to_jsonb(m) || jsonb_build_object(
      'granted_role_name', pg_get_userbyid(m.roleid),
      'member_name', pg_get_userbyid(m.member), 'grantor_name', pg_get_userbyid(m.grantor)
    ) ORDER BY m.member, m.roleid
  ), '[]'::jsonb) FROM pg_auth_members m WHERE m.member IN (SELECT role_oid FROM inherited_roles)),
  'scope_limit', 'Catalog evidence for these relations only. Review views, security-definer functions and other write paths before trusting affiliate ownership.'
)) AS payout_acl_snapshot;
