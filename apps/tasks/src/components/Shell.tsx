import { AppShell } from "@skilldrunk/sd-ui";
import type { SubdomainRow } from "@skilldrunk/sd-ui";
import { createServerClient } from "@skilldrunk/supabase/server";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/bots", label: "Bots" },
  { href: "/cost", label: "Cost" },
  { href: "/alerts", label: "Alerts" },
];

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

export async function Shell({
  currentPath,
  children,
}: {
  currentPath?: string;
  children: React.ReactNode;
}) {
  const ecosystem = await getSubdomains();
  return (
    <AppShell
      appName="tasks"
      appColor="cyan"
      nav={NAV}
      currentPath={currentPath}
      ecosystem={ecosystem}
      rightSlot={
        <>
          <a
            href="https://skimsoulfat.com/docs"
            target="_blank"
            rel="noreferrer"
            className="sd-btn"
            style={{ fontSize: 11 }}
            title="Kullanım Kılavuzu"
          >
            Docs ↗
          </a>
          <span style={{ fontSize: 11, color: "var(--sd-text-3)" }}>
            admin only
          </span>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
