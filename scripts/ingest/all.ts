// Master ingest runner — runs every brain_* importer sequentially.
//   pnpm tsx scripts/ingest/all.ts
//
// Cowork scheduled tasks run each importer independently for fault isolation.
// This script is mainly for manual full-refresh on a dev machine.

import { ingestVercel } from "./vercel";
import { ingestGithub } from "./github";
import { ingestObsidian } from "./obsidian";
import { ingestAdmin } from "./admin";
import { loadEnv } from "./lib";

async function main() {
  const env = loadEnv();
  const importers = [
    { name: "vercel", run: () => ingestVercel(env) },
    { name: "github", run: () => ingestGithub(env) },
    { name: "obsidian", run: () => ingestObsidian(env) },
    { name: "admin", run: () => ingestAdmin(env) },
  ];

  const summary: Record<string, { ok: number; skipped: number; failed: number }> = {};
  for (const imp of importers) {
    console.log(`\n=== [${imp.name}] ===`);
    try {
      summary[imp.name] = await imp.run();
    } catch (err) {
      console.error(`[${imp.name}] crashed:`, (err as Error).message);
      summary[imp.name] = { ok: 0, skipped: 0, failed: -1 };
    }
  }

  console.log("\n=== Summary ===");
  console.table(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
