interface KpiCard {
  label: string;
  value: number | string;
  delta?: number | null;
  unit?: string;
  sparkline?: number[]; // 14-day series per D1 default
}

interface Props {
  cards: KpiCard[];
}

/** Render a sparkline as an SVG polyline (D-023 default: server SVG, no client JS). */
function Sparkline({ data, width = 80, height = 24 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke="var(--bd-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

function deltaPill(delta?: number | null) {
  if (delta === undefined || delta === null) return null;
  const positive = delta >= 0;
  return (
    <span
      style={{
        fontSize: 11,
        padding: "1px 6px",
        borderRadius: 999,
        background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: positive ? "var(--bd-success)" : "var(--bd-danger)",
        fontFamily: "var(--bd-font-mono)",
      }}
    >
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

export function KpiHero({ cards }: Props) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          className="bd-surface"
          style={{ padding: "14px 16px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--bd-text-3)",
              }}
            >
              {c.label}
            </span>
            {deltaPill(c.delta)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {typeof c.value === "number" ? c.value.toLocaleString("tr-TR") : c.value}
              {c.unit && (
                <span style={{ fontSize: 13, color: "var(--bd-text-3)", marginLeft: 4 }}>
                  {c.unit}
                </span>
              )}
            </span>
            {c.sparkline && <Sparkline data={c.sparkline} />}
          </div>
        </div>
      ))}
    </section>
  );
}
