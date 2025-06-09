import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class APIError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const { statusCode = 500, message, stack } = err;
  
  // Log error details
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack })
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`
  });
};