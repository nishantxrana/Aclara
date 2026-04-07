import { create, type StateCreator } from "zustand";
import { devtools } from "zustand/middleware";

export type LayoutMode = "hierarchical" | "force";

export interface VisualizerState {
  selectedProject: string | null;
  selectedProjectName: string | null;
  selectedUserId: string | null;
  selectedRepoId: string | null;
  hoveredNodeId: string | null;
  filterText: string;
  showOnlyOverPrivileged: boolean;
  layoutMode: LayoutMode;
}

export interface VisualizerActions {
  setSelectedProject: (id: string | null, name: string | null) => void;
  setSelectedUser: (id: string | null) => void;
  setSelectedRepo: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setFilterText: (text: string) => void;
  toggleOverPrivileged: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  clearSelection: () => void;
}

type VisualizerStore = VisualizerState & VisualizerActions;

const storeCreator: StateCreator<VisualizerStore> = (set) => ({
  selectedProject: null,
  selectedProjectName: null,
  selectedUserId: null,
  selectedRepoId: null,
  hoveredNodeId: null,
  filterText: "",
  showOnlyOverPrivileged: false,
  layoutMode: "hierarchical",

  setSelectedProject: (id, name) =>
    set({ selectedProject: id, selectedProjectName: name }),

  setSelectedUser: (id) => set({ selectedUserId: id }),

  setSelectedRepo: (id) => set({ selectedRepoId: id }),

  setHoveredNode: (id) => set({ hoveredNodeId: id }),

  setFilterText: (text) => set({ filterText: text }),

  toggleOverPrivileged: () =>
    set((state) => ({ showOnlyOverPrivileged: !state.showOnlyOverPrivileged })),

  setLayoutMode: (mode) => set({ layoutMode: mode }),

  clearSelection: () =>
    set({
      selectedProject: null,
      selectedProjectName: null,
      selectedUserId: null,
      selectedRepoId: null,
      hoveredNodeId: null,
    }),
});

export const useVisualizerStore = create<VisualizerStore>()(
  devtools(storeCreator, {
    name: "VisualizerStore",
    enabled: import.meta.env.DEV,
  })
);
