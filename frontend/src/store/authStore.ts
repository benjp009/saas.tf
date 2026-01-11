import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isAuthenticating: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  clearAuth: () => void;
  loadUserFromStorage: () => Promise<void>;
  refreshToken: () => Promise<string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  isAuthenticating: false,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.login({ email, password });

      // Save to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await api.register({ email, password, firstName, lastName });

      // Save to localStorage
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      set({
        user: response.user,
        token: response.token,
        isLoading: false
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  clearAuth: () => {
    // Called by API interceptor when 401 is received
    set({ user: null, token: null });
  },

  loadUserFromStorage: async () => {
    try {
      set({ isAuthenticating: true });
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token });

        // Validate token with backend
        try {
          await api.getCurrentUser();
          set({ isInitialized: true, isAuthenticating: false });
        } catch (error) {
          // Token invalid, clear auth
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({
            user: null,
            token: null,
            isInitialized: true,
            isAuthenticating: false
          });
        }
      } else {
        set({ isInitialized: true, isAuthenticating: false });
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
      set({ isInitialized: true, isAuthenticating: false });
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.refreshToken();
      localStorage.setItem('token', response.token);
      set({ token: response.token });
      return response.token;
    } catch (error) {
      // Refresh failed, logout
      get().logout();
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
