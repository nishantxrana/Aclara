import { ChevronRight } from "lucide-react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
      className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft bg-panel-subtle/80 px-4 py-2"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-ink-secondary">
        <span className="font-medium text-ink-tertiary">Workspace</span>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
        <span className="truncate text-ink-primary" title={selectedProjectName}>
          {selectedProjectName}
        </span>
      </div>
      <SegmentedControl
        ariaLabel="Workspace view"
        onChange={(id) => {
          setWorkspaceView(id);
        }}
        options={[
          { id: "overview", label: "Overview" },
          { id: "investigate", label: "Investigate" },
        ]}
        value={workspaceView}
      />
    </div>
  );
}
