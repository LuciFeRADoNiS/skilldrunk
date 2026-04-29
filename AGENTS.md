<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Skilldrunk — Agent Working Protocol

> This file is the single source of truth for **how** to work on this repo.
> Kullanıcı bunun yenilenmesini istedi: her iş bitiminde dokümantasyon kayıplarını önlemek için.

## Ekosistem (bildiklerinin özeti)

**Monorepo**: `/Users/ozgurgur/Documents/skilldrunk/` — pnpm workspaces + Next.js 16 (Turbopack) + React 19 + Supabase + Tailwind 4.

**Live subdomains** (9 tane — pt_apps tablosundan canlı veri):
```
skilldrunk.com           PUBLIC   Marketplace + MCP HTTP + AI Finder
admin.skilldrunk.com     PRIVATE  Ecosystem control panel + AI assistant (tool use)
analiz.skilldrunk.com    PRIVATE  Event stream (Obsidian + GitHub)
brief.skilldrunk.com     PRIVATE  Günlük brief (Claude Haiku cron)
quotes.skilldrunk.com    PUBLIC   Daily Dose (real Next.js app + AI)
prototip.skilldrunk.com  PUBLIC   Ecosystem showcase (kronolojik, pt_apps)
radyo.skilldrunk.com     SEMI     Public /vote, admin /review (Suno+DistroKid WIP)
sub.skilldrunk.com       PRIVATE  AI subscription tracker (ai-sub-tracker rebrand)
bday.skilldrunk.com      PRIVATE  Birthday reminders (birthdaysfunetc rebrand)
```

