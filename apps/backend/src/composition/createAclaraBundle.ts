import { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { credentialFingerprint } from "@/lib/credentialFingerprint";
import type { Cache } from "@/middleware/cache";
import { GraphBuilderService } from "@/services/graphBuilder.service";
import { GraphService } from "@/services/graph.service";
import { GitService } from "@/services/git.service";
import { IdentityService } from "@/services/identity.service";
import { SecurityService } from "@/services/security.service";
import type {
  AzdoAcl,
  AzdoGroup,
  AzdoProject,
  AzdoRepository,
  AzdoSecurityNamespace,
  AzdoUser,
} from "@/types/azdo.types";

export interface IAclaraBundle {
  readonly org: string;
  readonly graphService: GraphService;
  readonly securityService: SecurityService;
  readonly gitService: GitService;
  readonly identityService: IdentityService;
  readonly graphBuilder: GraphBuilderService;
}

export interface ICreateAclaraBundleParams {
  readonly org: string;
  readonly pat: string;
  readonly projectsCache: Cache<AzdoProject[]>;
  readonly groupsCache: Cache<AzdoGroup[]>;
  readonly usersCache: Cache<AzdoUser[]>;
  readonly membershipMapCache: Cache<ReadonlyMap<string, readonly string[]>>;
  readonly namespacesCache: Cache<readonly AzdoSecurityNamespace[]>;
  readonly aclCache: Cache<Readonly<Record<string, AzdoAcl>>>;
  readonly reposByProjectCache: Cache<readonly AzdoRepository[]>;
  readonly repoByIdCache: Cache<AzdoRepository>;
}

/**
 * Builds a per-credential bundle: AzDO client, services, and graph builder.
 * Shared TTL cache instances are keyed by `org + credentialFingerprint(pAT)` inside each service.
 */
export function createAclaraBundle(params: ICreateAclaraBundleParams): IAclaraBundle {
  const fp = credentialFingerprint(params.pat);
  const cacheNs = `${params.org}:${fp}`;
  const client = new AzureDevOpsClient({ org: params.org, pat: params.pat });
  const graphService = new GraphService(
    params.org,
    cacheNs,
    client,
    params.projectsCache,
    params.groupsCache,
    params.usersCache,
    params.membershipMapCache
  );
  const securityService = new SecurityService(
    params.org,
    cacheNs,
    client,
    params.namespacesCache,
    params.aclCache
  );
  const gitService = new GitService(
    params.org,
    cacheNs,
    client,
    params.reposByProjectCache,
    params.repoByIdCache
  );
  const identityService = new IdentityService(client);
  const graphBuilder = new GraphBuilderService(
    graphService,
    securityService,
    gitService,
    identityService
  );
  return {
    org: params.org,
    graphService,
    securityService,
    gitService,
    identityService,
    graphBuilder,
  };
}
