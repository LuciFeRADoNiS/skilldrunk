// scripts/digest-generate.ts — Faz 4 §1.5
//
// Daily AI digest per realm (work + personal). Cowork scheduled task
// `brain-digest-generate` (cron `0 6 * * *`) bunu çağırır. Idempotent:
// bugünkü realm digest varsa skip.
//
// Inputs (per realm):
//   - brain_kpi_snapshot son 24h
//   - brain_activity son 24h
//   - sd_backlog open items (realm tag — work: 'work', personal: 'personal')
//   - calendar bugün+yarın (Atlas SA — Faz 4'te placeholder; Faz 5+ entegre)
//   - brain_digest son 7g (ton tutarlılığı için sample)
//
// Output: brain_digest insert (id, realm, digest_date, summary, highlights,
// generated_at). sd_ai_usage log.
//
// Manual: pnpm tsx scripts/digest-generate.ts
//         pnpm tsx scripts/digest-generate.ts work
//         pnpm tsx scripts/digest-generate.ts personal --force  # bugünkü kayda rağmen üret

import { loadEnv as loadBaseEnv, makeSupabase } from "./ingest/lib";

type Realm = "work" | "personal";

interface DigestInputs {
  kpi_24h: Array<{ metric_key: string; metric_value: number; delta_pct: number | null }>;
  activity_24h: Array<{ event_type: string; title: string; source: string; occurred_at: string }>;
  backlog_open: Array<{ id: number; title: string; priority: number }>;
  digest_7d: Array<{ digest_date: string; summary: string }>;
}

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const HAIKU_INPUT_PER_M = 1.0;
const HAIKU_OUTPUT_PER_M = 5.0;

function systemPrompt(realm: Realm): string {
  return realm === "work"
    ? `Sen iş tarafının özet AI'sın. Net, sayısal, profesyonel ton. Maksimum 4 cümle. Türkçe. Verileri yorumla, yorum-yapma → sadece olgu. Yarın için 1 öneri ekleyebilirsin ama abartma.`
    : `Sen kişisel tarafın özet AI'sın. Yumuşak, gözlemsel, "sen" hitabı. Maksimum 3 cümle. Türkçe. Verileri yorumla; öneri yerine soru ya da gözlem.`;
}

function composeUserPrompt(realm: Realm, inputs: DigestInputs): string {
  const kpi = inputs.kpi_24h.length
    ? inputs.kpi_24h.map((k) => `- ${k.metric_key}: ${k.metric_value}${k.delta_pct !== null ? ` (Δ ${k.delta_pct > 0 ? "+" : ""}${k.delta_pct}%)` : ""}`).join("\n")
    : "(yok)";
  const activity = inputs.activity_24h.length
    ? inputs.activity_24h.slice(0, 15).map((a) => `- [${a.source}/${a.event_type}] ${a.title}`).join("\n")
    : "(yok)";
  const backlog = inputs.backlog_open.length
    ? inputs.backlog_open.slice(0, 10).map((b) => `- P${b.priority} #${b.id}: ${b.title}`).join("\n")
    : "(yok)";
  const tone = inputs.digest_7d.length
    ? `Önceki 3 günün özetleri (ton referansı, tekrar etme):\n${inputs.digest_7d.slice(0, 3).map((d) => `[${d.digest_date}] ${d.summary}`).join("\n")}`
    : "(önceki digest yok)";

  return `Realm: ${realm}
Bugün: ${new Date().toISOString().slice(0, 10)}

KPI (son 24h):
${kpi}

Aktivite (son 24h):
${activity}

Açık backlog:
${backlog}

${tone}

Yukarıdaki veriden bugünün özetini yaz (system prompt'taki kurallara göre). Sadece özet metni yaz — başlık veya etiket koyma.`;
}

