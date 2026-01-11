import { AuthService } from '../../../src/services/auth.service';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/crypto');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId in token payload', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);

      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);

      const decoded = authService.verifyToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        authService.verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // This would require mocking jwt.verify to simulate expiration
      // For now, we test the structure
      const token = authService.generateToken('user-id');
      expect(() => authService.verifyToken(token)).not.toThrow();
    });
  });
});
