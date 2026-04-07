import { Router, type Request, type Response } from "express";
import { z } from "zod";

import type { IInsightOpsBundle } from "@/composition/createInsightOpsBundle";
import { HttpError } from "@/errors/httpError";
import { asyncHandler } from "@/middleware/asyncHandler";
import { reposFromAccessGraph } from "@/services/graphDerivedLists.service";
import type { ProjectSnapshotService } from "@/services/projectSnapshot.service";

const ProjectQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
});

export interface IReposRouterDeps {
  readonly getBundle: (req: Request) => IInsightOpsBundle;
  readonly getSessionId: (req: Request) => string;
  readonly snapshotService: ProjectSnapshotService;
}

export function createReposRouter(deps: IReposRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = ProjectQuerySchema.parse(req.query);
      const bundle = deps.getBundle(req);
      const projects = await bundle.graphService.listProjects();
      const exists = projects.some((p) => p.name === query.project);
      if (!exists) {
        throw new HttpError(`Project not found: ${query.project}`, 404);
      }
      const nocache = req.query.nocache === "1" || req.query.nocache === "true";
      const snapshotKey = `${deps.getSessionId(req)}:${query.project}`;
      const graph = await deps.snapshotService.getAccessGraph(
        snapshotKey,
        nocache,
        () => bundle.graphBuilder.buildAccessGraph(query.project)
      );
      const repos = reposFromAccessGraph(graph);
      res.json({
        project: query.project,
        repos,
      });
    })
  );

  return router;
}
