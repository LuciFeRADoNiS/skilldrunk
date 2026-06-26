# skilldrunk — kickoff prompt for **Claude Design** (paste after attaching the 8 files)

---

You are Claude Design. I've attached the skilldrunk design package (8 files). Read them, then build two high-fidelity, token-driven prototypes.

## Package (attached)
- `00-concept-brief.md`, `01-ecosystem-and-ia.md`, `02-brand-identity.md` — the thinking
- `03-design-tokens.css` — the token system = **single source of truth** (4 palettes, light/dark)
- `04-front-window.html`, `05-inside-mine.html` — reference mockups (elevate these to high fidelity)
- `06-palettes.html`, `07-logo-explorations.html` — palette + wordmark options

## Build two prototypes
1. **The public WINDOW** (route `/`): cinematic, passwordless, scroll-driven — Hero → Library editor's picks → Arena spectacle → Live marquee → The Door.
2. **The inside MINE "Desk"** (logged-in home, curator-only): top bar + left rail (Library / Roadmap / ENCO toolbelt / Work / Showcase / System) + ⌘K command palette + "what needs me now" cards + the estate grid.

## Non-negotiables
- Identity **"Cellar"**: ink + parchment + **gold** + oxblood. Default **dark** (`data-mode="dark"`).
- Type: **Fraunces** (display) · **Geist** (sans) · **Geist Mono** (kicker/labels/numbers). Rhythm: mono kicker → Fraunces headline → Geist body.
- **Tokens are law** — pull color/spacing/radius/type from `03-design-tokens.css`; no hardcoded hex. Include a **mode + palette toggle** (cellar / ultraviolet / cobalt / oxblood).
- Recommended wordmark: **A (editorial Fraunces) + gold-seam mark**. The Mine is **curator-only** (single operator) — no member/social UI.
- Responsive, WCAG AA contrast, keyboard-navigable, honor `prefers-reduced-motion`.

## Deliverable
Two polished, self-contained prototypes (Window + Mine Desk) I can click through. (Repo wiring / branch / PR is a separate Claude Code job — not needed here.)

**Start:** read the 8 files, restate your build plan in 5 bullets, then build the Window first, then the Mine Desk.
