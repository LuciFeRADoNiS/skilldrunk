// scripts/ingest/obsidian.ts
//
// Walks ~/Documents/Personal Brain/Projects/* directories, reads README.md
// (front-matter + body), upserts into brain_items keyed on
// (source='obsidian', external_id='obsidian://<folder>').
//
// Cron: Cowork scheduled task `brain-ingest-obsidian`, hourly (`15 * * * *`).
//
// Realm rules (04-catalog-strategy §2.3):
//   - explicit `realm:` in front-matter wins
//   - else name-based guess
//   - all Obsidian items: visible_skilldrunk=true (work side dashboard)

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import {
  loadEnv,
  makeSupabase,
  upsertItem,
  guessRealmFromName,
  logRunSummary,
  type Env,
} from "./lib";
import type { Realm } from "@skilldrunk/brain-client";

const PROJECTS_DIR =
  process.env.OBSIDIAN_PROJECTS_DIR ??
  "/Users/ozgurgur/Documents/Personal Brain/Projects";

interface FrontMatter {
  name?: string;
  realm?: Realm;
  status?: string;
  tags?: string[];
  category?: string;
  url?: string;
  cover?: string;
  [k: string]: unknown;
}

function obsidianOpenUrl(folder: string, file = "README.md"): string {
  const vault = encodeURIComponent("Personal Brain");
  const path = encodeURIComponent(`Projects/${folder}/${file}`);
  return `obsidian://open?vault=${vault}&file=${path}`;
}

export async function ingestObsidian(env: Env = loadEnv()): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  if (!existsSync(PROJECTS_DIR)) {
    console.warn(`[ingest-obsidian] PROJECTS_DIR not found: ${PROJECTS_DIR}`);
    return { ok: 0, skipped: 0, failed: 0 };
  }
  const supabase = makeSupabase(env);

  const dirs = readdirSync(PROJECTS_DIR, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && !d.name.startsWith("."),
  );

  let ok = 0,
    skipped = 0,
    failed = 0;

  for (const dir of dirs) {
    const folder = dir.name;
    const readme = join(PROJECTS_DIR, folder, "README.md");
    if (!existsSync(readme)) {
      skipped++;
      continue;
    }
    try {
      const raw = readFileSync(readme, "utf8");
      const { data, content } = matter(raw);
      const fm = data as FrontMatter;
      const realm: Realm = fm.realm ?? guessRealmFromName(folder);
      const status =
        fm.status === "done" || fm.status === "archived" ? "archived" : "active";
      const description = content.replace(/^\s*\n/, "").slice(0, 280).trim();
      const tagsArr = Array.isArray(fm.tags) ? fm.tags : [];

      // Use updated_at from filesystem mtime as a proxy.
      const mtime = statSync(readme).mtime.toISOString();

      await upsertItem(supabase, {
        source: "obsidian",
        external_id: `obsidian://${folder}`,
        realm,
        kind: "project",
        title: fm.name ?? folder,
        subtitle: tagsArr.length ? tagsArr.join(" · ") : null,
        description: description || null,
        category: fm.category ?? null,
        url: fm.url ?? obsidianOpenUrl(folder),
        cover_url: fm.cover ?? null,
        status,
        metadata: {
          ...fm,
          folder,
          fs_modified_at: mtime,
        },
      });
      ok++;
    } catch (err) {
      console.error(`[ingest-obsidian] ${folder}:`, (err as Error).message);
      failed++;
    }
  }

  logRunSummary("obsidian", ok, skipped, failed);
  return { ok, skipped, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  ingestObsidian().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
