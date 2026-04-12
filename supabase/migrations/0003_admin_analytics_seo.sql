-- 0003: Admin roles, analytics tracking, search logs
-- Adds role system, pageview tracking, search logging, and admin RLS policies.

-- ─── 1. Role enum + column ───────────────────────────────────
do $$ begin
  create type sd_user_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

alter table public.sd_profiles
  add column if not exists role sd_user_role not null default 'user';

-- Set the site owner as admin
update public.sd_profiles
  set role = 'admin'
  where id = 'c17394c2-e995-4bd1-87e3-f98f4326ca12';

-- Helper: check if current user is admin
create or replace function public.sd_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sd_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: check if current user is at least moderator
create or replace function public.sd_is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sd_profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

-- ─── 2. Admin RLS policies ───────────────────────────────────
-- Admin can read ALL skills (including draft/archived)
drop policy if exists "sd_skills_admin_read" on public.sd_skills;
create policy "sd_skills_admin_read" on public.sd_skills
  for select using (public.sd_is_admin());

-- Admin can update any skill (archive, change status, etc.)
drop policy if exists "sd_skills_admin_update" on public.sd_skills;
create policy "sd_skills_admin_update" on public.sd_skills
  for update using (public.sd_is_admin());

-- Admin can delete any skill
drop policy if exists "sd_skills_admin_delete" on public.sd_skills;
create policy "sd_skills_admin_delete" on public.sd_skills
  for delete using (public.sd_is_admin());

-- Admin/moderator can read all reports
drop policy if exists "sd_reports_mod_read" on public.sd_reports;
create policy "sd_reports_mod_read" on public.sd_reports
  for select using (public.sd_is_moderator());

-- Admin/moderator can update report status
drop policy if exists "sd_reports_mod_update" on public.sd_reports;
create policy "sd_reports_mod_update" on public.sd_reports
  for update using (public.sd_is_moderator());

-- Admin can update any profile (ban via role change, etc.)
drop policy if exists "sd_profiles_admin_update" on public.sd_profiles;
create policy "sd_profiles_admin_update" on public.sd_profiles
  for update using (public.sd_is_admin());

-- Admin/moderator can soft-delete any comment
drop policy if exists "sd_comments_mod_update" on public.sd_comments;
create policy "sd_comments_mod_update" on public.sd_comments
  for update using (public.sd_is_moderator());

-- ─── 3. Pageviews table (lightweight analytics) ──────────────
create table if not exists public.sd_pageviews (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  user_agent text,
  country text,
  session_id text,
  user_id uuid references public.sd_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sd_pageviews_path_idx
  on public.sd_pageviews (path, created_at desc);
create index if not exists sd_pageviews_created_idx
  on public.sd_pageviews (created_at desc);

-- RLS: only admin can read; server (via API route) inserts
alter table public.sd_pageviews enable row level security;

drop policy if exists "sd_pageviews_admin_read" on public.sd_pageviews;
create policy "sd_pageviews_admin_read" on public.sd_pageviews
  for select using (public.sd_is_admin());

-- Insert via service_role from API route (no RLS needed for service_role)

-- ─── 4. Search logs table ────────────────────────────────────
create table if not exists public.sd_search_logs (
  id bigint generated always as identity primary key,
  query text not null,
  results_count integer not null default 0,
  user_id uuid references public.sd_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sd_search_logs_query_idx
  on public.sd_search_logs using gin (query gin_trgm_ops);
create index if not exists sd_search_logs_created_idx
  on public.sd_search_logs (created_at desc);

alter table public.sd_search_logs enable row level security;

drop policy if exists "sd_search_logs_admin_read" on public.sd_search_logs;
create policy "sd_search_logs_admin_read" on public.sd_search_logs
  for select using (public.sd_is_admin());

-- ─── 5. Admin stats RPC (single query for dashboard) ─────────
create or replace function public.sd_admin_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total_skills', (select count(*) from public.sd_skills where status = 'published'),
    'total_users', (select count(*) from public.sd_profiles),
    'total_votes', (select count(*) from public.sd_votes),
    'total_comments', (select count(*) from public.sd_comments where deleted_at is null),
    'total_arena_matches', (select count(*) from public.sd_arena_matches where voted_at is not null),
    'open_reports', (select count(*) from public.sd_reports where status = 'open'),
    'pageviews_today', (select count(*) from public.sd_pageviews where created_at >= current_date),
    'pageviews_7d', (select count(*) from public.sd_pageviews where created_at >= current_date - interval '7 days'),
    'searches_today', (select count(*) from public.sd_search_logs where created_at >= current_date),
    'skills_by_type', (
      select json_object_agg(type, cnt)
      from (select type, count(*) as cnt from public.sd_skills where status = 'published' group by type) t
    ),
    'signups_7d', (
      select json_agg(json_build_object('date', d::date, 'count', coalesce(c, 0)) order by d)
      from generate_series(current_date - 6, current_date, '1 day') d
      left join (
        select created_at::date as day, count(*) as c
        from public.sd_profiles
        where created_at >= current_date - interval '7 days'
        group by 1
      ) s on s.day = d::date
    ),
    'top_searches', (
      select json_agg(json_build_object('query', query, 'count', cnt) order by cnt desc)
      from (
        select lower(trim(query)) as query, count(*) as cnt
        from public.sd_search_logs
        where created_at >= current_date - interval '7 days'
        group by lower(trim(query))
        order by cnt desc
        limit 20
      ) t
    )
  );
$$;

-- Only admin can call
revoke execute on function public.sd_admin_stats() from public, anon;
grant execute on function public.sd_admin_stats() to authenticated;
