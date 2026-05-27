import { EmptyStateCoach } from "./EmptyStateCoach";

export interface BacklogRow {
  id: number;
  title: string;
  priority: number; // 1-5
  status: string;
  project?: string | null;
  url?: string;
}

interface Props {
  rows: BacklogRow[];
  emptyCoach?: { message: string; actions?: Array<{ label: string; href: string }> };
}

const PRIORITY_COLOR: Record<number, string> = {
  1: "var(--bd-danger)",
  2: "var(--bd-warn)",
  3: "var(--bd-accent-2)",
  4: "var(--bd-text-3)",
  5: "var(--bd-text-3)",
};

export function BacklogPanel({ rows, emptyCoach }: Props) {
  if (!rows.length) {
    return (
      <EmptyStateCoach
        area="backlog"
        message={
          emptyCoach?.message ??
          "Backlog temiz 🎉 Yeni hedef ekle veya bugünkü AI digest'i oku."
        }
        actions={emptyCoach?.actions}
      />
    );
  }
  return (
    <section className="bd-surface" style={{ padding: 0 }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--bd-border)",
          fontSize: 12,
          color: "var(--bd-text-3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>backlog · top {rows.length}</span>
        <span style={{ fontFamily: "var(--bd-font-mono)" }}>P1+</span>
      </header>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li
            key={r.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 16px",
              borderBottom: "1px solid var(--bd-border)",
              alignItems: "center",
            }}
          >
            <span
              aria-label={`Priority ${r.priority}`}
              style={{
                width: 22,
                fontSize: 11,
                fontFamily: "var(--bd-font-mono)",
                color: PRIORITY_COLOR[r.priority] ?? "var(--bd-text-3)",
                textAlign: "center",
              }}
            >
              P{r.priority}
            </span>
            <span style={{ flex: 1, fontSize: 13 }}>
              {r.url ? (
                <a className="bd-link" href={r.url}>
                  {r.title}
                </a>
              ) : (
                r.title
              )}
            </span>
            {r.project && (
              <span
                style={{
                  fontSize: 10,
                  color: "var(--bd-text-3)",
                  fontFamily: "var(--bd-font-mono)",
                }}
              >
                {r.project}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
