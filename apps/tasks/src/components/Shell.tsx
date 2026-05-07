import Link from "next/link";
import { createServerClient } from "@skilldrunk/supabase/server";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "Cowork Tasks" },
  { href: "/bots", label: "Bot Health" },
  { href: "/cost", label: "Cost" },
  { href: "/alerts", label: "Alerts" },
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

export async function Shell({ children }: { children: React.ReactNode }) {
  const apps = await getSubdomains();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-900 bg-neutral-950">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-mono text-sm font-bold"
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500" />
                tasks
              </Link>
              <nav className="flex flex-wrap gap-4 text-sm text-neutral-400">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="hover:text-neutral-200 transition"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="text-xs text-neutral-500">admin only</div>
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
      <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
