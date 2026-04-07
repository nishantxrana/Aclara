/**
 * Shared copy blocks for consistent workspace guidance.
 */
export function NoProjectMessage(): JSX.Element {
  return (
    <p className="text-sm text-slate-400">
      Choose an Azure DevOps project to load repositories, identities, and the access graph.
    </p>
  );
}

export function UrlProjectNotFoundBanner(props: { projectName: string; onDismiss: () => void }): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100"
      role="alert"
    >
      <span>
        Linked project <span className="font-medium text-amber-50">{props.projectName}</span> was not found in
        this organization. Pick a valid project below.
      </span>
      <button
        className="shrink-0 rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
        onClick={props.onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}
