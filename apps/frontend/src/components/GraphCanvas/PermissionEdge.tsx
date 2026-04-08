import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { memo } from "react";

import {
  ELEVATED_PERMISSION_EDGE_STROKE,
  PERMISSION_EDGE_STROKE,
} from "@/theme/graphColors";
import type { PermissionLevel } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";

import type { ICanvasEdgeData } from "./graphPresentation";

function strokeForPermissionEdge(
  level: PermissionLevel,
  isElevated: boolean
): string {
  if (isElevated && level !== "deny" && level !== "inherited-deny") {
    return ELEVATED_PERMISSION_EDGE_STROKE;
  }
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
  const selectedRepoId = useVisualizerStore((s) => s.selectedRepoId);
  const selectedUserId = useVisualizerStore((s) => s.selectedUserId);

  const raw = props.data as ICanvasEdgeData | undefined;
  const level: PermissionLevel = raw?.level ?? "not-set";
  const presentationLabel = raw?.presentationLabel ?? raw?.permission ?? "";
  const pathHighlighted = raw?.pathHighlighted === true;
  const traceFocusActive = raw?.traceFocusActive === true;
  const isElevated = raw?.isElevated === true;

  const repoNodeId =
    selectedRepoId !== null ? `repo:${selectedRepoId}` : null;
  const touchesSelectedRepo =
    repoNodeId !== null &&
    (props.target === repoNodeId || props.source === repoNodeId);
  const hasUserRepoPair =
    selectedRepoId !== null && selectedUserId !== null && touchesSelectedRepo;

  const showLabel =
    hoveredEdgeId === props.id ||
    (traceFocusActive && pathHighlighted) ||
    hasUserRepoPair;

  const dimForTrace = traceFocusActive && !pathHighlighted;
  const edgeOpacity = dimForTrace ? 0.22 : 1;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  const stroke = strokeForPermissionEdge(level, isElevated);
  const strokeDasharray = dashForLevel(level);
  const strokeWidth =
    pathHighlighted && traceFocusActive ? 2.75 : level === "not-set" ? 1.25 : 1.85;

  return (
    <>
      <BaseEdge
        interactionWidth={16}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity: edgeOpacity,
        }}
      />
      {presentationLabel.length > 0 && showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan max-w-[200px] truncate rounded border border-surface-light bg-surface/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 shadow-sm pointer-events-none"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(
                labelY
              )}px)`,
            }}
            title={presentationLabel}
          >
            {presentationLabel}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const PermissionEdge = memo(PermissionEdgeComponent);
