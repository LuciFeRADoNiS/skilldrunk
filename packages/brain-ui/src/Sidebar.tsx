import Link from "next/link";
import type { MenuConfig, MenuItem } from "./types";

interface Props {
  menu: MenuConfig;
  pathname: string;
}

const DOT_COLOR: Record<NonNullable<MenuItem["dot"]>, string> = {
  live: "var(--bd-success)",
  warn: "var(--bd-warn)",
  off: "var(--bd-text-3)",
};

function NavRow({ item, pathname }: { item: MenuItem; pathname: string }) {
  const isActive =
    !item.external &&
    (pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)));

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: "var(--bd-radius-sm)",
    color: isActive ? "var(--bd-text)" : "var(--bd-text-2)",
    background: isActive ? "var(--bd-accent-bg)" : "transparent",
    borderLeft: isActive
      ? "2px solid var(--bd-accent)"
      : "2px solid transparent",
    fontSize: 14,
    textDecoration: "none",
    marginLeft: -2,
  };

  const inner = (
    <>
      {item.icon && (
        <span aria-hidden style={{ width: 18 }}>
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.dot && (
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: DOT_COLOR[item.dot],
            boxShadow:
              item.dot === "live" ? `0 0 6px ${DOT_COLOR.live}` : undefined,
          }}
        />
      )}
      {item.badge !== undefined && <span className="bd-chip">{item.badge}</span>}
      {item.external && (
        <span aria-hidden style={{ fontSize: 11, color: "var(--bd-text-3)" }}>
          ↗
        </span>
      )}
    </>
  );

  return (
    <div style={{ marginBottom: 2 }}>
      {item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer" style={rowStyle}>
          {inner}
        </a>
      ) : (
        <Link href={item.href} style={rowStyle} aria-current={isActive ? "page" : undefined}>
          {inner}
        </Link>
      )}
      {item.children && isActive && (
        <div style={{ marginLeft: 28, marginTop: 2 }}>
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.key}
                href={child.href}
                style={{
                  display: "block",
                  padding: "5px 10px",
                  borderRadius: "var(--bd-radius-sm)",
                  color: childActive ? "var(--bd-text)" : "var(--bd-text-3)",
                  fontSize: 13,
                  textDecoration: "none",
                  background: childActive ? "var(--bd-accent-bg)" : "transparent",
                }}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Server-rendered sidebar. Renders grouped sections (design/01 §3) when
 * `menu.groups` is set; falls back to the legacy flat `menu.items` (admin app).
 * Active state derived from pathname server-side for correct first paint.
 */
export function Sidebar({ menu, pathname }: Props) {
  return (
    <aside
      aria-label="Owner navigation"
      style={{
        width: "var(--bd-sidebar-w)",
        background: "var(--bd-bg-2)",
        borderRight: "1px solid var(--bd-border)",
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--bd-border)" }}>
        <Link
          href={menu.brand.href}
          style={{
            color: "var(--bd-text)",
            fontFamily: "var(--bd-font-display)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            fontSize: 17,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--bd-accent)",
              boxShadow: "0 0 10px var(--bd-accent)",
            }}
          />
          {menu.brand.label}
        </Link>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {menu.groups
          ? menu.groups.map((group) => (
              <div key={group.key} style={{ marginBottom: 14 }}>
                <p
                  style={{
                    margin: "8px 12px 4px",
                    fontFamily: "var(--bd-font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--bd-text-3)",
                  }}
                >
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavRow key={item.key} item={item} pathname={pathname} />
                ))}
              </div>
            ))
          : (menu.items ?? []).map((item) => (
              <NavRow key={item.key} item={item} pathname={pathname} />
            ))}
      </nav>

      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid var(--bd-border)",
          fontSize: 12,
          color: "var(--bd-text-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{menu.footer?.avatarLabel ?? ""}</span>
        {menu.footer?.crossover && (
          <a
            href={menu.footer.crossover.href}
            style={{ color: "var(--bd-accent-2)", textDecoration: "none", fontSize: 11 }}
          >
            {menu.footer.crossover.label} →
          </a>
        )}
      </div>
    </aside>
  );
}
