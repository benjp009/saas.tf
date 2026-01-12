"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = exports.StripeService = exports.SUBSCRIPTION_PLANS = void 0;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
// Subscription plan configuration
// Annual packages - users pay once per year
// FREE tier: 2 domains included
// Paid packages ADD to the free tier (e.g., 5 package = 2 free + 5 = 7 total)
exports.SUBSCRIPTION_PLANS = {
    FREE: {
        name: 'Free',
        priceId: null, // No Stripe price for free tier
        price: 0,
        subdomainQuota: 2,
        features: ['2 subdomains', 'Basic DNS management', 'Community support'],
    },
    PACKAGE_5: {
        name: '5 Subdomains Package',
        priceId: process.env.STRIPE_PRICE_ID_PACKAGE_5 || 'price_package_5',
        price: 1000, // $10.00/year in cents
        subdomainQuota: 7, // 2 free + 5 purchased
        features: [
            '5 extra subdomains',
            'Full DNS management',
            'Email support',
            'Valid for 1 year',
        ],
    },
    PACKAGE_50: {
        name: '50 Subdomains Package',
        priceId: process.env.STRIPE_PRICE_ID_PACKAGE_50 || 'price_package_50',
        price: 5000, // $50.00/year in cents
        subdomainQuota: 52, // 2 free + 50 purchased
        features: [
            '50 extra subdomains',
            'Full DNS management',
            'Priority email support',
            'Valid for 1 year',
        ],
    },
};
class StripeService {
    stripe = null;
    constructor() {
        const secretKey = config_1.config.stripe.secretKey;
        if (!secretKey) {
            logger_1.logger.warn('Stripe secret key not configured - payment features disabled');
            return;
        }
        try {
            this.stripe = new stripe_1.default(secretKey, {
                typescript: true,
                maxNetworkRetries: 3,
                timeout: 30000, // 30 seconds
                httpClient: stripe_1.default.createFetchHttpClient(),
            });
            logger_1.logger.info('Stripe service initialized successfully');
            // Test connectivity on startup
            this.testConnectivity();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Stripe:', error);
            throw new errors_1.InternalServerError('Failed to initialize payment service');
        }
    }
    /**
     * Test Stripe API connectivity on startup
     */
    async testConnectivity() {
        if (!this.stripe)
            return;
        try {
            await this.stripe.balance.retrieve();
            logger_1.logger.info('Stripe API connectivity test: SUCCESS');
        }
        catch (error) {
            logger_1.logger.error('Stripe API connectivity test FAILED:', {
                error: error.message,
                type: error.type,
                code: error.code,
            });
        }
    }
    /**
     * Check if Stripe is enabled
     */
    isEnabled() {
        return this.stripe !== null;
    }
    /**
     * Get Stripe instance (throws if not enabled)
     */
    getStripe() {
        if (!this.stripe) {
            throw new errors_1.InternalServerError('Payment service not configured');
        }
        return this.stripe;
    }
    /**
     * Create or retrieve a Stripe customer
     */
    async createCustomer(params) {
        const stripe = this.getStripe();
        try {
            const customer = await stripe.customers.create({
                email: params.email,
                name: params.name,
                metadata: {
                    userId: params.userId,
                },
            });
            logger_1.logger.info('Stripe customer created', {
                customerId: customer.id,
                userId: params.userId,
            });
            return customer;
        }
        catch (error) {
            logger_1.logger.error('Failed to create Stripe customer:', {
                error: error.message,
                userId: params.userId,
            });
            throw new errors_1.InternalServerError('Failed to create customer');
        }
    }
    /**
     * Get a Stripe customer by ID
     */
    async getCustomer(customerId) {
        const stripe = this.getStripe();
        try {
            const customer = await stripe.customers.retrieve(customerId);
            return customer;
        }
        catch (error) {
            logger_1.logger.warn('Failed to retrieve Stripe customer:', {
                error: error.message,
                code: error.code,
                customerId,
            });
            throw error;
        }
    }
    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(params) {
        const stripe = this.getStripe();
        try {
            const session = await stripe.checkout.sessions.create({
                customer: params.customerId,
                mode: 'subscription',
                line_items: [
                    {
                        price: params.priceId,
                        quantity: 1,
                    },
                ],
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                metadata: {
                    userId: params.userId,
                },
                subscription_data: {
                    metadata: {
                        userId: params.userId,
                    },
                },
            });
            logger_1.logger.info('Checkout session created', {
                sessionId: session.id,
                userId: params.userId,
            });
            return session;
        }
        catch (error) {
            logger_1.logger.error('Failed to create checkout session:', {
                error: error.message,
                type: error.type,
                code: error.code,
                statusCode: error.statusCode,
                param: error.param,
                requestId: error.requestId,
                decline_code: error.decline_code,
                raw: error.raw ? JSON.stringify(error.raw) : undefined,
                userId: params.userId,
                priceId: params.priceId,
                customerId: params.customerId,
                successUrl: params.successUrl,
                cancelUrl: params.cancelUrl,
            });
            throw new errors_1.InternalServerError(`Failed to create checkout session: ${error.message}`);
        }
    }
    /**
     * Create a billing portal session
     */
    async createPortalSession(params) {
        const stripe = this.getStripe();
        try {
            const session = await stripe.billingPortal.sessions.create({
                customer: params.customerId,
                return_url: params.returnUrl,
            });
            logger_1.logger.info('Portal session created', {
                sessionId: session.id,
                customerId: params.customerId,
            });
            return session;
        }
        catch (error) {
            logger_1.logger.error('Failed to create portal session:', {
                error: error.message,
                customerId: params.customerId,
            });
            throw new errors_1.InternalServerError('Failed to create portal session');
        }
    }
    /**
     * Retrieve a subscription
     */
    async getSubscription(subscriptionId) {
        const stripe = this.getStripe();
        try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            return subscription;
        }
        catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            logger_1.logger.error('Failed to retrieve subscription:', {
                error: error.message,
                subscriptionId,
            });
            throw new errors_1.InternalServerError('Failed to retrieve subscription');
        }
    }
    /**
     * Cancel a subscription
     */
    async cancelSubscription(params) {
        const stripe = this.getStripe();
        try {
            const subscription = await stripe.subscriptions.update(params.subscriptionId, {
                cancel_at_period_end: params.cancelAtPeriodEnd ?? true,
            });
            logger_1.logger.info('Subscription canceled', {
                subscriptionId: params.subscriptionId,
                cancelAtPeriodEnd: params.cancelAtPeriodEnd,
            });
            return subscription;
        }
        catch (error) {
            logger_1.logger.error('Failed to cancel subscription:', {
                error: error.message,
                subscriptionId: params.subscriptionId,
            });
            throw new errors_1.InternalServerError('Failed to cancel subscription');
        }
    }
    /**
     * Reactivate a canceled subscription
     */
    async reactivateSubscription(subscriptionId) {
        const stripe = this.getStripe();
        try {
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: false,
            });
            logger_1.logger.info('Subscription reactivated', { subscriptionId });
            return subscription;
        }
        catch (error) {
            logger_1.logger.error('Failed to reactivate subscription:', {
                error: error.message,
                subscriptionId,
            });
            throw new errors_1.InternalServerError('Failed to reactivate subscription');
        }
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(params) {
        const stripe = this.getStripe();
        try {
            const event = stripe.webhooks.constructEvent(params.payload, params.signature, params.secret);
            return event;
        }
        catch (error) {
            logger_1.logger.error('Webhook signature verification failed:', {
                error: error.message,
            });
            throw new Error('Invalid webhook signature');
        }
    }
    /**
     * Get invoice details
     */
    async getInvoice(invoiceId) {
        const stripe = this.getStripe();
        try {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            return invoice;
        }
        catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            logger_1.logger.error('Failed to retrieve invoice:', {
                error: error.message,
                invoiceId,
            });
            throw new errors_1.InternalServerError('Failed to retrieve invoice');
        }
    }
    /**
     * List customer invoices
     */
    async listInvoices(params) {
        const stripe = this.getStripe();
        try {
            const invoices = await stripe.invoices.list({
                customer: params.customerId,
                limit: params.limit || 10,
            });
            return invoices.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to list invoices:', {
                error: error.message,
                customerId: params.customerId,
            });
            throw new errors_1.InternalServerError('Failed to list invoices');
        }
    }
}
exports.StripeService = StripeService;
exports.stripeService = new StripeService();
//# sourceMappingURL=stripe.service.js.map