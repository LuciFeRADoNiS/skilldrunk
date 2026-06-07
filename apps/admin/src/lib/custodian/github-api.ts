// apps/admin/src/lib/custodian/github-api.ts — Faz 2
//
// Read-only GitHub REST helper for custodian. Token via env GITHUB_TOKEN.
// Default repo LuciFeRADoNiS/skilldrunk.

const GH_API = "https://api.github.com";
const DEFAULT_REPO = "LuciFeRADoNiS/skilldrunk";

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN env yok — GitHub okuma tool'u devre dışı");
  return t;
}

export interface GithubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export async function listCommits(
  limit = 10,
  repo = DEFAULT_REPO,
  branch = "main",
): Promise<GithubCommit[]> {
  const res = await fetch(
    `${GH_API}/repos/${repo}/commits?sha=${branch}&per_page=${Math.min(50, limit)}`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub commits ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as Array<{
    sha: string;
    html_url: string;
    commit: { message: string; author?: { name?: string; date?: string } };
  }>;
  return data.map((c) => ({
    sha: c.sha.slice(0, 8),
    message: c.commit.message.split("\n")[0],
    author: c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
    url: c.html_url,
  }));
}
