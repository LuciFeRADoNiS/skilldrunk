-- 0024_skill_library_curator.sql
--
-- Private-apex (D2): turn the marketplace skills into Özgür's PRIVATE curated
-- library. HYBRID strategy — sd_skills stays system-of-record; a sidecar table
-- (sd_library_meta) adds curation without touching the hot marketplace row,
-- sd_skill_versions FK, the weighted FTS, or score. Zero rows lost.
--
-- ⚠️ FILE ONLY — NOT applied to prod yet. Apply via supabase MCP apply_migration
-- when the private-apex branch is cut over (see plan §8 P5).
--
-- Idempotent: guarded creates + on conflict do nothing.

-- ── curation status enum ──────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'sd_curation') then
    create type sd_curation as enum ('inbox', 'keep', 'watching', 'retired');
  end if;
end $$;

-- ── sidecar: per-skill curator overlay (1:1 with sd_skills) ────────────────
create table if not exists public.sd_library_meta (
  skill_id uuid primary key references public.sd_skills(id) on delete cascade,
  curation sd_curation not null default 'inbox',
  priority smallint not null default 0 check (priority between 0 and 3),
  is_favorite boolean not null default false,
  notes_md text,
  personal_tags text[] not null default '{}',
  source_kind text,                       -- where it came from (manual / ingest / import)
  last_reviewed_at timestamptz,
  dead_link boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists sd_library_meta_curation_idx on public.sd_library_meta (curation);
create index if not exists sd_library_meta_priority_idx on public.sd_library_meta (priority desc);

-- touch updated_at on change
create or replace function public.sd_library_meta_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists sd_library_meta_touch on public.sd_library_meta;
create trigger sd_library_meta_touch before update on public.sd_library_meta
  for each row execute function public.sd_library_meta_touch();

-- RLS: admin-only from day one (private curation data — notes never public).
alter table public.sd_library_meta enable row level security;
drop policy if exists "sd_library_meta admin all" on public.sd_library_meta;
create policy "sd_library_meta admin all" on public.sd_library_meta
  for all using (public.sd_is_admin()) with check (public.sd_is_admin());

-- backfill: every existing skill gets an inbox overlay row
insert into public.sd_library_meta (skill_id)
select id from public.sd_skills
on conflict (skill_id) do nothing;

-- ── semantic search readiness (mirrors brain 0021) ─────────────────────────
-- Column + index + RPC. Population is deferred: the /skills/add|edit server
-- action will embed-on-save (or a backfill script), since the existing
-- brain-embed-on-insert edge function targets brain_items only. Until then
-- /skills search uses the text finder (/api/ai/find + search_vector).
alter table public.sd_skills add column if not exists embedding vector(1536);

do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'sd_skills_embedding_idx'
  ) then
    create index sd_skills_embedding_idx
      on public.sd_skills using ivfflat (embedding vector_cosine_ops)
      with (lists = 100);
  end if;
end $$;

create or replace function public.sd_skill_search_vector(
  p_embedding vector(1536),
  p_limit int default 8
)
returns table (
  id uuid, slug text, title text, summary text, type text, similarity float
)
language sql stable
set search_path = public, pg_temp as $$
  select s.id, s.slug, s.title, s.summary, s.type::text,
         (1 - (s.embedding <=> p_embedding))::float as similarity
  from public.sd_skills s
  where s.status = 'published' and s.embedding is not null
  order by s.embedding <=> p_embedding
  limit greatest(1, least(50, p_limit));
$$;

grant execute on function public.sd_skill_search_vector(vector(1536), int)
  to anon, authenticated;

comment on table public.sd_library_meta is
  'Curator overlay for sd_skills (private library). admin-only RLS. 1:1 sidecar — sd_skills stays system-of-record. Added 2026-06-25 for the private-apex rebuild.';
