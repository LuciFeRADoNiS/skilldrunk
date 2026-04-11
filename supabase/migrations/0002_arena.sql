-- skilldrunk — Arena (Faz 2)
-- Adds sd_arena_matches + sd_arena_ratings + submit_arena_vote RPC.
-- Pair skills of the same sd_skill_type head-to-head, update Elo on each vote.

-- ─── Matches ───────────────────────────────────────────────
-- One row per pair shown to a voter. A match is "open" until voted (winner_id
-- null) or marked skipped. We persist the pair so the client can re-render
-- after login and so we can prevent revoting.
create table if not exists public.sd_arena_matches (
  id uuid primary key default gen_random_uuid(),
  type sd_skill_type not null,
  skill_a_id uuid not null references public.sd_skills(id) on delete cascade,
  skill_b_id uuid not null references public.sd_skills(id) on delete cascade,
  voter_id uuid references public.sd_profiles(id) on delete set null,
  winner_id uuid references public.sd_skills(id) on delete set null,
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  voted_at timestamptz,
  check (skill_a_id <> skill_b_id),
  check (
    winner_id is null
    or winner_id = skill_a_id
    or winner_id = skill_b_id
  )
);

create index if not exists sd_arena_matches_voter_idx
  on public.sd_arena_matches (voter_id, created_at desc);
create index if not exists sd_arena_matches_type_idx
  on public.sd_arena_matches (type, created_at desc);
create index if not exists sd_arena_matches_skill_a_idx
  on public.sd_arena_matches (skill_a_id);
create index if not exists sd_arena_matches_skill_b_idx
  on public.sd_arena_matches (skill_b_id);

-- ─── Ratings ───────────────────────────────────────────────
-- One row per (skill, type). Type is denormalized so we could later support
-- cross-type ratings, but for v1 it's always the skill's own type.
create table if not exists public.sd_arena_ratings (
  skill_id uuid not null references public.sd_skills(id) on delete cascade,
  type sd_skill_type not null,
  rating double precision not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (skill_id, type)
);

create index if not exists sd_arena_ratings_type_rating_idx
  on public.sd_arena_ratings (type, rating desc);

-- Seed a rating row for every existing published skill. Idempotent.
insert into public.sd_arena_ratings (skill_id, type)
select id, type
from public.sd_skills
where status = 'published'
on conflict do nothing;

-- Keep rating rows in sync with new/updated skills.
create or replace function public.sd_arena_skill_sync()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      insert into public.sd_arena_ratings (skill_id, type)
      values (new.id, new.type)
      on conflict do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'published' and (old.status is distinct from 'published') then
      insert into public.sd_arena_ratings (skill_id, type)
      values (new.id, new.type)
      on conflict do nothing;
    end if;
    if new.type is distinct from old.type then
      update public.sd_arena_ratings
        set type = new.type, updated_at = now()
        where skill_id = new.id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists sd_arena_skill_sync_trigger on public.sd_skills;
create trigger sd_arena_skill_sync_trigger
  after insert or update on public.sd_skills
  for each row execute function public.sd_arena_skill_sync();

