#!/usr/bin/env node
// Offline catalog acceptance only. Never connects to a database or emits catalog
// contents, function bodies, credentials, or business records.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLES = ['user_promos', 'affiliates', 'affiliate_orders', 'affiliate_payouts'];
const ROLES = ['anon', 'authenticated', 'service_role'];
const PRIVILEGES = ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger', 'maintain'];
const CRUD = new Set(['select', 'insert', 'update', 'delete']);
const CLIENTS = new Set(['PUBLIC', 'anon', 'authenticated']);
const GUARD = 'guard_user_promo_customer_update()';
const TRIGGER = 'user_promos_verified_update_guard';
const HELPER = 'can_access_order_record(uuid,text,boolean)';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const signature = value => typeof value === 'string' ? value.replace(/^public\./, '').replace(/\s+/g, '') : '';
const canonical = value => Array.isArray(value) ? value.map(canonical) : record(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const equal = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

function indexRows(value, key, nullable = false) {
  if (value === null && nullable) value = [];
  if (!Array.isArray(value)) return null;
  const result = new Map();
  for (const row of value) {
    if (!record(row)) return null;
    const name = typeof key === 'function' ? key(row) : row[key];
    if (typeof name !== 'string' || !name || result.has(name)) return null;
    result.set(name, row);
  }
  return result;
}

// ACL identifiers can be quoted and contain '=' or '/'. Split only outside
// quoted identifiers; a missing ACL is PostgreSQL's default, not a parse error.
function aclSeparator(text, separator) {
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && text[i] === separator) return i;
  }
  return -1;
}

function aclIdentifier(value, allowPublic = false) {
  if (value === '' && allowPublic) return 'PUBLIC';
  if (/^[A-Za-z_][A-Za-z0-9_$]*$/.test(value)) return value;
  if (/^"(?:[^"]|"")+"$/.test(value)) return value.slice(1, -1).replaceAll('""', '"');
  return null;
}

function parseAcl(value) {
  if (value === null) return [];
  if (!Array.isArray(value)) return null;
  const entries = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const equals = aclSeparator(item, '=');
    if (equals < 0) return null;
    const tail = item.slice(equals + 1), slash = aclSeparator(tail, '/');
    if (slash < 0) return null;
    const grantee = aclIdentifier(item.slice(0, equals), true);
    const grantor = aclIdentifier(tail.slice(slash + 1));
    const permissions = tail.slice(0, slash);
    if (grantee === null || grantor === null || !/^(?:[arwdDxtmXUCcT]\*?)*$/.test(permissions)) return null;
    const grants = permissions.match(/[arwdDxtmXUCcT]\*?/g) || [];
    if (new Set(grants.map(grant => grant[0])).size !== grants.length) return null;
    entries.push({ grantee, grantor, grants: grants.sort() });
  }
  return entries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
}

// Parse only the exact policy language used by this migration. This accepts
// pg_get_expr's harmless casts/schema qualification/redundant parentheses,
// while retaining boolean grouping instead of stripping all parentheses.
function policyExpression(value) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 4000) throw new Error('expression');
  const tokens = [];
  let offset = 0;
  while (offset < value.length) {
    const rest = value.slice(offset);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) { offset += whitespace[0].length; continue; }
    const token = /^(?:[A-Za-z_][A-Za-z0-9_]*|"[a-z_][a-z0-9_]*"|::|[(),.])/.exec(rest);
    if (!token) throw new Error('expression');
    tokens.push(token[0].replaceAll('"', '').toLowerCase());
    offset += token[0].length;
  }
  let position = 0;
  const take = expected => {
    if (tokens[position++] !== expected) throw new Error('expression');
  };
  const valueToken = () => {
    const token = tokens[position++];
    if (!['null', 'email', 'true', 'false'].includes(token)) throw new Error('expression');
    if (tokens[position] === '::') {
      position++;
      if (tokens[position] === 'pg_catalog') { position++; take('.'); }
      const type = tokens[position++];
      const permitted = token === 'null' ? ['uuid', 'text'] : token === 'email' ? ['text', 'varchar'] : ['boolean', 'bool'];
      if (!permitted.includes(type)) throw new Error('expression');
    }
    return token;
  };
  const primary = () => {
    if (tokens[position] === '(') {
      position++;
      const result = parseOr();
      take(')');
      return result;
    }
    if (tokens[position] === 'used') {
      position++;
      take('is');
      const state = tokens[position++];
      if (!['true', 'false'].includes(state)) throw new Error('expression');
      return ['is', 'used', state];
    }
    if (tokens[position] === 'public') { position++; take('.'); }
    take('can_access_order_record');
    take('(');
    const first = valueToken(); take(',');
    const second = valueToken(); take(',');
    const third = valueToken(); take(')');
    return ['can_access_order_record', first, second, third];
  };
  const parseAnd = () => {
    let result = primary();
    while (tokens[position] === 'and') { position++; result = ['and', result, primary()]; }
    return result;
  };
  const parseOr = () => {
    let result = parseAnd();
    while (tokens[position] === 'or') { position++; result = ['or', result, parseAnd()]; }
    return result;
  };
  const result = parseOr();
  if (position !== tokens.length) throw new Error('expression');
  return result;
}

