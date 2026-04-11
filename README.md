# skilldrunk

**The library for AI skills.** A Reddit-style community + directory + arena for
Claude Skills, Custom GPTs, MCP servers, Cursor rules, prompts, and agents.

> Status: Phase 1 MVP scaffold. Landing page + waitlist + skill detail page +
> vote/comment API + seed importer. No deploy yet.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (Radix, Nova preset)
- **Supabase** — Postgres, Auth, RLS, Storage
- **sonner** for toasts, **lucide-react** for icons
- **zod** for validation, **gray-matter** for parsing SKILL.md frontmatter

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a Supabase project

Easiest path: go to [supabase.com](https://supabase.com/dashboard) and create
a new project. Then copy your keys into `.env.local`:

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY
```

### 3. Apply the schema migration

Open the Supabase SQL editor and paste the contents of
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
It creates:

- `profiles`, `skills`, `skill_versions`, `votes`, `comments`, `reports`,
  `collections`, `collection_skills`, `waitlist`
- RLS policies for every table
- Triggers to auto-create profiles on signup and keep vote/comment counts in sync
- Full-text search index (`search_vector`) on skills

### 4. Seed some skills

Pulls every `SKILL.md` from
[`anthropics/skills`](https://github.com/anthropics/skills) and upserts them
into the `skills` table:

```bash
pnpm tsx scripts/seed.ts
```

Without env vars it runs as a dry run and prints the parsed skills.

### 5. Enable auth providers (optional for MVP)

In Supabase dashboard → Authentication → Providers, enable **GitHub** and
**Google**. Set the redirect URL to `http://localhost:3000/auth/callback` (the
callback route comes in Phase 1.5).

### 6. Run dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project layout

```
src/
  app/
    page.tsx                   # landing + waitlist
    layout.tsx                 # root layout + metadata
    s/[slug]/page.tsx          # skill detail (server component)
    api/
      vote/route.ts            # POST /api/vote
      comment/route.ts         # POST /api/comment
    actions/
      waitlist.ts              # server action for waitlist signup
  components/
    waitlist-form.tsx          # landing form (client)
    vote-buttons.tsx           # optimistic vote UI (client)
    comment-section.tsx        # comment list + compose (client)
    ui/                        # shadcn components
  lib/
    types.ts                   # SkillType, Skill, Profile, Comment
    utils.ts                   # shadcn cn helper
    supabase/
      server.ts                # createClient() for RSC / route handlers
      client.ts                # createClient() for browser
      middleware.ts            # updateSession for proxy
  proxy.ts                     # refreshes auth cookies on every request
scripts/
  seed.ts                      # GitHub → skills importer
supabase/
  migrations/
    0001_init.sql              # full schema + RLS + triggers
```

---

## What works right now

- ✅ Landing page `/` with waitlist form (server action → `waitlist` table)
- ✅ `/feed` trending listing, filterable by skill type
- ✅ `/s/[slug]` skill detail: vote, comment, markdown body via `react-markdown`
- ✅ `/new` skill submission form (auth-gated, zod-validated)
- ✅ `/search?q=` Postgres full-text search via generated `tsvector`
- ✅ `/tag/[tag]` tag listing
- ✅ `/u/[username]` public profile with user's published skills
- ✅ `/login` GitHub + Google OAuth via Supabase, `/auth/callback` + `/auth/signout`
- ✅ `POST /api/vote` toggle/switch/insert with RLS + optimistic UI
- ✅ `POST /api/comment` insert comment with RLS
- ✅ Seed importers: **17 Claude Skills** (`anthropics/skills`) +
  **~490 MCP servers** (`wong2/awesome-mcp-servers`)
- ✅ Vercel deploy config (`vercel.json`) + `DEPLOY.md` step-by-step guide
- ✅ `pnpm build` clean (Next.js 16 + Turbopack)

## What's next (not built yet)

- Nested comment replies (schema supports it; UI is flat for now)
- Skill "claim" flow — link a GitHub-sourced skill to its real author
- Cursor rules importer
- Arena (Phase 2): head-to-head comparison + Elo leaderboard
- Marketplace + Stripe Connect (Phase 3)

See the plan file at
`~/.claude/plans/humble-strolling-crystal.md` for the full roadmap.

---

## Scripts

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `pnpm dev`           | Next.js dev server on :3000               |
| `pnpm build`         | Production build (Turbopack)              |
| `pnpm start`         | Serve production build                    |
| `pnpm lint`          | ESLint                                     |
| `pnpm tsx scripts/seed.ts` | Pull Claude skills from GitHub → DB |

---

## Notes

- **Next.js 16** renamed `middleware.ts` → `proxy.ts` with `export async function proxy`. We follow the new convention.
- The seed importer uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Never ship that key to the client.
- Full-text search uses Postgres `tsvector` for Phase 1. Switch to Algolia or
  Typesense if/when the index outgrows FTS.
