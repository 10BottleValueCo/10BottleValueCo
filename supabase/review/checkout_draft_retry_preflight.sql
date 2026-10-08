-- Checkout draft retry preflight. READ ONLY. NOT EXECUTED by this change.
-- Run against the intended staging database first; separately inspect the exact
-- production project before rollout. Every statement below reads PostgreSQL
-- catalogs only. No customer/order rows or secret values are selected.
--
-- Required for INSERT-first / unique-conflict retry deduplication:
--   * public.orders is an ordinary or partitioned table and the draft columns
--     have the expected base types.
--   * orders.id has an immediate, live, ready, valid, nonpartial, nonexpression
--     UNIQUE or PRIMARY KEY index whose sole uniqueness key is id. A composite unique
--     key such as (id, user_id), a partial index, or a merely observed absence
--     of duplicates does NOT establish the required guarantee.
--   * Inspect effective grants, column grants and RLS policies together.
--     Browser INSERT/UPDATE access to financial/ownership fields still permits
--     bypass and rollback of previously valid signed pending-draft snapshots.
--     HMAC proof does not make those mutable rows immutable or secure payments.
--
-- A passing uniqueness check alone is NOT release approval. This does not test
-- PostgREST response/unique-violation behavior, defaults or mutating triggers,
-- signing-secret configuration/rotation, provider flows or transaction locks.
-- Preserve a separate exact ACL/policy snapshot before any authorized change.

-- 1. Relation, RLS and the necessary uniqueness guarantee (always one row).
WITH target AS (
  SELECT to_regclass('public.orders') AS table_oid
), id_column AS (
  SELECT a.attnum, a.attnotnull, a.atttypid
  FROM target t
  JOIN pg_attribute a ON a.attrelid = t.table_oid
  WHERE a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped
)
SELECT
  now() AT TIME ZONE 'UTC' AS checked_at_utc,
  current_database() AS database_name,
  current_user AS inspected_as,
  t.table_oid::text AS relation,
  t.table_oid IS NOT NULL AS orders_exists,
  c.relkind AS relation_kind,
  COALESCE(c.relkind IN ('r', 'p'), false) AS writable_table_kind,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  EXISTS (SELECT 1 FROM id_column) AS id_column_exists,
  EXISTS (SELECT 1 FROM id_column WHERE atttypid = 'text'::regtype) AS id_is_text,
  EXISTS (SELECT 1 FROM id_column WHERE attnotnull) AS id_not_null,
  EXISTS (
    SELECT 1
    FROM pg_index i
    CROSS JOIN id_column a
    WHERE i.indrelid = t.table_oid
      AND i.indisunique AND i.indimmediate AND i.indisvalid AND i.indisready AND i.indislive
      AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      AND i.indpred IS NULL AND i.indexprs IS NULL
  ) AS has_ready_single_column_id_uniqueness
FROM target t
LEFT JOIN pg_class c ON c.oid = t.table_oid;

-- 2. Index evidence. INCLUDE columns do not widen a uniqueness key, so they
-- are reported separately. A standalone unique index also qualifies; the
-- implementation uses plain INSERT, not ON CONFLICT DO UPDATE/upsert.
SELECT
  ic.relname AS index_name,
  i.indisprimary AS is_primary,
  i.indisunique AS is_unique,
  i.indimmediate AS is_immediate,
  i.indisvalid AS is_valid,
  i.indisready AS is_ready,
  i.indislive AS is_live,
  i.indnkeyatts AS uniqueness_key_count,
  i.indnatts - i.indnkeyatts AS included_column_count,
  ARRAY(
    SELECT a.attname
    FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(attnum, position)
    LEFT JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE k.position <= i.indnkeyatts
    ORDER BY k.position
  ) AS uniqueness_key_columns,
  i.indpred IS NULL AS nonpartial,
  i.indexprs IS NULL AS no_expressions,
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  con.condeferrable AS constraint_deferrable,
  con.convalidated AS constraint_validated,
  (i.indisunique AND i.indimmediate AND i.indisvalid AND i.indisready AND i.indislive
    AND i.indnkeyatts = 1 AND id_col.attnum IS NOT NULL
    AND i.indkey[0] = id_col.attnum
    AND i.indpred IS NULL AND i.indexprs IS NULL) AS qualifies_for_draft_id_dedup
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid AND con.contype IN ('p', 'u')
LEFT JOIN pg_attribute id_col ON id_col.attrelid = i.indrelid
  AND id_col.attname = 'id' AND id_col.attnum > 0 AND NOT id_col.attisdropped
