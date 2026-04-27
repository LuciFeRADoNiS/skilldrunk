"use server";

import { createServerClient } from "@skilldrunk/supabase/server";

/* ────────────────────────  Types ──────────────────────── */

export type ToolCallTrace = {
  name: string;
  input: Record<string, unknown>;
  result: unknown;
  error?: string;
};

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCallTrace[] };

export type AskResult =
  | { ok: true; answer: string; tool_calls: ToolCallTrace[]; model: string }
  | { ok: false; error: string };

/* ────────────────────────  Auth ──────────────────────── */

async function adminSupabase() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data: profile } = await supabase
    .from("sd_profiles")
    .select("role, username, display_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("not_authorized");
  return { supabase, user, profile };
}

/* ────────────────────────  Tools ──────────────────────── */

const TOOLS = [
  {
    name: "count_pageviews",
    description:
      "Belirtilen son N gün içindeki pageview sayısını döndürür. Opsiyonel olarak host (subdomain) ile filtrelenebilir.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Geriye dönük kaç gün (1-30, default 7)",
          minimum: 1,
          maximum: 30,
        },
        host: {
          type: "string",
          description:
            "Belirli bir subdomain için filtre, örn: 'analiz.skilldrunk.com'. Boş bırakılırsa tüm subdomainler.",
        },
      },
      required: [],
    },
  },
  {
    name: "list_apps",
    description:
      "pt_apps katalogundan app listesi döndürür. Kategori, status veya public/private filtreyle daraltılabilir.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["skilldrunk", "tool", "enco", "personal", "experiment", "archived"],
        },
        status: { type: "string", enum: ["live", "draft", "archived"] },
        is_public: { type: "boolean" },
      },
      required: [],
    },
  },
  {
    name: "toggle_app_featured",
    description:
      "Verilen slug'lı app'in featured (yıldızlı) durumunu tersine çevirir. Featured app'ler prototip.skilldrunk.com'da öne çıkar.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "toggle_app_public",
    description:
      "Verilen slug'lı app'in is_public durumunu tersine çevirir. is_public=true ise prototip.skilldrunk.com'da görünür.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "set_app_status",
    description:
      "Bir app'in status'ünü değiştirir (live/draft/archived). Archived app'ler hiçbir yerde görünmez.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        status: { type: "string", enum: ["live", "draft", "archived"] },
      },
      required: ["slug", "status"],
    },
  },
  {
    name: "set_skill_status",
    description:
      "Marketplace'teki bir skill'in (slug ile) status'ünü değiştirir (published/draft/archived).",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        status: {
          type: "string",
          enum: ["published", "draft", "archived"],
        },
      },
      required: ["slug", "status"],
    },
  },
  {
    name: "count_az_events",
    description:
      "Analiz event log'undaki event sayısını döndürür. Source (obsidian/github/calendar/manual/other) ve days ile filtrelenebilir.",
    input_schema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          enum: ["obsidian", "github", "calendar", "manual", "other"],
        },
        days: { type: "integer", minimum: 1, maximum: 365 },
      },
      required: [],
    },
  },
  {
    name: "get_recent_audit",
    description:
      "Son admin aksiyonlarını (skill/role/report status değişiklikleri) döndürür.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        action: {
          type: "string",
          enum: [
            "skill.status_change",
            "user.role_change",
            "report.status_change",
          ],
        },
      },
      required: [],
    },
  },
  {
    name: "add_quote",
    description:
      "quotes.skilldrunk.com için yeni bir söz ekler. Curated kaynak olarak işaretlenir.",
    input_schema: {
      type: "object",
      properties: {
        quote_text: { type: "string", description: "Sözün metni" },
        author: { type: "string" },
        category: { type: "string" },
        nano_detail: {
          type: "string",
          description: "Sözün arkasındaki kısa bağlam (opsiyonel)",
        },
      },
      required: ["quote_text", "author"],
    },
  },
];

