import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  source: string;
  kind: string;
  title: string;
  body: string | null;
  tags: string[];
  occurred_at: string;
};

const SOURCES = ["obsidian", "github", "calendar", "manual", "other"] as const;

const SOURCE_COLORS: Record<string, string> = {
  obsidian: "bg-purple-500/20 text-purple-300 border-purple-900",
  github: "bg-neutral-500/20 text-neutral-300 border-neutral-800",
  calendar: "bg-blue-500/20 text-blue-300 border-blue-900",
  manual: "bg-orange-500/20 text-orange-300 border-orange-900",
  other: "bg-neutral-500/10 text-neutral-400 border-neutral-800",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toISOString().split("T")[0];
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const { source, q } = await searchParams;
  const { supabase } = await requireUser(
    `/events${source ? `?source=${source}` : ""}${q ? `${source ? "&" : "?"}q=${q}` : ""}`
  );

  let query = supabase
    .from("az_events")
    .select("id, source, kind, title, body, tags, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (source && (SOURCES as readonly string[]).includes(source)) {
    query = query.eq("source", source);
  }

  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    query = query.or(`title.ilike.${needle},body.ilike.${needle},kind.ilike.${needle}`);
  }

  const { data } = await query.returns<EventRow[]>();
  const events = data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <span className="ml-auto font-mono text-xs text-neutral-500">
          {events.length} {events.length === 200 ? "(capped)" : ""}
        </span>
      </div>

      {/* Filters */}
      <form
        action="/events"
        method="get"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/events"
            className={`rounded-md border px-2.5 py-1 text-xs ${!source ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
          >
            all
          </Link>
          {SOURCES.map((s) => (
            <Link
              key={s}
              href={`/events?source=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-md border px-2.5 py-1 text-xs capitalize ${source === s ? "border-orange-500 bg-orange-500/10 text-orange-400" : "border-neutral-800 text-neutral-400 hover:bg-neutral-900"}`}
            >
              {s}
            </Link>
          ))}
        </div>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ara…"
          className="ml-auto w-48 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-sm placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none"
        />
        {source && <input type="hidden" name="source" value={source} />}
      </form>

      {/* List */}
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-12 text-center text-sm text-neutral-500">
          {q || source
            ? "Bu filtrede event bulunamadı."
            : "Henüz event yok. POST /api/events ile ekleyebilirsin."}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 px-4 py-3">
              <span
                className={`mt-0.5 h-fit rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${SOURCE_COLORS[e.source] ?? SOURCE_COLORS.other}`}
              >
                {e.source}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mr-2 font-mono text-[11px] text-neutral-500">
                      {e.kind}
                    </span>
                    <span className="font-medium">{e.title}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-neutral-500">
                    {relTime(e.occurred_at)}
                  </span>
                </div>
                {e.body && (
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-400">
                    {e.body}
                  </p>
                )}
                {e.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