function expectedPolicies(table) {
  const owner = 'public.can_access_order_record(NULL,email,false)';
  const admin = 'public.can_access_order_record(NULL,NULL,true)';
  const specs = table === 'user_promos' ? [
    ['read', 'r', owner, null],
    ['insert', 'a', null, admin],
    ['update', 'w', `${admin} OR (used IS FALSE AND ${owner})`, `${admin} OR (used IS TRUE AND ${owner})`],
    ['delete', 'd', owner, null],
  ] : [['admin', '*', admin, admin]];
  return specs.flatMap(([operation, command, using, check]) => [true, false].map(permissive => ({
    name: `${table}_verified_${operation}${permissive ? '' : '_boundary'}`,
    command, permissive, roles: ['authenticated'],
    using: policyExpression(using), check: policyExpression(check),
  })));
}

function matchesPolicy(actual, expected) {
  try {
    return record(actual) && equal({
      ...actual, using: policyExpression(actual.using), check: policyExpression(actual.check),
    }, expected);
  } catch { return false; }
}

const pinnedSearchPath = settings => Array.isArray(settings) && settings.length === 1
  && typeof settings[0] === 'string' && settings[0].replace(/\s+/g, '') === 'search_path=pg_catalog';
const normalizeTrigger = value => typeof value === 'string' ? value.toLowerCase()
  .replace(/\bpublic\./g, '').replace(/\s+/g, ' ').trim().replace(/;$/, '') : '';

