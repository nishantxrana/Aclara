import { Router, type Request, type Response } from "express";
import { z } from "zod";

import type { IAclaraBundle } from "@/composition/createAclaraBundle";
import { asyncHandler } from "@/middleware/asyncHandler";

const TraceQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
  userId: z.string().min(1, "userId is required"),
  repoId: z.string().min(1, "repoId is required"),
});

export function createTraceRouter(getBundle: (req: Request) => IAclaraBundle): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = TraceQuerySchema.parse(req.query);
      const trace = await getBundle(req).graphBuilder.traceAccess(
        query.project,
        query.userId,
        query.repoId
      );
      res.json(trace);
    })
  );

  return router;
}
