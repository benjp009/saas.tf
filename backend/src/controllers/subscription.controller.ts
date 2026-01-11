import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { SUBSCRIPTION_PLANS } from '../services/stripe.service';
import { logger } from '../utils/logger';
import { config } from '../config';

export class SubscriptionController {
  /**
   * Get all user's subscriptions
   * GET /api/v1/subscriptions
   */
  async getUserSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const subscriptions = await subscriptionService.getUserSubscriptions(userId);
      const quotaInfo = await subscriptionService.getTotalQuota(userId);

      // Count active subdomains
      const activeCount = await subscriptionService.canCreateSubdomain(userId);

      res.status(200).json({
        subscriptions,
        totalQuota: quotaInfo.totalQuota,
        totalUsed: activeCount.used,
        breakdown: quotaInfo.breakdown,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's subscription
   * GET /api/v1/subscriptions/current
   */
  async getCurrentSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const subscription =
        await subscriptionService.getSubscriptionWithDetails(userId);

      res.status(200).json({ subscription });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available subscription plans
   * GET /api/v1/subscriptions/plans
   */
  async getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, value]) => ({
        id: key,
        name: value.name,
        priceId: value.priceId,
        price: value.price,
        subdomainQuota: value.subdomainQuota,
        features: value.features,
      }));

      res.status(200).json({ plans });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create checkout session
   * POST /api/v1/subscriptions/checkout
   */
  async createCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { plan } = req.body;

      // Validate plan
      if (!plan || !(plan in SUBSCRIPTION_PLANS)) {
        res.status(400).json({
          error: {
            code: 'INVALID_PLAN',
            message: 'Invalid subscription plan',
          },
        });
        return;
      }

      const frontendUrl = config.frontendUrl;
      const result = await subscriptionService.createCheckoutSession({
        userId,
        plan,
        successUrl: `${frontendUrl}/billing?session=success`,
        cancelUrl: `${frontendUrl}/billing?session=canceled`,
      });

      res.status(200).json({
        sessionUrl: result.sessionUrl,
        sessionId: result.sessionId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create billing portal session
   * POST /api/v1/subscriptions/portal
   */
  async createPortal(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const result = await subscriptionService.createPortalSession({
        userId,
        returnUrl: `${config.frontendUrl}/billing`,
      });

      res.status(200).json({
        portalUrl: result.portalUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * POST /api/v1/subscriptions/cancel
   */
  async cancelSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const { subscriptionId, cancelAtPeriodEnd = true } = req.body;

      const subscription = await subscriptionService.cancelSubscription({
        userId,
        subscriptionId,
        cancelAtPeriodEnd,
      });

      logger.info('User canceled subscription', {
        userId,
        subscriptionId: subscription.id,
      });

      res.status(200).json({
        message: 'Subscription canceled successfully',
        subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check subdomain quota
   * GET /api/v1/subscriptions/quota
   */
  async checkQuota(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;

      const quota = await subscriptionService.canCreateSubdomain(userId);

      res.status(200).json(quota);
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
