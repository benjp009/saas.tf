import { create } from 'zustand';
import { api } from '@/lib/api';
import {
  SubscriptionWithDetails,
  SubscriptionPlans,
  QuotaInfo,
} from '@/types';

interface BillingState {
  subscriptions: SubscriptionWithDetails[];
  subscription: SubscriptionWithDetails | null; // Keep for backward compatibility
  totalQuota: number;
  plans: SubscriptionPlans | null;
  quota: QuotaInfo | null;
  isLoadingSubscription: boolean;
  isLoadingPlans: boolean;
  isLoading: boolean; // For other actions (checkout, portal, etc.)
  error: string | null;

  // Actions
  fetchSubscriptions: () => Promise<void>;
  fetchSubscription: () => Promise<void>; // Keep for backward compatibility
  fetchPlans: () => Promise<void>;
  fetchQuota: () => Promise<void>;
  createCheckout: (plan: string) => Promise<void>;
  openPortal: () => Promise<void>;
  cancelSubscription: (subscriptionId?: string) => Promise<void>;
  clearError: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  subscriptions: [],
  subscription: null,
  totalQuota: 0,
  plans: null,
  quota: null,
  isLoadingSubscription: false,
  isLoadingPlans: false,
  isLoading: false,
  error: null,

  fetchSubscriptions: async () => {
    try {
      set({ isLoadingSubscription: true, error: null });
      const data = await api.getUserSubscriptions();
      set({
        subscriptions: data.subscriptions || [],
        totalQuota: data.totalQuota || 0,
        subscription: data.subscriptions?.[0] || null, // Set first subscription for backward compatibility
        isLoadingSubscription: false,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to fetch subscriptions';
      set({ error: errorMessage, isLoadingSubscription: false });
      throw error;
    }
  },

  fetchSubscription: async () => {
    try {
      set({ isLoadingSubscription: true, error: null });
      const data = await api.getCurrentSubscription();
      set({ subscription: data.subscription, isLoadingSubscription: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to fetch subscription';
      set({ error: errorMessage, isLoadingSubscription: false });
      throw error;
    }
  },

  fetchPlans: async () => {
    try {
      set({ isLoadingPlans: true, error: null });
      const data = await api.getSubscriptionPlans();

      // Transform array to object keyed by plan id
      const plansObject = data.plans.reduce((acc: any, plan: any) => {
        const { id, ...planData } = plan;
        acc[id] = { ...planData, priceId: planData.priceId || null };
        return acc;
      }, {});

      set({ plans: plansObject, isLoadingPlans: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to fetch plans';
      set({ error: errorMessage, isLoadingPlans: false });
      throw error;
    }
  },

  fetchQuota: async () => {
    try {
      const data = await api.getQuota();
      set({ quota: data });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to fetch quota';
      set({ error: errorMessage });
      throw error;
    }
  },

  createCheckout: async (plan: string) => {
    try {
      set({ isLoading: true, error: null });

      const successUrl = `${window.location.origin}/billing?session=success`;
      const cancelUrl = `${window.location.origin}/billing?session=canceled`;

      const data = await api.createCheckoutSession(plan, successUrl, cancelUrl);

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to create checkout session';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  openPortal: async () => {
    try {
      set({ isLoading: true, error: null });

      const returnUrl = `${window.location.origin}/billing`;
      const data = await api.createPortalSession(returnUrl);

      // Redirect to Stripe customer portal
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        throw new Error('No portal URL received from server');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to open billing portal';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  cancelSubscription: async (subscriptionId?: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.cancelSubscription(subscriptionId);

      // Refresh subscription data
      await get().fetchSubscriptions();

      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || 'Failed to cancel subscription';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
