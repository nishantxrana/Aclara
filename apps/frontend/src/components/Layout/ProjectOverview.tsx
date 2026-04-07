import { ApiHttpError, useGraph } from "@/api/insightops.api";
import { useOverPrivilegedNodes } from "@/hooks/useOverPrivilegedNodes";
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

/**
 * High-level project snapshot before diving into the graph.
 */
export function ProjectOverview(): JSX.Element {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const setWorkspaceView = useVisualizerStore((s) => s.setWorkspaceView);
  const graphQuery = useGraph(selectedProjectName);
  const summary = useOverPrivilegedNodes(graphQuery.data);

  if (selectedProjectName === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Select a project in the header to see an overview.
      </div>
    );
  }

  if (graphQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="h-6 w-64 animate-pulse rounded bg-surface-light" />
        <div className="h-24 animate-pulse rounded-lg bg-surface-light/60" />
      </div>
    );
  }

  if (graphQuery.isError) {
    const rid = graphQuery.error instanceof ApiHttpError ? graphQuery.error.requestId : undefined;
    return (
      <div className="p-6 text-sm text-red-400">
        <p>Could not load project snapshot: {graphQuery.error.message}</p>
        {rid !== undefined ? (
          <p className="mt-2 font-mono text-xs text-slate-500">Request ID: {rid}</p>
        ) : null}
      </div>
    );
  }

  const g = graphQuery.data;
  const repoCount = g.nodes.filter((n) => n.type === "repo").length;
  const userCount = g.nodes.filter((n) => n.type === "user").length;
  const groupCount = g.nodes.filter((n) => n.type === "group").length;

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">Project overview</h2>
        <p className="mt-1 text-sm text-slate-500">
          Last synced:{" "}
          <span className="text-slate-300">{formatSyncedAt(g.generatedAt)}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-surface-light bg-surface-light/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Repositories
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{String(repoCount)}</p>
        </div>
        <div className="rounded-lg border border-surface-light bg-surface-light/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{String(userCount)}</p>
        </div>
        <div className="rounded-lg border border-surface-light bg-surface-light/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Groups</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{String(groupCount)}</p>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm font-medium text-amber-100">Risk posture</p>
        <p className="mt-1 text-sm text-amber-100/85">
          {summary.hasAny
            ? summary.summaryLine
            : "No identities flagged for sensitive Git permission bits in this snapshot."}
        </p>
      </div>
      <div>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          onClick={() => {
            setWorkspaceView("investigate");
          }}
          type="button"
        >
          Open investigation workspace
        </button>
        <p className="mt-2 text-xs text-slate-500">
          Explore the graph, filter access, and run user ↔ repository traces.
        </p>
      </div>
    </div>
  );
}
