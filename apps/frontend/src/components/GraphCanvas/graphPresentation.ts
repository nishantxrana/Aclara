import type { Edge, Node } from "@xyflow/react";

import type {
  AccessGraph,
  AccessTrace,
  NodeType,
  PermissionLevel,
} from "@/types/graph.types";
import type { GraphTextFilterMode } from "@/stores/visualizer.store";
import { applyGraphTextAndRiskFilter } from "@/lib/graphTextFilter";

/** React Flow node `data` for custom user/group/repo nodes. */
export interface ICanvasNodeData extends Record<string, unknown> {
  primaryLabel: string;
  secondaryLabel?: string;
  title: string;
  label: string;
  isOverPrivileged: boolean;
  selected: boolean;
  dimmed: boolean;
  inspectorActive: boolean;
  pathHighlight: boolean;
  focusMuted: boolean;
}

/** React Flow edge `data` for permission / membership edges. */
export interface ICanvasEdgeData extends Record<string, unknown> {
  kind: "membership" | "permission";
  level: PermissionLevel;
  permission: string;
  presentationLabel: string;
  isElevated: boolean;
  isDirect: boolean;
  pathHighlighted: boolean;
  traceFocusActive: boolean;
}

/**
 * Node ids to emphasize for the current trace step (user, repo, and cumulative subjects).
 */
export function pathHighlightNodeIds(
  trace: AccessTrace | undefined,
  stepIndex: number | null,
  selectedUserId: string | null,
  selectedRepoId: string | null
): Set<string> {
  const s = new Set<string>();
  if (selectedUserId !== null) {
    s.add(selectedUserId);
  }
  if (selectedRepoId !== null) {
    s.add(`repo:${selectedRepoId}`);
  }
  if (trace !== undefined && stepIndex !== null && stepIndex >= 0) {
    for (let i = 0; i <= stepIndex; i += 1) {
      const st = trace.steps[i];
      if (st !== undefined) {
        s.add(st.subjectId);
      }
    }
  }
  return s;
}

function nodeTooltip(primary: string, secondary: string | undefined, id: string): string {
  const parts = [primary, secondary, `id: ${id}`].filter(
    (x): x is string => x !== undefined && x.length > 0
  );
  return parts.join("\n");
}

/**
 * Maps filtered graph nodes/edges to React Flow elements with presentation fields.
 * Selection/hover/focus dimming are applied later via `patchNodeVisualState`.
 */
export function buildCanvasElements(
  graph: AccessGraph,
  filterLower: string,
  textMode: GraphTextFilterMode,
  onlyOverPrivileged: boolean,
  pathHighlightIds: Set<string>,
  traceStepHighlightActive: boolean,
  inspectorNodeId: string | null,
  inspectorNodeType: "user" | "group" | "repo" | null
): {
  nodes: Node[];
  edges: Edge[];
  dimIds: Set<string>;
  layoutNodeCount: number;
} {
  const { nodes: gn, edges: ge, dimIds } = applyGraphTextAndRiskFilter(
    graph,
    filterLower,
    textMode,
    onlyOverPrivileged
  );

  const nodes: Node[] = gn.map((n) => {
    const primary = n.primaryLabel ?? n.label;
    const secondary = n.secondaryLabel;
    const title = nodeTooltip(primary, secondary, n.id);
    return {
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: {
        primaryLabel: primary,
        ...(secondary !== undefined && secondary.length > 0 ? { secondaryLabel: secondary } : {}),
        title,
        label: primary,
        isOverPrivileged: n.isOverPrivileged === true,
        selected: false,
        dimmed: false,
        focusMuted: false,
        inspectorActive:
          inspectorNodeId !== null &&
          inspectorNodeId === n.id &&
          inspectorNodeType === n.type,
        pathHighlight:
          traceStepHighlightActive &&
          pathHighlightIds.size > 0 &&
          pathHighlightIds.has(n.id),
      } satisfies ICanvasNodeData,
    };
  });

  const edges: Edge[] = ge.map((e) => {
    const pathHighlighted =
      traceStepHighlightActive &&
      pathHighlightIds.size > 0 &&
      pathHighlightIds.has(e.source) &&
      pathHighlightIds.has(e.target);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.kind === "membership" ? "membership" : "permission",
      data: {
        kind: e.kind,
        level: e.level,
        permission: e.permission,
        presentationLabel: e.presentationLabel,
        isElevated: e.isElevated === true,
        isDirect: e.isDirect === true,
        pathHighlighted,
        traceFocusActive: traceStepHighlightActive,
      } satisfies ICanvasEdgeData,
    };
  });

  return { nodes, edges, dimIds, layoutNodeCount: gn.length };
}

export function patchNodeVisualState(
  node: Node,
  selectedUserId: string | null,
  selectedRepoId: string | null,
  hoveredNodeId: string | null,
  dimIds: Set<string>,
  focusMutedIds: Set<string>,
  isGraphNodeSelected: (
    nodeId: string,
    nodeType: NodeType,
    userId: string | null,
    repoId: string | null
  ) => boolean
): Node {
  const nt = node.type;
  if (nt !== "user" && nt !== "group" && nt !== "repo") {
    return node;
  }
  const typed = nt as NodeType;
  const selected = isGraphNodeSelected(node.id, typed, selectedUserId, selectedRepoId);
  const data = node.data as Record<string, unknown>;
  const filterDim = dimIds.has(node.id);
  const hoverDim = hoveredNodeId !== null && hoveredNodeId !== node.id && !selected;
  const dimmed = filterDim || hoverDim;
  const focusMuted = focusMutedIds.has(node.id);

  return {
    ...node,
    data: {
      ...data,
      selected,
      dimmed,
      focusMuted,
    },
  };
}
