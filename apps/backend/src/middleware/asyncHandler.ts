import type { NextFunction, Request, Response } from "express";

/**
 * Wraps an async Express handler so rejections reach `next(err)`.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res, next).catch((err: unknown) => {
      next(err);
    });
  };
}
