-- 0008: Quotes module — Daily Dose at quotes.skilldrunk.com

do $$ begin
  create type qt_source as enum ('curated', 'ai_generated', 'user_submitted');
exception when duplicate_object then null; end $$;

create table if not exists public.qt_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_text text not null,
  author text not null,
  category text,                       -- 'teknoloji', 'liderlik', 'felsefe', ...
  nano_detail text,                    -- short contextual anecdote / commentary
  source qt_source not null default 'curated',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.sd_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists qt_quotes_active_idx on public.qt_quotes (is_active, created_at desc);
create index if not exists qt_quotes_category_idx on public.qt_quotes (category);

alter table public.qt_quotes enable row level security;

-- Public can read active quotes
drop policy if exists "qt_quotes_public_read" on public.qt_quotes;
create policy "qt_quotes_public_read" on public.qt_quotes
  for select using (is_active = true);

-- Admin can all
drop policy if exists "qt_quotes_admin_all" on public.qt_quotes;
create policy "qt_quotes_admin_all" on public.qt_quotes
  for all using (public.sd_is_admin());

-- Seed with 12 curated quotes + 1 from Özgür himself
insert into public.qt_quotes (quote_text, author, category, nano_detail, source, is_featured) values
(
  'Teknoloji, yeterince gelişmiş olduğunda sihirden ayırt edilemez.',
  'Arthur C. Clarke',
  'Teknoloji',
  'Clarke bunu 1973''te yazdı. 53 yıl sonra sen telefonundan mesaj yazıyorsun, VPS''teki bot Suno''ya şarkı sipariş ediyor, Obsidian''a not düşüyor, Supabase''e embedding yazıyor. Sihir artık.',
  'curated', true
),
(
  'Basitlik, sofistikasyonun nihai formudur.',
  'Leonardo da Vinci',
  'Tasarım',
  'Da Vinci bu cümleyi bir uçak tasarlarken yazdı. 500 yıl sonra Wright kardeşler 12 saniyelik bir uçuşla tarihi değiştirdi.',
  'curated', true
),
(
  'Her sistem mükemmel olarak tasarlandığı sonuçları üretir.',
  'W. Edwards Deming',
  'Sistem',
  'Deming bunu Toyota''ya söyledi ve Toyota dünyayı değiştirdi. ENCO''daki her süreç tasarımında sonuç üretiyor.',
  'curated', false
),
(
  'Yapay zeka, insanlığın son icadı olacak.',
  'Nick Bostrom',
  'AI',
  'Bostrom Oxford''da bunu yazarken 2014 tu. 12 yıl sonra sen 4 AI botun arasında koordinasyon yapıyorsun ve bir RAG sistemi kuruyorsun.',
  'curated', true
),
(
  'Ölçemediğin şeyi yönetemezsin.',
  'Peter Drucker',
  'Yönetim',
  'Drucker aslında tam tersini de söyledi: Ölçülebilen her şey önemli değildir. GA4 sana sayıları verir, Z Raporu sana hikayeyi.',
  'curated', false
),
(
  'En iyi zaman bir ağaç dikmek için yirmi yıl önceydi. İkinci en iyi zaman şimdi.',
  'Çin Atasözü',
  'Zaman',
  'Bu atasözünün ilk yazılı kaydı 1988''de çıktı. Kadim bilgelik aslında 38 yaşında. Obsidian vault''un da bir gün kadim olacak.',
  'curated', false
),
(
  'Kaos, merdivendir.',
  'Petyr Baelish',
  'Strateji',
  'System-Backlog''un 15 madde, Learning-Backlog''un 18 madde. Kaosun içinde merdivenlerin var.',
  'curated', false
),
(
  'Hata yapmayan insan, hiçbir şey yapmamış insandır.',
  'Theodore Roosevelt',
  'Liderlik',
  'Roosevelt bu sözü söylediğinde 42 yaşındaydı. bot.py de 6 backup dosyan var. Her biri bir hata, her biri bir ders.',
  'curated', false
),
(
  'Dünyanın en güçlü silahı, ateşlenmiş insan ruhudur.',
  'Ferdinand Foch',
  'Motivasyon',
  'Dünyanın en güçlü silahı, ateşlenmiş insan ruhudur. Sen de 4 şirket, 180 kişi, 4 bot, 1 vault ateşliyorsun.',
  'curated', false
),
(
  'Başarı, coşkunuzu yitirmeden başarısızlıktan başarısızlığa yürüme becerisidir.',
  'Winston Churchill',
  'Azim',
  'Churchill bu sözü II. Dünya Savaşı''nın en karanlık günlerinde söyledi. Claude BOT''un promptu SEN BIR ANALIZ BOTUSUN diyordu. Düzeltik. Her düzeltme bir zafer.',
  'curated', false
),
(
  'Önemli olan yolculuktur, varış noktası değil.',
  'Ralph Waldo Emerson',
  'Felsefe',
  'Emerson bunu 1841''de bir dergiye yazdı. O dergi 3 yıl sonra kapandı. Ama cümle 185 yıldır yaşıyor.',
  'curated', false
),
(
  'Gelecek, onu inşa edecek kadar cesur olanlara aittir.',
  'Özgür GÜR',
  'Kişisel',
  'Bunu henüz söylemedin ama her gün yaptığın bu. 4 şirket, 180 kişi, 4 bot, 1 vault, sıfırdan kurduğun bir AI ekosistemi.',
  'curated', true
);

-- RPCs for app

-- Deterministic daily quote (same quote shown all day)
create or replace function public.qt_daily_quote()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select id, quote_text, author, category, nano_detail
    from public.qt_quotes
    where is_active = true
    order by id
  ),
  numbered as (
    select row_number() over () - 1 as rn, *, (select count(*) from active) as total
    from active
  ),
  picked as (
    -- day-of-year (UTC) modulo total count → deterministic daily pick
    select * from numbered
    where rn = extract(doy from (current_date at time zone 'Europe/Istanbul'))::int % total
  )
  select row_to_json(p)::json from (
    select id, quote_text, author, category, nano_detail,
           (current_date at time zone 'Europe/Istanbul')::date as for_date
    from picked
  ) p;
$$;

grant execute on function public.qt_daily_quote() to anon, authenticated;

-- Random quote (for "Yeni İlham" button)
create or replace function public.qt_random_quote()
returns json
language sql
volatile
security definer
set search_path = public
as $$
  select row_to_json(q)::json from (
    select id, quote_text, author, category, nano_detail
    from public.qt_quotes
    where is_active = true
    order by random()
    limit 1
  ) q;
$$;

grant execute on function public.qt_random_quote() to anon, authenticated;

-- Featured quotes (for a "favorites" view)
create or replace function public.qt_featured_quotes()
returns setof public.qt_quotes
language sql
stable
security definer
set search_path = public
as $$
  select * from public.qt_quotes
  where is_active = true and is_featured = true
  order by created_at desc;
$$;

grant execute on function public.qt_featured_quotes() to anon, authenticated;
