import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 *
 * This middleware checks the X-Forwarded-Proto header set by proxies
 * (like Railway, Render, or load balancers) to determine if the original
 * request was made over HTTPS.
 */
export declare const httpsRedirect: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=httpsRedirect.middleware.d.ts.map