-- 0007: Audit log + Apps catalog (prototip.skilldrunk.com)

-- ─── 1. Audit log ────────────────────────────────────────────
-- Who did what, where, when — mainly admin actions on skills/users/reports.
create table if not exists public.sd_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.sd_profiles(id) on delete set null,
  actor_username text,
  action text not null,                 -- 'skill.status_change', 'user.role_change', 'report.action', ...
  target_type text,                     -- 'skill' | 'user' | 'report' | 'app'
  target_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sd_audit_log_created_idx
  on public.sd_audit_log (created_at desc);
create index if not exists sd_audit_log_actor_idx
  on public.sd_audit_log (actor_id, created_at desc);
create index if not exists sd_audit_log_target_idx
  on public.sd_audit_log (target_type, target_id, created_at desc);

alter table public.sd_audit_log enable row level security;

drop policy if exists "sd_audit_log_admin_read" on public.sd_audit_log;
create policy "sd_audit_log_admin_read" on public.sd_audit_log
  for select using (public.sd_is_admin());

-- Writes happen via service_role (bypasses RLS).

-- ─── 2. Skill status change trigger ──────────────────────────
create or replace function public.sd_audit_skill_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_id uuid;
  v_actor_username text;
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    v_actor_id := auth.uid();
    select username into v_actor_username from public.sd_profiles where id = v_actor_id;
    insert into public.sd_audit_log (actor_id, actor_username, action, target_type, target_id, old_value, new_value, metadata)
    values (
      v_actor_id, v_actor_username,
      'skill.status_change',
      'skill',
      new.id::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      jsonb_build_object('slug', new.slug, 'title', new.title)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sd_skills_audit_status on public.sd_skills;
create trigger sd_skills_audit_status
  after update of status on public.sd_skills
  for each row execute function public.sd_audit_skill_status();

-- ─── 3. User role change trigger ─────────────────────────────
create or replace function public.sd_audit_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_id uuid;
  v_actor_username text;
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    v_actor_id := auth.uid();
    select username into v_actor_username from public.sd_profiles where id = v_actor_id;
    insert into public.sd_audit_log (actor_id, actor_username, action, target_type, target_id, old_value, new_value, metadata)
    values (
      v_actor_id, v_actor_username,
      'user.role_change',
      'user',
      new.id::text,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role),
      jsonb_build_object('username', new.username)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sd_profiles_audit_role on public.sd_profiles;
create trigger sd_profiles_audit_role
  after update of role on public.sd_profiles
  for each row execute function public.sd_audit_role_change();

-- ─── 4. Report status change trigger ─────────────────────────
create or replace function public.sd_audit_report_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_id uuid;
  v_actor_username text;
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    v_actor_id := auth.uid();
    select username into v_actor_username from public.sd_profiles where id = v_actor_id;
    insert into public.sd_audit_log (actor_id, actor_username, action, target_type, target_id, old_value, new_value, metadata)
    values (
      v_actor_id, v_actor_username,
      'report.status_change',
      'report',
      new.id::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      jsonb_build_object('target_type', new.target_type)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists sd_reports_audit_status on public.sd_reports;
create trigger sd_reports_audit_status
  after update of status on public.sd_reports
  for each row execute function public.sd_audit_report_status();

-- ─── 5. Apps catalog (prototip.skilldrunk.com) ───────────────
-- One row per deployed thing in the ecosystem. Public vs private flag.
do $$ begin
  create type pt_app_category as enum (
    'skilldrunk',  -- core (marketplace, admin, analiz, brief)
    'tool',        -- utilities (quotes, prototip)
    'enco',        -- ENCO brand projects
    'personal',    -- personal tools (birthdaysfunetc, suno-command, ai-sub)
    'experiment',  -- throwaway / early-stage
    'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type pt_app_status as enum ('live', 'draft', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.pt_apps (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  tagline text,
  description_md text,
  category pt_app_category not null default 'experiment',
  status pt_app_status not null default 'live',
  url text not null,                              -- canonical URL to visit
  subdomain text,                                 -- e.g., 'quotes' for quotes.skilldrunk.com
  github_repo text,                               -- 'owner/repo' if open-source
  vercel_project text,                            -- Vercel project name
  stack text[] not null default '{}',             -- ['nextjs', 'supabase', 'tailwind']
  tags text[] not null default '{}',
  featured boolean not null default false,
  is_public boolean not null default false,       -- show on public prototip page?
  first_deployed_at timestamptz,
  last_deployed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pt_apps_category_idx on public.pt_apps (category);
create index if not exists pt_apps_status_idx on public.pt_apps (status);
create index if not exists pt_apps_deployed_idx
  on public.pt_apps (last_deployed_at desc nulls last);

alter table public.pt_apps enable row level security;

-- Anyone can read public apps; admin reads all
drop policy if exists "pt_apps_public_read" on public.pt_apps;
create policy "pt_apps_public_read" on public.pt_apps
  for select using (is_public = true and status = 'live');

drop policy if exists "pt_apps_admin_all" on public.pt_apps;
create policy "pt_apps_admin_all" on public.pt_apps
  for all using (public.sd_is_admin());

create trigger pt_apps_updated_at before update on public.pt_apps
  for each row execute function public.sd_set_updated_at();

-- ─── 6. Seed: current ecosystem snapshot ─────────────────────
insert into public.pt_apps (slug, title, tagline, category, status, url, subdomain, github_repo, vercel_project, stack, tags, featured, is_public, first_deployed_at, last_deployed_at)
values
  ('marketplace', 'Skilldrunk Marketplace', 'The library for AI skills — community ranked, Reddit-style.',
   'skilldrunk', 'live', 'https://skilldrunk.com', null,
   'LuciFeRADoNiS/skilldrunk', 'skilldrunk',
   array['nextjs','supabase','tailwind','shadcn','mcp'],
   array['ai-skills','marketplace','arena','elo','public'], true, true,
   '2026-04-11', '2026-04-24'),
  ('admin', 'Admin Panel', 'Ecosystem yönetim merkezi — private.',
   'skilldrunk', 'live', 'https://admin.skilldrunk.com', 'admin',
   'LuciFeRADoNiS/skilldrunk', 'skilldrunk-admin',
   array['nextjs','supabase','tailwind'],
   array['admin','ecosystem','private'], true, false,
   '2026-04-24', '2026-04-24'),
  ('analiz', 'Analiz', 'Personal event stream from Obsidian + GitHub + calendar.',
   'skilldrunk', 'live', 'https://analiz.skilldrunk.com', 'analiz',
   'LuciFeRADoNiS/skilldrunk', 'skilldrunk-analiz',
   array['nextjs','supabase','chokidar'],
   array['second-brain','event-log','obsidian','github','private'], true, false,
   '2026-04-23', '2026-04-24'),
  ('brief', 'Brief', 'Günlük AI briefing — Claude Haiku summarization over analiz.',
   'skilldrunk', 'live', 'https://brief.skilldrunk.com', 'brief',
   'LuciFeRADoNiS/skilldrunk', 'skilldrunk-brief',
   array['nextjs','supabase','claude-haiku'],
   array['daily-briefing','llm','cron','private'], true, false,
   '2026-04-24', '2026-04-24'),
  ('quotes', 'Daily Dose', 'Günlük ilham alıntıları (Supabase edge function).',
   'tool', 'live', 'https://quotes.skilldrunk.com', 'quotes',
   null, 'quotes-skilldrunk',
   array['supabase-edge-function','deno'],
   array['inspiration','public'], false, true,
   '2026-04-24', '2026-04-24'),
  ('birthdaysfunetc', 'Birthdays Fun Etc.', 'Doğum günü hatırlatıcı.',
   'personal', 'live', 'https://birthdaysfunetc.vercel.app', null,
   null, 'birthdaysfunetc',
   array['web'], array['reminder','personal'], false, false,
   '2026-04-11', '2026-04-11'),
  ('ai-sub-tracker', 'AI Sub Tracker', 'Yapay zeka aboneliklerini takip.',
   'personal', 'live', 'https://ai-sub-tracker.vercel.app', null,
   null, 'ai-sub-tracker',
   array['web'], array['tracker','subscriptions','personal'], false, false,
   '2026-04-05', '2026-04-05'),
  ('suno-command-center', 'Suno Command Center', 'Suno AI şarkı üretim kontrol paneli.',
   'personal', 'live', 'https://suno-command-center.vercel.app', null,
   null, 'suno-command-center',
   array['nextjs','suno-api'], array['music','ai','command-center'], false, false,
   '2026-04-17', '2026-04-17'),
  ('movetech-worth', 'Movetech Worth', 'Movetech değerlemesi.',
   'experiment', 'live', 'https://movetech-worth.vercel.app', null,
   null, 'movetech-worth',
   array['nextjs'], array['finance','valuation'], false, false,
   '2026-04-16', '2026-04-16'),
  ('site', 'Site (prototype)', 'Henüz amacı belirsiz — envanter sorusu açık.',
   'experiment', 'draft', 'https://site-one-alpha-65.vercel.app', null,
   null, 'site',
   array['nextjs'], array['unclassified'], false, false,
   '2026-04-16', '2026-04-16'),
  ('enco-organizasyon-portal', 'ENCO Organizasyon Portal', 'ENCO iç araçlar.',
   'enco', 'live', 'https://enco-organizasyon-portal.vercel.app', null,
   null, 'enco-organizasyon-portal',
   array['web'], array['enco','internal'], false, false,
   '2026-04-05', '2026-04-05'),
  ('enco-command-center', 'ENCO Command Center', 'ENCO operasyon komuta.',
   'enco', 'live', 'https://enco-command-center.vercel.app', null,
   null, 'enco-command-center',
   array['nextjs'], array['enco','command-center'], false, false,
   '2026-04-08', '2026-04-08'),
  ('enco-logistics', 'ENCO Logistics', 'Lojistik modülü.',
   'enco', 'live', 'https://enco-logistics.vercel.app', null,
   null, 'enco-logistics',
   array['nextjs'], array['enco','logistics'], false, false,
   '2026-03-31', '2026-03-31'),
  ('enco-personel-maliyet', 'ENCO Personel Maliyet', 'Personel maliyet takibi.',
   'enco', 'live', 'https://enco-personel-maliyet.vercel.app', null,
   null, 'enco-personel-maliyet',
   array['web'], array['enco','finance','hr'], false, false,
   '2026-04-07', '2026-04-07'),
  ('enco-pricing-bot', 'ENCO Pricing Bot', 'Fiyatlama botu.',
   'enco', 'live', 'https://enco-pricing-bot.vercel.app', null,
   null, 'enco-pricing-bot',
   array['bot'], array['enco','pricing'], false, false,
   '2026-04-04', '2026-04-04')
on conflict (slug) do nothing;

-- ─── 7. Helper: stats RPC for admin ──────────────────────────
create or replace function public.pt_apps_by_category()
returns json language sql stable security definer set search_path = public as $$
  select json_object_agg(category, cnt)
  from (
    select category, count(*) as cnt
    from public.pt_apps
    where status != 'archived'
    group by category
  ) t;
$$;

grant execute on function public.pt_apps_by_category() to authenticated;
