import { randomUUID } from "node:crypto";

import type { InsightOpsSessionRecord } from "@/session/session.types";

/**
 * In-memory session store. Suitable for single-process deployments (local tool / single instance).
 */
export class SessionStore {
  private readonly sessions = new Map<string, InsightOpsSessionRecord>();

  create(org: string, pat: string): InsightOpsSessionRecord {
    const id = randomUUID();
    const rec: InsightOpsSessionRecord = {
      id,
      org,
      pat,
      createdAtMs: Date.now(),
    };
    this.sessions.set(id, rec);
    return rec;
  }

  get(sessionId: string): InsightOpsSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
