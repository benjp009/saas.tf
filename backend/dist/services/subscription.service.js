"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = exports.SubscriptionService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
const stripe_service_1 = require("./stripe.service");
const email_service_1 = require("./email.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class SubscriptionService {
    /**
     * Get or create a user's subscription
     */
    async getOrCreateSubscription(userId) {
        // Check for existing subscription
        let subscription = await database_1.prisma.subscription.findFirst({
            where: {
                userId,
                status: {
                    in: [
                        client_1.SubscriptionStatus.ACTIVE,
                        client_1.SubscriptionStatus.TRIALING,
                        client_1.SubscriptionStatus.PAST_DUE,
                    ],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // Create free subscription if none exists
        if (!subscription) {
            subscription = await database_1.prisma.subscription.create({
                data: {
                    userId,
                    plan: client_1.SubscriptionPlan.FREE,
                    status: client_1.SubscriptionStatus.ACTIVE,
                    subdomainQuota: stripe_service_1.SUBSCRIPTION_PLANS.FREE.subdomainQuota,
                    subdomainsUsed: 0,
                },
            });
            logger_1.logger.info('Free subscription created for user', { userId });
        }
        return subscription;
    }
    /**
     * Get subscription with plan details
     */
    async getSubscriptionWithDetails(userId) {
        let subscription = await this.getOrCreateSubscription(userId);
        if (!subscription) {
            return null;
        }
        // Count user's active subdomains and sync with subscription
        const activeCount = await database_1.prisma.subdomain.count({
            where: {
                userId,
                isActive: true,
            },
        });
        // Update subscription's used count if it doesn't match
        if (activeCount !== subscription.subdomainsUsed) {
            subscription = await database_1.prisma.subscription.update({
                where: { id: subscription.id },
                data: { subdomainsUsed: activeCount },
            });
        }
        const planDetails = stripe_service_1.SUBSCRIPTION_PLANS[subscription.plan];
        // Calculate days until renewal
        let daysUntilRenewal;
        if (subscription.stripeCurrentPeriodEnd) {
            const now = new Date();
            const renewalDate = new Date(subscription.stripeCurrentPeriodEnd);
            daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        // Check if in grace period (48 hours / 2 days after past due)
        const isInGracePeriod = subscription.status === client_1.SubscriptionStatus.PAST_DUE &&
            daysUntilRenewal !== undefined &&
            daysUntilRenewal >= -2;
        return {
            ...subscription,
            planDetails,
            daysUntilRenewal,
            isInGracePeriod,
        };
    }
    /**
     * Get all active subscriptions for a user with details
     */
    async getUserSubscriptions(userId) {
        let subscriptions = await database_1.prisma.subscription.findMany({
            where: {
                userId,
                status: {
                    in: [
                        client_1.SubscriptionStatus.ACTIVE,
                        client_1.SubscriptionStatus.TRIALING,
                        client_1.SubscriptionStatus.PAST_DUE,
                    ],
                },
            },
            orderBy: {
                createdAt: 'asc', // Sort oldest first for allocation
            },
        });
        // Always ensure FREE plan exists and is first
        let freeSubscription = subscriptions.find(s => s.plan === client_1.SubscriptionPlan.FREE);
        if (!freeSubscription) {
            freeSubscription = await database_1.prisma.subscription.create({
                data: {
                    userId,
                    plan: client_1.SubscriptionPlan.FREE,
                    status: client_1.SubscriptionStatus.ACTIVE,
                    subdomainQuota: stripe_service_1.SUBSCRIPTION_PLANS.FREE.subdomainQuota,
                    subdomainsUsed: 0,
                },
            });
            logger_1.logger.info('Free subscription created for user', { userId });
        }
        else {
            // Remove FREE from its current position
            subscriptions = subscriptions.filter(s => s.plan !== client_1.SubscriptionPlan.FREE);
        }
        // Always put FREE plan at the beginning
        subscriptions.unshift(freeSubscription);
        // Get actual subdomain count
        const totalSubdomainsUsed = await database_1.prisma.subdomain.count({
            where: {
                userId,
                isActive: true,
            },
        });
        // Allocate usage across subscriptions in order (oldest first)
        // This ensures FREE plan gets first 2, then next package gets next N, etc.
        const now = new Date();
        const subscriptionsWithUsage = subscriptions.map((subscription, index) => {
            const planDetails = stripe_service_1.SUBSCRIPTION_PLANS[subscription.plan];
            // Calculate how many subdomains were "used" by previous subscriptions
            // For non-FREE plans, only count the paid quota since FREE already covers the 2 free subdomains
            const previousQuota = subscriptions
                .slice(0, index)
                .reduce((sum, s) => {
                if (s.plan === client_1.SubscriptionPlan.FREE) {
                    return sum + s.subdomainQuota; // FREE: count all 2
                }
                else {
                    return sum + (s.subdomainQuota - 2); // PAID: only count paid portion
                }
            }, 0);
            // Calculate usage for this subscription
            // If we have more total usage than previous quota, this subscription is being used
            let subdomainsUsed = 0;
            if (totalSubdomainsUsed > previousQuota) {
                const remainingUsage = totalSubdomainsUsed - previousQuota;
                // For non-FREE plans, allocate based on paid quota only
                const effectiveQuota = subscription.plan === client_1.SubscriptionPlan.FREE
                    ? subscription.subdomainQuota
                    : subscription.subdomainQuota - 2;
                subdomainsUsed = Math.min(remainingUsage, effectiveQuota);
            }
            // Calculate days until renewal
            let daysUntilRenewal;
            if (subscription.stripeCurrentPeriodEnd) {
                const renewalDate = new Date(subscription.stripeCurrentPeriodEnd);
                daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            }
            // Check if in grace period
            const isInGracePeriod = subscription.status === client_1.SubscriptionStatus.PAST_DUE &&
                daysUntilRenewal !== undefined &&
                daysUntilRenewal >= -2;
            return {
                ...subscription,
                subdomainsUsed, // Override with calculated usage
                planDetails,
                daysUntilRenewal,
                isInGracePeriod,
            };
        });
        // Return in chronological order (oldest first) for display
        return subscriptionsWithUsage;
    }
    /**
     * Get total quota from all active subscriptions
     */
    async getTotalQuota(userId) {
        // Find all active subscriptions (trust the status field from Stripe webhooks)
        const subscriptions = await database_1.prisma.subscription.findMany({
            where: {
                userId,
                status: {
                    in: [
                        client_1.SubscriptionStatus.ACTIVE,
                        client_1.SubscriptionStatus.TRIALING,
                        client_1.SubscriptionStatus.PAST_DUE,
                    ],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        // If no active subscriptions, create FREE plan
        if (subscriptions.length === 0) {
            const freeSubscription = await database_1.prisma.subscription.create({
                data: {
                    userId,
                    plan: client_1.SubscriptionPlan.FREE,
                    status: client_1.SubscriptionStatus.ACTIVE,
                    subdomainQuota: stripe_service_1.SUBSCRIPTION_PLANS.FREE.subdomainQuota,
                    subdomainsUsed: 0,
                },
            });
            logger_1.logger.info('Free subscription created for user', { userId });
            subscriptions.push(freeSubscription);
        }
        // Calculate total quota
        // For non-FREE plans, only count the paid quota since FREE already covers the 2 free subdomains
        const totalQuota = subscriptions.reduce((sum, sub) => {
            if (sub.plan === client_1.SubscriptionPlan.FREE) {
                return sum + sub.subdomainQuota; // FREE: count all 2
            }
            else {
                return sum + (sub.subdomainQuota - 2); // PAID: only count paid portion
            }
        }, 0);
        // Create breakdown for UI
        const breakdown = subscriptions.map(sub => ({
            plan: sub.plan,
            quota: sub.subdomainQuota,
            expiresAt: sub.stripeCurrentPeriodEnd || undefined,
        }));
        return {
            totalQuota,
            subscriptions,
            breakdown,
        };
    }
    /**
     * Create a checkout session for upgrading subscription
     */
    async createCheckoutSession(params) {
        if (!stripe_service_1.stripeService.isEnabled()) {
            throw new errors_1.BadRequestError('Payment service not available', 'STRIPE_DISABLED');
        }
        // Validate plan
        if (params.plan === client_1.SubscriptionPlan.FREE) {
            throw new errors_1.BadRequestError('Cannot checkout for free plan', 'INVALID_PLAN');
        }
        const planConfig = stripe_service_1.SUBSCRIPTION_PLANS[params.plan];
        if (!planConfig.priceId) {
            throw new errors_1.BadRequestError('Invalid plan configuration', 'INVALID_PLAN');
        }
        // Get user
        const user = await database_1.prisma.user.findUnique({
            where: { id: params.userId },
        });
        if (!user) {
            throw new errors_1.NotFoundError('User not found', 'USER_NOT_FOUND');
        }
        // Create or get Stripe customer
        let customerId = user.stripeCustomerId;
        // If user has a customer ID, verify it exists in Stripe (handles test->prod migration)
        if (customerId) {
            try {
                await stripe_service_1.stripeService.getCustomer(customerId);
            }
            catch (error) {
                // Customer doesn't exist (e.g., test mode customer in prod mode)
                if (error.code === 'resource_missing') {
                    logger_1.logger.info('Stripe customer not found, creating new one', {
                        userId: user.id,
                        oldCustomerId: customerId,
                    });
                    customerId = null; // Will create new customer below
                }
                else {
                    throw error;
                }
            }
        }
        if (!customerId) {
            const customer = await stripe_service_1.stripeService.createCustomer({
                email: user.email,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                userId: user.id,
            });
            customerId = customer.id;
            // Update user with customer ID
            await database_1.prisma.user.update({
                where: { id: user.id },
                data: { stripeCustomerId: customerId },
            });
        }
        // Create checkout session
        const session = await stripe_service_1.stripeService.createCheckoutSession({
            customerId,
            priceId: planConfig.priceId,
            successUrl: params.successUrl,
            cancelUrl: params.cancelUrl,
            userId: user.id,
        });
        if (!session.url) {
            throw new errors_1.InternalServerError('Failed to create checkout session');
        }
        return {
            sessionUrl: session.url,
            sessionId: session.id,
        };
    }
    /**
     * Create a billing portal session
     */
    async createPortalSession(params) {
        if (!stripe_service_1.stripeService.isEnabled()) {
            throw new errors_1.BadRequestError('Payment service not available', 'STRIPE_DISABLED');
        }
        const user = await database_1.prisma.user.findUnique({
            where: { id: params.userId },
        });
        if (!user || !user.stripeCustomerId) {
            throw new errors_1.BadRequestError('No payment account found', 'NO_STRIPE_CUSTOMER');
        }
        const session = await stripe_service_1.stripeService.createPortalSession({
            customerId: user.stripeCustomerId,
            returnUrl: params.returnUrl,
        });
        return {
            portalUrl: session.url,
        };
    }
    /**
     * Handle successful checkout (called from webhook)
     */
    async handleCheckoutComplete(params) {
        // Determine plan from price ID
        let plan = client_1.SubscriptionPlan.FREE;
        for (const [key, value] of Object.entries(stripe_service_1.SUBSCRIPTION_PLANS)) {
            if (value.priceId === params.stripePriceId) {
                plan = key;
                break;
            }
        }
        const planConfig = stripe_service_1.SUBSCRIPTION_PLANS[plan];
        // Create new subscription (multiple subscriptions are now allowed)
        const subscription = await database_1.prisma.subscription.create({
            data: {
                userId: params.userId,
                plan,
                status: client_1.SubscriptionStatus.ACTIVE,
                stripeSubscriptionId: params.stripeSubscriptionId,
                stripePriceId: params.stripePriceId,
                stripeCurrentPeriodStart: params.currentPeriodStart,
                stripeCurrentPeriodEnd: params.currentPeriodEnd,
                subdomainQuota: planConfig.subdomainQuota,
                subdomainsUsed: 0,
            },
        });
        logger_1.logger.info('Subscription added from checkout', {
            userId: params.userId,
            plan,
            subscriptionId: subscription.id,
        });
        return subscription;
    }
    /**
     * Update subscription from Stripe webhook
     */
    async updateSubscriptionFromStripe(params) {
        const subscription = await database_1.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: params.stripeSubscriptionId },
        });
        if (!subscription) {
            throw new errors_1.NotFoundError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
        }
        // Map Stripe status to our status
        let status = subscription.status;
        switch (params.status) {
            case 'active':
                status = client_1.SubscriptionStatus.ACTIVE;
                break;
            case 'trialing':
                status = client_1.SubscriptionStatus.TRIALING;
                break;
            case 'past_due':
                status = client_1.SubscriptionStatus.PAST_DUE;
                break;
            case 'canceled':
            case 'unpaid':
                status = client_1.SubscriptionStatus.CANCELED;
                break;
        }
        const updated = await database_1.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status,
                stripeCurrentPeriodStart: params.currentPeriodStart,
                stripeCurrentPeriodEnd: params.currentPeriodEnd,
                stripeCancelAtPeriodEnd: params.cancelAtPeriodEnd,
                stripeCancelAt: params.cancelAt,
                updatedAt: new Date(),
            },
        });
        logger_1.logger.info('Subscription updated from Stripe', {
            subscriptionId: subscription.id,
            status,
        });
        return updated;
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(params) {
        let subscription;
        if (params.subscriptionId) {
            // Cancel specific subscription by ID
            subscription = await database_1.prisma.subscription.findUnique({
                where: { id: params.subscriptionId },
            });
            // Verify ownership
            if (!subscription) {
                throw new errors_1.NotFoundError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
            }
            if (subscription.userId !== params.userId) {
                throw new errors_1.BadRequestError('Not authorized to cancel this subscription', 'UNAUTHORIZED');
            }
            if (subscription.status !== client_1.SubscriptionStatus.ACTIVE &&
                subscription.status !== client_1.SubscriptionStatus.TRIALING) {
                throw new errors_1.BadRequestError('Subscription is not active', 'SUBSCRIPTION_NOT_ACTIVE');
            }
        }
        else {
            // Fallback: Cancel first active subscription (for backward compatibility)
            subscription = await database_1.prisma.subscription.findFirst({
                where: {
                    userId: params.userId,
                    status: {
                        in: [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.TRIALING],
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            if (!subscription) {
                throw new errors_1.NotFoundError('No active subscription found', 'NO_ACTIVE_SUBSCRIPTION');
            }
        }
        // If has Stripe subscription, cancel it there
        if (subscription.stripeSubscriptionId && stripe_service_1.stripeService.isEnabled()) {
            await stripe_service_1.stripeService.cancelSubscription({
                subscriptionId: subscription.stripeSubscriptionId,
                cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? true,
            });
        }
        else {
            // For free tier, just cancel immediately
            await database_1.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: client_1.SubscriptionStatus.CANCELED,
                    canceledAt: new Date(),
                },
            });
        }
        logger_1.logger.info('Subscription canceled', {
            subscriptionId: subscription.id,
            userId: params.userId,
        });
        return subscription;
    }
    /**
     * Check if user can create more subdomains
     */
    async canCreateSubdomain(userId) {
        // Get total quota from all active subscriptions
        const quotaInfo = await this.getTotalQuota(userId);
        // Count user's active subdomains
        const activeCount = await database_1.prisma.subdomain.count({
            where: {
                userId,
                isActive: true,
            },
        });
        // Update subscription's used count for each subscription
        for (const subscription of quotaInfo.subscriptions) {
            if (activeCount !== subscription.subdomainsUsed) {
                await database_1.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: { subdomainsUsed: activeCount },
                });
            }
        }
        return {
            allowed: activeCount < quotaInfo.totalQuota,
            used: activeCount,
            quota: quotaInfo.totalQuota,
            subscriptions: quotaInfo.subscriptions,
        };
    }
    /**
     * Handle expired subscriptions (cron job)
     */
    async handleExpiredSubscriptions() {
        const now = new Date();
        // Find subscriptions that are past due for more than 48 hours (grace period)
        const expiredSubscriptions = await database_1.prisma.subscription.findMany({
            where: {
                status: client_1.SubscriptionStatus.PAST_DUE,
                stripeCurrentPeriodEnd: {
                    lte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 48 hours ago
                },
            },
            include: {
                user: true,
            },
        });
        for (const subscription of expiredSubscriptions) {
            // First, mark this subscription as expired
            await database_1.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: client_1.SubscriptionStatus.EXPIRED,
                    endedAt: now,
                },
            });
            // Calculate remaining quota from OTHER active subscriptions (excluding this expired one)
            const remainingSubscriptions = await database_1.prisma.subscription.findMany({
                where: {
                    userId: subscription.userId,
                    status: {
                        in: [
                            client_1.SubscriptionStatus.ACTIVE,
                            client_1.SubscriptionStatus.TRIALING,
                            client_1.SubscriptionStatus.PAST_DUE,
                        ],
                    },
                    id: {
                        not: subscription.id, // Exclude the expired subscription
                    },
                },
            });
            // If no remaining subscriptions, create FREE plan
            if (remainingSubscriptions.length === 0) {
                await database_1.prisma.subscription.create({
                    data: {
                        userId: subscription.userId,
                        plan: client_1.SubscriptionPlan.FREE,
                        status: client_1.SubscriptionStatus.ACTIVE,
                        subdomainQuota: stripe_service_1.SUBSCRIPTION_PLANS.FREE.subdomainQuota,
                        subdomainsUsed: 0,
                    },
                });
                remainingSubscriptions.push({
                    subdomainQuota: stripe_service_1.SUBSCRIPTION_PLANS.FREE.subdomainQuota,
                });
                logger_1.logger.info('Free subscription created after expiration', {
                    userId: subscription.userId
                });
            }
            // Calculate remaining quota
            const remainingQuota = remainingSubscriptions.reduce((sum, sub) => sum + sub.subdomainQuota, 0);
            // Count active subdomains
            const activeCount = await database_1.prisma.subdomain.count({
                where: {
                    userId: subscription.userId,
                    isActive: true,
                },
            });
            // If user has subdomains AND they exceed remaining quota, deactivate ALL subdomains
            let subdomainsDeactivated = 0;
            if (activeCount > 0 && activeCount > remainingQuota) {
                await database_1.prisma.subdomain.updateMany({
                    where: {
                        userId: subscription.userId,
                        isActive: true,
                    },
                    data: {
                        isActive: false,
                    },
                });
                subdomainsDeactivated = activeCount;
                logger_1.logger.warn('Subscription expired - all subdomains deactivated due to quota exceeded', {
                    userId: subscription.userId,
                    subscriptionId: subscription.id,
                    activeCount,
                    remainingQuota,
                });
            }
            else {
                logger_1.logger.info('Subscription expired - subdomains kept active (within remaining quota)', {
                    userId: subscription.userId,
                    subscriptionId: subscription.id,
                    activeCount,
                    remainingQuota,
                });
            }
            // Send subscription expired email
            try {
                if (subscription.user) {
                    await email_service_1.emailService.sendSubscriptionExpired({
                        email: subscription.user.email,
                        plan: subscription.plan,
                        subdomainsDeactivated,
                    });
                }
            }
            catch (emailError) {
                logger_1.logger.error('Failed to send subscription expired email', {
                    error: emailError.message,
                    userId: subscription.userId,
                });
            }
        }
    }
}
exports.SubscriptionService = SubscriptionService;
exports.subscriptionService = new SubscriptionService();
//# sourceMappingURL=subscription.service.js.map