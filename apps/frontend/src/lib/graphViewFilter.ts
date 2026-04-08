import type { AccessGraph, AccessTrace } from "@/types/graph.types";

import { isMembershipEdge } from "@/lib/graphEdgeKind";

/** Summary = permission landscape without pure membership edges. Path = user/repo/trace slice. Advanced = full graph. */
export type GraphViewMode = "summary" | "path" | "advanced";

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
export function expandMemberOfAncestors(
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
        if (isMembershipEdge(e) && e.source === id && !reached.has(e.target)) {
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
 * Filters the access graph for summary (overview), path (focus), or advanced (full) exploration.
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
  if (mode === "advanced") {
    return graph;
  }

  if (mode === "summary") {
    const permEdges = graph.edges.filter((e) => !isMembershipEdge(e));
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
      if (e.target === repoNid && !isMembershipEdge(e)) {
        ids.add(e.source);
      }
    }
  }

  return collectInducedSubgraph(graph, ids);
}

/**
 * When a repository is selected, returns node ids that should be visually muted (~80% dim)
 * because they are not part of the repo’s permission picture or the current user/trace context.
 * Empty set when no repository is selected (no extra muting).
 */
export function computeFocusMutedNodeIds(
  graph: AccessGraph,
  selectedRepoId: string | null,
  selectedUserId: string | null,
  trace: AccessTrace | undefined
): Set<string> {
  if (selectedRepoId === null) {
    return new Set();
  }
  const relevant = new Set<string>();
  const repoNid = repoNodeId(selectedRepoId);
  relevant.add(repoNid);

  for (const e of graph.edges) {
    if (e.target === repoNid && !isMembershipEdge(e)) {
      relevant.add(e.source);
    }
  }

  if (selectedUserId !== null) {
    relevant.add(selectedUserId);
    expandMemberOfAncestors(graph, selectedUserId, 10).forEach((id) => {
      relevant.add(id);
    });
  }

  if (trace !== undefined) {
    for (const s of trace.steps) {
      relevant.add(s.subjectId);
    }
  }

  const muted = new Set<string>();
  for (const n of graph.nodes) {
    if (!relevant.has(n.id)) {
      muted.add(n.id);
    }
  }
  return muted;
}
