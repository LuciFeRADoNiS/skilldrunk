import type { ReactNode } from "react";
import { EmptyStateCoach } from "@skilldrunk/brain-ui";

/**
 * Shared header strip + empty-state coach wrapper for stub-stage pages.
 * D-011: even minimal pages render a coach card instead of "nothing here".
 */
export function PageShell({
  eyebrow,
  title,
  description,
  children,
  coach,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
  coach?: { message: string; actions?: Array<{ label: string; href: string }> };
}) {
  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <p
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--bd-text-3)",
            margin: 0,
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: "var(--bd-text-2)", margin: "6px 0 0 0" }}>
            {description}
          </p>
        )}
      </header>
      {children}
      {coach && (
        <div style={{ marginTop: children ? 18 : 0 }}>
          <EmptyStateCoach message={coach.message} actions={coach.actions} />
        </div>
      )}
    </div>
  );
}
