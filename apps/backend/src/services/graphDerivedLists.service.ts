import type { AccessGraph } from "@/types/graph.types";

function readOptionalString(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Derives user summaries from graph nodes (identities that appear in ACLs), not full org user list.
 */
export function usersFromAccessGraph(graph: AccessGraph): Array<{
  id: string;
  displayName: string;
  principalName?: string;
  mailAddress?: string;
}> {
  return graph.nodes
    .filter((n) => n.type === "user")
    .map((n) => {
      const meta = n.metadata;
      const principalName = readOptionalString(meta, "principalName");
      const mailAddress = readOptionalString(meta, "mailAddress");
      return {
        id: n.id,
        displayName: n.primaryLabel ?? n.label,
        ...(principalName !== undefined ? { principalName } : {}),
        ...(mailAddress !== undefined ? { mailAddress } : {}),
      };
    });
}

/**
 * Derives repository summaries from graph repo nodes (`id` is `repo:{guid}`).
 */
export function reposFromAccessGraph(graph: AccessGraph): Array<{
  id: string;
  name: string;
  defaultBranch?: string;
  remoteUrl?: string;
}> {
  return graph.nodes
    .filter((n) => n.type === "repo")
    .map((n) => {
      const repoId = n.id.startsWith("repo:") ? n.id.slice("repo:".length) : n.id;
      const meta = n.metadata;
      const defaultBranch = readOptionalString(meta, "defaultBranch");
      const remoteUrl = readOptionalString(meta, "remoteUrl");
      return {
        id: repoId,
        name: n.primaryLabel ?? n.label,
        ...(defaultBranch !== undefined ? { defaultBranch } : {}),
        ...(remoteUrl !== undefined ? { remoteUrl } : {}),
      };
    });
}
