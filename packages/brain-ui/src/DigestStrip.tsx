interface Highlight {
  label: string;
  delta?: number; // +12 / -5 / 0
  status?: "up" | "down" | "flat" | "waiting";
}

interface Props {
  greeting?: string; // override of time-based default
  digestText: string;
  highlights?: Highlight[];
  generatedAt?: string | null;
  isFallback?: boolean; // D-018: cache miss → show fallback styling
}

function defaultGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 11) return "Günaydın";
  if (h < 17) return "İyi öğleden sonralar";
  return "İyi akşamlar";
}

function deltaColor(delta?: number) {
  if (delta === undefined || delta === 0) return "var(--bd-text-2)";
  return delta > 0 ? "var(--bd-success)" : "var(--bd-danger)";
}

export function DigestStrip({
  greeting,
  digestText,
  highlights = [],
  generatedAt,
  isFallback,
}: Props) {
  const hello = greeting ?? defaultGreeting();
  return (
    <section
      className="bd-surface"
      style={{
        padding: "20px 22px",
        marginBottom: 20,
        background: isFallback
          ? "var(--bd-surface)"
          : "linear-gradient(135deg, var(--bd-surface) 0%, var(--bd-accent-bg) 130%)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div>
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
            günün özeti
          </p>
          <h2
            style={{
              fontSize: 20,
              margin: 0,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {hello} 👋
          </h2>
        </div>
        {generatedAt && (
          <span style={{ fontSize: 11, color: "var(--bd-text-3)", fontFamily: "var(--bd-font-mono)" }}>
            {new Date(generatedAt).toLocaleString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          color: isFallback ? "var(--bd-text-2)" : "var(--bd-text)",
          margin: 0,
          fontStyle: isFallback ? "italic" : "normal",
        }}
      >
        {digestText}
      </p>
      {highlights.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {highlights.map((h) => (
            <span
              key={h.label}
              className="bd-chip"
              style={{
                background: "transparent",
                border: "1px solid var(--bd-border)",
                color: "var(--bd-text-2)",
              }}
            >
              <span>{h.label}</span>
              {h.delta !== undefined && (
                <strong style={{ color: deltaColor(h.delta) }}>
                  {h.delta > 0 ? "+" : ""}
                  {h.delta}%
                </strong>
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
