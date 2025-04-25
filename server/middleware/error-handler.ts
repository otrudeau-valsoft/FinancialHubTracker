import { Request, Response, NextFunction } from 'express';

/**
 * Common Error class used throughout the application
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper to avoid try/catch blocks in route handlers
 * @param fn Express route handler to wrap
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;
  
  // Handle specific error types
  if (err.code === '22P02') {
    // PostgreSQL invalid input syntax
    statusCode = 400;
    message = 'Invalid input data';
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    message = 'A record with this data already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist';
  }
  
  // Structured error response
  const errorResponse: any = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };
  
  // Include stack trace in development
  if (stack) {
    errorResponse.stack = stack;
  }
  
  // Include error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }
  
  res.status(statusCode).json(errorResponse);
};