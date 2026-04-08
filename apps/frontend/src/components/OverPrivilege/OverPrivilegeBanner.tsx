import { ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { useCallback, useState } from "react";

import { useGraph } from "@/api/aclara.api";
import type { IFlaggedEntity } from "@/hooks/useOverPrivilegedNodes";
import { useOverPrivilegedNodes } from "@/hooks/useOverPrivilegedNodes";
import { useVisualizerStore } from "@/stores/visualizer.store";

function EntityRow(props: { entity: IFlaggedEntity }): JSX.Element {
  const typeLabel = props.entity.type === "user" ? "User" : "Group";
  return (
    <li className="rounded-input border border-line-default bg-panel px-2 py-1.5 text-xs shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink-primary">{props.entity.label}</span>
        <span className="shrink-0 text-label uppercase tracking-wide text-ink-tertiary">
          {typeLabel}
        </span>
      </div>
      <p
        className="mt-0.5 text-ink-secondary"
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
      className="border-b border-status-warning/25 bg-status-warning-soft px-4 py-2"
      role="region"
      aria-label="Over-privileged summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0 text-status-warning" aria-hidden />
        {loading ? (
          <p className="text-xs text-ink-on-warning-soft/90">Loading graph for over-privilege summary…</p>
        ) : null}
        {graphError ? (
          <p className="text-xs text-status-danger">Could not load graph: {graphQuery.error.message}</p>
        ) : null}
        {!loading && !graphError && summary.hasAny ? (
          <>
            <p className="min-w-0 flex-1 text-xs text-ink-on-warning-soft">{summary.summaryLine}</p>
            {summary.devMockActive ? (
              <span className="rounded-md bg-status-warning/25 px-1.5 py-0.5 text-label font-medium uppercase tracking-wide text-ink-on-warning-soft">
                Dev mock
              </span>
            ) : null}
            <button
              aria-expanded={expanded}
              className="flex shrink-0 items-center gap-1 rounded-input border border-status-warning/40 px-2 py-1 text-label font-medium text-ink-on-warning-soft hover:bg-status-warning/20"
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
          <p className="text-xs text-ink-on-warning-soft/90">
            Over-privileged filter is on, but no identities in this project are flagged with
            sensitive Git permission bits.
          </p>
        ) : null}
        {!loading && !graphError && showOnlyOverPrivileged && summary.hasAny ? (
          <span className="text-label uppercase tracking-wide text-ink-on-warning-soft/80">
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
