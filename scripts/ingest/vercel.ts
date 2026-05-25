// scripts/ingest/vercel.ts
//
// Pulls all projects from Vercel, upserts into brain_items keyed on
// (source='vercel', external_id=project.id).
//
// Cron: Cowork scheduled task `brain-ingest-vercel`, hourly (`0 * * * *`).
// Manual: pnpm tsx scripts/ingest/vercel.ts
//
// Env: VERCEL_TOKEN (or VERCEL_API_TOKEN) + VERCEL_TEAM_ID (optional, defaults to skilldrunk team).

import {
  loadEnv,
  makeSupabase,
  upsertItem,
  guessRealmFromName,
  logRunSummary,
  type Env,
} from "./lib";

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: { type: string; repo?: string; repoId?: string };
  latestDeployments?: Array<{
    id: string;
    url: string;
    readyState: string;
    state?: string;
    createdAt: number;
  }>;
  alias?: string[];
  createdAt: number;
  updatedAt: number;
}

async function fetchProjects(env: Env): Promise<VercelProject[]> {
  if (!env.VERCEL_TOKEN) {
    throw new Error(
      "VERCEL_TOKEN missing — set via `vercel env pull` or .env.local",
    );
  }
  const teamParam = env.VERCEL_TEAM_ID ? `&teamId=${env.VERCEL_TEAM_ID}` : "";
  const all: VercelProject[] = [];
  let until: string | null = null;
  // Vercel paginates with `?until=<timestamp>`. Defensive cap at 5 pages (500 projects).
  for (let page = 0; page < 5; page++) {
    const url = `https://api.vercel.com/v9/projects?limit=100${teamParam}${until ? `&until=${until}` : ""}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
    });
    if (!r.ok) {
      throw new Error(`Vercel API ${r.status}: ${await r.text().catch(() => "")}`);
    }
    const data = (await r.json()) as {
      projects: VercelProject[];
      pagination?: { next: string | null };
    };
    all.push(...data.projects);
    if (!data.pagination?.next) break;
    until = data.pagination.next;
  }
  return all;
}

export async function ingestVercel(env: Env = loadEnv()): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  const supabase = makeSupabase(env);
  const projects = await fetchProjects(env);

  let ok = 0,
    skipped = 0,
    failed = 0;
  for (const p of projects) {
    try {
      const realm = guessRealmFromName(p.name);
      const latest = p.latestDeployments?.[0];
      const status: "active" | "broken" | "draft" =
        latest?.readyState === "READY"
          ? "active"
          : latest?.readyState === "ERROR"
            ? "broken"
            : "draft";
      const primaryAlias = p.alias?.[0];
      const url = primaryAlias
        ? `https://${primaryAlias}`
        : latest?.url
          ? `https://${latest.url}`
          : null;

      await upsertItem(supabase, {
        source: "vercel",
        external_id: p.id,
        realm,
        kind: "project",
        title: p.name,
        subtitle: p.framework ?? null,
        url,
        status,
        metadata: {
          framework: p.framework,
          repo: p.link?.repo ?? null,
          last_deploy: latest
            ? {
                id: latest.id,
                state: latest.readyState,
                url: latest.url,
                created_at: new Date(latest.createdAt).toISOString(),
              }
            : null,
          vercel_team_id: env.VERCEL_TEAM_ID ?? null,
        },
      });
      ok++;
    } catch (err) {
      console.error(`[ingest-vercel] ${p.name}:`, (err as Error).message);
      failed++;
    }
  }
  logRunSummary("vercel", ok, skipped, failed);
  return { ok, skipped, failed };
}

// CLI entry
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  ingestVercel().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
