import axios from "axios";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { config } from "@/config/env";
import { isHttpError } from "@/errors/httpError";
import { createLogger } from "@/lib/logger";

const log = createLogger("errorHandler");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withRequestId(
  req: Request,
  body: Record<string, unknown>
): Record<string, unknown> {
  const requestId = req.requestId;
  if (requestId === undefined || requestId.length === 0) {
    return body;
  }
  return { ...body, requestId };
}

/**
 * Last middleware: maps Zod, Axios/Azure DevOps, and HttpError to JSON responses.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = config.NODE_ENV === "development";
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    log.warn("request.validation_failed", {
      requestId,
      issues: err.issues.length,
    });
    res.status(400).json(
      withRequestId(req, {
        error: "Validation failed",
        details: err.flatten(),
        ...(isDev ? { stack: err.stack } : {}),
      })
    );
    return;
  }

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    log.error("request.azdo_http_error", {
      requestId,
      axiosStatus: status ?? "none",
      message: err.message,
      ...(isDev && err.stack !== undefined ? { stack: err.stack } : {}),
    });
    if (status === 401 || status === 403) {
      res.status(401).json(
        withRequestId(req, {
          error: "Unauthorized or forbidden when calling Azure DevOps",
          ...(isDev ? { stack: err.stack } : {}),
        })
      );
      return;
    }
    if (status === 429) {
      res.setHeader("Retry-After", "5");
      res.status(429).json(
        withRequestId(req, {
          error: "Azure DevOps rate limit exceeded",
          ...(isDev ? { stack: err.stack } : {}),
        })
      );
      return;
    }
    if (status === 404) {
      res.status(404).json(
        withRequestId(req, {
          error: "Resource not found in Azure DevOps",
          ...(isDev ? { stack: err.stack } : {}),
        })
      );
      return;
    }
  }

  if (isHttpError(err)) {
    log.warn("request.http_error", {
      requestId,
      statusCode: err.statusCode,
      message: err.message,
    });
    res.status(err.statusCode).json(
      withRequestId(req, {
        error: err.message,
        ...(isDev ? { stack: err.stack } : {}),
      })
    );
    return;
  }

  const message =
    err instanceof Error ? err.message : "Internal Server Error";
  log.error("request.unhandled_error", {
    requestId,
    message,
    ...(isDev && err instanceof Error && err.stack !== undefined
      ? { stack: err.stack }
      : {}),
  });
  res.status(500).json(
    withRequestId(req, {
      error: isDev ? message : "Internal Server Error",
      ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
      ...(isDev && err !== null && !(err instanceof Error) && isRecord(err)
        ? { raw: String(err) }
        : {}),
    })
  );
}
