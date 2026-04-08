import { randomUUID } from "node:crypto";

import type { AclaraSessionRecord } from "@/session/session.types";

/**
 * In-memory session store. Suitable for single-process deployments (local tool / single instance).
 */
export class SessionStore {
  private readonly sessions = new Map<string, AclaraSessionRecord>();

  create(org: string, pat: string): AclaraSessionRecord {
    const id = randomUUID();
    const rec: AclaraSessionRecord = {
      id,
      org,
      pat,
      createdAtMs: Date.now(),
    };
    this.sessions.set(id, rec);
    return rec;
  }

  get(sessionId: string): AclaraSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
