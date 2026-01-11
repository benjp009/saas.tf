'use client';

import AppHeader from './AppHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage?: 'dashboard' | 'billing';
}

export default function AppLayout({ children, currentPage }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader currentPage={currentPage} />
      <main>{children}</main>
    </div>
  );
}
