'use client';

import { Button } from '../ui/Button';
import { useBillingStore } from '@/store/billingStore';

interface UpgradeBannerProps {
  currentUsed: number;
  currentQuota: number;
  availablePlans: Array<{
    plan: string;
    name: string;
    price: number;
    quota: number;
  }>;
  onClose: () => void;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({
  currentUsed,
  currentQuota,
  availablePlans,
  onClose,
}) => {
  const { createCheckout, isLoading } = useBillingStore();

  const handleUpgrade = async (plan: string) => {
    try {
      await createCheckout(plan);
    } catch (error) {
      // Error handled by store
      console.error('Failed to create checkout:', error);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-amber-900 mb-1">
            Subdomain Quota Reached
          </h3>
          <p className="text-sm text-amber-700">
            You&apos;ve used {currentUsed} of {currentQuota} subdomains. Upgrade to add more!
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-amber-600 hover:text-amber-800"
          aria-label="Close banner"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availablePlans.map((plan) => (
          <div
            key={plan.plan}
            className="bg-white border border-amber-200 rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h4 className="font-semibold text-gray-900">{plan.name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {plan.quota} total subdomains
              </p>
              <p className="text-lg font-bold text-gray-900 mt-2">
                {formatPrice(plan.price)}/year
              </p>
            </div>
            <Button
              onClick={() => handleUpgrade(plan.plan)}
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Upgrade
            </Button>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <p className="text-xs text-amber-700 mt-4">
        After payment, your quota will update automatically and you can create more subdomains immediately.
      </p>
    </div>
  );
};
