import { Expand, GitBranch, ListTree, ScanSearch, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useGraph, useTrace } from "@/api/insightops.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { applyGraphTextAndRiskFilter } from "@/lib/graphTextFilter";
import { filterGraphForViewMode } from "@/lib/graphViewFilter";
import { uxEvent } from "@/lib/uxTelemetry";
import { useVisualizerStore } from "@/stores/visualizer.store";

export function FilterBar(): JSX.Element {
  const {
    filterText,
    setFilterText,
    showOnlyOverPrivileged,
    toggleOverPrivileged,
    graphViewMode,
    setGraphViewMode,
    graphTextFilterMode,
    setGraphTextFilterMode,
    selectedProjectName,
    selectedUserId,
    selectedRepoId,
  } = useVisualizerStore(
    useShallow((s) => ({
      filterText: s.filterText,
      setFilterText: s.setFilterText,
      showOnlyOverPrivileged: s.showOnlyOverPrivileged,
      toggleOverPrivileged: s.toggleOverPrivileged,
      graphViewMode: s.graphViewMode,
      setGraphViewMode: s.setGraphViewMode,
      graphTextFilterMode: s.graphTextFilterMode,
      setGraphTextFilterMode: s.setGraphTextFilterMode,
      selectedProjectName: s.selectedProjectName,
      selectedUserId: s.selectedUserId,
      selectedRepoId: s.selectedRepoId,
    }))
  );

  const debouncedFilter = useDebouncedValue(filterText, 300);
  const filterLower = useMemo(
    () => debouncedFilter.trim().toLowerCase(),
    [debouncedFilter]
  );

  const graphQuery = useGraph(selectedProjectName);
  const traceQuery = useTrace(selectedProjectName, selectedUserId, selectedRepoId);

  const filterStats = useMemo(() => {
    if (graphQuery.data === undefined) {
      return null;
    }
    const viewGraph = filterGraphForViewMode(graphQuery.data, graphViewMode, {
      selectedUserId,
      selectedRepoId,
      trace: traceQuery.data,
    });
    const { nodes, matchIds } = applyGraphTextAndRiskFilter(
      viewGraph,
      filterLower,
      graphTextFilterMode,
      showOnlyOverPrivileged
    );
    return {
      visibleCount: nodes.length,
      matchCount: filterLower.length > 0 ? matchIds.size : nodes.length,
    };
  }, [
    filterLower,
    graphQuery.data,
    graphTextFilterMode,
    graphViewMode,
    selectedRepoId,
    selectedUserId,
    showOnlyOverPrivileged,
    traceQuery.data,
  ]);

  const chipActive = "border-brand-primary/45 bg-brand-primary/10 text-brand-primary";
  const chipIdle = "border-line-default text-ink-tertiary hover:bg-panel-muted hover:text-ink-primary";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line-soft bg-panel-subtle/90 px-4 py-2">
      <div className="flex min-w-[200px] max-w-md flex-1 flex-col gap-1 rounded-input border border-line-default bg-panel px-2 py-1.5 shadow-panel">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 shrink-0 text-ink-tertiary" aria-hidden />
          <label className="sr-only" htmlFor="graph-filter">
            Filter graph nodes
          </label>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            id="graph-filter"
            onChange={(e) => {
              setFilterText(e.target.value);
            }}
            placeholder="Filter by label or id…"
            type="search"
            value={filterText}
          />
        </div>
        {filterStats !== null && filterLower.length > 0 ? (
          <p className="pl-6 text-label text-ink-tertiary">
            <span className="text-ink-secondary">{String(filterStats.matchCount)}</span> matches ·{" "}
            <span className="text-ink-secondary">{String(filterStats.visibleCount)}</span> visible nodes
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Text filter mode">
        {(
          [
            { id: "highlight" as const, label: "Highlight" },
            { id: "contextual" as const, label: "+ context" },
            { id: "hide" as const, label: "Hide rest" },
          ] as const
        ).map((opt) => (
          <button
            aria-pressed={graphTextFilterMode === opt.id}
            className={`rounded-input border px-2 py-1 text-label font-medium ${
              graphTextFilterMode === opt.id ? chipActive : chipIdle
            }`}
            key={opt.id}
            onClick={() => {
              setGraphTextFilterMode(opt.id);
              uxEvent("graph.text_filter_mode", { mode: opt.id });
            }}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-input border border-line-default bg-panel-muted/50 p-0.5">
        <button
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "summary"
              ? "bg-brand-primary/12 text-brand-primary"
              : "text-ink-tertiary hover:bg-panel hover:text-ink-primary"
          }`}
          onClick={() => {
            setGraphViewMode("summary");
            uxEvent("graph.view_mode", { mode: "summary" });
          }}
          title="Permission landscape without pure membership edges"
          type="button"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
          Summary
        </button>
        <button
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "path"
              ? "bg-brand-primary/12 text-brand-primary"
              : "text-ink-tertiary hover:bg-panel hover:text-ink-primary"
          }`}
          onClick={() => {
            setGraphViewMode("path");
            uxEvent("graph.view_mode", { mode: "path" });
          }}
          title="Selected user, repository, and trace path when available"
          type="button"
        >
          <ScanSearch className="h-3.5 w-3.5" aria-hidden />
          Path
        </button>
        <button
          className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "advanced"
              ? "bg-brand-primary/12 text-brand-primary"
              : "text-ink-tertiary hover:bg-panel hover:text-ink-primary"
          }`}
          onClick={() => {
            setGraphViewMode("advanced");
            uxEvent("graph.view_mode", { mode: "advanced" });
          }}
          title="Full graph including membership edges"
          type="button"
        >
          <Expand className="h-3.5 w-3.5" aria-hidden />
          Advanced
        </button>
      </div>

      <button
        className={`flex items-center gap-2 rounded-input border px-3 py-1.5 text-xs font-medium ${
          showOnlyOverPrivileged
            ? "border-status-warning/50 bg-status-warning-soft text-ink-on-warning-soft"
            : "border-line-default text-ink-tertiary hover:bg-panel-muted hover:text-ink-primary"
        }`}
        onClick={() => {
          toggleOverPrivileged();
          uxEvent("graph.over_privileged_toggle", { on: !showOnlyOverPrivileged });
        }}
        type="button"
      >
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
        Over-privileged only
      </button>
    </div>
  );
}
