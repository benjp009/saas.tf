'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Client component to initialize stores from localStorage on app mount
 * This ensures authentication state persists across page refreshes
 */
export default function StoreInitializer() {
  const [mounted, setMounted] = useState(false);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    // Load user and token from localStorage on mount
    useAuthStore.getState().loadUserFromStorage();
    setMounted(true);
  }, []);

  // Show loading until auth initialized
  if (!mounted || !isInitialized) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}
