-- 0020_brain_layer.sql
--
-- Dual-Brain Web — Faz 1 brain layer.
--
-- Tek beyin, çift site (skilldrunk.com + skimsoulfat.com) için shared
-- data layer. Owner shell'in catalog/dashboard/activity/digest/search
-- ihtiyaçlarını besler. Public marketplace tabloları (sd_*) dokunulmaz;
-- bu katman ayrı şemaya çekilmiyor (RLS yetiyor) ama prefix `brain_*`
-- ile izole.
--
-- Vault refs:
--   [[Projects/Dual-Brain-Web/01-architecture]] §2  (schema kaynağı)
--   [[Projects/Dual-Brain-Web/06-code-handoff]] §1  (faz 1 plan)
--   [[Projects/Dual-Brain-Web/99-decisions-log]]    (D-001..D-019)
--
-- Decisions:
--   D-004  shuffle = server-side ORDER BY random() (cache no-store)
--   D-018  AI digest cache (cron 06:00 + 12h)
--   D-019  embedding = OpenAI text-embedding-3-small 1536-dim
--
-- Faz 4 (AI endpoint) için embedding column şimdiden 1536-dim hazır;
-- text search Faz 1'de FTS, vector search Faz 4'te ek RPC olarak gelir.

-- ─── extensions ──────────────────────────────────────────────────────────
create extension if not exists vector;
create extension if not exists pg_trgm;     -- fuzzy fallback (search)

-- ─── enums ───────────────────────────────────────────────────────────────
do $$ begin
  create type brain_realm  as enum ('work', 'personal', 'shared');
exception when duplicate_object then null; end $$;

