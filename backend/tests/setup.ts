// Test setup file
// Runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/saastest';
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCP_ZONE_NAME = 'test-zone';
process.env.GCP_DNS_DOMAIN = 'test.tf';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.RATE_LIMIT_ENABLED = 'false';

// Stripe test configuration
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_webhook_secret';
process.env.STRIPE_PRICE_ID_PACKAGE_5 = 'price_test_package_5';
process.env.STRIPE_PRICE_ID_PACKAGE_50 = 'price_test_package_50';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
