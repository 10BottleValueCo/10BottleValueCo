import { getMeritConfig } from '../api/_merit-core.js';
import { pathToFileURL } from 'node:url';

// Local environment inspection only: no provider, database or payment request.
// Never print values; this output may be shared with a developer or an AI tool.
export function inspectMeritSetup(env = process.env) {
  const config = getMeritConfig(env);
  const required = ['ATTESTLY_API_KEY', 'ATTESTLY_WEBHOOK_SECRET', 'MERIT_MODE',
    'MERIT_RULE_VERSION', 'MERIT_CARD_SURCHARGE_BPS', 'MERIT_CARD_SURCHARGE_SOURCE',
    'MERIT_CARD_SURCHARGE_EFFECTIVE_AT', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(name => !String(env[name] ?? '').trim());
  if (!String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim()) missing.push('SUPABASE_URL');
  return {
    scope: 'Local configuration only; provider and database readiness are not tested.',
    enabledFlag: env.MERIT_ENABLED === 'true',
    paymentRulesConfigured: config.configured,
    missing,
    optionalOriginListPresent: Boolean(String(env.MERIT_ALLOWED_ORIGINS || '').trim()),
    next: missing.length ? 'Configure the listed names privately in the API server environment.'
      : !config.enabled ? 'Check MERIT_ENABLED and the formats/source/effective dates in config/merit.env.example.'
      : 'Read GET /api/merit-checkout through the same Preview URL. enabled:false can still mean provider or database readiness failed.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(inspectMeritSetup(), null, 2));
}
