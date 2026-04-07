import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { createInsightOpsBundle } from "@/composition/createInsightOpsBundle";
import type { InsightOpsBundleRegistry } from "@/composition/insightOpsBundleRegistry";
import { config } from "@/config/env";
import { HttpError } from "@/errors/httpError";
import { asyncHandler } from "@/middleware/asyncHandler";
import { getCookieValue } from "@/lib/cookieParse";
import { clearSessionCookie, setSessionCookie } from "@/lib/sessionCookie";
import type { ProjectSnapshotService } from "@/services/projectSnapshot.service";
import type { SessionStore } from "@/session/session.store";
import type {
  AzdoAcl,
  AzdoGroup,
  AzdoProject,
  AzdoRepository,
  AzdoSecurityNamespace,
  AzdoUser,
} from "@/types/azdo.types";
import type { Cache } from "@/middleware/cache";

const ConnectBodySchema = z.object({
  org: z.string().min(1, "org is required"),
  pat: z.string().min(1, "pat is required"),
});

export interface ISessionRoutesDeps {
  readonly sessionStore: SessionStore;
  readonly bundleRegistry: InsightOpsBundleRegistry;
  readonly snapshotService: ProjectSnapshotService;
  readonly projectsCache: Cache<AzdoProject[]>;
  readonly groupsCache: Cache<AzdoGroup[]>;
  readonly usersCache: Cache<AzdoUser[]>;
  readonly membershipMapCache: Cache<ReadonlyMap<string, readonly string[]>>;
  readonly namespacesCache: Cache<readonly AzdoSecurityNamespace[]>;
  readonly aclCache: Cache<Readonly<Record<string, AzdoAcl>>>;
  readonly reposByProjectCache: Cache<readonly AzdoRepository[]>;
  readonly repoByIdCache: Cache<AzdoRepository>;
}

export function createSessionRouter(deps: ISessionRoutesDeps): Router {
  const router = Router();

  router.post(
    "/connect",
    asyncHandler(async (req: Request, res: Response) => {
      const body = ConnectBodySchema.parse(req.body);
      const bundle = createInsightOpsBundle({
        org: body.org,
        pat: body.pat,
        projectsCache: deps.projectsCache,
        groupsCache: deps.groupsCache,
        usersCache: deps.usersCache,
        membershipMapCache: deps.membershipMapCache,
        namespacesCache: deps.namespacesCache,
        aclCache: deps.aclCache,
        reposByProjectCache: deps.reposByProjectCache,
        repoByIdCache: deps.repoByIdCache,
      });
      try {
        await bundle.graphService.listProjects();
      } catch {
        throw new HttpError(
          "Could not validate Azure DevOps credentials (check org name and PAT scopes).",
          401
        );
      }
      const rec = deps.sessionStore.create(body.org, body.pat);
      deps.bundleRegistry.set(rec.id, bundle);
      setSessionCookie(res, rec.id);
      res.json({ ok: true as const, org: body.org });
    })
  );

  router.get(
    "/status",
    asyncHandler(async (req: Request, res: Response) => {
      const cookieName = config.SESSION_COOKIE_NAME;
      const decodedSid = getCookieValue(req.headers.cookie, cookieName);
      if (decodedSid !== undefined && decodedSid.length > 0) {
        const rec = deps.sessionStore.get(decodedSid);
        if (rec !== undefined) {
          res.json({
            connected: true as const,
            org: rec.org,
            source: "session" as const,
          });
          return;
        }
      }
      if (config.AZURE_DEVOPS_ORG !== null && config.AZURE_DEVOPS_PAT !== null) {
        res.json({
          connected: true as const,
          org: config.AZURE_DEVOPS_ORG,
          source: "env" as const,
        });
        return;
      }
      res.json({ connected: false as const });
    })
  );

  router.delete(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const decoded = getCookieValue(req.headers.cookie, config.SESSION_COOKIE_NAME);
      if (decoded !== undefined && decoded.length > 0) {
        deps.sessionStore.delete(decoded);
        deps.bundleRegistry.delete(decoded);
        deps.snapshotService.invalidateSession(decoded);
      }
      clearSessionCookie(res);
      res.status(204).end();
    })
  );

  return router;
}
