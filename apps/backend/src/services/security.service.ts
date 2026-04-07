import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import {
  ACL_TOKEN,
  API_VERSION,
  GIT_NAMESPACE_ID,
  OVER_PRIVILEGED_BITS,
} from "@/constants/azdo.constants";
import type { Cache } from "@/middleware/cache";
import {
  type AzdoAce,
  type AzdoAcl,
  AzdoAclSchema,
  type AzdoNamespaceAction,
  type AzdoSecurityNamespace,
  AzdoSecurityNamespaceSchema,
} from "@/types/azdo.types";

const NamespacesEnvelopeSchema = z.object({
  value: z.array(AzdoSecurityNamespaceSchema),
});

const AccessControlListsEnvelopeSchema = z.object({
  value: z.record(AzdoAclSchema),
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

function namesForBits(actions: readonly AzdoNamespaceAction[], bitmask: number): string[] {
  return actions
    .filter((a) => (bitmask & a.bit) === a.bit)
    .map((a) => a.displayName);
}

function explicitEffectiveBits(ace: AzdoAce): { explicitAllow: number; effectiveAllow: number } {
  const explicitAllow = ace.allow & ~ace.deny;
  if (ace.extendedInfo !== undefined) {
    const effectiveAllow =
      ace.extendedInfo.effectiveAllow & ~ace.extendedInfo.effectiveDeny;
    return { explicitAllow, effectiveAllow };
  }
  return { explicitAllow, effectiveAllow: explicitAllow };
}

function aceHasOverPrivilegedBit(ace: AzdoAce): boolean {
  const { explicitAllow, effectiveAllow } = explicitEffectiveBits(ace);
  for (const bit of OVER_PRIVILEGED_BITS) {
    if ((explicitAllow & bit) === bit) {
      return true;
    }
    if ((effectiveAllow & bit) === bit) {
      return true;
    }
  }
  return false;
}

export interface DecodedAcePermissions {
  readonly descriptor: string;
  readonly explicitAllowNames: string[];
  readonly explicitDenyNames: string[];
  readonly effectiveAllowNames: string[];
  readonly isOverPrivileged: boolean;
}

/**
 * Security namespaces, Git ACLs, permission decoding, and over-privilege checks.
 */
export class SecurityService {
  constructor(
    private readonly org: string,
    private readonly client: AzureDevOpsClient,
    private readonly namespacesCache: Cache<readonly AzdoSecurityNamespace[]>,
    private readonly aclCache: Cache<Readonly<Record<string, AzdoAcl>>>
  ) {}

  /**
   * Lists security namespaces (cached).
   */
  async listNamespaces(): Promise<readonly AzdoSecurityNamespace[]> {
    const cacheKey = `${this.org}:security:namespaces`;
    const hit = this.namespacesCache.get(cacheKey);
    if (hit !== null) {
      return hit;
    }

    const base = this.client.getBaseUrl();
    const url = `${base}/_apis/security/namespaces`;
    const data = await this.client.get<unknown>(url, { "api-version": API_VERSION });
    const parsed = parseEnvelope(NamespacesEnvelopeSchema, data, "listNamespaces");
    this.namespacesCache.set(cacheKey, parsed.value);
    return parsed.value;
  }

  /**
   * Returns the Git security namespace (by GUID), or undefined if missing.
   */
  async getGitNamespace(): Promise<AzdoSecurityNamespace | undefined> {
    const namespaces = await this.listNamespaces();
    return namespaces.find((n) => n.namespaceId === GIT_NAMESPACE_ID);
  }

  /**
   * Fetches ACLs for a token under a namespace (cached). Uses includeExtendedInfo for inheritance bits.
   */
  async getAccessControlLists(params: {
    namespaceId: string;
    token: string;
    recurse: boolean;
  }): Promise<Readonly<Record<string, AzdoAcl>>> {
    const { namespaceId, token, recurse } = params;
    const cacheKey = `${this.org}:acl:${namespaceId}:${token}:${recurse ? "1" : "0"}`;
    const hit = this.aclCache.get(cacheKey);
    if (hit !== null) {
      return hit;
    }

    const base = this.client.getBaseUrl();
    const url = `${base}/_apis/security/accesscontrollists/${namespaceId}`;
    const data = await this.client.get<unknown>(url, {
      "api-version": API_VERSION,
      tokens: token,
      recurse: recurse ? "true" : "false",
      includeExtendedInfo: "true",
    });
    const parsed = parseEnvelope(AccessControlListsEnvelopeSchema, data, "getAccessControlLists");
    this.aclCache.set(cacheKey, parsed.value);
    return parsed.value;
  }

  /**
   * Convenience: ACLs for project-level git token repoV2/{projectId}.
   */
  async getProjectGitAcls(projectId: string): Promise<Readonly<Record<string, AzdoAcl>>> {
    return this.getAccessControlLists({
      namespaceId: GIT_NAMESPACE_ID,
      token: ACL_TOKEN.projectGit(projectId),
      recurse: true,
    });
  }

  /**
   * Decodes ACE bitmasks using namespace action metadata.
   */
  decodeAce(ace: AzdoAce, actions: readonly AzdoNamespaceAction[]): DecodedAcePermissions {
    const { explicitAllow, effectiveAllow } = explicitEffectiveBits(ace);
    const explicitDenyBits = ace.deny;
    return {
      descriptor: ace.descriptor,
      explicitAllowNames: namesForBits(actions, explicitAllow),
      explicitDenyNames: namesForBits(actions, explicitDenyBits),
      effectiveAllowNames: namesForBits(actions, effectiveAllow),
      isOverPrivileged: aceHasOverPrivilegedBit(ace),
    };
  }
}
