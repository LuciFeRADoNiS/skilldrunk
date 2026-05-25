/**
 * Context loader — fetches all rt_documents to build Claude system prompt.
 * Cached in-process for the lifetime of the serverless function (a few minutes).
 */
import { createClient } from "@supabase/supabase-js";

export type RtDocument = {
  doc_key: string;
  title: string;
  doc_type: string;
  content_md: string;
  content_summary: string | null;
  file_path: string | null;
  word_count: number | null;
  updated_at: string;
};

export type RtRisk = {
  risk_key: string;
  scenario_title: string;
  description: string;
  likelihood: number;
  impact: number;
  score: number;
  status: string;
  priority: string | null;
  mitigation_md: string | null;
  evidence_md: string | null;
};

let cachedDocs: RtDocument[] | null = null;
let cachedRisks: RtRisk[] | null = null;
let cacheStamp = 0;
const CACHE_TTL_MS = 60_000; // 1 min in-process cache

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function loadAllDocuments(force = false): Promise<RtDocument[]> {
  if (!force && cachedDocs && Date.now() - cacheStamp < CACHE_TTL_MS) {
    return cachedDocs;
  }
  const sb = adminClient();
  const { data, error } = await sb
    .from("rt_documents")
    .select("doc_key,title,doc_type,content_md,content_summary,file_path,word_count,updated_at")
    .order("doc_key");
  if (error) throw new Error(`rt_documents load failed: ${error.message}`);
  cachedDocs = (data as RtDocument[]) ?? [];
  cacheStamp = Date.now();
  return cachedDocs;
}

export async function loadAllRisks(force = false): Promise<RtRisk[]> {
  if (!force && cachedRisks && Date.now() - cacheStamp < CACHE_TTL_MS) {
    return cachedRisks;
  }
  const sb = adminClient();
  const { data, error } = await sb
    .from("rt_risks")
    .select(
      "risk_key,scenario_title,description,likelihood,impact,score,status,priority,mitigation_md,evidence_md",
    )
    .order("score", { ascending: false });
  if (error) throw new Error(`rt_risks load failed: ${error.message}`);
  cachedRisks = (data as RtRisk[]) ?? [];
  return cachedRisks;
}

/**
 * Build the system prompt content blocks for Claude.
 * Returns array of content blocks (with cache_control on the heavy ones).
 *
 * Strategy:
 * - 1 system intro block (no cache — small, dynamic-ish)
 * - 1 huge documents block with cache_control ephemeral (5 min cache, ~155KB)
 * - 1 medium risks block with cache_control ephemeral
 */
export async function buildClaudeSystem(): Promise<
  Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>
> {
  const docs = await loadAllDocuments();
  const risks = await loadAllRisks();

  const intro = `You are the **Rasyotek Strategy Assistant** (Rasyotek-AI), Özgür GÜR'ün özel müzakere danışmanı.

You operate inside the rasyotek.skilldrunk.com private workspace. Bağlam: MoveTech × Rasyotek partnership 8 Haziran 2026 14:00 toplantısı, NDA imza süreci, RasyoLog AŞ yapılanması.

## Rolün
- Toplantı öncesi hazırlık koçluğu
- Toplantı sırası / sonrası **soru bankası** referansı
- **Brief üretimi**: Özgür notlarını + chat geçmişini → 200-500 kelime özetlere
- **Risk monitoring**: Yeni bilgi geldikçe rt_risks skorlarını yeniden değerlendirme önerileri
- Tüm cevaplar **Türkçe**, profesyonel + arkadaşça, kısa ama kanıt-zincirli

## Kurallar
1. Sadece paketteki bilgi + Özgür'ün notlarına dayan. **Fabrikasyon yok**.
2. Belirsizse "kanıt yok" de, varsayım yapma.
3. Önemli risk sinyali görürsen önce uyar, sonra detay anlat.
4. Numerik finansal soru sorulduğunda Financial Model'deki kesin sayıları kullan, tahmin etme.
5. Kullanıcı paket dışı bir konu sorduğunda nazikçe rasyotek-müzakere kapsamına yönlendir.

## Mevcut Tarihler (ÖNEMLİ)
- Bugün: 2026-05-25 (Pazar)
- Bayram: 29 Mayıs - 1 Haziran
- Adnan 1:1 hedef: 3 Haziran Çarşamba
- 8 Haziran 14:00 toplantısı: ${Math.max(0, Math.ceil((new Date("2026-06-08T14:00:00+03:00").getTime() - Date.now()) / 86400000))} gün sonra`;

  const documentsBlock = `## PAKET DELİVERABLE'LARI (Cache'lenmiş — her chat'te bilirsin)

${docs
  .map(
    (d) => `### ${d.title} (\`${d.doc_key}\`)
**Tip:** ${d.doc_type} | **Kelime:** ${d.word_count ?? "?"} | **Dosya:** ${d.file_path ?? ""}
**Özet:** ${d.content_summary ?? ""}

\`\`\`markdown
${d.content_md}
\`\`\`
`,
  )
  .join("\n\n---\n\n")}`;

  const risksBlock = `## CANLI RİSK MATRİSİ (rt_risks tablosu, ${risks.length} senaryo)

| Key | Senaryo | L | I | Skor | Status | Öncelik |
|---|---|---|---|---|---|---|
${risks.map((r) => `| ${r.risk_key} | ${r.scenario_title.slice(0, 60)} | ${r.likelihood} | ${r.impact} | **${r.score}** | ${r.status} | ${r.priority ?? "-"} |`).join("\n")}

### Detaylı

${risks
  .map(
    (r) => `**${r.risk_key} — ${r.scenario_title}** (L=${r.likelihood} × I=${r.impact} = ${r.score}, ${r.status}/${r.priority})

_Açıklama:_ ${r.description}

_Kanıt:_ ${r.evidence_md ?? "—"}

_Mitigation:_ ${r.mitigation_md ?? "—"}`,
  )
  .join("\n\n")}`;

  return [
    { type: "text", text: intro },
    {
      type: "text",
      text: documentsBlock,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: risksBlock,
      cache_control: { type: "ephemeral" },
    },
  ];
}

/**
 * Reset in-process cache. Call after rt_documents or rt_risks updates
 * to force next request to reload (and rebuild Claude cache).
 */
export function resetContextCache() {
  cachedDocs = null;
  cachedRisks = null;
  cacheStamp = 0;
}
