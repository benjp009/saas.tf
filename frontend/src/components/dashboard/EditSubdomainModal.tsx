'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSubdomainStore } from '@/store/subdomainStore';
import { Subdomain } from '@/types';

interface EditSubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: Subdomain | null;
  onSuccess?: () => void;
}

export const EditSubdomainModal: React.FC<EditSubdomainModalProps> = ({
  isOpen,
  onClose,
  subdomain,
  onSuccess,
}) => {
  const { updateSubdomain, isLoading, error, clearError } = useSubdomainStore();

  const [ipAddress, setIpAddress] = useState('');
  const [ipError, setIpError] = useState('');

  // Initialize IP address when subdomain changes
  useEffect(() => {
    if (subdomain) {
      setIpAddress(subdomain.ipAddress);
    }
  }, [subdomain]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIpError('');
      clearError();
    }
  }, [isOpen, clearError]);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpAddress(e.target.value);
    setIpError('');
  };

  const validateIp = () => {
    if (!ipAddress) {
      setIpError('IP address is required');
      return false;
    }

    if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
      setIpError('Invalid IPv4 address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subdomain || !validateIp()) {
      return;
    }

    // Don't update if IP hasn't changed
    if (ipAddress === subdomain.ipAddress) {
      onClose();
      return;
    }

    try {
      await updateSubdomain(subdomain.id, ipAddress);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by store
    }
  };

  if (!subdomain) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Subdomain">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Subdomain Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subdomain
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded">
            <span className="font-mono font-semibold">{subdomain.fullDomain}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Subdomain name cannot be changed
          </p>
        </div>

        {/* IP Address */}
        <Input
          label="IP Address"
          type="text"
          name="ipAddress"
          placeholder="192.168.1.1"
          value={ipAddress}
          onChange={handleIpChange}
          error={ipError}
          helperText="Update the IPv4 address where your subdomain points"
        />

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
