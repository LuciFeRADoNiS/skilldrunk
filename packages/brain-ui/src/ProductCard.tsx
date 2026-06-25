interface Props {
  title: string;
  subtitle?: string | null;
  url?: string | null;
  coverUrl?: string | null;
  category?: string | null;
  status?: "active" | "archived" | "draft" | "broken";
  source?: string;
  slug?: string | null;
  detailHref?: string | null; // overrides url (for /catalog/[slug])
}

const STATUS_COLOR: Record<string, string> = {
  active: "var(--bd-success)",
  draft: "var(--bd-warn)",
  broken: "var(--bd-danger)",
  archived: "var(--bd-text-3)",
};

export function ProductCard({
  title,
  subtitle,
  url,
  coverUrl,
  category,
  status = "active",
  source,
  detailHref,
}: Props) {
  const href = detailHref ?? url ?? "#";
  return (
    <a
      href={href}
      target={detailHref ? undefined : url ? "_blank" : undefined}
      rel={detailHref ? undefined : "noreferrer"}
      className="bd-surface"
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "var(--bd-text)",
        overflow: "hidden",
        transition: "border-color 120ms",
      }}
    >
      <div
        aria-hidden
        style={{
          aspectRatio: "16/9",
          background: coverUrl
            ? `center/cover url(${coverUrl})`
            : "linear-gradient(135deg, var(--bd-accent-bg) 0%, var(--bd-surface-2) 100%)",
          borderBottom: "1px solid var(--bd-border)",
          position: "relative",
        }}
      >
        {!coverUrl && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              color: "var(--bd-accent-2)",
              opacity: 0.5,
              fontFamily: "var(--bd-font-mono)",
            }}
          >
            {title.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: STATUS_COLOR[status],
            boxShadow: `0 0 6px ${STATUS_COLOR[status]}`,
          }}
        />
      </div>
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <strong
            style={{
              fontSize: 14,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {title}
          </strong>
          {url && !detailHref && (
            <span aria-hidden style={{ fontSize: 12, color: "var(--bd-text-3)" }}>
              ↗
            </span>
          )}
        </div>
        {subtitle && (
          <span
            style={{
              fontSize: 12,
              color: "var(--bd-text-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </span>
        )}
        <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4 }}>
          {category && <span className="bd-chip">{category}</span>}
          {source && (
            <span
              style={{
                fontSize: 10,
                color: "var(--bd-text-3)",
                fontFamily: "var(--bd-font-mono)",
              }}
            >
              {source}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
