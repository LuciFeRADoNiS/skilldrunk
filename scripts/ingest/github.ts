// scripts/ingest/github.ts
//
// Lists all repos for both GitHub accounts (LuciFeRADoNiS = work,
// ozgurgur = personal), upserts into brain_items keyed on
// (source='github', external_id=full_name).
//
// Cron: Cowork scheduled task `brain-ingest-github`, every 6h (`0 *\/6 * * *`).
// Env: GITHUB_TOKEN (PAT with repo scope or fine-grained read-only).

import {
  loadEnv,
  makeSupabase,
  upsertItem,
  guessRealmFromName,
  logRunSummary,
  type Env,
} from "./lib";
import type { Realm } from "@skilldrunk/brain-client";

interface GhRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  archived: boolean;
  fork: boolean;
  private: boolean;
  pushed_at: string;
  updated_at: string;
  topics?: string[];
  owner: { login: string };
}

async function fetchReposForUser(env: Env, owner: string): Promise<GhRepo[]> {
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN missing");
  const all: GhRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const r = await fetch(
      `https://api.github.com/users/${owner}/repos?per_page=100&sort=pushed&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!r.ok) {
      throw new Error(`GitHub API ${r.status}: ${await r.text().catch(() => "")}`);
    }
    const batch = (await r.json()) as GhRepo[];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

function ownerDefaultRealm(owner: string): Realm {
  if (owner.toLowerCase() === "lucifeRadonis".toLowerCase()) return "work";
  if (owner.toLowerCase() === "ozgurgur") return "personal";
  return "shared";
}

export async function ingestGithub(env: Env = loadEnv()): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  const supabase = makeSupabase(env);
  const owners = ["LuciFeRADoNiS", "ozgurgur"];

  let ok = 0,
    skipped = 0,
    failed = 0;

  for (const owner of owners) {
    let repos: GhRepo[] = [];
    try {
      repos = await fetchReposForUser(env, owner);
    } catch (err) {
      console.error(`[ingest-github] ${owner} list failed:`, (err as Error).message);
      continue;
    }

    for (const r of repos) {
      try {
        // Realm: name-based guess wins (matches Vercel pattern), fallback to owner default.
        const nameGuess = guessRealmFromName(r.name);
        const realm: Realm = nameGuess === "shared" ? ownerDefaultRealm(owner) : nameGuess;
        const status = r.archived ? "archived" : "active";

        await upsertItem(supabase, {
          source: "github",
          external_id: r.full_name,
          realm,
          kind: "project",
          title: r.name,
          subtitle: r.language ?? null,
          description: r.description ?? null,
          url: r.homepage || r.html_url,
          cover_url: `https://opengraph.githubassets.com/1/${r.full_name}`,
          status,
          metadata: {
            github_id: r.id,
            full_name: r.full_name,
            owner: r.owner.login,
            stars: r.stargazers_count,
            language: r.language,
            topics: r.topics ?? [],
            fork: r.fork,
            private: r.private,
            pushed_at: r.pushed_at,
          },
        });
        ok++;
      } catch (err) {
        console.error(`[ingest-github] ${r.full_name}:`, (err as Error).message);
        failed++;
      }
    }
  }
  logRunSummary("github", ok, skipped, failed);
  return { ok, skipped, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  ingestGithub().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
