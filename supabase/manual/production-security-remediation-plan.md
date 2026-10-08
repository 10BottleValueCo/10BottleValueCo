# Production Supabase security remediation (draft)

**Status:** planning and local SQL drafts only. Nothing in this plan has been applied to production.

## Findings from the read-only production audit

- `orders` has permissive policies for `PUBLIC` and grants anonymous `SELECT`, `INSERT`, and `UPDATE`.
- `user_promos` has a permissive `PUBLIC` all-actions policy.
- `affiliates` has public read/insert/update access; `affiliate_orders` has public read/insert access; `affiliate_payouts` has public read/insert access.
- `contact_messages` reads are scoped to the admin and the matching signed-in customer, but anonymous message insertion is enabled.
- `chat-images` is a public bucket and has a public upload policy.
- `support_chat_attachments` is not present in the production schema; the API's capability metadata prerequisite is therefore not deployed.
- Email auto-confirm is disabled, so signup requires email confirmation. This does not mitigate the anonymous table and Storage policies above.
- The standard `supabase_migrations.schema_migrations` ledger was not present, so these SQL files are not confirmed as migration-tracked in production.

The tables have RLS enabled, but PostgreSQL combines permissive policies with OR. A `USING (true)` policy makes narrower policies ineffective for the same role and action.

## Intended access after hardening

- Public catalog browsing remains public.
- Public promo and affiliate-code checks continue through their exact-code API endpoints; they do not require public table access.
- Customers can read only their own orders, support thread, credits, promos, affiliate history, and payouts.
- The verified admin can manage all customer records.
- Anonymous clients cannot read or write customer-data tables or create support-message rows.
- Guest attachment capability remains available only through the server upload/read API; direct Storage access is disabled.

## Draft files updated

- `supabase/manual/prepare-checkout-access-column.sql` — additive schema prerequisite for the checkout capability hash; not an access-control fix.
- `supabase/migrations/20261007100000_store_credit_checkout.sql` — removes broad table grants and keeps Store Credit debits behind the service-role RPC.
- `supabase/migrations/20261006170000_harden_customer_data.sql` — replaces legacy order/support policies, removes anonymous support-message insertion, and limits table grants.
- `supabase/migrations/20261007130000_harden_affiliate_data.sql` — replaces broad affiliate/promo policies and limits table grants.
- `supabase/migrations/20261007110000_support_chat_attachment_metadata.sql` — creates the service-role-only capability metadata table.
- `supabase/migrations/20261007120000_make_chat_images_private.sql` — makes the bucket private, removes the known public upload policy, and denies direct anonymous/authenticated bucket access.
- `supabase/manual/contact-messages-hardening.sql` — standalone support-table cutover alternative; do not run alongside the full customer-data migration.

## Staging-first rollout

1. Confirm the exact staging Supabase project and take its normal backup. Do not export customer rows into this repository.
2. Apply `prepare-checkout-access-column.sql` before deploying the order-checkout code that reads/writes `checkout_access_hash`.
3. Apply `20261007100000_store_credit_checkout.sql`; verify Store Credit checkout, retry/idempotency, and customer credit reads before restricting the other tables.
4. Apply `20261007110000_support_chat_attachment_metadata.sql` before deploying the attachment API that records and checks capability ownership.
5. Deploy the compatible API code, then apply the customer-data and affiliate hardening migrations. Apply migration files explicitly in this dependency order; do not bulk-push the timestamped drafts without reviewing ordering and deployed-code compatibility. The customer-data migration's filename sorts before the Store Credit prerequisite, so automated ordering must be corrected or bypassed deliberately.
6. Test anonymous denial and customer/admin separation (checklist below). Confirm public catalog, one-code promo validation, affiliate-code validation, and checkout remain functional.
7. Only after attachment upload and signed-read tests pass, apply `20261007120000_make_chat_images_private.sql`. Confirm legacy direct object URLs no longer work while signed API reads and the guest capability flow still work.
8. Production execution is a separate approval gate. This document and its SQL files do not grant permission to apply changes.

## Required access checks in staging

- Anonymous PostgREST cannot select, insert, update, or delete rows in `orders`, `user_credits`, `user_promos`, `affiliates`, `affiliate_orders`, or `affiliate_payouts`.
- Anonymous support-message inserts are denied; a verified customer can still send, edit, and read their own thread and admin replies.
- Customer A cannot read or mutate Customer B's orders, credits, promos, support messages, affiliate history, or payout history.
- The admin can perform the existing admin workflows.
- Store Credit creates one paid order and debits once on retry; ordinary checkout remains on the server-side order endpoint.
- Public catalog browsing and exact-code promo/affiliate validation continue to work without table-wide reads.
- After the Storage cutover, direct public object URLs fail; authorized message attachments work through expiring signed URLs, and a guest capability cannot access another guest's paths.

## Support-history retention note

The current customer UI exposes a delete action for a support message row, and an admin reply is stored on that same row. Deleting a replied-to row also deletes that reply. The SQL drafts preserve the existing customer-delete policy; if support history must remain complete, replace this behavior with an explicit soft-delete/hidden state and update the UI and RLS together before rollout.

## Remaining work before enabling guest uploads broadly

The upload-URL API accepts unauthenticated capability-scoped requests and can issue uploads up to 100 MB. The current reviewed UI requires sign-in, but direct API calls remain possible. Add and test per-IP and per-capability rate/volume limits before exposing guest uploads in the UI. Keep the private bucket and signed-upload path; do not restore the public bucket as a workaround.

## Recovery rule

If staging reveals a broken flow, roll back or fix the application code while keeping the least-privilege policies and private bucket in place. Do not restore the public `USING (true)` policies or public bucket to recover functionality.
