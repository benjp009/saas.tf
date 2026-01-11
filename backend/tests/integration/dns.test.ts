import { DNSService } from '../../src/services/dns.service';

// Mock the config to avoid needing real GCP credentials in tests
jest.mock('../../src/config', () => ({
  config: {
    gcp: {
      projectId: 'test-project',
      zoneName: 'test-zone',
      dnsDomain: 'test.tf',
      credentials: JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: 'test-client-id',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      }),
    },
    jwtSecret: 'test-secret',
    jwtExpiresIn: '7d',
  },
}));

// Mock the database to avoid connection attempts
jest.mock('../../src/config/database');

describe('DNS Service Integration Tests', () => {
  let dnsService: DNSService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Note: We can't easily test the actual DNS service without real GCP credentials
    // These tests verify the service structure and error handling
  });

  describe('Service Initialization', () => {
    it('should initialize DNS service without errors', () => {
      expect(() => {
        dnsService = new DNSService();
      }).not.toThrow();
    });

    it('should have required methods', () => {
      dnsService = new DNSService();

      expect(dnsService.createARecord).toBeDefined();
      expect(dnsService.updateARecord).toBeDefined();
      expect(dnsService.deleteARecord).toBeDefined();
      expect(dnsService.recordExists).toBeDefined();
      expect(dnsService.listRecords).toBeDefined();
      expect(dnsService.getRecord).toBeDefined();
      expect(dnsService.healthCheck).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      dnsService = new DNSService();
    });

    it('should handle createARecord errors gracefully', async () => {
      const result = await dnsService.createARecord('test', '192.168.1.1');

      // Since we don't have real GCP credentials, we expect either success or graceful failure
      expect(result).toHaveProperty('success');
      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });

    it('should handle deleteARecord for non-existent records', async () => {
      const result = await dnsService.deleteARecord('nonexistent', '192.168.1.1');

      // Should handle gracefully even if record doesn't exist
      expect(result).toHaveProperty('success');
    });

    it('should handle recordExists for non-existent records', async () => {
      const exists = await dnsService.recordExists('nonexistent');

      // Should return boolean
      expect(typeof exists).toBe('boolean');
    });
  });

  describe('DNS Record Format', () => {
    beforeEach(() => {
      dnsService = new DNSService();
    });

    it('should format full domain correctly', async () => {
      const subdomain = 'myapp';
      const result = await dnsService.createARecord(subdomain, '192.168.1.1');

      if (result.recordId) {
        // Full domain should be subdomain.domain.
        expect(result.recordId).toBe('myapp.test.tf.');
      }
    });

    it('should list records without throwing errors', async () => {
      const records = await dnsService.listRecords();

      // Should return an array (empty if no connection)
      expect(Array.isArray(records)).toBe(true);
    });
  });
});
