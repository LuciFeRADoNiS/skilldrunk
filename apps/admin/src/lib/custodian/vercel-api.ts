// apps/admin/src/lib/custodian/vercel-api.ts — Faz 2
//
// Read-only Vercel REST helpers for custodian tools. Token via env
// VERCEL_TOKEN; team via VERCEL_TEAM_ID (default skilldrunk team).
// Graceful: missing token → throws a clear message the loop surfaces.

const VERCEL_API = "https://api.vercel.com";
const DEFAULT_TEAM = "team_FIWBic9LwfGzRkAT5QfXkZtA";
// skilldrunk marketplace project (main domain monitored in Faz 2).
const DEFAULT_PROJECT = "skilldrunk";

function token(): string {
  const t = process.env.VERCEL_TOKEN ?? process.env.VERCEL_API_TOKEN;
  if (!t) throw new Error("VERCEL_TOKEN env yok — Vercel okuma tool'ları devre dışı");
  return t;
}

function teamParam(): string {
  const team = process.env.VERCEL_TEAM_ID ?? DEFAULT_TEAM;
  return team ? `teamId=${team}` : "";
}

export interface VercelDeployment {
  uid: string;
  name: string;
  state: string;
  target: string | null;
  created: number;
  url: string;
  commit_msg?: string | null;
}

export async function listDeployments(
  limit = 10,
  project = DEFAULT_PROJECT,
): Promise<VercelDeployment[]> {
  const res = await fetch(
    `${VERCEL_API}/v6/deployments?app=${encodeURIComponent(project)}&limit=${Math.min(50, limit)}&${teamParam()}`,
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  if (!res.ok) {
    throw new Error(`Vercel deployments ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as {
    deployments?: Array<{
      uid: string;
      name: string;
      state?: string;
      readyState?: string;
      target?: string | null;
      created: number;
      url: string;
      meta?: { githubCommitMessage?: string };
    }>;
  };
  return (data.deployments ?? []).map((d) => ({
    uid: d.uid,
    name: d.name,
    state: d.state ?? d.readyState ?? "UNKNOWN",
    target: d.target ?? null,
    created: d.created,
    url: d.url,
    commit_msg: d.meta?.githubCommitMessage ?? null,
  }));
}

export interface VercelLogLine {
  level: string;
  message: string;
  timestamp: number;
}

export async function getDeploymentEvents(
  deploymentId: string,
  limit = 50,
): Promise<VercelLogLine[]> {
  // Build/runtime events. For deployments that errored before READY this may
  // be sparse — caller should handle empty.
  const res = await fetch(
    `${VERCEL_API}/v3/deployments/${deploymentId}/events?limit=${Math.min(200, limit)}&${teamParam()}`,
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  if (!res.ok) {
    throw new Error(`Vercel events ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as Array<{
    type?: string;
    payload?: { text?: string; date?: number };
    text?: string;
    created?: number;
  }>;
  const arr = Array.isArray(data) ? data : [];
  return arr.slice(-limit).map((e) => ({
    level: e.type ?? "log",
    message: e.payload?.text ?? e.text ?? "",
    timestamp: e.payload?.date ?? e.created ?? 0,
  }));
}
