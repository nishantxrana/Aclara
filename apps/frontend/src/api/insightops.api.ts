import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import { createLogger } from "@/utils/logger";

import type {
  AccessGraph,
  AccessTrace,
  GraphEdge,
  GraphNode,
  TraceStep,
} from "@/types/graph.types";

/** Centralized React Query keys for InsightOps API resources. */
export const QUERY_KEYS = {
  sessionStatus: ["insightops", "session", "status"] as const,
  projects: ["insightops", "projects"] as const,
  users: (projectName: string) => ["insightops", "users", projectName] as const,
  repos: (projectName: string) => ["insightops", "repos", projectName] as const,
  graph: (projectName: string) => ["insightops", "graph", projectName] as const,
  trace: (projectName: string, userId: string, repoId: string) =>
    ["insightops", "trace", projectName, userId, repoId] as const,
} as const;

const SessionStatusSchema = z.discriminatedUnion("connected", [
  z.object({
    connected: z.literal(true),
    org: z.string(),
    source: z.enum(["session", "env"]),
  }),
  z.object({
    connected: z.literal(false),
  }),
]);

const ProjectDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string(),
  visibility: z.string(),
});

const ProjectsEnvelopeSchema = z.object({
  projects: z.array(ProjectDtoSchema),
});

const UserDtoSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  principalName: z.string().optional(),
  mailAddress: z.string().optional(),
});

const UsersEnvelopeSchema = z.object({
  project: z.string(),
  users: z.array(UserDtoSchema),
});

const RepoDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultBranch: z.string().optional(),
  remoteUrl: z.string().optional(),
});

const ReposEnvelopeSchema = z.object({
  project: z.string(),
  repos: z.array(RepoDtoSchema),
});

const PermissionLevelSchema = z.enum([
  "allow",
  "deny",
  "inherited-allow",
  "inherited-deny",
  "not-set",
]);

const GraphEdgeKindSchema = z.enum(["membership", "permission"]);

const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "group", "repo"]),
  label: z.string(),
  primaryLabel: z.string().optional(),
  secondaryLabel: z.string().optional(),
  metadata: z.record(z.unknown()),
  isOverPrivileged: z.boolean().optional(),
});

const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: GraphEdgeKindSchema.optional(),
  permission: z.string(),
  presentationLabel: z.string().optional(),
  level: PermissionLevelSchema,
  isElevated: z.boolean().optional(),
  isDirect: z.boolean().optional(),
});

const AccessGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  projectId: z.string(),
  projectName: z.string(),
  generatedAt: z.string(),
});

const TraceStepSchema = z.object({
  subjectId: z.string(),
  subjectType: z.enum(["user", "group"]),
  subjectLabel: z.string(),
  viaGroup: z.string().optional(),
  permission: z.string(),
  presentationPermission: z.string().optional(),
  level: PermissionLevelSchema,
  reason: z.string(),
});

const AccessTraceSchema = z.object({
  userId: z.string(),
  repoId: z.string(),
  steps: z.array(TraceStepSchema),
  effectivePermissions: z.array(z.string()),
  deniedPermissions: z.array(z.string()),
  hasAccess: z.boolean(),
});

type ParsedGraphNode = z.infer<typeof GraphNodeSchema>;
type ParsedGraphEdge = z.infer<typeof GraphEdgeSchema>;
type ParsedTraceStep = z.infer<typeof TraceStepSchema>;

function normalizeGraphNode(n: ParsedGraphNode): GraphNode {
  const primaryLabel = n.primaryLabel ?? n.label;
  const base: GraphNode = {
    id: n.id,
    type: n.type,
    label: primaryLabel,
    primaryLabel,
    metadata: n.metadata,
    ...(n.secondaryLabel !== undefined && n.secondaryLabel.length > 0
      ? { secondaryLabel: n.secondaryLabel }
      : {}),
  };
  if (n.isOverPrivileged === true) {
    return { ...base, isOverPrivileged: true };
  }
  return base;
}

function normalizeGraphEdge(e: ParsedGraphEdge): GraphEdge {
  const kind =
    e.kind ??
    (e.permission === "memberOf" ? ("membership" as const) : ("permission" as const));
  const presentationLabel =
    e.presentationLabel ?? (kind === "membership" ? "Member of" : e.permission);
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    kind,
    permission: e.permission,
    presentationLabel,
    level: e.level,
    ...(e.isElevated === true ? { isElevated: true } : {}),
    ...(e.isDirect === true ? { isDirect: true } : {}),
  };
}

