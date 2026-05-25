import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireUser("/");
  const sb = adminClient();

  const { data: docs } = await sb
    .from("rt_documents")
    .select("doc_key,title,doc_type,content_summary,word_count,updated_at")
    .order("doc_key");

  const { data: risks } = await sb
    .from("rt_risks")
    .select("risk_key,scenario_title,score,priority,status")
    .order("score", { ascending: false });

  const { count: notesCount } = await sb
    .from("rt_notes")
    .select("id", { count: "exact", head: true });

  const { count: briefsCount } = await sb
    .from("rt_briefs")
    .select("id", { count: "exact", head: true });

  const daysToMeeting = Math.max(
    0,
    Math.ceil(
      (new Date("2026-06-08T14:00:00+03:00").getTime() - Date.now()) / 86400000,
    ),
  );

  const topRisks = (risks ?? []).slice(0, 4);
  const totalScore = (risks ?? []).reduce((a, r) => a + (r.score ?? 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
          part of skilldrunk
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Rasyotek Strateji Çalışma Alanı
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-400">
          MoveTech × Rasyotek partnership müzakere paketi + AI strateji
          asistanı. 8 Haziran 14:00 toplantısına hazırlık.
        </p>
      </header>

      <section className="mb-10 grid gap-3 sm:grid-cols-4">
        <StatCard label="Toplantıya kalan" value={`${daysToMeeting} gün`} accent="amber" />
        <StatCard label="Paket dosyaları" value={String(docs?.length ?? 0)} accent="blue" />
        <StatCard label="Aktif risk skoru" value={String(totalScore)} accent="red" />
        <StatCard label="Notlar / Brief" value={`${notesCount ?? 0} / ${briefsCount ?? 0}`} accent="green" />
      </section>

      <section className="mb-10 grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/chat"
          title="🧠 ZeuX-Rasyotek ile sohbet"
          body="Paket içeriğine tam hakim. Notlarını yaz, soru sor, strateji önerisi al."
        />
        <ActionCard
          href="/notes"
          title="📝 Hızlı not al"
          body="Toplantı sırasında veya sonrasında dökersin. Sonra brief'e dönüşür."
        />
        <ActionCard
          href="/brief"
          title="📰 Brief üret"
          body="Notlarından + chat geçmişinden 500-kelime özet."
        />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">⚠️ En Yüksek 4 Risk</h2>
          <Link
            href="/risks"
            className="text-xs uppercase tracking-wider text-neutral-400 hover:text-neutral-100"
          >
            Tüm risk matrisi →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {topRisks.map((r) => (
            <div
              key={r.risk_key}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <PriorityBadge priority={r.priority} />
                <span className="text-xs text-neutral-500">{r.risk_key}</span>
                <span className="ml-auto text-sm font-semibold">
                  Skor: {r.score}
                </span>
              </div>
              <p className="text-sm">{r.scenario_title}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">📚 Paket İçeriği</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(docs ?? []).map((d) => (
            <Link
              key={d.doc_key}
              href={`/docs/${d.doc_key}`}
              className="block rounded-lg border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-700 hover:bg-neutral-900"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
                  {d.doc_type === "xlsx-summary" ? "xlsx" : "markdown"}
                </span>
                <span className="text-[10px] text-neutral-500">
                  {d.word_count} kelime
                </span>
              </div>
              <h3 className="mb-1 font-medium">{d.title}</h3>
              <p className="text-sm text-neutral-400">{d.content_summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 border-t border-neutral-800 pt-6 text-xs text-neutral-500">
        Sadece <code>ozgurgur@gmail.com</code> erişimi. Chat geçmişi + notlar Supabase'de persist edilir.
        Telegram: <code>@skilldrunk_bot</code> → <code>/rasyotek</code>.
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "blue" | "red" | "green";
}) {
  const colors = {
    amber: "text-amber-300",
    blue: "text-sky-300",
    red: "text-rose-300",
    green: "text-emerald-300",
  };
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${colors[accent]}`}>{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 transition hover:border-amber-700/40 hover:from-neutral-800"
    >
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-neutral-400">{body}</p>
    </Link>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const colors: Record<string, string> = {
    red: "bg-rose-900/50 text-rose-300 border-rose-800",
    orange: "bg-orange-900/50 text-orange-300 border-orange-800",
    yellow: "bg-amber-900/50 text-amber-300 border-amber-800",
    green: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
  };
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider ${colors[priority] ?? ""}`}
    >
      {priority}
    </span>
  );
}
