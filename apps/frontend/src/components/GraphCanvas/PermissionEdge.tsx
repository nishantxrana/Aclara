import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { memo } from "react";

import { PERMISSION_EDGE_STROKE } from "@/theme/graphColors";
import type { PermissionLevel } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";

export interface IPermissionEdgeData extends Record<string, unknown> {
  level: PermissionLevel;
  permission: string;
}

function strokeForLevel(level: PermissionLevel): string {
  return PERMISSION_EDGE_STROKE[level] ?? PERMISSION_EDGE_STROKE["not-set"] ?? "#64748b";
}

function dashForLevel(level: PermissionLevel): string | undefined {
  if (level === "inherited-allow" || level === "inherited-deny") {
    return "6 4";
  }
  if (level === "not-set") {
    return "4 6";
  }
  return undefined;
}

function PermissionEdgeComponent(props: EdgeProps): JSX.Element {
  const hoveredEdgeId = useVisualizerStore((s) => s.hoveredEdgeId);
  const showLabel = hoveredEdgeId === props.id;

  const raw = props.data as IPermissionEdgeData | undefined;
  const level: PermissionLevel = raw?.level ?? "not-set";
  const permission = raw?.permission ?? "";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  const stroke = strokeForLevel(level);
  const strokeDasharray = dashForLevel(level);

  return (
    <>
      <BaseEdge
        interactionWidth={16}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: level === "not-set" ? 1.25 : 1.75,
          strokeDasharray,
        }}
      />
      {permission.length > 0 && showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan max-w-[160px] truncate rounded border border-surface-light bg-surface/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 shadow-sm pointer-events-none"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(
                labelY
              )}px)`,
            }}
            title={permission}
          >
            {permission}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const PermissionEdge = memo(PermissionEdgeComponent);
