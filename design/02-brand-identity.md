# skilldrunk — Brand Identity

> Own identity, distinct from EGV — but inheriting EGV's **token discipline** and editorial DNA. Theme name: **"Cellar."**

---

## 1. Idea

**Drunk on skill.** Connoisseurship, not consumption. A cellar curated by one palate; a **gold mine** ("maden") of skills you walk into. The whole system reads as *warm archive lit by gold*.

The single ownable equity is **gold** — triple-coded:
- the gold **mine** (your "maden"),
- the gilt-edged **library** (archive, stacks),
- the golden **spirit** in the glass ("drunk").

## 2. Wordmark — `skilldrunk`

Always lowercase, one word, tight tracking. Three directions to choose from:

- **A · Editorial (recommended):** set in **Fraunces** (high-contrast serif), the "ll" subtly extended. Feels like a rare book spine. Curatorial, premium.
- **B · Tipsy:** Geist-based wordmark with the **"u" rotated a few degrees** — one letter "drunk." Witty, modern, restrained.
- **C · Seam:** a thin **gold underline that breaks** mid-word like a vein of ore. Signals "mine" without a literal icon.

**Logomark options (for favicon / avatar / app):**
1. **Keyhole-into-gold** — a keyhole whose interior is a gold gradient (the Door → the Mine).
2. **`sd` ligature** as a wine-glass/decanter silhouette.
3. **Gold seam "/"** — a single struck stroke, like a tally mark / pour. Cleanest, scales to 16px.

> Pick 1 wordmark + 1 mark; the mockups will render **A + keyhole/seam** as default.

## 3. Color — "Cellar" (own palette, EGV architecture)

Base of **ink + parchment**, lit by **gold**, with **oxblood** for accent moments. Full values in `03-design-tokens.css`; summary:

| Role | Light | Dark ("night cellar") |
|---|---|---|
| Background (parchment / ink) | `#f3ece0` | `#0d0b07` |
| Elevated surface | `#faf4e9` | `#17130c` |
| Ink (text) | `#181208` | `#f3ece0` |
| Ink soft | `#5a4f3d` | `#b3a890` |
| **Accent — gold** | `#b8801f` | `#e8b54a` (glow) |
| Accent contrast (text on gold) | `#faf4e9` | `#1a1305` |
| **Wine (oxblood) — secondary** | `#7a1f2b` | `#cf5563` |
| Positive / Warn / Danger | `#2f6a3f` / `#b07a1a` / `#b33a2a` | `#5fbf7a` / `#d6a23a` / `#e0675a` |

**Usage:** gold is *light*, not fill — used for the accent stroke, the live numbers, the Door, focus. Oxblood is rare: Arena "live," destructive, the "drunk" wink. Never both loud at once. (Distinct on purpose from EGV terracotta `#c8451c` / lime `#d9f25c`.)

## 4. Typography

Inherits EGV's serif-display + Geist + mono structure, but swaps the display face for character:

| Role | Face | Use |
|---|---|---|
| **Display** | **Fraunces** (variable, high optical contrast, "wonky" on) | Hero lines, section heads, editor's notes, the wordmark |
| **Sans** | **Geist** | Body, UI, dense inside surfaces |
| **Mono** | **Geist Mono** | Kickers, labels, counts, Elo, code, timestamps |

All three load via `next/font/google`. Rhythm: **mono kicker (uppercase, tracked) → Fraunces headline → Geist body.** That three-beat is the brand's signature on every screen.

Scale (suggested, rem): 0.75 · 0.875 · 1 · 1.25 · 1.625 · 2.25 · 3.25 · 4.75 · 6.5. Display sizes use Fraunces optical `opsz` high; body locks `opsz` ~9–14.

## 5. Motion language

- **Window (outside):** *filmic.* Scroll-scrubbed reveals, slow gold light sweeps, a "pour/fill" motif (gold filling a shape as you scroll), parallax restraint. 60fps, `prefers-reduced-motion` honored. (Playbook: the `landonorris-web-skill` patterns — pinned sections, Lenis smooth-scroll, GSAP ScrollTrigger.)
- **Mine (inside):** *instrumented.* 120–180ms ease-out micro-transitions, content never blocked by animation, ⌘K springs in, numbers count up once. Calm, fast, precise.

Easing: `--ease-out: cubic-bezier(.2,.7,.2,1)`. Durations: `--t-fast 140ms`, `--t 240ms`, `--t-slow 520ms`, cinematic `900–1400ms`.

## 6. Voice & tone

Editorial, confident, a little intoxicated — never sloppy. Mono kickers state the category; Fraunces lines carry the wit; Geist explains plainly.

- Tagline: **"Drunk on skill."**
- Hero: *"A curated library of what makes AI useful. Chosen, not crowded."*
- Arena: *"Two skills walk into a bar. You decide who leaves."*
- Empty state (inside): *"Nothing on the desk. Suspicious."*
- Door: *"Past here, it's the curator's domain."*

Rules: one wink per screen, max. Never exclaim twice. Numbers are quiet (mono), claims are calm.

## 7. Texture & imagery

- Subtle **paper grain** on parchment; faint **gold-leaf** specular on hero; **candlelight** radial gradients in dark mode.
- Skill cards = *editorial plates*: generous margin, a kicker, a Fraunces title, one line, one number. No tag soup on the surface.
- Avoid: stocky AI clip-art, neon gradients, glassmorphism, drop-shadow heavy "SaaS" cards.

## 8. Do / Don't

| Do | Don't |
|---|---|
| Gold as light & focus | Gold as big fills |
| One idea per screen | Wall of cards |
| mono → Fraunces → Geist rhythm | Random font mixing |
| Curatorial copy ("chosen") | Crowd metrics shouting |
| Warm neutrals, real contrast | Cold grey SaaS palette |
| Inherit EGV token system | Re-use EGV terracotta/lime hues |
