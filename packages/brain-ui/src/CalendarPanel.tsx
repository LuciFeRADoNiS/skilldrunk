import { EmptyStateCoach } from "./EmptyStateCoach";

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string; // ISO
  source?: "google" | "outlook" | string;
  url?: string;
}

interface Props {
  events: CalendarEvent[];
  emptyCoach?: { message: string; actions?: Array<{ label: string; href: string }> };
}

const SOURCE_ICON: Record<string, string> = {
  google: "G",
  outlook: "O",
};

export function CalendarPanel({ events, emptyCoach }: Props) {
  if (!events.length) {
    return (
      <EmptyStateCoach
        area="takvim"
        message={emptyCoach?.message ?? "Önümüzdeki 24 saatte etkinlik yok."}
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
        }}
      >
        Takvim · sonraki 24h
      </header>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 16px",
              borderBottom: "1px solid var(--bd-border)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--bd-font-mono)",
                fontSize: 12,
                color: "var(--bd-accent-2)",
                width: 50,
              }}
            >
              {new Date(e.startsAt).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span style={{ flex: 1, fontSize: 13 }}>
              {e.url ? (
                <a className="bd-link" href={e.url} target="_blank" rel="noreferrer">
                  {e.title}
                </a>
              ) : (
                e.title
              )}
            </span>
            {e.source && (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: "var(--bd-surface-2)",
                  color: "var(--bd-text-3)",
                  fontSize: 10,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--bd-font-mono)",
                }}
              >
                {SOURCE_ICON[e.source] ?? e.source.slice(0, 1).toUpperCase()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
