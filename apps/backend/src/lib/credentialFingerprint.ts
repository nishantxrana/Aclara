import { createHash } from "node:crypto";

/**
 * Short stable fingerprint for cache key scoping per PAT (never logged or exposed).
 */
export function credentialFingerprint(pat: string): string {
  return createHash("sha256").update(pat, "utf8").digest("hex").slice(0, 16);
}
