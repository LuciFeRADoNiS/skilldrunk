"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { applyDagreLayout } from "./_layout-helpers";

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
  github_repo: string | null;
};

const CAT_PALETTE: Record<
  string,
  { bg: string; border: string; text: string }
> = {
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
  // public map only shows skilldrunk + tool by data filter; keep palette
  // entries for the externals we inject below.
  personal: {
    bg: "from-blue-500/15 to-blue-600/5",
    border: "border-blue-500/40",
    text: "text-blue-300",
  },
  enco: {
    bg: "from-purple-500/15 to-purple-600/5",
    border: "border-purple-500/40",
    text: "text-purple-300",
  },
};

type AppNodeData = {
  app?: MapApp;
  external?: { name: string; description: string; url: string };
  database?: { name: string; description: string; tables: string[] };
  category: string;
  child?: { parentSlug: string; label: string; path: string };
};

function AppNode({ data, selected }: NodeProps<Node<AppNodeData>>) {
  const palette = CAT_PALETTE[data.category] ?? CAT_PALETTE.experiment;

  if (data.child) {
    return (
      <div
        className={`rounded-lg border ${palette.border} bg-neutral-950/70 px-2.5 py-1.5 backdrop-blur-sm`}
        style={{ minWidth: 130 }}
      >
        <Handle type="target" position={Position.Top} className="!bg-neutral-700" />
        <span className={`text-[11px] font-medium ${palette.text}`}>
          {data.child.label}
        </span>
        <p className="font-mono text-[9.5px] text-neutral-500">{data.child.path}</p>
      </div>
    );
  }

  const label =
    data.app?.title ?? data.external?.name ?? data.database?.name ?? "?";
  const sub = data.app?.subdomain
    ? `${data.app.subdomain}.skilldrunk.com`
    : data.app?.url.replace("https://", "") ??
      data.external?.url ??
      (data.database ? "supabase" : "");
  const tagline =
    data.app?.tagline ??
    data.external?.description ??
    data.database?.description ??
    "";
  const ring = selected
    ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-neutral-950"
    : "";

  return (
    <div
      className={`relative rounded-xl border bg-gradient-to-br ${palette.bg} ${palette.border} px-4 py-3 backdrop-blur-sm hover:shadow-xl ${ring}`}
      style={{ minWidth: 200 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-700" />
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-700" />
      <Handle type="target" position={Position.Left} className="!bg-neutral-700" />
      <Handle type="source" position={Position.Right} className="!bg-neutral-700" />
      <div className="flex items-center gap-2">
        {data.app?.featured && <span className="text-amber-400">★</span>}
        <span className={`text-sm font-semibold ${palette.text}`}>{label}</span>
      </div>
      {sub && (
        <p className="mt-1 font-mono text-[10px] text-neutral-500">{sub}</p>
      )}
      {tagline && (
        <p className="mt-1.5 line-clamp-2 text-[11px] text-neutral-400">
          {tagline}
        </p>
      )}
    </div>
  );
}

const nodeTypes = { app: AppNode };

// Static layout — same constellation as admin. Kept in sync manually.
const LAYOUT: Record<string, { x: number; y: number }> = {
  marketplace: { x: 0, y: 0 },
  prototip: { x: -340, y: 60 },
  quotes: { x: -540, y: 240 },
  radyo: { x: 540, y: 240 },
  agents: { x: 0, y: 320 },
  supabase: { x: 0, y: -340 },
  anthropic: { x: -180, y: -340 },
  github: { x: -540, y: -120 },
  vercel: { x: 540, y: -120 },
};

const EDGES: Array<{
  from: string;
  to: string;
  label?: string;
  kind?: "data" | "api" | "deploy";
  animated?: boolean;
}> = [
  { from: "anthropic", to: "quotes", label: "Haiku", kind: "api" },
  { from: "anthropic", to: "marketplace", label: "/find", kind: "api" },
  { from: "supabase", to: "marketplace", kind: "data" },
  { from: "supabase", to: "quotes", kind: "data" },
  { from: "supabase", to: "prototip", kind: "data" },
  { from: "vercel", to: "marketplace", label: "deploy", kind: "deploy" },
  { from: "github", to: "marketplace", kind: "deploy" },
];

const EDGE_STYLES = {
  data: { stroke: "#10b981" },
  api: { stroke: "#f59e0b", strokeDasharray: "8 4" },
  deploy: { stroke: "#525252" },
};

const LAYER_2: Record<
  string,
  Array<{ slug: string; label: string; path: string }>
> = {
  marketplace: [
    { slug: "marketplace.feed", label: "Feed", path: "/feed" },
    { slug: "marketplace.arena", label: "Arena", path: "/arena" },
    { slug: "marketplace.search", label: "Search", path: "/search" },
    { slug: "marketplace.mcp", label: "MCP HTTP", path: "/api/mcp" },
  ],
};

export function PublicMap({ apps }: { apps: MapApp[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [, setExpanded] = useState<Set<string>>(new Set());

  const { initialNodes, initialEdges } = useMemo(() => {
    const appNodes: Node<AppNodeData>[] = apps
      .filter((a) => LAYOUT[a.slug])
      .map((a) => ({
        id: a.slug,
        type: "app",
        position: LAYOUT[a.slug],
        data: { app: a, category: a.category },
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
            description: "Postgres + Auth + RLS — paylaşılan DB.",
            tables: ["sd_*", "qt_*", "pt_*"],
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
            description: "Claude Haiku — quotes ve marketplace finder.",
            url: "api.anthropic.com",
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
            description: "Açık kaynak monorepo.",
            url: "github.com/LuciFeRADoNiS/skilldrunk",
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
            description: "Hosting + push-to-deploy.",
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

    return { initialNodes: allNodes, initialEdges: allEdges };
  }, [apps]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AppNodeData>>(
    initialNodes,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setExpanded(new Set());
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleAutoLayout = useCallback(() => {
    setNodes((cur) => applyDagreLayout(cur, edges, "LR") as Node<AppNodeData>[]);
  }, [edges, setNodes]);

  const handleNodeDoubleClick = useCallback(
    (_e: unknown, node: Node) => {
      const children = LAYER_2[node.id];
      if (!children) return;
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
          setNodes((cur) =>
            cur.filter((n) => !n.id.startsWith(`${node.id}.`)),
          );
          setEdges((cur) =>
            cur.filter((e) => !String(e.id).startsWith(`l2-${node.id}-`)),
          );
        } else {
          next.add(node.id);
          const px = node.position.x;
          const py = node.position.y;
          const childNodes: Node<AppNodeData>[] = children.map((c, i) => ({
            id: c.slug,
            type: "app",
            position: {
              x: px - 80 + (i % 3) * 160,
              y: py + 140 + Math.floor(i / 3) * 90,
            },
            data: {
              category:
                (initialNodes.find((n) => n.id === node.id)?.data
                  .category as string) ?? "experiment",
              child: { parentSlug: node.id, label: c.label, path: c.path },
            },
          }));
          const childEdges: Edge[] = children.map((c) => ({
            id: `l2-${node.id}-${c.slug}`,
            source: node.id,
            target: c.slug,
            style: { stroke: "#404040", strokeDasharray: "2 3" },
          }));
          setNodes((cur) => [...cur, ...childNodes]);
          setEdges((cur) => [...cur, ...childEdges]);
        }
        return next;
      });
    },
    [initialNodes, setNodes, setEdges],
  );

  const selectedApp = useMemo(() => {
    if (!selected) return null;
    return apps.find((a) => a.slug === selected) ?? null;
  }, [apps, selected]);

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    const data = node.data as AppNodeData;
    if (data?.child) return;
    setSelected(node.id);
  }, []);

  return (
    <div className="relative h-[calc(100vh-180px)] min-h-[600px] overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          colorMode="dark"
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#262626"
          />
          <Controls className="!bg-neutral-900 !border-neutral-800" />
          <MiniMap
            className="!bg-neutral-900"
            nodeColor={(n) => {
              const cat = (n.data as AppNodeData)?.category ?? "";
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

        <div className="absolute left-4 top-4 z-10 flex gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleAutoLayout}
            className="rounded-md border border-neutral-800 bg-neutral-950/90 px-2.5 py-1 text-neutral-300 backdrop-blur hover:bg-neutral-900"
          >
            Auto layout (LR)
          </button>
          <span className="rounded-md border border-neutral-800 bg-neutral-950/70 px-2.5 py-1 text-[10px] text-neutral-500 backdrop-blur">
            Çift tıkla → alt sayfalar
          </span>
        </div>
      </ReactFlowProvider>

      {selectedApp && (
        <PublicDrawer
          app={selectedApp}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PublicDrawer({
  app,
  onClose,
}: {
  app: MapApp;
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

      {app.tagline && (
        <p className="border-b border-neutral-900 p-4 text-sm text-neutral-300">
          {app.tagline}
        </p>
      )}

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

      <div className="flex-1" />

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
          href={`/${app.slug}`}
          className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
        >
          Detay
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
      </div>
    </div>
  );
}
