import { ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { useCallback, useState } from "react";

import { useGraph } from "@/api/insightops.api";
import type { IFlaggedEntity } from "@/hooks/useOverPrivilegedNodes";
import { useOverPrivilegedNodes } from "@/hooks/useOverPrivilegedNodes";
import { useVisualizerStore } from "@/stores/visualizer.store";

function EntityRow(props: { entity: IFlaggedEntity }): JSX.Element {
  const typeLabel = props.entity.type === "user" ? "User" : "Group";
  return (
    <li className="rounded border border-surface-light/80 bg-surface/60 px-2 py-1.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-200">{props.entity.label}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
          {typeLabel}
        </span>
      </div>
      <p
        className="mt-0.5 text-slate-400"
        title={props.entity.elevatedSummary}
      >
        {props.entity.elevatedSummary}
      </p>
    </li>
  );
}

export function OverPrivilegeBanner(): JSX.Element | null {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const showOnlyOverPrivileged = useVisualizerStore((s) => s.showOnlyOverPrivileged);
  const graphQuery = useGraph(selectedProjectName);
  const summary = useOverPrivilegedNodes(graphQuery.data);

  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const filterOnlyEmpty =
    showOnlyOverPrivileged &&
    graphQuery.isSuccess &&
    !summary.hasAny &&
    !summary.devMockActive;

  const showBanner = showOnlyOverPrivileged || summary.hasAny;

  if (!showBanner) {
    return null;
  }

  const loading = showOnlyOverPrivileged && graphQuery.isPending;
  const graphError = graphQuery.isError;

  return (
    <div
      className="border-b border-amber-500/25 bg-amber-500/5 px-4 py-2"
      role="region"
      aria-label="Over-privileged summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        {loading ? (
          <p className="text-xs text-amber-100/90">Loading graph for over-privilege summary…</p>
        ) : null}
        {graphError ? (
          <p className="text-xs text-red-300/90">Could not load graph: {graphQuery.error.message}</p>
        ) : null}
        {!loading && !graphError && summary.hasAny ? (
          <>
            <p className="min-w-0 flex-1 text-xs text-amber-100/95">{summary.summaryLine}</p>
            {summary.devMockActive ? (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                Dev mock
              </span>
            ) : null}
            <button
              aria-expanded={expanded}
              className="flex shrink-0 items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/10"
              onClick={toggleExpanded}
              type="button"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
              {expanded ? "Hide list" : "Show list"}
            </button>
          </>
        ) : null}
        {!loading && !graphError && filterOnlyEmpty ? (
          <p className="text-xs text-amber-100/90">
            Over-privileged filter is on, but no identities in this project are flagged with
            sensitive Git permission bits.
          </p>
        ) : null}
        {!loading && !graphError && showOnlyOverPrivileged && summary.hasAny ? (
          <span className="text-[10px] uppercase tracking-wide text-amber-200/70">
            Filter active
          </span>
        ) : null}
      </div>

      {expanded && summary.hasAny ? (
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {[...summary.users, ...summary.groups].map((e) => (
            <EntityRow entity={e} key={e.id} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
