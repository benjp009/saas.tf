import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to track request performance
 */
export const performanceLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end function to log performance
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log slow requests (>1000ms) as warnings
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
    } else {
      logger.debug('Request completed', {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        userId: (req as any).user?.id,
      });
    }

    // Call original end function
    return originalEnd(chunk, encoding, callback);
  };

  next();
};
