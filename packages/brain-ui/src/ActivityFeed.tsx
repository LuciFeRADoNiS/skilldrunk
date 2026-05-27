import type { BrainActivity } from "@skilldrunk/brain-client";
import { EmptyStateCoach } from "./EmptyStateCoach";

interface Props {
  activities: BrainActivity[];
  emptyCoach?: { message: string; actions?: Array<{ label: string; href: string }> };
}

const SOURCE_ICON: Record<string, string> = {
  github: "⌥",
  vercel: "▲",
  obsidian: "◇",
  manual: "✎",
  admin_app: "▦",
  replit: "▶",
  lovable: "♡",
  google_ai_studio: "✦",
};

function groupByDay(items: BrainActivity[]): Record<string, BrainActivity[]> {
  const out: Record<string, BrainActivity[]> = {};
  for (const a of items) {
    const day = a.occurred_at.slice(0, 10);
    (out[day] ??= []).push(a);
  }
  return out;
}

function dayLabel(iso: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === today) return "Bugün";
  if (iso === yesterday) return "Dün";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
  });
}

export function ActivityFeed({ activities, emptyCoach }: Props) {
  if (!activities.length) {
    return (
      <EmptyStateCoach
        area="activity"
        message={emptyCoach?.message ?? "Son 24 saatte aktivite yok."}
        actions={emptyCoach?.actions}
      />
    );
  }
  const grouped = groupByDay(activities);
  return (
    <section className="bd-surface" style={{ padding: 0 }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--bd-border)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--bd-text-3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span>aktivite</span>
        <span style={{ fontFamily: "var(--bd-font-mono)" }}>{activities.length}</span>
      </header>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {Object.entries(grouped).map(([day, items]) => (
          <li key={day}>
            <div
              style={{
                padding: "8px 16px",
                fontSize: 11,
                color: "var(--bd-text-3)",
                background: "var(--bd-bg-2)",
                borderBottom: "1px solid var(--bd-border)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {dayLabel(day)}
            </div>
            {items.map((a) => (
              <a
                key={a.id}
                href={a.url ?? "#"}
                target={a.url ? "_blank" : undefined}
                rel="noreferrer"
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 16px",
                  textDecoration: "none",
                  color: "var(--bd-text)",
                  borderBottom: "1px solid var(--bd-border)",
                  alignItems: "flex-start",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 999,
                    background: "var(--bd-accent-bg)",
                    color: "var(--bd-accent-2)",
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {SOURCE_ICON[a.source] ?? "•"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.35,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--bd-text-3)" }}>
                    {a.event_type} · {a.source} · {new Date(a.occurred_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </a>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
