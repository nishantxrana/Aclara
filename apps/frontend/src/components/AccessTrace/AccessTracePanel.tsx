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
} from "@/api/insightops.api";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { PermissionChip } from "./PermissionChip";
import { TraceStep } from "./TraceStep";

const TRACE_PANEL_MIN_W = 260;
const TRACE_PANEL_MAX_W = 520;

function TracePanelSkeleton(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4" aria-busy="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-light" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-light/80" />
      <div className="mt-4 space-y-3">
        <div className="h-16 animate-pulse rounded-lg bg-surface-light/60" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-light/60" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-light/60" />
      </div>
    </div>
  );
}

function PlaceholderState(props: { message: string; detail?: string }): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-sm text-slate-300">{props.message}</p>
      {props.detail !== undefined ? (
        <p className="text-xs text-slate-500">{props.detail}</p>
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
        <p className="text-sm font-medium text-slate-200">{headline}</p>
        <p className="mt-1 text-xs text-slate-500">{sub}</p>
      </div>
      <ol className="space-y-2" role="list">
        {steps.map((s) => (
          <li className="flex items-start gap-2 text-xs text-slate-400" key={s.label}>
            {s.done ? (
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            )}
            <span className={s.done ? "text-slate-300" : ""}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AccessTracePanel(): JSX.Element {
  const { selectedProjectName, selectedUserId, selectedRepoId, clearSelection, tracePanelWidthPx, setTracePanelWidthPx } =
    useVisualizerStore(
      useShallow((s) => ({
        selectedProjectName: s.selectedProjectName,
        selectedUserId: s.selectedUserId,
        selectedRepoId: s.selectedRepoId,
        clearSelection: s.clearSelection,
        tracePanelWidthPx: s.tracePanelWidthPx,
        setTracePanelWidthPx: s.setTracePanelWidthPx,
      }))
    );

  const usersQuery = useUsers(selectedProjectName);
  const reposQuery = useRepos(selectedProjectName);
  const traceQuery = useTrace(selectedProjectName, selectedUserId, selectedRepoId);

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
      const next = Math.min(TRACE_PANEL_MAX_W, Math.max(TRACE_PANEL_MIN_W, d.startW + delta));
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
      className="relative flex shrink-0 flex-col border-l border-surface-light bg-surface-light/40"
      style={{ width: tracePanelWidthPx }}
    >
      <button
        aria-label="Resize trace panel"
        className={`absolute left-0 top-0 z-10 flex h-full w-3 cursor-col-resize items-center justify-center border-r border-transparent hover:border-surface-light ${
          isDragging ? "bg-surface-light/50" : ""
        }`}
        onPointerDown={onResizePointerDown}
        type="button"
      >
        <GripVertical aria-hidden className="h-4 w-4 text-slate-600" />
      </button>

      <div className="flex items-start justify-between gap-2 border-b border-surface-light py-3 pl-5 pr-4">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Access trace
          </h2>
          {hasPair && userSummary !== null && repoSummary !== null ? (
            <div className="mt-2 space-y-0.5">
              <p className="truncate text-sm font-medium text-slate-100" title={userSummary.title}>
                {userSummary.title}
              </p>
              {userSummary.subtitle !== undefined ? (
                <p className="truncate text-xs text-slate-500" title={userSummary.subtitle}>
                  {userSummary.subtitle}
                </p>
              ) : null}
              <p className="truncate text-xs text-slate-400" title={repoSummary.title}>
                Repo: {repoSummary.title}
              </p>
              {repoSummary.branch !== undefined ? (
                <p className="truncate text-xs text-slate-500">{repoSummary.branch}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Explain effective Git access between a user and a repository.
            </p>
          )}
        </div>
        {hasPair ? (
          <button
            aria-label="Clear trace selection"
            className="shrink-0 rounded p-1 text-slate-500 hover:bg-surface-light hover:text-slate-200"
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
            <p className="text-sm font-medium text-red-400">Trace failed</p>
            <p className="mt-1 text-xs text-slate-500">{traceQuery.error.message}</p>
            {traceErrorRequestId !== undefined ? (
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                Request ID: {traceErrorRequestId}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasPair && traceQuery.isSuccess ? (
          <div className="flex flex-col gap-4 p-4">
            {!traceQuery.data.hasAccess ? (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                role="status"
              >
                <p className="font-medium">No effective access</p>
                <p className="mt-1 text-amber-200/90">
                  This user does not have Git access to the selected repository under current ACLs
                  and group memberships.
                </p>
              </div>
            ) : null}

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Path
              </h3>
              <div className="mt-2">
                {traceQuery.data.steps.length === 0 ? (
                  <p className="text-xs text-slate-500">No intermediate steps returned.</p>
                ) : (
                  traceQuery.data.steps.map((step, i) => (
                    <TraceStep
                      isLast={i === traceQuery.data.steps.length - 1}
                      key={`${step.subjectId}-${String(i)}-${step.permission}`}
                      step={step}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Effective permissions
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {traceQuery.data.effectivePermissions.length === 0 ? (
                  <span className="text-xs text-slate-500">None</span>
                ) : (
                  traceQuery.data.effectivePermissions.map((p) => (
                    <PermissionChip key={p} label={p} level="allow" />
                  ))
                )}
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Denied / blocked
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {traceQuery.data.deniedPermissions.length === 0 ? (
                  <span className="text-xs text-slate-500">None reported</span>
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
