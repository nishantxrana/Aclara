import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { GraphBuilderService } from "@/services/graphBuilder.service";

const ProjectQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
});

export function createGraphRouter(graphBuilder: GraphBuilderService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = ProjectQuerySchema.parse(req.query);
      const graph = await graphBuilder.buildAccessGraph(query.project);
      res.json(graph);
    })
  );

  return router;
}
