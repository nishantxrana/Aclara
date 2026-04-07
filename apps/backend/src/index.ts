import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "@/config/env";

const app = express();

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(helmet());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    org: config.AZURE_DEVOPS_ORG,
    timestamp: new Date().toISOString(),
  });
});

function notImplemented(_req: Request, res: Response): void {
  res.status(501).json({ error: "Not Implemented" });
}

app.get("/api/projects", notImplemented);
app.get("/api/users", notImplemented);
app.get("/api/repos", notImplemented);
app.get("/api/graph", notImplemented);
app.get("/api/trace", notImplemented);

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  }
);

app.listen(config.PORT, () => {
  console.log(
    `InsightOps backend listening on http://localhost:${String(config.PORT)}`
  );
});
