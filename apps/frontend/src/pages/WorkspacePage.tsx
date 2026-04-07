import { useEffect } from "react";

import { AppShell } from "@/components/Layout/AppShell";
import { Header } from "@/components/Layout/Header";
import { ProjectContextStrip } from "@/components/Layout/ProjectContextStrip";
import { ProjectOverview } from "@/components/Layout/ProjectOverview";
import { useWorkspaceUrlSync } from "@/hooks/useWorkspaceUrlSync";
import { useVisualizerStore } from "@/stores/visualizer.store";

/**
 * Authenticated workspace: header, optional overview, investigation shell.
 */
export function WorkspacePage(): JSX.Element {
  useWorkspaceUrlSync();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") {
        return;
      }
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      useVisualizerStore.getState().clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const workspaceView = useVisualizerStore((s) => s.workspaceView);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-surface text-slate-100">
      <Header />
      <ProjectContextStrip />
      {workspaceView === "overview" ? (
        <ProjectOverview />
      ) : (
        <AppShell />
      )}
    </div>
  );
}
