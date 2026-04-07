import { create, type StateCreator } from "zustand";
import { devtools } from "zustand/middleware";

import type { GraphViewMode } from "@/lib/graphViewFilter";

export type ExplorerTab = "users" | "repos" | "risks";

export type WorkspaceView = "overview" | "investigate";

export interface VisualizerState {
  selectedProject: string | null;
  selectedProjectName: string | null;
  selectedUserId: string | null;
  selectedRepoId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  filterText: string;
  showOnlyOverPrivileged: boolean;
  graphViewMode: GraphViewMode;
  explorerTab: ExplorerTab;
  /** Right-side inspector for group/user/repo metadata (non-trace). */
  inspectorNodeId: string | null;
  inspectorNodeType: "user" | "group" | "repo" | null;
  tracePanelWidthPx: number;
  workspaceView: WorkspaceView;
}

export interface VisualizerActions {
  setSelectedProject: (id: string | null, name: string | null) => void;
  setSelectedUser: (id: string | null) => void;
  setSelectedRepo: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  setFilterText: (text: string) => void;
  toggleOverPrivileged: () => void;
  setGraphViewMode: (mode: GraphViewMode) => void;
  setExplorerTab: (tab: ExplorerTab) => void;
  setInspector: (nodeId: string | null, nodeType: "user" | "group" | "repo" | null) => void;
  setTracePanelWidthPx: (w: number) => void;
  setWorkspaceView: (view: WorkspaceView) => void;
  clearSelection: () => void;
}

type VisualizerStore = VisualizerState & VisualizerActions;

const storeCreator: StateCreator<VisualizerStore> = (set) => ({
  selectedProject: null,
  selectedProjectName: null,
  selectedUserId: null,
  selectedRepoId: null,
  hoveredNodeId: null,
  hoveredEdgeId: null,
  filterText: "",
  showOnlyOverPrivileged: false,
  graphViewMode: "overview",
  explorerTab: "users",
  inspectorNodeId: null,
  inspectorNodeType: null,
  tracePanelWidthPx: 320,
  workspaceView: "investigate",

  setSelectedProject: (id, name) =>
    set({ selectedProject: id, selectedProjectName: name }),

  setSelectedUser: (id) => set({ selectedUserId: id }),

  setSelectedRepo: (id) => set({ selectedRepoId: id }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),

  setFilterText: (text) => set({ filterText: text }),

  toggleOverPrivileged: () =>
    set((state) => ({ showOnlyOverPrivileged: !state.showOnlyOverPrivileged })),

  setGraphViewMode: (mode) => set({ graphViewMode: mode }),

  setExplorerTab: (tab) => set({ explorerTab: tab }),

  setInspector: (nodeId, nodeType) =>
    set({ inspectorNodeId: nodeId, inspectorNodeType: nodeType }),

  setTracePanelWidthPx: (w) => set({ tracePanelWidthPx: w }),

  setWorkspaceView: (view) => set({ workspaceView: view }),

  /** Clears trace targets, inspector, and hover; keeps project and filters. */
  clearSelection: () =>
    set({
      selectedUserId: null,
      selectedRepoId: null,
      hoveredNodeId: null,
      hoveredEdgeId: null,
      inspectorNodeId: null,
      inspectorNodeType: null,
    }),
});

export const useVisualizerStore = create<VisualizerStore>()(
  devtools(storeCreator, {
    name: "VisualizerStore",
    enabled: import.meta.env.DEV,
  })
);
