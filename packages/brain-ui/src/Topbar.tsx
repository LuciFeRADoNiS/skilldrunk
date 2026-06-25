import type { ReactNode } from "react";

interface Props {
  breadcrumb: ReactNode;
  search?: ReactNode;
  notificationsBadge?: number;
  calendarBadge?: number;
  userLabel?: string;
}

/**
 * Sticky topbar — breadcrumb + ⌘K search + notifications + calendar + avatar.
 * Search trigger and notifications dropdown are passed as ReactNode so the
 * shell controls behavior, brain-ui only ships the visual chrome.
 */
export function Topbar({
  breadcrumb,
  search,
  notificationsBadge,
  calendarBadge,
  userLabel,
}: Props) {
  return (
    <header
      style={{
        height: "var(--bd-topbar-h)",
        background: "var(--bd-bg)",
        borderBottom: "1px solid var(--bd-border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 18,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ flex: 1, fontSize: 13, color: "var(--bd-text-2)" }}>
        {breadcrumb}
      </div>
      {search && <div>{search}</div>}
      <button
        type="button"
        aria-label="Bildirimler"
        style={{
          position: "relative",
          background: "transparent",
          border: "1px solid var(--bd-border)",
          color: "var(--bd-text-2)",
          borderRadius: "var(--bd-radius-sm)",
          padding: "6px 9px",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        🔔
        {notificationsBadge !== undefined && notificationsBadge > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: "var(--bd-danger)",
              color: "white",
              fontSize: 9,
              display: "grid",
              placeItems: "center",
              padding: "0 4px",
            }}
          >
            {notificationsBadge}
          </span>
        )}
      </button>
      <div
        style={{
          fontSize: 12,
          color: "var(--bd-text-2)",
          padding: "4px 8px",
          border: "1px solid var(--bd-border)",
          borderRadius: "var(--bd-radius-sm)",
        }}
      >
        📅 {calendarBadge ?? 0} bugün
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "var(--bd-accent-bg-strong)",
          color: "var(--bd-accent-2)",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 600,
        }}
        aria-label={userLabel ?? "User"}
      >
        {(userLabel ?? "U").slice(0, 1).toUpperCase()}
      </div>
    </header>
  );
}
