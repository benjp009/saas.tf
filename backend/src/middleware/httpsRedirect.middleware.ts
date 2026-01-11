import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 *
 * This middleware checks the X-Forwarded-Proto header set by proxies
 * (like Railway, Render, or load balancers) to determine if the original
 * request was made over HTTPS.
 */
export const httpsRedirect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only enforce in production
  if (config.nodeEnv === 'production') {
    // Check X-Forwarded-Proto header (set by proxies/load balancers)
    const forwardedProto = req.headers['x-forwarded-proto'];

    if (forwardedProto !== 'https') {
      // Redirect to HTTPS (301 = permanent redirect)
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }

  // Continue to next middleware
  next();
};
