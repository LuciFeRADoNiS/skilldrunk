type StatTone = "default" | "up" | "down" | "warn";

export interface StatProps {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  tone?: StatTone;
}

export function Stat({ label, value, delta, tone = "default" }: StatProps) {
  return (
    <div className="sd-stat">
      <div className="sd-stat-label">{label}</div>
      <div className="sd-stat-value">{value}</div>
      {delta != null && (
        <div
          className={
            tone === "up"
              ? "sd-stat-delta sd-stat-delta-up"
              : tone === "down"
                ? "sd-stat-delta sd-stat-delta-down"
                : tone === "warn"
                  ? "sd-stat-delta sd-stat-delta-warn"
                  : "sd-stat-delta"
          }
        >
          {delta}
        </div>
      )}
    </div>
  );
}

export function StatGrid({
  cols = 4,
  children,
}: {
  cols?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}
