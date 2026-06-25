import type { MenuConfig } from "@skilldrunk/brain-ui";

/**
 * Sidebar menu for the skilldrunk private "Mine" — grouped rail (design/01 §3).
 * Internal items point at existing (owner) routes; external items launch the
 * sibling subdomains (separate Vercel apps) in a new tab. As new Mine routes
 * land (/skills P6, /code /work /system P8) they get promoted into these groups.
 */
const SUB = (host: string) => `https://${host}.skilldrunk.com`;

export const SKILLDRUNK_MENU: MenuConfig = {
  brand: { label: "skilldrunk", href: "/home" },
  groups: [
    {
      key: "desk",
      label: "The Desk",
      items: [
        { key: "home", label: "Dashboard", href: "/home", icon: "◉" },
        { key: "ask", label: "Ask Brain", href: "/ask", icon: "✦" },
      ],
    },
    {
      key: "library",
      label: "Library",
      items: [
        { key: "catalog", label: "Catalog", href: "/catalog", icon: "▦" },
        {
          key: "refs",
          label: "Refs",
          href: "/library",
          icon: "✶",
          children: [
            { key: "decisions", label: "Decisions", href: "/library/decisions" },
            { key: "briefings", label: "Briefings", href: "/library/briefings" },
            { key: "reviews", label: "Reviews", href: "/library/reviews" },
          ],
        },
      ],
    },
    {
      key: "work",
      label: "Work",
      items: [
        {
          key: "ops",
          label: "Operations",
          href: "/ops",
          icon: "⚙",
          children: [
            { key: "backlog", label: "Backlog", href: "/ops/backlog" },
            { key: "scheduled", label: "Scheduled", href: "/ops/scheduled" },
            { key: "bots", label: "Bot Health", href: "/ops/bots" },
            { key: "deploys", label: "Deploys", href: "/ops/deploys" },
          ],
        },
        { key: "projects", label: "Projects", href: "/projects", icon: "▢" },
      ],
    },
    {
      key: "system",
      label: "System",
      items: [
        { key: "analytics", label: "Analytics", href: "/analytics", icon: "▲" },
        { key: "companies", label: "Companies", href: "/companies", icon: "◐" },
        { key: "admin", label: "Admin panel", href: SUB("admin"), icon: "⛭", external: true },
      ],
    },
    {
      key: "toolbelt",
      label: "Toolbelt · ENCO",
      items: [
        { key: "analiz", label: "Analiz", href: SUB("analiz"), icon: "∿", external: true },
        { key: "rasyotek", label: "Rasyotek", href: SUB("rasyotek"), icon: "÷", external: true },
        { key: "brief", label: "Brief", href: SUB("brief"), icon: "✉", external: true },
        { key: "leads", label: "Leads", href: SUB("leads"), icon: "◎", external: true },
        { key: "tahsilat", label: "Tahsilat", href: SUB("tahsilat"), icon: "₺", external: true },
        { key: "pts", label: "PTS", href: SUB("pts"), icon: "∑", external: true },
      ],
    },
    {
      key: "showcase",
      label: "Showcase",
      items: [
        { key: "prototip", label: "Prototip", href: SUB("prototip"), icon: "◳", external: true, dot: "live" },
        { key: "quotes", label: "Daily Dose", href: SUB("quotes"), icon: "❝", external: true, dot: "live" },
        { key: "worldcup", label: "World Cup 2026", href: SUB("worldcup2026"), icon: "⚽", external: true, dot: "live" },
        { key: "ngmars", label: "NG Marş", href: SUB("ngmars"), icon: "♪", external: true, dot: "live" },
      ],
    },
  ],
  footer: {
    avatarLabel: "Özgür",
    crossover: { label: "skimsoulfat", href: "https://skimsoulfat.com" },
  },
};
