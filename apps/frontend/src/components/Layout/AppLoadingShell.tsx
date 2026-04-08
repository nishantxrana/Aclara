import { AclaraBrandMark } from "@/components/Layout/AclaraBrandMark";

/**
 * Shared loading chrome for session and connect checks.
 */
export function AppLoadingShell(props: { readonly message: string }): JSX.Element {
  return (
    <div className="flex h-screen min-h-0 flex-col items-center justify-center bg-page px-4 text-ink-primary">
      <AclaraBrandMark />
      <p className="mt-3 text-sm text-ink-secondary">{props.message}</p>
    </div>
  );
}
