# skilldrunk — Ecosystem & Information Architecture

> The real product is the **inside**. This maps every subdomain/page today, then reorganises them into the two-layer IA (Window + Mine). Source of truth: vault `Sistemler/Code-Registry/Domain-Map`.

---

## 1. Inventory (today)

### Apex `skilldrunk.com` — public library (no path-routing except `/code`)
| Tab | Path | Meaning |
|---|---|---|
| Trending | `/` | Community's rising AI skills |
| Arena | `/arena` | Head-to-head skill voting → Elo |
| Leaderboard | `/leaderboard` | Elo ranking |
| Search | `/search` | Find skills (MCP / Skill / GPT / Cursor Rule / Prompt / Agent) |
| Find AI | `/find` | AI-assisted discovery |
| About | `/about` | Platform / Skills spec |
| Docs | `/docs` | API / integration |
| Submit | `/submit` | Submit a skill |
| **Code Roadmap** | `/code` | **Özgür's project roadmap — priority/status of every project** |
| Skill detail | `/s/[slug]` | Single skill page |
| Profile / Tag / Feed | `/u/[username]`, `/tag/[tag]`, `/feed` | Social surfaces |

### Subdomains — the toolbelt (each = its own Vercel project)
| Host | State | Function | Public? |
|---|:--:|---|:--:|
| admin.* | 🔒 | Central auth + management (TR email+password) | curator |
| analiz.* | 🔒 | Finance/data analysis (ENCO) | curator |
| rasyotek.* | 🔒 | Ratio/metric analysis | curator |
| brief.* | 🔒 | Briefing tool | curator |
| leads.* | 🔒 | ENCO sales-lead portal (magic-link) | curator |
| tasks.* | 🔒 | AI-aware Kanban | curator |
| tahsilat.* | 🔒 | Collections/payments panel | curator |
| pts.* | 🔒 | Enko Express budget simulator | curator |
| prototip.* | 🟢 | Portfolio/ecosystem showcase (10 projects) | public |
| quotes.* | 🟢 | "Daily Dose" daily quote | public |
| worldcup2026.* | 🟢 | FIFA 2026 tracker (104 matches) | public |
| ngmars.* | 🟢 | NG marş event experience | public |

> 4 public toys (prototip, quotes, worldcup2026, ngmars) + the public library = the **Window's** raw material. Everything 🔒 = the **Mine**.

---

## 2. Layer 0 — **The Window** (public, one cinematic scroll)

Minimal chrome. A pinned, scroll-scrubbed narrative — not a nav-heavy app.

**Top bar (thin, transparent → solid on scroll):** `skilldrunk` wordmark · *Library* · *Arena* · *Live* · **Enter** (primary). That's it.

**The scroll (sections):**
1. **Hero** — wordmark + one line ("Drunk on skill. A curated library of what makes AI useful.") + count ("511 skills, one taste"). Slow gold light reveal.
2. **The Library** — 3–5 *editor's pick* skills as large editorial cards (not a grid wall). "Chosen, not crowded."
3. **The Arena** — one live head-to-head, Elo ticking; framed as spectacle. CTA: *Cast a vote*.
4. **Live** — the public toys as a marquee/rail: Daily Dose, World Cup 2026, the prototype showcase, ngmars. "The estate is alive."
5. **The Door** — full-bleed: **Enter** (sign in) + *Submit a skill*. "Past here, it's the curator's domain."

**Principles:** ≤5 sections, one idea each; type-led; gold accent used sparingly as *light*; motion scrubs to scroll (no autoplay chaos).

---

## 3. Layer 1 — **The Mine** (logged-in command center)

One shell wrapping every tool. Single sign-in (extend `admin.*` central auth as SSO across subdomains).

**Frame:**
- **Left rail** (collapsible) — grouped destinations (below).
- **Top bar** — breadcrumb · global search · ⌘K · mode/palette toggle · curator avatar.
- **⌘K Command bar** — jump to any tool/page across subdomains, run quick actions ("New skill", "Open analiz", "Add roadmap card"). The single most important interaction.
- **Content** — each tool renders in-shell (iframe/portal or absorbed route); external subdomains open in-shell with consistent header.

**Left-rail groups:**
| Group | Contains |
|---|---|
| **Library** | Skills, Submission queue, Arena/Leaderboard moderation, Tags, Skill detail editor |
| **Roadmap** | `/code` board — all projects, priority/status (Daimler RFI, eActros, ERP chatbot, ENCOLAY, FAT…) |
| **Toolbelt (ENCO)** | analiz · rasyotek · brief · leads · tahsilat · pts |
| **Work** | tasks (Kanban), today/overdue, AI triage |
| **Showcase** | prototip · quotes · worldcup2026 · ngmars (public toys, manage + preview) |
| **System** | Domain-Custodian (health), Design System, Code-Registry, Disaster-Recovery flags |

**Home of the Mine ("The Desk"):** a single landing that answers *"what needs me right now?"* — cross-tool: roadmap deadlines, submission queue depth, tool health (custodian), today's tasks, latest deploys. One calm overview, the curator's morning room.

---

## 4. Cross-cutting

- **Auth/SSO:** one identity across apex + subdomains (build on existing `admin.*` central auth). Public Window needs none; the Door triggers sign-in.
- **Search vs ⌘K:** Search = find *skills/content*; ⌘K = go *anywhere* / do *anything*. Both everywhere inside.
- **Consistency contract:** every subdomain tool adopts the shared shell header + tokens, even if it stays a separate deploy. Visual unity without forcing a rewrite.
- **DR note (non-design):** analiz/rasyotek/brief/leads/tasks/prototip have **no local source** — flag in System group; surfacing it here is itself a feature.

---

## 5. Migration stance (low-risk)

1. Keep "one tool = one subdomain/deploy." Don't rewrite.
2. Ship the **shared shell** (header + rail + ⌘K + tokens) as a thin layer each tool embeds.
3. Rebuild only two things from scratch: the **public Window** (apex `/`) and the **Mine "Desk"** (the logged-in home). Everything else gets re-skinned into the shell over time.
4. Order: Window → Desk → re-skin Library → absorb toys → wrap ENCO tools.
