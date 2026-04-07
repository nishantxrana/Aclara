import { createLogger } from "@/lib/logger";
import type { AccessGraph } from "@/types/graph.types";

const log = createLogger("ProjectSnapshot");

export interface IProjectSnapshotEntry {
  readonly graph: AccessGraph;
  readonly expiresAtMs: number;
}

/**
 * Coalesces concurrent builds and TTL-caches the access graph per session + project.
 */
export class ProjectSnapshotService {
  private readonly data = new Map<string, IProjectSnapshotEntry>();
  private readonly inflight = new Map<string, Promise<AccessGraph>>();

  constructor(private readonly ttlMs: number) {}

  /**
   * Returns a cached graph or builds once; concurrent callers share the same promise.
   */
  async getAccessGraph(
    snapshotKey: string,
    bypassCache: boolean,
    build: () => Promise<AccessGraph>
  ): Promise<AccessGraph> {
    const now = Date.now();
    if (!bypassCache) {
      const hit = this.data.get(snapshotKey);
      if (hit !== undefined && hit.expiresAtMs > now) {
        log.debug("snapshot.cache_hit", { snapshotKey });
        return hit.graph;
      }
    } else {
      this.data.delete(snapshotKey);
      this.inflight.delete(snapshotKey);
    }

    const existingInflight = this.inflight.get(snapshotKey);
    if (existingInflight !== undefined) {
      log.debug("snapshot.inflight_join", { snapshotKey });
      return existingInflight;
    }

    log.debug("snapshot.build_start", { snapshotKey, bypassCache });
    const promise = build()
      .then((graph) => {
        this.data.set(snapshotKey, {
          graph,
          expiresAtMs: Date.now() + this.ttlMs,
        });
        this.inflight.delete(snapshotKey);
        log.debug("snapshot.build_complete", {
          snapshotKey,
          nodeCount: graph.nodes.length,
        });
        return graph;
      })
      .catch((err: unknown) => {
        this.inflight.delete(snapshotKey);
        throw err;
      });

    this.inflight.set(snapshotKey, promise);
    return promise;
  }

  /** Drop all snapshots for a session id prefix `sessionId:` */
  invalidateSession(sessionId: string): void {
    const prefix = `${sessionId}:`;
    for (const key of [...this.data.keys()]) {
      if (key.startsWith(prefix)) {
        this.data.delete(key);
      }
    }
    for (const key of [...this.inflight.keys()]) {
      if (key.startsWith(prefix)) {
        this.inflight.delete(key);
      }
    }
  }
}
