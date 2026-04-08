import design from "../../../../design.json";

import type { PermissionLevel } from "@/types/graph.types";

/** Layout widths from design.json (px). */
export const layout = {
  explorerWidth: 280,
  inspectorWidth: 320,
  tracePanelDefault: 320,
  tracePanelMin: 260,
  tracePanelMax: 520,
} as const;

export type ThemeId = "light" | "dark";

const themes = design.colorSystem.themes;

export type GraphThemeTokens = (typeof themes)["light"]["graph"];

/**
 * Resolved graph palette for the given theme (for React Flow Background, MiniMap, etc.).
 */
export function getGraphTheme(theme: ThemeId): GraphThemeTokens {
  return themes[theme].graph;
}

/**
 * Legacy export: light-theme graph snapshot for non-React callers.
 * Prefer `getGraphTheme` + `useTheme()` in components.
 */
export const colors = {
  bg: {
    page: themes.light.background.base,
    pageAlt: themes.light.background.baseAlt,
    canvas: themes.light.background.canvas,
    panel: themes.light.background.surface,
    panelSubtle: themes.light.background.surfaceSubtle,
    panelMuted: themes.light.background.surfaceMuted,
  },
  text: {
    primary: themes.light.text.primary,
    secondary: themes.light.text.secondary,
    tertiary: themes.light.text.muted,
    inverse: themes.light.text.inverse,
  },
  border: {
    soft: themes.light.border.soft,
    default: themes.light.border.default,
    strong: themes.light.border.strong,
  },
  brand: {
    primary: themes.light.accent.brand,
    primaryHover: themes.light.accent.brandHover,
    primarySoft: themes.light.accent.brandSoft,
    secondary: themes.light.accent.secondary,
    secondarySoft: themes.light.accent.secondarySoft,
    selection: themes.light.accent.selection,
    selectionSoft: themes.light.accent.selectionSoft,
  },
  data: {
    blue: themes.light.graph.nodeUser,
    cyan: themes.light.accent.secondary,
    violet: themes.light.graph.nodeGroup,
    teal: themes.light.graph.nodeRepo,
    slate: themes.light.graph.edgeNotSet,
  },
  status: {
    success: themes.light.status.success,
    successSoft: themes.light.status.successSoft,
    warning: themes.light.status.warning,
    warningSoft: themes.light.status.warningSoft,
    danger: themes.light.status.danger,
    dangerSoft: themes.light.status.dangerSoft,
    info: themes.light.status.info,
    infoSoft: themes.light.status.infoSoft,
  },
  graph: {
    gridDot: themes.light.graph.grid,
    membershipEdge: themes.light.graph.edgeMembership,
    nodeFallback: themes.light.graph.nodeFallback,
  },
} as const;

/** Git permission edge strokes — use CSS variables so SVG edges track active theme. */
export const graphPermissionEdgeStroke: Record<PermissionLevel, string> = {
  allow: "var(--color-permission-edge-allow)",
  deny: "var(--color-permission-edge-deny)",
  "inherited-allow": "var(--color-permission-edge-inherited-allow)",
  "inherited-deny": "var(--color-permission-edge-inherited-deny)",
  "not-set": "var(--color-permission-edge-not-set)",
};
