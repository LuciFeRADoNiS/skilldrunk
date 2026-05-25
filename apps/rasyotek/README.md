# @skilldrunk/analiz

`analiz.skilldrunk.com` — Skilldrunk Portal'ın veri analiz modülü.

## Stack
- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- Supabase (paylaşılan `@skilldrunk/supabase` paketi üzerinden)

## Geliştirme
```bash
pnpm --filter @skilldrunk/analiz dev
```
Port 3001'de açılır.

## Deploy
Vercel projesi: `skilldrunk-analiz`, root directory: `apps/analiz`, domain: `analiz.skilldrunk.com`.

Env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Şema prefix'i: `az_`. Migrationlar: `../../supabase/migrations/0005_analiz_init.sql` (Phase 1'de).