/** Compare two outputs of promo_affiliate_access_preflight.sql without I/O. */
export function verifyPromoAffiliateContainment(before, after, migrationSource) {
  const checks = [];
  const check = (name, passed) => checks.push({ name, passed: passed === true });
  const finish = () => ({
    passed: checks.filter(item => item.passed).length,
    failed: checks.filter(item => !item.passed).length,
    checks,
  });
  if (!record(before) || !record(after) || typeof migrationSource !== 'string') {
    check('Catalog inputs and migration source are present', false);
    return finish();
  }
  try {
    const oldTables = indexRows(before.relations, 'name'), newTables = indexRows(after.relations, 'name');
    check('Both catalogs contain exactly the four target tables', !!oldTables && !!newTables
      && oldTables.size === TABLES.length && newTables.size === TABLES.length
      && TABLES.every(name => oldTables.get(name)?.exists === true && newTables.get(name)?.exists === true));
    const oldRoles = indexRows(before.roles, 'name'), newRoles = indexRows(after.roles, 'name');
    check('Role definitions are complete and unchanged', !!oldRoles && !!newRoles && oldRoles.size === 3 && newRoles.size === 3
      && ROLES.every(role => oldRoles.has(role) && equal(oldRoles.get(role), newRoles.get(role)))
      && ['anon', 'authenticated'].every(role => newRoles.get(role)?.superuser === false && newRoles.get(role)?.bypassRls === false));
    check('Server version is recorded and unchanged', typeof before.serverVersion === 'string'
      && before.serverVersion.length > 0 && before.serverVersion === after.serverVersion);

    const oldFunctions = indexRows(before.functionMetadata, row => signature(row.signature));
    const newFunctions = indexRows(after.functionMetadata, row => signature(row.signature));
    const helper = oldFunctions?.get(HELPER);
    check('Confirmed identity helper exists in the baseline', !!helper && helper.definer === true
      && helper.returnType === 'boolean' && typeof helper.owner === 'string' && helper.owner.length > 0);
    check('All existing function metadata is unchanged', !!oldFunctions && !!newFunctions
      && [...oldFunctions].every(([name, value]) => equal(value, newFunctions.get(name))));
    check('Only the expected new guard function is added', !!oldFunctions && !!newFunctions
      && !oldFunctions.has(GUARD) && newFunctions.has(GUARD) && newFunctions.size === oldFunctions.size + 1
      && [...newFunctions.keys()].every(name => oldFunctions.has(name) || name === GUARD));

    const bodyMatches = [...migrationSource.matchAll(/CREATE\s+FUNCTION\s+public\.guard_user_promo_customer_update\s*\(\s*\)\s+RETURNS\s+trigger\s+LANGUAGE\s+plpgsql\s+SECURITY\s+INVOKER\s+SET\s+search_path\s*=\s*pg_catalog\s+AS\s+(\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$)([\s\S]*?)\1\s*;/gi)];
    check('Migration contains exactly one pinned invoker guard definition', bodyMatches.length === 1);
    const bodyMd5 = bodyMatches.length === 1 ? createHash('md5').update(bodyMatches[0][2], 'utf8').digest('hex') : null;
    const guard = newFunctions?.get(GUARD), guardAcl = parseAcl(guard?.acl);
    check('New guard body exactly matches the migration', bodyMd5 !== null && guard?.sourceMd5 === bodyMd5);
    check('New guard uses invoker security, pinned search path and helper owner', !!guard && guard.definer === false
      && guard.returnType === 'trigger' && pinnedSearchPath(guard.settings) && !!helper && guard.owner === helper.owner);
    check('New guard execution is owner-only', !!guard && equal(guard.execute, { anon: false, authenticated: false, service_role: false })
      && Array.isArray(guard.acl) && !!guardAcl && guardAcl.length === 1 && guardAcl[0].grantee === guard.owner
      && guardAcl[0].grantor === guard.owner && equal(guardAcl[0].grants, ['X']));

    for (const table of TABLES) {
      const previous = oldTables?.get(table), next = newTables?.get(table);
      if (!previous || !next) { check(`${table}: catalog relation is available`, false); continue; }
      check(`${table}: owner and force-RLS state are preserved; RLS is enabled`, typeof previous.owner === 'string'
        && previous.owner.length > 0 && next.owner === previous.owner && next.rls === true
        && typeof previous.forceRls === 'boolean' && next.forceRls === previous.forceRls);

      const oldColumns = indexRows(previous.columns, 'name'), newColumns = indexRows(next.columns, 'name');
      check(`${table}: every column definition except ACL is unchanged`, !!oldColumns && !!newColumns && oldColumns.size > 0
        && oldColumns.size === newColumns.size && [...oldColumns].every(([name, value]) => newColumns.has(name)
          && equal(without(value, ['acl']), without(newColumns.get(name), ['acl']))));
      check(`${table}: column ACLs remove clients and preserve other grants`, !!oldColumns && !!newColumns
        && [...newColumns].every(([name, column]) => {
          const oldAcl = parseAcl(oldColumns.get(name)?.acl), newAcl = parseAcl(column.acl);
          return oldAcl !== null && newAcl !== null && !newAcl.some(entry => CLIENTS.has(entry.grantee))
            && equal(oldAcl.filter(entry => !CLIENTS.has(entry.grantee)), newAcl);
        }));

      const oldAcl = parseAcl(previous.acl), newAcl = parseAcl(next.acl);
      check(`${table}: table ACLs contain no public or anonymous grant`, newAcl !== null && Array.isArray(next.acl)
        && !newAcl.some(entry => ['PUBLIC', 'anon'].includes(entry.grantee)));
      check(`${table}: unrelated table ACLs are unchanged`, oldAcl !== null && newAcl !== null
        && equal(oldAcl.filter(entry => !CLIENTS.has(entry.grantee) && entry.grantee !== 'service_role'),
          newAcl.filter(entry => !CLIENTS.has(entry.grantee) && entry.grantee !== 'service_role')));
      check(`${table}: authenticated grants carry no grant option`, newAcl !== null
        && newAcl.filter(entry => entry.grantee === 'authenticated').every(entry => entry.grants.every(grant => ['a', 'r', 'w', 'd'].includes(grant))));
      const oldPrivileges = indexRows(previous.privileges, 'role'), newPrivileges = indexRows(next.privileges, 'role');
      check(`${table}: role privilege snapshots are complete`, !!oldPrivileges && !!newPrivileges
        && oldPrivileges.size === 3 && newPrivileges.size === 3 && ROLES.every(role =>
          PRIVILEGES.every(privilege => typeof oldPrivileges.get(role)?.[privilege] === 'boolean'
            && typeof newPrivileges.get(role)?.[privilege] === 'boolean')));
      check(`${table}: anonymous privileges are all denied`, PRIVILEGES.every(privilege => newPrivileges?.get('anon')?.[privilege] === false));
      check(`${table}: authenticated CRUD is allowed and non-row privileges denied`, PRIVILEGES.every(privilege =>
        newPrivileges?.get('authenticated')?.[privilege] === CRUD.has(privilege)));
      check(`${table}: service privilege bits are unchanged`, !!oldPrivileges?.get('service_role') && !!newPrivileges?.get('service_role')
        && PRIVILEGES.every(privilege => typeof oldPrivileges.get('service_role')[privilege] === 'boolean'
          && oldPrivileges.get('service_role')[privilege] === newPrivileges.get('service_role')[privilege]));

      const oldConstraints = indexRows(previous.constraints, 'name', true), newConstraints = indexRows(next.constraints, 'name', true);
      check(`${table}: constraints are unchanged`, !!oldConstraints && !!newConstraints && oldConstraints.size === newConstraints.size
        && [...oldConstraints].every(([name, value]) => equal(value, newConstraints.get(name))));
      const oldPolicies = indexRows(previous.policies, 'name', true), newPolicies = indexRows(next.policies, 'name', true);
      const expected = expectedPolicies(table), expectedNames = new Set(expected.map(policy => policy.name));
      check(`${table}: all existing policies are unchanged`, !!oldPolicies && !!newPolicies
        && [...oldPolicies].every(([name, value]) => equal(value, newPolicies.get(name))));
      check(`${table}: only the expected policies are added`, !!oldPolicies && !!newPolicies
        && expected.every(policy => !oldPolicies.has(policy.name)) && newPolicies.size === oldPolicies.size + expected.length
        && [...newPolicies.keys()].every(name => oldPolicies.has(name) || expectedNames.has(name)));
      for (const policy of expected) check(`${policy.name}: exact command, roles, mode and predicates`, matchesPolicy(newPolicies?.get(policy.name), policy));

      const oldTriggers = indexRows(previous.triggers, 'name', true), newTriggers = indexRows(next.triggers, 'name', true);
      check(`${table}: all existing trigger metadata is unchanged`, !!oldTriggers && !!newTriggers
        && [...oldTriggers].every(([name, value]) => equal(value, newTriggers.get(name))));
      check(`${table}: no unexpected triggers are added`, !!oldTriggers && !!newTriggers
        && (table !== 'user_promos' || !oldTriggers.has(TRIGGER))
        && newTriggers.size === oldTriggers.size + (table === 'user_promos' ? 1 : 0)
        && [...newTriggers.keys()].every(name => oldTriggers.has(name) || (table === 'user_promos' && name === TRIGGER)));
      if (table === 'user_promos') {
        const trigger = newTriggers?.get(TRIGGER);
        check('New promo trigger is enabled, BEFORE UPDATE and row-level with the exact guard', !!trigger
          && trigger.enabled === 'O' && signature(trigger.function) === GUARD && trigger.definer === false
          && pinnedSearchPath(trigger.settings) && bodyMd5 !== null && trigger.functionMd5 === bodyMd5
          && normalizeTrigger(trigger.definition) === `create trigger ${TRIGGER} before update on user_promos for each row execute function ${GUARD}`);
      }
    }
  } catch {
    // Fail closed without disclosing the input that caused parsing to fail.
    check('Catalog metadata can be safely compared', false);
  }
  return finish();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let result;
  try {
    if (process.argv.length !== 4) throw new Error('arguments');
    const before = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const after = JSON.parse(readFileSync(process.argv[3], 'utf8'));
    const migration = readFileSync(new URL('../supabase/migrations/20261009040000_promo_affiliate_access_containment.sql', import.meta.url), 'utf8');
    result = verifyPromoAffiliateContainment(before, after, migration);
  } catch {
    result = { passed: 0, failed: 1, checks: [{ name: 'Offline inputs are readable JSON and migration source is available', passed: false }] };
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.failed > 0) process.exitCode = 1;
}
