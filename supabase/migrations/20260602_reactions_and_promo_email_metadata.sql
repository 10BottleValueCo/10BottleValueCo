-- Required by the reactions API and idempotent promo-email send route.
-- Apply this migration to the project's Supabase database before enabling them.
alter table if exists public.contact_messages
  add column if not exists reactions jsonb not null
  default '{"msg": {}, "reply": {}}'::jsonb;

alter table if exists public.user_promos
  add column if not exists metadata jsonb not null
  default '{}'::jsonb;