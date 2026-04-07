import type { IInsightOpsBundle } from "@/composition/createInsightOpsBundle";

/**
 * Holds per-session InsightOps service bundles (AzDO client + services).
 */
export class InsightOpsBundleRegistry {
  private readonly bundles = new Map<string, IInsightOpsBundle>();

  set(sessionId: string, bundle: IInsightOpsBundle): void {
    this.bundles.set(sessionId, bundle);
  }

  get(sessionId: string): IInsightOpsBundle | undefined {
    return this.bundles.get(sessionId);
  }

  delete(sessionId: string): void {
    this.bundles.delete(sessionId);
  }
}
