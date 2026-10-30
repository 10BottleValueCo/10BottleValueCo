#!/usr/bin/env bash
# Check an installed store. Run on the server from $TBV_ROOT/scripts:
#   ./verify.sh <public-origin> [loopback-origin]
# Staging: guest + guard E2E on the public origin, credentialed E2E on the
# loopback origin (if given), browser QA (needs Playwright) and the safety audit.
# Production: public checks only (no accounts or orders are created).
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; root="$(cd "$here/.." && pwd)"
public="${1:?public origin}"; loopback="${2:-}"
mode="$(wp --path="$root/wordpress" eval 'echo tbv_store_mode();' 2>/dev/null)"
status=0
echo "store mode: $mode"
if [[ "$mode" == staging ]]; then
  node "$here/e2e-staging.mjs" "$public" | tail -12 || status=1
  if [[ -n "$loopback" ]]; then node "$here/e2e-staging.mjs" "$loopback" --accounts | tail -12 || status=1; fi
  if node -e "require(process.env.TBV_PLAYWRIGHT || 'playwright')" 2>/dev/null; then
    TBV_STAGING_PUBLIC_URL="$public" TBV_LOCAL_URL="${loopback:-$public}" node "$here/browser-qa.mjs" "$root/output/browser-qa-$(date +%Y%m%d-%H%M%S)" | tail -5 || status=1
  else echo "browser QA skipped: set TBV_PLAYWRIGHT to a Playwright install"; fi
  wp --path="$root/wordpress" eval-file "$here/audit-staging.php" | tail -3 || status=1
elif [[ "$mode" == production ]]; then
  node "$here/verify-production.mjs" "$public" --wp-path="$root/wordpress" ${TBV_EXPECT_ADMIN_GATE:+--expect-admin-gate} || status=1
else
  echo "unexpected store mode '$mode'"; status=1
fi
exit $status
