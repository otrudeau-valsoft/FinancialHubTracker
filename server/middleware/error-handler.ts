import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 */
export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`Error (${status}):`, err);
  
  res.status(status).json({ 
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  });
};

/**
 * Async route handler wrapper to catch errors and forward to error handler
 */
export const asyncHandler = (fn: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};