function normalizeTraceStep(s: ParsedTraceStep): TraceStep {
  return {
    subjectId: s.subjectId,
    subjectType: s.subjectType,
    subjectLabel: s.subjectLabel,
    permission: s.permission,
    presentationPermission: s.presentationPermission ?? s.permission,
    level: s.level,
    reason: s.reason,
    ...(s.viaGroup !== undefined ? { viaGroup: s.viaGroup } : {}),
  };
}

export type ProjectSummary = z.infer<typeof ProjectDtoSchema>;
export type UserSummary = z.infer<typeof UserDtoSchema>;
export type RepoSummary = z.infer<typeof RepoDtoSchema>;

export type InsightOpsApiErrorBody = {
  message?: string;
  error?: string;
};

const apiLog = createLogger("insightops.api");

function errorMessageFromBody(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const o = json as InsightOpsApiErrorBody;
    if (typeof o.message === "string" && o.message.length > 0) {
      return o.message;
    }
    if (typeof o.error === "string" && o.error.length > 0) {
      return o.error;
    }
  }
  return fallback;
}

/**
 * Thrown when the InsightOps API returns a non-2xx response.
 */
export class ApiHttpError extends Error {
  public readonly requestId: string | undefined;

  constructor(message: string, public readonly status: number, public readonly body: unknown) {
    super(message);
    this.name = "ApiHttpError";
    let requestId: string | undefined;
    if (typeof body === "object" && body !== null) {
      const rid = (body as Record<string, unknown>)["requestId"];
      if (typeof rid === "string" && rid.length > 0) {
        requestId = rid;
      }
    }
    this.requestId = requestId;
  }
}

/**
 * Performs a same-origin fetch to `/api/*` (proxied to the backend in dev) and parses JSON with Zod.
 * Pass `init` for POST/JSON bodies; session cookies are always included.
 */
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T> {
  apiLog.debug("api.fetch.start", { path, method: init?.method ?? "GET" });
  const res = await fetch(path, {
    ...init,
    credentials: "include",
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = errorMessageFromBody(json, res.statusText);
    apiLog.warn("api.fetch.http_error", {
      path,
      status: res.status,
      message: msg,
    });
    throw new ApiHttpError(msg ?? "Request failed", res.status, json);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    apiLog.error("api.fetch.validation_failed", {
      path,
      zodMessage: parsed.error.message,
    });
    throw new Error(`Invalid API response for ${path}: ${parsed.error.message}`);
  }
  apiLog.debug("api.fetch.success", { path, status: res.status });
  return parsed.data;
}

function projectQuery(projectName: string, nocache?: boolean): string {
  const q = new URLSearchParams({ project: projectName });
  if (nocache === true) {
    q.set("nocache", "1");
  }
  return q.toString();
}

function traceQuery(projectName: string, userId: string, repoId: string): string {
  const q = new URLSearchParams({
    project: projectName,
    userId,
    repoId,
  });
  return q.toString();
}

/**
 * Fetches org projects and returns the normalized list.
 */
export async function fetchProjects(): Promise<ProjectSummary[]> {
  const data = await apiFetch("/api/projects", ProjectsEnvelopeSchema);
  return data.projects;
}

/**
 * Fetches users visible in the project graph scope.
 */
export async function fetchUsers(
  projectName: string,
  options?: { nocache?: boolean }
): Promise<UserSummary[]> {
  const data = await apiFetch(
    `/api/users?${projectQuery(projectName, options?.nocache)}`,
    UsersEnvelopeSchema
  );
  return data.users;
}

/**
 * Fetches Git repositories for a project.
 */
export async function fetchRepos(
  projectName: string,
  options?: { nocache?: boolean }
): Promise<RepoSummary[]> {
  const data = await apiFetch(
    `/api/repos?${projectQuery(projectName, options?.nocache)}`,
    ReposEnvelopeSchema
  );
  return data.repos;
}

/**
 * Fetches the access graph for a project.
 */
export async function fetchGraph(
  projectName: string,
  options?: { nocache?: boolean }
): Promise<AccessGraph> {
  const parsed = await apiFetch(
    `/api/graph?${projectQuery(projectName, options?.nocache)}`,
    AccessGraphSchema
  );
  return {
    ...parsed,
    nodes: parsed.nodes.map(normalizeGraphNode),
    edges: parsed.edges.map(normalizeGraphEdge),
  };
}

/**
 * Fetches an access trace for a user/repo pair within a project.
 */
export async function fetchTrace(
  projectName: string,
  userId: string,
  repoId: string
): Promise<AccessTrace> {
  const parsed = await apiFetch(
    `/api/trace?${traceQuery(projectName, userId, repoId)}`,
    AccessTraceSchema
  );
  return {
    ...parsed,
    steps: parsed.steps.map(normalizeTraceStep),
  };
}

/**
 * Forces a fresh project snapshot on the server and returns updated graph + lists.
 */
export async function refreshProjectData(projectName: string): Promise<{
  graph: AccessGraph;
  users: UserSummary[];
  repos: RepoSummary[];
}> {
  const graph = await fetchGraph(projectName, { nocache: true });
  const [users, repos] = await Promise.all([
    fetchUsers(projectName, { nocache: true }),
    fetchRepos(projectName, { nocache: true }),
  ]);
  return { graph, users, repos };
}

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Current Azure DevOps connection (session cookie or server env fallback).
 */
export async function fetchSessionStatus(): Promise<SessionStatus> {
  return apiFetch("/api/session/status", SessionStatusSchema);
}

const ConnectOkSchema = z.object({
  ok: z.literal(true),
  org: z.string(),
});

/**
 * Validates credentials server-side and opens an HttpOnly session.
 */
export async function connectSession(params: {
  org: string;
  pat: string;
}): Promise<void> {
  await apiFetch("/api/session/connect", ConnectOkSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ org: params.org, pat: params.pat }),
  });
}

