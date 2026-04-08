import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { memo } from "react";

import { MEMBERSHIP_EDGE_STROKE } from "@/theme/graphColors";
import { useVisualizerStore } from "@/stores/visualizer.store";

import type { ICanvasEdgeData } from "./graphPresentation";

function MembershipEdgeComponent(props: EdgeProps): JSX.Element {
  const hoveredEdgeId = useVisualizerStore((s) => s.hoveredEdgeId);
  const raw = props.data as ICanvasEdgeData | undefined;
  const pathHighlighted = raw?.pathHighlighted === true;
  const traceFocusActive = raw?.traceFocusActive === true;
  const presentationLabel = raw?.presentationLabel ?? "Member of";

  const showLabel =
    hoveredEdgeId === props.id || (traceFocusActive && pathHighlighted);

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

  return (
    <>
      <BaseEdge
        interactionWidth={16}
        path={edgePath}
        style={{
          stroke: MEMBERSHIP_EDGE_STROKE,
          strokeWidth: pathHighlighted && traceFocusActive ? 2.25 : 1.5,
          strokeDasharray: "6 4",
          opacity: edgeOpacity,
        }}
      />
      {showLabel ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan max-w-[140px] truncate rounded border border-line-default bg-panel px-1.5 py-0.5 text-label font-medium text-ink-tertiary shadow-panel pointer-events-none"
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

export const MembershipEdge = memo(MembershipEdgeComponent);
