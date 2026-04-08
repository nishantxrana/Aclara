import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { ICanvasNodeData } from "./graphPresentation";
import { graphNodeBorderClass, graphNodeElevatedClass } from "./graphNodeBorder";
import { graphNodeOpacityClass } from "./graphNodeVisual";

function GroupNodeComponent(props: NodeProps): JSX.Element {
  const data = props.data as unknown as ICanvasNodeData;
  const borderClass = graphNodeBorderClass(data);
  const privilegeClass = graphNodeElevatedClass(data.isOverPrivileged === true);
  const opacityClass = graphNodeOpacityClass(data);

  return (
    <div
      className={`rounded-lg border-l-4 border-l-node-group bg-panel pl-2 pr-3 py-2 text-left shadow-panel transition-opacity ${borderClass} ${privilegeClass} ${opacityClass}`}
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
          <p className="truncate text-label font-semibold uppercase tracking-wide text-node-group">
            Group
          </p>
          <p className="truncate text-sm font-medium text-ink-primary">{data.primaryLabel}</p>
          {data.secondaryLabel !== undefined && data.secondaryLabel.length > 0 ? (
            <p className="truncate text-xs text-ink-tertiary" title={data.secondaryLabel}>
              {data.secondaryLabel}
            </p>
          ) : null}
        </div>
      </div>
      {data.isOverPrivileged ? (
        <p className="mt-1 text-label font-medium uppercase text-status-warning">Elevated</p>
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
