-- Subscription model + security hardening
-- Idempotent: safe to re-run.

-- ─── License lifecycle columns ───────────────────────────────────────────────
alter table public.licenses add column if not exists expires_at        timestamptz;
alter table public.licenses add column if not exists subscription_id   varchar(255);
alter table public.licenses add column if not exists device_id         varchar(64);
alter table public.licenses add column if not exists activated_at      timestamptz;

create index if not exists idx_licenses_subscription_id on public.licenses(subscription_id);
create index if not exists idx_licenses_expires_at      on public.licenses(expires_at);

-- ─── Tighten RLS — never expose sensitive columns to clients ────────────────
-- (already restricted via SELECT on user's own licenses; nothing else exposed)
-- Block all writes from anon/auth users — only service_role (Edge Functions) writes
drop policy if exists "service writes only" on public.licenses;
create policy "service writes only" on public.licenses
  for insert to authenticated
  with check (false);

drop policy if exists "no client updates" on public.licenses;
create policy "no client updates" on public.licenses
  for update to authenticated
  using (false);

drop policy if exists "no client deletes" on public.licenses;
create policy "no client deletes" on public.licenses
  for delete to authenticated
  using (false);

-- ─── Events: only admin-allowlisted users can read ───────────────────────────
drop policy if exists "admins read events" on public.events;
create policy "admins read events" on public.events
  for select to authenticated
  using (false);  -- block direct client reads; admin-data Edge Function uses service_role
-- Inserts are also blocked from clients (only service_role inserts)
drop policy if exists "no client event writes" on public.events;
create policy "no client event writes" on public.events
  for insert to authenticated
  with check (false);

-- ─── Permanent admin license: extend infinitely, no device binding ──────────
update public.licenses
   set expires_at = '2099-12-31'::timestamptz
 where key = 'PCFX-ADMI-N000-0000-0001'
   and expires_at is null;
