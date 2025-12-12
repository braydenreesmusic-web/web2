-- Migration: create user_presence and signals tables
-- Creates a lightweight user_presence table and a signals table for ephemeral typing/reaction events

create table if not exists public.user_presence (
  user_id uuid primary key,
  is_online boolean not null default false,
  last_seen timestamptz,
  updated_at timestamptz not null default now(),
  meta jsonb default '{}'::jsonb
);

create index if not exists idx_user_presence_updated_at on public.user_presence(updated_at desc);

create table if not exists public.signals (
  id bigserial primary key,
  user_id uuid not null,
  type text not null,
  target_user_id uuid,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_target on public.signals(target_user_id);

-- Enable RLS with conservative policies so clients can insert/update their own rows.
alter table public.user_presence enable row level security;
drop policy if exists "auth_insert_own_user_presence" on public.user_presence;
create policy "auth_insert_own_user_presence" on public.user_presence for insert with check (auth.uid() = user_id);
drop policy if exists "auth_update_own_user_presence" on public.user_presence;
create policy "auth_update_own_user_presence" on public.user_presence for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "select_user_presence" on public.user_presence;
create policy "select_user_presence" on public.user_presence for select using (true);

alter table public.signals enable row level security;
drop policy if exists "auth_insert_signal" on public.signals;
create policy "auth_insert_signal" on public.signals for insert with check (auth.uid() = user_id);
-- allow selecting signals that are addressed to the current user or public signals
drop policy if exists "select_signals_for_target_or_public" on public.signals;
create policy "select_signals_for_target_or_public" on public.signals for select using (target_user_id is null or target_user_id = auth.uid() or user_id = auth.uid());
