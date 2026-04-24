<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Skilldrunk — Agent Working Protocol

> This file is the single source of truth for **how** to work on this repo.
> Kullanıcı bunun yenilenmesini istedi: her iş bitiminde dokümantasyon kayıplarını önlemek için.

## Ekosistem (bildiklerinin özeti)

**Monorepo**: `/Users/ozgurgur/Documents/skilldrunk/` — pnpm workspaces + Next.js 16 (Turbopack) + React 19 + Supabase + Tailwind 4.

**Live subdomains** (7 tane — pt_apps tablosundan canlı veri):
```
skilldrunk.com           PUBLIC   Marketplace + MCP HTTP + AI Finder
admin.skilldrunk.com     PRIVATE  Ecosystem control panel
analiz.skilldrunk.com    PRIVATE  Event stream (Obsidian + GitHub)
brief.skilldrunk.com     PRIVATE  Günlük brief (Claude Haiku cron)
quotes.skilldrunk.com    PUBLIC   Daily Dose (Supabase edge proxy rewrite)
prototip.skilldrunk.com  PUBLIC   Ecosystem showcase (kronolojik, pt_apps)
radyo.skilldrunk.com     PRIVATE  Suno AI + DistroKid (WIP)
```

**Schema prefixleri** (tek Supabase DB: `vrgohatarieeguyyhfan`):
- `sd_*` marketplace (skills, votes, arena, notifications, audit, pageviews, ...)
- `az_*` analiz (events)
- `br_*` brief (briefings)
- `pt_*` prototip/apps catalog (apps)

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
