import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { AzureDevOpsClient } from "@/clients/azureDevOps.client";
import { config } from "@/config/env";
import { createLogger } from "@/lib/logger";
import { createCache } from "@/middleware/cache";
import { errorHandler } from "@/middleware/errorHandler";
import { requestContextMiddleware } from "@/middleware/requestContext";
import { createGraphRouter } from "@/routes/graph.routes";
import { createProjectsRouter } from "@/routes/projects.routes";
import { createReposRouter } from "@/routes/repos.routes";
import { createTraceRouter } from "@/routes/trace.routes";
import { createUsersRouter } from "@/routes/users.routes";
import { GraphBuilderService } from "@/services/graphBuilder.service";
import { GraphService } from "@/services/graph.service";
import { GitService } from "@/services/git.service";
import { IdentityService } from "@/services/identity.service";
import { SecurityService } from "@/services/security.service";
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

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(helmet());
app.use(express.json());
app.use(requestContextMiddleware);

const client = new AzureDevOpsClient({
  org: config.AZURE_DEVOPS_ORG,
  pat: config.AZURE_DEVOPS_PAT,
});

const projectsCache = createCache<AzdoProject[]>(config.CACHE_TTL_GROUPS);
const groupsCache = createCache<AzdoGroup[]>(config.CACHE_TTL_GROUPS);
const usersCache = createCache<AzdoUser[]>(config.CACHE_TTL_USERS);
const membershipMapCache = createCache<ReadonlyMap<string, readonly string[]>>(
  config.CACHE_TTL_USERS
);
const namespacesCache = createCache<readonly AzdoSecurityNamespace[]>(
  config.CACHE_TTL_ACLS
);
const aclCache = createCache<Readonly<Record<string, AzdoAcl>>>(
  config.CACHE_TTL_ACLS
);
const reposByProjectCache = createCache<readonly AzdoRepository[]>(
  config.CACHE_TTL_GROUPS
);

const graphService = new GraphService(
  config.AZURE_DEVOPS_ORG,
  client,
  projectsCache,
  groupsCache,
  usersCache,
  membershipMapCache
);

const securityService = new SecurityService(
  config.AZURE_DEVOPS_ORG,
  client,
  namespacesCache,
  aclCache
);

const gitService = new GitService(
  config.AZURE_DEVOPS_ORG,
  client,
  reposByProjectCache
);

const identityService = new IdentityService(client);

const graphBuilderService = new GraphBuilderService(
  graphService,
  securityService,
  gitService,
  identityService
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    org: config.AZURE_DEVOPS_ORG,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/projects", createProjectsRouter(graphService));
app.use("/api/users", createUsersRouter(graphService));
app.use("/api/repos", createReposRouter(gitService));
app.use("/api/graph", createGraphRouter(graphBuilderService));
app.use("/api/trace", createTraceRouter(graphBuilderService));

app.use(errorHandler);

app.listen(config.PORT, () => {
  rootLog.info("server.listening", {
    port: config.PORT,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    logFormat: config.LOG_FORMAT,
  });
});
