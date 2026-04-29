import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { createServerClient } from "@skilldrunk/supabase/server";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/ai", label: "AI" },
  { href: "/analytics", label: "Analytics" },
  { href: "/usage", label: "AI Usage" },
  { href: "/apps", label: "Apps" },
  { href: "/skills", label: "Skills" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
  { href: "/notifications", label: "Notifications" },
  { href: "/audit", label: "Audit" },
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
    // Admin görür: tüm aktif skilldrunk subdomain'leri (public + private),
    // marketplace dahil. enco-*.vercel.app vb. apex linkler dışarıda kalır.
    const { data } = await supabase
      .from("pt_apps")
      .select("slug, title, url, subdomain, tags")
      .neq("status", "archived")
      .or("subdomain.not.is.null,slug.eq.marketplace")
      .order("title", { ascending: true })
      .returns<SubdomainRow[]>();
    return data ?? [];
  } catch {
    // Nav must never fail the page render — empty list is acceptable degradation.
    return [];
  }
}

export async function AdminNav({ userLabel }: { userLabel?: string }) {
  const apps = await getSubdomains();

  return (
    <header className="border-b border-neutral-900 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-sm font-bold"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
              admin
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm text-neutral-400">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="hover:text-neutral-200"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            {userLabel && <span>{userLabel}</span>}
            <form action={signOut}>
              <button className="rounded border border-neutral-800 px-2.5 py-1 hover:bg-neutral-900">
                Çıkış
              </button>
            </form>
          </div>
        </div>

        {apps.length > 0 && (
          <div className="mt-2 flex items-center gap-3 overflow-x-auto pb-0.5">
            <span
              aria-hidden
              className="shrink-0 text-[11px] uppercase tracking-wider text-neutral-600"
            >
              ekosistem
            </span>
            <nav className="flex shrink-0 gap-1.5">
              {apps.map((a) => {
                const isCowork = (a.tags ?? []).includes("cowork-managed");
                return (
                  <a
                    key={a.slug}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    title={
                      isCowork
                        ? `${a.title} (Cowork-managed)`
                        : a.title
                    }
                    className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/40 px-2.5 py-0.5 text-[11.5px] text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-100"
                  >
                    {isCowork && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80"
                        aria-label="Cowork-managed"
                      />
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
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
