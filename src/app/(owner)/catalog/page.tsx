import Link from "next/link";
import { ShuffleGrid } from "@skilldrunk/brain-ui";
import { fetchCatalog } from "@skilldrunk/brain-client";
import { requireOwner } from "@/lib/owner/auth";

// D-004: server-side ORDER BY random() — must NEVER be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function CatalogPage() {
  const { supabase } = await requireOwner();
  const items = await fetchCatalog(supabase, {
    domain: "skilldrunk",
    limit: 48,
  });

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 18,
          gap: 12,
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
            catalog · shuffle
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Tüm ürünler
          </h1>
          <p style={{ fontSize: 13, color: "var(--bd-text-2)", margin: "6px 0 0 0" }}>
            Her sayfa yenilemesinde sıra değişir. {items.length} ürün gösteriliyor.
          </p>
        </div>
        <Link
          href="/catalog/add"
          style={{
            background: "var(--bd-accent-bg-strong)",
            color: "var(--bd-accent-2)",
            border: "1px solid var(--bd-accent-bg-strong)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          + Manuel ekle
        </Link>
      </header>

      <ShuffleGrid
        items={items}
        detailHrefPrefix="/catalog"
        emptyCoach={{
          message:
            "Henüz görünür ürün yok. Ingestion script'lerini çalıştır veya manuel ekle.",
          actions: [{ label: "Manuel ekle", href: "/catalog/add" }],
        }}
      />
    </div>
  );
}
