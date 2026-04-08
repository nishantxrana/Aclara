import { CheckCircle2, Circle, GripVertical, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
  ApiHttpError,
  useRepos,
  useTrace,
  useUsers,
  type RepoSummary,
  type UserSummary,
} from "@/api/aclara.api";
import type { AccessTrace } from "@/types/graph.types";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { uxEvent } from "@/lib/uxTelemetry";

import { layout } from "@/theme/designTokens";

import { PermissionChip } from "./PermissionChip";
import { TraceStep } from "./TraceStep";

function TracePanelSkeleton(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4" aria-busy="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-panel-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-panel-subtle" />
      <div className="mt-4 space-y-3">
        <div className="h-16 animate-pulse rounded-lg bg-panel-subtle" />
        <div className="h-16 animate-pulse rounded-lg bg-panel-subtle" />
        <div className="h-16 animate-pulse rounded-lg bg-panel-subtle" />
      </div>
    </div>
  );
}

function PlaceholderState(props: { message: string; detail?: string }): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-sm text-ink-secondary">{props.message}</p>
      {props.detail !== undefined ? (
        <p className="text-xs text-ink-tertiary">{props.detail}</p>
      ) : null}
    </div>
  );
}

function GuidedChecklist(props: {
  readonly projectSelected: boolean;
  readonly hasUser: boolean;
  readonly hasRepo: boolean;
}): JSX.Element {
  if (!props.projectSelected) {
    return (
      <PlaceholderState
        detail="Choose a project in the header to enable tracing."
        message="No project selected"
      />
    );
  }

  const steps: { done: boolean; label: string }[] = [
    { done: true, label: "Project selected" },
    { done: props.hasUser, label: "Select a user" },
    { done: props.hasRepo, label: "Select a repository" },
  ];

  let headline = "Start an access trace";
  let sub =
    "Pick a user and a repository from the explorer or graph. Order does not matter.";

  if (props.hasUser && !props.hasRepo) {
    headline = "User selected";
    sub = "Next, choose a repository to explain this user’s effective Git access.";
  } else if (props.hasRepo && !props.hasUser) {
    headline = "Repository selected";
    sub = "Next, choose a user to see why they do or do not have access.";
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <p className="text-sm font-medium text-ink-primary">{headline}</p>
        <p className="mt-1 text-xs text-ink-secondary">{sub}</p>
      </div>
      <ol className="space-y-2" role="list">
        {steps.map((s) => (
          <li className="flex items-start gap-2 text-xs text-ink-tertiary" key={s.label}>
            {s.done ? (
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
            ) : (
              <Circle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" />
            )}
            <span className={s.done ? "text-ink-primary" : ""}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AccessTracePanel(): JSX.Element {
  const {
    selectedProjectName,
    selectedUserId,
    selectedRepoId,
    clearSelection,
    tracePanelWidthPx,
    setTracePanelWidthPx,
    highlightedTraceStepIndex,
    traceStepHoverIndex,
    setHighlightedTraceStepIndex,
    setTraceStepHoverIndex,
  } = useVisualizerStore(
    useShallow((s) => ({
      selectedProjectName: s.selectedProjectName,
      selectedUserId: s.selectedUserId,
      selectedRepoId: s.selectedRepoId,
      clearSelection: s.clearSelection,
      tracePanelWidthPx: s.tracePanelWidthPx,
      setTracePanelWidthPx: s.setTracePanelWidthPx,
      highlightedTraceStepIndex: s.highlightedTraceStepIndex,
      traceStepHoverIndex: s.traceStepHoverIndex,
      setHighlightedTraceStepIndex: s.setHighlightedTraceStepIndex,
      setTraceStepHoverIndex: s.setTraceStepHoverIndex,
    }))
  );

  const effectiveTraceStepIndex = traceStepHoverIndex ?? highlightedTraceStepIndex;

  const usersQuery = useUsers(selectedProjectName);
  const reposQuery = useRepos(selectedProjectName);
  const traceQuery = useTrace(selectedProjectName, selectedUserId, selectedRepoId);

  useEffect(() => {
    setHighlightedTraceStepIndex(null);
    setTraceStepHoverIndex(null);
  }, [selectedRepoId, selectedUserId, setHighlightedTraceStepIndex, setTraceStepHoverIndex]);

  const userSummary = useMemo(
    () => summarizeUser(selectedUserId, usersQuery.data),
    [selectedUserId, usersQuery.data]
  );
  const repoSummary = useMemo(
    () => summarizeRepo(selectedRepoId, reposQuery.data),
    [selectedRepoId, reposQuery.data]
  );

  const hasPair =
    selectedUserId !== null && selectedRepoId !== null && selectedProjectName !== null;

  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startW: tracePanelWidthPx };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [tracePanelWidthPx]
  );

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const onMove = (ev: PointerEvent): void => {
      const d = dragRef.current;
      if (d === null) {
        return;
      }
      const delta = d.startX - ev.clientX;
      const next = Math.min(
        layout.tracePanelMax,
        Math.max(layout.tracePanelMin, d.startW + delta)
      );
      setTracePanelWidthPx(next);
    };
    const onUp = (): void => {
      dragRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, setTracePanelWidthPx]);

  const traceErrorRequestId =
    traceQuery.error instanceof ApiHttpError ? traceQuery.error.requestId : undefined;

  return (
    <aside
      aria-label="Access trace"
      className="relative flex shrink-0 flex-col border-l border-line-soft bg-panel shadow-panel"
      style={{ width: tracePanelWidthPx }}
    >
      <button
        aria-label="Resize trace panel"
        className={`absolute left-0 top-0 z-10 flex h-full w-3 cursor-col-resize items-center justify-center border-r border-transparent hover:border-line-soft ${
          isDragging ? "bg-panel-muted" : ""
        }`}
        onPointerDown={onResizePointerDown}
        type="button"
      >
        <GripVertical aria-hidden className="h-4 w-4 text-ink-tertiary" />
      </button>

      <div className="flex items-start justify-between gap-2 border-b border-line-soft py-3 pl-5 pr-4">
        <div className="min-w-0">
          <h2 className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
            Access trace
          </h2>
          {hasPair && userSummary !== null && repoSummary !== null ? (
            <div className="mt-2 space-y-0.5">
              <p className="truncate text-sm font-medium text-ink-primary" title={userSummary.title}>
                {userSummary.title}
              </p>
              {userSummary.subtitle !== undefined ? (
                <p className="truncate text-xs text-ink-secondary" title={userSummary.subtitle}>
                  {userSummary.subtitle}
                </p>
              ) : null}
              <p className="truncate text-xs text-ink-tertiary" title={repoSummary.title}>
                Repo: {repoSummary.title}
              </p>
              {repoSummary.branch !== undefined ? (
                <p className="truncate text-xs text-ink-secondary">{repoSummary.branch}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-xs text-ink-secondary">
              Explain effective Git access between a user and a repository.
            </p>
          )}
        </div>
        {hasPair ? (
          <button
            aria-label="Clear trace selection"
            className="shrink-0 rounded-input p-1 text-ink-tertiary hover:bg-panel-muted hover:text-ink-primary"
            onClick={() => {
              clearSelection();
            }}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!hasPair ? (
          <GuidedChecklist
            hasRepo={selectedRepoId !== null}
            hasUser={selectedUserId !== null}
            projectSelected={selectedProjectName !== null}
          />
        ) : null}

        {hasPair && traceQuery.isPending ? <TracePanelSkeleton /> : null}

        {hasPair && traceQuery.isError ? (
          <div className="p-4">
            <p className="text-sm font-medium text-status-danger">Trace failed</p>
            <p className="mt-1 text-xs text-ink-tertiary">{traceQuery.error.message}</p>
            {traceErrorRequestId !== undefined ? (
              <p className="mt-2 font-mono text-label text-ink-tertiary">
                Request ID: {traceErrorRequestId}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasPair && traceQuery.isSuccess ? (
          <div className="flex flex-col gap-4 p-4">
            <div
              className="rounded-input border border-line-default bg-panel-muted/80 px-3 py-2 text-xs text-ink-primary"
              role="status"
            >
              <p className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
                Summary
              </p>
              <p className="mt-1 leading-relaxed text-ink-secondary">
                {traceNarrativeSummary(traceQuery.data)}
              </p>
            </div>

            {!traceQuery.data.hasAccess ? (
              <div
                className="rounded-input border border-status-warning/40 bg-status-warning-soft px-3 py-2 text-xs text-ink-on-warning-soft"
                role="status"
              >
                <p className="font-medium">No effective access</p>
                <p className="mt-1 text-ink-on-warning-soft/90">
                  This user does not have Git access to the selected repository under current ACLs
                  and group memberships.
                </p>
              </div>
            ) : null}

            <section>
              <h3 className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
                Path
              </h3>
              <div className="mt-2">
                {traceQuery.data.steps.length === 0 ? (
                  <p className="text-xs text-ink-tertiary">No intermediate steps returned.</p>
                ) : (
                  traceQuery.data.steps.map((step, i) => (
                    <TraceStep
                      isHighlighted={effectiveTraceStepIndex === i}
                      isLast={i === traceQuery.data.steps.length - 1}
                      key={`${step.subjectId}-${String(i)}-${step.permission}`}
                      onActivate={(idx) => {
                        setHighlightedTraceStepIndex(idx);
                        uxEvent("trace.step_pin", { step: idx });
                      }}
                      onPointerEnter={(idx) => {
                        setTraceStepHoverIndex(idx);
                      }}
                      onPointerLeave={() => {
                        setTraceStepHoverIndex(null);
                      }}
                      step={step}
                      stepIndex={i}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
                Effective permissions
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {traceQuery.data.effectivePermissions.length === 0 ? (
                  <span className="text-xs text-ink-tertiary">None</span>
                ) : (
                  traceQuery.data.effectivePermissions.map((p) => (
                    <PermissionChip key={p} label={p} level="allow" />
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="text-label font-semibold uppercase tracking-wide text-ink-tertiary">
                Denied / blocked
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {traceQuery.data.deniedPermissions.length === 0 ? (
                  <span className="text-xs text-ink-tertiary">None reported</span>
                ) : (
                  traceQuery.data.deniedPermissions.map((p) => (
                    <PermissionChip key={p} label={p} level="deny" />
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function summarizeUser(
  selectedUserId: string | null,
  users: UserSummary[] | undefined
): { title: string; subtitle?: string } | null {
  if (selectedUserId === null || users === undefined) {
    return null;
  }
  const u = users.find((x) => x.id === selectedUserId);
  if (u === undefined) {
    return { title: selectedUserId };
  }
  const sub = u.mailAddress ?? u.principalName;
  return {
    title: u.displayName,
    ...(sub !== undefined && sub.length > 0 ? { subtitle: sub } : {}),
  };
}

function traceNarrativeSummary(trace: AccessTrace): string {
  if (!trace.hasAccess) {
    if (trace.deniedPermissions.length > 0) {
      const sample = trace.deniedPermissions.slice(0, 4).join(", ");
      const suffix = trace.deniedPermissions.length > 4 ? "…" : "";
      return `No effective access for this pair. Deny bits are set on the repository ACL (${sample}${suffix}), which can override inherited allows.`;
    }
    return "No effective Git access for this user on the selected repository under the current ACLs and group memberships.";
  }
  if (trace.effectivePermissions.length === 0) {
    return "Access is granted (read/contribute or other effective bits), but no named permission labels were resolved from the Git namespace.";
  }
  const sample = trace.effectivePermissions.slice(0, 5).join(", ");
  const suffix = trace.effectivePermissions.length > 5 ? "…" : "";
  return `Why access exists: combined ACEs on this repo yield effective permissions including ${sample}${suffix}. Use the path below to see which identities and groups contributed.`;
}

function summarizeRepo(
  selectedRepoId: string | null,
  repos: RepoSummary[] | undefined
): { title: string; branch?: string } | null {
  if (selectedRepoId === null || repos === undefined) {
    return null;
  }
  const r = repos.find((x) => x.id === selectedRepoId);
  if (r === undefined) {
    return { title: selectedRepoId };
  }
  return {
    title: r.name,
    ...(r.defaultBranch !== undefined && r.defaultBranch.length > 0
      ? { branch: r.defaultBranch }
      : {}),
  };
}
