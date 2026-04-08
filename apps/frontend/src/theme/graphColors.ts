import { colors, graphPermissionEdgeStroke } from "@/theme/designTokens";

/** Node fills for minimap / non-Tailwind consumers — aligned with `tailwind.config` `theme.extend.colors.node`. */
export const GRAPH_NODE_COLORS = {
  user: colors.data.blue,
  group: colors.data.violet,
  repo: colors.data.teal,
  fallback: colors.graph.nodeFallback,
} as const;

/** Membership edges — dashed slate on canvas. */
export const MEMBERSHIP_EDGE_STROKE = colors.graph.membershipEdge;

/** Elevated / risky permission grants — semantic warning. */
export const ELEVATED_PERMISSION_EDGE_STROKE = colors.status.warning;

/** Git permission edge strokes by ACL state. */
export const PERMISSION_EDGE_STROKE: Record<string, string> = {
  ...graphPermissionEdgeStroke,
};
