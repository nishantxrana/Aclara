import { Router, type Request, type Response } from "express";
import { z } from "zod";

import type { IInsightOpsBundle } from "@/composition/createInsightOpsBundle";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { ProjectSnapshotService } from "@/services/projectSnapshot.service";

const ProjectQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
});

export interface IGraphRouterDeps {
  readonly getBundle: (req: Request) => IInsightOpsBundle;
  readonly getSessionId: (req: Request) => string;
  readonly snapshotService: ProjectSnapshotService;
}

export function createGraphRouter(deps: IGraphRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = ProjectQuerySchema.parse(req.query);
      const nocache = req.query.nocache === "1" || req.query.nocache === "true";
      const snapshotKey = `${deps.getSessionId(req)}:${query.project}`;
      const graph = await deps.snapshotService.getAccessGraph(
        snapshotKey,
        nocache,
        () => deps.getBundle(req).graphBuilder.buildAccessGraph(query.project)
      );
      res.json(graph);
    })
  );

  return router;
}
