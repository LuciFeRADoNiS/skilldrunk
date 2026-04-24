-- 0005: Analiz module — personal event log
-- Schema prefix az_* (isolated from sd_* marketplace tables).
-- Used by apps/analiz (analiz.skilldrunk.com).

-- ─── Enum: event source ─────────────────────────────────────
do $$ begin
  create type az_event_source as enum (
    'obsidian',
    'github',
    'calendar',
    'manual',
    'other'
  );
exception when duplicate_object then null; end $$;

-- ─── Events table ───────────────────────────────────────────
create table if not exists public.az_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sd_profiles(id) on delete cascade,
  source az_event_source not null default 'manual',
  kind text not null,
  title text not null,
  body text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- idempotency key for automated ingestion (e.g., Obsidian plugin avoids duplicates)
  external_id text,
  unique (user_id, source, external_id)
);

create index if not exists az_events_user_occurred_idx
  on public.az_events (user_id, occurred_at desc);
create index if not exists az_events_user_source_idx
  on public.az_events (user_id, source);
create index if not exists az_events_tags_idx
  on public.az_events using gin (tags);
create index if not exists az_events_metadata_idx
  on public.az_events using gin (metadata);

-- ─── RLS ────────────────────────────────────────────────────
alter table public.az_events enable row level security;

drop policy if exists "az_events_self_read" on public.az_events;
create policy "az_events_self_read" on public.az_events
  for select using (auth.uid() = user_id);

drop policy if exists "az_events_self_insert" on public.az_events;
create policy "az_events_self_insert" on public.az_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "az_events_self_update" on public.az_events;
create policy "az_events_self_update" on public.az_events
  for update using (auth.uid() = user_id);

drop policy if exists "az_events_self_delete" on public.az_events;
create policy "az_events_self_delete" on public.az_events
  for delete using (auth.uid() = user_id);

-- Admin read access (so site-wide admin can see everything)
drop policy if exists "az_events_admin_read" on public.az_events;
create policy "az_events_admin_read" on public.az_events
  for select using (public.sd_is_admin());

-- ─── Dashboard stats RPC ────────────────────────────────────
create or replace function public.az_dashboard_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'total', (select count(*) from public.az_events where user_id = auth.uid()),
    'last_30d', (
      select count(*) from public.az_events
      where user_id = auth.uid()
        and occurred_at >= current_date - interval '30 days'
    ),
    'last_7d', (
      select count(*) from public.az_events
      where user_id = auth.uid()
        and occurred_at >= current_date - interval '7 days'
    ),
    'by_source', (
      select coalesce(json_object_agg(source, cnt), '{}'::json)
      from (
        select source, count(*) as cnt
        from public.az_events
        where user_id = auth.uid()
          and occurred_at >= current_date - interval '30 days'
        group by source
      ) t
    ),
    'daily_7d', (
      select json_agg(json_build_object('date', d::date, 'count', coalesce(c, 0)) order by d)
      from generate_series(current_date - 6, current_date, '1 day') d
      left join (
        select occurred_at::date as day, count(*) as c
        from public.az_events
        where user_id = auth.uid()
          and occurred_at >= current_date - interval '7 days'
        group by 1
      ) s on s.day = d::date
    ),
    'top_kinds', (
      select coalesce(json_agg(json_build_object('kind', kind, 'count', cnt)), '[]'::json)
      from (
        select kind, count(*) as cnt
        from public.az_events
        where user_id = auth.uid()
          and occurred_at >= current_date - interval '30 days'
        group by kind
        order by cnt desc
        limit 10
      ) t
    )
  );
$$;

revoke execute on function public.az_dashboard_stats() from public, anon;
grant execute on function public.az_dashboard_stats() to authenticated;