do $$ begin
  create type brain_kind   as enum (
    'project', 'prototype', 'tool', 'bot', 'note', 'external_app', 'service'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type brain_source as enum (
    'vercel', 'github', 'replit', 'lovable',
    'google_ai_studio', 'obsidian', 'manual', 'admin_app'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type brain_status as enum ('active', 'archived', 'draft', 'broken');
exception when duplicate_object then null; end $$;

-- ─── brain_items ─────────────────────────────────────────────────────────
create table if not exists public.brain_items (
  id           uuid primary key default gen_random_uuid(),
  realm        brain_realm not null default 'shared',
  kind         brain_kind  not null default 'project',
  source       brain_source not null,
  external_id  text,
  slug         text unique,
  title        text not null check (char_length(title) between 1 and 200),
  subtitle     text,
  description  text,
  category     text,
  status       brain_status not null default 'active',
  url          text,
  cover_url    text,
  icon_url     text,
  visible_skilldrunk  boolean not null default false,
  visible_skimsoulfat boolean not null default false,
  ingested_at  timestamptz not null default now(),
  last_synced_at timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  embedding    vector(1536),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Upsert key for ingestion scripts (one row per external thing).
  unique (source, external_id)
);

create index if not exists brain_items_realm_idx        on public.brain_items (realm);
create index if not exists brain_items_source_idx       on public.brain_items (source);
create index if not exists brain_items_status_idx       on public.brain_items (status);
create index if not exists brain_items_kind_idx         on public.brain_items (kind);
create index if not exists brain_items_skilldrunk_idx   on public.brain_items (visible_skilldrunk) where visible_skilldrunk;
create index if not exists brain_items_skimsoulfat_idx  on public.brain_items (visible_skimsoulfat) where visible_skimsoulfat;
create index if not exists brain_items_last_synced_idx  on public.brain_items (last_synced_at desc);
create index if not exists brain_items_metadata_idx     on public.brain_items using gin (metadata);
create index if not exists brain_items_title_trgm_idx   on public.brain_items using gin (title gin_trgm_ops);
-- Faz 4 vector index — created but commented until embeddings backfilled to avoid empty-list pain.
-- create index brain_items_embedding_idx on public.brain_items using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── brain_activity ──────────────────────────────────────────────────────
create table if not exists public.brain_activity (
  id           uuid primary key default gen_random_uuid(),
  realm        brain_realm not null,
  source       brain_source not null,
  event_type   text not null check (char_length(event_type) between 1 and 60),
  item_id      uuid references public.brain_items(id) on delete set null,
  title        text not null,
  body         text,
  url          text,
  occurred_at  timestamptz not null,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists brain_activity_occurred_idx on public.brain_activity (occurred_at desc);
create index if not exists brain_activity_realm_idx    on public.brain_activity (realm, occurred_at desc);
create index if not exists brain_activity_item_idx     on public.brain_activity (item_id) where item_id is not null;

-- ─── brain_kpi_snapshot ──────────────────────────────────────────────────
create table if not exists public.brain_kpi_snapshot (
  id            bigserial primary key,
  realm         brain_realm not null,
  metric_key    text not null,
  metric_value  numeric not null,
  delta_pct     numeric,
  captured_at   timestamptz not null default now(),
  unique (realm, metric_key, captured_at)
);

create index if not exists brain_kpi_realm_key_idx on public.brain_kpi_snapshot (realm, metric_key, captured_at desc);

-- ─── brain_digest ────────────────────────────────────────────────────────
create table if not exists public.brain_digest (
  id           bigserial primary key,
  realm        brain_realm not null,
  digest_date  date not null,
  summary      text not null,
  highlights   jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unique (realm, digest_date)
);

create index if not exists brain_digest_realm_date_idx on public.brain_digest (realm, digest_date desc);

-- ─── brain_items_audit (realm/visibility override log) ───────────────────
create table if not exists public.brain_items_audit (
  id           bigserial primary key,
  item_id      uuid not null references public.brain_items(id) on delete cascade,
  field        text not null,        -- 'realm' | 'visible_skilldrunk' | 'visible_skimsoulfat' | 'status'
  old_value    text,
  new_value    text,
  actor_uid    uuid,                  -- auth.uid() if available
  source       text,                  -- 'admin' | 'ingest' | 'rpc'
  occurred_at  timestamptz not null default now()
);

create index if not exists brain_items_audit_item_idx on public.brain_items_audit (item_id, occurred_at desc);

-- ─── triggers ────────────────────────────────────────────────────────────
create or replace function public.brain_items_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists brain_items_touch on public.brain_items;
create trigger brain_items_touch
  before update on public.brain_items
  for each row execute function public.brain_items_touch();

create or replace function public.brain_items_audit_changes()
returns trigger language plpgsql as $$
declare uid uuid;
begin
  begin uid := auth.uid(); exception when others then uid := null; end;

  if new.realm is distinct from old.realm then
    insert into public.brain_items_audit (item_id, field, old_value, new_value, actor_uid, source)
    values (new.id, 'realm', old.realm::text, new.realm::text, uid, 'rpc');
  end if;
  if new.visible_skilldrunk is distinct from old.visible_skilldrunk then
    insert into public.brain_items_audit (item_id, field, old_value, new_value, actor_uid, source)
    values (new.id, 'visible_skilldrunk', old.visible_skilldrunk::text, new.visible_skilldrunk::text, uid, 'rpc');
  end if;
  if new.visible_skimsoulfat is distinct from old.visible_skimsoulfat then
    insert into public.brain_items_audit (item_id, field, old_value, new_value, actor_uid, source)
    values (new.id, 'visible_skimsoulfat', old.visible_skimsoulfat::text, new.visible_skimsoulfat::text, uid, 'rpc');
  end if;
  if new.status is distinct from old.status then
    insert into public.brain_items_audit (item_id, field, old_value, new_value, actor_uid, source)
    values (new.id, 'status', old.status::text, new.status::text, uid, 'rpc');
  end if;
  return new;
end $$;

drop trigger if exists brain_items_audit_changes on public.brain_items;
create trigger brain_items_audit_changes
  after update on public.brain_items
  for each row execute function public.brain_items_audit_changes();

-- ─── RLS ─────────────────────────────────────────────────────────────────
-- Owner-only model: any authenticated user (we have exactly one) full
-- SELECT/INSERT/UPDATE. DELETE blocked at policy level — use
-- brain_item_archive RPC for soft-delete (status='archived').

alter table public.brain_items        enable row level security;
alter table public.brain_activity     enable row level security;
alter table public.brain_kpi_snapshot enable row level security;
alter table public.brain_digest       enable row level security;
alter table public.brain_items_audit  enable row level security;

drop policy if exists brain_items_auth_rw on public.brain_items;
create policy brain_items_auth_rw on public.brain_items
  for select using (auth.role() = 'authenticated');
create policy brain_items_auth_ins on public.brain_items
  for insert with check (auth.role() = 'authenticated');
create policy brain_items_auth_upd on public.brain_items
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- No DELETE policy → blocked for non-service_role.

drop policy if exists brain_activity_auth_rw on public.brain_activity;
create policy brain_activity_auth_rw on public.brain_activity
  for select using (auth.role() = 'authenticated');
create policy brain_activity_auth_ins on public.brain_activity
  for insert with check (auth.role() = 'authenticated');

drop policy if exists brain_kpi_auth_rw on public.brain_kpi_snapshot;
create policy brain_kpi_auth_rw on public.brain_kpi_snapshot
  for select using (auth.role() = 'authenticated');
create policy brain_kpi_auth_ins on public.brain_kpi_snapshot
  for insert with check (auth.role() = 'authenticated');

drop policy if exists brain_digest_auth_rw on public.brain_digest;
create policy brain_digest_auth_rw on public.brain_digest
  for select using (auth.role() = 'authenticated');
create policy brain_digest_auth_ins on public.brain_digest
  for insert with check (auth.role() = 'authenticated');
create policy brain_digest_auth_upd on public.brain_digest
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists brain_items_audit_auth_r on public.brain_items_audit;
create policy brain_items_audit_auth_r on public.brain_items_audit
  for select using (auth.role() = 'authenticated');

-- ─── RPCs ────────────────────────────────────────────────────────────────

-- catalog: shuffle (D-004 — server-side random)
create or replace function public.brain_catalog_shuffle(
  p_domain   text,
  p_category text default null,
  p_limit    int  default 24,
  p_offset   int  default 0
)
returns setof public.brain_items
language sql stable
set search_path = public, pg_temp as $$
  select * from public.brain_items
   where status = 'active'
     and case lower(p_domain)
           when 'skilldrunk'  then visible_skilldrunk
           when 'skimsoulfat' then visible_skimsoulfat
           else false
         end = true
     and (p_category is null or category = p_category)
   order by random()
   limit greatest(1, least(100, p_limit))
   offset greatest(0, p_offset);
$$;

-- search: FTS + trigram fallback (Faz 4 brings vector variant)
create or replace function public.brain_search(
  p_query text,
  p_realm brain_realm default null,
  p_limit int default 20
)
returns setof public.brain_items
language sql stable
set search_path = public, pg_temp as $$
  with q as (
    select trim(p_query) as q, websearch_to_tsquery('simple', coalesce(p_query, '')) as ts
  )
  select i.* from public.brain_items i, q
   where i.status <> 'archived'
     and (p_realm is null or i.realm = p_realm)
     and (
       q.q = '' or
       to_tsvector('simple',
         coalesce(i.title,'') || ' ' ||
         coalesce(i.subtitle,'') || ' ' ||
         coalesce(i.description,'') || ' ' ||
         coalesce(i.category,'')
       ) @@ q.ts
       or i.title    ilike '%' || q.q || '%'
       or i.subtitle ilike '%' || q.q || '%'
     )
   order by
     greatest(
       similarity(coalesce(i.title,''),    q.q),
       similarity(coalesce(i.subtitle,''), q.q)
     ) desc nulls last,
     i.updated_at desc
   limit greatest(1, least(100, p_limit));
$$;

-- inventory check (audit / health)
create or replace function public.brain_inventory_check()
returns jsonb
language sql stable
set search_path = public, pg_temp as $$
  with
  by_source as (
    select jsonb_agg(jsonb_build_object(
      'source', source::text,
      'count', count(*),
      'last_synced_at', max(last_synced_at)
    ) order by count(*) desc)
    from (
      select source, count(*) as count, max(last_synced_at) as last_synced_at
        from public.brain_items group by source
    ) s
  ),
  by_realm as (
    select jsonb_agg(jsonb_build_object('realm', realm::text, 'count', n))
      from (select realm, count(*) as n from public.brain_items group by realm) r
  ),
  by_status as (
    select jsonb_agg(jsonb_build_object('status', status::text, 'count', n))
      from (select status, count(*) as n from public.brain_items group by status) st
  ),
  stale as (
    select count(*) as n from public.brain_items
     where last_synced_at < now() - interval '7 days'
        or last_synced_at is null
  ),
  embed as (
    select
      count(*) filter (where embedding is not null)::numeric / nullif(count(*),0) * 100 as pct,
      count(*) as total
    from public.brain_items
  )
  select jsonb_build_object(
    'by_source', coalesce((select * from by_source), '[]'::jsonb),
    'by_realm',  coalesce((select * from by_realm),  '[]'::jsonb),
    'by_status', coalesce((select * from by_status), '[]'::jsonb),
    'stale_items', (select n from stale),
    'embedding_coverage_pct', round(coalesce((select pct from embed), 0), 1),
    'total_items', (select total from embed),
    'generated_at', now()
  );
$$;

-- dashboard payload (single-call hydration for /home)
create or replace function public.brain_dashboard_payload(p_realm brain_realm)
returns jsonb
language plpgsql stable
set search_path = public, pg_temp as $$
declare
  today date := current_date;
  result jsonb;
begin
  select jsonb_build_object(
    'realm', p_realm::text,
    'as_of', now(),
    'kpi', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', metric_key,
        'value', metric_value,
        'delta_pct', delta_pct,
        'captured_at', captured_at
      ) order by captured_at desc)
      from (
        select distinct on (metric_key) metric_key, metric_value, delta_pct, captured_at
          from public.brain_kpi_snapshot
         where realm = p_realm
         order by metric_key, captured_at desc
        limit 8
      ) k
    ), '[]'::jsonb),
    'digest', (
      select jsonb_build_object(
        'date', digest_date,
        'summary', summary,
        'highlights', highlights,
        'generated_at', generated_at
      )
      from public.brain_digest
       where realm = p_realm and digest_date = today
       limit 1
    ),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'body', body,
        'url', url,
        'event_type', event_type,
        'source', source::text,
        'item_id', item_id,
        'occurred_at', occurred_at
      ) order by occurred_at desc)
      from (
        select * from public.brain_activity
         where realm in (p_realm, 'shared')
         order by occurred_at desc
         limit 10
      ) a
    ), '[]'::jsonb),
    'catalog_preview', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'slug', slug,
        'title', title,
        'subtitle', subtitle,
        'url', url,
        'cover_url', cover_url,
        'icon_url', icon_url,
        'kind', kind::text,
        'category', category,
        'source', source::text,
        'status', status::text
      ))
      from (
        select * from public.brain_items
         where status = 'active'
           and case p_realm
                 when 'work'     then visible_skilldrunk
                 when 'personal' then visible_skimsoulfat
                 else (visible_skilldrunk or visible_skimsoulfat)
               end = true
         order by random()
         limit 12
      ) c
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'items_total', (select count(*) from public.brain_items
                       where status = 'active'
                         and case p_realm
                               when 'work'     then visible_skilldrunk
                               when 'personal' then visible_skimsoulfat
                               else true
                             end = true),
      'activity_24h', (select count(*) from public.brain_activity
                        where realm in (p_realm, 'shared')
                          and occurred_at > now() - interval '24 hours'),
      'archived', (select count(*) from public.brain_items where status = 'archived')
    )
  ) into result;
  return result;
