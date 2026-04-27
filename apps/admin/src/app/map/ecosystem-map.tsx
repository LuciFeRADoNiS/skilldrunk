"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type MapApp = {
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
  featured: boolean;
  description_md: string | null;
  github_repo: string | null;
  vercel_project: string | null;
  last_deployed_at: string | null;
};

export type MapStat = {
  pageviews_by_host: Record<string, number>;
  events_by_source: Record<string, number>;
  pv_total: number;
  events_total: number;
};

const CAT_PALETTE: Record<string, { bg: string; border: string; text: string }> = {
  skilldrunk: {
    bg: "from-orange-500/15 to-orange-600/5",
    border: "border-orange-500/40",
    text: "text-orange-300",
  },
  tool: {
    bg: "from-emerald-500/15 to-emerald-600/5",
    border: "border-emerald-500/40",
    text: "text-emerald-300",
  },
  enco: {
    bg: "from-purple-500/15 to-purple-600/5",
    border: "border-purple-500/40",
    text: "text-purple-300",
  },
  personal: {
    bg: "from-blue-500/15 to-blue-600/5",
    border: "border-blue-500/40",
    text: "text-blue-300",
  },
  experiment: {
    bg: "from-neutral-500/10 to-neutral-700/5",
    border: "border-neutral-700",
    text: "text-neutral-400",
  },
  external: {
    bg: "from-amber-500/10 to-amber-600/5",
    border: "border-amber-500/40",
    text: "text-amber-300",
  },
  database: {
    bg: "from-cyan-500/10 to-cyan-600/5",
    border: "border-cyan-500/40",
    text: "text-cyan-300",
  },
};

/* ────────────────────  Custom Node ──────────────────── */

type AppNodeData = {
  app?: MapApp;
  external?: { name: string; description: string; url: string };
  database?: { name: string; description: string; tables: string[] };
  category: string;
  pageviews?: number;
  selected?: boolean;
};

