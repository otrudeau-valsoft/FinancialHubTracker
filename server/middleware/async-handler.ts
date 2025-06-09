import { Request, Response, NextFunction } from 'express';

/**
 * Async handler middleware to avoid try/catch blocks in express route handlers
 * @param fn Express route handler function
 * @returns Express middleware function
 */
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};