async function gatherInputs(
  supabase: ReturnType<typeof makeSupabase>,
  realm: Realm,
): Promise<DigestInputs> {
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [kpi, activity, backlog, digest] = await Promise.all([
    supabase
      .from("brain_kpi_snapshot")
      .select("metric_key, metric_value, delta_pct")
      .eq("realm", realm)
      .gte("captured_at", since24h)
      .order("captured_at", { ascending: false })
      .limit(20),
    supabase
      .from("brain_activity")
      .select("event_type, title, source, occurred_at")
      .in("realm", [realm, "shared"])
      .gte("occurred_at", since24h)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("sd_backlog")
      .select("id, title, priority, tags")
      .in("status", ["next", "in_progress", "blocked"])
      .order("priority", { ascending: true })
      .limit(15),
    supabase
      .from("brain_digest")
      .select("digest_date, summary")
      .eq("realm", realm)
      .gte("digest_date", since7d)
      .order("digest_date", { ascending: false })
      .limit(3),
  ]);

  const backlogFiltered = ((backlog.data ?? []) as Array<{ id: number; title: string; priority: number; tags: string[] | null }>)
    .filter((b) => {
      const t = (b.tags ?? []).map((x) => x.toLowerCase());
      return t.includes(realm) || t.length === 0; // tag yok → genel; gösterelim
    });

  return {
    kpi_24h: (kpi.data ?? []) as DigestInputs["kpi_24h"],
    activity_24h: (activity.data ?? []) as DigestInputs["activity_24h"],
    backlog_open: backlogFiltered,
    digest_7d: (digest.data ?? []) as DigestInputs["digest_7d"],
  };
}

async function callHaiku(
  anthropicKey: string,
  systemMsg: string,
  userMsg: string,
): Promise<{ text: string; input_tokens: number; output_tokens: number }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 400,
      system: systemMsg,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!r.ok) {
    throw new Error(`Anthropic ${r.status}: ${await r.text().catch(() => "")}`);
  }
  const json = (await r.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage: { input_tokens: number; output_tokens: number };
  };
  const text = json.content.find((c) => c.type === "text")?.text ?? "";
  return { text, input_tokens: json.usage.input_tokens, output_tokens: json.usage.output_tokens };
}

export async function generateDigest(opts: { realm: Realm; force?: boolean }): Promise<{
  ok: boolean;
  digest_date: string;
  reason?: string;
}> {
  const env = loadBaseEnv();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY missing (D-018)");
  const supabase = makeSupabase(env);
  const today = new Date().toISOString().slice(0, 10);

  // Idempotent check
  if (!opts.force) {
    const { data: existing } = await supabase
      .from("brain_digest")
      .select("id")
      .eq("realm", opts.realm)
      .eq("digest_date", today)
      .maybeSingle();
    if (existing) {
      console.log(`[digest-generate] ${opts.realm} ${today} mevcut, skip (--force ile zorla)`);
      return { ok: true, digest_date: today, reason: "exists" };
    }
  }

  const inputs = await gatherInputs(supabase, opts.realm);
  const userMsg = composeUserPrompt(opts.realm, inputs);
  const { text, input_tokens, output_tokens } = await callHaiku(
    anthropicKey,
    systemPrompt(opts.realm),
    userMsg,
  );

  // Highlights: kpi_24h ilk 3'ünü structured ekleyelim (UI DigestStrip okuyabilir)
  const highlights = inputs.kpi_24h.slice(0, 3).map((k) => ({
    label: k.metric_key,
    value: k.metric_value,
    delta_pct: k.delta_pct,
  }));

  await supabase
    .from("brain_digest")
    .upsert(
      {
        realm: opts.realm,
        digest_date: today,
        summary: text.trim(),
        highlights,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "realm,digest_date" },
    );

  const cost = (input_tokens * HAIKU_INPUT_PER_M + output_tokens * HAIKU_OUTPUT_PER_M) / 1_000_000;
  await supabase.from("sd_ai_usage").insert({
    app: "brain-digest-generate",
    route: "scripts/digest-generate.ts",
    model: HAIKU_MODEL,
    input_tokens,
    output_tokens,
    cost_usd: cost,
    duration_ms: 0,
    status: "ok",
    metadata: { realm: opts.realm, digest_date: today, source_count: inputs.activity_24h.length },
  });

  console.log(
    `[digest-generate] ${opts.realm} ${today} ✓ in=${input_tokens} out=${output_tokens} $${cost.toFixed(4)}`,
  );
  return { ok: true, digest_date: today };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const realmArg = args.find((a) => a === "work" || a === "personal") as Realm | undefined;
  const targets: Realm[] = realmArg ? [realmArg] : ["work", "personal"];
  (async () => {
    for (const r of targets) {
      try {
        await generateDigest({ realm: r, force });
      } catch (err) {
        console.error(`[digest-generate] ${r} FAIL:`, (err as Error).message);
      }
    }
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
