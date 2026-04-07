import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { createLogger } from "@/lib/logger";

const log = createLogger("http");

/**
 * Assigns `req.requestId`, sets `X-Request-Id` on the response, and logs request completion.
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incoming = req.header("x-request-id");
  req.requestId =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim()
      : randomUUID();
  res.setHeader("X-Request-Id", req.requestId);

  const start = Date.now();
  res.on("finish", () => {
    log.info("http.request.complete", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
}
