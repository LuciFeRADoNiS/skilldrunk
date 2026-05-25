"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";

type Message = {
  id?: string;
  role: "user" | "assistant" | "tool";
  content_text: string;
  created_at?: string;
};

const SUGGESTED_PROMPTS = [
  "Adnan 1:1 toplantısında ne sormalıyım?",
  "Fuat'a sorulacak 4 kritik soruyu bana hatırlat",
  "Toplantıda 'RasyoLog SKU mu holding mi' sorusunun analizini yap",
  "S1 riski için en kritik mitigation aksiyonu nedir?",
  "Bull senaryoda 2027 EOY ARR ne ve break-even ayı kaç?",
];

export function ChatClient({
  initialMessages,
  sessionId: initialSessionId,
}: {
  initialMessages: Message[];
  sessionId: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [streaming, setStreaming] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(prompt: string) {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setInput("");
    setStreaming("");

    const userMsg: Message = { role: "user", content_text: prompt };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: prompt,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content_text: `❌ Hata: ${err}`,
          },
        ]);
        return;
      }

      const data = await res.json();
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        // Update URL without full navigation
        window.history.replaceState(
          null,
          "",
          `/chat?session=${data.session_id}`,
        );
      }
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content_text: data.reply,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content_text: `❌ Bağlantı hatası: ${e.message}`,
        },
      ]);
    } finally {
      setLoading(false);
      setStreaming("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <h2 className="font-medium">ZeuX-Rasyotek</h2>
          <span className="text-xs text-neutral-500">
            Claude Sonnet 4.6 · paket context yüklü
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 text-sm text-neutral-400">
              👋 Merhaba Özgür. Paketin tamamına hakimim (5 deliverable + 9 risk
              senaryosu + notların). Bir şey sor veya öneri al.
            </p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={loading}
                  className="block w-full rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-amber-700/40 hover:bg-neutral-900"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageView key={i} msg={m} />
        ))}

        {loading && (
          <div className="my-4 flex items-center gap-2 text-sm text-neutral-500">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            ZeuX-Rasyotek düşünüyor...
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-neutral-800 px-5 py-3"
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Soru sor, not paylaş, strateji öner... (Enter gönder, Shift+Enter yeni satır)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-amber-700/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Gönder
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageView({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`my-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-2xl rounded-lg px-4 py-3 ${
          isUser
            ? "bg-amber-900/30 text-neutral-100"
            : "bg-neutral-900/60 text-neutral-200"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{msg.content_text}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content_text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
