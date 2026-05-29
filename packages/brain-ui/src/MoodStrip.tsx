import { EmptyStateCoach } from "./EmptyStateCoach";

export interface MoodPoint {
  day: string; // YYYY-MM-DD
  mood: number; // 0-10
  stress?: number; // 0-10 (optional)
}

interface Props {
  points: MoodPoint[];
  /** When source is offline (KlauX hasn't written today), set a one-liner. */
  emptyMessage?: string;
}

/**
 * Personal-realm strip: last-N day mood line chart + delta chip.
 * Source: brain_kpi_snapshot rows where kpi_name='mood' (D-038 mirror).
 * Pure SSR — server SVG (D-022 default pattern from KpiHero).
 */
export function MoodStrip({ points, emptyMessage }: Props) {
  if (!points.length) {
    return (
      <EmptyStateCoach
        area="mood"
        message={
          emptyMessage ??
          "KlauX bot henüz mood ölçümü yazmadı. 19:00 check-in'inde gel."
        }
      />
    );
  }

  const max = 10;
  const w = 320;
  const h = 60;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => `${(i * step).toFixed(1)},${(h - (p.mood / max) * h).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const delta = prev ? +(last.mood - prev.mood).toFixed(1) : null;
  const deltaColor =
    delta === null || delta === 0
      ? "var(--bd-text-2)"
      : delta > 0
        ? "var(--bd-success)"
        : "var(--bd-danger)";

  return (
    <section
      className="bd-surface"
      style={{
        padding: "16px 18px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ flexShrink: 0 }}>
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
          mood · son {points.length}g
        </p>
        <p
          style={{
            fontSize: 22,
            fontWeight: 600,
            margin: 0,
            fontVariantNumeric: "tabular-nums",
            display: "flex",
            alignItems: "baseline",
            gap: 6,
          }}
        >
          {last.mood.toFixed(1)}
          <span style={{ fontSize: 12, color: "var(--bd-text-3)" }}>/ 10</span>
          {delta !== null && (
            <span style={{ fontSize: 11, color: deltaColor, marginLeft: 6 }}>
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </p>
      </div>
      <svg width={w} height={h} aria-hidden style={{ flex: 1, maxWidth: w }}>
        <polyline
          fill="none"
          stroke="var(--bd-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={path}
        />
      </svg>
    </section>
  );
}
