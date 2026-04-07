import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "@/middleware/asyncHandler";
import type { GitService } from "@/services/git.service";

const ProjectQuerySchema = z.object({
  project: z.string().min(1, "project is required"),
});

export function createReposRouter(gitService: GitService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      const query = ProjectQuerySchema.parse(req.query);
      const repos = await gitService.listRepositories(query.project);
      res.json({
        project: query.project,
        repos: repos.map((r) => ({
          id: r.id,
          name: r.name,
          defaultBranch: r.defaultBranch,
          remoteUrl: r.remoteUrl,
        })),
      });
    })
  );

  return router;
}
