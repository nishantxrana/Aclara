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
import { useVisualizerStore } from "@/stores/visualizer.store";

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

export function Header(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useSessionStatus();
  const projectsQuery = useProjects();
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);

  const graphData =
    selectedProjectName !== null
      ? queryClient.getQueryData<{ generatedAt?: string; nodes?: unknown[] }>(
          QUERY_KEYS.graph(selectedProjectName)
        )
      : undefined;

  const onProjectChange = (name: string) => {
    if (name.length === 0) {
      setSelectedProject(null, null);
      setSelectedUser(null);
      setSelectedRepo(null);
      return;
    }
    const match = projectsQuery.data?.find((p) => p.name === name);
    if (match !== undefined) {
      setSelectedProject(match.id, match.name);
    } else {
      setSelectedProject(null, name);
    }
    setSelectedUser(null);
    setSelectedRepo(null);
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

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-surface-light bg-surface-light/40 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-lg font-semibold tracking-tight text-primary">InsightOps</span>
        {connectionLabel !== null ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {connectionLabel}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {projectsQuery.isPending ? (
          <div className="h-9 w-56 max-w-full animate-pulse rounded-md bg-surface-light" />
        ) : projectsQuery.isError ? (
          <p className="text-sm text-red-400">{projectsQuery.error.message}</p>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="project-select">
              Project
            </label>
            <select
              className="max-w-xs min-w-[12rem] cursor-pointer rounded-md border border-surface-light bg-surface px-3 py-2 text-sm text-slate-100 focus:border-primary focus:outline-none"
              id="project-select"
              onChange={(e) => {
                onProjectChange(e.target.value);
              }}
              value={selectedProjectName ?? ""}
            >
              <option value="">Select project…</option>
              {(projectsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedProjectName !== null ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Nodes:{" "}
              <span className="font-medium text-slate-300">
                {nodeCount === null ? "…" : String(nodeCount)}
              </span>
            </span>
            <span className="hidden sm:inline">
              Last sync:{" "}
              <span className="font-medium text-slate-300">
                {formatSyncedAt(graphData?.generatedAt)}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          className="flex shrink-0 items-center gap-2 rounded-md border border-surface-light px-3 py-2 text-xs font-medium text-slate-300 hover:border-primary/50 hover:text-slate-100 disabled:opacity-40"
          disabled={selectedProjectName === null || refreshMutation.isPending}
          onClick={() => {
            refreshMutation.mutate();
          }}
          type="button"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
        <button
          className="flex shrink-0 items-center gap-2 rounded-md border border-surface-light px-3 py-2 text-xs font-medium text-slate-400 hover:border-red-500/50 hover:text-red-200 disabled:opacity-40"
          disabled={disconnectMutation.isPending}
          onClick={() => {
            disconnectMutation.mutate();
          }}
          type="button"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Disconnect
        </button>
      </div>
    </header>
  );
}
