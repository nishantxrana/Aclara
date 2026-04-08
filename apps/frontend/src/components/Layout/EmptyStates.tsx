/**
 * Shared copy blocks for consistent workspace guidance.
 */
export function NoProjectMessage(): JSX.Element {
  return (
    <p className="text-sm text-ink-secondary">
      Choose an Azure DevOps project to load repositories, identities, and the access graph.
    </p>
  );
}

export function UrlProjectNotFoundBanner(props: { projectName: string; onDismiss: () => void }): JSX.Element {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-status-warning/30 bg-status-warning-soft px-4 py-2 text-sm text-amber-950"
      role="alert"
    >
      <span>
        Linked project <span className="font-medium text-amber-950">{props.projectName}</span> was not found in
        this organization. Pick a valid project below.
      </span>
      <button
        className="shrink-0 rounded-input border border-status-warning/45 px-2 py-1 text-xs text-amber-950 hover:bg-status-warning/25"
        onClick={props.onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}
