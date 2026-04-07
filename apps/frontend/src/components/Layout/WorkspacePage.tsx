import { AppShell } from "@/components/Layout/AppShell";
import { ProjectOverview } from "@/components/Layout/ProjectOverview";
import { useWorkspaceUrlSync } from "@/hooks/useWorkspaceUrlSync";
import { useVisualizerStore } from "@/stores/visualizer.store";

/**
 * Authenticated workspace: URL sync, optional overview strip, and main investigation shell.
 */
export function WorkspacePage(): JSX.Element {
  useWorkspaceUrlSync();
  const workspaceView = useVisualizerStore((s) => s.workspaceView);

  return (
    <div className="flex h-screen min-h-0 flex-col">
      {workspaceView === "overview" ? <ProjectOverview /> : null}
      <AppShell />
    </div>
  );
}
