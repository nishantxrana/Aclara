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

import { useGraph, useTrace } from "@/api/insightops.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { filterGraphForViewMode } from "@/lib/graphViewFilter";
import { createLogger } from "@/utils/logger";
import type { AccessGraph, NodeType } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";
import { layoutWithDagreLR } from "@/utils/dagreLayout";
import { GRAPH_NODE_COLORS } from "@/theme/graphColors";
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

const defaultEdgeOptions = { type: "permission" as const };

const canvasLog = createLogger("GraphCanvas");

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
    hoveredNodeId !== null && hoveredNodeId !== node.id && !selected;

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
  const graphViewMode = useVisualizerStore((s) => s.graphViewMode);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setHoveredNode = useVisualizerStore((s) => s.setHoveredNode);
  const setHoveredEdge = useVisualizerStore((s) => s.setHoveredEdge);
  const setInspector = useVisualizerStore((s) => s.setInspector);
  const setFilterText = useVisualizerStore((s) => s.setFilterText);
  const toggleOverPrivileged = useVisualizerStore((s) => s.toggleOverPrivileged);

  const debouncedFilter = useDebouncedValue(filterText, 300);
  const filterLower = useMemo(
    () => debouncedFilter.trim().toLowerCase(),
    [debouncedFilter]
  );

  const graphQuery = useGraph(selectedProjectName);
  const { selectedUserId, selectedRepoId, hoveredNodeId } = useVisualizerStore(
    useShallow((s) => ({
      selectedUserId: s.selectedUserId,
      selectedRepoId: s.selectedRepoId,
      hoveredNodeId: s.hoveredNodeId,
    }))
  );

  const traceQuery = useTrace(selectedProjectName, selectedUserId, selectedRepoId);

  const viewGraph = useMemo(() => {
    if (graphQuery.data === undefined) {
      return undefined;
    }
    return filterGraphForViewMode(graphQuery.data, graphViewMode, {
      selectedUserId,
      selectedRepoId,
      trace: traceQuery.data,
    });
  }, [
    graphQuery.data,
    graphViewMode,
    selectedRepoId,
    selectedUserId,
    traceQuery.data,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (viewGraph === undefined) {
      return;
    }

    const { nodes: baseNodes, edges: baseEdges } = toBaseFlowElements(
      viewGraph,
      filterLower,
      showOnlyOverPrivileged
    );

    canvasLog.debug("graph.canvas.filtered", {
      projectName: viewGraph.projectName,
      rawNodeCount: viewGraph.nodes.length,
      rawEdgeCount: viewGraph.edges.length,
      filteredNodeCount: baseNodes.length,
      filteredEdgeCount: baseEdges.length,
      graphViewMode,
      filterActive: filterLower.length > 0,
      overPrivilegedOnly: showOnlyOverPrivileged,
    });

    const positioned = layoutWithDagreLR(baseNodes, baseEdges);

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
    canvasLog.debug("graph.canvas.layout_applied", {
      positionedNodeCount: positioned.length,
      edgeCount: baseEdges.length,
    });
  }, [
    viewGraph,
    filterLower,
    showOnlyOverPrivileged,
    graphViewMode,
    setNodes,
    setEdges,
  ]);

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
        const id = node.id;
        const prev = useVisualizerStore.getState().selectedUserId;
        setInspector(null, null);
        setSelectedUser(prev === id ? null : id);
        return;
      }
      if (node.type === "repo") {
        const rid = repoIdFromNodeId(node.id);
        const prevRepo = useVisualizerStore.getState().selectedRepoId;
        setInspector(null, null);
        setSelectedRepo(prevRepo === rid ? null : rid);
        return;
      }
      if (node.type === "group") {
        setInspector(node.id, "group");
        return;
      }
    },
    [setInspector, setSelectedRepo, setSelectedUser]
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

  const onEdgeMouseEnter = useCallback(
    (_: MouseEvent, edge: Edge) => {
      setHoveredEdge(edge.id);
    },
    [setHoveredEdge]
  );

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, [setHoveredEdge]);

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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface px-6 text-center text-slate-400">
        <p className="max-w-sm text-sm">
          No nodes match the current filters, or the graph is empty for this view.
        </p>
        <button
          className="rounded-md border border-surface-light px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-surface-light/40"
          onClick={() => {
            setFilterText("");
            if (showOnlyOverPrivileged) {
              toggleOverPrivileged();
            }
          }}
          type="button"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 bg-surface">
      <ReactFlow
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
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
          className="!rounded-md !border !border-surface-light !bg-surface-light/90 hidden lg:block"
          maskColor="rgb(30, 30, 46, 0.65)"
          nodeColor={(n) => {
            if (n.type === "user") {
              return GRAPH_NODE_COLORS.user;
            }
            if (n.type === "group") {
              return GRAPH_NODE_COLORS.group;
            }
            if (n.type === "repo") {
              return GRAPH_NODE_COLORS.repo;
            }
            return GRAPH_NODE_COLORS.fallback;
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
