import Link from "next/link";

interface Props {
  area?: string;
  message: string;
  actions?: Array<{ label: string; href: string }>;
}

/**
 * D-011: every section must surface a coach message rather than render
 * blank. menu.json defines the default text per route; pages may pass
 * a section-specific override.
 */
export function EmptyStateCoach({ area, message, actions }: Props) {
  return (
    <div
      className="bd-surface"
      style={{
        padding: "20px 22px",
        textAlign: "center",
        background: "var(--bd-surface)",
        borderStyle: "dashed",
      }}
    >
      {area && (
        <p
          style={{
            fontSize: 10,
            color: "var(--bd-text-3)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: 0,
            marginBottom: 8,
            fontFamily: "var(--bd-font-mono)",
          }}
        >
          {area}
        </p>
      )}
      <p style={{ fontSize: 14, color: "var(--bd-text-2)", margin: 0 }}>{message}</p>
      {actions && actions.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                background: "var(--bd-accent-bg)",
                color: "var(--bd-accent-2)",
                border: "1px solid var(--bd-accent-bg-strong)",
                borderRadius: 999,
                textDecoration: "none",
              }}
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
