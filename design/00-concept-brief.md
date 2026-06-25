# skilldrunk — Design Concept & Positioning Brief

> One taste. Two doors. A public **Window** onto a curated library, and a private **Mine** where the curator runs everything from the inside.
> Status: draft v1 · 2026-06-23 · owner: Özgür (sole curator)

---

## 1. The one-liner

**skilldrunk is a connoisseur's library of AI skills — and the command room of the person who curates it.**

Not "the Reddit for AI skills" (a crowd shouting). A *cellar*: things are here because **one taste** put them here. The public sees a beautifully lit window; the curator walks the stacks.

## 2. What's wrong today

The current apex behaves like a noisy marketplace — Arena, Elo, vote counts, dense cards all competing on the home screen. It reads as *crowd*, not *curation*. Meanwhile the real value — the constellation of tools living on the subdomains (admin, analiz, rasyotek, brief, leads, tasks, `/code` roadmap, tahsilat, pts…) — is invisible from the front and scattered behind separate logins. The product's depth is on the **inside**, but nothing tells that story.

## 3. The new idea — "one taste, two doors"

A single brand with two deliberately different experiences, gated by login:

### Layer 0 — **The Window** (public · passwordless · cinematic)
A `landonorris.com`-grade, scroll-driven entry. Not a feature dump — a *vitrine*. It shows only what deserves a quick public glance, framed as the curator's selection:
- the **library** at a glance (editor's picks, a few standout skills, the count: "510 and counting"),
- the **Arena** as *spectacle*, not chore (one elegant head-to-head, live Elo ticking),
- the **living toys** that are already public (Daily Dose, World Cup 2026 tracker, the prototype showcase),
- one unmistakable door: **Enter**.

Goal: in 15 seconds a stranger understands *what this is and whose taste it reflects*, and feels they've seen something premium. No dashboards, no clutter.

### Layer 1 — **The Inside / "The Mine"** (logged-in · single curator)
After the door: Özgür's **command center over the whole ecosystem** — one calm control room that surfaces every subdomain and sub-page from the inside, under one sign-in (the central `admin.*` auth already exists). "Benim madenim, kütüphanem — her şeyi içeriden görürüm."
- The **Library** desk: skills, the submission queue, Arena/Leaderboard moderation, tags.
- The **Roadmap** (`/code`): every project's priority/status on one board.
- The **ENCO toolbelt**: analiz, rasyotek, brief, leads, tahsilat, pts.
- **Work**: the AI-aware Kanban (tasks).
- **Showcase**: prototip, quotes, World Cup, ngmars.
- **System**: Domain-Custodian, design system, registries.
- A single **⌘K command bar** that jumps anywhere across subdomains.

Goal: the feeling of *owning a well-run estate* — dense where it must be, but ordered, fast, and unmistakably one person's domain.

## 4. The positioning shift

| From (today) | To (skilldrunk) |
|---|---|
| "Reddit for AI skills" — crowd, chaos | A **curated library** + the **curator's command room** |
| Home = everything at once | Home = a **cinematic window**; depth lives behind the door |
| Gamification on the surface (Elo, votes) | Curation on the surface; **competition becomes spectacle** |
| Many tools, many logins, invisible | One ecosystem, one sign-in, **visible from the inside** |
| Generic marketplace look | **Own identity**: editorial, warm, intoxicated-but-refined |

## 5. Audience

- **Visitors (anonymous):** "What is this, and is it for me?" → The Window. Optimise for *intrigue + speed*, one clear action (Enter / Browse).
- **The Curator (Özgür):** "Run the whole estate from one room." → The Mine. Optimise for *coverage + control + velocity*.
- **The inside is curator-only — LOCKED (2026-06-23).** No member tier. The Mine is a private, single-operator command center: **Özgür only.** Public users live entirely on the Window; signing in leads to *submit / account*, never the command center.

## 6. Brand promise & design principles

1. **Signal over noise.** Every screen earns its density. Default to fewer, larger, calmer.
2. **Curation over crowd.** Show *a choice was made*. Editor's notes, not just counts.
3. **One taste, end to end.** The Window and the Mine feel like the same hand made them.
4. **Cinematic outside, instrumented inside.** Slow and filmic at the door; quick and dense in the room.
5. **Warm, not corporate.** Paper, ink, candlelight — premium without being cold.
6. **Speed is a feature.** Motion serves comprehension; nothing blocks the curator.

## 7. The metaphor that ties it together

The name says **drunk on skill** — connoisseurship, a cellar, intoxication by good things. The inside is a **mine** ("maden") — you dig and the seams are gold. Both land on a single, ownable accent: **gold** — the gold *mine*, the gilt-edged *library*, the golden *spirit in the glass*. Base of **ink + parchment** (archive, stacks); a **wine/oxblood** secondary for the "drunk." This is deliberately *not* the EGV terracotta/lime — skilldrunk gets its own light, while inheriting EGV's token discipline and editorial typographic DNA. (Full system in `02-brand-identity.md` + `03-design-tokens.css`.)

## 8. Open levers (decisions to confirm — not blockers)

1. **Members tier — LOCKED: curator-only.** The inside is Özgür's alone; no member sign-in to the command center.
2. **Routing:** keep "every tool = its own subdomain", but unify them under one shell/nav and ⌘K? (Recommended.) Or pull the heaviest tools onto apex paths?
3. **Wordmark/logo:** left to design exploration — rendered directions in `07-logo-explorations.html` (3 wordmarks + 3 marks).
4. **Public scope:** exactly which subdomains stay on the public Window (quotes, worldcup, prototip, ngmars are already public) vs. invite-only.
5. **Palette:** Cellar (gold) is primary; **3 alternatives** provided — Ultraviolet, Cobalt Press, Oxblood — see `06-palettes.html`. Pick one, mix, or keep Cellar.
