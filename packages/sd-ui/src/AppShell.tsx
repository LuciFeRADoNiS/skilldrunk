import Link from "next/link";
import type { NavLink, SubdomainRow } from "./types";

export interface AppShellProps {
  appName: string;
  appColor?: "orange" | "cyan" | "purple" | "green" | "blue" | "pink";
  nav: NavLink[];
  ecosystem?: SubdomainRow[];
  currentPath?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

const COLOR_CLASS: Record<string, string> = {
  orange: "var(--sd-accent)",
  cyan: "var(--sd-cyan)",
  purple: "#a78bfa",
  green: "var(--sd-success)",
  blue: "var(--sd-info)",
  pink: "#f472b6",
};

export function AppShell({
  appName,
  appColor = "orange",
  nav,
  ecosystem,
  currentPath,
  rightSlot,
  children,
}: AppShellProps) {
  const dotColor = COLOR_CLASS[appColor] ?? COLOR_CLASS.orange;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--sd-border)",
          background: "var(--sd-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ padding: "10px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Link
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--sd-font-mono)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--sd-text)",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: dotColor,
                  }}
                />
                {appName}
              </Link>
              <nav style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {nav.map((n) => {
                  const active =
                    n.href === "/"
                      ? currentPath === "/"
                      : currentPath?.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`sd-nav-item${active ? " sd-nav-item-active" : ""}`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            {rightSlot && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {rightSlot}
              </div>
            )}
          </div>

          {ecosystem && ecosystem.length > 0 && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 2,
              }}
            >
              <span
                aria-hidden
                className="sd-section-label"
                style={{ flexShrink: 0 }}
              >
                ekosistem
              </span>
              <nav style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {ecosystem.map((a) => {
                  const isCowork = (a.tags ?? []).includes("cowork-managed");
                  return (
                    <a
                      key={a.slug}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      title={
                        isCowork ? `${a.title} (Cowork-managed)` : a.title
                      }
                      className="sd-eco-pill"
                    >
                      {isCowork && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--sd-warn)",
                          }}
                          aria-label="Cowork-managed"
                        />
                      )}
                      <span>{a.subdomain ?? a.slug}</span>
                      <span
                        aria-hidden
                        style={{ color: "var(--sd-text-3)", fontSize: 10 }}
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
      <main
        style={{
          flex: 1,
          padding: "20px 24px",
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
