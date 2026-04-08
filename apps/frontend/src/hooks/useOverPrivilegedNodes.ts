import { useMemo } from "react";

import type { AccessGraph } from "@/types/graph.types";

/** One identity flagged as over-privileged in the graph builder. */
export interface IFlaggedEntity {
  id: string;
  type: "user" | "group";
  label: string;
  /** Human-readable detail from metadata when present. */
  elevatedSummary: string;
}

export interface IOverPrivilegedNodesResult {
  users: IFlaggedEntity[];
  groups: IFlaggedEntity[];
  /** Short sentence for the collapsed banner line. */
  summaryLine: string;
  hasAny: boolean;
  /** True when mock entities are shown (dev + VITE_DEV_OVERPRIV_MOCK). */
  devMockActive: boolean;
}

function readStringArray(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === "string");
}

function summarizeGraph(graph: AccessGraph): Omit<IOverPrivilegedNodesResult, "devMockActive"> {
  const flagged = graph.nodes.filter((n) => n.isOverPrivileged === true);
  const users: IFlaggedEntity[] = [];
  const groups: IFlaggedEntity[] = [];

  for (const n of flagged) {
    if (n.type !== "user" && n.type !== "group") {
      continue;
    }
    const explicit = readStringArray(n.metadata, "explicitAllowNames");
    const elevatedSummary =
      explicit.length > 0 ? explicit.join(", ") : "Elevated permissions detected";
    const row: IFlaggedEntity = {
      id: n.id,
      type: n.type,
      label: n.primaryLabel ?? n.label,
      elevatedSummary,
    };
    if (n.type === "user") {
      users.push(row);
    } else {
      groups.push(row);
    }
  }

  const hasAny = users.length > 0 || groups.length > 0;
  const summaryLine = hasAny
    ? `${String(users.length)} user(s), ${String(groups.length)} group(s) flagged for sensitive or elevated Git permissions`
    : "";

  return { users, groups, summaryLine, hasAny };
}

/**
 * Derives over-privileged user/group lists and summary text from a loaded access graph.
 * Optional dev-only mock: set `VITE_DEV_OVERPRIV_MOCK=true` when no real flagged nodes exist.
 */
export function useOverPrivilegedNodes(
  graph: AccessGraph | undefined
): IOverPrivilegedNodesResult {
  return useMemo(() => {
    if (graph === undefined) {
      return {
        users: [],
        groups: [],
        summaryLine: "",
        hasAny: false,
        devMockActive: false,
      };
    }

    const base = summarizeGraph(graph);
    const devMockAllowed =
      import.meta.env.DEV && import.meta.env.VITE_DEV_OVERPRIV_MOCK === "true";

    if (devMockAllowed && !base.hasAny) {
      return {
        users: [
          {
            id: "__dev_mock_user__",
            type: "user",
            label: "[Dev mock] Sample user",
            elevatedSummary: "Administer, ManagePermissions (mock)",
          },
        ],
        groups: [
          {
            id: "__dev_mock_group__",
            type: "group",
            label: "[Dev mock] Sample group",
            elevatedSummary: "PullRequestBypassPolicy (mock)",
          },
        ],
        summaryLine:
          "1 user(s), 1 group(s) flagged for sensitive or elevated Git permissions (dev mock)",
        hasAny: true,
        devMockActive: true,
      };
    }

    return { ...base, devMockActive: false };
  }, [graph]);
}
