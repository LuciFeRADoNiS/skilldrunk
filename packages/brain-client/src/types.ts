// Shared TypeScript types mirroring 0020_brain_layer.sql enums + row shapes.
// Source of truth: supabase/migrations/0020_brain_layer.sql.
// Keep in sync — if migration changes, edit here too.

export type Realm = "work" | "personal" | "shared";

export type BrainKind =
  | "project"
  | "prototype"
  | "tool"
  | "bot"
  | "note"
  | "external_app"
  | "service";

export type BrainSource =
  | "vercel"
  | "github"
  | "replit"
  | "lovable"
  | "google_ai_studio"
  | "obsidian"
  | "manual"
  | "admin_app";

export type BrainStatus = "active" | "archived" | "draft" | "broken";

export type Domain = "skilldrunk" | "skimsoulfat";

export interface BrainItem {
  id: string;
  realm: Realm;
  kind: BrainKind;
  source: BrainSource;
  external_id: string | null;
  slug: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  status: BrainStatus;
  url: string | null;
  cover_url: string | null;
  icon_url: string | null;
  visible_skilldrunk: boolean;
  visible_skimsoulfat: boolean;
  ingested_at: string;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface BrainActivity {
  id: string;
  realm: Realm;
  source: BrainSource;
  event_type: string;
  item_id: string | null;
  title: string;
  body: string | null;
  url: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BrainDigest {
  id: number;
  realm: Realm;
  digest_date: string; // ISO date
  summary: string;
  highlights: Array<Record<string, unknown>>;
  generated_at: string;
}

export interface BrainKpi {
  key: string;
  value: number;
  delta_pct: number | null;
  captured_at: string;
}

/** Shape returned by `brain_dashboard_payload(p_realm)` RPC. */
export interface DashboardPayload {
  realm: Realm;
  as_of: string;
  kpi: BrainKpi[];
  digest: {
    date: string;
    summary: string;
    highlights: Array<Record<string, unknown>>;
    generated_at: string;
  } | null;
  activity: BrainActivity[];
  catalog_preview: Array<
    Pick<
      BrainItem,
      | "id"
      | "slug"
      | "title"
      | "subtitle"
      | "url"
      | "cover_url"
      | "icon_url"
      | "kind"
      | "category"
      | "source"
      | "status"
    >
  >;
  counts: {
    items_total: number;
    activity_24h: number;
    archived: number;
  };
}

/** Shape returned by `brain_inventory_check()` RPC. */
export interface InventoryReport {
  by_source: Array<{ source: BrainSource; count: number; last_synced_at: string | null }>;
  by_realm: Array<{ realm: Realm; count: number }>;
  by_status: Array<{ status: BrainStatus; count: number }>;
  stale_items: number;
  embedding_coverage_pct: number;
  total_items: number;
  generated_at: string;
}
