import { create, type StateCreator } from "zustand";
import { devtools } from "zustand/middleware";

import type { GraphViewMode } from "@/lib/graphViewFilter";

export type ExplorerTab = "users" | "repos" | "risks";

export type WorkspaceView = "overview" | "investigate";

/** How text search affects the graph: highlight (default), add 1-hop context, or hide non-matches. */
export type GraphTextFilterMode = "highlight" | "contextual" | "hide";

export type RecentProject = { readonly id: string; readonly name: string };

export interface GraphViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface VisualizerState {
  selectedProject: string | null;
  selectedProjectName: string | null;
  selectedUserId: string | null;
  selectedRepoId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  filterText: string;
  graphTextFilterMode: GraphTextFilterMode;
  showOnlyOverPrivileged: boolean;
  graphViewMode: GraphViewMode;
  explorerTab: ExplorerTab;
  /** Right-side inspector for group/user/repo metadata (non-trace). */
  inspectorNodeId: string | null;
  inspectorNodeType: "user" | "group" | "repo" | null;
  tracePanelWidthPx: number;
  workspaceView: WorkspaceView;
  /** Last N projects selected this session (in-memory only). */
  recentProjects: RecentProject[];
  /** When URL had ?project= that did not match the org list after load. */
  urlProjectResolveError: string | null;
  /** Pinned trace timeline step for graph path highlight (click). */
  highlightedTraceStepIndex: number | null;
  /** Temporary trace step while hovering the timeline (overrides pin for preview). */
  traceStepHoverIndex: number | null;
  /** Saved React Flow viewport per project name (optional). */
  graphViewportByProject: Record<string, GraphViewport>;
  /** Project for which viewport was last applied (avoid refit on every tweak). */
  graphViewportAppliedKey: string | null;
}

export interface VisualizerActions {
  setSelectedProject: (id: string | null, name: string | null) => void;
  setSelectedUser: (id: string | null) => void;
  setSelectedRepo: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  setFilterText: (text: string) => void;
  setGraphTextFilterMode: (mode: GraphTextFilterMode) => void;
  toggleOverPrivileged: () => void;
  setGraphViewMode: (mode: GraphViewMode) => void;
  setExplorerTab: (tab: ExplorerTab) => void;
  setInspector: (nodeId: string | null, nodeType: "user" | "group" | "repo" | null) => void;
  setTracePanelWidthPx: (w: number) => void;
  setWorkspaceView: (view: WorkspaceView) => void;
  setUrlProjectResolveError: (message: string | null) => void;
  setHighlightedTraceStepIndex: (index: number | null) => void;
  setTraceStepHoverIndex: (index: number | null) => void;
  setGraphViewportForProject: (projectName: string, v: GraphViewport) => void;
  clearGraphViewportForProject: (projectName: string) => void;
  markGraphViewportApplied: (key: string | null) => void;
  clearSelection: () => void;
}

type VisualizerStore = VisualizerState & VisualizerActions;

const MAX_RECENT = 5;

function pushRecent(list: RecentProject[], entry: RecentProject): RecentProject[] {
  const without = list.filter((p) => p.name !== entry.name);
  return [entry, ...without].slice(0, MAX_RECENT);
}

const storeCreator: StateCreator<VisualizerStore> = (set) => ({
  selectedProject: null,
  selectedProjectName: null,
  selectedUserId: null,
  selectedRepoId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
  filterText: "",
  graphTextFilterMode: "highlight",
  showOnlyOverPrivileged: false,
  graphViewMode: "summary",
  explorerTab: "users",
  inspectorNodeId: null,
  inspectorNodeType: null,
  tracePanelWidthPx: 320,
  workspaceView: "overview",
  recentProjects: [],
  urlProjectResolveError: null,
  highlightedTraceStepIndex: null,
  traceStepHoverIndex: null,
  graphViewportByProject: {},
  graphViewportAppliedKey: null,

  setSelectedProject: (id, name) =>
    set((state) => {
      if (id !== null && name !== null) {
        return {
          selectedProject: id,
          selectedProjectName: name,
          recentProjects: pushRecent(state.recentProjects, { id, name }),
          urlProjectResolveError: null,
        };
      }
      return {
        selectedProject: id,
        selectedProjectName: name,
      };
    }),

  setSelectedUser: (id) => set({ selectedUserId: id }),

  setSelectedRepo: (id) => set({ selectedRepoId: id }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),

  setFilterText: (text) => set({ filterText: text }),

  setGraphTextFilterMode: (mode) => set({ graphTextFilterMode: mode }),

  toggleOverPrivileged: () =>
    set((state) => ({ showOnlyOverPrivileged: !state.showOnlyOverPrivileged })),

  setGraphViewMode: (mode) => set({ graphViewMode: mode }),

  setExplorerTab: (tab) => set({ explorerTab: tab }),

  setInspector: (nodeId, nodeType) =>
    set({ inspectorNodeId: nodeId, inspectorNodeType: nodeType }),

  setTracePanelWidthPx: (w) => set({ tracePanelWidthPx: w }),

  setWorkspaceView: (view) => set({ workspaceView: view }),

  setUrlProjectResolveError: (message) => set({ urlProjectResolveError: message }),

  setHighlightedTraceStepIndex: (index) =>
    set({ highlightedTraceStepIndex: index, traceStepHoverIndex: null }),

  setTraceStepHoverIndex: (index) => set({ traceStepHoverIndex: index }),

  setGraphViewportForProject: (projectName, v) =>
    set((state) => ({
      graphViewportByProject: { ...state.graphViewportByProject, [projectName]: v },
    })),

  clearGraphViewportForProject: (projectName) =>
    set((state) => {
      const next = { ...state.graphViewportByProject };
      delete next[projectName];
      return { graphViewportByProject: next };
    }),

  markGraphViewportApplied: (key) => set({ graphViewportAppliedKey: key }),

  /** Clears trace targets, inspector, hover, and trace highlight; keeps project and filters. */
  clearSelection: () =>
    set({
      selectedUserId: null,
      selectedRepoId: null,
      hoveredNodeId: null,
      hoveredEdgeId: null,
      inspectorNodeId: null,
      inspectorNodeType: null,
      highlightedTraceStepIndex: null,
      traceStepHoverIndex: null,
    }),
});

export const useVisualizerStore = create<VisualizerStore>()(
  devtools(storeCreator, {
    name: "VisualizerStore",
    enabled: import.meta.env.DEV,
  })
);
