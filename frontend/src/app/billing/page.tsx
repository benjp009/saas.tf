'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBillingStore } from '@/store/billingStore';
import SubscriptionCard from '@/components/billing/SubscriptionCard';
import PlanSelection from '@/components/billing/PlanSelection';
import AppLayout from '@/components/layout/AppLayout';

// Force dynamic rendering to avoid static generation issues with useSearchParams
export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    subscriptions,
    totalQuota,
    plans,
    isLoadingSubscription,
    isLoadingPlans,
    error,
    fetchSubscriptions,
    fetchPlans,
    clearError,
  } = useBillingStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load subscriptions and plans
    fetchSubscriptions();
    fetchPlans();

    // Check for checkout session status
    const session = searchParams.get('session');
    if (session === 'success') {
      setShowSuccess(true);
      // Remove query param
      router.replace('/billing');
    } else if (session === 'canceled') {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }
  }, [user, router, searchParams, fetchSubscriptions, fetchPlans]);

  if (isAuthLoading || isLoadingSubscription || isLoadingPlans) {
    return (
      <AppLayout currentPage="billing">
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            <p className="ml-3 text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout currentPage="billing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Billing & Subscription</h1>
          <p className="mt-2 text-gray-600">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Subscription Updated Successfully
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Your subscription has been activated. Thank you for upgrading!
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setShowSuccess(false)}
                  className="inline-flex text-green-400 hover:text-green-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Canceled Message */}
        {showCanceled && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Checkout Canceled
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  You canceled the checkout process. No changes were made to your subscription.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={clearError}
                  className="inline-flex text-red-400 hover:text-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {subscriptions && subscriptions.length > 0 && plans && (
          <div className="space-y-8">
            {/* Total Quota Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-2">
                Total Subdomain Quota
              </h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-black">
                  {subscriptions.reduce((sum, sub) => sum + (sub.subdomainsUsed || 0), 0)} / {totalQuota}
                </p>
                <p className="text-lg text-gray-600">subdomains</p>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                From {subscriptions.length} active subscription{subscriptions.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Current Subscriptions */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6">
                Current Subscriptions
              </h2>
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                  />
                ))}
              </div>
            </div>

            {/* Plan Selection */}
            <div>
              <h2 className="text-2xl font-bold text-black mb-6">
                Buy More Packages
              </h2>
              <p className="text-gray-600 mb-6">
                Purchase additional packages to increase your subdomain quota. Each package adds to your total limit and has its own billing cycle.
              </p>
              <PlanSelection
                currentPlan={subscriptions[0]?.plan}
                plans={plans}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
