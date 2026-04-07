import { useEffect } from "react";

import { FilterBar } from "@/components/Filters/FilterBar";
import { AccessTracePanel } from "@/components/AccessTrace/AccessTracePanel";
import { GraphCanvas } from "@/components/GraphCanvas/GraphCanvas";
import { OverPrivilegeBanner } from "@/components/OverPrivilege/OverPrivilegeBanner";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { useVisualizerStore } from "@/stores/visualizer.store";

import { Header } from "./Header";

export function AppShell(): JSX.Element {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") {
        return;
      }
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      useVisualizerStore.getState().clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-surface text-slate-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <FilterBar />
          <OverPrivilegeBanner />
          <GraphCanvas />
        </div>
        <AccessTracePanel />
      </div>
    </div>
  );
}
