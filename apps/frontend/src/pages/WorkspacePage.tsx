import { useEffect } from "react";

import { useProjects } from "@/api/insightops.api";
import { AppShell } from "@/components/Layout/AppShell";
import { Header } from "@/components/Layout/Header";
import { ProjectContextStrip } from "@/components/Layout/ProjectContextStrip";
import { ProjectEntryScreen } from "@/components/Layout/ProjectEntryScreen";
import { ProjectOverview } from "@/components/Layout/ProjectOverview";
import { UrlProjectNotFoundBanner } from "@/components/Layout/EmptyStates";
import { useResolveProjectFromUrl } from "@/hooks/useResolveProjectFromUrl";
import { useWorkspaceUrlSync } from "@/hooks/useWorkspaceUrlSync";
import { uxEvent } from "@/lib/uxTelemetry";
import { useVisualizerStore } from "@/stores/visualizer.store";

/**
 * Authenticated workspace: project pick → overview / investigation.
 */
export function WorkspacePage(): JSX.Element {
  useWorkspaceUrlSync();
  const projectsQuery = useProjects();

  useResolveProjectFromUrl(projectsQuery.data);

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
  const selectedProject = useVisualizerStore((s) => s.selectedProject);
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const urlProjectResolveError = useVisualizerStore((s) => s.urlProjectResolveError);
  const setUrlProjectResolveError = useVisualizerStore((s) => s.setUrlProjectResolveError);
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);

  /** Canonical project id is required before opening the full workspace (URL names hydrate first). */
  const pickingProject = selectedProject === null;

  useEffect(() => {
    if (!pickingProject && selectedProjectName !== null) {
      uxEvent("workspace_active", { project: selectedProjectName });
    }
  }, [pickingProject, selectedProjectName]);

  if (pickingProject) {
    return (
      <div className="flex h-screen min-h-0 flex-col bg-page text-ink-primary">
        <Header layout="pickProject" />
        <ProjectEntryScreen />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-page text-ink-primary">
      <Header layout="workspace" />
      {urlProjectResolveError !== null ? (
        <UrlProjectNotFoundBanner
          onDismiss={() => {
            setUrlProjectResolveError(null);
            setSelectedProject(null, null);
            setSelectedUser(null);
            setSelectedRepo(null);
          }}
          projectName={urlProjectResolveError}
        />
      ) : null}
      <ProjectContextStrip />
      {workspaceView === "overview" ? (
        <ProjectOverview />
      ) : (
        <AppShell />
      )}
    </div>
  );
}
