// scripts/ingest/admin.ts
//
// Mirrors `pt_apps` (admin.skilldrunk.com ecosystem catalog) into brain_items.
// Lets the brain layer see the same 10+ live subdomain registry the admin
// dashboard renders.
//
// Cron: Cowork scheduled task `brain-ingest-admin-apps`, every 6h
//       (`30 *\/6 * * *`).

import {
  loadEnv,
  makeSupabase,
  upsertItem,
  guessRealmFromName,
  logRunSummary,
  type Env,
} from "./lib";
import type { Realm } from "@skilldrunk/brain-client";

interface PtApp {
  slug: string;
  title: string;
  tagline: string | null;
  url: string;
  subdomain: string | null;
  status: string;
  stack: string[] | null;
  tags: string[] | null;
  description_md: string | null;
}

export async function ingestAdmin(env: Env = loadEnv()): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  const supabase = makeSupabase(env);

  const { data, error } = await supabase
    .from("pt_apps")
    .select("slug, title, tagline, url, subdomain, status, stack, tags, description_md");
  if (error) throw error;
  const apps = (data ?? []) as PtApp[];

  let ok = 0,
    skipped = 0,
    failed = 0;

  for (const a of apps) {
    try {
      // pt_apps doesn't carry realm — derive from tags + name.
      const tagsSet = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
      const realm: Realm = tagsSet.has("personal")
        ? "personal"
        : tagsSet.has("work")
          ? "work"
          : guessRealmFromName(a.slug);

      const status =
        a.status === "archived"
          ? "archived"
          : a.status === "draft"
            ? "draft"
            : "active";

      await upsertItem(supabase, {
        source: "admin_app",
        external_id: a.slug,
        realm,
        kind: "service",
        title: a.title,
        subtitle: a.tagline,
        description: a.description_md ?? null,
        url: a.url,
        status,
        metadata: {
          subdomain: a.subdomain,
          stack: a.stack ?? [],
          tags: a.tags ?? [],
        },
      });
      ok++;
    } catch (err) {
      console.error(`[ingest-admin] ${a.slug}:`, (err as Error).message);
      failed++;
    }
  }

  logRunSummary("admin", ok, skipped, failed);
  return { ok, skipped, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  ingestAdmin().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
