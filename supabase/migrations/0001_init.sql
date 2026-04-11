-- skilldrunk — initial schema
-- All skilldrunk tables use the `sd_` prefix so this migration can coexist
-- with other apps already living in `public` on the same Supabase project.
-- Tables: sd_profiles, sd_skills, sd_skill_versions, sd_votes, sd_comments,
-- sd_reports, sd_collections, sd_collection_skills, sd_waitlist.

-- ─── Extensions ────────────────────────────────────────────
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ─── Enums ─────────────────────────────────────────────────
do $$ begin
  create type sd_skill_type as enum (
    'claude_skill',
    'gpt',
    'mcp_server',
    'cursor_rule',
    'prompt',
    'agent'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sd_skill_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sd_report_status as enum ('open', 'reviewed', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

-- ─── Profiles ──────────────────────────────────────────────
-- One row per skilldrunk user. Linked to auth.users via id. Separate from
-- any other public.profiles table the project may already have.
create table if not exists public.sd_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  github_handle text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sd_profiles_username_trgm
  on public.sd_profiles using gin (username gin_trgm_ops);

-- Auto-create a skilldrunk profile on signup. Runs alongside any other
-- per-app handler attached to auth.users.
create or replace function public.sd_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_username text;
begin
  new_username := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    split_part(new.email, '@', 1)
  );
  if new_username is null or new_username = '' then
    new_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  if exists (select 1 from public.sd_profiles where username = new_username) then
    new_username := new_username || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.sd_profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    new_username,
    coalesce(new.raw_user_meta_data->>'full_name', new_username),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_skilldrunk on auth.users;
create trigger on_auth_user_created_skilldrunk
  after insert on auth.users
  for each row execute function public.sd_handle_new_user();

-- ─── Skills ────────────────────────────────────────────────
create table if not exists public.sd_skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  type sd_skill_type not null,
  author_id uuid references public.sd_profiles(id) on delete set null,

  body_mdx text not null default '',
  logo_url text,
  homepage_url text,
  source_url text,
  install_command text,

  tags text[] not null default '{}',
  category text,
  license text,
  status sd_skill_status not null default 'published',

  metadata jsonb not null default '{}'::jsonb,

  upvotes_count integer not null default 0,
  downvotes_count integer not null default 0,
  comments_count integer not null default 0,
  score integer generated always as (upvotes_count - downvotes_count) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- search_vector populated by trigger below (to_tsvector('english', text) is
  -- not immutable enough for a generated column on managed Postgres).
  search_vector tsvector
);

create or replace function public.sd_skills_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english'::regconfig, coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, array_to_string(coalesce(new.tags, '{}'), ' ')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce(new.body_mdx, '')), 'D');
  return new;
end;
$$;

drop trigger if exists sd_skills_search_vector_trigger on public.sd_skills;
create trigger sd_skills_search_vector_trigger
  before insert or update of title, summary, tags, body_mdx on public.sd_skills
  for each row execute function public.sd_skills_search_vector_update();

create index if not exists sd_skills_type_idx on public.sd_skills (type);
create index if not exists sd_skills_status_idx on public.sd_skills (status);
create index if not exists sd_skills_score_idx on public.sd_skills (score desc);
create index if not exists sd_skills_created_at_idx on public.sd_skills (created_at desc);
create index if not exists sd_skills_tags_idx on public.sd_skills using gin (tags);
create index if not exists sd_skills_search_idx on public.sd_skills using gin (search_vector);
create index if not exists sd_skills_slug_trgm on public.sd_skills using gin (slug gin_trgm_ops);

-- ─── Skill versions (changelog) ────────────────────────────
create table if not exists public.sd_skill_versions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.sd_skills(id) on delete cascade,
  version text not null,
  changelog text,
  body_mdx text not null,
  created_at timestamptz not null default now(),
  unique (skill_id, version)
);

