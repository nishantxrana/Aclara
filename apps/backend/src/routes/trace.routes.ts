import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { GraphBuilderService } from "@/services/graphBuilder.service";

const TraceQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
  userId: z.string().min(1, "userId is required"),
  repoId: z.string().min(1, "repoId is required"),
});

export function createTraceRouter(graphBuilder: GraphBuilderService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = TraceQuerySchema.parse(req.query);
      const trace = await graphBuilder.traceAccess(
        query.project,
        query.userId,
        query.repoId
      );
      res.json(trace);
    })
  );

  return router;
}
