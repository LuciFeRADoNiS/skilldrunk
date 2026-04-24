import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/nav";
import { AppActions } from "./app-actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  category: string;
  status: string;
  url: string;
  subdomain: string | null;
  vercel_project: string | null;
  github_repo: string | null;
  stack: string[];
  tags: string[];
  featured: boolean;
  is_public: boolean;
  last_deployed_at: string | null;
};

const CAT_COLOR: Record<string, string> = {
  skilldrunk: "bg-orange-500/10 text-orange-400 border-orange-900",
  tool: "bg-emerald-500/10 text-emerald-400 border-emerald-900",
  enco: "bg-purple-500/10 text-purple-400 border-purple-900",
  personal: "bg-blue-500/10 text-blue-400 border-blue-900",
  experiment: "bg-neutral-500/10 text-neutral-400 border-neutral-800",
  archived: "bg-neutral-900 text-neutral-600 border-neutral-900",
};

export default async function AppsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const { supabase, profile } = await requireAdmin("/apps");

  let q = supabase
    .from("pt_apps")
    .select(
      "id, slug, title, tagline, category, status, url, subdomain, vercel_project, github_repo, stack, tags, featured, is_public, last_deployed_at",
    )
    .order("last_deployed_at", { ascending: false, nullsFirst: false });
  if (category) q = q.eq("category", category);

  const { data } = await q.returns<Row[]>();
  const apps = data ?? [];

  const cats = ["skilldrunk", "tool", "personal", "experiment", "enco", "archived"];

  return (
    <>
      <AdminNav userLabel={profile?.display_name ?? undefined} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Apps Catalog</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Ekosistem envanteri. Public olanlar prototip.skilldrunk.com'da
              görünür.
            </p>
          </div>
          <a
            href="https://prototip.skilldrunk.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
          >
            prototip.skilldrunk.com ↗
          </a>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          <a
            href="/apps"
            className={`rounded-md border px-3 py-1 ${!category ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
          >
            all
          </a>
          {cats.map((c) => (
            <a
              key={c}
              href={`/apps?category=${c}`}
              className={`rounded-md border px-3 py-1 font-mono ${category === c ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
            >
              {c}
            </a>
          ))}
        </div>

        <div className="grid gap-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-neutral-900 bg-neutral-950 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold hover:underline"
                    >
                      {a.title}
                    </a>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${CAT_COLOR[a.category] ?? ""}`}
                    >
                      {a.category}
                    </span>
                    {a.featured && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        ★
                      </span>
                    )}
                    {a.is_public ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        public
                      </span>
                    ) : (
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">
                        private
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${a.status === "live" ? "bg-emerald-500/10 text-emerald-400" : a.status === "draft" ? "bg-amber-500/10 text-amber-400" : "bg-neutral-800 text-neutral-500"}`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {a.tagline && (
                    <p className="text-sm text-neutral-400">{a.tagline}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] text-neutral-500">
                    <span>{a.url.replace("https://", "")}</span>
                    {a.vercel_project && <span>· vercel: {a.vercel_project}</span>}
                    {a.github_repo && <span>· gh: {a.github_repo}</span>}
                    {a.last_deployed_at && (
                      <span>· last: {a.last_deployed_at.slice(0, 10)}</span>
                    )}
                  </div>
                  {a.stack.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.stack.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <AppActions
                  appId={a.id}
                  featured={a.featured}
                  isPublic={a.is_public}
                  status={a.status}
                />
              </div>
            </div>
          ))}
          {apps.length === 0 && (
            <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
              Kayıt yok.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
