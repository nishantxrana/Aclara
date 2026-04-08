import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from "react";
import { useShallow } from "zustand/react/shallow";

import { useGraph, useTrace } from "@/api/aclara.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  computeFocusMutedNodeIds,
  filterGraphForViewMode,
} from "@/lib/graphViewFilter";
import { createLogger } from "@/utils/logger";
import { useVisualizerStore } from "@/stores/visualizer.store";
import { layoutWithDagreLR } from "@/utils/dagreLayout";
import { getGraphTheme } from "@/theme/designTokens";
import { getGraphNodeColors } from "@/theme/graphColors";
import { useTheme } from "@/theme/ThemeProvider";
import { isGraphNodeSelected, repoIdFromNodeId } from "@/utils/graphIds";

import {
  buildCanvasElements,
  patchNodeVisualState,
  pathHighlightNodeIds,
} from "./graphPresentation";
import { GroupNode } from "./GroupNode";
import { MembershipEdge } from "./MembershipEdge";
import { PermissionEdge } from "./PermissionEdge";
import { RepoNode } from "./RepoNode";
import { SwimLaneLegend } from "./SwimLaneLegend";
import { UserNode } from "./UserNode";

const nodeTypes: NodeTypes = {
  user: UserNode,
  group: GroupNode,
  repo: RepoNode,
};

const edgeTypes: EdgeTypes = {
  permission: PermissionEdge,
  membership: MembershipEdge,
};

const canvasLog = createLogger("GraphCanvas");