-- ─── Pair picker RPC ───────────────────────────────────────
-- Returns a fresh match id + two skill rows. Prefers skills the voter hasn't
-- seen paired together before. Falls back to fully random if no fresh pair
-- exists. Caller must supply an authenticated voter_id (enforced in the
-- server action by reading auth.uid()).
create or replace function public.sd_arena_next_pair(
  p_type sd_skill_type,
  p_voter_id uuid
)
returns table (
  match_id uuid,
  skill_a_id uuid,
  skill_b_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
  v_match uuid;
  v_total integer;
begin
  select count(*) into v_total
  from public.sd_skills
  where type = p_type and status = 'published';
  if v_total < 2 then
    return;
  end if;

  -- Pick A: random published skill of this type, biased toward less-seen ones.
  select s.id into v_a
  from public.sd_skills s
  left join public.sd_arena_ratings r
    on r.skill_id = s.id and r.type = p_type
  where s.type = p_type and s.status = 'published'
  order by coalesce(r.matches_count, 0) asc, random()
  limit 1;

  if v_a is null then
    return;
  end if;

  -- Pick B: any other skill, weighted similarly, avoiding recent pair with A.
  select s.id into v_b
  from public.sd_skills s
  left join public.sd_arena_ratings r
    on r.skill_id = s.id and r.type = p_type
  where s.type = p_type
    and s.status = 'published'
    and s.id <> v_a
    and not exists (
      select 1 from public.sd_arena_matches m
      where m.voter_id = p_voter_id
        and (
          (m.skill_a_id = v_a and m.skill_b_id = s.id)
          or (m.skill_a_id = s.id and m.skill_b_id = v_a)
        )
    )
  order by coalesce(r.matches_count, 0) asc, random()
  limit 1;

  -- Fallback: if every B is already seen, allow a rematch.
  if v_b is null then
    select s.id into v_b
    from public.sd_skills s
    where s.type = p_type
      and s.status = 'published'
      and s.id <> v_a
    order by random()
    limit 1;
  end if;

  if v_b is null then
    return;
  end if;

  insert into public.sd_arena_matches (type, skill_a_id, skill_b_id, voter_id)
  values (p_type, v_a, v_b, p_voter_id)
  returning id into v_match;

  return query select v_match, v_a, v_b;
end;
$$;

grant execute on function public.sd_arena_next_pair(sd_skill_type, uuid) to authenticated;

-- ─── Vote submission RPC (Elo K=32) ────────────────────────
create or replace function public.sd_arena_submit_vote(
  p_match_id uuid,
  p_winner_id uuid
)
returns table (
  match_id uuid,
  winner_id uuid,
  a_rating double precision,
  b_rating double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_a_rating double precision;
  v_b_rating double precision;
  v_ea double precision;
  v_eb double precision;
  v_sa double precision;
  v_sb double precision;
  v_k constant double precision := 32;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_match
  from public.sd_arena_matches
  where id = p_match_id and voter_id = auth.uid()
  for update;
  if not found then
    raise exception 'match not found or not yours';
  end if;
  if v_match.winner_id is not null or v_match.skipped then
    raise exception 'match already resolved';
  end if;

  if p_winner_id is null then
    update public.sd_arena_matches
      set skipped = true, voted_at = now()
      where id = p_match_id;
    return query select p_match_id, null::uuid, null::double precision, null::double precision;
    return;
  end if;

  if p_winner_id <> v_match.skill_a_id and p_winner_id <> v_match.skill_b_id then
    raise exception 'winner must be one of the paired skills';
  end if;

  -- Fetch current ratings (create rows lazily if missing).
  insert into public.sd_arena_ratings (skill_id, type)
  values (v_match.skill_a_id, v_match.type), (v_match.skill_b_id, v_match.type)
  on conflict do nothing;

  select rating into v_a_rating from public.sd_arena_ratings
    where skill_id = v_match.skill_a_id and type = v_match.type;
  select rating into v_b_rating from public.sd_arena_ratings
    where skill_id = v_match.skill_b_id and type = v_match.type;

  v_ea := 1.0 / (1.0 + pow(10.0, (v_b_rating - v_a_rating) / 400.0));
  v_eb := 1.0 - v_ea;

  if p_winner_id = v_match.skill_a_id then
    v_sa := 1; v_sb := 0;
  else
    v_sa := 0; v_sb := 1;
  end if;

  update public.sd_arena_ratings
    set rating = rating + v_k * (v_sa - v_ea),
        wins = wins + (case when v_sa = 1 then 1 else 0 end),
        losses = losses + (case when v_sa = 0 then 1 else 0 end),
        matches_count = matches_count + 1,
        updated_at = now()
    where skill_id = v_match.skill_a_id and type = v_match.type;

  update public.sd_arena_ratings
    set rating = rating + v_k * (v_sb - v_eb),
        wins = wins + (case when v_sb = 1 then 1 else 0 end),
        losses = losses + (case when v_sb = 0 then 1 else 0 end),
        matches_count = matches_count + 1,
        updated_at = now()
    where skill_id = v_match.skill_b_id and type = v_match.type;

  update public.sd_arena_matches
    set winner_id = p_winner_id, voted_at = now()
    where id = p_match_id;

  select rating into v_a_rating from public.sd_arena_ratings
    where skill_id = v_match.skill_a_id and type = v_match.type;
  select rating into v_b_rating from public.sd_arena_ratings
    where skill_id = v_match.skill_b_id and type = v_match.type;

  return query select p_match_id, p_winner_id, v_a_rating, v_b_rating;
end;
$$;

grant execute on function public.sd_arena_submit_vote(uuid, uuid) to authenticated;

-- ─── RLS ───────────────────────────────────────────────────
alter table public.sd_arena_matches enable row level security;
alter table public.sd_arena_ratings enable row level security;

-- Matches: voter can read their own rows; everyone can see aggregated results
-- via the ratings table. No direct insert/update — RPCs handle it.
drop policy if exists "sd_arena_matches_self_read" on public.sd_arena_matches;
create policy "sd_arena_matches_self_read" on public.sd_arena_matches
  for select using (voter_id = auth.uid());

-- Ratings: public read, no direct write.
drop policy if exists "sd_arena_ratings_public_read" on public.sd_arena_ratings;
create policy "sd_arena_ratings_public_read" on public.sd_arena_ratings
  for select using (true);
