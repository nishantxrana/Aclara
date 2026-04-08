import { Panel } from "@xyflow/react";
import { memo } from "react";

/**
 * Fixed lane captions; node X positions are aligned in `layoutWithDagreLR`.
 */
function SwimLaneLegendComponent(): JSX.Element {
  return (
    <Panel
      className="pointer-events-none !m-2 flex w-[min(720px,92vw)] max-w-none justify-between gap-4 rounded-md border border-surface-light/80 bg-surface/85 px-4 py-2 shadow-md backdrop-blur-sm"
      position="top-center"
    >
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
          Users
        </span>
        <span className="text-[9px] text-slate-500">Identities</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
          Groups
        </span>
        <span className="text-[9px] text-slate-500">Membership</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Repositories
        </span>
        <span className="text-[9px] text-slate-500">Git ACLs</span>
      </div>
    </Panel>
  );
}

export const SwimLaneLegend = memo(SwimLaneLegendComponent);
