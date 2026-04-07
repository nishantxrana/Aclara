import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import {
  ACL_TOKEN,
  API_VERSION,
  GIT_NAMESPACE_ID,
  OVER_PRIVILEGED_BITS,
} from "@/constants/azdo.constants";
import { createLogger } from "@/lib/logger";
import type { Cache } from "@/middleware/cache";
import {
  type AzdoAce,
  type AzdoAcl,
  type AzdoNamespaceAction,
  type AzdoSecurityNamespace,
} from "@/types/azdo.types";

/** Root envelope only; `value` is normalized manually (AzDO payloads vary by tenant/version). */
const SecurityNamespacesEnvelopeLooseSchema = z.object({
  value: z.unknown(),
  count: z.number().optional(),
});

/** AzDO returns ACL `value` as an array of lists (see REST docs), not a token-keyed record. */
const AccessControlListsEnvelopeLooseSchema = z.object({
  value: z.unknown(),
  count: z.number().optional(),
});

const log = createLogger("SecurityService");

/**
 * Normalizes one security namespace from the REST payload without strict Zod (avoids 500s on minor schema drift).
 */
function normalizeSecurityNamespace(raw: Record<string, unknown>): AzdoSecurityNamespace | null {
  const idRaw = raw["namespaceId"];
  if (idRaw === undefined || idRaw === null) {
    return null;
  }
  const namespaceId = String(idRaw);
  const nameField = raw["name"];
  const name = typeof nameField === "string" ? nameField : "";
  const dn = raw["displayName"];
  const displayName = typeof dn === "string" ? dn : undefined;

  const actionsField = raw["actions"];
  const actionsRaw: unknown[] = Array.isArray(actionsField) ? actionsField : [];
  const actions: AzdoNamespaceAction[] = [];
  for (const entry of actionsRaw) {
    if (entry === null || typeof entry !== "object") {
      continue;
    }
    const o = entry as Record<string, unknown>;
    const bit = Number(o["bit"]);
    if (!Number.isFinite(bit)) {
      continue;
    }
    const n = o["name"];
    const actionName = typeof n === "string" ? n : "";
    const disp = o["displayName"];
    const actionDisplay = typeof disp === "string" ? disp : undefined;
    const nsRef = o["namespaceId"];
    const actionNs =
      typeof nsRef === "string"
        ? nsRef
        : nsRef !== undefined && nsRef !== null
          ? String(nsRef)
          : undefined;
    const label = actionName.length > 0 ? actionName : actionDisplay ?? `bit_${String(bit)}`;
    actions.push({
      bit,
      name: label,
      ...(actionDisplay !== undefined ? { displayName: actionDisplay } : {}),
      ...(actionNs !== undefined ? { namespaceId: actionNs } : {}),
    });
  }

  return {
    namespaceId,
    name,
    ...(displayName !== undefined ? { displayName } : {}),
    actions,
  };
}

function parseSecurityNamespacesResponse(data: unknown): readonly AzdoSecurityNamespace[] {
  const envelope = SecurityNamespacesEnvelopeLooseSchema.safeParse(data);
  if (!envelope.success) {
    log.warn("security.list_namespaces.envelope_invalid", {
      zodMessage: envelope.error.message,
    });
    throw new Error("listNamespaces: invalid Azure DevOps response");
  }
  const { value } = envelope.data;
  if (!Array.isArray(value)) {
    log.warn("security.list_namespaces.value_not_array", {
      valueType: typeof value,
    });
    throw new Error("listNamespaces: invalid Azure DevOps response");
  }
  const out: AzdoSecurityNamespace[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i];
    if (item === null || typeof item !== "object") {
      continue;
    }
    const ns = normalizeSecurityNamespace(item as Record<string, unknown>);
    if (ns !== null) {
      out.push(ns);
    }
  }
  return out;
}

function normalizeAce(raw: Record<string, unknown>): AzdoAce | null {
  const desc = raw["descriptor"];
  if (typeof desc !== "string" || desc.length === 0) {
    return null;
  }
  const allowNum = Number(raw["allow"]);
  const denyNum = Number(raw["deny"]);
  const allow = Number.isFinite(allowNum) ? allowNum : 0;
  const deny = Number.isFinite(denyNum) ? denyNum : 0;
  const ext = raw["extendedInfo"];
  if (ext !== null && typeof ext === "object" && !Array.isArray(ext)) {
    const eo = ext as Record<string, unknown>;
    const ea = Number(eo["effectiveAllow"]);
    const ed = Number(eo["effectiveDeny"]);
    const effectiveAllow = Number.isFinite(ea) ? ea : 0;
    const effectiveDeny = Number.isFinite(ed) ? ed : 0;
    return {
      descriptor: desc,
      allow,
      deny,
      extendedInfo: { effectiveAllow, effectiveDeny },
    };
  }
  return { descriptor: desc, allow, deny };
}

