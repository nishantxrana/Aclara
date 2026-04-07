import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { API_VERSION } from "@/constants/azdo.constants";
import { createLogger } from "@/lib/logger";
import type { Cache } from "@/middleware/cache";
import { type AzdoRepository, AzdoRepositorySchema } from "@/types/azdo.types";

const RepositoriesEnvelopeSchema = z.object({
  value: z.array(AzdoRepositorySchema),
});

function parseEnvelope<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${context}: invalid Azure DevOps response`);
  }
  return parsed.data;
}

const log = createLogger("GitService");

/**
 * Git repositories for a project (cached via injected cache; TTL set at construction).
 */
export class GitService {
  constructor(
    private readonly org: string,
    private readonly cacheNs: string,
    private readonly client: AzureDevOpsClient,
    private readonly reposByProjectCache: Cache<readonly AzdoRepository[]>,
    private readonly repoByIdCache: Cache<AzdoRepository>
  ) {}

  /**
   * Lists git repositories in the given project (URL-encoded project name or id).
   */
  async listRepositories(project: string): Promise<readonly AzdoRepository[]> {
    const cacheKey = `${this.cacheNs}:git:repos:${encodeURIComponent(project)}`;
    const hit = this.reposByProjectCache.get(cacheKey);
    if (hit !== null) {
      log.debug("git.list_repos.cache_hit", {
        project,
        count: hit.length,
      });
      return hit;
    }

    const base = this.client.getBaseUrl();
    const segment = encodeURIComponent(project);
    const url = `${base}/${segment}/_apis/git/repositories`;
    const data = await this.client.get<unknown>(url, { "api-version": API_VERSION });
    const parsed = parseEnvelope(RepositoriesEnvelopeSchema, data, "listRepositories");
    log.info("git.list_repos.fetched", {
      project,
      count: parsed.value.length,
    });
    this.reposByProjectCache.set(cacheKey, parsed.value);
    return parsed.value;
  }

  /**
   * Fetches a single repository by id (avoids listing all repos for trace validation).
   */
  async getRepository(project: string, repositoryId: string): Promise<AzdoRepository> {
    const cacheKey = `${this.cacheNs}:git:repo:${encodeURIComponent(project)}:${repositoryId}`;
    const hit = this.repoByIdCache.get(cacheKey);
    if (hit !== null) {
      log.debug("git.get_repository.cache_hit", { project, repositoryId });
      return hit;
    }

    const base = this.client.getBaseUrl();
    const projectSeg = encodeURIComponent(project);
    const repoSeg = encodeURIComponent(repositoryId);
    const url = `${base}/${projectSeg}/_apis/git/repositories/${repoSeg}`;
    const data = await this.client.get<unknown>(url, { "api-version": API_VERSION });
    const parsed = parseEnvelope(AzdoRepositorySchema, data, "getRepository");
    log.info("git.get_repository.fetched", { project, repositoryId, name: parsed.name });
    this.repoByIdCache.set(cacheKey, parsed);
    return parsed;
  }
}
