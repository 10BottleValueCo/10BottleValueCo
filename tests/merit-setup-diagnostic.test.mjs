import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMeritSetup } from '../scripts/check-merit-setup.mjs';

test('setup diagnostic reports missing names and never emits private values', () => {
  assert.ok(inspectMeritSetup({}).missing.includes('ATTESTLY_API_KEY'));
  assert.ok(inspectMeritSetup({}).missing.includes('SUPABASE_URL'));
  const env = { MERIT_ENABLED: 'true', ATTESTLY_API_KEY: 'private-api-sentinel',
    ATTESTLY_WEBHOOK_SECRET: 'private-webhook-sentinel', SUPABASE_SERVICE_ROLE_KEY: 'private-service-sentinel',
    SUPABASE_URL: 'https://private-db-sentinel.example', MERIT_MODE: 'test', MERIT_RULE_VERSION: 'private-rule-sentinel',
    MERIT_CARD_SURCHARGE_BPS: '300', MERIT_CARD_SURCHARGE_SOURCE: 'private-source-sentinel',
    MERIT_CARD_SURCHARGE_EFFECTIVE_AT: '2026-10-10T00:00:00Z' };
  const result = inspectMeritSetup(env);
  assert.deepEqual(result.missing, []);
  assert.equal(result.paymentRulesConfigured, true);
  assert.match(result.next, /readiness failed/);
  assert.doesNotMatch(JSON.stringify(result), /private-.*sentinel/);
  assert.equal(inspectMeritSetup({ ...env, MERIT_CARD_SURCHARGE_EFFECTIVE_AT: 'invalid' }).paymentRulesConfigured, false);
});
