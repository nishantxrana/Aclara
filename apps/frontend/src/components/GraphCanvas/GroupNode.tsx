import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";

export interface IGroupNodeData {
  label: string;
  isOverPrivileged: boolean;
  selected: boolean;
  dimmed: boolean;
  inspectorActive?: boolean;
  pathHighlight?: boolean;
}

function borderClassForNode(data: IGroupNodeData): string {
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
  const data = props.data as unknown as IGroupNodeData;
  const borderClass = borderClassForNode(data);
  const privilegeClass = data.isOverPrivileged
    ? "shadow-[0_0_0_1px_theme(colors.amber.500)]"
    : "";
  const dimClass = data.dimmed ? "opacity-40" : "";

  return (
    <div
      className={`rounded-lg bg-surface-light px-3 py-2 text-left transition-opacity ${borderClass} ${privilegeClass} ${dimClass}`}
    >
      <Handle
        className="!h-2 !w-2 !border-0 !bg-node-group"
        position={Position.Left}
        type="target"
      />
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-sm bg-node-group"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
            Group
          </p>
          <p className="truncate text-sm text-slate-100">{data.label}</p>
        </div>
      </div>
      {data.isOverPrivileged ? (
        <p className="mt-1 text-[10px] font-medium uppercase text-amber-400">
          Elevated
        </p>
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