WHERE i.indrelid = to_regclass('public.orders')
ORDER BY i.indisprimary DESC, ic.relname;

-- 3. Type/default/nullability assumptions. Only default presence is exposed,
-- never the default expression. Exact behavior still needs a staging insert.
WITH expected(column_name, expected_base_type) AS (
  VALUES
    ('id', 'text'),
    ('user_id', 'uuid'),
    ('email', 'text'),
    ('status', 'text'),
    ('created_at', 'timestamp with time zone'),
    ('total', 'numeric'),
    ('items', 'jsonb'),
    ('metadata', 'jsonb'),
    ('payment_provider', 'text'),
    ('payment_id', 'text'),
    ('paid_at', 'timestamp with time zone')
)
SELECT
  e.column_name,
  e.expected_base_type,
  a.attnum IS NOT NULL AS column_exists,
  format_type(a.atttypid, a.atttypmod) AS actual_type,
  COALESCE(a.atttypid = to_regtype(e.expected_base_type), false) AS expected_base_type_matches,
  a.attnotnull AS not_null,
  d.oid IS NOT NULL AS has_default,
  a.attidentity AS identity_generation,
  a.attgenerated AS generated_column
FROM expected e
LEFT JOIN pg_attribute a ON a.attrelid = to_regclass('public.orders')
  AND a.attname = e.column_name AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
ORDER BY e.column_name;

-- 4. Effective role privileges include inherited and PUBLIC table grants.
-- These booleans describe grants, not the final result of an RLS policy check.
WITH expected_roles(role_name) AS (
  VALUES ('anon'), ('authenticated'), ('service_role')
), target AS (
  SELECT to_regclass('public.orders') AS table_oid
)
SELECT
  e.role_name,
  r.oid IS NOT NULL AS role_exists,
  r.rolbypassrls AS role_bypasses_rls,
  has_schema_privilege(r.oid, 'public'::regnamespace::oid, 'USAGE') AS schema_usage,
  has_table_privilege(r.oid, t.table_oid::oid, 'SELECT') AS table_select,
  has_table_privilege(r.oid, t.table_oid::oid, 'INSERT') AS table_insert,
  has_table_privilege(r.oid, t.table_oid::oid, 'UPDATE') AS table_update,
  has_table_privilege(r.oid, t.table_oid::oid, 'DELETE') AS table_delete,
  has_table_privilege(r.oid, t.table_oid::oid, 'TRUNCATE') AS table_truncate
FROM expected_roles e
LEFT JOIN pg_roles r ON r.rolname = e.role_name
CROSS JOIN target t
ORDER BY e.role_name;

-- 5. Effective column privileges also reveal browser writes that would survive
-- a table-grant change. metadata contains the private draft retry proof.
WITH expected_roles(role_name) AS (
  VALUES ('anon'), ('authenticated'), ('service_role')
)
SELECT
  e.role_name,
  a.attname AS column_name,
  has_column_privilege(r.oid, a.attrelid, a.attnum, 'SELECT') AS column_select,
  has_column_privilege(r.oid, a.attrelid, a.attnum, 'INSERT') AS column_insert,
  has_column_privilege(r.oid, a.attrelid, a.attnum, 'UPDATE') AS column_update
FROM expected_roles e
LEFT JOIN pg_roles r ON r.rolname = e.role_name
CROSS JOIN pg_attribute a
WHERE a.attrelid = to_regclass('public.orders')
  AND a.attnum > 0 AND NOT a.attisdropped
  AND a.attname IN ('id', 'user_id', 'email', 'status', 'created_at', 'total',
    'items', 'metadata', 'payment_provider', 'payment_id', 'paid_at')
ORDER BY e.role_name, a.attname;

-- 6. Policy definitions must be assessed with the effective grants above.
-- This is catalog configuration, not a query of customer/order records.
SELECT
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'orders'
ORDER BY policyname;
