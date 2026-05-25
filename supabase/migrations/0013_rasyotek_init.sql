-- 0013: Rasyotek module — MoveTech × Rasyotek partnership strategy bot
-- Private workspace for Özgür: deliverables + notes + chat + briefs + risk tracking
-- Schema prefix: rt_*
-- Single user (admin) — no public access; auth.uid() = (select id from sd_profiles where role='admin')

-- ─────────────────────────────────────────────────────
-- 1. rt_documents — 5 deliverable + 2 xlsx parsed content
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_documents (
  id uuid primary key default gen_random_uuid(),
  doc_key text unique not null,           -- 'stakeholder-motivation', 'red-team-brief', etc.
  title text not null,
  doc_type text not null,                 -- 'markdown' | 'xlsx-summary'
  content_md text not null,               -- full markdown body (or xlsx parsed summary)
  content_summary text,                   -- 1-2 sentence summary for chat context
  file_path text,                         -- original file path in vault
  file_size_bytes int,
  word_count int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rt_documents_key_idx on public.rt_documents (doc_key);
create index if not exists rt_documents_updated_idx on public.rt_documents (updated_at desc);

alter table public.rt_documents enable row level security;

-- Admin can read all docs
drop policy if exists "rt_documents_admin_read" on public.rt_documents;
create policy "rt_documents_admin_read" on public.rt_documents
  for select using (public.sd_is_admin());

-- Writes via service_role only (seed + cron updates)

-- ─────────────────────────────────────────────────────
-- 2. rt_notes — Özgür's notes (meeting, observation, question)
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sd_profiles(id) on delete cascade,
  note_type text not null,                -- 'meeting' | 'observation' | 'question' | 'decision' | 'todo'
  title text,                              -- optional short title
  body_md text not null,
  source text,                             -- 'web' | 'telegram' | 'cowork' | 'api'
  related_doc_key text references public.rt_documents(doc_key) on delete set null,
  related_risk_id uuid,                    -- forward ref to rt_risks
  meeting_date date,                       -- for meeting-type notes
  tags text[] default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rt_notes_user_idx on public.rt_notes (user_id, created_at desc);
create index if not exists rt_notes_type_idx on public.rt_notes (note_type);
create index if not exists rt_notes_meeting_date_idx on public.rt_notes (meeting_date desc) where meeting_date is not null;

alter table public.rt_notes enable row level security;

drop policy if exists "rt_notes_self_rw" on public.rt_notes;
create policy "rt_notes_self_rw" on public.rt_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rt_notes_admin_read" on public.rt_notes;
create policy "rt_notes_admin_read" on public.rt_notes
  for select using (public.sd_is_admin());

-- ─────────────────────────────────────────────────────
-- 3. rt_chat_sessions + rt_chat_messages
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sd_profiles(id) on delete cascade,
  title text,                              -- auto-generated from first message
  message_count int not null default 0,
  total_tokens_input int not null default 0,
  total_tokens_output int not null default 0,
  total_cache_read_tokens int not null default 0,
  total_cost_usd numeric(10,6) not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rt_chat_sessions_user_idx on public.rt_chat_sessions (user_id, last_message_at desc nulls last);

alter table public.rt_chat_sessions enable row level security;

drop policy if exists "rt_chat_sessions_self_rw" on public.rt_chat_sessions;
create policy "rt_chat_sessions_self_rw" on public.rt_chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.rt_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.rt_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content_json jsonb not null,             -- raw Claude messages format (supports tool_use blocks)
  content_text text,                       -- flattened text for search
  tool_calls jsonb,                        -- tool_use blocks executed
  tool_results jsonb,                      -- results returned
  model text,
  input_tokens int,
  output_tokens int,
  cache_read_input_tokens int,
  cache_creation_input_tokens int,
  cost_usd numeric(10,6),
  stop_reason text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists rt_chat_messages_session_idx on public.rt_chat_messages (session_id, created_at);

alter table public.rt_chat_messages enable row level security;

drop policy if exists "rt_chat_messages_via_session" on public.rt_chat_messages;
create policy "rt_chat_messages_via_session" on public.rt_chat_messages
  for all using (
    exists (
      select 1 from public.rt_chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rt_chat_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────
-- 4. rt_briefs — generated summaries (meeting outcomes, weekly, ad-hoc)
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sd_profiles(id) on delete cascade,
  brief_type text not null,                -- 'meeting_outcome' | 'weekly' | 'adhoc' | 'risk_alert'
  title text not null,
  summary text not null,                   -- 1-2 sentence headline
  body_md text not null,                   -- full markdown brief
  source_note_ids uuid[] default '{}',     -- which notes were synthesized
  source_chat_session_id uuid references public.rt_chat_sessions(id) on delete set null,
  model text,
  input_tokens int,
  output_tokens int,
  cache_read_input_tokens int,
  cost_usd numeric(10,6),
  metadata jsonb not null default '{}'::jsonb,
  pushed_telegram_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rt_briefs_user_idx on public.rt_briefs (user_id, created_at desc);
create index if not exists rt_briefs_type_idx on public.rt_briefs (brief_type, created_at desc);

alter table public.rt_briefs enable row level security;

drop policy if exists "rt_briefs_self_rw" on public.rt_briefs;
create policy "rt_briefs_self_rw" on public.rt_briefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────
-- 5. rt_risks — Red-Team scenarios (live tracking)
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_risks (
  id uuid primary key default gen_random_uuid(),
  risk_key text unique not null,           -- 'S1', 'S2', ..., 'S9'
  scenario_title text not null,
  description text not null,
  likelihood int not null check (likelihood between 1 and 5),
  impact int not null check (impact between 1 and 5),
  score int generated always as (likelihood * impact) stored,
  status text not null default 'active',   -- 'active' | 'monitoring' | 'mitigated' | 'realized' | 'closed'
  priority text,                            -- 'red' | 'orange' | 'yellow' | 'green'
  mitigation_md text,                       -- mitigation actions markdown
  related_doc_key text references public.rt_documents(doc_key) on delete set null,
  evidence_md text,                         -- evidence trail (emails, meetings)
  last_updated_note_id uuid references public.rt_notes(id) on delete set null,
  last_status_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rt_risks_key_idx on public.rt_risks (risk_key);
create index if not exists rt_risks_score_idx on public.rt_risks (score desc);
create index if not exists rt_risks_status_idx on public.rt_risks (status);

alter table public.rt_risks enable row level security;

drop policy if exists "rt_risks_admin_read" on public.rt_risks;
create policy "rt_risks_admin_read" on public.rt_risks
  for select using (public.sd_is_admin());

drop policy if exists "rt_risks_admin_write" on public.rt_risks;
create policy "rt_risks_admin_write" on public.rt_risks
  for update using (public.sd_is_admin()) with check (public.sd_is_admin());

-- ─────────────────────────────────────────────────────
-- 6. rt_risk_history — audit log for risk changes
-- ─────────────────────────────────────────────────────

create table if not exists public.rt_risk_history (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references public.rt_risks(id) on delete cascade,
  changed_at timestamptz not null default now(),
  changed_by_source text,                  -- 'web' | 'telegram' | 'cowork-sync' | 'manual'
  old_likelihood int,
  new_likelihood int,
  old_impact int,
  new_impact int,
  old_status text,
  new_status text,
  reason text,
  related_note_id uuid references public.rt_notes(id) on delete set null
);

create index if not exists rt_risk_history_risk_idx on public.rt_risk_history (risk_id, changed_at desc);

alter table public.rt_risk_history enable row level security;

drop policy if exists "rt_risk_history_admin_read" on public.rt_risk_history;
create policy "rt_risk_history_admin_read" on public.rt_risk_history
  for select using (public.sd_is_admin());

-- ─────────────────────────────────────────────────────
-- 7. Trigger: rt_risks update → audit history
-- ─────────────────────────────────────────────────────

create or replace function public.rt_risks_audit_trigger() returns trigger as $$
begin
  if old.likelihood is distinct from new.likelihood
     or old.impact is distinct from new.impact
     or old.status is distinct from new.status then
    insert into public.rt_risk_history (
      risk_id, changed_at, changed_by_source,
      old_likelihood, new_likelihood,
      old_impact, new_impact,
      old_status, new_status
    ) values (
      new.id, now(), coalesce(current_setting('rt.change_source', true), 'unknown'),
      old.likelihood, new.likelihood,
      old.impact, new.impact,
      old.status, new.status
    );
    new.last_status_change_at = now();
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists rt_risks_audit_trg on public.rt_risks;
create trigger rt_risks_audit_trg
  before update on public.rt_risks
  for each row execute function public.rt_risks_audit_trigger();

-- ─────────────────────────────────────────────────────
-- 8. Seed: 9 Red-Team scenarios from Red-Team-Brief.md
-- ─────────────────────────────────────────────────────

insert into public.rt_risks (risk_key, scenario_title, description, likelihood, impact, status, priority, related_doc_key, mitigation_md, evidence_md)
values
  ('S1', 'Fuat-Nuvolog gizli ortaklık → IP sızıntısı',
   'Fuat (Movetech satış lideri) ile Abdullah (Nuvolog founder) arasında yazılı belge olmayan ortaklık. RasyoLog kurulduktan sonra teknik demo + asset injection ile Movetech IP''si Nuvolog''a sızar.',
   3, 5, 'active', 'red', 'red-team-brief',
   'NDA''ya M6 çıkar çatışması beyanı + IP aktarım yasağı. Toplantıda Abdullah''a sıfat sorusu. Code repo izolasyonu (sadece compiled binaries + API). Quarterly IP audit.',
   'Apollo refresh 2026-04-29 (tanışmanın ertesi günü). 2026-05-12 Fuat maili: "Abdullah Cansu (Nuvolog)" sıfat belirtilmedi. Nuvolog %85+ ürün overlap. Fuat-Nuvolog finansal ilişkisi yazılı kayıt yok.'),

  ('S2', 'Movetech müşterileri RasyoLog''a transfer',
   'RasyoLog launch sonrası Movetech mevcut müşterileri (Mirlock, Ikea, Vakko) cross-grade discount ile RasyoLog''a transfer olur. MovetechNewCo kasası boşalır, %40 payı anlamsızlaşır.',
   4, 4, 'active', 'red', 'red-team-brief',
   'Müşteri Ownership klozu (JV sözleşmesinde): mevcut müşteriler MovetechNewCo''da kalır. Cross-grade fee: 36 aylık MRR. Satış kanalı izolasyonu (Fuat MovetechNewCo''ya dokunmaz). 3 yıllık non-poach.',
   'Fuat 5-12 mailinde MovetechNewCo "asset shell" konumlandırması. Brief''te soru açık: "Mevcut müşteriler MovetechNewCo''da kalır mı?"'),

  ('S3', 'Rasyotek CarbonIT × Greenix pazar çatışması',
   'Rasyotek CarbonIT + Nuvolog carbon footprint + Greenix → 3-yönlü karbon ayak izi çakışması. RasyoLog yapısında Greenix korunmazsa kanibalize olur.',
   3, 3, 'active', 'yellow', 'red-team-brief',
   'NDA''ya Greenix-koruma maddesi (M10). Revenue share %30-70 Greenix lehine. CarbonIT lojistik segment için off-limit (5 yıl exclusivity). Müşteri unbundling.',
   'Rasyotek Apollo keywords: "CarbonIT". Nuvolog Apollo: "carbon footprint analysis", "carbon monitoring". Greenix Özgür portföy şirketi.'),

  ('S4', 'Adnan carve-out reddi → aile şirketi gerilimi',
   'Fuat''ın 5-12 mailindeki "organik bağ kes" önerisi Adnan''ın haberi olmadan yazıldı (Cc''de Adnan yok). Toplantıda direkt soru gelirse Adnan tepkisi öngörülemez → momentum kaybı.',
   4, 4, 'active', 'red', 'red-team-brief',
   '3 Haziran Özgür-Adnan 1:1 (60dk) — Fuat 5-12 mailini birlikte oku. B paketi (Şartlı Onay): %15 golden share + board chair + ''Powered by Movetech, an ENCO company''. (Opsiyonel) 5 Haz 3''lü.',
   '5-12 mail Cc satırı: Adnan yok (ryk, nezif, guner, samed, erdinc, kevin var). 5-8 toplantı (12:28): "Adnan şirket yapısını birleştirmeyi finalize edecek" sorumluluğu.'),

  ('S5', 'NDA hızlı imza → IP koruma maddeleri eksik',
   'Fuat "NDA''ya yorumum yok" + Erdi "bayram sonrası imza" → zaman baskısı altında standart Rasyotek şablonu imzalanır, Movetech-spesifik koruma maddeleri eksik kalır.',
   3, 5, 'active', 'red', 'red-team-brief',
   'NDA revize için 5+ iş günü ek süre. M1-M12 zorunlu madde checklist (Confidential Info tanımı, Nuvolog taraf, 5 yıl süre, çıkar çatışması, non-solicit, non-poach, reverse eng yasağı, IP ownership, audit, Greenix, cezai şart €100K-1M). Drip-feed demo (sırasıyla katmanlama).',
   'Fuat 5-22 mail: "NDA – yorumum yok". Erdi 5-22: "Bayram sonrası". Dilara Önsur standart şablon → Rasyotek lehine biased.'),

  ('S6', 'APY Ventures cap table sulanması',
   'Nuvolog yatırımcısı APY Ventures + APY Ventures Start-up GSYF, asset injection senaryosunda Nuvolog SHA pro-rata haklarıyla RasyoLog cap table''a girer. %5-15 dilüsyon + exit zorlaması.',
   2, 4, 'monitoring', 'orange', 'red-team-brief',
   'RasyoLog 3-taraf cap table dondurma (MovetechNewCo/Rasyotek/Turkroro oybirliği). Nuvolog 3rd party tedarikçi (license fee, equity yok). Pre-emption clause. Toplantıda Fuat''a sor: Nuvolog SHA''sında pro-rata var mı?',
   'Nuvolog Apollo: 3+ round, hep APY Ventures. 2026-05 son round: APY Ventures + GSYF (yeni vehicle eklendi → exit-driven).'),

  ('S7', 'Erdem CTO veto → forced migration risk',
   'Erdem (Rasyotek CTO) KVKK + veri yeri gerekçesiyle "Movetech mimarisi Rasyotek bulut altyapısına geçirilmeli" der. Modernizasyon projesinde IP Rasyotek mühendislerine açılır.',
   3, 4, 'monitoring', 'orange', 'red-team-brief',
   'Veri yeri (TR) vs altyapı (bağımsız) ayrımı. Modernizasyon yol haritası MovetechNewCo''da. KVKK denetimi bağımsız 3. taraf (KPMG/PwC/Deloitte). Rasyotek mühendisleri API consumer, code contributor değil.',
   'Haldun 4-30 maili: "Erdem... müşterilerin kodlar kimde kalacak, veri nerede olacak defansları için mimariyi şekillendirebilir" — Rasyotek mimarisini empoze etme niyeti.'),

  ('S8', 'Rasyotek RasyoLog''u 3. taraf yatırımcıya satar',
   '"10 yılda 10 holding" stratejisi → 2-3 yıl içinde RasyoLog €1.4M-3M ARR seviyesinde Rasyotek %40 payını TR/yabancı SaaS investor''a satar. Yeni ortak yabancı, stratejik hizalanma kaybeder.',
   3, 3, 'monitoring', 'yellow', 'red-team-brief',
   'Right of First Refusal (ROFR): Rasyotek satarsa önce MovetechNewCo + Turkroro''ya teklif. Tag-along (drag-along yok). Change-of-control trigger. 5 yıl lockup period.',
   'Rasyotek "10 yılda 10 holding" stratejisi (4-29 Plaud toplantısı). Vertical SaaS portföyü: HR + Sağlık + Karbon + Lojistik → exit modeli.'),

  ('S9', 'Turkroro bedava distribütör sömürüsü',
   'Turkroro %20 RasyoLog payı karşılığında "lojistik müşteri ağı" katkısı verir. Mevcut Turkroro müşterilerine RasyoLog yazılımını bedava/discount ile sunar → Turkroro değer kazanır, RasyoLog gelir düşük.',
   4, 3, 'active', 'orange', 'red-team-brief',
   'ARPU minimum klozu (€400/ay floor). Müşteri Hierarchy: referral fee (one-time, %10 first-year ARR). Annual revenue target Turkroro için (yıl 1: 30 müşteri, eşik tutmazsa pay düşer). Equity yerine performance pool.',
   'Turkroro Apollo: 16 çalışan, +%333 büyüme, müşteri ağı maritime/Ro-Ro/intermodal. Sermaye katkısı yok, brand/IP yok.')

on conflict (risk_key) do nothing;

-- ─────────────────────────────────────────────────────
-- Done. Seed data for rt_documents inserted via API route after migration applied.
-- ─────────────────────────────────────────────────────
