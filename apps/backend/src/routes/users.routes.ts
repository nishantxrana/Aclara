import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { HttpError } from "@/errors/httpError";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { GraphService } from "@/services/graph.service";

const ProjectQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
});

export function createUsersRouter(graphService: GraphService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = ProjectQuerySchema.parse(req.query);
      const projects = await graphService.listProjects();
      const exists = projects.some((p) => p.name === query.project);
      if (!exists) {
        throw new HttpError(`Project not found: ${query.project}`, 404);
      }

      const users = await graphService.listAllUsers();
      res.json({
        project: query.project,
        users: users.map((u) => ({
          id: u.subjectDescriptor ?? u.descriptor,
          displayName: u.displayName,
          principalName: u.principalName,
          mailAddress: u.mailAddress,
        })),
      });
    })
  );

  return router;
}