function normalizeAcl(raw: Record<string, unknown>): AzdoAcl | null {
  const tokenRaw = raw["token"];
  if (typeof tokenRaw !== "string" || tokenRaw.length === 0) {
    return null;
  }
  const inheritRaw = raw["inheritPermissions"];
  let inheritPermissions = true;
  if (typeof inheritRaw === "boolean") {
    inheritPermissions = inheritRaw;
  } else if (inheritRaw === "false") {
    inheritPermissions = false;
  } else if (inheritRaw === "true") {
    inheritPermissions = true;
  }
  const acesField = raw["acesDictionary"];
  const acesDictionary: Record<string, AzdoAce> = {};
  if (acesField !== null && typeof acesField === "object" && !Array.isArray(acesField)) {
    for (const [key, aceVal] of Object.entries(acesField as Record<string, unknown>)) {
      if (aceVal === null || typeof aceVal !== "object" || Array.isArray(aceVal)) {
        continue;
      }
      const ace = normalizeAce(aceVal as Record<string, unknown>);
      if (ace !== null) {
        acesDictionary[key] = ace;
      }
    }
  }
  return { token: tokenRaw, inheritPermissions, acesDictionary };
}

/**
 * Parses ACL query response: `value` is an array per Azure DevOps REST 7.1; builds token → ACL map.
 */
function parseAccessControlListsResponse(data: unknown): Readonly<Record<string, AzdoAcl>> {
  const envelope = AccessControlListsEnvelopeLooseSchema.safeParse(data);
  if (!envelope.success) {
    log.warn("security.acl.envelope_invalid", {
      zodMessage: envelope.error.message,
    });
    throw new Error("getAccessControlLists: invalid Azure DevOps response");
  }
  const { value } = envelope.data;
  if (!Array.isArray(value)) {
    log.warn("security.acl.value_not_array", { valueType: typeof value });
    throw new Error("getAccessControlLists: invalid Azure DevOps response");
  }
  const out: Record<string, AzdoAcl> = {};
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const acl = normalizeAcl(item as Record<string, unknown>);
    if (acl !== null) {
      out[acl.token] = acl;
    }
  }
  return out;
}

function namesForBits(actions: readonly AzdoNamespaceAction[], bitmask: number): string[] {
  return actions
    .filter((a) => (bitmask & a.bit) === a.bit)
    .map((a) => a.displayName ?? a.name);
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
      log.debug("security.list_namespaces.cache_hit", { count: hit.length });
      return hit;
    }

    const base = this.client.getBaseUrl();
    const url = `${base}/_apis/securitynamespaces`;
    log.debug("security.list_namespaces.request", {
      path: "/_apis/securitynamespaces",
    });
    const data = await this.client.get<unknown>(url, { "api-version": API_VERSION });
    const namespaces = parseSecurityNamespacesResponse(data);
    log.info("security.list_namespaces.success", {
      namespaceCount: namespaces.length,
    });
    this.namespacesCache.set(cacheKey, namespaces);
    return namespaces;
  }

  /**
   * Returns the Git security namespace (by GUID), or undefined if missing.
   */
  async getGitNamespace(): Promise<AzdoSecurityNamespace | undefined> {
    const namespaces = await this.listNamespaces();
    const gitNs = namespaces.find(
      (n) => n.namespaceId.toLowerCase() === GIT_NAMESPACE_ID.toLowerCase()
    );
    if (gitNs === undefined) {
      log.warn("security.git_namespace.missing", {
        expectedNamespaceId: GIT_NAMESPACE_ID,
        availableCount: namespaces.length,
      });
    } else {
      log.debug("security.git_namespace.resolved", {
        namespaceId: gitNs.namespaceId,
        name: gitNs.name,
        actionCount: gitNs.actions.length,
      });
    }
    return gitNs;
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
      log.debug("security.acl.cache_hit", {
        namespaceId,
        recurse,
        aclTokenCount: Object.keys(hit).length,
      });
      return hit;
    }

    const base = this.client.getBaseUrl();
    const url = `${base}/_apis/accesscontrollists/${namespaceId}`;
    log.debug("security.acl.request", {
      path: `/_apis/accesscontrollists/${namespaceId}`,
      recurse,
      tokenLength: token.length,
    });
    const data = await this.client.get<unknown>(url, {
      "api-version": API_VERSION,
      tokens: token,
      recurse: recurse ? "true" : "false",
      includeExtendedInfo: "true",
    });
    const parsed = parseAccessControlListsResponse(data);
    const aclKeys = Object.keys(parsed);
    log.info("security.acl.success", {
      namespaceId,
      recurse,
      aclTokenCount: aclKeys.length,
      totalAceDescriptors: aclKeys.reduce(
        (acc, k) => acc + Object.keys(parsed[k]?.acesDictionary ?? {}).length,
        0
      ),
    });
    this.aclCache.set(cacheKey, parsed);
    return parsed;
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
