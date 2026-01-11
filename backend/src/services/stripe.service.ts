import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';
import { InternalServerError } from '../utils/errors';

// Subscription plan configuration
// Annual packages - users pay once per year
// FREE tier: 2 domains included
// Paid packages ADD to the free tier (e.g., 5 package = 2 free + 5 = 7 total)
export const SUBSCRIPTION_PLANS = {
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
} as const;

export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    const secretKey = config.stripe.secretKey;

    if (!secretKey) {
      logger.warn('Stripe secret key not configured - payment features disabled');
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
        typescript: true,
      });

      logger.info('Stripe service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Stripe:', error);
      throw new InternalServerError('Failed to initialize payment service');
    }
  }

  /**
   * Check if Stripe is enabled
   */
  isEnabled(): boolean {
    return this.stripe !== null;
  }

  /**
   * Get Stripe instance (throws if not enabled)
   */
  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new InternalServerError('Payment service not configured');
    }
    return this.stripe;
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    userId: string;
  }): Promise<Stripe.Customer> {
    const stripe = this.getStripe();

    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          userId: params.userId,
        },
      });

      logger.info('Stripe customer created', {
        customerId: customer.id,
        userId: params.userId,
      });

      return customer;
    } catch (error: any) {
      logger.error('Failed to create Stripe customer:', {
        error: error.message,
        userId: params.userId,
      });
      throw new InternalServerError('Failed to create customer');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    userId: string;
  }): Promise<Stripe.Checkout.Session> {
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

      logger.info('Checkout session created', {
        sessionId: session.id,
        userId: params.userId,
      });

      return session;
    } catch (error: any) {
      logger.error('Failed to create checkout session:', {
        error: error.message,
        userId: params.userId,
      });
      throw new InternalServerError('Failed to create checkout session');
    }
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getStripe();

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      logger.info('Portal session created', {
        sessionId: session.id,
        customerId: params.customerId,
      });

      return session;
    } catch (error: any) {
      logger.error('Failed to create portal session:', {
        error: error.message,
        customerId: params.customerId,
      });
      throw new InternalServerError('Failed to create portal session');
    }
  }

  /**
   * Retrieve a subscription
   */
  async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription | null> {
    const stripe = this.getStripe();

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Failed to retrieve subscription:', {
        error: error.message,
        subscriptionId,
      });
      throw new InternalServerError('Failed to retrieve subscription');
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(params: {
    subscriptionId: string;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Stripe.Subscription> {
    const stripe = this.getStripe();

    try {
      const subscription = await stripe.subscriptions.update(
        params.subscriptionId,
        {
          cancel_at_period_end: params.cancelAtPeriodEnd ?? true,
        }
      );

      logger.info('Subscription canceled', {
        subscriptionId: params.subscriptionId,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
      });

      return subscription;
    } catch (error: any) {
      logger.error('Failed to cancel subscription:', {
        error: error.message,
        subscriptionId: params.subscriptionId,
      });
      throw new InternalServerError('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    const stripe = this.getStripe();

    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      logger.info('Subscription reactivated', { subscriptionId });

      return subscription;
    } catch (error: any) {
      logger.error('Failed to reactivate subscription:', {
        error: error.message,
        subscriptionId,
      });
      throw new InternalServerError('Failed to reactivate subscription');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(params: {
    payload: string | Buffer;
    signature: string;
    secret: string;
  }): Stripe.Event {
    const stripe = this.getStripe();

    try {
      const event = stripe.webhooks.constructEvent(
        params.payload,
        params.signature,
        params.secret
      );

      return event;
    } catch (error: any) {
      logger.error('Webhook signature verification failed:', {
        error: error.message,
      });
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice | null> {
    const stripe = this.getStripe();

    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Failed to retrieve invoice:', {
        error: error.message,
        invoiceId,
      });
      throw new InternalServerError('Failed to retrieve invoice');
    }
  }

  /**
   * List customer invoices
   */
  async listInvoices(params: {
    customerId: string;
    limit?: number;
  }): Promise<Stripe.Invoice[]> {
    const stripe = this.getStripe();

    try {
      const invoices = await stripe.invoices.list({
        customer: params.customerId,
        limit: params.limit || 10,
      });

      return invoices.data;
    } catch (error: any) {
      logger.error('Failed to list invoices:', {
        error: error.message,
        customerId: params.customerId,
      });
      throw new InternalServerError('Failed to list invoices');
    }
  }
}

export const stripeService = new StripeService();
