import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';
import { hashPassword, comparePassword } from '../utils/crypto';
import {
  UnauthorizedError,
  ConflictError,
} from '../utils/errors';
import { logger } from '../utils/logger';

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already in use', 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
    });

    logger.info('User registered:', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in:', { userId: user.id, email: user.email });

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string): string {
    const payload = { userId, type: 'access' };
    const secret = config.jwtSecret;
    const options: SignOptions = {
      expiresIn: config.jwtExpiresIn as any // Type workaround for JWT StringValue type
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; type: string } {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        type: string;
      };
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
    }
  }
}

export const authService = new AuthService();
