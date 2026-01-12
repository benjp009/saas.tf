import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { Sentry } from '../config/sentry';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error with context
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: (req as any).user?.id,
    ip: req.ip,
  });

  // Capture error in Sentry with additional context
  Sentry.withScope((scope) => {
    scope.setContext('request', {
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
    });

    if ((req as any).user?.id) {
      scope.setUser({ id: (req as any).user.id });
    }

    // Only capture non-operational errors in Sentry
    if (!(err instanceof AppError) || !err.isOperational) {
      Sentry.captureException(err);
    }
  });

  // Handle operational errors
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
      timestamp: new Date().toISOString(),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      timestamp: new Date().toISOString(),
    },
  });
};
