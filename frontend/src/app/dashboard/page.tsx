'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubdomainStore } from '@/store/subdomainStore';
import { Button } from '@/components/ui/Button';
import { SubdomainList } from '@/components/dashboard/SubdomainList';
import { CreateSubdomainModal } from '@/components/dashboard/CreateSubdomainModal';
import { EditSubdomainModal } from '@/components/dashboard/EditSubdomainModal';
import { DeleteSubdomainModal } from '@/components/dashboard/DeleteSubdomainModal';
import { UpgradeBanner } from '@/components/dashboard/UpgradeBanner';
import AppLayout from '@/components/layout/AppLayout';
import { Subdomain } from '@/types';

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { subdomains, isLoading, fetchSubdomains, stats, quota, upgradeInfo, clearUpgradeInfo } = useSubdomainStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubdomain, setSelectedSubdomain] = useState<Subdomain | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Fetch subdomains on mount
  useEffect(() => {
    if (user) {
      fetchSubdomains();
    }
  }, [user, fetchSubdomains]);

  const handleEdit = (subdomain: Subdomain) => {
    setSelectedSubdomain(subdomain);
    setShowEditModal(true);
  };

  const handleDelete = (subdomain: Subdomain) => {
    setSelectedSubdomain(subdomain);
    setShowDeleteModal(true);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout currentPage="dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back{user.firstName ? `, ${user.firstName}` : ''}!
          </h2>
          <p className="text-gray-600">Manage your subdomains and DNS settings</p>
        </div>

        {/* Upgrade Banner - Show when quota exceeded */}
        {!bannerDismissed && (upgradeInfo || (quota && !quota.allowed)) && (
          <UpgradeBanner
            currentUsed={upgradeInfo?.currentUsed || quota?.used || 0}
            currentQuota={upgradeInfo?.currentQuota || quota?.total || 0}
            availablePlans={upgradeInfo?.availablePlans || [
              {
                plan: 'PACKAGE_5',
                name: '5 Subdomains Package',
                price: 1000,
                quota: 7,
              },
              {
                plan: 'PACKAGE_50',
                name: '50 Subdomains Package',
                price: 5000,
                quota: 52,
              },
            ]}
            onClose={() => {
              clearUpgradeInfo();
              setBannerDismissed(true);
            }}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Subdomains</p>
                <p className="text-3xl font-bold">{stats?.total || 0}</p>
              </div>
              <div className="text-4xl">🌐</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.active || 0}
                </p>
              </div>
              <div className="text-4xl">✓</div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Quota</p>
                <p className="text-3xl font-bold">
                  {stats?.total || 0} / {quota?.total || 0}
                </p>
                {quota?.subscriptions && quota.subscriptions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    From {quota.subscriptions.length} subscription{quota.subscriptions.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Subdomains Section */}
        <div className="bg-white border border-gray-200 rounded-lg">
          {/* Section Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Subdomains</h3>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
              disabled={quota?.allowed === false}
              title={quota?.allowed === false ? 'Quota exceeded - upgrade to create more' : 'Create a new subdomain'}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Subdomain
            </Button>
          </div>

          {/* Subdomains List */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                <p className="mt-4 text-gray-600">Loading subdomains...</p>
              </div>
            ) : (
              <SubdomainList
                subdomains={subdomains}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold mb-2">💡 How it works</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Create a subdomain (e.g., myapp.saas.tf)</li>
            <li>• Point it to your server&apos;s IP address</li>
            <li>• DNS records are created automatically (propagation ~5 minutes)</li>
            <li>• Update or delete anytime from this dashboard</li>
          </ul>
        </div>
      </div>

      {/* Modals */}
      <CreateSubdomainModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchSubdomains()}
      />

      <EditSubdomainModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSubdomain(null);
        }}
        subdomain={selectedSubdomain}
        onSuccess={() => fetchSubdomains()}
      />

      <DeleteSubdomainModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedSubdomain(null);
        }}
        subdomain={selectedSubdomain}
        onSuccess={() => fetchSubdomains()}
      />
    </AppLayout>
  );
}
