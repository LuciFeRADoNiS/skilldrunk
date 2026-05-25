import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { adminClient } from "@/lib/context";
import { ChatClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { user } = await requireUser("/chat");
  const sb = adminClient();
  const { session } = await searchParams;

  const { data: sessions } = await sb
    .from("rt_chat_sessions")
    .select("id,title,message_count,last_message_at,total_cost_usd")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20);

  let messages: any[] = [];
  let currentSession = session;

  if (currentSession) {
    const { data: msgs } = await sb
      .from("rt_chat_messages")
      .select("id,role,content_text,content_json,created_at,model")
      .eq("session_id", currentSession)
      .order("created_at");
    messages = msgs ?? [];
  }

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-[260px_1fr] gap-4 px-4 py-6">
      <aside className="space-y-2">
        <Link
          href="/chat"
          className="block rounded-md border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-950/40"
        >
          + Yeni sohbet
        </Link>
        <div className="mt-4 mb-2 text-xs uppercase tracking-wider text-neutral-500">
          Geçmiş
        </div>
        <div className="space-y-1">
          {(sessions ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/chat?session=${s.id}`}
              className={`block rounded-md px-3 py-2 text-sm ${
                s.id === currentSession
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <div className="truncate">{s.title || "Yeni sohbet"}</div>
              <div className="text-[10px] text-neutral-600">
                {s.message_count} mesaj ·{" "}
                {s.last_message_at
                  ? new Date(s.last_message_at).toLocaleDateString("tr-TR")
                  : "—"}
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border border-neutral-800 bg-neutral-900/30">
        <ChatClient
          initialMessages={messages}
          sessionId={currentSession ?? null}
        />
      </section>
    </main>
  );
}
