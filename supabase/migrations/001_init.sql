-- PCFixScan initial schema
-- Run in Supabase Studio → SQL editor → paste & run.
-- Idempotent: safe to re-run.

-- ─── licenses ────────────────────────────────────────────────────────────────
create table if not exists public.licenses (
  id                  bigserial primary key,
  key                 varchar(32) unique not null,
  email               varchar(255) not null,
  user_id             uuid references auth.users(id) on delete set null,
  stripe_customer_id  varchar(255),
  stripe_session_id   varchar(255) unique,
  status              varchar(20) default 'active',
  created_at          timestamptz default now(),
  last_validated_at   timestamptz
);
create index if not exists idx_licenses_key     on public.licenses(key);
create index if not exists idx_licenses_email   on public.licenses(email);
create index if not exists idx_licenses_user_id on public.licenses(user_id);

alter table public.licenses enable row level security;

-- Users can read only their own licenses
drop policy if exists "users read own licenses" on public.licenses;
create policy "users read own licenses" on public.licenses
  for select to authenticated
  using (
    user_id = auth.uid()
    or email = lower((auth.jwt() ->> 'email'))
  );

-- ─── events (platform-wide activity log) ─────────────────────────────────────
create table if not exists public.events (
  id          bigserial primary key,
  type        varchar(64) not null,
  user_id     uuid references auth.users(id) on delete set null,
  email       varchar(255),
  ip          varchar(64),
  user_agent  text,
  metadata    jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_events_created_at on public.events(created_at desc);
create index if not exists idx_events_type       on public.events(type);
create index if not exists idx_events_user_id    on public.events(user_id);
create index if not exists idx_events_email      on public.events(email);

alter table public.events enable row level security;
-- No public/user policies — events are admin-only, accessed via service_role from Edge Functions.

-- ─── helpful auto-link: when a user verifies email, link historical purchases ─
-- Trigger: when an auth.users row gets an email_confirmed_at, find any licenses
-- with matching email but null user_id and link them.
create or replace function public.link_user_to_licenses()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email_confirmed_at != new.email_confirmed_at) then
    update public.licenses
       set user_id = new.id
     where email = lower(new.email)
       and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_user_to_licenses on auth.users;
create trigger trg_link_user_to_licenses
  after update on auth.users
  for each row
  execute function public.link_user_to_licenses();
