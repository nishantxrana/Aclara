import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { useVisualizerStore } from "@/stores/visualizer.store";

const VIEW_VALUES = new Set(["overview", "investigate"]);

/**
 * Hydrates the visualizer store from the URL once, then writes URL when selection changes.
 */
export function useWorkspaceUrlSync(): void {
  const [_, setSearchParams] = useSearchParams();
  const hydrated = useRef(false);

  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const selectedUserId = useVisualizerStore((s) => s.selectedUserId);
  const selectedRepoId = useVisualizerStore((s) => s.selectedRepoId);
  const workspaceView = useVisualizerStore((s) => s.workspaceView);
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }
    hydrated.current = true;
    const params = new URLSearchParams(window.location.search);
    const project = params.get("project");
    const user = params.get("user");
    const repo = params.get("repo");
    const view = params.get("view");
    if (project !== null && project.length > 0) {
      setSelectedProject(null, project);
    }
    if (user !== null && user.length > 0) {
      setSelectedUser(user);
    }
    if (repo !== null && repo.length > 0) {
      setSelectedRepo(repo);
    }
    if (view !== null && VIEW_VALUES.has(view)) {
      setWorkspaceView(view === "overview" ? "overview" : "investigate");
    }
  }, [setSelectedProject, setSelectedRepo, setSelectedUser, setWorkspaceView]);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    const next = new URLSearchParams();
    if (selectedProjectName !== null && selectedProjectName.length > 0) {
      next.set("project", selectedProjectName);
    }
    if (selectedUserId !== null && selectedUserId.length > 0) {
      next.set("user", selectedUserId);
    }
    if (selectedRepoId !== null && selectedRepoId.length > 0) {
      next.set("repo", selectedRepoId);
    }
    next.set("view", workspaceView);
    setSearchParams(next, { replace: true });
  }, [
    selectedProjectName,
    selectedRepoId,
    selectedUserId,
    workspaceView,
    setSearchParams,
  ]);
}
