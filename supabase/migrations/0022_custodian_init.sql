-- 0022_custodian_init.sql
--
-- Domain Custodian — Faz 1 ingest layer.
--
-- skilldrunk.com'u sürekli izleyen chat botunun veri tabanı: deploy/commit/
-- content/auth/action olayları + günlük GA4 analytics + chat audit trail.
-- Namespace `cst_`. Tek Supabase DB (vrgohatarieeguyyhfan).
--
-- Vault refs:
--   Projects/Domain-Custodian/README.md (master spec)
--   CUSTODIAN-HANDOFF.md (repo kökü)
--
-- Yazma yolu: webhook'lar + cron + chat backend service_role key ile yazar
-- (RLS bypass). Okuma: sadece admin (sd_is_admin, mevcut helper 0003'ten).
-- INSERT policy yok — bilinçli; service_role zaten RLS'i atlar, authenticated
-- user'ın doğrudan yazmasına gerek yok.

-- ─── enum ────────────────────────────────────────────────────────────────
do $$ begin
  create type cst_event_type as enum (
    'deploy',   -- Vercel deployment (webhook)
    'commit',   -- GitHub push (webhook)
    'content',  -- içerik değişikliği (skill publish, app update, vb.)
    'auth',     -- admin login/logout
    'action'    -- custodian chat tarafından alınan onaylı aksiyon (Faz 2)
  );
exception when duplicate_object then null; end $$;

-- ─── cst_events ──────────────────────────────────────────────────────────
create table if not exists public.cst_events (
  id          bigserial primary key,
  domain      text not null default 'skilldrunk.com',
  type        cst_event_type not null,
  source      text,                       -- 'vercel' | 'github' | 'admin-login' | 'chat' ...
  payload     jsonb not null default '{}'::jsonb,
  actor       text,                       -- email / github login / 'system'
  created_at  timestamptz not null default now()
);

create index if not exists cst_events_domain_time_idx on public.cst_events (domain, created_at desc);
create index if not exists cst_events_type_time_idx   on public.cst_events (type, created_at desc);
create index if not exists cst_events_payload_idx     on public.cst_events using gin (payload);

-- ─── cst_analytics_daily ─────────────────────────────────────────────────
create table if not exists public.cst_analytics_daily (
  id          bigserial primary key,
  domain      text not null default 'skilldrunk.com',
  date        date not null,
  users       int not null default 0,
  pageviews   int not null default 0,
  top_pages   jsonb not null default '[]'::jsonb,   -- [{path, views}]
  sources     jsonb not null default '[]'::jsonb,   -- [{source, sessions}]
  captured_at timestamptz not null default now(),
  unique (domain, date)
);

create index if not exists cst_analytics_domain_date_idx on public.cst_analytics_daily (domain, date desc);

-- ─── cst_audit ───────────────────────────────────────────────────────────
-- Chat tool-calling audit trail (Faz 2'de dolar). Her tool çağrısı + maliyet.
create table if not exists public.cst_audit (
  id             bigserial primary key,
  domain         text not null default 'skilldrunk.com',
  session_id     text,
  tool           text not null,
  args           jsonb not null default '{}'::jsonb,
  result_summary text,
  tokens_in      int not null default 0,
  tokens_out     int not null default 0,
  cost_usd       numeric not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists cst_audit_session_idx on public.cst_audit (session_id, created_at desc);
create index if not exists cst_audit_time_idx    on public.cst_audit (created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────
-- Owner-only read. service_role (webhook/cron/chat) RLS'i otomatik atlar →
-- INSERT policy gerekmiyor.
alter table public.cst_events          enable row level security;
alter table public.cst_analytics_daily enable row level security;
alter table public.cst_audit           enable row level security;

drop policy if exists cst_events_admin_read on public.cst_events;
create policy cst_events_admin_read on public.cst_events
  for select using (public.sd_is_admin());

drop policy if exists cst_analytics_admin_read on public.cst_analytics_daily;
create policy cst_analytics_admin_read on public.cst_analytics_daily
  for select using (public.sd_is_admin());

drop policy if exists cst_audit_admin_read on public.cst_audit;
create policy cst_audit_admin_read on public.cst_audit
  for select using (public.sd_is_admin());

-- ─── docs ────────────────────────────────────────────────────────────────
comment on table public.cst_events is
  'Domain Custodian event stream — deploy/commit/content/auth/action. Webhook + auth logger writes via service_role; admin-only read. See CUSTODIAN-HANDOFF.md.';
comment on table public.cst_analytics_daily is
  'Daily GA4 snapshot per domain (property 534659408 = skilldrunk). Filled by Vercel cron /api/custodian/cron/ga4 at 05:00. unique(domain,date) → idempotent upsert.';
comment on table public.cst_audit is
  'Custodian chat tool-call audit (Faz 2). Every tool invocation + token/cost. Admin-only read.';
