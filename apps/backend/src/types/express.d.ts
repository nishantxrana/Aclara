export {};

declare global {
  namespace Express {
    interface Request {
      /** Correlation id for logs; mirrored as response header `X-Request-Id`. */
      requestId?: string;
    }
  }
}
