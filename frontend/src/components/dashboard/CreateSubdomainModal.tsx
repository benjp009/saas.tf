'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSubdomainStore } from '@/store/subdomainStore';

interface CreateSubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSubdomainModal: React.FC<CreateSubdomainModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createSubdomain, checkAvailability, isLoading, error, clearError } = useSubdomainStore();

  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<{
    available?: boolean;
    reason?: string;
  }>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', ipAddress: '' });
      setFormErrors({});
      setAvailability({});
      clearError();
    }
  }, [isOpen, clearError]);

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, name }));
    setFormErrors((prev) => ({ ...prev, name: '' }));
    setAvailability({});

    // Check availability after typing stops
    if (name.length >= 3) {
      setChecking(true);
      try {
        const result = await checkAvailability(name);
        setAvailability(result);
      } catch (error) {
        // Error handled by store
      } finally {
        setChecking(false);
      }
    }
  };

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, ipAddress: e.target.value }));
    setFormErrors((prev) => ({ ...prev, ipAddress: '' }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name) {
      errors.name = 'Subdomain name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Subdomain must be at least 3 characters';
    } else if (!availability.available) {
      errors.name = availability.reason === 'reserved'
        ? 'This subdomain is reserved'
        : 'This subdomain is already taken';
    }

    if (!formData.ipAddress) {
      errors.ipAddress = 'IP address is required';
    } else if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(formData.ipAddress)) {
      errors.ipAddress = 'Invalid IPv4 address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createSubdomain(formData.name, formData.ipAddress);
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Subdomain">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Global Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Subdomain Name */}
        <div>
          <Input
            label="Subdomain Name"
            type="text"
            name="name"
            placeholder="myapp"
            value={formData.name}
            onChange={handleNameChange}
            error={formErrors.name}
            helperText="3-63 characters, lowercase letters, numbers, and hyphens only"
          />
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Your domain will be:{' '}
              <span className="font-mono font-semibold">
                {formData.name || 'myapp'}.saas.tf
              </span>
            </p>
            {checking && (
              <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
            )}
            {availability.available === true && (
              <p className="text-sm text-green-600 mt-1">✓ Available!</p>
            )}
            {availability.available === false && (
              <p className="text-sm text-red-600 mt-1">
                ✗ {availability.reason === 'reserved' ? 'Reserved' : 'Already taken'}
              </p>
            )}
          </div>
        </div>

        {/* IP Address */}
        <Input
          label="IP Address"
          type="text"
          name="ipAddress"
          placeholder="192.168.1.1"
          value={formData.ipAddress}
          onChange={handleIpChange}
          error={formErrors.ipAddress}
          helperText="The IPv4 address where your subdomain will point"
        />

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!availability.available || checking}
          >
            Create Subdomain
          </Button>
        </div>
      </form>
    </Modal>
  );
};
