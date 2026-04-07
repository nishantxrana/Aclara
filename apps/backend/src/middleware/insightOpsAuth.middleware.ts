import type { NextFunction, Request, Response } from "express";

import { config } from "@/config/env";
import { HttpError } from "@/errors/httpError";
import { getCookieValue } from "@/lib/cookieParse";
import type { SessionStore } from "@/session/session.store";

export type InsightOpsAuth =
  | { readonly kind: "session"; readonly sessionId: string; readonly org: string; readonly pat: string }
  | { readonly kind: "env"; readonly sessionId: "__env__"; readonly org: string; readonly pat: string };

/**
 * Resolves credentials from session cookie or optional env fallback (`__env__` virtual session).
 */
export function createInsightOpsAuthMiddleware(sessionStore: SessionStore) {
  return function insightOpsAuthMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    const cookieName = config.SESSION_COOKIE_NAME;
    const sid = getCookieValue(req.headers.cookie, cookieName);
    if (sid !== undefined && sid.length > 0) {
      const rec = sessionStore.get(sid);
      if (rec !== undefined) {
        req.insightOpsAuth = {
          kind: "session",
          sessionId: rec.id,
          org: rec.org,
          pat: rec.pat,
        };
        next();
        return;
      }
    }

    if (config.AZURE_DEVOPS_ORG !== null && config.AZURE_DEVOPS_PAT !== null) {
      req.insightOpsAuth = {
        kind: "env",
        sessionId: "__env__",
        org: config.AZURE_DEVOPS_ORG,
        pat: config.AZURE_DEVOPS_PAT,
      };
      next();
      return;
    }

    next();
  };
}

/**
 * Requires `req.insightOpsAuth` (session connect or env credentials).
 */
export function requireInsightOpsAuth(req: Request, _res: Response, next: NextFunction): void {
  if (req.insightOpsAuth === undefined) {
    next(
      new HttpError(
        "Not connected to Azure DevOps. POST /api/session/connect with org and pat, or set AZURE_DEVOPS_ORG and AZURE_DEVOPS_PAT.",
        401
      )
    );
    return;
  }
  next();
}
