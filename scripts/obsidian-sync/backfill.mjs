#!/usr/bin/env node
/**
 * One-shot backfill — scan the vault and emit a 'create' event per existing
 * .md file. Idempotent via external_id (same file + op = same hash), so can
 * safely be re-run.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backfill.mjs
 * or with dotenv auto-loaded from ../../.env.local if `--dotenv` passed.
 */

import fs from "node:fs";
import path from "node:path";
import { VAULT, buildEvent, createSupabase, flush } from "./lib.mjs";

async function loadDotenv() {
  // Try repo root .env.local
  const envPath = path.resolve(import.meta.dirname, "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.trim();
  }
  console.log("  loaded .env.local");
}

async function walk(dir, out = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) continue;
      await walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  await loadDotenv();
  const supabase = createSupabase();

  console.log(`scanning vault: ${VAULT}`);
  const files = await walk(VAULT);
  console.log(`  found ${files.length} .md files`);

  const rows = [];
  let skipped = 0;
  for (const f of files) {
    const ev = buildEvent(f, "create");
    if (!ev) {
      skipped++;
      continue;
    }
    rows.push(ev);
  }
  console.log(`  built ${rows.length} events (${skipped} ignored)`);

  console.log("flushing to az_events…");
  const { inserted, error } = await flush(supabase, rows);
  if (error) process.exit(1);
  console.log(`  ✓ inserted ${inserted} new events (existing = skipped)`);
  console.log(`\nDone. View at: https://analiz.skilldrunk.com`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
