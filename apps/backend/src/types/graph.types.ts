export type NodeType = "user" | "group" | "repo";

export type GraphEdgeKind = "membership" | "permission";

export type PermissionLevel =
  | "allow"
  | "deny"
  | "inherited-allow"
  | "inherited-deny"
  | "not-set";

export interface GraphNode {
  id: string;
  type: NodeType;
  /** Display name; mirrors `primaryLabel` for clients that only read `label`. */
  label: string;
  primaryLabel: string;
  secondaryLabel?: string;
  metadata: Record<string, unknown>;
  isOverPrivileged?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  /** Machine-oriented summary (e.g. comma-separated allows, or `memberOf`). */
  permission: string;
  /** Short human-readable label for canvas tooltips and edge text. */
  presentationLabel: string;
  level: PermissionLevel;
  /** True when the permission grant includes elevated Git bits. */
  isElevated?: boolean;
  /** True when the source identity is a user (direct user→repo ACE). */
  isDirect?: boolean;
}

export interface AccessGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  projectId: string;
  projectName: string;
  generatedAt: string;
}

export interface TraceStep {
  subjectId: string;
  subjectType: "user" | "group";
  subjectLabel: string;
  /** When access is via a group ACE, the group display name (same as subject for group steps). */
  viaGroup?: string;
  /** Raw effective permission summary from ACL decode. */
  permission: string;
  /** Short label for timeline UI (e.g. "Allow: Read"). */
  presentationPermission: string;
  level: PermissionLevel;
  reason: string;
}

export interface AccessTrace {
  userId: string;
  repoId: string;
  steps: TraceStep[];
  effectivePermissions: string[];
  deniedPermissions: string[];
  hasAccess: boolean;
}
