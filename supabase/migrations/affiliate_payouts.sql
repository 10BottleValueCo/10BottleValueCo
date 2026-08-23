-- Run this in Supabase SQL Editor
create table if not exists public.affiliate_payouts (
  id            bigint generated always as identity primary key,
  affiliate_code text not null,
  amount        numeric(10, 2) not null,
  note          text,
  created_at    timestamptz not null default now()
);

-- Allow admin (anon) to read + insert
alter table public.affiliate_payouts enable row level security;

create policy "Anyone can insert payouts"
  on public.affiliate_payouts for insert
  with check (true);

create policy "Anyone can read payouts"
  on public.affiliate_payouts for select
  using (true);
