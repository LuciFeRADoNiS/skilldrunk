// apps/admin/src/lib/custodian/ga4.ts — Faz 1 PR-C
//
// GA4 Data API (runReport) helper. Service account auth via
// google-auth-library (JWT → access token). Property 534659408 (skilldrunk),
// SA claude-bot@claude-bot-490207 (Viewer).
//
// Env: GA4_SA_KEY_JSON — raw service-account JSON (or base64; both handled).
// Never commit the key — Vercel env only.

import { JWT } from "google-auth-library";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  users: number;
  pageviews: number;
  top_pages: Array<{ path: string; views: number }>;
  sources: Array<{ source: string; sessions: number }>;
}

interface SACredentials {
  client_email: string;
  private_key: string;
}

function parseServiceAccount(): SACredentials {
  const raw = process.env.GA4_SA_KEY_JSON;
  if (!raw) throw new Error("GA4_SA_KEY_JSON missing");
  let json = raw.trim();
  // Support base64-wrapped JSON (avoids newline escaping pain in env UIs).
  if (!json.startsWith("{")) {
    json = Buffer.from(json, "base64").toString("utf8");
  }
  const parsed = JSON.parse(json) as SACredentials;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GA4_SA_KEY_JSON missing client_email/private_key");
  }
  // Env UIs often turn \n into literal backslash-n — restore real newlines.
  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
}

async function getAccessToken(): Promise<string> {
  const sa = parseServiceAccount();
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [GA4_SCOPE],
  });
  const { access_token } = await client.authorize();
  if (!access_token) throw new Error("GA4 access token alınamadı");
  return access_token;
}

interface RunReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}

async function runReport(
  token: string,
  propertyId: string,
  body: Record<string, unknown>,
): Promise<RunReportResponse> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA4 runReport ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as RunReportResponse;
}

/**
 * Pull yesterday's analytics for a GA4 property.
 * Three reports: totals (users+pageviews), top pages, traffic sources.
 */
export async function fetchDailyAnalytics(
  propertyId: string,
  date: "yesterday" | "today" = "yesterday",
): Promise<DailyAnalytics> {
  const token = await getAccessToken();
  const dateRange = { startDate: date, endDate: date };

  const [totals, pages, sources] = await Promise.all([
    runReport(token, propertyId, {
      dateRanges: [dateRange],
      metrics: [{ name: "totalUsers" }, { name: "screenPageViews" }],
    }),
    runReport(token, propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    runReport(token, propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
  ]);

  const totRow = totals.rows?.[0];
  const users = Number(totRow?.metricValues?.[0]?.value ?? 0);
  const pageviews = Number(totRow?.metricValues?.[1]?.value ?? 0);

  const top_pages = (pages.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "(unknown)",
    views: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const srcs = (sources.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? "(unknown)",
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  // GA4 "yesterday" resolves in the property's timezone; compute the ISO
  // date for storage (UTC-based; close enough for daily snapshot keying).
  const d = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  return { date: d, users, pageviews, top_pages, sources: srcs };
}
