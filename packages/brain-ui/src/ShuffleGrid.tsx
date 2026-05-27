import type { BrainItem } from "@skilldrunk/brain-client";
import { ProductCard } from "./ProductCard";
import { EmptyStateCoach } from "./EmptyStateCoach";

interface Props {
  items: BrainItem[];
  detailHrefPrefix?: string; // e.g. "/catalog"
  emptyCoach?: { message: string; actions?: Array<{ label: string; href: string }> };
  filters?: React.ReactNode;
}

/**
 * Pure SSR grid for the shuffle catalog (D-004 server-side random). Each
 * server render returns a different order; the page route must set
 * Cache-Control: no-store. No client JS — Faz 2.5 brings filter chips +
 * infinite scroll as a client wrapper around this primitive.
 */
export function ShuffleGrid({ items, detailHrefPrefix, emptyCoach, filters }: Props) {
  return (
    <section>
      {filters && <div style={{ marginBottom: 14 }}>{filters}</div>}
      {items.length === 0 ? (
        <EmptyStateCoach
          area="catalog"
          message={
            emptyCoach?.message ??
            "Katalog henüz boş. /catalog/add ile manuel ekle veya ingestion script'lerini çalıştır."
          }
          actions={
            emptyCoach?.actions ?? [{ label: "Manuel ekle", href: "/catalog/add" }]
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {items.map((i) => (
            <ProductCard
              key={i.id}
              title={i.title}
              subtitle={i.subtitle}
              url={i.url}
              coverUrl={i.cover_url}
              category={i.category}
              status={i.status}
              source={i.source}
              slug={i.slug}
              detailHref={
                detailHrefPrefix && i.slug
                  ? `${detailHrefPrefix}/${i.slug}`
                  : null
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
