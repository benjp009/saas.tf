import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { stripeService } from '../../src/services/stripe.service';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/stripe.service');

describe('POST /api/v1/webhooks/stripe', () => {
  const webhookEndpoint = '/api/v1/webhooks/stripe';
  const mockUserId = 'user_test_123';
  const mockStripeSignature = 'test_signature_123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Signature Verification', () => {
    it('should reject requests without signature header', async () => {
      const response = await request(app)
        .post(webhookEndpoint)
        .send({ type: 'checkout.session.completed' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No signature provided');
    });

    it('should reject requests with invalid signature', async () => {
      (stripeService.verifyWebhookSignature as jest.Mock).mockImplementation(
        () => {
          throw new Error('Invalid webhook signature');
        }
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', 'invalid_signature')
        .send({ type: 'test.event' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid webhook signature');
    });

    it('should accept requests with valid signature', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        object: 'event',
        api_version: null,
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: null,
        type: 'account.updated', // Use a valid Stripe event type
        data: { object: {} },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });

  describe('checkout.session.completed', () => {
    it('should create subscription in database', async () => {
      const mockCheckoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_123',
        mode: 'subscription',
        subscription: 'sub_stripe_123',
        metadata: { userId: mockUserId },
      };

      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_stripe_123',
        status: 'active',
        current_period_start: 1704067200, // 2024-01-01
        current_period_end: 1735689600, // 2025-01-01
        items: {
          object: 'list',
          data: [
            {
              id: 'si_test',
              object: 'subscription_item',
              price: {
                id: 'price_test_package_5',
              } as any,
              quantity: 1,
              subscription: 'sub_test',
              created: 0,
              metadata: {},
              billing_thresholds: null,
              tax_rates: [],
            } as any,
          ],
          has_more: false,
          url: '',
        },
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (stripeService.getSubscription as jest.Mock).mockResolvedValue(
        mockStripeSubscription
      );
      (prisma.subscription.create as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
        userId: mockUserId,
      });

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('should handle missing userId metadata gracefully', async () => {
      const mockCheckoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_123',
        mode: 'subscription',
        subscription: 'sub_stripe_123',
        metadata: {}, // No userId
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      // Should still return 200 but not create subscription
      expect(response.status).toBe(200);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it('should ignore non-subscription checkout sessions', async () => {
      const mockCheckoutSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_123',
        mode: 'payment', // Not subscription
        metadata: { userId: mockUserId },
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: mockCheckoutSession },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('should update subscription status and period dates', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_stripe_123',
        status: 'past_due',
        current_period_start: 1704067200,
        current_period_end: 1735689600,
        cancel_at_period_end: false,
        cancel_at: null,
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
        status: 'ACTIVE',
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAST_DUE',
          }),
        })
      );
    });

    it('should update cancel_at_period_end flag', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_stripe_123',
        status: 'active',
        current_period_start: 1704067200,
        current_period_end: 1735689600,
        cancel_at_period_end: true,
        cancel_at: 1735689600,
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: { object: mockSubscription },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stripeCancelAtPeriodEnd: true,
          }),
        })
      );
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should mark subscription as CANCELED', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_stripe_123',
        status: 'canceled',
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
        stripeSubscriptionId: 'sub_stripe_123',
      });
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_db_123' },
        data: {
          status: 'CANCELED',
          canceledAt: expect.any(Date),
          endedAt: expect.any(Date),
        },
      });
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('should create payment record in database', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: 'sub_stripe_123',
        amount_paid: 1000,
        currency: 'usd',
        description: 'Subscription payment',
        hosted_invoice_url: 'https://invoice.stripe.com/test',
        created: 1704067200,
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
        userId: mockUserId,
        stripeSubscriptionId: 'sub_stripe_123',
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          subscriptionId: 'sub_db_123',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
          stripeInvoiceId: 'in_test_123',
          description: 'Subscription payment',
          receiptUrl: 'https://invoice.stripe.com/test',
          paidAt: expect.any(Date),
        },
      });
    });

    it('should handle invoice without subscription gracefully', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: null, // No subscription
        amount_paid: 1000,
        currency: 'usd',
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('should create failed payment record', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_failed_123',
        subscription: 'sub_stripe_123',
        amount_due: 1000,
        currency: 'usd',
        description: 'Failed subscription payment',
        created: 1704067200,
      };

      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: { object: mockInvoice },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub_db_123',
        userId: mockUserId,
        stripeSubscriptionId: 'sub_stripe_123',
        user: { id: mockUserId, email: 'test@example.com' },
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          subscriptionId: 'sub_db_123',
          amount: 1000,
          currency: 'usd',
          status: 'failed',
          stripeInvoiceId: 'in_failed_123',
          description: 'Failed subscription payment',
          createdAt: expect.any(Date),
        },
      });
    });
  });

  describe('Unhandled Events', () => {
    it('should acknowledge unhandled event types', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.created', // Unhandled event
        data: { object: {} },
      } as Stripe.Event;

      (stripeService.verifyWebhookSignature as jest.Mock).mockReturnValue(
        mockEvent
      );

      const response = await request(app)
        .post(webhookEndpoint)
        .set('stripe-signature', mockStripeSignature)
        .send(mockEvent);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });
});