**Analytics**:
- First-party: `sd_pageviews` (host column, RLS admin-read), `<Tracker />` her layout'ta, `/api/track` her app'te (shared via `@skilldrunk/analytics/track-handler`)
- GA4: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-38N14BZMQR` 6 projede, cross-domain `.skilldrunk.com` cookie

**AI Assistant (admin.skilldrunk.com/ai)**:
Claude Haiku tool use ile gerçek aksiyonlar yapabiliyor:
- `count_pageviews`, `count_az_events`, `list_apps`, `get_recent_audit` (read)
- `toggle_app_featured`, `toggle_app_public`, `set_app_status`, `set_skill_status`, `add_quote` (write)
Multi-turn loop (max 6 turn), tool result'lar UI'da yeşil/kırmızı badge ile gösterilir (transparency).

**Schema prefixleri** (tek Supabase DB: `vrgohatarieeguyyhfan`):
- `sd_*` marketplace (skills, votes, arena, notifications, audit, pageviews, **ai_usage**)
- `az_*` analiz (events)
- `br_*` brief (briefings)
- `qt_*` quotes (qt_quotes — Haiku-enriched)
- `pt_*` prototip/apps catalog (apps)

**Telegram bot @skilldrunk_bot**: webhook `apps/admin/src/app/api/telegram/webhook/route.ts`. Komutlar: `/brief /quote /ask /stats /help`. `/ask` → `runAskAssistantCore({ allowWrites: false })`. Whitelist: `secret_token` header + `chat_id === TELEGRAM_CHAT_ID`. Cron pushes: günlük 07:00, haftalık Pazar 22:00.

**AI usage tracking** (`packages/llm`): tek `callClaude(opts)` wrapper, her çağrıda `sd_ai_usage` insert (fire-and-forget). Pricing tablosu (haiku-4-5: $1/$5, sonnet-4-5: $3/$15, opus-4-5: $15/$75 per 1M tokens). `app` field: `'brief' | 'quotes' | 'admin-ai' | 'marketplace-find'`. Panel: `admin.skilldrunk.com/usage`.

**Auth**: `admin.skilldrunk.com/login` email+password (ozgurgur@gmail.com/admin role) + `.skilldrunk.com` cookie → tüm private subdomainler. Marketplace ayrıca Google OAuth (community role=user).

## Kritik komutlar

### Yeni bir subdomain açma (Next.js app pattern)
1. `cp -r apps/analiz apps/<name>` (temiz template için)
2. `apps/<name>/package.json` → name + port
3. `apps/<name>/src/app/{page,layout}.tsx` — içerik
4. `apps/<name>/src/proxy.ts` — auth gerekiyorsa `@skilldrunk/supabase/middleware`, public ise plain `NextResponse.next()`
5. `vercel link --project skilldrunk-<name> --yes` (cd apps/<name>'den)
6. Vercel API ile: `rootDirectory=apps/<name>`, `framework=nextjs`, GitHub link, ignoreCommand (`git log -1 --format=format: --name-only | grep -qE "^(apps/<name>/|packages/|pnpm-lock.yaml|.npmrc)" && exit 1 || exit 0`)
7. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_COOKIE_DOMAIN=.skilldrunk.com`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.skilldrunk.com`
8. Domain: `vercel domains add <sub>.skilldrunk.com <project-name>` (apex zaten Vercel'de → anında verified)
9. `pt_apps` tablosuna row ekle (is_public kararına göre)

### Yeni bir subdomain açma ("sadece redirect/rewrite" pattern)
1. `~/Documents/<name>-app/vercel.json` yaz (rewrite veya redirect):
   ```json
   {"rewrites": [{"source":"/","destination":"..."},{"source":"/:path+","destination":".../:path+"}]}
   ```
2. **`index.html` YOK** (static serve rewrite'ı yutar)
3. `vercel deploy --prod --yes`
4. `vercel domains add <sub>.skilldrunk.com <project-name>`

### Mevcut vercel.app projesini subdomain'e taşıma
Tercih 1 — **Subdomain ekle, eski kalsın**: `vercel domains add <sub>.skilldrunk.com <project-name>`. Tek satır.
Tercih 2 — **Eski URL'i redirect yap**: eski projeye vercel.json'a tüm yolları yeniye 308 redirect. Ama vercel.app subdomain'i silemezsiniz; sadece sayfa içeriği 301 gönderir.

### DB migration
`supabase/migrations/000X_*.sql` dosyası ya `mcp__supabase__apply_migration` ile ya Dashboard'dan uygulanır. `pt_apps` ve `sd_audit_log` gibi tablolar RLS aware.

## **ZORUNLU: Her ship'ten sonra 3 dokümantasyon noktası**

Yeni bir feature/fix ship'ledikten sonra (PR merge'den önce değil, sonra), **şu üç yerin hepsini** güncellemeden bırakma:

### 1. Obsidian build-log
`/Users/ozgurgur/Documents/Personal Brain/Projects/Skilldrunk/build-log.md`
- En üste yeni giriş: tarih + başlık + gerçekleştirilen işler
- PR numarası + squash commit SHA'sı
- Yeni migration, yeni subdomain, yeni env var varsa özellikle not

Access: Write tool direkt çalışır (local vault, Cowork'ten de osascript ile erişilir ama Write daha hızlı).

### 2. pt_apps tablosu (ekosistem catalog)
Supabase'de `public.pt_apps` satırı — yeni app eklediysen insert, mevcut app güncellediysen update.
- **slug, title, tagline**: değişmişse güncelle
- **subdomain, url**: yeni subdomain geldiyse
- **stack, tags**: teknik değişim varsa
- **is_public**: prototip.skilldrunk.com'da görünmesini istiyorsan true
- **last_deployed_at**: her önemli değişimde now()

Access: `mcp__supabase__execute_sql` veya admin panelden elle.

### 3. Bu dosya (AGENTS.md)
Eğer yeni bir **pattern** (reusable nasıl-yapılır) veya **kritik karar** oluştuysa buraya not.
- Yeni subdomain türü? → "Kritik komutlar" bölümüne ekle
- Yeni schema prefix? → ekosistem özetine ekle
- Breaking change, bilinen tuzak? → üst kısımlara uyarı olarak ekle

## ⚠️ Kritik tuzaklar

### Vercel serverless `await` zorunlu
POST handler'larda response döndüğünde Vercel runtime async işi terminate eder. **Fire-and-forget yapma** — `void handleSomething()` yerine `await handleSomething()`. Telegram webhook'ta bu yüzden bot cevap vermiyordu (PR #24 fix).

### Codex sınırı (ÖNEMLİ)
OpenAI Codex `~/Documents/skimsoulfat-app/` ve `*.skimsoulfat.com` domain'leriyle çalışıyor. **Skilldrunk repo'suna, Vercel projelerine veya `*.skilldrunk.com` domain'lerine dokunmamalı.** Eğer codex skimsoulfat domain'ini yanlışlıkla skilldrunk Vercel projesine bağlarsa:
```bash
TOKEN=$(cat ~/Library/Application\ Support/com.vercel.cli/auth.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -X DELETE "https://api.vercel.com/v9/projects/<wrong-project>/domains/<domain>?teamId=team_FIWBic9LwfGzRkAT5QfXkZtA" -H "Authorization: Bearer $TOKEN"
```

## Deployment

**GitHub push-to-deploy bağlı (4 proje + prototip + quotes-skilldrunk)**.
- main'e push → ilgili Vercel projeleri otomatik build
- `ignoreCommand` her projeye set edilmiş: sadece ilgili path değiştiyse build
- Manuel deploy gerekmiyor — `git push origin main` yeterli

## Build check patterns

**Before push:**
- Ana proje: `pnpm build` (marketplace)
- Alt app: `cd apps/<name> && pnpm build`
- Her ikisi de zorunlu değil, Vercel zaten build edecek. Ama TypeScript hatası olmadığından emin olmak için local build yararlı.

**Known issue**: `pnpm-lock.yaml` yeni dep sonrası commit edilmeli. `pnpm install` yaptıktan sonra `git status` ile lockfile değişmiş mi kontrol et.

## Turkish UI, English code

UI metinleri Türkçe (kullanıcı için). Değişken/fonksiyon isimleri ve commit mesajları İngilizce. Schema isimleri İngilizce. Yorumlar genelde Türkçe ama teknik detaylar İngilizce ok.


## Sınır — Cowork tarafının alanı (DOKUNMA)

Skilldrunk monorepo dışında kalan ve **Cowork (Claude desktop, başka session)** tarafından yönetilen sistemler bu repo'nun sorumluluğu DEĞİL — referans için okuyabilirsin ama müdahale etme:

| Sistem | Konum | Kim yönetir |
|---|---|---|
| LesTaT Inc. core 5 bot (Atlas/Hephaestus/Mnemosyne/Hermes/Apollo) | Hetzner VPS Python (`/opt/*-bot/`, `/root/.openclaw/`) | Cowork |
| Obsidian `Sistemler/LesTaT-Inc/` klasörü (bot organizasyonu, VERSION, KULLANIM-KILAVUZU vb.) | Mac local vault | Cowork |
| `lestat-inc-agents` repo + agents.skilldrunk.com (LuciFeRADoNiS/lestat-inc-agents) | GitHub + Vercel | Cowork |
| Cowork scheduled tasks (`~/Documents/Claude/Scheduled/`) | Mac local | Cowork |
| VPS cron + maintenance script (`/root/openclaw-maintenance.sh`) | Hetzner | Cowork |

**Skilldrunk repo'da dokunabileceğin alan:** `apps/*`, `packages/*`, `src/*`, `supabase/migrations/`, `vercel.json`, root config'ler. Bu repo'nun standart kapsamı.

**Skilldrunk botu** (`@skilldrunk_bot`, `apps/admin/src/app/api/telegram/webhook/`) — bu repo'nun parçası, Claude Code geliştirir. Cowork tarafı sadece dokümante eder (Calliope kodadıyla, tier: brand-side).

## ŞU AN — Sprint Snapshot

> Repo'yu açar açmaz buradan başla. "Nerede kalmıştık?" sorusunun cevabı.

**Son güncelleme:** 2026-04-29 (her PR/sprint sonrası bu bölümü güncelle)

**Son ship'ler (kronolojik, en yeni üstte — detay: `Personal Brain/Projects/Skilldrunk/build-log.md`):**
- PR #29 — feat(admin+agents): pt_apps tabanlı dinamik subdomain nav + agents.skilldrunk.com v2 fork (7 yeni infografik, Calliope 6. bot, state schema v2 spec) — **commit edilmedi, kullanıcı/Cowork push'a bekliyor**
- PR #27 — feat(map): dagre auto-layout + Layer 2 expand + public prototip/map
- PR #26 — feat(ai): query_db tool — read-only ad-hoc SQL for admin assistant (migration 0010, RPC sd_query_readonly)
- PR #25 — docs(agents): Cowork sınırı + ŞU AN sprint snapshot
- PR #24 — fix(telegram): await handleCommand (Vercel serverless terminates after response)
- PR #23 — feat(telegram): interactive bot commands `/brief` `/quote` `/ask` `/stats` `/help`
- PR #21 — feat: AI Usage Counter (`sd_ai_usage` + `/admin/usage` page)

**Aktif:** Telegram bot canlı (`@skilldrunk_bot`), webhook OK, brief üretiyor. Skilldrunk ekosistemi `pt_apps`'ta 10 subdomain catalog'lu (agents dahil, prototip de eklendi). Admin nav 2 katmanlı: iç route'lar + dinamik ekosistem chip'leri.

**Cowork sınırı esnetildi (bu sprintte):** `~/Desktop/lestat-inc-agents/` repo'sunda biz fork edip `index.html` v2 + `STATE-SCHEMA-V2.md` + `state.json` v2 yazdık. Push hâlâ Cowork/kullanıcının elinde — Cowork session onaylar, push eder. Standart kural geri devreye girer: agents repo Cowork yönetir.

**Sıradaki olası:** (Claude Code'un karar vereceği — son commit + Obsidian build-log + bu kullanıcı oturumundaki istekler)

**Blockers:** yok (gözlemlenmiş).

**Bağlantılı LesTaT Inc. ekosistemi:** Cowork tarafı 5 VPS Python botunu yönetiyor (Atlas/Hephaestus/Mnemosyne/Hermes/Apollo). Skilldrunk botu Calliope olarak kataloglanmış (Obsidian `Sistemler/LesTaT-Inc/02-Bots/Calliope.md`) ve agents v2 showcase'inde 6. bot olarak yer alıyor. Çakışma yok, ortak Supabase project (`vrgohatarieeguyyhfan`).

**Disiplin:** Her ship sonrası **ŞU AN bölümünü güncelle** (yukarıdaki "ZORUNLU 3 dokümantasyon noktası"na ek).
