# @skilldrunk/brief

brief.skilldrunk.com — daily briefing module.

- `/` — today's brief (morning auto-gen at 04:00 UTC)
- `/daily/[date]` — archive
- `/api/generate` — manual trigger (auth required)
- `/api/cron` — Vercel Cron (CRON_SECRET protected)

Env vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_COOKIE_DOMAIN`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
- `ANTHROPIC_API_KEY` — optional, enables LLM composition (fallback = group-by-kind template)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — optional daily push
- `CRON_SECRET` — protects /api/cron from spam (set by default by Vercel when this env exists)
