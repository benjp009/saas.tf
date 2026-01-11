'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';

interface AppHeaderProps {
  currentPage?: 'dashboard' | 'billing';
}

export default function AppHeader({ currentPage }: AppHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navLinkClass = (page: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      currentPage === page
        ? 'bg-gray-100 text-black'
        : 'text-gray-600 hover:bg-gray-50 hover:text-black'
    }`;

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold hover:text-gray-700 transition-colors">
              saas.tf
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link href="/dashboard" className={navLinkClass('dashboard')}>
              Dashboard
            </Link>
            <Link href="/billing" className={navLinkClass('billing')}>
              Billing
            </Link>
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
