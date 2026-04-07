import { z } from "zod";
import type { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { API_VERSION } from "@/constants/azdo.constants";
import { createLogger } from "@/lib/logger";
import {
  type AzdoIdentity,
  AzdoIdentitiesResponseSchema,
} from "@/types/azdo.types";

const BATCH_SIZE = 50;

const log = createLogger("IdentityService");

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
   * Resolves up to 50 descriptors per HTTP call; repeats until all batches are done.
   */
  async resolveDescriptors(descriptors: readonly string[]): Promise<readonly AzdoIdentity[]> {
    const graph = this.client.getGraphUrl();
    const url = `${graph}/_apis/identities`;
    const unique = [...new Set(descriptors)];
    const results: AzdoIdentity[] = [];

    const urlWithVersion = `${url}?api-version=${API_VERSION}`;
    const batchCount = Math.ceil(unique.length / BATCH_SIZE) || 0;
    log.debug("identity.resolve_descriptors.start", {
      uniqueDescriptorCount: unique.length,
      batchCount,
    });

    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      const batch = unique.slice(i, i + BATCH_SIZE);
      const data = await this.client.post<unknown>(urlWithVersion, {
        descriptors: batch,
      });
      const parsed = parseEnvelope(AzdoIdentitiesResponseSchema, data, "resolveDescriptors");
      results.push(...parsed.value);
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
