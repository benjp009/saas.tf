export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Subdomain {
  id: string;
  name: string;
  ipAddress: string;
  isActive: boolean;
  dnsRecordId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  userId: string;
}

export interface Subscription {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING';
  plan: 'FREE' | 'PACKAGE_5' | 'PACKAGE_50';
  subdomainQuota: number;
  subdomainsUsed: number;
  stripeCurrentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlan {
  name: string;
  priceId: string | null;
  price: number;
  subdomainQuota: number;
  features: string[];
}

export interface SubscriptionPlans {
  FREE: SubscriptionPlan;
  PACKAGE_5: SubscriptionPlan;
  PACKAGE_50: SubscriptionPlan;
}

export interface SubscriptionWithDetails extends Subscription {
  planDetails: SubscriptionPlan;
  daysUntilRenewal?: number;
  isInGracePeriod: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  description: string;
  receiptUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface CheckoutSession {
  url: string;
}

export interface PortalSession {
  url: string;
}

export interface QuotaInfo {
  canCreate: boolean;
  quota: number;
  used: number;
  remaining: number;
  plan: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    timestamp: string;
  };
}