function AppNode({ data, selected }: NodeProps<Node<AppNodeData>>) {
  const palette = CAT_PALETTE[data.category] ?? CAT_PALETTE.experiment;

  const label =
    data.app?.title ??
    data.external?.name ??
    data.database?.name ??
    "?";
  const sub =
    data.app?.subdomain
      ? `${data.app.subdomain}.skilldrunk.com`
      : data.app?.url.replace("https://", "") ??
        data.external?.url ??
        (data.database ? "supabase" : "");
  const tagline = data.app?.tagline ?? data.external?.description ?? data.database?.description ?? "";

  const ring = selected ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-neutral-950" : "";

  return (
    <div
      className={`relative cursor-pointer rounded-xl border bg-gradient-to-br ${palette.bg} ${palette.border} px-4 py-3 backdrop-blur-sm transition hover:scale-[1.03] ${ring}`}
      style={{ minWidth: 200 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-700" />
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-700" />
      <Handle type="target" position={Position.Left} className="!bg-neutral-700" />
      <Handle type="source" position={Position.Right} className="!bg-neutral-700" />

      <div className="flex items-center gap-2">
        {data.app?.featured && <span className="text-amber-400">★</span>}
        <span className={`text-sm font-semibold ${palette.text}`}>{label}</span>
        {data.app?.is_public && (
          <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300">
            public
          </span>
        )}
        {data.app && !data.app.is_public && data.category !== "external" && data.category !== "database" && (
          <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono text-neutral-500">
            private
          </span>
        )}
      </div>

      {sub && (
        <p className="mt-1 font-mono text-[10px] text-neutral-500">{sub}</p>
      )}

      {tagline && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-neutral-400">
          {tagline}
        </p>
      )}

      {(data.pageviews ?? 0) > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          <span className="font-mono text-[10px] text-neutral-400">
            {data.pageviews} pv/7g
          </span>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { app: AppNode };

/* ────────────────────  Layout ──────────────────── */

const LAYOUT: Record<string, { x: number; y: number }> = {
  // Center: marketplace
  marketplace: { x: 0, y: 0 },

  // Inner ring: skilldrunk private subdomains
  admin: { x: -340, y: -180 },
  analiz: { x: 340, y: -180 },
  brief: { x: 340, y: 60 },

  // Outer ring: tools (public)
  prototip: { x: -340, y: 60 },
  quotes: { x: -540, y: 240 },
  radyo: { x: 540, y: 240 },

  // Personal apps (rebrand subdomains)
  sub: { x: 340, y: 280 },
  bday: { x: -340, y: 280 },

  // Experiment
  "movetech-worth": { x: 0, y: 480 },
  site: { x: 200, y: 480 },

  // External services & DB
  supabase: { x: 0, y: -340 },
  anthropic: { x: -180, y: -340 },
  telegram: { x: 180, y: -340 },
  github: { x: -540, y: -120 },
  vercel: { x: 540, y: -120 },

  // ENCO group (left bottom cluster)
  "enco-organizasyon-portal": { x: -700, y: 60 },
  "enco-command-center": { x: -700, y: 180 },
  "enco-logistics": { x: -820, y: 60 },
  "enco-personel-maliyet": { x: -820, y: 180 },
  "enco-pricing-bot": { x: -820, y: 300 },
};

const EDGES: Array<{
  from: string;
  to: string;
  label?: string;
  kind?: "auth" | "data" | "api" | "deploy";
  animated?: boolean;
}> = [
  // Auth: admin authenticates all private subdomains
  { from: "admin", to: "analiz", label: "auth", kind: "auth" },
  { from: "admin", to: "brief", label: "auth", kind: "auth" },
  { from: "admin", to: "radyo", label: "auth", kind: "auth" },
  { from: "admin", to: "sub", label: "auth", kind: "auth" },
  { from: "admin", to: "bday", label: "auth", kind: "auth" },

  // Data flow: Obsidian + GitHub → analiz → brief
  { from: "github", to: "analiz", label: "events", kind: "data", animated: true },
  { from: "analiz", to: "brief", label: "summarize", kind: "data", animated: true },
  { from: "brief", to: "telegram", label: "push", kind: "data", animated: true },

  // LLM: brief & quotes use Anthropic
  { from: "anthropic", to: "brief", label: "Haiku", kind: "api" },
  { from: "anthropic", to: "quotes", label: "Haiku", kind: "api" },
  { from: "anthropic", to: "marketplace", label: "/find", kind: "api" },
  { from: "anthropic", to: "admin", label: "/ai", kind: "api" },

  // DB: all read/write supabase
  { from: "supabase", to: "marketplace", kind: "data" },
  { from: "supabase", to: "analiz", kind: "data" },
  { from: "supabase", to: "brief", kind: "data" },
  { from: "supabase", to: "quotes", kind: "data" },
  { from: "supabase", to: "prototip", kind: "data" },
  { from: "supabase", to: "admin", kind: "data" },

  // Deploy: vercel hosts all
  { from: "vercel", to: "marketplace", label: "deploy", kind: "deploy" },
  { from: "vercel", to: "admin", label: "deploy", kind: "deploy" },

  // MCP: marketplace exposes MCP
  { from: "marketplace", to: "admin", label: "/api/mcp", kind: "api" },
];

const EDGE_STYLES = {
  auth: { stroke: "#dc2626", strokeDasharray: "4 4" },
  data: { stroke: "#10b981" },
  api: { stroke: "#f59e0b", strokeDasharray: "8 4" },
  deploy: { stroke: "#525252" },
};

/* ────────────────────  Main ──────────────────── */

export function EcosystemMap({
  apps,
  stats,
}: {
  apps: MapApp[];
  stats: MapStat;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const appNodes: Node<AppNodeData>[] = apps
      .filter((a) => LAYOUT[a.slug])
      .map((a) => ({
        id: a.slug,
        type: "app",
        position: LAYOUT[a.slug],
        data: {
          app: a,
          category: a.category,
          pageviews:
            stats.pageviews_by_host[
              a.subdomain ? `${a.subdomain}.skilldrunk.com` : "skilldrunk.com"
            ] ?? 0,
        },
      }));

    const externalNodes: Node<AppNodeData>[] = [
      {
        id: "supabase",
        type: "app",
        position: LAYOUT.supabase,
        data: {
          category: "database",
          database: {
            name: "Supabase",
            description: "Postgres + Auth + RLS + pg_net. Tek DB, schema prefix izolasyonu.",
            tables: ["sd_*", "az_*", "br_*", "qt_*", "pt_*"],
          },
        },
      },
      {
        id: "anthropic",
        type: "app",
        position: LAYOUT.anthropic,
        data: {
          category: "external",
          external: {
            name: "Anthropic",
            description: "Claude Haiku — brief, quotes, find, admin/ai için LLM.",
            url: "api.anthropic.com",
          },
        },
      },
      {
        id: "telegram",
        type: "app",
        position: LAYOUT.telegram,
        data: {
          category: "external",
          external: {
            name: "Telegram",
            description: "Brief push hedefi (TELEGRAM_BOT_TOKEN env varsa).",
            url: "api.telegram.org",
          },
        },
      },
      {
        id: "github",
        type: "app",
        position: LAYOUT.github,
        data: {
          category: "external",
          external: {
            name: "GitHub",
            description: "Repo (LuciFeRADoNiS/skilldrunk) + activity events kaynağı.",
            url: "github.com",
          },
        },
      },
      {
        id: "vercel",
        type: "app",
        position: LAYOUT.vercel,
        data: {
          category: "external",
          external: {
            name: "Vercel",
            description: "Hosting — push-to-deploy, 7 proje, ignoreCommand.",
            url: "vercel.com",
          },
        },
      },
    ];

    const allNodes = [...appNodes, ...externalNodes];

    const validIds = new Set(allNodes.map((n) => n.id));
    const allEdges: Edge[] = EDGES.filter(
      (e) => validIds.has(e.from) && validIds.has(e.to),
    ).map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      label: e.label,
      animated: e.animated ?? false,
      style: e.kind ? EDGE_STYLES[e.kind] : EDGE_STYLES.data,
      labelStyle: {
        fontSize: 10,
        fill: "#a3a3a3",
        fontFamily: "ui-monospace, monospace",
      },
      labelBgStyle: { fill: "#171717", fillOpacity: 0.8 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    }));

    return { nodes: allNodes, edges: allEdges };
  }, [apps, stats]);

  const selectedApp = useMemo(() => {
    if (!selected) return null;
    return apps.find((a) => a.slug === selected) ?? null;
  }, [apps, selected]);

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    setSelected(node.id);
  }, []);

  return (
    <div className="relative h-[calc(100vh-180px)] min-h-[600px] overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#262626" />
          <Controls className="!bg-neutral-900 !border-neutral-800" />
          <MiniMap
            className="!bg-neutral-900"
            nodeColor={(n) => {
              const cat = (n.data as AppNodeData)?.category ?? "";
              const c = CAT_PALETTE[cat];
              if (!c) return "#525252";
              return cat === "skilldrunk"
                ? "#f97316"
                : cat === "tool"
                  ? "#10b981"
                  : cat === "external"
                    ? "#f59e0b"
                    : cat === "database"
                      ? "#06b6d4"
                      : "#737373";
            }}
            maskColor="rgba(0,0,0,0.7)"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg border border-neutral-800 bg-neutral-950/90 p-3 text-[10px] backdrop-blur">
          <div className="mb-1.5 font-mono uppercase tracking-wider text-neutral-500">
            Edge legend
          </div>
          <div className="space-y-1">
            <Legend color="#10b981" label="data flow" />
            <Legend color="#dc2626" dashed label="auth" />
            <Legend color="#f59e0b" dashed label="API call (LLM/MCP)" />
            <Legend color="#525252" label="deploy" />
          </div>
        </div>
      </ReactFlowProvider>

      {/* Detail drawer */}
      {selectedApp && (
        <Drawer
          app={selectedApp}
          pageviews={
            stats.pageviews_by_host[
              selectedApp.subdomain
                ? `${selectedApp.subdomain}.skilldrunk.com`
                : "skilldrunk.com"
            ] ?? 0
          }
          onClose={() => setSelected(null)}
        />
      )}

      {selected && !selectedApp && (
        <ExternalDrawer slug={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function Legend({
  color,
  dashed,
  label,
}: {
  color: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="6">
        <line
          x1="0"
          y1="3"
          x2="20"
          y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "3 2" : undefined}
        />
      </svg>
      <span className="text-neutral-400">{label}</span>
    </div>
  );
}

/* ────────────────────  Drawer ──────────────────── */

function Drawer({
  app,
  pageviews,
  onClose,
}: {
  app: MapApp;
  pageviews: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-900 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold">{app.title}</span>
            {app.featured && <span className="text-amber-400">★</span>}
          </div>
          <p className="font-mono text-xs text-neutral-500">
            {app.url.replace("https://", "")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-900"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-neutral-900 p-4 text-xs">
        <Stat label="Kategori" value={app.category} />
        <Stat label="Status" value={app.status} />
        <Stat label="Public" value={app.is_public ? "evet" : "hayır"} />
        <Stat
          label="Son 7g pageview"
          value={pageviews.toString()}
        />
        {app.last_deployed_at && (
          <Stat
            label="Son deploy"
            value={app.last_deployed_at.slice(0, 10)}
            wide
          />
        )}
        {app.vercel_project && (
          <Stat label="Vercel" value={app.vercel_project} wide />
        )}
        {app.github_repo && (
          <Stat label="GitHub" value={app.github_repo} wide />
        )}
      </div>

      {app.stack.length > 0 && (
        <div className="border-b border-neutral-900 px-4 py-3">
          <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-neutral-500">
            Stack
          </div>
          <div className="flex flex-wrap gap-1">
            {app.stack.map((s) => (
              <span
                key={s}
                className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-headings:mt-3 prose-headings:mb-1.5 prose-a:text-orange-400 prose-code:text-orange-300 prose-strong:text-neutral-100">
          {app.description_md ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {app.description_md}
            </ReactMarkdown>
          ) : (
            <p className="italic text-neutral-500">
              Henüz dokümante edilmemiş. /apps sayfasından açıklama ekleyebilirsin.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-neutral-900 p-4">
        <a
          href={app.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
        >
          Aç ↗
        </a>
        <a
          href="/apps"
          className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
        >
          Yönet
        </a>
        {app.github_repo && (
          <a
            href={`https://github.com/${app.github_repo}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
          >
            GitHub
          </a>
        )}
        {app.vercel_project && (
          <a
            href={`https://vercel.com/ozgurs-projects-f650b810/${app.vercel_project}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
          >
            Vercel
          </a>
        )}
      </div>
    </div>
  );
}

function ExternalDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const docs: Record<string, { title: string; body: string; url?: string }> = {
    supabase: {
      title: "Supabase",
      url: "https://supabase.com/dashboard/project/vrgohatarieeguyyhfan",
      body:
        "Tek Postgres DB tüm ekosistem için. Schema prefix isolation:\n\n- `sd_*` marketplace\n- `az_*` analiz events\n- `br_*` brief\n- `qt_*` quotes\n- `pt_*` apps catalog\n\nRLS politikalarıyla auth-aware. SECURITY DEFINER RPC'ler. pg_net webhooks.",
    },
    anthropic: {
      title: "Anthropic API",
      url: "https://console.anthropic.com",
      body:
        "Claude Haiku endpoint. Kullanım yerleri:\n\n- **brief** günlük özet\n- **quotes** /api/ai (Yeni İlham butonu)\n- **marketplace** /find semantic rerank\n- **admin** /ai chat (tool use)\n\nMaliyet ~$1/MTok input + $5/MTok output. Aylık tipik <$5.",
    },
    telegram: {
      title: "Telegram",
      url: "https://core.telegram.org/bots",
      body:
        "Brief push hedefi. `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env varsa brief cron her sabah Markdown mesaj gönderir.",
    },
    github: {
      title: "GitHub",
      url: "https://github.com/LuciFeRADoNiS/skilldrunk",
      body:
        "Tek repo monorepo. apps/* + packages/*. Push-to-deploy 7 Vercel projesini tetikler (selective rebuild ignoreCommand). Analiz `/api/cron/github` her 30dk activity events çeker.",
    },
    vercel: {
      title: "Vercel",
      url: "https://vercel.com/ozgurs-projects-f650b810",
      body:
        "Hosting + GitHub integration + Cron + Edge config. 9 proje:\n\n- skilldrunk, skilldrunk-admin, skilldrunk-analiz, skilldrunk-brief, skilldrunk-prototip, skilldrunk-quotes, suno-command-center, ai-sub-tracker, birthdaysfunetc\n\nCron'lar: brief 04:00 UTC, analiz/cron/github her 30dk.",
    },
  };
  const d = docs[slug];
  if (!d) return null;

  return (
    <div className="absolute right-0 top-0 z-20 flex h-full w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-900 p-4">
        <div>
          <span className="text-xl font-semibold">{d.title}</span>
          {d.url && (
            <p className="font-mono text-xs text-neutral-500">
              {d.url.replace("https://", "")}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-900"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.body}</ReactMarkdown>
        </div>
      </div>
      {d.url && (
        <div className="border-t border-neutral-900 p-4">
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
          >
            Aç ↗
          </a>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}
