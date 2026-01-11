"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = exports.WebhookController = void 0;
const stripe_service_1 = require("../services/stripe.service");
const subscription_service_1 = require("../services/subscription.service");
const email_service_1 = require("../services/email.service");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class WebhookController {
    /**
     * Handle Stripe webhooks
     * POST /api/v1/webhooks/stripe
     */
    async handleStripeWebhook(req, res) {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            logger_1.logger.warn('Webhook received without signature');
            res.status(400).json({ error: 'No signature provided' });
            return;
        }
        const webhookSecret = config_1.config.stripe.webhookSecret;
        if (!webhookSecret) {
            logger_1.logger.error('Stripe webhook secret not configured');
            res.status(500).json({ error: 'Webhook not configured' });
            return;
        }
        try {
            // Verify webhook signature
            const event = stripe_service_1.stripeService.verifyWebhookSignature({
                payload: req.body,
                signature,
                secret: webhookSecret,
            });
            logger_1.logger.info('Stripe webhook received', {
                type: event.type,
                id: event.id,
            });
            // Handle different event types
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event);
                    break;
                case 'invoice.payment_succeeded':
                    await this.handleInvoicePaymentSucceeded(event);
                    break;
                case 'invoice.payment_failed':
                    await this.handleInvoicePaymentFailed(event);
                    break;
                default:
                    logger_1.logger.info('Unhandled webhook event type', { type: event.type });
            }
            res.status(200).json({ received: true });
        }
        catch (error) {
            logger_1.logger.error('Webhook processing failed:', {
                error: error.message,
                stack: error.stack,
            });
            res.status(400).json({ error: error.message });
        }
    }
    /**
     * Handle checkout.session.completed
     */
    async handleCheckoutCompleted(event) {
        const session = event.data.object;
        if (session.mode !== 'subscription') {
            return;
        }
        const userId = session.metadata?.userId;
        if (!userId) {
            logger_1.logger.error('No userId in checkout session metadata');
            return;
        }
        const subscriptionId = session.subscription;
        if (!subscriptionId) {
            logger_1.logger.error('No subscription ID in checkout session');
            return;
        }
        // Get subscription details from Stripe
        const stripeSubscription = await stripe_service_1.stripeService.getSubscription(subscriptionId);
        if (!stripeSubscription) {
            logger_1.logger.error('Could not retrieve subscription from Stripe', {
                subscriptionId,
            });
            return;
        }
        // Get price ID
        const priceId = stripeSubscription.items.data[0]?.price.id;
        if (!priceId) {
            logger_1.logger.error('No price ID in subscription');
            return;
        }
        // Create subscription in database
        const newSubscription = await subscription_service_1.subscriptionService.handleCheckoutComplete({
            userId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        });
        logger_1.logger.info('Checkout completed successfully', {
            userId,
            subscriptionId,
        });
        // Send subscription created email
        try {
            const user = await database_1.prisma.user.findUnique({ where: { id: userId } });
            if (user && newSubscription) {
                await email_service_1.emailService.sendSubscriptionCreated({
                    email: user.email,
                    name: user.firstName || user.email,
                    plan: newSubscription.plan,
                    quota: newSubscription.subdomainQuota,
                    expiresAt: newSubscription.stripeCurrentPeriodEnd || undefined,
                });
            }
        }
        catch (emailError) {
            // Log email error but don't fail the webhook
            logger_1.logger.error('Failed to send subscription created email', {
                error: emailError.message,
                userId,
            });
        }
    }
    /**
     * Handle customer.subscription.updated
     */
    async handleSubscriptionUpdated(event) {
        const subscription = event.data.object;
        await subscription_service_1.subscriptionService.updateSubscriptionFromStripe({
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : undefined,
        });
        logger_1.logger.info('Subscription updated', {
            subscriptionId: subscription.id,
            status: subscription.status,
        });
    }
    /**
     * Handle customer.subscription.deleted
     */
    async handleSubscriptionDeleted(event) {
        const subscription = event.data.object;
        // Update subscription status to canceled
        const dbSubscription = await database_1.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
        });
        if (dbSubscription) {
            await database_1.prisma.subscription.update({
                where: { id: dbSubscription.id },
                data: {
                    status: 'CANCELED',
                    canceledAt: new Date(),
                    endedAt: new Date(),
                },
            });
            logger_1.logger.info('Subscription deleted', {
                subscriptionId: subscription.id,
            });
        }
    }
    /**
     * Handle invoice.payment_succeeded
     */
    async handleInvoicePaymentSucceeded(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            return;
        }
        // Find subscription in database
        const subscription = await database_1.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            include: { user: true },
        });
        if (!subscription) {
            logger_1.logger.warn('Subscription not found for invoice payment', {
                subscriptionId,
            });
            return;
        }
        // Create payment record
        await database_1.prisma.payment.create({
            data: {
                userId: subscription.userId,
                subscriptionId: subscription.id,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: 'succeeded',
                stripeInvoiceId: invoice.id,
                description: invoice.description || 'Subscription payment',
                receiptUrl: invoice.hosted_invoice_url || undefined,
                paidAt: new Date(invoice.created * 1000),
            },
        });
        logger_1.logger.info('Payment succeeded', {
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
        });
        // Send payment succeeded email
        try {
            if (subscription.user) {
                await email_service_1.emailService.sendPaymentSucceeded({
                    email: subscription.user.email,
                    amount: invoice.amount_paid,
                    invoiceUrl: invoice.hosted_invoice_url || '',
                    plan: subscription.plan,
                });
            }
        }
        catch (emailError) {
            logger_1.logger.error('Failed to send payment succeeded email', {
                error: emailError.message,
                userId: subscription.userId,
            });
        }
    }
    /**
     * Handle invoice.payment_failed
     */
    async handleInvoicePaymentFailed(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            return;
        }
        // Find subscription in database
        const subscription = await database_1.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            include: { user: true },
        });
        if (!subscription) {
            logger_1.logger.warn('Subscription not found for failed payment', {
                subscriptionId,
            });
            return;
        }
        // Create failed payment record
        await database_1.prisma.payment.create({
            data: {
                userId: subscription.userId,
                subscriptionId: subscription.id,
                amount: invoice.amount_due,
                currency: invoice.currency,
                status: 'failed',
                stripeInvoiceId: invoice.id,
                description: invoice.description || 'Subscription payment (failed)',
                createdAt: new Date(invoice.created * 1000),
            },
        });
        logger_1.logger.warn('Payment failed', {
            invoiceId: invoice.id,
            userId: subscription.userId,
            email: subscription.user.email,
        });
        // Send payment failed email notification
        try {
            if (subscription.user) {
                await email_service_1.emailService.sendPaymentFailed({
                    email: subscription.user.email,
                    amount: invoice.amount_due,
                    plan: subscription.plan,
                });
            }
        }
        catch (emailError) {
            logger_1.logger.error('Failed to send payment failed email', {
                error: emailError.message,
                userId: subscription.userId,
            });
        }
    }
}
exports.WebhookController = WebhookController;
exports.webhookController = new WebhookController();
//# sourceMappingURL=webhook.controller.js.map