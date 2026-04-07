import { describe, expect, it } from "bun:test";

import { filterGraphForViewMode } from "./graphViewFilter";

import type { AccessGraph, AccessTrace } from "../types/graph.types";

const baseGraph: AccessGraph = {
  projectId: "p1",
  projectName: "Proj",
  generatedAt: new Date().toISOString(),
  nodes: [
    { id: "u1", type: "user", label: "User", metadata: {} },
    { id: "g1", type: "group", label: "Group", metadata: {} },
    { id: "repo:r1", type: "repo", label: "Repo", metadata: {} },
  ],
  edges: [
    {
      id: "e1",
      source: "u1",
      target: "g1",
      permission: "memberOf",
      level: "allow",
    },
    {
      id: "e2",
      source: "g1",
      target: "repo:r1",
      permission: "Contribute",
      level: "allow",
    },
  ],
};

describe("filterGraphForViewMode", () => {
  it("full mode returns the same graph reference shape (all nodes)", () => {
    const out = filterGraphForViewMode(baseGraph, "full", {
      selectedUserId: null,
      selectedRepoId: null,
      trace: undefined,
    });
    expect(out.nodes).toHaveLength(3);
    expect(out.edges).toHaveLength(2);
  });

  it("overview excludes pure membership-only nodes", () => {
    const out = filterGraphForViewMode(baseGraph, "overview", {
      selectedUserId: null,
      selectedRepoId: null,
      trace: undefined,
    });
    expect(out.nodes.map((n) => n.id).sort()).toEqual(["g1", "repo:r1"]);
    expect(out.edges).toHaveLength(1);
    expect(out.edges[0]?.permission).toBe("Contribute");
  });

  it("focus mode includes user, repo, and trace subjects", () => {
    const trace: AccessTrace = {
      userId: "u1",
      repoId: "r1",
      steps: [{ subjectId: "g1", subjectType: "group", subjectLabel: "G", permission: "x", level: "allow", reason: "r" }],
      effectivePermissions: [],
      deniedPermissions: [],
      hasAccess: true,
    };
    const out = filterGraphForViewMode(baseGraph, "focus", {
      selectedUserId: "u1",
      selectedRepoId: "r1",
      trace,
    });
    const ids = new Set(out.nodes.map((n) => n.id));
    expect(ids.has("u1")).toBe(true);
    expect(ids.has("repo:r1")).toBe(true);
    expect(ids.has("g1")).toBe(true);
  });
});
