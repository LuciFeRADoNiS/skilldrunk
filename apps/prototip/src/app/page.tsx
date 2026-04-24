import { createAnonClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min ISR fallback

type App = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  category: string;
  url: string;
  subdomain: string | null;
  github_repo: string | null;
  stack: string[];
  tags: string[];
  featured: boolean;
  first_deployed_at: string | null;
  last_deployed_at: string | null;
};

const CAT_COLOR: Record<string, string> = {
  skilldrunk: "text-orange-400 border-orange-900 bg-orange-500/5",
  tool: "text-emerald-400 border-emerald-900 bg-emerald-500/5",
  enco: "text-purple-400 border-purple-900 bg-purple-500/5",
  personal: "text-blue-400 border-blue-900 bg-blue-500/5",
  experiment: "text-neutral-400 border-neutral-800 bg-neutral-900/50",
};

const CAT_LABEL: Record<string, string> = {
  skilldrunk: "Ekosistem",
  tool: "Araç",
  enco: "ENCO",
  personal: "Kişisel",
  experiment: "Deney",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function groupByMonth(apps: App[]): Array<[string, App[]]> {
  const map = new Map<string, App[]>();
  for (const a of apps) {
    const d = a.last_deployed_at ?? a.first_deployed_at;
    if (!d) continue;
    const key = d.slice(0, 7); // YYYY-MM
    const arr = map.get(key) ?? [];
    arr.push(a);
    map.set(key, arr);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });
}

export default async function PrototipHome() {
  const supabase = createAnonClient();
  const { data } = await supabase
    .from("pt_apps")
    .select(
      "id, slug, title, tagline, category, url, subdomain, github_repo, stack, tags, featured, first_deployed_at, last_deployed_at",
    )
    .eq("is_public", true)
    .eq("status", "live")
    .order("last_deployed_at", { ascending: false, nullsFirst: false })
    .returns<App[]>();

  const apps = data ?? [];
  const featured = apps.filter((a) => a.featured);
  const timeline = groupByMonth(apps);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-neutral-900">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(249,115,22,0.12), transparent 40%), radial-gradient(circle at 80% 40%, rgba(59,130,246,0.08), transparent 40%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
            part of skilldrunk
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            prototip
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-lg text-neutral-300 sm:text-xl">
            Özgür'ün inşa ettiği ne varsa. Ekosistem, araçlar, deneyler —
            kronolojik. Her şey canlı, her şey şeffaf.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-400">
            <span className="rounded-full border border-neutral-800 px-3 py-1">
              {apps.length} proje
            </span>
            <span className="rounded-full border border-neutral-800 px-3 py-1">
              {new Set(apps.map((a) => a.category)).size} kategori
            </span>
            <a
              href="https://skilldrunk.com"
              className="rounded-full border border-orange-900 bg-orange-500/10 px-3 py-1 text-orange-400 transition hover:bg-orange-500/20"
            >
              skilldrunk.com ↗
            </a>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="border-b border-neutral-900">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-neutral-400">
              ★ Öne Çıkanlar
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featured.map((a) => (
                <AppCard key={a.id} app={a} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="mb-8 text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Kronolojik
          </h2>
          <div className="space-y-10">
            {timeline.map(([ym, items]) => (
              <div key={ym}>
                <h3 className="mb-4 font-mono text-sm text-neutral-500">
                  {monthLabel(ym)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((a) => (
                    <AppCard key={a.id} app={a} />
                  ))}
                </div>
              </div>
            ))}
            {timeline.length === 0 && (
              <div className="rounded-lg border border-dashed border-neutral-900 p-12 text-center text-sm text-neutral-500">
                Henüz public app yok. Admin'den is_public açarsan burada
                görünür.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900">
        <div className="mx-auto max-w-5xl px-6 py-10 text-xs text-neutral-600">
          <p>
            Gerçek zamanlı ekosistem envanteri. Admin panelinden yönetilir —
            yeni bir şey eklendiğinde burada görünür.
          </p>
          <p className="mt-2">
            <a
              href="https://skilldrunk.com"
              className="hover:text-neutral-400"
            >
              skilldrunk.com
            </a>
            {" · "}
            <a
              href="https://skilldrunk.com/about"
              className="hover:text-neutral-400"
            >
              about
            </a>
            {" · © "}
            {new Date().getFullYear()} Özgür Gür
          </p>
        </div>
      </footer>
    </main>
  );
}

function AppCard({ app, featured }: { app: App; featured?: boolean }) {
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noreferrer"
      className={`group block rounded-xl border p-5 transition hover:border-neutral-700 ${CAT_COLOR[app.category] ?? "border-neutral-900 bg-neutral-950"}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded border border-current/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">
          {CAT_LABEL[app.category] ?? app.category}
        </span>
        {featured && (
          <span className="text-amber-400" title="featured">
            ★
          </span>
        )}
        {app.subdomain && (
          <span className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500">
            {app.subdomain}.skilldrunk.com
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-white">
        {app.title}
      </h3>
      {app.tagline && (
        <p className="mt-1.5 text-sm text-neutral-400 line-clamp-2">
          {app.tagline}
        </p>
      )}
      {app.stack.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {app.stack.slice(0, 5).map((s) => (
            <span
              key={s}
              className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500">
        <span className="font-mono">
          {app.url.replace("https://", "").replace(/\/$/, "")}
        </span>
        <span className="font-mono">
          {formatDate(app.last_deployed_at ?? app.first_deployed_at)}
        </span>
      </div>
    </a>
  );
}
