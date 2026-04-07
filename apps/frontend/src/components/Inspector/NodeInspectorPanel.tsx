import { X } from "lucide-react";
import { useMemo } from "react";

import { useGraph } from "@/api/insightops.api";
import { useVisualizerStore } from "@/stores/visualizer.store";

function MetaList(props: { title: string; entries: string[] }): JSX.Element | null {
  if (props.entries.length === 0) {
    return null;
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {props.title}
      </p>
      <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-slate-300">
        {props.entries.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Contextual inspector for a selected graph node (especially groups).
 */
export function NodeInspectorPanel(): JSX.Element | null {
  const selectedProjectName = useVisualizerStore((s) => s.selectedProjectName);
  const inspectorNodeId = useVisualizerStore((s) => s.inspectorNodeId);
  const inspectorNodeType = useVisualizerStore((s) => s.inspectorNodeType);
  const setInspector = useVisualizerStore((s) => s.setInspector);
  const graphQuery = useGraph(selectedProjectName);

  const node = useMemo(() => {
    if (graphQuery.data === undefined || inspectorNodeId === null) {
      return undefined;
    }
    return graphQuery.data.nodes.find((n) => n.id === inspectorNodeId);
  }, [graphQuery.data, inspectorNodeId]);

  if (inspectorNodeId === null || inspectorNodeType === null || node === undefined) {
    return null;
  }

  const meta = node.metadata as Record<string, unknown>;
  const explicitAllow = Array.isArray(meta["explicitAllowNames"])
    ? meta["explicitAllowNames"].filter((x): x is string => typeof x === "string")
    : [];
  const explicitDeny = Array.isArray(meta["explicitDenyNames"])
    ? meta["explicitDenyNames"].filter((x): x is string => typeof x === "string")
    : [];
  const legacy =
    typeof meta["legacyDescriptor"] === "string" ? meta["legacyDescriptor"] : undefined;

  return (
    <aside
      aria-label="Node inspector"
      className="flex w-56 shrink-0 flex-col border-l border-surface-light bg-surface-light/30"
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-light px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-slate-500">{inspectorNodeType}</p>
          <p className="truncate text-sm font-medium text-slate-100" title={node.label}>
            {node.label}
          </p>
        </div>
        <button
          aria-label="Close inspector"
          className="shrink-0 rounded p-1 text-slate-500 hover:bg-surface-light hover:text-slate-200"
          onClick={() => {
            setInspector(null, null);
          }}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs">
        {node.isOverPrivileged === true ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-100">
            Flagged for elevated / sensitive Git permissions.
          </p>
        ) : null}
        {legacy !== undefined ? (
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-500">ACL descriptor</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-400">{legacy}</p>
          </div>
        ) : null}
        <MetaList entries={explicitAllow} title="Explicit allow (decoded)" />
        <MetaList entries={explicitDeny} title="Explicit deny (decoded)" />
        <p className="text-[10px] text-slate-600">
          Select a user and repository to run a full access trace in the right panel.
        </p>
      </div>
    </aside>
  );
}
