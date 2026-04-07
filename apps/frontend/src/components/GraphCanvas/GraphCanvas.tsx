import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import { useShallow } from "zustand/react/shallow";

import { useGraph } from "@/api/insightops.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AccessGraph, NodeType } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";
import { layoutForcePlaceholder, layoutWithDagreLR } from "@/utils/dagreLayout";
import { isGraphNodeSelected, repoIdFromNodeId } from "@/utils/graphIds";

import { GroupNode } from "./GroupNode";
import { PermissionEdge } from "./PermissionEdge";
import { RepoNode } from "./RepoNode";
import { UserNode } from "./UserNode";

const nodeTypes: NodeTypes = {
  user: UserNode,
  group: GroupNode,
  repo: RepoNode,
};

const edgeTypes: EdgeTypes = {
  permission: PermissionEdge,
};

function graphMatchesFilter(
  graph: AccessGraph,
  filterLower: string,
  onlyOverPrivileged: boolean
): { nodes: AccessGraph["nodes"]; edges: AccessGraph["edges"] } {
  let nodes = graph.nodes;

  if (filterLower.length > 0) {
    nodes = nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(filterLower) ||
        n.id.toLowerCase().includes(filterLower)
    );
  }

  if (onlyOverPrivileged) {
    nodes = nodes.filter((n) => n.isOverPrivileged === true);
  }

  const idSet = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) => idSet.has(e.source) && idSet.has(e.target)
  );

  return { nodes, edges };
}

function toBaseFlowElements(
  graph: AccessGraph,
  filterLower: string,
  onlyOverPrivileged: boolean
): { nodes: Node[]; edges: Edge[] } {
  const { nodes: gn, edges: ge } = graphMatchesFilter(
    graph,
    filterLower,
    onlyOverPrivileged
  );

  const nodes: Node[] = gn.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      isOverPrivileged: n.isOverPrivileged === true,
      selected: false,
      dimmed: false,
    },
  }));

  const edges: Edge[] = ge.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "permission",
    data: {
      level: e.level,
      permission: e.permission,
    },
  }));

  return { nodes, edges };
}

function patchNodeVisualState(
  node: Node,
  selectedUserId: string | null,
  selectedRepoId: string | null,
  hoveredNodeId: string | null
): Node {
  const nt = node.type;
  if (nt !== "user" && nt !== "group" && nt !== "repo") {
    return node;
  }
  const typed = nt as NodeType;
  const selected = isGraphNodeSelected(
    node.id,
    typed,
    selectedUserId,
    selectedRepoId
  );
  const dimmed =
    hoveredNodeId !== null &&
    hoveredNodeId !== node.id &&
    !selected;

  return {
    ...node,
    data: {
      ...node.data,
      selected,
      dimmed,
    },
  };
}

function GraphCanvasInner(): JSX.Element {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const filterText = useVisualizerStore((s) => s.filterText);
  const showOnlyOverPrivileged = useVisualizerStore((s) => s.showOnlyOverPrivileged);
  const layoutMode = useVisualizerStore((s) => s.layoutMode);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setHoveredNode = useVisualizerStore((s) => s.setHoveredNode);

  const debouncedFilter = useDebouncedValue(filterText, 300);
  const filterLower = useMemo(
    () => debouncedFilter.trim().toLowerCase(),
    [debouncedFilter]
  );

  const graphQuery = useGraph(selectedProjectName);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (graphQuery.data === undefined) {
      return;
    }

    const { nodes: baseNodes, edges: baseEdges } = toBaseFlowElements(
      graphQuery.data,
      filterLower,
      showOnlyOverPrivileged
    );

    const positioned =
      layoutMode === "hierarchical"
        ? layoutWithDagreLR(baseNodes, baseEdges)
        : layoutForcePlaceholder(baseNodes);

    const ui = useVisualizerStore.getState();
    setNodes(
      positioned.map((n) =>
        patchNodeVisualState(
          n,
          ui.selectedUserId,
          ui.selectedRepoId,
          ui.hoveredNodeId
        )
      )
    );
    setEdges(baseEdges);
  }, [
    graphQuery.data,
    filterLower,
    showOnlyOverPrivileged,
    layoutMode,
    setNodes,
    setEdges,
  ]);

  const { selectedUserId, selectedRepoId, hoveredNodeId } = useVisualizerStore(
    useShallow((s) => ({
      selectedUserId: s.selectedUserId,
      selectedRepoId: s.selectedRepoId,
      hoveredNodeId: s.hoveredNodeId,
    }))
  );

  useEffect(() => {
    setNodes((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      return prev.map((n) =>
        patchNodeVisualState(n, selectedUserId, selectedRepoId, hoveredNodeId)
      );
    });
  }, [selectedUserId, selectedRepoId, hoveredNodeId, setNodes]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      if (node.type === "user") {
        setSelectedUser(node.id);
        setSelectedRepo(null);
        return;
      }
      if (node.type === "repo") {
        setSelectedRepo(repoIdFromNodeId(node.id));
        setSelectedUser(null);
        return;
      }
      setSelectedUser(null);
      setSelectedRepo(null);
    },
    [setSelectedRepo, setSelectedUser]
  );

  const onNodeMouseEnter = useCallback(
    (_: MouseEvent, node: Node) => {
      setHoveredNode(node.id);
    },
    [setHoveredNode]
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, [setHoveredNode]);

  if (selectedProjectName === null) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface text-slate-400">
        <p className="text-sm">Select a project to load the access graph.</p>
      </div>
    );
  }

  if (graphQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-3 bg-surface p-6">
        <div className="h-4 w-48 animate-pulse rounded bg-surface-light" />
        <div className="flex flex-1 animate-pulse rounded-lg bg-surface-light/60" />
      </div>
    );
  }

  if (graphQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface px-6 text-center">
        <div>
          <p className="text-sm font-medium text-red-400">Could not load graph</p>
          <p className="mt-1 text-xs text-slate-500">{graphQuery.error.message}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface text-slate-400">
        <p className="max-w-sm text-center text-sm">
          No nodes match the current filters, or the graph is empty for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 bg-surface">
      <ReactFlow
        defaultEdgeOptions={{ type: "permission" }}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f3f5a" gap={20} />
        <Controls className="!bg-surface-light !border-surface-light !shadow-lg [&_button]:!fill-slate-200" />
        <MiniMap
          className="!rounded-md !border !border-surface-light !bg-surface-light/90"
          maskColor="rgb(30, 30, 46, 0.65)"
          nodeColor={(n) => {
            if (n.type === "user") {
              return "#3b82f6";
            }
            if (n.type === "group") {
              return "#8b5cf6";
            }
            if (n.type === "repo") {
              return "#10b981";
            }
            return "#64748b";
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(): JSX.Element {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
