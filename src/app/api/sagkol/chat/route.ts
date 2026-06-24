import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop, type SagkolEvent, type SagkolUser } from "@sagkol/core";
import { createClient } from "@/lib/supabase/server";
import { SupabaseStore } from "@/lib/sagkol/store";
import { TodusAdapter } from "@/lib/sagkol/adapter";

export const runtime = "nodejs";
export const maxDuration = 300;

type ChatBody = {
  conversationId?: string;
  userMessage?: string;
  clientToolResults?: { toolUseId: string; ok: boolean; result: unknown }[];
  screen?: unknown;
};

/** Cookie'den kimlik + rol çöz. Oturum yoksa read-only misafir. */
async function resolveUser(): Promise<SagkolUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { key: "guest", name: "Ziyaretçi", role: "guest" };
  }
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role, username, display_name")
    .eq("id", user.id)
    .single();
  return {
    key: user.id,
    name: profile?.display_name ?? profile?.username ?? "Özgür",
    role: profile?.role ?? "user",
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY yok", { status: 500 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Geçersiz istek", { status: 400 });
  }

  const user = await resolveUser();
  const store = new SupabaseStore();
  const adapter = new TodusAdapter();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation = await store.loadOrCreateConversation(body.conversationId, user.key);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (ev: SagkolEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`));
        } catch {
          /* stream kapanmış olabilir */
        }
      };
      // 15 sn heartbeat — proxy bağlantıyı düşürmesin
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      emit({ type: "start", conversationId: conversation.id } as SagkolEvent);
      try {
        await runAgentLoop(adapter, store, anthropic, {
          user,
          conversation,
          emit,
          signal: req.signal,
          userMessage: body.userMessage,
          screen: body.screen,
          clientToolResults: body.clientToolResults,
        });
      } catch (e) {
        emit({ type: "error", message: e instanceof Error ? e.message : "Beklenmeyen hata" });
        emit({ type: "done", reason: "error" });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* zaten kapalı */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
