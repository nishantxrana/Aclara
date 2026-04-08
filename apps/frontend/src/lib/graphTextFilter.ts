import type { AccessGraph } from "@/types/graph.types";

import type { GraphTextFilterMode } from "@/stores/visualizer.store";

export function expandNeighborNodeIds(
  graph: AccessGraph,
  seed: ReadonlySet<string>
): Set<string> {
  const out = new Set(seed);
  for (const e of graph.edges) {
    if (out.has(e.source) || out.has(e.target)) {
      out.add(e.source);
      out.add(e.target);
    }
  }
  return out;
}

export function applyGraphTextAndRiskFilter(
  graph: AccessGraph,
  filterLower: string,
  textMode: GraphTextFilterMode,
  onlyOverPrivileged: boolean
): {
  nodes: AccessGraph["nodes"];
  edges: AccessGraph["edges"];
  matchIds: Set<string>;
  dimIds: Set<string>;
} {
  let nodes = graph.nodes;
  if (onlyOverPrivileged) {
    nodes = nodes.filter((n) => n.isOverPrivileged === true);
  }
  const allowedIds = new Set(nodes.map((n) => n.id));

  const matchIds = new Set<string>();
  if (filterLower.length === 0) {
    for (const n of nodes) {
      matchIds.add(n.id);
    }
  } else {
    for (const n of nodes) {
      const secondary = n.secondaryLabel?.toLowerCase() ?? "";
      if (
        n.label.toLowerCase().includes(filterLower) ||
        n.primaryLabel.toLowerCase().includes(filterLower) ||
        secondary.includes(filterLower) ||
        n.id.toLowerCase().includes(filterLower)
      ) {
        matchIds.add(n.id);
      }
    }
  }

  let visibleIds: Set<string>;
  if (filterLower.length === 0) {
    visibleIds = new Set(nodes.map((n) => n.id));
  } else if (textMode === "hide") {
    visibleIds = new Set(matchIds);
  } else if (textMode === "contextual") {
    const expanded = expandNeighborNodeIds(graph, matchIds);
    visibleIds = new Set([...expanded].filter((id) => allowedIds.has(id)));
  } else {
    visibleIds = allowedIds;
  }

  const visibleNodes = nodes.filter((n) => visibleIds.has(n.id));
  const vis = new Set(visibleNodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => vis.has(e.source) && vis.has(e.target));

  const dimIds = new Set<string>();
  if (filterLower.length > 0 && textMode === "highlight") {
    for (const n of visibleNodes) {
      if (!matchIds.has(n.id)) {
        dimIds.add(n.id);
      }
    }
  }

  return { nodes: visibleNodes, edges, matchIds, dimIds };
}
