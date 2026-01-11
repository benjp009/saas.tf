import { create } from 'zustand';
import { api } from '@/lib/api';
import { Subdomain } from '@/types';

interface SubdomainState {
  subdomains: Subdomain[];
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    active: number;
    inactive: number;
  } | null;
  quota: {
    allowed: boolean;
    used: number;
    total: number;
    plan: string;
    subscriptions?: any[];
  } | null;
  upgradeInfo: {
    currentUsed: number;
    currentQuota: number;
    availablePlans: Array<{
      plan: string;
      name: string;
      price: number;
      quota: number;
    }>;
  } | null;

  // Actions
  fetchSubdomains: () => Promise<void>;
  checkAvailability: (name: string) => Promise<{ available: boolean; reason?: string }>;
  createSubdomain: (name: string, ipAddress: string) => Promise<Subdomain>;
  updateSubdomain: (id: string, ipAddress: string) => Promise<Subdomain>;
  deleteSubdomain: (id: string) => Promise<void>;
  clearError: () => void;
  clearUpgradeInfo: () => void;
}

export const useSubdomainStore = create<SubdomainState>((set, get) => ({
  subdomains: [],
  isLoading: false,
  error: null,
  stats: null,
  quota: null,
  upgradeInfo: null,

  fetchSubdomains: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.getSubdomains();

      set({
        subdomains: response.subdomains,
        stats: response.stats,
        quota: response.quota,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to fetch subdomains';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  checkAvailability: async (name: string) => {
    try {
      const response = await api.checkSubdomainAvailability(name);
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to check availability';
      set({ error: errorMessage });
      throw error;
    }
  },

  createSubdomain: async (name: string, ipAddress: string) => {
    try {
      set({ isLoading: true, error: null, upgradeInfo: null });

      const response = await api.createSubdomain({ name, ipAddress });
      const newSubdomain = response.subdomain;

      // Add to list
      set((state) => ({
        subdomains: [newSubdomain, ...state.subdomains],
        isLoading: false,
      }));

      // Refresh to get updated stats and quota
      get().fetchSubdomains();

      return newSubdomain;
    } catch (error: any) {
      const errorData = error.response?.data?.error;

      // Handle quota exceeded specifically
      if (errorData?.code === 'QUOTA_EXCEEDED') {
        set({
          error: errorData.message,
          upgradeInfo: errorData.upgradeInfo,
          isLoading: false
        });
      } else {
        const errorMessage = errorData?.message || 'Failed to create subdomain';
        set({ error: errorMessage, isLoading: false });
      }

      throw error;
    }
  },

  updateSubdomain: async (id: string, ipAddress: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.updateSubdomain(id, { ipAddress });
      const updatedSubdomain = response.subdomain;

      // Update in list
      set((state) => ({
        subdomains: state.subdomains.map((s) =>
          s.id === id ? updatedSubdomain : s
        ),
        isLoading: false,
      }));

      return updatedSubdomain;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to update subdomain';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteSubdomain: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      await api.deleteSubdomain(id);

      // Remove from list
      set((state) => ({
        subdomains: state.subdomains.filter((s) => s.id !== id),
        isLoading: false,
      }));

      // Refresh to get updated stats
      get().fetchSubdomains();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to delete subdomain';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearUpgradeInfo: () => set({ upgradeInfo: null }),
}));
