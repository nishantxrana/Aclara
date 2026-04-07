import { ChevronRight } from "lucide-react";

import { useVisualizerStore } from "@/stores/visualizer.store";

/**
 * Breadcrumbs and workspace mode toggle (overview vs investigation).
 */
export function ProjectContextStrip(): JSX.Element | null {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const workspaceView = useVisualizerStore((s) => s.workspaceView);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);

  if (selectedProjectName === null) {
    return null;
  }

  return (
    <div
      aria-label="Workspace context"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-light bg-surface-light/25 px-4 py-2"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-slate-400">
        <span className="font-medium text-slate-500">Workspace</span>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
        <span className="truncate text-slate-200" title={selectedProjectName}>
          {selectedProjectName}
        </span>
      </div>
      <div className="flex rounded-md border border-surface-light p-0.5">
        <button
          className={`rounded px-2 py-1 text-xs font-medium ${
            workspaceView === "overview"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setWorkspaceView("overview");
          }}
          type="button"
        >
          Overview
        </button>
        <button
          className={`rounded px-2 py-1 text-xs font-medium ${
            workspaceView === "investigate"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setWorkspaceView("investigate");
          }}
          type="button"
        >
          Investigate
        </button>
      </div>
    </div>
  );
}
