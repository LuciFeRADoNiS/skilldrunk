/**
 * Master seed script — runs every importer sequentially.
 *
 *   pnpm tsx scripts/seed.ts
 *
 * Without `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` it runs as
 * a dry run and prints a sample per importer.
 *
 * To run a single importer:
 *   pnpm tsx scripts/seed/claude-skills.ts
 *   pnpm tsx scripts/seed/mcp-servers.ts
 */

import { importClaudeSkills } from "./seed/claude-skills";
import { importMcpServers } from "./seed/mcp-servers";
import { upsertSkills } from "./seed/shared";

async function main() {
  const allImporters = [
    { name: "claude-skills", run: importClaudeSkills },
    { name: "mcp-servers", run: importMcpServers },
  ];

  for (const imp of allImporters) {
    console.log(`\n=== [${imp.name}] ===`);
    try {
      const skills = await imp.run();
      if (skills.length) {
        await upsertSkills(skills);
      }
    } catch (err) {
      console.error(`[${imp.name}] failed:`, (err as Error).message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
