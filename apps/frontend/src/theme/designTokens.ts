/**
 * Semantic design tokens aligned with repo-root `design.json`.
 * Single source for hex values consumed by React (graph strokes) and referenced by Tailwind.
 */
export const colors = {
  bg: {
    page: "#EEF5FF",
    pageAlt: "#E8F2FF",
    canvas: "#FDFEFF",
    panel: "#FFFFFF",
    panelSubtle: "#F7FAFF",
    panelMuted: "#F3F7FC",
  },
  text: {
    primary: "#0F172A",
    secondary: "#5B6B84",
    tertiary: "#8A97AB",
    inverse: "#FFFFFF",
  },
  border: {
    soft: "#E6ECF5",
    default: "#D9E4F2",
    strong: "#C8D6E8",
  },
  brand: {
    primary: "#3B82F6",
    primaryHover: "#2F6FE0",
    primarySoft: "#E8F1FF",
    secondary: "#52C7EA",
    secondarySoft: "#E7FAFF",
    selection: "#A855F7",
    selectionSoft: "#F4E9FF",
  },
  data: {
    blue: "#3B82F6",
    cyan: "#44C2E6",
    violet: "#9B6BFF",
    teal: "#25C3B0",
    slate: "#91A4BC",
  },
  status: {
    success: "#19B36B",
    successSoft: "#E9FBF2",
    warning: "#F59E0B",
    warningSoft: "#FFF5DD",
    danger: "#F05A67",
    dangerSoft: "#FFF0F2",
    info: "#4B8DFF",
    infoSoft: "#EAF2FF",
  },
  graph: {
    gridDot: "#D9E4F2",
    membershipEdge: "#91A4BC",
    nodeFallback: "#91A4BC",
  },
} as const;

/** Git permission edge strokes (semantic ACL states). */
export const graphPermissionEdgeStroke = {
  allow: colors.status.success,
  deny: colors.status.danger,
  "inherited-allow": "#2DD48A",
  "inherited-deny": "#F87171",
  "not-set": colors.data.slate,
} as const;

/** Layout widths from design.json (px). */
export const layout = {
  explorerWidth: 280,
  inspectorWidth: 320,
  tracePanelDefault: 320,
  tracePanelMin: 260,
  tracePanelMax: 520,
} as const;
