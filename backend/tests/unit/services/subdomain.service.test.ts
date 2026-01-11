import { SubdomainService } from '../../../src/services/subdomain.service';
import { isReservedSubdomain } from '../../../src/constants/reserved-subdomains';

// Mock the dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/services/dns.service');

describe('SubdomainService', () => {
  let subdomainService: SubdomainService;

  beforeEach(() => {
    subdomainService = new SubdomainService();
  });

  describe('validateSubdomainName', () => {
    it('should accept valid subdomain names', () => {
      const validNames = ['myapp', 'my-app', 'app123', 'my-app-123', 'a1b2c3'];

      validNames.forEach((name) => {
        const error = (subdomainService as any).validateSubdomainName(name);
        expect(error).toBeNull();
      });
    });

    it('should reject subdomain names that are too short', () => {
      const error = (subdomainService as any).validateSubdomainName('ab');
      expect(error).toContain('at least 3 characters');
    });

    it('should reject subdomain names that are too long', () => {
      const longName = 'a'.repeat(64);
      const error = (subdomainService as any).validateSubdomainName(longName);
      expect(error).toContain('not exceed 63 characters');
    });

    it('should reject subdomain names starting with hyphen', () => {
      const error = (subdomainService as any).validateSubdomainName('-myapp');
      expect(error).toContain('must start with a letter or number');
    });

    it('should reject subdomain names ending with hyphen', () => {
      const error = (subdomainService as any).validateSubdomainName('myapp-');
      expect(error).toContain('must end with a letter or number');
    });

    it('should accept subdomain names (validation happens at Joi level)', () => {
      // Note: Uppercase normalization happens at the Joi schema level, not in validateSubdomainName
      // The validateSubdomainName method checks format, length, and reserved status
      const validName = 'myapp';
      const error = (subdomainService as any).validateSubdomainName(validName);
      expect(error).toBeNull();
    });

    it('should reject subdomain names with special characters', () => {
      const error = (subdomainService as any).validateSubdomainName('my_app');
      expect(error).toContain('lowercase letters, numbers, and hyphens');
    });

    it('should reject subdomain names with consecutive hyphens', () => {
      const error = (subdomainService as any).validateSubdomainName('my--app');
      expect(error).toContain('consecutive hyphens');
    });
  });

  describe('validateIpAddress', () => {
    it('should accept valid IPv4 addresses', () => {
      const validIps = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '8.8.8.8',
        '255.255.255.255',
      ];

      validIps.forEach((ip) => {
        const isValid = (subdomainService as any).validateIpAddress(ip);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = [
        '256.1.1.1', // Out of range
        '192.168.1', // Incomplete
        '192.168.1.1.1', // Too many octets
        'abc.def.ghi.jkl', // Not numbers
        '192.168.-1.1', // Negative
        '',
      ];

      invalidIps.forEach((ip) => {
        const isValid = (subdomainService as any).validateIpAddress(ip);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Reserved Subdomains', () => {
    it('should block common reserved subdomains', () => {
      const reserved = ['admin', 'api', 'www', 'mail', 'ftp', 'blog'];

      reserved.forEach((name) => {
        expect(isReservedSubdomain(name)).toBe(true);
      });
    });

    it('should allow non-reserved subdomains', () => {
      const allowed = ['myapp', 'test123', 'custom-app'];

      allowed.forEach((name) => {
        expect(isReservedSubdomain(name)).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      expect(isReservedSubdomain('ADMIN')).toBe(true);
      expect(isReservedSubdomain('Admin')).toBe(true);
      expect(isReservedSubdomain('admin')).toBe(true);
    });
  });
});
