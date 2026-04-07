import type { Response } from "express";

import { config } from "@/config/env";

function appendSetCookie(res: Response, cookie: string): void {
  const prev = res.getHeader("Set-Cookie");
  if (prev === undefined) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(prev)) {
    res.setHeader("Set-Cookie", [...prev, cookie]);
  } else {
    res.setHeader("Set-Cookie", [String(prev), cookie]);
  }
}

/**
 * Sets the InsightOps session id cookie (HttpOnly, SameSite=Lax).
 */
export function setSessionCookie(res: Response, sessionId: string): void {
  const maxAge = config.SESSION_MAX_AGE_SECONDS;
  const parts = [
    `${config.SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${String(maxAge)}`,
  ];
  appendSetCookie(res, parts.join("; "));
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie(res: Response): void {
  const parts = [
    `${config.SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  appendSetCookie(res, parts.join("; "));
}
