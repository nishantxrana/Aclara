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
  permission: string;
  presentationLabel: string;
  level: PermissionLevel;
  isElevated?: boolean;
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
  viaGroup?: string;
  permission: string;
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
