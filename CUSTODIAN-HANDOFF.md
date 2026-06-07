# CUSTODIAN HANDOFF — skilldrunk.com (Claude Code)

> Yazan: ZeuX (Cowork), 2026-06-07. Master spec: Obsidian vault `Projects/Domain-Custodian/README.md`
> Bu dosya proje köküne kopyalandı. Yeni Code session'da önce bunu, sonra vault README'yi oku.

## Görev
skilldrunk.com için "Domain Custodian" chat botu: domain'i sürekli izleyen (deploy, commit, içerik değişikliği, auth giriş/çıkış, GA4 analytics), her şeyi sorabildiğim ve onay kapılı aksiyon alabilen admin chat'i.

## Faz 1 — Ingest altyapısı (önce bu)
1. Supabase (proje: ozguraidatabase / vrgohatarieeguyyhfan) yeni tablolar — namespace `cst_`:
   - `cst_events(id, domain, type, source, payload jsonb, actor, created_at)` — type: deploy|commit|content|auth|action
   - `cst_analytics_daily(id, domain, date, users, pageviews, top_pages jsonb, sources jsonb)`
   - `cst_audit(id, domain, session_id, tool, args jsonb, result_summary, tokens_in, tokens_out, cost_usd, created_at)`
   - RLS: sadece admin user (auth_shared_user pattern — mevcut)
2. Webhook endpoint'leri (Next.js route handlers):
   - `/api/custodian/webhooks/vercel` — deploy events → cst_events (Vercel project settings'ten webhook bağla; secret doğrula)
   - `/api/custodian/webhooks/github` — push events → cst_events
   - Supabase auth hook (ya da login callback'te logger) → cst_events type=auth
3. GA4 günlük pull: Vercel cron (`vercel.json` crons) → GA4 Data API, property **534659408** (Skilldrunk), service account `claude-bot@claude-bot-490207` (Viewer yetkisi mevcut) → cst_analytics_daily

## Faz 2 — Chat backend + UI
1. `/api/custodian/chat` — Anthropic SDK, tool-calling loop:
   - Read tools: `query_events`, `query_analytics`, `vercel_deployments`, `vercel_logs`, `github_commits` (REST API'ler; token'lar env)
   - Action tools (UI onay kapısı + cst_audit kaydı zorunlu): `backlog_add` (mevcut `sd_backlog_add` RPC), `content_update`, `trigger_redeploy` (deploy hook), `revalidate_path`
   - Model: `claude-haiku-4-5-20251001` default; kullanıcı "derin analiz" derse Sonnet
   - Günlük bütçe: `CUSTODIAN_DAILY_BUDGET_USD=2` — aşılırsa chat'e uyarı, tool'lar kapanır
2. UI: admin.skilldrunk.com'a chat sekmesi; **aynı komponenti agents.skilldrunk.com'a da ekle** (lestat-inc-agents repo) — orada system prompt'a `state.json` agent context'i enjekte edilir (Özgür agent'larıyla buradan konuşacak)
3. Aksiyon onayı: tool call → UI'da "Onayla/Reddet" kartı → onaysız execute YOK

## Dikkat
- agents.skilldrunk.com deploy: webhook bozuk — manuel `vercel --prod` gerekir (memory: lestat_agents_deploy; git author sorunu için vercel_git_author_block notuna bak)
- Yeni tablolar için "kalıcı proje" muamelesi: migration dosyası yaz, scaffold bırakma
- Tüm secret'lar Vercel env'e; repo'ya asla yazma
- PR'ları küçük tut; her faz sonunda vault `Projects/Domain-Custodian/README.md` durum güncellemesi

## Başlangıç promptu (öneri)
"CUSTODIAN-HANDOFF.md dosyasını oku, Faz 1'i uygula. Önce mevcut repo yapısını ve Supabase şemasını incele, migration planını göster, onayımdan sonra uygula."
