import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  QUERY_KEYS,
  disconnectSession,
  refreshProjectData,
  useProjects,
  useSessionStatus,
} from "@/api/insightops.api";
import { Button } from "@/components/ui/Button";
import { uxEvent } from "@/lib/uxTelemetry";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { ProjectPicker } from "./ProjectPicker";

function formatSyncedAt(iso: string | undefined): string {
  if (iso === undefined || iso.length === 0) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type HeaderLayout = "workspace" | "pickProject";

export function Header(props: { readonly layout?: HeaderLayout }): JSX.Element {
  const layout = props.layout ?? "workspace";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useSessionStatus();
  const projectsQuery = useProjects();
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const selectedProject = useVisualizerStore((s) => s.selectedProject);
  const recentProjects = useVisualizerStore((s) => s.recentProjects);
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);
  const clearGraphViewportForProject = useVisualizerStore((s) => s.clearGraphViewportForProject);
  const markGraphViewportApplied = useVisualizerStore((s) => s.markGraphViewportApplied);

  const graphData =
    selectedProjectName !== null
      ? queryClient.getQueryData<{ generatedAt?: string; nodes?: unknown[] }>(
          QUERY_KEYS.graph(selectedProjectName)
        )
      : undefined;

  const onProjectChange = (id: string | null, name: string | null) => {
    if (name === null || name.length === 0) {
      setSelectedProject(null, null);
      setSelectedUser(null);
      setSelectedRepo(null);
      return;
    }
    const prevName = useVisualizerStore.getState().selectedProjectName;
    if (prevName !== null && prevName !== name) {
      markGraphViewportApplied(null);
    }
    if (id !== null) {
      setSelectedProject(id, name);
    } else {
      const match = projectsQuery.data?.find((p) => p.name === name);
      if (match !== undefined) {
        setSelectedProject(match.id, match.name);
      } else {
        setSelectedProject(null, name);
      }
    }
    setSelectedUser(null);
    setSelectedRepo(null);
    uxEvent("project_selected", { phase: layout, hasId: id !== null });
    setWorkspaceView("overview");
  };

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (selectedProjectName === null) {
        return;
      }
      const { graph, users, repos } = await refreshProjectData(selectedProjectName);
      queryClient.setQueryData(QUERY_KEYS.graph(selectedProjectName), graph);
      queryClient.setQueryData(QUERY_KEYS.users(selectedProjectName), users);
      queryClient.setQueryData(QUERY_KEYS.repos(selectedProjectName), repos);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await disconnectSession();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessionStatus });
    },
    onSuccess: () => {
      queryClient.removeQueries();
      navigate("/connect", { replace: true });
    },
  });

  const nodeCount =
    graphData !== undefined && Array.isArray(graphData.nodes)
      ? graphData.nodes.length
      : null;

  let connectionLabel: string | null = null;
  if (sessionQuery.data?.connected === true) {
    if (sessionQuery.data.source === "env") {
      connectionLabel = "Connected (server env)";
    } else {
      connectionLabel = "Connected (session)";
    }
  }

  const orgLabel =
    sessionQuery.data?.connected === true ? sessionQuery.data.org : undefined;

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line-soft bg-panel px-4 py-3 shadow-panel">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-lg font-semibold tracking-tight text-brand-primary">InsightOps</span>
        {connectionLabel !== null ? (
          <span className="text-label uppercase tracking-wide text-ink-tertiary">
            {connectionLabel}
          </span>
        ) : null}
        {orgLabel !== undefined ? (
          <span className="truncate text-label text-ink-tertiary" title={orgLabel}>
            {orgLabel}
          </span>
        ) : null}
      </div>

      {layout === "workspace" ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <ProjectPicker
            error={projectsQuery.error ?? null}
            isLoading={projectsQuery.isPending}
            onRetry={() => {
              void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
            }}
            onSelect={onProjectChange}
            {...(orgLabel !== undefined ? { orgLabel } : {})}
            projects={projectsQuery.data ?? []}
            recentProjects={recentProjects}
            selectedProjectId={selectedProject}
            selectedProjectName={selectedProjectName}
            variant="header"
          />

          {selectedProjectName !== null ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
              <span>
                Nodes:{" "}
                <span className="font-medium text-ink-primary">
                  {nodeCount === null ? "…" : String(nodeCount)}
                </span>
              </span>
              <span className="hidden sm:inline">
                Last sync:{" "}
                <span className="font-medium text-ink-primary">
                  {formatSyncedAt(graphData?.generatedAt)}
                </span>
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 flex-1 text-sm text-ink-secondary">
          Select a project below to open your workspace.
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {layout === "workspace" ? (
          <Button
            className="text-xs"
            disabled={selectedProjectName === null || refreshMutation.isPending}
            onClick={() => {
              if (selectedProjectName !== null) {
                clearGraphViewportForProject(selectedProjectName);
                markGraphViewportApplied(null);
              }
              refreshMutation.mutate();
            }}
            variant="secondary"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </Button>
        ) : null}
        <Button
          className="text-xs hover:border-status-danger/50 hover:text-status-danger"
          disabled={disconnectMutation.isPending}
          onClick={() => {
            disconnectMutation.mutate();
          }}
          variant="secondary"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Disconnect
        </Button>
      </div>
    </header>
  );
}
