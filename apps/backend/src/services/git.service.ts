import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { API_VERSION } from "@/constants/azdo.constants";
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

/**
 * Git repositories for a project (cached via injected cache; TTL set at construction).
 */
export class GitService {
  constructor(
    private readonly org: string,
    private readonly client: AzureDevOpsClient,
    private readonly reposByProjectCache: Cache<readonly AzdoRepository[]>
  ) {}

  /**
   * Lists git repositories in the given project (URL-encoded project name or id).
   */
  async listRepositories(project: string): Promise<readonly AzdoRepository[]> {
    const cacheKey = `${this.org}:git:repos:${encodeURIComponent(project)}`;
    const hit = this.reposByProjectCache.get(cacheKey);
    if (hit !== null) {
      return hit;
    }

    const base = this.client.getBaseUrl();
    const segment = encodeURIComponent(project);
    const url = `${base}/${segment}/_apis/git/repositories`;
    const data = await this.client.get<unknown>(url, { "api-version": API_VERSION });
    const parsed = parseEnvelope(RepositoriesEnvelopeSchema, data, "listRepositories");
    this.reposByProjectCache.set(cacheKey, parsed.value);
    return parsed.value;
  }
}
