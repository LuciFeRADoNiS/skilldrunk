-- 0011_backlog.sql
--
-- Unified backlog — single source of truth for work-in-progress across the
-- whole personal ecosystem (skilldrunk + lestat-inc + side projects).
--
-- Read/write paths:
--   - admin.skilldrunk.com/backlog        (web, mobile-first)
--   - @skilldrunk_bot Telegram commands   (/todo /done /open /next /backlog)
--   - Cowork session via service_role     (Obsidian sync, read+write)
--   - GET /api/backlog/export.md?secret=X (Cowork cron mirror to vault)
--
-- Discipline: every shipped commit closes a row (status=done). New ideas
-- enter as 'idea' or 'next'. AGENTS.md / session-handoff.md become summaries,
-- the canonical list lives here.

-- ─── enums ───────────────────────────────────────────────────────────────
do $$ begin
  create type sd_backlog_status as enum (
    'idea',         -- raw, not yet triaged
    'next',         -- queued for next sprint
    'in_progress',  -- actively being worked
    'blocked',      -- waiting on external dep
    'done',         -- shipped
    'wontfix'       -- explicitly decided not to do
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sd_backlog_source as enum (
    'manual',       -- admin UI
    'telegram',     -- bot command
    'claude-code',  -- skilldrunk session (me)
    'cowork',       -- cowork session
    'import'        -- seed/migration
  );
exception when duplicate_object then null; end $$;

-- ─── table ───────────────────────────────────────────────────────────────
create table if not exists public.sd_backlog (
  id           bigserial primary key,
  title        text not null check (char_length(title) between 1 and 200),
  body_md      text default '',                                   -- optional longer detail
  project      text not null default 'general',                   -- slug, e.g. 'skilldrunk-admin', 'quotes-v2', 'lestat-hermes', 'general'
  status       sd_backlog_status not null default 'idea',
  priority     int not null default 3 check (priority between 1 and 5), -- 1=highest, 5=lowest
  source       sd_backlog_source not null default 'manual',
  assignee     text default 'shared',                             -- 'claude-code' | 'cowork' | 'ozgur' | 'shared'
  parent_id    bigint references public.sd_backlog(id) on delete set null,
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists sd_backlog_status_priority_idx
  on public.sd_backlog (status, priority, updated_at desc);
create index if not exists sd_backlog_project_idx
  on public.sd_backlog (project);
create index if not exists sd_backlog_tags_idx
  on public.sd_backlog using gin (tags);

-- updated_at + completed_at auto
create or replace function public.sd_backlog_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and (old.status is null or old.status <> 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists sd_backlog_touch on public.sd_backlog;
create trigger sd_backlog_touch
  before update on public.sd_backlog
  for each row execute function public.sd_backlog_touch();

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.sd_backlog enable row level security;

-- admin role (owner) full access
drop policy if exists sd_backlog_admin_all on public.sd_backlog;
create policy sd_backlog_admin_all on public.sd_backlog
  for all
  using (public.sd_is_admin())
  with check (public.sd_is_admin());

-- service_role bypasses RLS automatically (used by Telegram webhook + Cowork)

-- ─── RPCs (for Telegram bot — uses service_role anyway, but explicit is good) ─

create or replace function public.sd_backlog_add(
  p_title text,
  p_project text default 'general',
  p_priority int default 3,
  p_source sd_backlog_source default 'telegram',
  p_status sd_backlog_status default 'next',
  p_tags text[] default '{}'
) returns public.sd_backlog
language plpgsql security definer set search_path = public, pg_temp as $$
declare row public.sd_backlog;
begin
  insert into public.sd_backlog (title, project, priority, source, status, tags)
  values (p_title, coalesce(p_project, 'general'), greatest(1, least(5, p_priority)), p_source, p_status, p_tags)
  returning * into row;
  return row;
end $$;

create or replace function public.sd_backlog_set_status(
  p_id bigint,
  p_status sd_backlog_status
) returns public.sd_backlog
language plpgsql security definer set search_path = public, pg_temp as $$
declare row public.sd_backlog;
begin
  update public.sd_backlog
     set status = p_status
   where id = p_id
  returning * into row;
  return row;
end $$;

create or replace function public.sd_backlog_active(
  p_project text default null,
  p_limit int default 50
) returns setof public.sd_backlog
language sql stable as $$
  select * from public.sd_backlog
   where status in ('next','in_progress','blocked')
     and (p_project is null or project = p_project)
   order by
     case status when 'in_progress' then 0 when 'blocked' then 1 else 2 end,
     priority asc,
     updated_at desc
   limit greatest(1, least(200, p_limit));
$$;

grant execute on function public.sd_backlog_add(text, text, int, sd_backlog_source, sd_backlog_status, text[]) to anon, authenticated;
grant execute on function public.sd_backlog_set_status(bigint, sd_backlog_status) to anon, authenticated;
grant execute on function public.sd_backlog_active(text, int) to anon, authenticated;

-- ─── seed known pending items ────────────────────────────────────────────
-- One-time seed of in-flight work. After this migration ships, all new
-- entries come through the UI/bot/import paths.

insert into public.sd_backlog (title, project, status, priority, source, assignee, tags, body_md) values
  -- SKILLDRUNK — in flight
  ('Admin /ai sayfası mobile-first glass refactor', 'skilldrunk-admin', 'next', 2, 'import', 'claude-code', '{mobile,glass,ai}',
   'Sticky composer keyboard-aware, mesaj balonları glass, tool result badge''ları korunur. Pattern: dashboard ile aynı.'),
  ('Admin /map sayfası mobile pinch/pan + bottom sheet detay', 'skilldrunk-admin', 'next', 2, 'import', 'claude-code', '{mobile,glass,map}',
   'React Flow telefonda zoom kontrol + node detayı bottom sheet drawer.'),
  ('Admin /apps sayfası filter chip + grid', 'skilldrunk-admin', 'next', 3, 'import', 'claude-code', '{mobile,glass}', ''),
  ('Admin /usage mobile chart''lar (sparkline okunaklı)', 'skilldrunk-admin', 'next', 3, 'import', 'claude-code', '{mobile,glass,usage}', ''),
  ('Admin /skills /users /reports liste mobile + swipe-actions', 'skilldrunk-admin', 'next', 3, 'import', 'claude-code', '{mobile,glass}', ''),
  ('Admin /login PWA standalone mode düzeltme', 'skilldrunk-admin', 'next', 4, 'import', 'claude-code', '{mobile,pwa}', ''),

  ('Quotes v2 — swipe-to-like + spec implement', 'quotes-v2', 'next', 1, 'import', 'claude-code', '{mobile,quotes,spec}',
   'Spec: skilldrunk.com/docs/quotes-v2 (Cowork yazdı, commit 679d2dd). Başlangıç: swipe-to-like.'),

  ('Public map pulse RPC (sd_pageviews_public_stats security definer)', 'skilldrunk-prototip', 'next', 3, 'import', 'claude-code', '{rpc,map}',
   'prototip.skilldrunk.com/map''e canlı nabız için.'),

  ('Telegram bot mutate komutları /quote add, /feature, /archive', 'skilldrunk-telegram', 'next', 3, 'import', 'claude-code', '{telegram,bot}', ''),

  ('Smithery listing — MCP server submit', 'skilldrunk-mcp', 'next', 4, 'import', 'ozgur', '{manual,5dk}',
   'https://smithery.ai → Add server → URL: https://skilldrunk.com/api/mcp'),

  ('DistroKid/Spotify entegrasyonu radyo.skilldrunk.com', 'skilldrunk-radyo', 'blocked', 4, 'import', 'claude-code', '{radyo,blocked}',
   'Kullanıcı öncelik kararı bekliyor. ~4h iş.'),

  -- COWORK pending (HIGH from session-handoff 2026-05-16)
  ('Apple Developer hesap kurulumu — şirket bilgileri', 'lestat-org', 'blocked', 1, 'import', 'ozgur', '{apple,blocked}', ''),
  ('Suno auth cookie yenileme — Mac Chrome suno.com login', 'lestat-apollo', 'next', 2, 'import', 'ozgur', '{suno,5dk}', ''),
  ('SimRacing Expo Charlotte (May 22-24) — hazırlık', 'personal', 'next', 1, 'import', 'ozgur', '{expo,deadline}',
   '8 gün kaldı. Logistics/equipment list.'),
  ('CheckVibe HIGH findings review — ücretli hesap', 'skilldrunk-security', 'blocked', 2, 'import', 'ozgur', '{security,blocked}',
   '25 issue skilldrunk + 33 issue skimsoulfat.'),

  -- COWORK pending (MED)
  ('Firecrawl → Atlas bot.py entegrasyonu (Jina fallback)', 'lestat-atlas', 'next', 3, 'import', 'cowork', '{atlas,firecrawl}', ''),
  ('Red Alert 2 inspired turn-based strategy game spec', 'turn-based-strategy', 'idea', 4, 'import', 'shared', '{game,spec}', ''),
  ('Bildirim filtresi MVP build (spec hazır)', 'notification-filter', 'next', 3, 'import', 'shared', '{mvp}',
   'Spec: skilldrunk.com/docs/notification-filter/'),
  ('Nevra Bozok artist platform MVP build (spec hazır)', 'nevra-platform', 'next', 3, 'import', 'shared', '{mvp,artist}',
   'Spec: skilldrunk.com/docs/nevra-bozok-platform/'),
  ('skilldrunk-tasks Vercel project build config fix', 'skilldrunk-tasks', 'next', 3, 'import', 'cowork', '{vercel,fix}', ''),

  -- LOW research
  ('Raspberry Pi satın al + setup', 'lestat-infra', 'idea', 5, 'import', 'ozgur', '{hw,research}', ''),
  ('anthropics/claude-code repo yeniden tara', 'research', 'idea', 5, 'import', 'shared', '{research}', ''),
  ('Sim racing equipment — Moza R25 Ultra vs alternatives', 'personal', 'idea', 5, 'import', 'ozgur', '{hw,research}', '')
on conflict do nothing;

comment on table public.sd_backlog is
  'Unified backlog — canonical source of truth for work-in-progress across the personal ecosystem. Written to via admin UI, Telegram bot, Claude Code sessions, and Cowork. AGENTS.md / session-handoff.md are now summaries; this table is authoritative.';