/**
 * Clears server session and cookie.
 */
export async function disconnectSession(): Promise<void> {
  const res = await fetch("/api/session", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 204) {
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const msg = errorMessageFromBody(json, res.statusText);
    throw new ApiHttpError(msg ?? "Disconnect failed", res.status, json);
  }
}

/**
 * React Query hook for session / env connection state.
 */
export function useSessionStatus(): UseQueryResult<SessionStatus, Error> {
  return useQuery({
    queryKey: QUERY_KEYS.sessionStatus,
    queryFn: fetchSessionStatus,
    staleTime: 30_000,
  });
}

/**
 * React Query hook for the project list (org scope).
 */
export function useProjects(): UseQueryResult<ProjectSummary[], Error> {
  return useQuery({
    queryKey: QUERY_KEYS.projects,
    queryFn: fetchProjects,
    staleTime: 60_000,
  });
}

/**
 * React Query hook for users in a project. Disabled until `projectName` is set.
 */
export function useUsers(projectName: string | null): UseQueryResult<UserSummary[], Error> {
  return useQuery({
    queryKey: projectName !== null ? QUERY_KEYS.users(projectName) : ["insightops", "users", "none"],
    queryFn: () => {
      if (projectName === null) {
        throw new Error("useUsers: projectName is required");
      }
      return fetchUsers(projectName);
    },
    enabled: projectName !== null,
    staleTime: 120_000,
  });
}

/**
 * React Query hook for repositories in a project. Disabled until `projectName` is set.
 */
export function useRepos(projectName: string | null): UseQueryResult<RepoSummary[], Error> {
  return useQuery({
    queryKey: projectName !== null ? QUERY_KEYS.repos(projectName) : ["insightops", "repos", "none"],
    queryFn: () => {
      if (projectName === null) {
        throw new Error("useRepos: projectName is required");
      }
      return fetchRepos(projectName);
    },
    enabled: projectName !== null,
    staleTime: 120_000,
  });
}

/**
 * React Query hook for the access graph. Disabled until `projectName` is set.
 */
export function useGraph(projectName: string | null): UseQueryResult<AccessGraph, Error> {
  return useQuery({
    queryKey: projectName !== null ? QUERY_KEYS.graph(projectName) : ["insightops", "graph", "none"],
    queryFn: () => {
      if (projectName === null) {
        throw new Error("useGraph: projectName is required");
      }
      return fetchGraph(projectName);
    },
    enabled: projectName !== null,
    staleTime: 120_000,
  });
}

/**
 * React Query hook for access trace. Disabled until all identifiers are set.
 */
export function useTrace(
  projectName: string | null,
  userId: string | null,
  repoId: string | null
): UseQueryResult<AccessTrace, Error> {
  const enabled = projectName !== null && userId !== null && repoId !== null;
  return useQuery({
    queryKey:
      enabled
        ? QUERY_KEYS.trace(projectName, userId, repoId)
        : ["insightops", "trace", "none"],
    queryFn: () => {
      if (projectName === null || userId === null || repoId === null) {
        throw new Error("useTrace: projectName, userId, and repoId are required");
      }
      return fetchTrace(projectName, userId, repoId);
    },
    enabled,
    staleTime: 60_000,
  });
}
