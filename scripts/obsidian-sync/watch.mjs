#!/usr/bin/env node
/**
 * Watcher — monitors the vault and emits events on create / modify / delete.
 * Modify events are debounced per-file (2 min window) to avoid spam from
 * typical editor auto-save patterns.
 */

import fs from "node:fs";
import path from "node:path";
import chokidar from "chokidar";
import { VAULT, buildEvent, createSupabase, flush } from "./lib.mjs";

async function loadDotenv() {
  const envPath = path.resolve(import.meta.dirname, "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!process.env[k]) process.env[k] = v.trim();
  }
}

const MODIFY_DEBOUNCE_MS = 2 * 60 * 1000; // 2 min per file
const FLUSH_INTERVAL_MS = 30 * 1000; // batch + flush every 30s

const lastModifyEmit = new Map();
const pending = [];

function queue(filePath, op) {
  if (op === "modify") {
    const last = lastModifyEmit.get(filePath) ?? 0;
    const now = Date.now();
    if (now - last < MODIFY_DEBOUNCE_MS) return;
    lastModifyEmit.set(filePath, now);
  }

  const ev = buildEvent(filePath, op);
  if (ev) pending.push(ev);
}

async function flushPending(supabase) {
  if (pending.length === 0) return;
  const batch = pending.splice(0, pending.length);
  const { inserted, error } = await flush(supabase, batch);
  if (error) return;
  if (inserted > 0) {
    console.log(
      `[${new Date().toISOString()}] flushed ${inserted}/${batch.length}`,
    );
  }
}

async function main() {
  await loadDotenv();
  const supabase = createSupabase();

  console.log(`watching: ${VAULT}`);

  // Chokidar 4 removed glob support — watch the directory and filter paths.
  const watcher = chokidar.watch(VAULT, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 300 },
    ignored: (p) => {
      if (!p) return false;
      // Ignore hidden files/folders (.obsidian, .trash, etc.)
      if (/\/\.[^/]+(?:\/|$)/.test(p)) return true;
      if (/\/_attachments\//.test(p)) return true;
      return false;
    },
  });

  const isMd = (p) => typeof p === "string" && p.endsWith(".md");

  watcher
    .on("add", (p) => {
      if (!isMd(p)) return;
      console.log(`+ ${path.relative(VAULT, p)}`);
      queue(p, "create");
    })
    .on("change", (p) => {
      if (!isMd(p)) return;
      console.log(`~ ${path.relative(VAULT, p)}`);
      queue(p, "modify");
    })
    .on("unlink", (p) => {
      if (!isMd(p)) return;
      console.log(`- ${path.relative(VAULT, p)}`);
      queue(p, "delete");
    })
    .on("ready", () => console.log("initial scan done, watching for changes…"))
    .on("error", (err) => console.error("watcher error:", err));

  setInterval(() => flushPending(supabase), FLUSH_INTERVAL_MS);
  console.log(`flush interval: every ${FLUSH_INTERVAL_MS / 1000}s`);

  // Flush on shutdown
  const shutdown = async () => {
    console.log("\nshutting down, flushing pending…");
    await flushPending(supabase);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
