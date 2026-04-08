import { describe, expect, it } from "bun:test";
import type { Edge, Node } from "@xyflow/react";

import { layoutWithDagreLR } from "./dagreLayout";

describe("layoutWithDagreLR", () => {
  it("places users, groups, and repos at distinct lane centers on X", () => {
    const nodes: Node[] = [
      {
        id: "u1",
        type: "user",
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "g1",
        type: "group",
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "repo:r1",
        type: "repo",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "u1", target: "g1", type: "membership", data: {} },
      { id: "e2", source: "g1", target: "repo:r1", type: "permission", data: {} },
    ];
    const laid = layoutWithDagreLR(nodes, edges);
    const byId = new Map(laid.map((n) => [n.id, n]));
    const ux = (byId.get("u1")?.position.x ?? 0) + 100;
    const gx = (byId.get("g1")?.position.x ?? 0) + 110;
    const rx = (byId.get("repo:r1")?.position.x ?? 0) + 124;
    expect(ux).toBeLessThan(gx);
    expect(gx).toBeLessThan(rx);
  });
});
