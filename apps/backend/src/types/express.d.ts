export {};

declare global {
  namespace Express {
    interface Request {
      /** Correlation id for logs; mirrored as response header `X-Request-Id`. */
      requestId?: string;
      /** Set by `insightOpsAuthMiddleware`: session cookie or env fallback. */
      insightOpsAuth?:
        | { readonly kind: "session"; readonly sessionId: string; readonly org: string; readonly pat: string }
        | { readonly kind: "env"; readonly sessionId: "__env__"; readonly org: string; readonly pat: string };
    }
  }
}
