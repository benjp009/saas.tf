'use client';

import { Subdomain } from '@/types';
import { Button } from '../ui/Button';

interface SubdomainListProps {
  subdomains: Subdomain[];
  onEdit: (subdomain: Subdomain) => void;
  onDelete: (subdomain: Subdomain) => void;
}

export const SubdomainList: React.FC<SubdomainListProps> = ({
  subdomains,
  onEdit,
  onDelete,
}) => {
  if (subdomains.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🌐</div>
        <h3 className="text-xl font-semibold mb-2">No subdomains yet</h3>
        <p className="text-gray-600">
          Create your first subdomain to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subdomains.map((subdomain) => (
        <div
          key={subdomain.id}
          className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            {/* Subdomain Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold font-mono">
                  {subdomain.fullDomain}
                </h3>
                {subdomain.isActive ? (
                  <span
                    className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded inline-flex items-center"
                    title="This subdomain is active and resolvable via DNS"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Active
                  </span>
                ) : (
                  <span
                    className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded inline-flex items-center"
                    title="This subdomain is inactive and not resolvable via DNS"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Inactive
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center text-gray-600">
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
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span className="font-medium mr-2">Points to:</span>
                  <code className="bg-gray-100 px-2 py-0.5 rounded">
                    {subdomain.ipAddress}
                  </code>
                </div>

                <div className="flex items-center text-gray-600">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium mr-2">Created:</span>
                  {new Date(subdomain.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(subdomain)}
                title="Edit IP address"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(subdomain)}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
                title="Delete subdomain"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
