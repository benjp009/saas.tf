'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isInitialized, isAuthenticating } = useAuthStore();

  useEffect(() => {
    // Wait for initialization to complete
    if (!isInitialized) return;

    // If no user after initialization, redirect to login
    if (!user) {
      const returnUrl = pathname !== '/auth/login' ? `?returnTo=${pathname}` : '';
      router.push(`/auth/login${returnUrl}`);
    }
  }, [user, isInitialized, router, pathname]);

  return {
    user,
    isLoading: !isInitialized || isAuthenticating,
    isAuthenticated: !!user,
  };
}
