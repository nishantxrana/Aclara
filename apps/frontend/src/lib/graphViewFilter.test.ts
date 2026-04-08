import { describe, expect, it } from "bun:test";

import { computeFocusMutedNodeIds, filterGraphForViewMode } from "./graphViewFilter";

import type { AccessGraph, AccessTrace } from "../types/graph.types";

const baseGraph: AccessGraph = {
  projectId: "p1",
  projectName: "Proj",
  generatedAt: new Date().toISOString(),
  nodes: [
    { id: "u1", type: "user", label: "User", primaryLabel: "User", metadata: {} },
    { id: "g1", type: "group", label: "Group", primaryLabel: "Group", metadata: {} },
    { id: "repo:r1", type: "repo", label: "Repo", primaryLabel: "Repo", metadata: {} },
  ],
  edges: [
    {
      id: "e1",
      source: "u1",
      target: "g1",
      kind: "membership",
      permission: "memberOf",
      presentationLabel: "Member of",
      level: "not-set",
    },
    {
      id: "e2",
      source: "g1",
      target: "repo:r1",
      kind: "permission",
      permission: "Contribute",
      presentationLabel: "Allow: Contribute",
      level: "allow",
    },
  ],
};

describe("filterGraphForViewMode", () => {
  it("advanced mode returns all nodes and edges", () => {
    const out = filterGraphForViewMode(baseGraph, "advanced", {
      selectedUserId: null,
      selectedRepoId: null,
      trace: undefined,
    });
    expect(out.nodes).toHaveLength(3);
    expect(out.edges).toHaveLength(2);
  });

  it("summary excludes pure membership-only nodes", () => {
    const out = filterGraphForViewMode(baseGraph, "summary", {
      selectedUserId: null,
      selectedRepoId: null,
      trace: undefined,
    });
    expect(out.nodes.map((n) => n.id).sort()).toEqual(["g1", "repo:r1"]);
    expect(out.edges).toHaveLength(1);
    expect(out.edges[0]?.presentationLabel).toBe("Allow: Contribute");
  });

  it("path mode includes user, repo, and trace subjects", () => {
    const trace: AccessTrace = {
      userId: "u1",
      repoId: "r1",
      steps: [
        {
          subjectId: "g1",
          subjectType: "group",
          subjectLabel: "G",
          permission: "x",
          presentationPermission: "Allow: x",
          level: "allow",
          reason: "r",
        },
      ],
      effectivePermissions: [],
      deniedPermissions: [],
      hasAccess: true,
    };
    const out = filterGraphForViewMode(baseGraph, "path", {
      selectedUserId: "u1",
      selectedRepoId: "r1",
      trace,
    });
    const ids = new Set(out.nodes.map((n) => n.id));
    expect(ids.has("u1")).toBe(true);
    expect(ids.has("repo:r1")).toBe(true);
    expect(ids.has("g1")).toBe(true);
  });

  it("computeFocusMutedNodeIds returns empty when no repo selected", () => {
    const muted = computeFocusMutedNodeIds(baseGraph, null, "u1", undefined);
    expect(muted.size).toBe(0);
  });

  it("computeFocusMutedNodeIds mutes nodes outside repo permission context", () => {
    const graphWide: AccessGraph = {
      ...baseGraph,
      nodes: [
        ...baseGraph.nodes,
        { id: "u2", type: "user", label: "Other", primaryLabel: "Other", metadata: {} },
      ],
    };
    const muted = computeFocusMutedNodeIds(graphWide, "r1", null, undefined);
    expect(muted.has("u2")).toBe(true);
    expect(muted.has("repo:r1")).toBe(false);
    expect(muted.has("g1")).toBe(false);
  });
});
