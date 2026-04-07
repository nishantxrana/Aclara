import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { QUERY_KEYS, useGraph, useProjects } from "@/api/insightops.api";
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
  const queryClient = useQueryClient();
  const projectsQuery = useProjects();
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const setSelectedProject = useVisualizerStore((s) => s.setSelectedProject);
  const setSelectedUser = useVisualizerStore((s) => s.setSelectedUser);
  const setSelectedRepo = useVisualizerStore((s) => s.setSelectedRepo);

  const graphQuery = useGraph(selectedProjectName);

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

  const onRefresh = (): void => {
    if (selectedProjectName === null) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.graph(selectedProjectName) });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users(selectedProjectName) });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.repos(selectedProjectName) });
  };

  const nodeCount =
    graphQuery.data !== undefined ? graphQuery.data.nodes.length : null;

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-surface-light bg-surface-light/40 px-4 py-3">
      <span className="text-lg font-semibold tracking-tight text-primary">
        InsightOps
      </span>

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
                {formatSyncedAt(graphQuery.data?.generatedAt)}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <button
        className="flex shrink-0 items-center gap-2 rounded-md border border-surface-light px-3 py-2 text-xs font-medium text-slate-300 hover:border-primary/50 hover:text-slate-100 disabled:opacity-40"
        disabled={selectedProjectName === null}
        onClick={onRefresh}
        type="button"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Refresh
      </button>
    </header>
  );
}
