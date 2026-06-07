import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { createServerClient } from "@skilldrunk/supabase/server";
import { MoreSheet } from "./more-sheet";

/**
 * Full nav (shown in desktop top bar and inside mobile MoreSheet).
 * Order: most-used first.
 */
const NAV = [
  { href: "/", label: "Dashboard", icon: "◉" },
  { href: "/backlog", label: "Backlog", icon: "▤" },
  { href: "/custodian", label: "Custodian", icon: "🛡" },
  { href: "/ai", label: "AI", icon: "✦" },
  { href: "/map", label: "Map", icon: "◈" },
  { href: "/apps", label: "Apps", icon: "▦" },
  { href: "/usage", label: "AI Usage", icon: "$" },
  { href: "/analytics", label: "Analytics", icon: "▲" },
  { href: "/skills", label: "Skills", icon: "✶" },
  { href: "/users", label: "Users", icon: "◐" },
  { href: "/reports", label: "Reports", icon: "⚑" },
  { href: "/notifications", label: "Bildirimler", icon: "◔" },
  { href: "/audit", label: "Audit", icon: "◎" },
  { href: "/settings", label: "Ayarlar", icon: "⚙" },
];

/** Mobile bottom tab bar — 5 slots, last one opens MoreSheet. */
const TABS: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Home", icon: "◉" },
  { href: "/custodian", label: "Bekçi", icon: "🛡" },
  { href: "/ai", label: "AI", icon: "✦" },
  { href: "/map", label: "Map", icon: "◈" },
];

type SubdomainRow = {
  slug: string;
  title: string;
  url: string;
  subdomain: string | null;
  tags: string[] | null;
};

async function getSubdomains(): Promise<SubdomainRow[]> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("pt_apps")
      .select("slug, title, url, subdomain, tags")
      .neq("status", "archived")
      .or("subdomain.not.is.null,slug.eq.marketplace")
      .order("title", { ascending: true })
      .returns<SubdomainRow[]>();
    return data ?? [];
  } catch {
    return [];
  }
}

export async function AdminNav({ userLabel }: { userLabel?: string }) {
  const apps = await getSubdomains();
  const appLinks = apps.map((a) => ({
    slug: a.slug,
    title: a.title,
    url: a.url,
    subdomain: a.subdomain,
    isCowork: (a.tags ?? []).includes("cowork-managed"),
  }));

  return (
    <>
      {/* === Top bar (compact on mobile, full on sm+) === */}
      <header className="sticky top-0 z-40 safe-pt">
        <div className="glass border-b border-[color:var(--glass-border)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex h-12 items-center justify-between gap-4 sm:h-14">
              <Link
                href="/"
                className="flex items-center gap-2 font-mono text-sm font-bold"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                <span>admin</span>
              </Link>

              {/* Desktop nav — hidden on mobile */}
              <nav className="hidden sm:flex flex-wrap gap-4 text-sm text-neutral-400">
                {NAV.slice(0, 8).map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="hover:text-neutral-200 transition"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
                <a
                  href="https://skimsoulfat.com/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-neutral-800 px-2.5 py-1 hover:bg-neutral-900 hover:text-neutral-200"
                >
                  Docs ↗
                </a>
                {userLabel && <span>{userLabel}</span>}
                <form action={signOut}>
                  <button className="rounded-full border border-neutral-800 px-2.5 py-1 hover:bg-neutral-900">
                    Çıkış
                  </button>
                </form>
              </div>

              {/* Mobile-only: ekosistem chip count badge */}
              {appLinks.length > 0 && (
                <span className="sm:hidden text-[10px] font-mono text-neutral-500">
                  {appLinks.length} live
                </span>
              )}
            </div>

            {/* Desktop ekosistem chips */}
            {appLinks.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 overflow-x-auto pb-2 -mt-1">
                <span
                  aria-hidden
                  className="shrink-0 text-[11px] uppercase tracking-wider text-neutral-600"
                >
                  ekosistem
                </span>
                <nav className="flex shrink-0 gap-1.5">
                  {appLinks.map((a) => (
                    <a
                      key={a.slug}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      title={
                        a.isCowork ? `${a.title} (Cowork-managed)` : a.title
                      }
                      className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/40 px-2.5 py-0.5 text-[11.5px] text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100"
                    >
                      {a.isCowork && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80" />
                      )}
                      <span className="font-mono">
                        {a.subdomain ?? a.slug}
                      </span>
                      <span
                        aria-hidden
                        className="text-neutral-600 group-hover:text-neutral-400"
                      >
                        ↗
                      </span>
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* === Bottom tab bar — mobile only === */}
      <nav
        aria-label="Ana navigasyon"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 safe-pb"
      >
        <div className="mx-3 mb-3 glass-strong rounded-2xl">
          <div className="grid grid-cols-5 px-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-col items-center justify-center gap-1 touch-target text-neutral-400 active:text-orange-400"
              >
                <span aria-hidden className="text-[18px] leading-none">{t.icon}</span>
                <span className="text-[10px]">{t.label}</span>
              </Link>
            ))}
            <MoreSheet
              trigger={null}
              nav={NAV}
              apps={appLinks}
              userLabel={userLabel}
            />
          </div>
        </div>
      </nav>

      {/* Spacer so content doesn't get hidden behind bottom nav on mobile */}
      <div aria-hidden className="sm:hidden h-20" />
    </>
  );
}
