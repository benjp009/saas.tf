"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionController = exports.SubscriptionController = void 0;
const subscription_service_1 = require("../services/subscription.service");
const stripe_service_1 = require("../services/stripe.service");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class SubscriptionController {
    /**
     * Get all user's subscriptions
     * GET /api/v1/subscriptions
     */
    async getUserSubscriptions(req, res, next) {
        try {
            const userId = req.user.id;
            const subscriptions = await subscription_service_1.subscriptionService.getUserSubscriptions(userId);
            const quotaInfo = await subscription_service_1.subscriptionService.getTotalQuota(userId);
            // Count active subdomains
            const activeCount = await subscription_service_1.subscriptionService.canCreateSubdomain(userId);
            res.status(200).json({
                subscriptions,
                totalQuota: quotaInfo.totalQuota,
                totalUsed: activeCount.used,
                breakdown: quotaInfo.breakdown,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get current user's subscription
     * GET /api/v1/subscriptions/current
     */
    async getCurrentSubscription(req, res, next) {
        try {
            const userId = req.user.id;
            const subscription = await subscription_service_1.subscriptionService.getSubscriptionWithDetails(userId);
            res.status(200).json({ subscription });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get available subscription plans
     * GET /api/v1/subscriptions/plans
     */
    async getPlans(_req, res, next) {
        try {
            const plans = Object.entries(stripe_service_1.SUBSCRIPTION_PLANS).map(([key, value]) => ({
                id: key,
                name: value.name,
                priceId: value.priceId,
                price: value.price,
                subdomainQuota: value.subdomainQuota,
                features: value.features,
            }));
            res.status(200).json({ plans });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create checkout session
     * POST /api/v1/subscriptions/checkout
     */
    async createCheckout(req, res, next) {
        try {
            const userId = req.user.id;
            const { plan } = req.body;
            // Validate plan
            if (!plan || !(plan in stripe_service_1.SUBSCRIPTION_PLANS)) {
                res.status(400).json({
                    error: {
                        code: 'INVALID_PLAN',
                        message: 'Invalid subscription plan',
                    },
                });
                return;
            }
            const frontendUrl = config_1.config.frontendUrl;
            const result = await subscription_service_1.subscriptionService.createCheckoutSession({
                userId,
                plan,
                successUrl: `${frontendUrl}/billing?session=success`,
                cancelUrl: `${frontendUrl}/billing?session=canceled`,
            });
            res.status(200).json({
                sessionUrl: result.sessionUrl,
                sessionId: result.sessionId,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create billing portal session
     * POST /api/v1/subscriptions/portal
     */
    async createPortal(req, res, next) {
        try {
            const userId = req.user.id;
            const result = await subscription_service_1.subscriptionService.createPortalSession({
                userId,
                returnUrl: `${config_1.config.frontendUrl}/billing`,
            });
            res.status(200).json({
                portalUrl: result.portalUrl,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Cancel subscription
     * POST /api/v1/subscriptions/cancel
     */
    async cancelSubscription(req, res, next) {
        try {
            const userId = req.user.id;
            const { subscriptionId, cancelAtPeriodEnd = true } = req.body;
            const subscription = await subscription_service_1.subscriptionService.cancelSubscription({
                userId,
                subscriptionId,
                cancelAtPeriodEnd,
            });
            logger_1.logger.info('User canceled subscription', {
                userId,
                subscriptionId: subscription.id,
            });
            res.status(200).json({
                message: 'Subscription canceled successfully',
                subscription,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Check subdomain quota
     * GET /api/v1/subscriptions/quota
     */
    async checkQuota(req, res, next) {
        try {
            const userId = req.user.id;
            const quota = await subscription_service_1.subscriptionService.canCreateSubdomain(userId);
            res.status(200).json(quota);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SubscriptionController = SubscriptionController;
exports.subscriptionController = new SubscriptionController();
//# sourceMappingURL=subscription.controller.js.map