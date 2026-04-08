import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { NodeType } from "@/types/graph.types";

const DEFAULT_SIZE = { width: 200, height: 72 };

const SIZES: Record<NodeType, { width: number; height: number }> = {
  user: { width: 200, height: 72 },
  group: { width: 220, height: 72 },
  repo: { width: 248, height: 76 },
};

/** Graph-space X center per swim lane (users → groups → repos). Dagre supplies Y only. */
const LANE_CENTER_X: Record<NodeType, number> = {
  user: 160,
  group: 480,
  repo: 820,
};

function sizeForNode(node: Node): { width: number; height: number } {
  const rawType = node.type;
  if (rawType === "user" || rawType === "group" || rawType === "repo") {
    return SIZES[rawType];
  }
  return DEFAULT_SIZE;
}

/**
 * Applies a left-to-right dagre layout to react-flow nodes and returns positioned copies.
 */
export function layoutWithDagreLR(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) {
    return [];
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    ranksep: 72,
    nodesep: 48,
    marginx: 24,
    marginy: 24,
  });

  for (const node of nodes) {
    const { width, height } = sizeForNode(node);
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const withPosition = g.node(node.id);
    if (withPosition === undefined) {
      return { ...node, position: { x: 0, y: 0 } };
    }
    const { width, height } = sizeForNode(node);
    const rawType = node.type;
    const laneCenterX =
      rawType === "user" || rawType === "group" || rawType === "repo"
        ? LANE_CENTER_X[rawType]
        : withPosition.x;
    return {
      ...node,
      position: {
        x: laneCenterX - width / 2,
        y: withPosition.y - height / 2,
      },
    };
  });
}

/**
 * Simple non-overlapping grid for "force" mode without a physics engine.
 */
export function layoutForcePlaceholder(nodes: Node[]): Node[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const gapX = 240;
  const gapY = 80;

  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      position: { x: col * gapX, y: row * gapY },
    };
  });
}