function GraphCanvasInner(): JSX.Element {
  const { theme } = useTheme();
  const graphTheme = getGraphTheme(theme);
  const graphNodeColors = getGraphNodeColors(theme);
  const { fitView, setViewport, getViewport } = useReactFlow();
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const filterText = useVisualizerStore((s) => s.filterText);
  const graphTextFilterMode = useVisualizerStore((s) => s.graphTextFilterMode);
  const showOnlyOverPrivileged = useVisualizerStore((s) => s.showOnlyOverPrivileged);
  const graphViewMode = useVisualizerStore((s) => s.graphViewMode);
  const setGraphViewportForProject = useVisualizerStore((s) => s.setGraphViewportForProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setHoveredNode = useVisualizerStore((s) => s.setHoveredNode);
  const setHoveredEdge = useVisualizerStore((s) => s.setHoveredEdge);
  const setInspector = useVisualizerStore((s) => s.setInspector);
  const setFilterText = useVisualizerStore((s) => s.setFilterText);
  const toggleOverPrivileged = useVisualizerStore((s) => s.toggleOverPrivileged);
  const highlightedTraceStepIndex = useVisualizerStore((s) => s.highlightedTraceStepIndex);
  const traceStepHoverIndex = useVisualizerStore((s) => s.traceStepHoverIndex);
  const effectiveTraceStepIndex = traceStepHoverIndex ?? highlightedTraceStepIndex;

  const debouncedFilter = useDebouncedValue(filterText, 300);
  const filterLower = useMemo(
    () => debouncedFilter.trim().toLowerCase(),
    [debouncedFilter]
  );

  const graphQuery = useGraph(selectedProjectName);
  const { selectedUserId, selectedRepoId, hoveredNodeId, inspectorNodeId, inspectorNodeType } =
    useVisualizerStore(
      useShallow((s) => ({
        selectedUserId: s.selectedUserId,
        selectedRepoId: s.selectedRepoId,
        hoveredNodeId: s.hoveredNodeId,
        inspectorNodeId: s.inspectorNodeId,
        inspectorNodeType: s.inspectorNodeType,
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

  const pathIds = useMemo(
    () =>
      pathHighlightNodeIds(
        traceQuery.data,
        effectiveTraceStepIndex,
        selectedUserId,
        selectedRepoId
      ),
    [
      effectiveTraceStepIndex,
      selectedRepoId,
      selectedUserId,
      traceQuery.data,
    ]
  );

  const traceStepHighlightActive = effectiveTraceStepIndex !== null;

  const focusMutedIds = useMemo(() => {
    if (viewGraph === undefined || graphViewMode === "advanced") {
      return new Set<string>();
    }
    return computeFocusMutedNodeIds(
      viewGraph,
      selectedRepoId,
      selectedUserId,
      traceQuery.data
    );
  }, [
    viewGraph,
    graphViewMode,
    selectedRepoId,
    selectedUserId,
    traceQuery.data,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const dimIdsRef = useRef<Set<string>>(new Set());
  const focusMutedIdsRef = useRef<Set<string>>(new Set());
  const lastViewportKeyRef = useRef<string>("");

  useEffect(() => {
    if (viewGraph === undefined) {
      return;
    }

    focusMutedIdsRef.current = focusMutedIds;

    const { nodes: baseNodes, edges: baseEdges, dimIds, layoutNodeCount } =
      buildCanvasElements(
        viewGraph,
        filterLower,
        graphTextFilterMode,
        showOnlyOverPrivileged,
        pathIds,
        traceStepHighlightActive,
        inspectorNodeId,
        inspectorNodeType
      );
    dimIdsRef.current = dimIds;

    canvasLog.debug("graph.canvas.filtered", {
      projectName: viewGraph.projectName,
      rawNodeCount: viewGraph.nodes.length,
      rawEdgeCount: viewGraph.edges.length,
      filteredNodeCount: baseNodes.length,
      filteredEdgeCount: baseEdges.length,
      graphViewMode,
      filterActive: filterLower.length > 0,
      textFilterMode: graphTextFilterMode,
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
          ui.hoveredNodeId,
          dimIds,
          focusMutedIds,
          isGraphNodeSelected
        )
      )
    );
    setEdges(baseEdges);

    const vpKey = `${selectedProjectName ?? ""}|${graphViewMode}|${String(layoutNodeCount)}`;
    const raf = requestAnimationFrame(() => {
      if (lastViewportKeyRef.current !== vpKey) {
        lastViewportKeyRef.current = vpKey;
        void fitView({ padding: 0.2, duration: 200 });
        return;
      }
      if (selectedProjectName !== null) {
        const saved = useVisualizerStore.getState().graphViewportByProject[selectedProjectName];
        if (saved !== undefined) {
          void setViewport(saved);
        }
      }
    });
    canvasLog.debug("graph.canvas.layout_applied", {
      positionedNodeCount: positioned.length,
      edgeCount: baseEdges.length,
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [
    viewGraph,
    filterLower,
    graphTextFilterMode,
    showOnlyOverPrivileged,
    graphViewMode,
    pathIds,
    traceStepHighlightActive,
    inspectorNodeId,
    inspectorNodeType,
    selectedProjectName,
    focusMutedIds,
    setNodes,
    setEdges,
    fitView,
    setViewport,
  ]);

  useEffect(() => {
    setNodes((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const dimIds = dimIdsRef.current;
      const muted = focusMutedIdsRef.current;
      return prev.map((n) =>
        patchNodeVisualState(
          n,
          selectedUserId,
          selectedRepoId,
          hoveredNodeId,
          dimIds,
          muted,
          isGraphNodeSelected
        )
      );
    });
  }, [selectedUserId, selectedRepoId, hoveredNodeId, focusMutedIds, setNodes]);

  const onMoveEnd = useCallback(() => {
    if (selectedProjectName === null) {
      return;
    }
    setGraphViewportForProject(selectedProjectName, getViewport());
  }, [getViewport, selectedProjectName, setGraphViewportForProject]);

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
      <div className="flex flex-1 items-center justify-center bg-canvas px-6 text-center text-ink-secondary">
        <p className="max-w-sm text-sm">Select a project in the header to load the access graph.</p>
      </div>
    );
  }

  if (graphQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-3 bg-canvas p-6">
        <div className="h-4 w-48 animate-pulse rounded bg-panel-muted" />
        <div className="flex flex-1 animate-pulse rounded-lg bg-panel-subtle" />
      </div>
    );
  }

  if (graphQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center bg-canvas px-6 text-center">
        <div>
          <p className="text-sm font-medium text-status-danger">Could not load graph</p>
          <p className="mt-1 text-xs text-ink-tertiary">{graphQuery.error.message}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-canvas px-6 text-center text-ink-secondary">
        <p className="max-w-sm text-sm">
          No nodes match the current filters, or the graph is empty for this view.
        </p>
        <button
          className="rounded-input border border-line-default bg-panel px-3 py-1.5 text-xs font-medium text-ink-primary shadow-panel hover:bg-panel-subtle"
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
    <div className="relative min-h-0 flex-1 bg-canvas">
      <ReactFlow
        edges={edges}
        edgeTypes={edgeTypes}
        fitView={false}
        maxZoom={2}
        minZoom={0.12}
        nodes={nodes}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onEdgesChange={onEdgesChange}
        onMoveEnd={onMoveEnd}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
      >
        <SwimLaneLegend />
        <Background color={graphTheme.grid} gap={20} />
        <Controls className="!border-line-default !bg-panel !shadow-panel-md [&_button]:!fill-ink-secondary" />
        <MiniMap
          className="!rounded-md !border !border-line-default !bg-panel/95 hidden lg:block"
          maskColor={graphTheme.minimapMask}
          nodeColor={(n) => {
            if (n.type === "user") {
              return graphNodeColors.user;
            }
            if (n.type === "group") {
              return graphNodeColors.group;
            }
            if (n.type === "repo") {
              return graphNodeColors.repo;
            }
            return graphNodeColors.fallback;
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
