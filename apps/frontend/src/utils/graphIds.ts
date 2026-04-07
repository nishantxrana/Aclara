import type { NodeType } from "@/types/graph.types";

/**
 * Returns true if the graph node id is the backend `repo:<uuid>` form.
 */
export function isRepoNodeId(id: string): boolean {
  return id.startsWith("repo:");
}

/**
 * Strips the `repo:` prefix for correlation with repo list `id` values.
 */
export function repoIdFromNodeId(id: string): string {
  return isRepoNodeId(id) ? id.slice("repo:".length) : id;
}

/**
 * Whether a canvas node should appear selected given store selection and node typing.
 */
export function isGraphNodeSelected(
  nodeId: string,
  nodeType: NodeType,
  selectedUserId: string | null,
  selectedRepoId: string | null
): boolean {
  if (nodeType === "user") {
    return selectedUserId !== null && selectedUserId === nodeId;
  }
  if (nodeType === "repo") {
    return selectedRepoId !== null && selectedRepoId === repoIdFromNodeId(nodeId);
  }
  return false;
}
