import {
  getGraphTheme,
  graphPermissionEdgeStroke,
  type ThemeId,
} from "@/theme/designTokens";

/** Node fills for minimap — resolved per active theme. */
export function getGraphNodeColors(theme: ThemeId): {
  user: string;
  group: string;
  repo: string;
  fallback: string;
} {
  const g = getGraphTheme(theme);
  return {
    user: g.nodeUser,
    group: g.nodeGroup,
    repo: g.nodeRepo,
    fallback: g.nodeFallback,
  };
}

/** @deprecated Use `getGraphNodeColors(useTheme().theme)` in components. */
export const GRAPH_NODE_COLORS = {
  user: getGraphTheme("light").nodeUser,
  group: getGraphTheme("light").nodeGroup,
  repo: getGraphTheme("light").nodeRepo,
  fallback: getGraphTheme("light").nodeFallback,
} as const;

/** Membership edges — dashed slate on canvas (theme-aware via CSS). */
export const MEMBERSHIP_EDGE_STROKE = "var(--color-graph-edge-membership)";

/** Elevated / risky permission grants — semantic warning. */
export const ELEVATED_PERMISSION_EDGE_STROKE = "var(--color-permission-edge-elevated)";

/** Git permission edge strokes by ACL state (CSS variables). */
export const PERMISSION_EDGE_STROKE: Record<string, string> = {
  ...graphPermissionEdgeStroke,
};
