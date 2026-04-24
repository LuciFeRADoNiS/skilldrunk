import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function BriefView({ brief }: { brief: Brief }) {
  const eventsCount =
    typeof brief.metadata?.events_in_window === "number"
      ? brief.metadata.events_in_window
      : null;

  return (
    <article className="mb-8 rounded-xl border border-neutral-900 bg-neutral-950 p-6">
      {/* Meta */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-4 text-xs text-neutral-500">
        <span className="font-mono tabular-nums text-neutral-400">
          {brief.brief_date}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {eventsCount !== null && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-mono">
              {eventsCount} event
            </span>
          )}
          {brief.model && (
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-mono text-orange-400">
              ✦ {brief.model}
            </span>
          )}
          {!brief.model && (
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-mono text-neutral-500">
              no-llm
            </span>
          )}
          {brief.pushed_at && (
            <span
              className="rounded-full bg-blue-500/10 px-2 py-0.5 font-mono text-blue-400"
              title={`pushed ${brief.pushed_at}`}
            >
              📤 telegram
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="prose prose-invert prose-sm max-w-none prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-base prose-h2:mt-5 prose-h2:text-neutral-300 prose-p:text-neutral-300 prose-li:text-neutral-300 prose-strong:text-neutral-100 prose-a:text-orange-400">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {brief.body_md}
        </ReactMarkdown>
      </div>
    </article>
  );
}
