import { Loader2 } from "lucide-react";

export default function App(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-100">
      <header className="border-b border-surface-light px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-primary">
          InsightOps
        </span>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2
            className="h-10 w-10 animate-spin text-primary"
            aria-hidden
          />
          <p className="text-lg text-slate-300">Select a project to begin</p>
        </div>
        <p className="max-w-md text-center text-sm text-slate-500">
          Foundation ready — agents building features
        </p>
      </main>
    </div>
  );
}
