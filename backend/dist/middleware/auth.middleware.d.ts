import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to authenticate requests using JWT
 */
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * Optional authentication - doesn't throw error if no token provided
 */
export declare const optionalAuthenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map