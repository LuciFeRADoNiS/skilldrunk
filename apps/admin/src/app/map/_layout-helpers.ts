import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_W = 230;
const NODE_H = 110;

/**
 * Run dagre layout over the given nodes/edges and return a copy of `nodes`
 * with new positions. Edges are unchanged. Used by the "Auto layout" button
 * in `/admin/map` to fix overlap after manual drags or after layer-2 expand.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR",
): Node[] {
  const g = new dagre.graphlib.Graph({ multigraph: false, compound: false });
  g.setGraph({
    rankdir: direction,
    ranksep: 120,
    nodesep: 60,
    edgesep: 30,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    // dagre returns center-coords; React Flow uses top-left.
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}

/**
 * Layer-2 children for a parent slug. Each entry produces a sub-node that
 * appears below the parent when expanded via double-click. Keep this list
 * small — it should mirror the most useful surfaces, not exhaustive routes.
 */
export const LAYER_2: Record<
  string,
  Array<{ slug: string; label: string; path: string }>
> = {
  marketplace: [
    { slug: "marketplace.feed", label: "Feed", path: "/feed" },
    { slug: "marketplace.arena", label: "Arena", path: "/arena" },
    { slug: "marketplace.search", label: "Search", path: "/search" },
    { slug: "marketplace.mcp", label: "/api/mcp", path: "/api/mcp" },
    { slug: "marketplace.find", label: "/api/ai/find", path: "/api/ai/find" },
  ],
  admin: [
    { slug: "admin.ai", label: "AI Asistan", path: "/ai" },
    { slug: "admin.usage", label: "AI Usage", path: "/usage" },
    { slug: "admin.apps", label: "Apps", path: "/apps" },
    { slug: "admin.map", label: "Map", path: "/map" },
    { slug: "admin.audit", label: "Audit", path: "/audit" },
  ],
  brief: [
    { slug: "brief.daily", label: "Daily cron 04:00", path: "/api/cron/daily" },
    { slug: "brief.weekly", label: "Weekly Pazar 19:00", path: "/api/cron/weekly" },
  ],
  prototip: [
    { slug: "prototip.detail", label: "/[slug]", path: "/[slug]" },
  ],
};
