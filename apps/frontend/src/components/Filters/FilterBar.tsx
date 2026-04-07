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

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-surface-light bg-surface-light/30 px-4 py-2">
      <div className="flex min-w-[200px] max-w-md flex-1 flex-col gap-1 rounded-md border border-surface-light bg-surface px-2 py-1.5">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <label className="sr-only" htmlFor="graph-filter">
            Filter graph nodes
          </label>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
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
          <p className="pl-6 text-[11px] text-slate-500">
            <span className="text-slate-400">{String(filterStats.matchCount)}</span> matches ·{" "}
            <span className="text-slate-400">{String(filterStats.visibleCount)}</span> visible nodes
          </p>
        ) : null}
      </div>

      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Text filter mode"
      >
        {(
          [
            { id: "highlight" as const, label: "Highlight" },
            { id: "contextual" as const, label: "+ context" },
            { id: "hide" as const, label: "Hide rest" },
          ] as const
        ).map((opt) => (
          <button
            aria-pressed={graphTextFilterMode === opt.id}
            className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
              graphTextFilterMode === opt.id
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-surface-light text-slate-500 hover:text-slate-200"
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

      <div className="flex items-center gap-1 rounded-md border border-surface-light p-0.5">
        <button
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "summary"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
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
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "path"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
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
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${
            graphViewMode === "advanced"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
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
        className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${
          showOnlyOverPrivileged
            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
            : "border-surface-light text-slate-400 hover:text-slate-200"
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
