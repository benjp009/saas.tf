import { Request, Response, NextFunction } from 'express';
export declare class SubdomainController {
    /**
     * Get all subdomains for the current user
     * GET /api/v1/subdomains
     */
    getSubdomains(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Check subdomain availability
     * GET /api/v1/subdomains/check/:name
     */
    checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create a new subdomain
     * POST /api/v1/subdomains
     */
    createSubdomain(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update subdomain IP address
     * PATCH /api/v1/subdomains/:id
     */
    updateSubdomain(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Delete subdomain
     * DELETE /api/v1/subdomains/:id
     */
    deleteSubdomain(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get single subdomain by ID
     * GET /api/v1/subdomains/:id
     */
    getSubdomainById(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const subdomainController: SubdomainController;
//# sourceMappingURL=subdomain.controller.d.ts.map