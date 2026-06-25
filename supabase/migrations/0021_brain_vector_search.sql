-- 0021_brain_vector_search.sql
--
-- Dual-Brain Web — Faz 4 vector search.
--
-- brain_items.embedding (1536-dim, OpenAI text-embedding-3-small per D-019)
-- + ivfflat index + brain_search_vector RPC (top-K similarity).
--
-- Vault refs:
--   Projects/Dual-Brain-Web/06d-code-handoff-faz4.md §1.2
--   Projects/Dual-Brain-Web/99-decisions-log.md D-019, D-034 (top-K=8)
--
-- Idempotent: CREATE INDEX IF NOT EXISTS + CREATE OR REPLACE FUNCTION.

-- ─── ivfflat index ───────────────────────────────────────────────────────
-- lists=100 — rule of thumb sqrt(rows). brain_items ~50-200 row başlangıçta,
-- 100 makul. Backfill sonrası ANALYZE brain_items önerilir.
do $$ begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'brain_items_embedding_idx'
  ) then
    create index brain_items_embedding_idx
      on public.brain_items using ivfflat (embedding vector_cosine_ops)
      with (lists = 100);
  end if;
end $$;

-- ─── brain_search_vector RPC ─────────────────────────────────────────────
-- Cosine similarity (1 - distance) sıralı, embedding non-null filtre.
-- Realm filtresi: 'shared' → tüm realm'ler, diğer → eşleşen realm + shared
-- (shared item her iki tarafta görünür).

create or replace function public.brain_search_vector(
  p_embedding vector(1536),
  p_realm brain_realm default null,
  p_limit int default 8
)
returns table (
  id uuid,
  title text,
  subtitle text,
  description text,
  url text,
  source brain_source,
  realm brain_realm,
  kind brain_kind,
  similarity float
)
language sql stable
set search_path = public, pg_temp as $$
  select
    i.id,
    i.title,
    i.subtitle,
    i.description,
    i.url,
    i.source,
    i.realm,
    i.kind,
    (1 - (i.embedding <=> p_embedding))::float as similarity
  from public.brain_items i
  where i.status = 'active'
    and i.embedding is not null
    and (
      p_realm is null
      or i.realm = p_realm
      or i.realm = 'shared'
    )
  order by i.embedding <=> p_embedding
  limit greatest(1, least(50, p_limit));
$$;

grant execute on function public.brain_search_vector(vector(1536), brain_realm, int)
  to anon, authenticated;

comment on function public.brain_search_vector(vector(1536), brain_realm, int) is
  'Vector cosine similarity search over brain_items.embedding (1536-dim OpenAI text-embedding-3-small, D-019). Returns top-K with similarity score. Realm filter: shared items always included.';

-- ─── Insert trigger → edge function webhook ──────────────────────────────
-- brain-embed-on-insert edge function her INSERT'te tetiklenir, OpenAI'ye
-- embedding isteği atar, UPDATE brain_items SET embedding = ... yapar.
--
-- Function URL Vercel'de değil Supabase'de: <project>.supabase.co/functions/v1/brain-embed-on-insert
-- pg_net.http_post arka planda async çağrı yapar.
--
-- Trigger D-037 fallback: edge function fail ederse Cowork günlük backfill
-- task (`brain-embeddings-backfill`) yakalar.

create or replace function public.brain_items_embed_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp, extensions as $$
declare
  supabase_url text;
  function_url text;
begin
  -- supabase_url'i app.settings'ten veya pg_net default'undan al
  supabase_url := current_setting('app.supabase_url', true);
  if supabase_url is null or supabase_url = '' then
    -- Default — production proje URL'i
    supabase_url := 'https://vrgohatarieeguyyhfan.supabase.co';
  end if;
  function_url := supabase_url || '/functions/v1/brain-embed-on-insert';

  -- Sadece embedding null olanlar (INSERT'te zaten null gelir; UPDATE'te
  -- skip — re-embed istenirse manuel embed-backfill)
  if NEW.embedding is null then
    perform net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.service_role_key', true), '')
      ),
      body := jsonb_build_object(
        'id', NEW.id,
        'text', coalesce(NEW.title, '') || ' ' ||
                coalesce(NEW.subtitle, '') || ' ' ||
                coalesce(NEW.description, '')
      )
    );
  end if;
  return NEW;
exception when others then
  -- Trigger fail → log but don't block insert (D-037 fallback: backfill yakalar)
  raise warning '[brain_items_embed_webhook] %', sqlerrm;
  return NEW;
end $$;

drop trigger if exists brain_items_embed on public.brain_items;
create trigger brain_items_embed
  after insert on public.brain_items
  for each row execute function public.brain_items_embed_webhook();

comment on function public.brain_items_embed_webhook() is
  'Triggered by brain_items INSERT — fires pg_net webhook to brain-embed-on-insert edge function. Async; failures logged as warnings (D-037: Cowork daily backfill catches missed embeds).';

-- ─── ANALYZE recommendation ──────────────────────────────────────────────
-- Edge function veya backfill ilk büyük partiyi tamamladıktan sonra:
--   analyze public.brain_items;
-- ivfflat istatistiklerini günceller — daha iyi index plan.
