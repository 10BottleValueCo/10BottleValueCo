# Routine storefront release

The owner authorizes deployment as part of requested routine storefront fixes. Do not repeat the approval question once the requested change is tested. The deleted hourly follow-up's no-deployment restriction is historical.

1. Make the requested change and run the relevant tests, typecheck and build. Small copy changes need focused checks, not a new audit or PDF report.
2. Commit the exact release.
3. Run `node scripts/release-storefront.mjs`. If Vercel is not on PATH, set `VERCEL_CLI` to the installed official Vercel CLI JavaScript entry point. `--dry-run` prints the target and steps without deploying.
4. The command builds a production candidate, checks its public routes and authorization responses, promotes it, and verifies both live domains serve the candidate bundle and payment configuration. The JSON receipt records the source commit, deployment and results. No customer checkout is created.

The destination is the existing Vercel project `prj_GIYi5bA2bsdmBYeDHRs199wvDpeW`, scope `10bottlevaluecos-projects`, for `10bottlevalue.co` and `www.10bottlevalue.co`. Database migrations are separate from this routine UI release command and require checks appropriate to their change.

GitHub source publication is currently blocked by the connected account's missing push permission. Direct releases work. Preserve the deployed commit or a verified Git bundle until an authorized publisher merges it; otherwise a future Git-triggered deployment may restore older source. Do not claim source synchronization until it succeeds.

Do not weaken authentication, financial verification or platform permission boundaries to speed up a release. Existing owner authorization should be carried forward; an actual access block must be reported precisely.
