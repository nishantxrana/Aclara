import { Router, type Request, type Response } from "express";

import type { IInsightOpsBundle } from "@/composition/createInsightOpsBundle";
import { asyncHandler } from "@/middleware/asyncHandler";

export function createProjectsRouter(getBundle: (req: Request) => IInsightOpsBundle): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const bundle = getBundle(req);
      const projects = await bundle.graphService.listProjects();
      res.json({
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          state: p.state,
          visibility: p.visibility,
        })),
      });
    })
  );

  return router;
}
