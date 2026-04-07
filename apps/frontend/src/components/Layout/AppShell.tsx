import { FilterBar } from "@/components/Filters/FilterBar";
import { GraphCanvas } from "@/components/GraphCanvas/GraphCanvas";
import { Sidebar } from "@/components/Sidebar/Sidebar";

import { AccessTracePlaceholder } from "./AccessTracePlaceholder";
import { Header } from "./Header";

export function AppShell(): JSX.Element {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-surface text-slate-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <FilterBar />
          <GraphCanvas />
        </div>
        <AccessTracePlaceholder />
      </div>
    </div>
  );
}
