import axios from "axios";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { config } from "@/config/env";
import { isHttpError } from "@/errors/httpError";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Last middleware: maps Zod, Axios/Azure DevOps, and HttpError to JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = config.NODE_ENV === "development";

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten(),
      ...(isDev ? { stack: err.stack } : {}),
    });
    return;
  }

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      res.status(401).json({
        error: "Unauthorized or forbidden when calling Azure DevOps",
        ...(isDev ? { stack: err.stack } : {}),
      });
      return;
    }
    if (status === 429) {
      res.setHeader("Retry-After", "5");
      res.status(429).json({
        error: "Azure DevOps rate limit exceeded",
        ...(isDev ? { stack: err.stack } : {}),
      });
      return;
    }
    if (status === 404) {
      res.status(404).json({
        error: "Resource not found in Azure DevOps",
        ...(isDev ? { stack: err.stack } : {}),
      });
      return;
    }
  }

  if (isHttpError(err)) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(isDev ? { stack: err.stack } : {}),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({
    error: isDev ? message : "Internal Server Error",
    ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
    ...(isDev && err !== null && !(err instanceof Error) && isRecord(err)
      ? { raw: String(err) }
      : {}),
  });
}
