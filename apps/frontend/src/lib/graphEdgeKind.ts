import type { GraphEdge } from "@/types/graph.types";

/**
 * True for group membership edges (child → parent container).
 * Supports older graphs that only set `permission === "memberOf"`.
 */
export function isMembershipEdge(e: GraphEdge): boolean {
  return e.kind === "membership" || e.permission === "memberOf";
}
