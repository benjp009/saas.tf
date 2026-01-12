import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import StoreInitializer from '@/components/providers/StoreInitializer';

const inter = Inter({ subsets: ['latin'] });

// Force dynamic rendering for all pages to avoid static generation issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: 'saas.tf - Subdomain Marketplace',
  description: 'Purchase and manage subdomains for your projects',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StoreInitializer />
        {children}
      </body>
    </html>
  );
}