-- ─── Votes ─────────────────────────────────────────────────
create table if not exists public.sd_votes (
  user_id uuid not null references public.sd_profiles(id) on delete cascade,
  skill_id uuid not null references public.sd_skills(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create index if not exists sd_votes_skill_idx on public.sd_votes (skill_id);

create or replace function public.sd_update_vote_counts()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.value = 1 then
      update public.sd_skills set upvotes_count = upvotes_count + 1 where id = new.skill_id;
    else
      update public.sd_skills set downvotes_count = downvotes_count + 1 where id = new.skill_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.value != old.value then
      if new.value = 1 then
        update public.sd_skills
          set upvotes_count = upvotes_count + 1,
              downvotes_count = greatest(downvotes_count - 1, 0)
          where id = new.skill_id;
      else
        update public.sd_skills
          set downvotes_count = downvotes_count + 1,
              upvotes_count = greatest(upvotes_count - 1, 0)
          where id = new.skill_id;
      end if;
    end if;
  elsif tg_op = 'DELETE' then
    if old.value = 1 then
      update public.sd_skills set upvotes_count = greatest(upvotes_count - 1, 0) where id = old.skill_id;
    else
      update public.sd_skills set downvotes_count = greatest(downvotes_count - 1, 0) where id = old.skill_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists sd_votes_counts_trigger on public.sd_votes;
create trigger sd_votes_counts_trigger
  after insert or update or delete on public.sd_votes
  for each row execute function public.sd_update_vote_counts();

-- ─── Comments ──────────────────────────────────────────────
create table if not exists public.sd_comments (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.sd_skills(id) on delete cascade,
  parent_id uuid references public.sd_comments(id) on delete cascade,
  author_id uuid not null references public.sd_profiles(id) on delete cascade,
  body_md text not null,
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists sd_comments_skill_idx on public.sd_comments (skill_id, created_at desc);
create index if not exists sd_comments_parent_idx on public.sd_comments (parent_id);

create or replace function public.sd_update_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.sd_skills set comments_count = comments_count + 1 where id = new.skill_id;
  elsif tg_op = 'DELETE' then
    update public.sd_skills set comments_count = greatest(comments_count - 1, 0) where id = old.skill_id;
  end if;
  return null;
end;
$$;

drop trigger if exists sd_comments_count_trigger on public.sd_comments;
create trigger sd_comments_count_trigger
  after insert or delete on public.sd_comments
  for each row execute function public.sd_update_comment_count();

-- ─── Reports (moderation) ──────────────────────────────────
create table if not exists public.sd_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('skill', 'comment', 'profile')),
  target_id uuid not null,
  reporter_id uuid references public.sd_profiles(id) on delete set null,
  reason text not null,
  details text,
  status sd_report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ─── Collections ───────────────────────────────────────────
create table if not exists public.sd_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.sd_profiles(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists public.sd_collection_skills (
  collection_id uuid not null references public.sd_collections(id) on delete cascade,
  skill_id uuid not null references public.sd_skills(id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (collection_id, skill_id)
);

-- ─── Waitlist (pre-launch) ─────────────────────────────────
create table if not exists public.sd_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ────────────────────────────────────
alter table public.sd_profiles enable row level security;
alter table public.sd_skills enable row level security;
alter table public.sd_skill_versions enable row level security;
alter table public.sd_votes enable row level security;
alter table public.sd_comments enable row level security;
alter table public.sd_reports enable row level security;
alter table public.sd_collections enable row level security;
alter table public.sd_collection_skills enable row level security;
alter table public.sd_waitlist enable row level security;

-- Profiles: public read, self write.
drop policy if exists "sd_profiles_public_read" on public.sd_profiles;
create policy "sd_profiles_public_read" on public.sd_profiles
  for select using (true);
drop policy if exists "sd_profiles_self_update" on public.sd_profiles;
create policy "sd_profiles_self_update" on public.sd_profiles
  for update using (auth.uid() = id);

-- Skills.
drop policy if exists "sd_skills_public_read" on public.sd_skills;
create policy "sd_skills_public_read" on public.sd_skills
  for select using (status = 'published' or author_id = auth.uid());
drop policy if exists "sd_skills_author_insert" on public.sd_skills;
create policy "sd_skills_author_insert" on public.sd_skills
  for insert with check (auth.uid() = author_id);
drop policy if exists "sd_skills_author_update" on public.sd_skills;
create policy "sd_skills_author_update" on public.sd_skills
  for update using (auth.uid() = author_id);
drop policy if exists "sd_skills_author_delete" on public.sd_skills;
create policy "sd_skills_author_delete" on public.sd_skills
  for delete using (auth.uid() = author_id);

-- Skill versions.
drop policy if exists "sd_skill_versions_read" on public.sd_skill_versions;
create policy "sd_skill_versions_read" on public.sd_skill_versions
  for select using (
    exists (
      select 1 from public.sd_skills s
      where s.id = skill_id
        and (s.status = 'published' or s.author_id = auth.uid())
    )
  );
drop policy if exists "sd_skill_versions_write" on public.sd_skill_versions;
create policy "sd_skill_versions_write" on public.sd_skill_versions
  for insert with check (
    exists (select 1 from public.sd_skills s where s.id = skill_id and s.author_id = auth.uid())
  );

-- Votes.
drop policy if exists "sd_votes_read" on public.sd_votes;
create policy "sd_votes_read" on public.sd_votes for select using (true);
drop policy if exists "sd_votes_insert" on public.sd_votes;
create policy "sd_votes_insert" on public.sd_votes
  for insert with check (auth.uid() = user_id);
drop policy if exists "sd_votes_update" on public.sd_votes;
create policy "sd_votes_update" on public.sd_votes
  for update using (auth.uid() = user_id);
drop policy if exists "sd_votes_delete" on public.sd_votes;
create policy "sd_votes_delete" on public.sd_votes
  for delete using (auth.uid() = user_id);

-- Comments.
drop policy if exists "sd_comments_read" on public.sd_comments;
create policy "sd_comments_read" on public.sd_comments
  for select using (deleted_at is null);
drop policy if exists "sd_comments_insert" on public.sd_comments;
create policy "sd_comments_insert" on public.sd_comments
  for insert with check (auth.uid() = author_id);
drop policy if exists "sd_comments_update" on public.sd_comments;
create policy "sd_comments_update" on public.sd_comments
  for update using (auth.uid() = author_id);
drop policy if exists "sd_comments_delete" on public.sd_comments;
create policy "sd_comments_delete" on public.sd_comments
  for delete using (auth.uid() = author_id);

-- Reports: users insert; service role reads.
drop policy if exists "sd_reports_insert" on public.sd_reports;
create policy "sd_reports_insert" on public.sd_reports
  for insert with check (auth.uid() = reporter_id);

-- Collections.
drop policy if exists "sd_collections_read" on public.sd_collections;
create policy "sd_collections_read" on public.sd_collections
  for select using (is_public = true or owner_id = auth.uid());
drop policy if exists "sd_collections_insert" on public.sd_collections;
create policy "sd_collections_insert" on public.sd_collections
  for insert with check (auth.uid() = owner_id);
drop policy if exists "sd_collections_update" on public.sd_collections;
create policy "sd_collections_update" on public.sd_collections
  for update using (auth.uid() = owner_id);
drop policy if exists "sd_collections_delete" on public.sd_collections;
create policy "sd_collections_delete" on public.sd_collections
  for delete using (auth.uid() = owner_id);

drop policy if exists "sd_collection_skills_read" on public.sd_collection_skills;
create policy "sd_collection_skills_read" on public.sd_collection_skills
  for select using (
    exists (
      select 1 from public.sd_collections c
      where c.id = collection_id and (c.is_public = true or c.owner_id = auth.uid())
    )
  );
drop policy if exists "sd_collection_skills_write" on public.sd_collection_skills;
create policy "sd_collection_skills_write" on public.sd_collection_skills
  for all using (
    exists (select 1 from public.sd_collections c where c.id = collection_id and c.owner_id = auth.uid())
  );

-- Waitlist: anyone can insert.
drop policy if exists "sd_waitlist_insert" on public.sd_waitlist;
create policy "sd_waitlist_insert" on public.sd_waitlist
  for insert with check (true);

-- ─── updated_at triggers ───────────────────────────────────
create or replace function public.sd_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sd_profiles_updated_at on public.sd_profiles;
create trigger sd_profiles_updated_at before update on public.sd_profiles
  for each row execute function public.sd_set_updated_at();
drop trigger if exists sd_skills_updated_at on public.sd_skills;
create trigger sd_skills_updated_at before update on public.sd_skills
  for each row execute function public.sd_set_updated_at();
drop trigger if exists sd_comments_updated_at on public.sd_comments;
create trigger sd_comments_updated_at before update on public.sd_comments
  for each row execute function public.sd_set_updated_at();
