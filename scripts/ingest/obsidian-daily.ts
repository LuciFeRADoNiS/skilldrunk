// scripts/ingest/obsidian-daily.ts — Faz 4 §1.7
//
// Walks ~/Personal Brain/Reviews/Daily/*.md (or .md files at top level)
// → brain_items (source='obsidian', kind='note', category='reflection',
// realm='personal'). Key on (source, external_id=obsidian://Reviews/Daily/<name>).
//
// Cron: Cowork scheduled task `brain-ingest-obsidian-daily` daily 00:30
//       (after end-of-day Daily note saved).
//
// Manual: pnpm tsx scripts/ingest/obsidian-daily.ts

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { loadEnv, makeSupabase, upsertItem, logRunSummary, type Env } from "./lib";

const DAILY_DIR =
  process.env.OBSIDIAN_DAILY_DIR ??
  "/Users/ozgurgur/Documents/Personal Brain/Reviews/Daily";

function obsidianOpenUrl(file: string): string {
  const vault = encodeURIComponent("Personal Brain");
  const path = encodeURIComponent(`Reviews/Daily/${file}`);
  return `obsidian://open?vault=${vault}&file=${path}`;
}

interface DailyFrontMatter {
  date?: string;
  mood?: number | string;
  tags?: string[];
  title?: string;
  [k: string]: unknown;
}

export async function ingestObsidianDaily(env: Env = loadEnv()): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  if (!existsSync(DAILY_DIR)) {
    console.warn(`[ingest-obsidian-daily] DAILY_DIR not found: ${DAILY_DIR}`);
    return { ok: 0, skipped: 0, failed: 0 };
  }
  const supabase = makeSupabase(env);

  const files = readdirSync(DAILY_DIR).filter(
    (f) => f.endsWith(".md") && !f.startsWith("."),
  );

  let ok = 0,
    skipped = 0,
    failed = 0;

  for (const file of files) {
    const fullPath = join(DAILY_DIR, file);
    try {
      const raw = readFileSync(fullPath, "utf8");
      const { data, content } = matter(raw);
      const fm = data as DailyFrontMatter;
      const baseName = file.replace(/\.md$/, "");
      const description = content.replace(/^\s*\n/, "").slice(0, 320).trim();
      const mtime = statSync(fullPath).mtime.toISOString();

      // Use date frontmatter as title prefix if present, else filename.
      const title = fm.title ?? `Daily ${fm.date ?? baseName}`;

      await upsertItem(supabase, {
        source: "obsidian",
        external_id: `obsidian://Reviews/Daily/${baseName}`,
        realm: "personal",
        kind: "note",
        category: "reflection",
        title,
        subtitle: typeof fm.mood !== "undefined" ? `mood: ${fm.mood}` : null,
        description: description || null,
        url: obsidianOpenUrl(file),
        status: "active",
        metadata: {
          ...fm,
          file_name: file,
          fs_modified_at: mtime,
        },
      });
      ok++;
    } catch (err) {
      console.error(`[ingest-obsidian-daily] ${file}:`, (err as Error).message);
      failed++;
    }
  }

  logRunSummary("obsidian-daily", ok, skipped, failed);
  return { ok, skipped, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  ingestObsidianDaily().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
