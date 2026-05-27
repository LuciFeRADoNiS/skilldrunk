import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { MenuConfig } from "./types";

interface Props {
  menu: MenuConfig;
  pathname: string;
  breadcrumb: ReactNode;
  search?: ReactNode;
  notificationsBadge?: number;
  calendarBadge?: number;
  userLabel?: string;
  children: ReactNode;
}

/**
 * Owner shell layout — sidebar + topbar + content area.
 * Pure server component for Faz 2 (no mobile drawer yet — sidebar collapses
 * to icon-only on narrow widths via CSS only). Mobile drawer toggle is
 * planned for Faz 2.5 as a client wrapper.
 */
export function OwnerLayout({
  menu,
  pathname,
  breadcrumb,
  search,
  notificationsBadge,
  calendarBadge,
  userLabel,
  children,
}: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--bd-sidebar-w) 1fr",
        minHeight: "100vh",
        background: "var(--bd-bg)",
        color: "var(--bd-text)",
        fontFamily: "var(--bd-font-display)",
      }}
      data-owner-shell
    >
      <Sidebar menu={menu} pathname={pathname} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar
          breadcrumb={breadcrumb}
          search={search}
          notificationsBadge={notificationsBadge}
          calendarBadge={calendarBadge}
          userLabel={userLabel}
        />
        <main style={{ padding: "24px", flex: 1, minWidth: 0 }}>{children}</main>
      </div>
      <style>{`
        @media (max-width: 768px) {
          [data-owner-shell] {
            grid-template-columns: 1fr !important;
          }
          [data-owner-shell] > aside {
            position: fixed !important;
            inset: auto 0 0 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: 56vh;
            border-right: 0 !important;
            border-top: 1px solid var(--bd-border) !important;
            z-index: 30;
          }
          [data-owner-shell] > div > main {
            padding-bottom: 200px !important;
          }
        }
      `}</style>
    </div>
  );
}
