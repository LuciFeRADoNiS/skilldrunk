import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { runAgentLoop, type SagkolEvent, type SagkolUser } from "@sagkol/core";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseStore } from "@/lib/sagkol/store";
import { TodusAdapter } from "@/lib/sagkol/adapter";

export const runtime = "nodejs";
export const maxDuration = 300;

// Opus 4.8 fiyatı (per 1M token, USD) — sd_ai_usage maliyet izlemesi için
const OPUS_PRICE = { input: 15.0, output: 75.0, cacheRead: 1.5 };

type ChatBody = {
  conversationId?: string;
  userMessage?: string;
  clientToolResults?: { toolUseId: string; ok: boolean; result: unknown }[];
  screen?: unknown;
};

/**
 * Cookie'den kimlik + rol çöz. tÖdÜs Özgür'ün KİŞİSEL panosu + tool'lar service_role
 * kullanıyor (RLS bypass) → kişisel veri sızıntısını önlemek için SADECE admin erişebilir.
 * Null = yetkisiz.
 */
async function resolveAdminUser(): Promise<SagkolUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role, username, display_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null; // kişisel pano → admin-only
  return {
    key: user.id,
    name: profile?.display_name ?? profile?.username ?? "Özgür",
    role: "admin",
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY yok", { status: 500 });
  }

  // tÖdÜs kişisel pano — copilot admin-only (veri sızıntısı + maliyet suistimali koruması)
  const user = await resolveAdminUser();
  if (!user) {
    return new Response("Bu copilot Özgür'ün kişisel tÖdÜs panosuna özel — admin girişi gerekli.", {
      status: 403,
    });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Geçersiz istek", { status: 400 });
  }

  const store = new SupabaseStore();
  const adapter = new TodusAdapter();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation = await store.loadOrCreateConversation(body.conversationId, user.key);

  // Usage toplama → sd_ai_usage (admin.skilldrunk.com/usage panelinde görünsün)
  const usageAgg = { input: 0, output: 0, cacheRead: 0 };
  const startedAt = Date.now();
  let runError: string | null = null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (ev: SagkolEvent) => {
        if (ev.type === "usage") {
          const u = ev as { inputTokens: number; outputTokens: number; cacheReadTokens: number };
          usageAgg.input += u.inputTokens ?? 0;
          usageAgg.output += u.outputTokens ?? 0;
          usageAgg.cacheRead += u.cacheReadTokens ?? 0;
        }
        if (ev.type === "error") runError = (ev as { message: string }).message;
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
        runError = e instanceof Error ? e.message : "Beklenmeyen hata";
        emit({ type: "error", message: runError });
        emit({ type: "done", reason: "error" });
      } finally {
        clearInterval(heartbeat);
        // Usage'ı logla (fire-and-forget, isteği bloklamaz)
        if (usageAgg.input > 0 || usageAgg.output > 0) {
          const cost =
            (usageAgg.input * OPUS_PRICE.input +
              usageAgg.output * OPUS_PRICE.output +
              usageAgg.cacheRead * OPUS_PRICE.cacheRead) /
            1_000_000;
          const admin = createAdminClient();
          if (admin) {
            void admin
              .from("sd_ai_usage")
              .insert({
                app: "todus-sagkol",
                route: "/api/sagkol/chat",
                model: "claude-opus-4-8",
                input_tokens: usageAgg.input,
                output_tokens: usageAgg.output,
                cache_read_input_tokens: usageAgg.cacheRead,
                cost_usd: cost,
                duration_ms: Date.now() - startedAt,
                status: runError ? "error" : "ok",
                error_message: runError,
                user_id: user.key,
                metadata: { conversation_id: conversation.id },
              })
              .then(() => {}, () => {});
          }
        }
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
