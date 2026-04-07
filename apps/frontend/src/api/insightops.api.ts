import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import type {
  AccessGraph,
  AccessTrace,
  GraphNode,
  TraceStep,
} from "@/types/graph.types";

/** Centralized React Query keys for InsightOps API resources. */
export const QUERY_KEYS = {
  projects: ["insightops", "projects"] as const,
  users: (projectName: string) => ["insightops", "users", projectName] as const,
  repos: (projectName: string) => ["insightops", "repos", projectName] as const,
  graph: (projectName: string) => ["insightops", "graph", projectName] as const,
  trace: (projectName: string, userId: string, repoId: string) =>
    ["insightops", "trace", projectName, userId, repoId] as const,
} as const;

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

const GraphNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "group", "repo"]),
  label: z.string(),
  metadata: z.record(z.unknown()),
  isOverPrivileged: z.boolean().optional(),
});

const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  permission: z.string(),
  level: PermissionLevelSchema,
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
type ParsedTraceStep = z.infer<typeof TraceStepSchema>;

function normalizeGraphNode(n: ParsedGraphNode): GraphNode {
  const base: GraphNode = {
    id: n.id,
    type: n.type,
    label: n.label,
    metadata: n.metadata,
  };
  if (n.isOverPrivileged === true) {
    return { ...base, isOverPrivileged: true };
  }
  return base;
}

function normalizeTraceStep(s: ParsedTraceStep): TraceStep {
  return {
    subjectId: s.subjectId,
    subjectType: s.subjectType,
    subjectLabel: s.subjectLabel,
    permission: s.permission,
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

/**
 * Thrown when the InsightOps API returns a non-2xx response.
 */
export class ApiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

/**
 * Performs a same-origin fetch to `/api/*` (proxied to the backend in dev) and parses JSON with Zod.
 */
export async function apiFetch<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(path);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json !== null &&
      "message" in json &&
      typeof (json as InsightOpsApiErrorBody).message === "string"
        ? (json as InsightOpsApiErrorBody).message
        : res.statusText;
    throw new ApiHttpError(msg ?? "Request failed", res.status, json);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Invalid API response for ${path}: ${parsed.error.message}`);
  }
  return parsed.data;
}

function projectQuery(projectName: string): string {
  const q = new URLSearchParams({ project: projectName });
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
export async function fetchUsers(projectName: string): Promise<UserSummary[]> {
  const data = await apiFetch(
    `/api/users?${projectQuery(projectName)}`,
    UsersEnvelopeSchema
  );
  return data.users;
}

/**
 * Fetches Git repositories for a project.
 */
export async function fetchRepos(projectName: string): Promise<RepoSummary[]> {
  const data = await apiFetch(
    `/api/repos?${projectQuery(projectName)}`,
    ReposEnvelopeSchema
  );
  return data.repos;
}

/**
 * Fetches the access graph for a project.
 */
export async function fetchGraph(projectName: string): Promise<AccessGraph> {
  const parsed = await apiFetch(
    `/api/graph?${projectQuery(projectName)}`,
    AccessGraphSchema
  );
  return {
    ...parsed,
    nodes: parsed.nodes.map(normalizeGraphNode),
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
    staleTime: 30_000,
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
    staleTime: 30_000,
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
    staleTime: 15_000,
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
    staleTime: 10_000,
  });
}
