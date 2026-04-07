import { Router, type Request, type Response } from "express";
import type { GraphService } from "@/services/graph.service";
import { asyncHandler } from "@/middleware/asyncHandler";

export function createProjectsRouter(graphService: GraphService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req: Request, res: Response) => {
      const projects = await graphService.listProjects();
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
