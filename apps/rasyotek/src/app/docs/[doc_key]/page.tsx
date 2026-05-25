import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function DocPage({
  params,
}: {
  params: Promise<{ doc_key: string }>;
}) {
  const { doc_key } = await params;
  await requireUser(`/docs/${doc_key}`);

  const sb = adminClient();
  const { data: doc } = await sb
    .from("rt_documents")
    .select("*")
    .eq("doc_key", doc_key)
    .single();

  if (!doc) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="mb-6 inline-block text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
      >
        ← Paket
      </Link>

      <header className="mb-6 border-b border-neutral-800 pb-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
            {doc.doc_type}
          </span>
          <span className="text-[10px] text-neutral-500">
            {doc.word_count} kelime · son: {new Date(doc.updated_at).toLocaleDateString("tr-TR")}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
        {doc.content_summary && (
          <p className="mt-2 text-sm text-neutral-400">{doc.content_summary}</p>
        )}
      </header>

      <article className="prose prose-invert prose-sm max-w-none prose-headings:tracking-tight prose-code:bg-neutral-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content_md}</ReactMarkdown>
      </article>

      {doc.doc_type === "xlsx-summary" && (
        <div className="mt-8 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          📥 Excel dosyasını indir:{" "}
          <a
            href={`/files/${doc.file_path?.split("/").pop()}`}
            className="font-medium underline hover:no-underline"
            download
          >
            {doc.file_path?.split("/").pop()}
          </a>
        </div>
      )}
    </main>
  );
}
