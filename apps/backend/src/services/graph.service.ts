import { createHash } from "node:crypto";
import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { API_VERSION, GRAPH_API_VERSION } from "@/constants/azdo.constants";
import { createLogger } from "@/lib/logger";
import type { Cache } from "@/middleware/cache";
import {
  type AzdoGroup,
  AzdoGroupSchema,
  type AzdoMembership,
  AzdoMembershipSchema,
  type AzdoProject,
  AzdoProjectSchema,
  type AzdoUser,
  AzdoUserSchema,
} from "@/types/azdo.types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseEach<TSchema extends z.ZodTypeAny>(
  items: unknown[],
  itemSchema: TSchema,
  context: string
): z.infer<TSchema>[] {
  const out: z.infer<TSchema>[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const parsed = itemSchema.safeParse(items[i]);
    if (!parsed.success) {
      throw new Error(`${context}[${String(i)}]: invalid item`);
    }
    out.push(parsed.data);
  }
  return out;
}

const log = createLogger("GraphService");

function membershipMapCacheKey(cacheNs: string, subjects: readonly string[]): string {
  const payload = [...subjects].sort().join("\0");
  const hash = createHash("sha256").update(payload).digest("hex");
  return `${cacheNs}:membershipMap:${hash}`;
}

/**
 * Graph and project listing: cached projects, groups, users; membership helpers; transitive group BFS.
 */
export class GraphService {
  /** In-session dedupe of Memberships/{subject} responses (same subject queried from graph build + trace). */
  private readonly membershipsUpMemo = new Map<string, readonly AzdoMembership[]>();

  constructor(
    private readonly org: string,
    /** Namespace for shared TTL caches (org + credential fingerprint). */
    private readonly cacheNs: string,
    private readonly client: AzureDevOpsClient,
    private readonly projectsCache: Cache<AzdoProject[]>,
    private readonly groupsCache: Cache<AzdoGroup[]>,
    private readonly usersCache: Cache<AzdoUser[]>,
    private readonly membershipMapCache: Cache<ReadonlyMap<string, readonly string[]>>
  ) {}

  /**
   * Lists all projects for the org (paginated, cached).
   */
  async listProjects(): Promise<readonly AzdoProject[]> {
    const cacheKey = `${this.cacheNs}:projects`;
    const hit = this.projectsCache.get(cacheKey);
    if (hit !== null) {
      log.debug("graph.list_projects.cache_hit", { count: hit.length });
      return hit;
    }

    const base = this.client.getBaseUrl();
    const url = `${base}/_apis/projects`;
    const rawPages = await this.client.paginate<unknown>(url, {
      "api-version": API_VERSION,
    });
    const projects = parseEach(rawPages, AzdoProjectSchema, "listProjects");
    log.info("graph.list_projects.fetched", { count: projects.length });
    this.projectsCache.set(cacheKey, projects);
    return projects;
  }

  /**
   * Lists all graph groups (paginated, cached).
   */
  async listAllGroups(): Promise<readonly AzdoGroup[]> {
    const cacheKey = `${this.cacheNs}:graph:groups`;
    const hit = this.groupsCache.get(cacheKey);
    if (hit !== null) {
      log.debug("graph.list_groups.cache_hit", { count: hit.length });
      return hit;
    }

    const graph = this.client.getGraphUrl();
    const url = `${graph}/_apis/graph/groups`;
    const rawPages = await this.client.paginate<unknown>(url, {
      "api-version": GRAPH_API_VERSION,
    });
    const groups = parseEach(rawPages, AzdoGroupSchema, "listAllGroups");
    log.info("graph.list_groups.fetched", { count: groups.length });
    this.groupsCache.set(cacheKey, groups);
    return groups;
  }

  /**
   * Lists all graph users (paginated, cached).
   */
  async listAllUsers(): Promise<readonly AzdoUser[]> {
    const cacheKey = `${this.cacheNs}:graph:users`;
    const hit = this.usersCache.get(cacheKey);
    if (hit !== null) {
      log.debug("graph.list_users.cache_hit", { count: hit.length });
      return hit;
    }

    const graph = this.client.getGraphUrl();
    const url = `${graph}/_apis/graph/users`;
    const rawPages = await this.client.paginate<unknown>(url, {
      "api-version": GRAPH_API_VERSION,
    });
    const users = parseEach(rawPages, AzdoUserSchema, "listAllUsers");
    log.info("graph.list_users.fetched", { count: users.length });
    this.usersCache.set(cacheKey, users);
    return users;
  }

  /**
   * Fetches direct parent containers for a subject (Graph direction Up). Deduplicated per service instance.
   */
  async fetchMembershipsUp(subjectDescriptor: string): Promise<readonly AzdoMembership[]> {
    const memoHit = this.membershipsUpMemo.get(subjectDescriptor);
    if (memoHit !== undefined) {
      return memoHit;
    }
    const graph = this.client.getGraphUrl();
    const path = encodeURIComponent(subjectDescriptor);
    const url = `${graph}/_apis/graph/Memberships/${path}`;
    const rawPages = await this.client.paginate<unknown>(url, {
      "api-version": GRAPH_API_VERSION,
      direction: "up",
    });
    const memberships = parseEach(rawPages, AzdoMembershipSchema, "fetchMembershipsUp");
    this.membershipsUpMemo.set(subjectDescriptor, memberships);
    await sleep(100);
    return memberships;
  }

  /**
   * Builds member → container descriptors by calling the Graph API sequentially with 100ms spacing.
   * Result is cached from the injected membership-map cache.
   */
  async getCachedMembershipMap(
    subjectDescriptors: readonly string[]
  ): Promise<ReadonlyMap<string, readonly string[]>> {
    const cacheKey = membershipMapCacheKey(this.cacheNs, subjectDescriptors);
    const hit = this.membershipMapCache.get(cacheKey);
    if (hit !== null) {
      log.debug("graph.membership_map.cache_hit", {
        subjectCount: subjectDescriptors.length,
      });
      return hit;
    }

    const map = new Map<string, string[]>();
    for (const subject of subjectDescriptors) {
      const memberships = await this.fetchMembershipsUp(subject);
      const containers = memberships.map((m) => m.containerDescriptor);
      map.set(subject, [...containers]);
    }

    const frozen = new Map<string, readonly string[]>(
      [...map.entries()].map(([k, v]) => [k, Object.freeze([...v])])
    );
    this.membershipMapCache.set(cacheKey, frozen);
    log.debug("graph.membership_map.built", {
      subjectCount: subjectDescriptors.length,
    });
    return frozen;
  }

  /**
   * BFS expansion of container descriptors reachable via downward membership, depth-capped at 10.
   */
  async expandTransitiveContainers(
    seedDescriptors: readonly string[],
    maxDepth = 10
  ): Promise<ReadonlySet<string>> {
    const allContainers = new Set<string>();
    const expandedSubjects = new Set<string>();
    const queue: { subject: string; depth: number }[] = seedDescriptors.map((subject) => ({
      subject,
      depth: 0,
    }));

    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) {
        break;
      }
      const { subject, depth } = item;
      if (expandedSubjects.has(subject)) {
        continue;
      }
      expandedSubjects.add(subject);

      if (depth >= maxDepth) {
        continue;
      }

      const memberships = await this.fetchMembershipsUp(subject);
      for (const m of memberships) {
        const container = m.containerDescriptor;
        allContainers.add(container);
        const nextDepth = depth + 1;
        if (nextDepth < maxDepth && !expandedSubjects.has(container)) {
          queue.push({ subject: container, depth: nextDepth });
        }
      }
    }

    return allContainers;
  }
}
