/**
 * Shared loading chrome for session and connect checks.
 */
export function AppLoadingShell(props: { readonly message: string }): JSX.Element {
  return (
    <div className="flex h-screen min-h-0 flex-col items-center justify-center bg-surface px-4 text-slate-100">
      <p className="text-lg font-semibold tracking-tight text-primary">InsightOps</p>
      <p className="mt-3 text-sm text-slate-400">{props.message}</p>
    </div>
  );
}
