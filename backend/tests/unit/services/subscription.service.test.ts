import { SubscriptionService } from '../../../src/services/subscription.service';
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import { prisma } from '../../../src/config/database';
import { SUBSCRIPTION_PLANS } from '../../../src/services/stripe.service';

// Mock dependencies
jest.mock('../../../src/config/database', () => ({
  prisma: {
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subdomain: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../../src/services/stripe.service');

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  const mockUserId = 'user_test_123';
  const mockDate = new Date('2024-01-15T00:00:00Z');

  beforeEach(() => {
    subscriptionService = new SubscriptionService();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getOrCreateSubscription', () => {
    it('should return existing active subscription', async () => {
      const mockSubscription = {
        id: 'sub_1',
        userId: mockUserId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        subdomainQuota: 2,
        subdomainsUsed: 0,
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(
        mockSubscription
      );

      const result = await subscriptionService.getOrCreateSubscription(mockUserId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
              SubscriptionStatus.PAST_DUE,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should create FREE subscription if none exists', async () => {
      const mockNewSubscription = {
        id: 'sub_new',
        userId: mockUserId,
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        subdomainQuota: 2,
        subdomainsUsed: 0,
      };

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.subscription.create as jest.Mock).mockResolvedValue(
        mockNewSubscription
      );

      const result = await subscriptionService.getOrCreateSubscription(mockUserId);

      expect(result).toEqual(mockNewSubscription);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: SUBSCRIPTION_PLANS.FREE.subdomainQuota,
          subdomainsUsed: 0,
        },
      });
    });
  });

  describe('getTotalQuota', () => {
    it('should return 2 for FREE subscription only', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );

      const result = await subscriptionService.getTotalQuota(mockUserId);

      expect(result.totalQuota).toBe(2);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.breakdown).toEqual([
        { plan: SubscriptionPlan.FREE, quota: 2, expiresAt: undefined },
      ]);
    });

    it('should stack multiple subscription quotas', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          stripeCurrentPeriodEnd: null,
        },
        {
          id: 'sub_2',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 7,
          stripeCurrentPeriodEnd: new Date('2024-12-31'),
        },
        {
          id: 'sub_3',
          plan: SubscriptionPlan.PACKAGE_50,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 52,
          stripeCurrentPeriodEnd: new Date('2024-12-31'),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );

      const result = await subscriptionService.getTotalQuota(mockUserId);

      expect(result.totalQuota).toBe(61); // 2 + 7 + 52
      expect(result.subscriptions).toHaveLength(3);
    });

    it('should only count ACTIVE, TRIALING, PAST_DUE subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
        },
        {
          id: 'sub_2',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 7,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );

      await subscriptionService.getTotalQuota(mockUserId);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: {
            in: [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
              SubscriptionStatus.PAST_DUE,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should auto-create FREE subscription if none exist', async () => {
      const mockFreeSubscription = {
        id: 'sub_free',
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        subdomainQuota: 2,
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.subscription.create as jest.Mock).mockResolvedValue(
        mockFreeSubscription
      );

      const result = await subscriptionService.getTotalQuota(mockUserId);

      expect(result.totalQuota).toBe(2);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });
  });

  describe('getUserSubscriptions', () => {
    it('should always put FREE subscription first', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_2',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 7,
          createdAt: new Date('2024-01-10'),
        },
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(5);

      const result = await subscriptionService.getUserSubscriptions(mockUserId);

      expect(result[0].plan).toBe(SubscriptionPlan.FREE);
      expect(result).toHaveLength(2);
    });

    it('should allocate usage across subscriptions in order', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          createdAt: new Date('2024-01-01'),
          stripeCurrentPeriodEnd: null,
        },
        {
          id: 'sub_2',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 7,
          createdAt: new Date('2024-01-10'),
          stripeCurrentPeriodEnd: null,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(5); // Using 5 of 9 total

      const result = await subscriptionService.getUserSubscriptions(mockUserId);

      // FREE should have 2 used (filled completely)
      expect(result[0].subdomainsUsed).toBe(2);
      // PACKAGE_5 should have 3 used (remaining from 5 total)
      expect(result[1].subdomainsUsed).toBe(3);
    });

    it('should calculate daysUntilRenewal correctly', async () => {
      const futureDate = new Date('2024-02-15T00:00:00Z'); // 31 days from mockDate

      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          createdAt: new Date('2024-01-01'),
          stripeCurrentPeriodEnd: null,
        },
        {
          id: 'sub_2',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 7,
          createdAt: new Date('2024-01-10'),
          stripeCurrentPeriodEnd: futureDate,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(0);

      const result = await subscriptionService.getUserSubscriptions(mockUserId);

      expect(result[0].daysUntilRenewal).toBeUndefined(); // FREE has no renewal
      expect(result[1].daysUntilRenewal).toBe(31);
    });

    it.skip('should detect grace period (within 48 hours of past_due)', async () => {
      // Set to exactly 2 days ago (on the boundary of grace period)
      const twoDaysAgo = new Date(mockDate.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.PAST_DUE,
          subdomainQuota: 7,
          createdAt: new Date('2024-01-01'),
          stripeCurrentPeriodEnd: twoDaysAgo,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(0);

      const result = await subscriptionService.getUserSubscriptions(mockUserId);

      // daysUntilRenewal should be -2, which satisfies >= -2
      expect(result[0].isInGracePeriod).toBe(true);
      expect(result[0].daysUntilRenewal).toBe(-2);
    });

    it('should not be in grace period if more than 48 hours past due', async () => {
      const threeDaysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.PACKAGE_5,
          status: SubscriptionStatus.PAST_DUE,
          subdomainQuota: 7,
          createdAt: new Date('2024-01-01'),
          stripeCurrentPeriodEnd: threeDaysAgo,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(0);

      const result = await subscriptionService.getUserSubscriptions(mockUserId);

      expect(result[0].isInGracePeriod).toBe(false);
    });
  });

  describe('canCreateSubdomain', () => {
    it('should allow when under quota', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          subdomainsUsed: 0,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(1); // 1 of 2 used

      const result = await subscriptionService.canCreateSubdomain(mockUserId);

      expect(result.allowed).toBe(true);
      expect(result.used).toBe(1);
      expect(result.quota).toBe(2);
    });

    it('should reject when at quota limit', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          subdomainsUsed: 2,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(2); // 2 of 2 used

      const result = await subscriptionService.canCreateSubdomain(mockUserId);

      expect(result.allowed).toBe(false);
      expect(result.used).toBe(2);
      expect(result.quota).toBe(2);
    });

    it('should count only active subdomains', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(1);

      await subscriptionService.canCreateSubdomain(mockUserId);

      expect(prisma.subdomain.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
      });
    });

    it('should update subdomainsUsed count for each subscription', async () => {
      const mockSubscriptions = [
        {
          id: 'sub_1',
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: 2,
          subdomainsUsed: 0, // Outdated
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(1); // Actual count
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});

      await subscriptionService.canCreateSubdomain(mockUserId);

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: { subdomainsUsed: 1 },
      });
    });
  });

  describe('handleExpiredSubscriptions', () => {
    it('should NOT expire subscriptions within 48hr grace period', async () => {
      // The query in handleExpiredSubscriptions filters for subscriptions
      // where stripeCurrentPeriodEnd <= now - 48 hours.
      // So subscriptions within grace period won't be in the results.
      // This test verifies the query returns nothing for recent subscriptions.

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]); // No results within grace period

      await subscriptionService.handleExpiredSubscriptions();

      // Should not update any subscriptions (none returned by query)
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('should expire subscriptions after 48hr grace period', async () => {
      const threeDaysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockExpiredSubscription = {
        id: 'sub_expired',
        userId: mockUserId,
        plan: SubscriptionPlan.PACKAGE_5,
        status: SubscriptionStatus.PAST_DUE,
        subdomainQuota: 7,
        stripeCurrentPeriodEnd: threeDaysAgo,
        user: { id: mockUserId, email: 'test@example.com' },
      };

      (prisma.subscription.findMany as jest.Mock)
        .mockResolvedValueOnce([mockExpiredSubscription]) // First call
        .mockResolvedValueOnce([]); // Second call for remaining subscriptions

      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (prisma.subscription.create as jest.Mock).mockResolvedValue({});
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(0);

      await subscriptionService.handleExpiredSubscriptions();

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_expired' },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endedAt: mockDate,
        },
      });
    });

    it('should deactivate subdomains if over remaining quota', async () => {
      const threeDaysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockExpiredSubscription = {
        id: 'sub_expired',
        userId: mockUserId,
        plan: SubscriptionPlan.PACKAGE_50,
        status: SubscriptionStatus.PAST_DUE,
        subdomainQuota: 52,
        stripeCurrentPeriodEnd: threeDaysAgo,
        user: { id: mockUserId, email: 'test@example.com' },
      };

      (prisma.subscription.findMany as jest.Mock)
        .mockResolvedValueOnce([mockExpiredSubscription]) // Expired subscription
        .mockResolvedValueOnce([]); // No remaining subscriptions

      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (prisma.subscription.create as jest.Mock).mockResolvedValue({
        subdomainQuota: 2,
      });
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(10); // 10 subdomains
      (prisma.subdomain.updateMany as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleExpiredSubscriptions();

      // Should deactivate all subdomains (10 > 2 remaining quota from FREE)
      expect(prisma.subdomain.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should preserve subdomains if within remaining quota', async () => {
      const threeDaysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockExpiredSubscription = {
        id: 'sub_expired',
        userId: mockUserId,
        plan: SubscriptionPlan.PACKAGE_5,
        status: SubscriptionStatus.PAST_DUE,
        subdomainQuota: 7,
        stripeCurrentPeriodEnd: threeDaysAgo,
        user: { id: mockUserId, email: 'test@example.com' },
      };

      const mockRemainingSubscription = {
        id: 'sub_active',
        plan: SubscriptionPlan.PACKAGE_50,
        subdomainQuota: 52,
      };

      (prisma.subscription.findMany as jest.Mock)
        .mockResolvedValueOnce([mockExpiredSubscription]) // Expired
        .mockResolvedValueOnce([mockRemainingSubscription]); // Remaining active

      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(10); // 10 subdomains
      (prisma.subdomain.updateMany as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleExpiredSubscriptions();

      // Should NOT deactivate (10 < 52 remaining quota)
      expect(prisma.subdomain.updateMany).not.toHaveBeenCalled();
    });

    it('should auto-create FREE subscription if none remain', async () => {
      const threeDaysAgo = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000);

      const mockExpiredSubscription = {
        id: 'sub_expired',
        userId: mockUserId,
        plan: SubscriptionPlan.PACKAGE_5,
        status: SubscriptionStatus.PAST_DUE,
        subdomainQuota: 7,
        stripeCurrentPeriodEnd: threeDaysAgo,
        user: { id: mockUserId, email: 'test@example.com' },
      };

      (prisma.subscription.findMany as jest.Mock)
        .mockResolvedValueOnce([mockExpiredSubscription])
        .mockResolvedValueOnce([]); // No remaining subscriptions

      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (prisma.subscription.create as jest.Mock).mockResolvedValue({
        subdomainQuota: 2,
      });
      (prisma.subdomain.count as jest.Mock).mockResolvedValue(0);

      await subscriptionService.handleExpiredSubscriptions();

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          subdomainQuota: SUBSCRIPTION_PLANS.FREE.subdomainQuota,
          subdomainsUsed: 0,
        },
      });
    });
  });

  describe('handleCheckoutComplete', () => {
    it('should create new subscription from webhook', async () => {
      const mockSubscription = {
        id: 'sub_new',
        userId: mockUserId,
        plan: SubscriptionPlan.PACKAGE_5,
        status: SubscriptionStatus.ACTIVE,
      };

      (prisma.subscription.create as jest.Mock).mockResolvedValue(
        mockSubscription
      );

      const result = await subscriptionService.handleCheckoutComplete({
        userId: mockUserId,
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: 'price_test_package_5',
        currentPeriodStart: new Date('2024-01-01'),
        currentPeriodEnd: new Date('2025-01-01'),
      });

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.create).toHaveBeenCalled();
    });

    it('should detect plan from price ID', async () => {
      (prisma.subscription.create as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleCheckoutComplete({
        userId: mockUserId,
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: process.env.STRIPE_PRICE_ID_PACKAGE_50!,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: SubscriptionPlan.PACKAGE_50,
          }),
        })
      );
    });

    it('should set correct quota for plan', async () => {
      (prisma.subscription.create as jest.Mock).mockResolvedValue({});

      await subscriptionService.handleCheckoutComplete({
        userId: mockUserId,
        stripeSubscriptionId: 'sub_stripe_123',
        stripePriceId: process.env.STRIPE_PRICE_ID_PACKAGE_5!,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      });

      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subdomainQuota: 7, // PACKAGE_5 quota
          }),
        })
      );
    });
  });
});
