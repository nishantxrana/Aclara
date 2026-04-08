import fs from "node:fs";
import path from "node:path";

import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { createAclaraBundle, type IAclaraBundle } from "@/composition/createAclaraBundle";
import { AclaraBundleRegistry } from "@/composition/aclaraBundleRegistry";
import { config } from "@/config/env";
import { HttpError } from "@/errors/httpError";
import { createLogger } from "@/lib/logger";
import { createCache } from "@/middleware/cache";
import { errorHandler } from "@/middleware/errorHandler";
import {
  createAclaraAuthMiddleware,
  requireAclaraAuth,
} from "@/middleware/aclaraAuth.middleware";
import { requestContextMiddleware } from "@/middleware/requestContext";
import { createGraphRouter } from "@/routes/graph.routes";
import { createProjectsRouter } from "@/routes/projects.routes";
import { createReposRouter } from "@/routes/repos.routes";
import { createSessionRouter } from "@/routes/session.routes";
import { createTraceRouter } from "@/routes/trace.routes";
import { createUsersRouter } from "@/routes/users.routes";
import { ProjectSnapshotService } from "@/services/projectSnapshot.service";
import { SessionStore } from "@/session/session.store";
import type {
  AzdoAcl,
  AzdoGroup,
  AzdoProject,
  AzdoRepository,
  AzdoSecurityNamespace,
  AzdoUser,
} from "@/types/azdo.types";

const app = express();
const rootLog = createLogger("server");

app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(
  config.NODE_ENV === "production"
    ? helmet({
        // Vite-built SPA: disable default CSP (hashed asset names vary each build).
        contentSecurityPolicy: false,
      })
    : helmet()
);
app.use(express.json());
app.use(requestContextMiddleware);

const sessionStore = new SessionStore();
const bundleRegistry = new AclaraBundleRegistry();

const projectsCache = createCache<AzdoProject[]>(config.CACHE_TTL_GROUPS);
const groupsCache = createCache<AzdoGroup[]>(config.CACHE_TTL_GROUPS);
const usersCache = createCache<AzdoUser[]>(config.CACHE_TTL_USERS);
const membershipMapCache = createCache<ReadonlyMap<string, readonly string[]>>(
  config.CACHE_TTL_USERS
);
const namespacesCache = createCache<readonly AzdoSecurityNamespace[]>(
  config.CACHE_TTL_ACLS
);
const aclCache = createCache<Readonly<Record<string, AzdoAcl>>>(config.CACHE_TTL_ACLS);
const reposByProjectCache = createCache<readonly AzdoRepository[]>(
  config.CACHE_TTL_GROUPS
);
const repoByIdCache = createCache<AzdoRepository>(config.CACHE_TTL_GROUPS);

const snapshotTtlMs = config.CACHE_TTL_GROUPS * 1000;
const snapshotService = new ProjectSnapshotService(snapshotTtlMs);

const sharedBundleParams = {
  projectsCache,
  groupsCache,
  usersCache,
  membershipMapCache,
  namespacesCache,
  aclCache,
  reposByProjectCache,
  repoByIdCache,
} as const;

app.use(createAclaraAuthMiddleware(sessionStore));

app.use(
  "/api/session",
  createSessionRouter({
    sessionStore,
    bundleRegistry,
    snapshotService,
    ...sharedBundleParams,
  })
);

function getBundle(req: Request): IAclaraBundle {
  const auth = req.aclaraAuth;
  if (auth === undefined) {
    throw new HttpError("Unauthorized", 401);
  }
  let bundle = bundleRegistry.get(auth.sessionId);
  if (bundle === undefined) {
    if (auth.kind === "env") {
      bundle = createAclaraBundle({
        org: auth.org,
        pat: auth.pat,
        ...sharedBundleParams,
      });
      bundleRegistry.set("__env__", bundle);
    } else {
      throw new HttpError(
        "Session expired or server restarted. Connect again via POST /api/session/connect.",
        401
      );
    }
  }
  return bundle;
}

function getSessionId(req: Request): string {
  const a = req.aclaraAuth;
  if (a === undefined) {
    return "anonymous";
  }
  return a.sessionId;
}

app.get("/api/health", (req: Request, res: Response) => {
  const auth = req.aclaraAuth;
  res.json({
    status: "ok",
    org: auth !== undefined ? auth.org : null,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/projects", requireAclaraAuth, createProjectsRouter(getBundle));
app.use(
  "/api/users",
  requireAclaraAuth,
  createUsersRouter({
    getBundle,
    getSessionId,
    snapshotService,
  })
);
app.use(
  "/api/repos",
  requireAclaraAuth,
  createReposRouter({
    getBundle,
    getSessionId,
    snapshotService,
  })
);
app.use(
  "/api/graph",
  requireAclaraAuth,
  createGraphRouter({
    getBundle,
    getSessionId,
    snapshotService,
  })
);
app.use("/api/trace", requireAclaraAuth, createTraceRouter(getBundle));

app.use(errorHandler);

app.use((req: Request, res: Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next();
    return;
  }
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

const publicDir = path.join(__dirname, "..", "public");
const spaIndexHtml = path.join(publicDir, "index.html");
if (config.NODE_ENV === "production" && fs.existsSync(spaIndexHtml)) {
  app.use(express.static(publicDir));
  app.get("*", (req: Request, res: Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(spaIndexHtml);
  });
}

app.listen(config.PORT, () => {
  rootLog.info("server.listening", {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    logFormat: config.LOG_FORMAT,
  });
});
