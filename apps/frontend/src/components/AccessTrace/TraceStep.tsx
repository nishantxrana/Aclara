import { memo } from "react";

import type { TraceStep as ApiTraceStep } from "@/types/graph.types";

import {
  permissionLevelDescription,
  timelineDotClassForLevel,
} from "./permissionLevelPresentation";

export interface ITraceStepProps {
  step: ApiTraceStep;
  isLast: boolean;
  stepIndex: number;
  isHighlighted: boolean;
  onActivate: (index: number) => void;
  onPointerEnter: (index: number) => void;
  onPointerLeave: () => void;
}

export const TraceStep = memo(function TraceStep({
  step,
  isLast,
  stepIndex,
  isHighlighted,
  onActivate,
  onPointerEnter,
  onPointerLeave,
}: ITraceStepProps): JSX.Element {
  const dotTitle = permissionLevelDescription(step.level);
  const showViaGroup =
    step.viaGroup !== undefined &&
    step.viaGroup.length > 0 &&
    step.viaGroup !== step.subjectLabel;
  const viaLine = showViaGroup ? `Via group: ${step.viaGroup}` : null;

  let rowClass =
    "relative flex w-full gap-3 rounded-md pb-6 pl-0 pr-1 text-left transition-colors last:pb-0 ";
  rowClass += isHighlighted
    ? "bg-brand-primary/10 ring-1 ring-brand-primary/35"
    : "hover:bg-panel-muted";

  return (
    <button
      className={rowClass}
      onClick={() => {
        onActivate(stepIndex);
      }}
      onPointerEnter={() => {
        onPointerEnter(stepIndex);
      }}
      onPointerLeave={() => {
        onPointerLeave();
      }}
      type="button"
    >
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span
          aria-hidden
          className={`z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${timelineDotClassForLevel(step.level)}`}
          title={dotTitle}
        />
        {!isLast ? (
          <span
            aria-hidden
            className="mt-0.5 w-px flex-1 min-h-[1.5rem] bg-line-default"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1 py-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-ink-primary">
            {step.subjectLabel}
          </span>
          <span className="text-label uppercase tracking-wide text-ink-tertiary">
            {step.subjectType}
          </span>
        </div>
        {viaLine !== null ? (
          <p className="text-xs text-ink-secondary">{viaLine}</p>
        ) : null}
        <p className="text-xs text-ink-secondary">
          <span className="font-medium text-ink-primary">{step.presentationPermission}</span>
          <span className="mx-1.5 text-line-strong">·</span>
          <span className="text-ink-tertiary">{step.reason}</span>
        </p>
      </div>
    </button>
  );
});
