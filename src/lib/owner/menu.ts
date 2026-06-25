import type { MenuConfig } from "@skilldrunk/brain-ui";

/**
 * Sidebar menu config for skilldrunk owner shell.
 * D-011 — every item carries an `emptyStateCoach` so pages never render blank.
 *
 * Source of truth: 02-skilldrunk-spec.md §3.
 */
export const SKILLDRUNK_MENU: MenuConfig = {
  brand: { label: "skilldrunk", href: "/home" },
  items: [
    {
      key: "home",
      label: "Dashboard",
      href: "/home",
      icon: "◉",
      emptyStateCoach: {
        message:
          "Dashboard veri bekliyor. AI digest sabah 06:00'da hazırlanır.",
      },
    },
    {
      key: "catalog",
      label: "Catalog",
      href: "/catalog",
      icon: "▦",
      emptyStateCoach: {
        message:
          "Katalog boş — ingest script'lerini çalıştır veya manuel ekle.",
        actions: [{ label: "Manuel ekle", href: "/catalog/add" }],
      },
    },
    {
      key: "analytics",
      label: "Analytics",
      href: "/analytics",
      icon: "▲",
      children: [
        { key: "ga-skilldrunk", label: "GA4 — Skilldrunk", href: "/analytics?site=skilldrunk" },
        { key: "ga-enco", label: "GA4 — ENCO", href: "/analytics?site=enco" },
        { key: "ga-movetech", label: "GA4 — MoveTech", href: "/analytics?site=movetech" },
        { key: "ga-encolay", label: "GA4 — ENCOLAY", href: "/analytics?site=encolay" },
      ],
      emptyStateCoach: {
        message:
          "Analytics henüz bağlı değil. GA4 mülklerini ekosistem haritasından bağla.",
        actions: [{ label: "Ayarlar", href: "/settings" }],
      },
    },
    {
      key: "companies",
      label: "Companies",
      href: "/companies",
      icon: "◐",
      children: [
        { key: "enco", label: "ENCO", href: "/companies/enco" },
        { key: "movetech", label: "MoveTech", href: "/companies/movetech" },
        { key: "encolay", label: "ENCOLAY", href: "/companies/encolay" },
        { key: "futurecode", label: "FutureCode", href: "/companies/futurecode" },
        { key: "greenix", label: "Greenix", href: "/companies/greenix" },
      ],
      emptyStateCoach: {
        message:
          "Şirket sayfaları taslak halinde. ENCO template'inden başlatabilirsin.",
      },
    },
    {
      key: "projects",
      label: "Projects",
      href: "/projects",
      icon: "▢",
      children: [
        { key: "daimler-rfi", label: "Daimler RFI", href: "/projects/daimler-rfi" },
        { key: "eactros-tco", label: "eActros TCO", href: "/projects/eactros-tco" },
        { key: "movetech-portal", label: "MoveTech Portal", href: "/projects/movetech-portal" },
        { key: "driver-visa", label: "Driver/Visa MVP", href: "/projects/driver-visa" },
      ],
      emptyStateCoach: {
        message:
          "Aktif projeler buraya gelir. Obsidian Projects/ klasöründen senkron.",
      },
    },
    {
      key: "ops",
      label: "Operations",
      href: "/ops",
      icon: "⚙",
      children: [
        { key: "backlog", label: "Backlog", href: "/ops/backlog" },
        { key: "scheduled", label: "Scheduled Tasks", href: "/ops/scheduled" },
        { key: "bots", label: "Bot Health", href: "/ops/bots" },
        { key: "deploys", label: "Deploys", href: "/ops/deploys" },
      ],
      emptyStateCoach: {
        message: "Operasyon ekranları kuruluyor.",
      },
    },
    {
      key: "library",
      label: "Library",
      href: "/library",
      icon: "✶",
      children: [
        { key: "decisions", label: "Decisions", href: "/library/decisions" },
        { key: "briefings", label: "Briefings", href: "/library/briefings" },
        { key: "reviews", label: "Reviews", href: "/library/reviews" },
      ],
      emptyStateCoach: {
        message:
          "Kararlar, brief'ler, review'lar burada toplanır. brief.skilldrunk.com bağlı.",
      },
    },
    {
      key: "ask",
      label: "Ask Brain",
      href: "/ask",
      icon: "✦",
      emptyStateCoach: {
        message:
          "Soru sor — geçmiş projeler, kararlar, aktivite üzerinden cevap üretilir.",
      },
    },
  ],
  footer: {
    avatarLabel: "Özgür",
    crossover: { label: "skimsoulfat", href: "https://skimsoulfat.com" },
  },
};
