import {
  registerSchema,
  loginSchema,
  subdomainNameSchema,
  ipAddressSchema,
  createSubdomainSchema,
} from '../../../src/utils/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error?.message).toContain('Password');
    });

    it('should require uppercase, lowercase, number, and special char', () => {
      const passwords = [
        'alllowercase123!',
        'ALLUPPERCASE123!',
        'NoNumbers!',
        'NoSpecialChar123',
      ];

      passwords.forEach((password) => {
        const { error } = registerSchema.validate({
          email: 'test@example.com',
          password,
        });
        expect(error).toBeDefined();
      });
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password',
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('subdomainNameSchema', () => {
    it('should accept valid subdomain names', () => {
      const validNames = ['myapp', 'my-app', 'app123'];

      validNames.forEach((name) => {
        const { error } = subdomainNameSchema.validate(name);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid subdomain names', () => {
      const invalidNames = ['ab', 'my_app', '-myapp', 'myapp-'];

      invalidNames.forEach((name) => {
        const { error } = subdomainNameSchema.validate(name);
        expect(error).toBeDefined();
      });
    });

    it('should normalize uppercase to lowercase', () => {
      const { error, value } = subdomainNameSchema.validate('MyApp');
      expect(error).toBeUndefined();
      expect(value).toBe('myapp');
    });
  });

  describe('ipAddressSchema', () => {
    it('should accept valid IPv4 addresses', () => {
      const validIps = ['192.168.1.1', '10.0.0.1', '8.8.8.8'];

      validIps.forEach((ip) => {
        const { error } = ipAddressSchema.validate(ip);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid IPv4 addresses', () => {
      const invalidIps = ['256.1.1.1', '192.168.1', 'not-an-ip'];

      invalidIps.forEach((ip) => {
        const { error } = ipAddressSchema.validate(ip);
        expect(error).toBeDefined();
      });
    });
  });

  describe('createSubdomainSchema', () => {
    it('should accept valid subdomain creation data', () => {
      const validData = {
        name: 'myapp',
        ipAddress: '192.168.1.1',
      };

      const { error } = createSubdomainSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing fields', () => {
      const { error } = createSubdomainSchema.validate({});
      expect(error).toBeDefined();
    });
  });
});
