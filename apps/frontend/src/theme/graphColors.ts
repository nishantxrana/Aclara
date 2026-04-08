/** Aligned with `tailwind.config.ts` `theme.extend.colors.node`. */
export const GRAPH_NODE_COLORS = {
  user: "#3b82f6",
  group: "#8b5cf6",
  repo: "#10b981",
  fallback: "#64748b",
} as const;

/** Membership edges — dashed gray on canvas. */
export const MEMBERSHIP_EDGE_STROKE = "#64748b";

/** Elevated / risky permission grants (solid amber). */
export const ELEVATED_PERMISSION_EDGE_STROKE = "#f59e0b";

/** Aligned with `tailwind.config.ts` `theme.extend.colors.status`. */
export const PERMISSION_EDGE_STROKE: Record<string, string> = {
  allow: "#22c55e",
  deny: "#ef4444",
  "inherited-allow": "#4ade80",
  "inherited-deny": "#f87171",
  "not-set": "#64748b",
};
