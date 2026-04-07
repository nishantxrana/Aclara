import { AccessTracePanel } from "@/components/AccessTrace/AccessTracePanel";
import { FilterBar } from "@/components/Filters/FilterBar";
import { GraphCanvas } from "@/components/GraphCanvas/GraphCanvas";
import { NodeInspectorPanel } from "@/components/Inspector/NodeInspectorPanel";
import { OverPrivilegeBanner } from "@/components/OverPrivilege/OverPrivilegeBanner";
import { Sidebar } from "@/components/Sidebar/Sidebar";

/**
 * Investigation layout: explorer, graph, optional inspector, trace panel.
 */
export function AppShell(): JSX.Element {
  return (
    <div className="flex min-h-0 flex-1">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FilterBar />
        <OverPrivilegeBanner />
        <GraphCanvas />
      </div>
      <NodeInspectorPanel />
      <AccessTracePanel />
    </div>
  );
}
