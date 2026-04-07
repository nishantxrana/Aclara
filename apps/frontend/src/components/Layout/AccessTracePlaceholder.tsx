/**
 * Reserved shell for the future Access Trace panel (Agent 4).
 */
export function AccessTracePlaceholder(): JSX.Element {
  return (
    <aside
      aria-label="Access trace panel placeholder"
      className="flex w-72 shrink-0 flex-col border-l border-surface-light bg-surface-light/40"
    >
      <div className="border-b border-surface-light px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Access trace
        </h2>
        <p className="mt-1 text-sm text-slate-300">Coming in a later milestone</p>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-slate-500">
        <p>
          Select a user and repository in the sidebar or graph to prepare trace context.
        </p>
        <p className="text-slate-600">Full trace visualization is not implemented here.</p>
      </div>
    </aside>
  );
}
