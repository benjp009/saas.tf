'use client';

import { SubscriptionPlans } from '@/types';
import { useBillingStore } from '@/store/billingStore';

interface PlanSelectionProps {
  currentPlan: 'FREE' | 'PACKAGE_5' | 'PACKAGE_50';
  plans: SubscriptionPlans;
}

export default function PlanSelection({ currentPlan, plans }: PlanSelectionProps) {
  const { createCheckout, isLoading } = useBillingStore();

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'FREE') return;

    try {
      await createCheckout(planKey);
    } catch (error) {
      // Error handled by store
    }
  };

  const planOrder: ('FREE' | 'PACKAGE_5' | 'PACKAGE_50')[] = ['FREE', 'PACKAGE_5', 'PACKAGE_50'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {planOrder.map((planKey) => {
        const plan = plans[planKey];
        const isCurrentPlan = planKey === currentPlan;
        const isFree = planKey === 'FREE';

        return (
          <div
            key={planKey}
            className={`relative border rounded-lg p-6 ${
              isCurrentPlan
                ? 'border-black bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Current Plan Badge */}
            {isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                  You have this
                </span>
              </div>
            )}

            {/* Plan Name */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-black">{plan.name}</h3>
            </div>

            {/* Price */}
            <div className="mb-6">
              {plan.price === 0 ? (
                <div className="text-3xl font-bold text-black">Free</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-black">
                    {formatPrice(plan.price)}
                  </div>
                  <div className="text-sm text-gray-600">per year</div>
                </>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
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
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            {/* Action Button */}
            <button
              onClick={() => handleUpgrade(planKey)}
              disabled={isFree || isLoading}
              className={`w-full px-4 py-2 rounded font-medium transition-colors ${
                isFree
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {isFree
                ? 'Free Plan'
                : isLoading
                ? 'Processing...'
                : isCurrentPlan
                ? 'Buy Another'
                : 'Buy Package'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
