import type { AccessGraph, AccessTrace } from "@/types/graph.types";

export type GraphViewMode = "overview" | "focus" | "full";

function repoNodeId(repoId: string): string {
  return `repo:${repoId}`;
}

function collectInducedSubgraph(
  graph: AccessGraph,
  nodeIdSet: ReadonlySet<string>
): AccessGraph {
  const nodes = graph.nodes.filter((n) => nodeIdSet.has(n.id));
  const edges = graph.edges.filter(
    (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
  );
  return {
    ...graph,
    nodes,
    edges,
  };
}

/**
 * Expands `seed` along `memberOf` edges (child source → parent target) up to `maxDepth`.
 */
function expandMemberOfAncestors(
  graph: AccessGraph,
  seed: string,
  maxDepth: number
): Set<string> {
  const reached = new Set<string>([seed]);
  let frontier: string[] = [seed];
  for (let d = 0; d < maxDepth && frontier.length > 0; d += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of graph.edges) {
        if (e.permission === "memberOf" && e.source === id && !reached.has(e.target)) {
          reached.add(e.target);
          next.push(e.target);
        }
      }
    }
    frontier = next;
  }
  return reached;
}

/**
 * Filters the access graph for overview, focus path, or full exploration.
 */
export function filterGraphForViewMode(
  graph: AccessGraph,
  mode: GraphViewMode,
  opts: {
    readonly selectedUserId: string | null;
    readonly selectedRepoId: string | null;
    readonly trace: AccessTrace | undefined;
  }
): AccessGraph {
  if (mode === "full") {
    return graph;
  }

  if (mode === "overview") {
    const permEdges = graph.edges.filter((e) => e.permission !== "memberOf");
    const nodeIds = new Set<string>();
    for (const e of permEdges) {
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    }
    return collectInducedSubgraph(graph, nodeIds);
  }

  const ids = new Set<string>();
  if (opts.selectedUserId !== null) {
    ids.add(opts.selectedUserId);
  }
  if (opts.selectedRepoId !== null) {
    ids.add(repoNodeId(opts.selectedRepoId));
  }
  if (opts.trace !== undefined) {
    for (const s of opts.trace.steps) {
      ids.add(s.subjectId);
    }
  }

  if (opts.selectedUserId !== null) {
    const ancestors = expandMemberOfAncestors(graph, opts.selectedUserId, 10);
    ancestors.forEach((id) => {
      ids.add(id);
    });
  }

  if (opts.selectedRepoId !== null) {
    const repoNid = repoNodeId(opts.selectedRepoId);
    for (const e of graph.edges) {
      if (e.target === repoNid && e.permission !== "memberOf") {
        ids.add(e.source);
      }
    }
  }

  return collectInducedSubgraph(graph, ids);
}
