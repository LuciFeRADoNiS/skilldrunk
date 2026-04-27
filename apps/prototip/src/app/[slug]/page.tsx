import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type AppRow = {
  slug: string;
  title: string;
  tagline: string | null;
  category: string;
  status: string;
  url: string;
  subdomain: string | null;
  github_repo: string | null;
  vercel_project: string | null;
  stack: string[];
  tags: string[];
  description_md: string | null;
  featured: boolean;
  is_public: boolean;
  first_deployed_at: string | null;
  last_deployed_at: string | null;
};

const CAT_LABEL: Record<string, string> = {
  skilldrunk: "Ekosistem",
  tool: "Araç",
  enco: "ENCO",
  personal: "Kişisel",
  experiment: "Deney",
};

const CAT_COLOR: Record<string, string> = {
  skilldrunk: "text-orange-400 border-orange-900/60",
  tool: "text-emerald-400 border-emerald-900/60",
  enco: "text-purple-400 border-purple-900/60",
  personal: "text-blue-400 border-blue-900/60",
  experiment: "text-neutral-400 border-neutral-800",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("pt_apps")
    .select("title, tagline")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "live")
    .maybeSingle();
  if (!data) return { title: "Bulunamadı" };
  return {
    title: `${data.title} · prototip`,
    description: data.tagline ?? `${data.title} — Özgür'ün ekosistemi`,
  };
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAnonClient();
  const { data: app } = await supabase
    .from("pt_apps")
    .select(
      "slug, title, tagline, category, status, url, subdomain, github_repo, vercel_project, stack, tags, description_md, featured, is_public, first_deployed_at, last_deployed_at",
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("status", "live")
    .maybeSingle<AppRow>();

  if (!app) notFound();

  // Related apps (same category)
  const { data: related } = await supabase
    .from("pt_apps")
    .select("slug, title, tagline, category, url, subdomain")
    .eq("is_public", true)
    .eq("status", "live")
    .eq("category", app.category)
    .neq("slug", app.slug)
    .limit(4);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-neutral-900">
        <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
          <Link
            href="/"
            className="font-mono text-xs text-neutral-500 hover:text-neutral-300"
          >
            ← prototip
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${CAT_COLOR[app.category] ?? "text-neutral-400 border-neutral-800"}`}
            >
              {CAT_LABEL[app.category] ?? app.category}
            </span>
            {app.featured && (
              <span className="text-amber-400" title="featured">
                ★
              </span>
            )}
            {app.subdomain && (
              <span className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                {app.subdomain}.skilldrunk.com
              </span>
            )}
          </div>

          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {app.title}
          </h1>
          {app.tagline && (
            <p className="mt-4 max-w-2xl text-balance text-lg text-neutral-300">
              {app.tagline}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Aç ↗
            </a>
            {app.github_repo && (
              <a
                href={`https://github.com/${app.github_repo}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                GitHub
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Meta */}
      <section className="border-b border-neutral-900">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <dl className="grid grid-cols-2 gap-y-3 text-xs sm:grid-cols-4">
            <Meta label="Status" value={app.status} />
            <Meta label="URL" value={app.url.replace("https://", "")} mono />
            <Meta label="İlk Deploy" value={formatDate(app.first_deployed_at)} />
            <Meta label="Son Deploy" value={formatDate(app.last_deployed_at)} />
            {app.vercel_project && (
              <Meta label="Vercel" value={app.vercel_project} mono />
            )}
            {app.github_repo && (
              <Meta label="GitHub" value={app.github_repo} mono />
            )}
          </dl>
          {app.stack.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                Stack
              </p>
              <div className="flex flex-wrap gap-1.5">
                {app.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded bg-neutral-900 px-2 py-0.5 font-mono text-[10px] text-neutral-400"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Markdown body */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-10">
          {app.description_md ? (
            <div className="prose prose-invert prose-lg max-w-none prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-p:text-neutral-300 prose-li:text-neutral-300 prose-strong:text-neutral-100 prose-a:text-orange-400 prose-code:text-orange-300 prose-code:bg-neutral-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-neutral-950 prose-pre:border prose-pre:border-neutral-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {app.description_md}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm italic text-neutral-500">
              Henüz dokümante edilmemiş.
            </p>
          )}
        </div>
      </section>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="border-t border-neutral-900 bg-neutral-950">
          <div className="mx-auto max-w-3xl px-6 py-10">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Aynı kategoriden
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/${r.slug}`}
                  className="rounded-lg border border-neutral-900 bg-neutral-950 p-4 transition hover:border-neutral-700"
                >
                  <p className="font-semibold">{r.title}</p>
                  {r.tagline && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                      {r.tagline}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono text-[11px]" : "text-sm"} text-neutral-300`}
      >
        {value}
      </dd>
    </div>
  );
}
