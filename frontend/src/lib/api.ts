import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig;

        if (error.response?.status === 401 && !originalRequest._retry) {
          // Attempt token refresh once
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            originalRequest._retry = true;

            try {
              this.refreshPromise = useAuthStore.getState().refreshToken();
              const newToken = await this.refreshPromise;

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              this.isRefreshing = false;
              this.refreshPromise = null;

              return this.client(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear auth and redirect
              this.isRefreshing = false;
              this.refreshPromise = null;

              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                const returnTo = currentPath !== '/auth/login' ? `?returnTo=${currentPath}` : '';
                window.location.href = `/auth/login${returnTo}`;
              }

              return Promise.reject(refreshError);
            }
          } else if (this.refreshPromise) {
            // Wait for ongoing refresh
            try {
              const newToken = await this.refreshPromise;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } catch (refreshError) {
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: { email: string; password: string; firstName?: string; lastName?: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    return response.data;
  }

  // Subdomain endpoints (to be implemented)
  async getSubdomains() {
    const response = await this.client.get('/subdomains');
    return response.data;
  }

  async checkSubdomainAvailability(name: string) {
    const response = await this.client.get(`/subdomains/check/${name}`);
    return response.data;
  }

  async createSubdomain(data: { name: string; ipAddress: string }) {
    const response = await this.client.post('/subdomains', data);
    return response.data;
  }

  async updateSubdomain(id: string, data: { ipAddress: string }) {
    const response = await this.client.patch(`/subdomains/${id}`, data);
    return response.data;
  }

  async deleteSubdomain(id: string) {
    const response = await this.client.delete(`/subdomains/${id}`);
    return response.data;
  }

  // Subscription endpoints
  async getUserSubscriptions() {
    const response = await this.client.get('/subscriptions');
    return response.data;
  }

  async getCurrentSubscription() {
    const response = await this.client.get('/subscriptions/current');
    return response.data;
  }

  async getSubscriptionPlans() {
    const response = await this.client.get('/subscriptions/plans');
    return response.data;
  }

  async createCheckoutSession(plan: string, successUrl: string, cancelUrl: string) {
    const response = await this.client.post('/subscriptions/checkout', {
      plan,
      successUrl,
      cancelUrl,
    });
    return response.data;
  }

  async createPortalSession(returnUrl: string) {
    const response = await this.client.post('/subscriptions/portal', {
      returnUrl,
    });
    return response.data;
  }

  async cancelSubscription(subscriptionId?: string) {
    const response = await this.client.post('/subscriptions/cancel', {
      subscriptionId,
    });
    return response.data;
  }

  async getQuota() {
    const response = await this.client.get('/subscriptions/quota');
    return response.data;
  }
}

export const api = new ApiClient();
