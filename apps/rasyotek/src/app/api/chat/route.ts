import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@skilldrunk/supabase/server";
import { callClaude } from "@skilldrunk/llm";
import { adminClient, buildClaudeSystem } from "@/lib/context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5-20250929";

// Tool definitions — bot can save notes, update risks, query info
const TOOLS = [
  {
    name: "save_note",
    description:
      "Özgür'ün konuştuğu / paylaştığı önemli bir notu rt_notes tablosuna kaydeder. Toplantı sonrası gözlem, karar, soru, todo gibi bilgiler için kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        note_type: {
          type: "string",
          enum: ["meeting", "observation", "question", "decision", "todo"],
        },
        title: { type: "string", description: "Kısa başlık (max 80 char)" },
        body_md: { type: "string", description: "Detay (markdown)" },
        meeting_date: {
          type: "string",
          description: "YYYY-MM-DD format, sadece meeting tipinde",
        },
        related_doc_key: {
          type: "string",
          description:
            "İlişkili deliverable doc_key (varsa): stakeholder-motivation, red-team-brief, negotiation-strategy, financial-model, sensitivity-matrix, completion-report",
        },
      },
      required: ["note_type", "body_md"],
    },
  },
  {
    name: "update_risk",
    description:
      "Bir risk senaryosunun likelihood/impact/status değerlerini günceller. Yeni bilgi (toplantı çıktısı, mail) ışığında risk skoru değiştiğinde kullan.",
    input_schema: {
      type: "object" as const,
      properties: {
        risk_key: {
          type: "string",
          description: "S1, S2, ..., S9",
        },
        likelihood: { type: "integer", minimum: 1, maximum: 5 },
        impact: { type: "integer", minimum: 1, maximum: 5 },
        status: {
          type: "string",
          enum: ["active", "monitoring", "mitigated", "realized", "closed"],
        },
        reason: {
          type: "string",
          description: "Değişikliğin gerekçesi (audit log için)",
        },
      },
      required: ["risk_key", "reason"],
    },
  },
];

