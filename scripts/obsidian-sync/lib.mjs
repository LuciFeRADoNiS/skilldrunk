// Shared helpers for backfill + watcher.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

export const VAULT = "/Users/ozgurgur/Documents/Personal Brain";
export const USER_ID = "c17394c2-e995-4bd1-87e3-f98f4326ca12"; // ozgurgur

// Folders that shouldn't be tracked
const IGNORE_FOLDERS = new Set([
  ".obsidian",
  ".trash",
  "_attachments",
  "Claude-Memory",
  "Scripts",
  "Templates",
]);

// Map top-level folder → semantic kind
const FOLDER_KINDS = {
  Meetings: "meeting",
  Daily: "daily_note",
  Projects: "project_note",
  Knowledge: "knowledge",
  "AI-Sessions": "ai_session",
  Decisions: "decision",
  People: "person",
  Companies: "company",
  Research: "research",
  Inbox: "inbox",
  Topics: "topic",
  "Link-Analyses": "link_analysis",
};

export function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export function externalId(relPath, op) {
  return crypto
    .createHash("sha256")
    .update(`${relPath}:${op}`)
    .digest("hex")
    .slice(0, 32);
}

export function shouldIgnore(relPath) {
  if (!relPath.endsWith(".md")) return true;
  const top = relPath.split(path.sep)[0];
  if (IGNORE_FOLDERS.has(top)) return true;
  if (path.basename(relPath).startsWith(".")) return true;
  return false;
}

export function inferKind(relPath) {
  const top = relPath.split(path.sep)[0];
  return FOLDER_KINDS[top] ?? "note";
}

function safeParseDate(v) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

/**
 * Build an az_events row from a vault file.
 * Returns null if file should be skipped.
 */
export function buildEvent(filePath, op) {
  const relPath = path.relative(VAULT, filePath);
  if (shouldIgnore(relPath)) return null;

  const kind = inferKind(relPath);
  const basename = path.basename(relPath, ".md");

  let title = basename;
  let body = null;
  let tags = [kind];
  let occurredAt = null;
  let metadata = { path: relPath, op };

  // Delete events have no file content
  if (op !== "delete" && fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data: fm, content: md } = matter(raw);

      if (fm.title) title = String(fm.title);

      // Frontmatter tags
      if (Array.isArray(fm.tags)) {
        for (const t of fm.tags) {
          if (typeof t === "string") tags.push(t);
        }
      } else if (typeof fm.tags === "string") {
        tags.push(fm.tags);
      }

      // Time: prefer frontmatter date, fallback to filename (YYYY-MM-DD prefix), then file mtime
      occurredAt = safeParseDate(fm.date);

      // filename date pattern: "2026-04-24 - Title.md"
      if (!occurredAt) {
        const m = basename.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) occurredAt = safeParseDate(m[1]);
      }

      // Body: trimmed first 500 chars of markdown
      body = md.trim().slice(0, 500) || null;

      // Selected frontmatter into metadata
      metadata = {
        ...metadata,
        meeting_type: fm.meeting_type ?? null,
        duration: fm.duration ?? null,
        companies: fm.companies ?? null,
        tldv_id: fm.tldv_id ?? null,
      };
    } catch (err) {
      console.error(`  parse-error: ${relPath}:`, err.message);
    }

    // Fall back to file mtime
    if (!occurredAt) {
      try {
        occurredAt = fs.statSync(filePath).mtime.toISOString();
      } catch {
        occurredAt = new Date().toISOString();
      }
    }
  } else {
    occurredAt = new Date().toISOString();
  }

  return {
    user_id: USER_ID,
    source: "obsidian",
    kind: `${kind}:${op}`,
    title: title.slice(0, 500),
    body,
    tags: Array.from(new Set(tags)).slice(0, 32),
    metadata,
    occurred_at: occurredAt,
    external_id: externalId(relPath, op),
  };
}

/** Bulk upsert to az_events (chunked). */
export async function flush(supabase, rows) {
  if (!rows.length) return { inserted: 0 };
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("az_events")
      .upsert(slice, {
        onConflict: "user_id,source,external_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      console.error("  upsert error:", error.message);
      return { inserted, error };
    }
    inserted += data?.length ?? 0;
  }
  return { inserted };
}
