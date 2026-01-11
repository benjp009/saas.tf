'use client';

import { SubscriptionWithDetails } from '@/types';
import { useBillingStore } from '@/store/billingStore';
import { useState } from 'react';

interface SubscriptionCardProps {
  subscription: SubscriptionWithDetails;
}

export default function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const { openPortal, cancelSubscription, isLoading } = useBillingStore();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { planDetails, daysUntilRenewal, isInGracePeriod } = subscription;

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'TRIALING':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Trial
          </span>
        );
      case 'PAST_DUE':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Past Due
          </span>
        );
      case 'CANCELED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Canceled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleCancelClick = () => {
    if (subscription.plan === 'FREE') {
      return; // Can't cancel free plan
    }
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelSubscription(subscription.id);
      setShowCancelConfirm(false);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-black">{planDetails.name}</h2>
          <p className="mt-1 text-3xl font-bold text-black">
            {planDetails.price === 0 ? 'Free' : `${formatPrice(planDetails.price)}/year`}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Quota Usage */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Subdomain Usage</span>
          <span className="font-medium text-black">
            {subscription.subdomainsUsed} / {subscription.plan === 'FREE' ? subscription.subdomainQuota : subscription.subdomainQuota - 2}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-black h-2 rounded-full transition-all"
            style={{
              width: `${Math.min(100, (subscription.subdomainsUsed / (subscription.plan === 'FREE' ? subscription.subdomainQuota : subscription.subdomainQuota - 2)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Included Features</h3>
        <ul className="space-y-2">
          {planDetails.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Renewal Info */}
      {daysUntilRenewal !== undefined && subscription.status === 'ACTIVE' && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-4">
          <p className="text-sm text-gray-600">
            Next billing date in <span className="font-medium text-black">{daysUntilRenewal} days</span>
          </p>
        </div>
      )}

      {/* Grace Period Warning */}
      {isInGracePeriod && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-yellow-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Payment Failed - Grace Period</h4>
              <p className="mt-1 text-sm text-yellow-700">
                Your subscription is past due. Please update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {subscription.plan !== 'FREE' && (
          <button
            onClick={() => openPortal()}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-black text-black rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Manage Billing
          </button>
        )}

        {subscription.plan !== 'FREE' && subscription.status === 'ACTIVE' && (
          <button
            onClick={handleCancelClick}
            disabled={isLoading}
            className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel Package
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-black mb-4">Cancel Package?</h3>
            <p className="text-gray-600 mb-6">
              Your package will remain active until the end of the current billing period.
              After that, you'll have access to the Free tier (2 subdomains).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Canceling...' : 'Cancel Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