async function executeTool(
  toolName: string,
  input: any,
  userId: string,
): Promise<any> {
  const sb = adminClient();
  if (toolName === "save_note") {
    const { data, error } = await sb
      .from("rt_notes")
      .insert({
        user_id: userId,
        note_type: input.note_type,
        title: input.title,
        body_md: input.body_md,
        source: "web-chat",
        related_doc_key: input.related_doc_key || null,
        meeting_date: input.meeting_date || null,
      })
      .select("id,created_at")
      .single();
    if (error) return { error: error.message };
    return { ok: true, note_id: data.id, created_at: data.created_at };
  }
  if (toolName === "update_risk") {
    const update: any = {};
    if (input.likelihood !== undefined) update.likelihood = input.likelihood;
    if (input.impact !== undefined) update.impact = input.impact;
    if (input.status !== undefined) update.status = input.status;
    if (Object.keys(update).length === 0) return { error: "no fields to update" };

    const { data, error } = await sb
      .from("rt_risks")
      .update(update)
      .eq("risk_key", input.risk_key)
      .select("risk_key,likelihood,impact,score,status")
      .single();
    if (error) return { error: error.message };

    // Save reason as a note for audit trail
    await sb.from("rt_notes").insert({
      user_id: userId,
      note_type: "decision",
      title: `Risk ${input.risk_key} güncellendi`,
      body_md: `**Gerekçe:** ${input.reason}\n\n**Yeni durum:** L=${data.likelihood}, I=${data.impact}, Skor=${data.score}, Status=${data.status}`,
      source: "web-chat",
    });

    return { ok: true, updated: data, reason: input.reason };
  }
  return { error: `unknown tool: ${toolName}` };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const userMessage: string = body.message?.trim();
  let sessionId: string | null = body.session_id;
  if (!userMessage)
    return NextResponse.json({ error: "empty message" }, { status: 400 });

  const sb = adminClient();

  // Create or load session
  if (!sessionId) {
    const { data: newSession } = await sb
      .from("rt_chat_sessions")
      .insert({
        user_id: user.id,
        title: userMessage.slice(0, 60),
      })
      .select("id")
      .single();
    sessionId = newSession?.id ?? null;
    if (!sessionId)
      return NextResponse.json(
        { error: "session create failed" },
        { status: 500 },
      );
  }

  // Load chat history (last 20 messages for context)
  const { data: history } = await sb
    .from("rt_chat_messages")
    .select("role,content_json")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(40);

  // Save user message
  await sb.from("rt_chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content_json: { type: "text", text: userMessage },
    content_text: userMessage,
  });

  // Get fresh context (cached for 60s in-process)
  const systemBlocks = await buildClaudeSystem();

  // Build messages array — prior history + new user message
  const messages: any[] = (history ?? []).map((h: any) => ({
    role: h.role === "tool" ? "user" : h.role,
    content: typeof h.content_json === "string"
      ? [{ type: "text", text: h.content_json }]
      : Array.isArray(h.content_json)
        ? h.content_json
        : [h.content_json],
  }));
  messages.push({
    role: "user",
    content: [{ type: "text", text: userMessage }],
  });

  // ─────────────────────────────────────────────────────
  // Multi-turn loop with tool use (max 4 turns)
  // ─────────────────────────────────────────────────────
  let finalText = "";
  let turn = 0;
  const maxTurns = 4;

  while (turn < maxTurns) {
    turn++;
    const result = await callClaude({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: MODEL,
      // @ts-expect-error system can be array of blocks
      system: systemBlocks,
      messages,
      tools: TOOLS as any,
      max_tokens: 2048,
      app: "rasyotek-chat",
      route: "/api/chat",
      userId: user.id,
      metadata: { session_id: sessionId, turn },
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!result.ok) {
      finalText = `❌ Claude API hatası: ${result.error}`;
      break;
    }

    const content = result.data.content ?? [];
    const textBlocks = content.filter((b: any) => b.type === "text");
    const toolUses = content.filter((b: any) => b.type === "tool_use");

    // Append assistant message to history
    messages.push({ role: "assistant", content });

    // Save assistant turn to DB
    await sb.from("rt_chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content_json: content,
      content_text: textBlocks.map((b: any) => b.text).join("\n\n"),
      tool_calls: toolUses.length ? toolUses : null,
      model: result.model,
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cache_read_input_tokens: result.usage.cache_read_input_tokens,
      cache_creation_input_tokens: result.usage.cache_creation_input_tokens,
      cost_usd: result.cost_usd,
      stop_reason: result.data.stop_reason,
      duration_ms: result.duration_ms,
    });

    // If no tool use, we're done
    if (toolUses.length === 0) {
      finalText = textBlocks.map((b: any) => b.text).join("\n\n");
      break;
    }

    // Execute tools
    const toolResults: any[] = [];
    for (const t of toolUses) {
      const r = await executeTool((t as any).name, (t as any).input, user.id);
      toolResults.push({
        type: "tool_result",
        tool_use_id: (t as any).id,
        content: JSON.stringify(r),
      });
    }

    // Save tool message to DB
    await sb.from("rt_chat_messages").insert({
      session_id: sessionId,
      role: "tool",
      content_json: toolResults,
      content_text: toolResults.map((r) => r.content).join("\n\n"),
      tool_results: toolResults,
    });

    // Push tool results back for next turn
    messages.push({ role: "user", content: toolResults });
  }

  // Update session stats
  const { data: stats } = await sb
    .from("rt_chat_messages")
    .select(
      "input_tokens,output_tokens,cache_read_input_tokens,cost_usd",
      { count: "exact" },
    )
    .eq("session_id", sessionId);
  const totalInput = (stats ?? []).reduce(
    (a: number, m: any) => a + (m.input_tokens ?? 0),
    0,
  );
  const totalOutput = (stats ?? []).reduce(
    (a: number, m: any) => a + (m.output_tokens ?? 0),
    0,
  );
  const totalCache = (stats ?? []).reduce(
    (a: number, m: any) => a + (m.cache_read_input_tokens ?? 0),
    0,
  );
  const totalCost = (stats ?? []).reduce(
    (a: number, m: any) => a + Number(m.cost_usd ?? 0),
    0,
  );
  await sb
    .from("rt_chat_sessions")
    .update({
      message_count: stats?.length ?? 0,
      total_tokens_input: totalInput,
      total_tokens_output: totalOutput,
      total_cache_read_tokens: totalCache,
      total_cost_usd: totalCost,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return NextResponse.json({
    session_id: sessionId,
    reply: finalText,
    turns: turn,
  });
}
