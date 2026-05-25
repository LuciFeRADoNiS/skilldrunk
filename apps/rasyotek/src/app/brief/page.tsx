import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";
import { BriefClient } from "./client";

export const dynamic = "force-dynamic";

export default async function BriefPage() {
  const { user } = await requireUser("/brief");
  const sb = adminClient();
  const { data: briefs } = await sb
    .from("rt_briefs")
    .select("id,brief_type,title,summary,body_md,model,cost_usd,created_at,pushed_telegram_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: notesCount } = await sb
    .from("rt_notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-block text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
      >
        ← Paket
      </Link>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Brief Üret</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Notlarından + chat geçmişinden 200-500 kelime özet. Toplantı sonrası,
          haftalık veya ad-hoc kullanım.
        </p>
      </header>

      <BriefClient notesCount={notesCount ?? 0} />

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-medium">Üretilen Brief'ler</h2>
        <div className="space-y-4">
          {(briefs ?? []).map((b) => (
            <details
              key={b.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
            >
              <summary className="cursor-pointer">
                <div className="inline-flex flex-col gap-1 align-top">
                  <span className="text-xs uppercase tracking-wider text-neutral-500">
                    {b.brief_type} ·{" "}
                    {new Date(b.created_at).toLocaleString("tr-TR")}
                  </span>
                  <span className="font-medium">{b.title}</span>
                  <span className="text-sm text-neutral-400">{b.summary}</span>
                </div>
              </summary>
              <div className="prose prose-invert prose-sm mt-4 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {b.body_md}
                </ReactMarkdown>
              </div>
            </details>
          ))}
          {(!briefs || briefs.length === 0) && (
            <p className="text-center text-sm text-neutral-500">
              Henüz brief üretilmedi. Yukarıdaki butonla ilk brief'i oluştur.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
