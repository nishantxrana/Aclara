import { useEffect } from "react";

import type { ProjectSummary } from "@/api/insightops.api";
import { useVisualizerStore } from "@/stores/visualizer.store";

/**
 * After projects load, resolves `selectedProjectName` from the URL into id+name when id was missing.
 * Sets `urlProjectResolveError` when the name is not in the org list.
 */
export function useResolveProjectFromUrl(projects: ProjectSummary[] | undefined): void {
  useEffect(() => {
    if (projects === undefined || projects.length === 0) {
      return;
    }
    const { selectedProjectName, selectedProject, setSelectedProject, setUrlProjectResolveError } =
      useVisualizerStore.getState();
    if (selectedProjectName === null || selectedProjectName.length === 0) {
      return;
    }
    if (selectedProject !== null) {
      return;
    }
    const match = projects.find((p) => p.name === selectedProjectName);
    if (match !== undefined) {
      setSelectedProject(match.id, match.name);
      setUrlProjectResolveError(null);
      return;
    }
    setUrlProjectResolveError(selectedProjectName);
  }, [projects]);
}
