-- Merit checkout: metadata-only preflight for the exact selected database.
-- One SELECT statement; no application-table reads, RPC invocation, SET, DDL,
-- locks, or writes. Run separately from migration application. The database name
-- and capture time identify the result; verify the project in the host UI too.
--
-- Function bodies, default values, trigger arguments, policy expressions and
-- index/check expressions are deliberately not returned. Their MD5 fingerprints
-- support change detection only, not cryptographic integrity or behavior proof.
-- Inspect any necessary expression separately after reviewing its scope.
-- Effective privilege booleans include inherited/PUBLIC grants but do not prove
-- RLS access, JWT trust, PostgREST exposure, provider behavior or safe deployment.
-- Missing roles/objects yield null/false or an explicit absent entry, not a
-- failing regclass/regprocedure cast. No secret-bearing role settings are read.

WITH
relation_requests(schema_name, relation_name, required_before_migration, purpose) AS (
  VALUES
    ('public', 'orders', true, 'Merit order mirror and existing write triggers'),
    ('public', 'user_promos', true, 'Personal promo reservation'),
    ('public', 'affiliates', false, 'Existing affiliate identity surface'),
    ('public', 'affiliate_orders', false, 'Existing commission side effects'),
    ('public', 'affiliate_payouts', false, 'Existing payout side effects'),
    ('public', 'store_credit_accounts', false, 'Existing credit account surface'),
    ('public', 'store_credit_transactions', false, 'Existing credit ledger surface'),
    ('public', 'merit_payment_attempts', false, 'Private Merit payment state'),
    ('auth', 'users', true, 'Metadata only: confirmed support identity dependency')
),
relation_targets AS (
  SELECT * FROM relation_requests
  UNION ALL
  SELECT n.nspname, c.relname, false, 'Additional Merit relation discovered by narrow name prefix'
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'merit\_%' ESCAPE '\'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND NOT EXISTS (SELECT 1 FROM relation_requests r
      WHERE r.schema_name = n.nspname AND r.relation_name = c.relname)
),
relations AS (
  SELECT t.*, c.oid, c.relkind, c.relowner, c.relacl, c.relrowsecurity,
    c.relforcerowsecurity, c.relispartition
  FROM relation_targets t
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = t.schema_name
  LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid
    AND c.relname = t.relation_name AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
),
role_requests(role_name) AS (
  VALUES ('anon'), ('authenticated'), ('service_role'), ('authenticator'),
    (CURRENT_USER::text), (SESSION_USER::text)
),
roles AS (
  SELECT DISTINCT q.role_name, r.oid, r.rolsuper, r.rolinherit, r.rolcanlogin, r.rolbypassrls
  FROM role_requests q LEFT JOIN pg_catalog.pg_roles r ON r.rolname = q.role_name
),
rpc_requests(rpc_name, expected_signature) AS (
  VALUES
    ('reserve_merit_checkout', 'public.reserve_merit_checkout(uuid,text,uuid,text,bigint,text,jsonb,text,boolean,text)'),
    ('bind_merit_checkout', 'public.bind_merit_checkout(uuid,text,text,boolean,text,text)'),
    ('finalize_merit_checkout', 'public.finalize_merit_checkout(uuid,text,bigint,text,text,text,text,boolean)')
),
helper_requests(expected_signature, purpose) AS (
  VALUES
    ('public.guard_merit_attempt_immutable()', 'Merit attempt immutability trigger'),
    ('public.guard_merit_order_write()', 'Merit order write trigger'),
    ('public.guard_merit_reserved_promo()', 'Merit personal promo trigger'),
    ('pg_catalog.gen_random_uuid()', 'UUID generation'),
    ('auth.uid()', 'Existing policy identity helper'),
    ('auth.jwt()', 'Existing policy JWT helper'),
    ('auth.email()', 'Existing policy email helper')
),
required_columns(schema_name, relation_name, column_name, expected_base_types) AS (
  VALUES
    ('public', 'orders', 'id', ARRAY['text', 'varchar']),
    ('public', 'orders', 'email', ARRAY['text', 'varchar']),
    ('public', 'orders', 'status', ARRAY['text', 'varchar']),
    ('public', 'orders', 'total', ARRAY['numeric']),
    ('public', 'orders', 'metadata', ARRAY['jsonb']),
    ('public', 'orders', 'created_at', ARRAY['timestamptz']),
    ('public', 'orders', 'items', ARRAY['jsonb']),
    ('public', 'orders', 'payment_provider', ARRAY['text', 'varchar']),
    ('public', 'orders', 'payment_id', ARRAY['text', 'varchar']),
    ('public', 'orders', 'paid_at', ARRAY['timestamptz']),
    ('public', 'user_promos', 'id', ARRAY['text', 'varchar', 'uuid', 'int4', 'int8']),
    ('public', 'user_promos', 'email', ARRAY['text', 'varchar']),
    ('public', 'user_promos', 'code', ARRAY['text', 'varchar']),
    ('public', 'user_promos', 'rate', ARRAY['numeric']),
    ('public', 'user_promos', 'used', ARRAY['bool']),
    ('auth', 'users', 'id', ARRAY['uuid']),
    ('auth', 'users', 'email', ARRAY['text', 'varchar']),
    ('auth', 'users', 'email_confirmed_at', ARRAY['timestamptz'])
),
column_checks AS (
  SELECT q.*, a.attnum IS NOT NULL AS present,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS actual_type,
    coalesce(t.typname = ANY(q.expected_base_types), false) AS base_type_matches_draft
  FROM required_columns q
  LEFT JOIN relations r USING (schema_name, relation_name)
  LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = r.oid
    AND a.attname = q.column_name AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
),
linked_function_oids AS (
  SELECT t.tgfoid AS oid FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid IN (SELECT oid FROM relations WHERE oid IS NOT NULL)
  UNION
  SELECT d.refobjid FROM pg_catalog.pg_depend d
    WHERE d.refclassid = 'pg_catalog.pg_proc'::regclass
      AND (
        (d.classid = 'pg_catalog.pg_policy'::regclass AND d.objid IN
          (SELECT p.oid FROM pg_catalog.pg_policy p WHERE p.polrelid IN (SELECT oid FROM relations)))
        OR (d.classid = 'pg_catalog.pg_constraint'::regclass AND d.objid IN
          (SELECT c.oid FROM pg_catalog.pg_constraint c WHERE c.conrelid IN (SELECT oid FROM relations)))
        OR (d.classid = 'pg_catalog.pg_attrdef'::regclass AND d.objid IN
          (SELECT a.oid FROM pg_catalog.pg_attrdef a WHERE a.adrelid IN (SELECT oid FROM relations)))
      )
),
functions AS (
  SELECT p.oid, p.proname, p.proowner, p.prokind, p.prosecdef,
    p.proleakproof, p.provolatile, p.proretset, p.proargnames,
    p.pronargdefaults, p.proconfig, p.proacl, n.nspname, l.lanname
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_catalog.pg_language l ON l.oid = p.prolang
  WHERE (n.nspname = 'public'
      AND p.proname ~ '(^|_)(merit|orders?|promos?|affiliates?|store_credit|credits?)(_|$)')
    OR p.oid IN (SELECT oid FROM linked_function_oids)
    OR p.oid IN (SELECT pg_catalog.to_regprocedure(expected_signature) FROM helper_requests)
),
function_reports AS (
  SELECT p.oid, jsonb_build_object(
    'schema', p.nspname, 'name', p.proname,
    'signature', p.oid::regprocedure::text,
    'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
    'result_type', pg_catalog.pg_get_function_result(p.oid),
    'kind', p.prokind, 'language', p.lanname,
    'owner', pg_catalog.pg_get_userbyid(p.proowner),
    'security_definer', p.prosecdef, 'leakproof', p.proleakproof,
    'volatility', p.provolatile, 'returns_set', p.proretset,
    'argument_names', p.proargnames, 'default_argument_count', p.pronargdefaults,
    'search_path_settings', coalesce((SELECT jsonb_agg(v ORDER BY v)
      FROM unnest(p.proconfig) v WHERE split_part(v, '=', 1) = 'search_path'), '[]'::jsonb),
    'configuration_keys', coalesce((SELECT jsonb_agg(split_part(v, '=', 1) ORDER BY v)
      FROM unnest(p.proconfig) v), '[]'::jsonb),
    'execute_by_role', (SELECT jsonb_object_agg(r.role_name,
      CASE WHEN r.oid IS NULL THEN NULL ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END)
      FROM roles r),
    'acl', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'grantor', pg_catalog.pg_get_userbyid(a.grantor),
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'privilege', a.privilege_type, 'grantable', a.is_grantable) ORDER BY a.grantee, a.privilege_type)
      FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a), '[]'::jsonb)
  ) AS report
  FROM functions p
),
rpc_checks AS (
  SELECT q.*, p.oid, jsonb_build_object(
    'name', q.rpc_name, 'expected_signature', q.expected_signature,
    'present', p.oid IS NOT NULL,
    'returns_jsonb', coalesce(p.prorettype = 'pg_catalog.jsonb'::regtype AND NOT p.proretset, false),
    'security_definer', p.prosecdef,
    'search_path_pinned', coalesce(EXISTS (SELECT 1 FROM unnest(p.proconfig) v
      WHERE split_part(v, '=', 1) = 'search_path'), false),
    'service_role_can_execute', (SELECT CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
      ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END FROM roles r WHERE r.role_name = 'service_role'),
    'anon_can_execute', (SELECT CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
      ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END FROM roles r WHERE r.role_name = 'anon'),
    'authenticated_can_execute', (SELECT CASE WHEN r.oid IS NULL OR p.oid IS NULL THEN NULL
      ELSE pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE') END FROM roles r WHERE r.role_name = 'authenticated'),
    'public_can_execute', CASE WHEN p.oid IS NULL THEN NULL ELSE EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') END,
    'same_name_overload_count', (SELECT count(*) FROM pg_catalog.pg_proc overload
      JOIN pg_catalog.pg_namespace ns ON ns.oid = overload.pronamespace
      WHERE ns.nspname = 'public' AND overload.proname = q.rpc_name)
  ) AS report
  FROM rpc_requests q
  LEFT JOIN pg_catalog.pg_proc p ON p.oid = pg_catalog.to_regprocedure(q.expected_signature)
),
relation_reports AS (
  SELECT r.schema_name, r.relation_name, jsonb_build_object(
    'schema', r.schema_name, 'name', r.relation_name, 'purpose', r.purpose,
    'required_before_migration', r.required_before_migration, 'present', r.oid IS NOT NULL,
    'kind', r.relkind, 'owner', pg_catalog.pg_get_userbyid(r.relowner),
    'rls_enabled', r.relrowsecurity, 'rls_forced', r.relforcerowsecurity,
    'is_partition', r.relispartition,
    'columns', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'position', a.attnum, 'name', a.attname,
      'type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'type_schema', tn.nspname, 'type_name', typ.typname, 'type_kind', typ.typtype,
      'domain_base_type', CASE WHEN typ.typtype = 'd' THEN pg_catalog.format_type(typ.typbasetype, typ.typtypmod) END,
      'not_null', a.attnotnull, 'identity', a.attidentity, 'generated', a.attgenerated,
      'has_default', d.oid IS NOT NULL,
      'default_expression_md5', md5(pg_catalog.pg_get_expr(d.adbin, d.adrelid)),
      'column_acl', a.attacl::text,
      'effective_privileges_by_role', (SELECT jsonb_object_agg(role.role_name,
        CASE WHEN role.oid IS NULL THEN NULL ELSE jsonb_build_object(
          'select', pg_catalog.has_column_privilege(role.oid, r.oid, a.attnum, 'SELECT'),
          'insert', pg_catalog.has_column_privilege(role.oid, r.oid, a.attnum, 'INSERT'),
          'update', pg_catalog.has_column_privilege(role.oid, r.oid, a.attnum, 'UPDATE'),
          'references', pg_catalog.has_column_privilege(role.oid, r.oid, a.attnum, 'REFERENCES')) END)
        FROM roles role)
    ) ORDER BY a.attnum)
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_type typ ON typ.oid = a.atttypid
    JOIN pg_catalog.pg_namespace tn ON tn.oid = typ.typnamespace
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped), '[]'::jsonb),
    'indexes', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'name', ic.relname, 'method', am.amname, 'unique', i.indisunique,
      'primary', i.indisprimary, 'valid', i.indisvalid, 'ready', i.indisready,
      'live', i.indislive, 'immediate', i.indimmediate,
      'key_column_count', i.indnkeyatts, 'total_column_count', i.indnatts,
      'partial', i.indpred IS NOT NULL, 'has_expressions', i.indexprs IS NOT NULL,
      'definition_md5', md5(pg_catalog.pg_get_indexdef(i.indexrelid)),
      'predicate_md5', md5(pg_catalog.pg_get_expr(i.indpred, i.indrelid)),
      'columns', (SELECT jsonb_agg(jsonb_build_object('position', k.ord,
        'name', a.attname, 'expression', k.attnum = 0,
        'included', k.ord > i.indnkeyatts) ORDER BY k.ord)
        FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(attnum, ord)
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = r.oid AND a.attnum = k.attnum)
    ) ORDER BY ic.relname)
    FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_catalog.pg_am am ON am.oid = ic.relam WHERE i.indrelid = r.oid), '[]'::jsonb),
    'constraints', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'name', c.conname, 'type', c.contype, 'validated', c.convalidated,
      'deferrable', c.condeferrable, 'initially_deferred', c.condeferred,
      'definition_md5', md5(pg_catalog.pg_get_constraintdef(c.oid)),
      'columns', (SELECT jsonb_agg(a.attname ORDER BY k.ord)
        FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum),
      'referenced_relation', CASE WHEN c.confrelid <> 0 THEN c.confrelid::regclass::text END,
      'referenced_columns', (SELECT jsonb_agg(a.attname ORDER BY k.ord)
        FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
        LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum),
      'foreign_update_action', c.confupdtype, 'foreign_delete_action', c.confdeltype,
      'foreign_match_type', c.confmatchtype
    ) ORDER BY c.conname) FROM pg_catalog.pg_constraint c WHERE c.conrelid = r.oid), '[]'::jsonb),
    'triggers', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled, 'internal', t.tgisinternal,
      'type_bits', t.tgtype, 'row_level', (t.tgtype::integer & 1) <> 0,
      'timing', CASE WHEN (t.tgtype::integer & 2) <> 0 THEN 'BEFORE'
        WHEN (t.tgtype::integer & 64) <> 0 THEN 'INSTEAD OF' ELSE 'AFTER' END,
      'insert', (t.tgtype::integer & 4) <> 0, 'delete', (t.tgtype::integer & 8) <> 0,
      'update', (t.tgtype::integer & 16) <> 0, 'truncate', (t.tgtype::integer & 32) <> 0,
      'function', t.tgfoid::regprocedure::text,
      'argument_count', t.tgnargs, 'condition_md5', md5(t.tgqual::text),
      'definition_md5', md5(pg_catalog.pg_get_triggerdef(t.oid)),
      'constraint_trigger', t.tgconstraint <> 0,
      'deferrable', t.tgdeferrable, 'initially_deferred', t.tginitdeferred
    ) ORDER BY t.tgname) FROM pg_catalog.pg_trigger t WHERE t.tgrelid = r.oid), '[]'::jsonb),
    'policies', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'name', p.polname, 'command', p.polcmd, 'permissive', p.polpermissive,
      'roles', (SELECT jsonb_agg(CASE WHEN role_id = 0 THEN 'PUBLIC'
        ELSE pg_catalog.pg_get_userbyid(role_id) END ORDER BY role_id) FROM unnest(p.polroles) role_id),
      'using_present', p.polqual IS NOT NULL, 'check_present', p.polwithcheck IS NOT NULL,
      'using_literal_true', pg_catalog.pg_get_expr(p.polqual, p.polrelid) = 'true',
      'check_literal_true', pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) = 'true',
      'using_expression_md5', md5(pg_catalog.pg_get_expr(p.polqual, p.polrelid)),
      'check_expression_md5', md5(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid))
    ) ORDER BY p.polname) FROM pg_catalog.pg_policy p WHERE p.polrelid = r.oid), '[]'::jsonb),
    'effective_table_privileges_by_role', (SELECT jsonb_object_agg(role.role_name,
      CASE WHEN role.oid IS NULL OR r.oid IS NULL THEN NULL ELSE jsonb_build_object(
        'select', pg_catalog.has_table_privilege(role.oid, r.oid, 'SELECT'),
        'insert', pg_catalog.has_table_privilege(role.oid, r.oid, 'INSERT'),
        'update', pg_catalog.has_table_privilege(role.oid, r.oid, 'UPDATE'),
        'delete', pg_catalog.has_table_privilege(role.oid, r.oid, 'DELETE'),
        'truncate', pg_catalog.has_table_privilege(role.oid, r.oid, 'TRUNCATE'),
        'references', pg_catalog.has_table_privilege(role.oid, r.oid, 'REFERENCES'),
        'trigger', pg_catalog.has_table_privilege(role.oid, r.oid, 'TRIGGER')) END) FROM roles role),
    'acl', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'grantor', pg_catalog.pg_get_userbyid(a.grantor),
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END,
      'privilege', a.privilege_type, 'grantable', a.is_grantable) ORDER BY a.grantee, a.privilege_type)
      FROM pg_catalog.aclexplode(coalesce(r.relacl, pg_catalog.acldefault('r', r.relowner))) a), '[]'::jsonb)
  ) AS report
  FROM relations r
)
SELECT jsonb_build_object(
  'report_version', 1,
  'captured_at', statement_timestamp(), 'database', current_database(),
  'server_version', current_setting('server_version'),
  'executing_role', CURRENT_USER, 'session_role', SESSION_USER,
  'scope', jsonb_build_object(
    'catalog_metadata_only', true, 'customer_rows_read', false,
    'function_bodies_returned', false, 'secret_values_returned', false,
    'application_rpcs_invoked', false, 'production_changes_made', false,
    'postgrest_exposure_checked', false, 'live_auth_or_provider_acceptance', false,
    'deployment_readiness_proven', false),
  'roles', (SELECT jsonb_agg(jsonb_build_object('name', r.role_name, 'present', r.oid IS NOT NULL,
    'superuser', r.rolsuper, 'inherits', r.rolinherit, 'can_login', r.rolcanlogin,
    'bypass_rls', r.rolbypassrls) ORDER BY r.role_name) FROM roles r),
  'role_memberships', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'role', pg_catalog.pg_get_userbyid(m.roleid), 'member', pg_catalog.pg_get_userbyid(m.member),
    'grantor', pg_catalog.pg_get_userbyid(m.grantor), 'admin_option', m.admin_option)
    ORDER BY m.roleid, m.member) FROM pg_catalog.pg_auth_members m
    WHERE m.roleid IN (SELECT oid FROM roles) OR m.member IN (SELECT oid FROM roles)), '[]'::jsonb),
  'schema_privileges', (SELECT jsonb_agg(jsonb_build_object('schema', n.nspname,
    'owner', pg_catalog.pg_get_userbyid(n.nspowner), 'by_role',
    (SELECT jsonb_object_agg(r.role_name, CASE WHEN r.oid IS NULL THEN NULL ELSE jsonb_build_object(
      'usage', pg_catalog.has_schema_privilege(r.oid, n.oid, 'USAGE'),
      'create', pg_catalog.has_schema_privilege(r.oid, n.oid, 'CREATE')) END) FROM roles r)) ORDER BY n.nspname)
    FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('public', 'auth')),
  'relations', (SELECT jsonb_agg(report ORDER BY schema_name, relation_name) FROM relation_reports),
  'required_column_checks', (SELECT jsonb_agg(to_jsonb(c) ORDER BY schema_name, relation_name, column_name)
    FROM column_checks c),
  'orders_id_unique_ready', EXISTS (
    SELECT 1 FROM relations r JOIN pg_catalog.pg_attribute a ON a.attrelid = r.oid AND a.attname = 'id'
    JOIN pg_catalog.pg_index i ON i.indrelid = r.oid
    WHERE r.schema_name = 'public' AND r.relation_name = 'orders'
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate
      AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum AND i.indpred IS NULL AND i.indexprs IS NULL),
  'merit_rpc_metadata_readiness', (SELECT jsonb_agg(report ORDER BY rpc_name) FROM rpc_checks),
  'helper_presence', (SELECT jsonb_agg(jsonb_build_object(
    'signature', h.expected_signature, 'purpose', h.purpose,
    'present', pg_catalog.to_regprocedure(h.expected_signature) IS NOT NULL) ORDER BY h.expected_signature)
    FROM helper_requests h),
  'relevant_functions', coalesce((SELECT jsonb_agg(report ORDER BY report ->> 'schema', report ->> 'signature')
    FROM function_reports), '[]'::jsonb),
  'limits', jsonb_build_array(
    'Catalog privilege checks do not evaluate RLS against real JWT identities or execute application SQL.',
    'Function signatures, ACL and a pinned search_path do not establish correct function bodies or safe callable setters.',
    'Name/dependency discovery cannot find every dynamic-SQL writer, external webhook, or other exposed schema.',
    'Unknown check/default/index expressions are fingerprinted, not inspected; native exact-schema acceptance remains required.',
    'Column types are expectations from the local Merit draft, not a migration safety certificate.',
    'No application rows/counts, sequence values, role passwords, function bodies or configuration secret values are returned.'
  )
) AS merit_checkout_preflight;
