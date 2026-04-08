import { AlertTriangle, GitBranch, Route, Users } from "lucide-react";
import { useMemo } from "react";

import { ApiHttpError, useGraph } from "@/api/insightops.api";
import { Button } from "@/components/ui/Button";
import { useOverPrivilegedNodes } from "@/hooks/useOverPrivilegedNodes";
import { uxEvent } from "@/lib/uxTelemetry";
import { isMembershipEdge } from "@/lib/graphEdgeKind";
import type { AccessGraph } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";

function formatSyncedAt(iso: string | undefined): string {
  if (iso === undefined || iso.length === 0) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function topReposByPermissionEdgeCount(
  graph: AccessGraph,
  limit: number
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of graph.edges) {
    if (isMembershipEdge(e)) {
      continue;
    }
    if (!e.target.startsWith("repo:")) {
      continue;
    }
    counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
  }
  const repoNodeById = new Map(graph.nodes.filter((n) => n.type === "repo").map((n) => [n.id, n]));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({
      label: repoNodeById.get(id)?.primaryLabel ?? repoNodeById.get(id)?.label ?? id,
      count,
    }));
}

const cardBase =
  "flex flex-col gap-2 rounded-panel border border-line-soft bg-panel p-4 text-left shadow-panel transition-colors duration-fast hover:border-brand-primary/35 hover:shadow-panel-md";

/**
 * High-level project snapshot and task launcher before diving into the graph.
 */
export function ProjectOverview(): JSX.Element {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);
  const setExplorerTab = useVisualizerStore((s) => s.setExplorerTab);
  const setGraphViewMode = useVisualizerStore((s) => s.setGraphViewMode);
  const setFilterText = useVisualizerStore((s) => s.setFilterText);
  const toggleOverPrivileged = useVisualizerStore((s) => s.toggleOverPrivileged);
  const showOnlyOverPrivileged = useVisualizerStore((s) => s.showOnlyOverPrivileged);

  const graphQuery = useGraph(selectedProjectName);
  const summary = useOverPrivilegedNodes(graphQuery.data);

  const topRepos = useMemo(
    () => (graphQuery.data !== undefined ? topReposByPermissionEdgeCount(graphQuery.data, 5) : []),
    [graphQuery.data]
  );

  if (selectedProjectName === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-ink-secondary">
        Select a project in the header to see an overview.
      </div>
    );
  }

  if (graphQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="h-6 w-64 animate-pulse rounded bg-panel-muted" />
        <div className="h-24 animate-pulse rounded-panel bg-panel-subtle" />
      </div>
    );
  }

  if (graphQuery.isError) {
    const rid = graphQuery.error instanceof ApiHttpError ? graphQuery.error.requestId : undefined;
    return (
      <div className="p-6 text-sm text-status-danger">
        <p>Could not load project snapshot: {graphQuery.error.message}</p>
        {rid !== undefined ? (
          <p className="mt-2 font-mono text-xs text-ink-tertiary">Request ID: {rid}</p>
        ) : null}
      </div>
    );
  }

  const g = graphQuery.data;
  const repoCount = g.nodes.filter((n) => n.type === "repo").length;
  const userCount = g.nodes.filter((n) => n.type === "user").length;
  const groupCount = g.nodes.filter((n) => n.type === "group").length;

  const launchInvestigation = (task: string, fn: () => void): void => {
    uxEvent("overview.task_launch", { task });
    fn();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 md:p-8">
      <div>
        <h2 className="text-base font-semibold text-ink-primary">Project overview</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Last synced:{" "}
          <span className="text-ink-primary">{formatSyncedAt(g.generatedAt)}</span>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          className={cardBase}
          onClick={() => {
            launchInvestigation("who_has_access", () => {
              setWorkspaceView("investigate");
              setExplorerTab("repos");
              setGraphViewMode("summary");
              setFilterText("");
            });
          }}
          type="button"
        >
          <GitBranch aria-hidden className="h-5 w-5 text-brand-primary" />
          <p className="text-sm font-semibold text-ink-primary">Who has access?</p>
          <p className="text-xs text-ink-secondary">
            Browse repositories and Git permission edges in a summarized graph.
          </p>
        </button>
        <button
          className={cardBase}
          onClick={() => {
            launchInvestigation("why_user_access", () => {
              setWorkspaceView("investigate");
              setExplorerTab("users");
              setGraphViewMode("path");
              setFilterText("");
            });
          }}
          type="button"
        >
          <Route aria-hidden className="h-5 w-5 text-brand-secondary" />
          <p className="text-sm font-semibold text-ink-primary">Why does this user have access?</p>
          <p className="text-xs text-ink-secondary">
            Pick a user and repo, then use Path view and the access trace to see the chain.
          </p>
        </button>
        <button
          className={`${cardBase} hover:border-status-warning/40 hover:bg-status-warning/10`}
          onClick={() => {
            launchInvestigation("risk_posture", () => {
              setWorkspaceView("investigate");
              setExplorerTab("risks");
              setGraphViewMode("summary");
              setFilterText("");
              if (!showOnlyOverPrivileged) {
                toggleOverPrivileged();
              }
            });
          }}
          type="button"
        >
          <AlertTriangle aria-hidden className="h-5 w-5 text-status-warning" />
          <p className="text-sm font-semibold text-ink-primary">What is risky right now?</p>
          <p className="text-xs text-ink-secondary">
            Jump to elevated identities and tighten the graph to over-privileged nodes only.
          </p>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-panel border border-line-soft bg-panel p-4 shadow-panel">
          <p className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
            Repositories
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink-primary">{String(repoCount)}</p>
        </div>
        <div className="rounded-panel border border-line-soft bg-panel p-4 shadow-panel">
          <p className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">Users</p>
          <p className="mt-2 text-2xl font-semibold text-ink-primary">{String(userCount)}</p>
        </div>
        <div className="rounded-panel border border-line-soft bg-panel p-4 shadow-panel">
          <p className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">Groups</p>
          <p className="mt-2 text-2xl font-semibold text-ink-primary">{String(groupCount)}</p>
        </div>
      </div>

      {topRepos.length > 0 ? (
        <div className="rounded-panel border border-line-soft bg-panel-muted/60 p-4">
          <p className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
            Top repositories by grant edges
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-primary">
            {topRepos.map((r) => (
              <li className="flex justify-between gap-2" key={r.label}>
                <span className="truncate" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-tertiary">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-panel border border-status-warning/30 bg-status-warning-soft p-4">
        <p className="text-sm font-medium text-ink-on-warning-soft">Risk posture</p>
        <p className="mt-1 text-sm text-ink-on-warning-soft/90">
          {summary.hasAny
            ? summary.summaryLine
            : "No identities flagged for sensitive Git permission bits in this snapshot."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            launchInvestigation("open_workspace", () => {
              setWorkspaceView("investigate");
              setGraphViewMode("summary");
            });
          }}
          type="button"
        >
          <Users aria-hidden className="h-4 w-4" />
          Open investigation workspace
        </Button>
        <p className="text-xs text-ink-tertiary">
          Explore the graph, filter access, and run user ↔ repository traces.
        </p>
      </div>
    </div>
  );
}
