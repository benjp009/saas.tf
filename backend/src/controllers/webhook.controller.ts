import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { subscriptionService } from '../services/subscription.service';
import { emailService } from '../services/email.service';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { config } from '../config';
import Stripe from 'stripe';

export class WebhookController {
  /**
   * Handle Stripe webhooks
   * POST /api/v1/webhooks/stripe
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Webhook received without signature');
      res.status(400).json({ error: 'No signature provided' });
      return;
    }

    const webhookSecret = config.stripe.webhookSecret;
    if (!webhookSecret) {
      logger.error('Stripe webhook secret not configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }

    try {
      // Verify webhook signature
      const event = stripeService.verifyWebhookSignature({
        payload: req.body,
        signature,
        secret: webhookSecret,
      });

      logger.info('Stripe webhook received', {
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
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Webhook processing failed:', {
        error: error.message,
        stack: error.stack,
      });
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Handle checkout.session.completed
   */
  private async handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode !== 'subscription') {
      return;
    }

    const userId = session.metadata?.userId;
    if (!userId) {
      logger.error('No userId in checkout session metadata');
      return;
    }

    const subscriptionId = session.subscription as string;
    if (!subscriptionId) {
      logger.error('No subscription ID in checkout session');
      return;
    }

    // Get subscription details from Stripe
    const stripeSubscription =
      await stripeService.getSubscription(subscriptionId);
    if (!stripeSubscription) {
      logger.error('Could not retrieve subscription from Stripe', {
        subscriptionId,
      });
      return;
    }

    // Get price ID
    const priceId = stripeSubscription.items.data[0]?.price.id;
    if (!priceId) {
      logger.error('No price ID in subscription');
      return;
    }

    // Create subscription in database
    const newSubscription = await subscriptionService.handleCheckoutComplete({
      userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      currentPeriodStart: new Date(
        (stripeSubscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (stripeSubscription as any).current_period_end * 1000
      ),
    });

    logger.info('Checkout completed successfully', {
      userId,
      subscriptionId,
    });

    // Send subscription created email
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && newSubscription) {
        await emailService.sendSubscriptionCreated({
          email: user.email,
          name: user.firstName || user.email,
          plan: newSubscription.plan,
          quota: newSubscription.subdomainQuota,
          expiresAt: newSubscription.stripeCurrentPeriodEnd || undefined,
        });
      }
    } catch (emailError: any) {
      // Log email error but don't fail the webhook
      logger.error('Failed to send subscription created email', {
        error: emailError.message,
        userId,
      });
    }
  }

  /**
   * Handle customer.subscription.updated
   */
  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as any;

    await subscriptionService.updateSubscriptionFromStripe({
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : undefined,
    });

    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  }

  /**
   * Handle customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    // Update subscription status to canceled
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          endedAt: new Date(),
        },
      });

      logger.info('Subscription deleted', {
        subscriptionId: subscription.id,
      });
    }
  }

  /**
   * Handle invoice.payment_succeeded
   */
  private async handleInvoicePaymentSucceeded(
    event: Stripe.Event
  ): Promise<void> {
    const invoice = event.data.object as any;

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as any)?.id;
    if (!subscriptionId) {
      return;
    }

    // Find subscription in database
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      logger.warn('Subscription not found for invoice payment', {
        subscriptionId,
      });
      return;
    }

    // Create payment record
    await prisma.payment.create({
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

    logger.info('Payment succeeded', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    });

    // Send payment succeeded email
    try {
      if (subscription.user) {
        await emailService.sendPaymentSucceeded({
          email: subscription.user.email,
          amount: invoice.amount_paid,
          invoiceUrl: invoice.hosted_invoice_url || '',
          plan: subscription.plan,
        });
      }
    } catch (emailError: any) {
      logger.error('Failed to send payment succeeded email', {
        error: emailError.message,
        userId: subscription.userId,
      });
    }
  }

  /**
   * Handle invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as any;

    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription as any)?.id;
    if (!subscriptionId) {
      return;
    }

    // Find subscription in database
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });

    if (!subscription) {
      logger.warn('Subscription not found for failed payment', {
        subscriptionId,
      });
      return;
    }

    // Create failed payment record
    await prisma.payment.create({
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

    logger.warn('Payment failed', {
      invoiceId: invoice.id,
      userId: subscription.userId,
      email: subscription.user.email,
    });

    // Send payment failed email notification
    try {
      if (subscription.user) {
        await emailService.sendPaymentFailed({
          email: subscription.user.email,
          amount: invoice.amount_due,
          plan: subscription.plan,
        });
      }
    } catch (emailError: any) {
      logger.error('Failed to send payment failed email', {
        error: emailError.message,
        userId: subscription.userId,
      });
    }
  }
}

export const webhookController = new WebhookController();