/* ────────────────────────  Tool execution ──────────────────────── */

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const { supabase } = await adminSupabase();

  switch (name) {
    case "count_pageviews": {
      const days = (input.days as number) ?? 7;
      const host = (input.host as string | undefined) ?? null;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      let q = supabase
        .from("sd_pageviews")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);
      if (host) q = q.eq("host", host);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return { count, days, host: host ?? "all" };
    }

    case "list_apps": {
      let q = supabase
        .from("pt_apps")
        .select(
          "slug, title, tagline, category, status, url, subdomain, is_public, featured",
        )
        .order("category");
      if (input.category) q = q.eq("category", input.category);
      if (input.status) q = q.eq("status", input.status);
      if (typeof input.is_public === "boolean")
        q = q.eq("is_public", input.is_public);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "toggle_app_featured": {
      const slug = String(input.slug);
      const { data: cur, error: fetchErr } = await supabase
        .from("pt_apps")
        .select("featured")
        .eq("slug", slug)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      if (!cur) throw new Error(`app not found: ${slug}`);
      const next = !cur.featured;
      const { error } = await supabase
        .from("pt_apps")
        .update({ featured: next })
        .eq("slug", slug);
      if (error) throw new Error(error.message);
      return { slug, featured: next };
    }

    case "toggle_app_public": {
      const slug = String(input.slug);
      const { data: cur, error: fetchErr } = await supabase
        .from("pt_apps")
        .select("is_public")
        .eq("slug", slug)
        .maybeSingle();
      if (fetchErr) throw new Error(fetchErr.message);
      if (!cur) throw new Error(`app not found: ${slug}`);
      const next = !cur.is_public;
      const { error } = await supabase
        .from("pt_apps")
        .update({ is_public: next })
        .eq("slug", slug);
      if (error) throw new Error(error.message);
      return { slug, is_public: next };
    }

    case "set_app_status": {
      const slug = String(input.slug);
      const status = String(input.status);
      const { error } = await supabase
        .from("pt_apps")
        .update({ status })
        .eq("slug", slug);
      if (error) throw new Error(error.message);
      return { slug, status };
    }

    case "set_skill_status": {
      const slug = String(input.slug);
      const status = String(input.status);
      const { error } = await supabase
        .from("sd_skills")
        .update({ status })
        .eq("slug", slug);
      if (error) throw new Error(error.message);
      return { slug, status };
    }

    case "count_az_events": {
      const days = (input.days as number) ?? 30;
      const source = (input.source as string | undefined) ?? null;
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      let q = supabase
        .from("az_events")
        .select("*", { count: "exact", head: true })
        .gte("occurred_at", since);
      if (source) q = q.eq("source", source);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return { count, days, source: source ?? "all" };
    }

    case "get_recent_audit": {
      const limit = (input.limit as number) ?? 10;
      const action = (input.action as string | undefined) ?? null;
      let q = supabase
        .from("sd_audit_log")
        .select(
          "actor_username, action, target_type, old_value, new_value, metadata, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (action) q = q.eq("action", action);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "add_quote": {
      const { data, error } = await supabase
        .from("qt_quotes")
        .insert({
          quote_text: String(input.quote_text),
          author: String(input.author),
          category: input.category ? String(input.category) : null,
          nano_detail: input.nano_detail ? String(input.nano_detail) : null,
          source: "curated",
        })
        .select("id, quote_text, author")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

/* ────────────────────────  System prompt ──────────────────────── */

type AppRow = {
  slug: string;
  title: string;
  tagline: string | null;
  category: string;
  status: string;
  url: string;
  subdomain: string | null;
  stack: string[];
  tags: string[];
  is_public: boolean;
};

type EcosystemStats = {
  total_skills: number;
  total_users: number;
  total_votes: number;
  total_comments: number;
  total_arena_matches: number;
  open_reports: number;
  pageviews_today: number;
  pageviews_7d: number;
};

async function buildSystemPrompt(context?: {
  page?: string;
  focus?: string;
}): Promise<string> {
  const { supabase, profile } = await adminSupabase();

  const [{ data: apps }, { data: statsData }] = await Promise.all([
    supabase
      .from("pt_apps")
      .select(
        "slug, title, tagline, category, status, url, subdomain, stack, tags, is_public",
      )
      .neq("status", "archived")
      .order("category")
      .returns<AppRow[]>(),
    supabase.rpc("sd_admin_stats"),
  ]);

  const stats = statsData as EcosystemStats | null;
  const appsList = (apps ?? [])
    .map(
      (a) =>
        `- \`${a.slug}\` (${a.category}/${a.status}, ${a.is_public ? "public" : "private"}) ${a.title} → ${a.url}`,
    )
    .join("\n");

  const statsStr = stats
    ? `Skills:${stats.total_skills} Users:${stats.total_users} Votes:${stats.total_votes} Comments:${stats.total_comments} Arena:${stats.total_arena_matches} OpenReports:${stats.open_reports} PV(today/7d):${stats.pageviews_today}/${stats.pageviews_7d}`
    : "(stats unavailable)";

  return `Sen Özgür'ün skilldrunk ekosistem asistanısın. admin.skilldrunk.com/ai içindesin. Türkçe, kısa, net.

## Live ecosystem
${appsList || "(no apps)"}

## Stats
${statsStr}

## Tools
Sana verilen araçları gerektiğinde KULLAN. Soru sorarken araçla doğrula. Kullanıcı bir aksiyon istiyorsa (örn. "şu app'i public yap") ilgili tool'u çağır. Tool sonuçlarını okuyup kullanıcıya özetle.

- count_pageviews / count_az_events → veriye dayalı yanıt vermeden önce çağır
- list_apps → "hangi app public?" gibi sorular için
- toggle_app_featured / toggle_app_public / set_app_status → app yönetimi
- set_skill_status → marketplace skill yönetimi (publish/archive/draft)
- get_recent_audit → "son ne yaptım" sorularına
- add_quote → quotes.skilldrunk.com'a yeni söz ekleme

## Kurallar
- URL ver: admin.skilldrunk.com/apps, https://skilldrunk.com/arena, vs (absolute)
- Sayı söylediğinde kaynak belli olsun (last 7d / all-time)
- Skill veya app slug'ı belirsizse önce list_apps ile bul, sonra aksiyon yap
- Tool hatası → kullanıcıya anlat, "deneyebilirsin" deme, kendi düzeltmeyi öner
- Türkçe yanıt; teknik terimler İngilizce kalabilir (slug, host, RPC)
- Hiçbir araç olmadan da yanıt verebilirsin (genel ekosistem soruları için)
- Owner: ${profile?.display_name ?? profile?.username ?? "Özgür"}
${
  context?.page || context?.focus
    ? `\n## Şu anki bağlam\n${context.page ? `- Kullanıcı şu sayfadaydı: \`${context.page}\`` : ""}${context.focus ? `\n- Odaklandığı şey: ${context.focus}` : ""}\n- Bu bağlamı yanıtında dikkate al.`
    : ""
}`;
}

/* ────────────────────────  Multi-turn loop ──────────────────────── */

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | AnthropicContent[];
};

const MAX_TURNS = 6;

export async function askAssistant(
  history: ChatMessage[],
  userMessage: string,
  context?: { page?: string; focus?: string },
): Promise<AskResult> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error:
          "ANTHROPIC_API_KEY yok. Vercel → skilldrunk-admin → Settings → Environment ekle.",
      };
    }

    const system = await buildSystemPrompt(context);

    // Convert prior history to Anthropic message format. We drop the
    // tool_calls metadata since each turn is independent here.
    const messages: AnthropicMessage[] = [
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const traces: ToolCallTrace[] = [];
    let finalText = "";
    let modelUsed = "claude-haiku-4-5";

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          system,
          tools: TOOLS,
          messages,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: `API ${res.status}: ${txt.slice(0, 200)}` };
      }

      const json = (await res.json()) as {
        content: AnthropicContent[];
        stop_reason: string;
        model?: string;
      };
      modelUsed = json.model ?? modelUsed;

      const textParts = json.content.filter((c) => c.type === "text");
      const toolUses = json.content.filter((c) => c.type === "tool_use");

      // Append assistant message with the full content (text + tool_use blocks)
      messages.push({ role: "assistant", content: json.content });

      if (toolUses.length === 0 || json.stop_reason !== "tool_use") {
        finalText = textParts.map((c) => c.text ?? "").join("\n").trim();
        break;
      }

      // Execute tools, build tool_result content
      const toolResults: AnthropicContent[] = [];
      for (const tu of toolUses) {
        if (tu.type !== "tool_use") continue;
        const trace: ToolCallTrace = {
          name: tu.name,
          input: tu.input,
          result: null,
        };
        try {
          trace.result = await executeTool(tu.name, tu.input);
        } catch (err) {
          trace.error = err instanceof Error ? err.message : String(err);
        }
        traces.push(trace);
        toolResults.push({
          type: "tool_use", // placeholder, replaced below
          id: tu.id,
          name: tu.name,
          input: tu.input,
        });
      }

      // tool_result messages
      const userToolResultContent = toolUses.map((tu, i) => {
        const trace = traces[traces.length - toolUses.length + i];
        return {
          type: "tool_result" as const,
          tool_use_id: (tu as { id: string }).id,
          content: trace.error
            ? `Error: ${trace.error}`
            : JSON.stringify(trace.result ?? null),
          is_error: !!trace.error,
        };
      });

      messages.push({
        role: "user",
        content: userToolResultContent as unknown as AnthropicContent[],
      });
    }

    return {
      ok: true,
      answer: finalText || "(yanıt boş)",
      tool_calls: traces,
      model: modelUsed,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
