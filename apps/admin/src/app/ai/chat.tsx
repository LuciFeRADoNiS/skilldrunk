"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askAssistant, type ChatMessage, type ToolCallTrace } from "@/app/actions/ai";

const SUGGESTED = [
  "Ekosistemin durumu ne?",
  "Hangi subdomain'ler public?",
  "Bir subdomain nasıl eklerim?",
  "radyo.skilldrunk.com için sonraki adımlar?",
  "Kaç event analiz'de var?",
];

export function AiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const nextHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextHistory);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await askAssistant(messages, trimmed);
      if (res.ok) {
        setMessages([
          ...nextHistory,
          {
            role: "assistant",
            content: res.answer,
            tool_calls: res.tool_calls,
          },
        ]);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] flex-col rounded-xl border border-neutral-900 bg-neutral-950">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-4xl">🤖</div>
            <div>
              <p className="text-sm text-neutral-400">
                Ne sormak istersin? Birkaç örnek:
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={pending}
                  className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-orange-500/50 hover:bg-neutral-800 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
                  m.role === "user"
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {m.role === "user" ? "sen" : "🤖"}
              </div>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-orange-500/10 text-neutral-100"
                    : "bg-neutral-900 text-neutral-200"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <>
                    {m.tool_calls && m.tool_calls.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {m.tool_calls.map((t, j) => (
                          <ToolBadge key={j} trace={t} />
                        ))}
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-headings:mt-3 prose-headings:mb-1.5 prose-a:text-orange-400 prose-code:text-orange-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs">
              🤖
            </div>
            <div className="rounded-lg bg-neutral-900 px-4 py-2.5">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-neutral-900 p-4 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
          placeholder="Ekosistem hakkında sor…"
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm placeholder:text-neutral-600 focus:border-orange-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? "…" : "Gönder"}
        </button>
      </form>
    </div>
  );
}

function ToolBadge({ trace }: { trace: ToolCallTrace }) {
  const ok = !trace.error;
  const inputSummary = Object.entries(trace.input)
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(" ");
  return (
    <div
      className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${
        ok
          ? "border-emerald-900 bg-emerald-500/5 text-emerald-300"
          : "border-red-900 bg-red-500/5 text-red-300"
      }`}
    >
      <span className="opacity-70">🔧 {trace.name}</span>
      {inputSummary && <span className="opacity-60"> ({inputSummary})</span>}
      <span className="opacity-50">
        {" → "}
        {ok ? "ok" : `error: ${trace.error}`}
      </span>
    </div>
  );
}
