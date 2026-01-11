import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    /**
     * Register a new user
     * POST /api/v1/auth/register
     */
    register(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Login user
     * POST /api/v1/auth/login
     */
    login(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get current user
     * GET /api/v1/auth/me
     */
    getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Refresh token
     * POST /api/v1/auth/refresh
     */
    refreshToken(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Logout (client-side - just remove token)
     * POST /api/v1/auth/logout
     */
    logout(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map