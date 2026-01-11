import { Request, Response, NextFunction } from 'express';
export declare class SubscriptionController {
    /**
     * Get all user's subscriptions
     * GET /api/v1/subscriptions
     */
    getUserSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get current user's subscription
     * GET /api/v1/subscriptions/current
     */
    getCurrentSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get available subscription plans
     * GET /api/v1/subscriptions/plans
     */
    getPlans(_req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create checkout session
     * POST /api/v1/subscriptions/checkout
     */
    createCheckout(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Create billing portal session
     * POST /api/v1/subscriptions/portal
     */
    createPortal(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Cancel subscription
     * POST /api/v1/subscriptions/cancel
     */
    cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * Check subdomain quota
     * GET /api/v1/subscriptions/quota
     */
    checkQuota(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const subscriptionController: SubscriptionController;
//# sourceMappingURL=subscription.controller.d.ts.map