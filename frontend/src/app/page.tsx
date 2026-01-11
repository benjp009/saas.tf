'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">saas.tf</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/login"
                className="text-sm font-medium hover:text-gray-600"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Instant Subdomains
            <br />
            for Your Projects
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get a subdomain like <span className="font-mono">yourapp.saas.tf</span> in seconds.
            Point it to your server and start building.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-black text-white text-lg font-medium rounded hover:bg-gray-800"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-8 py-3 border border-gray-300 text-lg font-medium rounded hover:bg-gray-50"
            >
              Learn More
            </a>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">Instant Setup</h3>
              <p className="text-gray-600">
                Create your subdomain in seconds. No complicated DNS configuration.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Powered by Google Cloud DNS. Enterprise-grade infrastructure.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Simple Pricing</h3>
              <p className="text-gray-600">
                Pay only for what you use. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            © 2026 saas.tf. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
