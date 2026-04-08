import { Panel } from "@xyflow/react";
import { memo } from "react";

/**
 * Fixed lane captions; node X positions are aligned in `layoutWithDagreLR`.
 */
function SwimLaneLegendComponent(): JSX.Element {
  return (
    <Panel
      className="pointer-events-none !m-2 flex w-[min(720px,92vw)] max-w-none justify-between gap-4 rounded-md border border-line-default bg-panel/95 px-4 py-2 shadow-panel-md backdrop-blur-sm"
      position="top-center"
    >
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-label font-bold uppercase tracking-wider text-node-user">Users</span>
        <span className="text-[9px] text-ink-tertiary">Identities</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-label font-bold uppercase tracking-wider text-node-group">Groups</span>
        <span className="text-[9px] text-ink-tertiary">Membership</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
        <span className="text-label font-bold uppercase tracking-wider text-node-repo">Repositories</span>
        <span className="text-[9px] text-ink-tertiary">Git ACLs</span>
      </div>
    </Panel>
  );
}

export const SwimLaneLegend = memo(SwimLaneLegendComponent);
