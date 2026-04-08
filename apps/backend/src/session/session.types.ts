/**
 * Stored server-side session after successful Azure DevOps credential validation.
 */
export interface AclaraSessionRecord {
  readonly id: string;
  readonly org: string;
  /** PAT is never serialized or logged. */
  readonly pat: string;
  readonly createdAtMs: number;
}
