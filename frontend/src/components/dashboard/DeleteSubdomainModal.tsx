'use client';

import { useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSubdomainStore } from '@/store/subdomainStore';
import { Subdomain } from '@/types';

interface DeleteSubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: Subdomain | null;
  onSuccess?: () => void;
}

export const DeleteSubdomainModal: React.FC<DeleteSubdomainModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  onSuccess,
}) => {
  const { deleteSubdomain, isLoading, error, clearError } = useSubdomainStore();

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  const handleDelete = async () => {
    if (!subdomain) return;

    try {
      await deleteSubdomain(subdomain.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by store
    }
  };

  if (!subdomain) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Subdomain" maxWidth="sm">
      <div className="space-y-4">
        {/* Warning */}
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="font-semibold text-red-900">Warning</h4>
              <p className="text-sm text-red-700 mt-1">
                This action cannot be undone. The DNS record will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Subdomain Info */}
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete this subdomain?
          </p>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded">
            <div className="font-mono font-semibold">{subdomain.fullDomain}</div>
            <div className="text-sm text-gray-600 mt-1">
              Points to: {subdomain.ipAddress}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDelete}
            isLoading={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            Delete Subdomain
          </Button>
        </div>
      </div>
    </Modal>
  );
};
