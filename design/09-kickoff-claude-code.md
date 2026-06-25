# skilldrunk "Cellar" redesign — implementation prompt for **Claude Code**

---

You are Claude Code in the repo `~/Documents/skilldrunk` (GitHub `LuciFeRADoNiS/skilldrunk`). Implement the skilldrunk **"Cellar"** redesign from the finished design package. Read first, restate the plan, then build on a fresh branch and open a PR. **Do NOT merge.**

## 0. Read first
Design package — `~/Documents/skilldrunk/design/`:
- `00-concept-brief.md`, `01-ecosystem-and-ia.md`, `02-brand-identity.md` — vision / IA / identity
- `03-design-tokens.css` — **token system = SINGLE SOURCE OF TRUTH** (4 palettes: cellar/ultraviolet/cobalt/oxblood, light+dark, Tailwind v4 `@theme` bridge, no-flash script)
- `04-front-window.html`, `05-inside-mine.html` — original reference mockups
- `06-palettes.html`, `07-logo-explorations.html` — palette + wordmark options
- `08-kickoff-prompt.md` — the build brief (this expands it)

**High-fidelity prototypes (from Claude Design):** there is a **.zip under `~/Documents/skilldrunk/design/`**. Unzip it into `design/prototypes/` and use `Window.dc.html` + `Mine Desk.dc.html` as the **pixel reference** — they're token-driven, dark by default, with a working ⌘K palette and a mode/palette switcher. Match them.

## 1. Locked decisions
- One brand, two experiences gated by login: public **WINDOW** (cinematic, passwordless, apex `/`) + **MINE** (logged-in command center). The Mine is **CURATOR-ONLY — Özgür alone. No member tier.**
- Identity **"Cellar"**: ink + parchment + **gold** + oxblood. Default **dark** (`data-mode="dark"`).
- Type: **Fraunces** (display) · **Geist** (sans) · **Geist Mono** (kicker/labels/numbers) via `next/font/google`. Rhythm: mono kicker → Fraunces headline → Geist body.
- **Tokens are law** — drop in `03-design-tokens.css`; no hardcoded hex; palette via `data-palette`, mode via `data-mode`, persisted to localStorage; include the no-flash script in the layout.
- Recommended wordmark: **A (editorial Fraunces) + gold-seam mark** (confirm with Özgür before finalizing the SVG/favicon).

## 2. Repo reality (read carefully)
- **Monorepo:** the apex Next app is at the **repo root** (`src/`). Other tools live in `apps/*` and as **separate Vercel projects per subdomain** (admin, analiz, rasyotek, brief, leads, tasks, tahsilat, pts, prototip, quotes, worldcup2026, ngmars).
- **Next 16.2.3 + React 19 + Tailwind v4** (CSS `@theme`, no config) **+ Supabase** (`@supabase/ssr`). pnpm. Build = `pnpm install && pnpm build` (`vercel.json`). Note: `pnpm install` exits nonzero on the ignored-build-scripts gate — that's expected; just run `pnpm build` after.
- The working tree is on branch **`feat/ai-brain-faz4` with UNCOMMITTED WIP** (custodian, `nav.tsx`). **Do NOT touch or disturb it.** Create your branch from `origin/main` — ideally via a separate **`git worktree`** so that checkout stays untouched.
- `src/proxy.ts` + `src/lib/supabase/middleware.ts` were just fixed (oversized-cookie guard, merged as `d7a507e`). **Don't regress them.**

## 3. Build — open ONE focused PR (the foundation; don't do everything at once)
1. **Branch** `feat/cellar-redesign` from `origin/main` (worktree recommended).
2. **Tokens & type:** add `03-design-tokens.css` to global styles (Tailwind v4 `@theme`), wire Fraunces/Geist/Geist Mono via `next/font`, add the no-flash script in `app/layout.tsx`. Ship a `<ThemeToggle/>` (mode + 4-palette, localStorage).
3. **Shared shell (real React):** `<TopBar>` (wordmark, search, ⌘K trigger, mode/palette), `<LeftRail>` (groups: Library / Roadmap / ENCO toolbelt / Work / Showcase / System), `<CommandK>` (use `cmdk` or custom — type to filter, ↑↓ move, ↵/click run, Esc close; jumps across subdomains). Port behavior from the prototypes.
4. **The WINDOW:** build as a **staged route** (e.g. `/preview` or behind a feature flag) — **do NOT rip out the live apex `/` yet**; stage it for review so production isn't disrupted. Sections: Hero → Library picks → Arena (live Elo) → Live marquee → The Door (Enter → Mine). Lite motion (CSS + IntersectionObserver; Lenis/GSAP optional). Honor `prefers-reduced-motion`; keep real DOM text (SEO/a11y).
5. **The MINE DESK:** a route **gated behind the existing central/admin auth** (curator-only — `sd_is_admin()`), e.g. apex `/desk` or inside the admin app. "What needs me now" cards (roadmap deadlines, submission queue, estate health, today's tasks, latest deploys) + the estate grid. Wire to Supabase where data exists; placeholders + `TODO` otherwise.
6. **Re-skin existing surfaces** (Library, Arena, Leaderboard, subdomain tools) into the shell **incrementally — not in this PR.**

## 4. Guardrails
- Open a PR; **DO NOT merge** (Özgür merges). Keep it focused: tokens + shell + staged Window + Desk skeleton.
- **DO NOT touch production env vars** (`AUTH_COOKIE_DOMAIN`, etc.). The Vercel **preview** env is currently corrupted (several preview-scope vars hold ciphertext blobs), so preview builds fail for reasons unrelated to your work — verify with **local `pnpm build`** and/or production, not preview.
- Don't disrupt the live apex `/` or the subdomains; **stage** the new Window for review before swapping.
- Accessibility: WCAG AA, keyboard nav, `:focus-visible`, reduced-motion. No hardcoded hex. Keep subdomains as separate deploys; unify via the shared shell, not a rewrite.

## 5. Deliverable
A PR `feat/cellar-redesign` → `main` with: tokens + fonts wired, the shared shell + working ⌘K, the Window (staged route) and the Mine Desk (auth-gated) as real Next routes, **`pnpm build` passing locally**, a short README (done / next), and screenshots. **Do NOT merge.**

**Start:** read the package, unzip & read the prototypes in `design/`, restate your plan in 5 bullets, create the branch/worktree, then do step 2.
