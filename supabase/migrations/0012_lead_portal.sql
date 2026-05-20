-- 0012_lead_portal.sql
--
-- Lead Portal v1 — internal team activity tracker.
-- Spec: Personal Brain/Projects/Skilldrunk/Lead-Portal-v1-Spec.md (2026-05-20).
--
-- Subdomain: leads.skilldrunk.com — role-based (/admin/* + /me/*).
-- Primary task type: email_send (3 ENCO sales reps send from their own Outlook,
-- CC: ozgurgur@gmail.com, click "Gönderildi" → bot pings Telegram → admin approves).
-- Secondary: call_report.
--
-- Tables (sd_lead_ namespace):
--   sd_lead_prospects        — Apollo + manual imports (lead = subject, never logs in)
--   sd_lead_staff            — sales reps (3 ENCO seed)
--   sd_lead_email_templates  — Day 0 / Day 3 / Day 7 (mustache {{first_name}} placeholders)
--   sd_lead_tasks            — assignments (prospect × staff × template)
--   sd_lead_events           — every interaction log
--   sd_lead_invites          — magic-link tokens (V1.1; v1 uses Supabase OTP directly)
--   sd_lead_sessions         — login/page duration tracking

-- ─── enums ───────────────────────────────────────────────────────────────
do $$ begin
  create type sd_lead_task_type as enum (
    'email_send',      -- v1 primary
    'call_report',     -- v1 secondary
    'survey',          -- v1.1+
    'doc_review',
    'meeting_booking',
    'free_form'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sd_lead_task_status as enum (
    'assigned',        -- created, not yet seen
    'in_progress',     -- staff opened the task
    'email_sent',      -- staff toggled "Gönderildi"
    'replied',         -- prospect replied (manual or v1.1 auto)
    'meeting_booked',
    'submitted',       -- call_report submitted
    'approved',
    'rejected',
    'expired',
    'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sd_lead_event_type as enum (
    'task_assigned',
    'invite_sent',
    'invite_opened',
    'staff_logged_in',
    'task_viewed',
    'task_started',
    'task_field_changed',
    'task_submitted',
    'task_approved',
    'task_rejected',
    'task_resubmitted',
    'session_started',
    'session_ended'
  );
exception when duplicate_object then null; end $$;

-- ─── 1. prospects ────────────────────────────────────────────────────────
create table if not exists public.sd_lead_prospects (
  id            bigserial primary key,
  apollo_id     text unique,
  name          text not null,
  email         text,
  phone         text,
  title         text,
  company       text,
  city          text,
  industry      text,
  score         integer,
  linkedin_url  text,
  meta          jsonb not null default '{}'::jsonb,
  imported_at   timestamptz not null default now(),
  imported_from text not null default 'manual'  -- 'apollo' | 'manual' | 'csv'
);

create index if not exists sd_lead_prospects_email_idx on public.sd_lead_prospects (email);
create index if not exists sd_lead_prospects_company_idx on public.sd_lead_prospects (company);
create index if not exists sd_lead_prospects_score_idx on public.sd_lead_prospects (score desc nulls last);
create index if not exists sd_lead_prospects_meta_idx on public.sd_lead_prospects using gin (meta);

-- ─── 2. staff ────────────────────────────────────────────────────────────
create table if not exists public.sd_lead_staff (
  id         bigserial primary key,
  user_id    uuid unique references auth.users(id) on delete set null,
  email      text unique not null,
  full_name  text,
  phone      text,
  team       text,                                           -- 'enco-sales' | 'movetech-ae' | ...
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sd_lead_staff_active_idx on public.sd_lead_staff (active);
create index if not exists sd_lead_staff_team_idx on public.sd_lead_staff (team);

-- Helper: is the current auth user an active lead-portal staff member?
create or replace function public.sd_is_lead_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sd_lead_staff
     where user_id = auth.uid() and active = true
  );
$$;

-- Resolve staff.id for the current auth user (used in RLS predicates)
create or replace function public.sd_current_staff_id()
returns bigint
language sql stable security definer set search_path = public as $$
  select id from public.sd_lead_staff where user_id = auth.uid() limit 1;
$$;

-- ─── 3. email templates ──────────────────────────────────────────────────
create table if not exists public.sd_lead_email_templates (
  id          bigserial primary key,
  name        text not null,                  -- 'ENCO Day 0 — Tanışma'
  step_num    integer,                        -- 1, 2, 3 (Day 0/3/7)
  subject     text not null,                  -- '{{first_name}} {{honorific}}, ...'
  body_md     text not null,                  -- {{first_name}} {{company}} {{title}} {{honorific}}
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists sd_lead_templates_active_idx on public.sd_lead_email_templates (active, step_num);

-- ─── 4. tasks ────────────────────────────────────────────────────────────
create table if not exists public.sd_lead_tasks (
  id                bigserial primary key,
  prospect_id       bigint references public.sd_lead_prospects(id) on delete set null,
  staff_id          bigint references public.sd_lead_staff(id) on delete set null,
  type              sd_lead_task_type not null default 'email_send',
  title             text not null,
  description       text,
  due_at            timestamptz,
  status            sd_lead_task_status not null default 'assigned',
  template_jsonb    jsonb not null default '{}'::jsonb,   -- { template_id, fields_def, ... }
  result_jsonb      jsonb not null default '{}'::jsonb,   -- staff submission payload
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  approved_at       timestamptz,
  approved_by       uuid references auth.users(id) on delete set null,
  rejection_reason  text
);

create index if not exists sd_lead_tasks_staff_status_idx
  on public.sd_lead_tasks (staff_id, status, updated_at desc);
create index if not exists sd_lead_tasks_status_idx
  on public.sd_lead_tasks (status, updated_at desc);
create index if not exists sd_lead_tasks_prospect_idx
  on public.sd_lead_tasks (prospect_id);

-- ─── 5. events (timeline) ────────────────────────────────────────────────
create table if not exists public.sd_lead_events (
  id          bigserial primary key,
  task_id     bigint references public.sd_lead_tasks(id) on delete cascade,
  staff_id    bigint references public.sd_lead_staff(id) on delete set null,
  event_type  sd_lead_event_type not null,
  ts          timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb,
  ip          inet,
  user_agent  text
);

create index if not exists sd_lead_events_task_ts_idx
  on public.sd_lead_events (task_id, ts desc);
create index if not exists sd_lead_events_staff_ts_idx
  on public.sd_lead_events (staff_id, ts desc);
create index if not exists sd_lead_events_type_ts_idx
  on public.sd_lead_events (event_type, ts desc);

-- ─── 6. invites (magic-link tokens, used in v1.1; v1 uses Supabase OTP) ──
create table if not exists public.sd_lead_invites (
  token       text primary key,
  staff_id    bigint references public.sd_lead_staff(id) on delete cascade,
  task_id     bigint references public.sd_lead_tasks(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists sd_lead_invites_staff_idx on public.sd_lead_invites (staff_id);
create index if not exists sd_lead_invites_expires_idx on public.sd_lead_invites (expires_at);

-- ─── 7. sessions ─────────────────────────────────────────────────────────
create table if not exists public.sd_lead_sessions (
  id          bigserial primary key,
  staff_id    bigint references public.sd_lead_staff(id) on delete set null,
  task_id     bigint references public.sd_lead_tasks(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_s  integer generated always as (
                case
                  when ended_at is null then null
                  else extract(epoch from (ended_at - started_at))::integer
                end
              ) stored,
  ip          inet,
  user_agent  text
);

create index if not exists sd_lead_sessions_staff_started_idx
  on public.sd_lead_sessions (staff_id, started_at desc);
create index if not exists sd_lead_sessions_task_idx
  on public.sd_lead_sessions (task_id);

-- ─── shared updated_at touch trigger ─────────────────────────────────────
create or replace function public.sd_lead_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sd_lead_staff_touch on public.sd_lead_staff;
create trigger sd_lead_staff_touch
  before update on public.sd_lead_staff
  for each row execute function public.sd_lead_touch_updated_at();

drop trigger if exists sd_lead_templates_touch on public.sd_lead_email_templates;
create trigger sd_lead_templates_touch
  before update on public.sd_lead_email_templates
  for each row execute function public.sd_lead_touch_updated_at();

drop trigger if exists sd_lead_tasks_touch on public.sd_lead_tasks;
create trigger sd_lead_tasks_touch
  before update on public.sd_lead_tasks
  for each row execute function public.sd_lead_touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.sd_lead_prospects        enable row level security;
alter table public.sd_lead_staff            enable row level security;
alter table public.sd_lead_email_templates  enable row level security;
alter table public.sd_lead_tasks            enable row level security;
alter table public.sd_lead_events           enable row level security;
alter table public.sd_lead_invites          enable row level security;
alter table public.sd_lead_sessions         enable row level security;

-- Admin: full access on everything (mirrors sd_backlog pattern)
drop policy if exists sd_lead_prospects_admin_all on public.sd_lead_prospects;
create policy sd_lead_prospects_admin_all on public.sd_lead_prospects
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_staff_admin_all on public.sd_lead_staff;
create policy sd_lead_staff_admin_all on public.sd_lead_staff
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_templates_admin_all on public.sd_lead_email_templates;
create policy sd_lead_templates_admin_all on public.sd_lead_email_templates
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_tasks_admin_all on public.sd_lead_tasks;
create policy sd_lead_tasks_admin_all on public.sd_lead_tasks
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_events_admin_all on public.sd_lead_events;
create policy sd_lead_events_admin_all on public.sd_lead_events
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_invites_admin_all on public.sd_lead_invites;
create policy sd_lead_invites_admin_all on public.sd_lead_invites
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

drop policy if exists sd_lead_sessions_admin_all on public.sd_lead_sessions;
create policy sd_lead_sessions_admin_all on public.sd_lead_sessions
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

-- Staff: read-only on prospects (so /me/task/[id] can show the lead card)
drop policy if exists sd_lead_prospects_staff_read on public.sd_lead_prospects;
create policy sd_lead_prospects_staff_read on public.sd_lead_prospects
  for select using (public.sd_is_lead_staff());

-- Staff: read-only on email templates (for render preview)
drop policy if exists sd_lead_templates_staff_read on public.sd_lead_email_templates;
create policy sd_lead_templates_staff_read on public.sd_lead_email_templates
  for select using (public.sd_is_lead_staff() and active = true);

-- Staff: read own staff row only (for /me header)
drop policy if exists sd_lead_staff_self_read on public.sd_lead_staff;
create policy sd_lead_staff_self_read on public.sd_lead_staff
  for select using (user_id = auth.uid());

-- Staff: read + update only their own tasks
drop policy if exists sd_lead_tasks_staff_read on public.sd_lead_tasks;
create policy sd_lead_tasks_staff_read on public.sd_lead_tasks
  for select using (staff_id = public.sd_current_staff_id());

drop policy if exists sd_lead_tasks_staff_update on public.sd_lead_tasks;
create policy sd_lead_tasks_staff_update on public.sd_lead_tasks
  for update using (staff_id = public.sd_current_staff_id())
  with check (staff_id = public.sd_current_staff_id());

-- Staff: read own events; inserts go through service_role (server-side endpoint)
drop policy if exists sd_lead_events_staff_read on public.sd_lead_events;
create policy sd_lead_events_staff_read on public.sd_lead_events
  for select using (staff_id = public.sd_current_staff_id());

-- Staff: read own sessions
drop policy if exists sd_lead_sessions_staff_read on public.sd_lead_sessions;
create policy sd_lead_sessions_staff_read on public.sd_lead_sessions
  for select using (staff_id = public.sd_current_staff_id());

-- service_role bypasses RLS for everything (Cowork imports + bot callbacks +
-- server-side event logging). No explicit policy needed.

-- ─── comments ────────────────────────────────────────────────────────────
comment on table public.sd_lead_prospects is
  'External leads (Apollo bulk_match + manual). The lead never logs in; this is the subject of a task.';
comment on table public.sd_lead_staff is
  'Sales reps with portal access. Linked to auth.users by user_id (set after first magic-link login).';
comment on table public.sd_lead_email_templates is
  'Outbound email templates (Day 0/3/7). Placeholders: {{first_name}} {{company}} {{title}} {{honorific}}.';
comment on table public.sd_lead_tasks is
  'Assignment: prospect × staff × type. v1 default type is email_send; staff toggles "Gönderildi" to advance status.';
comment on table public.sd_lead_events is
  'Full audit timeline of every touchpoint (login, view, submit, approve). Service_role inserts only.';
comment on table public.sd_lead_invites is
  'Reserved for v1.1 magic-link tokens with task deep-link. V1 uses Supabase signInWithOtp directly.';
comment on table public.sd_lead_sessions is
  'Page-level session tracking on /me/task/[id]. duration_s auto-computed when ended_at is set.';