end $$;

-- soft-delete via RPC (DELETE blocked at RLS level)
create or replace function public.brain_item_archive(p_id uuid)
returns public.brain_items
language plpgsql security definer
set search_path = public, pg_temp as $$
declare row public.brain_items;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'auth required';
  end if;
  update public.brain_items set status = 'archived' where id = p_id returning * into row;
  return row;
end $$;

grant execute on function public.brain_catalog_shuffle(text, text, int, int)        to anon, authenticated;
grant execute on function public.brain_search(text, brain_realm, int)               to anon, authenticated;
grant execute on function public.brain_inventory_check()                            to anon, authenticated;
grant execute on function public.brain_dashboard_payload(brain_realm)               to anon, authenticated;
grant execute on function public.brain_item_archive(uuid)                           to anon, authenticated;

-- ─── docs ────────────────────────────────────────────────────────────────
comment on table  public.brain_items is
  'Dual-brain catalog. Every project/prototype/tool/bot/note/external_app/service in one place. Hybrid ingestion (auto + manual). Visibility flags decide per-domain (skilldrunk vs skimsoulfat) rendering. See vault Projects/Dual-Brain-Web/01-architecture.md.';
comment on table  public.brain_activity is
  'Time-ordered event feed across all sources. Mirrors github push, vercel deploy, obsidian note update, jax ledger task, telegram bot intent. Joined to brain_items via item_id when applicable.';
comment on table  public.brain_kpi_snapshot is
  'Daily metric cache (GA4 sessions, vercel deploys, backlog open count). Realm-scoped, time-series for delta_pct trends.';
comment on table  public.brain_digest is
  'AI-generated daily summary per realm. Filled by Cowork scheduled task brain-digest-generate at 06:00 (D-018). One row per (realm, date).';
comment on table  public.brain_items_audit is
  'Audit log for realm/visibility/status overrides — answers "who flipped this to work" questions. Append-only.';

comment on function public.brain_catalog_shuffle(text, text, int, int) is
  'Server-side shuffled catalog feed for /catalog page (D-004). Cache-Control: no-store at the route.';
comment on function public.brain_dashboard_payload(brain_realm) is
  'Single-call hydration for /home dashboard. Returns kpi + today digest + last 10 activity + 12-item catalog preview + counts.';
comment on function public.brain_search(text, brain_realm, int) is
  'FTS + trigram fallback search across title/subtitle/description/category. Vector variant arrives in Faz 4.';
comment on function public.brain_inventory_check() is
  'Health snapshot — items per source/realm/status, stale items (>7d no sync), embedding coverage. Used by /ops dashboards.';
