import { Subscription, SubscriptionPlan } from '@prisma/client';
import { SUBSCRIPTION_PLANS } from './stripe.service';
interface SubscriptionWithDetails extends Subscription {
    planDetails: typeof SUBSCRIPTION_PLANS[keyof typeof SUBSCRIPTION_PLANS];
    daysUntilRenewal?: number;
    isInGracePeriod?: boolean;
}
export declare class SubscriptionService {
    /**
     * Get or create a user's subscription
     */
    getOrCreateSubscription(userId: string): Promise<Subscription>;
    /**
     * Get subscription with plan details
     */
    getSubscriptionWithDetails(userId: string): Promise<SubscriptionWithDetails | null>;
    /**
     * Get all active subscriptions for a user with details
     */
    getUserSubscriptions(userId: string): Promise<SubscriptionWithDetails[]>;
    /**
     * Get total quota from all active subscriptions
     */
    getTotalQuota(userId: string): Promise<{
        totalQuota: number;
        subscriptions: Subscription[];
        breakdown: Array<{
            plan: string;
            quota: number;
            expiresAt?: Date;
        }>;
    }>;
    /**
     * Create a checkout session for upgrading subscription
     */
    createCheckoutSession(params: {
        userId: string;
        plan: SubscriptionPlan;
        successUrl: string;
        cancelUrl: string;
    }): Promise<{
        sessionUrl: string;
        sessionId: string;
    }>;
    /**
     * Create a billing portal session
     */
    createPortalSession(params: {
        userId: string;
        returnUrl: string;
    }): Promise<{
        portalUrl: string;
    }>;
    /**
     * Handle successful checkout (called from webhook)
     */
    handleCheckoutComplete(params: {
        userId: string;
        stripeSubscriptionId: string;
        stripePriceId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
    }): Promise<Subscription>;
    /**
     * Update subscription from Stripe webhook
     */
    updateSubscriptionFromStripe(params: {
        stripeSubscriptionId: string;
        status: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
        cancelAt?: Date;
    }): Promise<Subscription>;
    /**
     * Cancel subscription
     */
    cancelSubscription(params: {
        userId: string;
        subscriptionId?: string;
        cancelAtPeriodEnd?: boolean;
    }): Promise<Subscription>;
    /**
     * Check if user can create more subdomains
     */
    canCreateSubdomain(userId: string): Promise<{
        allowed: boolean;
        used: number;
        quota: number;
        subscriptions?: Subscription[];
    }>;
    /**
     * Handle expired subscriptions (cron job)
     */
    handleExpiredSubscriptions(): Promise<void>;
}
export declare const subscriptionService: SubscriptionService;
export {};
//# sourceMappingURL=subscription.service.d.ts.map