import {
  DigestStrip,
  KpiHero,
  ActivityFeed,
  ShuffleGrid,
  BacklogPanel,
  CalendarPanel,
  type BacklogRow,
  type CalendarEvent,
} from "@skilldrunk/brain-ui";
import { fetchDashboard, fetchCatalog } from "@skilldrunk/brain-client";
import { requireOwner } from "@/lib/owner/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_DIGEST =
  "Bugünün özeti hazırlanıyor. AI digest her sabah 06:00'da üretilir; sayfayı yarın tekrar aç.";

/** Stub backlog source — Faz 2.5 plugs in sd_backlog admin RPC. */
async function getTopBacklog(): Promise<BacklogRow[]> {
  // Placeholder. /ops/backlog reads the real list.
  return [];
}

/** Stub calendar source — Faz 4 wires in MasteRMinD SA via Atlas. */
async function getNext24hEvents(): Promise<CalendarEvent[]> {
  return [];
}

export default async function HomePage() {
  const { supabase } = await requireOwner();

  // Dashboard payload + catalog preview parallel (D-018: cron cache, never inline LLM).
  const [payload, catalogItems] = await Promise.all([
    fetchDashboard(supabase, "work"),
    fetchCatalog(supabase, { domain: "skilldrunk", limit: 12 }),
  ]);

  const digest = payload.digest;
  const digestText = digest?.summary ?? FALLBACK_DIGEST;
  const isFallback = !digest;

  // KPI hero — fill from kpi snapshot rows, fall back to count primitives.
  type KpiCard = { label: string; value: number | string; delta: number | null };
  const kpiCards: KpiCard[] = [
    { label: "Aktif item", value: payload.counts.items_total, delta: null },
    { label: "Son 24h aktivite", value: payload.counts.activity_24h, delta: null },
    { label: "Arşivde", value: payload.counts.archived, delta: null },
    { label: "AI digest", value: digest ? "✓" : "—", delta: null },
  ];

  // Replace placeholders with real kpi rows when present.
  for (const k of payload.kpi.slice(0, kpiCards.length)) {
    const idx = kpiCards.findIndex((c) => c.label === k.key);
    if (idx >= 0) {
      kpiCards[idx] = {
        label: k.key,
        value: k.value,
        delta: k.delta_pct,
      };
    }
  }

  const [backlog, events] = await Promise.all([getTopBacklog(), getNext24hEvents()]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <DigestStrip
        digestText={digestText}
        generatedAt={digest?.generated_at}
        isFallback={isFallback}
      />
      <KpiHero cards={kpiCards} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <CalendarPanel
          events={events}
          emptyCoach={{
            message:
              "Takvim henüz bağlı değil — Atlas SA (MasteRMinD) ileride hidrate eder.",
          }}
        />
        <BacklogPanel
          rows={backlog}
          emptyCoach={{
            message:
              "Backlog burada listelenir — şimdilik admin.skilldrunk.com/backlog'tan yönet.",
            actions: [{ label: "Admin backlog", href: "https://admin.skilldrunk.com/backlog" }],
          }}
        />
      </div>

      <ActivityFeed activities={payload.activity} />

      <div style={{ marginTop: 24 }}>
        <h2
          style={{
            fontSize: 12,
            color: "var(--bd-text-3)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            margin: "0 0 12px 0",
          }}
        >
          Katalog (shuffle)
        </h2>
        <ShuffleGrid
          items={catalogItems}
          detailHrefPrefix="/catalog"
          emptyCoach={{
            message:
              "Henüz görünür ürün yok. Ingestion script'lerini çalıştır veya /catalog/add'tan manuel ekle.",
            actions: [{ label: "Manuel ekle", href: "/catalog/add" }],
          }}
        />
      </div>
    </div>
  );
}
