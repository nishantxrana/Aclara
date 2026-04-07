import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { API_VERSION } from "@/constants/azdo.constants";
import { createLogger } from "@/lib/logger";
import { type AzdoIdentity } from "@/types/azdo.types";

/**
 * IMS Read Identities uses GET with comma-separated `descriptors`. Long batches exceed common
 * max URL lengths (~2k) and AzDO may respond 404; chunk by raw joined length (semicolons
 * become %3B so stay under budget).
 */
const MAX_DESCRIPTORS_PARAM_CHARS = 1500;

const log = createLogger("IdentityService");

/** Root envelope only; `value[]` items are normalized (IMS uses nulls, `providerDisplayName`, etc.). */
const IdentitiesEnvelopeLooseSchema = z.object({
  value: z.unknown(),
  count: z.number().optional(),
});

function optionalString(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) {
    return undefined;
  }
  return raw;
}

/**
 * Maps one IMS identity object to our internal shape; drops invalid rows instead of failing the batch.
 */
function normalizeImsIdentity(raw: Record<string, unknown>): AzdoIdentity | null {
  const descriptor = optionalString(raw["descriptor"]);
  if (descriptor === undefined) {
    return null;
  }
  const subjectDescriptor = optionalString(raw["subjectDescriptor"]);
  const principalName = optionalString(raw["principalName"]);
  const displayName =
    optionalString(raw["displayName"]) ?? optionalString(raw["providerDisplayName"]);
  const mailAddress = optionalString(raw["mailAddress"]);
  return {
    descriptor,
    ...(subjectDescriptor !== undefined ? { subjectDescriptor } : {}),
    ...(principalName !== undefined ? { principalName } : {}),
    ...(displayName !== undefined ? { displayName } : {}),
    ...(mailAddress !== undefined ? { mailAddress } : {}),
  };
}

function parseIdentitiesResponse(data: unknown, context: string): readonly AzdoIdentity[] {
  const envelope = IdentitiesEnvelopeLooseSchema.safeParse(data);
  if (!envelope.success) {
    log.warn("identity.parse.envelope_invalid", {
      context,
      zodMessage: envelope.error.message,
    });
    throw new Error(`${context}: invalid Azure DevOps response`);
  }
  const { value } = envelope.data;
  if (!Array.isArray(value)) {
    log.warn("identity.parse.value_not_array", { context, valueType: typeof value });
    throw new Error(`${context}: invalid Azure DevOps response`);
  }
  const out: AzdoIdentity[] = [];
  for (const item of value) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    const id = normalizeImsIdentity(item as Record<string, unknown>);
    if (id !== null) {
      out.push(id);
    }
  }
  return out;
}

function chunkDescriptorsForImsQuery(descriptors: readonly string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const d of descriptors) {
    const sep = cur.length > 0 ? 1 : 0;
    if (len + sep + d.length > MAX_DESCRIPTORS_PARAM_CHARS && cur.length > 0) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(d);
    len += sep + d.length;
  }
  if (cur.length > 0) {
    out.push(cur);
  }
  return out;
}

export type IdentityIndexEntry = {
  readonly identity: AzdoIdentity;
};

/**
 * Bidirectional descriptor maps plus a combined index keyed by both graph and legacy descriptors.
 */
export type IdentityResolutionMaps = {
  readonly graphToLegacy: ReadonlyMap<string, string>;
  readonly legacyToGraph: ReadonlyMap<string, string>;
  /** Same entry stored under subjectDescriptor (when present) and IMS descriptor. */
  readonly index: ReadonlyMap<string, IdentityIndexEntry>;
};

/**
 * Resolves descriptor batches via IMS and builds lookup maps for Graph ↔ security correlation.
 */
export class IdentityService {
  constructor(private readonly client: AzureDevOpsClient) {}

  /**
   * Resolves descriptors via IMS GET (comma-separated `descriptors`). Chunks requests so the
   * query string stays within URL limits (POST `/_apis/identities` returns 405 on vssps).
   */
  async resolveDescriptors(descriptors: readonly string[]): Promise<readonly AzdoIdentity[]> {
    const graph = this.client.getGraphUrl();
    const url = `${graph}/_apis/identities`;
    const unique = [...new Set(descriptors)];
    const results: AzdoIdentity[] = [];

    const batches = chunkDescriptorsForImsQuery(unique);
    log.debug("identity.resolve_descriptors.start", {
      uniqueDescriptorCount: unique.length,
      batchCount: batches.length,
    });

    let batchIndex = 0;
    for (const batch of batches) {
      const joined = batch.join(",");
      log.debug("identity.resolve_descriptors.batch", {
        batchIndex,
        batchSize: batch.length,
        joinedLength: joined.length,
      });
      batchIndex += 1;
      const data = await this.client.get<unknown>(url, {
        "api-version": API_VERSION,
        descriptors: joined,
      });
      const batchIdentities = parseIdentitiesResponse(data, "resolveDescriptors");
      results.push(...batchIdentities);
    }

    log.info("identity.resolve_descriptors.complete", {
      uniqueDescriptorCount: unique.length,
      identityCount: results.length,
    });
    return results;
  }

  /**
   * Builds bidirectional subject↔IMS descriptor maps and a combined lookup index.
   */
  buildMaps(identities: readonly AzdoIdentity[]): IdentityResolutionMaps {
    const graphToLegacy = new Map<string, string>();
    const legacyToGraph = new Map<string, string>();
    const index = new Map<string, IdentityIndexEntry>();

    for (const identity of identities) {
      const entry: IdentityIndexEntry = { identity };
      index.set(identity.descriptor, entry);

      if (identity.subjectDescriptor !== undefined && identity.subjectDescriptor !== "") {
        graphToLegacy.set(identity.subjectDescriptor, identity.descriptor);
        legacyToGraph.set(identity.descriptor, identity.subjectDescriptor);
        index.set(identity.subjectDescriptor, entry);
      }
    }

    return {
      graphToLegacy,
      legacyToGraph,
      index,
    };
  }

  /**
   * Resolves descriptors then returns maps + index in one step.
   */
  async resolveAndBuildMaps(descriptors: readonly string[]): Promise<IdentityResolutionMaps> {
    const identities = await this.resolveDescriptors(descriptors);
    return this.buildMaps(identities);
  }
}
