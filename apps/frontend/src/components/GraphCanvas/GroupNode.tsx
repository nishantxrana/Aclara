import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { ICanvasNodeData } from "./graphPresentation";
import { graphNodeOpacityClass } from "./graphNodeVisual";

function borderClassForNode(data: ICanvasNodeData): string {
  if (data.selected) {
    return "ring-2 ring-primary ring-offset-2 ring-offset-surface";
  }
  if (data.inspectorActive === true) {
    return "ring-2 ring-sky-500/80 ring-offset-2 ring-offset-surface";
  }
  if (data.pathHighlight === true) {
    return "ring-2 ring-sky-400/70 ring-offset-1 ring-offset-surface";
  }
  return "border border-surface-light";
}

function GroupNodeComponent(props: NodeProps): JSX.Element {
  const data = props.data as unknown as ICanvasNodeData;
  const borderClass = borderClassForNode(data);
  const privilegeClass = data.isOverPrivileged
    ? "shadow-[0_0_0_1px_theme(colors.amber.500)]"
    : "";
  const opacityClass = graphNodeOpacityClass(data);

  return (
    <div
      className={`rounded-lg border-l-4 border-l-node-group bg-surface-light/90 pl-2 pr-3 py-2 text-left transition-opacity ${borderClass} ${privilegeClass} ${opacityClass}`}
      title={data.title}
    >
      <Handle
        className="!h-2 !w-2 !border-0 !bg-node-group"
        position={Position.Left}
        type="target"
      />
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm bg-node-group" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Group
          </p>
          <p className="truncate text-sm font-medium text-slate-100">{data.primaryLabel}</p>
          {data.secondaryLabel !== undefined && data.secondaryLabel.length > 0 ? (
            <p className="truncate text-xs text-slate-500" title={data.secondaryLabel}>
              {data.secondaryLabel}
            </p>
          ) : null}
        </div>
      </div>
      {data.isOverPrivileged ? (
        <p className="mt-1 text-[10px] font-medium uppercase text-amber-400">Elevated</p>
      ) : null}
      <Handle
        className="!h-2 !w-2 !border-0 !bg-node-group"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}

export const GroupNode = memo(GroupNodeComponent);
