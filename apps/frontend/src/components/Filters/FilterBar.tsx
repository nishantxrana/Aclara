import { GitBranch, LayoutGrid, ListTree, ShieldAlert } from "lucide-react";

import { useVisualizerStore } from "@/stores/visualizer.store";

export function FilterBar(): JSX.Element {
  const filterText = useVisualizerStore((s) => s.filterText);
  const setFilterText = useVisualizerStore((s) => s.setFilterText);
  const showOnlyOverPrivileged = useVisualizerStore((s) => s.showOnlyOverPrivileged);
  const toggleOverPrivileged = useVisualizerStore((s) => s.toggleOverPrivileged);
  const layoutMode = useVisualizerStore((s) => s.layoutMode);
  const setLayoutMode = useVisualizerStore((s) => s.setLayoutMode);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-surface-light bg-surface-light/30 px-4 py-2">
      <div className="flex min-w-[200px] max-w-md flex-1 items-center gap-2 rounded-md border border-surface-light bg-surface px-2 py-1.5">
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

      <div className="flex items-center gap-1 rounded-md border border-surface-light p-0.5">
        <button
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${
            layoutMode === "hierarchical"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setLayoutMode("hierarchical");
          }}
          type="button"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
          Hierarchical
        </button>
        <button
          className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium ${
            layoutMode === "force"
              ? "bg-primary/20 text-primary"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => {
            setLayoutMode("force");
          }}
          type="button"
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          Grid
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
        }}
        type="button"
      >
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
        Over-privileged only
      </button>
    </div>
  );
}
