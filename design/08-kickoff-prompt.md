# skilldrunk redesign — kickoff prompt (paste this to start)

---

You are building the **skilldrunk** redesign. A complete design package already exists — read it first, then implement.

## 0. Read the package first (in this order)
Folder: `/Users/ozgurgur/Documents/skilldrunk/design/`
1. `00-concept-brief.md` — the vision (read first)
2. `01-ecosystem-and-ia.md` — information architecture / what to build
3. `02-brand-identity.md` — identity rules (wordmark, color, type, motion, voice)
4. `03-design-tokens.css` — **drop-in tokens = single source of truth** (4 palettes, light/dark)
5. `04-front-window.html` — reference mockup: the public **Window**
6. `05-inside-mine.html` — reference mockup: the inside **Mine / Desk**
7. `06-palettes.html` — the 4 palette options
8. `07-logo-explorations.html` — 3 wordmark + 3 mark directions

## 1. Locked decisions (do not re-litigate)
- One brand, **two experiences gated by login**: a public **Window** (cinematic, passwordless) and a **Mine** (logged-in command center). **The Mine is curator-only — Özgür alone. No member tier.**
- Identity = **"Cellar"**: ink + parchment + **gold** accent + **oxblood** secondary. Theme `data-palette="cellar"`, default `data-mode="dark"`.
- Type: **Fraunces** (display) · **Geist** (sans) · **Geist Mono** (kicker/labels/numbers), via `next/font/google`. Signature rhythm: mono kicker → Fraunces headline → Geist body.
- **Tokens are law.** No hardcoded hex — only `var(--…)` / Tailwind token utilities. Palette via `data-palette`, mode via `data-mode`.
- Recommended (changeable) defaults: palette **Cellar**, wordmark **A (editorial)** + **gold-seam** mark. Confirm with Özgür before finalizing logo SVGs.

## 2. Stack & repo
- Repo: `~/Documents/skilldrunk` (GitHub `LuciFeRADoNiS/skilldrunk`). Monorepo: the **apex Next app is at the repo root** (`src/`), other tools live in `apps/*` and as separate Vercel projects per subdomain.
- **Next.js 16 + React 19 + Tailwind v4** (CSS `@theme`, no config file) **+ Supabase** (`@supabase/ssr`). pnpm. Build = `pnpm install && pnpm build` (see `vercel.json`).
- Apex routes today: `/` (trending), `/arena`, `/leaderboard`, `/search`, `/find`, `/about`, `/docs`, `/submit`, `/code` (roadmap), `/s/[slug]`, `/u/[username]`, `/tag/[tag]`, `/feed`.
- Subdomains: admin · analiz · rasyotek · brief · leads · tasks · tahsilat · pts (private) + prototip · quotes · worldcup2026 · ngmars (public).

## 3. Build order
1. **Wire tokens:** add `03-design-tokens.css` to the app (Tailwind v4 `@theme`), the no-flash script in `layout.tsx`, and Fraunces/Geist/Geist Mono via `next/font`. Ship a small `<ThemeToggle/>` (mode + palette).
2. **Shared shell:** one thin layout reused everywhere — top bar (wordmark, search, ⌘K, mode) and, for the Mine, the left rail groups (Library / Roadmap / ENCO toolbelt / Work / Showcase / System) + a **⌘K command palette** that can jump across subdomains.
3. **Rebuild the Window** at apex `/` per `04-front-window.html` (Hero → Library picks → Arena spectacle → Live marquee → The Door). "Lite" motion is fine (CSS + IntersectionObserver reveals; Lenis/GSAP optional). Honor `prefers-reduced-motion`; keep real DOM text for SEO/a11y.
4. **Build the Mine "Desk"** (logged-in home) per `05-inside-mine.html`: "what needs me now" across roadmap deadlines / submission queue / estate health / today's tasks / latest deploys + the estate grid. Gate behind the existing `admin.*` central auth (curator-only).
5. **Re-skin existing surfaces** (Library, Arena, Leaderboard, subdomain tools) into the shell **incrementally — do not rewrite them.**

## 4. Guardrails
- Work on a **feature branch and open a PR. Do NOT merge** — Özgür merges.
- **Do NOT touch production env vars** (`AUTH_COOKIE_DOMAIN`, etc.). Note: the Vercel **preview** env is currently corrupted (several preview-scope vars hold ciphertext blobs), so preview builds fail for reasons unrelated to your work — verify with **local `pnpm build`** and/or production, not preview.
- Accessibility: WCAG AA contrast, keyboard nav, `:focus-visible`, reduced-motion.
- Keep every subdomain as its own deploy; **unify via the shared shell, not a rewrite.**

## 5. Deliverable
A running Next prototype of (a) the **Window** at `/` and (b) the **Mine Desk**, fully themed via the tokens, with the shared shell + ⌘K, on a branch + PR.

**Start:** read the 8 files in `/Users/ozgurgur/Documents/skilldrunk/design/`, restate your build plan in 5 bullets, then begin with step 1.
