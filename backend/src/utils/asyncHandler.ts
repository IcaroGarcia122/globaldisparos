import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Middleware helper that types async route handlers correctly
 * Solves Express type compatibility issues with custom Request types
 */
export const asyncHandler = (
  fn: (req: any, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
