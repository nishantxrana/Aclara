import { X } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useRepos, useTrace, useUsers } from "@/api/insightops.api";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { PermissionChip } from "./PermissionChip";
import { TraceStep } from "./TraceStep";

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

export function AccessTracePanel(): JSX.Element {
  const { selectedProjectName, selectedUserId, selectedRepoId, clearSelection } =
    useVisualizerStore(
      useShallow((s) => ({
        selectedProjectName: s.selectedProjectName,
        selectedUserId: s.selectedUserId,
        selectedRepoId: s.selectedRepoId,
        clearSelection: s.clearSelection,
      }))
    );

  const usersQuery = useUsers(selectedProjectName);
  const reposQuery = useRepos(selectedProjectName);
  const traceQuery = useTrace(selectedProjectName, selectedUserId, selectedRepoId);

  const userSummary = useMemo(() => {
    if (selectedUserId === null || usersQuery.data === undefined) {
      return null;
    }
    const u = usersQuery.data.find((x) => x.id === selectedUserId);
    if (u === undefined) {
      return { title: selectedUserId };
    }
    const sub = u.mailAddress ?? u.principalName;
    return {
      title: u.displayName,
      ...(sub !== undefined && sub.length > 0 ? { subtitle: sub } : {}),
    };
  }, [selectedUserId, usersQuery.data]);

  const repoSummary = useMemo(() => {
    if (selectedRepoId === null || reposQuery.data === undefined) {
      return null;
    }
    const r = reposQuery.data.find((x) => x.id === selectedRepoId);
    if (r === undefined) {
      return { title: selectedRepoId };
    }
    return {
      title: r.name,
      ...(r.defaultBranch !== undefined && r.defaultBranch.length > 0
        ? { branch: r.defaultBranch }
        : {}),
    };
  }, [selectedRepoId, reposQuery.data]);

  const hasPair =
    selectedUserId !== null && selectedRepoId !== null && selectedProjectName !== null;

  const panelWide = hasPair;

  return (
    <aside
      aria-label="Access trace"
      className={`flex shrink-0 flex-col border-l border-surface-light bg-surface-light/40 transition-[width] duration-300 ease-out ${
        panelWide ? "w-[22rem]" : "w-72"
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-light px-4 py-3">
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
              Pick a user and a repository to trace effective access.
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
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {selectedProjectName === null ? (
          <PlaceholderState
            detail="Choose a project in the header to enable tracing."
            message="No project selected"
          />
        ) : null}

        {selectedProjectName !== null && !hasPair ? (
          <PlaceholderState
            detail="Use the explorer or graph: click a user, then a repo (order does not matter)."
            message="Select a user and a repository"
          />
        ) : null}

        {hasPair && traceQuery.isPending ? <TracePanelSkeleton /> : null}

        {hasPair && traceQuery.isError ? (
          <div className="p-4">
            <p className="text-sm font-medium text-red-400">Trace failed</p>
            <p className="mt-1 text-xs text-slate-500">{traceQuery.error.message}</p>
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
                  This user does not have Git access to the selected repository under current
                  ACLs and group memberships.
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
