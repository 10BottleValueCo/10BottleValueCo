-- Analytics events table
-- Run this once in Supabase SQL Editor (https://supabase.com/dashboard)

create table if not exists public.analytics_events (
  id           uuid        default gen_random_uuid() primary key,
  session_id   text        not null,
  user_id      uuid        references auth.users(id) on delete set null,
  event_type   text        not null,
  page         text,
  referrer     text,
  user_agent   text,
  properties   jsonb       default '{}',
  created_at   timestamptz default now()
);

-- Index for fast admin queries
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_id_idx  on public.analytics_events (session_id);
create index if not exists analytics_events_event_type_idx  on public.analytics_events (event_type);

-- Row-level security
alter table public.analytics_events enable row level security;

-- Anyone (including anonymous visitors) can insert events
drop policy if exists "anon insert" on public.analytics_events;
create policy "anon insert"
  on public.analytics_events
  for insert
  with check (true);

-- Only authenticated users can read (admin reads via service role or RLS)
drop policy if exists "auth read" on public.analytics_events;
create policy "auth read"
  on public.analytics_events
  for select
  using (auth.role() = 'authenticated');
