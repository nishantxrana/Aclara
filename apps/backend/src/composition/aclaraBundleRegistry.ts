import type { IAclaraBundle } from "@/composition/createAclaraBundle";

/**
 * Holds per-session Aclara service bundles (AzDO client + services).
 */
export class AclaraBundleRegistry {
  private readonly bundles = new Map<string, IAclaraBundle>();

  set(sessionId: string, bundle: IAclaraBundle): void {
    this.bundles.set(sessionId, bundle);
  }

  get(sessionId: string): IAclaraBundle | undefined {
    return this.bundles.get(sessionId);
  }

  delete(sessionId: string): void {
    this.bundles.delete(sessionId);
  }
}
