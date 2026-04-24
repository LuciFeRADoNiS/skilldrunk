import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/admin";
import { BriefView } from "./brief-view";
import { generateBriefNow } from "./actions";

export const dynamic = "force-dynamic";

type Brief = {
  id: string;
  brief_date: string;
  summary: string;
  body_md: string;
  model: string | null;
  pushed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default async function BriefHome() {
  const { user } = await requireUser("/");
  const admin = createAdminClient();
  if (!admin) {
    return <p className="p-8">admin client missing</p>;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: todayBrief } = await admin
    .from("br_briefings")
    .select("*")
    .eq("user_id", user.id)
    .eq("brief_date", today)
    .maybeSingle<Brief>();

  const { data: history } = await admin
    .from("br_briefings")
    .select("id, brief_date, summary, pushed_at")
    .eq("user_id", user.id)
    .order("brief_date", { ascending: false })
    .limit(14);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
            skilldrunk · günlük
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Brief</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Her sabah 07:00'de Obsidian'dan özet
          </p>
        </div>
        <span className="font-mono text-xs text-neutral-500">
          {user.email}
        </span>
      </div>

      {todayBrief ? (
        <BriefView brief={todayBrief} />
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-neutral-800 bg-neutral-950 p-8 text-center">
          <p className="text-sm text-neutral-400">
            Bugün için brief henüz oluşturulmamış.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Cron her sabah 04:00 UTC'de çalışır. Şimdi elle tetikle:
          </p>
          <form
            action={async () => {
              "use server";
              await generateBriefNow();
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              ✦ Bugün için oluştur
            </button>
          </form>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Son 14 Gün
        </h2>
        {!history || history.length === 0 ? (
          <p className="text-sm text-neutral-500">Henüz arşiv yok.</p>
        ) : (
          <ul className="divide-y divide-neutral-900 rounded-lg border border-neutral-900 bg-neutral-950">
            {history.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/daily/${h.brief_date}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-900"
                >
                  <span className="font-mono text-xs tabular-nums text-neutral-500">
                    {h.brief_date}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {h.summary}
                  </span>
                  {h.pushed_at && (
                    <span
                      className="shrink-0 text-xs text-neutral-600"
                      title="Telegram push"
                    >
                      📤
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
